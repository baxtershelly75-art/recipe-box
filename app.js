const state = {
  recipes: [], results: [], shown: 8, currentRecipe: null, scale: 1,
  groceryRecipeIds: new Set(),
  cookIndex: 0, lastQuery: 'Recipes', timer: null, timerRemaining: 0,
  timerOriginal: 0, timerRunning: false, timerPaused: false
};

const $ = sel => document.querySelector(sel);
const views = ['#homeView', '#resultsView', '#detailView', '#cookView'];
const browseTags = ['15-minute', 'very easy', 'cheap', 'crockpot', 'one-pot', 'comfort food', 'use it up', 'small batch', 'sweet', 'breakfast', 'dinner', 'family dinner', 'smoothie', 'flatbread', 'vegetable', 'pantry'];
const recipeDataFiles = Array.from({ length: 75 }, (_, i) => `./data/recipes-${String(i + 1).padStart(2, '0')}.json`);

try {
  const savedGroceryRecipeIds = JSON.parse(localStorage.getItem('recipeBoxGroceryRecipeIds') || '[]');
  if (Array.isArray(savedGroceryRecipeIds)) state.groceryRecipeIds = new Set(savedGroceryRecipeIds.filter(id => typeof id === 'string'));
} catch (_) {}

function showView(id) {
  views.forEach(v => $(v).classList.toggle('active', v === id));
  window.scrollTo({ top: 0, behavior: 'instant' });
  if (id === '#homeView') renderRecent();
}

function norm(s = '') {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function recipeSearchText(r) {
  return norm([
    r.title,
    ...(r.aliases || []),
    r.description,
    ...r.ingredients.map(i => i.item),
    ...(r.tags || []),
    r.effort,
    r.cost,
    ...(r.equipment || [])
  ].join(' '));
}

function scoreRecipe(r, query) {
  const q = norm(query);
  if (!q) return 1;
  const terms = q.split(' ').filter(Boolean);
  const hay = recipeSearchText(r);
  let score = 0;
  if (norm(r.title).includes(q)) score += 30;
  if ((r.aliases || []).some(a => norm(a).includes(q))) score += 24;
  for (const t of terms) {
    if (norm(r.title).includes(t)) score += 9;
    if ((r.tags || []).some(tag => norm(tag).includes(t))) score += 7;
    if (r.ingredients.some(i => norm(i.item).includes(t))) score += 6;
    if (hay.includes(t)) score += 2;
  }
  return score;
}

function searchRecipes(query) {
  const q = query.trim();
  state.lastQuery = q || 'All recipes';
  state.results = state.recipes
    .map(r => ({ r, score: scoreRecipe(r, q) }))
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score || a.r.title.localeCompare(b.r.title))
    .map(x => x.r);
  state.shown = 8;
  renderResults();
  showView('#resultsView');
}

function renderBrowse() {
  $('#browseChips').innerHTML = browseTags
    .map(tag => `<button class="chip" type="button" data-tag="${tag}">${tag}</button>`)
    .join('');
  $('#browseChips').querySelectorAll('button[data-tag]').forEach(b => {
    b.addEventListener('click', () => searchRecipes(b.dataset.tag));
  });
}

function recipeCard(r) {
  return `
    <article class="recipe-card">
      <h3>${r.title}</h3>
      <div class="recipe-meta">
        <span class="meta-pill">${r.totalMinutes} min</span>
        <span class="meta-pill">${r.effort}</span>
        <span class="meta-pill">${r.cost}</span>
      </div>
      <p>${r.description}</p>
      <div class="card-actions">
        <button class="primary-btn" type="button" data-open-id="${r.id}">OPEN RECIPE</button>
        <button class="secondary-btn icon-btn" type="button" data-favorite-id="${r.id}" aria-label="${isFavorite(r.id) ? 'Remove from favorites' : 'Add to favorites'}">${isFavorite(r.id) ? '★' : '☆'}</button>
        ${state.lastQuery === 'Favorites' ? `<label class="secondary-btn"><input type="checkbox" data-grocery-recipe-id="${r.id}" ${state.groceryRecipeIds.has(r.id) ? 'checked' : ''}> Grocery</label>` : ''}
      </div>
    </article>`;
}

