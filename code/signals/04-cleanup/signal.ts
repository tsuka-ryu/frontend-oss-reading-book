// 4章：依存の付け替え
// 3章からの変更：cleanNode（再実行の前に依存を外す）

export interface SignalState<T = any> {
  value: T;
  observers: Set<Computation>;
  comparator?: (a: T, b: T) => boolean;
}

export interface Computation {
  fn: (v: any) => any;
  state: number; // 0 / STALE / PENDING
  pure: boolean; // メモなら true、エフェクトなら false
  sources: Set<SignalState>;
  value?: any;
  observers?: Set<Computation>;
  comparator?: (a: any, b: any) => boolean;
}

type Memo<T = any> = Computation & SignalState<T>;
type Options<T> = { equals?: false | ((a: T, b: T) => boolean) };

const STALE = 1;
const PENDING = 2;
let Listener: Computation | null = null;
let Updates: Computation[] | null = null;
let Effects: Computation[] | null = null;

const equalFn = <T>(a: T, b: T) => a === b;
const comparatorOf = <T>(o?: Options<T>) =>
  o?.equals === false ? undefined : o?.equals ?? equalFn;

export function createSignal<T>(value: T, options?: Options<T>) {
  const s: SignalState<T> = {
    value,
    observers: new Set(),
    comparator: comparatorOf(options)
  };
  const read = () => readSignal(s);
  const write = (v: T) => writeSignal(s, v);
  return [read, write] as const;
}

export function createMemo<T>(fn: (v: T) => T, options?: Options<T>) {
  const c: Memo<T> = {
    fn,
    state: 0,
    pure: true,
    sources: new Set(),
    value: undefined as T,
    observers: new Set(),
    comparator: comparatorOf(options)
  };
  updateComputation(c);
  return () => readSignal(c);
}

export function createEffect(fn: () => void) {
  const c: Computation = {
    fn,
    state: STALE,
    pure: false,
    sources: new Set()
  };
  updateComputation(c);
}

function readSignal<T>(node: SignalState<T>): T {
  const m = node as Memo<T>;
  if (m.sources && m.state) {
    if (m.state === STALE) updateComputation(m);
    else {
      const updates = Updates;
      Updates = null;
      runUpdates(() => lookUpstream(m));
      Updates = updates;
    }
  }
  if (Listener) {
    node.observers.add(Listener);
    Listener.sources.add(node);
  }
  return node.value;
}

function writeSignal<T>(node: SignalState<T>, value: T) {
  if (node.comparator && node.comparator(node.value, value))
    return;
  node.value = value;
  if (!node.observers.size) return;
  runUpdates(() => {
    for (const o of node.observers) {
      if (!o.state) {
        if (o.pure) Updates!.push(o);
        else Effects!.push(o);
        if (o.observers) markDownstream(o as Memo);
      }
      o.state = STALE;
    }
  });
}

function markDownstream(node: Memo) {
  for (const o of node.observers) {
    if (!o.state) {
      o.state = PENDING;
      if (o.pure) Updates!.push(o);
      else Effects!.push(o);
      if (o.observers) markDownstream(o as Memo);
    }
  }
}

function lookUpstream(node: Computation) {
  node.state = 0;
  for (const source of node.sources) {
    const s = source as Memo;
    if (!s.sources) continue; // ただのシグナル
    if (s.state === STALE) runTop(s);
    else if (s.state === PENDING) lookUpstream(s);
  }
}

export function batch<T>(fn: () => T): T {
  return runUpdates(fn);
}

function runUpdates<T>(fn: () => T): T {
  if (Updates) return fn();
  let wait = false;
  Updates = [];
  if (Effects) wait = true;
  else Effects = [];
  try {
    const res = fn();
    completeUpdates(wait);
    return res;
  } catch (err) {
    if (!wait) Effects = null;
    Updates = null;
    throw err;
  }
}

function completeUpdates(wait: boolean) {
  if (Updates) {
    runQueue(Updates);
    Updates = null;
  }
  if (wait) return;
  const e = Effects!;
  Effects = null;
  if (e.length) runUpdates(() => runQueue(e));
}

function runQueue(queue: Computation[]) {
  for (let i = 0; i < queue.length; i++) runTop(queue[i]);
}

function runTop(node: Computation) {
  if (node.state === 0) return;
  if (node.state === PENDING) return lookUpstream(node);
  updateComputation(node);
}

function updateComputation(node: Computation) {
  cleanNode(node);
  runComputation(node);
}

function cleanNode(node: Computation) {
  for (const source of node.sources) {
    source.observers.delete(node);
  }
  node.sources.clear();
  node.state = 0;
}

function runComputation(node: Computation) {
  const listener = Listener;
  Listener = node;
  let next;
  try {
    next = node.fn(node.value);
  } finally {
    Listener = listener;
  }
  if (node.observers) writeSignal(node as Memo, next);
  else node.value = next;
}
