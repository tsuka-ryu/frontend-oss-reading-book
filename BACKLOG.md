# BACKLOG

このリポジトリで書くパートの作業リスト。Claude（Dispatch / 見回りタスク）はこのファイルを見て次の作業を決める。

## ルール

- 作業の単位はパートで、`spec/BOOK_SPEC.md` 第8節の生成パスを順に回す。パスごとに別のコミットにする。
- 状態は `[ ]` 未着手 / `[~]` 着手中 / `[x]` 完了 の3つ。パスごとに付ける。
- 上から順に着手する（末尾の「ダイジェストからの候補（未採用）」は着手対象にしない）。`[~]` があれば新しい項目より先にその続きをやる。
- 1パートごとにブランチを切り、PRを出す。ブランチ名は `part/<slug>`（slugは `spec/BOOK_SPEC.md` 第0節の表）。
- 扱う範囲は `spec/BOOK_SPEC.md` 第0節のFOCUSと除外に従う。下の「章の候補」はその範囲内の目安で、章立てはパス1で決める。
- 章は既存の本のディレクトリ構成・目次（SUMMARY.md）・文体に合わせる。目次への追加も同じPRに含める。
- 解説はソースコードとgit履歴を根拠にし、参照したファイルパス・関数名・コミットを本文に残す。
- 平日の18:30を過ぎたら新しい項目には手を付けない。
- 判断に迷う点（章の分け方、対象バージョンなど）はPRの説明に書いて、人間のレビューに回す。

## シグナル（signals）

「作る＋本物を読む」形式で全章を書き直し済み。

- [x] パス1 骨格
- [x] パス2 検証（ミニ実装のテストを本物の solid-js で動かして突き合わせた）
- [x] パス3 なぜを足す
- [x] パス4 本文化
- [x] パス5 規範による点検

章：

- [x] 読んだら覚えるシグナルを作る
- [x] 書き込みをまとめて流す
- [x] メモはいつ計算し直すか
- [x] 使わなくなった依存をどう外すか
- [x] 入れ子の計算を誰が片付けるか

## React Hook Form（rhf）

- [~] パス1 骨格（全章。1〜4章目は着手済み。4章目でControllerとuseFieldArrayを分割し、useFieldArrayを5章として追加。5章は未着手）
- [ ] パス2 検証
- [~] パス3 なぜを足す（全章。1〜4章目は着手済み）
- [~] パス4 本文化（1〜4章目のみ「作る＋本物を読む」形式で完了）
- [~] パス5 規範による点検（1〜4章目のみ）

章の候補：

- [x] フォームの値はどこに置かれているか（useFormとcontrol）
- [x] formStateのどのキーを読んだかを覚える（_proxyFormState と shouldRenderFormState）
- [x] registerと非制御コンポーネント
- [x] Controllerと名前で絞り込む購読（旧項目「ControllerとuseFieldArray」を分割。理由は`draft/rhf/pass1-skeleton.md`の「4章目の分割について」）
- [ ] useFieldArray

## oxc（oxc）

- [ ] パス1 骨格
- [ ] パス2 検証
- [ ] パス3 なぜを足す
- [ ] パス4 本文化
- [ ] パス5 規範による点検

章の候補：

- リポジトリ構成とクレートの役割分担
- レキサー：トークン化の実装
- パーサー：再帰下降とエラー回復
- ASTの設計とアリーナアロケータ
- セマンティック解析：スコープとシンボル
- TransformerとMinifier

## Svelte 5（svelte）

- [ ] パス1 骨格
- [ ] パス2 検証
- [ ] パス3 なぜを足す
- [ ] パス4 本文化
- [ ] パス5 規範による点検

章の候補：

- コンパイラの3段階：parse、analyze、transform
- `$state` はどんなコードにコンパイルされるか
- `$derived` と `$effect`：コンパイラが呼び出すランタイムのシグナル
- テンプレートからDOM操作の命令列へ

## Vue Vapor Mode（vue-vapor）

- [ ] パス1 骨格
- [ ] パス2 検証
- [ ] パス3 なぜを足す
- [ ] パス4 本文化
- [ ] パス5 規範による点検

章の候補：

- 仮想DOM版とVapor版で、同じSFCがどう違うコードになるか
- テンプレートのIR（中間表現）と、そこからのコード生成
- runtime-vaporの更新：`@vue/reactivity` のエフェクトがDOMを直接書き換える
- 仮想DOMを捨てて何を失ったか（コンポーネント間の互換性）

