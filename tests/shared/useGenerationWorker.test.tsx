import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useGenerationWorker } from "../../src/shared/lib/useGenerationWorker";

/**
 * Deterministic fake Worker: lets tests trigger onmessage/onerror/
 * onmessageerror manually, and simulate synchronous failures from the
 * constructor or postMessage — none of which jsdom's environment (which has
 * no real Worker implementation) can exercise on its own.
 */
class FakeWorker {
  onmessage: ((e: MessageEvent) => void) | null = null;
  onerror: ((e: unknown) => void) | null = null;
  onmessageerror: ((e: unknown) => void) | null = null;
  terminate = vi.fn();
  postMessage: (msg: unknown) => void;

  constructor() {
    if (FakeWorker.nextConstructThrows) {
      FakeWorker.nextConstructThrows = false;
      throw new Error("worker module failed to load");
    }
    if (FakeWorker.nextPostMessageThrows) {
      FakeWorker.nextPostMessageThrows = false;
      this.postMessage = () => {
        throw new Error("postMessage failed synchronously");
      };
    } else {
      this.postMessage = vi.fn();
    }
    FakeWorker.instances.push(this);
  }

  static instances: FakeWorker[] = [];
  static nextConstructThrows = false;
  static nextPostMessageThrows = false;
  static reset() {
    FakeWorker.instances = [];
    FakeWorker.nextConstructThrows = false;
    FakeWorker.nextPostMessageThrows = false;
  }
}

beforeEach(() => {
  FakeWorker.reset();
  vi.stubGlobal("Worker", FakeWorker);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useGenerationWorker — fatal failure handling", () => {
  it("A) worker.onerror leaves isRunning false, populates a lay-friendly error, and terminates the worker", () => {
    const { result } = renderHook(() => useGenerationWorker<{ ok: boolean }>("lotofacil"));

    act(() => result.current.generate({ modality: "lotofacil", strategyId: "x", inputMode: "quantity", numberOfTickets: 1 }));
    expect(result.current.isRunning).toBe(true);

    const worker = FakeWorker.instances[0]!;
    act(() => worker.onerror?.(new Event("error")));

    expect(result.current.isRunning).toBe(false);
    expect(result.current.stage).toBe("idle");
    expect(result.current.error).not.toBeNull();
    expect(result.current.error?.message).toBe("Não foi possível concluir a geração. Tente novamente.");
    expect(result.current.error?.message).not.toMatch(/at \w+.*\(.*:\d+:\d+\)/); // no stack-trace-looking text
    expect(worker.terminate).toHaveBeenCalledTimes(1);
  });

  it("B) worker.onmessageerror is handled the same safe way", () => {
    const { result } = renderHook(() => useGenerationWorker<{ ok: boolean }>("megasena"));

    act(() => result.current.generate({ modality: "megasena", strategyId: "x", inputMode: "quantity", numberOfTickets: 1 }));
    const worker = FakeWorker.instances[0]!;
    act(() => worker.onmessageerror?.(new Event("messageerror")));

    expect(result.current.isRunning).toBe(false);
    expect(result.current.stage).toBe("idle");
    expect(result.current.error?.code).toBe("WORKER_FATAL_ERROR");
    expect(worker.terminate).toHaveBeenCalledTimes(1);
  });

  it("C) a synchronous failure creating the worker never leaves the hook stuck in 'preparing'", () => {
    FakeWorker.nextConstructThrows = true;
    const { result } = renderHook(() => useGenerationWorker<{ ok: boolean }>("lotofacil"));

    act(() => result.current.generate({ modality: "lotofacil", strategyId: "x", inputMode: "quantity", numberOfTickets: 1 }));

    expect(result.current.stage).not.toBe("preparing");
    expect(result.current.isRunning).toBe(false);
    expect(result.current.error).not.toBeNull();
    expect(FakeWorker.instances).toHaveLength(0);
  });

  it("D) a synchronous postMessage failure recovers safely and terminates the worker", () => {
    FakeWorker.nextPostMessageThrows = true;
    const { result } = renderHook(() => useGenerationWorker<{ ok: boolean }>("lotofacil"));

    act(() => result.current.generate({ modality: "lotofacil", strategyId: "x", inputMode: "quantity", numberOfTickets: 1 }));

    expect(result.current.isRunning).toBe(false);
    expect(result.current.stage).toBe("idle");
    expect(result.current.error).not.toBeNull();
    expect(FakeWorker.instances[0]!.terminate).toHaveBeenCalledTimes(1);
  });

  it("E) a delayed fatal event from a replaced (stale) worker never corrupts the newer generation's state", () => {
    const { result } = renderHook(() => useGenerationWorker<{ ok: boolean }>("lotofacil"));

    act(() => result.current.generate({ modality: "lotofacil", strategyId: "a", inputMode: "quantity", numberOfTickets: 1 }));
    const workerA = FakeWorker.instances[0]!;

    act(() => result.current.generate({ modality: "lotofacil", strategyId: "b", inputMode: "quantity", numberOfTickets: 1 }));
    const workerB = FakeWorker.instances[1]!;
    expect(workerA.terminate).toHaveBeenCalled(); // replaced synchronously by generate()

    // Generation B succeeds first.
    act(() => workerB.onmessage?.({ data: { type: "success", result: { ok: true } } } as MessageEvent));
    expect(result.current.result).toEqual({ ok: true });
    expect(result.current.error).toBeNull();

    // A late failure from the already-replaced worker A must be ignored entirely.
    act(() => workerA.onerror?.(new Event("error")));
    expect(result.current.result).toEqual({ ok: true });
    expect(result.current.error).toBeNull();
    expect(result.current.stage).not.toBe("idle");
  });
});
