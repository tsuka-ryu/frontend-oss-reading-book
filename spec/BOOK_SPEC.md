# BOOK_SPEC.md

OSSリポジトリのソースとgit履歴を読み、スマホで読める読み物としての「本」を生成するための仕様。
Claude Code に渡す指示書として使う。

---

## 0. 対象リポジトリ

すべての本を一つのリポジトリに置き、mdBookのパートとして並べる。
各パートの設定を下の表で管理する。
生成するときは、いま扱うパートの行だけを見る。

| パート | slug | クローン先 | FOCUS | 除外 |
| --- | --- | --- | --- | --- |
| シグナル | signals | `../solid` | リアクティブコアの依存追跡と再計算 | JSXコンパイラ、SSR |
| React Hook Form | rhf | `../react-hook-form` | 再描画を抑える購読の設計 | 各UIライブラリとの統合 |
| oxc | oxc | `../oxc` | パーサとASTの表現、変換パイプライン | linterの個別ルール |
| Vite / Rolldown | vite | `../vite`, `../rolldown` | 開発サーバの解決とHMR、Rolldownへの統合 | プラグインエコシステム |
| React | react | `../react` | Fiber、Lane、レンダリングのスケジューリング | 各レンダラの固有処理 |
| Next.js | nextjs | `../next.js` | RSCの境界がどこにどう引かれているか | デプロイ、ホスティング固有の機能 |
| Node.js | node | `../node` | モジュール解決（ESMとCJSの相互運用） | 上記以外のすべて |
| Rust コンパイラ | rustc | `../rust` | クエリシステムとインクリメンタルコンパイル | 型推論・借用検査の個別規則、LLVMコード生成 |
| Servo | servo | `../servo` | スタイル計算（Stylo）の並列化と再スタイルの無効化 | WebRender、DOMスクリプト統合 |

この順に書く。
後のパートは前のパートを前提にしてよい。
ReactはシグナルとNext.jsの間に置く。シグナルとの対比でスケジューリングの設計判断が読めるようになり、Next.jsはReactを知らないと切り分けられないためである。
rustcはoxcとViteの後ろに置く。ASTの表現とHMRの無効化を知ったうえで、クエリシステムを依存追跡の一般化として読むためである。
Servoは最後に置く。oxcとrustcでRustの語彙が揃い、シグナルで学んだ再計算の無効化がスタイル計算にも現れることを確かめて本を閉じる。

Node.js、rustc、Servoは範囲の絞り込みを強く効かせる。
いずれも履歴が長く規模も大きいため、全体を読もうとすると破綻する。

`FOCUS` が空のパートは書き始めない。

## 1. 読者と読む状況

読者はマネージャー職のエンジニアである。
実装は日常的にはしていないが、Web仕様やブラウザ実装を含め、内部実装を理解したうえで議論できるようになりたいと考えている。

読むのは通勤中、待ち時間、寝る前で、手元にコードもエディタもない。
1回に読むのは1章、集中が続くのは5分から10分と想定する。

手元にコードがないという条件が、以下の規則のほとんどを決めている。

---

## 2. 文章規範

執筆と推敲では、`japanese-tech-writing/SKILL.md` に従う。
これは k16shikano 氏による日本語技術文書の文章規範で、LLMが生成しがちな空虚な言い回しを排除するために作られている（Unlicense）。

最初に取得する。

```bash
mkdir -p japanese-tech-writing
curl -sL https://gist.githubusercontent.com/k16shikano/fd287c3133457c4fd8f5601d34aa817d/raw/SKILL.md \
  -o japanese-tech-writing/SKILL.md
```

原稿を書く前と、書き上げたあとの2回、この規範を読んで点検する。
とくに「LLMっぽい表現の禁止」「冗長の排除」「論証の厳密さ」は、生成物に対して機械的に適用する。

規範は一文ごとの改行を求めている。
mdBookはCommonMarkに従うため、単一の改行は空白として扱われ、段落は正しく結合される。
ソースはそのまま一文一行で書いてよい。

---

## 3. 入力として読むもの

コードだけを読むと、いまどうなっているかしか書けない。
なぜそうなったかは履歴と議論のなかにある。
以下をすべて入力に含める。