function wireRecipeCards(container) {
  container.querySelectorAll('[data-open-id]').forEach(b => {
    b.addEventListener('click', () => openRecipe(b.dataset.openId));
  });
  container.querySelectorAll('[data-favorite-id]').forEach(b => {
    b.addEventListener('click', () => {
      toggleFavorite(b.dataset.favoriteId);
      if (container === $('#resultsGrid')) renderResults();
      else renderRecent();
    });
  });
  const updateGrocerySelectedButton = () => {
    const button = document.getElementById('groceryAddSelectedBtn');
    if (!button) return;
    button.disabled = state.groceryRecipeIds.size === 0;
    button.textContent = state.groceryRecipeIds.size
      ? `Add Selected Recipes (${state.groceryRecipeIds.size})`
      : 'Add Selected Recipes';
  };
  container.querySelectorAll('[data-grocery-recipe-id]').forEach(box => {
    box.closest('label')?.classList.toggle('active', box.checked);
    box.addEventListener('change', () => {
      if (box.checked) state.groceryRecipeIds.add(box.dataset.groceryRecipeId);
      else state.groceryRecipeIds.delete(box.dataset.groceryRecipeId);
      try { localStorage.setItem('recipeBoxGroceryRecipeIds', JSON.stringify([...state.groceryRecipeIds])); } catch (_) {}
      box.closest('label')?.classList.toggle('active', box.checked);
      updateGrocerySelectedButton();
    });
  });
  updateGrocerySelectedButton();
}

function renderResults() {
  $('#resultsTitle').textContent = state.lastQuery;
  $('#resultsCount').textContent = `${state.results.length} recipe${state.results.length === 1 ? '' : 's'} found`;
  const visible = state.results.slice(0, state.shown);
  $('#resultsGrid').innerHTML = visible.map(recipeCard).join('') || '<p class="empty">No exact match yet. Try an ingredient or a broader idea like “cheap,” “crockpot,” or “something sweet.”</p>';
  wireRecipeCards($('#resultsGrid'));
  $('#showMoreBtn').classList.toggle('hidden', state.shown >= state.results.length);
}

function formatAmount(n) {
  const rounded = Math.round(n * 100) / 100;
  const fractions = [[0.25, '¼'], [0.33, '⅓'], [0.5, '½'], [0.67, '⅔'], [0.75, '¾']];
  const whole = Math.floor(rounded);
  const frac = rounded - whole;
  const hit = fractions.find(([v]) => Math.abs(frac - v) < 0.03);
  if (hit) return `${whole || ''}${hit[1]}`;
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
}

function ingredientLine(i, scale = 1) {
  const unit = i.unit ? ` ${i.unit}` : '';
  return `${formatAmount(i.amount * scale)}${unit} ${i.item}${i.optional ? ' (optional)' : ''}`;
}

function getFavorites() {
  try { return JSON.parse(localStorage.getItem('recipeBoxFavorites') || '[]'); }
  catch { return []; }
}

function isFavorite(id) {
  return getFavorites().includes(id);
}

function toggleFavorite(id) {
  const f = getFavorites();
  const next = f.includes(id) ? f.filter(x => x !== id) : [...f, id];
  localStorage.setItem('recipeBoxFavorites', JSON.stringify(next));
  if (state.currentRecipe && state.currentRecipe.id === id && $('#detailView').classList.contains('active')) renderDetail();
}

function getRecent() {
  try { return JSON.parse(localStorage.getItem('recipeBoxRecent') || '[]'); }
  catch { return []; }
}

function addRecent(id) {
  const recent = getRecent();
  const next = [id, ...recent.filter(x => x !== id)].slice(0, 8);
  localStorage.setItem('recipeBoxRecent', JSON.stringify(next));
}

function renderRecent() {
  if (!state.recipes.length) return;
  const recipes = getRecent().map(id => state.recipes.find(r => r.id === id)).filter(Boolean);
  $('#recentGrid').innerHTML = recipes.length ? recipes.map(recipeCard).join('') : '<p class="empty">Recipes you open will show up here.</p>';
  wireRecipeCards($('#recentGrid'));
}

function openFavorites() {
  const favoriteIds = new Set(getFavorites());
  state.results = state.recipes.filter(r => favoriteIds.has(r.id));
  state.lastQuery = 'Favorites';
  state.shown = 8;
  renderResults();
  showView('#resultsView');
}

