const state = {
  recipes: [], results: [], shown: 8, currentRecipe: null, scale: 1,
  cookIndex: 0, lastQuery: 'Recipes', timer: null, timerRemaining: 0,
  timerOriginal: 0, timerRunning: false
};

const $ = sel => document.querySelector(sel);
const views = ['#homeView','#resultsView','#detailView','#cookView'];
const browseTags = ['15-minute','very easy','cheap','crockpot','one-pot','comfort food','use it up','small batch','sweet','breakfast','dinner','vegetable','pantry'];
const recipeDataFiles = Array.from({length:73},(_,i)=>`./data/recipes-${String(i+1).padStart(2,'0')}.json`);

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
  state.lastQuery = q || 'All recipes';
  state.results = state.recipes.map(r=>({r,score:scoreRecipe(r,q)})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score || a.r.title.localeCompare(b.r.title)).map(x=>x.r);
  state.shown = 8; renderResults(); showView('#resultsView');
}
function renderBrowse() {
  $('#browseChips').innerHTML = browseTags.map(tag=>`<button class="chip" data-tag="${tag}">${tag}</button>`).join('');
  $('#browseChips').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>searchRecipes(b.dataset.tag)));
}
function renderResults() {
  $('#resultsTitle').textContent = state.lastQuery;
  $('#resultsCount').textContent = `${state.results.length} recipe${state.results.length===1?'':'s'} found`;
  $('#resultsGrid').innerHTML = state.results.slice(0,state.shown).map(r=>`<article class="recipe-card"><button data-id="${r.id}" class="card-button"><strong>${r.title}</strong><span>${r.totalMinutes} min · ${r.effort} · ${r.cost}</span><small>${r.description}</small></button></article>`).join('') || '<p class="empty">No exact match yet. Try an ingredient or a broader idea like “cheap,” “crockpot,” or “something sweet.”</p>';
  $('#resultsGrid').querySelectorAll('button[data-id]').forEach(b=>b.addEventListener('click',()=>openRecipe(b.dataset.id)));
  $('#showMore').hidden = state.shown >= state.results.length;
}
function formatAmount(n) {
  const rounded = Math.round(n*100)/100;
  const fractions = [[0.25,'¼'],[0.33,'⅓'],[0.5,'½'],[0.67,'⅔'],[0.75,'¾']];
  const whole = Math.floor(rounded), frac = rounded-whole;
  const hit = fractions.find(([v])=>Math.abs(frac-v)<0.03);
  if (hit) return `${whole||''}${hit[1]}`;
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
}
function ingredientLine(i,scale=1) { return `${formatAmount(i.amount*scale)} ${i.unit} ${i.item}${i.optional?' (optional)':''}`; }
function getFavorites() { try { return JSON.parse(localStorage.getItem('recipeBoxFavorites')||'[]'); } catch { return []; } }
function isFavorite(id) { return getFavorites().includes(id); }
function toggleFavorite(id) { const f=getFavorites(); const next=f.includes(id)?f.filter(x=>x!==id):[...f,id]; localStorage.setItem('recipeBoxFavorites',JSON.stringify(next)); renderDetail(); }
function addRecent(id) { let r=[]; try { r=JSON.parse(localStorage.getItem('recipeBoxRecent')||'[]'); } catch {} r=[id,...r.filter(x=>x!==id)].slice(0,8); localStorage.setItem('recipeBoxRecent',JSON.stringify(r)); }
function openRecipe(id) { state.currentRecipe=state.recipes.find(r=>r.id===id); state.scale=1; state.cookIndex=0; addRecent(id); renderDetail(); showView('#detailView'); }
function renderDetail() {
  const r=state.currentRecipe; if(!r) return;
  $('#detailTitle').textContent=r.title; $('#detailDescription').textContent=r.description;
  $('#detailMeta').textContent=`${r.servings} servings · ${r.prepMinutes} min prep · ${r.cookMinutes} min cook · ${r.totalMinutes} min total · ${r.effort} · ${r.cost}`;
  $('#favoriteBtn').textContent=isFavorite(r.id)?'★ FAVORITE':'☆ FAVORITE';
  document.querySelectorAll('[data-scale]').forEach(b=>b.classList.toggle('selected',Number(b.dataset.scale)===state.scale));
  $('#ingredientsList').innerHTML=r.ingredients.map(i=>`<li>${ingredientLine(i,state.scale)}</li>`).join('');
  $('#stepsList').innerHTML=r.cookSteps.map((s,i)=>`<li><strong>${i+1}.</strong> ${s.text}</li>`).join('');
  $('#substitutions').innerHTML=(r.substitutions||[]).map(s=>`<li>${s}</li>`).join('');
  $('#storageNote').textContent=r.storage||'';
}
function scaledStepText(text) {
  if (state.scale===1) return text;
  const r=state.currentRecipe;
  let out=text;
  for (const i of r.ingredients) {
    const original=`${formatAmount(i.amount)} ${i.unit}`;
    const scaled=`${formatAmount(i.amount*state.scale)} ${i.unit}`;
    out=out.replaceAll(original,scaled);
  }
  return out;
}
function renderCook() {
  const r=state.currentRecipe, s=r.cookSteps[state.cookIndex];
  $('#cookRecipeTitle').textContent=r.title;
  $('#cookProgress').textContent=`STEP ${state.cookIndex+1} OF ${r.cookSteps.length}`;
  $('#cookStepText').textContent=scaledStepText(s.text);
  $('#cookBack').disabled=state.cookIndex===0;
  $('#cookNext').textContent=state.cookIndex===r.cookSteps.length-1?'DONE':'NEXT';
  $('#timerBtn').hidden=!s.timerMinutes;
  $('#timerBtn').textContent=s.timerMinutes?`START ${s.timerMinutes} MIN TIMER`:'TIMER';
  resetTimer();
}
function startCook() { state.cookIndex=0; renderCook(); showView('#cookView'); }
function resetTimer() { clearInterval(state.timer); state.timer=null; state.timerRunning=false; state.timerRemaining=0; $('#timerDisplay').textContent=''; }
function startTimer(minutes) {
  resetTimer(); state.timerOriginal=minutes*60; state.timerRemaining=state.timerOriginal; state.timerRunning=true;
  const tick=()=>{ const m=Math.floor(state.timerRemaining/60),s=state.timerRemaining%60; $('#timerDisplay').textContent=`${m}:${String(s).padStart(2,'0')}`; if(state.timerRemaining<=0){clearInterval(state.timer);state.timerRunning=false;$('#timerDisplay').textContent='DONE';return;} state.timerRemaining--; };
  tick(); state.timer=setInterval(tick,1000);
}
async function loadRecipes() {
  try {
    const chunks=await Promise.all(recipeDataFiles.map(f=>fetch(f).then(r=>{if(!r.ok)throw new Error(`Could not load ${f}`);return r.json();})));
    state.recipes=chunks.flat(); renderBrowse();
  } catch(err) { $('#loadStatus').textContent='Recipe Box could not load its recipes. Please refresh once you are online.'; console.error(err); }
}
$('#searchForm').addEventListener('submit',e=>{e.preventDefault();searchRecipes($('#searchInput').value);});
$('#browseAll').addEventListener('click',()=>searchRecipes(''));
$('#showMore').addEventListener('click',()=>{state.shown+=8;renderResults();});
$('#resultsHome').addEventListener('click',()=>showView('#homeView'));
$('#detailBack').addEventListener('click',()=>showView('#resultsView'));
$('#favoriteBtn').addEventListener('click',()=>toggleFavorite(state.currentRecipe.id));
$('#cookBtn').addEventListener('click',startCook);
$('#printBtn').addEventListener('click',()=>window.print());
document.querySelectorAll('[data-scale]').forEach(b=>b.addEventListener('click',()=>{state.scale=Number(b.dataset.scale);renderDetail();}));
$('#cookExit').addEventListener('click',()=>{resetTimer();showView('#detailView');});
$('#cookBack').addEventListener('click',()=>{if(state.cookIndex>0){state.cookIndex--;renderCook();}});
$('#cookNext').addEventListener('click',()=>{const r=state.currentRecipe;if(state.cookIndex<r.cookSteps.length-1){state.cookIndex++;renderCook();}else{resetTimer();showView('#detailView');}});
$('#timerBtn').addEventListener('click',()=>{const s=state.currentRecipe.cookSteps[state.cookIndex];if(s.timerMinutes)startTimer(s.timerMinutes);});
if('serviceWorker' in navigator) window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js'));
loadRecipes();
