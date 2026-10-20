import { prefersReducedData } from '../motion/reduced-data';

type Media = HTMLVideoElement | HTMLImageElement;
type Layout = { width: number; height: number; newX: number; newY: number; workX: number; workY: number };

// One SVG owns shape, spacing, hit targets and the canvas masks. The page's
// handoff controller owns placement; this controller only rearranges whole words.
export function setupWordmark(intro: HTMLElement, signal: AbortSignal) {
  const svg = intro.querySelector<SVGSVGElement>('[data-wordmark-art]');
  const canvas = intro.querySelector<HTMLCanvasElement>('[data-wordmark-canvas]');
  const context = canvas?.getContext('2d');
  const stage = intro.querySelector<HTMLElement>('[data-logo-stage]')!;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const saveData = prefersReducedData();
  const canAnimate = () => !reduced.matches && !saveData;
  const paths = [...intro.querySelectorAll<SVGPathElement>('[data-wordmark-glyph]')].map(element => ({
    element, shape: new Path2D(element.getAttribute('d')!), bounds: element.getBBox(),
    word: element.dataset.word as 'new' | 'work',
  }));
  const viewBox = svg?.viewBox.baseVal;
  const home: Layout = { width: viewBox?.width || 1, height: viewBox?.height || 1,
    newX: -(viewBox?.x || 0), newY: -(viewBox?.y || 0), workX: -(viewBox?.x || 0), workY: -(viewBox?.y || 0) };
  const newTop = Math.min(...paths.filter(path => path.word === 'new').map(path => path.bounds.y));
  const workLeft = Math.min(...paths.filter(path => path.word === 'work').map(path => path.bounds.x));
  // The supplied stacked arrangement offsets the second word slightly right.
  // All intraword positions remain exactly those of the horizontal master.
  const stack: Layout = paths.length ? { ...home,
    width: home.width + (viewBox?.x || 0) - workLeft + 34.03,
    height: home.height + 59.34,
    newY: -newTop, workX: -workLeft + 34.03, workY: home.workY + 59.34,
  } : home;
  const media = [...intro.querySelectorAll<HTMLElement>('[data-letter-media]')].map(element => ({
    image: element.querySelector<HTMLImageElement>('img'), video: element.querySelector<HTMLVideoElement>('video'),
  }));
  const splashImage = intro.querySelector<HTMLImageElement>('[data-splash-image]');
  const splashVideo = intro.querySelector<HTMLVideoElement>('[data-splash-video]');
  const videos = [...intro.querySelectorAll<HTMLVideoElement>('video')];
  let layout = home;
  let masks: Path2D[] = [];
  let active = -1;
  let frame = 0;
  let visible = true;
  let lastPaint = 0;
  let dirty = true;
  let transition: { from: Layout; to: Layout; start: number; duration: number } | null = null;
  let revealTimer = 0;
  let revealFrame = 0;

  const source = (video?: HTMLVideoElement | null, image?: HTMLImageElement | null): Media | null => {
    if (canAnimate() && video && video.readyState >= 2 && video.videoWidth) return video;
    return image?.complete && image.naturalWidth ? image : null;
  };
  const drawCover = (image: Media, x: number, y: number, width: number, height: number, bleed: number) => {
    if (!context) return;
    const iw = image instanceof HTMLVideoElement ? image.videoWidth : image.naturalWidth;
    const ih = image instanceof HTMLVideoElement ? image.videoHeight : image.naturalHeight;
    // Extend the image past the clip's antialiased edge. The native glyph
    // still defines the silhouette; its bounds must not also crop the media.
    const scale = Math.max((width + bleed * 2) / iw, (height + bleed * 2) / ih);
    context.drawImage(image, x + (width - iw * scale) / 2, y + (height - ih * scale) / 2, iw * scale, ih * scale);
  };
  const applyGeometry = (value: Layout) => {
    layout = value;
    if (!svg) return;
    svg.setAttribute('viewBox', `0 0 ${value.width} ${value.height}`);
    masks = paths.map(({ element, shape, word }) => {
      const x = value[word === 'new' ? 'newX' : 'workX'];
      const y = value[word === 'new' ? 'newY' : 'workY'];
      element.setAttribute('transform', `translate(${x} ${y})`);
      const mask = new Path2D(); mask.addPath(shape, new DOMMatrix().translate(x, y));
      return mask;
    });
  };
  const paint = () => {
    if (!context || !canvas || !svg) return;
    const rect = svg.getBoundingClientRect();
    const density = Math.min(devicePixelRatio || 1, Math.sqrt(8_294_400 / Math.max(1, rect.width * rect.height)));
    const width = Math.max(1, Math.round(rect.width * density));
    const height = Math.max(1, Math.round(rect.height * density));
    const bleed = 2 * Math.max(layout.width / width, layout.height / height);
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;
    context.setTransform(width / layout.width, 0, 0, height / layout.height, 0, 0);
    context.clearRect(0, 0, layout.width, layout.height);
    const hovered = active >= 0 ? source(media[active]?.video, media[active]?.image) : null;
    const shared = intro.dataset.titleState !== 'home' && canAnimate() ? source(splashVideo, splashImage) : null;
    if (shared) {
      const mask = new Path2D();
      masks.forEach((path, index) => { if (!hovered || index !== active) mask.addPath(path); });
      context.save(); context.clip(mask); drawCover(shared, 0, 0, layout.width, layout.height, bleed); context.restore();
      canvas.dataset.sharedSource = shared.currentSrc;
    } else delete canvas.dataset.sharedSource;
    if (hovered && paths[active]) {
      const { bounds, word } = paths[active]!;
      context.save(); context.clip(masks[active]!);
      drawCover(hovered, bounds.x + layout[word === 'new' ? 'newX' : 'workX'],
        bounds.y + layout[word === 'new' ? 'newY' : 'workY'], bounds.width, bounds.height, bleed);
      context.restore();
      canvas.dataset.activeLetter = String(active);
      canvas.dataset.activeSource = hovered.currentSrc;
      canvas.dataset.activeKind = hovered instanceof HTMLVideoElement ? 'video' : 'image';
    } else {
      delete canvas.dataset.activeLetter; delete canvas.dataset.activeSource; delete canvas.dataset.activeKind;
    }
    // Avoid compositing two antialiased silhouettes: a black SVG underneath
    // the canvas shows through its edge pixels as an outline. Keep the SVG
    // for geometry and pointer hit testing, and restore its fill when no
    // decoded media is available.
    paths.forEach(({ element }, index) => {
      const filled = Boolean(shared || (hovered && index === active));
      if (element.hasAttribute('data-media-filled') !== filled) element.toggleAttribute('data-media-filled', filled);
    });
  };
  // Matches the handoff's cubic-bezier(.22, 1, .36, 1).
  const ease = (progress: number) => {
    let low = 0; let high = 1;
    for (let i = 0; i < 16; i++) {
      const t = (low + high) / 2;
      const x = 3 * (1 - t) ** 2 * t * .22 + 3 * (1 - t) * t ** 2 * .36 + t ** 3;
      if (x < progress) low = t; else high = t;
    }
    return 1 - (1 - (low + high) / 2) ** 3;
  };
  const tick = (time: number) => {
    frame = 0;
    if (signal.aborted || document.hidden || !visible) return;
    const changing = Boolean(transition);
    if (transition) {
      const t = Math.min(1, (time - transition.start) / transition.duration);
      const p = ease(t); const value = { ...transition.to };
      for (const key of Object.keys(value) as (keyof Layout)[]) value[key] = transition.from[key] + (transition.to[key] - transition.from[key]) * p;
      applyGeometry(t === 1 ? transition.to : value);
      if (t === 1) transition = null;
    }
    if (dirty || changing || time - lastPaint >= 1000 / 30) { paint(); lastPaint = time; dirty = false; }
    if (transition || videos.some(video => !video.paused && !video.ended)) frame = requestAnimationFrame(tick);
  };
  const requestPaint = () => { dirty = true; if (!frame && !signal.aborted) frame = requestAnimationFrame(tick); };
  const startVideo = (video?: HTMLVideoElement | null) => {
    if (!video || !canAnimate() || document.hidden || !visible) return;
    const videoSource = video.querySelector<HTMLSourceElement>('source');
    if (videoSource?.dataset.src && !videoSource.src) { videoSource.src = videoSource.dataset.src; video.load(); }
    void video.play().then(requestPaint).catch(requestPaint);
  };
  const stopHover = () => {
    if (active >= 0) { paths[active]?.element.removeAttribute('data-type-active'); media[active]?.video?.pause(); }
    active = -1; requestPaint();
  };
  const syncPlayback = () => {
    videos.forEach(video => video.pause());
    if (intro.dataset.titleState !== 'home') startVideo(splashVideo);
    if (active >= 0) startVideo(media[active]?.video);
    requestPaint();
  };
  paths.slice(0, 7).forEach(({ element }, index) => {
    element.addEventListener('pointerenter', event => {
      if (!fine.matches || event.pointerType === 'touch' || intro.dataset.titleMotion === 'moving') return;
      stopHover(); active = index; element.dataset.typeActive = 'true';
      const image = media[index]?.image;
      if (image?.dataset.src && !image.src) image.src = image.dataset.src;
      startVideo(media[index]?.video); requestPaint();
    }, { signal });
    element.addEventListener('pointerleave', stopHover, { signal });
    element.addEventListener('pointercancel', stopHover, { signal });
  });
  intro.querySelectorAll('img, video').forEach(element => {
    for (const event of ['load', 'loadeddata', 'playing', 'error']) element.addEventListener(event, requestPaint, { signal });
  });
  const reveal = (delay = 0) => {
    clearTimeout(revealTimer); cancelAnimationFrame(revealFrame);
    intro.dataset.logoRevealReady = 'false';
    intro.dataset.logoRevealPhase = delay ? 'background' : 'content';
    syncPlayback();
    revealTimer = window.setTimeout(() => {
      intro.dataset.logoRevealPhase = 'content';
      revealFrame = requestAnimationFrame(() => {
        revealFrame = requestAnimationFrame(() => {
          intro.dataset.logoRevealReady = 'true';
          if (reduced.matches || intro.dataset.titleState === 'home') intro.dataset.logoRevealPhase = 'done';
        });
      });
    }, delay);
  };
  stage.addEventListener('animationend', () => { intro.dataset.logoRevealPhase = 'done'; }, { signal });
  window.addEventListener('new-work:logo-reveal', () => reveal(), { signal });
  document.addEventListener('visibilitychange', syncPlayback, { signal });
  reduced.addEventListener('change', syncPlayback, { signal });
  fine.addEventListener('change', stopHover, { signal });
  const resize = new ResizeObserver(requestPaint); resize.observe(stage);
  // Observe the moving artwork, not its small reserved home footprint.
  const intersection = new IntersectionObserver(entries => {
    visible = entries[0]?.isIntersecting ?? true; syncPlayback();
  }); intersection.observe(stage);
  signal.addEventListener('abort', () => {
    clearTimeout(revealTimer); cancelAnimationFrame(revealFrame); cancelAnimationFrame(frame);
    videos.forEach(video => video.pause()); resize.disconnect(); intersection.disconnect();
    paths.forEach(({ element }) => element.removeAttribute('data-media-filled'));
  }, { once: true });
  applyGeometry(stack);
  reveal(reduced.matches ? 0 : 240);
  return {
    splashRatio: svg ? stack.width / stack.height : undefined,
    setLayout(homeState: boolean, animate: boolean, duration: number) {
      stopHover();
      if (homeState) intro.dataset.logoRevealPhase = 'done';
      const target = homeState ? home : stack;
      transition = animate && !reduced.matches ? { from: { ...layout }, to: target, start: performance.now(), duration } : null;
      if (!transition) applyGeometry(target);
      syncPlayback(); requestPaint();
    },
  };
}
