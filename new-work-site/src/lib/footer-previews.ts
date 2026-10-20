import {FINE_POINTER_QUERY} from './motion/pointer-capability';

/** Small, demand-loaded stills. Links remain ordinary navigation, including on
 * touch screens and without JavaScript. No pointer-following animation loop. */
export function setupFooterPreviews(footer: HTMLElement | null): () => void {
  if (!footer) return () => undefined;
  const controller = new AbortController();
  const {signal} = controller;
  const hover = window.matchMedia(FINE_POINTER_QUERY);
  let active: HTMLElement | undefined;
  const hide = () => {
    active?.removeAttribute('data-active');
    active = undefined;
  };

  footer.querySelectorAll<HTMLAnchorElement>('a[data-footer-project]').forEach(link => {
    const preview = link.querySelector<HTMLElement>('[data-footer-preview]');
    const image = preview?.querySelector<HTMLImageElement>('img');
    if (!preview || !image) return;
    image.addEventListener('load', () => {
      if (image.naturalWidth > 0) preview.setAttribute('data-ready', '');
    }, {signal});
    image.addEventListener('error', () => {
      preview.removeAttribute('data-ready');
    }, {signal});

    const show = () => {
      hide();
      const box = link.getBoundingClientRect();
      const width = preview.offsetWidth;
      const height = preview.offsetHeight;
      const inset = 16;
      const gap = 18;
      const x = Math.min(innerWidth - width - inset, Math.max(inset, box.left + box.width / 2 - width / 2));
      const preferredY = box.top - height - gap >= inset
        ? box.top - height - gap : box.bottom + gap;
      const y = Math.max(inset, Math.min(innerHeight - height - inset, preferredY));
      preview.style.left = `${x}px`;
      preview.style.top = `${y}px`;
      active = preview;
      preview.setAttribute('data-active', '');
      // Assign srcset first so a high-density screen requests just one size.
      if (!image.hasAttribute('src')) {
        if (image.dataset.previewSrcset) image.srcset = image.dataset.previewSrcset;
        image.src = image.dataset.previewSrc || '';
      }
      if (image.complete && image.naturalWidth > 0) preview.setAttribute('data-ready', '');
    };
    link.addEventListener('pointerenter', event => {
      if (hover.matches && event.pointerType !== 'touch') show();
    }, {signal});
    link.addEventListener('pointerleave', () => {
      if (active === preview) hide();
    }, {signal});
    link.addEventListener('focus', () => {
      if (link.matches(':focus-visible')) show();
    }, {signal});
    link.addEventListener('blur', () => {
      if (active === preview) hide();
    }, {signal});
    link.addEventListener('click', hide, {signal});
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') hide();
  }, {signal});
  window.addEventListener('scroll', hide, {signal, passive: true});
  window.addEventListener('resize', hide, {signal, passive: true});
  hover.addEventListener('change', hide, {signal});
  return () => { hide(); controller.abort(); };
}
