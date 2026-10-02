# Vue Vapor Mode パス1: 約30章の章立て（plan-30）

対象: vuejs/core（クローン先 `/tmp/oss/vue-core`、`minor` ブランチ）
基準の版: `minor` のコミット `444eef4b`（2026-09-30、`release: v3.6.0-rc.10`）。`packages/compiler-vapor/package.json` の version は 3.6.0-rc.10。タグは浅いcloneに含まれない。
FOCUS: Vaporのコンパイラ（テンプレートのIRとコード生成）とruntime-vapor
除外: 仮想DOM版の内部、SFCのスタイル処理、SSR

この章立ては、`--depth 1` の浅いcloneで作った。
git履歴とPR本文はまだ一つも読んでいない。
各章の「履歴の手がかり」は、パス3で調べる項目の宛先だけを書く。理由の記述はすべてパス3の仕事である。

ファイルパスと関数名は、`444eef4b` の作業ツリーで `ls` と `grep "^export"` をかけて実在を確かめたものだけを書いた。
確かめていない名前は「未確認」と付けた。行番号はパス2で確かめる。

---

## この章立てで判断した点

### 題材のミニ実装

全章を通して、「小さなテンプレート（`{{ msg }}`、`:id`、`@click`、`v-if`、`v-for`、コンポーネント）を、IRを経由してJavaScriptにコンパイルし、小さなランタイムで動かす」ミニ実装を一本育てる。
言語はTypeScriptで、`code/vue-vapor/NN-slug/` に置く。
各章で足す機能は一つにする。
DOMは、Nodeの組み込みテストで動くよう、ごく小さな偽のDOM（要素、テキスト、コメント）を章の中で持つ。

リアクティブコアは `code/signals/` で作ったものと同じ形を、章ごとに必要な分だけ小さく持つ。
本物の `@vue/reactivity` は、`system.ts` の冒頭にある通り alien-signals からの移植で、Solidとは別の系統である。13章でそこを並べる。

### FOCUSの広げ方

FOCUS「Vaporのコンパイラ（テンプレートのIRとコード生成）とruntime-vapor」を、次の問いに言い換えた。

「仮想DOMという中間の木を捨てたとき、コンパイラはテンプレートをどんな操作の列にして、ランタイムはその列をどう受けるのか」

アークは、コンパイラの骨格、静的なDOMと動く場所、リアクティブコア、ブロック（`v-if`/`v-for`）、コンポーネント、互換と失ったもの、の6つに分けた。
Svelte 5のパス（`draft/svelte/plan-30.md`）と、アーク構成を意図的にそろえた。両者を並べて読めるようにするためである。

### 捨てた候補

- 仮想DOM版の内部（`runtime-core` の `patch`、`renderer.ts`、`compiler-dom`）：第0節の除外。互換の章（29章）で触れるにとどめる
- SFCのスタイル処理（`compiler-sfc` の `compileStyle`、`useCssVars`）：第0節の除外
- SSRとハイドレーション（`compiler-ssr`、`server-renderer`、`runtime-vapor/src/dom/hydration.ts`、`hydrateFragment.ts`）：第0節の除外（SSR）。30章でファイル名を挙げるにとどめる
- `Teleport`、`Suspense`、`Transition`、`TransitionGroup`、`KeepAlive` の個別の挙動（`runtime-vapor/src/components/`）：30章で代表一つ（`KeepAlive`）だけ扱う
- カスタム要素（`apiDefineCustomElement.ts`）、非同期コンポーネント（`apiDefineAsyncComponent.ts`）、動的コンポーネント（`apiCreateDynamicComponent.ts`）：FOCUSの外
- `v-html`、`v-text`、`v-show`、`v-once` の個別の変換：9章と16章で触れる程度。足す機能が `v-bind` と同じ型になる
- `vue-compat`、型の定義（`dts-test`）、`packages-private/` のplaygroundとe2e：本の核から外れる
- 開発時の検査（`runDevRender`、警告）：必要な章で一言触れる

### 履歴の調べ方（パス3への申し送り）

