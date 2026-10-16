/* v8 ignore file -- WebGL presentation, covered by Playwright. */
import {
  CanvasTexture,
  Color,
  DoubleSide,
  Fog,
  FrontSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Raycaster,
  SRGBColorSpace,
  Scene,
  TextureLoader,
  Vector2,
  WebGLRenderer,
  type Texture,
} from 'three';
import { clamp, createViewer, lerp, prefersReducedMotion, readBtsItems } from './data';
import type { BtsItem } from '../types';

// Strip geometry, in world units. The strip winds down a cylinder: each frame
// is bent onto the surface rather than placed as a flat card, so the film reads
// as one continuous ribbon.
const RADIUS = 2.4;
const FRAME_WIDTH = 1.5;
const FRAME_HEIGHT = 1;
const STRIP_HEIGHT = FRAME_HEIGHT * 1.5;
const SEGMENT = FRAME_WIDTH + .24;
const STEP = SEGMENT / RADIUS;
const PITCH = STRIP_HEIGHT + .55;
const Y_PER_RADIAN = PITCH / (Math.PI * 2);
const BACKGROUND = 0x0d0c0b;

const bentPlane = (theta: number, width: number, height: number, radius: number): PlaneGeometry => {
  const geometry = new PlaneGeometry(width, height, 24, 1);
  const position = geometry.attributes.position!;
  for (let index = 0; index < position.count; index += 1) {
    const u = position.getX(index);
    const v = position.getY(index);
    const angle = theta + u / radius;
    position.setXYZ(index, radius * Math.sin(angle), v - Y_PER_RADIAN * angle, radius * Math.cos(angle));
  }
  position.needsUpdate = true;
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
};

/** One segment of film base: dark, with sprocket holes and edge print. */
const filmBaseTexture = (item: BtsItem, index: number): CanvasTexture => {
  const canvas = document.createElement('canvas');
  const width = 512;
  const height = Math.round(width * STRIP_HEIGHT / SEGMENT);
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d')!;
  const gradient = context.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, 'rgb(46 30 18 / 96%)');
  gradient.addColorStop(.5, 'rgb(26 17 11 / 96%)');
  gradient.addColorStop(1, 'rgb(46 30 18 / 96%)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);

  // Perforations sit at the outer edge and the edge print just inside them,
  // both clear of the image area (the middle two thirds of the strip), so
  // nothing shows through when a hovered frame lifts off the base.
  const holeWidth = width / 16;
  const holeHeight = height * .06;
  const margin = height * .03;
  context.globalCompositeOperation = 'destination-out';
  for (let hole = 0; hole < 8; hole += 1) {
    const x = hole * (width / 8) + (width / 8 - holeWidth) / 2;
    for (const y of [margin, height - margin - holeHeight]) {
      context.beginPath();
      context.roundRect(x, y, holeWidth, holeHeight, 4);
      context.fill();
    }
  }
  context.globalCompositeOperation = 'source-over';
  context.fillStyle = 'rgb(240 154 62 / 85%)';
  context.font = `700 ${Math.round(height * .032)}px Arial, sans-serif`;
  context.textBaseline = 'middle';
  const printOffset = margin + holeHeight + height * .036;
  const topText = index % 2 ? `◂ ${item.edge}` : 'NEW WORK 5219';
  context.fillText(topText, width * .06, printOffset);
  context.fillText(`${item.time}  ◂ ${item.edge}`, width * .06, height - printOffset);

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
};

const coverFit = (texture: Texture, aspect: number): void => {
  const image = texture.image as { width: number; height: number } | undefined;
  if (!image?.width || !image.height) return;
  const imageAspect = image.width / image.height;
  if (imageAspect > aspect) {
    texture.repeat.set(aspect / imageAspect, 1);
    texture.offset.set((1 - aspect / imageAspect) / 2, 0);
  } else {
    texture.repeat.set(1, imageAspect / aspect);
    texture.offset.set(0, (1 - imageAspect / aspect) / 2);
  }
};