function openRecipe(id) {
  state.currentRecipe = state.recipes.find(r => r.id === id);
  if (!state.currentRecipe) return;
  state.scale = 1;
  state.cookIndex = 0;
  addRecent(id);
  renderDetail();
  showView('#detailView');
}

function renderDetail() {
  const r = state.currentRecipe;
  if (!r) return;
  const substitutions = (r.substitutions || []).map(s => `<li>${s}</li>`).join('');
  const steps = (r.steps || []).map((s, i) => `<li><strong>${i + 1}.</strong> ${s.text}</li>`).join('');
  $('#recipeDetail').innerHTML = `
    <div class="detail-title-row">
      <div>
        <p class="eyebrow">RECIPE</p>
        <h2>${r.title}</h2>
      </div>
      <button id="detailFavoriteBtn" class="secondary-btn icon-btn" type="button" aria-label="${isFavorite(r.id) ? 'Remove from favorites' : 'Add to favorites'}">${isFavorite(r.id) ? '★' : '☆'}</button>
    </div>
    <p class="detail-description">${r.description}</p>
    <div class="detail-meta">
      <span class="meta-pill">${r.servings} servings</span>
      <span class="meta-pill">${r.prepMinutes} min prep</span>
      <span class="meta-pill">${r.cookMinutes} min cook</span>
      <span class="meta-pill">${r.totalMinutes} min total</span>
      <span class="meta-pill">${r.effort}</span>
      <span class="meta-pill">${r.cost}</span>
    </div>

    <div class="scaler" aria-label="Recipe size">
      <strong>Recipe size:</strong>
      ${[0.5, 1, 1.5, 2].map(scale => `<button class="secondary-btn ${state.scale === scale ? 'active' : ''}" type="button" data-scale="${scale}">${scale === 0.5 ? '½×' : scale === 1 ? '1×' : scale === 1.5 ? '1½×' : '2×'}</button>`).join('')}
    </div>

    <section class="detail-section">
      <h3>Ingredients</h3>
      <ul class="ingredients">${r.ingredients.map(i => `<li>${ingredientLine(i, state.scale)}</li>`).join('')}</ul>
    </section>

    <section class="detail-section">
      <h3>Directions</h3>
      <ol class="steps">${steps}</ol>
    </section>

    ${substitutions ? `<section class="detail-section"><h3>Easy substitutions</h3><ul>${substitutions}</ul></section>` : ''}
    ${r.storage ? `<section class="detail-section"><h3>Storage</h3><p>${r.storage}</p></section>` : ''}

    <div class="card-actions">
      <button id="cookWithMeBtn" class="primary-btn" type="button">COOK WITH ME</button>
      <button id="printRecipeBtn" class="secondary-btn" type="button">PRINT</button>
    </div>`;

  $('#detailFavoriteBtn').addEventListener('click', () => toggleFavorite(r.id));
  $('#recipeDetail').querySelectorAll('[data-scale]').forEach(b => {
    b.addEventListener('click', () => {
      state.scale = Number(b.dataset.scale);
      renderDetail();
    });
  });
  $('#cookWithMeBtn').addEventListener('click', startCook);
  $('#printRecipeBtn').addEventListener('click', () => window.print());
}

function scaledCookStepText(step) {
  let text = step.text;
  const quantities = step.quantities || [];
  for (const q of quantities) {
    const ingredient = state.currentRecipe.ingredients[q.ingredientIndex];
    if (!ingredient) continue;
    const unit = ingredient.unit ? ` ${ingredient.unit}` : '';
    const amount = `${formatAmount(ingredient.amount * state.scale)}${unit}`;
    text = text.replaceAll(`{{${q.key}}}`, amount);
  }
  text = text.replace(/\{\{[^}]+\}\}/g, '').trim();

  // Explicit recipe formatting wins. This is the preferred format for new recipes.
  if (text.includes('\n') || step.layout === 'prose') return text;

  // Universal Cook With Me rule: short, scan-friendly lines instead of a wall of prose.
  // Keep recipe wording intact, but break sentences/actions onto separate lines.
  const sentences = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g)
    ?.map(s => s.trim())
    .filter(Boolean) || [text];

  if (sentences.length > 1) return sentences.join('\n\n');

  // A single long instruction still gets a visual break at common action joins.
  if (text.length > 90) {
    const breakWords = [' then ', ' and cook ', ' and bake ', ' and simmer ', ' and stir ', ' and serve ', ' and add '];
    for (const word of breakWords) {
      const i = text.toLowerCase().indexOf(word);
      if (i > 30) {
        const first = text.slice(0, i).trim().replace(/[;,]$/, '') + '.';
        const rest = text.slice(i + (word.startsWith(' and ') ? 5 : 1)).trim();
        return `${first}\n\n${rest.charAt(0).toUpperCase() + rest.slice(1)}`;
      }
    }
  }
  return text;
}
function clearTimerInterval() {
  if (state.timer) clearInterval(state.timer);
  state.timer = null;
  state.timerRunning = false;
}

