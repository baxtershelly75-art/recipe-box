// Display scaled recipe quantities as familiar kitchen fractions instead of decimals.
// Loaded after app.js so it replaces the base formatter used by recipe details and Cook With Me.
formatAmount = function (n) {
  if (!Number.isFinite(n)) return String(n);

  const whole = Math.floor(n + 1e-9);
  const frac = n - whole;

  const fractions = [
    [0, ''],
    [1 / 8, '⅛'],
    [1 / 6, '⅙'],
    [1 / 4, '¼'],
    [1 / 3, '⅓'],
    [3 / 8, '⅜'],
    [1 / 2, '½'],
    [5 / 8, '⅝'],
    [2 / 3, '⅔'],
    [3 / 4, '¾'],
    [5 / 6, '⅚'],
    [7 / 8, '⅞'],
    [1, '']
  ];

  let best = fractions[0];
  let bestDistance = Math.abs(frac - best[0]);
  for (const candidate of fractions.slice(1)) {
    const distance = Math.abs(frac - candidate[0]);
    if (distance < bestDistance) {
      best = candidate;
      bestDistance = distance;
    }
  }

  let displayWhole = whole;
  let symbol = best[1];
  if (best[0] === 1) {
    displayWhole += 1;
    symbol = '';
  }

  // Only snap values that are reasonably close to a familiar kitchen fraction.
  if (bestDistance <= 0.035) {
    return `${displayWhole || ''}${symbol}` || '0';
  }

  // Fall back to a tidy decimal only for genuinely unusual quantities.
  return String(Math.round(n * 100) / 100);
};
