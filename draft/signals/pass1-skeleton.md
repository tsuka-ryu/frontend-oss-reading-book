# signals パス1: 骨格

対象: solidjs/solid（クローン先 `../solid`）
FOCUS: リアクティブコアの依存追跡と再計算
除外: JSXコンパイラ、SSR

## ディレクトリマップ

- `packages/solid/src/reactive/` — リアクティブコア本体
  - `signal.ts`（1848行）— シグナル、メモ、エフェクト、依存グラフ、更新伝播のすべて
  - `scheduler.ts`（177行）— ReactのSchedulerの移植。Transition時の時間分割実行に使う
  - `array.ts` — mapArray/indexArray（リスト差分。FOCUS外）
  - `observable.ts` — TC39 Observable互換層（FOCUS外）
- `packages/solid/src/render/` — レンダラ共通部（hydration等。FOCUS外）
- `packages/solid/src/server/` — SSR用の縮退実装(FOCUS外)

コアは実質 signal.ts の1ファイル。

## 語彙集

- **SignalState<T>** — シグナルの実体。`value`, `observers`, `observerSlots`, `comparator` を持つただのオブジェクト
- **Computation<T>** — 再実行される計算（メモ、エフェクト）。`fn`, `state`, `sources`, `sourceSlots`, `pure`, `owner` を持つ。Owner を extends する
- **Memo** — SignalState かつ Computation。読まれる側にも読む側にもなる
- **Owner** — 所有権ツリーのノード。`owned`（子計算）と `cleanups` を持つ。破棄の単位
- **Listener** — モジュール変数。「いま実行中の計算」。readSignal がこれを見て依存を記録する
- **Owner（変数）** — モジュール変数。「いま実行中の所有者」。createComputation がぶら下げ先に使う
- **STALE(=1) / PENDING(=2) / 0** — Computation.state の3値。STALE=確実に古い、PENDING=上流がSTALEかもしれない、0=最新
- **Updates / Effects** — モジュール変数のキュー。pure な計算は Updates、エフェクトは Effects に積まれる
- **ExecCount** — 更新サイクルの通し番号。updatedAt との比較で二重実行を防ぐ
- **Transition** — useTransition 中の二重世界。tValue/tState に「未来の値」を持つ（章では深入りしない）
- **observerSlots / sourceSlots** — 双方向配列の相互インデックス。O(1)購読解除の仕掛け

## 主要な呼び出しパス

### 1. 読み取り＝依存記録
`count()` → `readSignal.bind(s)` →
- stale なメモなら先に updateComputation で自分を更新（pull）
- `Listener` が居れば `Listener.sources` と `this.observers` に相互登録（slots も記録）
- `this.value` を返す

### 2. 書き込み＝無効化と伝播
`setCount(v)` → setter → `writeSignal(s, v)` →
- `comparator`（既定は `===`）で変化なしなら何もしない
- `node.observers` を走査し、各 observer を STALE に。pure は Updates へ、それ以外は Effects へ
- observer がメモ（observers を持つ）なら `markDownstream` で下流を PENDING に
- 全体は `runUpdates(fn, false)` の中 → 最後に `completeUpdates` → `runQueue(Updates)` → 残った Effects を `runEffects`

### 3. キュー消化
`runQueue` → 各ノードに `runTop` →
- state が 0 なら何もしない（既に済み）
- PENDING なら `lookUpstream`（上流を先に確かめる）
- owner チェーンを遡って、stale な祖先から順に `updateComputation`

### 4. 計算の実行
`updateComputation(node)` → `cleanNode(node)`（旧依存を全解除、子を破棄）→ `runComputation` →
- `Listener = Owner = node` にして `node.fn(value)` 実行 → 実行中の read が依存を再記録
- 戻り値をメモなら `writeSignal(node, nextValue, true)`（＝さらに下流へ伝播）、そうでなければ node.value に

### 5. 破棄
`createRoot` の dispose → `cleanNode(root)` →
- sources/sourceSlots を pop しながら、source 側の observers から swap-remove（O(1)）
- owned を逆順に再帰 cleanNode、cleanups を逆順に実行

## 章立て案

1. **依存はいつ記録されるか** — readSignal と Listener。「宣言ではなく実行の副作用として依存が決まる」。双方向配列の構造まで
2. **変更はどこまで伝わるか** — writeSignal、comparator による打ち切り、Updates/Effects の2キュー、runUpdates/batch
3. **メモはなぜ二度計算されないか** — STALE/PENDING、markDownstream/lookUpstream。ダイヤモンド依存とグリッチ
4. **依存の張り替えとO(1)購読解除** — cleanNode、sourceSlots/observerSlots の swap-remove、毎回全解除して再記録する設計
5. **所有者の木は何のためにあるか** — Owner ツリー、createRoot/onCleanup、runTop が owner を遡る理由

Transition/Suspense/Resource は FOCUS 外として言及にとどめる。
scheduler.ts は React Scheduler の移植である事実のみ紹介（React パートへの前方リンク候補）。
