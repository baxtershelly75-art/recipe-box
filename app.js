const state = {
  recipes: [], results: [], shown: 8, currentRecipe: null, scale: 1,
  cookIndex: 0, lastQuery: 'Recipes', timer: null, timerRemaining: 0,
  timerOriginal: 0, timerRunning: false
};

const $ = sel => document.querySelector(sel);
const views = ['#homeView','#resultsView','#detailView','#cookView'];
const browseTags = ['15-minute','very easy','cheap','crockpot','one-pot','comfort food','use it up','small batch','sweet','breakfast','dinner','vegetable','pantry'];
const recipeDataFiles = Array.from({length:39},(_,i)=>`./data/recipes-${String(i+1).padStart(2,'0')}.json`);

function showView(id) { views.forEach(v => $(v).classList.toggle('active', v === id)); window.scrollTo({top:0,behavior:'instant'}); }
function norm(s='') { return s.toLowerCase().replace(/[^a-z0-9]+/g,' ').trim(); }
function recipeSearchText(r) { return norm([r.title,...(r.aliases||[]),r.description,...r.ingredients.map(i=>i.item),...(r.tags||[]),r.effort,r.cost,...(r.equipment||[])].join(' ')); }
function scoreRecipe(r, query) {
  const q = norm(query); if (!q) return 1;
  const terms = q.split(' ').filter(Boolean); const hay = recipeSearchText(r);
  let score = 0;
  if (norm(r.title).includes(q)) score += 30;
  if ((r.aliases||[]).some(a=>norm(a).includes(q))) score += 24;
  for (const t of terms) {
    if (norm(r.title).includes(t)) score += 9;
    if ((r.tags||[]).some(tag=>norm(tag).includes(t))) score += 7;
    if (r.ingredients.some(i=>norm(i.item).includes(t))) score += 6;
    if (hay.includes(t)) score += 2;
  }
  return score;
}
function searchRecipes(query) {
  const q = query.trim();
  const ranked = state.recipes.map(r=>({r,score:scoreRecipe(r,q)})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score || a.r.totalMinutes-b.r.totalMinutes).map(x=>x.r);
  state.results = diversify(ranked); state.shown = 8; state.lastQuery = q || 'All recipes'; renderResults(); showView('#resultsView');
}
function diversify(list) {
  const out=[]; const seenFamilies=new Map();
  for (const r of list) {
    const fam=(r.tags||[]).find(t=>['soup','pasta','dessert','breakfast','sandwich','casserole','rice','vegetable','crockpot','baking'].includes(t)) || 'other';
    const n=seenFamilies.get(fam)||0;
    if(n<3 || out.length>10){ out.push(r); seenFamilies.set(fam,n+1); }
  }
  return out;
}
function renderBrowse(){ $('#browseChips').innerHTML = browseTags.map(t=>`<button class="chip" type="button" data-tag="${t}">${label(t)}</button>`).join(''); }
function label(s){ return s.split(' ').map(x=>x.charAt(0).toUpperCase()+x.slice(1)).join(' '); }
function loadIds(key){ try{return JSON.parse(localStorage.getItem(key)||'[]')}catch{return []} }
function saveIds(key,ids){ localStorage.setItem(key,JSON.stringify(ids.slice(0,20))); }
function isFav(id){ return loadIds('recipe-favorites').includes(id); }
function toggleFav(id){ let ids=loadIds('recipe-favorites'); ids=ids.includes(id)?ids.filter(x=>x!==id):[id,...ids]; saveIds('recipe-favorites',ids); renderCurrent(); }
function addRecent(id){ let ids=loadIds('recipe-recent').filter(x=>x!==id); ids.unshift(id); saveIds('recipe-recent',ids); renderRecent(); }
function recipeCard(r){ return `<article class="recipe-card">
  <div><p class="eyebrow">${r.totalMinutes} MIN · ${r.effort.toUpperCase()}</p><h3>${r.title}</h3></div>
  <p>${r.description}</p>
  <div class="recipe-meta"><span class="meta-pill">${r.cost}</span>${(r.tags||[]).slice(0,2).map(t=>`<span class="meta-pill">${label(t)}</span>`).join('')}</div>
  <div class="card-actions"><button class="primary-btn" type="button" data-open="${r.id}">OPEN</button><button class="secondary-btn icon-btn" type="button" aria-label="Favorite ${r.title}" data-fav="${r.id}">${isFav(r.id)?'♥':'♡'}</button></div>
</article>`; }
function renderRecent(){ const ids=loadIds('recipe-recent').slice(0,4); const rs=ids.map(id=>state.recipes.find(r=>r.id===id)).filter(Boolean); $('#recentGrid').innerHTML=rs.length?rs.map(recipeCard).join(''):'<p>No recent recipes yet.</p>'; }
function renderResults(){ $('#resultsTitle').textContent=state.lastQuery; $('#resultsCount').textContent=`${state.results.length} found`; $('#resultsGrid').innerHTML=state.results.slice(0,state.shown).map(recipeCard).join('') || '<p>No matches yet. Try a simpler ingredient or need.</p>'; $('#showMoreBtn').classList.toggle('hidden',state.shown>=state.results.length); }
function formatQty(ing,scale){ if (typeof ing.amount !== 'number') return ing.amount || ''; const n=ing.amount*scale; if(Number.isInteger(n))return String(n); const common=[[0.25,'¼'],[0.333,'⅓'],[0.5,'½'],[0.667,'⅔'],[0.75,'¾']]; const whole=Math.floor(n), frac=n-whole; let best=common.reduce((a,b)=>Math.abs(b[0]-frac)<Math.abs(a[0]-frac)?b:a,[0,'']); return frac<.08?String(whole):frac>.92?String(whole+1):(whole?`${whole}${best[1]}`:best[1]||n.toFixed(1)); }
function detailHtml(r){ return `<div class="detail-title-row"><div><p class="eyebrow">${r.prepMinutes} PREP · ${r.cookMinutes} COOK · ${r.totalMinutes} TOTAL</p><h2>${r.title}</h2></div><button class="secondary-btn icon-btn" type="button" data-fav="${r.id}">${isFav(r.id)?'♥':'♡'}</button></div>
<p class="detail-description">${r.description}</p>
<div class="detail-meta"><span class="meta-pill">Serves ${r.servings}</span><span class="meta-pill">${label(r.effort)}</span><span class="meta-pill">${r.cost}</span>${(r.tags||[]).slice(0,4).map(t=>`<span class="meta-pill">${label(t)}</span>`).join('')}</div>
<button class="primary-btn wide" type="button" data-cook="${r.id}">COOK WITH ME</button>
<div class="scaler"><strong>Scale:</strong>${[.5,1,2].map(s=>`<button type="button" class="secondary-btn ${state.scale===s?'active':''}" data-scale="${s}">${s===.5?'½':s}×</button>`).join('')}<button type="button" class="secondary-btn" onclick="window.print()">PRINT</button></div>
<section class="detail-section"><h3>Equipment</h3><p>${r.equipment.join(' · ')}</p></section>
<section class="detail-section"><h3>Ingredients</h3><ul class="ingredients">${r.ingredients.map(i=>`<li><strong>${formatQty(i,state.scale)} ${i.unit||''}</strong> ${i.item}${i.optional?' <em>(optional)</em>':''}</li>`).join('')}</ul></section>
${r.substitutions?.length?`<section class="detail-section"><h3>Easy swaps</h3><ul>${r.substitutions.map(x=>`<li>${x}</li>`).join('')}</ul></section>`:''}
<section class="detail-section"><h3>Steps</h3><ol class="steps">${r.steps.map(s=>`<li>${s.text}</li>`).join('')}</ol></section>
<section class="detail-section"><h3>Storage & leftovers</h3><p>${r.storage}</p></section>`; }
function openRecipe(id){ const r=state.recipes.find(x=>x.id===id); if(!r)return; state.currentRecipe=r; state.scale=1; addRecent(id); $('#recipeDetail').innerHTML=detailHtml(r); showView('#detailView'); }
function renderCurrent(){ renderRecent(); renderResults(); if(state.currentRecipe) $('#recipeDetail').innerHTML=detailHtml(state.currentRecipe); }
function scaledStepText(step,r){ let text=step.text; (step.quantities||[]).forEach(q=>{ const ing=r.ingredients[q.ingredientIndex]; if(!ing)return; text=text.replaceAll(`{{${q.key}}}`, `${formatQty(ing,state.scale)} ${ing.unit||''}`.trim()); }); return text; }
function cookStepsFor(r){ return r.cookSteps?.length ? r.cookSteps : r.steps; }
function startCook(id){ const r=state.recipes.find(x=>x.id===id); if(!r)return; state.currentRecipe=r; state.cookIndex=0; clearTimer(); renderCook(); showView('#cookView'); if('wakeLock' in navigator) navigator.wakeLock.request('screen').catch(()=>{}); }
function renderCook(){ const r=state.currentRecipe, steps=cookStepsFor(r), step=steps[state.cookIndex]; $('#cookRecipeTitle').textContent=r.title; $('#cookProgress').textContent=`${state.cookIndex+1} / ${steps.length}`; $('#cookStep').textContent=scaledStepText(step,r); $('#cookBackBtn').disabled=state.cookIndex===0; $('#cookNextBtn').textContent=state.cookIndex===steps.length-1?'DONE':'DONE / NEXT'; setupTimer(step.timerMinutes||0); }
function setupTimer(min){ clearTimer(); const panel=$('#timerPanel'); if(!min){panel.classList.add('hidden');return;} panel.classList.remove('hidden'); state.timerOriginal=Math.round(min*60); state.timerRemaining=state.timerOriginal; $('#startTimerBtn').classList.remove('hidden'); $('#timerRunning').classList.add('hidden'); $('#timerDoneText').classList.add('hidden'); updateTimerDisplay(); }
function updateTimerDisplay(){ const s=Math.max(0,state.timerRemaining), m=Math.floor(s/60), sec=s%60; $('#timerDisplay').textContent=`${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`; }
function runTimer(){ if(state.timerRunning)return; state.timerRunning=true; $('#startTimerBtn').classList.add('hidden'); $('#timerRunning').classList.remove('hidden'); $('#pauseTimerBtn').textContent='PAUSE'; state.timer=setInterval(()=>{ state.timerRemaining--; updateTimerDisplay(); if(state.timerRemaining<=0){ clearInterval(state.timer); state.timer=null; state.timerRunning=false; $('#timerDoneText').classList.remove('hidden'); if(navigator.vibrate) navigator.vibrate([300,150,300]); } },1000); }
function clearTimer(){ if(state.timer) clearInterval(state.timer); state.timer=null; state.timerRunning=false; }
function nextCook(){ clearTimer(); const steps=cookStepsFor(state.currentRecipe); if(state.cookIndex<steps.length-1){state.cookIndex++;renderCook();}else{showView('#detailView');} }

