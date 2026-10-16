export const mediaVertexShader = /* glsl */ `
  precision highp float;

  uniform float uProgress;
  uniform float uTime;
  uniform float uViewWidth;
  uniform float uViewHeight;
  uniform float uIntroTop;

  attribute float aSlot;
  attribute float aBand;
  attribute float aColumn;
  attribute float aAtlasIndex;

  varying vec2 vUv;
  varying float vAtlasIndex;
  varying vec3 vViewPosition;
  varying float vGridReveal;
  varying float vReelFrame;
  varying float vIntroTopReturn;

  const float PI = 3.141592653589793;
  const float TAU = 6.283185307179586;
  const float BANDS = 8.0;
  const float COLUMNS = 10.0;
  const float TOTAL = 80.0;
  const float REEL_TILE_ASPECT = 1.7777777778;
  const float REEL_TILE_SCALE = 0.1696460033;
  const float INTRO_PATH_SPEED = 1.536;
  const float FEED_RESERVE_FRAMES = 3.0;
  const float CONTACT_DRAPE_FRAMES = 3.25;
  const float PANEL_ROW_OFFSET = 0.032;
  const float CAMERA_Z = 7.5;

  float smoother(float edge0, float edge1, float value) {
    float t = clamp((value - edge0) / max(edge1 - edge0, 0.00001), 0.0, 1.0);
    return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
  }

  float stableSinc(float value) {
    float a = abs(value);
    if (a < 0.001) {
      float v2 = value * value;
      return 1.0 - v2 / 6.0 + v2 * v2 / 120.0;
    }
    return sin(value) / value;
  }

  vec3 spherePoint(float theta, float phi, float radius) {
    float cp = cos(phi);
    return radius * vec3(cp * sin(theta), sin(phi), cp * cos(theta));
  }

  vec3 orientInFrame(
    vec3 value,
    vec3 tangent,
    vec3 side,
    vec3 normal
  ) {
    return vec3(
      dot(value, tangent),
      dot(value, side),
      dot(value, normal)
    );
  }

  vec3 quinticHermite(
    vec3 p0,
    vec3 v0,
    vec3 a0,
    vec3 p1,
    vec3 v1,
    vec3 a1,
    float t
  ) {
    float t2 = t * t;
    float t3 = t2 * t;
    float t4 = t3 * t;
    float t5 = t4 * t;
    float h00 = 1.0 - 10.0 * t3 + 15.0 * t4 - 6.0 * t5;
    float h10 = t - 6.0 * t3 + 8.0 * t4 - 3.0 * t5;
    float h20 = 0.5 * (t2 - 3.0 * t3 + 3.0 * t4 - t5);
    float h01 = 10.0 * t3 - 15.0 * t4 + 6.0 * t5;
    float h11 = -4.0 * t3 + 7.0 * t4 - 3.0 * t5;
    float h21 = 0.5 * (t3 - 2.0 * t4 + t5);
    return h00 * p0 + h10 * v0 + h20 * a0
      + h01 * p1 + h11 * v1 + h21 * a1;
  }

  vec3 introPathPosition(
    float pathDistance,
    float crossOffset,
    float depthScale,
    float depth
  ) {
    float lowerY = -0.23 * uViewHeight * depthScale;
    float upperY = 0.25 * uViewHeight * depthScale;
    float lowerStartX = 0.02 * uViewWidth * depthScale;
    float lowerRunLength = 0.53 * uViewWidth * depthScale;
    float turnRadius = 0.5 * (upperY - lowerY);
    float turnLength = PI * turnRadius;
    float turnX = lowerStartX + lowerRunLength;
    vec2 center;
    vec2 tangent;

    if (pathDistance < lowerRunLength) {
      center = vec2(lowerStartX + pathDistance, lowerY);
      tangent = vec2(1.0, 0.0);
    } else if (pathDistance < lowerRunLength + turnLength) {
      float turnDistance = pathDistance - lowerRunLength;
      float angle = -0.5 * PI + turnDistance / max(turnRadius, 0.0001);
      center = vec2(
        turnX + turnRadius * cos(angle),
        0.5 * (lowerY + upperY) + turnRadius * sin(angle)
      );
      tangent = vec2(-sin(angle), cos(angle));
    } else {
      float upperDistance = pathDistance - lowerRunLength - turnLength;
      center = vec2(turnX - upperDistance, upperY);
      tangent = vec2(-1.0, 0.0);
    }

    vec2 crossDirection = vec2(-tangent.y, tangent.x);
    return vec3(center + crossDirection * crossOffset, depth);
  }

  void main() {
    float p = clamp(uProgress, 0.0, 1.0);
    float minView = min(uViewWidth, uViewHeight);
    float localY = uv.y - 0.5;
    float U = (aColumn + uv.x) / COLUMNS;
    float V = (aBand + uv.y) / BANDS;
    float q = (aSlot + uv.x) / TOTAL;
    float radiusSmall = 0.27 * minView;
    float openingDepthScale = (CAMERA_Z - radiusSmall) / CAMERA_Z;
    float windPrimary = smoother(0.050, 0.365, p);
    float windReserve = smoother(0.325, 0.405, p);
    float feedCursorFrames = (TOTAL - FEED_RESERVE_FRAMES) * windPrimary
      + FEED_RESERVE_FRAMES * windReserve;
    float windHead = min(feedCursorFrames / TOTAL, 1.0);

    // One revolution becomes one finished latitude band. This returns the
    // broader, more sculptural sphere build while a short intake bends
    // the flat side feed onto the real spherical surface.
    float helixPitch = PI / (BANDS + 1.0);
    // Evaluate every closed longitude from one canonical coordinate. Using
    // q here would add a whole turn per row; it is mathematically equivalent,
    // but separate sin/cos evaluations can then disagree by a few ulps at the
    // duplicated band edges.
    float surfaceTheta = TAU * fract(U);
    // The helical pitch is also the ribbon width. Therefore the upper edge of
    // turn n and the lower edge of turn n + 1 evaluate to exactly the same
    // latitude instead of crossing or relying on a depth-ordering shingle.
    // Deriving it from shared U/V makes duplicate edge vertices execute the
    // identical arithmetic as well as reaching the same analytic position.
    float helixV = BANDS * V + U;
    float phiHelix = -0.5 * PI + helixPitch * helixV;

    float headPhiCenter = -0.5 * PI
      + 0.5 * helixPitch
      + windHead * BANDS * helixPitch;
    float headTheta = TAU * BANDS * windHead;
    vec3 headPosition = spherePoint(headTheta, headPhiCenter, radiusSmall);
    vec3 dTheta = radiusSmall * vec3(
      cos(headPhiCenter) * cos(headTheta),
      0.0,
      -cos(headPhiCenter) * sin(headTheta)
    );
    vec3 dLatitude = radiusSmall * vec3(
      -sin(headPhiCenter) * sin(headTheta),
      cos(headPhiCenter),
      -sin(headPhiCenter) * cos(headTheta)
    );
    vec3 headTangent = normalize(
      dTheta * (TAU * BANDS) + dLatitude * (BANDS * helixPitch)
    );
    vec3 headNormal = normalize(headPosition);

    // This is always an orthonormal frame, so releasing the winding frame
    // into the orbit can rotate the sphere without ever shrinking it.
    float frameRelease = smoother(0.390, 0.480, p);
    vec3 frameNormal = normalize(mix(
      headNormal,
      vec3(0.0, 0.0, 1.0),
      frameRelease
    ));
    vec3 frameTangent = normalize(mix(
      headTangent,
      vec3(1.0, 0.0, 0.0),
      frameRelease
    ));
    frameTangent = normalize(
      frameTangent - frameNormal * dot(frameTangent, frameNormal)
    );
    vec3 frameSide = normalize(cross(frameNormal, frameTangent));

    float reelTileLength = REEL_TILE_SCALE * minView;
    float reelTileHeight = reelTileLength / REEL_TILE_ASPECT;
    float signedFrames = q * TOTAL - feedCursorFrames;
    // Keep the flat reference from stepping as the very first vertex leaves
    // the feed. The actual contact patch below owns the full shape change.
    float parkedFrames = max(signedFrames, 0.0)
      * smoother(0.0, 0.05, signedFrames);
    float signedDistance = parkedFrames * reelTileLength;
    float entryPhase = smoother(0.0, 0.075, p);
    float entryDistance = 0.20
      * uViewWidth
      * openingDepthScale;
    float feedDistance = feedCursorFrames * reelTileLength;
    float reelAdvance = entryPhase * entryDistance + feedDistance;
    float reelDetailFade = 1.0 - smoother(0.0, 0.018, p);
    vec3 entryOffset = vec3(
      (1.0 - entryPhase) * entryDistance,
      0.0,
      0.0
    );
    vec3 reelAttach = vec3(0.0, 0.0, radiusSmall);
    vec3 flatCenter = reelAttach
      + vec3(signedDistance, 0.0, 0.0);
    vec3 flatCross = vec3(
      0.0,
      localY * reelTileHeight,
      0.0
    );
    vec3 flatSurface = flatCenter + flatCross + entryOffset;
    // The intake is one continuous field along the reel, never a per-frame
    // hinge. A broad zone begins conforming before contact and reaches the
    // exact destination surface at signedFrames == 0.
    float windActive = smoother(0.0, 0.35, feedCursorFrames);

    // Both the helix and the final latitude grid share the same band edges, so
    // this interpolation stays watertight for the full settle.
    float settle = smoother(0.300, 0.405, p);
    float surfaceV = V;
    float finalPhi = -0.5 * PI + PI * surfaceV;
    float settledPhi = mix(phiHelix, finalPhi, settle);

    float spin = smoother(0.330, 0.665, p);
    float bandDirection = mod(aBand, 2.0) < 1.0 ? 1.0 : -1.0;
    float orbitBandTurns = 1.625 * smoother(0.405, 0.555, p);
    float openingBandTurns = (0.375 - PANEL_ROW_OFFSET)
      * smoother(0.500, 0.745, p);
    float bandTurns = orbitBandTurns + openingBandTurns;
    float globalSpinPhase = TAU * spin;
    float signedBandTurns = bandDirection * bandTurns;
    float counterSpinPhase = TAU * signedBandTurns;
    float surfacePhase = globalSpinPhase + counterSpinPhase;
    float grow = smoother(0.355, 0.575, p);
    float radiusLarge = mix(radiusSmall, 0.45 * minView, grow);
    float sphereForm = smoother(0.270, 0.405, p);
    // All turns live on one radius. There is no radial step or clip-space
    // precedence at a seam: neighboring rows simply meet on the same curve.
    float sphereRadius = radiusLarge;
    float targetTheta = surfaceTheta + surfacePhase * sphereForm;
    vec3 targetSource = spherePoint(
      targetTheta,
      settledPhi,
      sphereRadius
    );
    vec3 exactSurface = orientInFrame(
      targetSource,
      frameTangent,
      frameSide,
      frameNormal
    ) + entryOffset;

    // Construct the intake as a C2 patch between the real spherical surface
    // and the untouched flat reel. Matching position, tangent, and curvature
    // at contact makes deformation begin across the frame itself; matching
    // the flat endpoint removes the visible moving crease at the other end.
    float thetaRate = TAU / COLUMNS;
    float phiRate = (1.0 - settle) * helixPitch / COLUMNS;
    float contactTheta = targetTheta - signedFrames * thetaRate;
    float contactPhi = settledPhi - signedFrames * phiRate;
    vec3 contactTarget = spherePoint(
      contactTheta,
      contactPhi,
      sphereRadius
    );
    vec3 contactThetaFirst = sphereRadius * vec3(
      cos(contactPhi) * cos(contactTheta),
      0.0,
      -cos(contactPhi) * sin(contactTheta)
    );
    vec3 contactPhiFirst = sphereRadius * vec3(
      -sin(contactPhi) * sin(contactTheta),
      cos(contactPhi),
      -sin(contactPhi) * cos(contactTheta)
    );
    vec3 contactThetaSecond = sphereRadius * vec3(
      -cos(contactPhi) * sin(contactTheta),
      0.0,
      -cos(contactPhi) * cos(contactTheta)
    );
    vec3 contactThetaPhi = sphereRadius * vec3(
      -sin(contactPhi) * cos(contactTheta),
      0.0,
      sin(contactPhi) * sin(contactTheta)
    );
    vec3 contactPhiSecond = -contactTarget;
    vec3 contactVelocity = contactThetaFirst * thetaRate
      + contactPhiFirst * phiRate;
    vec3 contactAcceleration = contactThetaSecond * thetaRate * thetaRate
      + 2.0 * contactThetaPhi * thetaRate * phiRate
      + contactPhiSecond * phiRate * phiRate;
    float drapeT = clamp(
      signedFrames / CONTACT_DRAPE_FRAMES,
      0.0,
      1.0
    );
    float drapeSpan = CONTACT_DRAPE_FRAMES;
    vec3 patchContact = orientInFrame(
      contactTarget,
      frameTangent,
      frameSide,
      frameNormal
    ) + entryOffset;
    vec3 patchContactVelocity = orientInFrame(
      contactVelocity,
      frameTangent,
      frameSide,
      frameNormal
    ) * drapeSpan;
    vec3 patchContactAcceleration = orientInFrame(
      contactAcceleration,
      frameTangent,
      frameSide,
      frameNormal
    ) * drapeSpan * drapeSpan;
    vec3 patchFlat = reelAttach + vec3(
      CONTACT_DRAPE_FRAMES * reelTileLength,
      localY * reelTileHeight,
      0.0
    ) + entryOffset;
    vec3 patchFlatVelocity = vec3(
      CONTACT_DRAPE_FRAMES * reelTileLength,
      0.0,
      0.0
    );
    vec3 drapeSurface = quinticHermite(
      patchContact,
      patchContactVelocity,
      patchContactAcceleration,
      patchFlat,
      patchFlatVelocity,
      vec3(0.0),
      drapeT
    );
    vec3 woundSurface = signedFrames <= 0.0
      ? exactSurface
      : (signedFrames < CONTACT_DRAPE_FRAMES
        ? drapeSurface
        : flatSurface);
    vec3 sphereStage = mix(flatSurface, woundSurface, windActive);

    // On the closed sphere, integer turns are the same physical position.
    // During opening, use that equivalent turn as distance along one shared
    // track. It deliberately remains unwrapped: complete edge tiles travel
    // beyond the opposite row and create the staggered brick silhouette.
    float rowRealign = smoother(0.790, 0.840, p);
    float trackShift = bandDirection
      * (bandTurns - 2.0)
      * (1.0 - rowRealign);
    float trackU = U + trackShift;
    float unfold = smoother(0.555, 0.745, p);
    float trackLongitude = trackU - 0.5;
    float beta = TAU * (1.0 - unfold);
    float latitudeWidth = mix(
      TAU * radiusLarge * cos(finalPhi),
      uViewWidth,
      unfold
    );
    float sharedUnrollPhase = globalSpinPhase + PI * (1.0 - unfold);
    float halfArc = 0.5 * beta * trackLongitude;
    float sinInterval = trackLongitude
      * cos(sharedUnrollPhase + halfArc)
      * stableSinc(halfArc);
    float cosInterval = -trackLongitude
      * sin(sharedUnrollPhase + halfArc)
      * stableSinc(halfArc);
    vec3 unrolledSource = vec3(
      latitudeWidth * sinInterval
        + (1.0 - unfold)
          * radiusLarge
          * cos(finalPhi)
          * sin(sharedUnrollPhase),
      mix(
        radiusLarge * sin(finalPhi),
        (surfaceV - 0.5) * uViewHeight,
        unfold
      ),
      latitudeWidth * cosInterval
        + (1.0 - unfold)
          * radiusLarge
          * cos(finalPhi)
          * cos(sharedUnrollPhase)
    );
    vec3 unrolledPosition = orientInFrame(
      unrolledSource,
      frameTangent,
      frameSide,
      frameNormal
    );
    float unrollActivation = smoother(0.555, 0.561, p);
    vec3 surfacePosition = mix(sphereStage, unrolledPosition, unrollActivation);

    float contact = smoother(0.715, 0.805, p);
    float contactScale = mix(1.0, 0.86, contact);
    vec3 contactPosition = vec3(
      (trackU - 0.5) * uViewWidth * contactScale,
      (surfaceV - 0.5) * uViewHeight * contactScale,
      0.0
    );
    surfacePosition = mix(surfacePosition, contactPosition, contact);

    float fold = smoother(0.79, 0.855, p);
    float alpha = fold * 1.082104;
    float foldU = trackU;
    float panel = floor(foldU * COLUMNS);
    float panelT = foldU * COLUMNS - panel;
    float panelLength = uViewWidth * contactScale / COLUMNS;
    float foldX = -0.5 * uViewWidth * contactScale * cos(alpha)
      + (panel + panelT) * panelLength * cos(alpha);
    float foldZ = mod(panel, 2.0) < 1.0
      ? panelT * panelLength * sin(alpha)
      : (1.0 - panelT) * panelLength * sin(alpha);
    foldZ -= 0.5 * panelLength * sin(alpha);
    vec3 foldedPosition = vec3(
      foldX,
      (V - 0.5) * uViewHeight * contactScale,
      foldZ
    );
    surfacePosition = mix(surfacePosition, foldedPosition, fold);

    float cylinder = smoother(0.825, 0.890, p);
    float cylinderRadius = uViewWidth * contactScale / TAU;
    float cylinderAngle = TAU * (foldU - 0.5);
    float cylinderAxis = (V - 0.5) * uViewHeight * contactScale;
    float radialX = cylinderRadius * sin(cylinderAngle);
    float radialZ = cylinderRadius * cos(cylinderAngle);

    vec3 cylinderPosition = vec3(
      radialX,
      cylinderAxis,
      -cylinderRadius + radialZ
    );
    vec3 closurePosition = mix(surfacePosition, cylinderPosition, cylinder);

    float tunnelTilt = smoother(0.775, 0.935, p);
    float tunnelTravel = smoother(0.810, 0.995, p);
    float tunnelAngle = -0.5 * PI * tunnelTilt;
    float tunnelCos = cos(tunnelAngle);
    float tunnelSin = sin(tunnelAngle);
    float tunnelDistance = CAMERA_Z
      + cylinderRadius
      + 0.75 * uViewHeight * contactScale;
    float pivotZ = -cylinderRadius * cylinder;
    vec3 closureFromPivot = closurePosition - vec3(0.0, 0.0, pivotZ);
    surfacePosition = vec3(
      closureFromPivot.x,
      closureFromPivot.y * tunnelCos - closureFromPivot.z * tunnelSin,
      pivotZ
        + closureFromPivot.y * tunnelSin
        + closureFromPivot.z * tunnelCos
        + tunnelTravel * tunnelDistance
    );

    // The opening extension is one continuous strip: it begins as the new
    // lower-right run, rounds a broad offscreen U-turn, then returns left as
    // the original upper reel. Advancing distance moves media right along the
    // lower run and naturally carries it around into the upper run.
    float introFirstSlot = TOTAL - 2.0 * COLUMNS;
    float introTileCount = 2.0 * COLUMNS;
    float introSequence = (aSlot - introFirstSlot + uv.x) / introTileCount;
    float introLowerLength = 0.53 * uViewWidth * openingDepthScale;
    float introTurnRadius = 0.24 * uViewHeight * openingDepthScale;
    float introTurnLength = PI * introTurnRadius;
    float introUpperLength = 1.05 * uViewWidth * openingDepthScale;
    float introPathLength = introLowerLength + introTurnLength + introUpperLength;
    float introTileLength = introPathLength / introTileCount;
    float introAdvance = INTRO_PATH_SPEED * (
      entryPhase * entryDistance
        + feedCursorFrames * introTileLength
    );
    float introPathDistance = introSequence * introPathLength + introAdvance;
    float introReturnStart = introLowerLength + introTurnLength;
    vec3 introPathSurface = introPathPosition(
      introPathDistance,
      localY * introTileLength / REEL_TILE_ASPECT,
      openingDepthScale,
      radiusSmall - 0.008 * minView
    );
    surfacePosition = mix(surfacePosition, introPathSurface, uIntroTop);
    // The turn happens beyond the right edge. Once the strip returns across
    // the upper run, rotate each frame's artwork back upright; the physical
    // ribbon can wrap without changing the established image orientation.
    vIntroTopReturn = uIntroTop * step(introReturnStart, introPathDistance);

    vec4 viewPosition = modelViewMatrix * vec4(surfacePosition, 1.0);
    vec4 clipPosition = projectionMatrix * viewPosition;
    gl_Position = clipPosition;

    vUv = uv;
    vAtlasIndex = aAtlasIndex;
    vViewPosition = viewPosition.xyz;
    vGridReveal = smoother(0.755, 0.805, p) * (1.0 - smoother(0.84, 0.875, p));
    vReelFrame = reelDetailFade;
  }
`;

