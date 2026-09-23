# 書き込みをまとめて流す

> 読んだ版：solidjs/solid `b25c557`（2026-09-04、solid-js 1.9.15）の `packages/solid/src/reactive/signal.ts`
>
> この章のミニ実装：`code/signals/02-write-queue/`（`node --test "code/signals/02-write-queue/*.test.ts"`）

この章の目標は、次のコードで、エフェクトが最初の1回と最後の1回の計2回しか走らないようにすることである。

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

前章のミニ実装は、書き込みのたびにその場で購読者を走らせていた。
これを変えるには、書き込みの時点では「あとで走らせる」と記録するだけにして、実際に走らせる時点を後ろにずらす必要がある。
では、その「後ろ」とはいつで、誰が走らせるのか。

## 作る：比較と印

まず、同じ値の書き込みを止める。
`createSignal` に比較関数 `comparator` を持たせ、既定は `===` にする。
`equals: false` を渡せば比較しない、というSolidと同じ選択肢も付ける（抜粋では省略）。

次に、計算に `state` という印を足す。
`0` は最新、`STALE` は古いことを表す。
書き込みは、購読者に `STALE` の印を付けてキュー `Effects` に積むだけにする。

```ts
function writeSignal<T>(s: SignalState<T>, value: T) {
  if (s.comparator && s.comparator(s.value, value)) return;
  s.value = value;
  runUpdates(() => {
    for (const o of s.observers) {
      if (!o.state) Effects!.push(o);
      o.state = STALE;
    }
  });
}
```

`if (!o.state)` は、すでに印の付いた計算を二重に積まないための条件である。
3回書いても、キューに入るのは最初の1回だけになる。

## 作る：キューを流す

積んだキューを流すのが `runUpdates` と `completeUpdates` である。

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

function completeUpdates() {
  const e = Effects!;
  Effects = null;
  if (e.length) runUpdates(() => runQueue(e));
}

export function batch<T>(fn: () => T): T {
  return runUpdates(fn);
}
```

`Effects` は、キューであると同時に状態の旗でもある。
`null` なら「いま流している最中の更新はない」、配列なら「誰かがこのキューを持っていて、あとで流す」を意味する。

`runUpdates` の1行目がこの旗を見る。
`Effects` がすでに配列なら、外側の誰かがキューを持っているので、渡された関数を実行するだけで帰る。
積まれた計算は外側が流す。
`Effects` が `null` のときだけ、自分で配列を作り、関数を実行したあとに `completeUpdates` で流す。

`batch` はこの `runUpdates` を呼ぶだけである。
`batch` の中の書き込みは、`batch` がすでにキューを持っているので積むだけになり、`batch` を抜けるときにまとめて流れる。
これで冒頭の目標が動く。

`completeUpdates` は、キューをローカル変数 `e` に取り出し、`Effects` を `null` に戻してから、新しい `runUpdates` の中で `e` を流す。
`runQueue` は各計算について、印が残っていれば実行し、印を消す（抜粋では省略）。

## 確かめる：エフェクトの中の書き込み

`completeUpdates` がキューを取り出してから流す順序には意味がある。
エフェクトE1の中で別のシグナルに書き込み、それをE2が読んでいる場合を追う。

| 段階 | 起きること | `Effects` |
| --- | --- | --- |
| 1 | `setA(1)` が `runUpdates` ①を始め、E1を積む | `[E1]` |
| 2 | ①の `completeUpdates` が `[E1]` を取り出す | `null` |
| 3 | `runUpdates` ②が新しいキューでE1を流す | `[]` |
| 4 | E1の中の書き込みは②の中なので、E2を積むだけ | `[E2]` |
| 5 | E1が終わり、②の `completeUpdates` がE2を流す | `null` |

E2はE1の途中では走らず、E1が終わってから走る。
テストは、同じ値の書き込みで走らないこと、`batch` で1回にまとまること、この順序になることを確かめている。

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

比較、印、`if (!o.state)` による二重登録の防止、`runUpdates` で包む形は、ミニ実装と同じである。
省いた無限ループの検出は、キューの長さが `10e5`（100万）を超えたら例外を投げるものである。

| | ミニ実装 | Solid |
| --- | --- | --- |
| キュー | `Effects` の1本 | `Updates` と `Effects` の2本 |
| 入れ子の判定 | `Effects` が配列か | `Updates` が配列か |
| 下流への印 | なし | `markDownstream` |
| `batch` | `runUpdates(fn)` | `runUpdates(fn, false)` |

キューが2本ある理由と `markDownstream` は、次章でメモを作るときに足す。

## 本物はなぜこうなったか

`===` で書き込みを止める挙動は、最初からあったものではない。
2021年4月のv0.26.0（コミット `d86c1bc1`）で、シグナルは値が変わったときだけ通知するように変わった。
それまでのシグナルは、同じ値でも常に通知していた。
CHANGELOGによれば、ストリームの挙動を模倣する意図だった。

同じCHANGELOGは、変えた理由を三つ挙げている。
当時の `state`（オブジェクト用の状態で、のちのストア）は先に同値チェックを入れており、シグナルとメモだけがしないのは一貫しないこと。
同じ値でも通知すると無限ループを踏みやすいこと。
MobXやVueなど同時代のリアクティブライブラリと挙動を揃えること。
APIは変えず、`equals: false` を渡せば従来の挙動に戻せる形で入った。

`batch` の意味も途中で変わっている。
Solid 1.5（2022年8月、コミット `a209b35b`）より前の `batch` は、書いた値そのものを保留していた。
`batch` の中で書いた直後に読み返すと、古い値が返っていた。
1.5のCHANGELOGは、この「過去に留まる」挙動が可変データでは破綻すると述べている。
例に挙がっているのは、配列に要素を足してから別の要素を消す操作で、一つ目の操作が消えてしまう。
1.5で `batch` は、通常の書き込みと同じ「印を付けてキューに積むだけ」に統一された。
ミニ実装の `batch` は、この1.5以降の形である。

`batch` という名前も、v0.19.0（2020年8月）までは `freeze` だった。
CHANGELOGは、回路の用語から借りた名前が目的を表していなかったと説明している。

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
Solidがこのために用意しているのが、読んだ時点で最新の値を返す**メモ**（`createMemo`）である。
次章でメモを作る。

---
確度:
- 実ソース確認済み：`writeSignal` の比較と印付け、`if (!o.state)` による二重登録の防止、無限ループ検出の閾値 `10e5`、`batch` が `runUpdates(fn, false)` であること
- 履歴、PR由来：同値スキップの導入と三つの理由（CHANGELOG 0.26.0、コミット `d86c1bc1`）、`batch` の意味の変更とその理由（CHANGELOG 1.5.0、コミット `a209b35b`）、`freeze` からの改名（CHANGELOG 0.19.0）
- 推測：なし
- 実行で確認：ミニ実装の7つのテスト。欠点を示す1つ以外を `solid-js@1.9.15` に差し替えて動かし、本物でも通ることを確かめた。欠点を示す1つ（派生値が古く読める）も、エフェクトで派生値を作る書き方では本物でも同じ結果になった
