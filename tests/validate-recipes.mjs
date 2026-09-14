import { loadRecipes } from './load-recipes.mjs';
const recipes=loadRecipes();
const required=['id','title','aliases','description','servings','prepMinutes','cookMinutes','totalMinutes','effort','cost','equipment','ingredients','steps','cookSteps','storage','tags'];
let errors=[]; const ids=new Set(), titles=new Set();
for(const r of recipes){
 for(const k of required) if(r[k]===undefined || r[k]===null) errors.push(`${r.id||r.title}: missing ${k}`);
 if(ids.has(r.id)) errors.push(`duplicate id ${r.id}`); ids.add(r.id);
 const title=r.title.toLowerCase(); if(titles.has(title)) errors.push(`duplicate title ${r.title}`); titles.add(title);
 if(r.totalMinutes!==r.prepMinutes+r.cookMinutes) errors.push(`${r.title}: total mismatch`);
 if(!r.ingredients.length) errors.push(`${r.title}: no ingredients`);
 for(const [i,ing] of r.ingredients.entries()) if(ing.amount===undefined || !ing.item) errors.push(`${r.title}: bad ingredient ${i}`);
 if(!r.steps.length || !r.cookSteps.length) errors.push(`${r.title}: missing steps`);
 if(r.tags.includes('15-minute') && r.totalMinutes>20) errors.push(`${r.title}: unrealistic 15-minute tag`);
 if(r.tags.includes('10-minute') && r.totalMinutes>12) errors.push(`${r.title}: unrealistic 10-minute tag`);
 for(const s of r.cookSteps){ if(!s.text) errors.push(`${r.title}: empty cook step`); if(s.timerMinutes!==undefined && !(s.timerMinutes>0)) errors.push(`${r.title}: invalid timer`); }
}
if(errors.length){ console.error(errors.join('\n')); process.exit(1); }
console.log(`OK: ${recipes.length} recipes validated across 31 data chunks`);
