/* v8 ignore file -- DOM/GSAP effects are exercised by the browser suite. */
import type { MotionCleanup, MotionEnvironment } from './types';
import {
  COLUMN_SCROLL_RESPONSES,
  COMPACT_COLUMN_SCROLL_RESPONSES,
  columnLagOffset,
  filterColumnScroll,
} from './column-filter';
import {
  MOTION_DURATION,
  MOTION_EASE,
  MOTION_LIMIT,
  MOTION_PHYSICS,
  parseMotionValue,
} from './tokens';
import { ScrollTrigger, SplitText, gsap } from './vendor';

const SCROLL_LETTER_START_VIEWPORT = 0.92;
const SCROLL_LETTER_END_VIEWPORT = 0.38;
const SCROLL_LETTER_DISTANCE_SCALE = 0.8;

const selectAll = <ElementType extends Element>(root: ParentNode, selector: string): ElementType[] =>
  Array.from(root.querySelectorAll<ElementType>(selector));

const revealVars = (treatment: string): gsap.TweenVars => {
  if (treatment === 'clip') {
    return { autoAlpha: 0, clipPath: 'inset(8% 0 0 0)' };
  }
  if (treatment === 'fade') return { autoAlpha: 0 };
  return { autoAlpha: 0, y: '0.35em' };
};

const initializeReveals = (environment: MotionEnvironment): MotionCleanup => {
  const elements = selectAll<HTMLElement>(environment.root, '[data-motion-reveal]');
  const cleanups: MotionCleanup[] = [];
  const pendingGalleryReveals = new Map<HTMLElement, gsap.core.Tween>();
  if (environment.reducedMotion) {
    elements.forEach((element) => {
      element.dataset.motionReady = 'static';
    });
    return () => undefined;
  }

  elements.forEach((element) => {
    if (element.hasAttribute('data-motion-split')) return;
    const treatment = element.dataset.motionReveal || 'up';
    const delay = parseMotionValue(element.dataset.motionDelay, 0, 0, MOTION_LIMIT.revealDelay);
    const isGalleryReveal = Boolean(element.closest('[data-work-gallery]'));
    const clearProps = treatment === 'clip'
      ? 'opacity,visibility,clipPath'
      : treatment === 'fade'
        ? 'opacity,visibility'
        : 'opacity,visibility,transform,clipPath';
    element.dataset.motionReady = 'animated';
    const animation = {
      ...revealVars(treatment),
      delay,
      duration: MOTION_DURATION.reveal,
      ease: MOTION_EASE.customOut,
      clearProps,
    };

    if (isGalleryReveal) {
      const tween = gsap.from(element, {
        ...animation,
        paused: true,
      });
      pendingGalleryReveals.set(element, tween);
      cleanups.push(() => { tween.kill(); });
      return;
    }

    const tween = gsap.from(element, {
      ...animation,
      scrollTrigger: {
        trigger: element,
        start: isGalleryReveal ? 'top bottom' : 'top 88%',
        once: true,
      },
    });
    cleanups.push(() => { tween.kill(); });
  });

  if (pendingGalleryReveals.size) {
    const gallery = environment.root.querySelector<HTMLElement>('[data-work-gallery]');
    let refreshFrame = 0;
    let monitorUntil = 0;

    const revealPartiallyVisibleCards = (time: number): void => {
      refreshFrame = 0;
      pendingGalleryReveals.forEach((tween, element) => {
        if (!element.isConnected) {
          pendingGalleryReveals.delete(element);
          return;
        }
        const bounds = element.getBoundingClientRect();
        const intersectsViewport = (
          bounds.width > 0
          && bounds.height > 0
          && bounds.bottom > 0
          && bounds.top < window.innerHeight
          && bounds.right > 0
          && bounds.left < window.innerWidth
        );
        if (!intersectsViewport) return;
        pendingGalleryReveals.delete(element);
        tween.play();
      });

      if (pendingGalleryReveals.size && time < monitorUntil) {
        refreshFrame = window.requestAnimationFrame(revealPartiallyVisibleCards);
      }
    };

    const requestGalleryRevealRefresh = (): void => {
      if (!pendingGalleryReveals.size) return;
      // Continue sampling through the longest compact-column momentum tail so
      // a card reveals on the frame its transformed edge first becomes visible.
      monitorUntil = performance.now() + 2_400;
      if (!refreshFrame) {
        refreshFrame = window.requestAnimationFrame(revealPartiallyVisibleCards);
      }
    };

    const resizeObserver = gallery && 'ResizeObserver' in window
      ? new ResizeObserver(requestGalleryRevealRefresh)
      : undefined;
    if (gallery) resizeObserver?.observe(gallery);
    window.addEventListener('scroll', requestGalleryRevealRefresh, { passive: true });
    window.addEventListener('resize', requestGalleryRevealRefresh, { passive: true });
    requestGalleryRevealRefresh();
    cleanups.push(() => {
      if (refreshFrame) window.cancelAnimationFrame(refreshFrame);
      resizeObserver?.disconnect();
      window.removeEventListener('scroll', requestGalleryRevealRefresh);
      window.removeEventListener('resize', requestGalleryRevealRefresh);
    });
  }

  return () => {
    cleanups.reverse().forEach((cleanup) => cleanup());
    elements.forEach((element) => delete element.dataset.motionReady);
  };
};

