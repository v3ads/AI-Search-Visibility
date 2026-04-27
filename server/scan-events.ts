import { EventEmitter } from "events";

/** Global emitter — ai-analysis emits events, SSE route listens */
export const scanEmitter = new EventEmitter();
scanEmitter.setMaxListeners(100);

export type ScanEvent =
  | { type: "start"; runId: number; totalPrompts: number; totalModels: number; models: string[] }
  | { type: "progress"; runId: number; completed: number; total: number; model: string; promptText: string; status: "running" | "done" | "error" }
  | { type: "complete"; runId: number; completedPrompts: number }
  | { type: "failed"; runId: number; error: string };

export function emitScanEvent(runId: number, event: ScanEvent) {
  scanEmitter.emit(`scan:${runId}`, event);
  // Also emit on a global channel so the SSE endpoint can pick it up
  scanEmitter.emit("scan", event);
}
