require('dotenv').config();

const express = require('express');
const { initDb } = require('./src/db');
const healthRoutes = require('./src/healthRoutes');
const listRoutes = require('./src/listRoutes');
const twilioWebhook = require('./src/twilioWebhook');

const app = express();
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '127.0.0.1';

// Parse URL-encoded bodies (Twilio webhook format)
app.use(express.urlencoded({ extended: false }));
// Parse JSON bodies (frontend API calls)
app.use(express.json());

// Routes
app.use('/api', healthRoutes);
app.use('/api/webhook/twilio', twilioWebhook);
app.use('/api', listRoutes);

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

initDb();

app.listen(PORT, HOST, () => {
  console.log(`SMS List API listening on http://${HOST}:${PORT}`);
});
