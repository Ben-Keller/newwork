import './board-motion-review.css';

type Geometry = {
  progress: number; dockX: number; dockY: number; targetX: number; targetY: number;
  travelled: number; reduced: boolean;
};
export type BoardMotionReview = {
  position(geometry: Geometry): { x: number; y: number; opacity: number };
};
type Option = 'handoff' | 'edge' | 'track';
const OPTIONS: { id: Option; name: string; description: string }[] = [
  { id: 'handoff', name: 'Handoff', description: 'Fades away beside the logo, then appears in its gallery position. Quiet, with no visible travel.' },
  { id: 'edge', name: 'Edge', description: 'Leaves the hero, then slides a short distance in from the right. A crisp, deliberate arrival.' },
  { id: 'track', name: 'Track', description: 'Stays aligned to the right edge and travels on one vertical track. Continuous, with no diagonal drift.' },
];
const clamp = (value: number) => Math.min(1, Math.max(0, value));
const smooth = (value: number) => { const p = clamp(value); return p * p * p * (p * (p * 6 - 15) + 10); };

/** Local-only motion study. Nothing is persisted to the CMS or the normal page. */
export function mountBoardMotionReview({ board, page, gallery, signal, requestUpdate }: {
  board: HTMLElement; page: HTMLElement; gallery: HTMLElement; signal: AbortSignal; requestUpdate: () => void;
}): BoardMotionReview {
  const requested = new URLSearchParams(location.search).get('board-motion');
  let selected: Option = OPTIONS.find(option => option.id === requested)?.id ?? 'handoff';
  let replayFrame = 0;
  let replayTimer = 0;
  let scrolling = false;
  const fine = matchMedia('(min-width: 1000px) and (hover: hover) and (pointer: fine)');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const panel = document.createElement('aside');
  panel.className = 'board-motion-review';
  panel.dataset.boardMotionReview = '';
  panel.setAttribute('aria-label', 'Train board motion comparison');
  panel.innerHTML = `
    <div class="board-motion-review__heading">
      <span>Train board / motion</span>
      <button type="button" data-review-collapse aria-expanded="true" aria-label="Minimize motion controls">−</button>
    </div>
    <div data-review-body>
      <div class="board-motion-review__options" role="group" aria-label="Motion options">
        ${OPTIONS.map((option, index) => `<button type="button" data-board-option="${option.id}" aria-pressed="false"><span>0${index + 1}</span>${option.name}</button>`).join('')}
      </div>
      <p data-review-description aria-live="polite"></p>
      <button class="board-motion-review__replay" type="button" data-review-replay>Replay transition <span aria-hidden="true">↗</span></button>
      <p class="board-motion-review__hint" data-review-hint></p>
    </div>`;
  document.body.append(panel);
  const replayButton = panel.querySelector<HTMLButtonElement>('[data-review-replay]')!;
  const hint = panel.querySelector<HTMLElement>('[data-review-hint]')!;
  const stopReplay = () => {
    cancelAnimationFrame(replayFrame); clearTimeout(replayTimer);
    replayFrame = replayTimer = 0;
    delete panel.dataset.replaying;
    if (scrolling) {
      scrolling = false;
      scrollTo({ top: scrollY, behavior: 'instant' });
    }
  };
  const sync = () => {
    board.dataset.motionOption = selected;
    panel.querySelectorAll<HTMLButtonElement>('[data-board-option]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.boardOption === selected));
    });
    panel.querySelector('[data-review-description]')!.textContent = OPTIONS.find(option => option.id === selected)!.description;
    replayButton.disabled = !fine.matches;
    hint.textContent = !fine.matches ? 'Widen the window to compare desktop placement.'
      : reduced.matches ? 'Reduced motion is on. Positions change without animation.' : 'Scroll either way to compare. Drag or wheel to stop replay.';
    requestUpdate();
  };
  const replay = () => {
    stopReplay();
    if (!fine.matches) return;
    panel.dataset.replaying = 'true';
    if (page.dataset.handoff !== 'true') window.dispatchEvent(new Event('new-work:work-navigation'));
    const ready = () => {
      if (signal.aborted) return;
      const intro = page.querySelector<HTMLElement>('[data-logo-intro]');
      if (intro?.dataset.titleMotion !== 'settled' || page.dataset.handoff !== 'true') {
        replayFrame = requestAnimationFrame(ready); return;
      }
      // Let the existing gallery-navigation callback finish before rewinding.
      replayTimer = window.setTimeout(() => {
        scrollTo({ top: 0, behavior: 'instant' }); requestUpdate();
        replayTimer = window.setTimeout(() => {
          const top = gallery.getBoundingClientRect().top + scrollY;
          const start = Math.min(innerHeight * .82, top - 64);
          const end = Math.min(innerHeight * .4, start - 120);
          const destination = Math.max(0, top - end + 40);
          if (reduced.matches) { scrollTo({ top: destination, behavior: 'instant' }); stopReplay(); return; }
          // Native scrolling emits one scrollend. A frame-by-frame sequence
          // of instant scrolls floods Safari's history restoration updates.
          scrolling = true;
          scrollTo({ top: destination, behavior: 'smooth' });
          replayTimer = window.setTimeout(stopReplay, 1800);
        }, 650);
      }, 100);
    };
    replayFrame = requestAnimationFrame(ready);
  };
  panel.addEventListener('click', event => {
    const target = event.target instanceof Element ? event.target.closest<HTMLButtonElement>('button') : null;
    const option = OPTIONS.find(option => option.id === target?.dataset.boardOption);
    if (option) {
      selected = option.id;
      const url = new URL(location.href); url.searchParams.set('board-motion', selected);
      history.replaceState(history.state, '', url);
      sync(); replay();
    } else if (target?.hasAttribute('data-review-replay')) replay();
    else if (target?.hasAttribute('data-review-collapse')) {
      const collapsed = panel.toggleAttribute('data-collapsed');
      target.setAttribute('aria-expanded', String(!collapsed));
      target.setAttribute('aria-label', collapsed ? 'Expand motion controls' : 'Minimize motion controls');
      target.textContent = collapsed ? '+' : '−';
    }
  }, { signal });
  // These controls own their keyboard gestures, including when over the splash.
  panel.addEventListener('keydown', event => event.stopPropagation(), { signal });
  panel.addEventListener('keyup', event => event.stopPropagation(), { signal });
  for (const event of ['wheel', 'touchstart', 'pointerdown']) {
    window.addEventListener(event, stopReplay, { passive: true, signal });
  }
  window.addEventListener('keydown', stopReplay, { signal });
  window.addEventListener('resize', stopReplay, { signal });
  window.addEventListener('scrollend', () => { if (scrolling) stopReplay(); }, { signal });
  document.addEventListener('visibilitychange', () => { if (document.hidden) stopReplay(); }, { signal });
  fine.addEventListener('change', () => { stopReplay(); sync(); }, { signal });
  reduced.addEventListener('change', () => { stopReplay(); sync(); }, { signal });
  signal.addEventListener('abort', () => { stopReplay(); panel.remove(); delete board.dataset.motionOption; }, { once: true });
  sync();
  return {
    position({ progress, dockX, dockY, targetX, targetY, travelled, reduced }) {
      if (reduced) return progress >= .5 ? { x: targetX, y: targetY, opacity: 1 } : { x: dockX, y: dockY, opacity: 1 };
      if (selected === 'track') {
        const departureY = dockY + travelled;
        return { x: targetX, y: departureY + (targetY - departureY) * smooth(progress), opacity: 1 };
      }
      // Move only while completely invisible; never drag a dark board across
      // the pictures. Smooth opacity remains reversible with the scroll.
      if (progress < .4) return { x: dockX, y: dockY, opacity: 1 - smooth(progress / .3) };
      const arrival = smooth((progress - .45) / .5);
      return {
        x: targetX + (selected === 'edge' ? 24 * (1 - arrival) : 0),
        y: targetY, opacity: arrival,
      };
    },
  };
}
