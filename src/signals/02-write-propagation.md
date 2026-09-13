# 書き込みはどこまで伝わるか

`setCount(5)` と書いた瞬間、何が起きるのか。
依存している計算がすべて即座に再実行されるのか。
同じ値をもう一度書いたら、それでも何かが走るのか。
イベントハンドラの中でsetterを三回呼んだら、画面は三回描き直されるのか。

setterを呼ぶとその場で依存先が順に再実行されていく、という理解がまずありそうだ。
実装は二段階に分かれている。
書き込みの時点では「古い」という印を付けてキューに積むだけで、実行は書き込みの外側でまとめて行われる。

## 同じ値なら何も起きない

書き込みの入口は `writeSignal` である。

```ts
export function writeSignal(node, value) {
  // ...（Transition関連の分岐を省略）
  if (!node.comparator || !node.comparator(current, value)) {
    node.value = value;
    if (node.observers && node.observers.length) {
      runUpdates(() => {
        for (let i = 0; i < node.observers.length; i += 1) {
          const o = node.observers[i];
          if (!o.state) {
            if (o.pure) Updates.push(o);
            else Effects.push(o);
            if (o.observers) markDownstream(o);
          }
          o.state = STALE;
        }
      }, false);
    }
  }
  return value;
}
```

最初の関門が `comparator` で、既定は `===` の比較である。
値が変わっていなければ、伝播はここで打ち切られる。
値が変わっていれば、前章で記録された `observers` を走査し、各計算の `state` に `STALE`（確実に古い）の印を付けてキューに積む。
キューは二本ある。
メモのような純粋な計算（`pure`）は `Updates` へ、DOMを触るエフェクトは `Effects` へ入り、消化は必ず `Updates` が先になる。
このループの外側では、`Updates` の長さが10万を超えたときに「Potential Infinite Loop Detected」を投げる保険も掛かっている。

積まれたキューを流すのが `runUpdates` と `completeUpdates` の組である。
setterの呼び出し全体がこの `runUpdates` に包まれているため、ハンドラ内で何度書き込んでも、実行はいちばん外側の書き込みが終わるまで始まらない。
複数の書き込みを明示的にまとめる `batch` というAPIもあるが、その実装は `runUpdates(fn, false)` を呼ぶだけの一行で、特別な仕掛けは書き込み経路と共有している。

## 同値スキップは最初からではなかった

`===` で伝播を止める挙動は、2021年4月のコミット「make signals notify on change only by default」で入った。
それまでのシグナルは、同じ値を書いても常に通知していた。
ストリームの挙動を模倣する意図だったと、コミット本文に書かれている。
変更の理由も同じ場所に三つ挙げられている。
stateのほうは先に同値チェックを入れており一貫性を欠いたこと、同値でも通知する仕様は無限ループを踏みやすいこと、MobXやVueなど同時代のリアクティブライブラリと挙動を揃えたこと、である。
APIは変えず、`equals: false` を渡せば従来の挙動に戻せる形で入った。

`batch` の意味も途中で変わっている。
v1.5（2022年8月）より前の `writeSignal` には保留リストがあり、`batch` の中では書いた値そのものが保留され、読み返すと過去の値が返っていた。
v1.4でストアが `batch` に従うようになった結果、この「過去に留まる」仕様は可変データで破綻する（配列から要素を移動する二つの操作のうち、一つ目が消える）ことが分かり、v1.5で保留をやめて通常の伝播と同じ「キューに積むだけ」に統一された。
ちなみに `batch` という名前自体も、v0.19までは `freeze` だった。

`STALE` の印とキューだけなら話は単純だが、実際のコードには `PENDING` というもう一つの印と、先ほど省略なしで載せた `markDownstream` が出てくる。
メモが挟まると、単純な伝播では同じ計算が二度走ってしまうからで、これを次章で追う。

---
確度:
- 実ソース確認済み：`writeSignal` の流れ、`comparator` の既定が `===`、`Updates`/`Effects` の二本のキュー、`batch` が `runUpdates(fn, false)` であること、無限ループ検出
- 履歴、PR由来：同値スキップの導入と三つの理由（2021-04-10のコミット本文）、v1.5での `batch` の意味変更とその理由（CHANGELOG 1.5.0）、`freeze` からの改名（v0.19.0）
- 推測：なし
