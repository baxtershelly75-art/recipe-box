import assert from 'node:assert/strict';
import { loadRecipes } from './load-recipes.mjs';
const recipes=loadRecipes();
assert.ok(recipes.length>=100,`expected at least 100 recipes in slice 04, got ${recipes.length}`);
const text=r=>[r.title,...r.aliases,r.description,...r.tags,...r.ingredients.map(i=>i.item)].join(' ').toLowerCase();
const needs={
  'quick (<=20 min)':r=>r.totalMinutes<=20,
  'crockpot':r=>text(r).includes('crockpot')||text(r).includes('slow cooker'),
  'one-pot/pan':r=>r.tags.some(t=>['one-pot','one-pan','sheet-pan'].includes(t)),
  'soup/stew':r=>r.tags.some(t=>['soup','stew'].includes(t)),
  'pasta/rice':r=>r.tags.some(t=>['pasta','rice'].includes(t)),
  'breakfast/eggs':r=>r.tags.includes('breakfast')||text(r).includes('egg'),
  'sandwich/wrap':r=>r.tags.some(t=>['sandwich','wrap'].includes(t))||text(r).includes('quesadilla'),
  'vegetable/side':r=>r.tags.some(t=>['vegetable','side'].includes(t)),
  'dessert/baking':r=>r.tags.some(t=>['dessert','baking','sweet'].includes(t)),
  'small batch':r=>r.tags.includes('small batch'),
  'food rescue/use it up':r=>r.tags.includes('use it up')||text(r).includes('leftover')||text(r).includes('stale bread')||text(r).includes('overripe'),
  'pantry':r=>r.tags.includes('pantry meal'),
  'comfort food':r=>r.tags.includes('comfort food')
};
for(const [name,fn] of Object.entries(needs)){
  const n=recipes.filter(fn).length;
  assert.ok(n>0,`missing coverage: ${name}`);
  console.log(`${name}: ${n}`);
}
const quick=recipes.filter(r=>r.totalMinutes<=20).length;
assert.ok(quick>=10,`expected >=10 genuinely quick recipes; got ${quick}`);
console.log(`OK: ${recipes.length} recipes with broad category coverage; ${quick} are <=20 minutes`);
