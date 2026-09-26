# メモはいつ計算し直すか

> 或ひと曰はく、『子の矛を以て、子の盾を陥さば何如。』と。其の人応ふること能はざるなり。
>
> ——『韓非子』難一篇

> 読んだ版：solidjs/solid `b25c557`（2026-09-04、solid-js 1.9.15）の `packages/solid/src/reactive/signal.ts`
>
> この章のミニ実装：`code/signals/03-memo/`（`node --test "code/signals/03-memo/*.test.ts"`）

この章の終わりには、次のコードが動く。

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

1章の作り（書き込みのたびにその場で走らせる）にメモを足すと、この5行は `4 2` と `4 3` を出す。
`4 2` は、新しい `b` と古い `c` の組である。
`a` がいくつであっても、`b` が4で `c` が2になることはない。
このように、途中の食い違った状態が外から見えることを**グリッチ**と呼ぶ。

Solidは、これを防ぐために印を二種類持ち、キューを二本に分け、上流を辿る関数まで用意している。
揃ってから一度だけ走らせる。それだけのことに、なぜそこまで要るのか。

## 一歩目：新しい a と古い c が並ぶ

メモは、計算（`fn` と `state` を持つ）にシグナルの部品（`observers` と `comparator`）を足したものとして作り、計算の結果を `writeSignal` で自分に書き込む。

```ts
function runComputation(node: Computation) {
  // ...（Listener を置いて fn を実行する部分は前章と同じ）
  if (node.observers) writeSignal(node as Memo, next);
  else node.value = next;
}
```

結果が前回と同じなら、`writeSignal` の比較で止まる。

冒頭の菱形を流すと、`2 2` のあとに `4 3` が一度だけ出る。
もう動いている。ところが段を一つずらすと崩れる。
`c` を `b() + 1` にし、エフェクトには `a` と `c` を読ませる。

```text
1 3
2 3
2 5
```

`2 3` がグリッチである（`a` が2なら `c` は5のはずだ）。
`a` の書き込みで積まれるのは直接の読み手の `b` とエフェクトで、`c` は `b` が計算し直されてから、エフェクトの後ろに積まれる。
冒頭の菱形は、キューの並びに助けられていただけである。

手当てとして、読まれたメモが `STALE` なら、その場で計算し直す。

```ts
if (m.sources && m.state === STALE) updateComputation(m);
```

`sources` は計算が読んだものの集合で、`readSignal` で `observers` と同時に記録する。
前章の最後の「`batch` の中で派生値が古い」も、メモで書けばこれで `10` が返る。

## 二歩目：揃ったが二度走る

段のある菱形の出力はこうなる。

```text
1 3
2 5
2 5
```

グリッチは消えたが、エフェクトが二度走った。
エフェクトが `c` を読んだ瞬間に `c` が計算し直され、その `writeSignal` がエフェクトにもう一度印を付けたからである。

原因は、メモとエフェクトが1本のキューに混ざることにある。
純粋な計算（`pure`、メモ）は `Updates` に、エフェクトは `Effects` に積む。

```ts
if (o.pure) Updates!.push(o);
else Effects!.push(o);
```

`completeUpdates` が `Updates` を流し切ってから `Effects` を流せば、出力は `1 3` と `2 5` の二行になる。
`runUpdates` の入れ子の判定は、前章の `Effects` から `Updates` に移した。
`Updates` がなく `Effects` だけがあるときは、`Updates` だけを流してエフェクトは外側に任せる（`wait`）。

## 三歩目：メモのメモに印が届かない

`b = a * 2`、`c = b + 1` として、`batch` の中で `c` を読む。

```ts
batch(() => {
  setA(5);
  console.log(c()); // 3
});
```

`11` のはずが `3` である。
`setA(5)` で印が付くのは直接の読み手の `b` だけで、印のない `c` には一歩目の再計算も働かない。

書き込みの時点で、メモの下流すべてに印を配ればよい。

```ts
function markDownstream(node: Memo) {
  for (const o of node.observers) {
    if (!o.state) {
      o.state = STALE;
      if (o.pure) Updates!.push(o);
      else Effects!.push(o);
      if (o.observers) markDownstream(o as Memo);
    }
  }
}
```

`writeSignal` が読み手のメモに対してこれを呼べば、`c` も `STALE` になり、`11` が返る。

## 四歩目：変わらないメモの下流まで走る

「偶数か」を返すメモ `isEven` だけを読むエフェクトを作り、`a` を2から4に変える。

