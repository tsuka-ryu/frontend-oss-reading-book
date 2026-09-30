# oxc パス1: 約30章の章立て（plan-30）

対象: oxc-project/oxc（クローン先 `/tmp/oss/oxc`）
基準の版: `main` のコミット `5914a24c`（2026-09-29）。`crates/oxc_parser/Cargo.toml` の version は 0.152.0。タグは浅いcloneに含まれない。
FOCUS: パーサとASTの表現、変換パイプライン
除外: linterの個別ルール

この章立ては、`--depth 1` の浅いcloneで作った。
そのためgit履歴とPR本文はまだ一つも読んでいない。
各章の「履歴の手がかり」は、`CHANGELOG.md` に載っている範囲（`crates/*/CHANGELOG.md`）と、パス3で調べる項目の宛先だけを書く。
理由の記述は、すべてパス3の仕事である。

ファイルパス、型名、関数名は、`5914a24c` の作業ツリーで `grep` と `ls` をかけ、実在を確かめたものだけを書いた。
実在を確かめていない名前は「未確認」と付けた。

---

## この章立てで判断した点

### 題材のミニ実装

全章を通して、「JavaScriptの小さな部分集合（変数宣言、関数、アロー関数、二項演算、呼び出し、`?.`、テンプレートリテラル）を、字句解析、構文解析、意味解析、変換、出力まで通す」ミニ実装を一本育てる。
言語はTypeScriptで、`code/oxc/NN-slug/` に置く。
各章で足す機能は一つにする。
oxcはRustで書かれているので、ミニ実装のTypeScriptとは所有権やメモリ配置の話が食い違う。
そこは「本物はなぜ違うか」の中心であり、隠さずに書く。

### FOCUSの広げ方

FOCUS「パーサとASTの表現、変換パイプライン」を、次の問いに言い換えた。

「ソース文字列を、同じ木のまま何度も読み書きするために、木の形とメモリの置き方をどう決めたか」

パーサだけで30章は作れない。
一方でoxcの設計判断の多くは、パーサの外にある。
アリーナ、`NodeId`、生成コード、`Traverse` の作りは、パーサが作った木を、後段が読み書きし続けるための条件だからである。
そこでアークを、字句、構文、木の表現、意味解析、変換、出力の6つに分けた。

### 捨てた候補

- linter（`crates/oxc_linter`）：第0節の除外
- formatter（`crates/oxc_formatter*`）、language server、`oxc_react_compiler`、`oxc_relay`：変換パイプラインの本流から外れる。書式化は出力（アーク6）と近いが、足す機能が「出力」の章と重なる
- 正規表現のパーサ（`crates/oxc_regular_expression`）：JSの文法とは独立した二つ目のパーサで、章にすると主題が二つになる。4章の「本物はなぜ違うか」で存在に触れる
- JSXの構文解析と変換（`crates/oxc_parser/src/jsx/mod.rs`、`crates/oxc_transformer/src/jsx/`）：6章以降のパーサの章で「JSXでは `<` と `>` の意味が変わる」と一行で触れるにとどめる。JSX変換は27章のTypeScript除去と足す機能が近い（式を別の呼び出しに書き換える）ため、単独の章にしなかった
- 制御フローグラフ（`crates/oxc_cfg`）：linter向けの解析で、変換の前提ではない。21章で存在に触れる
- `oxc_isolated_declarations`（`.d.ts` 生成）、`oxc_jsdoc`、`oxc_language_server`、`oxc_napi` の個別機能：FOCUSの外
- ES2015〜ES2026の個別の変換（`crates/oxc_transformer/src/es20*`）：26章（`?.`）と28章（アロー関数）で代表させる。残りは同じ型の繰り返しになる
- 型チェック：oxcは型を検査しない（未確認。パス2で `ARCHITECTURE.md` と `oxc_semantic` から裏を取る）。TypeScriptは構文解析と型の除去だけを扱う

### 履歴の調べ方（パス3への申し送り）

- oxcは `git log` が長く、浅いcloneでは読めない。パス3では対象のパスに絞って `git fetch --deepen` か `git log -- <path>` で取得する
- `crates/*/CHANGELOG.md` の行頭のハッシュとPR番号を入口にする
- PR本文はAPIから読めるかを、パス3の最初に確かめる

### エピグラフについて

