import assert from "node:assert/strict";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

// Use a dedicated Chromium debug session (README), never the user's regular tabs.
const endpoint = process.env.CHROME_DEBUG_URL || "http://127.0.0.1:9333";
const pageUrl = new URL("index.html", import.meta.url).href;
const legacyUrl = new URL("invitations/01-vuon-suong.html", import.meta.url)
  .href;
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
let mainFrame;
const localRequests = new Set();
socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  if (message.id) return pending.get(message.id)?.(message);
  const p = message.params;
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
    p.request.url.startsWith("file:")
  )
    localRequests.add(p.requestId);
  if (
    message.method === "Network.loadingFailed" &&
    localRequests.has(p.requestId)
  )
    errors.push("Local resource: " + p.errorText);
  if (message.method === "Log.entryAdded" && p.entry.level === "error") {
    if (p.entry.url?.startsWith("file:")) errors.push(p.entry.text);
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
        ? reject(new Error(JSON.stringify(message.error)))
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
    if (await evaluate(expression)) return;
    await delay(75);
  }
  throw new Error("Timeout: " + label);
}
async function navigate(url, { noScript = false, destination = url } = {}) {
  mainFrame = (await send("Page.navigate", { url })).frameId;
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
    if ([390, 1440].includes(width)) await screenshot(`${width}-hero`);
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
    const text = await evaluate(`document.querySelector('main').textContent`);
    for (const required of [
      "Quốc Hảo",
      "Thùy Trang",
      "23/11/2026",
      "24/11/2026",
      "15 tháng 10 năm Bính Ngọ",
      "16 tháng 10 năm Bính Ngọ",
      "Ao Hồ thôn Rừng",
      "Dị Sử, Mỹ Hào, Hưng Yên",
      "Thôn Hiển Dương, Dương Quang, Mỹ Hào, Hưng Yên",
      "Đặng Đình Mười",
      "Nguyễn Thị Duyên",
      "Hàn Ngọc Tú",
      "Nguyễn Thị Kim Oanh",
      "Giờ đón khách sẽ được cập nhật.",
      "Giờ làm lễ sẽ được cập nhật.",
    ])
      assert.ok(text.includes(required), required);
    assert.ok(!/\d{1,2}:\d{2}/.test(text), "No invented times");
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
      await delay(60);
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
    await evaluate(
      `document.querySelector('[data-photo]').click();document.querySelector('.photo-close').click();document.querySelector('.rsvp-trigger').focus({preventScroll:true});document.querySelector('.rsvp-trigger').click()`,
    );
    assert.ok(
      await evaluate(
        `document.querySelector('.rsvp-dialog').open && !document.querySelector('.rsvp-card').checkValidity()`,
      ),
      "RSVP opens and requires a name",
    );
    await evaluate(
      `document.querySelector('.rsvp-card input').value='Khách thử';document.querySelector('.rsvp-card').requestSubmit()`,
    );
    assert.ok(
      await evaluate(
        `document.querySelector('.rsvp-status').textContent.includes('chưa được gửi đến gia đình')`,
      ),
      "Honest RSVP demo status",
    );
    await key("Escape", "Escape", 27);
    await delay(80);
    assert.ok(
      await evaluate(
        `!document.querySelector('.rsvp-dialog').open && document.activeElement.matches('.rsvp-trigger')`,
      ),
      "RSVP ESC and focus restoration",
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
        " · opening, duplicate input, focus, layout, data, map, reveal, album, RSVP, reload",
    );
  }
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
}
