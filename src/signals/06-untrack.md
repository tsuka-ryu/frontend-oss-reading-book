# 読んでも覚えさせないにはどうするか

> You see, but you do not observe.
>
> ——Arthur Conan Doyle, "A Scandal in Bohemia"（*The Strand Magazine*, 1891；*The Adventures of Sherlock Holmes*, 1892 所収）拙訳：見てはいるが、観察してはいない。

> 読んだ版：solidjs/solid `b25c557`（2026-09-04、solid-js 1.9.15）の `packages/solid/src/reactive/signal.ts`
>
> この章のミニ実装：`code/signals/06-untrack/`（`node --test "code/signals/06-untrack/*.test.ts"`）

この章の目標は、次のコードで `b` が変わってもエフェクトが走らないことである。

```ts
createEffect(() => {
  console.log(a(), untrack(() => b()));
});
setB(1); // 走ってほしくない
```

デバッグのつもりで書いた `console.log(a(), b())` は、5章までのエフェクトでは必ず `b` にも依存する。
1章で作った仕組みは、読んだものを覚えることしかできない。
値を一度覗くだけと、値の変化に反応することを、書き手はまだ区別できない。

## 一歩目：見てはいるが、止めていない

区別の道具として、`untrack(fn)` という関数を作る。
中で読んだものを依存にせずに `fn` を実行する、という触れ込みである。

最初の実装は、次のように何もしない。

```ts
export function untrack<T>(fn: () => T): T {
  return fn();
}
```

これでも「`fn` を実行して結果を返す」という型は満たしている。
だが実行して確かめると、`b` を変えてもエフェクトは走り続ける。

```text
runs after b changes (should stay 1): 3
```

`Listener` に触れていないのだから当然である。
この版は `untrack` という名前を持つだけで、中身は素通しの関数と変わらない。
見てはいるが、まだ何も止めていない。

## 二歩目：Listenerを外して戻す

追跡を止めるには、実行中だけ `Listener` を `null` にすればよい。
1章で作った `readSignal` は、`Listener` が `null` なら誰も名簿に登録しない。

```ts
export function untrack<T>(fn: () => T): T {
  const listener = Listener;
  Listener = null;
  const result = fn();
  Listener = listener;
  return result;
}
```

これで目標のコードは動く。
`b` を変えても走らず、`a` を変えれば走る。

## 三歩目：例外が飛ぶと戻し忘れる

この版には、まだ穴がある。
`fn` が例外を投げると、`Listener = listener` の行に到達しないまま関数を抜ける。

```ts
createEffect(() => {
  try {
    untrack(() => { throw new Error("boom"); });
  } catch {
    // ここで握りつぶす
  }
  c(); // このあとの読み取りは、追跡が復活していてほしい
});
```

実行すると、`c` を変えてもエフェクトは走らない。

```text
runs after c changes (expect 0 if Listener leaked null, meaning bug): 0
```

例外を握りつぶした側から見れば、処理は正常に続いているように見える。
だが `Listener` は `null` のまま放置され、それ以降に読んだシグナルはどれも依存にならない。
一つの `try/catch` の書き方が、無関係な行の追跡まで壊す。

`finally` に戻す処理を移せば直る。

```ts
export function untrack<T>(fn: () => T): T {
  const listener = Listener;
  Listener = null;
  try {
    return fn();
  } finally {
    Listener = listener;
  }
}
```

## 四歩目：一度だけ走らせる土台にする

`untrack` があれば、「初回に一度だけ、何も追跡せずに走る」処理も組める。

```ts
export function onMount(fn: () => void) {
  createEffect(() => untrack(fn));
}
```

`createEffect` は初回に必ず一度実行される（5章）。
その中身を `untrack` で包めば、`fn` が何を読んでも二回目以降の実行は起きない。

## 確かめる

テストは4つある。
`untrack` の中で読んだ値が依存にならないこと、例外を投げても `Listener` が元に戻ること、`onMount` が一度しか走らないことを確かめる。
残る一つは、次節で扱う欠点をテストとして固定したものである。

## 本物のuntrackと並べる

本物は、ミニ実装の三歩目に、さらに二つの分岐を加えている。

```ts
export function untrack<T>(fn: Accessor<T>): T {
  if (!ExternalSourceConfig && Listener === null) return fn();

  const listener = Listener;
  Listener = null;
  try {
    if (ExternalSourceConfig) return ExternalSourceConfig.untrack(fn);
    return fn();
  } finally {
    Listener = listener;
  }
}
```

