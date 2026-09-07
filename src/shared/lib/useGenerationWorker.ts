import { useCallback, useEffect, useRef, useState } from "react";
import type { GeneratePortfolioRequest, Modality, WorkerResponseMessage, WorkerStage } from "../types";

function createWorker(modality: Modality): Worker {
  if (modality === "lotofacil") {
    return new Worker(new URL("../../modules/lotofacil/workers/generate.worker.ts", import.meta.url), { type: "module" });
  }
  return new Worker(new URL("../../modules/megasena/workers/generate.worker.ts", import.meta.url), { type: "module" });
}

export interface UseGenerationWorkerState<T> {
  stage: WorkerStage | "idle";
  result: T | null;
  error: { name: string; message: string; code?: string } | null;
  isRunning: boolean;
  generate: (request: GeneratePortfolioRequest) => void;
  reset: () => void;
}

export function useGenerationWorker<T>(modality: Modality): UseGenerationWorkerState<T> {
  const workerRef = useRef<Worker | null>(null);
  const [stage, setStage] = useState<WorkerStage | "idle">("idle");
  const [result, setResult] = useState<T | null>(null);
  const [error, setError] = useState<{ name: string; message: string; code?: string } | null>(null);

  useEffect(() => {
    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, [modality]);

  const generate = useCallback(
    (request: GeneratePortfolioRequest) => {
      workerRef.current?.terminate();
      const worker = createWorker(modality);
      workerRef.current = worker;
      setResult(null);
      setError(null);
      setStage("preparing");
      worker.onmessage = (event: MessageEvent<WorkerResponseMessage<T>>) => {
        const message = event.data;
        if (message.type === "progress") {
          setStage(message.stage);
        } else if (message.type === "success") {
          setResult(message.result);
        } else if (message.type === "error") {
          setError(message.error);
          setStage("idle");
        }
      };
      worker.postMessage(request);
    },
    [modality],
  );

  const reset = useCallback(() => {
    workerRef.current?.terminate();
    workerRef.current = null;
    setStage("idle");
    setResult(null);
    setError(null);
  }, []);

  return { stage, result, error, isRunning: stage !== "idle" && stage !== "done" && !result && !error, generate, reset };
}
