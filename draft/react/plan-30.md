# React パス1: 約30章の章立て（plan-30）

対象: facebook/react（クローン先 `/tmp/oss/react`、`main`）
基準の版: コミット `278794d7`（2026-10-02、`Fix: Infinite loop caused by uDV + error recovery (#37739)`）。`packages/react/package.json` の version は 19.3.0。
FOCUS: Fiber、Lane、レンダリングのスケジューリング
除外: 各レンダラ（react-dom、react-native、react-art など）の固有処理

この章立ては、`--depth 1` の浅いcloneで作った。
git履歴とPR本文はまだ一つも読んでいない。
各章の「履歴の手がかり」は、パス3で調べる項目の宛先だけを書く。理由の記述はすべてパス3の仕事である。

ファイルパスと関数名は、`278794d7` の作業ツリーで `grep` をかけて実在を確かめたものだけを書いた。
確かめきれていない名前は「未確認」と付けた。行番号はパス2で確かめる。

---

## この章立てで判断した点

### 題材のミニ実装

全章を通して、「再帰をやめてFiberのループにし、優先度とSchedulerまで足す小さなレンダラ」を一本育てる。
言語はTypeScriptで、`code/react/NN-slug/` に置く。ホスト環境（DOM）は、章の中で持つ小さな偽のホスト木に置き換え、Nodeのテストだけで動かす。
各章で足す機能は一つにする。

### FOCUSの広げ方

FOCUS「Fiber、Lane、レンダリングのスケジューリング」を、次の問いに言い換えた。

「描画を途中で止められるようにするために、Reactは仕事をどんな単位に切り、優先度をどんな形で持ち、いつブラウザに譲るのか」

アークは、Fiberとワークループ、コミットと副作用、Hooksの状態、Lane、Scheduler、Transition・Suspense・エラー・Activityという一般化、の6つに分けた。

### 現行の版について

この版（19.3.0）は、`expirationTime` ではなく `Lanes` を使う。Effect listではなく `flags` と `subtreeFlags` を使う。これらの導入時期は、パス3で履歴から確かめる。
`ReactFiberCommitWork.js` からフック・クラスの副作用が `ReactFiberCommitEffects.js` と `ReactFiberCommitHostEffects.js` に分かれている。章では分かれた後の姿を読む。

### 捨てた候補

- `react-dom`、`react-native-renderer`、`react-art`、`react-test-renderer`：除外（レンダラ固有）。ホストの操作は、`ReactFiberConfig` の窓口までしか触れない
- Server Components（`react-server`、`react-client`、`react-server-dom-*`）：FOCUS外。Next.jsのパートで扱う
- React DevTools、`react-refresh`、`eslint-plugin-react-hooks`：FOCUS外
- ハイドレーション（`ReactFiberHydrationContext.js`）：レンダラ固有の処理が多いので除外
- 開発時のみの警告、Strict Modeの二重実行（`ReactStrictModeWarnings.js`）：本質でないので触れるだけ
- ViewTransition、Gesture（`ReactFiberCommitViewTransitions.js`、`ReactFiberGestureScheduler.js`）：新しく変化が速いので除外
- Context（`ReactFiberNewContext.js`）：シグナルとの対比では重要だが、30章に収まらないため、候補に残して着手しない
- `useSyncExternalStore`、`useOptimistic`、`useActionState`：同上。Transitionの章で名前だけ触れる

### 履歴の調べ方（パス3への申し送り）

- 浅いcloneでは履歴が読めない。対象のパスに絞って `git fetch --deepen` するか `git log -- packages/react-reconciler/src/ReactFiberLane.js` を使う
- Fiberの導入（React 16）、Hooks（16.8）、Lanes（17〜18）、Concurrent Mode からの方針変更（18）の4つが履歴の節目。コミットハッシュはパス3で確かめる（未確認）
- PR本文とissueは、このセッションで読める範囲かをパス3の最初に確かめる（未確認）

### エピグラフについて

各章の候補は仮である。パス4で底本を決めるときに出典の確度を確かめる。全章「候補なし」とし、既存パートの出典と重ならないよう、パス4で探す。

---

## ディレクトリマップ（`packages/`）