| | ミニ実装 | Solid |
| --- | --- | --- |
| 追跡の停止 | `Listener` を退避して `null` | 同じ |
| 例外時の復元 | `finally` | 同じ |
| `Listener` が既に `null` のとき | 退避と復元を毎回行う | `fn()` を直接返す（早期リターン） |
| 外部の反応系との連携 | なし | `ExternalSourceConfig.untrack` に委譲 |

`ExternalSourceConfig` は、SolidをVueやReactの状態と繋ぐときに使うフックで、この章のミニ実装は持たない。
このフックが `untrack` に絡む理由は30章で回収する。

## 本物はなぜ2年越しで直したか

`untrack` という名前は、`freeze` が `batch` に変わったのと同じコミット（`2dacbe5e`、2020-08-19）で、`sample` から改名された。
CHANGELOG（0.19.0、2020-08-23）は理由を、それまでの名前がデジタル回路の用語に寄っていて分かりにくかったためだと書いている。

三歩目で直した`finally`忘れは、本物にも実在した欠陥である。
改名された時点の `untrack` は、二歩目のミニ実装と同じく、素の代入で `Listener` を戻していた。
`try/finally` が入ったのは `3c37e236`（2022-11-05、"improve error handling in `untrack`"）で、改名から2年あまり経ってからである。
追跡を止めて値を覗くための関数が、自分自身の実行を覗かれていなかった。

早期リターンは `c26f9334`（2023-02-07）で入った。
PRの説明が挙げる例は、`untrack` の中でさらに `untrack` を呼ぶ場合である。

```ts
untrack(() => api.run()); // api.run の中でも untrack(...) を呼ぶ
```

外側の `untrack` を抜けた時点で `Listener` はすでに `null` になっている。
内側の呼び出しは、その `null` を退避してまた `null` を代入するだけの、無駄な一往復になる。
早期リターンは、この二重の退避を素通りさせる最適化である。
一歩目の素通しは、何もしていないだけの欠陥だった。
この素通しは、何もする必要がないと確かめたうえでの選択である。
同じ形が、確かめずに書けば欠陥に、確かめてから書けば最適化になる。

## 止められるが、思い出せるとは限らない

一歩目の `untrack` は、冒頭の引用の裏返しだった。
ホームズは見ることと観察することを区別したが、一歩目の版は、区別する道具を名乗りながら、中身は見るだけの関数のままだった。
型が合っていることと、意図した仕事をすることは別である。

四歩目までで、この区別自体は道具になった。
だが、区別できることと、区別を毎回思い出せることも別の話である。
次のコードは、`untrack` を一度も呼んでいない。

```ts
createEffect(() => {
  setCount(count() + 1);
});
```

`count()` を読むので、このエフェクトは `count` に依存する。
書き込み先も `count` なので、自分自身に依存したことになる。
実行すると、スタックはこうなる。

```text
threw: RangeError Maximum call stack size exceeded
```

`untrack(() => count())` と書けばこの依存は消せるが、それでは「前の値を使って更新する」という素直な意図まで、追跡から隠す指示に変わってしまう。
隠したいのは依存であって、意図ではない。
前の値を、読まずに手に入れる方法はないのか。

---
確度:
- 実ソース確認済み：`untrack`（早期リターン、`ExternalSourceConfig` への委譲、`finally`）、`onMount` が `createEffect(() => untrack(fn))` であること
- 履歴、PR由来：`sample`→`untrack` の改名（`2dacbe5e`、2020-08-19）とCHANGELOG 0.19.0の理由、`finally` の追加（`3c37e236`、2022-11-05）、`null` リスナーの早期リターンとPR #1534の説明にある入れ子の `untrack` の例（`c26f9334`、2023-02-07）、`ExternalSourceConfig` への一般化（`8d2de12f`、2024-01-03、Issue #1850）
- 推測：なし
- 実行で確認：ミニ実装の4つのテスト。一歩目・二歩目・三歩目の中間版は、それぞれの版に差し替えて実際に `node` で動かし、この章に書いた出力を得た（中間版はリポジトリには置いていない）。`setCount(count() + 1)` が `RangeError` を投げることも、実際に実行して確認した
- 引用：Arthur Conan Doyle, "A Scandal in Bohemia"。*The Strand Magazine* 1891年7月号初出、*The Adventures of Sherlock Holmes*（1892年）収録という書誌情報と、この一節がホームズの台詞であることは、このセッションの一般知識による。今回はネットワークの制約でパブリックドメインの原文（Project Gutenberg等）に直接あたれておらず、一次資料による確認はできていない。訳は拙訳