| 入力 | 取り方 | 得られるもの |
| --- | --- | --- |
| ソースコード | 直接読む | 現在の構造 |
| git履歴 | 後述の絞り込み | 変更の理由、設計の転換点 |
| PR、Issue | `gh pr view`, `gh issue view` | 議論、却下された代案 |
| RFC、docs、ADR | リポジトリ内を探索 | 設計意図の一次資料 |
| CHANGELOG | 直接読む | 破壊的変更とその背景 |

### git履歴の絞り込み

`git log` 全体を読ませると量に潰され、薄い記述しか出ない。
目的を絞って投げる。

```bash
# あるファイルの変遷を、差分ごと追う
git log --follow -p -- src/types.ts

# あるモジュールが導入されたコミットを特定する
git log --diff-filter=A -- src/parser/

# 特定の識別子がいつ入ったか
git log -S "someFunction" --oneline

# 変更量の多いコミットから転換点を探す
git log --shortstat --oneline | head -100
```

目を引くコミットを見つけたら `git show <sha>` で本文を読み、リンクされたPRがあれば `gh pr view <n> --comments` まで辿る。
却下された案が書かれているPRは、採用された設計より情報量が多いことが多い。

---

## 4. 章の構造

各章は `chapters/NN-slug.md` に1ファイルとして書く。

本文は1,500字から2,500字（日本語）に収める。
これを超えたら章を割る。
超過は、まとめきれていないことの現れである。

章はおおむね次の順に進める。

1. 読者が持つ問いを、具体的な形で置く。ただし「本章では〜を扱う」という予告の型は使わない（規範の「LLMっぽい表現の禁止」を参照）
2. 読者が持っていそうな素朴な理解を先に書き、それが実装と食い違う点を示す
3. 実装が実際にどうなっているかを述べる。ここでコードを1、2箇所引く
4. 履歴、PR、RFCから、そうなった理由を述べる
5. この章で扱えなかったことと、次章への接続

3と4の分量が同程度になるのが望ましい。
4が書けない章は、入力の掘り方が足りていない。

章と節の見出しは、規範の「見出しの付け方」に従う。
節の結論を言い切る見出しにはしない。

---

## 5. この本に固有の規則

規範に加えて、以下を守る。

### 自己完結させる

読者の手元にコードはない。
「`src/parser/index.ts` を参照」「詳しくはテストコードを見てほしい」のように、読者に何かを開くことを要求しない。
ファイルパスに言及してよいのは、位置関係を説明する場合に限る。

### 固有名の扱い

規範は、後で参照する必要のない固有名を出さないことを求めている。
OSSの内部構造を主題とする本では、関数名や型名そのものが議論の対象になるため、この規則は緩める必要がある。
判断の基準は、その名前が以後の議論で再び使われるかどうかに置く。
一度きりしか出てこない識別子は、一般的な言い方に置き換える。

### 用語

初出の用語は、規範のとおり太字で示し、その場で説明してから使う。
`arena`、`visitor`、`Fiber`、`Lane`、`hydration` のような語を、知っている前提で使わない。
読者はそこで読むのをやめる。

### 箇条書き

規範に従い、定義や分類の列挙にのみ使う。
議論の展開を箇条書きで代用しない。
読み物としては、地の文で論理関係を示すほうが頭に入る。

---

## 6. コードの引用

1つの抜粋は10行から30行とする。
40行を超えるなら、削るか、引用をやめて散文で説明する。

抜粋は実際のコードから削って作る。
省略は `// ...` で示し、何を省いたかを直後に一文で書く。

抜粋の直後には、そのなかで何が本質なのかを一文で添える。
貼ったまま次の話題に移らない。

型定義の羅列は貼らない。
読者はスクロールして飛ばす。

スマホの画面ではコードブロックが横スクロールになる。
1行は60桁程度までに収め、深いインデントを含む箇所はインデントを詰めて引用する。
横スクロールが必要なコードは、その時点で読まれない。

---

## 7. 確度の表記