- Vaporは長い開発期間を持つ。`minor` ブランチと、別リポジトリだった時期（`vuejs/core-vapor`）があるかを、パス3の最初に確かめる（未確認）
- `CHANGELOG.md` と `changelogs/` を入口にする。バージョン 3.6 のリリースノートの置き場所も確かめる
- 浅いcloneでは履歴が読めないので、対象のパスに絞って `git fetch --deepen` か `git log -- packages/compiler-vapor packages/runtime-vapor` で取得する
- Vueの設計判断はRFCと議論（`vuejs/rfcs`、Discussions）に残っているか。`vuejs/rfcs` はこのセッションのリポジトリ範囲外なので、読めるかをパス3の最初に確かめる

### エピグラフについて

各章の候補は仮である。パス4で底本を決めるときに出典の確度を確かめる。
既存パートで使った出典と重ならないように選ぶ。決めきれなかった章は「候補なし」とし、パス4で探す。

---

## ディレクトリマップ（`packages/`）

- `compiler-vapor/src/`
  - `compile.ts`: 入口。`compile`、`getBaseTransformPreset`
  - `transform.ts`: ASTからIRへ。`transform`、`TransformContext`、`transformNode`、`createStructuralDirectiveTransform`
  - `ir/index.ts`: `IRNodeTypes`（`SET_TEXT`、`SET_PROP`、`SET_EVENT`、`INSERT_NODE`、`IF`、`FOR`、`CREATE_COMPONENT_NODE` など）、`BlockIRNode`、`TemplateRegistry`
  - `transforms/`: ノードとディレクティブごとの変換（`transformElement`、`transformText`、`vIf`、`vFor`、`vBind`、`vOn`、`vModel`、`vSlot` など）
  - `generate.ts`: IRからコードへ。`generate`、`CodegenContext`
  - `generators/`: 操作ごとのコード生成（`block`、`operation`、`template`、`expression`、`prop`、`event`、`for`、`if`、`component` など）
- `runtime-vapor/src/`
  - `dom/`: `template.ts`（`template`）、`node.ts`（`child`、`next`、`nthChild`）、`prop.ts`（`setText`、`setProp`、`setClass`）、`event.ts`（`delegate`、`on`）
  - `renderEffect.ts`: `RenderEffect`、`renderEffect`
  - `block.ts`: `Block`、`insert`、`remove`、`move`
  - `fragment.ts`: `VaporFragment`、`DynamicFragment`、`ForFragment`、`ForBlock`
  - `apiCreateIf.ts`、`apiCreateFor.ts`: `createIf`、`createFor`、`createSelector`
  - `component.ts`、`componentProps.ts`、`componentSlots.ts`、`componentEmits.ts`: コンポーネント
  - `apiCreateApp.ts`: `createVaporApp`
  - `vdomInterop.ts`: 仮想DOM版との互換
- `reactivity/src/`: `system.ts`、`effect.ts`、`effectScope.ts`、`ref.ts`、`computed.ts`（Vaporと仮想DOM版で共有）
- `runtime-core/src/scheduler.ts`: `queueJob`、`nextTick`（共有）
- `compiler-sfc/src/compileScript.ts`: `vapor` オプション、`bindingMetadata`
- テスト：`compiler-vapor/__tests__/`（`compile.spec.ts`、`__snapshots__/`）、`runtime-vapor/__tests__/`

## 語彙集（仮）

- IR：`compiler-vapor/src/ir/index.ts`。ASTとコードの間にある「DOMに対する操作」の列
- ブロック（`Block`）：`runtime-vapor/src/block.ts`。DOMノード、フラグメント、その配列の総称
- フラグメント：中身が変わる断片。`DynamicFragment`（`v-if`）、`ForFragment`（`v-for`）
- アンカー：断片の位置を示す目印（コメントノード）
- `renderEffect`：DOMを書き換える式を包むエフェクト。`order` 順に流す
- `template`：HTMLを一度だけパースして `cloneNode` する関数（`t0`、`t1`）
- `VaporComponentInstance`：コンポーネントの実体。`setup` は一度だけ呼ばれる
- 仮想DOM版：`runtime-core` の `h`、`patch`。Vaporと同居できる（29章）

