# AWS Educate Deployment Plan

Deploying: **NestJS API** on EC2 t2.micro + **MongoDB Atlas** (free M0)
OS: Ubuntu 22.04 LTS
Estimated cost: **$0** (within AWS Educate free tier)

---

## Architecture Overview

```
Internet
    │
    ▼
Route 53 / your domain (optional)
    │
    ▼
EC2 t2.micro (Ubuntu 22.04)
  ├── Nginx (port 80/443) ← reverse proxy + SSL termination
  ├── NestJS app (port 3300, internal only)
  └── PM2 (process manager, auto-restart)
    │
    ▼
MongoDB Atlas M0 (free, external)
```

---

## Step 1 — AWS Educate Account

1. Go to https://aws.amazon.com/education/awseducate/
2. Sign up with your **university/student email**
3. You'll receive an email to verify student status (may take a few hours)
4. Once approved, go to **AWS Educate Starter Account** → click **AWS Console**
   - Note: Educate accounts use a Vocareum portal, not the standard AWS console login
   - Your session may expire — save your work frequently
5. Verify your available credits: top-right menu → **My Account** → billing dashboard

> **Important:** AWS Educate Starter Accounts have region restrictions — you are usually locked to `us-east-1` (N. Virginia). Use that region for everything.

---

## Step 2 — Launch EC2 Instance

### 2.1 Create the instance

1. AWS Console → **EC2** → **Launch Instance**
2. Settings:
   - **Name:** `healthy-food-api`
   - **AMI:** Ubuntu Server 22.04 LTS (Free tier eligible) ✓
   - **Instance type:** `t2.micro` (Free tier eligible) ✓
   - **Key pair:** Create new → name it `healthy-food-key` → download `.pem` file
     - Save this file safely — you cannot re-download it
   - **Storage:** 8 GB gp2 (default, free tier includes 30 GB)

### 2.2 Configure Security Group

Create a new security group named `healthy-food-sg` with these inbound rules:

| Type  | Protocol | Port | Source    | Purpose           |
| ----- | -------- | ---- | --------- | ----------------- |
| SSH   | TCP      | 22   | My IP     | Your machine only |
| HTTP  | TCP      | 80   | 0.0.0.0/0 | Nginx             |
| HTTPS | TCP      | 443  | 0.0.0.0/0 | Nginx + SSL       |

> Do NOT expose port 3300 publicly — Nginx will proxy it internally.

3. Click **Launch Instance**

### 2.3 Allocate an Elastic IP (so your IP doesn't change on reboot)

1. EC2 → **Elastic IPs** → **Allocate Elastic IP address** → Allocate
2. Select the new IP → **Actions** → **Associate Elastic IP**
3. Choose your `healthy-food-api` instance → Associate
4. Note this IP — this is your permanent server IP

---

## Step 3 — Connect to the Instance

```bash
# Fix key permissions (macOS/Linux)
chmod 400 ~/Downloads/healthy-food-key.pem

# SSH in
ssh -i ~/Downloads/healthy-food-key.pem ubuntu@<your-elastic-ip>
```

---

## Step 4 — Server Setup

Run all of the following on the EC2 instance via SSH.

### 4.1 System update

```bash
sudo apt update && sudo apt upgrade -y
```

### 4.2 Install Node.js 20 (LTS)

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v   # should print v20.x.x
```

### 4.3 Install Yarn and PM2

```bash
sudo npm install -g yarn pm2
```

### 4.4 Install Nginx

```bash
sudo apt install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

### 4.5 Install Certbot (for free SSL)

```bash
sudo apt install -y certbot python3-certbot-nginx
```

---

## Step 5 — MongoDB Atlas (Free M0)

Do this from your laptop, not the EC2 instance.

1. Go to https://cloud.mongodb.com → create a free account
2. **Create a Project** → **Build a Database** → choose **M0 Free**
3. Region: choose **AWS us-east-1** (closest to your EC2)
4. **Authentication:** Username + Password → create a user, save the password
5. **Network Access** → **Add IP Address** → Add your EC2 Elastic IP
   - Also add your laptop IP for local dev
   - Or use `0.0.0.0/0` to allow all (simpler for now)
6. **Connect** → **Drivers** → copy the connection string:
   ```
   mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net
   ```
7. Save this — it becomes your `DATABASE_URL`

---

## Step 6 — Deploy the Application

### 6.1 Clone the repo on EC2

```bash
cd ~
git clone https://github.com/<your-username>/healthy-food-ecommerce.git
cd healthy-food-ecommerce
```

### 6.2 Install dependencies and build

```bash
yarn install
yarn build
```

### 6.3 Create the .env file

```bash
nano .env
```

Paste and fill in your values:

```env
NODE_ENV=production
PORT=3300

DATABASE_URL=mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net
DATABASE_NAME=healthy-food-ecommerce

JWT_SECRET=<generate: openssl rand -hex 32>
REFRESH_JWT_SECRET=<generate: openssl rand -hex 32>
JWT_EXPIRES_IN=1h
REFRESH_JWT_EXPIRES_IN=7d

ENCRYPTION_KEY=<generate: openssl rand -hex 16>

CASSO_SECURE_TOKEN=<from your Casso dashboard>

# Do NOT set NGROK_AUTHTOKEN in production
```

To generate secrets directly on the server:

```bash
openssl rand -hex 32   # use output for JWT_SECRET
openssl rand -hex 32   # use output for REFRESH_JWT_SECRET
openssl rand -hex 16   # use output for ENCRYPTION_KEY
```

