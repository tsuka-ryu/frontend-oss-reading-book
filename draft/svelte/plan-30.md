# Svelte 5 パス1: 約30章の章立て（plan-30）

対象: sveltejs/svelte（クローン先 `/tmp/oss/svelte`）
基準の版: `main` のコミット `020242d6`（2026-09-28）。`packages/svelte/package.json` の version は 5.57.1。タグは浅いcloneに含まれない。
FOCUS: runesのコンパイル結果と、それを受けるランタイムのシグナル
除外: SvelteKit、SSRの出力、CSSのスコープ化

この章立ては、`--depth 1` の浅いcloneで作った。
git履歴とPR本文はまだ一つも読んでいない。
各章の「履歴の手がかり」は、パス3で調べる項目の宛先だけを書く。理由の記述はすべてパス3の仕事である。

ファイルパスと関数名は、`020242d6` の作業ツリーで `ls` と `grep "^export function"` をかけて実在を確かめたものだけを書いた。
確かめていない名前は「未確認」と付けた。行番号はパス2で確かめる。

---

## この章立てで判断した点

### 題材のミニ実装

全章を通して、「小さなコンポーネント言語（`<script>` と `<p>{count}</p>` のようなテンプレート、`$state`、`$derived`、`$effect`、`{#if}`、`{#each}`）を、JavaScriptへコンパイルし、小さなランタイムで動かす」ミニ実装を一本育てる。
言語はTypeScriptで、`code/svelte/NN-slug/` に置く。
各章で足す機能は一つにする。

ミニ実装は、`code/signals/` で作ったシグナルの核を再実装せず、章ごとに必要な分だけ小さく持つ。
Svelteのランタイムは `source`、`derived`、`effect` を `internal/client/reactivity/` に持つ。そこが本物と並べる相手になる。

### FOCUSの広げ方

FOCUS「runesのコンパイル結果と、それを受けるランタイムのシグナル」を、次の問いに言い換えた。

「書き手がただの変数代入のように書いたコードを、コンパイラはどこまで書き換えて、ランタイムのシグナルに橋渡しするのか」

アークは、コンパイラの骨格、runes、テンプレートからDOM、ブロック、ランタイムのスケジューリング、周辺（props、store、非同期）の6つに分けた。

### 捨てた候補

- SvelteKit（`packages/kit`はこのリポジトリにあるか未確認）、SSRの出力（`3-transform/server/`、`internal/server/`）：第0節の除外
- CSSのスコープ化（`2-analyze/css/`、`3-transform/css/`）：第0節の除外
- トランジション、アニメーション、`use:` アクション（`dom/elements/transitions.js`、`actions.js`）：FOCUSの外。ブロックの章で存在にだけ触れる
- カスタム要素（`dom/elements/custom-element.js`）、`<svelte:head>`、`<svelte:window>`：同上
- Svelte 4以前のレガシーモード（`internal/client/legacy.js`、`$:`）：最後の章で「runesを足す前の姿」として一章だけ扱う
- `svelte/motion`、`svelte/transition`などのライブラリ関数：コンパイラとランタイムの核から外れる
- 型の生成、開発モードの検査（`internal/client/dev/`）：`$inspect` の章で触れる程度に留める

### 履歴の調べ方（パス3への申し送り）

- Svelte 5のrunesは、2023年のRFC「runes」と、5.0リリースまでの長い履歴を持つ。パス3の最初に、RFCの置き場所（`sveltejs/rfcs` か、このリポジトリの議論）を確かめる
- `CHANGELOG.md` と `.changeset/` を入口にする。`packages/svelte/CHANGELOG.md` の行頭のハッシュとPR番号を使う
- 浅いcloneでは履歴が読めないので、対象のパスに絞って `git fetch --deepen` か `git log -- <path>` で取得する

### エピグラフについて

