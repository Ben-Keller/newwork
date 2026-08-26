import { describe, expect, it } from "vitest";

import { mediaVertexShader } from "../../src/lib/reel/shaders";

const PI = Math.PI;
const TAU = PI * 2;
const BANDS = 8;
const COLUMNS = 10;
const TOTAL = BANDS * COLUMNS;
const HELIX_PITCH = PI / (BANDS + 1);
const CONTACT_DRAPE_FRAMES = 3.25;
const RADIUS = 1.4;
const TILE_LENGTH = (0.27 * TAU / COLUMNS) * (RADIUS / 0.27);
const TILE_HEIGHT = TILE_LENGTH / (16 / 9);

type Point = [number, number, number];

const add = (a: Point, b: Point): Point => [
  a[0] + b[0],
  a[1] + b[1],
  a[2] + b[2],
];
const subtract = (a: Point, b: Point): Point => [
  a[0] - b[0],
  a[1] - b[1],
  a[2] - b[2],
];
const scale = (value: Point, scalar: number): Point => [
  value[0] * scalar,
  value[1] * scalar,
  value[2] * scalar,
];
const mix = (a: Point, b: Point, amount: number): Point => add(
  scale(a, 1 - amount),
  scale(b, amount),
);
const quinticHermite = (
  p0: Point,
  v0: Point,
  a0: Point,
  p1: Point,
  v1: Point,
  a1: Point,
  t: number,
) => {
  const t2 = t * t;
  const t3 = t2 * t;
  const t4 = t3 * t;
  const t5 = t4 * t;
  return add(
    add(
      add(scale(p0, 1 - 10 * t3 + 15 * t4 - 6 * t5), scale(v0, t - 6 * t3 + 8 * t4 - 3 * t5)),
      scale(a0, 0.5 * (t2 - 3 * t3 + 3 * t4 - t5)),
    ),
    add(
      add(scale(p1, 10 * t3 - 15 * t4 + 6 * t5), scale(v1, -4 * t3 + 7 * t4 - 3 * t5)),
      scale(a1, 0.5 * (t3 - 2 * t4 + t5)),
    ),
  );
};
const dot = (a: Point, b: Point) =>
  a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Point, b: Point): Point => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const length = (value: Point) => Math.hypot(...value);
const normalize = (value: Point) => scale(value, 1 / length(value));
const distance = (a: Point, b: Point) => length(subtract(a, b));

const smoother = (edge0: number, edge1: number, value: number) => {
  const t = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0)));
  return t * t * t * (t * (t * 6 - 15) + 10);
};

const sphere = (theta: number, phi: number, radius = RADIUS): Point => [
  radius * Math.cos(phi) * Math.sin(theta),
  radius * Math.sin(phi),
  radius * Math.cos(phi) * Math.cos(theta),
];

const feedCursor = (progress: number) =>
  (TOTAL - 3) * smoother(0.05, 0.365, progress)
  + 3 * smoother(0.325, 0.405, progress);

const conformance = (signedFrames: number, cursor: number) =>
  smoother(0, 0.35, cursor)
  * (1 - smoother(0, CONTACT_DRAPE_FRAMES, signedFrames));

const frameAt = (cursor: number) => {
  const theta = TAU * cursor / COLUMNS;
  const phi = -0.5 * PI + 0.5 * HELIX_PITCH
    + cursor * HELIX_PITCH / COLUMNS;
  const contact = sphere(theta, phi);
  const dTheta: Point = scale([
    Math.cos(phi) * Math.cos(theta),
    0,
    -Math.cos(phi) * Math.sin(theta),
  ], RADIUS);
  const dPhi: Point = scale([
    -Math.sin(phi) * Math.sin(theta),
    Math.cos(phi),
    -Math.sin(phi) * Math.cos(theta),
  ], RADIUS);
  const tangent = normalize(add(
    scale(dTheta, TAU * BANDS),
    scale(dPhi, BANDS * HELIX_PITCH),
  ));
  const normal = normalize(contact);
  const side = normalize(cross(normal, tangent));
  const orient = (value: Point): Point => [
    dot(value, tangent),
    dot(value, side),
    dot(value, normal),
  ];
  return { orient };
};

const parkedFrames = (signedFrames: number) =>
  Math.max(signedFrames, 0) * smoother(0, 0.05, signedFrames);

