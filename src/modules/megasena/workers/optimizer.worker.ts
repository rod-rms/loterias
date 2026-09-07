import { generateMegaSenaPortfolio } from "../domain";
import type { MegaSenaGenerationInput } from "../domain";

interface WorkerSuccess {
  ok: true;
  result: ReturnType<typeof generateMegaSenaPortfolio>;
}

interface WorkerFailure {
  ok: false;
  error: { name: string; message: string };
}

const workerScope = globalThis as typeof globalThis & {
  postMessage(message: WorkerSuccess | WorkerFailure): void;
  onmessage: ((event: MessageEvent<MegaSenaGenerationInput>) => void) | null;
};

workerScope.onmessage = (event) => {
  try {
    workerScope.postMessage({ ok: true, result: generateMegaSenaPortfolio(event.data) });
  } catch (error) {
    workerScope.postMessage({
      ok: false,
      error: {
        name: error instanceof Error ? error.name : "Error",
        message: error instanceof Error ? error.message : String(error),
      },
    });
  }
};
