import { loadRecipes, RECIPE_FILES } from './load-recipes.mjs';
const recipes=loadRecipes();
const required=['id','title','aliases','description','servings','prepMinutes','cookMinutes','totalMinutes','effort','cost','equipment','ingredients','steps','cookSteps','storage','tags'];
let errors=[]; const ids=new Set(), titles=new Set();
for(const r of recipes){
 for(const k of required) if(r[k]===undefined || r[k]===null) errors.push(`${r.id||r.title||'unknown recipe'}: missing ${k}`);
 if(r.id!==undefined){ if(ids.has(r.id)) errors.push(`duplicate id ${r.id}`); ids.add(r.id); }
 if(typeof r.title==='string'){ const title=r.title.toLowerCase(); if(titles.has(title)) errors.push(`duplicate title ${r.title}`); titles.add(title); }
 if(Number.isFinite(r.prepMinutes) && Number.isFinite(r.cookMinutes) && Number.isFinite(r.totalMinutes) && r.totalMinutes!==r.prepMinutes+r.cookMinutes) errors.push(`${r.title||r.id}: total mismatch`);
 if(!Array.isArray(r.ingredients) || !r.ingredients.length) errors.push(`${r.title||r.id}: no ingredients`);
 else for(const [i,ing] of r.ingredients.entries()) if(ing.amount===undefined || !ing.item) errors.push(`${r.title||r.id}: bad ingredient ${i}`);
 if(!Array.isArray(r.steps) || !r.steps.length) errors.push(`${r.title||r.id}: missing steps`);
 if(!Array.isArray(r.cookSteps) || !r.cookSteps.length) errors.push(`${r.title||r.id}: missing cook steps`);
 if(Array.isArray(r.tags)){
  if(r.tags.includes('15-minute') && r.totalMinutes>20) errors.push(`${r.title}: unrealistic 15-minute tag`);
  if(r.tags.includes('10-minute') && r.totalMinutes>12) errors.push(`${r.title}: unrealistic 10-minute tag`);
 }
 if(Array.isArray(r.cookSteps)) for(const s of r.cookSteps){ if(!s.text) errors.push(`${r.title||r.id}: empty cook step`); if(s.timerMinutes!==undefined && !(s.timerMinutes>0)) errors.push(`${r.title||r.id}: invalid timer`); }
}
if(errors.length){ console.error(errors.join('\n')); process.exit(1); }
console.log(`OK: ${recipes.length} recipes validated across ${RECIPE_FILES.length} data chunks`);
