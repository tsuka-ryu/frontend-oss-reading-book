# Rust コンパイラ パス1: 約30章の章立て（plan-30）

対象:
- `rust-lang/rust`（クローン先 `/tmp/oss/rust`）。コミット `a30aa9064df6` （2026-10-08）。`--depth 1` の浅いcloneで作った

FOCUS: クエリシステムとインクリメンタルコンパイル
除外: 型推論・借用検査の個別規則、LLVMコード生成

git履歴、PR、rustc-dev-guide、RFCはまだ一つも読んでいない。
各章の「履歴の手がかり」は、パス3で調べる項目の宛先だけを書く。理由の記述はすべてパス3の仕事である。

ファイルパスと関数名は、上のコミットの作業ツリーで `grep` して実在を確かめたものだけを書いた。
行番号と挙動の細部はパス2で確かめる。確かめきれていないものは「未確認」と付けた。

---

## この章立てで判断した点

### 「rustcを読む」とは何をすることか

rustcは巨大なので、読む範囲をクエリの仕組みに絞る。個々のクエリの中身（`typeck`、`mir_borrowck` など）は読まない。
読むのは「クエリを宣言する」「実行する」「依存を記録する」「前回の結果を再利用する」「ディスクに残す」の5つである。
読者がすでにシグナルのパートを通っていれば、この5つは「依存追跡の一般化」として読める。ただし対応は章の中で確かめ、無理に重ねない。

### ソースの配置が、昔の解説と違う

以前のrustcには `compiler/rustc_query_system` というクレートがあり、ここにクエリと依存グラフの共通部分があった。
今回読んだコミットには、このクレートがない。
- 宣言と型：`compiler/rustc_middle/src/queries.rs`、`rustc_middle/src/query/`、`rustc_middle/src/dep_graph/`
- 実行：`compiler/rustc_query_impl/src/`（`execution.rs`、`job.rs`、`incremental.rs` ほか）
- ディスクへの保存：`compiler/rustc_incremental/src/persist/`

統合の経緯と時期はパス3で調べる（未確認）。古い解説記事を読む読者のために、第1章か用語集の節で触れる。

### 既存パートとの関係

- シグナル／TC39 Signals：読み取りで辺を張る、版で変更を判定する、等価なら下流を動かさない、の3つがrustcにも現れる。ただしrustcの辺は「前回の実行」を超えて保存される。ここが核心の違いで、章11〜19がその比較の場になる
- Vite：HMRは「変わったモジュールから逆向きに無効化を伝える」。rustcは「根から前回の依存をたどって、変わっていないことを確かめる」。向きが逆である
- oxc：ASTの表現を前提にしてよい。ただしHIRやMIRの形は扱わない

### 題材のミニ実装

全章を通して、「小さな言語のコンパイラ（ファイルの一覧から関数名と型を取り出す程度）を、クエリで書き直して育てる」一本のTypeScriptを置く。
`code/rustc/NN-slug/` に章ごとに置き、Nodeのテストだけで動かす。各章で足す機能は一つにする。
rustcの型（`TyCtxt`、`DefId`）に似せた小さな型を最初に決める。

### 範囲の線引き

- 並列フロントエンド（`-Z threads`）は、章6と章7で「ロックと待機」の読む範囲に限る。スレッドプール自体（`rustc_thread_pool`）は読まない
- `Fingerprint` と `StableHasher` は章14で扱うが、ハッシュ関数そのものの設計は読まない
- メタデータ（`.rmeta`）のエンコードは除外。`separate_provide_extern` に言及する程度
- `determine_cgu_reuse`（章29）は、再利用するかどうかの判定だけを読む。コード生成の中身は読まない
- セルフプロファイル（`self_profile.rs`）は読まない

### 履歴の調べ方（パス3への申し送り）

