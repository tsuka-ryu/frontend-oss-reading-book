# TC39 Signals 提案 パス1: 約30章の章立て（plan-30）

対象:
- 提案本体 `proposal-signals/proposal-signals`（クローン先 `/tmp/oss/proposal-signals`）。コミット `9124ed91`（2025-08-11）。仕様文は `README.md` の「Signal algorithms」節（435〜668行付近）にある。`spec.emu` は9行のメタデータだけで、本文を持たない
- polyfill `proposal-signals/signal-polyfill`（クローン先 `/tmp/oss/signal-polyfill`）。コミット `1c33f914`（2025-02-13）、`package.json` の version は 0.2.2

FOCUS: 提案の仕様文とpolyfillの依存追跡、Watcherの設計
除外: 各フレームワークの採用状況

この章立ては、どちらも `--depth 1` の浅いcloneで作った。
git履歴、issue、TC39の議事録はまだ一つも読んでいない。
各章の「履歴の手がかり」は、パス3で調べる項目の宛先だけを書く。理由の記述はすべてパス3の仕事である。

ファイルパスと関数名は、上の2コミットの作業ツリーで `grep` して実在を確かめたものだけを書いた。
行番号と挙動の細部はパス2で確かめる。確かめきれていないものは「未確認」と付けた。

---

## この章立てで判断した点

### 「提案を読む」とは何をすることか

このパートの本物は2つある。仕様文（README内のアルゴリズム記述と状態遷移表）と、polyfill（実際に動くTypeScript）である。
提案リポジトリには実装がなく、実装は別リポジトリのpolyfillにある。そこで、章ごとに「仕様文が何を約束するか」と「polyfillがそれをどう満たすか」を並べて読む。
仕様文とpolyfillが食い違う箇所があれば、それは章の題材にする（見つかった場合のみ。パス2で突き合わせる）。

### polyfillの出自

`src/graph.ts` の冒頭に、Google LLCの著作権表示とAngularのライセンスURLがある。依存グラフの中核は、Angularのシグナル実装（`@angular/core/primitives/signals`）から取り込まれたものである。
一方、`src/wrapper.ts` が提案の公開API（`Signal.State`、`Signal.Computed`、`Signal.subtle`）を、その上に載せている。
このため、このパートの前半は「Angular由来の `ReactiveNode` グラフ」と「提案の公開API」の2層に分けて読む。取り込みの経緯はパス3で確かめる。

### 既存パート「シグナル」との重なり

既存のパート（signals）は、Solidのシグナルを一から作って読む。
このパートは、同じ道具を「標準にするなら何を決めねばならないか」の側から読む。作る題材は同じ依存追跡でも、問いが違う。
- 自動追跡、メモ化、動的な依存の外し方は、既存パートで扱った。ここでは「仕様文が状態をどう名付け、どの遷移を許すか」だけを読み、作り方の説明は繰り返さない
- 既存パートに章がある話題（バッチ、untrackなど）は、「なぜ提案はそれを入れた／入れなかったのか」の側から書く

### 題材のミニ実装

全章を通して、「提案のAPI（`State`、`Computed`、`Watcher`、`subtle`）の形をした小さなシグナルライブラリ」を一本育てる。
既存パートのミニ実装は再利用せず、`code/tc39-signals/NN-slug/` に新しく置く。TypeScriptで、Nodeのテストだけで動かす。
各章で足す機能は一つにする。

### 範囲の線引き

- 各フレームワークの採用状況は除外。ただしREADMEの「Solid・Vue・Svelte…と共通部分」の話は、提案が何を共通にしようとしたかを読む範囲でのみ触れる
- ベンチマーク（`tests/benchmarks/`）は、polyfillの性能の主張が出てくる章で名前を出す程度にとどめる
- 提案の「Omitted for now」に挙がるAsyncとTransactionsは、「入れなかったこと」として最終アークで読む。実装案には踏み込まない
- ecmarkupでのビルド（`npm run build`）と仕様の記法そのものは、深追いしない

### 履歴の調べ方（パス3への申し送り）

