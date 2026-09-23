# frontend-oss-reading-book

フロントエンドの基盤になっているOSSを、ソースとgit履歴から読み解いた本。
mdBookでビルドし、GitHub Pagesで公開する。

読む場所: https://tsuka-ryu.github.io/frontend-oss-reading-book

## 執筆

仕様は `spec/BOOK_SPEC.md` にある。パートごとの対象リポジトリとFOCUSもそこ。

読む対象はこのリポジトリの外、`/tmp/oss/<name>` にクローンする。
このリポジトリの中にはクローンしない。

```
/tmp/oss/solid    /tmp/oss/oxc    /tmp/oss/vite    /tmp/oss/react    ...
```

Claude Code への指示は、パスを指定して出す。

```
spec/BOOK_SPEC.md を読んで、signals パートのパス1（骨格）を実行して。
成果物は draft/signals/ に置いて。
```

パスは6つある。骨格、検証、なぜを足す、本文化、規範による点検、読者フィードバック。
それぞれ別のコミットにして、diffで良くなったか膨らんだだけかを見る。

## ミニ実装を動かす

各章のミニ実装は `code/<part>/NN-slug/` にある。Node.js 22.18以降が必要。

```bash
node --test "code/signals/*/*.test.ts"
# React を使うパートは先に依存を入れる
(cd code/rhf && npm install) && node --test "code/rhf/*/*.test.ts"
```

## ローカルで確認

```bash
mdbook serve --open
```

## 章を足す

1. `code/<part>/NN-slug/` にミニ実装とテストを書く
2. `src/<part>/NN-slug.md` を作る
3. `src/SUMMARY.md` に一行足す

SUMMARY.md に書かれていないファイルはビルドされない。

## 読みながら

詰まった箇所はIssueにする。ラベルは2つ。

- `book:<part>` — どのパートか（`book:react`、`book:oxc`）
- `reading` — 読んでいて詰まった

書き直すときは対象パートだけ取る。

```bash
gh issue list --label book:react --label reading
```

## ライセンス

本文は CC BY 4.0。引用したコードは各プロジェクトのライセンスに従う。
詳細は `src/00-preface.md`。
