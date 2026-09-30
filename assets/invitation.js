const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const gate = document.querySelector('.invitation-gate');
const pageMain = document.querySelector('main');
document.body.classList.add('motion-ready');
if (gate) {
  gate.setAttribute('aria-modal', 'true');
  pageMain.inert = true;
  gate.querySelector('[data-open-invitation]').focus({preventScroll:true});
}
let opened = false;

function releaseInvitation() {
  if (opened) return;
  opened = true;
  document.body.classList.add('invitation-open');
  pageMain.inert = false;
  document.querySelectorAll('.reveal').forEach(element => revealObserver.observe(element));
  pageMain.setAttribute('tabindex', '-1');
  pageMain.focus({preventScroll:true});
  if (gate) {
    gate.classList.add('is-opening');
    gate.setAttribute('aria-hidden', 'true');
    window.setTimeout(() => gate.remove(), reduceMotion ? 20 : 1200);
  }
  if (!reduceMotion && document.body.dataset.particles === 'true') {
    const layer = document.createElement('div');
    layer.className = 'celebration-layer';
    layer.setAttribute('aria-hidden', 'true');
    layer.innerHTML = '<span></span>'.repeat(10);
    document.body.append(layer);
    window.setTimeout(() => layer.remove(), 8500);
  }
}

if (gate) {
  gate.querySelector('[data-open-invitation]').addEventListener('click', releaseInvitation);
} else {
  document.body.classList.add('invitation-open');
}

document.querySelectorAll('section').forEach(section => {
  section.querySelectorAll('.reveal').forEach((element, index) => element.style.setProperty('--reveal-order', String(index % 4)));
});

const revealObserver = new IntersectionObserver(entries => entries.forEach(entry => {
  if (entry.isIntersecting) { entry.target.classList.add('is-visible'); revealObserver.unobserve(entry.target); }
}), {threshold:.12});
if (!gate) document.querySelectorAll('.reveal').forEach(element => revealObserver.observe(element));

const photoDialog = document.createElement('dialog');
photoDialog.className = 'photo-dialog';
photoDialog.setAttribute('aria-label', 'Xem ảnh cưới');
photoDialog.innerHTML = '<button type="button" class="photo-close">Đóng ảnh</button><img alt=""><p></p>';
document.body.append(photoDialog);
document.querySelectorAll('[data-photo]').forEach(button => {
  button.addEventListener('click', () => {
    const image = photoDialog.querySelector('img');
    image.src = button.dataset.photo;
    image.alt = button.querySelector('img').alt;
    photoDialog.querySelector('p').textContent = button.querySelector('span').textContent;
    photoDialog.showModal();
  });
});
photoDialog.querySelector('button').addEventListener('click', () => photoDialog.close());
photoDialog.addEventListener('click', event => { if (event.target === photoDialog) photoDialog.close(); });

const dialog = document.querySelector('.rsvp-dialog');
if (dialog) {
  document.querySelectorAll('.rsvp-trigger').forEach(button => button.addEventListener('click', () => dialog.showModal()));
  dialog.querySelector('.rsvp-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  dialog.querySelector('form').addEventListener('submit', event => {
    event.preventDefault();
    const name = new FormData(event.currentTarget).get('name') || 'bạn';
    dialog.querySelector('.rsvp-status').textContent = `Cảm ơn ${name}. Đây là bản xem thử, lời hồi đáp chưa được gửi đến gia đình.`;
  });
}
