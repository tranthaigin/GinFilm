import puppeteer from 'puppeteer';
import assert from 'node:assert/strict';

const base = process.env.SMOKE_URL || 'http://127.0.0.1:5178';
const browser = await puppeteer.launch({ headless: true });
try {
  const page = await browser.newPage();
  const errors = [];
  const mediaProxies = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setRequestInterception(true);
  page.on('request', async request => {
    const url = new URL(request.url());
    if (url.pathname === '/missing-video.mp4') return request.respond({ status: 404, body: 'Not found' });
    if (url.pathname.startsWith('/api/')) {
      if (url.pathname.startsWith('/api/media/')) mediaProxies.push(url.pathname);
      return request.respond({ status: url.pathname.startsWith('/api/auth/') ? 401 : 200,
        contentType: 'application/json', body: '[]' });
    }
    if (url.origin === new URL(base).origin || url.hostname === 'mdn.github.io') return request.continue();
    return request.abort();
  });
  await page.goto(base + '/login', { waitUntil: 'networkidle0' });
  await page.evaluate(async () => {
    const { React, createRoot } = await import('/scripts/browser-harness.js');
    const { default: Player } = await import('/src/features/user/components/common/CustomVideoPlayer.jsx');
    const { SAMPLE_VIDEO_URL } = await import('/src/shared/constants/media.js');
    window.sampleUrl = SAMPLE_VIDEO_URL;
    document.querySelector('#root').style.display = 'none';
    window.harness = { React };
    window.events = { play: 0, pause: 0, time: 0 };
    const container = document.createElement('div'); container.id = 'video-test';
    container.style.cssText = 'width:640px;height:360px;position:relative'; document.body.appendChild(container);
    window.root = createRoot(container);
    window.renderPlayer = src => window.root.render(React.createElement(Player, { src,
      onPlay: () => window.events.play++, onPause: () => window.events.pause++, onTimeUpdate: time => { window.events.time = time; } }));
    window.renderPlayer(SAMPLE_VIDEO_URL);
  });
  await page.waitForFunction(() => {
    const video = document.querySelector('#video-test video');
    return video?.readyState >= 1 && video.videoWidth > 0 && video.duration > 0;
  }, { timeout: 10000 }).catch(async error => {
    console.error('VIDEO_STATE', await page.$eval('#video-test video', video => ({ src: video.currentSrc, ready: video.readyState, network: video.networkState, error: video.error?.message })));
    throw error;
  });
  const metadata = await page.$eval('#video-test video', video => ({ src: video.currentSrc, duration: video.duration, width: video.videoWidth }));
  assert.equal(metadata.src, await page.evaluate(() => window.sampleUrl));
  await page.click('#video-test video');
  await page.waitForFunction(() => document.querySelector('#video-test video').currentTime > 0.4);
  assert.ok(await page.evaluate(() => window.events.play > 0 && window.events.time > 0));
  await page.evaluate(() => { document.querySelector('#video-test video').currentTime = 2; });
  await page.waitForFunction(() => document.querySelector('#video-test video').currentTime >= 2);
  await page.click('#video-test video');
  await page.waitForFunction(() => document.querySelector('#video-test video').paused && window.events.pause > 0);
  assert.ok(await page.evaluate(() => window.events.pause > 0));
  console.log(`PASS direct MP4: decoded ${metadata.width}px, ${metadata.duration.toFixed(2)} seconds; play, seek, pause`);

  await page.evaluate(() => window.renderPlayer('/missing-video.mp4'));
  await page.waitForFunction(() => document.querySelector('#video-test [role="alert"]')?.innerText.includes('Không thể phát video'));
  await page.evaluate(() => document.querySelector('#video-test video').click());
  await page.evaluate(() => window.renderPlayer(window.sampleUrl));
  await page.waitForFunction(() => !document.querySelector('#video-test [role="alert"]') && document.querySelector('#video-test video')?.readyState >= 1);
  console.log('PASS invalid video: clear error, handled play rejection, recovery after changing URL');

  await page.evaluate(async () => {
    const { React } = window.harness;
    const { MemoryRouter } = await import('/scripts/browser-harness.js');
    const { default: Form } = await import('/src/features/admin/pages/CreateMoviePage.jsx');
    const movie = { id: 1, title: 'Video URL test', duration: 1, status: 'NOW_SHOWING',
      isOnlineAvailable: true, isCinemaAvailable: false, releaseDate: '2026-10-14', startTime: '08:00',
      endDate: '2026-10-20', endTime: '22:00', genreIds: [1], formatIds: [], videoUrl: '', posterUrl: '/ginfilm-brand.svg' };
    window.savedVideoUrl = null;
    document.querySelector('#video-test').style.cssText = 'width:1100px;position:relative';
    window.root.render(React.createElement(MemoryRouter, null, React.createElement(Form, { initialData: movie,
      onBack: () => {}, onSave: async data => { window.savedVideoUrl = data.get('videoUrl'); return { success: true }; } })));
  });
  await page.waitForFunction(() => [...document.querySelectorAll('#video-test button')].some(button => button.textContent.includes('Dùng video mẫu')));
  await page.evaluate(() => [...document.querySelectorAll('#video-test button')].find(button => button.textContent.includes('Dùng video mẫu')).click());
  await page.waitForFunction(() => document.querySelector('#video-test input[name="videoUrl"]')?.value === window.sampleUrl
    && document.querySelector('#video-test video')?.readyState >= 1);
  assert.equal(await page.evaluate(() => window.savedVideoUrl), null, 'Preview must not save the movie automatically');
  await page.click('#video-test video');
  await page.waitForFunction(() => document.querySelector('#video-test video').currentTime > 0.4, { timeout: 10000 }).catch(async error => {
    console.error('PREVIEW_STATE', await page.$eval('#video-test video', video => {
      const rect = video.getBoundingClientRect(); const hit = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
      return { paused: video.paused, error: video.error?.message, ready: video.readyState, width: rect.width, height: rect.height, hit: hit?.tagName, hitText: hit?.textContent?.trim().slice(0, 60) };
    })); throw error;
  });
  assert.equal(await page.evaluate(() => window.savedVideoUrl), null, 'Player controls inside the form must not submit it');
  await page.evaluate(() => [...document.querySelectorAll('#video-test button')].find(button => button.textContent.includes('Lưu bộ phim')).click());
  await page.waitForFunction(() => window.savedVideoUrl === window.sampleUrl);
  assert.deepEqual(mediaProxies, [], 'Direct video must not need the S3 media endpoint');
  assert.deepEqual(errors, [], 'Browser JavaScript error');
  console.log('PASS movie form: sample button, actual preview playback, save URL, zero S3 requests');
} finally { await browser.close(); }
