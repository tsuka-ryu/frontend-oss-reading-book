# メモはいつ計算し直すか

> 読んだ版：solidjs/solid `b25c557`（2026-09-04、solid-js 1.9.15）の `packages/solid/src/reactive/signal.ts`
>
> この章のミニ実装：`code/signals/03-memo/`（`node --test "code/signals/03-memo/*.test.ts"`）

この章の目標は、次のコードが動くことである。

```ts
const [a, setA] = createSignal(1);
const b = createMemo(() => a() * 2);
const c = createMemo(() => a() + 1);
createEffect(() => console.log(b(), c()));
setA(2); // 4 3 が一度だけ表示される
```

**メモ**は、別の値から計算した値を持ち、読み手から見るとシグナルのように読めるものである。
この例では、`a` からエフェクトへの経路が `b` 経由と `c` 経由の二本ある。
この形を**菱形**と呼ぶ。

素朴に作ると、エフェクトは `b` が更新された時点で一度走り、`c` が更新された時点でもう一度走る。
一度目は、新しい `b` と古い `c` の組み合わせを見てしまう。
このように、途中の食い違った状態が外から見えることを**グリッチ**と呼ぶ。
エフェクトを一度だけ、両方が揃ってから走らせるには、何が要るのか。

## 作る：メモは計算であり、シグナルでもある

メモは、計算（`fn` と `state` を持つ）に、シグナルの部品（`observers` と `comparator`）を足したものとして作る。
計算の実行が終わったら、結果を `writeSignal` で自分に書き込む。

```ts
function runComputation(node: Computation) {
  // ...（Listener を置いて fn を実行する部分は前章と同じ）
  if (node.observers) writeSignal(node as Memo, next);
  else node.value = next;
}
```

`writeSignal` を通すので、結果が前回と同じなら比較で止まり、メモの読み手には何も伝わらない。
この比較は、後で見る「メモの値が変わらなければ下流を走らせない」仕組みの前提になる。

## 作る：二種類の印

シグナル `a` に書き込むと、直接の読み手 `b` と `c` に `STALE`（確実に古い）の印が付く。
では、その先のエフェクトはどうか。
`b` を計算し直した結果が前と同じなら、エフェクトは走らなくてよい。
それは `b` を計算してみるまで分からないので、エフェクトには確定の印を付けられない。

そこで、二つ目の印 `PENDING`（古いかもしれない）を足し、メモの下流に配る。

```ts
function markDownstream(node: Memo) {
  for (const o of node.observers) {
    if (!o.state) {
      o.state = PENDING;
      if (o.pure) Updates!.push(o);
      else Effects!.push(o);
      if (o.observers) markDownstream(o as Memo);
    }
  }
}
```

キューも二本にする。
メモのような純粋な計算（`pure`）は `Updates` に、エフェクトは `Effects` に積み、`Updates` を先に流す。
`writeSignal` も、読み手がメモなら `markDownstream` を呼ぶように変える。

## 作る：古いかもしれない計算は上流を確かめる

キューから取り出した計算が `PENDING` なら、すぐには実行しない。
自分が読んだものを上流へ辿り、`STALE` なメモがあれば先に計算させる。
自分が何を読んだかを辿るために、計算に `sources`（読んだシグナルとメモの集合）を持たせ、`readSignal` で `observers` と同時に記録する。

```ts
function lookUpstream(node: Computation) {
  node.state = 0;
  for (const source of node.sources) {
    const s = source as Memo;
    if (!s.sources) continue; // ただのシグナル
    if (s.state === STALE) runTop(s);
    else if (s.state === PENDING) lookUpstream(s);
  }
}
```

1行目で自分の印をいったん消すところが要点である。
上流のメモを計算し直して値が変わっていれば、そのメモの `writeSignal` が自分に `STALE` を付け直し、自分はもう一度キューに積まれる。
値が変わっていなければ、印は消えたままで、自分は実行されない。

## 作る：読んだ時点で最新にする

前章の最後に残した欠点は、`batch` の中で派生値を読むと古いことだった。
メモは、読まれたときに印を見て、その場で計算し直す。

```ts
function readSignal<T>(node: SignalState<T>): T {
  const m = node as Memo<T>;
  if (m.sources && m.state) {
    if (m.state === STALE) updateComputation(m);
    else {
      const updates = Updates;
      Updates = null;
      runUpdates(() => lookUpstream(m));
      Updates = updates;
    }
  }
  // ...（Listener の記録は前章と同じ）
}
```