## Vite（vite）

- [ ] パス1 骨格
- [ ] パス2 検証
- [ ] パス3 なぜを足す
- [ ] パス4 本文化
- [ ] パス5 規範による点検

章の候補：

- Viteの全体像：devサーバーとビルドの2つの顔
- devサーバー：ネイティブESMとオンデマンド変換
- プラグインパイプラインとRollup互換フック
- 依存関係の事前バンドル
- HMRの仕組み：モジュールグラフと更新の境界

## React（react）

- [ ] パス1 骨格
- [ ] パス2 検証
- [ ] パス3 なぜを足す
- [ ] パス4 本文化
- [ ] パス5 規範による点検

章の候補：

- パッケージ構成：react / react-reconciler / react-dom / scheduler
- Fiberのデータ構造とダブルバッファリング
- レンダーフェーズ：beginWorkとcompleteWork
- コミットフェーズとエフェクトの実行順
- Lanesと優先度、Scheduler
- Concurrent機能：Transition、Suspense

## Next.js（nextjs）

- [ ] パス1 骨格
- [ ] パス2 検証
- [ ] パス3 なぜを足す
- [ ] パス4 本文化
- [ ] パス5 規範による点検

章の候補：

- `'use client'` / `'use server'` の境界はどこで検出されるか
- App Routerのルーティング：ファイルからルートツリーへ
- サーバーでのレンダリングとRSCペイロード
- クライアントのルーターとナビゲーション
- Server Actionsの実装

## TC39 Signals 提案（tc39-signals）

- [ ] パス1 骨格
- [ ] パス2 検証
- [ ] パス3 なぜを足す
- [ ] パス4 本文化
- [ ] パス5 規範による点検

章の候補：

- 提案が標準化しようとしているもの・しないもの
- `Signal.State` と `Signal.Computed`：polyfillの依存追跡
- `Signal.subtle.Watcher`：エフェクトを標準に入れず、通知だけを入れる設計
- Solid・Vue・Svelteの実装と、提案の共通部分

## Rust コンパイラ（rustc）

- [ ] パス1 骨格
- [ ] パス2 検証
- [ ] パス3 なぜを足す
- [ ] パス4 本文化
- [ ] パス5 規範による点検

章の候補はパス1で決める（FOCUS：クエリシステムとインクリメンタルコンパイル）。

## GHC（ghc）

- [ ] パス1 骨格
- [ ] パス2 検証
- [ ] パス3 なぜを足す
- [ ] パス4 本文化
- [ ] パス5 規範による点検

章の候補：

- コンパイラのパイプライン：Haskellのソースから、Core、STGへ
- Core：型付きの小さな中間言語に全部を落とす設計
- 型クラスは辞書を渡すコードになる
- 遅延評価の実装：サンク（thunk）と更新
- JavaScriptバックエンド（StgToJS）：遅延評価をJSの上にどう載せるか

## MoonBit（moonbit）

- [ ] パス1 骨格
- [ ] パス2 検証
- [ ] パス3 なぜを足す
- [ ] パス4 本文化
- [ ] パス5 規範による点検

章の候補：

- コンパイラのパイプライン：typedtreeからCore、Clam、Wasmへ
- Wasm GCを出力先にする意味：GCを自前で持たない言語実装
- Coreでの不要コード削除（`core_dce.ml`）と、出力サイズへのこだわり
- パターンマッチのコンパイル（`transl_match.ml`）

## Wado（wado）

- [ ] パス1 骨格
- [ ] パス2 検証
- [ ] パス3 なぜを足す
- [ ] パス4 本文化
- [ ] パス5 規範による点検

章の候補：

- なぜWasm Component ModelとWASI 0.3だけを出力先にするか（`docs/design-philosophy.md`、`docs/wep-2026-01-11-wasi-p3-only.md`）
- パイプラインと3層のIR：TIR、NIR、WIR（`docs/compiler.md`）
- エフェクトはWASIのcapability：`with Stdout` を型として検査する（`effect_check.rs`）
- トレイト呼び出しをすべて静的に解決する：vtableを持たない設計
- GCをモジュールに同梱しない：Wasm GCにメモリ管理を任せる（`docs/wep-2026-03-28-gc-in-components.md`）