各章の候補は仮である。
出典の確度は、パス4で底本を決めるときに確かめる。
既存パートで使った出典（バークリー、アウグスティヌス、ボルヘス、鴨長明、マグリット、老子、カフカ、アリストテレス、ユウェナリス、ヴォルテール、ライプニッツ、コナン・ドイル、ウィトゲンシュタイン）と重ならないように選ぶ。
決めきれなかった章は「候補なし」とし、パス4で探す。

---

## ディレクトリマップ（`crates/`）

- `oxc_allocator`: バンプ型のアリーナ `Allocator` と、それに載る `Box`、`Vec`、`HashMap` など
- `oxc_str`: アリーナに載る文字列型 `Str<'a>`、識別子用の `Ident<'a>`
- `oxc_span`: ソース位置 `Span`（`start: u32`、`end: u32`）と `SourceType`
- `oxc_syntax`: 演算子、優先順位（`precedence.rs`）、`ScopeFlags`、`SymbolFlags`、キーワードなど、構文に共通の定義
- `oxc_ast`: ASTの型定義（`ast/js.rs`、`ts.rs`、`jsx.rs`、`literal.rs`）と、生成された `AstBuilder`、`AstKind`
- `oxc_ast_macros`: `#[ast]` 属性マクロ
- `oxc_ast_visit`: 生成された `Visit`、`VisitMut`
- `oxc_estree`: ASTをESTree形式（JSON）へ直列化する仕組み
- `oxc_lexer`: 新しい字句解析器（`pipeline/` 以下にSIMD向けの段が並ぶ）。パーサが使っている字句解析器は `oxc_parser/src/lexer/` にある（後述）
- `oxc_parser`: 再帰下降のパーサ本体（`js/`、`ts/`、`jsx/`）と、パーサ内蔵の字句解析器（`lexer/`）
- `oxc_semantic`: スコープ、シンボル、参照の解決、早期エラーの検査（`checker/`）
- `oxc_traverse`: 親をたどれて、スコープを更新できる可変の走査 `Traverse`
- `oxc_transformer`: TypeScript、JSX、ES20xxの各変換
- `oxc_minifier`、`oxc_mangler`: 定数畳み込みなどの圧縮と、名前の短縮
- `oxc_codegen`: ASTからコードとソースマップを出す
- `oxc_diagnostics`: エラー表示
- `oxc_cfg`、`oxc_linter`、`oxc_formatter*`、`oxc_language_server` など：この本では扱わない
- 別の場所：`napi/parser`（Node.js向けの窓口）、`tasks/ast_tools`（AST定義から各種コードを生成する）、`tasks/coverage`（Test262などの適合試験）

**注意**：`crates/oxc_lexer` と `crates/oxc_parser/src/lexer/` の二つがある。
`oxc_lexer/src/lib.rs` は `oxc_ast` と `oxc_span` に依存し、`Lexer`、`LexResult`、`Lanes`、`token_flags` を公開している。
`oxc_parser/src/lexer/` は `Token(u128)`、`byte_handlers.rs`、`trivia_builder.rs` を持つ。
どちらがどの経路で使われているかは未確認で、パス2で `oxc_parser/Cargo.toml` の依存と `lib.rs` から確かめる。
確かめるまで、1〜5章の「並べる本物」は `oxc_parser/src/lexer/` を先に書き、`oxc_lexer` の話は2章と5章の「本物はなぜ違うか」の候補に留める。

## 語彙集（仮）

- アリーナ（`Allocator`）：ASTのすべてのノードを一つの連続領域から切り出す。個別には解放せず、全体を一度に捨てる
- `Span`：ソースのバイト位置の範囲。`u32` の `start`、`end`
- `Token(u128)`：`oxc_parser/src/lexer/token.rs`。種類、位置、フラグを一つの整数に詰める
- `Context`：`oxc_parser/src/context.rs`。`In`、`Yield`、`Await`、`Return` など、文法のパラメータを持つビット集合
- `CoverGrammar`：`oxc_parser/src/js/grammar.rs`。式として読んだものを、代入の左辺やパターンへ読み替える
- `Precedence`：`oxc_syntax/src/precedence.rs`。コメントに esbuild から取ったとある
- `ParserReturn`：`oxc_parser/src/lib.rs`。`program`、`errors`、`panicked` などを返す（フィールドはパス2で確認）
- `AstKind`：`oxc_ast/src/generated/ast_kind.rs`。ノードの種類を、参照付きで列挙する
- `AstNodes`、`NodeId`：`oxc_semantic/src/node/`。ノードを平らな配列に置き、親を引けるようにする
- `Scoping`：`oxc_semantic/src/scoping.rs`。スコープ、シンボル、参照を持つ表
- `ScopeFlags`、`SymbolFlags`：`oxc_syntax/src/scope.rs`、`symbol.rs`
- `Traverse`、`TraverseCtx`：`oxc_traverse/src/generated/traverse.rs`、`context/mod.rs`
- `Gen`、`GenExpr`：`oxc_codegen/src/gen.rs`。ノードごとの出力を実装するトレイト
- `Compressor`、`PeepholeOptimizations`：`oxc_minifier/src/compressor.rs`、`peephole/mod.rs`
- `base54`：`oxc_mangler/src/base54.rs`。出現頻度順の文字表から短い名前を作る