- `react/`: 公開API（`createElement`、Hooksの入口）。実体は reconciler が差し込む
- `react-reconciler/src/`: Fiber、Lane、ワークループ、コミット、Hooks、Suspense、エラー処理。本書の主役
- `scheduler/src/`: ブラウザに仕事を譲るタスクスケジューラ。`forks/Scheduler.js` が本体、`SchedulerMinHeap.js`、`SchedulerPriorities.js`
- `react-dom/src/client/`: DOM向けのホスト実装とルートの作成。`ReactDOMRoot.js`
- `react-dom-bindings/`: DOMの操作とイベント。除外
- `shared/`: パッケージ間で共有する定数と型、フィーチャーフラグ
- `react-noop-renderer/`: テスト用のレンダラ。reconciler を単体で動かす手本として読む
- `react-server`、`react-client`、`react-server-dom-*`: Server Components。除外

## 語彙集（仮）

- Fiber：仕事の単位。コンポーネント1つに1つで、`child`、`sibling`、`return` で木をなす
- `current` / `workInProgress`：画面に出ている木と、作りかけの木。`alternate` で対になる
- `FiberRoot`：ルートのコンテナ。`current` の木、保留中のLane、スケジュール状態を持つ
- Lane / Lanes：優先度を表すビットと、その集合
- `beginWork` / `completeWork`：木を降りるときと戻るときの処理
- `flags` / `subtreeFlags`：その Fiber／部分木で必要な副作用の印
- コミット：結果を画面に反映する段。before mutation、mutation、layout の3段と、後から走る passive
- Scheduler：ブラウザに仕事を譲りながらタスクを実行するパッケージ
- Transition：緊急でない更新の印。専用のLaneで処理される
- Suspense境界：待機を受け止める場所。Promiseを `throw` して巻き戻す先

## 主要な呼び出しパス（仮。パス2で行番号まで確かめる）

1. 初回描画：`createContainer`（`ReactFiberReconciler.js`）→ `updateContainer` → `scheduleUpdateOnFiber`（`ReactFiberWorkLoop.js`）→ `ensureRootIsScheduled`（`ReactFiberRootScheduler.js`）
2. 更新の予約：`dispatchSetState`（`ReactFiberHooks.js`）→ `requestUpdateLane` → `enqueueConcurrentHookUpdate` → `scheduleUpdateOnFiber` → `ensureRootIsScheduled`
3. 描画：`performWorkOnRoot` → `renderRootConcurrent`／`renderRootSync` → `workLoopConcurrent` → `performUnitOfWork` → `beginWork`／`completeUnitOfWork` → `completeWork`
4. コミット：`commitRoot` → `commitBeforeMutationEffects` → `commitMutationEffects` → `commitLayoutEffects` → `flushSpawnedWork` → `flushPassiveEffects`
5. 譲る：`performWorkOnRootViaSchedulerTask` → Scheduler の `workLoop` → `shouldYieldToHost` → `MessageChannel` で再開
6. 待つ：`throwException`（`ReactFiberThrow.js`）→ `throwAndUnwindWorkLoop` → `unwindWork` → Suspense境界の fallback → ping → 再描画

---

## アーク1　Reactは、画面を作る仕事をどう細切れにしたのか（1〜5章）

### 1章　再帰で描画すると、なぜ途中で止められないのか

- ミニ実装: `code/react/01-recursive-render/`
- 足す機能: 素朴な再帰レンダラ（要素木を辿ってホストの木を作る）。呼び出しスタックに仕事が閉じ込められることを、途中で中断できないテストで示す
- 並べる本物: `packages/react-reconciler/src/ReactFiberWorkLoop.js`（`workLoopSync`、`performUnitOfWork`）
- 履歴の手がかり: 再帰をやめて、ループで1ノードずつ進める設計に移した動機（Fiberの導入）。パス3
- 章末の欠点: 止めたくなっても、どこまで進んだかを覚える場所がない
- エピグラフ: 候補なし

### 2章　「仕事の単位」を、なぜ普通のオブジェクトにしたのか

- ミニ実装: `code/react/02-fiber-node/`
- 足す機能: `Fiber` ノード（type、props、child、sibling、return）と、要素から作る関数
- 並べる本物: `ReactFiber.js`（`FiberNode`、`createFiberFromElement`）、`ReactInternalTypes.js`（`Fiber`）、`ReactWorkTags.js`
- 履歴の手がかり: フィールドの追加履歴（`lanes`、`flags`、`subtreeFlags` が足された順）。パス3
- 章末の欠点: 木はできたが、更新のたびに全部作り直している
- エピグラフ: 候補なし

