import * as winston from 'winston';
import * as DailyRotateFile from 'winston-daily-rotate-file';

export function createLogger(context: string) {
  const logPath = process.env.LOG_PATH || './logs';
  const logLevel = process.env.LOG_LEVEL || 'info';

  const format = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.printf(({ timestamp, level, message, stack }) => {
      return `[${timestamp}] [${level.toUpperCase()}] [${context}] ${message}${stack ? '\n' + stack : ''}`;
    }),
  );

  const transports: winston.transport[] = [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        format,
      ),
    }),
  ];

  if (process.env.NODE_ENV !== 'test') {
    transports.push(
      new DailyRotateFile({
        dirname: logPath,
        filename: 'worker-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '30d',
        format,
      }),
      new DailyRotateFile({
        dirname: logPath,
        filename: 'email-send-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '30d',
        format,
      }),
    );
  }

  return winston.createLogger({
    level: logLevel,
    transports,
  });
}