export const mediaFragmentShader = /* glsl */ `
  precision highp float;

  uniform sampler2D uTexture;
  uniform float uUseAtlas;
  uniform float uSourceAspect;
  uniform float uOpacity;

  varying vec2 vUv;
  varying float vAtlasIndex;
  varying vec3 vViewPosition;
  varying float vGridReveal;
  varying float vReelFrame;
  varying float vIntroTopReturn;

  vec2 atlasUv(float atlasIndex, vec2 tileUv) {
    float column = mod(atlasIndex, 10.0);
    float row = floor(atlasIndex / 10.0);
    vec2 insetStart = vec2(4.0 / 400.0, 4.0 / 225.0);
    vec2 insetSize = vec2(392.0 / 400.0, 217.0 / 225.0);
    vec2 safeUv = insetStart + clamp(tileUv, 0.0, 1.0) * insetSize;
    return vec2(
      (column + safeUv.x) / 10.0,
      (7.0 - row + safeUv.y) / 8.0
    );
  }

  vec2 coverUv(vec2 sourceUv, float sourceAspect) {
    const float destinationAspect = 1.7777777778;
    if (sourceAspect > destinationAspect) {
      sourceUv.x = 0.5 + (sourceUv.x - 0.5) * destinationAspect / sourceAspect;
    } else {
      sourceUv.y = 0.5 + (sourceUv.y - 0.5) * sourceAspect / destinationAspect;
    }
    return sourceUv;
  }

  void main() {
    vec2 displayUv = mix(
      vUv,
      vec2(1.0) - vUv,
      step(0.5, vIntroTopReturn)
    );
    vec2 sampleUv = uUseAtlas > 0.5
      ? atlasUv(vAtlasIndex, displayUv)
      : coverUv(displayUv, uSourceAspect);
    vec4 media = texture2D(uTexture, sampleUv);

    float edge = min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y));
    float contactGutter = 1.0 - smoothstep(0.006, 0.014, edge);
    float edgeAA = max(fwidth(edge), 0.001);
    float reelPerforation = 1.0 - smoothstep(
      0.025 - edgeAA,
      0.025 + edgeAA,
      edge
    );
    float inkMix = max(contactGutter * vGridReveal, reelPerforation * vReelFrame * 0.72);

    vec3 normal = normalize(cross(dFdx(vViewPosition), dFdy(vViewPosition)));
    float shapeLight = 0.88 + 0.12 * abs(dot(normal, normalize(vec3(0.12, 0.28, 1.0))));
    vec3 color = mix(media.rgb * shapeLight, vec3(0.055), inkMix);

    gl_FragColor = vec4(color, uOpacity);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export const featureVertexShader = /* glsl */ `
  precision highp float;

  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const featureFragmentShader = /* glsl */ `
  precision highp float;

  uniform sampler2D uTexture;
  uniform float uOpacity;
  uniform float uSourceAspect;
  uniform float uDestinationAspect;
  uniform vec2 uPortalCenter;
  uniform vec2 uPortalRadii;
  uniform vec2 uPortalClipCenter;
  uniform vec2 uPortalClipRadii;
  uniform float uPortalFeather;
  uniform float uFeatureScale;

  varying vec2 vUv;

  vec2 coverUv(vec2 sourceUv, float sourceAspect, float destinationAspect) {
    if (sourceAspect > destinationAspect) {
      sourceUv.x = 0.5 + (sourceUv.x - 0.5) * destinationAspect / sourceAspect;
    } else {
      sourceUv.y = 0.5 + (sourceUv.y - 0.5) * sourceAspect / destinationAspect;
    }
    return sourceUv;
  }

  float ellipseDistance(vec2 point, vec2 center, vec2 radii) {
    vec2 safeRadii = max(radii, vec2(0.0001));
    return (length((point - center) / safeRadii) - 1.0)
      * min(safeRadii.x, safeRadii.y);
  }

  void main() {
    vec2 portalUv = (vUv - 0.5)
      * vec2(uDestinationAspect, 1.0)
      * uFeatureScale;
    float openingDistance = ellipseDistance(
      portalUv,
      uPortalCenter,
      uPortalRadii
    );
    float clipDistance = ellipseDistance(
      portalUv,
      uPortalClipCenter,
      uPortalClipRadii
    );
    float openingMask = 1.0 - smoothstep(
      -uPortalFeather,
      uPortalFeather,
      openingDistance
    );
    float clipMask = 1.0 - smoothstep(
      -uPortalFeather,
      0.0,
      clipDistance
    );
    float portalMask = min(openingMask, clipMask);

    vec2 sampleUv = coverUv(vUv, uSourceAspect, uDestinationAspect);
    vec3 color = texture2D(uTexture, sampleUv).rgb;
    gl_FragColor = vec4(color, uOpacity * portalMask);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;
