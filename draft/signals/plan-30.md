# signals 30章計画（パス1の拡張案）

基準: solidjs/solid `b25c557`（solid-js 1.9.15）。
clone: `/tmp/oss/solid`。履歴を `git log -S` と `git log -L` で引くため、`--depth 1` ではなく `--filter=blob:none`（全コミット、本体は必要時に取得）で取った。
ハッシュと件名はすべてこのcloneで確かめた。
IssueとPRの本文は、このセッションからGitHub APIに届かず読めていない。番号はコミット件名とchangesetから拾ったもので、本文の中身は「未確認」。パス3で読む。

## この章立てで判断したこと

### FOCUSの広げ方

FOCUSは「リアクティブコアの依存追跡と再計算」のまま、次の二つを足す。

- **store（`packages/solid/store/src/`）**：プロパティごとに遅延で作るシグナルなので、依存追跡の粒度の話としてそのまま続く。`reconcile` は「通知を最小にする書き込み」なので再計算の範囲の話になる。`createMutable`・`produce` は同じ仕組みの書き方違いなので入れない
- **createResource・Suspense・Transition・Scheduler**：API紹介としてではなく、`readSignal`・`writeSignal`・`runTop`・`completeUpdates`・`cleanNode` に入り込んでいる分岐（`tValue`・`tState`・`suspense.inFallback`・`Transition.disposed` など）を読むために入れる。1〜5章で読んだ関数のうち、読み飛ばしてきた行の正体がここで分かる

除外は守る。`sharedConfig`（ハイドレーション）の分岐、`createResource` の `ssrLoadFrom`・`deferStream`・`onHydrated`、`runUserEffects` の後半、`server/` 以下は扱わない。
Suspenseの本体は `src/render/Suspense.ts` にあるが、JSXではなくカウンタとエフェクトの保留だけを読む。ミニ実装はDOMを持たない関数で書く。

### アークの切り方

1〜5章は既存のままで、第I群とする。
6章以降は、「ミニ実装が何を持っていないか」の種類で5章ずつ切った。
計算の書き手の道具（II）、所有者の木の別の使い道（III）、集まりの部分更新（IV）、非同期（V）、グラフの外との出入り（VI）である。
群の境目でも、前章の欠点をテストで示して次章の問いにする鎖は切っていない。

### 5章の閉じ方を変える必要がある

いまの5章は「このパートで作らなかったもの」で閉じ、Transition・Suspense・エラー境界・二種類のエフェクトを並べている。
30章にするなら、これらは後の章になるので、5章の末尾は6章への引き（下の6章の「問いの入口」）に書き換える必要がある。
本文は別のエージェントが書き直し中なので、ここでは指摘だけにとどめる。

### 捨てた候補

- **indexArray**：`mapArray` と対になる設計だが、履歴は導入（`6908c7ba` 2020-05-31 "Improve iterator control flows"）とサーバ版の追加（`b632dfd5` #1920）くらいで、「なぜ」を語れる材料が薄い。17章の「本物はなぜ違うか」で対比として触れる
- **createMutable / modifyMutable / produce**：storeと同じノードの上の書き方違い。1.5のbatch変更の理由（spliceの例）は2章で使用済み
- **createUniqueId、SuspenseList、lazy**：SSRか描画層の話
- **DevHooks / registerGraph / devComponent**：開発ツール向けで、再計算の仕組みを変えない
- **children / createProvider の中身**：JSXの子を解決するヘルパー。12章では `Owner.context` への書き込みだけを読む
- **カスタム `equals`**：比較関数を差し替えるだけで、2章（同値スキップ）と3章（メモの結果が `writeSignal` を通る）で済んでいる
- **onMount**：`createEffect(() => untrack(fn))` の1行で、6章の例として触れれば足りる

---

## 第I群（1〜5章、既存）　読んだものをどう覚え、いつ走らせ直すか

順番とタイトルは変えない。

1. 読んだら覚えるシグナルを作る（`01-tracking`）
2. 書き込みをまとめて流す（`02-write-queue`）
3. メモはいつ計算し直すか（`03-memo`）
4. 使わなくなった依存をどう外すか（`04-cleanup`）
5. 入れ子の計算を誰が片付けるか（`05-owner`）

---

## 第II群（6〜10章）　計算の書き手は、追跡をどこまで自分で決められるか

1〜5章では、読んだものはすべて依存になり、エフェクトは一種類だった。
この群では、書き手が「読むが覚えない」「これにだけ反応する」「描画の前か後か」を選べるようにする。

### 6章　読んでも覚えさせないにはどうするか（`06-untrack`）

- 問いの入口（5章末の欠点）：デバッグ用に `console.log(a(), b())` と書いたエフェクトが、`b` の変更でも走る。読んだものは全部依存になるからである
- 足す機能：`untrack(fn)`。`Listener` を `null` にして実行し、`finally` で戻す
- 並べる本物：`untrack`（`signal.ts`）、`onMount` が `createEffect(() => untrack(fn))` であること
- 履歴：
  - 前身は `sample`。CHANGELOG 0.19.0（2020-08-23）で `freeze`→`batch` と同時に `sample`→`untrack` に改名（「SRPとデジタル回路の用語」）。改名を入れたコミットは `2dacbe5e`（2020-08-19 "Many updates"）
  - `3c37e236`（2022-11-05 "improve error handling in `untrack` (#1335)"）：それまで `try/finally` がなく、`fn` が投げると `Listener` が `null` のまま残った。`untrack` という名前になってから、`finally` が入るまで2年あまりかかった
  - `c26f9334`（2023-02-07 "Add fast track for `untrack` in case of `null` listener (#1534)"）
  - `8d2de12f`（2024-01-03 "fix #1850 untrack in external source"）：`ExternalSourceConfig.untrack` の分岐。30章への前方参照