生成物には必ず誤りが混ざる。
どこが怪しいかを読者が判別できる状態にする。
規範の「確認していないことを、確認したかのように滑らかに書かない」を、形式として担保するための仕組みである。

各章の末尾に次を置く。

```markdown
---
確度:
- 実ソース確認済み：パース処理の流れ、`ZodType.parse` のシグネチャ
- 履歴、PR由来：v4でパーサを書き換えた理由（PR #1234）
- 推測：性能上の判断だったと思われる部分（明示的な記述は見つからず）
```

推測を推測と書かないくらいなら、書かないほうがよい。

---

## 8. 生成パス

同じ指示を繰り返しても収束しない。
各パスに別の目的を与える。
パスごとにコミットし、diffで、良くなったのか膨らんだだけなのかを判定する。

### パス1　骨格

実ソースを読み、`draft/` に次を出力する。
この段階では読み物にしない。

- ディレクトリマップ（各ディレクトリの責務を一行ずつ）
- 語彙集（このリポジトリ固有の名詞と、その一行説明）
- 主要な呼び出しパスを3本から5本（入口の関数を呼んでから結果が返るまでの縦の道筋）
- 章立て案

### パス2　検証

パス1に登場するすべてのパス、シンボル、シグネチャを実物と突き合わせる。
存在しないもの、シグネチャが違うものは削除するか、未確認と記す。

このパスを飛ばすと、以降の推敲がすべて誤りの上に積み上がる。

### パス3　なぜを足す

git履歴、PR、RFCを読み、各章の理由の部分を埋める。
理由が見つからなかった箇所は、見つからなかったと明記する。

### パス4　本文化

パス1から3までは資料である。
ここで初めて、規範と第5節に従って本文を書く。

### パス5　規範による点検

`japanese-tech-writing/SKILL.md` を読み直し、書き上げた本文を点検する。
「LLMっぽい表現の禁止」の一覧に該当する語句を検索し、置き換えるか削除する。
「冗長の排除」に従い、同じ主張の言い換えと、隣接する節の役割の重複を潰す。

### パス6以降　読者フィードバック

読者が詰まった箇所は、GitHubのIssueとして記録される。
`gh issue list --label reading` で取得し、該当章だけを書き直す。
反映したIssueはクローズし、コミットメッセージにIssue番号を含める。

全体を改善せよという指示は出さない。膨らむだけになる。
Issueの立っていない章は触らない。
自分が詰まった箇所だけが、信頼できる改善指標である。

---

## 9. 出力

一つのリポジトリ、一つのmdBook、一つのPagesサイトにまとめる。
パートを分けるのはSUMMARY.mdの中だけである。

まとめる理由は、共通部分の同期コストと、パート間のリンクにある。
ViteとRolldownとoxcは一続きの実装であり、ReactとNext.jsのRSCは共同設計されている。
サイトが分かれていると、そこに橋を架けられない。

```
oss-reading/
  book.toml
  src/
    SUMMARY.md
    00-preface.md
    signals/01-....md
    oxc/01-....md
    vite/01-....md
    react/01-....md
  theme/custom.css
  spec/
    BOOK_SPEC.md
    japanese-tech-writing/SKILL.md
  draft/
    signals/
    oxc/
  .github/workflows/deploy.yml
```

`draft/` は `src/` の外に置く。ビルドに含まれない。

### SUMMARY.md

`# 見出し` がパートの区切りになる。

```markdown
# Summary

[はじめに](00-preface.md)

# シグナル

- [依存はいつ記録されるか](signals/01-dependency-tracking.md)
- [再計算の範囲はどう決まるか](signals/02-recomputation.md)

# oxc

- [ASTをどう表現しているか](oxc/01-ast.md)
```

章を足すときはこのファイルに一行加える。
ここに書かれていないファイルはビルドされない。

### パート間のリンク

相対パスで書く。mdBookが解決する。

```markdown
Reactが同じ問題をどう解いたかは
[スケジューリングの設計](../react/03-scheduling.md) で扱う。
```

書いている時点で存在しない章にはリンクしない。
リンク切れは `mdbook build` が警告するので、CIの失敗として扱う。

### book.toml

