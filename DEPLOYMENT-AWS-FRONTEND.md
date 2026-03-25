# AWS Frontend Deployment Plan — React + Vite

Stack: **React + Vite** (outputs static files in `dist/`)
Backend: NestJS on EC2 (see `DEPLOYMENT-AWS.md`)

---

## Architecture Overview

```
User browser
     │
     ▼
┌─────────────────────────────────────────┐
│  Option A: S3 + CloudFront (recommended)│
│  Static files served from CDN globally  │
└─────────────────────────────────────────┘
          or
┌─────────────────────────────────────────┐
│  Option B: Same EC2 via Nginx           │
│  Nginx serves dist/ on a separate port  │
│  or subdomain                           │
└─────────────────────────────────────────┘
          or
┌─────────────────────────────────────────┐
│  Option C: AWS Amplify                  │
│  One-click GitHub deploy, free tier     │
└─────────────────────────────────────────┘
     │
     ▼ API calls
NestJS on EC2 (https://api.yourdomain.com)
```

---

## Option A — S3 + CloudFront (Recommended)

Best for production. S3 hosts the files, CloudFront is a CDN that adds HTTPS and fast global delivery.

**Cost on AWS Educate free tier:**

- S3: 5 GB storage free, 20,000 GET requests/month free
- CloudFront: 1 TB data transfer free, 10M requests/month free
- Effectively **$0** for a student project

### A.1 — Build the frontend

In your React + Vite project, create a production `.env`:

```env
# .env.production
VITE_API_URL=https://api.yourdomain.com
```

Build:

```bash
yarn build
# produces dist/ folder
```

### A.2 — Create an S3 bucket

1. AWS Console → **S3** → **Create bucket**
2. Settings:
   - **Bucket name:** `healthy-food-frontend` (must be globally unique — add your initials)
   - **Region:** `us-east-1`
   - **Block all public access:** ❌ uncheck (we need public read)
   - Acknowledge the warning → Create bucket
3. Go into the bucket → **Properties** → scroll to **Static website hosting**
   - Enable it
   - Index document: `index.html`
   - Error document: `index.html` (important for React Router to work)
   - Save

4. Go to **Permissions** → **Bucket policy** → paste:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::healthy-food-frontend/*"
    }
  ]
}
```

Replace `healthy-food-frontend` with your actual bucket name.

### A.3 — Upload build files to S3

**Option 1 — AWS Console (manual):**

1. Bucket → **Upload** → drag the entire contents of your `dist/` folder
2. Upload

**Option 2 — AWS CLI (faster, repeatable):**

```bash
# Install AWS CLI
pip install awscli

# Configure with your Educate credentials
# (find them in the Vocareum portal → Account Details → AWS CLI)
aws configure
# AWS Access Key ID: <from Vocareum>
# AWS Secret Access Key: <from Vocareum>
# Default region: us-east-1
# Default output format: json

# Upload dist/ to S3
aws s3 sync dist/ s3://healthy-food-frontend --delete
```

> Note: AWS Educate credentials expire with your session. Re-run `aws configure` each new session.

### A.4 — Create a CloudFront Distribution

1. AWS Console → **CloudFront** → **Create distribution**
2. Settings:
   - **Origin domain:** select your S3 bucket from the dropdown
   - **Origin access:** Public (since bucket is already public)
   - **Viewer protocol policy:** Redirect HTTP to HTTPS
   - **Default root object:** `index.html`
3. Scroll down → **Create distribution**
4. Wait ~5 minutes for deployment (Status: Enabled)
5. Copy the **Distribution domain name** — looks like `d1234abcdef.cloudfront.net`

Your frontend is now live at `https://d1234abcdef.cloudfront.net`

### A.5 — Fix React Router (404 on refresh)

Without this, refreshing any page other than `/` gives a 403/404 from CloudFront.

1. CloudFront → your distribution → **Error pages** tab
2. **Create custom error response:**
   - HTTP error code: `403`
   - Response page path: `/index.html`
   - HTTP response code: `200`
3. Repeat for error code `404`

### A.6 — Add custom domain to CloudFront (optional)

If you have a domain (e.g. from Freenom or DuckDNS):

1. CloudFront distribution → **General** → Edit
2. **Alternate domain names (CNAMEs):** add `yourdomain.com`
3. **Custom SSL certificate:** Request a certificate via **ACM (AWS Certificate Manager)**
   - Must be in `us-east-1` for CloudFront
   - ACM is free
4. In your DNS settings, add a **CNAME** record:
   ```
   Type: CNAME
   Name: www
   Value: d1234abcdef.cloudfront.net
   ```

### A.7 — Redeploy after frontend changes

```bash
yarn build
aws s3 sync dist/ s3://healthy-food-frontend --delete

# Invalidate CloudFront cache so users get the new version immediately
aws cloudfront create-invalidation \
  --distribution-id <your-distribution-id> \
  --paths "/*"
```

---

## Option B — Same EC2 via Nginx (Simplest)

Serve the React app from the same server as the API. Good if you want everything in one place.

### B.1 — Build and copy files to EC2

On your laptop, build the frontend:

```bash
yarn build
```

Copy `dist/` to the EC2 instance:

```bash
scp -i ~/Downloads/healthy-food-key.pem -r dist/ ubuntu@<your-elastic-ip>:~/frontend-dist
```

Or if the frontend repo is on GitHub, clone it directly on the EC2 and build there:

```bash
# On EC2
git clone https://github.com/<your-username>/healthy-food-frontend.git
cd healthy-food-frontend
echo "VITE_API_URL=https://api.yourdomain.com" > .env.production
yarn install
yarn build
```

### B.2 — Serve with Nginx on a subdomain or path

**Option B-i: Separate subdomain** (`app.yourdomain.com`)

Create `/etc/nginx/sites-available/healthy-food-frontend`:

```nginx
server {
    listen 80;
    server_name app.yourdomain.com;
    root /home/ubuntu/healthy-food-frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

Enable and reload:

```bash
sudo ln -s /etc/nginx/sites-available/healthy-food-frontend /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# Add SSL for the frontend subdomain
sudo certbot --nginx -d app.yourdomain.com
```

**Option B-ii: Separate path on the same domain** (`yourdomain.com/app`)

Add a `location` block to the existing API Nginx config:

```nginx
location /app {
    alias /home/ubuntu/healthy-food-frontend/dist;
    try_files $uri $uri/ /app/index.html;
}
```

### B.3 — Redeploy

```bash
# On EC2
cd ~/healthy-food-frontend
git pull
yarn build
# Nginx serves the new files immediately — no restart needed
```

---

## Option C — AWS Amplify (Easiest Setup)

One-click GitHub deployment with CI/CD built in.

**Free tier:** 1,000 build minutes/month, 5 GB storage, 15 GB data transfer

### C.1 — Deploy

1. AWS Console → **AWS Amplify** → **Create new app**
2. **Host web app** → connect GitHub → select your frontend repo
3. Branch: `main`
4. Build settings — Amplify auto-detects Vite, but verify:
   ```yaml
   version: 1
   frontend:
     phases:
       preBuild:
         commands:
           - yarn install
       build:
         commands:
           - yarn build
     artifacts:
       baseDirectory: dist
       files:
         - '**/*'
     cache:
       paths:
         - node_modules/**/*
   ```
5. **Environment variables** → add:
   ```
   VITE_API_URL = https://api.yourdomain.com
   ```
6. Click **Save and deploy**

Amplify gives you a free URL: `https://main.xxxxxxx.amplifyapp.com`

