const express = require('express');
const crypto = require('crypto');
const { getDb } = require('./db');
const { parseMessage } = require('./smsParser');

const router = express.Router();

/**
 * Validates the X-Twilio-Signature header using HMAC-SHA1.
 * See: https://www.twilio.com/docs/usage/security#validating-signatures
 */
function validateTwilioSignature(req) {
  const authToken = process.env.TWILIO_AUTH_TOKEN || '';
  const baseUrl = (process.env.PUBLIC_BASE_URL || '').replace(/\/$/, '');
  const url = baseUrl + req.originalUrl;
  const signature = req.headers['x-twilio-signature'] || '';

  const params = req.body || {};
  const sortedKeys = Object.keys(params).sort();
  let data = url;
  for (const key of sortedKeys) {
    data += key + params[key];
  }

  const expected = crypto
    .createHmac('sha1', authToken)
    .update(Buffer.from(data, 'utf8'))
    .digest('base64');

  const sigBuf = Buffer.from(signature.padEnd(expected.length), 'utf8');
  const expBuf = Buffer.from(expected, 'utf8');

  return sigBuf.length === expBuf.length && crypto.timingSafeEqual(sigBuf, expBuf);
}

function twiml(message) {
  const safe = message.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<Response><Message>${safe}</Message></Response>`;
}

router.post('/sms', (req, res) => {
  const shouldValidate = process.env.TWILIO_VALIDATE_SIGNATURE === 'true';

  if (shouldValidate) {
    try {
      if (!validateTwilioSignature(req)) {
        console.warn('Rejected request: invalid Twilio signature');
        return res.status(403).send('Forbidden');
      }
    } catch (err) {
      console.error('Signature validation error:', err.message);
      return res.status(403).send('Forbidden');
    }
  }

  const { Body = '', From = '', To = '', MessageSid = '' } = req.body;

  const logBody = Body.length > 200 ? Body.slice(0, 200) + '…' : Body;
  console.log(`[webhook] SMS from ${From} → ${To} | sid=${MessageSid} | body="${logBody}"`);

  const db = getDb();
  const parsed = parseMessage(Body);

  // node-sqlite3-wasm requires parameters as an array
  const insertSms = db.prepare(`
    INSERT INTO sms_messages (message_sid, from_number, to_number, body, parse_status, parse_error)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  res.set('Content-Type', 'text/xml');

  if (!parsed.success) {
    insertSms.run([MessageSid || null, From || null, To || null, Body || null, 'error', parsed.error]);
    console.warn(`[webhook] Parse failed: ${parsed.error}`);
    return res.send(twiml("Sorry, I couldn't understand that. Try: add eggs to heb"));
  }

  const smsRow = insertSms.run([MessageSid || null, From || null, To || null, Body || null, 'ok', null]);

  // If a list with this name already exists but is closed, start a fresh one
  const CLOSED_STATUSES = ['shopped', 'closed', 'archived'];
  const existing = db.prepare('SELECT id, status FROM lists WHERE name = ?').get([parsed.listName]);

  let listName = parsed.listName;
  if (existing && CLOSED_STATUSES.includes(existing.status)) {
    // Create a new list with a unique name (timestamp suffix), same display name
    listName = `${parsed.listName}_${Date.now()}`;
    db.prepare(`
      INSERT INTO lists (name, display_name, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
    `).run([listName, parsed.displayListName]);
  } else {
    db.prepare(`
      INSERT INTO lists (name, display_name, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(name) DO UPDATE SET updated_at = CURRENT_TIMESTAMP
    `).run([parsed.listName, parsed.displayListName]);
  }

  const list = db.prepare('SELECT id FROM lists WHERE name = ?').get([listName]);

  db.prepare(`
    INSERT INTO list_items (list_id, item_name, status, source_sms_message_id, updated_at)
    VALUES (?, ?, 'open', ?, CURRENT_TIMESTAMP)
  `).run([list.id, parsed.itemName, smsRow.lastInsertRowid]);

  console.log(`[webhook] Added "${parsed.itemName}" to list "${parsed.displayListName}"`);
  return res.send(twiml(`Added ${parsed.itemName} to ${parsed.displayListName}.`));
});

module.exports = router;
