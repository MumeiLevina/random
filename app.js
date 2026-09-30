const cards = [...document.querySelectorAll('.template-card')];
const frame = document.querySelector('#previewFrame');
const stage = document.querySelector('#previewStage');
const loading = document.querySelector('#previewLoading');
const title = document.querySelector('#previewTitle');
const number = document.querySelector('#previewNumber');
const openFull = document.querySelector('#openFull');
const emptyState = document.querySelector('#emptyState');
const filters = [...document.querySelectorAll('.filter')];
let savedFavorites = [];
try { savedFavorites = JSON.parse(localStorage.getItem('wedding-favorites') || '[]'); } catch (error) { savedFavorites = []; }
const favorites = new Set(Array.isArray(savedFavorites) ? savedFavorites : []);

function selectTemplate(card) {
  cards.forEach(item => item.classList.toggle('is-selected', item === card));
  loading.classList.add('is-visible');
  frame.classList.add('is-loading');
  frame.src = card.dataset.src;
  frame.title = `Xem trước mẫu thiệp ${card.dataset.title}`;
  title.textContent = card.dataset.title;
  number.textContent = `MẪU ${card.dataset.number}`;
  openFull.href = card.dataset.src;
  if (window.innerWidth < 980) document.querySelector('.preview-panel').scrollIntoView({behavior:'smooth'});
}

function applyFavorites() {
  cards.forEach(card => {
    const active = favorites.has(card.dataset.src);
    const button = card.querySelector('.favorite');
    button.classList.toggle('is-active', active);
    button.textContent = active ? '♥' : '♡';
    button.setAttribute('aria-pressed', String(active));
  });
  localStorage.setItem('wedding-favorites', JSON.stringify([...favorites]));
}

cards.forEach(card => {
  card.querySelector('.template-card__select').addEventListener('click', () => selectTemplate(card));
  card.querySelector('.favorite').addEventListener('click', event => {
    event.stopPropagation();
    favorites.has(card.dataset.src) ? favorites.delete(card.dataset.src) : favorites.add(card.dataset.src);
    applyFavorites();
    if (document.querySelector('.filter.is-active').dataset.filter === 'favorite') filterCards('favorite');
  });
});

frame.addEventListener('load', () => { loading.classList.remove('is-visible'); frame.classList.remove('is-loading'); });

function filterCards(filter) {
  let visible = 0;
  cards.forEach(card => {
    const show = filter === 'all' || card.dataset.category.includes(filter) || (filter === 'favorite' && favorites.has(card.dataset.src));
    card.hidden = !show;
    if (show) visible += 1;
  });
  emptyState.hidden = visible > 0;
}

filters.forEach(button => button.addEventListener('click', () => {
  filters.forEach(item => item.classList.toggle('is-active', item === button));
  filterCards(button.dataset.filter);
}));
document.querySelector('#showAll').addEventListener('click', () => filters[0].click());
document.querySelectorAll('[data-viewport]').forEach(button => button.addEventListener('click', () => {
  document.querySelectorAll('[data-viewport]').forEach(item => item.classList.toggle('is-active', item === button));
  stage.classList.toggle('is-mobile', button.dataset.viewport === 'mobile');
}));

const helpPanel = document.querySelector('#helpPanel');
const helpBackdrop = document.querySelector('#helpBackdrop');
const helpButton = document.querySelector('#toggleHelp');
function setHelp(open) {
  helpPanel.classList.toggle('is-open', open);
  helpBackdrop.classList.toggle('is-open', open);
  helpPanel.setAttribute('aria-hidden', String(!open));
  helpButton.setAttribute('aria-expanded', String(open));
}
helpButton.addEventListener('click', () => setHelp(true));
document.querySelector('#closeHelp').addEventListener('click', () => setHelp(false));
helpBackdrop.addEventListener('click', () => setHelp(false));
document.addEventListener('keydown', event => { if (event.key === 'Escape') setHelp(false); });
applyFavorites();
