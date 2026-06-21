const { OAuth2Client } = require('google-auth-library');

let client;

function getClient() {
  if (!client) client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
  return client;
}

/**
 * Verifies a Google ID token and returns the payload.
 */
async function verifyGoogleToken(token) {
  const ticket = await getClient().verifyIdToken({
    idToken: token,
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  return ticket.getPayload();
}

/**
 * Express middleware that requires a valid Google ID token in the
 * Authorization: Bearer <token> header.
 *
 * Auth is bypassed entirely when GOOGLE_CLIENT_ID is not set,
 * which makes local development without OAuth credentials easy.
 */
function requireAuth(req, res, next) {
  if (!process.env.GOOGLE_CLIENT_ID) {
    return next(); // Auth not configured — allow through
  }

  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = authHeader.slice(7);
  verifyGoogleToken(token)
    .then(payload => {
      req.user = payload;
      next();
    })
    .catch(err => {
      console.warn('[auth] Invalid token:', err.message);
      res.status(401).json({ error: 'Invalid or expired token — please sign in again' });
    });
}

module.exports = { requireAuth };
