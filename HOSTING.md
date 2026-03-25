# Hosting Strategy — Healthy Food E-Commerce

Stack: **NestJS (Node.js) + MongoDB**
Requirements: public HTTPS URL (for Casso webhook), persistent database, low/zero cost.

---

## TL;DR Recommendation for Students

| Layer                    | Pick                                                     |
| ------------------------ | -------------------------------------------------------- |
| **API (backend)**        | Render (free tier) or Railway ($5/mo credit)             |
| **Database**             | MongoDB Atlas (free M0 cluster, 512 MB)                  |
| **Webhook tunnel (dev)** | ngrok (already wired up)                                 |
| **Domain (optional)**    | Freenom (.tk/.ml) or Cloudflare (free DNS on any domain) |

---

## Option 1 — Fully Free (Zero Cost)

### API: Render Free Tier

- **Cost:** $0
- Deploys from GitHub automatically on push
- 512 MB RAM, shared CPU
- **Caveat:** spins down after 15 min of inactivity (cold start ~30s) — fine for a student project / demo
- Custom domain supported (HTTPS auto-provisioned)
- Set all env vars in the Render dashboard

**Deploy steps:**

1. Connect GitHub repo at https://render.com
2. New → Web Service → select repo
3. Build command: `yarn build`
4. Start command: `node dist/src/main.js`
5. Add all env vars from `.env`

### Database: MongoDB Atlas Free Tier (M0)

- **Cost:** $0 forever
- 512 MB storage, shared cluster
- Hosted on AWS/GCP/Azure (your choice of region)
- Auto-backups not included on free tier, but good enough for dev/demo
- Set `DATABASE_URL` to the Atlas connection string

**Setup:**

1. https://cloud.mongodb.com → create free M0 cluster
2. Add IP `0.0.0.0/0` to Network Access (allow all, simpler for student use)
3. Create a DB user → copy connection string → paste into `DATABASE_URL`

### Verdict

- Fully free, publicly accessible, Casso webhook works
- Cold starts on Render are the only pain point

---

## Option 2 — Cheap Paid (~$0–5/month)

### API: Railway

- **Cost:** $5/month free credit (usually covers a small Node.js app)
- No cold starts (always-on within credit limit)
- Deploy from GitHub or CLI (`railway up`)
- Env vars set via dashboard or `railway.toml`
- Built-in metrics and logs

**Deploy:**

```bash
npm install -g @railway/cli
railway login
railway init
railway up
```

### Database: MongoDB Atlas M0 (still free)

- Same as Option 1 — no reason to pay for DB at this scale

### Verdict

- Best experience for ~$0–5/month
- Recommended if cold starts on Render annoy you

---

## Option 3 — VPS (Most Control, ~$4–6/month)

Run everything on a single cheap VPS. More work to set up but most flexible.

### Providers

| Provider         | Cheapest Plan    | RAM    | Storage | Notes                                         |
| ---------------- | ---------------- | ------ | ------- | --------------------------------------------- |
| **Hetzner**      | €3.29/mo (CAX11) | 2 GB   | 40 GB   | Best value, EU-based                          |
| **Vultr**        | $2.50/mo         | 512 MB | 10 GB   | US/Asia/EU regions                            |
| **DigitalOcean** | $4/mo (Droplet)  | 512 MB | 10 GB   | Good docs, student promo via GitHub Education |
| **Contabo**      | €3.99/mo         | 4 GB   | 100 GB  | Cheapest per GB RAM                           |

> **GitHub Education Pack** gives $200 DigitalOcean credit — check https://education.github.com/pack

### Self-host MongoDB on VPS

- Install MongoDB Community Edition on the same VPS
- Or keep MongoDB Atlas free M0 and point the VPS to it (simpler)

### Setup on VPS (example: Ubuntu + PM2)

