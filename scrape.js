const express = require('express');
const puppeteer = require('puppeteer');
const cors = require('cors');
const app = express();

app.use(express.json());
app.use(cors()); // ✅ Enable CORS if frontend is on different origin

// POST endpoint to receive make/model/year from frontend
app.post('/api/fetch-ktech', async (req, res) => {
  const { make, model, year } = req.body;

  if (!make || !model || !year) {
    return res.status(400).json({ error: 'Missing parameters' });
  }

  const url = `https://www.ktechsuspensionusa.com/bike-data/bike/index?find=${make}_${model}_${year}`;

  try {
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36');

    console.log('🟢 Fetching:', url);
    await page.goto(url, { waitUntil: 'domcontentloaded' });

    await page.waitForSelector('.bike-details', { timeout: 20000 });

    const bikeHTML = await page.$eval('.bike-details', el => el.outerHTML);

    const categories = await page.$$eval('.part-finder-front-springs-container', containers =>
      containers.map(container => {
        const title = container.querySelector('.part-finder-front-springs-title h3')?.innerText || 'Untitled';
        const products = Array.from(container.querySelectorAll('.part-finder-product')).map(prod => {
          const name = prod.querySelector('.part-finder-product-name')?.innerText || '';
          const sku = prod.querySelector('.part-finder-product-sku span')?.innerText || '';
          const price = prod.querySelector('.price strong')?.innerText || '';
          const image = prod.querySelector('img')?.getAttribute('data-src') || '';
          return { name, sku, price, image };
        });
        return { title, products };
      })
    );

    await browser.close();

    // ✅ Send data back to frontend
    return res.json({
      status: 'success',
      bike_info: bikeHTML,
      categories
    });

  } catch (error) {
    console.error('❌ Error scraping:', error.message);
    return res.status(500).json({ error: 'Scraping failed', details: error.message });
  }
});

// Start server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
