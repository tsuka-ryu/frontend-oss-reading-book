# BACKLOG

このリポジトリで書く章の作業リスト。Claude（Dispatch / 見回りタスク）はこのファイルを見て次の作業を決める。

## ルール

- 状態は `[ ]` 未着手 / `[~]` 着手中 / `[x]` PR作成済み の3つ。
- 上から順に着手する。`[~]` があれば新しい項目より先にその続きをやる。
- 1章ごとにブランチを切り、PRを1本出す。ブランチ名は `chapter/<本の名前>-<章の短い名前>`。
- 章は既存の本のディレクトリ構成・目次（SUMMARY.md）・文体に合わせる。目次への追加も同じPRに含める。
- 解説はソースコードとgit履歴を根拠にし、参照したファイルパス・関数名・コミットを本文に残す。
- 平日の18:30を過ぎたら新しい項目には手を付けない。
- 判断に迷う点（章の分け方、対象バージョンなど）はPRの説明に書いて、人間のレビューに回す。

## シグナル実装

- [ ] シグナルとは何か：push/pullと依存グラフの全体像
- [ ] 依存の自動追跡：読み取り時の購読登録の仕組み
- [ ] 更新の伝播：dirtyフラグ、トポロジカル順、グリッチの回避
- [ ] computedとeffectのライフサイクル、解放とメモリ
- [ ] 実装の比較：Preact Signals / Solid / TC39 Signals提案

## React Hook Form

- [ ] 全体構造：useFormとcontrolオブジェクト
- [ ] registerと非制御コンポーネント：再レンダリングを減らす仕組み
- [ ] フォームの状態管理：formStateの購読とProxy
- [ ] バリデーションの流れとresolver
- [ ] ControllerとuseFieldArray

## oxc

- [ ] リポジトリ構成とクレートの役割分担
- [ ] レキサー：トークン化の実装
- [ ] パーサー：再帰下降とエラー回復
- [ ] ASTの設計とアリーナアロケータ
- [ ] セマンティック解析：スコープとシンボル
- [ ] Linter（oxlint）のルール実行の仕組み
- [ ] TransformerとMinifier

## Vite / Rolldown

- [ ] Viteの全体像：devサーバーとビルドの2つの顔
- [ ] devサーバー：ネイティブESMとオンデマンド変換
- [ ] プラグインパイプラインとRollup互換フック
- [ ] 依存関係の事前バンドル
- [ ] HMRの仕組み：モジュールグラフと更新の境界
- [ ] Rolldown：Rustで書き直したバンドラーの構成
- [ ] Rolldown：モジュール解決、チャンク分割、tree shaking
- [ ] ViteがRolldownに移行する意味

## React

- [ ] パッケージ構成：react / react-reconciler / react-dom / scheduler
- [ ] Fiberのデータ構造とダブルバッファリング
- [ ] レンダーフェーズ：beginWorkとcompleteWork
- [ ] コミットフェーズとエフェクトの実行順
- [ ] Hooksの実装：連結リストとディスパッチャー
- [ ] Lanesと優先度、Scheduler
- [ ] Concurrent機能：Transition、Suspense
- [ ] React Server Componentsとシリアライズ形式（Flight）
- [ ] React Compilerの仕組み

## Next.js

- [ ] リポジトリ構成とビルドパイプライン
- [ ] App Routerのルーティング：ファイルからルートツリーへ
- [ ] サーバーでのレンダリングとRSCペイロード
- [ ] クライアントのルーターとナビゲーション
- [ ] キャッシュの層：データ、フルルート、ルーターキャッシュ
- [ ] Server Actionsの実装
- [ ] Middlewareとエッジランタイム
- [ ] Turbopackとの統合

## Node.js

- [ ] 全体構造：V8、libuv、C++バインディング、JSのlib
- [ ] 起動の流れ：bootstrapからユーザーコードの実行まで
- [ ] イベントループとlibuvのフェーズ
- [ ] モジュールシステム：CommonJSとESMのローダー
- [ ] Streamsの実装とバックプレッシャー
- [ ] httpモジュールとllhttp
- [ ] Worker Threadsとメッセージング
