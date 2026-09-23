import { test } from "node:test";
import assert from "node:assert/strict";
import { createSignal, createEffect } from "./signal.ts";

test("書き込むと、読んだエフェクトが再実行される", () => {
  const [count, setCount] = createSignal(0);
  const log: number[] = [];
  createEffect(() => log.push(count()));
  setCount(1);
  setCount(2);
  assert.deepEqual(log, [0, 1, 2]);
});

test("エフェクトの外での読み取りは購読しない", () => {
  const [count, setCount] = createSignal(0);
  count();
  let runs = 0;
  createEffect(() => runs++);
  setCount(1);
  assert.equal(runs, 1);
});

test("入れ子のエフェクトの後も、外側の読み取りは外側に記録される", () => {
  const [a, setA] = createSignal(0);
  const [b] = createSignal(0);
  let outer = 0;
  createEffect(() => {
    outer++;
    createEffect(() => b());
    a();
  });
  setA(1);
  assert.equal(outer, 2);
});

test("同じシグナルを何度読んでも、1回の書き込みで1回だけ走る", () => {
  const [v, setV] = createSignal(0);
  let runs = 0;
  createEffect(() => {
    runs++;
    for (let i = 0; i < 1000; i++) v();
  });
  setV(1);
  assert.equal(runs, 2);
});

test("欠点：同じ値を書いても走る", () => {
  const [v, setV] = createSignal(0);
  let runs = 0;
  createEffect(() => {
    runs++;
    v();
  });
  setV(0);
  assert.equal(runs, 2);
});

test("まとめる手段がないので、3回書くと3回走る", () => {
  const [a, setA] = createSignal(0);
  const log: number[] = [];
  createEffect(() => log.push(a()));
  setA(1);
  setA(2);
  setA(3);
  assert.deepEqual(log, [0, 1, 2, 3]);
});