const initializeParallax = (environment: MotionEnvironment): MotionCleanup => {
  const elements = selectAll<HTMLElement>(environment.root, '[data-motion-parallax]');
  if (environment.reducedMotion) return () => undefined;

  elements.forEach((element) => {
    const amount = parseMotionValue(
      element.dataset.motionParallax,
      3,
      -MOTION_LIMIT.parallaxPercent,
      MOTION_LIMIT.parallaxPercent,
    );
    if (amount === 0) return;

    gsap.fromTo(
      element,
      { yPercent: amount * -0.5 },
      {
        yPercent: amount * 0.5,
        ease: MOTION_EASE.linear,
        scrollTrigger: {
          trigger: element.closest('[data-project-card], [data-media-frame]') ?? element,
          start: 'top bottom',
          end: 'bottom top',
          invalidateOnRefresh: true,
          scrub: 0.35,
        },
      },
    );
  });

  return () => undefined;
};

const initializeColumns = (environment: MotionEnvironment): MotionCleanup => {
  const columns = selectAll<HTMLElement>(environment.root, '[data-motion-column]');
  if (environment.reducedMotion) return () => undefined;

  const responsiveMotion = gsap.matchMedia();
  const animateColumns = (
    attribute: 'desktopColumn' | 'tabletColumn',
    laneCount: number,
    responses: readonly number[] = COLUMN_SCROLL_RESPONSES,
  ) => {
    interface ColumnLane {
      elements: HTMLElement[];
      filteredScroll: number;
      index: number;
      lagOffset: number;
      response: number;
    }

    const initialTarget = window.scrollY;
    const lanes: ColumnLane[] = Array.from({ length: laneCount }, (_, index) => ({
      elements: [],
      filteredScroll: initialTarget,
      index,
      lagOffset: 0,
      response: responses[index] ?? responses.at(-1) ?? COLUMN_SCROLL_RESPONSES.at(-1)!,
    }));
    columns.forEach((column) => {
      column.dataset.motionReady = 'animated';
      const laneNumber = Number.parseInt(column.dataset[attribute] ?? '', 10);
      if (laneNumber < 1 || laneNumber > laneCount) return;
      lanes[laneNumber - 1]?.elements.push(column);
    });
    const gallery = columns[0]?.closest<HTMLElement>('[data-work-gallery]') ?? columns[0];
    if (!gallery) return () => undefined;

    gallery.dataset.columnMotion = 'first-order';
    const debugEnabled = new URLSearchParams(window.location.search).get('motionDebug') === '1';
    const debugPanel = debugEnabled ? document.createElement('output') : undefined;
    if (debugPanel) {
      debugPanel.className = 'column-motion-debug';
      debugPanel.dataset.columnMotionDebug = '';
      debugPanel.setAttribute('aria-hidden', 'true');
      gallery.append(debugPanel);
    }

    let animationFrame = 0;
    let disposed = false;
    let previousTime = 0;

    const renderLane = (lane: ColumnLane): void => {
      const transform = `translate3d(0, ${lane.lagOffset.toFixed(3)}px, 0)`;
      lane.elements.forEach((element) => {
        element.style.transform = transform;
        element.style.willChange = 'transform';
      });
    };

    const renderDebug = (target: number): void => {
      if (!debugPanel) return;
      debugPanel.textContent = lanes.map((lane) => (
        `C${lane.index + 1}  target ${target.toFixed(1)}  filtered ${lane.filteredScroll.toFixed(1)}`
        + `  lag ${lane.lagOffset.toFixed(1)}  response ${lane.response.toFixed(3)}`
      )).join('\n');
    };

    const settleTransforms = (target: number): void => {
      lanes.forEach((lane) => {
        lane.filteredScroll = target;
        lane.lagOffset = 0;
        lane.elements.forEach((element) => {
          element.style.removeProperty('transform');
          element.style.removeProperty('will-change');
        });
      });
      renderDebug(target);
    };

    const tick = (time: number): void => {
      if (disposed) return;
      const delta = Math.min(
        previousTime ? (time - previousTime) / 1_000 : 1 / 60,
        MOTION_PHYSICS.maximumFrameStep,
      );
      previousTime = time;
      const target = window.scrollY;
      let moving = false;

      lanes.forEach((lane) => {
        lane.filteredScroll = filterColumnScroll(
          lane.filteredScroll,
          target,
          lane.response,
          delta,
        );
        const rawLag = target - lane.filteredScroll;
        if (Math.abs(rawLag) <= MOTION_PHYSICS.columnRestDistance) {
          lane.filteredScroll = target;
          lane.lagOffset = 0;
        } else {
          lane.lagOffset = columnLagOffset(target, lane.filteredScroll);
          moving = true;
        }
        renderLane(lane);
      });
      renderDebug(target);

      if (moving) {
        animationFrame = window.requestAnimationFrame(tick);
      } else {
        animationFrame = 0;
        previousTime = 0;
        settleTransforms(target);
      }
    };

    const startFiltering = (): void => {
      if (!animationFrame) animationFrame = window.requestAnimationFrame(tick);
    };

    const resetFiltering = (): void => {
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
      animationFrame = 0;
      previousTime = 0;
      settleTransforms(window.scrollY);
    };
    const onVisibilityChange = (): void => {
      if (document.hidden) resetFiltering();
    };

    resetFiltering();
    window.addEventListener('scroll', startFiltering, { passive: true });
    window.addEventListener('resize', resetFiltering, { passive: true });
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      disposed = true;
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
      window.removeEventListener('scroll', startFiltering);
      window.removeEventListener('resize', resetFiltering);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      debugPanel?.remove();
      gallery.removeAttribute('data-column-motion');
      columns.forEach((column) => {
        column.style.removeProperty('transform');
        column.style.removeProperty('will-change');
        if (column.dataset.motionReady === 'animated') delete column.dataset.motionReady;
      });
    };
  };

  responsiveMotion.add(
    '(min-width: 1200px)',
    () => animateColumns('desktopColumn', 4),
  );
  responsiveMotion.add(
    '(max-width: 1199px)',
    () => animateColumns('tabletColumn', 2, COMPACT_COLUMN_SCROLL_RESPONSES),
  );

  return () => {
    responsiveMotion.revert();
    gsap.set(columns, { clearProps: 'transform' });
    columns.forEach((column) => {
      column.style.removeProperty('transform');
      column.style.removeProperty('will-change');
      if (column.dataset.motionReady === 'animated') delete column.dataset.motionReady;
    });
  };
};