- 浅いcloneでは履歴が読めない。`git fetch --deepen` か、対象のパスに絞った `git log` を使う
- 設計の理由は、提案リポジトリのissue（README内にissue #30 Async、#73 Transactions、#32 convenience methods への言及がある）と、TC39への提出資料にあるはず。読めるかどうかはパス3の最初に確かめる（未確認）
- polyfillの `CHANGELOG.md` は、振る舞いが変わった節目の手がかりになる（未読）

### エピグラフについて

各章の候補は仮である。パス4で底本を決めるときに出典の確度を確かめる。全章「候補なし」とし、既存パートの出典と重ならないよう、パス4で探す。

---

## ディレクトリマップ

提案リポジトリ（`/tmp/oss/proposal-signals`）
- `README.md`: 動機、APIの素描（`.d.ts`）、仕組みの説明、アルゴリズムの仕様文、FAQ。これが仕様の本体
- `docs/`: 初期の調査（`initial-survey.md`）、テンプレート説明、ロゴ
- `meetings/`: 議事録のテンプレートだけ。実際の議事録はない
- `spec.emu`: ecmarkupのメタデータだけ

polyfill（`/tmp/oss/signal-polyfill/src/`）
- `graph.ts`（520行）: `ReactiveNode` と、生産者・消費者のあいだの辺の管理。Angular由来
- `signal.ts`（105行）: 書ける値（`createSignal`、`signalSetFn`）
- `computed.ts`（145行）: 派生値（`createComputed`、`UNSET` / `COMPUTING` / `ERRORED` の3つの印）
- `wrapper.ts`（286行）: 提案の公開API。`Signal.State`、`Signal.Computed`、`Signal.subtle.Watcher`、`introspectSources` ほか
- `equality.ts`: 既定の等価比較 `defaultEquals`
- `errors.ts`: 書き込み禁止の文脈で投げるエラー
- `public-api-types.ts`: 公開の型
- `../tests/`: 振る舞いごとのテスト（`behaviors/` に `graph`・`pruning`・`liveness`・`errors`・`cycles` ほか）、`Signal/` に公開APIごとのテスト、`Signal/ported/` にPreactとVueから移したテスト

## 語彙集（仮）

- Signal：時間とともに変わる値の一つの入れ物。読み取りは追跡される
- State / Computed：手で書き込む信号と、式から導かれる信号
- Watcher：信号の集合を見張り、変化の可能性があったときに通知する。エフェクトそのものではない
- 生産者（producer）/ 消費者（consumer）：`graph.ts` の用語。値を出す側と、読む側。Computedは両方を兼ねる
- epoch：書き込みのたびに進む全体の通し番号。版（version）と比べて「変わったか」を安く判定する
- 状態 `clean` / `checked` / `dirty` / `computing`：Computedの4状態（仕様文）。polyfillの `dirty` フラグや `UNSET` などの印との対応は、パス2で確かめる
- live（生きている）消費者：Watcherに（再帰的に）見張られている消費者。polyfillでは `liveConsumerNode` で辺を持つ
- 通知フェーズ：Watcherの `notify` が走っている間。この間は信号の読み書きを禁じる

## 主要な呼び出しパス（未検証。パス2で行番号を入れる）

1. `new Signal.State(v)` → `get()` → `producerAccessed` が、アクティブな消費者に辺を張る（`signal.ts`、`graph.ts`）
2. `state.set(x)` → `signalSetFn` → 等価比較 → `signalValueChanged` → `producerIncrementEpoch` → `producerNotifyConsumers` → `consumerMarkDirty`（`signal.ts`、`graph.ts`）
3. `computed.get()` → `computedGet` → `producerUpdateValueVersion` → `producerMustRecompute` → `consumerPollProducersForChange` → `producerRecomputeValue` → `consumerBeforeComputation` / `consumerAfterComputation`（`computed.ts`、`graph.ts`）
4. `watcher.watch(c)` → `producerAddLiveConsumer`、`set()` から `notify` が呼ばれ、`getPending()` で拾って `get()` する（`wrapper.ts`、`graph.ts`）
5. `watcher.unwatch(c)` → `producerRemoveLiveConsumerAtIndex` → `unwatched` フックの呼び出し（`wrapper.ts`、`graph.ts`）

## ミニ実装の段階計画

各章の終わりに残る欠点が、次章の動機になる。
欠点の欄は、パス1の時点の見立てである。