- 章末の欠点：エフェクトの中でカウンタを増やす `setCount(count() + 1)` は、`count` を読むので自分自身に依存し、2章の無限ループ検出に当たる。テストで示す
- エピグラフ候補：Arthur Conan Doyle "A Scandal in Bohemia", Chapter I（*The Strand Magazine*, 1891; *The Adventures of Sherlock Holmes*, 1892）"You see, but you do not observe."（拙訳）。読む（see）と追跡する（observe）の区別。本物の `untrack` は「見るが覚えない」側を作る

### 7章　前の値を読むと、なぜ依存になってしまうのか（`07-setter-fn`）

- 問いの入口：6章末の `setCount(count() + 1)` の自己依存
- 足す機能：セッターが関数を受け取り、`s.value` を渡して呼ぶ（読まずに前の値を得る）
- 並べる本物：`createSignal` の `setter`（`typeof value === "function"` の分岐。Transition中は `s.tValue` を渡す行があり、23章で回収する）
- 履歴：
  - `2f5311dc`（2021-06-16 "signal function setters"）
  - CHANGELOG 1.0.0「setSignal now supports function form」：理由は「前の値を追跡せずに読める」「Stateと揃う」。代償として、関数をシグナルに入れるときは `setCount(() => ComponentB)` と包む必要ができた（皮肉の材料：関数を値として扱う言語で、関数を値として入れにくくなった）
- 章末の欠点：`untrack` を毎回書けば依存は絞れるが、「何に反応するか」がコードの形から読めない。依存の宣言が欲しい
- エピグラフ候補：候補なし

### 8章　反応する相手を先に宣言できるか（`08-on`）

- 問いの入口：7章末。依存を本体から読み取るのではなく、先に宣言したい
- 足す機能：`on(deps, fn, { defer })`。`deps` を読んで追跡し、`fn` は `untrack` の中で呼ぶ。`defer` で初回を飛ばす
- 並べる本物：`on`（`signal.ts`、`prevInput` と `defer` の扱い）
- 履歴：
  - `891b19ea`（2020-10-01 "Add `on` operator"）：最初は可変長引数で、依存を並べて最後が関数という形。型は引数の数ごとのオーバーロード
  - `f28728a1`（2021-05-15 "update `on` signature, fix #452 split props over state"）：配列で依存を渡す形と `defer` に変更
  - CHANGELOG 1.0.0「No longer uses rest parameters ... This facilitates new option to defer」
- 章末の欠点：ミニ実装のエフェクトは登録順に走る。描画を更新するエフェクトより前に、描画結果を読むエフェクトが走る順序がテストで作れる
- エピグラフ候補：Homer『オデュッセイア』第12歌（成立は紀元前8世紀頃とされる）。セイレーンの前を通るとき、オデュッセウスは自分を帆柱に縛らせ、仲間の耳を蠟で塞ぐ。反応する相手と無視する相手を、事前に決めておく。原文の行番号はパス3で確認する

### 9章　エフェクトはなぜ二種類あるのか（`09-user-effects`）

- 問いの入口：8章末の順序の問題
- 足す機能：`createRenderEffect` と、`user` の印を付けた `createEffect`。キューの消化を `runUserEffects` に差し替え、印のないものを先に、印のあるものを後に走らせる
- 並べる本物：`createRenderEffect`、`createEffect`（`runEffects = runUserEffects` と `c.user = true`）、`runUserEffects`（ハイドレーションの分岐は読まない）
- 履歴：
  - `0126e41d`（2020-09-11 "update effect timing"）：`createRenderEffect` と `createComputed` の登場。CHANGELOG 0.20.0「deferring `createEffect` to be after rendering」
  - `a57edc3a`（2020-09-21 "fix user effect execution order"）：`user` の印と、二巡で走らせる `runEffects` が入る
  - `08a1f180`（2020-09-23）で `runUserEffects` の名前になり、`runEffects` を差し替える形に
  - CHANGELOG 1.4.0「Synchronous Top Level `createEffect`」：トップレベルではマイクロタスクに遅らせていたのをやめた。`Effects ? Effects.push(c) : updateComputation(c)` の形は `15e54b53`（Solid 1.4, #974）
  - 推測：`runEffects` を最初は `runQueue` にしておき、`createEffect` が呼ばれたときだけ差し替えるのは、`createEffect` を使わないバンドルで `runUserEffects` をtree-shakeで落とすため。明文は未確認
- 章末の欠点：派生値を別のシグナルへ書き戻すエフェクトは、描画の後に走る。描画は一度古い値で走ってから直る（テストで描画の実行回数を数える）
- エピグラフ候補：『伝道の書（コヘレトの言葉）』3章1節（欽定訳、1611年）"To every thing there is a season, and a time to every purpose under the heaven"（拙訳）。すべての仕事に時がある。Solidは「時」を二つしか持たない

### 10章　描画より前に書き戻す計算はどこに置くか（`10-computed`）

- 問いの入口：9章末
- 足す機能：`createComputed`。`pure` な計算として `Updates` に積まれ、エフェクトより前に走る。値は持たない（`observers` がない）
- 並べる本物：`createComputed`、`createComputation` の `pure` 引数、`writeSignal` の `if (o.pure) Updates!.push(o); else Effects!.push(o);`。本物の `createResource` が内部で `createComputed` を使っていること（21章への前方参照）
- 履歴：
  - `0126e41d`（2020-09-11）。CHANGELOG 0.20.0「introducing `createComputed` do reactive graph updates like loading async data」
  - 公式ドキュメントが `createComputed` を避けるよう勧めているかは未確認（パス3で確認）
