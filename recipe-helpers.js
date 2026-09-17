// Small runtime helpers for recipe content quirks found during live testing.

const brownSugarDrizzlePattern = /brown[-\s]sugar[^.]*drizzle|drizzle[^.]*brown[-\s]sugar/i;

function tidyDirectionNumbers() {
  document.querySelectorAll('#recipeDetail ol.steps > li').forEach(li => {
    const first = li.firstElementChild;
    if (first && first.tagName === 'STRONG' && /^\d+\.$/.test(first.textContent.trim())) {
      first.remove();
      if (li.firstChild && li.firstChild.nodeType === Node.TEXT_NODE) {
        li.firstChild.textContent = li.firstChild.textContent.replace(/^\s+/, '');
      }
    }
  });
}

function addBrownSugarDrizzleHelp() {
  const detail = document.querySelector('#recipeDetail');
  if (!detail || !brownSugarDrizzlePattern.test(detail.textContent || '')) return;
  if (detail.querySelector('[data-brown-sugar-drizzle-help]')) return;

  const section = document.createElement('section');
  section.className = 'detail-section';
  section.dataset.brownSugarDrizzleHelp = 'true';
  section.innerHTML = `
    <h3>How to make the brown-sugar drizzle</h3>
    <p style="line-height:1.55;margin-bottom:0;">Use the brown sugar, butter, and milk or cream listed in the recipe. Melt the butter in a small saucepan over medium-low heat. Stir in the brown sugar and keep stirring until it looks glossy and begins to dissolve. Stir in the milk or cream a little at a time, then cook for 1–2 minutes, stirring, until the sauce is smooth and pourable. Take it off the heat and drizzle it over the warm bread pudding.</p>`;

  const storage = [...detail.querySelectorAll('.detail-section')]
    .find(s => s.querySelector('h3')?.textContent.trim().toLowerCase() === 'storage');
  const actions = detail.querySelector('.card-actions');
  detail.insertBefore(section, storage || actions || null);
}

function updateCookDrizzleHelp() {
  const step = document.querySelector('#cookStep');
  const panel = document.querySelector('.cook-panel');
  if (!step || !panel) return;

  let help = document.querySelector('#cookDrizzleHelp');
  const needsHelp = brownSugarDrizzlePattern.test(step.textContent || '');

  if (!needsHelp) {
    if (help) help.remove();
    return;
  }

  if (!help) {
    help = document.createElement('div');
    help.id = 'cookDrizzleHelp';
    help.style.cssText = 'margin:0 0 20px;padding:16px 18px;border:2px solid #c8a776;border-radius:16px;background:#f8e8c9;line-height:1.5;font-weight:800;';
    const timerPanel = document.querySelector('#timerPanel');
    panel.insertBefore(help, timerPanel || document.querySelector('.cook-controls'));
  }

  help.innerHTML = '<strong>Brown-sugar drizzle:</strong> Melt the listed butter over medium-low heat. Stir in the listed brown sugar until glossy, then stir in the listed milk or cream. Cook 1–2 minutes, stirring, until smooth and pourable. Remove from the heat and drizzle over the warm bread pudding.';
}

function applyRecipeHelpers() {
  tidyDirectionNumbers();
  addBrownSugarDrizzleHelp();
  updateCookDrizzleHelp();
}

const detailObserver = new MutationObserver(applyRecipeHelpers);
const detail = document.querySelector('#recipeDetail');
if (detail) detailObserver.observe(detail, { childList: true, subtree: true });

const cookStep = document.querySelector('#cookStep');
if (cookStep) new MutationObserver(updateCookDrizzleHelp).observe(cookStep, { childList: true, subtree: true, characterData: true });

applyRecipeHelpers();
