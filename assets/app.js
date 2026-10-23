const $ = (s) => document.querySelector(s);
let portals = [], filter = 'all', toastTimer;
const readPreference = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
const preference = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} };
const storedFavorites = readPreference('kapi-favorites', []);
let favorites = new Set(Array.isArray(storedFavorites) ? storedFavorites : []);
let paused = readPreference('kapi-paused', false);
const escapeHTML = (text) => String(text).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeURL = value => { try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.href : ''; } catch { return ''; } };
function character(kind) {
  const head = (front, side, hair) => `<path d="M10 0h24v23H10z" fill="${front}"/><path d="M34 0l7 4v23l-7-4z" fill="${side}"/><path d="M10 0l7-4h24l-7 4z" fill="${hair}"/>`;
  let body = '';
  if (kind === 3) {
    body = head('#68b543','#3a782a','#85c655') + '<path d="M13 6h7v7h-7zM25 6h7v7h-7zM20 12h6v10h-6zM16 16h4v7h-4zM26 16h4v7h-4z" fill="#142c16"/><path d="M13 23h20v29H13zM5 49h16v16H5zM26 49h15v16H26z" fill="#579e36"/><path d="M13 28h6v6h-6zM25 38h8v7h-8zM7 53h7v6H7zM30 55h7v4h-7z" fill="#80c34b"/><path d="M5 61h16v5H5zM26 61h15v5H26z" fill="#254a25"/>';
  } else if (kind === 6) {
    body = '<path d="M3 27h38v23H3z" fill="#e4a0ae"/><path d="M3 50h9v15H3zM29 50h9v15h-9z" fill="#c17b8c"/>'+head('#efb0bf','#c18196','#f9c4ce')+'<path d="M14 8h4v4h-4zM28 8h4v4h-4z" fill="#30232e"/><path d="M17 13h13v9H17z" fill="#d68a9e"/><path d="M19 16h3v3h-3zM26 16h3v3h-3z" fill="#8a4c65"/>';
  } else if (kind === 7) {
    body=head('#282334','#16121f','#3c3247')+'<path d="M11 11h9v4h-9zM25 11h9v4h-9z" fill="#d984f3"/><path d="M14 23h18v24H14zM7 23h5v40H7zM34 23h5v40h-5zM14 47h6v29h-6zM26 47h6v29h-6z" fill="#252130"/>';
  } else {
    const skeleton=kind===5, zombie=kind===4, alex=kind===2;
    const skin=skeleton?'#d9d9c6':zombie?'#78a563':alex?'#e7bc99':'#b88667';
    const side=skeleton?'#979d92':zombie?'#476d3b':'#88604d';
    const hair=skeleton?'#e5e4d3':zombie?'#405b32':alex?'#b46c2e':'#45302c';
    const shirt=skeleton?'#c6cbbd':alex?'#7eab65':'#3ba9b4';
    const pants=skeleton?'#a6aea1':alex?'#78594a':'#585293';
    body=head(skin,side,hair)+`<path d="M10 0h24v5H10zM10 5h4v5h-4z" fill="${hair}"/><path d="M14 10h5v4h-5zM26 10h5v4h-5z" fill="${skeleton?'#353b35':'#e1dfe1'}"/><path d="M17 10h3v4h-3zM26 10h3v4h-3z" fill="#41475a"/><path d="M20 17h7v3h-7z" fill="${skeleton?'#4e574c':'#825749'}"/><path d="M11 23h24v25H11zM1 23h10v14H1zM35 23h10v14H35z" fill="${shirt}"/><path d="M1 37h10v15H1zM35 37h10v15H35z" fill="${skin}"/><path d="M11 48h11v20H11zM24 48h11v20H24z" fill="${pants}"/><path d="M11 65h11v5H11zM24 65h11v5H24z" fill="#3c3b48"/>`;
    if(skeleton)body+='<path d="M15 27h16v3H15zM15 33h16v3H15zM15 39h16v3H15z" fill="#657364"/>';
    if(alex)body+='<path d="M30 5h4v26h-7v-9h3z" fill="#bc7637"/>';
  }
  return `<g class="minecraft-character" transform="translate(18 111) scale(.95)"><ellipse cx="23" cy="72" rx="27" ry="7" fill="#0005"/>${body}</g>`;
}
function gate(color, id, variant = 0) {
  let blocks = '';
  for (let y = 38; y < 166; y += 21) for (const x of [66, 174]) {
    const tone = (y + x + variant) % 3 === 0 ? '#393044' : '#262333';
    blocks += `<rect x="${x}" y="${y}" width="22" height="20" fill="${tone}" stroke="#52415d" stroke-width=".6"/><path d="M${x+3} ${y+3}h10v4h-4v7h-6z" fill="${color}" opacity=".12"/><path d="M${x} ${y+19}h22" stroke="#141320" stroke-width="2"/>`;
  }
  for(let x=66;x<196;x+=22) blocks += `<rect x="${x}" y="20" width="21" height="21" fill="#30293e" stroke="#584269" stroke-width=".7"/><path d="M${x+3} 23h12v4h-12z" fill="${color}" opacity=".22"/>`;
  return `<svg viewBox="0 0 260 210" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><linearGradient id="g-${id}" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${color}"/><stop offset=".5" stop-color="#32244a"/><stop offset="1" stop-color="${color}"/></linearGradient><radialGradient id="l-${id}"><stop stop-color="${color}" stop-opacity=".65"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></radialGradient></defs><ellipse cx="130" cy="179" rx="105" ry="28" fill="url(#l-${id})"/><path d="M44 174l88-20 87 19-87 27z" fill="#30283b"/><path d="M44 174v11l88 25v-10z" fill="#1d1927"/><path d="M132 200l87-27v12l-87 25z" fill="#25202f"/><path d="M55 174l77 18 73-19M77 169l78 18M104 163l79 17M74 181l77-20M100 188l77-21" fill="none" stroke="#493750" stroke-width="1"/><path d="M196 20l12-7v146l-12 7z" fill="#171521"/><path d="M66 20l12-7h130l-12 7z" fill="#494052"/><rect x="88" y="41" width="86" height="125" fill="url(#g-${id})"/><g class="portal-flow"><path d="M89 54q32 24 85-8v19q-51 32-85 8zM89 103q40-35 85-7v18q-53-31-85 8zM89 141q43 21 85-12v24q-40 23-85 3z" fill="${color}" opacity=".45"/><path d="M100 42v122M116 42v122M150 42v122M165 42v122" stroke="${color}" opacity=".16" stroke-width="5"/><path d="M94 82h16v7H94zM143 63h19v5h-19zM122 130h20v8h-20zM153 144h10v5h-10z" fill="#fff" opacity=".14"/></g>${blocks}<rect x="87" y="40" width="88" height="126" fill="none" stroke="${color}" stroke-opacity=".8" stroke-width="1.7"/><path d="M65 166h132v8H65z" fill="#40314e"/><g class="portal-particles" fill="${color}" opacity=".8"><rect x="47" y="76" width="3" height="3"/><rect x="212" y="100" width="4" height="4"/><rect x="204" y="45" width="3" height="3"/><rect x="55" y="139" width="4" height="4"/><rect x="145" y="8" width="3" height="3"/><rect x="226" y="139" width="2" height="2"/></g>${character(variant || 1)}</svg>`;
}
if($('#hero-gate')) $('#hero-gate').innerHTML = gate('#ae7eff','hero');
function toast(message) { $('#toast').textContent = message; $('#toast').classList.add('visible'); clearTimeout(toastTimer); toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 2300); }
function render() {
  const query = $('#search').value.trim().toLocaleLowerCase('tr');
  const shown = portals.filter(p => (filter === 'all' || favorites.has(p.id)) && `${p.name} ${p.description} ${p.category}`.toLocaleLowerCase('tr').includes(query));
  $('#favorite-count').textContent = portals.filter(p => favorites.has(p.id)).length;
  $('#portal-grid').innerHTML = shown.map(p => `<article class="portal-card" style="--accent:${p.color}"><button class="favorite-button" data-favorite="${p.id}" aria-label="${escapeHTML(p.name)}: ${favorites.has(p.id) ? 'favorilerden çıkar' : 'favorilere ekle'}" aria-pressed="${favorites.has(p.id)}">${favorites.has(p.id) ? '★' : '☆'}</button><button class="portal-open" data-portal="${p.id}" aria-label="${escapeHTML(p.name)} portalını keşfet"><div class="portal-scene"><span class="scene-label">PORTAL / 0${p.id}</span>${gate(p.color, p.id,p.id)}</div><div class="portal-copy"><div class="portal-meta">${escapeHTML(p.category)}</div><h3>${escapeHTML(p.name)}</h3><p>${escapeHTML(p.description)}</p><div class="portal-bottom"><span>${p.url ? '● Keşfetmeye hazır' : '◌ Bağlantı yakında'}</span><span class="arrow">↗</span></div></div></button></article>`).join('');
  $('#empty').hidden = shown.length > 0;
}
function openPortal(id) {
  const p = portals.find(p => p.id === id); if (!p) return;
  $('#dialog-art').innerHTML = gate(p.color, 'dialog', p.id);
  $('#dialog-tag').textContent = `PORTAL 0${p.id} / ${p.category}`;
  $('#dialog-title').textContent = p.name; $('#dialog-description').textContent = p.description;
  const url = safeURL(p.url);
  $('#dialog-link').hidden = !url;
  $('#dialog-status').textContent = url ? `Bu portal ${new URL(url).hostname} adresine açılır.` : 'Bu dünya hazırlanıyor. Bağlantısı eklendiğinde buradan geçiş yapabileceksin.';
  if(url) $('#dialog-link').href = url; else $('#dialog-link').removeAttribute('href');
  $('#portal-dialog').showModal();
}
$('#portal-grid').addEventListener('click', event => {
  const favorite = event.target.closest('[data-favorite]');
  if(favorite) { const id = Number(favorite.dataset.favorite); favorites.has(id) ? favorites.delete(id) : favorites.add(id); preference('kapi-favorites',[...favorites]); render(); document.querySelector(`[data-favorite="${id}"]`)?.focus(); return; }
  const button = event.target.closest('[data-portal]'); if(button) openPortal(Number(button.dataset.portal));
});
for (const mode of ['all','favorites']) $(`#${mode}`).addEventListener('click', () => { filter = mode; for(const m of ['all','favorites']) { $(`#${m}`).classList.toggle('selected', m === mode); $(`#${m}`).setAttribute('aria-pressed', String(m === mode)); } render(); });
$('#search').addEventListener('input', render);
function applyMotion(){ document.documentElement.classList.toggle('motion-paused', paused); $('#motion').setAttribute('aria-pressed',String(paused)); $('#motion').setAttribute('aria-label',paused ? 'Animasyonları başlat' : 'Animasyonları durdur'); $('#motion').title = $('#motion').getAttribute('aria-label'); }
applyMotion(); $('#motion').addEventListener('click', () => { paused = !paused; preference('kapi-paused',paused); applyMotion(); });
$('#how').addEventListener('click', () => $('#help-dialog').showModal());
document.querySelectorAll('dialog').forEach(dialog => { dialog.querySelector('.dialog-close').addEventListener('click', () => dialog.close()); dialog.addEventListener('click', e => { if(e.target === dialog) { const r=dialog.getBoundingClientRect(); if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom) dialog.close(); } }); });
document.addEventListener('keydown', e => { if(e.ctrlKey||e.metaKey||e.altKey||e.shiftKey||e.repeat||/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)||document.querySelector('dialog[open]')) return; if(e.key === '/') { e.preventDefault(); $('#search').focus(); } if(/^[1-7]$/.test(e.key)) openPortal(Number(e.key)); });
async function load(){try { const response = await fetch('api.php?action=portals',{cache:'no-store'}); if(!response.ok) throw Error(); const data = await response.json(); portals = data.portals; render(); } catch { $('#portal-grid').innerHTML = '<p class="loading">Portallar yüklenemedi. <button class="text-button" id="retry">Yeniden dene ↻</button></p>'; $('#retry').addEventListener('click',load); }}
load();