## Ladybird（ladybird）

- [ ] パス1 骨格
- [ ] パス2 検証
- [ ] パス3 なぜを足す
- [ ] パス4 本文化
- [ ] パス5 規範による点検

章の候補：

- 仕様の手順をコードに写す書き方：コメントに仕様の文を残す慣習
- HTMLのトークナイザ：状態機械としての仕様
- ツリー構築：挿入モードと、壊れたHTMLの扱い
- イベントループ：タスク、マイクロタスク、レンダリングの更新

## Servo（servo）

- [ ] パス1 骨格
- [ ] パス2 検証
- [ ] パス3 なぜを足す
- [ ] パス4 本文化
- [ ] パス5 規範による点検

章の候補はパス1で決める（FOCUS：スタイル計算（Stylo）の並列化と再スタイルの無効化）。

## ダイジェストからの候補（未採用）

ダイジェスト（`spec/DIGEST_SPEC.md`）の実行中に見つけた章の候補。ここの項目には着手しない。採用するときは、人間が該当パートの「章の候補」へ移す。

書式：`- <題材>（パート: <slug または 新規>、出典: <PR URL>、YYYY-MM-DD 追記）`

- next/ogの画像生成（ImageResponse）とSVGシリアライズの安全性：属性値のXMLエスケープを境界に寄せる設計（パート: nextjs、出典: https://github.com/vercel/next.js/pull/99061、2026-09-23 追記）
- Solid 2.0（nextブランチ）のトランザクション型シグナルと楽観的更新：held truth・laneパス・A29ルールなど1.x系にはない設計（パート: 新規、出典: https://github.com/solidjs/solid/pull/3590、2026-09-23 追記）
- Ladybirdのプロセス分離とライブラリ切り出し：CompositorプロセスをLibWeb/LibWebViewから独立させたLibCompositingの設計（パート: 新規、出典: https://github.com/LadybirdBrowser/ladybird/pull/12152、2026-09-23 追記）
- Ladybirdのレイアウトエンジンにおけるsubtree局所性の不変条件とデバッグアサーションによる強制（パート: 新規、出典: https://github.com/LadybirdBrowser/ladybird/commit/cb290b60311af1fdd8b7d44266e9d5aa16a2a43d、2026-09-24 追記）
- Solid next のrecomputeが再入的なdisposeでフラグを取り落とすバグ：finally節での状態再構築が抱えるリスク（パート: 新規、出典: https://github.com/solidjs/solid/pull/3625、2026-09-24 追記）
- oxcのレキサー演算子ルックアップ表のコンパイル時定数化：const評価によるホットパス最適化を、実行時構造体の削除まで段階的に進めるリファクタリングの型（パート: oxc、出典: https://github.com/oxc-project/oxc/pull/26977、2026-09-25 追記）
- LadybirdのBlockContainer/Box統合と絶対配置要素のcontaining block自己解決：部分再レイアウトの境界判定を「レイアウトが確定した事実」から導く設計（パート: 新規、出典: https://github.com/LadybirdBrowser/ladybird/commit/07e8ff403b7bb622071e1f762d77decb55fc8838、2026-09-25 追記）
- Ladybirdのsite isolationオプション撤去とbrowsing context/documentの仕様準拠モデル化：マルチプロセスアーキテクチャの責務分離を仕様の記述に合わせて整理する設計（パート: 新規、出典: https://github.com/LadybirdBrowser/ladybird/commit/e5ebfb8809a5ff66cf5d6c70203cf714202dfb54、2026-09-25 追記）
- Solid next のCLIENT_HOLEをPromiseから凍結thenableに変える設計：「Promise風の振る舞い」と「本物のPromise」を分ける判断（パート: 新規、出典: https://github.com/solidjs/solid/pull/3658、2026-09-26 追記）
- LadybirdのGCディスパッチをC++ vtableから型ごとのCellTypeInfoテーブルに変える設計：Rust移行を見据えたポリモーフィズムの脱・vtable化（パート: 新規、出典: https://github.com/LadybirdBrowser/ladybird/pull/12175、2026-09-26 追記）
- Next.jsのRouteTree統合：ページ/レイアウトの区別を捨てたキャッシュ木構造の再設計（パート: nextjs、出典: https://github.com/vercel/next.js/pull/98970、2026-09-26 追記）