`PENDING` のときに `Updates` をいったん `null` にするのは、`runUpdates` に新しいキューを作らせ、関数が終わった時点でそのキューを流させるためである。
上流を確かめた結果、自分に `STALE` が付き直ってキューに積まれても、読み取りを返す前にそのキューが流れ、自分が計算し直される。
`null` にしないと、外側の `batch` のキューに積まれるだけになり、読み取りは古い値を返す。
テスト「メモのメモも、batch の中で読めば最新になる」は、この処理を外すと `11` ではなく `3` を返して失敗する。

なお、`runUpdates` の入れ子の判定は、前章の `Effects` から `Updates` に移した。
`Updates` がない状態で `Effects` だけがあるときは、`Updates` だけを流してエフェクトは外側に任せる（`wait`）。

## 確かめる

テストは6つあり、冒頭の菱形で `4,3` が一度だけ出ること、二つのエフェクトから読まれたメモが一度しか計算されないことを確かめている。
「偶数か」を返すメモだけを読むエフェクトが、`a` を2から4に変えても走らず、5に変えると走ることも確かめている。

## Solidの lookUpstream と並べる

Solidの `lookUpstream` から、Transitionの分岐を省いて引く。

```ts
function lookUpstream(node, ignore?) {
  node.state = 0;
  for (let i = 0; i < node.sources!.length; i += 1) {
    const source = node.sources![i] as Memo<any>;
    if (source.sources) {
      const state = source.state;
      if (state === STALE) {
        if (source !== ignore &&
            (!source.updatedAt ||
             source.updatedAt < ExecCount))
          runTop(source);
      } else if (state === PENDING)
        lookUpstream(source, ignore);
    }
  }
}
```

骨格はミニ実装と同じである。
`readSignal` の冒頭と `markDownstream` も、ミニ実装はSolidとほぼ同じ形にしてある。

| | ミニ実装 | Solid |
| --- | --- | --- |
| 印 | `0`、`STALE`、`PENDING` | 同じ |
| 同じサイクルでの二重計算 | 防がない | `updatedAt` と `ExecCount` で防ぐ |
| 上流の確認から外す計算 | なし | `ignore` |
| メモの初回計算 | 常に即時 | Transition中はキューに積む |

`ExecCount` は `runUpdates` のたびに増える通し番号で、`updatedAt` は計算が最後に走ったときの番号である。
Solidは、このサイクルですでに計算したメモを、上流の確認でもう一度計算しないようにしている。
`ignore` は5章で読む `runTop` から渡される。

## 本物はなぜこうなったか

古いかもしれない、という印は、2019年8月のコミット `760c690a`（v0.10.0の準備）で入った。
当時はS.jsと同じく、全体の時刻と各計算の世代を比べる作りだった。
いまの `STALE` と `PENDING` の二値と `ExecCount` の形は、2020年3月のコミット `87c37523`（「reactive refactor」）で入った。

キューを `Updates` と `Effects` の二本に分けたのは、2020年9月のコミット `0126e41d`（v0.20.0の直前）である。
それまでは、メモもエフェクトも1本のキューで同じ順に流れていた。
v0.20.0のCHANGELOGは、この変更の要点を「`createEffect` をレンダリングの後に遅らせたこと」だと説明している。

名前にも逸話がある。
下流に印を配る関数は長いあいだ `markUpstream`、上流を確かめる関数は `lookDownstream` という名前だった。
上流と下流が逆に付いたまま使われ、2022年4月のPR #921（コミット `b92a7976`）で、いまの名前に入れ替えられた。
伝播の向きは、作った本人でも取り違えるほど分かりにくい。

## 足りないもの

いまのミニ実装は、計算が一度読んだものを `sources` と `observers` に記録したまま、決して外さない。

```ts
createEffect(() => {
  if (flag()) a();
});
setFlag(false); // もう a は読まない
setA(1);        // それでも走る
```

テストはこの挙動を確かめている。
Solidでは、`flag` を偽にした後の `setA(1)` でエフェクトは走らない。
次章では、計算を実行し直す前に前回の依存を外す仕組みを足す。

---
確度:
- 実ソース確認済み：`markDownstream`、`lookUpstream`（`ignore` と `updatedAt` の比較を含む）、`readSignal` 冒頭の再計算と `Updates` の一時退避、メモの結果が `writeSignal` を通ること
- 履歴、PR由来：`PENDING` の導入（`760c690a`、2019-08-11）、現在の印と `ExecCount` の形（`87c37523`、2020-03-21）、キューの分割（`0126e41d`、2020-09-11、CHANGELOG 0.20.0）、関数名の入れ替え（PR #921、`b92a7976`、2022-04-04）
- 推測：なし
- 実行で確認：ミニ実装の6つのテスト。欠点を示す1つ以外を `solid-js@1.9.15` に差し替えて動かし、本物でも通ることを確かめた。欠点を示す1つは本物では失敗する（本物は依存を外す）。`readSignal` の `Updates` の退避を外すとテストが失敗することも確かめた
