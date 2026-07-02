/* The Upskilling Labs — stateless helpers shared by every HTML file.
   Loaded before each file's inline <script>. No routing, no per-file state,
   nothing that reads userState — keep it that way. */

// Brand orb (SVG) reused as the photography stand-in on generated cards/case studies.
const ORB='<div class="m-orb"><svg viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style="display:block;width:100%;height:100%"><defs><radialGradient id="oc" cx="38%" cy="35%" r="58%"><stop offset="0%" stop-color="#0094A0"/><stop offset="62%" stop-color="rgba(0,148,160,0)"/></radialGradient><radialGradient id="or" cx="62%" cy="78%" r="65%"><stop offset="60%" stop-color="rgba(225,29,42,0)"/><stop offset="100%" stop-color="#E11D2A"/></radialGradient><linearGradient id="og" x1="0%" y1="100%" x2="100%" y2="0%"><stop offset="0%" stop-color="#00D3E4"/><stop offset="60%" stop-color="#0094A0"/><stop offset="100%" stop-color="#007882"/></linearGradient></defs><circle cx="120" cy="120" r="116" fill="url(#oc)"/><circle cx="120" cy="120" r="116" fill="url(#or)"/><g transform="translate(20,40) scale(0.142)"><path d="M 0 900.84 C 532.341 651.368 841.069 454.81 1407.215 0 C 1190.699 365.98 1060.371 566.788 776.503 900.84 L 950.588 496.405 C 539.219 733.009 347.248 789.767 0 900.84 Z" fill="url(#og)"/></g></svg></div>';
const GRAD=['m-teal','m-forest','m-navy'];

function escHTML(s){ return String(s||'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
function relDate(ts){ const d=Math.round((Date.now()-ts)/86400000); return d<=0?'Today':d===1?'Yesterday':d<7?d+' days ago':Math.round(d/7)+'w ago'; }
function avatarSm(initials,title){ return '<span class="avatar" title="'+escHTML(title||'')+'" style="width:32px;height:32px;font-size:12px;flex-shrink:0;">'+escHTML(initials)+'</span>'; }

/* Keyboard access: tappable cards act like buttons (Enter/Space). */
function enhanceTappables(){ document.querySelectorAll('.tappable').forEach(el=>{ if(el.closest('a,button')||el.hasAttribute('tabindex')) return; el.setAttribute('tabindex','0'); el.setAttribute('role','button'); }); }
document.addEventListener('keydown',e=>{ if((e.key==='Enter'||e.key===' ')&&e.target.classList&&e.target.classList.contains('tappable')){ e.preventDefault(); e.target.click(); } });

/* Persona contract — which lens the signed-in demo user is viewing the suite through.
   Written by the View-as dropdown; read at boot by moderator.html / admin.html. */
const VIEW_AS_KEY='olos.viewAsRole.v1';
function getViewAsRole(){ try{ return localStorage.getItem(VIEW_AS_KEY)||'upskiller'; }catch(e){ return 'upskiller'; } }
function setViewAsRole(role){ try{ localStorage.setItem(VIEW_AS_KEY,role); }catch(e){} }