## 主要な呼び出しパス（仮。パス2で行番号まで確かめる）

1. パース：`Parser::new(...).parse()`（`oxc_parser/src/lib.rs`）→ `ParserImpl::parse` → `parse_statement_list_item`（`js/statement.rs`）→ `parse_lhs_expression_or_higher`、`parse_binary_expression_rest`（`js/expression.rs`）→ `ParserReturn`
2. 意味解析：`SemanticBuilder`（`oxc_semantic/src/builder.rs`）が木を歩き、`Scoping`、`AstNodes` を埋める。`Binder`（`binder.rs`）が宣言を結び、`unresolved_stack.rs` が参照を外側へ持ち上げる
3. 変換：`Transformer`（`oxc_transformer/src/lib.rs`）→ `oxc_traverse` の走査 → 各変換（`typescript/`、`es2020/`、`es2015/`）
4. 圧縮：`Compressor::build`（`oxc_minifier/src/compressor.rs`）→ `peephole/` の各パスを `run_in_loop` で不動点まで回す
5. 出力：`Codegen`（`oxc_codegen/src/lib.rs`）が `Gen` トレイトで木を歩き、`SourcemapBuilder` にも位置を渡す

---

## アーク1　文字列を、パーサが読める粒に割るには何が要るか（1〜5章）

### 1章　ソースの文字列を、どう一つずつのトークンに割るか

- ミニ実装: `code/oxc/01-tokens/`
- 足す機能: `Lexer` が文字列を先頭から読み、`Token { kind, start, end }` を一つずつ返す。識別子、数値、記号のみ
- 並べる本物: `oxc_parser/src/lexer/mod.rs`（`Lexer`、`checkpoint`、`rewind`）、`token.rs`（`Token(u128)`）、`kind.rs`（`Kind`）、`byte_handlers.rs`（先頭のバイトごとに処理を振り分ける表）
- 履歴の手がかり: `Token` が `u128` に詰められた経緯（`token.rs` の履歴）、`byte_handlers.rs` の初出。パス3で調べる
- 章末の欠点: 識別子と `if` のようなキーワードが区別できない。次の章の前に、位置の持ち方が先に問題になる
- エピグラフ: 候補なし

### 2章　位置は、行と列で持つべきか

- ミニ実装: `code/oxc/02-span/`
- 足す機能: `Span { start, end }` をバイトの位置で持ち、行と列は必要なときに計算し直す。キーワードの判別もここで足す
- 並べる本物: `oxc_span/src/span.rs`（`Span`、`_align: PointerAlign`）、`oxc_syntax/src/keyword.rs`、`oxc_syntax/src/line_terminator.rs`、`oxc_lexer/src/lib.rs` の `LineEntry`（未確認、パス2）
- 履歴の手がかり: `Span` が `u32` になった経緯。JavaScriptのUTF-16位置とのずれは `oxc_ast_visit/src/utf8_to_utf16/` が受けている（未確認）。18章と対
- 章末の欠点: 空白とコメントがトークンとして残るか捨てられるか、まだ決めていない
- エピグラフ: 候補なし

### 3章　空白とコメントは、捨ててよいのか

- ミニ実装: `code/oxc/03-trivia/`
- 足す機能: 空白と改行を読み飛ばし、コメントは別の表に集める。「このトークンの前に改行があったか」を `Token` のフラグにする
- 並べる本物: `oxc_parser/src/lexer/trivia_builder.rs`（`TriviaBuilder`）、`whitespace.rs`、`comment.rs`、`oxc_ast/src/ast/comment.rs`、`oxc_ast/src/trivia.rs`
- 履歴の手がかり: `TriviaBuilder` の初出と、コメントをASTの外に置く判断。パス3で調べる
- 章末の欠点: `a / b` と `/ab/g` の `/` を字句解析器だけでは決められない
- エピグラフ: 候補なし

