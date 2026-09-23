// 2章：書き込みをキューに積む
// 1章からの変更：comparator、state、Effects、runUpdates、batch

export interface Computation {
  fn: () => void;
  state: number; // 0 = 最新、STALE = 古い
}

export interface SignalState<T> {
  value: T;
  observers: Set<Computation>;
  comparator?: (a: T, b: T) => boolean;
}

const STALE = 1;
let Listener: Computation | null = null;
let Effects: Computation[] | null = null;

const equalFn = <T>(a: T, b: T) => a === b;

export function createSignal<T>(
  value: T,
  options?: { equals?: false | ((a: T, b: T) => boolean) }
) {
  const s: SignalState<T> = { value, observers: new Set() };
  const equals = options?.equals;
  s.comparator = equals === false ? undefined : equals ?? equalFn;
  const read = () => readSignal(s);
  const write = (v: T) => writeSignal(s, v);
  return [read, write] as const;
}

function readSignal<T>(s: SignalState<T>): T {
  if (Listener) s.observers.add(Listener);
  return s.value;
}

function writeSignal<T>(s: SignalState<T>, value: T) {
  if (s.comparator && s.comparator(s.value, value)) return;
  s.value = value;
  runUpdates(() => {
    for (const o of s.observers) {
      if (!o.state) Effects!.push(o);
      o.state = STALE;
    }
  });
}

export function batch<T>(fn: () => T): T {
  return runUpdates(fn);
}

function runUpdates<T>(fn: () => T): T {
  if (Effects) return fn();
  Effects = [];
  try {
    const res = fn();
    completeUpdates();
    return res;
  } catch (err) {
    Effects = null;
    throw err;
  }
}

function completeUpdates() {
  const e = Effects!;
  Effects = null;
  if (e.length) runUpdates(() => runQueue(e));
}

function runQueue(queue: Computation[]) {
  for (let i = 0; i < queue.length; i++) runTop(queue[i]);
}

function runTop(node: Computation) {
  if (node.state === 0) return;
  updateComputation(node);
}

export function createEffect(fn: () => void) {
  updateComputation({ fn, state: STALE });
}

function updateComputation(node: Computation) {
  node.state = 0;
  runComputation(node);
}

function runComputation(node: Computation) {
  const listener = Listener;
  Listener = node;
  try {
    node.fn();
  } finally {
    Listener = listener;
  }
}
