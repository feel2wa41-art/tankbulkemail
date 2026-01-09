/**
 * PM2 Ecosystem Configuration
 * Tank Bulk Email System
 */
module.exports = {
  apps: [
    {
      name: 'tank-backend',
      cwd: './backend',
      script: 'dist/main.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      error_file: './logs/backend-error.log',
      out_file: './logs/backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
    {
      name: 'tank-worker',
      cwd: './worker',
      script: 'dist/main.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
      },
      error_file: './logs/worker-error.log',
      out_file: './logs/worker-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
    {
      name: 'tank-frontend',
      cwd: './frontend',
      script: 'node_modules/.bin/serve',
      args: '-s dist -l 3000',
      instances: 1,
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: 'production',
      },
      error_file: './logs/frontend-error.log',
      out_file: './logs/frontend-out.log',
    },
  ],
};
