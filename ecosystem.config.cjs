module.exports = {
  apps: [
    {
      name: 'autoshop',
      cwd: './server',
      script: 'index.js',
      interpreter: 'node',
      interpreter_args: '--no-warnings',
      node_args: '--no-warnings',
      restart_delay: 2000,
      max_restarts: 20,
      min_uptime: '5s',
      watch: false,
      env: {
        NODE_ENV: 'production',
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: '../data/pm2-error.log',
      out_file: '../data/pm2-out.log',
      merge_logs: true,
    },
  ],
};
