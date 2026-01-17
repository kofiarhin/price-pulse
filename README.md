# PricePulse

Track prices, catch drops, save money.

**Live**

- Web: https://price-pulse-a8og.vercel.app
- API: https://price-pulse-api-2bb24285c39b.herokuapp.com

---

## Stack

- **Client:** React (Vite) + SCSS
- **Server:** Node.js + Express + MongoDB (Mongoose)
- **Automation:** Playwright (scraping + smoke test)

---

## Monorepo Structure

```txt
price-pulse/
  client/      # Vite app
  server/      # Express API
  scripts/     # Playwright smoke test + scraping scripts
  data/        # local data (optional)
  storage/     # local storage (optional)
```

---

## Environment Variables

### Client (Vite)

Create `client/.env`:

```bash
VITE_API_URL=http://localhost:5000
```

Production (Vercel):

```bash
VITE_API_URL=https://price-pulse-api-2bb24285c39b.herokuapp.com
```

### Server (Express)

Create `.env` in the project root:

```bash
PORT=5000
MONGO_URI=mongodb+srv://<user>:<pass>@<cluster>/<db>?retryWrites=true&w=majority
```

**Production (Heroku Config Vars)**

```bash
heroku config:set MONGO_URI="mongodb+srv://<user>:<pass>@<cluster>/<db>?retryWrites=true&w=majority" -a <APP>
```

---

## Install + Run (Local)

### 1) Install deps

```bash
npm install
```

### 2) Start API (port 5000)

```bash
npm run server
```

### 3) Start Client (port 4000)

```bash
npm run client
```

Client: `http://localhost:4000`  
API: `http://localhost:5000`

---

## API

### Health

- `GET /` — liveness
- `GET /health` — readiness + DB state

### Products

- `GET /api/products?search=&category=&sort=&page=&limit=`
- `GET /api/products/:id`
- `POST /api/products`
- `PUT /api/products/:id`
- `DELETE /api/products/:id`

**Sort options**

- `newest` (default)
- `oldest`
- `price-asc`
- `price-desc`
- `discount-desc`

---

## Deployment

## Vercel (Client)

### SPA Refresh Fix (React Router)

Client routes like `/products/:id` must rewrite to `index.html`.

Create `client/vercel.json`:

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

Vercel project settings:

- **Root Directory:** `client`

Set env var in Vercel:

- `VITE_API_URL=https://price-pulse-api-2bb24285c39b.herokuapp.com`

---

## Heroku (Server + Playwright)

### 1) Buildpacks

```bash
heroku buildpacks:clear -a <APP>
heroku buildpacks:add --index 1 playwright-community/heroku-playwright-buildpack -a <APP>
heroku buildpacks:add --index 2 heroku/nodejs -a <APP>
```

### 2) Config Vars

```bash
heroku config:set PLAYWRIGHT_BROWSERS_PATH=0 -a <APP>
heroku config:set MONGO_URI="mongodb+srv://<user>:<pass>@<cluster>/<db>?retryWrites=true&w=majority" -a <APP>
```

### 3) Smoke Test

```bash
heroku run node scripts/playwright-smoke.js -a <APP>
```

### 4) Deploy

```bash
git push heroku main
```

---

## Scripts

Playwright smoke test (local):

```bash
node scripts/playwright-smoke.js
```

---

## Notes

- `.env` files are local-only. Use **Vercel Env Vars** + **Heroku Config Vars** in production.
- If refresh returns 404 in production, confirm `client/vercel.json` exists and Vercel Root Directory is `client`.