const initializeSplitText = (environment: MotionEnvironment): MotionCleanup => {
  const elements = selectAll<HTMLElement>(environment.root, '[data-motion-split]');
  const instances: SplitText[] = [];
  if (environment.reducedMotion) {
    elements.forEach((element) => {
      element.dataset.motionSplitReady = 'static';
    });
    return () => elements.forEach((element) => delete element.dataset.motionSplitReady);
  }

  elements.forEach((element) => {
    const mode = element.dataset.motionSplit === 'words'
      ? 'words'
      : element.dataset.motionSplit === 'scroll-letters'
        ? 'scroll-letters'
      : element.dataset.motionSplit === 'write-lines'
        ? 'write-lines'
        : 'lines';
    const splitType = mode === 'words'
      ? 'lines,words'
      : mode === 'scroll-letters'
        ? 'lines,chars'
        : 'lines';
    const split = SplitText.create(element, {
      aria: element.dataset.motionSplitAria === 'none' ? 'none' : 'auto',
      autoSplit: true,
      charsClass: 'motion-char',
      linesClass: 'motion-line',
      ...(mode === 'scroll-letters' ? {} : { mask: 'lines' as const }),
      type: splitType,
      wordsClass: 'motion-word',
      onSplit(instance) {
        const targets = mode === 'words' ? instance.words : instance.lines;
        if (mode === 'scroll-letters') {
          gsap.set(instance.chars, { autoAlpha: 0 });
          return gsap.to(instance.chars, {
            autoAlpha: 1,
            duration: 1,
            ease: MOTION_EASE.linear,
            stagger: 1,
            scrollTrigger: {
              trigger: element,
              start: 'top 92%',
              // Complete the same reversible letter sequence over 80% of its
              // previous scroll distance so the statement resolves sooner.
              end: () => `+=${Math.max(1, (
                element.offsetHeight
                + window.innerHeight * (
                  SCROLL_LETTER_START_VIEWPORT - SCROLL_LETTER_END_VIEWPORT
                )
              ) * SCROLL_LETTER_DISTANCE_SCALE)}`,
              invalidateOnRefresh: true,
              scrub: true,
            },
          });
        }
        if (mode === 'write-lines') {
          return gsap.from(targets, {
            clipPath: 'inset(0 100% 0 0)',
            duration: MOTION_DURATION.reveal * 1.45,
            ease: MOTION_EASE.customOut,
            stagger: 0.16,
            transformOrigin: 'left center',
            clearProps: 'clipPath,transformOrigin',
            scrollTrigger: {
              trigger: element,
              start: 'top 86%',
              once: true,
            },
          });
        }
        return gsap.from(targets, {
          autoAlpha: 0,
          duration: MOTION_DURATION.reveal,
          ease: MOTION_EASE.customOut,
          stagger: mode === 'words' ? 0.025 : 0.07,
          yPercent: 105,
          scrollTrigger: {
            trigger: element,
            start: 'top 88%',
            once: true,
          },
        });
      },
    });
    instances.push(split);
    element.dataset.motionSplitReady = 'animated';
  });

  return () => {
    instances.reverse().forEach((instance) => {
      instance.kill();
      instance.revert();
    });
    elements.forEach((element) => delete element.dataset.motionSplitReady);
  };
};

export const initializeDeclarativeMotion = (environment: MotionEnvironment): MotionCleanup => {
  const cleanups = [
    initializeReveals(environment),
    initializeParallax(environment),
    initializeColumns(environment),
    initializeSplitText(environment),
  ];
  let refreshFrame = 0;

  if (!environment.reducedMotion) {
    refreshFrame = window.requestAnimationFrame(() => {
      refreshFrame = 0;
      ScrollTrigger.refresh();
    });
  }

  return () => {
    if (refreshFrame) window.cancelAnimationFrame(refreshFrame);
    cleanups.reverse().forEach((cleanup) => cleanup());
  };
};