### 6.4 Start the app with PM2

```bash
pm2 start dist/src/main.js --name healthy-food-api
pm2 save
pm2 startup   # follow the printed command to enable auto-start on reboot
```

Verify it's running:

```bash
pm2 status
pm2 logs healthy-food-api
```

---

## Step 7 — Configure Nginx as Reverse Proxy

### 7.1 Create Nginx site config

```bash
sudo nano /etc/nginx/sites-available/healthy-food-api
```

Paste:

```nginx
server {
    listen 80;
    server_name <your-elastic-ip>;   # replace with domain later

    location / {
        proxy_pass http://localhost:3300;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 7.2 Enable and reload

```bash
sudo ln -s /etc/nginx/sites-available/healthy-food-api /etc/nginx/sites-enabled/
sudo nginx -t          # test config — should say "ok"
sudo systemctl reload nginx
```

Your API is now reachable at `http://<your-elastic-ip>/api` (Swagger) and all endpoints.

---

## Step 8 — Add a Domain + HTTPS (Optional but Recommended for Casso)

Casso requires HTTPS. With a raw IP you can't get a certificate — you need a domain.

### Free domain options

- **Freenom** — free .tk / .ml / .ga domains (https://freenom.com)
- **Duck DNS** — free subdomain like `yourapp.duckdns.org` (https://duckdns.org)
- **No-IP** — free subdomain (https://www.noip.com)

### 8.1 Point your domain to the Elastic IP

In your domain registrar's DNS settings, add an **A record**:

```
Type: A
Name: @  (or api)
Value: <your-elastic-ip>
TTL: 300
```

Wait 5–15 minutes for DNS to propagate. Test:

```bash
ping yourdomain.com   # should resolve to your Elastic IP
```

### 8.2 Update Nginx config with domain

```bash
sudo nano /etc/nginx/sites-available/healthy-food-api
```

Change `server_name` line:

```nginx
server_name yourdomain.com www.yourdomain.com;
```

Reload Nginx:

```bash
sudo nginx -t && sudo systemctl reload nginx
```

### 8.3 Install SSL certificate (free via Let's Encrypt)

```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

Follow the prompts — Certbot will:

- Verify domain ownership
- Issue a certificate
- Auto-update your Nginx config for HTTPS
- Redirect HTTP → HTTPS automatically

SSL auto-renews via a cron job Certbot installs — you don't need to do anything.

Verify: visit `https://yourdomain.com/api` — you should see the Swagger UI.

---

## Step 9 — Configure Casso Webhook

1. Log in to your Casso account
2. Go to **Webhook settings** → set the URL to:
   ```
   https://yourdomain.com/webhooks/casso
   ```
3. Copy the **Secure Token** → paste it into your `.env` as `CASSO_SECURE_TOKEN`
4. Restart the app:
   ```bash
   pm2 restart healthy-food-api
   ```

---

## Step 10 — CI/CD with GitHub Actions (Optional)

Auto-deploy every time you push to `main`.

Create `.github/workflows/deploy.yml` in your repo:

```yaml
name: Deploy to EC2

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy via SSH
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.EC2_HOST }}
          username: ubuntu
          key: ${{ secrets.EC2_SSH_KEY }}
          script: |
            cd ~/healthy-food-ecommerce
            git pull origin main
            yarn install
            yarn build
            pm2 restart healthy-food-api
```

In your GitHub repo → **Settings** → **Secrets and variables** → **Actions**, add:

- `EC2_HOST` — your Elastic IP
- `EC2_SSH_KEY` — contents of your `.pem` file (paste the full text)

---

## Step 11 — Useful Commands

```bash
# View live logs
pm2 logs healthy-food-api

# Restart app (after .env change)
pm2 restart healthy-food-api

# Pull latest code and redeploy manually
cd ~/healthy-food-ecommerce
git pull
yarn install
yarn build
pm2 restart healthy-food-api

# Check Nginx errors
sudo tail -f /var/log/nginx/error.log

# Check app is listening on port 3300
ss -tlnp | grep 3300

# Monitor CPU/RAM
pm2 monit
```

---

## Free Tier Usage Checklist

Stay within these to avoid charges:

| Resource          | Free Limit                             | Your Usage                  |
| ----------------- | -------------------------------------- | --------------------------- |
| EC2 t2.micro      | 750 hrs/month                          | 1 instance = 744 hrs ✓      |
| EC2 storage       | 30 GB gp2                              | 8 GB ✓                      |
| Data transfer out | 1 GB/month                             | Low for a student project ✓ |
| Elastic IP        | Free when attached to running instance | 1 IP attached ✓             |

> **Warning:** Elastic IP costs ~$0.005/hr if your instance is **stopped** but the IP is still allocated. Either release the IP or keep the instance running.

---

## Summary Checklist

- [ ] AWS Educate account approved
- [ ] EC2 t2.micro launched (Ubuntu 22.04, us-east-1)
- [ ] Security group configured (ports 22, 80, 443)
- [ ] Elastic IP allocated and associated
- [ ] MongoDB Atlas M0 cluster created
- [ ] EC2 IP whitelisted on Atlas
- [ ] Repo cloned and built on EC2
- [ ] `.env` file created with all production values
- [ ] PM2 running and saved for auto-restart
- [ ] Nginx configured and reloaded
- [ ] Domain pointed to Elastic IP (optional)
- [ ] SSL certificate installed via Certbot (optional, needed for Casso)
- [ ] Casso webhook URL updated in Casso dashboard
- [ ] GitHub Actions CI/CD set up (optional)
