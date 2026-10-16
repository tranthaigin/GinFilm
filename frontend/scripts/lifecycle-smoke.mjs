import puppeteer from 'puppeteer';
import assert from 'node:assert/strict';

const base = process.env.SMOKE_URL || 'http://127.0.0.1:5178';
const browser = await puppeteer.launch({ headless: true });
const pages = [];
async function testPage(respond = () => []) {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => { errors.push(error.message); console.error(error.message); });
  await page.setRequestInterception(true);
  page.on('request', async request => {
    const url = new URL(request.url());
    if (url.pathname.startsWith('/api/')) {
      const auth = url.pathname.startsWith('/api/auth/');
      await request.respond({ status: auth ? 401 : 200, contentType: 'application/json', body: JSON.stringify(await respond(url, request)) });
    } else if (url.origin !== new URL(base).origin) await request.abort();
    else await request.continue();
  });
  await page.goto(base + '/login', { waitUntil: 'networkidle0' });
  await page.evaluate(async () => {
    window.harness = await import('/scripts/browser-harness.js');
    window.React = window.harness.React;
    const { createRoot } = window.harness;
    const target = document.createElement('div'); target.id = 'lifecycle-test'; document.body.appendChild(target);
    window.testRoot = createRoot(target);
  });
  pages.push({ page, errors });
  return page;
}
async function text(page) { return page.$eval('#lifecycle-test', node => node.innerText); }
try {
  const asyncPage = await testPage();
  await asyncPage.evaluate(async () => {
    const { useAsync } = await import('/src/features/user/hooks/useAsync.js');
    const R = window.React;
    window.requests = [];
    function Harness({ source }) {
      const fetcher = R.useCallback(() => new Promise((resolve, reject) => window.requests.push({ source, resolve, reject })), [source]);
      const state = useAsync(fetcher);
      window.refetch = state.refetch;
      return R.createElement('pre', null, JSON.stringify({ loading: state.loading, data: state.data, error: state.error?.message || null }));
    }
    window.renderSource = source => window.testRoot.render(R.createElement(Harness, { source }));
    window.renderSource('A');
  });
  await asyncPage.waitForFunction(() => window.requests.length === 1);
  await asyncPage.evaluate(() => { window.oldRefetch = window.refetch; window.renderSource('B'); });
  await asyncPage.waitForFunction(() => window.requests.length === 2);
  await asyncPage.evaluate(() => window.requests[1].resolve('new-result'));
  await asyncPage.waitForFunction(() => document.querySelector('#lifecycle-test').innerText.includes('new-result'));
  await asyncPage.evaluate(() => window.requests[0].resolve('stale-result'));
  assert.deepEqual(JSON.parse(await text(asyncPage)), { loading: false, data: 'new-result', error: null });
  await asyncPage.evaluate(() => { window.oldRefetch().catch(() => {}); });
  await asyncPage.waitForFunction(() => window.requests.length === 3);
  await asyncPage.evaluate(() => window.requests[2].resolve('old-refetch-result'));
  assert.equal(JSON.parse(await text(asyncPage)).loading, false, 'Stale refetch must not leave the current request loading');
  await asyncPage.evaluate(() => { window.refetch().catch(() => {}); });
  await asyncPage.waitForFunction(() => window.requests.length === 4);
  assert.equal(JSON.parse(await text(asyncPage)).loading, true);
  await asyncPage.evaluate(() => window.requests[3].reject(new Error('retry-failed')));
  await asyncPage.waitForFunction(() => document.querySelector('#lifecycle-test').innerText.includes('retry-failed'));
  console.log('PASS useAsync: stale responses/refetch, loading, error and retry');

  const clockPage = await testPage();
  await clockPage.evaluate(async () => {
    const { useCountdown } = await import('/src/shared/hooks/useCountdown.js');
    window.clock = Date.now(); Date.now = () => window.clock;
    function Clock() { return window.React.createElement('p', null, useCountdown(new Date(window.clockStart + 120000).toISOString())); }
    window.clockStart = window.clock;
    window.testRoot.render(window.React.createElement(Clock));
  });
  await clockPage.waitForFunction(() => document.querySelector('#lifecycle-test').innerText === '120');
  await clockPage.evaluate(() => { window.clock += 115000; });
  await clockPage.waitForFunction(() => document.querySelector('#lifecycle-test').innerText === '5');
  await clockPage.evaluate(() => { window.clock += 20000; });
  await clockPage.waitForFunction(() => document.querySelector('#lifecycle-test').innerText === '0');
  console.log('PASS countdown: elapsed wall time and expiry after throttling');

  const youtubePage = await testPage();
  await youtubePage.evaluate(async () => {
    const { default: Player } = await import('/src/features/user/components/common/YouTubePlayer.jsx');
    window.playerCount = 0; window.destroyCount = 0; window.progressValues = [];
    window.YT = { PlayerState: { PLAYING: 1, PAUSED: 2, ENDED: 0 }, Player: class {
      constructor(host, options) {
        if (!host.isConnected) throw new Error('Detached YouTube host');
        window.playerCount++; this.frame = document.createElement('iframe'); host.replaceWith(this.frame);
        window.latestPlayerOptions = options;
      }
      getCurrentTime() { return 30; } getDuration() { return 60; }
      playVideo() {} destroy() { window.destroyCount++; this.frame.remove(); }
    } };
    window.renderVideo = (id, callbackName) => window.testRoot.render(window.React.createElement(Player, {
      videoId: id, onProgress: progress => window.progressValues.push([callbackName, progress]),
    }));
    window.renderVideo('first', 'first-callback');
  });
  await youtubePage.waitForFunction(() => window.playerCount === 1);
  await youtubePage.evaluate(() => window.latestPlayerOptions.events.onStateChange({ data: 1 }));
  await youtubePage.waitForFunction(() => window.progressValues.length > 0);
  await youtubePage.evaluate(() => window.renderVideo('first', 'updated-callback'));
  await youtubePage.waitForFunction(() => window.progressValues.some(value => value[0] === 'updated-callback'));
  assert.equal(await youtubePage.evaluate(() => window.playerCount), 1, 'Progress rerenders must not recreate player');
  await youtubePage.evaluate(() => window.renderVideo('second', 'second-callback'));
  await youtubePage.waitForFunction(() => window.playerCount === 2);
  assert.equal(await youtubePage.evaluate(() => window.destroyCount), 1);
  await youtubePage.evaluate(() => window.testRoot.unmount());
  assert.equal(await youtubePage.evaluate(() => window.destroyCount), 2);
  console.log('PASS YouTube: latest callbacks, stable player, attached hosts and cleanup');

  const draftPage = await testPage();
  await draftPage.evaluate(async () => {
    const R = window.React;
    const { MemoryRouter, Routes, Route, useLocation, useNavigate } = window.harness;
    const { default: Editor } = await import('/src/features/admin/pages/RoomEditorPage.jsx');
    sessionStorage.setItem('room_draft_1_new', JSON.stringify({ roomName: 'Recovered draft', grid: [['NORMAL','VIP'],['NORMAL','EMPTY']] }));
    sessionStorage.setItem('room_draft_2_new', JSON.stringify({ roomName: 'Invalid draft', grid: [['NORMAL'],['NORMAL','NORMAL']] }));
    function KeyedEditor() { window.moveRoom = useNavigate(); return R.createElement(Editor, { key: useLocation().pathname }); }
    window.testRoot.render(R.createElement(MemoryRouter, { initialEntries: ['/admin/theaters/1/rooms/new'] }, R.createElement(Routes, null,
      R.createElement(Route, { path: '/admin/theaters/:theaterId/rooms/new', element: R.createElement(KeyedEditor) }))));
  });
  await draftPage.waitForFunction(() => document.querySelector('#lifecycle-test input')?.value === 'Recovered draft');
  const dimensions = await draftPage.$$eval('#lifecycle-test input[type="number"]', nodes => nodes.map(node => node.value));
  assert.ok(dimensions.filter(value => value === '2').length >= 2, 'Draft dimensions must follow saved grid');
  await draftPage.evaluate(() => window.moveRoom('/admin/theaters/2/rooms/new'));
  await draftPage.waitForFunction(() => document.querySelector('#lifecycle-test input')?.value === '');
  const defaults = await draftPage.$$eval('#lifecycle-test input[type="number"]', nodes => nodes.map(node => node.value));
  assert.ok(defaults.includes('10') && defaults.includes('15'), 'Corrupt draft must fall back to a usable grid');
  console.log('PASS room drafts: restore, dimension normalization, corrupt fallback, route isolation');

  let scannerCalls = 0;
  const scannerPage = await testPage(url => {
    if (url.pathname.startsWith('/api/scan/offline/')) { scannerCalls++; return { bookingId: 1, ticketCode: 'TK-TEST', allTickets: [], combos: [], movieName: 'Test movie', seatName: 'A1' }; }
    return [];
  });
  await scannerPage.evaluate(async () => {
    const { MemoryRouter } = window.harness;
    const { default: Scanner } = await import('/src/features/staff/pages/TicketScannerPage.jsx');
    window.testRoot.render(window.React.createElement(MemoryRouter, { initialEntries: ['/staff/scan-qr?code=TK-TEST'] }, window.React.createElement(Scanner)));
  });
  await scannerPage.waitForFunction(() => document.querySelector('#lifecycle-test input')?.value === 'TK-TEST');
  await scannerPage.waitForFunction(() => document.querySelector('#lifecycle-test').innerText.includes('Test movie'));
  assert.equal(scannerCalls, 1);
  await scannerPage.evaluate(() => {
    const button = [...document.querySelectorAll('#lifecycle-test button')].find(node => node.innerText.includes('Tra Cứu'));
    if (!button) throw new Error('Missing ticket lookup button'); button.click();
  });
  await scannerPage.waitForFunction(() => document.querySelector('#lifecycle-test').innerText.includes('Test movie'));
  assert.equal(scannerCalls, 2, 'Same code must still refetch');
  console.log('PASS scanner: URL code hydration and repeated lookup');

  const ticketPage = await testPage(url => {
    if (url.pathname === '/api/bookings/my-tickets') return [{ id: 42, movieId: 1, movie: 'Numeric ticket test', type: 'cinema',
      date: '20/10/2026', time: '20:00', cinema: 'GinFilm | Room 1', total: 45000, seats: ['A1'], bookingCode: 'TK42', ticketDetails: [] }];
    return [];
  });
  await ticketPage.evaluate(async () => {
    const { MemoryRouter } = window.harness;
    const { default: MyTickets } = await import('/src/features/user/pages/user/MyTicketsPage.jsx');
    window.testRoot.render(window.React.createElement(MemoryRouter, { initialEntries: ['/my-tickets?ticketCode=42'] }, window.React.createElement(MyTickets)));
  });
  await ticketPage.waitForFunction(() => [...document.querySelectorAll('#lifecycle-test button')].some(button => button.innerText.trim() === 'close'));
  assert.ok((await text(ticketPage)).includes('Numeric ticket test'));
  await ticketPage.evaluate(() => [...document.querySelectorAll('#lifecycle-test button')].find(button => button.innerText.trim() === 'close').click());
  await ticketPage.waitForFunction(() => ![...document.querySelectorAll('#lifecycle-test button')].some(button => button.innerText.trim() === 'close'));
  assert.ok((await text(ticketPage)).toLocaleLowerCase('vi').includes('vé của tôi'), 'Closing the URL-selected ticket must leave the list visible');
  console.log('PASS my tickets: numeric URL ID, list loading, modal open and close');

  let paymentRequests = 0;
  let statusRequests = 0;
  const posPage = await testPage(url => {
    if (url.pathname.endsWith('/payment-status')) {
      statusRequests++;
      return { bookingStatus: statusRequests > 1 ? 'COMPLETED' : 'PENDING', paymentStatus: statusRequests > 1 ? 'SUCCESS' : 'PENDING', ticketCode: 'TK-VERIFIED', amount: 50000 };
    }
    if (url.pathname.endsWith('/payment')) { paymentRequests++; return { paymentUrl: 'https://payment.example.invalid', ticketCode: 'TK-PENDING' }; }
    return [];
  });
  await posPage.evaluate(async () => {
    const { default: Checkout } = await import('/src/features/staff/pages/pos/POSCheckout.jsx');
    window.receipts = [];
    window.open = () => null;
    window.testRoot.render(window.React.createElement(Checkout, { bookingData: { bookingId: 42, movieName: 'POS test', totalSeatPrice: 45000 }, onNext: value => window.receipts.push(value), onBack: () => {} }));
  });
  await posPage.waitForFunction(() => document.querySelector('#lifecycle-test').innerText.includes('POS test'));
  await posPage.evaluate(() => {
    [...document.querySelectorAll('#lifecycle-test span')].find(node => node.textContent === 'VNPAY').parentElement.click();
  });
  await posPage.waitForFunction(() => document.querySelector('#lifecycle-test input[type="radio"]')?.checked);
  await posPage.evaluate(() => {
    [...document.querySelectorAll('#lifecycle-test button')].find(node => node.textContent.includes('Xác Nhận Thanh Toán')).click();
  });
  assert.equal(paymentRequests, 0, 'Blocked popup must not prepare an inaccessible payment');
  await posPage.evaluate(() => {
    window.open = () => ({ closed: false, location: {}, close() { this.closed = true; } });
    [...document.querySelectorAll('#lifecycle-test button')].find(node => node.textContent.includes('Xác Nhận Thanh Toán')).click();
  });
  await posPage.waitForFunction(() => document.querySelector('#lifecycle-test button')?.disabled === true);
  await new Promise(resolve => setTimeout(resolve, 1300));
  assert.deepEqual(await posPage.evaluate(() => window.receipts), [], 'Pending payment must not issue a receipt');
  await posPage.waitForFunction(() => window.receipts.length === 1);
  assert.equal(await posPage.evaluate(() => window.receipts[0].ticketCode), 'TK-VERIFIED');
  assert.equal(await posPage.evaluate(() => window.receipts[0].finalTotal), 50000, 'Receipt amount must come from the server');
  assert.equal(paymentRequests, 1);
  await posPage.evaluate(() => window.testRoot.unmount());
  console.log('PASS POS: popup blocking, pending payment, server confirmation and receipt amount');

  for (const { errors } of pages) assert.deepEqual(errors, [], 'Browser JavaScript error');
} finally { await browser.close(); }
