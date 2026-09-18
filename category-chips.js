// Add expansion categories without disturbing the core browse list.
(() => {
  const categories = ['potluck', 'leafy salad', 'deli picnic salad'];
  const attach = () => {
    const shell = document.querySelector('#browseChips');
    if (!shell || typeof searchRecipes !== 'function') return setTimeout(attach, 50);
    for (const tag of categories) {
      if (shell.querySelector(`[data-tag="${tag}"]`)) continue;
      const button = document.createElement('button');
      button.className = 'chip';
      button.type = 'button';
      button.dataset.tag = tag;
      button.textContent = tag === 'leafy salad' ? 'leafy salads' : tag === 'deli picnic salad' ? 'deli & picnic salads' : 'potluck';
      button.addEventListener('click', () => searchRecipes(tag));
      shell.appendChild(button);
    }
  };
  attach();
})();