各章の候補は仮である。パス4で底本を決めるときに出典の確度を確かめる。
既存パートで使った出典と重ならないように選ぶ。決めきれなかった章は「候補なし」とし、パス4で探す。

---

## ディレクトリマップ（`packages/svelte/src/`）

- `compiler/index.js`: 入口。`compile`、`compileModule`
- `compiler/phases/1-parse/`: テンプレートの構文解析。`index.js` の `parse`、`state/`（要素、タグ、テキスト、フラグメント）、`read/`、`acorn.js`（`<script>` と `{...}` の中のJavaScriptはacornに任せる）
- `compiler/phases/2-analyze/`: 意味解析。`index.js` の `analyze_component`、`analyze_module`。`visitors/` にノードごとの検査が並ぶ
- `compiler/phases/3-transform/`: 出力の生成。`index.js` の `transform_component`。`client/`（クライアント向け。`transform-client.js` の `client_component`）、`server/`（除外）、`css/`（除外）
- `compiler/phases/scope.js`: スコープと束縛（`Binding`）を作る
- `compiler/phases/3-transform/client/visitors/`: ノードごとのクライアント向け変換
- `compiler/phases/3-transform/client/transform-template/`: テンプレートのHTML文字列と、それに対するDOM操作の列を作る
- `internal/client/`: コンパイル結果が呼ぶランタイム
  - `reactivity/`: `sources.js`（`source`、`state`、`set`）、`deriveds.js`（`derived`、`user_derived`）、`effects.js`（`user_effect`、`render_effect`、`template_effect`、`branch`、`block`）、`batch.js`（`schedule_effect`、`flushSync`）、`props.js`、`store.js`、`async.js`
  - `proxy.js`: `$state` のオブジェクトを包む `proxy`
  - `runtime.js`: `get`、`untrack`、`update_reaction`、`is_dirty`
  - `dom/`: `template.js`（`from_html`、`append`）、`blocks/`（`if.js`、`each.js`、`key.js`、`snippet.js`、`boundary.js`、`await.js`）、`elements/`（属性、イベント、`bindings/`）、`operations.js`、`hydration.js`
  - `render.js`: `mount`、`hydrate`、`unmount`
- `internal/server/`: SSR（除外）
- 別の場所：`documentation/docs/`（公式ドキュメント。runesの節は `02-runes/`）、`.changeset/`、`packages/svelte/tests/`（`compiler-errors`、`runtime-runes`、`snapshot` など。名前は未確認）

## 語彙集（仮）

- rune：`$state` のように `$` で始まる、コンパイラが解釈する印。実体はimportできる関数ではない
- `source`：`reactivity/sources.js`。値を持つ書き込み可能なシグナル。`$state` の一つの変数ぶん
- `derived`：`reactivity/deriveds.js`。`$derived` の実体。`user_derived` が利用者向け
- effect：`reactivity/effects.js`。`user_effect`（`$effect`）、`render_effect`、`template_effect`（テンプレートの更新）、`branch`、`block` など、フラグで種類を分ける
- `Binding`：`phases/scope.js`。変数の種類（`state`、`derived`、`prop` など）をコンパイル時に覚える
- テンプレート（`from_html`）：HTMLを一度だけ文字列から作って `cloneNode` する仕組み
- anchor：ブロックが子のDOMを差し込む位置を示すコメントノードなど
- `Batch`：`reactivity/batch.js`。同じ更新の書き込みをまとめる単位
- `proxy`：`$state` で包まれたオブジェクトのプロパティごとに `source` を持つ `Proxy`

## 主要な呼び出しパス（仮。パス2で行番号まで確かめる）

