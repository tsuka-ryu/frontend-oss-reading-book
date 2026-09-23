# DIGEST_SPEC

Web仕様とフロントエンドOSSの動きを、毎朝届くニュースとしてまとめ、`src/digest/` に積む。
本編（各パートの章）とは独立したパートとして扱う。

## 目的と読者

- 読者は、Web仕様・ブラウザ実装・React/Next.jsやツールチェーンなどOSSの内部を理解したいエンジニア
- 目的はOSSへの貢献ではなく「中身の理解」。何が変わったかより、なぜそう変えたか・どういう仕組みかを重視する
- とくに「機能がどう考えられ、どう決まり、どう実装されるか」の流れが見えるように書く
- スマホで読み物として読む。見出しと短い段落で、流し読みしやすくする
- 最初は対象を広く取り、件数も絞らない。読者が号を眺めて、いらない対象をこのファイルから外していく
- 読者像と文体は、CLAUDE.mdの「書き方」ではなくこのファイルに従う

## 共通ルール

### 触ってよい範囲

- `src/digest/` 以下のファイル
- `src/SUMMARY.md` の「# ダイジェスト」パート内の行
- 本との連携で行う、Issueの作成と `BACKLOG.md` の「ダイジェストからの候補（未採用）」節への追記（後述）
- それ以外（本編の章、`code/`、`spec/`、`draft/`、BACKLOG.mdの他の節など）は触らない

### git

- ダイジェストは例外として、PRを通さずmainへ直接pushしてよい（CLAUDE.mdにも明記）
- 作業開始時に `git pull --rebase origin main`
- 号のMarkdownを書いたら `node scripts/generate-digest-feed.mjs` を実行し、`src/digest/feed.xml`（RSSフィード）を更新する
- 成果物をコミットし、`mdbook build` が通ることを確認する。通らなければpushしない
- push前にもう一度 `git pull --rebase origin main` してからmainへpushする
- コミットメッセージは `digest: daily 2026-09-24` の形式
- 1回の実行で1コミット

### 日付と期間

- 日付はすべて日本時間（JST）で扱う
- 「前回の実行」は、mainにある最後の `digest: daily ...` コミットのコミット日時とする
  - 例：`git log -1 --format=%cI --grep='^digest: daily' origin/main`
  - 該当コミットがなければ初回として扱い、直近24時間を対象にする

### 調査と記述

- 情報の取り方は、取りたいものによって使い分ける
  - マージされた変更の一覧: 対象を `/tmp/oss/<name>` にcloneし（またはfetchし）、`git log` で拾う。github.comのPR一覧ページを読んでもよい
  - PR本文、レビュー、関連Issue、Discussions: github.comのページを読む（WebFetchなど）
  - diffとコードの引用: 必ずcloneしたリポジトリの `git show` などから取る。ページの要約から引用しない
  - このリポジトリへのIssue作成: GitHub MCP（または `gh`）
- 実行環境によっては、他のリポジトリにGitHub APIや `gh` でアクセスできない。使えない手段に頼らない
- web検索も使ってよい
- 取得できなかった対象は、推測で埋めずに「取得できず（理由）」と書く
- 推測で書かない。各項目に元のPR・コミット・Issue・Discussion・アドバイザリのURLを必ず付ける
- 調べて分からなかったことは「不明」と書く
- 日本語で書く。専門用語は原語を併記してよい
- PR本文やIssueの文章を長く引用しない。要旨を自分の言葉でまとめる
- コードの引用は解説に必要な最小限にし、引用元のファイルパスとコミットを示す
- 対象OSSを深く読むときは `/tmp/oss/<name>` にクローンする。このリポジトリの中にはクローンしない

### cloneの仕方

実行のたびに新しい環境で動くので、cloneは毎回軽く済ませる。

- 変更の一覧を拾うだけなら、ファイルの中身を落とさないcloneにする
  - 例：`git clone --filter=blob:none --no-checkout --shallow-since=<前回の実行の1日前> <URL> /tmp/oss/<name>`
  - `git log` はこれで動く。`git show` で必要なファイルの中身だけが後から取得される
- 深掘りでソースを読むときだけ、必要なディレクトリに絞ってチェックアウトする（`git sparse-checkout set <path>`）
- 大手のブラウザエンジン（Chromium、WebKit、Gecko）はcloneしない。実装に触れるときは、ソース検索のWebページ（source.chromium.org、searchfox.org など）で該当箇所だけ読む
- 仕様・議論系の対象（WICG、standards-positions、Chrome Platform Statusなど）はcloneせず、Webページで読んでよい

