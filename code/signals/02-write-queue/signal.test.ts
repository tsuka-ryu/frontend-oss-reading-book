import { test } from "node:test";
import assert from "node:assert/strict";
import { createSignal, createEffect, batch } from "./signal.ts";

test("書き込むと、読んだエフェクトが再実行される", () => {
  const [count, setCount] = createSignal(0);
  const log: number[] = [];
  createEffect(() => log.push(count()));
  setCount(1);
  assert.deepEqual(log, [0, 1]);
});

test("同じ値を書いても走らない", () => {
  const [v, setV] = createSignal(0);
  let runs = 0;
  createEffect(() => {
    runs++;
    v();
  });
  setV(0);
  assert.equal(runs, 1);
});

test("equals: false なら同じ値でも走る", () => {
  const [v, setV] = createSignal(0, { equals: false });
  let runs = 0;
  createEffect(() => {
    runs++;
    v();
  });
  setV(0);
  assert.equal(runs, 2);
});

test("batch の中の3回の書き込みは1回の実行にまとまる", () => {
  const [a, setA] = createSignal(0);
  const log: number[] = [];
  createEffect(() => log.push(a()));
  batch(() => {
    setA(1);
    setA(2);
    setA(3);
  });
  assert.deepEqual(log, [0, 3]);
});

test("batch の外の3回の書き込みは3回走る", () => {
  const [a, setA] = createSignal(0);
  const log: number[] = [];
  createEffect(() => log.push(a()));
  setA(1);
  setA(2);
  setA(3);
  assert.deepEqual(log, [0, 1, 2, 3]);
});

test("エフェクトの中の書き込みは、そのエフェクトの後で流れる", () => {
  const [a, setA] = createSignal(0);
  const [b, setB] = createSignal(0);
  const log: string[] = [];
  createEffect(() => {
    log.push("E1 start");
    setB(a() + 1);
    log.push("E1 end");
  });
  createEffect(() => log.push(`E2 ${b()}`));
  log.length = 0;
  setA(1);
  assert.deepEqual(log, ["E1 start", "E1 end", "E2 2"]);
});

test("欠点：派生値を作ると、batch の中で古い値が読める", () => {
  const [a, setA] = createSignal(1);
  const [double, setDouble] = createSignal(2);
  createEffect(() => setDouble(a() * 2));
  let seen = 0;
  batch(() => {
    setA(5);
    seen = double();
  });
  assert.equal(seen, 2); // 10 ではない
  assert.equal(double(), 10);
});
