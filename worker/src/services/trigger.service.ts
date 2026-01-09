/**
 * Manual Trigger Service
 * Backend에서 Worker를 호출하는 HTTP API 서버
 */
import * as http from 'http';
import { createLogger } from '../config/logger';
import { SchedulerService } from './scheduler.service';
import { SesService } from './ses.service';
import { getRedisConnection, getEmailJobQueue, getEmailSendQueue } from '../config/queue';

const logger = createLogger('TriggerService');

let schedulerRef: SchedulerService | null = null;
let sesService: SesService | null = null;
let serverStarted = false;

/**
 * SchedulerService 참조 설정 (main.ts에서 호출)
 */
export function setSchedulerRef(scheduler: SchedulerService) {
  schedulerRef = scheduler;
}

/**
 * Manual Trigger HTTP 서버 생성
 */
export function createManualTriggerServer(port: number) {
  sesService = new SesService();

  const server = http.createServer(async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    // POST /trigger/{autoId} - 자동화 수동 실행
    if (req.method === 'POST' && req.url?.startsWith('/trigger/')) {
      await handleTrigger(req, res);
      return;
    }

    // GET /health - 헬스 체크
    if (req.method === 'GET' && req.url === '/health') {
      await handleHealth(req, res);
      return;
    }

    // GET /quota - SES 할당량 조회
    if (req.method === 'GET' && req.url === '/quota') {
      await handleQuota(req, res);
      return;
    }

    // GET /queue/status - 큐 상태 조회
    if (req.method === 'GET' && req.url === '/queue/status') {
      await handleQueueStatus(req, res);
      return;
    }

    // GET /queue/failed - 실패한 작업 목록
    if (req.method === 'GET' && req.url?.startsWith('/queue/failed')) {
      await handleQueueFailed(req, res);
      return;
    }

    // POST /queue/retry/:jobId - 특정 작업 재시도
    if (req.method === 'POST' && req.url?.startsWith('/queue/retry/') && !req.url.includes('retry-all')) {
      await handleQueueRetry(req, res);
      return;
    }

    // POST /queue/retry-all - 모든 실패 작업 재시도
    if (req.method === 'POST' && req.url?.startsWith('/queue/retry-all')) {
      await handleQueueRetryAll(req, res);
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'Not found' }));
  });

  server.listen(port, () => {
    serverStarted = true;
    logger.info(`Manual trigger server listening on port ${port}`);
  });

  return server;
}

/**
 * POST /trigger/{autoId} - 자동화 수동 실행 처리
 */
async function handleTrigger(req: http.IncomingMessage, res: http.ServerResponse) {
  const autoId = parseInt(req.url!.split('/')[2], 10);

  if (isNaN(autoId)) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: false, error: 'Invalid automation ID' }));
    return;
  }

  try {
    logger.info(`Manual trigger received for automation: ${autoId}`);

    if (!schedulerRef) {
      // SchedulerService가 없으면 직접 생성
      schedulerRef = new SchedulerService();
    }

    // SchedulerService의 triggerJobFromApi 사용
    const result = await schedulerRef.triggerJobFromApi(autoId);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: true,
      runId: result.runId,
      jobId: result.jobId,
    }));

  } catch (error: any) {
    logger.error(`Failed to trigger job for automation ${autoId}:`, error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: false,
      error: error.message || 'Unknown error',
    }));
  }
}

/**
 * GET /health - 헬스 체크 처리
 */
async function handleHealth(req: http.IncomingMessage, res: http.ServerResponse) {
  let redisConnected = false;

  try {
    const redis = getRedisConnection();
    const pong = await redis.ping();
    redisConnected = pong === 'PONG';
  } catch (error) {
    redisConnected = false;
  }

  const devMode = process.env.DEV_MODE === 'true';

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    status: 'ok',
    schedulerRunning: schedulerRef !== null,
    redisConnected: devMode ? true : redisConnected,
    timestamp: new Date().toISOString(),
    devMode,
  }));
}

/**
 * GET /quota - SES 할당량 조회 처리
 */
async function handleQuota(req: http.IncomingMessage, res: http.ServerResponse) {
  const devMode = process.env.DEV_MODE === 'true';

  if (devMode) {
    // DEV MODE에서는 Mock 데이터 반환
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      max24HourSend: 50000,
      sentLast24Hours: 0,
      remaining: 50000,
      maxSendRate: 14,
    }));
    return;
  }

  try {
    if (!sesService) {
      sesService = new SesService();
    }
    await sesService.initialize();

    const quota = await sesService.getQuota();

    if (!quota) {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Failed to get SES quota' }));
      return;
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      max24HourSend: quota.max24HourSend,
      sentLast24Hours: quota.sentLast24Hours,
      remaining: quota.remaining,
      maxSendRate: quota.maxSendRate,
    }));

  } catch (error: any) {
    logger.error('Failed to get SES quota:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: error.message || 'Unknown error' }));
  }
}

