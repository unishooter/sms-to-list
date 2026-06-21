# SMS List App

A personal family SMS-to-shopping-list app.  
Text your Twilio number — items land in a React UI organized by store.

```
add eggs to heb       →  Added Eggs to Heb.
add milk costco       →  Added Milk to Costco.
paper towels walmart  →  Added Paper Towels to Walmart.
```

**Stack:** Node.js + Express · React + Vite · SQLite (better-sqlite3) · Twilio · Nginx · AWS EC2

---

## Project Structure

```
sms-list-app/
├── backend/
│   ├── server.js
│   └── src/
│       ├── db.js              # SQLite init + connection
│       ├── schema.js          # CREATE TABLE statements
│       ├── smsParser.js       # Text → { itemName, listName }
│       ├── twilioWebhook.js   # POST /api/webhook/twilio/sms
│       ├── listRoutes.js      # GET/PATCH list and item endpoints
│       ├── healthRoutes.js    # GET /api/health
│       └── authMiddleware.js  # Google ID token verification
├── frontend/
│   ├── index.html
│   ├── vite.config.js
│   └── src/
│       ├── App.jsx
│       ├── api.js
│       ├── index.css
│       └── components/
│           ├── Login.jsx
│           ├── ListView.jsx
│           ├── ItemRow.jsx
│           └── StatusBadge.jsx
├── deploy/
│   ├── nginx.conf
│   ├── systemd-sms-list-api.service
│   ├── ecosystem.config.cjs   # optional PM2 config
│   ├── deploy.md              # full production setup guide
│   └── deploy.sh              # ongoing update script
├── .env.example
└── README.md
```

---

## Local Development

### Prerequisites

- Node.js 18+ (20 LTS recommended)
- A Twilio account + phone number (or use the curl test below without one)

### 1. Clone and configure environment

```bash
git clone https://github.com/unishooter/sms-to-list.git
cd sms-to-list
cp .env.example .env
# Edit .env — minimum required for local dev:
#   PORT, HOST, DATABASE_PATH
#   Leave TWILIO_VALIDATE_SIGNATURE=false
#   Leave GOOGLE_CLIENT_ID empty to skip auth
```

### 2. Install dependencies

```bash
# Backend
cd backend && npm install && cd ..

# Frontend
cd frontend && npm install && cd ..
```

> `better-sqlite3` builds a native addon. You need `gcc` / `python3` / `make`  
> (macOS: Xcode CLI tools; Linux: `build-essential`; Windows: `windows-build-tools`).

### 3. Start the backend

```bash
cd backend
npm run dev       # uses node --watch (Node 18.11+)
# or: node server.js
```

Backend listens on `http://127.0.0.1:3001`.

### 4. Start the frontend

```bash
cd frontend
npm run dev
```

Frontend dev server at `http://localhost:5173`.  
The Vite proxy forwards `/api/*` requests to the Express backend automatically.

---

## Test the Twilio Webhook (curl)

No Twilio account needed for local testing:

```bash
curl -X POST http://localhost:3001/api/webhook/twilio/sms \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data-urlencode "From=+12105551212" \
  --data-urlencode "To=+12105559876" \
  --data-urlencode "MessageSid=test123" \
  --data-urlencode "Body=add eggs to heb"
```

Expected TwiML response:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Response><Message>Added Eggs to Heb.</Message></Response>
```

More test cases:

```bash
# No "to" keyword — last token is the store
--data-urlencode "Body=milk costco"

# Multi-word item
--data-urlencode "Body=add paper towels to walmart"

