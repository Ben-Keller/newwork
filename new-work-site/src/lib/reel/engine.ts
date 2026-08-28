import * as THREE from "three";

import { ensureGsapPlugins, ScrollTrigger } from "../motion/client";

import {
  featureFragmentShader,
  featureVertexShader,
  mediaFragmentShader,
  mediaVertexShader,
} from "./shaders";

const BANDS = 8;
const COLUMNS = 10;
const TOTAL_SLOTS = BANDS * COLUMNS;
const CAMERA_Z = 7.5;
const CAMERA_FOV = 38;
const CONTACT_SCALE = 0.86;
const TUNNEL_CYLINDER = [0.825, 0.890] as const;
const TUNNEL_TILT = [0.775, 0.935] as const;
const TUNNEL_TRAVEL = [0.810, 0.995] as const;
const FEATURE_Z = -0.92;
const FEATURE_SCALE = 1.015;
const FEATURE_SOURCE_ASPECT = 16 / 9;
const FEATURE_REVEAL = [0.875, 0.905] as const;
const PORTAL_RIM_BLEND = 0.22;
const PORTAL_FEATHER_BLEND = 0.08;
const ASSET_FADE_DURATION = 0.65;
const PORTAL_RIM_SAMPLES = 48;
const PORTAL_FULL_COVER = 0.955;
const PORTAL_PROJECTION_NEAR = 0.25;
const PORTAL_PROJECTION_BLEND = 1.2;
const PORTAL_RIM_UNIT_SAMPLES = Array.from(
  { length: PORTAL_RIM_SAMPLES },
  (_, index) => {
    const angle = (index / PORTAL_RIM_SAMPLES) * Math.PI * 2;
    return [Math.sin(angle), Math.cos(angle)] as const;
  },
);

type Uniform = { value: number };

type SharedUniforms = {
  uProgress: Uniform;
  uTime: Uniform;
  uViewWidth: Uniform;
  uViewHeight: Uniform;
};

type MediaUniforms = SharedUniforms & {
  uTexture: {value: THREE.Texture};
  uUseAtlas: Uniform;
  uSourceAspect: Uniform;
  uIntroTop: Uniform;
  uOpacity: Uniform;
};

type FeatureUniforms = {
  uTexture: {value: THREE.Texture};
  uOpacity: Uniform;
  uSourceAspect: Uniform;
  uDestinationAspect: Uniform;
  uPortalCenter: {value: THREE.Vector2};
  uPortalRadii: {value: THREE.Vector2};
  uPortalClipCenter: {value: THREE.Vector2};
  uPortalClipRadii: {value: THREE.Vector2};
  uPortalFeather: Uniform;
  uFeatureScale: Uniform;
};

type TypedShaderMaterial<T> = THREE.ShaderMaterial & {uniforms: T};

type VideoSpec = {
  id: string;
  slot: number;
  atlasIndex: number;
  src: string;
  sourceAspect: number;
  loadAt: number;
};

type VideoRecord = {
  spec: VideoSpec;
  video: HTMLVideoElement;
  texture: THREE.VideoTexture;
  mesh: THREE.Mesh;
  material: TypedShaderMaterial<MediaUniforms>;
  ready: boolean;
  loadStarted: boolean;
  fadeProgress: number;
  loadedData: () => void;
  error: () => void;
};

export type ExperienceController = {
  destroy: () => void;
  refresh: () => void;
};

export type ExperienceOptions = {
  mount: HTMLElement;
  scrollRoot: HTMLElement;
  assetBase: string;
  onReady: () => void;
  onFailure: () => void;
  onProgress: (progress: number) => void;
};