### 4章　`/` は割り算か、正規表現か

- ミニ実装: `code/oxc/04-regex-slash/`
- 足す機能: パーサが「いま式の頭か、式の後か」を知っていて、必要なときに字句解析器へ「ここは正規表現として読み直せ」と頼む
- 並べる本物: `oxc_parser/src/lexer/regex.rs`（`read_regex`）、`cursor.rs` の `read_regex`（`re_lex_*` の仲間）、`punctuation.rs` の `re_lex_right_angle`
- 履歴の手がかり: 先に全トークンを読み切る設計が採れない理由。`re_lex_right_angle`（`>>` を `>` `>` に割る）も同じ型。パス3で調べる
- 章末の欠点: 字句解析器が、パーサの状態に引きずられて動く。字句と構文を分ける設計が崩れる
- エピグラフ: 候補なし

### 5章　テンプレートリテラルの `${}` の中は、誰が読むのか

- ミニ実装: `code/oxc/05-template/`
- 足す機能: `` `a${b}c` `` を、文字列部分とその間の式に分けて読む。`}` を見たらテンプレートの続きへ戻る
- 並べる本物: `oxc_parser/src/lexer/template.rs`、`cursor.rs` の `re_lex_template_substitution_tail`、`js/expression.rs` の `parse_template_literal`
- 履歴の手がかり: 入れ子のテンプレートを扱う仕組みと、`}` の再解釈の経緯。パス3で調べる
- 章末の欠点: トークンの列はできたが、それを木にする文法がない
- エピグラフ: 候補なし

---

## アーク2　トークンの列から、どう木を作るか（6〜12章）

### 6章　文は、どう再帰下降で読むのか

- ミニ実装: `code/oxc/06-statements/`
- 足す機能: `let` の宣言、ブロック、式文。文法規則を一つずつ関数にする
- 並べる本物: `oxc_parser/src/js/statement.rs`（`parse_statement_list_item`）、`declaration.rs`、`oxc_parser/src/lib.rs` の `ParserImpl`
- 履歴の手がかり: 再帰下降を選んだ理由（パーサジェネレータを使わない理由）の記述が `README.md` か `ARCHITECTURE.md` にあるか。パス3
- 章末の欠点: 式は変数か数値だけで、`1 + 2 * 3` が読めない
- エピグラフ: 候補なし

### 7章　`1 + 2 * 3` は、どこで掛け算を先に結ぶのか

- ミニ実装: `code/oxc/07-precedence/`
- 足す機能: 二項演算子の優先順位と結合方向。優先順位を数字で持ち、再帰の中で「これより強い演算子だけ取り込む」
- 並べる本物: `oxc_syntax/src/precedence.rs`（`Precedence` の23段、`is_right_associative`）、`oxc_parser/src/js/expression.rs` の `parse_binary_expression_rest`、`js/operator.rs`
- 履歴の手がかり: `Precedence` がesbuild由来（コメントに明記）である点と、`oxc_codegen` が同じ表を括弧の要否に使う点（24章）
- 章末の欠点: セミコロンを省略した入力が読めない
- エピグラフ: 候補なし

### 8章　セミコロンを書かなくても、なぜ読めるのか

- ミニ実装: `code/oxc/08-asi/`
- 足す機能: 自動セミコロン挿入。「改行の後で、次のトークンが文に続けられない」ときだけ、セミコロンがあったことにする
- 並べる本物: `oxc_parser/src/cursor.rs` の `asi`、`can_insert_semicolon`。3章の「前に改行があったか」フラグを使う
- 履歴の手がかり: ECMAScript仕様の自動セミコロン挿入の規則（12.10）との対応。仕様の該当節はパス2で確かめる
- 章末の欠点: `(a, b) => a + b` の `(` が、括弧式か引数リストか、閉じ括弧まで読まないと分からない
- エピグラフ: 候補なし

### 9章　`(a, b)` は、引数か式か、いつ決めるのか

- ミニ実装: `code/oxc/09-arrow-checkpoint/`
- 足す機能: アロー関数。まずアロー関数として読み、失敗したら巻き戻して括弧式として読み直す
- 並べる本物: `oxc_parser/src/js/arrow.rs`（`try_parse_parenthesized_arrow_function_expression`、`parse_parenthesized_arrow_function_head`）、`cursor.rs` の `checkpoint`、`lookahead`、`lexer/mod.rs` の `checkpoint`、`rewind`
- 履歴の手がかり: 巻き戻しを避けるための先読みの工夫があるか。`CHANGELOG.md` の「annotated empty arrows」（`d21d5cf`）のような修正が、なぜ後から出るか。パス3
- 章末の欠点: 巻き戻しは、失敗のたびに読み直す。代入の左辺（`[a, b] = c`）では、別の方法が採られている
- エピグラフ: 候補なし