### 3章　木を1ノードずつ降りて、戻るにはどうするか

- ミニ実装: `code/react/03-work-loop/`
- 足す機能: `child` を降り、行き止まりで `sibling`、なければ `return` に戻る反復ループ。降りるときが `beginWork`、戻るときが `completeWork`
- 並べる本物: `ReactFiberWorkLoop.js`（`performUnitOfWork`、`completeUnitOfWork`）、`ReactFiberBeginWork.js`（`beginWork`）、`ReactFiberCompleteWork.js`（`completeWork`）
- 履歴の手がかり: `next` と `workInProgress` の二変数に落ち着くまでの経緯。パス3
- 章末の欠点: ループはあるが、1ノードごとに止まれる確認をまだ入れていない
- エピグラフ: 候補なし

### 4章　作りかけの木を、なぜ画面の木と別に持つのか

- ミニ実装: `code/react/04-double-buffering/`
- 足す機能: `current` と `workInProgress` の2本の木。`alternate` で相互に指し、複製して使い回す
- 並べる本物: `ReactFiber.js`（`createWorkInProgress`）、`ReactFiberRoot.js`（`createFiberRoot`、`FiberRootNode`）、`ReactFiberWorkLoop.js`（`prepareFreshStack`）
- 履歴の手がかり: `alternate` を使い回す最適化を入れたPRと、その前の作り方。パス3
- 章末の欠点: 木を差し替える瞬間（コミット）が無い
- エピグラフ: 候補なし

### 5章　子の配列から、どのFiberを使い回すのか

- ミニ実装: `code/react/05-reconcile-children/`
- 足す機能: 子の配列を前回のFiberと突き合わせ、キーと型で再利用・削除・挿入を決める
- 並べる本物: `ReactChildFiber.js`（`createChildReconciler`、`reconcileChildrenArray`、`updateSlot`、`mapRemainingChildren`、`deleteChild`、`placeChild`）、`ReactFiberBeginWork.js`（`reconcileChildren`）
- 履歴の手がかり: `key` の仕様の由来、`mapRemainingChildren` を使う二周目の設計。パス3
- 章末の欠点: どこが変わったかをフラグにしていないので、結果を画面に反映できない
- エピグラフ: 候補なし

---

## アーク2　仕事の結果は、いつ、どの順で画面に反映されるのか（6〜10章）

### 6章　変えた場所に印を付けて、一度にまとめて反映するには

- ミニ実装: `code/react/06-flags-and-commit/`
- 足す機能: `flags` に Placement、Update、ChildDeletion を立て、完了後に1回で木を差し替える
- 並べる本物: `ReactFiberFlags.js`（`Placement`、`Update`、`ChildDeletion`、`MutationMask`）、`ReactFiberWorkLoop.js`（`commitRoot`）
- 履歴の手がかり: `Effect list` から `flags` と `subtreeFlags` に移した経緯（`firstEffect`/`nextEffect` の廃止）。パス3
- 章末の欠点: 子孫に印があるかを、毎回全部辿って調べている
- エピグラフ: 候補なし

### 7章　子孫に印があるかを、どう一瞬で知るのか

- ミニ実装: `code/react/07-subtree-flags/`
- 足す機能: `completeWork` で子の `flags` を親に集める（バブリング）。印のない部分木は丸ごと飛ばす
- 並べる本物: `ReactFiberCompleteWork.js`（`bubbleProperties`）、`ReactFiberCommitWork.js`（`recursivelyTraverseMutationEffects`）
- 履歴の手がかり: `subtreeFlags` が入ったPRと、計測した効果。パス3
- 章末の欠点: DOM操作と副作用の実行順がまだ固定されていない
- エピグラフ: 候補なし

### 8章　コミットを3つの段に分けるのは、何を守るためか

- ミニ実装: `code/react/08-commit-phases/`
- 足す機能: before mutation、mutation、layout の3段。`current` の差し替えは mutation と layout の間
- 並べる本物: `ReactFiberCommitWork.js`（`commitBeforeMutationEffects`、`commitMutationEffects`、`commitLayoutEffects`）、`ReactFiberWorkLoop.js`（`flushSpawnedWork`）
- 履歴の手がかり: 3段に分けた理由（`getSnapshotBeforeUpdate` と `componentDidMount` の要求）。パス3
- 章末の欠点: `useEffect` はいつ走るのか、まだ決めていない
- エピグラフ: 候補なし