- 浅いcloneでは履歴が読めない。対象のパスに絞って `git fetch --deepen` するか、`git log -- <path>` を使う
- 設計の理由は、rustc-dev-guideの「Queries」章、incremental compilationのブログ（Niko Matsakis, 2016）、RFC 1298（incremental compilation）に当たるはず（いずれも未読）
- `rustc_query_system` をなくしたコミット、`rustc_query_impl` の分離、`DepNode` の `key_fingerprint` 化の経緯は、PRの本文から探す

### エピグラフについて

各章のエピグラフは仮置きもしない。パス4で底本を決める。既存パートの出典と重ならないようにする。

---

## ディレクトリマップ

`/tmp/oss/rust/compiler/` 以下
- `rustc_middle/src/queries.rs`: `query` マクロで全クエリを宣言する一覧。型は `Providers` などに展開される
- `rustc_middle/src/query/`: クエリの型と部品。`modifiers.rs`（`eval_always`、`cache_on_disk` などの修飾子の説明）、`caches.rs`（`DefaultCache`、`SingleCache`、`DefIdCache`）、`job.rs`（`QueryJob`、`QueryState`、`QueryLatch`）、`erase.rs`（値の型消去）、`on_disk_cache.rs`（`OnDiskCache`）、`keys.rs`（キーの型）
- `rustc_middle/src/dep_graph/`: 依存グラフ。`dep_node.rs`（`DepNode`、`DepKind`、`DepKindVTable`）、`graph.rs`（`DepGraph`、`DepGraphData`、`try_mark_green`、`with_task`）、`serialized.rs`（`SerializedDepGraph`、`GraphEncoder`）、`edges.rs`、`retained.rs`
- `rustc_middle/src/ich.rs`: `StableHashState`。安定ハッシュのための文脈
- `rustc_middle/src/ty/context/tls.rs`: `ImplicitCtxt`。現在のクエリと `task_deps` をスレッドローカルに持つ
- `rustc_query_impl/src/`: クエリの実行系。`execution.rs`（`try_execute_query`、`execute_job_incr`、`force_query_dep_node`）、`job.rs`（循環検出）、`handle_cycle_error.rs`（クエリごとの循環の扱い）、`incremental.rs`（ディスク上の値の読み込みと検証）、`query_vtables.rs`、`dep_kind_vtables.rs`
- `rustc_incremental/src/persist/`: `save.rs`、`load.rs`、`fs.rs`（セッションディレクトリ、ロック、古いものの掃除）、`file_format.rs`（ヘッダ）、`work_product.rs`、`clean.rs`（`#[rustc_clean]` の検査）
- `rustc_data_structures/src/`: `fingerprint.rs`（`Fingerprint`）、`stable_hash.rs`、`sharded.rs`
- `rustc_codegen_ssa/src/base.rs`: `determine_cgu_reuse`

## 語彙集（仮）

- クエリ（query）：キーを受けて結果を返す関数。結果は同一セッション内で記憶される。`queries.rs` で宣言する
- プロバイダ（provider）：クエリの実装。`Providers` 構造体に関数ポインタとして登録する
- `tcx`（`TyCtxt`）：コンパイラの全状態への入口。クエリはここのメソッドとして呼ぶ
- `DepNode`：クエリ1回分の名前。`DepKind`（どのクエリか）と `key_fingerprint`（どのキーか）の組
- `DepNodeIndex` / `SerializedDepNodeIndex`：現在の実行／前回の実行のグラフ上での通し番号
- `Fingerprint`：128ビットの安定ハッシュ。クエリ結果が変わったかの判定に使う
- red / green：前回と比べて、結果が変わった（red）／変わっていない（green）。`DepNodeColor` に `Green(..)`、`Red`、`Unknown` の3値がある
- `try_mark_green`：前回の依存を根から確かめ、再計算せずに緑にできるか試す関数
- forcing：緑にできない親に出会ったとき、その親のクエリを実際に実行して色を決めること
- `eval_always`：依存を追跡せず、常に赤とみなすクエリ
- `anon`：キーを持たず、依存の集合だけで同定される仕事
- `feedable`：他のクエリから値を設定できるクエリ
- `cache_on_disk`：結果をディスクに残し、次のセッションで読み込めるようにする修飾子
- `WorkProduct`：コード生成単位（CGU）の成果物。ファイルとして再利用される
- セッションディレクトリ：増分用の保存先。ロック付きで作り、成功したら確定させる