### ファイル構成とSUMMARY.md

- 1日1号、1ファイル：`src/digest/daily/YYYY-MM-DD.md`
- 月の目次：`src/digest/daily/YYYY-MM.md`。タイトルは `# Daily YYYY-MM`。その月の号を新しい順に並べ、各号の「今日のひとこと」とリンクを1行ずつ書く
- `src/digest/README.md` がなければ、このファイルの「目的と読者」をもとに短い説明ページを作る

`src/SUMMARY.md` の末尾（パート追加用のコメントブロックより後ろ、ファイルの最後）に次のパートを置く。なければ作る。

```
# ダイジェスト

- [ダイジェストについて](digest/README.md)
- [Daily 2026-09](digest/daily/2026-09.md)
  - [09-24（木）](digest/daily/2026-09-24.md)
  - [09-23（水）](digest/daily/2026-09-23.md)
- [Daily 2026-08](digest/daily/2026-08.md)
```

- 新しい月は上に足す。月の中の号も新しい日を上に足す

---

## 号の形式

```
# YYYY-MM-DD（曜）

> 今日のひとこと：いちばん大事なニュースを1〜2文で

## 今日のリリース
## トップニュース
## 今日の深掘り
## 仕様の変更
## ブラウザの実装
## OSSのPR
## 議論ウォッチ
## 続報
## 脆弱性
## 仕様を読む会の候補
```

- 中身がない節は、節ごと省略する（「特になし」とも書かない）
- ニュースが1件もない日も号は出す。「今日のひとこと」に「大きな動きはありませんでした」と書く
- 新規の脆弱性があれば、今日のひとことで必ず触れる

### 見出しの書き方（全節共通）

- 各ニュースは見出しで始める（見出しのレベルは各節の指定に従う。指定がなければ `###`）
- 見出しはニュースの見出しとして書く。主語と動きが一目で分かる短い文にする（例：「HTMLに `<X>` 要素が入る」「oxcのパーサーが〇〇に対応」）。PRタイトルをそのまま使わない
- 本文の先頭に分野タグを付ける：`【HTML】` `【DOM】` `【Fetch】` `【Streams】` `【URL】` `【TC39】` `【CSS】` `【ARIA】` `【WCAG】` `【ServiceWorker】` `【WICG】` `【ブラウザ】` `【Interop】` `【React】` `【Next.js】` `【Vite】` `【Rolldown】` `【oxc】` `【Node.js】` `【TypeScript】` `【Biome】` `【Solid】` `【RHF】` `【Bun】` `【Ladybird】` `【脆弱性】`
- 各ニュースの最後に `出典:` としてURLを付ける

### 今日のリリース

前回の実行以降に公開された、OSSの対象のリリース。

- 1件1行：`- 【対象】<バージョン>：<目玉の変更を1文>（出典: <リリースページのURL>）`
- 目玉の変更は、リリースノートと、前のリリースからのコミットで確かめる
- メジャー版やマイナー版で設計上の大きな変更があれば、トップニュースか深掘りでも扱い、ここからリンクする
- canary、nightly、experimental などの毎日出る先行版は載せない。beta と rc は載せる

### トップニュース

その日のニュースから、設計や挙動への影響がいちばん大きいものを1件選ぶ。

- リード文：何が起きたかを2文で
- 何が変わる
- なぜ変えた（PR本文、関連Issue、議論から）
- 何に効く・誰が困る
- ここまでの経緯：発案から今日までを、日付つきで3〜5行（関連Issue、Stageの変化、過去の号へのリンク）

### 今日の深掘り

その日のニュースから、内部設計を学ぶ題材として価値のある変更を選び、ソースを読んで解説する。1つに絞らなくてよい（目安は1〜3件）。トップニュースと同じでもよい。
1件あたり読了5分程度を目安にする。

- 選んだ理由（1〜2文）
- 背景：なぜ必要だったか。関連Issueやgit履歴から過去の経緯を追う
- 変更点：diffを読みながら、要所のコードを引用して解説
- 周辺コード：変更箇所が呼ばれる流れ、関係するモジュール。必要ならMermaidで図にする
- この変更から分かる設計思想
- 仕様の変更を選んだときは、変更点を仕様の本文（アルゴリズムの手順など）の引用で読み、ブラウザやoxcの実装が分かればそれにも触れる