### 9章　`useEffect` は、なぜ画面に出した後で走るのか

- ミニ実装: `code/react/09-passive-effects/`
- 足す機能: layout と passive の2種類を作り、passive は描画後のタスクで実行する
- 並べる本物: `ReactFiberCommitWork.js`（`commitPassiveMountEffects`、`commitPassiveUnmountEffects`）、`ReactFiberWorkLoop.js`（`flushPassiveEffects`）、`ReactFiberCommitEffects.js`（`commitHookEffectListMount`、`commitHookEffectListUnmount`）
- 履歴の手がかり: passive を後回しにした判断と、離散イベント由来の更新のときは同期で流す例外。パス3
- 章末の欠点: effect の中の `setState` が、どの優先度になるか決めていない
- エピグラフ: 候補なし

### 10章　削除されるコンポーネントは、どの順で後片付けするのか

- ミニ実装: `code/react/10-deletions/`
- 足す機能: 削除対象を親の `deletions` に溜め、`commitDeletionEffects` で子孫のクリーンアップとDOM除去を行う
- 並べる本物: `ReactChildFiber.js`（`deleteChild`）、`ReactFiberCommitWork.js`（`commitDeletionEffects`）
- 履歴の手がかり: 削除時のクリーンアップ順（親が先か子が先か）をいつ決めたか。パス3
- 章末の欠点: 部分木ごとに止まれるのは分かったが、止めるかを判断する時計がない
- エピグラフ: 候補なし

---

## アーク3　Hooksは、Fiberのどこに状態を置いたのか（11〜15章）

### 11章　関数コンポーネントの状態を、どこに置くのか

- ミニ実装: `code/react/11-hooks-linked-list/`
- 足す機能: Fiberの `memoizedState` にフックを連結リストで持つ。呼ぶ順番が同一であることに頼る
- 並べる本物: `ReactFiberHooks.js`（`renderWithHooks`、`mountWorkInProgressHook`、`updateWorkInProgressHook`、`mountState`）
- 履歴の手がかり: 連結リスト方式を選んだ理由と、フックのルールとの関係（RFCの記述）。パス3
- 章末の欠点: `setState` が呼ばれても、どの木を作り直すかが決まらない
- エピグラフ: 候補なし

### 12章　`setState` は、どうやって再描画を予約するのか

- ミニ実装: `code/react/12-dispatch-set-state/`
- 足す機能: 更新キューに更新を積み、Fiberからルートまで辿って「仕事がある」印を付ける
- 並べる本物: `ReactFiberHooks.js`（`dispatchSetState`、`dispatchReducerAction`）、`ReactFiberConcurrentUpdates.js`（`enqueueConcurrentHookUpdate`、`markUpdateLaneFromFiberToRoot`、`finishQueueingConcurrentUpdates`、`getRootForUpdatedFiber`）、`ReactFiberWorkLoop.js`（`scheduleUpdateOnFiber`）
- 履歴の手がかり: 積むだけで印を後から付ける `finishQueueingConcurrentUpdates` を設けた理由。パス3
- 章末の欠点: 印を付けた枝だけ辿りたいが、印の形をまだ決めていない
- エピグラフ: 候補なし

### 13章　変わっていない枝を、どう飛ばすのか

- ミニ実装: `code/react/13-bailout/`
- 足す機能: 自分にも子孫にも仕事がなければ、`beginWork` で子を複製せず戻る。`props` の参照比較
- 並べる本物: `ReactFiberBeginWork.js`（`beginWork`、`attemptEarlyBailoutIfNoScheduledUpdate`、`bailoutOnAlreadyFinishedWork`、`updateFunctionComponent`）
- 履歴の手がかり: `React.memo` や `shouldComponentUpdate` との関係と、`childLanes` を使う前の方式。パス3
- 章末の欠点: 「仕事がある」を真偽値で持つと、優先度の違いを表せない
- エピグラフ: 候補なし

### 14章　更新の途中で割り込まれたとき、更新を失わないためには