1. コンパイル：`compile`（`compiler/index.js`）→ `parse`（`1-parse/index.js`）→ `analyze_component`（`2-analyze/index.js`）→ `transform_component`（`3-transform/index.js`）→ `client_component`（`transform-client.js`）→ `{ js, css, warnings }`
2. `$state` の書き込み：コンパイル後の `$.set(count, $.get(count) + 1)`（形は未確認、パス2で `snapshot` テストの出力から確かめる）→ `set`（`sources.js`）→ `internal_set` → 依存するリアクションを汚れ印付き → `schedule_effect`（`batch.js`）
3. テンプレートの更新：`from_html`（`template.js`）で作ったDOMを `template_effect` が更新する。`$.set_text`（`render.js`）
4. `{#each}`：`each`（`blocks/each.js`）が配列の変化を読み、キーで行を再利用または作り直す
5. マウント：`mount`（`render.js`）→ コンポーネント関数 → 子のブロックと effect の木

---

## アーク1　コンパイラは、ソースを何段で何に変えるか（1〜5章）

### 1章　コンポーネントのファイルは、何を入力にして何を返すのか

- ミニ実装: `code/svelte/01-compile-shape/`
- 足す機能: `compile(source)` が `{ js }` を返す。`<script>` と本文を、文字列として切り分けるだけ
- 並べる本物: `compiler/index.js`（`compile`、`compileModule`）、`3-transform/index.js`（`transform_component`）
- 履歴の手がかり: `compile` が三段に分かれた経緯。Svelte 3以前との違い。パス3
- 章末の欠点: テンプレートが文字列のまま。構造を持たない
- エピグラフ: 候補なし

### 2章　テンプレートを、どんな木に読むのか

- ミニ実装: `code/svelte/02-parse-template/`
- 足す機能: `<p>text {expr}</p>` を、要素、テキスト、式タグの木にする
- 並べる本物: `1-parse/index.js`（`parse`）、`state/element.js`、`state/tag.js`、`state/text.js`、`state/fragment.js`
- 履歴の手がかり: `{...}` の中のJSをacornに任せる判断（`acorn.js`）。パス3
- 章末の欠点: `{count}` の `count` が何を指すか分からない
- エピグラフ: 候補なし

### 3章　`{count}` の `count` は、どの宣言を指すのか

- ミニ実装: `code/svelte/03-scope/`
- 足す機能: `<script>` の宣言からスコープと束縛を作り、テンプレートの参照を結ぶ
- 並べる本物: `phases/scope.js`（`Binding`）、`2-analyze/index.js`（`analyze_component`）、`visitors/Identifier.js`
- 履歴の手がかり: 解析を別の段に分けた理由。パス3
- 章末の欠点: 変数が単なる変数か、リアクティブかを区別していない
- エピグラフ: 候補なし

### 4章　ビジターで、木をどう歩くのか

- ミニ実装: `code/svelte/04-visitors/`
- 足す機能: ノードの型ごとに関数を引く `walk`。`next()` で子へ進むか、止めるか
- 並べる本物: `2-analyze/visitors/`、`3-transform/client/visitors/`（`zimmerframe` の `walk` を使う。依存は未確認、パス2）
- 履歴の手がかり: 木の走査を自作しないで外部ライブラリに任せた経緯。パス3
- 章末の欠点: 木を歩くだけで、JSを出力していない
- エピグラフ: 候補なし

### 5章　木から、JavaScriptをどう組み立てるのか

- ミニ実装: `code/svelte/05-codegen/`
- 足す機能: 木から出力用のASTを作り、文字列にする。ビルダー関数 `b.call`、`b.id` のようなもの
- 並べる本物: `3-transform/client/transform-client.js`（`client_component`）、`utils/builders.js`（パスは未確認）
- 履歴の手がかり: 文字列連結ではなくASTを出す理由。ソースマップとの関係。パス3
- 章末の欠点: 出力はまだ静的なHTMLを作るだけ。更新の仕組みがない
- エピグラフ: 候補なし

---

## アーク2　`$state` は、どんなコードに変わるのか（6〜12章）

### 6章　`let count = $state(0)` は、なぜ関数呼び出しに見えるのか