| 章 | 足す機能 | 並べる本物 | 終わりに残る欠点 |
|---|---|---|---|
| 1 | `State.get/set` と `Computed.get`（毎回計算する素朴版） | 仕様文 API sketch | 読むたびに再計算 |
| 2 | 自動追跡（アクティブな消費者） | `producerAccessed`、`activeConsumer` | 依存の外し方が雑 |
| 3 | キャッシュと`dirty` | `COMPUTED_NODE`、`producerMustRecompute` | 間接依存の変化を見落とす |
| 4 | `epoch`と版による変更検出 | `producerIncrementEpoch`、`lastCleanEpoch` | 全部を調べ直す |
| 5 | `clean` / `checked` / `dirty` の三色 | 仕様文の状態遷移表 | 「見張られていない」ものも全部印を付ける |
| 6 | 等価比較（`equals`） | `defaultEquals`、`ValueEqualityComparer` | 比較の例外は未対応 |
| 7 | 例外のキャッシュ | `ERRORED`、`computedGet` | 循環は未検出 |
| 8 | 循環の検出 | `COMPUTING`、`cycles.test.ts` | 動的依存の外し忘れ |
| 9 | 動的依存の入れ替えと刈り込み | `consumerBeforeComputation` / `AfterComputation`、`nextProducerIndex` | 書き込みの文脈制限なし |
| 10 | `untrack` と `currentComputed` | `Signal.subtle.untrack` | 通知の仕組みがない |
| 11 | `Watcher` の骨格と`notify` | `Watcher`、`consumerMarkedDirty` | 通知中の読み書きが可能 |
| 12 | 通知フェーズの禁止 | `isInNotificationPhase`、`prohibited-contexts.test.ts` | 見張りの解除が未実装 |
| 13 | `unwatch` と生きた辺の掃除 | `producerRemoveLiveConsumerAtIndex`、`consumerDestroy` | 見張られていない間の挙動 |
| 14 | `watched` / `unwatched` フック | `Signal.subtle.watched`、`unwatched` | 内部の観察手段がない |
| 15 | 内省API | `introspectSources` / `introspectSinks` / `hasSinks` / `hasSources` | エフェクトが書けるか未検証 |
| 16 | 提案のAPIだけで`effect`を書く | README「Implementing effects」 | スケジューリングは素朴 |
| 17〜 | 以降は、各アークの章立てに応じて決める。パス2で細部を詰める | | |

## 章立て案（30章、6アーク）

履歴の手がかりは、パス3の宛先である。

### アークA: 何を標準にするのか（1〜4章）

1. 標準にしようとしているものは何で、していないものは何か
   - 読む：README「Motivation」「Design goals」「Omitted for now」。ミニ実装：`State` と素朴な `Computed`
   - 履歴の手がかり：Stage 1提出時の議論、READMEの章の変遷
2. 毎回計算し直す素朴版を、どこから速くするのか
   - 読む：README「How Signals work」。ミニ実装：自動追跡の第一歩
3. 仕様文は、公開APIの形をどう決めているか
   - 読む：README「API sketch」と `src/public-api-types.ts`、`src/wrapper.ts` の `Signal` 名前空間。ミニ実装：クラスの形
   - 履歴の手がかり：`.get()` を選んだ理由（READMEに既に議論の跡がある）
4. 標準の信号は、なぜサブクラスにできるのか
   - 読む：README「Understanding the Signal class」、`wrapper.ts` のコンストラクタ。ミニ実装：`this` を渡すコールバック

### アークB: 依存追跡のしくみ（5〜11章）

5. 読み取りは、どうやって相手を覚えるのか
   - 読む：`graph.ts` の `activeConsumer`、`producerAccessed`
6. 値が変わったことを、全体の通し番号でどう判定するのか
   - 読む：`epoch`、`producerIncrementEpoch`、`lastCleanEpoch`
7. 計算結果を、いつまで信じてよいか
   - 読む：`computed.ts` の `COMPUTED_NODE`、`producerMustRecompute`
8. 「たぶん古い」と「確実に古い」を分けるのはなぜか
   - 読む：仕様文の `clean` / `checked` / `dirty` の遷移表、`consumerPollProducersForChange`