### 10章　`[a, b] = c` の左辺は、いつ配列でなくなるのか

- ミニ実装: `code/oxc/10-cover-grammar/`
- 足す機能: 左辺を、まず式（配列リテラル）として読み、`=` を見た時点で代入のパターンへ読み替える
- 並べる本物: `oxc_parser/src/js/grammar.rs`（`CoverGrammar` の `cover`、`AssignmentTarget` への実装）、`js/binding.rs`
- 履歴の手がかり: ECMAScript仕様の「CoverParenthesizedExpressionAndArrowParameterList」との対応。9章の巻き戻しとの使い分け
- 章末の欠点: `await` や `yield` を識別子として読んでよい場所と、そうでない場所がある
- エピグラフ: 候補なし

### 11章　`await` は、識別子なのか予約語なのか

- ミニ実装: `code/oxc/11-context/`
- 足す機能: `async` 関数の中だけで `await` を式として読む。文法のパラメータをビット集合で持ち、関数に入るたびに付け替える
- 並べる本物: `oxc_parser/src/context.rs`（`Context` の `In`、`Yield`、`Await`、`Return`）、`state.rs` の `ParserState`
- 履歴の手がかり: 仕様の文法パラメータ `[In, Yield, Await]` との対応（`context.rs` のコメントが仕様の節を引いている）。`CHANGELOG.md` の「Preserve reparsed `await` tokens」（`7811f0a`）
- 章末の欠点: 不正な入力が来たら、ここまでのパーサは例外を投げて止まる
- エピグラフ: 候補なし

### 12章　構文エラーがあっても、どこまで木を作り続けるか

- ミニ実装: `code/oxc/12-error-recovery/`
- 足す機能: 診断を集めながら読み続ける。回復できない誤りだけ、以降を諦める
- 並べる本物: `oxc_parser/src/error_handler.rs`（`set_fatal_error`、`fatal_error`）、`diagnostics.rs`、`oxc_parser/src/lib.rs` の `ParserReturn`（`errors`、`panicked`）、`oxc_diagnostics`
- 履歴の手がかり: 「回復する」と「致命的として止める」の線引きの変遷。`CHANGELOG.md` の「Recover await using object binding patterns」（`3130405`）
- 章末の欠点: エラーなしで読めた木は、どんな形で持つのがよいか、まだ決めていない
- エピグラフ: 候補なし

---

## アーク3　木を、どんな形とメモリの置き方で持つか（13〜17章）

### 13章　ASTのノードは、どんな型で持つか

- ミニ実装: `code/oxc/13-ast-types/`
- 足す機能: ESTree風のオブジェクトをやめ、種類ごとの型と、式全体の直和型 `Expression` で持つ
- 並べる本物: `oxc_ast/src/ast/js.rs`（`Expression`、`Statement`）、`literal.rs`、`ts.rs`、`oxc_ast/src/ast_impl/`
- 履歴の手がかり: ノードの大きさを揃えるために `Box` を挟む判断。`oxc_ast/src/generated/assert_layouts.rs` があるか（`tasks/ast_tools/src/generators/assert_layouts.rs` が生成する）。パス2
- 章末の欠点: ノードごとに小さな割り当てが起き、木を捨てるにも一つずつ解放する
- エピグラフ: 候補なし

### 14章　ノードを、なぜ一つずつ解放しないのか

- ミニ実装: `code/oxc/14-arena/`
- 足す機能: 一つの連続領域から切り出していくアリーナ。木の解放は領域ごと
- 並べる本物: `oxc_allocator/src/allocator.rs`（`Allocator`）、`arena/`、`boxed.rs`（`Box<'alloc, T>` は `NonNull<T>` と `PhantomData`）、`vec.rs`、`pool/`
- 履歴の手がかり: `bumpalo` の取り込みと、`arena/` へ移した現在の作り（`bumpalo_alloc.rs` が残っている理由）。パス3
- 章末の欠点: 文字列はどこに置くのか。ソースの部分文字列と、加工した文字列の両方がある
- エピグラフ: 候補なし

### 15章　文字列は、どこに置いて何度も比べるのか

