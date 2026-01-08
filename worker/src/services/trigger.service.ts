import * as http from 'http';
import { createLogger } from '../config/logger';
import { JobProcessor } from '../processor/job.processor';

const logger = createLogger('TriggerService');

export function createManualTriggerServer(port: number) {
  const jobProcessor = new JobProcessor();

  const server = http.createServer(async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    if (req.method === 'POST' && req.url?.startsWith('/trigger/')) {
      const autoId = parseInt(req.url.split('/')[2], 10);

      if (isNaN(autoId)) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: 'Invalid automation ID' }));
        return;
      }

      try {
        logger.info(`Manual trigger received for automation: ${autoId}`);

        // Process the job
        const result = await jobProcessor.process({ autoId, schedulerId: 0 });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: 'Job triggered', result }));
      } catch (error: any) {
        logger.error(`Failed to trigger job for automation ${autoId}:`, error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: error.message }));
      }
      return;
    }

    if (req.method === 'GET' && req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'Not found' }));
  });

  server.listen(port, () => {
    logger.info(`Manual trigger server listening on port ${port}`);
  });

  return server;
}