```text
走った: true
走った: true
```

`isEven` は `true` のままなのに、エフェクトが走った。
下流が本当に古いかは、上流のメモを計算し直してみるまで分からない。
三歩目は、それを「確実に古い」と決めつけていた。

そこで、二つ目の印 `PENDING`（古いかもしれない）を足す。
`markDownstream` が配る印を `STALE` から `PENDING` に変え、`runTop` は `PENDING` の計算をすぐには実行せず、`lookUpstream` に回す。

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
値が変わっていなければ印は消えたままで、`走った: true` は1回になる。

ところが、三歩目で直した `c()` が、また `3` を返すようになった。
`c` の印が `PENDING` になり、一歩目の再計算は `STALE` しか見ていないからである。
読み取りでも上流を確かめる。

```ts
if (m.state === STALE) updateComputation(m);
else {
  const updates = Updates;
  Updates = null;
  runUpdates(() => lookUpstream(m));
  Updates = updates;
}
```

`Updates` をいったん `null` にするのは、`runUpdates` に新しいキューを作らせ、関数が終わった時点でそのキューを流させるためである。
上流を確かめた結果、自分に `STALE` が付き直ってキューに積まれても、読み取りを返す前にそのキューが流れ、自分が計算し直される。
`null` にしないと外側の `batch` のキューに積まれるだけになり、読み取りは `3` を返したままで、テスト「メモのメモも、batch の中で読めば最新になる」が失敗する。

## 確かめる

テストは6つあり、冒頭の菱形で `4,3` が一度だけ出ること、二つのエフェクトから読まれたメモが一度しか計算されないこと、`batch` の中でメモとメモのメモが最新になること、`isEven` が4では走らず5で走ることを確かめている。

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

骨格は四歩目と同じで、`readSignal` の冒頭と `markDownstream` もほぼ同じ形にしてある。

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
印は下へ、確認は上へ進む。
その向きは、作った本人でも取り違えるほど分かりにくい。

## 矛と盾は同時に見えるか

エピグラフは、矛と盾をどちらも最強だと言って売る者が、二つの主張を同時に並べられて答えに詰まる場面である。
グリッチも同じで、`a` が2で `c` が3という組は、並べた瞬間に成り立たず、一歩目のエフェクトは二つを同時に読んでそれを画面に出した。

違うのは、どちらの値も嘘ではなかったことである。
売り手の二つの主張は、少なくとも一方が最初から偽である。
グリッチの `c` が3だったのは、`a` が1だった時点では正しい。
矛盾は、正しい値を異なる時点から集めたことで生じた。

だから、Solidはどちらかの値を捨てない。
`PENDING` の計算に上流を確かめさせ、両方が同じ時点の値になるまで答えさせない。

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
1章で `Set` を気楽に使った請求書は、次章で届く。
外すには、前回何を読んだかを覚えていなければならない。
一歩目で足した `sources` は、その名簿として足りるのか。
次章では、計算を実行し直す前に前回の依存を外す仕組みを足す。

---
確度:
- 実ソース確認済み：`markDownstream`、`lookUpstream`（`ignore` と `updatedAt` の比較を含む）、`readSignal` 冒頭の再計算と `Updates` の一時退避、メモの結果が `writeSignal` を通ること
- 履歴、PR由来：`PENDING` の導入（`760c690a`、2019-08-11）、現在の印と `ExecCount` の形（`87c37523`、2020-03-21）、キューの分割（`0126e41d`、2020-09-11、CHANGELOG 0.20.0）、関数名の入れ替え（PR #921、`b92a7976`、2022-04-04）
- 推測：なし
- 実行で確認：ミニ実装の6つのテスト。欠点を示す1つ以外を `solid-js@1.9.15` に差し替えて動かし、本物でも通ることを確かめた。欠点を示す1つは本物では失敗する（本物は依存を外す）。`readSignal` の `Updates` の退避を外すとテストが失敗することも確かめた。冒頭の `4 2`（1章の作りにメモを足した版）と、一歩目から四歩目の壊れる版の出力（段のある菱形の `2 3`、二度出る `2 5`、`batch` の中の `3`、二度出る `走った: true`、`PENDING` を入れた直後に戻る `3`）は、スクラッチに書いた中間版を `node` で実行した実出力である。最終段の中間版は、この章のテスト6つをすべて通すことも確かめた
- 引用：『韓非子』難一篇の、矛と盾を売る者の条。書き下しは通行の訓読に拠った。原典の刊本との照合はしていない