## 主要な呼び出しパス（未検証。パス2で行番号を入れる）

1. `tcx.some_query(key)` → キャッシュ参照 → 無ければ `try_execute_query` → 実行中か調べる → `execute_job_incr` → `DepGraph::with_task` → プロバイダ呼び出し → 結果の `hash_result` → キャッシュに登録（`execution.rs`、`graph.rs`）
2. プロバイダ内で別のクエリ `tcx.other(k)` → キャッシュ命中 → `DepGraph::read_index` → 呼び出し元の `TaskDeps` に辺を追加（`graph.rs`、`tls.rs`）
3. 2回目のセッションで同じクエリ → `ensure_can_skip_execution` → `try_mark_green` → `try_mark_previous_green` → 親ごとに色を調べ、`Unknown` なら `try_force_from_dep_node` → 全部緑なら緑 → `load_from_disk_or_invoke_provider_green` → `try_load_from_disk`（`execution.rs`、`graph.rs`、`incremental.rs`）
4. セッションの終わり → `save_dep_graph` → `GraphEncoder::finish_encoding`、`OnDiskCache::serialize`、`finalize_session_directory`（`save.rs`、`serialized.rs`、`on_disk_cache.rs`、`fs.rs`）
5. セッションの始まり → `setup_dep_graph` → `load_dep_graph` → `SerializedDepGraph::decode` → `load_query_result_cache`（`load.rs`、`serialized.rs`）

## ミニ実装の段階計画

欠点の欄はパス1の時点の見立てである。

| 章 | 足す機能 | 並べる本物 | 終わりに残る欠点 |
|---|---|---|---|
| 1 | 関数をメモ化するだけの `query` | `queries.rs` の `query` 宣言 | 何に依存したか分からない |
| 2 | 宣言とプロバイダの分離 | `Providers`、`modifiers.rs` | 呼び出し側と実装側の型がずれる |
| 3 | `tcx` 経由の呼び出し | `query_api.rs`、`calls.rs` | 登録を忘れても気づけない |
| 4 | キーの種類ごとのキャッシュ | `caches.rs` | 実行中の状態を持たない |
| 5 | 実行中のジョブ表 | `QueryState`、`try_execute_query` | 再帰で固まる |
| 6 | スレッド間の待機 | `QueryLatch`、`wait_for_query` | 循環で永久に待つ |
| 7 | 循環の検出と報告 | `find_cycle_in_stack`、`handle_cycle_error::default` | 循環を許したい例がある |
| 8 | クエリごとの循環ハンドラ | `fn_sig`、`layout_of`、`variances_of` | 深い再帰を止められない |
| 9 | 深さの上限 | `depth_limit`、`depth_limit_error` | 結果の型がまちまち |
| 10 | 結果の型消去 | `erase.rs`、`arena_cache` | 依存がまだ分からない |
| 11 | 読み取りで辺を張る | `with_task`、`read_index`、`TaskDeps` | 名前が実行ごとに変わる |
| 12 | `DepNode` | `dep_node.rs` | キーが実行ごとに変わる |
| 13 | 安定なキー | `DefPathHash`、`DepNodeKey` | 結果の同一性が分からない |
| 14 | 結果の指紋 | `Fingerprint`、`hash_result`、`StableHashState` | 追跡できない入力がある |
| 15 | `eval_always` と `ignore` | `with_ignore`、`DepKind::Red` | 名前のない仕事がある |
| 16 | `anon` | `with_anon_task`、`AnonZeroDeps` | 外から値を渡せない |
| 17 | `feed` | `with_feed_task`、`check_feedable_consistency` | 前回のグラフが無い |
| 18 | 前回のグラフを土台にする | `DepGraphData`、`DepNodeColor` | 再計算を省けない |
| 19 | `try_mark_green` | `graph.rs` の `try_mark_previous_green` | 親が未判定のとき進めない |
| 20 | forcing | `try_force_from_dep_node`、`force_query_dep_node` | キーを復元できない親 |
| 21 | `no_force` とキーの復元 | `DepKindVTable`、`modifiers.rs` | 値をまだ読み込めない |
| 22 | 緑なら読み込む | `load_from_disk_or_invoke_provider_green` | 値の正しさを疑う場合 |
| 23 | 検証 | `should_verify_loaded_value`、`verify_query_key_hashes` | ディスクに書けていない |
| 24 | グラフの書き出し | `serialized.rs`、`save_dep_graph` | 全部は読み戻したくない |
| 25 | グラフの読み戻し | `SerializedDepGraph::decode`、`load_dep_graph` | 結果の値がまだ無い |
| 26 | 結果のキャッシュ | `OnDiskCache`、`encode_query_values` | ファイルが壊れたら |
| 27 | ヘッダとセッションディレクトリ | `file_format.rs`、`fs.rs` | 診断が再現されない |
| 28 | 副作用の再現 | `QuerySideEffect`、`force_side_effect` | 成果物の再利用がまだ |
| 29 | 成果物の再利用 | `WorkProduct`、`determine_cgu_reuse` | 正しさをどう保証するか |
| 30 | 期待を宣言する検査 | `#[rustc_clean]`、`check_clean_annotations` | （最終章。振り返り） |

