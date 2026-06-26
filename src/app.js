import { SPRITES } from './data/sprites.js';

const SAVE_KEY = 'fortdex.save.v2';
const OLD_KEYS = ['fortdex.save.v1','fortniteSpriteTracker'];
const PROFILES = ['Mike', 'Son'];

const blankSpriteState = () => ({ have:false, mastered:false, notes:'' });
const blankProfile = () => ({ sprites: Object.fromEntries(SPRITES.map(s => [s.id, blankSpriteState()])) });

function createSave(){ return { version:2, activeProfile:'Mike', profiles:{ Mike:blankProfile(), Son:blankProfile() }, updatedAt:new Date().toISOString() }; }
function normalizeSave(raw){
  const save = raw && raw.version === 2 ? raw : createSave();
  for(const p of PROFILES){
    if(!save.profiles[p]) save.profiles[p] = blankProfile();
    if(!save.profiles[p].sprites) save.profiles[p].sprites = {};
    for(const s of SPRITES){ if(!save.profiles[p].sprites[s.id]) save.profiles[p].sprites[s.id] = blankSpriteState(); }
  }
  if(!PROFILES.includes(save.activeProfile)) save.activeProfile = 'Mike';
  save.version = 2;
  return save;
}
function loadSave(){
  try{
    const existing = localStorage.getItem(SAVE_KEY);
    if(existing) return normalizeSave(JSON.parse(existing));
    for(const key of OLD_KEYS){
      const old = localStorage.getItem(key);
      if(old){
        const migrated = migrateOldSave(JSON.parse(old));
        localStorage.setItem(SAVE_KEY, JSON.stringify(migrated));
        return migrated;
      }
    }
  }catch(e){ console.warn('Save load failed', e); }
  return createSave();
}
function migrateOldSave(old){
  const save = createSave();
  const oldSprites = old?.sprites || old?.items || old || {};
  for(const sprite of SPRITES){
    const oldState = oldSprites[sprite.id] || oldSprites[sprite.name] || {};
    save.profiles.Mike.sprites[sprite.id] = {
      have: Boolean(oldState.have ?? oldState.owned ?? oldState.collected),
      mastered: Boolean(oldState.mastered),
      notes: oldState.notes || ''
    };
  }
  return normalizeSave(save);
}
function save(){ state.updatedAt = new Date().toISOString(); localStorage.setItem(SAVE_KEY, JSON.stringify(state)); render(); }

let state = loadSave();
let filter = 'all';
let query = '';

function current(){ return state.profiles[state.activeProfile]; }
function stats(){
  const c = current();
  const total = SPRITES.length;
  const have = SPRITES.filter(s => c.sprites[s.id]?.have).length;
  const mastered = SPRITES.filter(s => c.sprites[s.id]?.mastered).length;
  return { total, have, mastered, need: total-have, completion: Math.round((have/total)*100), mastery: Math.round((mastered/total)*100) };
}
function filteredSprites(){
  const c = current();
  return SPRITES.filter(s => {
    const st = c.sprites[s.id] || blankSpriteState();
    const matchesQuery = `${s.name} ${s.element}`.toLowerCase().includes(query.toLowerCase());
    const matchesFilter = filter === 'all' || (filter === 'have' && st.have) || (filter === 'need' && !st.have) || (filter === 'mastered' && st.mastered) || (filter === 'unmastered' && !st.mastered);
    return matchesQuery && matchesFilter;
  });
}
function pctBar(value){ return `<div class="bar"><span style="width:${value}%"></span></div>`; }
function render(){
  const st = stats();
  document.querySelector('#app').innerHTML = `
    <main class="shell">
      <section class="top">
        <div class="brand"><h1>FortDex</h1><p>Fortnite collection tracker · local save v2</p></div>
        <div class="profile">${PROFILES.map(p=>`<button data-profile="${p}" class="${state.activeProfile===p?'active':''}">${p}</button>`).join('')}</div>
      </section>
      <section class="grid">
        <div class="card stat"><div class="num">${st.have}/${st.total}</div><div class="label">Collected</div>${pctBar(st.completion)}</div>
        <div class="card stat"><div class="num">${st.mastered}/${st.total}</div><div class="label">Mastered</div>${pctBar(st.mastery)}</div>
        <div class="card stat"><div class="num">${st.need}</div><div class="label">Still Needed</div>${pctBar(100-st.completion)}</div>
      </section>
      <section class="toolbar">
        <input class="search" placeholder="Search sprites..." value="${query.replaceAll('"','&quot;')}" />
        ${['all','have','need','mastered','unmastered'].map(f=>`<button class="chip ${filter===f?'active':''}" data-filter="${f}">${f}</button>`).join('')}
      </section>
      <section class="sprites">${filteredSprites().map(spriteCard).join('')}</section>
    </main>
    <section class="footer-actions"><div class="inner">
      <button class="action" id="exportBtn">Export Save</button>
      <button class="action" id="importBtn">Import Save</button>
      <input id="importFile" type="file" accept="application/json" class="hidden" />
      <button class="action" id="resetBtn">Reset Current Profile</button>
    </div></section>`;
  bind();
}
function spriteCard(s){
  const c = current(); const st = c.sprites[s.id] || blankSpriteState();
  return `<article class="card sprite">
    <div class="sprite-head"><div class="emoji">${s.emoji}</div><div><h3>${s.name}</h3><small>${s.element}</small></div></div>
    <div class="checks">
      <button class="check have ${st.have?'on':''}" data-toggle="have" data-id="${s.id}">${st.have?'✓ Have':'Need'}</button>
      <button class="check mastered ${st.mastered?'on':''}" data-toggle="mastered" data-id="${s.id}">${st.mastered?'★ Mastered':'Not Mastered'}</button>
    </div>
  </article>`;
}
function bind(){
  document.querySelectorAll('[data-profile]').forEach(b=>b.onclick=()=>{state.activeProfile=b.dataset.profile;save();});
  document.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{filter=b.dataset.filter;render();});
  document.querySelector('.search').oninput=e=>{query=e.target.value;render();};
  document.querySelectorAll('[data-toggle]').forEach(b=>b.onclick=()=>{ const st=current().sprites[b.dataset.id]; st[b.dataset.toggle]=!st[b.dataset.toggle]; if(!st.have) st.mastered=false; save(); });
  document.querySelector('#exportBtn').onclick=()=>{
    const blob = new Blob([JSON.stringify(state,null,2)], {type:'application/json'});
    const a = Object.assign(document.createElement('a'), { href:URL.createObjectURL(blob), download:`fortdex-save-${Date.now()}.json` }); a.click(); URL.revokeObjectURL(a.href);
  };
  document.querySelector('#importBtn').onclick=()=>document.querySelector('#importFile').click();
  document.querySelector('#importFile').onchange=async e=>{ const file=e.target.files[0]; if(!file) return; state=normalizeSave(JSON.parse(await file.text())); save(); };
  document.querySelector('#resetBtn').onclick=()=>{ if(confirm(`Reset ${state.activeProfile}'s FortDex progress?`)){ state.profiles[state.activeProfile]=blankProfile(); save(); } };
}

if('serviceWorker' in navigator){ navigator.serviceWorker.register('./sw.js').catch(()=>{}); }
render();