対象リポジトリは `/tmp/oss/<name>` にクローンして読む。

### 仕様の変更 / ブラウザの実装 / OSSのPR

拾ったニュースを、除外の判定に当たるもの以外はすべて載せる。件数の上限は設けない（トップニュースや深掘りで扱ったものは、見出しと参照リンクだけ）。

- 対象ごと（リポジトリや仕様ごと）に `### <対象名>` でまとめ、その下に各ニュースを `#### <見出し>` で並べる。読者が対象ごとに要不要を判断できるようにするため
- 対象の中では、影響の大きい順に並べる
- 各ニュースは要約を2〜3行と、「なぜ変えたか」を1行
- 動きのなかった対象は、節の最後に「動きなし：whatwg/url, w3c/ServiceWorker」のように1行でまとめる

### 議論ウォッチ

まだ決まっていない機能の議論のうち、前回の実行以降に動きがあったもの。

- 各議題に次を書く
  - 論点
  - 賛否それぞれの主張
  - 今回の進展
  - 次に決まりそうなこと
- 過去の号で取り上げた議題は、前回からの差分だけ書き、前回の号へのリンクを付ける
- 件数の上限は設けない。動きの大きい順

### 続報

今日のニュースや議論が、過去の号で取り上げたものの続きである場合に書く。

- `src/digest/daily/` の過去の号を、PR番号・提案名・Issue番号などで検索して見つける
- 「〇月〇日の号で取り上げた〇〇が、今日〇〇まで進んだ」の形で1〜2行、過去の号へのリンクを付ける
- 機能が「発案 → 議論 → 決定 → 仕様 → 実装」のどこまで来たかを書く

### 脆弱性

新規のアドバイザリがある日だけ置く。

- 影響するパッケージとバージョン、深刻度
- 攻撃原理
- 影響バージョンと成立条件
- 修正コミットのdiff解説
- 同種の脆弱性パターン

### 仕様を読む会の候補

1〜2個、理由つき。

### 届け方

- ルーティンの通知（プッシュ・メール）で届ける
- 実行の最後の返答を、通知の本文になる形にする
  - 1行目：今日のひとこと
  - 続けて：今日のリリース（あれば、対象とバージョンだけ）
  - 続けて：トップニュースと今日の深掘りの見出し、各対象のニュース件数（例：「HTML 3件、React 5件、oxc 4件」）
  - 最後に：その号の公開ページのURL（`https://tsuka-ryu.github.io/frontend-oss-reading-book/digest/daily/YYYY-MM-DD.html`）

---

## ニュースの拾い方

### Web仕様の変更

対象:
- whatwg/html, whatwg/dom, whatwg/fetch, whatwg/streams, whatwg/url のマージ済みPR
- tc39/proposals のコミット（Stage変更を検出する）, tc39/ecma262 のマージ済みPR
- w3c/csswg-drafts のマージ済みPRと、PRを通さずに入ったmainへのコミット
- w3c/aria, w3c/ServiceWorker のマージ済みPR
- w3c/wcag3 のマージ済みPRと、PRを通さずに入ったmainへのコミット

ルール:
- editorial（誤字、リンク修正、整形）は除外

### ブラウザの実装

対象:
- Chrome Platform Status（chromestatus.com）と blink-dev の「Intent to Prototype / Experiment / Ship」
- web-platform-tests/interop のIssueと決定事項

ルール:
- どの仕様の、どの段階の実装かを書く。Web仕様のニュースや議論と同じ機能なら、続報として過去の号とつなぐ
- ブラウザのソースはcloneしない（「cloneの仕方」参照）

### OSSのPR

対象:
- facebook/react
- vercel/next.js
- vitejs/vite
- rolldown/rolldown
- oxc-project/oxc
- nodejs/node
- oven-sh/bun
- microsoft/TypeScript（Goへの移植版もここで開発されている。microsoft/typescript-go は2026-08-20にクローズ済み）
- biomejs/biome
- solidjs/solid の `main` と `next` ブランチ（`main` は本のシグナルのパートが読んでいる1.x系、`next` は次のメジャー版の開発）
- react-hook-form/react-hook-form（本のRHFのパートが読んでいるリポジトリ）
- LadybirdBrowser/ladybird（ブランチは `master`。独自に作られているブラウザエンジンで、仕様がどう実装されるかを追える）

