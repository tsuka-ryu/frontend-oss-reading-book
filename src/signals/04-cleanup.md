# 使わなくなった依存をどう外すか

> だが私は、彼があまり考えることができなかったのではないかと疑っている。考えるとは、差異を忘れること、一般化し、抽象することである。
>
> ——Jorge Luis Borges「記憶の人フネス」（1942年、拙訳）

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

1章で、読み取りを記録する仕組みを作った。
記録のきっかけは `readSignal` の呼び出しである。
では、「読まなかった」ことは何をきっかけに記録すればよいのか。
読まなかった回には、どの関数も呼ばれない。
知らせの来ない出来事を、Solidはどうやって名簿に反映しているのか。

答えはかなり乱暴である。
1章で「4章で届く」と予告した請求書も、この章で開封する。

## 一歩目：読まなくなった a がまだ鳴る

3章のミニ実装に、目標のコードをそのまま流す。
エフェクトが走った回数を数えると、こうなる。

```text
走った回数: 3
```

最初の実行、`setFlag(false)`、`setA(1)` で3回である。
最後の1回は、もう読んでいない `a` への書き込みで走っている。

1章で書いたとおり、ミニ実装には名簿から人を消す手段がない。
`flag` が偽の回に `a` を読まなくても、`a` の `observers` には前の回の記録が残る。
このミニ実装は、一度でも読んだものを決して忘れない。

## 二歩目：自分の記憶だけ消しても名簿は残る

忘れればよいのなら、実行し直す前に、計算が覚えている `sources`（3章で足した、自分が読んだものの集合）を空にしてみる。

```ts
function updateComputation(node: Computation) {
  node.sources.clear(); // 自分の記憶だけ消す
  node.state = 0;
  runComputation(node);
}
```

実行すると、何も変わらない。

```text
走った回数: 3
```

名簿は二冊あるからである。
計算の側の `sources` と、シグナルの側の `observers` だ。
`setA(1)` のときに `writeSignal` が見るのは、`a` の `observers` のほうである。
自分の手帳を破っても、相手の名簿に書かれた自分の名前は消えない。

## 三歩目：相手の名簿から自分を消す

消すべきは相手の名簿のほうである。
どの相手の名簿に載っているかは、自分の `sources` を見れば分かる。
3章で `sources` を足しておいたのは、この逆引きのためだった。

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

`cleanNode` は、`sources` を一つずつ辿り、その `observers` から自分を消す。
最後に自分の `sources` を空にし、印も消す。

```text
走った回数: 2
```

冒頭の問いの答えがこれである。
「読まなかった」ことを記録する必要はない。
実行し直す前に前回の依存をすべて外し、実行すれば、今回実際に読んだものだけが `readSignal` で記録し直される。
`flag` が偽の回には `a` は読まれないので、`a` の `observers` に自分は戻らない。

前回と今回の差分は取らない。
全部忘れてから、覚え直す。
条件分岐で読むものが変わる依存（**動的な依存**）は、特別な仕組みを足さなくても、この乱暴な方法で扱える。

## 四歩目：名簿が配列だったら

三歩目で `observers` から自分を消すのに使ったのは、`Set` の `delete` 1行である。
あまりに簡単なので、試しに名簿を配列にしてみる。
配列では、消す前に自分の位置を探さなければならない。

```ts
let compared = 0;
function removeObserver(observers: object[], node: object) {
  const i = observers.findIndex(o => {
    compared++;
    return o === node;
  });
  observers.splice(i, 1);
}

for (const n of [10, 1000, 100000]) {
  const observers = Array.from({ length: n }, () => ({}));
  compared = 0;
  removeObserver(observers, observers[n - 1]); // 最後の人
  console.log(`購読者 ${n} 人：比べた回数 ${compared}`);
}
```

最後に購読した一人を外すだけで、名簿の全員と比べることになる。

```text
購読者 10 人：比べた回数 10
購読者 1000 人：比べた回数 1000
購読者 100000 人：比べた回数 100000
```