- 章末の欠点：`setTimeout` や `await` の後で `createComputed` や `createEffect` を呼ぶと、そのとき `Owner` は `null` なので、ルートを破棄しても止まらない。テストで示す
- エピグラフ候補：候補なし

---

## 第III群（11〜15章）　所有者の木には、破棄のほかに何を載せられるか

5章の木は「誰が片付けるか」のためだけにあった。
この群では、同じ木に「非同期の後の居場所」「下へ渡す値」「例外の行き先」を載せる。

### 11章　非同期の後で、計算はどの木に戻るのか（`11-run-with-owner`）

- 問いの入口：10章末
- 足す機能：`getOwner()` と `runWithOwner(owner, fn)`。`Owner` を差し替え、`Listener` を `null` にして `runUpdates(fn, true)` で走らせる
- 並べる本物：`getOwner`、`runWithOwner`、`createResource` が `refetch` を `runWithOwner(owner, ...)` で呼ぶこと
- 履歴：
  - `cdfeab18`（2021-02-01 "Add runWithOwner (#326)"、外部コントリビュータによる追加）
  - CHANGELOG 0.24.0「Renamed `getContextOwner` to `getOwner`」：理由は「context との混同を避け、`runWithOwner` と揃える」
  - `74033f57`（2022-01-03 "runUpdates in runWithOwner, return reactivity to transitions"）
  - `6c0f1fcf`（2022-01-05 "fix runWithOwner return, add createReaction"）
  - `54f3068d`（2022-12-30 "fix #1452 - runWithOwner own its errors"、changeset「runWithOwner responsible for errors in its scope」）。14章への前方参照
  - `c65faecd`（2025-04-30 "fix #2428 - owner always present in resource fetcher"）
- 章末の欠点：木は計算を片付けるが、値を運ばない。深い計算にテーマの値を渡すには、途中の関数すべてに引数を足すしかない
- エピグラフ候補：Washington Irving "Rip Van Winkle"（*The Sketch Book of Geoffrey Crayon, Gent.*, 1819）。20年眠って村に戻ると、誰も彼を知らず、彼も自分が誰の側か分からない。`await` の後の計算も、戻ったときには所有者がいない。違いは、Solidでは所有者を覚えておけば戻れること

### 12章　木を下って値を届けるにはどうするか（`12-context`）

- 問いの入口：11章末
- 足す機能：`createContext`・`useContext`・Provider。計算は作られた瞬間に `Owner.context` を写し、`useContext` は自分の `context` を一回見るだけにする
- 並べる本物：`createContext`、`useContext`、`createComputation` の `context: Owner ? Owner.context : null`、`createRoot` の `context: current ? current.context : null`、`createProvider` の `Owner!.context = { ...Owner!.context, [id]: props.value }`
- 履歴：
  - 以前は `lookup(owner, key)` で所有者を根まで遡っていた（`f308d2e1` 2019-12-18 の時点で存在）
  - `792e7dea`（2023-08-09 "fix #1821 improve context performance"）：遡る方式をやめ、作成時に写す方式に。同じコミットで `onError` のために `mutateContext` が入り、コメントは「terrible de-opt」。写す方式にしたせいで、後から親の `context` を書き換えると子に届かなくなり、その穴を再帰で塞いでいる
  - `1ae4fe22`（2022-01-05 "fix falsey context lookup"）
  - Issue #1821の本文（性能問題の具体的な数字）は未確認
- 章末の欠点：`createRoot(() => ...)` のように破棄関数を受け取らないルートは、誰も破棄できないのに `owned` へ子を記録し続ける
- エピグラフ候補：Vergilius『アエネーイス』第2巻717行付近（前19年）。アエネアスは父アンキセスに祖先の神々（penates）を持たせてトロイアを出る。新しい家は、生まれるときに親の家の神々を持って出る。書き換えた後の親の神々は届かない、という点も同じ。行番号はパス3で確認する

### 13章　誰にも片付けられないルートは、なぜ木に載らないのか（`13-unowned-root`）

- 問いの入口：12章末
- 足す機能：`fn.length === 0` のルートを共有の番兵 `UNOWNED` にし、`createComputation` は `Owner === UNOWNED` のとき `owned` に積まない
- 並べる本物：`UNOWNED`、`createRoot` の `unowned = fn.length === 0`、開発時に破棄関数を呼ぶと投げるダミー、`detachedOwner` 引数
- 履歴：
  - `UNOWNED` は `87c37523`（2020-03-21 "reactive refactor"）から存在
  - `0cf1348c`（2022-06-02 "fix #1029, rest args disposing unowned root"）：`(...args) => {}` は `length` が0なので、破棄関数を受け取る書き方でも「受け取らない」と判定されていた。関数の引数の数で意図を読む仕掛けが、残余引数で外れた
  - `18e734df`（2023-02-02 "Support null for detachedOwner in createRoot (#1518)"）
- 本文で扱う読み取り：`UNOWNED` の `context` は `null` なので、破棄関数を受け取らないルートの中では Provider の値が見えないはずである。コードから読んだが実行していない（パス2で実行して確かめる）
- 章末の欠点：計算の中で例外が投げられると、`runUpdates` の `catch` がキューを捨てて投げ直し、更新全体が止まる。部分木だけで受け止める手段がない
- エピグラフ候補：Homer『オデュッセイア』第9歌。オデュッセウスはキュクロプスに「誰でもない（Οὖτις）」と名乗り、助けを求めた叫びは「誰でもない者にやられた」になって誰も来ない。`UNOWNED` という持ち主の下に置いた計算も、誰も片付けに来ない

### 14章　例外は木のどこで受け止めるか（`14-catch-error`）

