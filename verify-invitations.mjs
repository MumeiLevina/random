import assert from 'node:assert/strict';

const pageUrl = new URL('index.html', import.meta.url).href;
const legacyUrl = new URL('invitations/01-vuon-suong.html', import.meta.url).href;
const tabs = await fetch('http://127.0.0.1:9333/json').then(response => response.json());
const socket = new WebSocket(tabs.find(tab => tab.type === 'page').webSocketDebuggerUrl);
await new Promise(resolve => socket.addEventListener('open', resolve, { once: true }));

let nextId = 0;
const pending = new Map();
socket.addEventListener('message', event => {
  const message = JSON.parse(event.data);
  pending.get(message.id)?.(message);
});

function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++nextId;
    const timeout = setTimeout(() => {
      pending.delete(id);
      reject(new Error(method + ' timeout'));
    }, 15000);
    pending.set(id, message => {
      clearTimeout(timeout);
      pending.delete(id);
      if (message.error) reject(new Error(JSON.stringify(message.error)));
      else resolve(message.result);
    });
    socket.send(JSON.stringify({ id, method, params }));
  });
}

async function evaluate(expression) {
  const response = await send('Runtime.evaluate', {
    expression, awaitPromise: true, returnByValue: true,
  });
  if (response.exceptionDetails) throw new Error(JSON.stringify(response.exceptionDetails));
  return response.result.value;
}

async function navigate(url, destination = url) {
  await send('Page.navigate', { url });
  for (let attempt = 0; attempt < 60; attempt++) {
    await new Promise(resolve => setTimeout(resolve, 100));
    if (await evaluate(`location.href === ${JSON.stringify(destination)} &&
      document.readyState !== 'loading' && document.body.classList.contains('motion-ready')`)) return;
  }
  throw new Error('Page did not load at ' + destination);
}

try {
  await navigate(legacyUrl, pageUrl);
  for (const width of [320, 390, 768, 1440]) {
    await send('Emulation.setDeviceMetricsOverride', {
      width, height: 900, deviceScaleFactor: 1, mobile: width < 500,
    });
    await navigate(pageUrl + '?width=' + width);
    await evaluate('document.fonts.ready.then(() => true)');
    assert.ok(await evaluate(`(() => {
      const button = document.querySelector('[data-open-invitation]').getBoundingClientRect();
      return button.left >= 0 && button.right <= innerWidth && button.bottom <= innerHeight;
    })()`), 'Open button fits at ' + width);
    await evaluate("document.querySelector('[data-open-invitation]').click()");
    await new Promise(resolve => setTimeout(resolve, 1550));

    const layout = await evaluate(`(() => {
      const names = [...document.querySelector('main .couple-title').children]
        .map(child => child.getBoundingClientRect());
      const overlaps = names.some((rect, index) => index > 0 && rect.top < names[index - 1].bottom - 1);
      const overflow = document.documentElement.scrollWidth > innerWidth + 2;
      return { overlaps, overflow };
    })()`);
    assert.equal(layout.overlaps, false, 'Couple names fit at ' + width);
    assert.equal(layout.overflow, false, 'No horizontal overflow at ' + width);

    const venue = await evaluate(`(() => {
      document.querySelector('a[href="#nha-chu-re"]').click();
      const frame = document.querySelector('.venue__map');
      const bounds = frame.getBoundingClientRect();
      const directions = new URL(document.querySelector('.venue__directions').href);
      return {
        anchor: location.hash,
        mapPin: new URL(frame.src).searchParams.get('q'),
        destination: directions.searchParams.get('destination'),
        mapFits: bounds.width >= 200 && bounds.left >= 0 && bounds.right <= innerWidth,
      };
    })()`);
    assert.equal(venue.anchor, '#nha-chu-re');
    assert.equal(venue.mapPin, '20.9388189,106.1072559');
    assert.equal(venue.destination, venue.mapPin);
    assert.ok(venue.mapFits, 'Google Maps frame fits at ' + width);

    const controls = await evaluate(`(() => {
      document.querySelector('[data-photo]').click();
      const photo = document.querySelector('.photo-dialog').open;
      document.querySelector('.photo-close').click();
      document.querySelector('.rsvp-trigger').click();
      const rsvp = document.querySelector('.rsvp-dialog').open;
      document.querySelector('.rsvp-close').click();
      return { photo, rsvp };
    })()`);
    assert.deepEqual(controls, { photo: true, rsvp: true });
    console.log('PASS ' + width + 'px · invitation, layout, map, photo, RSVP');
  }

  await send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
  });
  await navigate(pageUrl + '?motion=reduce');
  await evaluate("document.querySelector('[data-open-invitation]').click()");
  assert.equal(await evaluate("getComputedStyle(document.querySelector('main h1')).opacity"), '1');
  console.log('PASS reduced motion');
} finally {
  socket.close();
}
