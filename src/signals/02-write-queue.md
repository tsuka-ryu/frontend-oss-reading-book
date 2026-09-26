# 書き込みをまとめて流す

> では、時間とは何か。誰も私に尋ねなければ、私は知っている。尋ねる人に説明しようとすると、私は知らない。
>
> ——アウグスティヌス『告白』第11巻第14章第17節（397〜400年頃、拙訳）

> 読んだ版：solidjs/solid `b25c557`（2026-09-04、solid-js 1.9.15）の `packages/solid/src/reactive/signal.ts`
>
> この章のミニ実装：`code/signals/02-write-queue/`（`node --test "code/signals/02-write-queue/*.test.ts"`）

この章の終わりには、次のコードが動く。

```ts
const [a, setA] = createSignal(0);
createEffect(() => console.log(a()));
setA(0); // 同じ値なので何も起きない
batch(() => {
  setA(1);
  setA(2);
  setA(3);
}); // 3 が一度だけ表示される
```

やることは「いま走らせず、あとで走らせる」だけに見える。
ところがSolidの `writeSignal` は、自分では購読者を呼ばない。
印を付けてキューに積む処理を、`runUpdates` という関数に包んで渡すだけである。
なぜ、ここまで回りくどくする必要があるのか。
そして、積んだキューは結局いつ流れるのか。

## 一歩目：同じ値を書いても走る

前章のミニ実装に、同じ値を二度書いてみる。

```ts
createEffect(() => console.log("走った:", a()));
setA(0);
setA(0);
```

`走った: 0` が3回出る。
何も変わっていないのに、エフェクトは律儀に3回働く。
`createSignal` に比較関数 `comparator`（既定は `===`）を持たせ、`writeSignal` の先頭で比べれば直る。

```ts
if (s.comparator && s.comparator(s.value, value)) return;
```

`equals: false` を渡せば比較しない、というSolidと同じ選択肢も付ける。

## 二歩目：まとめたはずが3回走る

次は `batch` である。
素朴に、グローバルな配列 `Effects` を用意する。
`batch` の間は、書き込みが購読者を配列に積むだけにし、最後にまとめて走らせる。

```ts
function writeSignal<T>(s: SignalState<T>, value: T) {
  // ...（一歩目の比較）
  s.value = value;
  for (const o of [...s.observers]) {
    if (Effects) Effects.push(o);
    else runComputation(o);
  }
}
export function batch(fn: () => void) {
  Effects = [];
  fn();
  const e = Effects;
  Effects = null;
  for (const o of e) runComputation(o);
}
```

冒頭の `batch` を流すと、こう出る。

```text
走った: 3
走った: 3
走った: 3
```

実行はまとまっていない。
3回の書き込みが同じエフェクトを3回積み、3回とも最新の `3` を見て走る。
遅らせただけで、減ってはいない。

必要なのは「もう積んである」という印である。
計算に `state` を足し、`0` を最新、`STALE` を古いとする。

```ts
if (!o.state) Effects.push(o);
o.state = STALE;
```

走らせる側（`runTop`）は、`state` が `0` なら何もせず、そうでなければ `0` に戻してから実行する。
これで `走った: 3` は1回になる。

## 三歩目：batch の中の batch がキューを捨てる

関数を部品に分ければ、`batch` の入れ子はすぐに起きる。

```ts
batch(() => {
  setA(1);
  batch(() => setB(1));
});
```

実行すると、`b: 1` が表示されたあとで例外が出る。

```text
TypeError: e is not iterable
```

内側の `batch` は、外側が積んでいた配列を知らずに `Effects = []` で上書きした。
流し終えると `Effects = null` にして帰る。
外側が自分のキューを取り出そうとしたとき、そこには `null` しか残っていない。
`a` を読むエフェクトは、積まれたまま捨てられた。

直すには、キューを作る前に、すでに誰かが持っていないかを見ればよい。
その判断を `runUpdates` にまとめ、`writeSignal` も `batch` もこれを通す。

```ts
function runUpdates<T>(fn: () => T): T {
  if (Effects) return fn();
  Effects = [];
  try {
    const res = fn();
    completeUpdates();
    return res;
  } catch (err) {
    Effects = null;
    throw err;
  }
}
```

`Effects` は、キューであると同時に旗でもある。
`null` なら「いま流している最中の更新はない」、配列なら「誰かがこのキューを持っていて、あとで流す」を意味する。
1行目は、配列があれば関数を実行するだけで帰る。
積んだものは、キューを作った一番外側が流す。
`catch` は、例外で抜けたときに旗が立ったまま残らないようにするためのものである（残ると、以後のすべての書き込みが、誰も流さないキューに積まれ続ける）。