function timerText(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function prepareTimer(minutes) {
  clearTimerInterval();
  state.timerOriginal = minutes * 60;
  state.timerRemaining = state.timerOriginal;
  state.timerPaused = false;
  $('#timerDisplay').textContent = timerText(state.timerRemaining);
  $('#timerRunning').classList.add('hidden');
  $('#timerDoneText').classList.add('hidden');
  $('#startTimerBtn').classList.remove('hidden');
  $('#startTimerBtn').textContent = `START ${minutes} MIN TIMER`;
  $('#pauseTimerBtn').textContent = 'PAUSE';
}

function renderCook() {
  const r = state.currentRecipe;
  const step = r.cookSteps[state.cookIndex];
  $('#cookRecipeTitle').textContent = r.title;
  $('#cookProgress').textContent = `STEP ${state.cookIndex + 1} OF ${r.cookSteps.length}`;
  $('#cookStep').textContent = scaledCookStepText(step);
  $('#cookBackBtn').disabled = state.cookIndex === 0;
  $('#cookNextBtn').textContent = state.cookIndex === r.cookSteps.length - 1 ? 'DONE' : 'DONE / NEXT';
  if (step.timerMinutes) {
    $('#timerPanel').classList.remove('hidden');
    prepareTimer(step.timerMinutes);
  } else {
    clearTimerInterval();
    $('#timerPanel').classList.add('hidden');
  }
}

function startCook() {
  state.cookIndex = 0;
  renderCook();
  showView('#cookView');
}

function runTimer() {
  clearTimerInterval();
  state.timerRunning = true;
  state.timerPaused = false;
  $('#pauseTimerBtn').textContent = 'PAUSE';
  $('#timerRunning').classList.remove('hidden');
  $('#startTimerBtn').classList.add('hidden');
  $('#timerDoneText').classList.add('hidden');
  $('#timerDisplay').textContent = timerText(state.timerRemaining);
  state.timer = setInterval(() => {
    state.timerRemaining = Math.max(0, state.timerRemaining - 1);
    $('#timerDisplay').textContent = timerText(state.timerRemaining);
    if (state.timerRemaining === 0) {
      clearTimerInterval();
      $('#timerDoneText').classList.remove('hidden');
    }
  }, 1000);
}

function togglePauseTimer() {
  if (state.timerRunning) {
    clearTimerInterval();
    state.timerPaused = true;
    $('#pauseTimerBtn').textContent = 'RESUME';
  } else if (state.timerPaused && state.timerRemaining > 0) {
    runTimer();
  }
}

function resetTimer() {
  clearTimerInterval();
  state.timerRemaining = state.timerOriginal;
  state.timerPaused = false;
  $('#timerDisplay').textContent = timerText(state.timerRemaining);
  $('#timerRunning').classList.add('hidden');
  $('#timerDoneText').classList.add('hidden');
  $('#startTimerBtn').classList.remove('hidden');
  $('#pauseTimerBtn').textContent = 'PAUSE';
}

async function loadRecipes() {
  try {
    const chunks = await Promise.all(recipeDataFiles.map(f => fetch(f).then(r => {
      if (!r.ok) throw new Error(`Could not load ${f}`);
      return r.json();
    })));
    state.recipes = chunks.flat();
    renderBrowse();
    renderRecent();
  } catch (err) {
    $('#browseChips').innerHTML = '<p class="empty">Recipe Box could not load its recipes. Refresh once while you are online.</p>';
    console.error(err);
  }
}

$('#searchBtn').addEventListener('click', () => searchRecipes($('#searchInput').value));
$('#searchInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') searchRecipes($('#searchInput').value);
});
$('#favoritesBtn').addEventListener('click', openFavorites);
$('#showMoreBtn').addEventListener('click', () => {
  state.shown += 8;
  renderResults();
});
document.querySelector('[data-action="home"]').addEventListener('click', () => showView('#homeView'));
document.querySelector('[data-action="back-results"]').addEventListener('click', () => showView('#resultsView'));
$('#exitCookBtn').addEventListener('click', () => {
  clearTimerInterval();
  showView('#detailView');
});
$('#cookBackBtn').addEventListener('click', () => {
  if (state.cookIndex > 0) {
    state.cookIndex--;
    renderCook();
  }
});
$('#cookNextBtn').addEventListener('click', () => {
  const r = state.currentRecipe;
  if (state.cookIndex < r.cookSteps.length - 1) {
    state.cookIndex++;
    renderCook();
  } else {
    clearTimerInterval();
    showView('#detailView');
  }
});
$('#startTimerBtn').addEventListener('click', runTimer);
$('#pauseTimerBtn').addEventListener('click', togglePauseTimer);
$('#addMinuteBtn').addEventListener('click', () => {
  state.timerRemaining += 60;
  $('#timerDisplay').textContent = timerText(state.timerRemaining);
});
$('#resetTimerBtn').addEventListener('click', resetTimer);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' });
      await registration.update();
    } catch (error) {
      console.warn('Recipe Box service worker update failed:', error);
    }
  });
}