9. 等価なら、下流を動かさない
   - 読む：`equality.ts`、`custom-equality.test.ts`
10. 計算が投げた例外は、どこに保存されるのか
    - 読む：`ERRORED`、`errors.test.ts`
11. 自分自身を読む計算は、どう止めるのか
    - 読む：`COMPUTING`、`cycles.test.ts`

### アークC: 動的な依存と、読まない選択（12〜15章）

12. 前回の依存と今回の依存を、どう入れ替えるのか
    - 読む：`consumerBeforeComputation`、`consumerAfterComputation`、`producerIndexOfThis`
13. 使わなくなった依存を、どこで外すのか
    - 読む：`pruning.test.ts`、`dynamic-dependencies.test.ts`
14. 読んでも覚えさせない `untrack` を、なぜ「危ない」と名付けて入れたのか
    - 読む：`Signal.subtle.untrack`、README「An unsound escape hatch」
15. いま実行中の計算を、外から知るには
    - 読む：`currentComputed`、`currentComputed.test.ts`

### アークD: 通知だけを標準にする（16〜21章）

16. なぜ標準に `effect` がないのか
    - 読む：README FAQ「Why are Signals designed this way?」
    - 履歴の手がかり：effectを外す決定の議論
17. `Watcher` は何を見張り、いつ通知するのか
    - 読む：`wrapper.ts` の `Watcher`、仕様文の状態遷移
18. 通知は、なぜ同期で呼ばれるのか
    - 読む：README FAQ、`watcher.test.ts`
19. 通知の最中に、信号を読み書きさせないのはなぜか
    - 読む：`isInNotificationPhase`、`prohibited-contexts.test.ts`、`guards.test.ts`
20. 通知されたあと、どの信号を実行すればよいか
    - 読む：`getPending`
21. 提案のAPIだけで、`effect` を組み立てる
    - 読む：README「Implementing effects」。ミニ実装：マイクロタスクで流す素朴なエフェクト

### アークE: 生きている辺と後片付け（22〜26章）

22. 誰にも見張られていない計算は、なぜ辺を持たないのか
    - 読む：`graph.ts` の `liveConsumerNode`、`producerAddLiveConsumer`、`liveness.test.ts`
23. 見張りをやめたとき、辺はどう外れるのか
    - 読む：`unwatch`、`producerRemoveLiveConsumerAtIndex`、`watch-unwatch.test.ts`
24. 見張られ始めたときと、やめられたときに知らせるには
    - 読む：`Signal.subtle.watched` / `unwatched`、README「Using watched/unwatched」（現状は図と例がTODOのまま）
25. グラフの中身を、外から読み出すには
    - 読む：`introspectSources`、`introspectSinks`、`hasSinks`、`hasSources`。README「Introspection for SSR」（TODO）
26. GCで消えてほしい計算と、Watcherが抱え込むもの
    - 読む：README「Memory management」、README「Implementing effects」の注意書き
    - 履歴の手がかり：`WeakRef` を使わない理由（未確認。polyfillに現れるかをパス2で確かめる）

### アークF: 標準が引き受けなかったこと（27〜30章）

27. 他の実装のテストを、標準の実装に流し込む
    - 読む：`tests/Signal/ported/preact.test.ts`、`vue.test.ts`
28. 非同期を、なぜ今回は入れないのか
    - 読む：README「Omitted for now」のAsync、issue #30（未読）
29. 画面の遷移のために、グラフを複製できるか
    - 読む：README「Omitted for now」のTransactions、issue #73（未読）
30. 標準にするなら、どこまでを共通にできるのか
    - 読む：README「Status and development plan」「FAQ」。全章を通した振り返り

---

## パス2への申し送り

- 「主要な呼び出しパス」の関数名は `grep` で存在を確かめたが、呼び出しの順序と引数は未確認。行番号を入れる
- 仕様文の遷移表（番号1〜6）が、polyfillのどのコードに当たるかを突き合わせる。当たらないものは「未確認」に落とす
- アークEの章26（GCと `WeakRef`）は、polyfillに該当コードがない可能性がある。なければ章ごと差し替える
- `wrapper.ts` の `Watcher` の中身（`watch` / `unwatch` / `getPending` の本体）は、関数の頭しか読んでいない
