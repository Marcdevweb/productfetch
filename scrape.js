const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const make = 'AJP';
  const model = 'PR7';
  const year = '2017';
  const url = `https://www.ktechsuspensionusa.com/bike-data/bike/index?find=${make}_${model}_${year}`;

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36');

  console.log('🟢 Opening page...');
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

  // ✅ Write bike-output.html
  fs.writeFileSync('bike-output.html', bikeHTML);
  fs.writeFileSync('bike-products.json', JSON.stringify(categories, null, 2));

  // ✅ Generate ktech-full-preview.html
  let fullHTML = `
    <html>
    <head>
      <meta charset="UTF-8">
      <title>KTech Full Preview</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        h1, h2 { color: #2c3e50; }
        .bike-details, .category { margin-bottom: 30px; }
        .product { margin: 10px 0; padding: 10px; border-bottom: 1px solid #ccc; }
        .product img { max-width: 100px; display: block; margin-top: 5px; }
      </style>
    </head>
    <body>
      <h1>KTech Scraped Data</h1>
      <h2>🛠️ Bike Info</h2>
      <div class="bike-details">${bikeHTML}</div>
      <h2>📦 Product Categories</h2>
  `;

  categories.forEach(cat => {
    fullHTML += `<div class="category"><h3>${cat.title}</h3>`;
    cat.products.forEach(p => {
      fullHTML += `
        <div class="product">
          <strong>${p.name}</strong><br>
          SKU: ${p.sku}<br>
          Price: ${p.price}<br>
          <img src="${p.image}" alt="">
        </div>
      `;
    });
    fullHTML += '</div>';
  });

  fullHTML += '</body></html>';

  fs.writeFileSync('ktech-full-preview.html', fullHTML);

  console.log('✅ Saved: bike-output.html + bike-products.json + ktech-full-preview.html');
  await browser.close();
})();