- 問いの入口：13章末
- 足す機能：`catchError(fn, handler)`。新しい所有者の `context[ERROR]` にハンドラを置き、`handleError` が `Owner.context[ERROR]` を引いて呼ぶ。投げられた値を `Error` に包む `castError`
- 並べる本物：`catchError`、`handleError`、`runErrors`（ハンドラが投げたら一つ上へ）、`castError`、非推奨の `onError` と `mutateContext`
- 履歴：
  - `ea05607e`（2020-01-13 "Add error handling and resourcestate object api"）：`onError` の導入
  - `608b3c3a`（2023-02-22 "Add catchError/deprecate onError"）。CHANGELOG 1.7.0「`catchError` replaces `onError`」：`onError` は親のスコープにハンドラを登録するので、兄弟の例外をどう扱うか（キューか、独立か）が曖昧だった
  - `castError` は `a209b35b`（Solid 1.5, #1176）で入り、CHANGELOG 1.7.0「Standardized Errors」で `Error` 以外を `cause` 付きで包む形が説明されている
- 章末の欠点：`catchError` の下のメモが更新中に投げると、ハンドラがその場で呼ばれ、同じ更新の中でメモがもう一度読まれてもう一度投げ、ハンドラが二度呼ばれる。テストで示す
- エピグラフ候補：『創世記』4章9節（欽定訳、1611年）"Am I my brother's keeper?"（拙訳）。`onError` の問題は、兄弟の例外を誰が引き受けるかが曖昧だったことで、`catchError` は「自分の下だけ」と答えた

### 15章　失敗した計算を、同じ更新の中でどう眠らせるか（`15-error-recovery`）

- 問いの入口：14章末
- 足す機能：`runComputation` の `catch` で、`pure` な計算を `STALE` に戻して子を破棄し、`updatedAt = time + 1` にして同じ更新では拾われないようにする。更新中のハンドラ呼び出しは `Effects` に積んで後回しにする
- 並べる本物：`runComputation` の `catch` 節、`handleError` の `Effects.push({ fn() { runErrors(...) }, state: STALE })`、`lookUpstream` の `(!source.updatedAt || source.updatedAt < ExecCount)`
- 履歴：
  - `0ad98597`（2023-01-12 "fix #1478 error infinite loop"）：`STALE` に戻すときに `owned` を破棄する処理
  - `b8a3ff13`（2023-03-06 "fix #1586 error boundary called twice"）：`updatedAt = time + 1` と、コメント「won't be picked up until next update」。同時に `lookUpstream` に `updatedAt` の確認が入った
- 章末の欠点：木は例外に耐えるようになったが、幅には弱い。1000行それぞれが `selected() === id` を読むと、選択が変わるたびに1000個が走る。テストで実行回数を数える
- エピグラフ候補：候補なし

---

## 第IV群（16〜20章）　集まりの一部だけを、どう走らせ直すか

1〜15章のシグナルは「一つの値」だった。
この群では、配列やオブジェクトのうち、変わった部分だけが走るようにする。

### 16章　変わった行にだけ知らせるにはどうするか（`16-selector`）

- 問いの入口：15章末
- 足す機能：`createSelector(source, fn)`。キーごとに購読者の集合を持ち、`fn(key, 新) !== fn(key, 旧)` のキーの購読者だけを `STALE` にして積む
- 並べる本物：`createSelector`（`subs: Map<U, Set<Computation>>`、`onCleanup` による購読解除）
- 履歴：
  - `3f1b9ce0`（2020-09-16 "add createSelector"）：最初はキーごとに購読者を一つしか持てなかった（`Map<T, Computation>`）
  - `cd72a6fa`（2021-03-16 "fix: #375, make selectors re-usable"）：`Set` に変更
  - `bc9ef6e5`（2021-12-07 "better streaming, fix createSelector"）：条件を `fn(key, v) || fn(key, p)` から `!==` に。CHANGELOG 1.3.0「Fixed over-executing on multi-select」と対応すると読めるが、対応づけは推測
  - `c9f3e346`（2022-02-21 "fix #862 createSelector cleanup"）、`1ceb6079`（2022-04-22 "fix #947: createSelector undefined"）
  - `5086b27e`（2026-08-17 "make createSelector transition-aware"）：`state` だけを立てていたため、Transition中は古いままになっていた。基準コミットの3週間足らず前の修正で、23章で回収する
- 章末の欠点：行そのものを `items().map(item => createRow(item))` のメモで作ると、1件足すだけで全行の計算が作り直される
- エピグラフ候補：『ヨハネによる福音書』10章3節（欽定訳、1611年）"he calleth his own sheep by name"（拙訳）。群れ全体ではなく、名前を呼ばれた羊だけが応える

### 17章　配列が変わったとき、どの行を作り直すか（`17-map-array`）

- 問いの入口：16章末
- 足す機能：`mapArray(list, mapFn)`。要素ごとに `createRoot` を作り、同じ要素（`===`）の行は再利用し、消えた行だけ破棄する。前後の共通部分を飛ばしてから `Map` で位置を引く
- 並べる本物：`mapArray`（`array.ts`、S-array の `mapSample` 由来のライセンス表示）、`dispose`、`FALLBACK`、`$TRACK` によるトップレベルの追跡、`untrack` の中で差分を取ること
- 履歴：
  - `f308d2e1`（2019-12-18）時点で S-array の `mapSample` の改変として存在
  - `9d50a388`（2020-09-14 "remove low impact array reconcile code"）：効果の小さい差分処理を削った
  - `1d8c5579`（2020-11-23 "Fix for nested for loop disposal under CM"）
  - `15e54b53`（Solid 1.4, #974）：`$TRACK` の導入。CHANGELOG 1.4.0 は、インデックスの読み取りを `untrack` する制御フローは対象を明示的に追跡する必要が出たと説明
  - `3fc015c2`（2024-07-24 "track length in array helpers, fix mobx external source"）
  - 対比として `indexArray`（位置ごとにシグナルを持つ）に触れる