- ミニ実装: `code/oxc/15-atoms/`
- 足す機能: 識別子の文字列を、アリーナに置いた参照として持つ。比較に使うためのハッシュ
- 並べる本物: `oxc_str/src/ident.rs`（`Ident<'a>`）、`ident_hasher.rs`、`str.rs`（`Str<'a>`）、`compact_str.rs`
- 履歴の手がかり: `Atom` から `Str`、`Ident` に分かれた経緯（現在のツリーに `Atom` は見当たらない。履歴で確認する）
- 章末の欠点: ノードを作る側が、フィールドを毎回手で埋めている
- エピグラフ: 候補なし

### 16章　ノードの定義から、走査とビルダーをどう作るか

- ミニ実装: `code/oxc/16-generate-visit/`
- 足す機能: ノードの型定義を一か所に書き、そこから `visit`（走査）と `builder`（作成）を生成する小さなスクリプト
- 並べる本物: `oxc_ast_macros/src/ast.rs`（`#[ast]`）、`tasks/ast_tools/src/generators/`（`ast_builder.rs`、`visit.rs`、`ast_kind.rs`）、`oxc_ast/src/generated/`、`oxc_ast_visit/src/generated/visit.rs`（`Visit`）と `visit_mut.rs`（`VisitMut`）
- 履歴の手がかり: 手書きから生成へ移った時期と理由。生成物の差分をCIで検査しているか。パス3
- 章末の欠点: 走査はできたが、走査の途中で木を書き換えたいとき、親が分からない
- エピグラフ: 候補なし

### 17章　木を、JavaScriptの世界へどう渡すのか

- ミニ実装: `code/oxc/17-estree/`
- 足す機能: ノードをESTree形式のJSONへ直列化する。位置はUTF-16の単位へ直す
- 並べる本物: `oxc_estree/src/`、`#[estree(...)]` 属性（`oxc_span/src/span.rs` に例）、`oxc_ast_visit/src/utf8_to_utf16/`、`napi/parser/src/generated/raw_transfer_constants.rs`、`tasks/ast_tools/src/generators/raw_transfer.rs`
- 履歴の手がかり: JSONを経由せず、アリーナの中身をそのままJS側の `ArrayBuffer` に渡す「raw transfer」を入れた理由。`oxc_allocator` の `fixed_size` 機能との関係。パス3
- 章末の欠点: 木の形は決まったが、名前の解決を誰もしていない
- エピグラフ: 候補なし

---

## アーク4　名前の意味を、どう解くか（18〜22章）

### 18章　変数のスコープは、木のどこに持たせるか

- ミニ実装: `code/oxc/18-scopes/`
- 足す機能: 関数とブロックごとにスコープを作り、親へ辿れる木にする。`var` と `let` で、宣言が属するスコープが違う
- 並べる本物: `oxc_semantic/src/builder.rs`（`SemanticBuilder`）、`scoping.rs`（`Scoping`）、`oxc_syntax/src/scope.rs`（`ScopeFlags` の `Var = Top | Function | ClassStaticBlock | TsModuleBlock`）
- 履歴の手がかり: スコープを木のノードに持たせず、別の表（`Scoping`）に持たせる判断。パス3
- 章末の欠点: スコープはできたが、宣言をどこに登録するか、`var` の巻き上げを扱っていない
- エピグラフ: 候補なし

### 19章　`var` の宣言は、なぜ関数の先頭に現れるのか

- ミニ実装: `code/oxc/19-symbols/`
- 足す機能: 宣言をシンボルとして登録する。`var` は最も近い関数のスコープへ持ち上げ、`let` はブロックに置く
- 並べる本物: `oxc_semantic/src/binder.rs`（`Binder` トレイト）、`oxc_syntax/src/symbol.rs`（`SymbolFlags`）、`scoping.rs`
- 履歴の手がかり: 宣言の衝突を検査する（`checker/`）のと、登録するのを一つの走査でやるか。パス3
- 章末の欠点: 使う側の識別子は、まだどの宣言を指すか分からない
- エピグラフ: 候補なし

### 20章　識別子の参照は、どの宣言を指すのか

- ミニ実装: `code/oxc/20-references/`
- 足す機能: 識別子を読んだ時点では未解決の参照として積み、スコープを出るときに宣言と結ぶ。結べなければ外側へ持ち上げる
- 並べる本物: `oxc_semantic/src/unresolved_stack.rs`（`UnresolvedReferences`）、`oxc_syntax/src/reference.rs`、`is_global_reference.rs`
- 履歴の手がかり: 宣言より前に使う参照（巻き上げ、関数宣言）をどう結ぶか。「スコープを出るときに解決する」設計に至った経緯
- 章末の欠点: 解決はできたが、文法上は正しいのに意味として誤り（同名の `let` の二重宣言）を検出していない
- エピグラフ: 候補なし

