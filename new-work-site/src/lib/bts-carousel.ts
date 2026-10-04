/* v8 ignore file -- pointer-driven presentation, covered by Playwright. */
import { BtsMomentum } from './bts-momentum';

/**
 * Behind-the-scenes frosted ring carousel.
 *
 * The frames sit on a ring seen from slightly above. Each card is projected
 * with a real perspective factor, so the front card is the largest, cards
 * shrink and rise as they go round to the back, and depth order decides what
 * covers what. Focus, translucency and frost follow depth continuously.
 */

interface Depth {
  /** Card offset from the front, in cards, in (-n/2, n/2]. */
  offset: number;
  /** 1 at the front, 0 at the very back. */
  nearness: number;
  scale: number;
  x: number;
  y: number;
}

// Camera distance in ring radii: sets how much the back shrinks (to ≈0.46).
const CAMERA_DISTANCE = 2.7;
const SPRING = 90;
const DAMPING = 2 * Math.sqrt(SPRING) * .9;
// Cards per second: a steady orbit, with no stops at individual photographs.
const AUTO_SPEED = .18;
const CLICK_PAUSE_MS = 3000;
const COAST_FRICTION = 3.2;
const WHEEL_GESTURE_GAP_MS = 220;
// Five-degree samples keep interpolation smooth without a large native
// keyframe list that makes WebKit repeatedly resolve hundreds of transforms.
const ORBIT_SEGMENTS = 72;
// Clear space between neighbouring cards where they pass, as a share of a
// card's width.
const PASSING_GAP = .14;

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

