/* v8 ignore file -- the first-session composition is exercised by Playwright. */
import { ensureGsapPlugins, gsap } from './vendor';

interface LogoIntroOptions {
  intro: HTMLElement;
  duration: number;
  playEntrance?: boolean;
  onSettle?: () => void;
}

export const startLogoIntro = ({
  intro,
  duration,
  playEntrance = true,
  onSettle,
}: LogoIntroOptions): (() => void) => {
  ensureGsapPlugins();
  const media = intro.querySelector<HTMLElement>('[data-intro-media]');
  const cells = [...intro.querySelectorAll<HTMLElement>('[data-intro-cell]')];
  const primaryFaces = [...intro.querySelectorAll<HTMLElement>('[data-intro-primary]')];
  const alternateFaces = [...intro.querySelectorAll<HTMLElement>('[data-intro-alternate]')];
  const video = intro.querySelector<HTMLVideoElement>('[data-intro-video]');
  const videoSource = video?.querySelector<HTMLSourceElement>('[data-intro-video-source]');
  const letterTriggers = [...intro.querySelectorAll<SVGElement>('[data-nw-letter]')];
  const letterLayers = [...intro.querySelectorAll<HTMLElement>('[data-intro-letter-layer]')];
  let safetyTimer = 0;
  let disposed = false;
  let activeLetterCleanup: (() => void) | null = null;

  const stopVideo = (): void => {
    if (!video) return;
    video.pause();
    videoSource?.removeAttribute('src');
    video.removeAttribute('src');
    video.load();
  };
  const settle = (): void => {
    if (!intro.isConnected || intro.dataset.state === 'settled') return;
    if (safetyTimer) window.clearTimeout(safetyTimer);
    gsap.set(media, { autoAlpha: 0 });
    intro.dataset.introSettledAt = String(performance.now());
    intro.dataset.state = 'settled';
    stopVideo();
    onSettle?.();
  };

  if (playEntrance && video && videoSource?.dataset.src) {
    videoSource.src = videoSource.dataset.src;
    if (videoSource.dataset.type) videoSource.type = videoSource.dataset.type;
    video.load();
    void video.play().catch(() => undefined);
  }

  const stopLetterVideo = (layer: HTMLElement): void => {
    const letterVideo = layer.querySelector<HTMLVideoElement>('[data-intro-letter-video]');
    const source = letterVideo?.querySelector<HTMLSourceElement>('[data-intro-letter-video-source]');
    if (!letterVideo) return;
    letterVideo.pause();
    source?.removeAttribute('src');
    letterVideo.load();
  };

  const concealActiveLetter = (): void => {
    activeLetterCleanup?.();
    activeLetterCleanup = null;
  };

  const revealLetter = (index: string): void => {
    if (intro.dataset.state === 'pending') return;
    const layer = letterLayers.find((candidate) => candidate.dataset.letterIndex === index);
    if (!layer || layer.dataset.letterActive === 'true') return;
    concealActiveLetter();
    layer.dataset.letterActive = 'true';
    const primary = layer.querySelector<HTMLElement>('[data-intro-letter-primary]');
    const alternate = layer.querySelector<HTMLElement>('[data-intro-letter-alternate]');
    const letterVideo = layer.querySelector<HTMLVideoElement>('[data-intro-letter-video]');
    const source = letterVideo?.querySelector<HTMLSourceElement>('[data-intro-letter-video-source]');
    if (letterVideo && source?.dataset.src) {
      source.src = source.dataset.src;
      if (source.dataset.type) source.type = source.dataset.type;
      letterVideo.load();
      void letterVideo.play().catch(() => undefined);
    }

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    gsap.set(layer, { autoAlpha: 1 });
    const hoverTimeline = gsap.timeline({ repeat: reducedMotion ? 0 : -1, repeatDelay: .12 });
    if (reducedMotion || layer.dataset.letterKind === 'video') {
      hoverTimeline.fromTo(primary, { scale: reducedMotion ? 1 : 1.035 }, {
        scale: 1,
        duration: reducedMotion ? 0 : 1.2,
        ease: 'new-work-out',
      });
    } else {
      const cadence = .58 + (Number(index) % 3) * .08;
      hoverTimeline
        .fromTo(primary, { scale: 1.025, rotateY: 0, opacity: 1 }, {
          scale: 1,
          rotateY: -90,
          opacity: 0,
          duration: cadence,
          ease: 'power2.inOut',
        })
        .fromTo(alternate, { rotateY: 90, opacity: 0 }, {
          rotateY: 0,
          opacity: 1,
          duration: cadence,
          ease: 'power2.inOut',
        }, '<.08')
        .to(alternate, {
          rotateY: -90,
          opacity: 0,
          duration: cadence,
          ease: 'power2.inOut',
        }, '+=.28')
        .fromTo(primary, { rotateY: 90, opacity: 0 }, {
          rotateY: 0,
          opacity: 1,
          duration: cadence,
          ease: 'power2.inOut',
        }, '<.08');
    }

    activeLetterCleanup = () => {
      hoverTimeline.kill();
      layer.removeAttribute('data-letter-active');
      stopLetterVideo(layer);
      gsap.killTweensOf([layer, primary, alternate]);
      gsap.to(layer, {
        autoAlpha: 0,
        duration: reducedMotion ? 0 : .22,
        ease: 'power2.out',
        onComplete: () => {
          gsap.set(primary, { clearProps: 'transform,opacity' });
          gsap.set(alternate, { clearProps: 'transform,opacity' });
        },
      });
    };
  };

  letterTriggers.forEach((trigger) => {
    const index = trigger.dataset.letterIndex;
    if (!index) return;
    trigger.addEventListener('pointerenter', () => revealLetter(index));
    trigger.addEventListener('pointerleave', concealActiveLetter);
    trigger.addEventListener('pointercancel', concealActiveLetter);
  });

  if (!playEntrance) {
    gsap.set(media, { autoAlpha: 0 });
    gsap.set(letterLayers, { autoAlpha: 0 });
    settle();
    return () => {
      if (disposed) return;
      disposed = true;
      concealActiveLetter();
      stopVideo();
      letterLayers.forEach(stopLetterVideo);
    };
  }

  gsap.set(media, { clipPath: 'inset(0 100% 0 0)', scale: 1.018, autoAlpha: 1 });
  gsap.set(cells, { opacity: 0, yPercent: 5 });
  intro.dataset.introStartedAt = String(performance.now());
  intro.dataset.state = 'ready';
  const totalSeconds = duration / 1_000;
  const timeline = gsap.timeline({ paused: true, defaults: { ease: 'new-work-out' } });
  timeline
    .to(media, { clipPath: 'inset(0 0% 0 0)', scale: 1, duration: .82 }, 0)
    .to(cells, { opacity: 1, yPercent: 0, duration: .62, stagger: .055 }, .08)
    .to(
      primaryFaces,
      { opacity: 0, rotateY: -90, duration: .48, stagger: .11, ease: 'power2.inOut' },
      1.05,
    )
    .fromTo(
      alternateFaces,
      { opacity: 0, rotateY: 90, immediateRender: false },
      { opacity: 1, rotateY: 0, duration: .48, stagger: .11, ease: 'power2.inOut' },
      1.1,
    )
    .to(
      alternateFaces.filter((_, index) => index % 2 === 0),
      { opacity: 0, rotateX: 88, duration: .46, stagger: .13, ease: 'power2.inOut' },
      2.45,
    )
    .fromTo(
      primaryFaces.filter((_, index) => index % 2 === 0),
      { opacity: 0, rotateX: -88, rotateY: 0, immediateRender: false },
      { opacity: 1, rotateX: 0, duration: .46, stagger: .13, ease: 'power2.inOut' },
      2.5,
    )
    .to(media, { filter: 'grayscale(1) contrast(1.14)', duration: .58 }, 3.45)
    .to(
      media,
      { opacity: 0, scale: .988, duration: .72, ease: 'new-work-out' },
      Math.max(4.1, totalSeconds - .9),
    )
    .call(settle, [], totalSeconds);
  timeline.play(0);

  safetyTimer = window.setTimeout(settle, duration + 160);

  return () => {
    if (disposed) return;
    disposed = true;
    concealActiveLetter();
    timeline.kill();
    if (safetyTimer) window.clearTimeout(safetyTimer);
    stopVideo();
    letterLayers.forEach(stopLetterVideo);
  };
};
