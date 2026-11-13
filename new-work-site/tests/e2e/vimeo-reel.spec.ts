import {expect, test} from '@playwright/test';

// Exercise the official SDK against a deterministic iframe protocol response.
// Vimeo's bot protection blocks streamed playback in automated Chromium.
test.beforeEach(async ({page}) => {
  await page.route('https://vimeo.com/api/oembed.json*', route => route.fulfill({json: {
    html: '<iframe src="https://player.vimeo.com/video/1043174924?muted=1&loop=1&controls=1" allow="autoplay; fullscreen"></iframe>',
  }}));
  await page.route('https://player.vimeo.com/video/**', route => route.fulfill({contentType: 'text/html', body: `<script>
    let paused = true;
    const send = data => parent.postMessage(data, '*');
    addEventListener('message', e => {
      const data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
      if (data.method === 'ping') { send({event:'ready'}); return; }
      if (data.method === 'play') { paused=false; send({event:'play', data:{}}); }
      if (data.method === 'pause') { paused=true; send({event:'pause', data:{}}); }
      send({method:data.method, value:data.method === 'getPaused' ? paused : data.method === 'getMuted' ? true : null});
    });
    send({event:'ready'});
  </script>`}));
});

test('Vimeo reel loads only near the viewport and retains manual controls', async ({page}) => {
  await page.emulateMedia({reducedMotion: 'reduce'});
  await page.goto('/#work-gallery');
  const reel = page.locator('[data-vimeo-reel]');
  await expect(reel).toHaveAttribute('data-reel-url', 'https://vimeo.com/1043174924');
  await expect(reel.locator('iframe')).toHaveCount(0);
  await reel.scrollIntoViewIfNeeded();
  await expect(reel).toBeInViewport({ratio: .6});
  const iframe = reel.locator('iframe');
  await expect(iframe).toHaveAttribute('src', /player\.vimeo\.com\/video\/1043174924/u, {timeout: 30000});
  const src = new URL((await iframe.getAttribute('src'))!);
  expect(src.searchParams.get('autoplay')).not.toBe('1');
  expect(src.searchParams.get('muted')).toBe('1');
  expect(src.searchParams.get('loop')).toBe('1');
  expect(src.searchParams.get('controls')).not.toBe('0');
});


test('the reel autoplays muted and pauses when scrolled away', async ({page}) => {
  await page.emulateMedia({reducedMotion: 'no-preference'});
  await page.goto('/#work-gallery');
  const reel = page.locator('[data-vimeo-reel]');
  await reel.scrollIntoViewIfNeeded();
  await expect(reel.locator('iframe')).toHaveAttribute('title', 'New Work showreel', {timeout: 20000});
  const value = (method: string) => page.evaluate((method) => new Promise(resolve => {
    const frame = document.querySelector<HTMLIFrameElement>('[data-vimeo-reel] iframe');
    const timer = setTimeout(() => { window.removeEventListener('message', receive); resolve(null); }, 2000);
    function receive(event: MessageEvent) {
      if (event.origin !== 'https://player.vimeo.com' || event.source !== frame?.contentWindow) return;
      const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
      if (data.method !== method) return;
      clearTimeout(timer); window.removeEventListener('message', receive); resolve(data.value);
    }
    window.addEventListener('message', receive);
    frame?.contentWindow?.postMessage({method}, 'https://player.vimeo.com');
  }), method);
  await expect.poll(() => value('getPaused'), {timeout: 15000}).toBe(false);
  expect(await value('getMuted')).toBe(true);
  await page.locator('[data-bts]').scrollIntoViewIfNeeded();
  await expect.poll(() => value('getPaused')).toBe(true);
});
