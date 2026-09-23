// ゼロから作るシグナル 1：読んだら覚える
// 名前はSolidの signal.ts に合わせている（Listener, observers）。

let Listener = null; // いま実行中のエフェクト

export function createSignal(value) {
  const s = { value, observers: new Set() };
  const read = () => {
    if (Listener) s.observers.add(Listener);
    return s.value;
  };
  const write = next => {
    s.value = next;
    // 実行中に増えた購読者を同じループで拾わないよう複製する
    for (const o of [...s.observers]) o.run();
  };
  return [read, write];
}

export function createEffect(fn) {
  const effect = {
    run() {
      const prev = Listener;
      Listener = effect;
      try {
        fn();
      } finally {
        Listener = prev;
      }
    }
  };
  effect.run();
}