Every push to `main` triggers an automatic redeploy.

### C.2 — Add custom domain

Amplify → your app → **Domain management** → **Add domain**

- Amplify handles DNS and SSL automatically if your domain is in Route 53
- For external domains, it gives you CNAME records to add manually

---

## Backend CORS Update (Required for All Options)

The backend `CORS_ORIGINS` env var must include your frontend URL.
Update `.env` on EC2:

```bash
nano ~/healthy-food-ecommerce/.env
```

Add or update:

```env
# Comma-separated list of allowed frontend origins
CORS_ORIGINS=https://d1234abcdef.cloudfront.net,https://app.yourdomain.com
```

Restart the API:

```bash
pm2 restart healthy-food-api
```

---

## Summary — Which Option to Pick?

|                   | Option A (S3 + CloudFront) | Option B (Same EC2)   | Option C (Amplify) |
| ----------------- | -------------------------- | --------------------- | ------------------ |
| **Cost**          | $0 (free tier)             | $0 (already have EC2) | $0 (free tier)     |
| **Setup effort**  | Medium                     | Low                   | Very low           |
| **HTTPS**         | Yes (CloudFront)           | Yes (Certbot)         | Yes (automatic)    |
| **CI/CD**         | Manual (CLI)               | Manual (git pull)     | Automatic (GitHub) |
| **Custom domain** | Yes (ACM + CloudFront)     | Yes (Certbot)         | Yes (automatic)    |
| **Best for**      | Proper AWS experience      | Quick & simple        | Fastest to ship    |

**Recommended path:**

- Want simplest → **Option C (Amplify)**
- Want to learn AWS properly → **Option A (S3 + CloudFront)**
- Already set up EC2 and want to keep it simple → **Option B**

---

## Full Production URL Setup (Example)

| Service       | URL                                                      |
| ------------- | -------------------------------------------------------- |
| Frontend      | `https://app.yourdomain.com` (or CloudFront/Amplify URL) |
| Backend API   | `https://api.yourdomain.com`                             |
| Swagger docs  | `https://api.yourdomain.com/api`                         |
| Casso webhook | `https://api.yourdomain.com/webhooks/casso`              |

DNS records needed:

```
A     @        → EC2 Elastic IP          (yourdomain.com)
A     api      → EC2 Elastic IP          (api.yourdomain.com)
CNAME app      → CloudFront/Amplify URL  (app.yourdomain.com)
```