## 主要な呼び出しパス（仮。パス2で行番号まで確かめる）

1. コンパイル：`compile`（`compile.ts`）→ `baseParse`（`compiler-core`、未確認）→ `transform`（`transform.ts`）→ IR（`RootIRNode`）→ `generate`（`generate.ts`）→ `render` 関数の文字列
2. 補間の出力（`compile.spec.ts.snap` の `bindings` より）：`const n0 = t0()`、`const x0 = _txt(n0)`、`_renderEffect(() => _setText(x0, "count is " + _toDisplayString(_ctx.count) + "."))`、`return n0`
3. 更新：`ref` の書き込み → `ReactiveNode` の通知 → `RenderEffect` → `queueJob`（`scheduler.ts`）→ `order` 順に再実行 → `setText`
4. `v-if`：`createIf`（`apiCreateIf.ts`）→ `DynamicFragment`（`fragment.ts`）→ `insert`／`remove`（`block.ts`）
5. マウント：`createVaporApp`（`apiCreateApp.ts`）→ `createComponent`（`component.ts`）→ `mountComponent`

---

## アーク1　テンプレートは、何段でどんなコードに変わるのか（1〜5章）

### 1章　同じSFCは、仮想DOM版とVapor版でどう違うコードになるのか

- ミニ実装: `code/vue-vapor/01-compile-shape/`
- 足す機能: 同じ `<p>{{ msg }}</p>` を、`render` が仮想ノードを返す版と、DOMを直接作る版の2通りに出し分ける。出力は文字列のまま
- 並べる本物: `packages/compiler-vapor/src/compile.ts`（`compile`）、`packages/compiler-sfc/src/compileScript.ts`（`vapor` オプション、`sfc.vapor`）、`packages/compiler-vapor/__tests__/__snapshots__/compile.spec.ts.snap`
- 履歴の手がかり: Vaporが `<script setup vapor>` のような印で切り替わる経緯と、`compiler-dom` を通らない理由。パス3
- 章末の欠点: テンプレートが文字列のまま。構造を持たない
- エピグラフ: 候補なし

### 2章　テンプレートを、どんな木に読むのか

- ミニ実装: `code/vue-vapor/02-parse-template/`
- 足す機能: `<div :id="id" @click="f">{{ msg }}</div>` を、要素、属性、ディレクティブ、補間の木にする
- 並べる本物: `compile.ts` が呼ぶ `compiler-core` の `baseParse`（未確認、パス2で確かめる）、`packages/compiler-core/src/ast.ts`
- 履歴の手がかり: Vaporが構文解析を作り直さず `compiler-core` を共有した判断。パス3
- 章末の欠点: 木はあるが、DOMの操作を表す情報がない
- エピグラフ: 候補なし

### 3章　ASTから、なぜもう一度IRへ変換するのか

- ミニ実装: `code/vue-vapor/03-ir/`
- 足す機能: ASTを歩き、`SET_TEXT`、`SET_PROP`、`INSERT_NODE` のような「DOMに対する操作」の列（IR）を作る
- 並べる本物: `compiler-vapor/src/transform.ts`（`transform`、`TransformContext`）、`ir/index.ts`（`IRNodeTypes`、`BlockIRNode`、`RootIRNode`）
- 履歴の手がかり: 仮想DOM版は ASTから直接コード生成するのに、Vaporが中間表現を挟んだ理由。パス3
- 章末の欠点: IRを作る規則（要素ごとの変換）をまだ持っていない
- エピグラフ: 候補なし

### 4章　要素やディレクティブの変換を、どう差し込むのか

- ミニ実装: `code/vue-vapor/04-transform-plugins/`
- 足す機能: ノード変換とディレクティブ変換を関数として登録し、`transformNode` が順に当てる。後始末の関数（exit）も返せる
- 並べる本物: `compile.ts`（`getBaseTransformPreset`）、`transform.ts`（`transformNode`、`createStructuralDirectiveTransform`）、`transforms/transformElement.ts`（`transformElement`）、`transforms/vIf.ts`
- 履歴の手がかり: `compiler-core` の `NodeTransform` の型をそのまま借りた経緯と、`v-if`/`v-for` を構造ディレクティブとして扱う理由。パス3
- 章末の欠点: IRはできたが、JavaScriptに戻していない
- エピグラフ: 候補なし