```toml
[book]
title = "フロントエンドの基盤を読む"
language = "ja"
src = "src"

[output.html]
default-theme = "rust"
additional-css = ["theme/custom.css"]
git-repository-url = "https://github.com/<user>/oss-reading"
edit-url-template = "https://github.com/<user>/oss-reading/edit/main/{path}"

[output.html.search]
enable = true
```

`edit-url-template` を入れておくと、各ページから該当章のGitHub編集画面へ飛べる。
読みながら気付いた誤字を、その場で直せる。

### theme/custom.css

既定のスタイルは英文向けで行間が詰まっている。
日本語の長文を読むために上書きする。

```css
:root { --content-max-width: 42em; }

.content main {
  font-family: "Hiragino Sans", "Noto Sans JP", sans-serif;
  line-height: 1.9;
  letter-spacing: 0.02em;
}

.content p { margin: 1.4em 0; }

@media (max-width: 700px) {
  .content main { font-size: 16px; line-height: 1.85; }
}
```

### デプロイ

リポジトリのSettings、Pages、Sourceを「GitHub Actions」に一度だけ設定する。
以後はmainへのpushで公開される。

```yaml
name: deploy
on:
  push:
    branches: [main]
permissions:
  contents: read
  pages: write
  id-token: write
concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install mdBook
        run: |
          mkdir -p bin
          curl -sSL https://github.com/rust-lang/mdBook/releases/download/v0.4.40/mdbook-v0.4.40-x86_64-unknown-linux-gnu.tar.gz \
            | tar -xz --directory=bin
          echo "$PWD/bin" >> $GITHUB_PATH
      - run: mdbook build
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: ./book
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

mdBookのバージョンは固定してある。
セットアップ時に最新のリリースを確認して差し替える。

### 検索の制限

mdBookの全文検索は空白で語を区切るため、日本語の文には効かない。
関数名や型名といったASCIIの識別子は引ける。
日本語で引きたくなったら、サイドバーの目次から辿る。

### Issueの運用

Issueは全パートで一つの一覧になるため、ラベルで分ける。

- `book:<slug>` をパートごとに必ず付ける（`book:react`、`book:oxc`）
- 読んでいて詰まった箇所には `reading` を付ける

書き直すときは、対象パートのIssueだけを取る。

```bash
gh issue list --label book:react --label reading
```

反映したIssueはクローズし、コミットメッセージにIssue番号を含める。

### 公開範囲とライセンス表示

リポジトリもPagesのサイトも公開する。

`src/00-preface.md` に、この本が機械生成であること、引用元のライセンス表示、
本文自体のライセンスを置く。テンプレートを用意してある。

引用元はパートごとに異なるため、まえがきのライセンスの節はパートごとに分ける。
パートを追加したら、そのリポジトリのライセンス表示を追記する。

著作権者名と年は記憶で書かない。
クローンしたリポジトリの `LICENSE` を読み、その行を一字一句そのまま写す。
これはパス2の検証の一部として扱う。

```bash
cat "$REPO_PATH/LICENSE"
```

Apache-2.0のリポジトリから引用する場合は、`NOTICE` の転記と、
引用にあたって改変した旨の明記が追加で必要になる。
rustはMITとApache-2.0の選択制なので、MITを選べば表示の手間が少ない。
ServoはMPL-2.0である。引用元ファイルのライセンス表示を保持し、MPL-2.0のコードである旨を明記する。

### 読みながらの質問

本文はProjectにも置き、スマホから「シグナルの2章のここが分からない」と聞ける状態にしておく。
やり取りで解消した内容のうち、本文に反映すべきものをIssueに書き戻す。

## 10. やらないこと

APIリファレンスを書かない。それは公式ドキュメントの仕事である。
全ディレクトリを網羅しない。`FOCUS` に沿って捨てる。
章をまたいで同じ説明を繰り返さない。

---

## 11. 最初にやること

いきなり10章を生成しない。
1章だけ書いて、実際にスマホで読む。

長すぎる、コードが多すぎる、理由の説明が足りない、用語が説明なしで出てくる。
こうした不満が必ず出るので、それをこのファイルに書き戻してから残りを生成する。