### 21章　構文は正しいのに、なぜ誤りになるのか

- ミニ実装: `code/oxc/21-early-errors/`
- 足す機能: 二重宣言、`break` の対象がない、などの早期エラーを、木が出来上がった後に検査する
- 並べる本物: `oxc_semantic/src/checker/`（`mod.rs`、`javascript.rs`、`typescript.rs`）、`label.rs`、`diagnostics.rs`
- 履歴の手がかり: 早期エラーを、パーサの中と `oxc_semantic` のどちらで検出するかの線引き。Test262（`tasks/coverage`）の失敗が根拠になっているか。パス3。制御フローグラフ（`oxc_cfg`）はここで存在に触れる
- 章末の欠点: 「この識別子の親は何か」を引くには、木を上から辿り直す必要がある
- エピグラフ: 候補なし

### 22章　子から親を、どう引くのか

- ミニ実装: `code/oxc/22-node-ids/`
- 足す機能: 各ノードに `NodeId` を振り、ノードを平らな配列に置き、親のIDを持たせる
- 並べる本物: `oxc_semantic/src/node/`（`nodes.rs` の `AstNodes`、`ancestry.rs`、`store.rs`）、`oxc_ast/src/generated/ast_kind.rs`（`AstKind<'a>`）、`oxc_syntax/src/node.rs`
- 履歴の手がかり: 親ポインタを木のノードに持たせない判断（アリーナ上の木では循環参照になる）。`AstKind` が参照を持つ設計。パス3
- 章末の欠点: 読むだけなら十分だが、木を書き換えると、`NodeId` とスコープの表が古くなる
- エピグラフ: 候補なし

---

## アーク5　木を、意味を保ったまま書き換えるには（23〜27章）

### 23章　走査しながら、木を書き換えるには何が要るか

- ミニ実装: `code/oxc/23-traverse/`
- 足す機能: ノードに入るときと出るときに呼ばれるフック `enter`、`exit` と、いま歩いている祖先の列
- 並べる本物: `oxc_traverse/src/generated/traverse.rs`（`Traverse<'a, State>`）、`walk.rs`、`ancestor.rs`、`context/ancestry.rs`、`context/mod.rs`（`TraverseCtx`）
- 履歴の手がかり: `VisitMut` があるのに `Traverse` を別に作った理由。祖先を持つために `unsafe` な走査になっている点（`walk.rs`）とその安全の根拠。パス3
- 章末の欠点: 書き換えで新しい変数を作るとき、既存の名前とぶつからない保証がない
- エピグラフ: 候補なし

### 24章　新しい変数の名前は、どうぶつからずに作るのか

- ミニ実装: `code/oxc/24-uid/`
- 足す機能: 走査中に新しい一時変数を作り、スコープにシンボルとして登録し、既存の名前と衝突しない名前にする
- 並べる本物: `oxc_traverse/src/context/mod.rs`（`generate_uid_name`、`generate_uid`、`generate_uid_in_current_scope`、`create_child_scope`）、`context/bound_identifier.rs`、`maybe_bound_identifier.rs`、`context/uid.rs`
- 履歴の手がかり: Babelの `generateUid` との対応（コメントの有無は未確認）。パス3
- 章末の欠点: 新しい変数を作る場所がまだない。文の前に文を挿入する仕組みが要る
- エピグラフ: 候補なし

### 25章　`a?.b` は、どんな式に書き換わるのか

- ミニ実装: `code/oxc/25-optional-chaining/`
- 足す機能: `a?.b.c` を、一時変数と条件式に展開する
- 並べる本物: `oxc_transformer/src/es2020/optional_chaining.rs`（`OptionalChaining<'a>`）、`nullish_coalescing_operator.rs`、`common/var_declarations.rs`、`common/statement_injector.rs`
- 履歴の手がかり: Babelのプラグインの移植であること、`tasks/transform_conformance` でBabelのテストを流している点
- 章末の欠点: `this` を束縛する必要のある呼び出し（`a?.b()`）と、アロー関数の `this` を扱っていない
- エピグラフ: 候補なし

### 26章　アロー関数を `function` に戻すと、`this` はどうなるのか