const pad = (value: number): string => String(value).padStart(2, '0');

export const mountReel = (root: HTMLElement): (() => void) => {
  const items = readBtsItems(root);
  const stage = root.querySelector<HTMLElement>('[data-bts-reel-stage]');
  const canvas = root.querySelector<HTMLCanvasElement>('[data-bts-reel-canvas]');
  const viewer = root.querySelector<HTMLDialogElement>('[data-bts-viewer]');
  if (!stage || !canvas || !viewer || !items.length) return () => undefined;

  const controller = new AbortController();
  const { signal } = controller;
  const { open: openViewer } = createViewer(viewer, items, signal);
  root.querySelectorAll<HTMLButtonElement>('[data-bts-reel-frame]').forEach((button) => {
    const index = Number(button.dataset.btsReelFrame);
    button.addEventListener('click', () => openViewer(index), { signal });
  });

  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch {
    root.dataset.btsReelState = 'fallback';
    return () => controller.abort();
  }

  const reduced = prefersReducedMotion();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(BACKGROUND, 0);
  const scene = new Scene();
  scene.fog = new Fog(BACKGROUND, 4.2, 10.5);
  const camera = new PerspectiveCamera(36, 1, .1, 60);
  const reel = new Group();
  scene.add(reel);

  const loader = new TextureLoader();
  loader.setCrossOrigin('anonymous');
  const anisotropy = renderer.capabilities.getMaxAnisotropy();
  const disposables: Array<{ dispose: () => void }> = [];
  const photos: Mesh[] = [];
  const photoMaterials: MeshBasicMaterial[] = [];
  const lift = items.map(() => 0);
  const lastTheta = (items.length - 1) * STEP;

  items.forEach((item, index) => {
    const theta = index * STEP;
    const baseGeometry = bentPlane(theta, SEGMENT, STRIP_HEIGHT, RADIUS);
    const baseTexture = filmBaseTexture(item, index);
    const baseMaterial = new MeshBasicMaterial({ map: baseTexture, side: DoubleSide, transparent: true, alphaTest: .4 });
    reel.add(new Mesh(baseGeometry, baseMaterial));

    const photoGeometry = bentPlane(theta, FRAME_WIDTH, FRAME_HEIGHT, RADIUS + .012);
    const photoMaterial = new MeshBasicMaterial({ color: new Color(0x222222), side: FrontSide });
    const photo = new Mesh(photoGeometry, photoMaterial);
    photo.userData.index = index;
    reel.add(photo);
    photos.push(photo);
    photoMaterials.push(photoMaterial);
    disposables.push(baseGeometry, baseTexture, baseMaterial, photoGeometry, photoMaterial);

    loader.load(item.thumb, (texture) => {
      if (signal.aborted) {
        texture.dispose();
        return;
      }
      texture.colorSpace = SRGBColorSpace;
      texture.anisotropy = anisotropy;
      coverFit(texture, FRAME_WIDTH / FRAME_HEIGHT);
      photoMaterial.map = texture;
      photoMaterial.needsUpdate = true;
      disposables.push(texture);
      requestRender();
    });
  });

  // --- State --------------------------------------------------------------
  let scrollPhi = 0;
  let dragPhi = 0;
  let phi = 0;
  let velocity = 0;
  let pointerX = 0;
  let pointerY = 0;
  let cameraX = 0;
  let cameraY = 0;
  let hovered = -1;
  let current = -1;
  let visible = false;
  let frame = 0;
  let dragging: { id: number; x: number; lastX: number; lastAt: number; moved: boolean } | null = null;
  const raycaster = new Raycaster();
  const ndc = new Vector2();

  const measureScroll = (): void => {
    const box = root.getBoundingClientRect();
    const travel = box.height - window.innerHeight;
    scrollPhi = (travel > 0 ? clamp(-box.top / travel, 0, 1) : 0) * lastTheta;
  };

  const clampDrag = (): void => {
    dragPhi = clamp(dragPhi, -.35 - scrollPhi, lastTheta + .35 - scrollPhi);
  };

  const resize = (): void => {
    const width = stage.clientWidth;
    const height = stage.clientHeight;
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    // Keep about two and a half frames across the view on any aspect ratio.
    const halfFov = (camera.fov * Math.PI) / 360;
    const fitWidth = (FRAME_WIDTH * 2.5) / 2 / (Math.tan(halfFov) * camera.aspect);
    const fitHeight = (FRAME_HEIGHT * 2.9) / 2 / Math.tan(halfFov);
    camera.position.z = RADIUS + Math.max(fitWidth, fitHeight);
    // Fog is measured from the camera, which sits much further back on a
    // portrait screen; keep the near side of the reel clear at any distance.
    const fog = scene.fog as Fog;
    fog.near = camera.position.z - RADIUS * .4;
    fog.far = camera.position.z + RADIUS * 1.9;
    camera.updateProjectionMatrix();
    requestRender();
  };

  const updateHud = (index: number): void => {
    const item = items[index];
    if (!item) return;
    const set = (selector: string, text: string): void => {
      const element = root.querySelector<HTMLElement>(selector);
      if (element) element.textContent = text;
    };
    set('[data-bts-reel-counter]', pad(index + 1));
    set('[data-bts-reel-time]', `${item.time} · ${item.department}`);
    set('[data-bts-reel-note]', item.note);
    set('[data-bts-reel-project]', [item.project, item.client].filter(Boolean).join(' · '));
  };

  const pick = (clientX: number, clientY: number): number => {
    const box = canvas.getBoundingClientRect();
    ndc.set(((clientX - box.left) / box.width) * 2 - 1, -((clientY - box.top) / box.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const hit = raycaster.intersectObjects(photos, false)[0];
    return hit ? Number(hit.object.userData.index) : -1;
  };

  const render = (time: number): void => {
    frame = 0;
    if (!dragging && Math.abs(velocity) > .00001) {
      dragPhi += velocity;
      velocity *= .92;
      clampDrag();
    }
    const targetPhi = scrollPhi + dragPhi;
    phi = reduced ? targetPhi : lerp(phi, targetPhi, .1);
    reel.rotation.y = -phi;
    reel.position.y = Y_PER_RADIAN * phi;

    // A slow sway and a little pointer parallax keep the strip alive.
    const sway = reduced ? 0 : Math.sin(time / 2400) * .05;
    cameraX = lerp(cameraX, pointerX * .5, .06);
    cameraY = lerp(cameraY, .55 + pointerY * .35, .06);
    camera.position.x = cameraX;
    camera.position.y = cameraY;
    camera.lookAt(0, sway, 0);

    const nearest = clamp(Math.round(phi / STEP), 0, items.length - 1);
    if (nearest !== current) {
      current = nearest;
      updateHud(nearest);
    }

    let settling = Math.abs(targetPhi - phi) > .0005 || Math.abs(velocity) > .00001;
    photos.forEach((photo, index) => {
      const theta = index * STEP;
      const facing = Math.cos(theta - phi);
      const emphasis = index === hovered ? 1 : index === current ? .96 : .28 + .5 * clamp(facing, 0, 1);
      const material = photoMaterials[index]!;
      const target = material.map ? emphasis : .14;
      const value = lerp(material.color.r, target, reduced ? 1 : .12);
      material.color.setScalar(value);
      const liftTarget = index === hovered ? .22 : 0;
      lift[index] = lerp(lift[index]!, liftTarget, reduced ? 1 : .14);
      photo.position.set(Math.sin(theta) * lift[index]!, 0, Math.cos(theta) * lift[index]!);
      if (Math.abs(value - target) > .002 || Math.abs(lift[index]! - liftTarget) > .002) settling = true;
    });

    renderer.render(scene, camera);
    // Keep drawing while anything is moving; the sway alone does not justify a
    // permanent loop under reduced motion.
    if (visible && (settling || !reduced || dragging)) frame = window.requestAnimationFrame(render);
  };

  function requestRender(): void {
    if (!frame && visible) frame = window.requestAnimationFrame(render);
  }

  // --- Input --------------------------------------------------------------
  canvas.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    dragging = { id: event.pointerId, x: event.clientX, lastX: event.clientX, lastAt: performance.now(), moved: false };
    velocity = 0;
  }, { signal });

  canvas.addEventListener('pointermove', (event) => {
    const box = canvas.getBoundingClientRect();
    pointerX = ((event.clientX - box.left) / box.width) * 2 - 1;
    pointerY = ((event.clientY - box.top) / box.height) * 2 - 1;
    if (dragging && dragging.id === event.pointerId) {
      const dx = event.clientX - dragging.lastX;
      if (!dragging.moved && Math.abs(event.clientX - dragging.x) > 5) {
        dragging.moved = true;
        canvas.setPointerCapture(event.pointerId);
        canvas.dataset.dragging = 'true';
      }
      if (dragging.moved) {
        const now = performance.now();
        const delta = -dx / (RADIUS * 90);
        dragPhi += delta;
        clampDrag();
        velocity = delta / Math.max(1, (now - dragging.lastAt) / 16);
        dragging.lastAt = now;
      }
      dragging.lastX = event.clientX;
    } else if (event.pointerType !== 'touch') {
      const next = pick(event.clientX, event.clientY);
      if (next !== hovered) {
        hovered = next;
        canvas.dataset.hovering = String(next >= 0);
      }
    }
    requestRender();
  }, { signal });

  const endDrag = (event: PointerEvent): void => {
    if (!dragging || dragging.id !== event.pointerId) return;
    const wasDrag = dragging.moved;
    dragging = null;
    delete canvas.dataset.dragging;
    if (!wasDrag && event.type === 'pointerup') {
      const index = pick(event.clientX, event.clientY);
      if (index >= 0) openViewer(index);
    }
    requestRender();
  };
  canvas.addEventListener('pointerup', endDrag, { signal });
  canvas.addEventListener('pointercancel', endDrag, { signal });
  canvas.addEventListener('pointerleave', () => {
    hovered = -1;
    pointerX = 0;
    pointerY = 0;
    canvas.dataset.hovering = 'false';
    requestRender();
  }, { signal });

  // Keyboard focus on the hidden index winds the reel to that frame.
  root.querySelectorAll<HTMLButtonElement>('[data-bts-reel-frame]').forEach((button) => {
    button.addEventListener('focus', () => {
      dragPhi = Number(button.dataset.btsReelFrame) * STEP - scrollPhi;
      velocity = 0;
      requestRender();
    }, { signal });
  });

  window.addEventListener('scroll', () => {
    measureScroll();
    clampDrag();
    requestRender();
  }, { passive: true, signal });

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(stage);
  const visibility = new IntersectionObserver(([entry]) => {
    visible = Boolean(entry?.isIntersecting);
    if (visible) requestRender();
  });
  visibility.observe(stage);

  measureScroll();
  phi = scrollPhi;
  resize();
  root.dataset.btsReelState = 'ready';

  return () => {
    controller.abort();
    resizeObserver.disconnect();
    visibility.disconnect();
    if (frame) window.cancelAnimationFrame(frame);
    disposables.forEach((item) => item.dispose());
    renderer.dispose();
    renderer.forceContextLoss();
    // A context-lost canvas cannot host the next renderer; swap in a fresh one.
    canvas.replaceWith(canvas.cloneNode(false));
    root.dataset.btsReelState = 'loading';
  };
};