const drapedPoint = (
  sequence: number,
  localY: number,
  cursor: number,
  tile?: { slot: number; u: number },
) => {
  const frame = frameAt(cursor);
  const signedFrames = sequence - cursor;
  const band = tile
    ? Math.floor(tile.slot / COLUMNS)
    : Math.floor(sequence / COLUMNS);
  const column = tile ? tile.slot % COLUMNS : 0;
  const U = tile
    ? (column + tile.u) / COLUMNS
    : sequence / COLUMNS - Math.floor(sequence / COLUMNS);
  const V = (band + localY + 0.5) / BANDS;
  const targetPhi = -0.5 * PI + HELIX_PITCH * (BANDS * V + U);
  const targetTheta = TAU * (U - Math.floor(U));
  const target = sphere(targetTheta, targetPhi);

  const flat: Point = [
    parkedFrames(signedFrames) * TILE_LENGTH,
    localY * TILE_HEIGHT,
    RADIUS,
  ];
  if (signedFrames <= 0) return mix(flat, frame.orient(target), smoother(0, 0.35, cursor));
  if (signedFrames >= CONTACT_DRAPE_FRAMES) return flat;

  const thetaRate = TAU / COLUMNS;
  const phiRate = HELIX_PITCH / COLUMNS;
  const contactTheta = targetTheta - signedFrames * thetaRate;
  const contactPhi = targetPhi - signedFrames * phiRate;
  const contact = sphere(contactTheta, contactPhi);
  const thetaFirst: Point = scale([
    Math.cos(contactPhi) * Math.cos(contactTheta),
    0,
    -Math.cos(contactPhi) * Math.sin(contactTheta),
  ], RADIUS);
  const phiFirst: Point = scale([
    -Math.sin(contactPhi) * Math.sin(contactTheta),
    Math.cos(contactPhi),
    -Math.sin(contactPhi) * Math.cos(contactTheta),
  ], RADIUS);
  const thetaSecond: Point = scale([
    -Math.cos(contactPhi) * Math.sin(contactTheta),
    0,
    -Math.cos(contactPhi) * Math.cos(contactTheta),
  ], RADIUS);
  const thetaPhi: Point = scale([
    -Math.sin(contactPhi) * Math.cos(contactTheta),
    0,
    Math.sin(contactPhi) * Math.sin(contactTheta),
  ], RADIUS);
  const velocity = add(scale(thetaFirst, thetaRate), scale(phiFirst, phiRate));
  const acceleration = add(
    add(
      scale(thetaSecond, thetaRate * thetaRate),
      scale(thetaPhi, 2 * thetaRate * phiRate),
    ),
    scale(contact, -phiRate * phiRate),
  );
  const patch = quinticHermite(
    frame.orient(contact),
    scale(frame.orient(velocity), CONTACT_DRAPE_FRAMES),
    scale(frame.orient(acceleration), CONTACT_DRAPE_FRAMES ** 2),
    [CONTACT_DRAPE_FRAMES * TILE_LENGTH, localY * TILE_HEIGHT, RADIUS],
    [CONTACT_DRAPE_FRAMES * TILE_LENGTH, 0, 0],
    [0, 0, 0],
    signedFrames / CONTACT_DRAPE_FRAMES,
  );
  return mix(flat, patch, smoother(0, 0.35, cursor));
};

describe("reel winding contact geometry", () => {
  it("uses one continuous drape field instead of tile-local warp hinges", () => {
    expect(mediaVertexShader).toContain("CONTACT_DRAPE_FRAMES");
    expect(mediaVertexShader).toContain("quinticHermite");
    expect(mediaVertexShader).toContain("targetSource");
    expect(mediaVertexShader).not.toContain("tileIntake");
    expect(mediaVertexShader).not.toContain("edgeCollar");

    for (let boundary = 1; boundary < TOTAL; boundary += 1) {
      const cursor = Math.max(0.5, boundary - 1.4);
      for (const localY of [-0.5, -0.2, 0, 0.31, 0.5]) {
        const leftTileEdge = drapedPoint(boundary, localY, cursor, {
          slot: boundary - 1,
          u: 1,
        });
        const rightTileEdge = drapedPoint(boundary, localY, cursor, {
          slot: boundary,
          u: 0,
        });
        expect(distance(leftTileEdge, rightTileEdge)).toBeLessThan(1e-10);
      }
    }
  });

  it("lands every contacted turn directly on the preceding turn", () => {
    let contactedEdges = 0;
    for (const progress of [0.14, 0.2, 0.26, 0.3, 0.34, 0.38, 0.405]) {
      const cursor = feedCursor(progress);
      const settle = smoother(0.3, 0.405, progress);
      const sphereForm = smoother(0.27, 0.405, progress);
      const phase = TAU * smoother(0.33, 0.665, progress) * sphereForm;
      for (let band = 0; band < BANDS - 1; band += 1) {
        for (let column = 0; column < COLUMNS; column += 1) {
          for (const u of [0, 0.125, 0.5, 0.875, 1]) {
            const incomingSequence = (band + 1) * COLUMNS + column + u;
            if (conformance(incomingSequence - cursor, cursor) < 0.9999) continue;

            const U = (column + u) / COLUMNS;
            const sharedV = (band + 1) / BANDS;
            const helixPhi = -0.5 * PI
              + HELIX_PITCH * (BANDS * sharedV + U);
            const finalPhi = -0.5 * PI + PI * sharedV;
            const phi = helixPhi * (1 - settle) + finalPhi * settle;
            const previousUpperEdge = sphere(TAU * (U - Math.floor(U)) + phase, phi);
            const incomingLowerEdge = sphere(TAU * (U - Math.floor(U)) + phase, phi);

            expect(distance(previousUpperEdge, incomingLowerEdge)).toBeLessThan(1e-12);
            contactedEdges += 1;
          }
        }
      }
    }
    expect(contactedEdges).toBeGreaterThan(100);
  });

  it("is tangent-continuous at contact and at the flat end of the drape", () => {
    const cursor = 42.37;
    const localY = 0.23;
    const epsilon = 1e-4;

    for (const signedFrames of [0, CONTACT_DRAPE_FRAMES]) {
      const center = drapedPoint(cursor + signedFrames, localY, cursor);
      const before = drapedPoint(cursor + signedFrames - epsilon, localY, cursor);
      const after = drapedPoint(cursor + signedFrames + epsilon, localY, cursor);
      const derivativeBefore = scale(subtract(center, before), 1 / epsilon);
      const derivativeAfter = scale(subtract(after, center), 1 / epsilon);

      expect(distance(derivativeBefore, derivativeAfter)).toBeLessThan(0.002);
    }
  });
});