### 5章　IRから、JavaScriptをどう組み立てるのか

- ミニ実装: `code/vue-vapor/05-codegen/`
- 足す機能: IRの列から `export function render() { const n0 = t0() ... return n0 }` を文字列で出す。`CodegenContext` 相当の小さな状態を持つ
- 並べる本物: `compiler-vapor/src/generate.ts`（`generate`、`CodegenContext`）、`generators/block.ts`（`genBlock`、`genBlockContent`）、`generators/operation.ts`（`genOperations`、`genEffects`）
- 履歴の手がかり: ソースマップとの関係、`generators/` を操作の種類ごとに分けた判断。パス3
- 章末の欠点: 静的なDOMは出せるが、HTMLをどう作り、どこへ辿り着くかが素朴
- エピグラフ: 候補なし

---

## アーク2　静的なDOMと、動く場所への道（6〜11章）

### 6章　HTMLは、なぜ一度だけ文字列から作るのか

- ミニ実装: `code/vue-vapor/06-template/`
- 足す機能: テンプレートのHTMLを一度だけパースして保存し、使うたびに `cloneNode` する `template()`。同じHTMLは同じ `t0` に畳む
- 並べる本物: `runtime-vapor/src/dom/template.ts`（`template`）、`dom/node.ts`（`parseTemplate`）、`compiler-vapor/src/generators/template.ts`（`genTemplates`）、`ir/index.ts`（`TemplateRegistry`）
- 履歴の手がかり: `innerHTML` と `createElement` の連続呼び出しを比べた経緯。Svelte の `from_html` と並べる。パス3
- 章末の欠点: 複製したDOMの中の、動く場所へどう辿るかが決まっていない
- エピグラフ: 候補なし

### 7章　動く場所へ、どう辿り着くのか

- ミニ実装: `code/vue-vapor/07-locate/`
- 足す機能: テンプレートの複製から `child`、`next`、`nthChild` で動く要素を取り出し、`n0`、`x0` と名前を付ける。空白とコメントの扱い
- 並べる本物: `runtime-vapor/src/dom/node.ts`（`child`、`next`、`nthChild`、`txt`、`locateChildByLogicalIndex`）、`generators/template.ts`（`genChildren`、`genSelf`）、`transforms/transformChildren.ts`
- 履歴の手がかり: `querySelector` で探す案との比較。論理インデックスで辿る仕組みが入った経緯（未確認）。パス3
- 章末の欠点: 場所は取れたが、`{{ msg }}` を書き換える操作がない
- エピグラフ: 候補なし

### 8章　`{{ msg }}` は、どうテキストノードの更新になるのか

- ミニ実装: `code/vue-vapor/08-text/`
- 足す機能: 補間を、テキストノードを取り出して `setText` する一行にする。隣り合う文字列と補間を一つに畳む
- 並べる本物: `transforms/transformText.ts`（`transformText`）、`generators/text.ts`（`genSetText`、`genGetTextChild`）、`runtime-vapor/src/dom/prop.ts`（`setText`）
- 履歴の手がかり: `setText` が前の値と比べて書く理由。`$txt` の持ち方（未確認）。パス3
- 章末の欠点: 書き換える一行はできたが、いつ走らせるかを決めていない
- エピグラフ: 候補なし

### 9章　属性・クラス・スタイルは、どう書き換えるのか

- ミニ実装: `code/vue-vapor/09-props/`
- 足す機能: `:id`、`:class`、`:style` を、種類ごとの `setProp`、`setClass`、`setStyle` に振り分ける
- 並べる本物: `transforms/vBind.ts`（`transformVBind`）、`transforms/transformElement.ts`（`buildProps`）、`generators/prop.ts`、`runtime-vapor/src/dom/prop.ts`（`setProp`、`setAttr`、`setDOMProp`、`setClass`、`setStyle`）
- 履歴の手がかり: 属性かDOMプロパティかを実行時に判断する理由。静的な属性をテンプレートに焼き込む判断。パス3
- 章末の欠点: 動的な属性の集合（`v-bind="obj"`）を扱っていない
- エピグラフ: 候補なし

