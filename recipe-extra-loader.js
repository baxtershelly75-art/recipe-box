// Load recipe additions kept outside the original 75 launch chunks.
(async function loadExtraRecipes() {
  try {
    const response = await fetch('./data/recipes-76.json');
    if (!response.ok) throw new Error('Could not load recipes-76.json');
    const extras = await response.json();

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
