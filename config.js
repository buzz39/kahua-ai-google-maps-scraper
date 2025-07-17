require('dotenv').config();

const config = {
  useProxy: process.env.USE_PROXY === 'true',
  proxyList: process.env.PROXY_LIST ? process.env.PROXY_LIST.split(',') : [],
  requestsPerMinute: parseInt(process.env.REQUESTS_PER_MINUTE) || 60,
  delayBetweenRequests: parseInt(process.env.DELAY_BETWEEN_REQUESTS) || 1000,
  captchaApiKey: process.env.CAPTCHA_API_KEY,
  captchaService: process.env.CAPTCHA_SERVICE,
  maxConcurrentJobs: parseInt(process.env.MAX_CONCURRENT_JOBS) || 2,
  headless: true, // Always headless for production
  browser: process.env.BROWSER || 'chromium',
  dbPath: process.env.DB_PATH || './data/scraper.db',
  email: {
    enabled: process.env.EMAIL_ENABLED === 'true',
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
    from: process.env.EMAIL_FROM,
    to: process.env.EMAIL_TO
  },
  apiKey: process.env.API_KEY
};
console.log('Loaded config:', config);
module.exports = config; 