function bind(){
  $('#searchBtn').addEventListener('click',()=>searchRecipes($('#searchInput').value));
  $('#searchInput').addEventListener('keydown',e=>{if(e.key==='Enter')searchRecipes(e.target.value)});
  $('#browseChips').addEventListener('click',e=>{const b=e.target.closest('[data-tag]');if(b)searchRecipes(b.dataset.tag)});
  document.body.addEventListener('click',e=>{
    const open=e.target.closest('[data-open]'); if(open)openRecipe(open.dataset.open);
    const fav=e.target.closest('[data-fav]'); if(fav){e.stopPropagation();toggleFav(fav.dataset.fav)}
    const cook=e.target.closest('[data-cook]'); if(cook)startCook(cook.dataset.cook);
    const scale=e.target.closest('[data-scale]'); if(scale){state.scale=Number(scale.dataset.scale); $('#recipeDetail').innerHTML=detailHtml(state.currentRecipe)}
    const action=e.target.closest('[data-action]'); if(action?.dataset.action==='home')showView('#homeView'); if(action?.dataset.action==='back-results')showView('#resultsView');
  });
  $('#showMoreBtn').addEventListener('click',()=>{state.shown+=8;renderResults()});
  $('#favoritesBtn').addEventListener('click',()=>{const ids=loadIds('recipe-favorites');state.results=ids.map(id=>state.recipes.find(r=>r.id===id)).filter(Boolean);state.lastQuery='Favorites';state.shown=8;renderResults();showView('#resultsView')});
  $('#exitCookBtn').addEventListener('click',()=>{clearTimer();showView('#detailView')});
  $('#cookBackBtn').addEventListener('click',()=>{if(state.cookIndex>0){clearTimer();state.cookIndex--;renderCook()}});
  $('#cookNextBtn').addEventListener('click',nextCook);
  $('#startTimerBtn').addEventListener('click',runTimer);
  $('#pauseTimerBtn').addEventListener('click',()=>{if(state.timerRunning){clearInterval(state.timer);state.timer=null;state.timerRunning=false;$('#pauseTimerBtn').textContent='RESUME'}else{runTimer()}});
  $('#addMinuteBtn').addEventListener('click',()=>{state.timerRemaining+=60;updateTimerDisplay()});
  $('#resetTimerBtn').addEventListener('click',()=>{clearTimer();state.timerRemaining=state.timerOriginal;updateTimerDisplay();$('#pauseTimerBtn').textContent='PAUSE';$('#startTimerBtn').classList.remove('hidden');$('#timerRunning').classList.add('hidden');$('#timerDoneText').classList.add('hidden')});
}
async function init(){
  const chunks=await Promise.all(recipeDataFiles.map(async file=>{
    const res=await fetch(file);
    if(!res.ok) throw new Error(`Could not load ${file}`);
    return res.json();
  }));
  state.recipes=chunks.flat();
  renderBrowse();renderRecent();bind();
  if('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(()=>{});
}
init().catch(error=>{
  console.error(error);
  const home=document.querySelector('#homeView');
  if(home) home.insertAdjacentHTML('beforeend','<p role="alert"><strong>Recipe Box could not load its recipe library. Please refresh and try again.</strong></p>');
});
