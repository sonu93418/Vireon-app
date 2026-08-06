module.exports = {
  apps: [
    {
      name: 'vireon-api',
      script: './dist/server.js',
      instances: 'max', // CPU cluster mode
      exec_mode: 'cluster',
      env: { NODE_ENV: 'production', PORT: 5000 },
      max_memory_restart: '512M',
      watch: false,
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      merge_logs: true,
      restart_delay: 5000,
      max_restarts: 10,
      min_uptime: '10s',
      kill_timeout: 5000,
    },
  ],
};