---

## 章立て（30章、6アーク）

### アークA: 問いとして書くコンパイラ（1〜4章）

1. コンパイラを関数の集まりとして書き直すと、何が変わるのか
   - 読む：`rustc_middle/src/queries.rs` の `query` 宣言。ミニ実装：メモ化するだけの `query`
   - 履歴の手がかり：パス式のコンパイラからクエリ式への移行（RFC 1298、未読）
2. 宣言と実装を、なぜ別の場所に書くのか
   - 読む：`Providers`、`modifiers.rs` の `desc`
3. 呼ぶ側は、実装をどうやって知らずに済むのか
   - 読む：`query_api.rs`、`calls.rs`、`rustc_query_impl/src/lib.rs` の `provide`、`hooks.rs`
4. キーの形によって、キャッシュを変えるのはなぜか
   - 読む：`caches.rs` の `DefaultCache` / `SingleCache` / `DefIdCache`、`keys.rs`

### アークB: 実行中の問い合わせ（5〜10章）

5. いま実行中の問い合わせを、どう覚えておくのか
   - 読む：`QueryState`、`QueryJob`、`try_execute_query`
6. 同じ問い合わせを二つのスレッドが始めたら
   - 読む：`QueryLatch`、`latch_wait_on`、`wait_for_query`
7. 問い合わせが自分自身を呼んだら
   - 読む：`job.rs` の `find_cycle_in_stack`、`handle_cycle_error::default`
8. 循環を、エラーにしないクエリがあるのはなぜか
   - 読む：`handle_cycle_error.rs` の `fn_sig`、`layout_of`、`variances_of`
9. 深すぎる再帰は、どこで止めるのか
   - 読む：`depth_limit`、`depth_limit_error`、`start_query`
10. 型の違う結果を、一つの入れ物に入れるには
    - 読む：`erase.rs`、`arena_cached.rs`

### アークC: 依存を記録する（11〜17章）

11. 結果を読んだことを、どう辺にするのか
    - 読む：`with_task`、`read_index`、`TaskDeps`、`tls.rs` の `ImplicitCtxt`
12. 問い合わせに、どんな名前を付けるのか
    - 読む：`dep_node.rs` の `DepNode`、`DepKind`