# Bad parse — returns a helpful error message
--data-urlencode "Body=hello"
```

---

## API Reference

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check (no auth) |
| POST | `/api/webhook/twilio/sms` | Twilio webhook (no auth, optional signature validation) |
| GET | `/api/lists` | All lists with open item counts |
| GET | `/api/lists/:id/items` | Items in a list |
| PATCH | `/api/items/:id/status` | Update item status (`open`/`done`/`skipped`) |
| PATCH | `/api/lists/:id/status` | Update list status (`active`/`archived`) |

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Express listen port |
| `HOST` | `127.0.0.1` | Express listen host |
| `DATABASE_PATH` | `./data/sms-list.sqlite` | Path to SQLite file |
| `TWILIO_VALIDATE_SIGNATURE` | `false` | Enable Twilio HMAC-SHA1 signature check |
| `TWILIO_AUTH_TOKEN` | — | Required when signature validation is on |
| `PUBLIC_BASE_URL` | — | Your public HTTPS URL (used in signature validation) |
| `GOOGLE_CLIENT_ID` | — | Google OAuth client ID; leave blank to disable auth |

**Frontend** (Vite — prefix with `VITE_`):

| Variable | Description |
|----------|-------------|
| `VITE_GOOGLE_CLIENT_ID` | Same Google client ID, exposed to the browser |

---

## Authentication

Google OAuth via `@react-oauth/google` (frontend) + `google-auth-library` (backend).

- If `GOOGLE_CLIENT_ID` / `VITE_GOOGLE_CLIENT_ID` are **not set**, auth is skipped entirely — ideal for local dev.
- When set, the frontend shows a Google Sign-In button.  After sign-in, the Google ID token is stored in `localStorage` and sent as `Authorization: Bearer <token>` on every API request.
- The backend middleware verifies each token against Google's public keys. Tokens expire after 1 hour; the UI detects a 401 and prompts re-login.
- Google ID tokens are valid for 1 hour. For a personal family app this is acceptable — users re-authenticate when prompted.

---

## Twilio Setup

1. Buy a US long-code or toll-free SMS-capable number at [twilio.com/console](https://console.twilio.com).
2. In the Twilio console, navigate to your number → **Messaging** → **A message comes in**.
3. Set webhook URL to:
   ```
   https://your-domain.com/api/webhook/twilio/sms
   ```
4. Method: **HTTP POST**
5. In your server `.env`:
   ```env
   TWILIO_VALIDATE_SIGNATURE=true
   TWILIO_AUTH_TOKEN=your_auth_token
   PUBLIC_BASE_URL=https://your-domain.com
   ```

---

## Production Deployment

See [`deploy/deploy.md`](deploy/deploy.md) for the full step-by-step guide including:

- Node.js installation on Amazon Linux 2023
- Nginx configuration
- systemd service setup
- Google OAuth production configuration
- AWS ALB / security group notes
- Ongoing deploy script (`deploy/deploy.sh`)

Quick summary:

```bash
# On the server — first time
git clone https://github.com/unishooter/sms-to-list.git /srv/sms-list-app
# ... follow deploy/deploy.md ...

# Subsequent deploys
bash /srv/sms-list-app/deploy/deploy.sh
```

---

## AWS Architecture

```
Internet
   │ HTTPS 443
   ▼
[ALB]  ← ACM SSL certificate
   │ HTTP 80
   ▼
[EC2 t3.micro / Amazon Linux 2023]
   │
[Nginx :80]
   ├── /          → /var/www/sms-list-app  (React static files)
   └── /api/*     → http://127.0.0.1:3001  (Express)
                             │
                         [SQLite]
                    backend/data/sms-list.sqlite
```

- ALB security group: allow inbound 443 from `0.0.0.0/0`
- EC2 security group: allow inbound 80 **from ALB security group only**
- Express never binds to a public interface

---

## SMS Message Format

The parser is forgiving and handles several patterns:

| SMS text | Item | List |
|----------|------|------|
| `add eggs to heb` | Eggs | Heb |
| `eggs to heb` | Eggs | Heb |
| `add paper towels walmart` | Paper Towels | Walmart |
| `milk costco` | Milk | Costco |

- List names are stored lowercase internally and displayed as Title Case.
- Item names are normalized to Title Case.
- Unrecognizable messages receive a helpful error reply.