- ミニ実装: `code/react/14-update-queue-rebase/`
- 足す機能: 複数の更新を優先度順に処理し、スキップした更新は後で順序を保って再適用（リベース）する
- 並べる本物: `ReactFiberHooks.js`（`updateReducerImpl`）、`ReactFiberClassUpdateQueue.js`（`processUpdateQueue`、`enqueueUpdate`、`cloneUpdateQueue`）
- 履歴の手がかり: リベースを入れたときの設計メモ。`baseQueue` を分ける理由。パス3
- 章末の欠点: 優先度の表現（Lane）をまだ作っていない
- エピグラフ: 候補なし

### 15章　`useEffect` の依存配列は、何と何を比べているのか

- ミニ実装: `code/react/15-deps-compare/`
- 足す機能: 前回の依存と今回の依存を `Object.is` で比べ、変わったときだけ effect に印を付ける
- 並べる本物: `ReactFiberHooks.js`（`mountEffectImpl`、`updateEffectImpl`、`areHookInputsEqual`）、`ReactHookEffectTags.js`
- 履歴の手がかり: `useMemo`／`useCallback` の再計算と共通化した経緯（`mountMemo`、`updateMemo`）。パス3
- 章末の欠点: 変わった・変わらないの二値では、更新の緊急度は表せない
- エピグラフ: 候補なし

---

## アーク4　優先度は、なぜビットで表すのか（16〜20章）

### 16章　優先度を数字ではなく、ビットの集合にしたのはなぜか

- ミニ実装: `code/react/16-lanes/`
- 足す機能: `Lane` をビット一つにし、`Lanes` をその集合として扱う。ビット演算で和・差・包含を判定
- 並べる本物: `ReactFiberLane.js`（`SyncLane`、`DefaultLane`、`TransitionLane1` 以降、`IdleLane`、`mergeLanes`、`isSubsetOfLanes`、`getHighestPriorityLane`）
- 履歴の手がかり: `expirationTime` から Lanes に移した経緯と、Dan Abramovらの説明（RFC／PR。パス3）
- 章末の欠点: Laneは作れたが、次にどのLaneを処理するかを選ぶ規則がない
- エピグラフ: 候補なし

### 17章　次に処理するLaneは、どう選ぶのか

- ミニ実装: `code/react/17-get-next-lanes/`
- 足す機能: 保留中のLaneから、最優先の一群を選ぶ。サスペンド中・ping済み・もつれ（entangled）を考慮
- 並べる本物: `ReactFiberLane.js`（`getNextLanes`、`getHighestPriorityLanes`、`getEntangledLanes`、`markRootEntangled`、`markRootSuspended`、`markRootPinged`）
- 履歴の手がかり: `getNextLanes` の判定順が複雑になった履歴。パス3
- 章末の欠点: 低い優先度のLaneは、永遠に後回しになりうる
- エピグラフ: 候補なし

### 18章　後回しにされ続けた更新は、どう救うのか

- ミニ実装: `code/react/18-starvation/`
- 足す機能: 時間が経ったLaneを期限切れとして印を付け、同期的に処理する
- 並べる本物: `ReactFiberLane.js`（`markStarvedLanesAsExpired`、`computeExpirationTime`、`markRootUpdated`、`markRootFinished`）
- 履歴の手がかり: `expirationTime` を `lanes` に置き換えたときの、飢餓対策の継ぎ目。パス3
- 章末の欠点: どのイベントがどのLaneになるのか決めていない
- エピグラフ: 候補なし

### 19章　イベントの種類から、どうLaneを決めるのか

- ミニ実装: `code/react/19-request-lane/`
- 足す機能: クリックは同期、入力は連続、それ以外は既定、と更新の出所でLaneを割り当てる
- 並べる本物: `ReactFiberWorkLoop.js`（`requestUpdateLane`）、`ReactEventPriorities.js`（`lanesToEventPriority`）、`ReactFiberTransition.js`（`requestCurrentTransition`）
- 履歴の手がかり: イベント優先度とLaneを分けた理由。`getCurrentUpdatePriority` に当たる関数の所在は未確認。パス3
- 章末の欠点: Laneが決まっても、いつ仕事を始めるのかを決めていない
- エピグラフ: 候補なし

### 20章　ルートの仕事は、いつ、誰が始めるのか