`batch` は `runUpdates(fn)` を呼ぶだけになり、`batch` の外の書き込みは自分でキューを作って自分で流す。

## 四歩目：流している最中の書き込みが割り込む

残るのは `completeUpdates` である。
素朴に、キューを取り出して旗を下ろし、そのまま流す。

```ts
function completeUpdates() {
  const e = Effects!;
  Effects = null;
  for (const o of e) runTop(o);
}
```

これを、エフェクトの中で別のシグナルに書き込む入力で試す。
E1は `a` を読んで `b` に書き、E2は `b` を読む。

```text
E1 開始
E2: 2
E1 終了
```

E2が、E1の途中に割り込んだ。
流している最中は旗が下りているので、E1の中の `setB` は自分でキューを作り、その場でE2を流してしまう。

直し方は1行である。
流す作業そのものを、新しい `runUpdates` の中で行う。

```ts
function completeUpdates() {
  const e = Effects!;
  Effects = null;
  if (e.length) runUpdates(() => runQueue(e));
}
```

流している間は新しい旗が立つので、E1の中の書き込みはE2を積むだけになり、出力は `E1 開始`、`E1 終了`、`E2: 2` の順に変わる（`runQueue` は各計算を `runTop` に渡すだけの関数）。

## 確かめる

テストは7つある。
同じ値で走らないこと（`equals: false` なら走ること）、`batch` の中の3回が1回にまとまり外の3回は3回走ること、四歩目の順序を確かめている。
四歩目の流れを `Effects` の中身とともに追うと、次のようになる。

| 段階 | 起きること | `Effects` |
| --- | --- | --- |
| 1 | `setA(1)` が `runUpdates` ①を始め、E1を積む | `[E1]` |
| 2 | ①の `completeUpdates` が `[E1]` を取り出す | `null` |
| 3 | `runUpdates` ②が新しいキューでE1を流す | `[]` |
| 4 | E1の中の書き込みは②の中なので、E2を積むだけ | `[E2]` |
| 5 | E1が終わり、②の `completeUpdates` がE2を流す | `null` |

残りの1つは欠点を示すもので、最後の節で扱う。

## Solidの writeSignal と並べる

Solidの `writeSignal` から、Transition（画面の切り替えを遅らせる機能）の分岐を省いて引く。

```ts
if (!node.comparator ||
    !node.comparator(current, value)) {
  // ...（Transition中の値の置き場所の分岐を省略）
  node.value = value;
  if (node.observers && node.observers.length) {
    runUpdates(() => {
      for (let i = 0; i < node.observers!.length; i += 1) {
        const o = node.observers![i];
        if (!o.state) {
          if (o.pure) Updates!.push(o);
          else Effects!.push(o);
          if (o.observers) markDownstream(o);
        }
        o.state = STALE;
      }
      // ...（無限ループの検出を省略）
    }, false);
  }
}
```

比較、印、`if (!o.state)` による二重登録の防止、`runUpdates` で包む形は、四歩を積んだミニ実装と同じである。
省いた無限ループの検出は、キューの長さが `10e5`（100万）を超えたら例外を投げるものである。

| | ミニ実装 | Solid |
| --- | --- | --- |
| キュー | `Effects` の1本 | `Updates` と `Effects` の2本 |
| 入れ子の判定 | `Effects` が配列か | `Updates` が配列か |
| 下流への印 | なし | `markDownstream` |
| `batch` | `runUpdates(fn)` | `runUpdates(fn, false)` |

キューが2本ある理由と `markDownstream` は、次章でメモを作るときに足す。

## 本物はなぜこうなったか

一歩目の1行は、Solidでは最初からあったものではない。
2021年4月のv0.26.0（コミット `d86c1bc1`）で、シグナルは値が変わったときだけ通知するように変わった。
それまでのシグナルは、同じ値でも常に通知していた。
CHANGELOGによれば、ストリームの挙動を模倣する意図だった。

同じCHANGELOGは、変えた理由を三つ挙げている。
当時の `state`（オブジェクト用の状態で、のちのストア）は先に同値チェックを入れており、シグナルとメモだけがしないのは一貫しないこと。
同じ値でも通知すると無限ループを踏みやすいこと。
MobXやVueなど同時代のリアクティブライブラリと挙動を揃えること。
APIは変えず、`equals: false` を渡せば従来の挙動に戻せる形で入った。