- ミニ実装: `code/svelte/06-state-rune/`
- 足す機能: `$state(0)` を見つけて束縛の種類を `state` にする。importなしで使える理由を、コンパイラが先に消すことで示す
- 並べる本物: `2-analyze/visitors/CallExpression.js`、`VariableDeclarator.js`、`3-transform/client/visitors/VariableDeclaration.js`
- 履歴の手がかり: runesのRFCと、`$` で始まる名前を予約した判断。パス3
- 章末の欠点: 宣言は変えたが、読み書きがまだ変わっていない
- エピグラフ: 候補なし

### 7章　`count++` は、どうして `set` になるのか

- ミニ実装: `code/svelte/07-state-assign/`
- 足す機能: `count` の読みを `get(count)`、書きを `set(count, v)` に書き換える。`+=` と `++` も
- 並べる本物: `visitors/Identifier.js`、`AssignmentExpression.js`、`UpdateExpression.js`（client側）、`internal/client/reactivity/sources.js`（`set`、`update`）
- 履歴の手がかり: 「ただの代入に見せる」ためにコンパイラが担う分。パス3
- 章末の欠点: `source` と `get` のランタイムがなく、動かせない
- エピグラフ: 候補なし

### 8章　`source` は何を覚えているのか

- ミニ実装: `code/svelte/08-source/`
- 足す機能: 値、版、リアクション一覧を持つ `source`。`get` が実行中のリアクションを覚え、`set` が汚れ印を付ける
- 並べる本物: `reactivity/sources.js`（`source`、`internal_set`）、`runtime.js`（`get`、`update_reaction`、`is_dirty`）
- 履歴の手がかり: Svelte 4のストア中心から、Svelte 5のシグナルへ移った経緯。パス3
- 章末の欠点: 更新を誰がいつ流すか決めていない
- エピグラフ: 候補なし

### 9章　`$derived` は、どこでキャッシュされるのか

- ミニ実装: `code/svelte/09-derived/`
- 足す機能: `derived(fn)`。依存の値が変わったときだけ再計算する
- 並べる本物: `reactivity/deriveds.js`（`derived`、`user_derived`、`execute_derived`、`update_derived`）、`3-transform/client/visitors/VariableDeclaration.js`
- 履歴の手がかり: `$derived.by` の導入。`derived_safe_equal` が必要な理由（レガシーモードとの橋）。パス3
- 章末の欠点: 値は計算できるが、画面への反映がない
- エピグラフ: 候補なし

### 10章　`$effect` は、いつ走るのか

- ミニ実装: `code/svelte/10-effect/`
- 足す機能: `effect(fn)`。依存が変わるたびに、描画の後で再実行する。`teardown` を返せる
- 並べる本物: `reactivity/effects.js`（`user_effect`、`create_user_effect`、`execute_effect_teardown`）、`batch.js`（`schedule_effect`）
- 履歴の手がかり: `$effect.pre` と `$effect` の違いの経緯。コンポーネントが載るまで待つ仕組み（未確認）。パス3
- 章末の欠点: effectの親子関係と破棄が考えられていない
- エピグラフ: 候補なし

### 11章　effectの木は、どう片付くのか

- ミニ実装: `code/svelte/11-effect-tree/`
- 足す機能: 親のeffectの中で作ったeffectを子として登録し、親が再実行・破棄されるとき子も壊す
- 並べる本物: `reactivity/effects.js`（`branch`、`block`、`destroy_effect`、`destroy_effect_children`、`unlink_effect`）
- 履歴の手がかり: 木を持たない案との比較。`code/signals/` の第5章（入れ子の計算を片付ける）と対。パス3
- 章末の欠点: 値がオブジェクトのときの変更を検知できない
- エピグラフ: 候補なし

### 12章　`$state` のオブジェクトは、なぜ `Proxy` で包むのか