既定のブランチ以外を見る対象は、ブランチ名を書いておく。

対象を増やす・減らすときは、このリストを直す。

除外の判定:
- 作者がbot（`dependabot`、`renovate` など、アカウント名が `[bot]` で終わるもの）
- 変更ファイルがすべて次のどれかに当たるもの
  - docsのみ：`docs/`、`*.md`、`*.mdx`
  - CI設定のみ：`.github/`、`.circleci/` など
  - テストのみ：`test/`、`tests/`、`__tests__/`、`*.test.*`、`*.spec.*`、fixture

ルール:
- 除外の判定に当たらないものは、件数を絞らずすべて載せる
- 「なぜ変えたか」はPR本文と関連Issueから取る

### リリース

対象:
- 「OSSのPR」の対象リポジトリのリリース

拾い方:
- cloneしたリポジトリのタグを日付で絞る（例：`git for-each-ref refs/tags --sort=-creatordate --format='%(creatordate:iso) %(refname:short)'`）
- タグで分からないときは、github.comのリリースページ（`https://github.com/<owner>/<repo>/releases`）を読む
- モノレポで複数のパッケージのタグが出る場合（例：oxcの `oxlint_v…` と `crates_v…`）は、利用者に見えるパッケージのものだけ載せる

### 議論

対象:
- WICG（WICG/proposals と、議論が動いたWICGの提案リポジトリ）：新しいWeb APIの発案
- mozilla/standards-positions, WebKit/standards-positions：新しい仕様へのブラウザ各社の立場と理由
- TC39の会議のアジェンダと結果（会議やノートの公開があったときのみ）
- tc39/proposal-signals のIssueとPR
- tc39/proposals でStageが変わった提案、またはStage 1〜3の提案リポジトリのIssueで議論が進んだもの
- WHATWGとCSSWGのIssueのうち、会議で決まったこと（CSSWGの決定事項のコメントなど）が書き込まれたもの
- reactjs/rfcs のPRとIssue
- nodejs/TSC のIssue
- vercel/next.js のDiscussions（RFCカテゴリ）
- oxc-project/oxc のDiscussionsと、設計に関わるIssue（RFCやtrackingのラベルがついたもの）

ルール:
- コメントが増えただけで論点が動いていないものは載せない

### 脆弱性

対象:
- GitHub Advisory Database（npmエコシステム）で、次のパッケージの新規アドバイザリ
  - react, react-dom, next, vite, rolldown
  - oxcのnpmパッケージ（oxlint, oxc-parser など）
- nodejs.org のセキュリティリリース告知

ルール:
- アドバイザリのページと、修正コミット（cloneしたリポジトリ）を根拠にする
- 修正コミットが公開されていなければ、diff解説は「不明（修正コミット未公開）」と書く

---

## 本との連携

実行中に、次のものを見つけたら対応する。

### 既存の章に影響する上流の変更

`src/` にすでにある章が解説しているコードを変更するPRを見つけたら、Issueを立てる。

- ラベル: `book:<part>` と `upstream-change`（`<part>` は `spec/BOOK_SPEC.md` 第0節のslug。ラベルがなければ作る）
- タイトル: `[upstream] <リポジトリ>#<PR番号> <PRタイトル>`
- 本文: PRのURL、影響しそうな章のパス、何が古くなりそうか
- 同じPRのIssueがすでにあれば立てない
- Issueを作れない環境なら、その号の該当ニュースに「本への影響: <章のパス>」と書き添えるだけにする

### 章の候補

「今日の深掘り」や、設計上おもしろい変更があり、本の章にできそうなら、`BACKLOG.md` 末尾の「ダイジェストからの候補（未採用）」節に追記する。

- 追記するのはこの節だけ。各パートの「章の候補」やチェックボックスは触らない
- 節がなければ、BACKLOG.mdの末尾に作る
- 書式は1行1件で `- <題材>（パート: <slug または 新規>、出典: <PR URL>、YYYY-MM-DD 追記）`
- この節の項目は執筆ルーティンの着手対象ではない。採用するときは人間が該当パートの「章の候補」へ移す
- 同じ題材がBACKLOG.mdのどこかにすでにあれば追記しない
