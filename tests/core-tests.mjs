import assert from 'node:assert/strict';
import { loadRecipes } from './load-recipes.mjs';
const recipes=loadRecipes();
const norm=s=>(s||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const searchText=r=>norm([r.title,...r.aliases,r.description,...r.ingredients.map(i=>i.item),...r.tags].join(' '));
for(const q of ['stew beef','cabbage','stale bread','something sweet','15 minutes','cheap','crockpot','small batch','use it up']){
  const terms=norm(q).split(' '); const matches=recipes.filter(r=>terms.every(t=>searchText(r).includes(t)) || terms.some(t=>searchText(r).includes(t)));
  assert.ok(matches.length>0,`expected search coverage for ${q}`);
}
for(const r of recipes){
  const cookFlow=r.cookSteps?.length ? r.cookSteps : r.steps;
  assert.ok(Array.isArray(cookFlow) && cookFlow.length>0,`${r.title} needs a usable COOK WITH ME flow`);
}
const bread=recipes.find(r=>r.id==='caramelly-brioche-bread-pudding');
assert.equal(bread.ingredients.find(i=>i.item.startsWith('milk')).amount*2,4);
assert.ok(bread.cookSteps.some(s=>s.timerMinutes===35));
assert.ok(bread.cookSteps.length>=8);
const sliders=recipes.find(r=>r.id==='warm-ham-swiss-sliders');
assert.ok(!sliders.cookSteps && sliders.steps.some(s=>s.timerMinutes===10));
console.log('OK: search coverage, scaling primitives, timer data, and cook-step fallback navigation data');