- ミニ実装: `code/svelte/12-proxy-state/`
- 足す機能: オブジェクトと配列を `Proxy` で包み、プロパティごとに `source` を持つ。深くまで包む
- 並べる本物: `internal/client/proxy.js`（`proxy`、`get_proxied_value`）、`sources.js`（`set` の `should_proxy`）
- 履歴の手がかり: Svelte 4の「代入しないと更新されない」制約を、Proxyで外した経緯。クラスのフィールドの `$state`（`ClassBody.js`）も同じ型。パス3
- 章末の欠点: 複数の書き込みが一つ一つ画面を更新するかもしれない
- エピグラフ: 候補なし

---

## アーク3　テンプレートは、どうDOMの命令列になるのか（13〜18章）

### 13章　HTMLは、なぜ一度だけ文字列から作るのか

- ミニ実装: `code/svelte/13-template-clone/`
- 足す機能: 静的な部分をHTML文字列にして、`<template>` で一度だけ解析し、`cloneNode` で複製する
- 並べる本物: `internal/client/dom/template.js`（`from_html`、`append`）、`3-transform/client/transform-template/`（`template.js`、`index.js`）
- 履歴の手がかり: 要素ごとに `createElement` する方式から、テンプレートの複製へ移った経緯。パス3
- 章末の欠点: 複製した中の「ここだけ動く場所」へどう辿り着くか決めていない
- エピグラフ: 候補なし

### 14章　動く場所へ、どう辿り着くのか

- ミニ実装: `code/svelte/14-walk-nodes/`
- 足す機能: コンパイラが `first_child`、`sibling` の連鎖を出し、ランタイムがそれでノードへ辿る
- 並べる本物: `internal/client/dom/operations.js`（`child`、`first_child`、`sibling` の名前は未確認、パス2）、`3-transform/client/visitors/Fragment.js`
- 履歴の手がかり: 空白テキストの扱いと、ハイドレーションとの食い違い。パス3
- 章末の欠点: 辿り着いた先で、値が変わったときに書き換える仕組みがない
- エピグラフ: 候補なし

### 15章　`{count}` は、どうテキストノードの更新になるのか

- ミニ実装: `code/svelte/15-template-effect/`
- 足す機能: 式タグごとに `template_effect` を出し、変わったときだけ `set_text` する
- 並べる本物: `reactivity/effects.js`（`template_effect`、`render_effect`）、`render.js`（`set_text`）、`visitors/ExpressionTag.js`（client側は未確認）
- 履歴の手がかり: 一つの `template_effect` にまとめる判断。値が前回と同じなら触らない比較。パス3
- 章末の欠点: 属性とイベントがない
- エピグラフ: 候補なし

### 16章　属性とイベントは、どう結ぶのか

- ミニ実装: `code/svelte/16-attributes-events/`
- 足す機能: 動的な属性と `onclick` を足す。イベントは委譲できるものを `document` で一括して受ける
- 並べる本物: `dom/elements/attributes.js`（`set_attribute`）、`events.js`（`delegate`、`event`）、`visitors/Attribute.js`、`RegularElement.js`
- 履歴の手がかり: イベント委譲を既定にした経緯。パス3
- 章末の欠点: `bind:value` のように、双方向の結びつきがない
- エピグラフ: 候補なし

### 17章　`bind:value` は、どう書き戻すのか

- ミニ実装: `code/svelte/17-bind/`
- 足す機能: `bind:value` を、読みのeffectと入力イベントの書き込みの対にする
- 並べる本物: `dom/elements/bindings/input.js`（未確認）、`visitors/BindDirective.js`（client側）、`2-analyze/visitors/BindDirective.js`
- 履歴の手がかり: 双方向の束縛を許すか、ReactやSolidと比べる。パス3
- 章末の欠点: 部分的に出し入れする場所（`{#if}`）がない
- エピグラフ: 候補なし

### 18章　コンパイル結果は、読める形で出ているか