/**
 * GET /queue/status - 큐 상태 조회
 */
async function handleQueueStatus(req: http.IncomingMessage, res: http.ServerResponse) {
  const devMode = process.env.DEV_MODE === 'true';

  if (devMode) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: true,
      data: {
        waiting: 0,
        active: 0,
        completed: 100,
        failed: 2,
        delayed: 0,
      },
    }));
    return;
  }

  try {
    const emailJobQueue = getEmailJobQueue();
    const emailSendQueue = getEmailSendQueue();

    const [jobCounts, sendCounts] = await Promise.all([
      emailJobQueue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed'),
      emailSendQueue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed'),
    ]);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: true,
      data: {
        waiting: (jobCounts.waiting || 0) + (sendCounts.waiting || 0),
        active: (jobCounts.active || 0) + (sendCounts.active || 0),
        completed: (jobCounts.completed || 0) + (sendCounts.completed || 0),
        failed: (jobCounts.failed || 0) + (sendCounts.failed || 0),
        delayed: (jobCounts.delayed || 0) + (sendCounts.delayed || 0),
      },
    }));
  } catch (error: any) {
    logger.error('Failed to get queue status:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: false, error: error.message }));
  }
}

/**
 * GET /queue/failed - 실패한 작업 목록
 */
async function handleQueueFailed(req: http.IncomingMessage, res: http.ServerResponse) {
  const devMode = process.env.DEV_MODE === 'true';

  // Parse query params
  const url = new URL(req.url || '', `http://localhost`);
  const autoId = url.searchParams.get('autoId');

  if (devMode) {
    // DEV 모드에서는 샘플 데이터 반환
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: true,
      data: [],
    }));
    return;
  }

  try {
    const emailSendQueue = getEmailSendQueue();
    const failedJobs = await emailSendQueue.getFailed(0, 100);

    const filteredJobs = autoId
      ? failedJobs.filter(job => job.data.autoId === parseInt(autoId, 10))
      : failedJobs;

    const result = filteredJobs.map(job => ({
      id: job.id,
      name: job.name,
      data: {
        runId: job.data.runId,
        autoId: job.data.autoId,
        recipient: job.data.email,
        subject: job.data.subject,
      },
      failedReason: job.failedReason || 'Unknown error',
      attemptsMade: job.attemptsMade,
      timestamp: job.timestamp,
    }));

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: true,
      data: result,
    }));
  } catch (error: any) {
    logger.error('Failed to get failed jobs:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: false, error: error.message }));
  }
}

/**
 * POST /queue/retry/:jobId - 특정 작업 재시도
 */
async function handleQueueRetry(req: http.IncomingMessage, res: http.ServerResponse) {
  const jobId = req.url!.split('/')[3];

  if (!jobId) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: false, error: 'Job ID required' }));
    return;
  }

  const devMode = process.env.DEV_MODE === 'true';

  if (devMode) {
    logger.info(`[DEV MODE] Would retry job: ${jobId}`);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, message: `Job ${jobId} queued for retry` }));
    return;
  }

  try {
    const emailSendQueue = getEmailSendQueue();
    const job = await emailSendQueue.getJob(jobId);

    if (!job) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'Job not found' }));
      return;
    }

    await job.retry();
    logger.info(`Job ${jobId} queued for retry`);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, message: `Job ${jobId} queued for retry` }));
  } catch (error: any) {
    logger.error(`Failed to retry job ${jobId}:`, error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: false, error: error.message }));
  }
}

/**
 * POST /queue/retry-all - 모든 실패 작업 재시도
 */
async function handleQueueRetryAll(req: http.IncomingMessage, res: http.ServerResponse) {
  const devMode = process.env.DEV_MODE === 'true';

  // Parse query params
  const url = new URL(req.url || '', `http://localhost`);
  const autoId = url.searchParams.get('autoId');

  if (devMode) {
    logger.info(`[DEV MODE] Would retry all failed jobs${autoId ? ` for autoId: ${autoId}` : ''}`);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, data: { retried: 0 } }));
    return;
  }

  try {
    const emailSendQueue = getEmailSendQueue();
    const failedJobs = await emailSendQueue.getFailed(0, 1000);

    const jobsToRetry = autoId
      ? failedJobs.filter(job => job.data.autoId === parseInt(autoId, 10))
      : failedJobs;

    let retriedCount = 0;
    for (const job of jobsToRetry) {
      try {
        await job.retry();
        retriedCount++;
      } catch (e) {
        logger.warn(`Failed to retry job ${job.id}:`, e);
      }
    }

    logger.info(`Retried ${retriedCount} failed jobs`);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, data: { retried: retriedCount } }));
  } catch (error: any) {
    logger.error('Failed to retry all jobs:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: false, error: error.message }));
  }
}