- 章末の欠点：`todo.done` だけを変えたいのに、同一性で行を見分けるので、新しいオブジェクトに差し替えると行ごと作り直され、中身を書き換えると誰も気づかない
- エピグラフ候補：Plutarchos『英雄伝』「テセウス伝」23章1節（2世紀初め）。テセウスの船は、朽ちた板を替え続けても同じ船と呼ばれた。`mapArray` は「同じ参照なら同じ行」と決めて、この問いを避けている

### 18章　オブジェクトのプロパティ一つずつに依存できるか（`18-store`）

- 問いの入口：17章末
- 足す機能：`createStore`。Proxyの `get` で、読まれたプロパティにだけシグナルを遅延で作る（`getNodes`・`getNode`）。書き込みは `setStore(key, value)` から `setProperty` を通し、`batch` で包む
- 並べる本物：`wrap`、`proxyTraps.get`、`getNodes`、`getNode`（`equals: false, internal: true`）、`setProperty`、`createStore` の `setStore`、`unwrap`、`isWrappable`
- 履歴：
  - Proxyによる状態は公開最初のコミット `a194f02e`（2018-04-24 "open source repo"）の `src/types/State/Handler.coffee`（CoffeeScript）からある
  - `91a40730`（2021-02-27 "update deps and reduce persistent memory in state"）：`createDataNode` の登場。ノードを遅延で作る形はここからと読めるが、差分の確認は未
  - `809fd5b8`（2021-06-22 "state -> store"）。CHANGELOG 1.0.0「`createState` has been renamed to `createStore` and moved to `solid-js/store`」
  - CHANGELOG 1.4.0「Stores and mutables now respect batch」と1.5.0の方針変更は2章で使用済み。ここでは「storeがbatchに従うようになったことが、batchの意味を変えた」側から触れる
- 章末の欠点：プロパティの読み取りは追跡できるが、`Object.keys(store)` や `"x" in store`、`for...in` は追跡されない。キーを足しても走らない
- エピグラフ候補：Jorge Luis Borges「学問の厳密さについて（Del rigor en la ciencia）」（1946年初出、『創造者（El hacedor）』1960年所収）。帝国と同じ大きさの地図。storeは全プロパティのシグナルを作らず、読まれた所だけ地図にする

### 19章　キーが増えたことをどう知らせるか（`19-store-shape`）

- 問いの入口：18章末
- 足す機能：オブジェクト自身を表すノード `$SELF` を `ownKeys` で追跡し、キーの追加や削除で通知する。`in` は `$HAS` のノードで追跡する。配列は `length` のノードも更新する
- 並べる本物：`trackSelf`、`ownKeys`、`proxyTraps.has`、`setProperty` の `$HAS` と `length` と `$SELF` の通知、`$TRACK`
- 履歴：
  - `a6d68629`（2021-07-08 "... add ownkeys"）
  - `15e54b53`（Solid 1.4, #974 "stores: top level arrays, prevent obj overnotify"）。CHANGELOG 1.4.0：それまでは配列の要素の増減や新しいプロパティで、持ち主のオブジェクト全体に通知していた
  - `890d3c10`（2022-11-11 "fix #1331 store "in" operator"）、`6c9879c9`（2023-08-03 "fix `in` introspection for stores"）：`$HAS` の導入
  - `c2008f02`（2023-08-08 "Stores: fix overwriting underscore property (#1842)"）：自身を表すノードは文字列キー `"_"` に置かれていて、利用者の `_` というプロパティと衝突していた。`Symbol("store-self")` に変更
  - `8e7a4837`（2023-04-24 "stores: array items tracking, removal, fixes #1695"）
- 章末の欠点：サーバから丸ごと届いたデータを `setStore(newData)` で入れると、中のオブジェクトが入れ替わり、値の同じプロパティまで通知される（テストで通知回数を数える）
- エピグラフ候補：候補なし

### 20章　新しいデータを古いstoreにどう重ねるか（`20-reconcile`）

- 問いの入口：19章末
- 足す機能：`reconcile(value, { key })`。新旧を再帰的に比べ、違うプロパティだけ `setProperty` する。配列は `key`（既定 `"id"`）で要素を対応づける
- 並べる本物：`reconcile`、`applyState`（`modifiers.ts`。共通の前後を飛ばし `Map` で位置を引く部分は17章の `mapArray` と同じ形）
- 履歴：
  - `8019b30d`（2019-01-11 "improve reconcile performance and capability"）
  - `d767cd5b`（2019-01-16 "remove force reconciliation, doesn't really work"）：5日後に一部を撤回している
  - `17763fad`（2022-06-08 "... fix #1032 reconcile top level key change"）、`50d1304d`（2022-12-12 "fix #1416 nulls in array reconcile"）、`1aff80c6`（2023-02-24 "fix #1573 top level reconcile not merging"）、`b887587a`（2024-01-03 "fix #1973 array over object reconcile"）：境界の型の組み合わせで壊れ続けた記録
- 章末の欠点：データはたいてい非同期で届く。届くまでの「まだない」状態を表せず、古い要求の応答が後から届くと新しい値を上書きする
- エピグラフ候補：Antoine Lavoisier『化学原論（Traité élémentaire de chimie）』（1789年）の「rien ne se crée」の一節。何も新しく作られず、形が変わるだけ。`reconcile` も既存のノードを残して値だけ移す。第1部の何章か（13章と記憶しているが未確認）はパス3で原典を確認し、確かめられなければ使わない

---

## 第V群（21〜25章）　まだ届いていない値を、グラフはどう待つか

