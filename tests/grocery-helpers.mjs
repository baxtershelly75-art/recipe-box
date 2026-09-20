import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../grocery-helpers.js', import.meta.url), 'utf8');
const context = {};
vm.createContext(context);
vm.runInContext(source, context);

const grocery = context.RecipeBoxGrocery;
assert.ok(grocery, 'expected grocery helpers to load');

assert.equal(grocery.isZeroQuantityText('0 cups diced onion'), true);
assert.equal(grocery.isZeroQuantityText('0 tsp salt'), true);
assert.equal(grocery.isZeroQuantityText('0 tsp black pepper'), true);
assert.equal(grocery.isZeroQuantityText('0.5 cup milk'), false);
assert.equal(grocery.isZeroQuantityText('½ cup frozen corn'), false);

assert.equal(grocery.departmentForText('1 tsp cumin'), 'Pantry & Spices');
assert.equal(grocery.departmentForText('4 cups chicken broth'), 'Pantry & Spices');
assert.equal(grocery.departmentForText('4 oz cream cheese'), 'Dairy & Eggs');
assert.equal(grocery.departmentForText('6 corn or flour tortillas, cut into strips'), 'Bread & Bakery');
assert.equal(grocery.departmentForText('1½ cups canned black beans, drained and rinsed'), 'Canned & Jarred');
assert.equal(grocery.departmentForText('1 can corn, drained'), 'Canned & Jarred');
assert.equal(grocery.departmentForText('1½ cups enchilada sauce'), 'Canned & Jarred');
assert.equal(grocery.departmentForText('½ cup frozen corn'), 'Frozen');
assert.equal(grocery.departmentForText('5 oz frozen chopped spinach'), 'Frozen');
assert.equal(grocery.departmentForText('1 diced onion'), 'Produce');
assert.equal(grocery.departmentForText('1 lb ground turkey'), 'Meat & Seafood');
assert.equal(grocery.departmentForText('8 frozen meatballs'), 'Meat & Seafood');

const groups = grocery.groupItems([
  { text: '1 tsp cumin', checked: false },
  { text: '1½ cups canned black beans', checked: false },
  { text: '1 diced onion', checked: false },
  { text: '4 oz cream cheese', checked: false },
  { text: '1 lb ground turkey', checked: false },
  { text: '0 tsp salt', checked: false },
]);

assert.equal(
  Array.from(groups, group => group.department).join('|'),
  'Produce|Meat & Seafood|Dairy & Eggs|Canned & Jarred|Pantry & Spices',
);
assert.equal(
  Array.from(groups).flatMap(group => Array.from(group.items, item => item.text)).includes('0 tsp salt'),
  false,
);

const shareText = grocery.buildShareText([
  { text: '1 diced onion', checked: false },
  { text: '1 lb ground turkey', checked: true },
  { text: '1½ cups enchilada sauce', checked: false },
  { text: '0 tsp black pepper', checked: false },
]);

assert.match(shareText, /Produce:\n☐ 1 diced onion/);
assert.match(shareText, /Canned & Jarred:\n☐ 1½ cups enchilada sauce/);
assert.doesNotMatch(shareText, /ground turkey/);
assert.doesNotMatch(shareText, /0 tsp black pepper/);

console.log('OK: grocery department grouping, sharing, and zero-quantity filtering');