- ミニ実装: `code/svelte/18-snapshot/`
- 足す機能: ミニ実装の出力を、スナップショットで固定して差分を読めるようにする
- 並べる本物: `packages/svelte/tests/snapshot/`（パスは未確認）、`transform-client.js`（`client_component` の全体）
- 履歴の手がかり: 出力の形を何度も変えたときの、テストの使われ方。パス3
- 章末の欠点: 出力の形は決まったが、DOMの出し入れが一つも書かれていない
- エピグラフ: 候補なし

---

## アーク4　ブロックは、DOMの出し入れをどう束ねるのか（19〜23章）

### 19章　`{#if}` は、DOMを消すのか隠すのか

- ミニ実装: `code/svelte/19-if-block/`
- 足す機能: 条件が変わったら、前の枝を壊して新しい枝を作る。anchorに差し込む
- 並べる本物: `dom/blocks/if.js`（`if_block`）、`reactivity/effects.js`（`branch`、`pause_effect`、`resume_effect`）、`dom/blocks/branches.js`
- 履歴の手がかり: 枝を捨てずに保持する `branches.js` の経緯（未確認）。パス3
- 章末の欠点: 条件が一つでなく、配列のときは？
- エピグラフ: 候補なし

### 20章　`{#each}` は、配列が変わったとき何を作り直すのか

- ミニ実装: `code/svelte/20-each-block/`
- 足す機能: 配列の各要素に子のeffectを持たせる。キーなしで、末尾へ足すだけ
- 並べる本物: `dom/blocks/each.js`（`each`、`index`）、`visitors/EachBlock.js`
- 履歴の手がかり: `each` が `$state` の配列の変更を検知する仕組み。パス3
- 章末の欠点: 並べ替えでDOMを全部作り直してしまう
- エピグラフ: 候補なし

### 21章　キーは、行の何を守るのか

- ミニ実装: `code/svelte/21-each-keyed/`
- 足す機能: キーで行を引き当て、並べ替えを移動で表す
- 並べる本物: `dom/blocks/each.js`（`reconcile` 相当の関数。名前は未確認）、`dom/reconciler.js`
- 履歴の手がかり: 移動の最小化アルゴリズムの選び方。パス3
- 章末の欠点: 子のコンポーネントに「断片」を渡せない
- エピグラフ: 候補なし

### 22章　`{#snippet}` と `{@render}` は、関数なのか

- ミニ実装: `code/svelte/22-snippets/`
- 足す機能: テンプレートの断片を関数として宣言し、描画の場所で呼ぶ
- 並べる本物: `dom/blocks/snippet.js`、`visitors/SnippetBlock.js`、`RenderTag.js`
- 履歴の手がかり: スロットから snippet へ移った経緯。パス3
- 章末の欠点: コンポーネントの組み合わせ（props）が未定
- エピグラフ: 候補なし

### 23章　コンポーネントは、どうマウントされるのか

- ミニ実装: `code/svelte/23-mount/`
- 足す機能: `mount(component, { target })`。ルートのeffectを作り、コンポーネント関数を呼ぶ
- 並べる本物: `internal/client/render.js`（`mount`、`unmount`）、`effects.js`（`component_root`、`effect_root`）
- 履歴の手がかり: `mount` と `hydrate` を分けた経緯。パス3
- 章末の欠点: 親から子へ、リアクティブな値を渡せない
- エピグラフ: 候補なし

---

## アーク5　propsと更新のスケジュール（24〜28章）

### 24章　`$props()` は、なぜ関数ではなくゲッターで渡すのか

- ミニ実装: `code/svelte/24-props/`
- 足す機能: 親が渡す式をゲッターで包み、子が読むたびに最新の値を得る
- 並べる本物: `reactivity/props.js`（`prop`、`rest_props`、`spread_props`）、`visitors/Component.js`、`2-analyze/visitors/` の `$props` 検査（未確認）
- 履歴の手がかり: ゲッターで渡す案と、`source` を直接渡す案の比較。パス3
- 章末の欠点: 子が親の値を書き戻すときの扱い（`$bindable`）
- エピグラフ: 候補なし