13. 実行をまたいで同じ名前になるキーとは
    - 読む：`DepNodeKey`、`from_def_path_hash`
14. 結果が変わったかを、値を持たずに判定するには
    - 読む：`Fingerprint`、`hash_result`、`ich.rs` の `StableHashState`、`no_hash` 修飾子
15. 依存を追跡しない問い合わせは、なぜ必要なのか
    - 読む：`eval_always`、`with_ignore`、`DepKind::Red`
16. キーを持たない仕事の名前は、どう決まるのか
    - 読む：`with_anon_task`、`AnonZeroDeps`
17. 結果を外から押し込む `feed` は、依存をどう扱うのか
    - 読む：`feedable`、`with_feed_task`、`check_feedable_consistency`

### アークD: 赤と緑（18〜23章）

18. 前回のグラフを、今回のグラフの土台にするには
    - 読む：`DepGraphData`、`DepNodeColor`、`DepGraph::new`
19. 前回と同じだと、再計算せずに確かめるには
    - 読む：`try_mark_green`、`try_mark_previous_green`
    - 履歴の手がかり：red-green アルゴリズムの導入（2017年ごろ、未確認）
20. 親が未判定のとき、実際に動かして色を決める
    - 読む：`try_force_from_dep_node`、`force_query_dep_node`
21. 名前から問い合わせを復元できないとき
    - 読む：`DepKindVTable` の `force_from_dep_node_fn`、`no_force`
22. 緑なら、値は計算せずに読み込めばよい
    - 読む：`ensure_can_skip_execution`、`load_from_disk_or_invoke_provider_green`、`try_load_from_disk`
23. 緑と言ったのに値が違ったら
    - 読む：`should_verify_loaded_value`、`verify_query_key_hashes`、`-Z incremental-verify-ich`（`options.rs`）

### アークE: ディスクに残す（24〜28章）

24. グラフを、どんな形式で書き出すのか
    - 読む：`serialized.rs` の `GraphEncoder`、`encode_node`、`save_dep_graph`
25. 前回のグラフを、全部は展開せずに使うには
    - 読む：`SerializedDepGraph::decode`、`load_dep_graph`、`setup_dep_graph`
26. 結果の値を、どう保存し、必要なものだけ読み戻すのか
    - 読む：`OnDiskCache::serialize`、`try_load_query_value`、`CacheEncoder` / `CacheDecoder`、`encode_query_values`
27. 壊れたファイルや、同時に走る別のrustcから、どう身を守るか
    - 読む：`file_format.rs` のヘッダ、`fs.rs` の `lock_directory`、`finalize_session_directory`、`garbage_collect_session_directories`
28. 警告やエラーを、再計算せずに再現するには
    - 読む：`QuerySideEffect`、`record_diagnostic`、`force_side_effect`、`diagnostics.rs`

### アークF: 成果物の再利用と保証（29〜30章）

29. 前回作った成果物を、どの単位で再利用するのか
    - 読む：`WorkProduct`、`work_product.rs`、`determine_cgu_reuse`（LLVM側は読まない）
30. 増分コンパイルが正しいことを、どう保証するのか
    - 読む：`clean.rs` の `#[rustc_clean]`、`check_clean_annotations`、`assert_dep_graph.rs`。全章を通した振り返り

---

## パス2への申し送り

- 「主要な呼び出しパス」の関数名は `grep` で存在を確かめたが、呼び出しの順序と引数は未確認。行番号を入れる
- `rustc_query_system` がなくなった経緯を、パス3の前にパス2で現物の `git log` から確かめる
- 章20〜21の `try_force_from_dep_node` の定義位置と、`force_from_dep_node_fn` との関係は未確認
- `ensure_can_skip_execution`（`execution.rs` 595行付近）と `try_mark_green` の呼び出し関係は、関数の頭しか読んでいない
- 章28の `QuerySideEffect` が、診断以外に何を運ぶかは未確認
- 章9の `depth_limit` を使うクエリの一覧は未確認
