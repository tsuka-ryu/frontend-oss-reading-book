import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createSignal,
  createMemo,
  createEffect,
  createRoot,
  onCleanup,
  batch
} from "./signal.ts";

test("入れ子のエフェクトは、親の再実行で破棄される", () => {
  const [a, setA] = createSignal(0);
  const [b, setB] = createSignal(0);
  let inner = 0;
  createRoot(() => {
    createEffect(() => {
      a();
      createEffect(() => {
        b();
        inner++;
      });
    });
  });
  setA(1);
  setA(2);
  inner = 0;
  setB(1);
  assert.equal(inner, 1);
});

test("onCleanup は再実行の前と、破棄のときに呼ばれる", () => {
  const [a, setA] = createSignal(0);
  const log: string[] = [];
  const dispose = createRoot(dispose => {
    createEffect(() => {
      const v = a();
      log.push(`run ${v}`);
      onCleanup(() => log.push(`clean ${v}`));
    });
    return dispose;
  });
  setA(1);
  dispose();
  setA(2);
  assert.deepEqual(log, ["run 0", "clean 0", "run 1", "clean 1"]);
});

test("ルートの構築中、エフェクトは構築の後に走り、メモはその場で更新される", () => {
  const log: string[] = [];
  createRoot(() => {
    const [c, setC] = createSignal(0);
    const m = createMemo(() => c() * 10);
    createEffect(() => log.push(`effect ${c()}`));
    setC(1);
    log.push(`memo ${m()}`);
  });
  assert.deepEqual(log, ["memo 10", "effect 1"]);
});

test("子が先にキューに入っても、親が先に走り、古い子は走らない", () => {
  const [a, setA] = createSignal(0);
  const [b, setB] = createSignal(0);
  const log: string[] = [];
  createRoot(() => {
    createEffect(() => {
      const v = b();
      log.push(`parent ${v}`);
      createEffect(() => log.push(`child ${v} ${a()}`));
    });
  });
  log.length = 0;
  batch(() => {
    setA(1); // 子がキューに入る
    setB(1); // 親がキューに入る
  });
  assert.deepEqual(log, ["parent 1", "child 1 1"]);
});
