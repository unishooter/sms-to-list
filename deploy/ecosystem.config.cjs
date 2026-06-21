// PM2 ecosystem file — optional alternative to systemd
// Usage: pm2 start deploy/ecosystem.config.cjs
module.exports = {
  apps: [
    {
      name: 'sms-list-api',
      script: 'server.js',
      cwd: '/srv/sms-list-app/backend',
      instances: 1,
      autorestart: true,
      watch: false,
      env_file: '/srv/sms-list-app/.env',
      out_file: '/var/log/sms-list-api.out.log',
      error_file: '/var/log/sms-list-api.err.log',
      time: true,
    },
  ],
};
