// 5章：所有者の木と実行順
// 4章からの変更：Owner、owned、cleanups、onCleanup、createRoot、
//   runUpdates の init、runTop の祖先確認

export interface SignalState<T = any> {
  value: T;
  observers: Set<Computation>;
  comparator?: (a: T, b: T) => boolean;
}

export interface Owner {
  owner: Owner | null;
  owned: Computation[] | null;
  cleanups: (() => void)[] | null;
}

export interface Computation extends Owner {
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
let Owner: Owner | null = null;
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

export function createRoot<T>(fn: (dispose: () => void) => T) {
  const root: Owner = { owner: Owner, owned: null, cleanups: null };
  const owner = Owner;
  const listener = Listener;
  Owner = root;
  Listener = null;
  try {
    return runUpdates(() => fn(() => cleanNode(root)), true);
  } finally {
    Owner = owner;
    Listener = listener;
  }
}

export function onCleanup(fn: () => void) {
  if (!Owner) return;
  if (!Owner.cleanups) Owner.cleanups = [fn];
  else Owner.cleanups.push(fn);
}

function createComputation(
  fn: (v: any) => any,
  pure: boolean,
  state: number
): Computation {
  const c: Computation = {
    fn,
    state,
    pure,
    sources: new Set(),
    owner: Owner,
    owned: null,
    cleanups: null
  };
  if (Owner) {
    if (!Owner.owned) Owner.owned = [c];
    else Owner.owned.push(c);
  }
  return c;
}

export function createMemo<T>(fn: (v: T) => T, options?: Options<T>) {
  const c = createComputation(fn, true, 0) as Memo<T>;
  c.observers = new Set();
  c.comparator = comparatorOf(options);
  updateComputation(c);
  return () => readSignal(c);
}

export function createEffect(fn: () => void) {
  const c = createComputation(fn, false, STALE);
  if (Effects) Effects.push(c);
  else updateComputation(c);
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

function runUpdates<T>(fn: () => T, init = false): T {
  if (Updates) return fn();
  let wait = false;
  if (!init) Updates = [];
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
  // 印の付いた祖先を集め、外側から順に処理する
  const ancestors = [node];
  let o = node.owner as Computation | null;
  while (o) {
    if (o.state) ancestors.push(o);
    o = o.owner as Computation | null;
  }
  for (let i = ancestors.length - 1; i >= 0; i--) {
    const n = ancestors[i];
    if (n.state === STALE) updateComputation(n);
    else if (n.state === PENDING) lookUpstream(n);
  }
}

function updateComputation(node: Computation) {
  cleanNode(node);
  runComputation(node);
}

function cleanNode(node: Owner) {
  const c = node as Computation;
  if (c.sources) {
    for (const source of c.sources) {
      source.observers.delete(c);
    }
    c.sources.clear();
  }
  if (node.owned) {
    for (let i = node.owned.length - 1; i >= 0; i--)
      cleanNode(node.owned[i]);
    node.owned = null;
  }
  if (node.cleanups) {
    for (let i = node.cleanups.length - 1; i >= 0; i--)
      node.cleanups[i]();
    node.cleanups = null;
  }
  c.state = 0;
}

function runComputation(node: Computation) {
  const owner = Owner;
  const listener = Listener;
  Owner = Listener = node;
  let next;
  try {
    next = node.fn(node.value);
  } finally {
    Owner = owner;
    Listener = listener;
  }
  if (node.observers) writeSignal(node as Memo, next);
  else node.value = next;
}
