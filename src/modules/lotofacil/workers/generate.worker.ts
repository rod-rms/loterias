import { generateLotofacilPortfolio } from "../strategies/adapters";
import type { GeneratePortfolioRequest, WorkerResponseMessage } from "../../../shared/types";

type Result = Awaited<ReturnType<typeof generateLotofacilPortfolio>>;

const workerScope = globalThis as typeof globalThis & {
  postMessage(message: WorkerResponseMessage<Result>): void;
  onmessage: ((event: MessageEvent<GeneratePortfolioRequest>) => void) | null;
};

workerScope.onmessage = async (event) => {
  try {
    workerScope.postMessage({ type: "progress", stage: "preparing" });
    workerScope.postMessage({ type: "progress", stage: "optimizing" });
    const result = await generateLotofacilPortfolio(event.data);
    workerScope.postMessage({ type: "progress", stage: "evaluating" });
    workerScope.postMessage({ type: "progress", stage: "auditing" });
    workerScope.postMessage({ type: "success", result });
    workerScope.postMessage({ type: "progress", stage: "done" });
  } catch (error) {
    workerScope.postMessage({
      type: "error",
      error: {
        name: error instanceof Error ? error.name : "Error",
        message: error instanceof Error ? error.message : String(error),
        code: (error as { code?: string })?.code,
      },
    });
  }
};