const VIDEO_SPECS: VideoSpec[] = [
  {
    id: "adobe",
    slot: 21,
    atlasIndex: 0,
    src: "/media/video-previews/anjali/adobe-what-whack-wears-gallery-cut-08s.mp4",
    sourceAspect: 16 / 9,
    loadAt: 0,
  },
  {
    id: "humu",
    slot: 28,
    atlasIndex: 40,
    src: "/media/video-previews/oliver/humu-meet-holly/gallery-cut-08s.mp4",
    sourceAspect: 16 / 9,
    loadAt: 0.18,
  },
  {
    id: "mercury-josh",
    slot: 34,
    atlasIndex: 49,
    src: "/media/video-previews/oliver/mercury-josh-fabian/gallery-cut-08s.mp4",
    sourceAspect: 16 / 9,
    loadAt: 0.34,
  },
  {
    id: "olympics",
    slot: 45,
    atlasIndex: 56,
    src: "/media/video-previews/oliver/olympics-toyota-alex-massailas/gallery-cut-08s.mp4",
    sourceAspect: 16 / 9,
    loadAt: 0.52,
  },
  {
    id: "tour",
    slot: 52,
    atlasIndex: 61,
    src: "/media/video-previews/oliver/tour-de-france/gallery-cut-08s.mp4",
    sourceAspect: 16 / 9,
    loadAt: 0.66,
  },
  {
    id: "brava",
    slot: 58,
    atlasIndex: 5,
    src: "/media/video-previews/michael/michael_brava_clip.mp4",
    sourceAspect: 1,
    loadAt: 0.78,
  },
];

const VIDEO_LOAD_LOOKAHEAD = 0.12;

const smoother = (edge0: number, edge1: number, value: number) => {
  const t = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0)));
  return t * t * t * (t * (t * 6 - 15) + 10);
};

const loadTexture = (url: string) =>
  new Promise<THREE.Texture>((resolve, reject) => {
    new THREE.TextureLoader().load(url, resolve, undefined, reject);
  });

function createAtlasMap() {
  const map = Array.from(
    { length: TOTAL_SLOTS },
    (_, slot) => (slot * 37) % TOTAL_SLOTS,
  );

  for (const spec of VIDEO_SPECS) {
    const existingSlot = map.indexOf(spec.atlasIndex);
    if (existingSlot < 0) throw new Error(`Atlas index ${spec.atlasIndex} is unavailable.`);
    const displacedIndex = map[spec.slot]!;
    map[spec.slot] = spec.atlasIndex;
    map[existingSlot] = displacedIndex;
  }

  return map;
}