loadRecipes();


// Grocery List — staged shell only. No recipe or storage integration yet.
(() => {
  const groceryBtn = document.getElementById('groceryBtn');
  const groceryView = document.getElementById('groceryView');
  const groceryBackBtn = document.getElementById('groceryBackBtn');
  const app = document.getElementById('app');
  if (!groceryBtn || !groceryView || !groceryBackBtn || !app) return;
  groceryBtn.addEventListener('click', () => {
    app.hidden = true;
    groceryView.hidden = false;
    const addSelectedBtn = document.getElementById('groceryAddSelectedBtn');
    if (addSelectedBtn) {
      addSelectedBtn.disabled = state.groceryRecipeIds.size === 0;
      addSelectedBtn.textContent = state.groceryRecipeIds.size
        ? `Add Selected Recipes (${state.groceryRecipeIds.size})`
        : 'Add Selected Recipes';
    }
  });
  groceryBackBtn.addEventListener('click', () => {
    groceryView.hidden = true;
    app.hidden = false;
  });
})();

// Manual grocery items — persisted locally on this device.
(() => {
  const input = document.getElementById('groceryManualInput');
  const addBtn = document.getElementById('groceryManualAddBtn');
  const clearBtn = document.getElementById('groceryClearBtn');
  const shareBtn = document.getElementById('groceryShareBtn');
  const items = document.getElementById('groceryItems');
  const grocery = globalThis.RecipeBoxGrocery;
  if (!input || !addBtn || !clearBtn || !shareBtn || !items || !grocery) return;

  const storageKey = 'recipeBoxManualGroceryItems';

  const readItems = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || '[]');
      if (!Array.isArray(saved)) return [];
      return saved.map(item => {
        if (typeof item === 'string' && item.trim()) return { text: item.trim(), checked: false };
        if (item && typeof item.text === 'string' && item.text.trim()) {
          return { text: item.text.trim(), checked: Boolean(item.checked) };
        }
        return null;
      }).filter(Boolean);
    } catch (_) {
      return [];
    }
  };

  const saveItems = (nextValues) => {
    try { localStorage.setItem(storageKey, JSON.stringify(nextValues)); } catch (_) {}
  };

  const render = (nextValues) => {
    items.textContent = '';
    const groups = grocery.groupItems(nextValues);

    if (!groups.length) {
      const empty = document.createElement('p');
      empty.textContent = 'No grocery items yet.';
      items.appendChild(empty);
      return;
    }

    groups.forEach(group => {
      const section = document.createElement('section');
      section.className = 'grocery-section';

      const heading = document.createElement('h3');
      heading.className = 'grocery-section-title';
      heading.textContent = group.department;

      const rows = document.createElement('div');
      rows.className = 'grocery-section-items';

      group.items.forEach(item => {
        const row = document.createElement('div');
        row.className = 'grocery-manual-item';

        const label = document.createElement('label');
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = item.checked;
        checkbox.setAttribute('aria-label', `Mark ${item.text} as handled`);

        const text = document.createElement('span');
        text.textContent = item.text;
        text.style.textDecoration = item.checked ? 'line-through' : '';

        checkbox.addEventListener('change', () => {
          item.checked = checkbox.checked;
          text.style.textDecoration = checkbox.checked ? 'line-through' : '';
          saveItems(nextValues);
        });

        label.append(checkbox, text);
        row.appendChild(label);
        rows.appendChild(row);
      });

      section.append(heading, rows);
      items.appendChild(section);
    });
  };

  // Clean out old generated zero-quantity lines the next time the list loads.
  let values = grocery.visibleItems(readItems());
  saveItems(values);
  render(values);

  const addItem = () => {
    const value = input.value.trim();
    if (!value || grocery.isZeroQuantityText(value)) return;
    values.push({ text: value, checked: false });
    saveItems(values);
    render(values);
    input.value = '';
    input.focus();
  };

  addBtn.addEventListener('click', addItem);

  clearBtn.addEventListener('click', () => {
    if (!values.length) return;
    if (!window.confirm('Clear everything from your grocery list?')) return;
    values = [];
    saveItems(values);
    render(values);
  });

  shareBtn.addEventListener('click', async () => {
    const unchecked = grocery.visibleItems(values).filter(item => !item.checked);
    if (!unchecked.length) {
      window.alert('There are no unchecked grocery items to share.');
      return;
    }

    const shareText = grocery.buildShareText(unchecked);
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Grocery List', text: shareText });
      } catch (error) {
        if (error && error.name !== 'AbortError') window.alert('Sharing did not work on this device.');
      }
      return;
    }

    try {
      await navigator.clipboard.writeText(shareText);
      window.alert('Grocery list copied to your clipboard.');
    } catch (_) {
      window.alert('Sharing is not available in this browser.');
    }
  });

  const addSelectedBtn = document.getElementById('groceryAddSelectedBtn');
  if (addSelectedBtn) {
    addSelectedBtn.addEventListener('click', () => {
      const selectedRecipes = state.recipes.filter(recipe => state.groceryRecipeIds.has(recipe.id));
      const combined = new Map();

      selectedRecipes.forEach(recipe => {
        recipe.ingredients.forEach(ingredient => {
          const amount = Number(ingredient.amount);
          if (Number.isFinite(amount) && amount === 0) return;

          const rawUnit = String(ingredient.unit || '').trim();
          const item = String(ingredient.item || '').trim();
          const optional = Boolean(ingredient.optional);
          const unitAliases = {
            cups: 'cup', tablespoons: 'tbsp', tablespoon: 'tbsp',
            teaspoons: 'tsp', teaspoon: 'tsp', cans: 'can',
            ounces: 'oz', ounce: 'oz', pounds: 'lb', pound: 'lb'
          };
          const unitKey = unitAliases[norm(rawUnit)] || norm(rawUnit);
          const key = [norm(item), unitKey, optional ? 'optional' : 'required'].join('|');
          const amountValue = Number.isFinite(amount) ? amount : 0;
          const existing = combined.get(key);

          if (existing) existing.amount += amountValue;
          else combined.set(key, { amount: amountValue, unit: rawUnit, unitKey, item, optional });
        });
      });

      const existingTexts = new Set(values.map(item => norm(item.text)));
      let addedCount = 0;

      combined.forEach(ingredient => {
        if (ingredient.amount === 0) return;

        const pluralUnits = { cup: 'cups', can: 'cans', oz: 'oz', lb: 'lb', tbsp: 'tbsp', tsp: 'tsp' };
        if (ingredient.unitKey && pluralUnits[ingredient.unitKey]) {
          ingredient.unit = ingredient.amount === 1 ? ingredient.unitKey : pluralUnits[ingredient.unitKey];
        }

        const text = ingredientLine(ingredient);
        if (grocery.isZeroQuantityText(text)) return;

        if (!existingTexts.has(norm(text))) {
          values.push({ text, checked: false });
          existingTexts.add(norm(text));
          addedCount += 1;
        }
      });

      saveItems(values);
      render(values);

      const message = document.getElementById('grocerySelectionMessage');
      if (message) {
        message.textContent = addedCount
          ? `Added ${addedCount} grocery item${addedCount === 1 ? '' : 's'} from ${selectedRecipes.length} selected recipe${selectedRecipes.length === 1 ? '' : 's'}.`
          : 'Those selected recipe ingredients are already on your grocery list.';
      }
    });
  }

  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') addItem();
  });
})();
