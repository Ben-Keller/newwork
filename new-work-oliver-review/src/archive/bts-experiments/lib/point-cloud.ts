/* v8 ignore file -- WebGL presentation, covered by Playwright. */
import {
  BufferAttribute,
  BufferGeometry,
  Group,
  NormalBlending,
  Plane,
  Points,
  PerspectiveCamera,
  Raycaster,
  Scene,
  ShaderMaterial,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';
import { clamp, lerp, prefersReducedMotion, readBtsItems } from './data';
import type { BtsItem } from '../types';

// The photo becomes a relief: every sample is a point placed on a 16:9 plane
// and pushed toward the viewer by its brightness.
const PLANE_WIDTH = 16;
const PLANE_HEIGHT = 9;
const MORPH_MS = 1700;
const ASSEMBLE_MS = 1800;
const AUTO_ADVANCE_MS = 7000;

const vertexShader = /* glsl */ `
  attribute vec3 aColorA;
  attribute vec3 aColorB;
  attribute float aLumA;
  attribute float aLumB;
  attribute vec4 aSeed;
  uniform float uMix;
  uniform float uScatter;
  uniform float uTime;
  uniform float uSize;
  uniform float uDepth;
  uniform float uPixelRatio;
  uniform float uPointer;
  uniform vec3 uMouse;
  varying vec3 vColor;
  varying float vGlow;

  void main() {
    float lum = mix(aLumA, aLumB, uMix);
    vec3 p = position;
    p.z = (lum - .5) * uDepth;
    p.z += sin(uTime * .9 + position.x * .35 + position.y * .5) * .05;

    // Between two photos the cloud blows apart and re-forms.
    float burst = sin(3.14159265 * uMix);
    p += aSeed.xyz * (burst * (1.2 + aSeed.w * 2.4) + uScatter * (4. + aSeed.w * 8.));

    // The pointer parts the points like a hand through sand.
    vec2 away = p.xy - uMouse.xy;
    float dist = length(away);
    float push = smoothstep(1.6, 0., dist) * uPointer;
    p.xy += normalize(away + 1e-5) * push * .7;
    p.z += push * 1.6;

    vec4 mv = modelViewMatrix * vec4(p, 1.);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uSize * uPixelRatio * (10. / -mv.z) * (1. + push * .5);
    vColor = mix(aColorA, aColorB, uMix);
    vGlow = push;
  }
`;

const fragmentShader = /* glsl */ `
  varying vec3 vColor;
  varying float vGlow;

  void main() {
    vec2 c = gl_PointCoord - .5;
    float r = length(c);
    if (r > .5) discard;
    float alpha = smoothstep(.5, .32, r);
    gl_FragColor = vec4(vColor + vGlow * .18, alpha);
  }
`;

interface Sampled { colors: Float32Array; luma: Float32Array }

const loadImage = (src: string): Promise<HTMLImageElement | null> => new Promise((resolve) => {
  const image = new Image();
  image.crossOrigin = 'anonymous';
  image.decoding = 'async';
  image.onload = () => resolve(image);
  image.onerror = () => resolve(null);
  image.src = src;
});

const pad = (value: number): string => String(value).padStart(2, '0');

export const mountPointCloud = (root: HTMLElement): (() => void) => {
  const items = readBtsItems(root);
  const stage = root.querySelector<HTMLElement>('[data-pc-stage]');
  const canvas = root.querySelector<HTMLCanvasElement>('[data-pc-canvas]');
  const progressBar = root.querySelector<HTMLElement>('[data-pc-progress]');
  const fallback = root.querySelector<HTMLImageElement>('[data-pc-fallback]');
  const railButtons = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-pc-frame]'));
  if (!stage || !canvas || !items.length) return () => undefined;

  const controller = new AbortController();
  const { signal } = controller;
  const reduced = prefersReducedMotion();
  let index = 0;

  const setText = (selector: string, text: string): void => {
    const element = root.querySelector<HTMLElement>(selector);
    if (element) element.textContent = text;
  };

  const updateHud = (next: number): void => {
    const item = items[next];
    if (!item) return;
    setText('[data-pc-counter]', pad(next + 1));
    setText('[data-pc-time]', item.time);
    setText('[data-pc-department]', item.department);
    setText('[data-pc-note]', item.note);
    const link = root.querySelector<HTMLAnchorElement>('[data-pc-link]');
    if (link) {
      link.href = item.href;
      link.textContent = item.project;
    }
    railButtons.forEach((button, buttonIndex) => {
      if (buttonIndex === next) button.setAttribute('aria-current', 'true');
      else button.removeAttribute('aria-current');
    });
  };

  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: 'high-performance' });
  } catch {
    // Without WebGL the rail still pages through plain photographs.
    root.dataset.pcState = 'fallback';
    railButtons.forEach((button) => {
      button.addEventListener('click', () => {
        index = Number(button.dataset.pcFrame);
        if (fallback) fallback.src = items[index]!.large;
        updateHud(index);
      }, { signal });
    });
    return () => controller.abort();
  }

  const narrow = stage.clientWidth < 700;
  const columns = narrow ? 144 : 208;
  const rows = Math.round(columns * PLANE_HEIGHT / PLANE_WIDTH);
  const count = columns * rows;
  const spacing = PLANE_WIDTH / columns;

  const positions = new Float32Array(count * 3);
  const seeds = new Float32Array(count * 4);
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const at = row * columns + column;
      positions[at * 3] = (column - (columns - 1) / 2) * spacing;
      positions[at * 3 + 1] = ((rows - 1) / 2 - row) * spacing;
      positions[at * 3 + 2] = 0;
      // A random direction on the sphere and a random reach per point.
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      seeds[at * 4] = Math.sin(phi) * Math.cos(theta);
      seeds[at * 4 + 1] = Math.sin(phi) * Math.sin(theta);
      seeds[at * 4 + 2] = Math.cos(phi);
      seeds[at * 4 + 3] = Math.random();
    }
  }

  const colorA = new Float32Array(count * 3).fill(.08);
  const colorB = new Float32Array(count * 3).fill(.08);
  const lumA = new Float32Array(count).fill(.5);
  const lumB = new Float32Array(count).fill(.5);
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  geometry.setAttribute('aSeed', new BufferAttribute(seeds, 4));
  const colorAAttribute = new BufferAttribute(colorA, 3);
  const colorBAttribute = new BufferAttribute(colorB, 3);
  const lumAAttribute = new BufferAttribute(lumA, 1);
  const lumBAttribute = new BufferAttribute(lumB, 1);
  geometry.setAttribute('aColorA', colorAAttribute);
  geometry.setAttribute('aColorB', colorBAttribute);
  geometry.setAttribute('aLumA', lumAAttribute);
  geometry.setAttribute('aLumB', lumBAttribute);

  const uniforms = {
    uMix: { value: 0 },
    uScatter: { value: reduced ? 0 : 1 },
    uTime: { value: 0 },
    uSize: { value: 8 },
    uDepth: { value: 2.2 },
    uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) },
    uPointer: { value: 0 },
    uMouse: { value: new Vector3(99, 99, 0) },
  };
  const material = new ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: NormalBlending,
  });
  const points = new Points(geometry, material);
  const cloud = new Group();
  cloud.add(points);
  const scene = new Scene();
  scene.add(cloud);
  const camera = new PerspectiveCamera(38, 1, .1, 100);
  renderer.setPixelRatio(uniforms.uPixelRatio.value);
  renderer.setClearColor(0x000000, 0);

  // --- Sampling -----------------------------------------------------------
  const sample = async (item: BtsItem): Promise<Sampled | null> => {
    const image = await loadImage(item.thumb);
    if (!image || signal.aborted) return null;
    const work = document.createElement('canvas');
    work.width = columns;
    work.height = rows;
    const context = work.getContext('2d', { willReadFrequently: true });
    if (!context) return null;
    const cover = Math.max(columns / image.naturalWidth, rows / image.naturalHeight);
    const drawWidth = image.naturalWidth * cover;
    const drawHeight = image.naturalHeight * cover;
    context.drawImage(image, (columns - drawWidth) / 2, (rows - drawHeight) / 2, drawWidth, drawHeight);
    let data: Uint8ClampedArray;
    try {
      data = context.getImageData(0, 0, columns, rows).data;
    } catch {
      return null;
    }
    const colors = new Float32Array(count * 3);
    const luma = new Float32Array(count);
    for (let at = 0; at < count; at += 1) {
      const red = data[at * 4]! / 255;
      const green = data[at * 4 + 1]! / 255;
      const blue = data[at * 4 + 2]! / 255;
      colors[at * 3] = red;
      colors[at * 3 + 1] = green;
      colors[at * 3 + 2] = blue;
      luma[at] = .2126 * red + .7152 * green + .0722 * blue;
    }
    return { colors, luma };
  };

  // --- Layout -------------------------------------------------------------
  const resize = (): void => {
    const width = stage.clientWidth;
    const height = stage.clientHeight;
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    const halfFov = (camera.fov * Math.PI) / 360;
    const fitHeight = (PLANE_HEIGHT / 2) / Math.tan(halfFov);
    const fitWidth = (PLANE_WIDTH / 2) / (Math.tan(halfFov) * camera.aspect);
    // Fill the stage (cover), with a little overscan so the idle sway and a
    // turned relief never pull an edge of the plane into view.
    const distance = Math.min(fitHeight, fitWidth) * .92;
    camera.position.set(0, 0, distance);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
    // One grid step on screen, slightly overlapped so the photo reads solid.
    const visibleHeight = 2 * distance * Math.tan(halfFov);
    const stepPixels = (spacing / visibleHeight) * height;
    uniforms.uSize.value = stepPixels * 1.25 * distance / 10;
  };

  // --- Motion state -------------------------------------------------------
  let frame = 0;
  let visible = false;
  let morphStart = 0;
  let morphing = false;
  let assembleStart = 0;
  let pointerTarget = 0;
  let dragging: { id: number; x: number; y: number; moved: boolean } | null = null;
  let spinY = 0;
  let spinX = 0;
  let velocityY = 0;
  let velocityX = 0;
  let lastInteraction = performance.now();
  let advanceElapsed = 0;
  let lastFrameAt = performance.now();
  let pendingIndex: number | null = null;
  const raycaster = new Raycaster();
  const ndc = new Vector2();
  const hit = new Vector3();
  const surface = new Plane(new Vector3(0, 0, 1), 0);

  const commitMorph = (): void => {
    colorA.set(colorB);
    lumA.set(lumB);
    colorAAttribute.needsUpdate = true;
    lumAAttribute.needsUpdate = true;
    uniforms.uMix.value = 0;
    morphing = false;
  };

  const goTo = async (next: number): Promise<void> => {
    const wrapped = (next + items.length) % items.length;
    if (morphing) {
      pendingIndex = wrapped;
      return;
    }
    const sampled = await sample(items[wrapped]!);
    if (!sampled || signal.aborted) return;
    index = wrapped;
    colorB.set(sampled.colors);
    lumB.set(sampled.luma);
    colorBAttribute.needsUpdate = true;
    lumBAttribute.needsUpdate = true;
    updateHud(index);
    advanceElapsed = 0;
    if (reduced) {
      commitMorph();
      render(performance.now());
      return;
    }
    morphing = true;
    morphStart = performance.now();
    request();
  };

  const render = (now: number): void => {
    frame = 0;
    const delta = Math.min(64, now - lastFrameAt);
    lastFrameAt = now;
    if (!reduced) uniforms.uTime.value = now / 1000;

    if (assembleStart) {
      const t = clamp((now - assembleStart) / ASSEMBLE_MS, 0, 1);
      uniforms.uScatter.value = (1 - t) ** 3;
      if (t >= 1) assembleStart = 0;
    }
    if (morphing) {
      const t = clamp((now - morphStart) / MORPH_MS, 0, 1);
      uniforms.uMix.value = t < .5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
      if (t >= 1) {
        commitMorph();
        if (pendingIndex !== null) {
          const queued = pendingIndex;
          pendingIndex = null;
          void goTo(queued);
        }
      }
    }

    uniforms.uPointer.value = lerp(uniforms.uPointer.value, pointerTarget, .08);

    // Drag turns the relief; released, it drifts back to a slow idle sway.
    if (!dragging) {
      spinY += velocityY;
      spinX += velocityX;
      velocityY *= .92;
      velocityX *= .92;
      const idleY = reduced ? 0 : Math.sin(now / 5200) * .1;
      const idleX = reduced ? 0 : Math.sin(now / 7300) * .05;
      spinY = lerp(spinY, idleY, .025);
      spinX = lerp(spinX, idleX, .025);
    }
    cloud.rotation.y = spinY;
    cloud.rotation.x = spinX;

    // Auto-advance while the viewer isn't handling it.
    const idle = now - lastInteraction > 2500 && !dragging && !morphing;
    if (!reduced && idle) advanceElapsed += delta;
    if (progressBar) progressBar.style.transform = `scaleX(${clamp(advanceElapsed / AUTO_ADVANCE_MS, 0, 1).toFixed(4)})`;
    if (!reduced && advanceElapsed >= AUTO_ADVANCE_MS) {
      advanceElapsed = 0;
      void goTo(index + 1);
    }

    renderer.render(scene, camera);
    if (visible && (!reduced || morphing || assembleStart || dragging)) frame = window.requestAnimationFrame(render);
  };

  function request(): void {
    if (!frame && visible) frame = window.requestAnimationFrame(render);
  }

  // --- Input --------------------------------------------------------------
  const aimAt = (clientX: number, clientY: number): void => {
    const box = canvas.getBoundingClientRect();
    ndc.set(((clientX - box.left) / box.width) * 2 - 1, -((clientY - box.top) / box.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    cloud.updateMatrixWorld();
    const plane = surface.clone().applyMatrix4(cloud.matrixWorld);
    if (raycaster.ray.intersectPlane(plane, hit)) {
      cloud.worldToLocal(hit);
      uniforms.uMouse.value.copy(hit);
    }
  };

  canvas.addEventListener('pointermove', (event) => {
    lastInteraction = performance.now();
    if (dragging && dragging.id === event.pointerId) {
      const dx = event.clientX - dragging.x;
      const dy = event.clientY - dragging.y;
      if (!dragging.moved && Math.hypot(dx, dy) > 5) {
        dragging.moved = true;
        canvas.setPointerCapture(event.pointerId);
        canvas.dataset.dragging = 'true';
      }
      if (dragging.moved) {
        velocityY = dx * .004;
        velocityX = dy * .003;
        spinY = clamp(spinY + velocityY, -1.1, 1.1);
        spinX = clamp(spinX + velocityX, -.6, .6);
      }
      dragging.x = event.clientX;
      dragging.y = event.clientY;
    }
    if (event.pointerType !== 'touch') {
      pointerTarget = 1;
      aimAt(event.clientX, event.clientY);
    }
    request();
  }, { signal });

  canvas.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    lastInteraction = performance.now();
    dragging = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false };
    request();
  }, { signal });

  const release = (event: PointerEvent): void => {
    if (!dragging || dragging.id !== event.pointerId) return;
    const wasDrag = dragging.moved;
    dragging = null;
    delete canvas.dataset.dragging;
    if (!wasDrag && event.type === 'pointerup') void goTo(index + 1);
    request();
  };
  canvas.addEventListener('pointerup', release, { signal });
  canvas.addEventListener('pointercancel', release, { signal });
  canvas.addEventListener('pointerleave', () => {
    pointerTarget = 0;
    request();
  }, { signal });

  railButtons.forEach((button) => {
    button.addEventListener('click', () => {
      lastInteraction = performance.now();
      void goTo(Number(button.dataset.pcFrame));
    }, { signal });
  });

  const resizeObserver = new ResizeObserver(() => {
    resize();
    request();
  });
  resizeObserver.observe(stage);
  const observer = new IntersectionObserver(([entry]) => {
    const wasVisible = visible;
    visible = Boolean(entry?.isIntersecting);
    if (visible && !wasVisible && !reduced && root.dataset.pcState === 'ready' && !assembleStart && uniforms.uScatter.value > .5) {
      assembleStart = performance.now();
    }
    if (visible) request();
  }, { threshold: .2 });

  resize();
  void sample(items[0]!).then((sampled) => {
    if (!sampled || signal.aborted) {
      if (!signal.aborted) root.dataset.pcState = 'fallback';
      return;
    }
    colorA.set(sampled.colors);
    colorB.set(sampled.colors);
    lumA.set(sampled.luma);
    lumB.set(sampled.luma);
    [colorAAttribute, colorBAttribute, lumAAttribute, lumBAttribute].forEach((attribute) => { attribute.needsUpdate = true; });
    root.dataset.pcState = 'ready';
    // The observer starts the first photo assembling out of a scattered cloud
    // when it actually comes into view (immediately, if it already is).
    observer.observe(stage);
  });

  return () => {
    controller.abort();
    resizeObserver.disconnect();
    observer.disconnect();
    if (frame) window.cancelAnimationFrame(frame);
    geometry.dispose();
    material.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
    // A context-lost canvas cannot host the next renderer; swap in a fresh one.
    canvas.replaceWith(canvas.cloneNode(false));
    root.dataset.pcState = 'loading';
  };
};