function createMediaGeometry(
  slots: number[],
  atlasMap: number[],
  mobile: boolean,
) {
  const horizontalSegments = mobile ? 16 : 24;
  const verticalSegments = mobile ? 10 : 14;
  const verticesPerTile =
    (horizontalSegments + 1) * (verticalSegments + 1);

  const positions: number[] = [];
  const uvs: number[] = [];
  const slotValues: number[] = [];
  const bandValues: number[] = [];
  const columnValues: number[] = [];
  const atlasValues: number[] = [];
  const indices: number[] = [];

  slots.forEach((slot, tileIndex) => {
    const band = Math.floor(slot / COLUMNS);
    const column = slot % COLUMNS;
    const vertexOffset = tileIndex * verticesPerTile;

    for (let y = 0; y <= verticalSegments; y += 1) {
      const v = y / verticalSegments;
      for (let x = 0; x <= horizontalSegments; x += 1) {
        const u = x / horizontalSegments;
        positions.push(u - 0.5, v - 0.5, 0);
        uvs.push(u, v);
        slotValues.push(slot);
        bandValues.push(band);
        columnValues.push(column);
        atlasValues.push(atlasMap[slot]!);
      }
    }

    for (let y = 0; y < verticalSegments; y += 1) {
      for (let x = 0; x < horizontalSegments; x += 1) {
        const rowWidth = horizontalSegments + 1;
        const a = vertexOffset + y * rowWidth + x;
        const b = a + 1;
        const c = a + rowWidth;
        const d = c + 1;
        indices.push(a, b, d, a, d, c);
      }
    }
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setAttribute(
    "aSlot",
    new THREE.Float32BufferAttribute(slotValues, 1),
  );
  geometry.setAttribute(
    "aBand",
    new THREE.Float32BufferAttribute(bandValues, 1),
  );
  geometry.setAttribute(
    "aColumn",
    new THREE.Float32BufferAttribute(columnValues, 1),
  );
  geometry.setAttribute(
    "aAtlasIndex",
    new THREE.Float32BufferAttribute(atlasValues, 1),
  );
  geometry.setIndex(indices);
  geometry.boundingSphere = new THREE.Sphere(
    new THREE.Vector3(),
    100,
  );
  return geometry;
}

function createMediaMaterial(
  texture: THREE.Texture,
  sharedUniforms: SharedUniforms,
  useAtlas: boolean,
  sourceAspect = 16 / 9,
  introTop = false,
) : TypedShaderMaterial<MediaUniforms> {
  const uniforms: MediaUniforms = {
      ...sharedUniforms,
      uTexture: { value: texture },
      uUseAtlas: { value: useAtlas ? 1 : 0 },
      uSourceAspect: { value: sourceAspect },
      uIntroTop: { value: introTop ? 1 : 0 },
      uOpacity: { value: useAtlas ? 1 : 0 },
  };
  return new THREE.ShaderMaterial({
    uniforms,
    vertexShader: mediaVertexShader,
    fragmentShader: mediaFragmentShader,
    side: THREE.DoubleSide,
    depthTest: true,
    depthWrite: useAtlas,
    depthFunc: THREE.LessEqualDepth,
    transparent: !useAtlas,
  }) as TypedShaderMaterial<MediaUniforms>;
}

function createFeatureSurface(texture: THREE.Texture) {
  const geometry = new THREE.PlaneGeometry(1, 1);
  const uniforms: FeatureUniforms = {
    uTexture: { value: texture },
    uOpacity: { value: 0 },
    uSourceAspect: { value: FEATURE_SOURCE_ASPECT },
    uDestinationAspect: { value: 1 },
    uPortalCenter: { value: new THREE.Vector2() },
    uPortalRadii: { value: new THREE.Vector2(0.0001, 0.0001) },
    uPortalClipCenter: { value: new THREE.Vector2() },
    uPortalClipRadii: { value: new THREE.Vector2(0.0001, 0.0001) },
    uPortalFeather: { value: 0.006 },
    uFeatureScale: { value: FEATURE_SCALE },
  };
  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: featureVertexShader,
    fragmentShader: featureFragmentShader,
    side: THREE.DoubleSide,
    transparent: true,
    // The portal is a backdrop seen through the reel opening. Keep it in the
    // cylinder's depth field so the exact media geometry always wins at the
    // rim; the soft ellipse only limits the backdrop and can never cut into
    // the foreground cylinder.
    depthTest: true,
    depthFunc: THREE.LessEqualDepth,
    depthWrite: false,
  }) as TypedShaderMaterial<FeatureUniforms>;
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  mesh.renderOrder = 3;
  return { mesh, material, geometry, uniforms };
}