### 10章　イベントは、なぜ委譲で結ぶのか

- ミニ実装: `code/vue-vapor/10-event/`
- 足す機能: `@click` を `delegate` で結ぶ。ルートで一度だけ聞き、イベントの上りで該当する要素を探す。修飾子 `.stop`、`.once` を足す
- 並べる本物: `transforms/vOn.ts`、`generators/event.ts`（`genSetEvent`）、`runtime-vapor/src/dom/event.ts`（`delegate`、`delegateEvents`、`on`、`withVaporModifiers`）
- 履歴の手がかり: 要素ごとに `addEventListener` する案と委譲の比較、委譲できないイベントの扱い。パス3
- 章末の欠点: 入力の値を書き戻す仕組みがない
- エピグラフ: 候補なし

### 11章　`v-model` は、どう書き戻すのか

- ミニ実装: `code/vue-vapor/11-v-model/`
- 足す機能: 入力要素の種類（テキスト、チェックボックス、ラジオ、select）ごとに、読みと書き戻しの組を作る
- 並べる本物: `transforms/vModel.ts`、`generators/vModel.ts`、`runtime-vapor/src/directives/vModel.ts`（`applyTextModel`、`applyCheckboxModel`、`applyRadioModel`、`applySelectModel`、`applyDynamicModel`）
- 履歴の手がかり: 仮想DOM版の `vModelText` と同じ型を借りたか、作り直したか。パス3
- 章末の欠点: ここまで「いつ再実行するか」を `renderEffect` 一語で済ませてきた
- エピグラフ: 候補なし

---

## アーク3　DOMを書くエフェクトと、リアクティブコア（12〜17章）

### 12章　`renderEffect` は、普通のエフェクトと何が違うのか

- ミニ実装: `code/vue-vapor/12-render-effect/`
- 足す機能: 式を読んでいる間だけ依存を覚え、変わったら一度だけ再実行する `renderEffect`。コンポーネントの `order` 順に走らせる
- 並べる本物: `runtime-vapor/src/renderEffect.ts`（`RenderEffect`、`renderEffect`）、`packages/reactivity/src/effect.ts`（`ReactiveEffect`）
- 履歴の手がかり: 仮想DOM版の `componentUpdateFn` との役割の違い。`order` を持つ理由。パス3
- 章末の欠点: 依存の追跡の中身を持たない
- エピグラフ: 候補なし

### 13章　`@vue/reactivity` の依存グラフは、どう持たれているのか

- ミニ実装: `code/vue-vapor/13-reactivity-core/`
- 足す機能: `ref`、`computed`、effect を双方向リンクの `Link` で結ぶ小さなコア。`code/signals/` の章と対比する
- 並べる本物: `packages/reactivity/src/system.ts`（`ReactiveNode`、`Link`、`ReactiveFlags`、`startBatch`、`endBatch`、`setActiveSub`）、`ref.ts`、`computed.ts`。冒頭のコメントに alien-signals からの移植とある
- 履歴の手がかり: alien-signals への移行の履歴（`system.ts` を入口に `git log -- packages/reactivity`）。パス3
- 章末の欠点: 書き込みをいつ流すかが決まっていない
- エピグラフ: 候補なし

### 14章　書き込みは、いつまとめて流されるのか

- ミニ実装: `code/vue-vapor/14-scheduler/`
- 足す機能: effectが通知されたら `queueJob` に積み、マイクロタスクで `order` 順に一度ずつ流す。`nextTick`
- 並べる本物: `packages/runtime-core/src/scheduler.ts`（`queueJob`、`flushPostFlushCbs`、`nextTick`）、`renderEffect.ts`（`job`、`updateJob`）
- 履歴の手がかり: スケジューラが仮想DOM版と共有された理由。パス3
- 章末の欠点: 式の中の名前がどこから来るのかを扱っていない
- エピグラフ: 候補なし