非同期の値は、グラフにとって「いつか書き込まれるシグナル」にすぎない。
この群では、その「いつか」の間、計算とエフェクトと画面をどう扱うかを足していく。
本物の `readSignal`・`writeSignal`・`runTop`・`completeUpdates` にある、1〜5章で読み飛ばした分岐はここで回収する。

### 21章　非同期の値をシグナルとして読むにはどうするか（`21-resource`）

- 問いの入口：20章末
- 足す機能：`createResource(source, fetcher)`。値・状態・エラーを別々のシグナルで持ち、`source` をメモにして変わるたびに `load` する。完了時は `pr === p` のときだけ反映する
- 並べる本物：`createResource` の `load`・`loadEnd`・`completeLoad`・`read`、`state`・`loading`・`latest` のゲッター（ハイドレーション関係の `initP`・`id`・`onHydrated` は読まない）
- 履歴：
  - `28270892`（2019-12-31 "new resource api, async renderToString"）
  - `0126e41d`（2020-09-11）で `if (pr === p)` の競合防止が入る
  - CHANGELOG 0.24.0：SWRやReact Queryに似せた形へ変更
  - CHANGELOG 1.4.0「Sources in `createResource` are now Memos」：refetchで source を再実行していたのが不自然だった
  - CHANGELOG 1.5.0「Stale Resource Reads」：`latest` の追加。`storage` オプションも `a209b35b`（#1176）
  - `c65faecd`（2025-04-30 "fix #2428 - owner always present in resource fetcher"）
- 章末の欠点：読み込み中は、読んでいる計算がそれぞれ `undefined` で走り、エフェクトも走る。「全部揃うまで見せない」境界がない
- エピグラフ候補：候補なし

### 22章　揃うまでエフェクトを止めておくにはどうするか（`22-suspense`）

- 問いの入口：21章末
- 足す機能：Suspenseの境界（DOMなし）。context経由でカウンタ（`increment`・`decrement`）を配り、`read` が読み込み中なら数を増やす。`runTop` は `node.suspense.inFallback()` のエフェクトを実行せず `suspense.effects` に溜め、解決したら `resumeEffects` で戻す
- 並べる本物：`createResource` の `read`（`Listener && !Listener.user` の条件で、ユーザーのエフェクトからの読み取りは境界を発動させない）、`runTop` の1行目近くの `node.suspense` の分岐、`resumeEffects`、`getSuspenseContext`、`render/Suspense.ts` の `store.increment`・`decrement`・`effects`
- 履歴：
  - `28270892`（2019-12-31）：`increment` の登場
  - `5facc82f`（2020-09-20 "fix effect timing under suspense"）：`suspense.inFallback` と `resumeEffects` の導入。当初の `resumeEffects` は `Promise.resolve().then` で遅らせていた
  - `a0cad92e`（2020-09-23 "update Suspense effects to run synchronous"）
  - `a57edc3a`（2020-09-21）で `!Listener.user` の条件が入る。9章の `user` の印の、もう一つの使い道
  - `be2ee1e9`（2021-11-10 "... fix #717 effects in suspense fallback"）
- 章末の欠点：再読み込みのたびに境界がフォールバックに戻り、表示済みの画面が消える
- エピグラフ候補：候補なし

### 23章　古い画面を見せたまま、新しい世界を計算できるか（`23-transition`）

- 問いの入口：22章末
- 足す機能：`startTransition`。Transition中の書き込みは `tValue` に、印は `tState` に書く。Transition中の読み取りは `tValue` を返す。未解決のPromiseがなくなったら `completeUpdates` で `value = tValue` に一斉に切り替える
- 並べる本物：`startTransition`、`useTransition`、`TransitionState`、`writeSignal` と `readSignal` と `runComputation` の `Transition.running` の分岐、`completeUpdates` の「finish transition」、7章で保留した `setter` の `s.tValue`、16章で保留した `createSelector` の `tState`
- 履歴：
  - `0126e41d`（2020-09-11）：`Transition` と `Transition.sources`・`Transition.promises` の導入。CHANGELOG 0.20.0「true concurrent rendering at a granular level ... currently only supports a single future」
  - `f0bc8641`（2020-09-12 "fix concurrent computation execution"）
  - `865642fb`（2021-08-09 "new concurrent scheduling, createUniqueId, from operator"）：`startTransition` の単独公開。CHANGELOG 1.1.0
  - CHANGELOG 1.3.0：`startTransition` がコールバックの代わりにPromiseを返す形に
  - `51cce75b`（2026-03-24 "Set committed value for computations created during transition (#2617)"、Fixes #2046）：Transition中に初めて作られた計算は `value` も入れる。`runComputation` のコメント `#2046`
  - `5086b27e`（2026-08-17、16章）
- 実装の注意：`readSignal` など5か所に分岐が要り、一歩15行に収まらないおそれがある。収まらなければ「書き込みと読み取りの二重化」と「切り替え」の2章に割る（そのときは24章以降を一つずつ送り、30章の `observable` を捨てる）
- 章末の欠点：Transitionの中で分岐が切り替わると、未来の世界で捨てた計算が、いまの世界でも破棄されてしまう（またはその逆）。テストで示す
- エピグラフ候補：Jorge Luis Borges「八岐の園（El jardín de senderos que se bifurcan）」（1941年、同名の短編集。のち『伝奇集』1944年所収）。すべての未来が同時に存在する迷宮。Solidは「未来は一つだけ」と決めた（CHANGELOG 0.20.0）ので、そこが違う

### 24章　未来の世界で捨てた計算は、いつ片付けるか（`24-transition-dispose`）