export async function createExperience(
  options: ExperienceOptions,
): Promise<ExperienceController> {
  ensureGsapPlugins();
  const assetBase = options.assetBase.endsWith("/")
    ? options.assetBase
    : `${options.assetBase}/`;
  const assetUrl = (path: string) => `${assetBase}${path.replace(/^\/+/, "")}`;

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    powerPreference: "high-performance",
    preserveDrawingBuffer: false,
  });
  renderer.setClearColor(0xf3f0e8, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.domElement.className = "reel-media-canvas";
  renderer.domElement.setAttribute("aria-hidden", "true");
  renderer.domElement.tabIndex = -1;
  options.mount.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf3f0e8);
  const camera = new THREE.PerspectiveCamera(
    CAMERA_FOV,
    1,
    0.05,
    50,
  );
  camera.position.set(0, 0, CAMERA_Z);

  const mobile = window.matchMedia("(max-width: 720px)").matches;
  const atlasMap = createAtlasMap();
  const sharedUniforms: SharedUniforms = {
    uProgress: { value: 0 },
    uTime: { value: 0 },
    uViewWidth: { value: 1 },
    uViewHeight: { value: 1 },
  };

  let atlasTexture: THREE.Texture;
  let featurePoster: THREE.Texture;
  try {
    [atlasTexture, featurePoster] = await Promise.all([
      loadTexture(assetUrl("media/atlas-grid.webp")),
      loadTexture(
        assetUrl("media/images/oliver/olympics-toyota-alex-massailas/featured-frame-6.webp"),
      ),
    ]);
  } catch (error) {
    renderer.dispose();
    renderer.domElement.remove();
    throw error;
  }

  atlasTexture.colorSpace = THREE.SRGBColorSpace;
  atlasTexture.minFilter = THREE.LinearMipmapLinearFilter;
  atlasTexture.magFilter = THREE.LinearFilter;
  atlasTexture.anisotropy = Math.min(
    8,
    renderer.capabilities.getMaxAnisotropy(),
  );
  featurePoster.colorSpace = THREE.SRGBColorSpace;
  featurePoster.minFilter = THREE.LinearFilter;
  featurePoster.magFilter = THREE.LinearFilter;

  const baseGeometry = createMediaGeometry(
    Array.from({ length: TOTAL_SLOTS }, (_, index) => index),
    atlasMap,
    mobile,
  );
  const baseMaterial = createMediaMaterial(
    atlasTexture,
    sharedUniforms,
    true,
  );
  const baseMesh = new THREE.Mesh(baseGeometry, baseMaterial);
  baseMesh.frustumCulled = false;
  baseMesh.renderOrder = 1;
  scene.add(baseMesh);

  const introPathSlots = Array.from(
    { length: COLUMNS * 2 },
    (_, index) => TOTAL_SLOTS - COLUMNS * 2 + index,
  );
  const introPathGeometry = createMediaGeometry(
    introPathSlots,
    atlasMap,
    mobile,
  );
  const introPathMaterial = createMediaMaterial(
    atlasTexture,
    sharedUniforms,
    true,
    16 / 9,
    true,
  );
  const introPathMesh = new THREE.Mesh(introPathGeometry, introPathMaterial);
  introPathMesh.frustumCulled = false;
  introPathMesh.renderOrder = 0;
  scene.add(introPathMesh);

  const featureGroup = new THREE.Group();
  const feature = createFeatureSurface(featurePoster);
  featureGroup.add(feature.mesh);
  featureGroup.position.z = FEATURE_Z;
  featureGroup.visible = false;
  scene.add(featureGroup);

  const requestedVideos = mobile
    ? VIDEO_SPECS.filter((spec) => spec.id === "adobe" || spec.id === "olympics")
    : VIDEO_SPECS;
  const videoRecords: VideoRecord[] = [];

  for (const spec of requestedVideos) {
    const video = document.createElement("video");
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.preload = "auto";
    video.setAttribute("playsinline", "");
    video.setAttribute("muted", "");
    video.disablePictureInPicture = true;

    const texture = new THREE.VideoTexture(video);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;

    const geometry = createMediaGeometry([spec.slot], atlasMap, mobile);
    const material = createMediaMaterial(
      texture,
      sharedUniforms,
      false,
      spec.sourceAspect,
    );
    const mesh = new THREE.Mesh(geometry, material);
    mesh.frustumCulled = false;
    mesh.renderOrder = 2;
    mesh.visible = false;
    scene.add(mesh);

    const record: VideoRecord = {
      spec,
      video,
      texture,
      mesh,
      material,
      ready: false,
      loadStarted: false,
      fadeProgress: 0,
      loadedData: () => undefined,
      error: () => undefined,
    };
    record.loadedData = () => {
      record.ready = true;
      record.fadeProgress = 0;
      material.uniforms.uOpacity.value = 0;
      mesh.visible = true;
      if (spec.id === "olympics") {
        feature.uniforms.uTexture.value = texture;
      }
      void video.play().catch(() => undefined);
    };
    record.error = () => {
      record.ready = false;
      record.fadeProgress = 0;
      material.uniforms.uOpacity.value = 0;
      mesh.visible = false;
    };
    video.addEventListener("loadeddata", record.loadedData);
    video.addEventListener("error", record.error);
    videoRecords.push(record);
  }

  let destroyed = false;
  const startVideoLoads = (progress: number) => {
    if (destroyed) return;
    const loadThrough = Math.min(1, progress + VIDEO_LOAD_LOOKAHEAD);
    for (const record of videoRecords) {
      if (record.loadStarted || record.spec.loadAt > loadThrough) continue;
      record.loadStarted = true;
      record.video.src = assetUrl(record.spec.src);
      record.video.load();
    }
  };

  let width = 1;
  let height = 1;
  let pixelRatio = Math.min(
    window.devicePixelRatio || 1,
    mobile ? 1.2 : 1.65,
  );

  const resize = () => {
    const bounds = options.mount.getBoundingClientRect();
    width = Math.max(1, Math.round(bounds.width));
    height = Math.max(1, Math.round(bounds.height));
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(width, height, false);

    const viewHeight =
      2 * CAMERA_Z * Math.tan(THREE.MathUtils.degToRad(CAMERA_FOV * 0.5));
    const viewWidth = viewHeight * camera.aspect;
    sharedUniforms.uViewWidth.value = viewWidth;
    sharedUniforms.uViewHeight.value = viewHeight;
    const featureDistance = CAMERA_Z - FEATURE_Z;
    const featureViewHeight =
      2 * featureDistance * Math.tan(THREE.MathUtils.degToRad(CAMERA_FOV * 0.5));
    const featureViewWidth = featureViewHeight * camera.aspect;
    feature.mesh.scale.set(
      featureViewWidth * FEATURE_SCALE,
      featureViewHeight * FEATURE_SCALE,
      1,
    );
    feature.uniforms.uDestinationAspect.value = camera.aspect;
  };
  resize();

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(options.mount);

  let targetProgress = 0;
  let displayProgress = 0;
  let raf = 0;
  let inView = true;
  let lastTime = performance.now();
  let frameAccumulator = 0;
  let frameSamples = 0;
  let qualityReduced = false;
  const portalZero = new THREE.Vector2();
  const portalCover = new THREE.Vector2();
  const nearRimCenter = new THREE.Vector2();
  const nearRimRadii = new THREE.Vector2();
  const nearRimRawCenter = new THREE.Vector2();
  const nearRimRawRadii = new THREE.Vector2();
  const farRimCenter = new THREE.Vector2();
  const farRimRadii = new THREE.Vector2();
  const portalCenter = new THREE.Vector2();
  const portalRadii = new THREE.Vector2();
  const clipRadii = new THREE.Vector2();

  const updateFeature = (progress: number) => {
    const reveal = smoother(FEATURE_REVEAL[0], FEATURE_REVEAL[1], progress);
    if (progress < FEATURE_REVEAL[0] - 0.01) {
      featureGroup.visible = false;
      feature.uniforms.uOpacity.value = 0;
      return;
    }

    const coverRadius = 0.5 * Math.hypot(camera.aspect, 1) + 0.03;
    portalCover.set(coverRadius, coverRadius);
    if (progress >= PORTAL_FULL_COVER) {
      featureGroup.visible = true;
      feature.uniforms.uOpacity.value = reveal;
      feature.uniforms.uPortalCenter.value.set(0, 0);
      feature.uniforms.uPortalRadii.value.set(
        coverRadius,
        coverRadius,
      );
      feature.uniforms.uPortalClipCenter.value.set(0, 0);
      feature.uniforms.uPortalClipRadii.value.set(
        coverRadius,
        coverRadius,
      );
      feature.uniforms.uPortalFeather.value = 0.001;
      return;
    }

    const cylinder = smoother(
      TUNNEL_CYLINDER[0],
      TUNNEL_CYLINDER[1],
      progress,
    );
    const tilt = smoother(TUNNEL_TILT[0], TUNNEL_TILT[1], progress);
    const travel = smoother(TUNNEL_TRAVEL[0], TUNNEL_TRAVEL[1], progress);
    const viewWidth = sharedUniforms.uViewWidth.value;
    const viewHeight = sharedUniforms.uViewHeight.value;
    const cylinderRadius = (viewWidth * CONTACT_SCALE) / (Math.PI * 2);
    const cylinderLength = viewHeight * CONTACT_SCALE;
    const tunnelDistance =
      CAMERA_Z + cylinderRadius + 0.75 * cylinderLength;
    const pivotZ = -cylinderRadius * cylinder;
    const tunnelAngle = -0.5 * Math.PI * tilt;
    const tunnelCos = Math.cos(tunnelAngle);
    const tunnelSin = Math.sin(tunnelAngle);
    const tanHalfFov = Math.tan(THREE.MathUtils.degToRad(CAMERA_FOV * 0.5));
    const projectRimEllipse = (
      axis: number,
      center: THREE.Vector2,
      radii: THREE.Vector2,
      rawCenter?: THREE.Vector2,
      rawRadii?: THREE.Vector2,
    ) => {
      let minX = Infinity;
      let maxX = -Infinity;
      let minY = Infinity;
      let maxY = -Infinity;
      let minCameraDistance = Infinity;

      for (const [unitX, unitZ] of PORTAL_RIM_UNIT_SAMPLES) {
        const radialX = cylinderRadius * unitX;
        const radialZ = cylinderRadius * unitZ;
        const worldY = axis * tunnelCos - radialZ * tunnelSin;
        const worldZ = pivotZ
          + axis * tunnelSin
          + radialZ * tunnelCos
          + travel * tunnelDistance;
        const cameraDistance = CAMERA_Z - worldZ;
        minCameraDistance = Math.min(minCameraDistance, cameraDistance);

        const projectionScale = 2
          * Math.max(cameraDistance, PORTAL_PROJECTION_NEAR)
          * tanHalfFov;
        const projectedX = radialX / projectionScale;
        const projectedY = worldY / projectionScale;
        minX = Math.min(minX, projectedX);
        maxX = Math.max(maxX, projectedX);
        minY = Math.min(minY, projectedY);
        maxY = Math.max(maxY, projectedY);
      }

      const coverBlend = 1 - smoother(
        PORTAL_PROJECTION_NEAR,
        PORTAL_PROJECTION_BLEND,
        minCameraDistance,
      );
      const centerX = 0.5 * (minX + maxX);
      const centerY = 0.5 * (minY + maxY);
      const radiusX = Math.max(0.0001, 0.5 * (maxX - minX));
      const radiusY = Math.max(0.0001, 0.5 * (maxY - minY));
      rawCenter?.set(centerX, centerY);
      rawRadii?.set(radiusX, radiusY);
      center.set(
        centerX,
        centerY,
      ).lerp(portalZero, coverBlend);
      radii.set(
        Math.min(radiusX, coverRadius),
        Math.min(radiusY, coverRadius),
      ).lerp(portalCover, coverBlend);
    };
    projectRimEllipse(
      -0.5 * cylinderLength,
      nearRimCenter,
      nearRimRadii,
      nearRimRawCenter,
      nearRimRawRadii,
    );
    projectRimEllipse(
      0.5 * cylinderLength,
      farRimCenter,
      farRimRadii,
    );
    portalCenter.copy(farRimCenter).lerp(
      nearRimCenter,
      PORTAL_RIM_BLEND,
    );
    portalRadii.copy(farRimRadii).lerp(
      nearRimRadii,
      PORTAL_RIM_BLEND,
    );
    const rimSpan = Math.max(
      nearRimRadii.x - farRimRadii.x,
      nearRimRadii.y - farRimRadii.y,
      nearRimCenter.distanceTo(farRimCenter),
    );
    const portalFeather = THREE.MathUtils.clamp(
      rimSpan * PORTAL_FEATHER_BLEND,
      0.001,
      0.014,
    );
    clipRadii.copy(nearRimRawRadii).subScalar(portalFeather * 0.75);
    clipRadii.set(
      Math.max(0.0001, clipRadii.x),
      Math.max(0.0001, clipRadii.y),
    );
    const viewportHalfWidth = 0.5 * camera.aspect;
    const normalizedViewportX = (
      viewportHalfWidth + Math.abs(nearRimRawCenter.x)
    ) / clipRadii.x;
    const normalizedViewportY = (
      0.5 + Math.abs(nearRimRawCenter.y)
    ) / clipRadii.y;
    const clipContainsViewport = normalizedViewportX * normalizedViewportX
      + normalizedViewportY * normalizedViewportY <= 1;
    if (clipContainsViewport) {
      nearRimRawCenter.set(0, 0);
      clipRadii.copy(portalCover);
    }

    featureGroup.visible = reveal > 0.001;
    feature.uniforms.uOpacity.value = reveal;
    feature.uniforms.uPortalCenter.value.copy(portalCenter);
    feature.uniforms.uPortalRadii.value.copy(portalRadii);
    feature.uniforms.uPortalClipCenter.value.copy(nearRimRawCenter);
    feature.uniforms.uPortalClipRadii.value.copy(clipRadii);
    feature.uniforms.uPortalFeather.value = portalFeather;
  };

  const render = (now: number) => {
    if (destroyed || !inView || document.hidden) {
      raf = 0;
      return;
    }

    const rawDelta = Math.min(100, Math.max(0.1, now - lastTime));
    const deltaSeconds = Math.min(rawDelta / 1000, 1 / 30);
    lastTime = now;
    displayProgress +=
      (targetProgress - displayProgress) * (1 - Math.exp(-12 * deltaSeconds));
    if (Math.abs(targetProgress - displayProgress) < 0.00002) {
      displayProgress = targetProgress;
    }

    sharedUniforms.uProgress.value = displayProgress;
    sharedUniforms.uTime.value += deltaSeconds;
    for (const record of videoRecords) {
      if (!record.ready || !record.mesh.visible || record.fadeProgress >= 1) continue;
      record.fadeProgress = Math.min(
        1,
        record.fadeProgress + deltaSeconds / ASSET_FADE_DURATION,
      );
      record.material.uniforms.uOpacity.value = smoother(0, 1, record.fadeProgress);
    }
    updateFeature(displayProgress);
    options.onProgress(displayProgress);
    renderer.render(scene, camera);

    if (!qualityReduced) {
      frameAccumulator += rawDelta;
      frameSamples += 1;
      if (frameSamples >= 120) {
        const averageFrame = frameAccumulator / frameSamples;
        if (averageFrame > 22 && pixelRatio > 1) {
          pixelRatio = Math.max(1, pixelRatio - 0.28);
          qualityReduced = true;
          resize();
          const removableVideos = videoRecords.slice(mobile ? 1 : 4);
          for (const record of removableVideos) {
            record.video.pause();
            record.mesh.visible = false;
          }
        }
        frameAccumulator = 0;
        frameSamples = 0;
      }
    }

    raf = requestAnimationFrame(render);
  };

  const startLoop = () => {
    if (!raf && !destroyed && inView && !document.hidden) {
      lastTime = performance.now();
      raf = requestAnimationFrame(render);
    }
  };

  const playVideos = () => {
    if (!inView || document.hidden) return;
    for (const record of videoRecords) {
      if (record.ready && record.mesh.visible) {
        void record.video.play().catch(() => undefined);
      }
    }
  };

  const pauseVideos = () => {
    for (const record of videoRecords) record.video.pause();
  };

  const intersectionObserver = new IntersectionObserver(
    ([entry]) => {
      if (!entry) return;
      inView = entry.isIntersecting;
      if (inView) {
        playVideos();
        startLoop();
      } else {
        pauseVideos();
      }
    },
    { rootMargin: "100px" },
  );
  intersectionObserver.observe(options.scrollRoot);

  const onVisibilityChange = () => {
    if (document.hidden) {
      pauseVideos();
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    } else {
      playVideos();
      startLoop();
    }
  };
  document.addEventListener("visibilitychange", onVisibilityChange);

  const onUserGesture = () => {
    playVideos();
  };
  window.addEventListener("pointerdown", onUserGesture, { passive: true });
  window.addEventListener("touchstart", onUserGesture, { passive: true });

  const onContextLost = (event: Event) => {
    event.preventDefault();
    options.onFailure();
  };
  renderer.domElement.addEventListener("webglcontextlost", onContextLost);

  try {
    await renderer.compileAsync(scene, camera);
  } catch {
    renderer.compile(scene, camera);
  }

  // Paint the exact opening geometry while the loading placeholder still sits
  // above the canvas. Only reveal the canvas after the browser has had a frame
  // to composite it, so the two identically placed reels exchange in place.
  sharedUniforms.uProgress.value = 0;
  sharedUniforms.uTime.value = 0;
  updateFeature(0);
  options.onProgress(0);
  renderer.render(scene, camera);
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

  // onReady expands the root from its loading height to the full narrative
  // scroll range after the opening frame is already visible.
  options.onReady();
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  // The atlas already supplies the opening frames. Let the first WebGL scene
  // become interactive before video networking and decoding begin, then
  // progressively replace those stills as each clip becomes ready.
  startVideoLoads(0);

  const scrollTrigger = ScrollTrigger.create({
    trigger: options.scrollRoot,
    start: "top top",
    end: "bottom bottom",
    invalidateOnRefresh: true,
    onUpdate: (self) => {
      targetProgress = self.progress;
      startVideoLoads(self.progress);
      startLoop();
    },
  });
  ScrollTrigger.refresh();
  targetProgress = scrollTrigger.progress;
  startVideoLoads(targetProgress);
  displayProgress = targetProgress;
  updateFeature(displayProgress);
  options.onProgress(displayProgress);
  playVideos();
  startLoop();

  return {
    refresh: () => {
      ScrollTrigger.refresh();
      targetProgress = scrollTrigger.progress;
      startVideoLoads(targetProgress);
      startLoop();
    },
    destroy: () => {
      if (destroyed) return;
      destroyed = true;
      if (raf) cancelAnimationFrame(raf);
      scrollTrigger.kill();
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pointerdown", onUserGesture);
      window.removeEventListener("touchstart", onUserGesture);
      renderer.domElement.removeEventListener("webglcontextlost", onContextLost);

      for (const record of videoRecords) {
        record.video.pause();
        record.video.removeEventListener("loadeddata", record.loadedData);
        record.video.removeEventListener("error", record.error);
        record.video.removeAttribute("src");
        record.video.load();
        scene.remove(record.mesh);
        record.texture.dispose();
        record.material.dispose();
        record.mesh.geometry.dispose();
      }

      scene.remove(baseMesh, introPathMesh, featureGroup);
      baseGeometry.dispose();
      baseMaterial.dispose();
      introPathGeometry.dispose();
      introPathMaterial.dispose();
      atlasTexture.dispose();
      featurePoster.dispose();
      feature.geometry.dispose();
      feature.material.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    },
  };
}
