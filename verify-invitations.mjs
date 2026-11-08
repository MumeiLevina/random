import assert from "node:assert/strict";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createServer } from "node:http";
import { resolve, extname, sep } from "node:path";

// Use a dedicated Chromium debug session (README), never the user's regular tabs.
const endpoint = process.env.CHROME_DEBUG_URL || "http://127.0.0.1:9333";
// Local fonts use the same HTTP origin rules as production, rather than file://.
const root = fileURLToPath(new URL(".", import.meta.url));
const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".png": "image/png",
  ".woff2": "font/woff2",
  ".mp3": "audio/mpeg",
};
const server = createServer(async (request, response) => {
  try {
    const path = decodeURIComponent(
      new URL(request.url, "http://localhost").pathname,
    );
    if (path === "/favicon.ico") {
      response.writeHead(302, { Location: "/assets/favicon.svg" });
      response.end();
      return;
    }
    if (
      path !== "/index.html" &&
      !path.startsWith("/assets/") &&
      !path.startsWith("/invitations/")
    ) {
      response.writeHead(404);
      response.end();
      return;
    }
    const file = resolve(root, "." + path);
    const allowed =
      file === resolve(root, "index.html") ||
      ["assets", "invitations"].some((folder) =>
        file.startsWith(resolve(root, folder) + sep),
      );
    if (!allowed) {
      response.writeHead(403);
      response.end();
      return;
    }
    const data = await readFile(file);
    response.writeHead(200, {
      "Content-Type": contentTypes[extname(file)] || "application/octet-stream",
      "Cache-Control": "no-store",
    });
    response.end(data);
  } catch {
    response.writeHead(404);
    response.end();
  }
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const pageOrigin = "http://127.0.0.1:" + server.address().port;
const pageUrl = pageOrigin + "/index.html";
const legacyUrl = pageOrigin + "/invitations/01-vuon-suong.html";
const artifactDir = new URL("./verification/", import.meta.url);
await mkdir(artifactDir, { recursive: true });
const target = await fetch(endpoint + "/json/new?about:blank", {
  method: "PUT",
}).then((r) => r.json());
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve) =>
  socket.addEventListener("open", resolve, { once: true }),
);
let nextId = 0;
const pending = new Map();
const errors = [];
const externalWarnings = new Set();
const localRequests = new Set();
const heldImages = [];
const musicRequests = [];
socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  if (message.id) return pending.get(message.id)?.(message);
  const p = message.params;
  if (
    message.method === "Network.requestWillBeSent" &&
    /\/assets\/audio\/[^?]+\.mp3(?:\?|$)/.test(p.request.url)
  )
    musicRequests.push(p.request.url);
  if (message.method === "Fetch.requestPaused") {
    if (p.request.url.startsWith(pageOrigin)) {
      heldImages.push(p.requestId);
      return;
    }
  }
  if (message.method === "Runtime.exceptionThrown")
    errors.push(
      p.exceptionDetails.text +
        ": " +
        p.exceptionDetails.exception?.description,
    );
  if (message.method === "Runtime.consoleAPICalled" && p.type === "error")
    errors.push(p.args.map((arg) => arg.value || arg.description).join(" "));
  if (
    message.method === "Network.requestWillBeSent" &&
    p.request.url.startsWith(pageOrigin)
  )
    localRequests.add(p.requestId);
  if (
    message.method === "Network.loadingFailed" &&
    localRequests.has(p.requestId) &&
    !p.canceled
  )
    errors.push("Local resource: " + p.errorText);
  if (message.method === "Log.entryAdded" && p.entry.level === "error") {
    if (p.entry.url?.startsWith(pageOrigin))
      errors.push(p.entry.url + ": " + p.entry.text);
    else externalWarnings.add(p.entry.url || p.entry.text);
  }
});
function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++nextId;
    const timeout = setTimeout(() => {
      pending.delete(id);
      reject(new Error(method + " timeout"));
    }, 20000);
    pending.set(id, (message) => {
      clearTimeout(timeout);
      pending.delete(id);
      message.error
        ? reject(new Error(method + ": " + JSON.stringify(message.error)))
        : resolve(message.result);
    });
    socket.send(JSON.stringify({ id, method, params }));
  });
}
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function evaluate(expression) {
  const result = await send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails)
    throw new Error(JSON.stringify(result.exceptionDetails));
  return result.result.value;
}
async function until(expression, label, timeout = 6000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      if (await evaluate(expression)) return;
    } catch (error) {
      // Back/forward cache can briefly detach the old renderer while CDP
      // switches execution contexts. This is not an application exception.
      if (
        !/Not attached to an active page|Cannot find context|Execution context was destroyed/.test(
          error.message,
        )
      )
        throw error;
    }
    await delay(75);
  }
  throw new Error("Timeout: " + label);
}
async function navigate(url, { noScript = false, destination = url } = {}) {
  await send("Page.navigate", { url });
  await until(
    `location.href === ${JSON.stringify(destination)} && document.readyState !== 'loading' ${noScript ? "" : "&& document.body.dataset.invitationState === 'closed'"}`,
    "navigation",
  );
}
async function screenshot(name) {
  const { data } = await send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: false,
  });
  await writeFile(
    new URL(name + ".png", artifactDir),
    Buffer.from(data, "base64"),
  );
}
async function key(key, code, virtualKey) {
  await send("Input.dispatchKeyEvent", {
    type: "keyDown",
    key,
    code,
    windowsVirtualKeyCode: virtualKey,
    text: key === "Enter" ? "\r" : key === " " ? " " : "",
  });
  await send("Input.dispatchKeyEvent", {
    type: "keyUp",
    key,
    code,
    windowsVirtualKeyCode: virtualKey,
  });
}
async function click(selector, touch = false) {
  const { x, y } = await evaluate(
    `(() => { const r = document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect(); return { x:r.x+r.width/2, y:r.y+r.height/2 }; })()`,
  );
  if (touch) {
    await send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x, y }],
    });
    await send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
  } else {
    await send("Input.dispatchMouseEvent", {
      type: "mousePressed",
      x,
      y,
      button: "left",
      clickCount: 1,
    });
    await send("Input.dispatchMouseEvent", {
      type: "mouseReleased",
      x,
      y,
      button: "left",
      clickCount: 1,
    });
  }
}
async function metrics(width, height) {
  await send("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: width < 800,
  });
  await send("Emulation.setTouchEmulationEnabled", { enabled: width < 800 });
}
const results = [];
function passed(label) {
  results.push(label);
  console.log("PASS " + label);
}

