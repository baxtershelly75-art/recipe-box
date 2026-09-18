// Load recipe additions kept outside the original 75 launch chunks.
(async function loadExtraRecipes() {
  try {
    const files = ['./data/recipes-76.json', './data/recipes-77.json', './data/recipes-78.json', './data/recipes-79.json', './data/recipes-80.json', './data/recipes-81.json', './data/recipes-82.json', './data/recipes-83.json'];
    const responses = await Promise.all(files.map(path => fetch(path, path.includes('recipes-82.json') || path.includes('recipes-83.json') ? { cache: 'no-store' } : undefined)));
    for (let i = 0; i < responses.length; i += 1) {
      if (!responses[i].ok) throw new Error(`Could not load ${files[i]}`);
    }
    const groups = await Promise.all(responses.map(response => response.json()));
    const extras = groups.flat();

    const attachWhenReady = () => {
      if (typeof state === 'undefined' || !Array.isArray(state.recipes) || state.recipes.length === 0) {
        setTimeout(attachWhenReady, 50);
        return;
      }

      const existing = new Set(state.recipes.map(r => r.id));
      for (const recipe of extras) {
        if (!existing.has(recipe.id)) state.recipes.push(recipe);
      }

      if (typeof renderRecent === 'function' && document.querySelector('#homeView')?.classList.contains('active')) {
        renderRecent();
      }
    };

    attachWhenReady();
  } catch (err) {
    console.error('Extra Recipe Box recipes could not be loaded.', err);
  }
})();
