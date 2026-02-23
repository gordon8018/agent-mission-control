module.exports = {
  apps: [
    {
      name: 'mission-control',
      script: 'node_modules/.bin/next',
      args: 'dev',
      cwd: '/Users/gordonyang/.openclaw/workspace-code/mission-control',
      env: {
        NODE_ENV: 'development',
        PORT: 3000
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true
    }
  ]
};
