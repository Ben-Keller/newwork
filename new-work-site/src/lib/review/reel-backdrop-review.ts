import styles from './reel-backdrop-review.css?inline';

const OPTIONS = [
  { id: 'projection', name: 'Projection', description: 'Charcoal, soft projector light, and a quiet cinema surround.' },
  { id: 'grid', name: 'Grid', description: 'A sage cutting mat with fine rules and registration marks.' },
  { id: 'film', name: 'Film', description: 'Dark film stock with perforated edges and warm ivory details.' },
  { id: 'signal', name: 'Signal', description: 'Acid yellow, oversized black geometry, and a graphic poster feel.' },
  { id: 'paper', name: 'Paper', description: 'Warm paper, restrained crop marks, and a lightly lifted screen.' },
] as const;
type Option = typeof OPTIONS[number]['id'] | 'original';

/** Local-only art direction. Changes decoration without touching the player. */
export function mountReelBackdropReview(reel: HTMLElement, signal: AbortSignal): void {
  // Inline import keeps Astro from hoisting these temporary styles into every
  // homepage. Mount and remove them alongside the comparison controls.
  const stylesheet = document.createElement('style');
  stylesheet.textContent = styles;
  document.head.append(stylesheet);
  const requested = new URLSearchParams(location.search).get('reel-backdrop');
  let selected: Option = requested === 'original' ? 'original'
    : OPTIONS.find(option => option.id === requested)?.id ?? 'projection';
  let jumpFrame = 0;
  let jumpTimer = 0;
  let userInteracted = false;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');

  const art = document.createElement('div');
  art.className = 'reel-study';
  art.setAttribute('aria-hidden', 'true');
  art.innerHTML = `
    <div class="reel-study__motif"></div>
    <div class="reel-study__rail reel-study__rail--top"><span>New Work Agency</span><span>Showreel</span></div>
    <div class="reel-study__side reel-study__side--left">Film + Photo</div>
    <div class="reel-study__side reel-study__side--right">In motion</div>
    <div class="reel-study__rail reel-study__rail--bottom"><span>Selected motion</span><span>NW.</span></div>`;
  reel.prepend(art);

  const panel = document.createElement('aside');
  panel.className = 'reel-backdrop-review';
  panel.dataset.reelBackdropReview = '';
  panel.setAttribute('aria-label', 'Reel backdrop comparison');
  panel.innerHTML = `
    <div class="reel-backdrop-review__heading">
      <span>Reel / Backdrop</span>
      <p data-reel-description aria-live="polite"></p>
      <button type="button" data-reel-jump>View reel ↗</button>
      <button type="button" data-reel-collapse aria-expanded="true" aria-label="Minimize backdrop controls">−</button>
    </div>
    <div class="reel-backdrop-review__options" role="group" aria-label="Background options">
      ${OPTIONS.map((option, index) => `<button type="button" data-reel-option="${option.id}" aria-pressed="false"><span aria-hidden="true" class="reel-backdrop-review__swatch reel-backdrop-review__swatch--${option.id}"></span><span><small>0${index + 1}</small>${option.name}</span></button>`).join('')}
      <button type="button" data-reel-option="original" aria-pressed="false"><span><small>Compare</small>Original</span></button>
    </div>`;
  document.body.append(panel);

  const sync = () => {
    if (selected === 'original') delete reel.dataset.reelBackdrop;
    else reel.dataset.reelBackdrop = selected;
    art.hidden = selected === 'original';
    panel.querySelectorAll<HTMLButtonElement>('[data-reel-option]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.reelOption === selected));
    });
    panel.querySelector('[data-reel-description]')!.textContent = selected === 'original'
      ? 'The current oversized wordmark backdrop.'
      : OPTIONS.find(option => option.id === selected)!.description;
  };

  const cancelJump = () => {
    cancelAnimationFrame(jumpFrame);
    clearTimeout(jumpTimer);
    jumpFrame = jumpTimer = 0;
  };
  const jumpToReel = (initial = false) => {
    cancelJump();
    const page = document.querySelector<HTMLElement>('[data-logo-work-page]');
    const started = performance.now();
    const ready = () => {
      if (signal.aborted || (initial && userInteracted) || performance.now() - started > 5000) return;
      if (page && page.dataset.logoPageReady !== 'true') {
        jumpFrame = requestAnimationFrame(ready); return;
      }
      // Use the existing splash handoff, then wait for its gallery scroll.
      if (page?.dataset.handoff !== 'true') window.dispatchEvent(new Event('new-work:work-navigation'));
      jumpTimer = window.setTimeout(() => {
        if (signal.aborted || (initial && userInteracted)) return;
        const header = document.querySelector('.site-header')?.getBoundingClientRect().height ?? 80;
        scrollTo({
          top: Math.max(0, reel.getBoundingClientRect().top + scrollY - header - 24),
          behavior: initial || reduced.matches ? 'instant' : 'smooth',
        });
      }, 250);
    };
    jumpFrame = requestAnimationFrame(ready);
  };

  panel.addEventListener('click', event => {
    const target = event.target instanceof Element ? event.target.closest<HTMLButtonElement>('button') : null;
    const option = target?.dataset.reelOption;
    if (option === 'original' || OPTIONS.some(item => item.id === option)) {
      selected = option as Option;
      const url = new URL(location.href);
      url.searchParams.set('reel-backdrop', selected);
      history.replaceState(history.state, '', url);
      sync();
    } else if (target?.hasAttribute('data-reel-jump')) jumpToReel();
    else if (target?.hasAttribute('data-reel-collapse')) {
      const collapsed = panel.toggleAttribute('data-collapsed');
      target.setAttribute('aria-expanded', String(!collapsed));
      target.setAttribute('aria-label', collapsed ? 'Expand backdrop controls' : 'Minimize backdrop controls');
      target.textContent = collapsed ? '+' : '−';
    }
  }, { signal });
  panel.addEventListener('keydown', event => event.stopPropagation(), { signal });
  panel.addEventListener('keyup', event => event.stopPropagation(), { signal });
  for (const event of ['wheel', 'touchstart', 'pointerdown', 'keydown']) {
    window.addEventListener(event, () => { userInteracted = true; cancelJump(); }, { passive: true, signal });
  }
  signal.addEventListener('abort', () => {
    cancelJump(); panel.remove(); art.remove(); stylesheet.remove(); delete reel.dataset.reelBackdrop;
  }, { once: true });
  sync();
  jumpToReel(true);
}
