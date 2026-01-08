/**
 * Manual Trigger Service
 * Backend에서 Worker를 호출하는 HTTP API 서버
 */
import * as http from 'http';
import { createLogger } from '../config/logger';
import { SchedulerService } from './scheduler.service';
import { SesService } from './ses.service';
import { getRedisConnection } from '../config/queue';

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
