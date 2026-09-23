# 使わなくなった依存をどう外すか

> 読んだ版：solidjs/solid `b25c557`（2026-09-04、solid-js 1.9.15）の `packages/solid/src/reactive/signal.ts`
>
> この章のミニ実装：`code/signals/04-cleanup/`（`node --test "code/signals/04-cleanup/*.test.ts"`）

この章の目標は、次のコードで最後の `setA(1)` がエフェクトを走らせないようにすることである。

```ts
const [flag, setFlag] = createSignal(true);
const [a, setA] = createSignal(0);
createEffect(() => {
  if (flag()) a();
});
setFlag(false); // もう a は読まない
setA(1);        // 走ってほしくない
```

前章までのミニ実装は、一度読んだシグナルを `sources` と `observers` に記録したまま、決して外さない。
`flag` が偽の回に `a` を読まなくなっても、`a` の `observers` には前の回の記録が残る。
では、どの時点で、どの記録を外せばよいのか。

## 作る：毎回すべて外してから実行する

エフェクトが今回の実行で何を読むかは、実行してみるまで分からない。
前回と今回の差分を取ろうとすると、実行の前後で記録を比べる手間がかかる。

ミニ実装では、もっと単純な方法をとる。
計算を実行し直す前に、前回の依存をすべて外す。
実行すれば、今回実際に読んだものだけが `readSignal` で記録し直される。

```ts
function updateComputation(node: Computation) {
  cleanNode(node);
  runComputation(node);
}

function cleanNode(node: Computation) {
  for (const source of node.sources) {
    source.observers.delete(node);
  }
  node.sources.clear();
  node.state = 0;
}
```

`cleanNode` は、自分が読んだもの（`sources`）を一つずつ辿り、その `observers` から自分を消す。
3章で `sources` を足しておいたのは、この逆引きのためである。
最後に自分の `sources` を空にし、印も消す。

`flag` が偽の回には `a` は読まれないので、`a` の `observers` には自分が戻らない。
条件分岐で読むものが変わる依存（**動的な依存**）は、特別な仕組みを足さなくても、「毎回外して記録し直す」ことから自然に扱える。

## 確かめる

テストは8つある。
冒頭の例で `setA(1)` が走らないこと、`flag` を真に戻すと `a` への依存が戻ることを確かめている。
条件によって `a` と `b` のどちらかを読むメモでも、読まなくなった側への書き込みがメモの読み手に届かないことを確かめている。
前章までのテストも、すべてそのまま通る。

## Solidの cleanNode と並べる

Solidの `updateComputation` も、実行の前に `cleanNode` を呼ぶ。
`cleanNode` の中で依存を外す部分を引く。

```ts
while (node.sources.length) {
  const source = node.sources.pop(),
    index = node.sourceSlots.pop(),
    obs = source.observers;
  if (obs && obs.length) {
    const n = obs.pop(),
      s = source.observerSlots.pop();
    if (index < obs.length) {
      n.sourceSlots[s] = index;
      obs[index] = n;
      source.observerSlots[index] = s;
    }
  }
}
```

型の注釈（`!`）は省いた。
配列から要素を消すのに、どこにも探索がないのが要点である。

1章で見たとおり、Solidの `readSignal` は、記録のたびに「相手の配列の中で自分が何番目か」を `sourceSlots` と `observerSlots` に控えている。
`index` は、`source.observers` の中で自分がいる位置である。
Solidは、そこに `observers` の末尾の要素 `n` を移して穴を埋める。
移した `n` が控えていた自分の位置（`n.sourceSlots[s]`）も、新しい位置に書き直す。
一件を外すのにかかる手間は、`observers` の長さによらない。

| | ミニ実装 | Solid |
| --- | --- | --- |
| 外す時点 | 実行の直前 | 実行の直前 |
| 外す範囲 | 前回の依存すべて | 前回の依存すべて |
| `observers` からの削除 | `Set` の `delete` | 末尾と入れ替えて `pop` |
| 位置の管理 | `Set` に任せる | `sourceSlots` と `observerSlots` |

ミニ実装は `Set` を使っているので、削除の手間は `Set` の実装に任せている。
Solidは配列で同じことを、自分で位置を管理して行っている。

## 本物はなぜこうなったか

位置を控えておいて探索なしで消す仕掛けは、Solidが自前実装に切り替える前に使っていたS.jsにすでにあった。
2020年3月のリファクタ（コミット `87c37523`）の直前の `signal.ts` では、購読の情報は `Log` という構造体に包まれていた。
`Log` は、観測者が一人だけの場合のための `node1` と `node1slot`、複数の場合のための `nodes` と `nodeslots` を持っていた。

リファクタは、この `Log` の包みと、観測者が一人の場合の特別扱いをやめた。
代わりに、`observers` と `observerSlots` の配列をシグナル本体に直接持たせた。
v0.17.0のCHANGELOGは、このリファクタでコアが少なくとも3KB（minify後）小さくなったと書いている。

毎回すべてを外して張り直す方式には、代価もある。
依存が変わらない計算でも、実行のたびに外す処理と記録する処理が走る。
Solidがこの方式を続けている理由は、コードにも履歴にも書かれていない。
差分を取る処理を持たずに済み、コードが小さく保てるためだと考えられるが、これは推測である。

## 足りないもの

`cleanNode` は、計算が読んだものを外すだけで、計算が実行中に作ったものは片付けない。
エフェクトの中で別のエフェクトを作ると、外側が走るたびに内側が一つずつ増えていく。

```ts
createEffect(() => {
  a();
  createEffect(() => b()); // 外側が走るたびに増える
});
setA(1);
setA(2);
setB(1); // 内側が3回走る
```

テストはこの挙動を確かめている。
Solidでは、外側が走り直すとき、前回作った内側のエフェクトを破棄する。
そのためには、計算が「自分がどの計算の中で作られたか」を覚えておく必要がある。
次章では、その**所有者**の仕組みを足す。

---
確度:
- 実ソース確認済み：`updateComputation` が実行前に `cleanNode` を呼ぶこと、`cleanNode` の入れ替えによる削除、`readSignal` が位置を控えること
- 履歴、PR由来：リファクタ直前の `Log` 構造体（`87c37523` の親コミットの `packages/solid/src/signal.ts`）、リファクタでの平坦化（`87c37523`、2020-03-21）とサイズ削減（CHANGELOG 0.17.0）
- 推測：毎回すべて外す方式を続けている理由（明文の記述は見つからず）
- 実行で確認：ミニ実装の8つのテスト。欠点を示す1つ以外を `solid-js@1.9.15` に差し替えて動かし、本物でも通ることを確かめた。欠点を示す1つは本物では失敗する（本物は内側のエフェクトを破棄する）
