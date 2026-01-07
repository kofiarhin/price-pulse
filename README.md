# Price Pulse

## Heroku Configuration

To deploy this application on Heroku with Playwright support, follow these steps:

### 1. Buildpacks
Use the Playwright Community Buildpack along with the Node.js buildpack.

```bash
heroku buildpacks:clear -a <APP>
heroku buildpacks:add --index 1 playwright-community/heroku-playwright-buildpack -a <APP>
heroku buildpacks:add --index 2 heroku/nodejs -a <APP>
```

### 2. Config Vars
Set the `PLAYWRIGHT_BROWSERS_PATH` to 0 to ensure Playwright looks for browsers in the correct location.

```bash
heroku config:set PLAYWRIGHT_BROWSERS_PATH=0 -a <APP>
```

### 3. Verify
Run the smoke test on a one-off dyno to ensure everything is working correctly.

```bash
heroku run node scripts/playwright-smoke.js -a <APP>
```

### 4. Deploy
Push your changes to Heroku.

```bash
git push heroku main
```

## Local Development
To run the smoke test locally:

```bash
node scripts/playwright-smoke.js
```