### 15章　式の中の名前は、どう書き換えられるのか

- ミニ実装: `code/vue-vapor/15-expression/`
- 足す機能: `count` を、束縛の種類（`ref`、`setup` の定数、props）に応じて `_ctx.count`、`count.value` などに書き換える。同じ式は一度だけ計算する
- 並べる本物: `generators/expression.ts`（`genExpression`、`processExpressions`、`genVarName`）、`compiler-sfc/src/compileScript.ts`（`bindingMetadata`）、`packages/runtime-vapor/__tests__/expressionCache.spec.ts`
- 履歴の手がかり: `bindingMetadata` を仮想DOM版から引き継いだ経緯。式のキャッシュが入ったPR（`expressionCache.spec.ts` を入口に）。パス3
- 章末の欠点: 全部の式にエフェクトを作ってしまう
- エピグラフ: 候補なし

### 16章　一度しか読まない式に、エフェクトは要らないのか

- ミニ実装: `code/vue-vapor/16-static-and-once/`
- 足す機能: 定数だけで決まる式にはエフェクトを作らない。`v-once` は一度だけ実行する
- 並べる本物: `transforms/vOnce.ts`、`runtime-vapor/src/once.ts`（`withOnce`）、`generators/operation.ts`（`genEffects`）、`ir/index.ts`（`EffectBoundary`）
- 履歴の手がかり: エフェクトをまとめる単位（一つの `renderEffect` に何個の式を入れるか）の判断。パス3
- 章末の欠点: エフェクトを誰がいつ止めるかを決めていない
- エピグラフ: 候補なし

### 17章　エフェクトは、誰が片付けるのか

- ミニ実装: `code/vue-vapor/17-scope/`
- 足す機能: コンポーネントごとに `EffectScope` を持ち、その中で作ったエフェクトを、アンマウントで一括して止める
- 並べる本物: `packages/reactivity/src/effectScope.ts`（`EffectScope`）、`runtime-vapor/src/component.ts`（`unmountComponent`）、`block.ts`（`remove`）
- 履歴の手がかり: `code/signals/` 第5章（入れ子の計算を片付ける）と対にする。パス3
- 章末の欠点: DOMの出し入れ（`v-if`）が絡むと、エフェクトとDOMの寿命がずれる
- エピグラフ: 候補なし

---

## アーク4　ブロックは、DOMの出し入れをどう束ねるのか（18〜23章）

### 18章　ブロックとは、何を指す型なのか

- ミニ実装: `code/vue-vapor/18-block/`
- 足す機能: `Node`、フラグメント、ブロックの配列を一つの型 `Block` として扱い、`insert`、`remove`、`move` を実装する
- 並べる本物: `runtime-vapor/src/block.ts`（`Block`、`insert`、`insertNode`、`remove`、`move`、`normalizeBlock`、`getBlockFirstNode`）
- 履歴の手がかり: `Node` だけでなく、中身が変わる断片も同じ型で扱う判断。パス3
- 章末の欠点: 子の中身が変わる断片の目印がない
- エピグラフ: 候補なし

### 19章　挿入位置の目印は、なぜコメントなのか

- ミニ実装: `code/vue-vapor/19-anchor/`
- 足す機能: 中身が空のとき、出入りする位置を示すコメントノード（アンカー）を置く。`insertionState` で親と位置を持ち回る
- 並べる本物: `runtime-vapor/src/insertionState.ts`（`setInsertionState`、`resetInsertionState`）、`fragment.ts`（`resolveFragmentAnchor`）、`generators/operation.ts`（`genInsertionState`）
- 履歴の手がかり: `<!--if-->` のような目印をSSRと揃える事情（ハイドレーションとの関係は未確認）。パス3
- 章末の欠点: 目印は置けたが、中身を切り替える側がない
- エピグラフ: 候補なし

### 20章　`v-if` は、DOMを消すのか隠すのか