- ミニ実装: `code/oxc/26-arrow-this/`
- 足す機能: アロー関数を `function` 式へ書き換える。外側の `this` と `arguments` を、変数へ退避して参照する
- 並べる本物: `oxc_transformer/src/es2015/arrow_functions.rs`、`common/arrow_function_converter.rs`（`ArrowFunctionConverter<'a>`）
- 履歴の手がかり: `es2015` のアロー関数変換の実装が `common/` へ移った時期と理由。`async` アロー関数の扱い。パス3
- 章末の欠点: 型の注釈が残っていて、JavaScriptとしては実行できない
- エピグラフ: 候補なし

### 27章　TypeScriptの型は、どう消すのか

- ミニ実装: `code/oxc/27-strip-types/`
- 足す機能: 型注釈、`interface`、`type` を消す。`enum` と `namespace` は、実行時の値を作るコードに書き換える
- 並べる本物: `oxc_transformer/src/typescript/`（`annotations.rs`、`enum.rs`、`namespace.rs`、`module.rs`）、`oxc_parser/src/ts/`
- 履歴の手がかり: 型を検査せず消すだけにする判断（`isolatedModules` 的な制約）。`enum` を消せない理由
- 章末の欠点: 変換後の木を、コードの文字列に戻していない
- エピグラフ: 候補なし

---

## アーク6　木を、コードとして出し、小さくするには（28〜31章）

### 28章　木を、括弧とセミコロンを補いながら、どう文字列に戻すか

- ミニ実装: `code/oxc/28-codegen/`
- 足す機能: 各ノードが自分の出力を持つ `gen`。優先順位に応じて、必要なときだけ括弧をつける
- 並べる本物: `oxc_codegen/src/lib.rs`（`Codegen`）、`gen.rs`（`Gen`、`GenExpr`）、`binary_expr_visitor.rs`、`operator.rs`、`oxc_ast/src/precedence.rs`
- 履歴の手がかり: 7章の `Precedence` を出力側でも使う点。二項式の連鎖を再帰でなく明示スタックで出力する作り（`binary_expr_visitor.rs`）の理由。パス3
- 章末の欠点: 出力の位置と、元のソースの位置の対応が失われる
- エピグラフ: 候補なし

### 29章　出力のどの位置が、元のどの位置なのか

- ミニ実装: `code/oxc/29-sourcemap/`
- 足す機能: 出力の一つの位置ごとに、元の `Span` を記録し、VLQで符号化したソースマップを出す
- 並べる本物: `oxc_codegen/src/sourcemap_builder.rs`（`SourcemapBuilder`、`add_source_mapping_for_name`）、`options.rs`
- 履歴の手がかり: 位置を行と列に直す処理を、出力時にまとめて行う設計（2章と対）
- 章末の欠点: コードは正しいが、小さくない
- エピグラフ: 候補なし

### 30章　`1 + 2` は、いつ `3` に畳めるのか

- ミニ実装: `code/oxc/30-peephole/`
- 足す機能: 定数畳み込みと、到達しない分岐の削除。変化がなくなるまで、パスを繰り返す
- 並べる本物: `oxc_minifier/src/compressor.rs`（`Compressor`、`run_in_loop`）、`peephole/mod.rs`（`PeepholeOptimizations`）、`peephole/fold_constants.rs`、`remove_dead_code.rs`、`oxc_ecmascript`（定数評価、未確認）
- 履歴の手がかり: `peephole/` の各パスの追加履歴。`tasks/minsize` で他のミニファイヤとサイズを比べている点
- 章末の欠点: 変数の名前は長いまま
- エピグラフ: 候補なし

### 31章　変数の名前は、どう短く付け直すのか

- ミニ実装: `code/oxc/31-mangle/`
- 足す機能: スコープごとにシンボルを、使用頻度順に短い名前へ割り当てる。ぶつかる名前を避ける
- 並べる本物: `oxc_mangler/src/lib.rs`（`Mangler`）、`base54.rs`（`base54`、頻度順の文字表 `etnriaoscludfpmhg_10vy2436b8x579SCwTEDOkAjMNPFILRzBVHUWGKqJYXZQ`）、`keep_names.rs`
- 履歴の手がかり: 文字表の作り方（`base54.rs` のコメントに手順がある）。`nanoid` に着想を得たとコメントにある。20章の参照の表が、ここで再利用される
- 章末の欠点: 本書の範囲はここまで。残る課題は、`oxc_linter` や型チェックなど本書の外
- エピグラフ: 候補なし