export const mountCarousel = (root: HTMLElement): (() => void) => {
  const stage = root.querySelector<HTMLElement>('[data-carousel-stage]');
  const cards = Array.from(root.querySelectorAll<HTMLElement>('[data-carousel-card]'));
  if (!stage || cards.length < 3) return () => undefined;

  const count = cards.length;
  const step = (Math.PI * 2) / count;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const nativeScroll = !reduced
    && CSS.supports('animation-timeline', '--bts-scroll')
    && CSS.supports('timeline-scope', '--bts-scroll');
  const controller = new AbortController();
  const { signal } = controller;

  let position = Number(root.dataset.carouselPosition) || 0;
  let autoDirection = Number(root.dataset.carouselDirection) === -1 ? -1 : 1;
  let target = position;
  let velocity = 0;
  let coasting = false;
  let orbit: { animations: Animation[]; position: number; initialTime: number; direction: number } | null = null;
  let orbitFrames: Keyframe[] | null = null;
  let frame = 0;
  let lastAt = performance.now();
  let visible = false;
  let front = -1;
  let pausedUntil = 0;
  let resumeTimer = 0;
  let layout = { rx: 400, ry: 60, parallax: 0 };
  let drag: {
    id: number;
    pointerType: string;
    startX: number;
    startY: number;
    startPosition: number;
    spacing: number;
    momentum: BtsMomentum;
    moved: boolean;
  } | null = null;
  let scrollProgress = 0;
  const scrollTravel = cards.map(() => 0);
  let wheelGesture: { at: number; x: number; y: number; intent: number; axis: 'x' | 'y' | null } | null = null;

  const travelAtDepth = (nearness: number): number => reduced
    ? 0 : layout.parallax * (.08 + .92 * nearness ** 1.8);

  const measureScroll = (): void => {
    if (nativeScroll || reduced) return;
    const box = stage.getBoundingClientRect();
    const viewport = document.documentElement.clientHeight;
    // Match the native view timeline's full entry-to-exit range. The stable
    // stage is the anchor, never a transformed photo. There are no dead zones
    // while the scene is on screen, including when it is taller than the view.
    scrollProgress = clamp(2 * (viewport - box.top) / Math.max(1, viewport + box.height) - 1, -1, 1);
  };

  const setScrollTravel = (element: HTMLElement, travel: number): void => {
    if (nativeScroll) {
      // Rotation changes only the distance a photo travels. The browser owns
      // the scroll progress and composes translate independently of its orbit.
      const value = `${travel.toFixed(2)}px`;
      if (element.style.getPropertyValue('--bts-travel') !== value) element.style.setProperty('--bts-travel', value);
    } else {
      element.style.translate = `0 ${(-scrollProgress * travel).toFixed(2)}px`;
    }
  };

  const paintScroll = (): void => {
    if (nativeScroll || reduced) return;
    measureScroll();
    // Browsers without scroll timelines get a direct passive-scroll update,
    // not a queued carousel frame or a scroll-end/debounce update.
    cards.forEach((card, index) => setScrollTravel(card, scrollTravel[index]!));
  };

  // Neighbouring cards only swap depth order as they pass the very front or
  // the very back of the ring, sitting half a step either side of centre. If
  // they overlapped there they would visibly pass through each other, so the
  // radius is set from the card width to keep that moment clear:
  //   2 · rx · sin(step / 2) · s  ≥  (1 + gap) · width · s
  // (s, the perspective factor, is the same for both cards and cancels).
  // Everywhere else overlaps are ordinary occlusion with a fixed order.
  const measure = (): void => {
    const resumeOrbit = Boolean(orbit);
    stopOrbit();
    orbitFrames = null;
    const height = stage.clientHeight;
    const cardWidth = cards[0]?.offsetWidth || 240;
    const rx = ((1 + PASSING_GAP) * cardWidth) / (2 * Math.sin(step / 2));
    const ry = Math.min(height * .2, rx * .18);
    // Reserve room in both directions for the largest photo and its hover
    // scale. Read the authored origin so the scroll range follows layout.
    const frontCenter = cards[0]!.offsetTop + ry;
    const halfCard = cards[0]!.offsetHeight * .5275;
    const clearance = Math.min(frontCenter, height - frontCenter) - halfCard - 20;
    layout = {
      rx,
      // Seen from slightly above: about a ten-degree tilt, within the stage.
      ry,
      parallax: Math.max(0, Math.min(height * .28, window.innerHeight * .24, clearance)),
    };
    measureScroll();
    if (resumeOrbit) startOrbit();
  };

  const depthAt = (cardOffset: number): Depth => {
    let offset = cardOffset % count;
    if (offset > count / 2) offset -= count;
    if (offset <= -count / 2) offset += count;
    const theta = offset * step;
    const sin = Math.sin(theta);
    const cos = Math.cos(theta);
    // Perspective from a camera CAMERA_DISTANCE radii in front of the ring's
    // centre, normalised so the front card is 1.
    const scale = (CAMERA_DISTANCE - 1) / (CAMERA_DISTANCE - cos);
    return {
      offset,
      nearness: (cos + 1) / 2,
      scale,
      x: sin * layout.rx * scale,
      // Seen from slightly above: the far side of the ring sits higher.
      y: cos * layout.ry * scale,
    };
  };

  const depthOf = (index: number): Depth => depthAt(index - position);

  const orbitStyle = (depth: Depth): { transform: string; opacity: string; filter: string } => ({
    transform: `translate(-50%, -50%) translate(${depth.x.toFixed(2)}px, ${depth.y.toFixed(2)}px) scale(${depth.scale.toFixed(5)})`,
    opacity: (.28 + .72 * depth.nearness ** 1.6).toFixed(4),
    filter: `blur(${((1 - depth.nearness) ** 1.4 * 7).toFixed(3)}px) saturate(${(.55 + .45 * depth.nearness).toFixed(4)})`,
  });

  const syncOrbit = (): void => {
    if (!orbit) return;
    const currentTime = orbit.animations[0]?.currentTime;
    if (typeof currentTime !== 'number') return;
    position = orbit.position + (currentTime - orbit.initialTime) / 1000 * AUTO_SPEED * orbit.direction;
    target = position;
    velocity = AUTO_SPEED * orbit.direction;
  };

  const stopOrbit = (): void => {
    if (!orbit) return;
    syncOrbit();
    const animations = orbit.animations;
    orbit = null;
    animations.forEach((animation) => animation.cancel());
    // Preserve the exact visual position when a press or selection takes over.
    paint();
  };

  const startOrbit = (): void => {
    if (orbit) return;
    // Native transform/opacity animation keeps painting while scrolling
    // delays script frames. Every card follows the same orbit at a phase offset.
    // Scroll depth uses the independent translate property below.
    orbitFrames ??= Array.from({ length: ORBIT_SEGMENTS + 1 }, (_, index) => {
      const { transform, opacity } = orbitStyle(depthAt(-count * index / ORBIT_SEGMENTS));
      return { transform, opacity, offset: index / ORBIT_SEGMENTS };
    });
    const duration = count / AUTO_SPEED * 1000;
    const now = Number(document.timeline.currentTime ?? performance.now());
    const direction = autoDirection;
    const phaseTime = (index: number): number => ((direction * (position - index)) % count + count) % count / AUTO_SPEED * 1000;
    const animations = cards.map((card, index) => {
      const animation = card.animate(orbitFrames!, {
        duration, iterations: Infinity, easing: 'linear', direction: direction === 1 ? 'normal' : 'reverse',
      });
      animation.startTime = now - phaseTime(index);
      return animation;
    });
    orbit = { animations, position, initialTime: phaseTime(0), direction };
    coasting = false;
    target = position;
    velocity = AUTO_SPEED * direction;
  };

  const paint = (): void => {
    const depths = cards.map((_, index) => depthOf(index));
    // Only change stacking when cards actually exchange order, rather than
    // invalidating their layers for every small change in depth.
    const order = depths.map((depth, index) => ({ index, nearness: depth.nearness }))
      .sort((a, b) => a.nearness - b.nearness);
    order.forEach(({ index }, layer) => {
      const card = cards[index]!;
      const zIndex = String(layer + 1);
      if (card.style.zIndex !== zIndex) card.style.zIndex = zIndex;
    });
    cards.forEach((card, index) => {
      const depth = depths[index]!;
      const near = depth.nearness;
      const clarity = near ** 1.6;
      // The foreground travels much farther while the back stays almost
      // anchored. The depth curve stays continuous as the ring rotates.
      const travel = travelAtDepth(near);
      scrollTravel[index] = travel;
      setScrollTravel(card, travel);
      const style = orbitStyle(depth);
      if (orbit) card.style.filter = style.filter;
      else Object.assign(card.style, style);
      // The photo opacity and backdrop frost share the same smooth curve;
      // becoming the front card changes only its keyboard access.
      card.style.setProperty('--bts-clarity', clarity.toFixed(5));
      const isFront = String(Math.abs(depth.offset) < .5);
      if (card.dataset.front !== isFront) card.dataset.front = isFront;
    });
    const nextFront = ((Math.round(position) % count) + count) % count;
    if (nextFront !== front) {
      const keyboardFocus = stage.querySelector('button:focus-visible');
      front = nextFront;
      const card = cards[front]!;
      cards.forEach((other, index) => {
        other.querySelector('button')?.setAttribute('tabindex', index === front ? '0' : '-1');
      });
      if (keyboardFocus) card.querySelector('button')?.focus({ preventScroll: true });
    }
  };

  const tick = (now: number): void => {
    frame = 0;
    if (!visible || document.hidden) return;
    const elapsed = Math.max(0, (now - lastAt) / 1000);
    lastAt = now;
    // Dragging stays direct; photo and keyboard selection pause the orbit for
    // three seconds while the selected photo eases into position. A touch
    // waiting for a direction may become page scrolling, so keep orbiting.
    const holding = drag && (drag.moved || drag.pointerType !== 'touch');
    const canAuto = !reduced && !holding;
    const autoTurning = canAuto && now >= pausedUntil;
    const autoVelocity = AUTO_SPEED * autoDirection;
    if (autoTurning && !orbit && !coasting && velocity === 0 && target === position) startOrbit();
    if (orbit) {
      syncOrbit();
    } else if (!holding) {
      if (reduced) {
        position = target;
        velocity = 0;
      } else if (coasting) {
        // Integrate friction directly: the release keeps its direction and
        // speed, then blends into the normal orbit without a spring stop.
        // Unlike the spring, this is stable across longer frame intervals.
        const coastDt = Math.min(.25, elapsed);
        const cruiseSpeed = autoTurning ? autoVelocity : 0;
        const decay = Math.exp(-COAST_FRICTION * coastDt);
        const excessSpeed = velocity - cruiseSpeed;
        position += cruiseSpeed * coastDt + excessSpeed * (1 - decay) / COAST_FRICTION;
        velocity = cruiseSpeed + excessSpeed * decay;
        target = position;
        if (Math.abs(velocity - cruiseSpeed) < .01) {
          velocity = cruiseSpeed;
          coasting = autoTurning;
        }
      } else {
        // Consume elapsed time in stable spring steps rather than throwing
        // away everything beyond 1/30s. Busy scroll frames must not slow the
        // orbit. As with coasting, bound recovery from a suspended tab/stall.
        let remaining = Math.min(.25, elapsed);
        while (remaining > 0) {
          const dt = Math.min(1 / 120, remaining);
          if (autoTurning) target += autoVelocity * dt;
          velocity += ((target - position) * SPRING - velocity * DAMPING) * dt;
          position += velocity * dt;
          remaining -= dt;
        }
        if (Math.abs(target - position) < .0005 && Math.abs(velocity) < .0005) {
          position = target;
          velocity = 0;
        }
      }
    }
    if (autoTurning && !orbit && Math.abs(velocity - autoVelocity) < .01 && Math.abs(target - position) < .05) {
      startOrbit();
    }
    paint();
    const moving = holding || position !== target || velocity !== 0;
    if (moving || autoTurning) {
      frame = window.requestAnimationFrame(tick);
    } else if (canAuto) {
      resumeTimer = window.setTimeout(request, Math.max(0, pausedUntil - now));
    }
  };

  const request = (): void => {
    window.clearTimeout(resumeTimer);
    if (!frame) {
      lastAt = performance.now();
      frame = window.requestAnimationFrame(tick);
    }
  };

  window.addEventListener('scroll', () => {
    // Native vertical panning can start before pointercancel arrives.
    if (drag?.pointerType === 'touch' && !drag.moved) {
      drag = null;
      request();
    }
    paintScroll();
  }, { passive: true, signal });
  window.addEventListener('resize', () => {
    measure();
    if (visible) request();
  }, { passive: true, signal });

  const goTo = (next: number): void => {
    stopOrbit();
    coasting = false;
    target = next;
    request();
  };

  const pauseAfterSelection = (): void => {
    stopOrbit();
    coasting = false;
    pausedUntil = performance.now() + CLICK_PAUSE_MS;
    target = position;
    velocity = 0;
    request();
  };

  // Rotate a given card to the front the short way round.
  const bringToFront = (index: number): void => {
    const depth = depthOf(index);
    if (Math.abs(depth.offset) > .5) autoDirection = Math.sign(depth.offset);
    goTo(position + depth.offset);
  };

  const turn = (direction: number): void => {
    syncOrbit();
    const next = Math.round(target) + direction;
    pauseAfterSelection();
    autoDirection = direction;
    goTo(next);
  };

  // --- Input -----------------------------------------------------------------
  const cardSpacing = (): number => Math.max(40, layout.rx * step);

  const trackPointer = (event: PointerEvent): void => {
    if (!drag) return;
    position = drag.startPosition - (event.clientX - drag.startX) / drag.spacing;
    target = position;
    drag.momentum.record(event.clientX, event.timeStamp);
  };

  stage.addEventListener('pointerdown', (event) => {
    if (!event.isPrimary || event.button !== 0 || drag) return;
    syncOrbit();
    if (event.pointerType !== 'touch') stopOrbit();
    request();
    drag = {
      id: event.pointerId,
      pointerType: event.pointerType,
      startX: event.clientX,
      startY: event.clientY,
      startPosition: position,
      spacing: cardSpacing(),
      momentum: new BtsMomentum(event.clientX, event.timeStamp),
      moved: false,
    };
    if (event.pointerType !== 'touch') {
      target = position;
      velocity = 0;
      coasting = false;
    }
  }, { signal });

  stage.addEventListener('pointermove', (event) => {
    if (!drag || drag.id !== event.pointerId) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (!drag.moved && drag.pointerType === 'touch' && Math.abs(dy) > 6 && Math.abs(dy) > Math.abs(dx)) {
      drag = null;
      request();
      return;
    }
    if (!drag.moved && Math.abs(dx) > 6) {
      if (drag.pointerType === 'touch') {
        stopOrbit();
        drag.startPosition = position;
        target = position;
        velocity = 0;
        coasting = false;
      }
      drag.moved = true;
      pausedUntil = 0;
      stage.setPointerCapture(event.pointerId);
      stage.dataset.dragging = 'true';
    }
    if (!drag.moved) return;
    const samples = event.getCoalescedEvents?.() ?? [];
    samples.forEach(trackPointer);
    trackPointer(event);
    request();
  }, { signal });

  const release = (event: PointerEvent): void => {
    if (!drag || drag.id !== event.pointerId) return;
    const wasDrag = drag.moved;
    if (wasDrag && event.type === 'pointerup') trackPointer(event);
    const momentum = drag.momentum.release(event.timeStamp);
    const releaseVelocity = clamp(-momentum.velocity / drag.spacing, -12, 12);
    const completed = event.type === 'pointerup' || (event.type === 'lostpointercapture' && event.buttons === 0);
    drag = null;
    delete stage.dataset.dragging;
    if (stage.hasPointerCapture(event.pointerId)) stage.releasePointerCapture(event.pointerId);
    request();
    if (wasDrag) {
      if (momentum.direction) autoDirection = -momentum.direction;
      velocity = !reduced && completed ? releaseVelocity : 0;
      coasting = Math.abs(velocity) > .01;
      target = position;
      return;
    }
    if (event.type !== 'pointerup') return;
    const card = (event.target as Element | null)?.closest<HTMLElement>('[data-carousel-card]');
    if (!card) return;
    const index = cards.indexOf(card);
    pauseAfterSelection();
    bringToFront(index);
  };
  // Also clear a press released outside the stage before it gained capture.
  window.addEventListener('pointerup', release, { signal });
  window.addEventListener('pointercancel', release, { signal });
  stage.addEventListener('lostpointercapture', release, { signal });

  // Decide the axis once per wheel gesture. Trackpads emit sideways drift
  // during vertical scrolling; testing each event in isolation would keep
  // grabbing the orbit as the vertical delta drops during momentum.
  stage.addEventListener('wheel', (event) => {
    const unit = event.deltaMode === WheelEvent.DOM_DELTA_LINE ? 16
      : event.deltaMode === WheelEvent.DOM_DELTA_PAGE ? stage.clientWidth : 1;
    if (!wheelGesture || event.timeStamp - wheelGesture.at > WHEEL_GESTURE_GAP_MS) {
      wheelGesture = { at: event.timeStamp, x: 0, y: 0, intent: 0, axis: null };
    }
    wheelGesture.at = event.timeStamp;
    const delta = event.deltaX * unit;
    wheelGesture.intent = Math.sign(delta) === Math.sign(wheelGesture.intent) ? wheelGesture.intent + delta : delta;
    if (!wheelGesture.axis) {
      wheelGesture.x += Math.abs(event.deltaX * unit);
      wheelGesture.y += Math.abs(event.deltaY * unit);
      if (Math.max(wheelGesture.x, wheelGesture.y) < 8) return;
      wheelGesture.axis = wheelGesture.x > wheelGesture.y * 1.35 ? 'x' : 'y';
    }
    if (wheelGesture.axis !== 'x' || !event.deltaX) return;
    event.preventDefault();
    stopOrbit();
    pausedUntil = 0;
    if (Math.abs(wheelGesture.intent) >= 4) autoDirection = Math.sign(wheelGesture.intent);
    goTo(target + delta / cardSpacing());
  }, { passive: false, signal });

  cards.forEach((card, index) => {
    card.querySelector('button')?.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        turn(event.key === 'ArrowRight' ? 1 : -1);
        window.requestAnimationFrame(() => cards[front]?.querySelector('button')?.focus());
      } else if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        pauseAfterSelection();
        bringToFront(index);
      }
    }, { signal });
  });

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) request();
    else {
      stopOrbit();
      window.clearTimeout(resumeTimer);
    }
  }, { signal });

  const resizeObserver = new ResizeObserver((entries) => {
    if (entries.some((entry) => entry.target === stage)) {
      measure();
      paint();
      if (visible) request();
    } else {
      // Keep the direct fallback aligned after content above the ring changes
      // height, including while a selected photograph has paused rotation.
      paintScroll();
    }
  });
  resizeObserver.observe(stage);
  if (!nativeScroll && !reduced) resizeObserver.observe(document.body);
  const observer = new IntersectionObserver(([entry]) => {
    visible = Boolean(entry?.isIntersecting);
    if (visible) {
      paintScroll();
      request();
    }
    else {
      stopOrbit();
      window.clearTimeout(resumeTimer);
    }
  }, { threshold: 0 });
  observer.observe(stage);

  root.dataset.carouselScroll = reduced ? 'static' : nativeScroll ? 'native' : 'direct';
  measure();
  paint();

  return () => {
    stopOrbit();
    root.dataset.carouselPosition = String(position);
    root.dataset.carouselDirection = String(autoDirection);
    controller.abort();
    resizeObserver.disconnect();
    observer.disconnect();
    window.clearTimeout(resumeTimer);
    if (frame) window.cancelAnimationFrame(frame);
    cards.forEach((card) => {
      card.style.removeProperty('translate');
      card.style.removeProperty('--bts-travel');
    });
    delete root.dataset.carouselScroll;
  };
};