try {
  await send("Page.enable");
  await send("Runtime.enable");
  await send("Network.enable");
  await send("Log.enable");
  await send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-reduced-motion", value: "no-preference" }],
  });
  await navigate(legacyUrl, { destination: pageUrl });
  passed("Legacy URL redirects to the single Vườn Sương invitation");

  for (const [width, height] of [
    [320, 900],
    [375, 900],
    [390, 900],
    [768, 900],
    [1440, 900],
    [844, 390],
    [375, 568],
  ]) {
    const label = `${width}x${height}`;
    await metrics(width, height);
    await navigate(pageUrl + "?viewport=" + label);
    await evaluate(
      "Promise.race([document.fonts.ready, new Promise(r=>setTimeout(r,5000))]).then(()=>true)",
    );
    assert.equal(
      await evaluate(
        `document.activeElement.matches('[data-open-invitation]') && document.querySelector('main').inert`,
      ),
      true,
      "Initial focus and inert main",
    );
    assert.ok(
      await evaluate(
        `document.querySelector('#wedding-music').paused && document.querySelector('#wedding-music').readyState===0`,
      ),
      "No audio autoplay or preloading before guest interaction",
    );
    assert.ok(
      await evaluate(
        `(() => { const r=document.querySelector('[data-open-invitation]').getBoundingClientRect(); return r.left>=0 && r.right<=innerWidth && r.top>=0 && r.bottom<=innerHeight; })()`,
      ),
      "Open button fits " + label,
    );
    assert.ok(
      await evaluate(
        `document.documentElement.scrollWidth<=innerWidth+1 && document.querySelector('.invitation-gate').scrollWidth<=innerWidth+1`,
      ),
      "No overflow before opening " + label,
    );
    await key("Tab", "Tab", 9);
    assert.equal(
      await evaluate(
        `document.activeElement.matches('[data-open-invitation]')`,
      ),
      true,
      "Gate focus trap",
    );
    await evaluate(
      `window.openTransitions=0; new MutationObserver(records=>records.forEach(r=>{if(r.attributeName==='data-invitation-state' && document.body.dataset.invitationState==='opening') window.openTransitions++})).observe(document.body,{attributes:true}); window.startY=scrollY; window.openStart=performance.now()`,
    );
    if ([390, 1440].includes(width)) await screenshot(`${width}-envelope`);
    if (width === 320) await key("Enter", "Enter", 13);
    else if (width === 375) await key(" ", "Space", 32);
    else await click("[data-open-invitation]", width === 390);
    assert.equal(
      await evaluate(
        `document.body.dataset.invitationState==='opening' && document.querySelector('[data-open-invitation]').disabled`,
      ),
      true,
      "Immediate feedback " +
        JSON.stringify(
          await evaluate(
            `({state:document.body.dataset.invitationState,focus:document.activeElement.outerHTML,motion:matchMedia('(prefers-reduced-motion:reduce)').matches})`,
          ),
        ),
    );
    await evaluate(
      `document.querySelector('[data-open-invitation]').click(); document.querySelector('[data-open-invitation]').dispatchEvent(new Event('click'))`,
    );
    if ([390, 1440].includes(width)) {
      await delay(1800);
      assert.ok(
        await evaluate(
          `getComputedStyle(document.querySelector('.envelope__flap')).transform !== 'none' && document.querySelector('.envelope__letter').getBoundingClientRect().top < document.querySelector('.envelope').getBoundingClientRect().top`,
        ),
        "Flap and letter physically move",
      );
      await screenshot(`${width}-opening`);
    }
    await until(
      `document.body.dataset.invitationState === 'open'`,
      "opening completion",
    );
    const opening = await evaluate(
      `({count:openTransitions, duration:performance.now()-openStart, overlay:!!document.querySelector('.invitation-gate'), inert:document.querySelector('main').inert, locked:getComputedStyle(document.body).overflowY==='hidden', focus:document.activeElement.id, jumped:scrollY!==startY})`,
    );
    assert.equal(opening.count, 1, "Exactly one opening");
    assert.ok(
      opening.duration >= 2900 && opening.duration <= 3700,
      "3s opening duration " + label,
    );
    assert.deepEqual(
      [opening.overlay, opening.inert, opening.locked, opening.jumped],
      [false, false, false, false],
      "No overlay, inert lock or unsolicited scrolling",
    );
    assert.equal(opening.focus, "hero-title");
    await delay(550);
    await until(
      `!document.querySelector('#wedding-music').paused && document.querySelector('#wedding-music').currentTime>0`,
      "Music starts from opening gesture",
    );
    assert.equal(
      await evaluate(
        `document.querySelector('.music-toggle').getAttribute('aria-pressed')`,
      ),
      "true",
    );
    await click(".music-toggle");
    assert.ok(
      await evaluate(
        `document.querySelector('#wedding-music').paused && document.querySelector('.music-toggle').getAttribute('aria-pressed')==='false'`,
      ),
      "Music pauses",
    );
    await click(".music-toggle");
    await until(
      `!document.querySelector('#wedding-music').paused && document.querySelector('.music-toggle').getAttribute('aria-pressed')==='true'`,
      "Music resumes",
    );
    await click(".music-toggle");
    if ([390, 1440].includes(width)) {
      await delay(250);
      await screenshot(`${width}-hero`);
    }
    assert.ok(
      await evaluate(
        `(() => { const names=[...document.querySelectorAll('.hero .couple-title>*')].map(e=>e.getBoundingClientRect()); return names.every((r,i)=>r.left>=0&&r.right<=innerWidth&&(!i||r.top>=names[i-1].bottom-1)) && document.documentElement.scrollWidth<=innerWidth+1; })()`,
      ),
      "Names do not overlap / no horizontal overflow " + label,
    );
    assert.ok(
      await evaluate(
        `document.fonts.check('400 20px Newsreader') && document.fonts.check('400 14px "Be Vietnam Pro"')`,
      ),
      "Vietnamese fonts loaded",
    );
    assert.ok(
      await evaluate(
        `document.fonts.check('400 24px "HLT AphroditeSlimPro"','Quốc Hảo Thùy Trang Đặng Đình Mười Nguyễn Thị Duyên Hàn Ngọc Tú Nguyễn Thị Kim Oanh') && [...document.querySelectorAll('.couple-name,.parent-name,.vow-pair h3')].every(e=>getComputedStyle(e).fontFamily.includes('HLT AphroditeSlimPro'))`,
      ),
      "Requested calligraphy font loaded for couple and parents",
    );
    const text = await evaluate(
      `document.querySelector('main').textContent.replace(/\\s+/g,' ').trim()`,
    );
    assert.equal(
      await evaluate(`document.querySelectorAll('[data-photo]').length`),
      5,
      "All five real photos in album",
    );
    assert.ok(
      await evaluate(
        `getComputedStyle(document.querySelector('.hero__photo')).backgroundImage.includes('nm_00004.webp')`,
      ),
      "Real couple portrait in hero",
    );
    for (const required of [
      "Quốc Hảo",
      "Thùy Trang",
      "23/11/2026",
      "24/11/2026",
      "15 tháng 10 năm Bính Ngọ",
      "16 tháng 10 năm Bính Ngọ",
      "Gia đình nhà gái",
      "Tổ dân phố Rừng, Dị Sử, Mỹ Hào, Hưng Yên",
      "Dị Sử, Mỹ Hào, Hưng Yên",
      "Thôn Hiển Dương, Dương Quang, Mỹ Hào, Hưng Yên",
      "Đặng Đình Mười",
      "Nguyễn Thị Duyên",
      "Hàn Ngọc Tú",
      "Nguyễn Thị Kim Oanh",
    ])
      assert.ok(text.includes(required), required);
    assert.ok(!/\d{1,2}:\d{2}/.test(text), "No invented times");
    assert.ok(
      !text.includes("Giờ đón khách sẽ được cập nhật") &&
        !text.includes("Giờ làm lễ sẽ được cập nhật") &&
        text.includes("Ao Hồ"),
      "Requested outdated copy removed",
    );
    assert.equal(
      await evaluate("document.title"),
      "Quốc Hảo ❤️ Thùy Trang - Thiệp mời cưới",
    );
    assert.equal(
      await evaluate(
        `document.querySelector('meta[property="og:title"]').content`,
      ),
      "Quốc Hảo ❤️ Thùy Trang - Thiệp mời cưới",
    );
    const reception = await evaluate(
      `(()=>{const card=document.querySelector('.wedding-schedule__event');const bride=new URL(card.querySelector('[data-reception-location="bride"] a').href);return {count:card.querySelectorAll('a').length,bride:bride.searchParams.get('query'),hasGroom:!!card.querySelector('[data-reception-location="groom"]')}})()`,
    );
    assert.equal(reception.count, 1);
    assert.equal(
      reception.bride,
      "Ao Hồ, Tổ dân phố Rừng, Dị Sử, Mỹ Hào, Hưng Yên",
    );
    assert.equal(reception.hasGroom, false);
    assert.ok(
      await evaluate(
        `!document.querySelector('[class*="rsvp"]') && document.querySelector('.venue').nextElementSibling.matches('.story-finale')`,
      ),
      "No RSVP and groom directions immediately precede finale",
    );
    const venue = await evaluate(
      `(() => { const frame=document.querySelector('.venue__map'), directions=document.querySelector('.venue__directions'); let e=frame, clean=true; while(e){if(getComputedStyle(e).transform!=='none')clean=false;e=e.parentElement} const r=frame.getBoundingClientRect(); return {pin:new URL(frame.src).searchParams.get('q'),destination:new URL(directions.href).searchParams.get('destination'),clean,fits:r.width>=200&&r.left>=0&&r.right<=innerWidth}; })()`,
    );
    assert.equal(venue.pin, "20.9388189,106.1072559");
    assert.equal(venue.destination, venue.pin);
    assert.ok(venue.clean && venue.fits, "Map remains free of transforms");
    const revealCount = await evaluate(
      `document.querySelectorAll('.reveal').length`,
    );
    for (let index = 0; index < revealCount; index++) {
      await evaluate(
        `document.querySelectorAll('.reveal')[${index}].scrollIntoView({behavior:'instant',block:'center'})`,
      );
      await until(
        `document.querySelectorAll('.reveal')[${index}].classList.contains('is-visible')`,
        "Reveal at " + label + " #" + index,
        2500,
      );
    }
    await delay(1250);
    assert.ok(
      await evaluate(
        `scrollY>0 && [...document.querySelectorAll('.reveal')].every(e=>e.classList.contains('is-visible'))`,
      ),
      "All sections reveal and scrolling works",
    );
    await evaluate(
      `document.querySelector('.story-album').scrollIntoView({behavior:'instant'})`,
    );
    await delay(150);
    await evaluate(
      `document.querySelector('[data-photo]').focus({preventScroll:true})`,
    );
    await key("Enter", "Enter", 13);
    assert.ok(
      await evaluate(`document.querySelector('.photo-dialog').open`),
      "Keyboard opens album",
    );
    await until(
      `document.querySelector('.photo-dialog img').complete && document.querySelector('.photo-dialog img').naturalWidth>0`,
      "lightbox image",
    );
    const firstPhoto = await evaluate(
      `document.querySelector('.photo-dialog img').src`,
    );
    await key("ArrowRight", "ArrowRight", 39);
    assert.notEqual(
      await evaluate(`document.querySelector('.photo-dialog img').src`),
      firstPhoto,
    );
    await key("ArrowLeft", "ArrowLeft", 37);
    assert.equal(
      await evaluate(`document.querySelector('.photo-dialog img').src`),
      firstPhoto,
    );
    await key("Escape", "Escape", 27);
    await delay(100);
    assert.ok(
      await evaluate(
        `!document.querySelector('.photo-dialog').open && document.activeElement.matches('[data-photo]')`,
      ),
      "ESC and photo focus restoration",
    );
    const broken = await evaluate(
      `Promise.all([...document.querySelectorAll('main img')].map(i=>i.decode().then(()=>null,()=>i.src))).then(r=>r.filter(Boolean))`,
    );
    assert.deepEqual(broken, [], "No missing images");
    assert.ok(
      await evaluate(`document.documentElement.scrollWidth<=innerWidth+1`),
      "No overflow after full-page interactions",
    );
    if (width === 1440) {
      await evaluate(
        `document.querySelector('.wedding-schedule').scrollIntoView({behavior:'instant'})`,
      );
      await screenshot("1440-schedule");
    }
    // Reload resets the opening and scroll position cannot retain a stranded overlay.
    await navigate(pageUrl + "?reload=" + label);
    assert.ok(
      await evaluate(
        `document.body.dataset.invitationState==='closed' && !document.querySelector('[data-open-invitation]').disabled`,
      ),
    );
    passed(
      label +
        " · opening, duplicate input, focus, layout, data, map, reveal, album, music, reload",
    );
  }
  for (const width of [390, 1440]) {
    await metrics(width, 844);
    const fragmentUrl =
      pageUrl + "?scroll-regression=" + width + "#album-title";
    await navigate(fragmentUrl, { destination: fragmentUrl.split("#")[0] });
    assert.equal(
      await evaluate("scrollY"),
      0,
      "Anchor cannot scroll behind the envelope",
    );
    await evaluate(`document.querySelector('[data-open-invitation]').click()`);
    await until(
      `document.body.dataset.invitationState==='open'`,
      "fragment opening",
    );
    await delay(300);
    assert.ok(
      await evaluate(
        `scrollY===0 && location.hash==='#album-title' && !document.documentElement.classList.contains('invitation-locked') && getComputedStyle(document.body).position!=='fixed'`,
      ),
      "Hero stays at top, fragment is preserved without navigation",
    );
    await evaluate(`document.querySelector('a[href="#nha-chu-re"]').click()`);
    await until("scrollY>100", "Guest anchor navigation still works");
    await evaluate(
      `scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'})`,
    );
    await delay(150);
    assert.ok(await evaluate("scrollY>1000"), "Guest can scroll to finale");
    await send("Page.reload");
    await until(
      `document.body?.dataset.invitationState==='closed'`,
      "reload closed",
    );
    assert.equal(
      await evaluate("scrollY"),
      0,
      "Reload suppresses saved bottom position",
    );
    await evaluate(`document.querySelector('[data-open-invitation]').click()`);
    await until(
      `document.body.dataset.invitationState==='open'`,
      "reload opening",
    );
    await delay(300);
    assert.equal(
      await evaluate("scrollY"),
      0,
      "Opening after a bottom-of-page reload stays at hero",
    );
    await evaluate(`scrollTo({top:1200,behavior:'instant'})`);
    await delay(100);
    const returnY = await evaluate("scrollY");
    await send("Page.navigate", { url: "about:blank" });
    await until(
      `location.href==='about:blank' && document.readyState==='complete'`,
      "history navigation committed",
    );
    const navigation = await send("Page.getNavigationHistory");
    await send("Page.navigateToHistoryEntry", {
      entryId: navigation.entries[navigation.currentIndex - 1].id,
    });
    await until(
      `document.body?.dataset.invitationState==='open' || document.body?.dataset.invitationState==='closed'`,
      "history back",
    );
    if (await evaluate(`document.body.dataset.invitationState==='closed'`)) {
      await evaluate(
        `document.querySelector('[data-open-invitation]').click()`,
      );
      await until(
        `document.body.dataset.invitationState==='open'`,
        "history opening",
      );
      assert.equal(
        await evaluate("scrollY"),
        0,
        "Fresh history navigation opens at hero",
      );
    } else {
      await until(
        `Math.abs(scrollY-${returnY})<2`,
        "BFCache scroll restoration",
      );
      assert.ok(
        Math.abs((await evaluate("scrollY")) - returnY) < 2,
        "BFCache preserves an already open invitation",
      );
    }
    passed(
      width +
        "px · initial fragment, bottom reload, guest scrolling and history back",
    );
  }
  await metrics(390, 844);
  for (const [roll, track] of [
    [0.25, "young-and-beautiful"],
    [0.75, "mai-mai-ben-nhau"],
  ]) {
    const seed = await send("Page.addScriptToEvaluateOnNewDocument", {
      source: `Math.random=()=>${roll}`,
    });
    musicRequests.length = 0;
    await navigate(pageUrl + "?draw=" + track);
    assert.ok(
      await evaluate(
        `!document.querySelector('#wedding-music').hasAttribute('src') && document.querySelector('#wedding-music').paused`,
      ),
      "Draw is deferred until opening",
    );
    assert.equal(
      musicRequests.length,
      0,
      "Neither track downloads before opening",
    );
    await key("Enter", "Enter", 13);
    await until(
      `document.body.dataset.invitationState==='open' && !document.querySelector('#wedding-music').paused && document.querySelector('#wedding-music').currentTime>0`,
      "Selected track decodes and plays",
    );
    assert.equal(
      await evaluate(`document.querySelector('#wedding-music').dataset.track`),
      track,
    );
    assert.ok(
      musicRequests.length > 0 &&
        musicRequests.every((url) => url.includes("/" + track + ".mp3")),
      "Only the selected track is loaded",
    );
    await click(".music-toggle");
    await evaluate(`Math.random=()=>${1 - roll}`);
    await click(".music-toggle");
    await until(
      `!document.querySelector('#wedding-music').paused`,
      "Resume selected track",
    );
    assert.equal(
      await evaluate(`document.querySelector('#wedding-music').dataset.track`),
      track,
      "Pause/resume cannot reroll",
    );
    assert.ok(
      musicRequests.every((url) => url.includes("/" + track + ".mp3")),
      "Resume does not download the other track",
    );
    await send("Page.removeScriptToEvaluateOnNewDocument", {
      identifier: seed.identifier,
    });
  }
  passed(
    "Both random music outcomes play; only chosen audio loads; pause/resume preserves the draw",
  );
  const blockedAudio = await send("Page.addScriptToEvaluateOnNewDocument", {
    source: `HTMLMediaElement.prototype.play=function(){return Promise.reject(new DOMException('Simulated autoplay policy','NotAllowedError'))}`,
  });
  await navigate(pageUrl + "?audio-blocked");
  await key("Enter", "Enter", 13);
  await until(
    `document.body.dataset.invitationState==='open'`,
    "Opening despite blocked audio",
  );
  assert.ok(
    await evaluate(
      `document.querySelector('#wedding-music').paused && document.querySelector('.music-toggle').getAttribute('aria-pressed')==='false' && document.querySelector('[data-music-status]').textContent.includes('Chạm')`,
    ),
    "Blocked playback remains honest and never prevents opening",
  );
  await send("Page.removeScriptToEvaluateOnNewDocument", {
    identifier: blockedAudio.identifier,
  });
  passed(
    "Blocked music degrades to a working manual control without blocking invitation",
  );
  await send("Network.setCacheDisabled", { cacheDisabled: true });
  await send("Fetch.enable", {
    patterns: [
      { urlPattern: pageOrigin + "/*nm_00004.webp", requestStage: "Request" },
    ],
  });
  const lateUrl = pageUrl + "?late-image#album-title";
  await navigate(lateUrl, { destination: lateUrl.split("#")[0] });
  await evaluate(`document.querySelector('[data-open-invitation]').click()`);
  await until(
    `document.body.dataset.invitationState==='open'`,
    "opening before image load",
  );
  assert.ok(heldImages.length > 0, "Hero image deliberately delayed");
  assert.equal(
    await evaluate("scrollY"),
    0,
    "Opening before load remains at top",
  );
  for (const requestId of heldImages.splice(0))
    await send("Fetch.continueRequest", { requestId });
  await until(`document.readyState==='complete'`, "late load");
  await delay(400);
  assert.ok(
    await evaluate(
      `scrollY===0 && location.hash==='#album-title' && history.scrollRestoration==='auto'`,
    ),
    "Late load restores URL and history defaults without jumping",
  );
  await send("Fetch.disable");
  await send("Network.setCacheDisabled", { cacheDisabled: false });
  passed("Late image/window load does not reapply initial fragment scrolling");
  await metrics(390, 844);
  await send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-reduced-motion", value: "reduce" }],
  });
  await navigate(pageUrl + "?reduced");
  await key("Enter", "Enter", 13);
  assert.ok(
    await evaluate(
      `document.body.dataset.invitationState==='open' && !document.querySelector('.invitation-gate') && !document.querySelector('main').inert && getComputedStyle(document.querySelector('.hero__date')).opacity==='1' && !document.querySelector('.celebration-layer')`,
    ),
  );
  passed("Reduced motion opens immediately, readable text, no particles");
  await send("Emulation.setEmulatedMedia", { features: [] });
  await navigate(pageUrl + "?cancel-animation");
  await evaluate(
    `document.querySelector('[data-open-invitation]').click();document.getAnimations().forEach(a=>a.cancel());let s=document.createElement('style');s.textContent='*,*::before,*::after{animation:none!important;transition:none!important}';document.head.append(s)`,
  );
  await until(
    `document.body.dataset.invitationState==='open' && !document.querySelector('.invitation-gate') && !document.querySelector('main').inert`,
    "animation fallback",
  );
  passed("Canceled / unsupported animations still release content");
  await navigate(pageUrl + "?runtime-recovery");
  await evaluate(
    `window.dispatchEvent(new ErrorEvent('error',{message:'Simulated failure'}))`,
  );
  assert.ok(
    await evaluate(
      `!document.querySelector('.invitation-gate') && !document.querySelector('main').inert && !document.body.classList.contains('gate-active')`,
    ),
  );
  passed("Runtime error fails open");
  const injection = await send("Page.addScriptToEvaluateOnNewDocument", {
    source: "delete window.IntersectionObserver;",
  });
  await navigate(pageUrl + "?no-observer");
  await evaluate(`document.querySelector('[data-open-invitation]').click()`);
  await until(`document.body.dataset.invitationState==='open'`, "no observer");
  await until(
    `[...document.querySelectorAll('.reveal')].every(e=>getComputedStyle(e).opacity==='1')`,
    "fallback content visibility",
  );
  await send("Page.removeScriptToEvaluateOnNewDocument", {
    identifier: injection.identifier,
  });
  passed("Missing IntersectionObserver keeps all content visible");
  await send("Emulation.setScriptExecutionDisabled", { value: true });
  await navigate(pageUrl + "?no-js", { noScript: true });
  assert.ok(
    await evaluate(
      `getComputedStyle(document.querySelector('.invitation-gate')).display==='none' && !document.querySelector('main').inert && getComputedStyle(document.querySelector('.hero .couple-name')).opacity==='1' && getComputedStyle(document.querySelector('.reveal')).opacity==='1'`,
    ),
  );
  await send("Emulation.setScriptExecutionDisabled", { value: false });
  passed("JavaScript disabled: entire invitation remains readable");
  const html = await readFile(new URL("./index.html", import.meta.url), "utf8");
  assert.ok(
    !html.includes("\uFFFD") && !/\?{2,}/.test(html),
    "No damaged Vietnamese encoding",
  );
  assert.deepEqual(errors, [], "No local console, runtime or resource errors");
  passed("No local console errors or missing assets; UTF-8 intact");
  const report = {
    results,
    screenshots: [
      "390-envelope",
      "390-opening",
      "390-hero",
      "1440-envelope",
      "1440-opening",
      "1440-hero",
      "1440-schedule",
    ].map((s) => s + ".png"),
    externalWarnings: [...externalWarnings],
    browser: (await send("Browser.getVersion")).product,
  };
  await writeFile(
    new URL("report.json", artifactDir),
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(
    `\n${results.length} checks passed. Artifacts: ${fileURLToPath(artifactDir)}`,
  );
  if (externalWarnings.size)
    console.log("External network warnings (not local app errors):", [
      ...externalWarnings,
    ]);
} finally {
  await send("Emulation.setScriptExecutionDisabled", { value: false }).catch(
    () => {},
  );
  await fetch(endpoint + "/json/close/" + target.id).catch(() => {});
  socket.close();
  await new Promise((resolve) => server.close(resolve));
}
