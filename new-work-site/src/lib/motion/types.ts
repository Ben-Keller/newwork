import type { PointerCapabilities } from './pointer-capability';

export type MotionCleanup = () => void;

export interface MotionEnvironment {
  addCleanup: (cleanup: MotionCleanup) => void;
  pointer: PointerCapabilities;
  reducedMotion: boolean;
  saveData: boolean;
  root: HTMLElement;
  routeKey: string;
}

export type RouteMotionInitializer = (
  environment: MotionEnvironment,
) => MotionCleanup | void;
