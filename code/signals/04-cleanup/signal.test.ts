import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createSignal,
  createMemo,
  createEffect,
  batch
} from "./signal.ts";

test("メモは読み手が変わっても一度だけ計算される", () => {
  const [a, setA] = createSignal(1);
  let calc = 0;
  const double = createMemo(() => {
    calc++;
    return a() * 2;
  });
  createEffect(() => double());
  createEffect(() => double());
  setA(2);
  assert.equal(calc, 2);
});

test("batch の中でも、メモは読んだ時点で最新になる", () => {
  const [a, setA] = createSignal(1);
  const double = createMemo(() => a() * 2);
  createEffect(() => double());
  let seen = 0;
  batch(() => {
    setA(5);
    seen = double();
  });
  assert.equal(seen, 10);
});

test("メモのメモも、batch の中で読めば最新になる", () => {
  const [a, setA] = createSignal(1);
  const b = createMemo(() => a() * 2);
  const c = createMemo(() => b() + 1);
  createEffect(() => c());
  let seen = 0;
  batch(() => {
    setA(5);
    seen = c();
  });
  assert.equal(seen, 11);
});

test("菱形：両方の経路が揃ってから一度だけ走る", () => {
  const [a, setA] = createSignal(1);
  const b = createMemo(() => a() * 2);
  const c = createMemo(() => a() + 1);
  const log: string[] = [];
  createEffect(() => log.push(`${b()},${c()}`));
  setA(2);
  assert.deepEqual(log, ["2,2", "4,3"]);
});

test("メモの値が変わらなければ、下流は走らない", () => {
  const [a, setA] = createSignal(2);
  const isEven = createMemo(() => a() % 2 === 0);
  let runs = 0;
  createEffect(() => {
    runs++;
    isEven();
  });
  setA(4);
  assert.equal(runs, 1);
  setA(5);
  assert.equal(runs, 2);
});

test("使わなくなった依存は外れる", () => {
  const [flag, setFlag] = createSignal(true);
  const [a, setA] = createSignal(0);
  let runs = 0;
  createEffect(() => {
    runs++;
    if (flag()) a();
  });
  setFlag(false);
  setA(1);
  assert.equal(runs, 2);
  setFlag(true);
  setA(2);
  assert.equal(runs, 4);
});

test("依存が変わったメモも、読み手の線は保たれる", () => {
  const [flag, setFlag] = createSignal(true);
  const [a, setA] = createSignal(1);
  const [b, setB] = createSignal(10);
  const pick = createMemo(() => (flag() ? a() : b()));
  const log: number[] = [];
  createEffect(() => log.push(pick()));
  setFlag(false);
  setA(2); // もう読まれていない
  setB(20);
  assert.deepEqual(log, [1, 10, 20]);
});

test("欠点：入れ子のエフェクトが破棄されずに増える", () => {
  const [a, setA] = createSignal(0);
  const [b, setB] = createSignal(0);
  let inner = 0;
  createEffect(() => {
    a();
    createEffect(() => {
      b();
      inner++;
    });
  });
  setA(1);
  setA(2); // 外側が3回走り、内側は3つ作られた
  inner = 0;
  setB(1);
  assert.equal(inner, 3); // 1 であってほしい
});