1章で、ミニ実装の `Set` は「依存を外す仕組みをまだ持っていないから気楽に使えているだけ」で、4章でその請求書が届くと書いた。
届いた請求書は、この表である。
ただし宛先はミニ実装ではない。
重複を防ぐのも、探さずに消すのも、`Set` が立て替えてくれた。
請求書が届くのは、名簿を配列で持つ側、つまりSolidである。

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

Solidが請求書を払う方法がこれである。
1章で見たとおり、Solidの `readSignal` は、記録のたびに「相手の配列の中で自分が何番目か」を `sourceSlots` と `observerSlots` に控えている。
`index` は、`source.observers` の中で自分がいる位置である。
Solidは、そこに `observers` の末尾の要素 `n` を移して穴を埋める。
移した `n` が控えていた自分の位置（`n.sourceSlots[s]`）も、新しい位置に書き直す。
一件を外すのにかかる手間は、`observers` の長さによらない。
四歩目で名簿の長さに比例した比較の回数が、ここでは消えている。

| | ミニ実装 | Solid |
| --- | --- | --- |
| 外す時点 | 実行の直前 | 実行の直前 |
| 外す範囲 | 前回の依存すべて | 前回の依存すべて |
| `observers` からの削除 | `Set` の `delete` | 末尾と入れ替えて `pop` |
| 位置の管理 | `Set` に任せる | `sourceSlots` と `observerSlots` |

外す時点も範囲も同じで、違うのは削除の払い方だけである。
ミニ実装は `Set` の実装に払わせ、Solidは位置を自分で帳簿に付けて払っている。

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

## フネスは忘れられなかった

エピグラフは、Borgesの短編の語り手が、何ひとつ忘れられない男フネスについて述べた一節である。

1章から3章までのミニ実装は、フネスと同じ病を抱えていた。
一度読んだものを一つ残らず覚えていて、そのせいで、もう関係のない `a` への書き込みにまで反応した。
覚えていることが多すぎて、いま何に依存しているかを区別できない。
語り手の言う「考えることができない」状態に近い。

違うのは、忘れ方である。
語り手にとって、考えるとは差異を忘れ、一般化し、抽象することだった。
何を忘れ、何を残すかを選ぶ営みである。
`cleanNode` は何も選ばない。
実行のたびにすべてを忘れ、関数をもう一度走らせて、今回読んだものだけを覚え直す。
一般化も抽象もしていない。
それでも正しく動くのは、覚え直すための材料（関数そのもの）が毎回手元にあり、走らせればそのつど読んだものが分かるからである。
考える代わりに、毎回やり直している。

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

読んだものは、`sources` という逆向きの名簿があったから外せた。
作ったものについては、まだ誰も名簿を付けていない。
内側のエフェクトは、自分が誰の中で生まれたかを知らない。
外側もまた、自分が何を生んだかを知らない。
次章では、その記録を**所有者**として足し、親が走り直すたびに子が片付けられ、作り直される様子を見る。

---
確度:
- 実ソース確認済み：`updateComputation` が実行前に `cleanNode` を呼ぶこと、`cleanNode` の入れ替えによる削除、`readSignal` が位置を控えること
- 履歴、PR由来：リファクタ直前の `Log` 構造体（`87c37523` の親コミットの `packages/solid/src/signal.ts`）、リファクタでの平坦化（`87c37523`、2020-03-21）とサイズ削減（CHANGELOG 0.17.0）
- 推測：毎回すべて外す方式を続けている理由（明文の記述は見つからず）
- 実行で確認：ミニ実装の8つのテスト。欠点を示す1つ以外を `solid-js@1.9.15` に差し替えて動かし、本物でも通ることを確かめた。欠点を示す1つは本物では失敗する（本物は内側のエフェクトを破棄する）。一歩目から四歩目の出力は、3章のミニ実装、`sources` だけを空にする版、この章のミニ実装、配列から探して消す短いスクリプトを、それぞれ書いて `node` で動かした実際の出力である（中間の版はリポジトリには置いていない）
- 引用：Borgesの原文は "Sospecho, sin embargo, que no era muy capaz de pensar. Pensar es olvidar diferencias, es generalizar, abstraer."（"Funes el memorioso"、1942年）。訳は拙訳
