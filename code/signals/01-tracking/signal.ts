// 1章：読んだら覚える
// 名前はSolidの signal.ts に合わせている。

export interface Computation {
  fn: () => void;
}

export interface SignalState<T> {
  value: T;
  observers: Set<Computation>;
}

let Listener: Computation | null = null;

export function createSignal<T>(value: T) {
  const s: SignalState<T> = { value, observers: new Set() };
  const read = () => readSignal(s);
  const write = (v: T) => writeSignal(s, v);
  return [read, write] as const;
}

function readSignal<T>(s: SignalState<T>): T {
  if (Listener) s.observers.add(Listener);
  return s.value;
}

function writeSignal<T>(s: SignalState<T>, value: T) {
  s.value = value;
  for (const o of [...s.observers]) runComputation(o);
}

export function createEffect(fn: () => void) {
  runComputation({ fn });
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
