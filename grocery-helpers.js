// Grocery-list helpers shared by the Recipe Box UI and lightweight tests.
(() => {
  const DEPARTMENT_ORDER = [
    'Produce',
    'Meat & Seafood',
    'Dairy & Eggs',
    'Canned & Jarred',
    'Frozen',
    'Bread & Bakery',
    'Pantry & Spices',
    'Other',
  ];

  const patterns = {
    meat: [
      /\bchicken\b/i, /\bbeef\b/i, /\bturkey\b/i, /\bpork\b/i,
      /\bbacon\b/i, /\bham\b/i, /\bsausage\b/i, /\bmeatballs?\b/i,
      /\bsteak\b/i, /\bground (?:meat|beef|turkey|chicken|pork|chuck|sirloin)\b/i,
      /\btilapia\b/i, /\bfish\b/i, /\bsalmon\b/i, /\btuna\b/i, /\bshrimp\b/i,
    ],
    canned: [
      /\bcanned?\b/i, /\bjarred?\b/i, /\bcans?\s+(?:whole kernel\s+)?corn\b/i, /\bblack beans?\b/i,
      /\brefried beans?\b/i, /\bkidney beans?\b/i, /\bpinto beans?\b/i,
      /\bchickpeas?\b/i, /\bgarbanzo beans?\b/i, /\benchilada sauce\b/i,
      /\bmarinara\b/i, /\bpizza sauce\b/i, /\bspaghetti sauce\b/i,
      /\btomato (?:sauce|paste)\b/i, /\bgreen chiles?\b/i, /\brotel\b/i,
      /\bcream of (?:chicken|mushroom|celery) soup\b/i,
    ],
    dairy: [
      /\beggs?\b/i, /\bmilk\b/i, /\bcheese\b/i, /\bbutter\b/i,
      /\byogurt\b/i, /\bsour cream\b/i, /\bcream cheese\b/i,
      /\bheavy cream\b/i, /\bhalf[- ]and[- ]half\b/i, /\bcreamer\b/i,
    ],
    produce: [
      /\bonions?\b/i, /\bspinach\b/i, /\bbroccoli\b/i, /\bpeppers?\b/i,
      /\bcarrots?\b/i, /\bcelery\b/i, /\bpotatoes?\b/i, /\btomatoes?\b/i,
      /\blettuce\b/i, /\bcucumbers?\b/i, /\bavocados?\b/i, /\bbananas?\b/i,
      /\bapples?\b/i, /\blemons?\b/i, /\blimes?\b/i, /\bmushrooms?\b/i,
      /\bgarlic\b/i, /\bcorn\b/i, /\bpeas?\b/i, /\bgreen beans?\b/i,
      /\bcilantro\b/i, /\bparsley\b/i,
    ],
    bread: [
      /\btortillas?\b/i, /\bbread\b/i, /\brolls?\b/i, /\bbuns?\b/i,
      /\bpie crust\b/i, /\benglish muffins?\b/i, /\bbiscuits?\b/i,
      /\bpitas?\b/i, /\bwraps?\b/i,
    ],
    pantry: [
      /\bbroth\b/i, /\bstock\b/i, /\bbouillon\b/i, /\bsalt\b/i,
      /\bpepper\b/i, /\bcumin\b/i, /\bpaprika\b/i, /\bgarlic powder\b/i,
      /\bonion powder\b/i, /\bseasoning\b/i, /\bspices?\b/i, /\bflour\b/i,
      /\bsugar\b/i, /\brice\b/i, /\bpasta\b/i, /\bnoodles?\b/i,
      /\boil\b/i, /\bvinegar\b/i, /\bcornstarch\b/i, /\bbaking powder\b/i,
      /\bbaking soda\b/i, /\bsoy sauce\b/i, /\bmustard\b/i, /\bpeanut butter\b/i,
    ],
  };

  const matchesAny = (text, list) => list.some(pattern => pattern.test(text));

  function isZeroQuantityText(text = '') {
    return /^\s*0(?:[.,]0+)?(?:\s|$)/.test(String(text));
  }

  function departmentForText(text = '') {
    const value = String(text);

    // Explicit canned/jarred wording wins because those products live together in-store.
    if (matchesAny(value, patterns.canned)) return 'Canned & Jarred';

    // Broth and stock belong in pantry even when their flavor names a meat.
    if (/\b(?:broth|stock|bouillon)\b/i.test(value)) return 'Pantry & Spices';

    // Meat stays together, including frozen meatballs or other explicitly named meat.
    if (matchesAny(value, patterns.meat)) return 'Meat & Seafood';

    // "Frozen" wins over produce for frozen vegetables such as spinach and corn.
    if (/\bfrozen\b/i.test(value) || /\bice cream\b/i.test(value)) return 'Frozen';

    if (matchesAny(value, patterns.dairy)) return 'Dairy & Eggs';

    // Check bakery before produce so "corn tortillas" do not become produce.
    if (matchesAny(value, patterns.bread)) return 'Bread & Bakery';
    if (matchesAny(value, patterns.produce)) return 'Produce';
    if (matchesAny(value, patterns.pantry)) return 'Pantry & Spices';
    return 'Other';
  }

  function compareText(a, b) {
    const aDepartment = departmentForText(a);
    const bDepartment = departmentForText(b);
    const departmentDifference =
      DEPARTMENT_ORDER.indexOf(aDepartment) - DEPARTMENT_ORDER.indexOf(bDepartment);

    if (departmentDifference !== 0) return departmentDifference;
    return String(a).localeCompare(String(b), 'en-US', { sensitivity: 'base' });
  }

  function visibleItems(values = []) {
    return values
      .filter(item => item && typeof item.text === 'string' && item.text.trim())
      .filter(item => !isZeroQuantityText(item.text));
  }

  function groupItems(values = []) {
    const sorted = [...visibleItems(values)].sort((a, b) => compareText(a.text, b.text));

    return DEPARTMENT_ORDER
      .map(department => ({
        department,
        items: sorted.filter(item => departmentForText(item.text) === department),
      }))
      .filter(group => group.items.length > 0);
  }

  function buildShareText(values = []) {
    const unchecked = visibleItems(values).filter(item => !item.checked);
    const groups = groupItems(unchecked);
    const lines = ['Grocery List'];

    groups.forEach(group => {
      lines.push('', `${group.department}:`);
      group.items.forEach(item => lines.push(`☐ ${item.text}`));
    });

    return lines.join('\n');
  }

  globalThis.RecipeBoxGrocery = {
    DEPARTMENT_ORDER,
    isZeroQuantityText,
    departmentForText,
    compareText,
    visibleItems,
    groupItems,
    buildShareText,
  };
})();
