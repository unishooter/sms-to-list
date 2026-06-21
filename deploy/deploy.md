# Deployment Guide

Target: AWS EC2 t3.micro, Amazon Linux 2023.
Architecture: ALB (443) → Nginx (80) → Express (127.0.0.1:3001)

---

## 1. Initial Server Setup

### 1a. Install Node.js 20 (LTS)

```bash
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo dnf install -y nodejs
node --version   # should print v20.x.x
```

### 1b. Install Nginx

```bash
sudo dnf install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

### 1c. Install git and build tools (needed for better-sqlite3 native compilation)

```bash
sudo dnf install -y git gcc-c++ make python3
```

---

## 2. Clone and Configure the App

```bash
sudo mkdir -p /srv/sms-list-app
sudo chown ec2-user:ec2-user /srv/sms-list-app

cd /srv/sms-list-app
git clone https://github.com/unishooter/sms-to-list.git .
```

### Create the .env file

```bash
cp .env.example .env
nano .env   # fill in real values
```

Minimum required values for production:

```env
PORT=3001
HOST=127.0.0.1
DATABASE_PATH=./data/sms-list.sqlite

TWILIO_VALIDATE_SIGNATURE=true
TWILIO_AUTH_TOKEN=your_twilio_auth_token_here

GOOGLE_CLIENT_ID=your_google_oauth_client_id.apps.googleusercontent.com

PUBLIC_BASE_URL=https://lists.example.com
```

---

## 3. Install Backend Dependencies

```bash
cd /srv/sms-list-app/backend
npm install --omit=dev
```

> `better-sqlite3` compiles a native addon. If you see a build error, confirm
> gcc and python3 are installed (step 1c above).

---

## 4. Build the Frontend

```bash
cd /srv/sms-list-app/frontend
npm install

# Create a frontend .env with the Google client ID
echo "VITE_GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com" > .env

npm run build
```

### Deploy frontend to Nginx root

```bash
sudo mkdir -p /var/www/sms-list-app
sudo rsync -a --delete dist/ /var/www/sms-list-app/
```

---

## 5. Configure Nginx

```bash
sudo cp /srv/sms-list-app/deploy/nginx.conf /etc/nginx/conf.d/sms-list-app.conf
sudo nginx -t                  # verify config
sudo systemctl reload nginx
```

---

## 6. Install and Start the systemd Service

```bash
sudo cp /srv/sms-list-app/deploy/systemd-sms-list-api.service \
        /etc/systemd/system/sms-list-api.service

sudo systemctl daemon-reload
sudo systemctl enable sms-list-api
sudo systemctl start sms-list-api
sudo systemctl status sms-list-api
```

View live logs:

```bash
sudo journalctl -u sms-list-api -f
```

---

## 7. Verify Everything Works

```bash
# Health check (from the server itself)
curl http://127.0.0.1:3001/api/health

# Test the webhook locally (no signature validation required in dev)
curl -X POST http://127.0.0.1:3001/api/webhook/twilio/sms \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data-urlencode "From=+12105551212" \
  --data-urlencode "To=+12105559876" \
  --data-urlencode "MessageSid=test123" \
  --data-urlencode "Body=add eggs to heb"

# Should return TwiML: <Message>Added Eggs to Heb.</Message>
```

---

## 8. Ongoing Deploys

```bash
cd /srv/sms-list-app
bash deploy/deploy.sh
```

The script:
1. Pulls latest git changes
2. Reinstalls backend npm packages
3. Rebuilds the frontend
4. Rsyncs the new build to `/var/www/sms-list-app`
5. Restarts the systemd service

---

## 9. Database

The SQLite file lives at `/srv/sms-list-app/backend/data/sms-list.sqlite`.
Schema is applied automatically on each backend start — no manual migrations needed.

**Backup:**
```bash
cp /srv/sms-list-app/backend/data/sms-list.sqlite \
   ~/sms-list-backup-$(date +%Y%m%d).sqlite
```

---

## 10. Google OAuth Setup

1. Go to [Google Cloud Console → APIs & Services → Credentials](https://console.cloud.google.com/apis/credentials)
2. Create a new **OAuth 2.0 Client ID** → Application type: **Web application**
3. Add Authorized JavaScript origins:
   - `https://lists.example.com`
4. Add Authorized redirect URIs (if needed by your flow — typically not required for ID token flow):
   - `https://lists.example.com`
5. Copy the **Client ID** into:
   - `/srv/sms-list-app/.env` → `GOOGLE_CLIENT_ID=`
   - `/srv/sms-list-app/frontend/.env` → `VITE_GOOGLE_CLIENT_ID=`
6. Rebuild the frontend after updating the frontend env.

---

## 11. Google Calendar API Setup (for Calendar Widget)

The Calendar widget uses the Google Calendar REST API directly from the browser (no backend involvement). You must enable the API and configure OAuth scopes.

### 11a. Enable the Google Calendar API

1. Go to [Google Cloud Console → APIs & Services → Library](https://console.cloud.google.com/apis/library)
2. Search for **Google Calendar API**
3. Click **Enable**

### 11b. Add Calendar OAuth Scope to Consent Screen

1. Go to [APIs & Services → OAuth consent screen](https://console.cloud.google.com/apis/credentials/consent)
2. Click **Edit App**
3. Under **Scopes**, click **Add or Remove Scopes**
4. Add the scope: `https://www.googleapis.com/auth/calendar`
5. Save

> If your app is in **Testing** mode (not published), only users listed under "Test users" can authorize the Calendar scope. Add any family member emails there, or publish the app for internal use.

### 11c. Using the Calendar Widget

- On first use, click the **Connect Google Calendar** button in the right panel
- A Google consent popup will appear asking for Calendar access
- After approval, upcoming events from the primary calendar are shown
- The **+** button opens a form to add events (title, date, optional time)
- The access token expires after ~1 hour; click **Connect** again to refresh
- The **✕** button disconnects the calendar

---

## 11. AWS ALB Notes

| Layer | Detail |
|---|---|
| ALB listener | Port 443, HTTPS, SSL certificate managed by ACM |
| ALB forward | Target group on port 80 |
| EC2 security group | Allow TCP 80 inbound **from the ALB security group only** |
| EC2 security group | Allow TCP 22 inbound from your IP (SSH) |
| Nginx | Listens on 0.0.0.0:80, reads X-Forwarded-Proto from ALB |
| Express | Listens on 127.0.0.1:3001 only (never exposed directly) |

> The EC2 instance should **not** allow port 80 from the public internet directly — only from the ALB security group.