- 問いの入口：23章末
- 足す機能：Transition中は、`pure` な計算の子を `owned` ではなく `tOwned` に積む。`cleanNode` は子をすぐ破棄せず `reset` で `Transition.disposed` に入れ、切り替えのときにまとめて破棄する
- 並べる本物：`cleanNode` の `tOwned` と `reset` の分岐、`reset`、`createComputation` の `tOwned`、`runTop` と `writeSignal` の `Transition.disposed.has(...)`、`completeUpdates` での `disposed` の破棄
- 履歴：
  - `665e40a1`（2020-09-16 "better disposal in transition"）：`tOwned` の導入
  - `6d987f3c`（2020-11-18 "reduce unnecessary downstream computation in transition"）：`reset` の導入
  - `6189374e`（2020-11-21 "Fix boolean attrs in SSR, and transition executing dead branches"）：`disposed: new Set` の導入。死んだ分岐がTransition中に実行されていた
  - `0ad98597`（2023-01-12 "fix #1478 error infinite loop"）：`tOwned` の破棄が例外処理にも入る（15章と接続）
- 章末の欠点：Transitionの計算は一度に同期で走るので、重い更新の間は入力を受け付けない
- エピグラフ候補：候補なし

### 25章　重い更新を途中で譲るにはどうするか（`25-scheduler`）

- 問いの入口：24章末
- 足す機能：`enableScheduling()`。Transition中の `completeUpdates` は `runQueue` の代わりに `scheduleQueue` を使い、計算一つずつをスケジューラに渡す。スケジューラは5msごとに処理を区切る
- 並べる本物：`enableScheduling`、`scheduleQueue`、`Transition.queue`、`scheduler.ts` の `requestCallback`・`cancelCallback`・`yieldInterval`・`maxYieldInterval`・`isInputPending`（冒頭のコメント「Basic port modification of Reacts Scheduler」）
- 履歴：
  - `scheduler.ts` の現パスでの初出は `6d13d8e7`（2020-05-11 "re-organize"）。それ以前の置き場所は未確認
  - `865642fb`（2021-08-09）：`enableScheduling` と `scheduleQueue` の導入。CHANGELOG 1.1.0 は、実アプリで大きな差が出る場面をまだ見ていないが、デモとテストはできるようになったと書いている（皮肉の材料：作者自身が効果を保証していない機能）
  - `6ca4f2d2`（2021-04-15 "Remove dead scheduler code"）
  - `472c007b`（2025-08-06 "fix(scheduler): adjust yield timing logic ... (#2483)"）
- 章末の欠点：譲る仕組みはTransitionの中でしか使えない。検索窓の入力に対して、重い絞り込み結果だけを遅らせたい場面では使えない
- エピグラフ候補：候補なし。Reactのパートへの前方リンクを置く

---

## 第VI群（26〜30章）　グラフの外と、値をどう出し入れするか

ここまでのミニ実装は、すべての状態が自分のグラフの中にある前提で作ってきた。
最後の群では、時間の外（あとで公開する値）、他の仕組み（Reactの描画、RxJS、MobX）との出入り口を足す。

### 26章　値だけを遅れて公開するにはどうするか（`26-deferred`）

- 問いの入口：25章末
- 足す機能：`createDeferred(source, { timeoutMs })`。内側の計算は source を追跡してすぐ計算するが、外に見せるシグナルへの書き込みは `requestCallback` でアイドル時まで遅らせる
- 並べる本物：`createDeferred`（`createComputation` を直接使う）、`requestCallback` の `timeout`
- 履歴：
  - `f308d2e1`（2019-12-18）時点で存在
  - `3f1b9ce0`（2020-09-16）で引数名を `fn` から `source` に
  - `13b1fa6e`（2023-09-18 "fix #1883 initialize createDeferred with transition value"）
  - `51b07971`（2026-03-24 "fix: prevent createDeferred from keeping Node.js process alive (#2588)"）
- 章末の欠点：ここまでの計算はすべて、作った瞬間に `fn` を実行し、変更のたびに自動で走り直す。Reactの描画のように、自分の都合で読み直す側は「古くなった」とだけ知らされたい
- エピグラフ候補：Suetonius『皇帝伝』「神君アウグストゥス伝」25章4節（121年頃）。アウグストゥスの口癖「ゆっくり急げ（σπεῦδε βραδέως）」。計算は急ぎ、公開はゆっくり

### 27章　「古くなった」とだけ知らせるにはどうするか（`27-reaction`）

- 問いの入口：26章末
- 足す機能：`createReaction(onInvalidate)`。返り値の `track(fn)` で依存を記録し、最初の変更で一度だけ `onInvalidate` を呼ぶ。もう一度知りたければ `track` を呼び直す
- 並べる本物：`createReaction`（初期状態を `0` で作ること、`fn` の差し替え）
- 履歴：
  - `6c0f1fcf`（2022-01-05 "fix runWithOwner return, add createReaction"）。CHANGELOG 1.3.0：純粋にpull型の仕組み（Reactの描画サイクルなど）との連携向け、と説明
  - 同じCHANGELOGで「次の機能（External Sources）が似たAPIを使う」と書かれている。30章への前方参照
- 章末の欠点：外へ知らせる口はできたが、外から値を入れる口がない。RxJSのObservableや `setInterval` の値を読むには、毎回エフェクトと購読解除を手で書く
- エピグラフ候補：候補なし

### 28章　外から押し込まれる値をどう受け取るか（`28-from`）

- 問いの入口：27章末
- 足す機能：`from(producer)`。`subscribe` を持つものか、セッターを受け取って解除関数を返す関数を受け取り、`equals: false` のシグナルに流し込む。解除は `onCleanup`
- 並べる本物：`from`（`observable.ts`）
- 履歴：
  - `865642fb`（2021-08-09）。CHANGELOG 1.1.0：RxJSやSvelteのstoreとの連携用。「外部のストリームと合わせるため、比較をオフにしている」
  - `86ae8a9e`（2025-02-21 "add optional initalValue argument to `from` helper (#2429)"）：引数名の綴り（initalValue）が基準コミットでもそのまま残っている