### 25章　書き込みを、いつまとめて流すのか

- ミニ実装: `code/svelte/25-batch/`
- 足す機能: マイクロタスクにまとめて流す。`flushSync` で同期的に流す
- 並べる本物: `reactivity/batch.js`（`Batch`、`schedule_effect`、`flushSync`）、`runtime.js`（`is_dirty`）
- 履歴の手がかり: `Batch` の導入の経緯（非同期のために入ったか、未確認）。`code/signals/` 第2章と対。パス3
- 章末の欠点: 書き込みの順序で、値の見え方が変わる場面がある
- エピグラフ: 候補なし

### 26章　`$state.snapshot` と `untrack` は、何を止めるのか

- ミニ実装: `code/svelte/26-untrack-snapshot/`
- 足す機能: 依存を作らずに読む `untrack`。プロキシを素の値に戻す `snapshot`
- 並べる本物: `runtime.js`（`untrack`、`deep_read`）、`proxy.js`、`$state.snapshot` の実体（`shared/clone.js` は未確認）
- 履歴の手がかり: `structuredClone` との関係。パス3
- 章末の欠点: 非同期の値を待つ場面がない
- エピグラフ: 候補なし

### 27章　`await` を式の中に置くと、更新はどう待つのか

- ミニ実装: `code/svelte/27-async/`
- 足す機能: `$derived(await ...)`。解決するまで、前の値のまま画面を保つ
- 並べる本物: `reactivity/async.js`、`deriveds.js`（`async_derived`）、`dom/blocks/boundary.js`、`async.js`
- 履歴の手がかり: 実験的機能（`experimental.async`）としての導入の経緯。パス3
- 章末の欠点: 解決前後の画面の一貫性。fork という別の手がある
- エピグラフ: 候補なし

### 28章　`svelte/store` は、なぜ今も残っているのか

- ミニ実装: `code/svelte/28-store/`
- 足す機能: `writable` と `$store` の自動購読。コンパイラが `store_get` に書き換える
- 並べる本物: `reactivity/store.js`（`store_get`、`store_set`、`setup_stores`）、`src/store/`（パスは未確認）
- 履歴の手がかり: runesと共存させた判断。パス3
- 章末の欠点: 古い書き方が残っているので、新旧が一つのコンポーネントに混ざる
- エピグラフ: 候補なし

---

## アーク6　Svelte 4からSvelte 5へ（29〜30章）

### 29章　`$:` は、なぜ依存を一度に解析できたのか

- ミニ実装: `code/svelte/29-legacy-reactive/`
- 足す機能: `$:` の文の依存を、コンパイル時に読み取る。依存した値が変わったら、その文を再実行する
- 並べる本物: `visitors/LabeledStatement.js`（client側）、`effects.js`（`legacy_pre_effect`）、`internal/client/legacy.js`
- 履歴の手がかり: コンパイル時の依存解析の限界（関数の中の依存が見えない）と、runesで実行時の依存追跡に変えた判断。パス3
- 章末の欠点: 新旧の差を見たので、書き手の視点で何が変わったか
- エピグラフ: 候補なし

### 30章　コンパイラが書き換えるものと、ランタイムが追うものの境目はどこか

- ミニ実装: `code/svelte/30-wrap-up/`
- 足す機能: ミニ実装全体を通して、「コンパイル時に決まること」と「実行時に決まること」の表を、テストで確かめられる形にする
- 並べる本物: `$state` の読み書き（7章）、`$derived`（9章）、テンプレート（15章）の対応を、本物の `snapshot` と並べる
- 履歴の手がかり: Solid、Vue Vapor、TC39 Signals提案との対比。後続のパートへの申し送り
- 章末の欠点: なし（パートの終わり）
- エピグラフ: 候補なし
