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

## Vite / Rolldown（vite）

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
- Rolldown：Rustで書き直したバンドラーの構成
- ViteがRolldownに移行する意味

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

## Node.js（node）

- [ ] パス1 骨格
- [ ] パス2 検証
- [ ] パス3 なぜを足す
- [ ] パス4 本文化
- [ ] パス5 規範による点検

章の候補：

- CommonJSのローダーとモジュール解決
- ESMのローダーとモジュール解決
- ESMとCJSの相互運用：importからrequireへ、requireからESMへ

## Rust コンパイラ（rustc）

- [ ] パス1 骨格
- [ ] パス2 検証
- [ ] パス3 なぜを足す
- [ ] パス4 本文化
- [ ] パス5 規範による点検

章の候補はパス1で決める（FOCUS：クエリシステムとインクリメンタルコンパイル）。

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
- BunのTLS証明書ホスト名照合の修正：IDNAマッピングとURL構文解析を取り違えた回帰と、差分テストによる検証手法（パート: 新規、出典: https://github.com/oven-sh/bun/pull/43040、2026-09-24 追記）
- Ladybirdのレイアウトエンジンにおけるsubtree局所性の不変条件とデバッグアサーションによる強制（パート: 新規、出典: https://github.com/LadybirdBrowser/ladybird/commit/cb290b60311af1fdd8b7d44266e9d5aa16a2a43d、2026-09-24 追記）
- Solid next のrecomputeが再入的なdisposeでフラグを取り落とすバグ：finally節での状態再構築が抱えるリスク（パート: 新規、出典: https://github.com/solidjs/solid/pull/3625、2026-09-24 追記）
- Bunのプロファイル駆動バイトコード並び替え：構文のハッシュで関数を識別し、プロファイルのビルド間ポータビリティを確保する設計（パート: 新規、出典: https://github.com/oven-sh/bun/pull/43811、2026-09-25 追記）
- oxcのレキサー演算子ルックアップ表のコンパイル時定数化：const評価によるホットパス最適化を、実行時構造体の削除まで段階的に進めるリファクタリングの型（パート: oxc、出典: https://github.com/oxc-project/oxc/pull/26977、2026-09-25 追記）
- LadybirdのBlockContainer/Box統合と絶対配置要素のcontaining block自己解決：部分再レイアウトの境界判定を「レイアウトが確定した事実」から導く設計（パート: 新規、出典: https://github.com/LadybirdBrowser/ladybird/commit/07e8ff403b7bb622071e1f762d77decb55fc8838、2026-09-25 追記）
- Ladybirdのsite isolationオプション撤去とbrowsing context/documentの仕様準拠モデル化：マルチプロセスアーキテクチャの責務分離を仕様の記述に合わせて整理する設計（パート: 新規、出典: https://github.com/LadybirdBrowser/ladybird/commit/e5ebfb8809a5ff66cf5d6c70203cf714202dfb54、2026-09-25 追記）
- Bunのホスト名/IPリテラル検証の厳格化：文字列としてのホスト名解釈が複数レイヤーでズレるとTLS証明書検証が抜ける、というパースの不一致パターン（パート: 新規、出典: https://github.com/oven-sh/bun/pull/43873、2026-09-26 追記）
- Node.jsの`--process-timeout`フラグ：ネイティブウォッチドッグスレッドによるプロセス全体のタイムアウト強制という設計（パート: 新規、出典: https://github.com/nodejs/node/pull/66138、2026-09-26 追記）
- Solid next のCLIENT_HOLEをPromiseから凍結thenableに変える設計：「Promise風の振る舞い」と「本物のPromise」を分ける判断（パート: 新規、出典: https://github.com/solidjs/solid/pull/3658、2026-09-26 追記）
- LadybirdのGCディスパッチをC++ vtableから型ごとのCellTypeInfoテーブルに変える設計：Rust移行を見据えたポリモーフィズムの脱・vtable化（パート: 新規、出典: https://github.com/LadybirdBrowser/ladybird/pull/12175、2026-09-26 追記）
- Next.jsのRouteTree統合：ページ/レイアウトの区別を捨てたキャッシュ木構造の再設計（パート: nextjs、出典: https://github.com/vercel/next.js/pull/98970、2026-09-26 追記）