- ミニ実装: `code/react/20-root-scheduler/`
- 足す機能: ルートごとに「次のLane」を決めて予約。同期は microtask、それ以外は Scheduler に回す
- 並べる本物: `ReactFiberRootScheduler.js`（`ensureRootIsScheduled`、`processRootScheduleInMicrotask`、`scheduleTaskForRootDuringMicrotask`、`performWorkOnRootViaSchedulerTask`、`performSyncWorkOnRoot`、`flushSyncWorkOnAllRoots`）
- 履歴の手がかり: `ensureRootIsScheduled` を WorkLoop から分けて microtask に寄せた経緯。パス3
- 章末の欠点: Schedulerの中身をまだ作っていない
- エピグラフ: 候補なし

---

## アーク5　Schedulerは、ブラウザに仕事をどう譲るのか（21〜25章）

### 21章　1フレームのうち、どれだけ使ってよいのか

- ミニ実装: `code/react/21-should-yield/`
- 足す機能: 経過時間が閾値（約5ms）を超えたら譲る `shouldYield`。`workLoopConcurrent` で毎ノード確認する
- 並べる本物: `scheduler/src/forks/Scheduler.js`（`shouldYieldToHost`、`frameInterval`、`unstable_requestPaint`に当たる `requestPaint`）、`ReactFiberWorkLoop.js`（`workLoopConcurrent`、`renderRootConcurrent`）、`scheduler/src/SchedulerFeatureFlags.js`（`frameYieldMs`）
- 履歴の手がかり: 5msに決まった経緯と、`isInputPending` を使って外した経緯（未確認。パス3）
- 章末の欠点: 譲った後で、続きを誰が呼び戻すのか
- エピグラフ: 候補なし

### 22章　`setTimeout` ではなく `MessageChannel` を使うのはなぜか

- ミニ実装: `code/react/22-message-channel/`
- 足す機能: `MessageChannel` で次のマクロタスクを要求し、再開する小さなホストループ
- 並べる本物: `scheduler/src/forks/Scheduler.js`（`requestHostCallback`、`schedulePerformWorkUntilDeadline`、`flushWork`、`MessageChannel`、`setImmediate`）
- 履歴の手がかり: `setTimeout` の最小遅延の問題。`requestAnimationFrame` から変えたPR。パス3
- 章末の欠点: どの仕事を先に呼ぶのかの順序づけがない
- エピグラフ: 候補なし

### 23章　期限の近い仕事を先に出すには、何を使うのか

- ミニ実装: `code/react/23-min-heap/`
- 足す機能: 優先度から期限（`expirationTime`）を作り、最小ヒープで先頭を取る
- 並べる本物: `scheduler/src/SchedulerMinHeap.js`（`push`、`peek`、`pop`、`siftUp`、`siftDown`、`compare`）、`Scheduler.js`（`unstable_scheduleCallback`、`workLoop`、`advanceTimers`）、`SchedulerFeatureFlags.js`（`userBlockingPriorityTimeout`、`normalPriorityTimeout`、`lowPriorityTimeout`）
- 履歴の手がかり: タイマーと実行待ちを2本のヒープに分けた理由。パス3
- 章末の欠点: Schedulerの優先度と、ReactのLaneの対応を決めていない
- エピグラフ: 候補なし

### 24章　ReactのLaneとSchedulerの優先度は、どうつながるのか

- ミニ実装: `code/react/24-lane-to-priority/`
- 足す機能: `lanesToEventPriority` で Lane をイベント優先度にし、Scheduler の5段階に写す
- 並べる本物: `ReactEventPriorities.js`（`lanesToEventPriority`、`DiscreteEventPriority`）、`ReactFiberRootScheduler.js`（`scheduleTaskForRootDuringMicrotask`）、`scheduler/src/SchedulerPriorities.js`
- 履歴の手がかり: 2つの優先度体系が別々に存在する理由。Schedulerを別パッケージに保った理由。パス3
- 章末の欠点: 描画中に新しい更新が来たとき、作りかけをどうするか
- エピグラフ: 候補なし

### 25章　描画中に、もっと急ぎの更新が来たらどうするのか

- ミニ実装: `code/react/25-interrupt/`
- 足す機能: 新しいLaneが優先度で勝てば、作りかけの木を捨てて `prepareFreshStack` からやり直す
- 並べる本物: `ReactFiberWorkLoop.js`（`performWorkOnRoot`、`prepareFreshStack`、`renderRootConcurrent`、`scheduleUpdateOnFiber`）、`ReactFiberUnwindWork.js`（`unwindInterruptedWork`）
- 履歴の手がかり: 「作りかけを捨てる」判断と、捨てずに使い回す案の検討。パス3
- 章末の欠点: 捨てる更新と、待ってもよい更新を使い分けるAPIがない
- エピグラフ: 候補なし

