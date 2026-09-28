import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createSignal,
  createEffect,
  createRoot,
  untrack,
  onMount
} from "./signal.ts";

test("untrack の中で読んだシグナルは依存にならない", () => {
  const [a, setA] = createSignal(0);
  const [b, setB] = createSignal(0);
  let runs = 0;
  createRoot(() => {
    createEffect(() => {
      a();
      untrack(() => b());
      runs++;
    });
  });
  runs = 0;
  setB(1);
  setB(2);
  assert.equal(runs, 0);
  setA(1);
  assert.equal(runs, 1);
});

test("untrack の中で例外が飛んでも、Listener は元に戻る", () => {
  const [c, setC] = createSignal(0);
  let runs = 0;
  createRoot(() => {
    createEffect(() => {
      try {
        untrack(() => {
          throw new Error("boom");
        });
      } catch {
        // 握りつぶす。ここから先でも通常どおり追跡できてほしい
      }
      c();
      runs++;
    });
  });
  runs = 0;
  setC(1);
  assert.equal(runs, 1);
});

test("onMount は一度だけ走り、読んだ値が変わっても再実行されない", () => {
  const [a, setA] = createSignal(0);
  let runs = 0;
  createRoot(() => {
    onMount(() => {
      a();
      runs++;
    });
  });
  setA(1);
  setA(2);
  assert.equal(runs, 1);
});

test("欠点：前の値を読んで書き戻すエフェクトは、自分自身に依存して無限に走る", () => {
  const [count, setCount] = createSignal(0);
  assert.throws(() => {
    createRoot(() => {
      createEffect(() => {
        setCount(count() + 1);
      });
    });
  }, RangeError);
});
