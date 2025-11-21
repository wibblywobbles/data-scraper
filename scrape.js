const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

async function scrapeMetric(page, name, url, grabber) {
  console.log(`Scraping ${name} from ${url}`);
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(3000);
    const value = await grabber(page);
    console.log(`${name} -> ${value}`);
    return value;
  } catch (err) {
    console.error(`Error scraping ${name}:`, err.message);
    return null;
  }
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const metrics = {};

  const tasks = [
    {
      name: 'Price',
      url: 'https://www.bitcoinmagazinepro.com/bitcoin-price-live/',
      grabber: async (page) => {
        const text = await page.textContent('body');
        return text ? text.match(/[\d,]+\.\d+/)?.[0] : null;
      }
    },
    {
      name: 'MVRV_Z',
      url: 'https://www.bitcoinmagazinepro.com/charts/mvrv-zscore/',
      grabber: async (page) => {
        const text = await page.textContent('body');
        return text ? text.match(/[\d\.]+/)?.[0] : null;
      }
    }
    // Add additional metric tasks here (we will tune selectors next)
  ];

  for (const task of tasks) {
    metrics[task.name] = await scrapeMetric(page, task.name, task.url, task.grabber);
  }

  await browser.close();

  const outDir = path.join(__dirname, 'data');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir);
  }

  const outPath = path.join(outDir, 'latest.json');
  const payload = {
    generated_at: new Date().toISOString(),
    metrics
  };

  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2));
  console.log(`Wrote ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