---

## アーク6　Transition、Suspense、エラーは、同じ仕組みの上でどう動くのか（26〜30章）

### 26章　緊急でない更新を、利用者が選べるようにするには

- ミニ実装: `code/react/26-transition/`
- 足す機能: `startTransition` の中の更新に、専用のTransition Laneを割り当てる
- 並べる本物: `ReactFiberHooks.js`（`startTransition`、`mountTransition`）、`ReactFiberTransition.js`、`ReactFiberLane.js`（`TransitionLane1` 以降）、`ReactFiberAsyncAction.js`（`entangleAsyncAction`）
- 履歴の手がかり: Transitionの導入RFCと、`useDeferredValue`（`mountDeferredValue`）との関係。パス3
- 章末の欠点: データがまだ無い画面を、どう待つのか
- エピグラフ: 候補なし

### 27章　データが無いとき、なぜ `throw` で待つのか

- ミニ実装: `code/react/27-suspend-by-throw/`
- 足す機能: コンポーネントがPromiseを `throw` し、最寄りのSuspense境界まで巻き戻して fallback を出す
- 並べる本物: `ReactFiberThrow.js`（`throwException`）、`ReactFiberWorkLoop.js`（`throwAndUnwindWorkLoop`、`renderDidSuspend`、`markRootSuspended`）、`ReactFiberThenable.js`（`trackUsedThenable`）、`ReactFiberSuspenseContext.js`（`pushPrimaryTreeSuspenseHandler`）、`ReactFiberBeginWork.js`（`updateSuspenseComponent`）
- 履歴の手がかり: `throw` したPromiseを使う設計と、`use`（`ReactFiberHooks.js` の `use`、`useThenable`）に移した経緯。パス3
- 章末の欠点: 待った後、どう再開するのか
- エピグラフ: 候補なし

### 28章　待っていたデータが届いたら、どこから再開するのか

- ミニ実装: `code/react/28-ping-and-retry/`
- 足す機能: `then` で再描画を予約（ping／retry）。再試行専用のLaneを使い、fallback を出し続けるか判断する
- 並べる本物: `ReactFiberThrow.js`（`createRootErrorUpdate` の近くの ping／retry の実装。関数名は未確認）、`ReactFiberLane.js`（`includesOnlyRetries`、`markRootPinged`）、`ReactFiberWorkLoop.js`（`workInProgressRootDidAttachPingListener`）
- 履歴の手がかり: fallback を出すまでの猶予時間（throttle）の導入経緯。パス3
- 章末の欠点: 出した後で、描画自体が失敗したらどうするのか
- エピグラフ: 候補なし

### 29章　描画中の例外は、どの木で受け止めるのか

- ミニ実装: `code/react/29-error-boundary/`
- 足す機能: 例外を投げたFiberから親を辿り、エラー境界を探して更新を積み、境界の子を作り直す
- 並べる本物: `ReactFiberThrow.js`（`throwException`、`createClassErrorUpdate`、`createRootErrorUpdate`）、`ReactFiberUnwindWork.js`（`unwindWork`）、`ReactFiberWorkLoop.js`（`recoverFromConcurrentError`）、`ReactFiberErrorLogger.js`（`logCaughtError`、`logUncaughtError`）
- 履歴の手がかり: エラー境界がクラス専用のままである理由。パス3
- 章末の欠点: 画面を隠しても状態を残したい場合を、まだ扱っていない
- エピグラフ: 候補なし

### 30章　隠した画面の状態を、どう残しておくのか

- ミニ実装: `code/react/30-activity/`
- 足す機能: 非表示の部分木を低い優先度で描画し、状態を保ったまま隠す。再表示で作り直さない
- 並べる本物: `ReactFiberActivityComponent.js`（`ActivityState`）、`ReactFiberOffscreenComponent.js`（`OffscreenState`、`OffscreenProps`）、`ReactFiberBeginWork.js`、`ReactFiberLane.js`（`OffscreenLane`、`DeferredLane`）
- 履歴の手がかり: `Offscreen` から `Activity` に名前と役割が変わった経緯。パス3
- 章末の欠点: 最終章。Reactがスケジューラ込みで負った複雑さと、シグナルとの対比の問いを書いて終える
- エピグラフ: 候補なし

---