- ミニ実装: `code/vue-vapor/20-v-if/`
- 足す機能: 条件が変わったら、古い枝を片付けて新しい枝を作る `createIf`。枝ごとにエフェクトも作り直す
- 並べる本物: `transforms/vIf.ts`（`processIf`、`createIfBranch`）、`generators/if.ts`（`genIf`）、`runtime-vapor/src/apiCreateIf.ts`（`createIf`）、`fragment.ts`（`DynamicFragment`）
- 履歴の手がかり: `v-show` との役割の違い。`v-else` の連なりをIRで一つの `IfIRNode` にする判断。パス3
- 章末の欠点: リストを繰り返せない
- エピグラフ: 候補なし

### 21章　`v-for` は、配列が変わったとき何を作り直すのか

- ミニ実装: `code/vue-vapor/21-v-for/`
- 足す機能: 配列の各要素から行のブロックを作る `createFor`。変化したときは全部作り直す素朴版から始める
- 並べる本物: `transforms/vFor.ts`（`processFor`）、`generators/for.ts`（`genFor`）、`runtime-vapor/src/apiCreateFor.ts`（`createFor`）
- 履歴の手がかり: 仮想DOM版の差分（キー付き・なし）との違い。`code/signals/` の `mapArray` と対比。パス3
- 章末の欠点: 全部作り直すので、入力欄の状態などが消える
- エピグラフ: 候補なし

### 22章　キーは、行の何を守るのか

- ミニ実装: `code/vue-vapor/22-key/`
- 足す機能: `:key` で行を引き当て、並べ替えでは `move` だけにする。要素が消えたら `remove`
- 並べる本物: `apiCreateFor.ts`（`createFor` の更新部、`ForBlock`）、`fragment.ts`（`ForFragment`、`ForBlock`、`getFragmentKey`）、`transforms/transformKey.ts`、`runtime-vapor/src/helpers/setKey.ts`
- 履歴の手がかり: 最長増加部分列（LIS）を使うか（未確認）。使うならいつ入ったか。パス3
- 章末の欠点: 選択状態のような「どの行が選ばれているか」を、全行で再計算してしまう
- エピグラフ: 候補なし

### 23章　選ばれた行だけを、どう知らせるのか

- ミニ実装: `code/vue-vapor/23-selector/`
- 足す機能: `createSelector` で「選択中のキー」を読む行のうち、前と今の二つにだけ通知する
- 並べる本物: `apiCreateFor.ts`（`createSelector`）、`packages/runtime-vapor/__tests__/apiCreateSelector.spec.ts`
- 履歴の手がかり: `createSelector` を入れたPRと、ベンチマーク（`packages-private/benchmark`）との関係。`code/signals/` の `createSelector` と対。パス3
- 章末の欠点: コンポーネントの境界がない
- エピグラフ: 候補なし

---

## アーク5　コンポーネントは、仮想DOMなしでどう組み立つのか（24〜28章）

### 24章　コンポーネントは、どう作られ、どうマウントされるのか

- ミニ実装: `code/vue-vapor/24-component/`
- 足す機能: `createComponent` が `setup` を一度だけ呼び、返ったブロックを挿入する。インスタンスは `VaporComponentInstance`
- 並べる本物: `runtime-vapor/src/component.ts`（`createComponent`、`setupComponent`、`VaporComponentInstance`、`mountComponent`、`unmountComponent`）、`generators/component.ts`
- 履歴の手がかり: `setup` が再実行されない設計（仮想DOM版の再描画との違い）の経緯。パス3
- 章末の欠点: 親から子へ値を渡せない
- エピグラフ: 候補なし

### 25章　propsは、なぜ関数で渡すのか

- ミニ実装: `code/vue-vapor/25-props/`
- 足す機能: `:title="t"` を `{ title: () => t.value }` として渡し、子は読むときに呼ぶ。`Proxy` でまとめる
- 並べる本物: `runtime-vapor/src/componentProps.ts`（`getPropsProxyHandlers`、`rawPropsProxyHandlers`、`resolveSource`、`resolveDynamicProps`、`initInputs`）、`generators/component.ts`
- 履歴の手がかり: Svelteの `$props()` の getter、Solidの props と並べる。パス3
- 章末の欠点: 子の中身を親が差し込めない
- エピグラフ: 候補なし

