const { chromium } = require('playwright');

(async () => {
    console.log('Starting Playwright smoke test...');
    try {
        const browser = await chromium.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu'
            ]
        });
        const page = await browser.newPage();
        await page.goto('https://example.com', { waitUntil: 'domcontentloaded', timeout: 60000 });
        const title = await page.title();
        console.log(`SMOKE_TEST_TITLE: ${title}`);
        await browser.close();
        console.log('Playwright smoke test passed.');
    } catch (error) {
        console.error('Playwright smoke test failed:', error);
        process.exit(1);
    }
})();