`batch` の意味も途中で変わっている。
Solid 1.5（2022年8月、コミット `a209b35b`）より前の `batch` は、印ではなく、書いた値そのものを保留していた。
`batch` の中で書いた直後に読み返すと、古い値が返っていた。
1.5のCHANGELOGは、この「過去に留まる」挙動が可変データでは破綻すると述べている。
例に挙がっているのは、配列に要素を足してから別の要素を消す操作で、一つ目の操作が消えてしまう。
1.5で `batch` は、通常の書き込みと同じ「印を付けてキューに積むだけ」に統一された。
ミニ実装の `batch` は、この1.5以降の形である。

`batch` という名前も、v0.19.0（2020年8月）までは `freeze` だった。
CHANGELOGは、回路の用語から借りた名前が目的を表していなかったと説明している。
名前が `batch` になってから、意味がいまの形に落ち着くまで、さらに2年かかったことになる。

## 「あと」とは、いつなのか

エピグラフのアウグスティヌスは、時間を知っているのに説明はできないと書いた。
`batch` の「あとで流す」も同じ形をしている。
使う側は「`batch` が終わったら」で困らない。
しかし三歩目と四歩目で見たとおり、その素朴な定義は、入れ子の `batch` でも流している最中の書き込みでも壊れた。

違うのは、コードには答えが書けたことである。
ミニ実装の「あと」は時計の上の時刻ではない。
`Effects` の旗を最初に立てた一番外側の `runUpdates` が、関数から戻ってきた時点である。
流している最中の書き込みには、流す作業を包む `runUpdates` の終わりという次の「あと」がある。
「あと」は時刻ではなく、呼び出しの入れ子のなかの位置として定義されている。
前章の終わりの「あと」とはいつなのか、という問いへの答えはこれである。

## 足りないもの

ミニ実装には、別の値から計算した値（**派生値**）を持つ手段がない。
いまの道具で作るなら、エフェクトの中で別のシグナルに書き込むしかない。

```ts
const [a, setA] = createSignal(1);
const [double, setDouble] = createSignal(2);
createEffect(() => setDouble(a() * 2));
batch(() => {
  setA(5);
  double(); // 2 のまま。10 ではない
});
```

エフェクトはキューに積まれて `batch` の後で走るので、`batch` の中で読んだ `double` は古い。
この挙動はテストで確かめている。
Solidでも、同じ書き方をすれば同じ結果になる。

「あと」を定義したことの代償がこれである。
書き込みを後回しにした以上、後回しにされた計算の結果を、いま読むことはできない。
Solidはこのために、読んだ時点で最新の値を返す**メモ**（`createMemo`）を用意している。
では、読まれた瞬間に計算し直すだけで済むのか。
計算し直す順番を間違えると、同時には成り立たないはずの二つの値が、同じ画面に並ぶ。
次章でメモを作り、その順番の問題を扱う。

---
確度:
- 実ソース確認済み：`writeSignal` の比較と印付け、`if (!o.state)` による二重登録の防止、無限ループ検出の閾値 `10e5`、`batch` が `runUpdates(fn, false)` であること
- 履歴、PR由来：同値スキップの導入と三つの理由（CHANGELOG 0.26.0、コミット `d86c1bc1`）、`batch` の意味の変更とその理由（CHANGELOG 1.5.0、コミット `a209b35b`）、`freeze` からの改名（CHANGELOG 0.19.0）
- 推測：なし
- 実行で確認：ミニ実装の7つのテスト。欠点を示す1つ以外を `solid-js@1.9.15` に差し替えて動かし、本物でも通ることを確かめた。欠点を示す1つ（派生値が古く読める）も、エフェクトで派生値を作る書き方では本物でも同じ結果になった。一歩目から四歩目の壊れる版（1章のままの版、印のない `batch`、入れ子を見ない `batch`、旗を下ろしてから流す `completeUpdates`）はスクラッチに書いて `node` で実行し、本文の出力（`走った: 0` が3回、`走った: 3` が3回、`TypeError: e is not iterable`、E2の割り込み）はその実出力である
- コードから読んだが実行していない：`runUpdates` の `catch` がないと、例外のあと旗が立ったまま残り、以後の書き込みが流されないこと
- 引用：アウグスティヌスの原文は "Quid est ergo tempus? Si nemo ex me quaerat, scio; si quaerenti explicare velim, nescio."（*Confessiones*, XI, 14, 17）。訳は拙訳。原典の刊本との照合はしていない（執筆環境から原文サイトに接続できなかった）