- 章末の欠点：入れる口はできたが、Solidのシグナルを外のObservableの利用者に渡す口がない
- エピグラフ候補：候補なし

### 29章　シグナルを外の購読者に渡すにはどうするか（`29-observable`）

- 問いの入口：28章末
- 足す機能：`observable(accessor)`。`subscribe` のたびに `createRoot` と `createEffect` を作り、ハンドラは `untrack` の中で呼ぶ。所有者がいるときだけ `onCleanup` で解除を登録する
- 並べる本物：`observable`（`Symbol.observable || "@@observable"` の直書きと、その理由を示すコメント）
- 履歴：
  - `bb45afb5`（2021-04-26 "cleanup core repo"）で `observable.ts` が今の場所に
  - `03444b05`（2022-07-14 "fix: handle `observable()` w/o getOwner (#1115)"）：所有者がいない場所で呼ぶと `onCleanup` が警告を出していた（11章、13章と接続）
  - `f0f5623e`（2022-07-16 "fix: `observable()` typings (#1118)"）：コード中のコメントがこのPRを指している
- 章末の欠点：`from` も `observable` も、外の値を一つずつ包む。MobXのobservableをSolidの計算の中でそのまま読んでも、依存として記録されない
- エピグラフ候補：候補なし
- 備考：6つの群を5章ずつに揃えるために残した章で、仕組みは6・11・13章の組み合わせにすぎない。23章を割る必要が出たら、この章を捨てる

### 30章　別の反応系の依存を、Solidの計算に乗せられるか（`30-external-source`）

- 問いの入口：29章末
- 足す機能：`enableExternalSource(factory, untrack)`。`createComputation` が計算の `fn` を包み、外部の反応系の `track` の中で実行する。外部側の変更は `trigger`（`equals: false` のシグナル）でSolidに伝える
- 並べる本物：`enableExternalSource`（二つ目の登録を古いものに重ねる合成）、`createComputation` の `ExternalSourceConfig` の分岐、`untrack` の `ExternalSourceConfig.untrack`
- 履歴：
  - `47be3473`（2021-12-15 "feat: add `enableExternalSource` for reactivity interoperability (#739)"）。CHANGELOG 1.3.0：MobX、Vue Reactivity、Kairoの値をラッパーなしで使う実験。「Transitionとの両立にはまだ手間がかかる」
  - `8d2de12f`（2024-01-03 "fix #1850 untrack in external source"）：6章の `untrack` が外部の系には効いていなかった
  - `3fc015c2`（2024-07-24 "... fix mobx external source"）
  - `c6aa6728`（2026-08-17 "fix: re-subscribe external sources after a transition"）：Transition中に作られた計算は、Transition用の外部ソースしか追跡しておらず、終わった後に外部の更新を受け取れなかった。1.3で「まだ手間がかかる」と書かれた部分が、約4年8か月後、基準コミットの3週間足らず前に直っている
- 章末の引き：パートの終わり。25章のスケジューラの元になったReactのSchedulerへ。「値を押し出す」Solidと「描画をやり直す」Reactは、同じスケジューラで何を区切っているのか、という問いでReactのパートにつなぐ
- エピグラフ候補：『創世記』11章7節（欽定訳、1611年）、バベルの塔で言葉が乱される場面。別々の言葉を話す反応系を一つの計算に乗せる。構造の一致は弱いので、パス3でよりよい候補がなければ「候補なし」にする

---

## 付記：章とミニ実装の対応

| 章 | フォルダ | 前章から足すもの |
|---|---|---|
| 6 | `06-untrack` | `untrack` |
| 7 | `07-setter-fn` | 関数を受け取るセッター |
| 8 | `08-on` | `on` |
| 9 | `09-user-effects` | `createRenderEffect`、`user`、`runUserEffects` |
| 10 | `10-computed` | `createComputed` |
| 11 | `11-run-with-owner` | `getOwner`、`runWithOwner` |
| 12 | `12-context` | `createContext`、`useContext`、作成時の写し |
| 13 | `13-unowned-root` | `UNOWNED` |
| 14 | `14-catch-error` | `catchError`、`handleError`、`castError` |
| 15 | `15-error-recovery` | `runComputation` の `catch`、ハンドラの後回し |
| 16 | `16-selector` | `createSelector` |
| 17 | `17-map-array` | `mapArray` |
| 18 | `18-store` | `createStore`、`getNode`、`setProperty` |
| 19 | `19-store-shape` | `$SELF`、`$HAS`、`length`、`$TRACK` |
| 20 | `20-reconcile` | `reconcile`、`applyState` |
| 21 | `21-resource` | `createResource` |
| 22 | `22-suspense` | 境界のカウンタ、`suspense.effects`、`resumeEffects` |
| 23 | `23-transition` | `tValue`、`tState`、`startTransition` |
| 24 | `24-transition-dispose` | `tOwned`、`reset`、`Transition.disposed` |
| 25 | `25-scheduler` | `enableScheduling`、`scheduleQueue`、`requestCallback` |
| 26 | `26-deferred` | `createDeferred` |
| 27 | `27-reaction` | `createReaction` |
| 28 | `28-from` | `from` |
| 29 | `29-observable` | `observable` |
| 30 | `30-external-source` | `enableExternalSource` |

storeは `solid-js/store` として別パッケージだが、ミニ実装では同じフォルダに `store.ts` を足し、`signal.ts` からimportする。
18章以降のフォルダは `signal.ts` と `store.ts` の二つになる。
