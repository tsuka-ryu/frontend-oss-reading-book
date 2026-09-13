# 依存はいつ記録されるか

SolidJSのコンポーネント関数は一度しか実行されない。
それなのに、`count()` を読んでいた場所だけが、値の変更に追従して更新される。
「この計算はこのシグナルに依存している」という対応表は、コードのどこにも書かれていない。
Solidはそれをどこで手に入れているのか。

## コンパイラは依存を調べていない

SolidはJSXをコンパイルするから、その際に依存を静的に解析して登録しているのだろう、という理解がまずありそうだ。
実際は違う。
コンパイラが行うのはDOM生成コードへの変換だけで、依存の解析はしない。
依存は実行時に、しかも「読んだ」という事実そのものから記録される。

その仕掛けを担うのが、リアクティブコア（`packages/solid/src/reactive/signal.ts`、約1,800行のファイル一つ）である。
まず用語を定める。
**シグナル**は、現在値と「自分を読んだ計算の一覧」を持つただのオブジェクトである。
**計算**（Computation）は、シグナルを読んで再実行される側で、`createMemo` が作るメモや `createEffect` が作るエフェクトがこれにあたる。

`createSignal` は次のことしかしない。
値を包んだオブジェクト `s` を作り、getterとして `readSignal.bind(s)` を、setterとして書き込み関数を返す。
つまり `count()` という呼び出しの実体は、共通関数 `readSignal` である。

## いま実行中の計算を指すグローバル変数

コアにはモジュール変数 `Listener` があり、「いま実行中の計算」を指す。
エフェクトやメモの本体を実行する直前に、実行器が `Listener` を実行対象の計算に差し替え、実行が終わると元に戻す。
その状態でシグナルが読まれると、`readSignal` が `Listener` を見て記録を残す。

```ts
export function readSignal(this: SignalState<any>) {
  // ...（読まれたメモが古い場合に先に更新する処理を省略）
  if (Listener) {
    const sSlot = this.observers ? this.observers.length : 0;
    if (!Listener.sources) {
      Listener.sources = [this];
      Listener.sourceSlots = [sSlot];
    } else {
      Listener.sources.push(this);
      Listener.sourceSlots!.push(sSlot);
    }
    // ...（対称に、自分の observers へ Listener を積む処理を省略）
  }
  return this.value;
}
```

本質は、値を返すついでに「読んだ側」と「読まれた側」の双方の配列へ相手を積んでいる点にある。
シグナル側の配列が `observers`（自分を読んだ計算）、計算側の配列が `sources`（自分が読んだシグナル）で、依存グラフはこの二つの配列の対で表現される。
一緒に積んでいる `sourceSlots` は相手の配列の中での自分の位置で、これは後の章で購読解除の話をするときに使う。

この方式の帰結として、依存は宣言ではなく毎回の実行結果になる。
if分岐の中で読まれなかったシグナルは、その回の依存に入らない。
また `untrack` という「追跡を止めるAPI」の実装は、`Listener` を一時的に `null` にして関数を呼ぶだけである。

## S.jsから受け継いだ設計

読み取りの副作用として依存を記録する方式は、Solidの発明ではない。
`signal.ts` の冒頭にはAdam Haile氏のリアクティブライブラリ**S.js**のMITライセンスが転記されており、コメントに「Inspired by S.js」とある。
履歴を遡ると、2018年のSolidはS.jsをそのまま外部依存として使っていた。
2019年5月のコミット「internalize reactive library」で自前実装に切り替え、2020年3月の「reactive refactor」（v0.17.0）で現在の形の基礎ができた。
このリファクタの目的はCHANGELOGに残っており、コアを3KB以上小さくしたとある。
S.jsの構造を敷き写しにするのではなく、自分のユースケースに合わせて削ぎ落とす方向の書き換えだった。

読んだ瞬間に記録される、という半分だけをここまでで見た。
記録された `observers` を書き込み側がどう使うのかは、次章で追う。

---
確度:
- 実ソース確認済み：`readSignal` の登録処理、`createSignal` が `readSignal.bind(s)` を返すこと、`untrack` の実装、S.jsライセンスの転記
- 履歴、PR由来：s-js依存時代（2018年）、internalize reactive library（2019-05-25）、reactive refactor（v0.17.0、2020-03-21）とCHANGELOGの3KB削減の記述
- 推測：なし
