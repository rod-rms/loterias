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

/** Lay-friendly message for any failure the worker itself couldn't report
 * cleanly (crash, message-deserialization failure, failure to even start) —
 * never a stack trace or technical detail. */
const FATAL_WORKER_ERROR = {
  name: "Não foi possível concluir a geração",
  message: "Não foi possível concluir a geração. Tente novamente.",
  code: "WORKER_FATAL_ERROR",
};

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
      workerRef.current = null;

      // A generation started here can only ever update state for as long as
      // its own worker instance is the "current" one. Any event that arrives
      // after a newer generate() call has replaced it (a slow failure from a
      // worker we've already moved on from) must be ignored, so a stale
      // worker can never corrupt a newer generation's state.
      let worker: Worker;
      try {
        worker = createWorker(modality);
      } catch {
        setResult(null);
        setStage("idle");
        setError(FATAL_WORKER_ERROR);
        return;
      }
      workerRef.current = worker;
      setResult(null);
      setError(null);
      setStage("preparing");

      const isCurrent = () => workerRef.current === worker;

      const failFatally = () => {
        if (!isCurrent()) return;
        worker.terminate();
        workerRef.current = null;
        setStage("idle");
        setError(FATAL_WORKER_ERROR);
      };

      worker.onmessage = (event: MessageEvent<WorkerResponseMessage<T>>) => {
        if (!isCurrent()) return;
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
      // Uncaught exception inside the worker, or a load/runtime failure of
      // the worker script itself (e.g. the Vite-generated chunk fails to load).
      worker.onerror = () => failFatally();
      // The message posted back by the worker could not be deserialized
      // (structured-clone failure) — treated the same as a fatal failure.
      worker.onmessageerror = () => failFatally();

      try {
        worker.postMessage(request);
      } catch {
        failFatally();
      }
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
