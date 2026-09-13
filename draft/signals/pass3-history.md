# signals パス3: 履歴・PR調査メモ

## 系譜

- signal.ts 冒頭に S.js (Adam Haile, MIT 2017) のライセンスを転記。「Inspired by S.js」
- 2018年時点の Solid は s-js パッケージを外部依存として使用（2e0261db 2018-07-23 ほか）
- 276dd32e 2019-05-25 "internalize reactive library" — 自前実装に切り替え
- 87c37523 2020-03-21 "reactive refactor"（v0.17.0）— 現在の形の基礎。CHANGELOG「Significantly smaller reducing core by atleast 3kb minified」
  - S.js 由来の Log 構造体（node1/node1slot/nodes/nodeslots、単一観測者の特別扱い）を廃止し、observers/observerSlots をシグナル本体に平坦化
  - slot による O(1) 解除自体は S.js 由来。発明ではなく単純化

## 同値スキップ（comparator）

- d86c1bc1 2021-04-10 "make signals notify on change only by default"
- コミット本文の理由3つ（原文）:
  1. Inconsistent with State（state は既に equality check していた）
  2. More likely to hit infinite loops（同値通知は無限ループを踏みやすい）
  3. Consistent with MobX / Vue
- それまでは同値でも常に通知（ストリーム挙動の模倣）。API は不変、equals: false でオプトアウト

## batch の意味の変遷

- 0.19.0 (2020-08-23) で freeze → batch、sample → untrack に改名。「SRPとデジタル回路の用語で分かりにくかった」
- 1.5 以前: writeSignal 冒頭に `if (Pending) { node.pending = value; return }` があり、batch は書いた値自体を保留。batch 中の読み取りは過去の値
- 1.5.0 (2022-08-26, PR #1176): 保留をやめ、通常の伝播と同じ「observer をキューに積むだけ」に。書き込みは即反映、stale な派生値は読み取り時に評価
- 理由（CHANGELOG 1.5）: 1.4 で store が batch に従うようになった結果、「過去に留まる」batch は mutable データで壊れると判明（splice の例）

## STALE / PENDING の系譜

- 760c690a 2019-08-11（v0.10.0 準備）で pending 状態と markDownstreamComputations が登場。当時は RootClock.time / node.age の clock 設計（S.js 系）
- 現在の STALE=1 / PENDING=2 / ExecCount / updatedAt は 2020-03 の refactor 後の形
- PR #921 (2022-04-04, Issue #915): markUpstream→markDownstream、lookDownstream→lookUpstream に改名。上流/下流の名前が長年逆に付いていた

## 実行順序

- 0.20.0 (2020-09-24) "Re-scheduling Reactivity": createEffect をレンダリング後に遅延、グラフ更新用に createComputed を分離。afterEffects/createDependentEffect/suspend を削除
- 46af8c2a 2021-07-25 "better topological sort": runTop が印付きの祖先を ancestors 配列に集め、外側から順に実行する現在の形に
- a57edc3a "fix user effect execution order"、runUserEffects で user エフェクトを render エフェクトの後ろへ

## その他

- writeSignal の無限ループ検出: Updates > 10e5 で "Potential Infinite Loop Detected"（6d13d8e7 "re-organize" 時点から存在）
- readSignal の重複購読チェックは observers 末尾との比較のみ（完全な重複排除ではない）。理由の明文は見つからず → 推測扱い
- scheduler.ts は React Scheduler の移植（ファイル冒頭に明記）。Transition 時のみ使用