```bash
# On the VPS
sudo apt update && sudo apt install -y nodejs npm git
npm install -g pm2 yarn

# Clone and build
git clone <your-repo>
cd healthy-food-ecommerce
yarn install
yarn build

# Create .env with your values
cp .env.example .env
nano .env

# Run with PM2 (auto-restart on crash/reboot)
pm2 start dist/src/main.js --name healthy-food-api
pm2 save
pm2 startup

# Reverse proxy with Nginx + free SSL
sudo apt install -y nginx certbot python3-certbot-nginx
# point your domain to the VPS IP, then:
sudo certbot --nginx -d yourdomain.com
```

### Verdict

- Full control, no cold starts, run any Node.js version
- Requires manual maintenance (OS updates, PM2 monitoring)
- Best choice if you want real DevOps experience

---

## Option 4 — Serverless / Edge (Free but Complex)

### Vercel / Netlify

- Designed for frontend + serverless functions, **not ideal** for NestJS
- NestJS can be adapted (using `@nestjs/platform-express` with serverless adapter) but requires significant refactoring
- MongoDB connections need special handling (connection pooling breaks on serverless)
- **Not recommended** for this project without major changes

### Cloudflare Workers

- Very cheap ($0 on free tier, $5/mo for Workers Paid)
- Requires rewriting to use Cloudflare's runtime (no Node.js APIs)
- **Not recommended** — too much effort for a student project

---

## Option 5 — Cloud Free Tiers (AWS / GCP / Azure)

All three have free tiers but they expire after 12 months.

| Cloud     | Free Offer                                   | Catch                 |
| --------- | -------------------------------------------- | --------------------- |
| **AWS**   | EC2 t2.micro (1 yr), 750 hrs/mo              | Expires after 1 year  |
| **GCP**   | $300 credit (90 days) + always-free e2-micro | e2-micro is very slow |
| **Azure** | $100 credit (30 days) + B1s VM (1 yr)        | Expires after 1 year  |

**Best for a student:** AWS free tier EC2 t2.micro is usable for 1 year. After that, ~$8–10/month.

---

## Casso Webhook: Making it Public

Casso needs to POST to a public HTTPS URL. Each hosting option handles this:

| Option                | Webhook URL                                     |
| --------------------- | ----------------------------------------------- |
| Render                | `https://your-app.onrender.com/webhooks/casso`  |
| Railway               | `https://your-app.railway.app/webhooks/casso`   |
| VPS + Nginx + Certbot | `https://yourdomain.com/webhooks/casso`         |
| Local dev (ngrok)     | Already wired — see `NGROK_AUTHTOKEN` in `.env` |

---

## Environment Variables Checklist for Production

```env
NODE_ENV=production
PORT=3300

DATABASE_URL=mongodb+srv://<user>:<pass>@cluster.mongodb.net
DATABASE_NAME=healthy-food-ecommerce

JWT_SECRET=<strong-random-64-char>
REFRESH_JWT_SECRET=<strong-random-64-char>
JWT_EXPIRES_IN=1h
REFRESH_JWT_EXPIRES_IN=7d

ENCRYPTION_KEY=<strong-random-32-char>

CASSO_SECURE_TOKEN=<from-casso-dashboard>

# Leave empty in production — ngrok only runs in dev
# NGROK_AUTHTOKEN=
```

---

## Summary Matrix

| Option                          | Cost/month      | Cold Start | Effort | Best For                    |
| ------------------------------- | --------------- | ---------- | ------ | --------------------------- |
| Render + Atlas                  | **$0**          | Yes (~30s) | Low    | Demo / portfolio            |
| Railway + Atlas                 | **~$0–5**       | No         | Low    | Active development          |
| Hetzner VPS + Atlas             | **~€3–4**       | No         | Medium | Learning DevOps             |
| DigitalOcean + GitHub Education | **$0 (credit)** | No         | Medium | Students with GitHub pack   |
| AWS Free Tier                   | **$0 (1 yr)**   | No         | High   | Cloud resume / AWS learning |

**Starter path:** Render (free) → Railway (when cold starts hurt) → Hetzner VPS (when you want full control).
