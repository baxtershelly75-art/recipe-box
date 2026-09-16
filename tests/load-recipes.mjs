import fs from 'node:fs';

export const RECIPE_FILES = Array.from({ length: 59 }, (_, i) =>
  new URL(`../data/recipes-${String(i + 1).padStart(2, '0')}.json`, import.meta.url)
);

export function loadRecipes() {
  return RECIPE_FILES.flatMap(url => JSON.parse(fs.readFileSync(url, 'utf8')));
}
