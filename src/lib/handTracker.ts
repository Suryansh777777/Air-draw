import type { HandLandmarker, HandLandmarkerResult } from "@mediapipe/tasks-vision";

const WASM_URL =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";

/** Wraps MediaPipe's HandLandmarker (dynamically imported, browser-only). */
export class HandTracker {
  private landmarker: HandLandmarker | null = null;
  private lastTs = 0;

  async init(): Promise<void> {
    const { FilesetResolver, HandLandmarker } = await import(
      "@mediapipe/tasks-vision"
    );
    const vision = await FilesetResolver.forVisionTasks(WASM_URL);

    const options = {
      baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" as const },
      runningMode: "VIDEO" as const,
      numHands: 2,
      minHandDetectionConfidence: 0.5,
      minHandPresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
    };

    try {
      this.landmarker = await HandLandmarker.createFromOptions(vision, options);
    } catch {
      this.landmarker = await HandLandmarker.createFromOptions(vision, {
        ...options,
        baseOptions: { modelAssetPath: MODEL_URL, delegate: "CPU" },
      });
    }
  }

  detect(video: HTMLVideoElement, ts: number): HandLandmarkerResult | null {
    if (!this.landmarker) return null;
    if (ts <= this.lastTs) ts = this.lastTs + 1;
    this.lastTs = ts;
    return this.landmarker.detectForVideo(video, ts);
  }

  close() {
    this.landmarker?.close();
    this.landmarker = null;
  }
}
