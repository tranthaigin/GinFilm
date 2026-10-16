import puppeteer from 'puppeteer';
import assert from 'node:assert/strict';

const base = process.env.SMOKE_URL || 'http://127.0.0.1:5178';
const movie = { id: 1, title: 'GinFilm smoke movie', description: 'Test trailer S3', duration: 120,
  trailerUrl: 's3://java-06/trailer/test.mp4', posterUrl: '', genres: [], ageRating: 'P',
  isOnlineAvailable: true, onlinePrice: 45000, releaseDate: '2026-10-11' };
const browser = await puppeteer.launch({ headless: true });
try {
  for (const route of ['/home', '/about', '/register', '/login', '/login/forgot-password', '/login/forgot-pin', '/movie-info?id=1']) {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setRequestInterception(true);
    page.on('request', async request => {
      const url = new URL(request.url());
      if (url.pathname.startsWith('/api/')) {
        if (url.pathname.startsWith('/api/auth/')) {
          await request.respond({ status: 401, contentType: 'application/json', body: '{"message":"Not authenticated"}' });
          return;
        }
        const body = url.pathname === '/api/movies/1' ? movie : url.pathname === '/api/system-configs' ? {} : [];
        await request.respond({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
      } else if (url.origin !== new URL(base).origin) await request.abort();
      else await request.continue();
    });
    await page.goto(base + route, { waitUntil: 'networkidle0' });
    assert.deepEqual(errors, [], `${route}: JavaScript error`);
    const text = await page.evaluate(() => document.body.innerText);
    assert.ok(text.trim().length > 30, `${route}: blank page`);
    if (route.startsWith('/movie-info')) {
      assert.ok(text.includes(movie.title), 'S3 trailer movie page did not render');
      if (process.env.SMOKE_SCREENSHOT) await page.screenshot({ path: process.env.SMOKE_SCREENSHOT, fullPage: true });
    }
    console.log(`PASS ${route}`);
    await page.close();
  }
  const page = await browser.newPage();
  const errors = [];
  const processed = [];
  const admin = { id: '00000000-0000-0000-0000-000000000001', email: 'admin@example.com', fullName: 'Test admin', roles: ['ADMIN'] };
  const orders = [
    { kind: 'cinema', id: 1, reference: 'TK1', customer: 'customer@example.com', amount: 45000, method: 'STRIPE' },
    { kind: 'cinema', id: 2, reference: 'TK2', customer: 'customer@example.com', amount: 45000, method: 'VNPAY' },
  ];
  page.on('pageerror', error => errors.push(error.message));
  await page.evaluateOnNewDocument((user) => {
    localStorage.setItem('ginfilm-auth', JSON.stringify({ state: { user, isAuthenticated: true, accessToken: 'browser-test' }, version: 0 }));
  }, admin);
  await page.setRequestInterception(true);
  page.on('request', async request => {
    const url = new URL(request.url());
    if (url.pathname.startsWith('/api/')) {
      let body = [];
      if (url.pathname === '/api/auth/me') body = admin;
      if (url.pathname === '/api/admin/refunds') body = orders;
      if (url.pathname.startsWith('/api/admin/refunds/cinema/')) {
        processed.push({ id: url.pathname.split('/').at(-1), body: JSON.parse(request.postData()) });
        body = { status: url.pathname.endsWith('/1') && processed.filter(item => item.id === '1').length === 1 ? 'REFUND_PENDING' : 'REFUNDED' };
      }
      await request.respond({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
    } else if (url.origin !== new URL(base).origin) await request.abort();
    else await request.continue();
  });
  await page.goto(base + '/admin/refunds', { waitUntil: 'networkidle0' });
  const receipt = await page.$('input[aria-label="Mã chứng từ TK2"]');
  assert.ok(receipt, 'Refund page did not render pending transactions');
  const buttons = await page.$$('table button');
  assert.equal(await buttons[1].evaluate(button => button.disabled), true, 'Manual refund requires a receipt');
  await receipt.type('BANK-123');
  await buttons[1].click();
  await page.waitForFunction(() => document.querySelectorAll('tbody tr').length === 1);
  await page.click('table button');
  await page.waitForFunction(() => document.querySelector('[role="alert"]')?.innerText.includes('Stripe đang xử lý'));
  assert.equal(await page.$$eval('tbody tr', rows => rows.length), 1, 'Pending Stripe refund must remain visible');
  await page.click('table button');
  await page.waitForFunction(() => !document.querySelector('table'));
  assert.deepEqual(processed.map(item => item.id), ['2', '1', '1']);
  assert.equal(processed[0].body.receipt, 'BANK-123');
  assert.deepEqual(errors, []);
  console.log('PASS /admin/refunds: receipt required, pending Stripe preserved, confirmed refund removed');
  await page.close();

  const staffPage = await browser.newPage();
  const staffErrors = [];
  const staff = { ...admin, id: '00000000-0000-0000-0000-000000000003', email: 'staff@example.invalid', roles: ['ROLE_STAFF'] };
  staffPage.on('pageerror', error => staffErrors.push(error.message));
  await staffPage.evaluateOnNewDocument(user => localStorage.setItem('ginfilm-auth', JSON.stringify({ state: { user, isAuthenticated: true, accessToken: 'browser-test' }, version: 0 })), staff);
  const forbiddenRequests = [];
  await staffPage.setRequestInterception(true);
  staffPage.on('request', async request => {
    const url = new URL(request.url());
    if (url.pathname.startsWith('/api/')) {
      if (url.pathname.startsWith('/api/admin/') && url.pathname !== '/api/admin/combos') forbiddenRequests.push(url.pathname);
      await request.respond({ status: 200, contentType: 'application/json', body: JSON.stringify(url.pathname === '/api/auth/me' ? staff : []) });
    } else if (url.origin !== new URL(base).origin) await request.abort();
    else await request.continue();
  });
  await staffPage.goto(base + '/staff', { waitUntil: 'networkidle0' });
  assert.ok(staffPage.url().endsWith('/staff/pos'), 'Staff landing page must use an authorized POS route');
  const links = await staffPage.$$eval('a[href^="/staff"]', anchors => [...new Set(anchors.map(anchor => anchor.getAttribute('href')))]);
  assert.ok(links.every(link => ['/staff/pos', '/staff/scan-qr', '/staff/customers'].includes(link)), 'Staff menu exposes admin-only pages');
  console.log('PASS /staff: POS landing and authorized navigation');
  await staffPage.goto(base + '/staff/online-tickets', { waitUntil: 'networkidle0' });
  assert.ok(staffPage.url().endsWith('/forbidden'), 'Staff must not render an admin-only page');
  assert.deepEqual(forbiddenRequests, []);
  assert.deepEqual(staffErrors, []);
  console.log('PASS /staff/online-tickets: admin guard before private API requests');
  await staffPage.close();
} finally { await browser.close(); }