### 26章　スロットは、関数なのか値なのか

- ミニ実装: `code/vue-vapor/26-slots/`
- 足す機能: 子が `slots.default()` で呼び、親のスコープで作ったブロックを返す。スコープ付きスロットは引数を持つ
- 並べる本物: `transforms/vSlot.ts`、`runtime-vapor/src/componentSlots.ts`（`createSlot`、`initSlots`、`getSlot`、`SlotSourceCell`）、`slotFragment.ts`、`transforms/transformSlotOutlet.ts`
- 履歴の手がかり: スロットの再描画の単位を分けた経緯。パス3
- 章末の欠点: 子から親への通知（emit）と、要素への参照（ref）がない
- エピグラフ: 候補なし

### 27章　`emit`、`ref`、継承される属性は、どう渡るのか

- ミニ実装: `code/vue-vapor/27-emit-ref-attrs/`
- 足す機能: `emit` をpropsの `onXxx` に変換して呼ぶ。テンプレートrefで要素やインスタンスを親に渡す。props以外の属性を根の要素に継ぐ
- 並べる本物: `runtime-vapor/src/componentEmits.ts`（`emit`）、`apiTemplateRef.ts`（`setStaticTemplateRef`、`createTemplateRefSetter`）、`component.ts`（`applyFallthroughProps`、`resolveFallthroughAttrs`）
- 履歴の手がかり: 根が複数あるときの属性継承の扱い。パス3
- 章末の欠点: アプリ全体の入口がない
- エピグラフ: 候補なし

### 28章　アプリは、どこから始まるのか

- ミニ実装: `code/vue-vapor/28-app/`
- 足す機能: `createVaporApp(Comp).mount(el)`。`defineVaporComponent` で型を付け、プラグインとアプリ全体の文脈（provide）を持つ
- 並べる本物: `runtime-vapor/src/apiCreateApp.ts`（`createVaporApp`）、`apiDefineComponent.ts`（`defineVaporComponent`）、`packages/vue/package.json`（`esm-browser-vapor`）
- 履歴の手がかり: `createApp` と別の入口を作った理由、`vue` パッケージからの公開の形。パス3
- 章末の欠点: 仮想DOMのコンポーネントと混ぜられるのか
- エピグラフ: 候補なし

---

## アーク6　仮想DOMを捨てて、何を失い、何を作り直したか（29〜30章）

### 29章　仮想DOM版のコンポーネントを、Vaporの中に置けるのか

- ミニ実装: `code/vue-vapor/29-interop/`
- 足す機能: 仮想DOM側のコンポーネントを `Block` として包み、Vaporの木に差し込む。逆向きも同じ型で
- 並べる本物: `runtime-vapor/src/vdomInterop.ts`（`vaporInteropPlugin`）、`vdomInteropState.ts`、`block.ts`（`registerNestedVDOMCleanup`、`unmountVDOM`）
- 履歴の手がかり: 段階移行のために互換を作った経緯。`vdomInterop.ts` が4千行超になった理由（未確認）。パス3
- 章末の欠点: 互換に必要なものが、ここで初めて見える
- エピグラフ: 候補なし

### 30章　仮想DOMを捨てて、何を失ったのか

- ミニ実装: `code/vue-vapor/30-what-vapor-gave-up/`
- 足す機能: ここまでのミニ実装に、`Transition`、`KeepAlive`、`Teleport` のどれか一つ（`KeepAlive`）を足し、仮想ノードがあれば簡単だった理由を示す
- 並べる本物: `runtime-vapor/src/components/`（`KeepAlive.ts`、`Transition.ts`、`Teleport.ts`、`Suspense.ts`）、`hmr.ts`（`hmrRerender`、`hmrReload`）、`dom/hydration.ts`
- 履歴の手がかり: 仮想DOM版との機能差の一覧がドキュメントにあるか。Vapor非対応の機能の履歴。パス3
- 章末の欠点: なし（最終章。本全体の振り返りへ）
- エピグラフ: 候補なし

---
