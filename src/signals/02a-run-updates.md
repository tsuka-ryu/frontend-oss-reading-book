# runUpdatesは自分が外側だとどう知るのか

> 読んだ版：solidjs/solid `b25c557`（2026-09-04、solid 1.9.15）の `packages/solid/src/reactive/signal.ts`

前章では、書き込みは印を付けてキューに積むだけで、キューを流すのは `runUpdates` と `completeUpdates` の組だと書いた。
入れ子の扱いについても、「いちばん外側の呼び出しだけがキューを流す」と一文で済ませた。

しかし、`runUpdates` は自分がいちばん外側だと、どうやって知るのか。
`createRoot` の中でsetterを呼んだときも、同じ判定になるのか。
どちらも、`runUpdates` を一行ずつ読むと答えが出る。

## 二つのモジュール変数

先に、読む対象になる変数を確認する。
`Updates` と `Effects` は、`signal.ts` の先頭で宣言されたモジュール変数で、初期値はどちらも `null` である。
前章で見たとおり、メモのような純粋な計算は `Updates` に、エフェクトは `Effects` に積まれる。

この二つは、キューであると同時に状態の旗でもある。
`null` なら「いま消化中のサイクルはない」、配列なら「誰かがこのキューを持っていて、あとで流す」を意味する。
以下のコードは、この旗の読み書きでほぼ組み立てられている。

## runUpdatesの入口

`runUpdates` は17行の関数で、省略なしで引く。

```ts
function runUpdates<T>(fn: () => T, init: boolean) {
  if (Updates) return fn();
  let wait = false;
  if (!init) Updates = [];
  if (Effects) wait = true;
  else Effects = [];
  ExecCount++;
  try {
    const res = fn();
    completeUpdates(wait);
    return res;
  } catch (err) {
    if (!wait) Effects = null;
    Updates = null;
    handleError(err);
  }
}
```

本質は最初の6行で、二つの旗を見て、自分がキューを持つかどうかを決めている。

1行目の `if (Updates) return fn();` が、「外側だけが流す」の実体である。
`Updates` が配列なら、外側の誰かがすでにサイクルを持っている。
そこで渡された関数を実行するだけで帰る。
関数が積んだ計算は外側の配列に入り、外側が流す。

`Updates` が `null` なら、自分がサイクルを始める。
引数 `init` が偽なら、`Updates` に新しい配列を置く。
`init` が真になるのは、`createRoot` と `runWithOwner` から呼ばれたときだけである。

続く2行は `Effects` を見る。
`Effects` がすでに配列なら、エフェクトのキューは外側のものである。
そのとき `wait` を真にして、あとでエフェクトを流さないことを覚えておく。
`Effects` が `null` なら、新しい配列を置いて自分で持つ。

`ExecCount++` は更新サイクルの通し番号で、同じサイクルで計算を二度走らせないために `runTop` が使う（5章で読む）。

`catch` 節は、`fn` か消化の途中で例外が出たときにキューを捨てる。
次の書き込みが古いキューを引き継がないようにするためである。
ただし `wait` が真なら、`Effects` は外側のものなので残す。
その後の `handleError` は、エラー境界がなければ例外を投げ直す。
エラー境界があり、`Effects` が残っていれば、エラー処理をエフェクトとして積み、ほかのエフェクトと同じ順番で流す。

## 三つの呼ばれ方

二つの旗の組み合わせで、`runUpdates` は次の三通りに振る舞う。

| 呼ばれる場面 | 入口の `Updates` | 入口の `Effects` | 動き |
| --- | --- | --- | --- |
| イベントハンドラでsetterを呼ぶ | `null` | `null` | 両方を作り、両方を流す |
| 消化の最中にsetterを呼ぶ | 配列 | 配列 | `fn` を実行して帰る |
| `createRoot` の中でsetterを呼ぶ | `null` | 配列 | `Updates` だけ作って流す |

1行目と2行目は、前章の説明のとおりである。
`batch` の中の書き込みも2行目にあたる。
`batch` の実装が `runUpdates(fn, false)` だけなので、`batch` 自身が1行目の外側になるからである。

3行目は `init` のための場合である。
`createRoot` は `runUpdates(fn, true)` を呼ぶので、`Effects` には配列が置かれるが、`Updates` は `null` のまま残る。

この状態で `createEffect` が呼ばれると、作ったエフェクトはすぐには実行されない。
`createEffect` の最後の行が `Effects ? Effects.push(c) : updateComputation(c)` で、`Effects` が配列なら積むだけだからである。
ルートの構築中に作ったエフェクトは、構築が終わってから `createRoot` の `runUpdates` がまとめて流す。

一方、構築中にsetterを呼ぶと、`Updates` が `null` なので1行目の早期リターンに当たらない。
その書き込みは自分のサイクルを始め、`Updates` を作って流す。
ただし `Effects` は配列なので `wait` が真になり、エフェクトはルートに任せる。
結果として、構築中の書き込みでもメモはその場で最新になり、エフェクトだけが構築の完了まで待たされる。

`init` が `Updates` を作らない理由は、コードにもコミットにも書かれていない。
上の振る舞いを得るためだと考えられるが、これは推測である。

## initとwaitが入った経緯

`Updates` と `Effects` の二本立て、`init` と `wait` は、2020年9月のコミット `0126e41d`（「update effect timing」、v0.20.0の直前）でまとめて入った。

それ以前の `runUpdates` は、キューを `Updates` の一本だけ持っていた。
関数の中身は「`Updates` を作る、`fn` を実行する、`Updates` の各要素に `runTop` をかける」だけで、エフェクトもメモも同じキューで同じ順に流れていた。
v0.20.0のCHANGELOGは、この変更の要点を `createEffect` をレンダリングの後に遅らせたことだと説明している。
キューを二本に分け、ルートの構築中はエフェクトのキューだけを持っておく仕組みは、その遅延を実現する部品である。

`fn` が終わったあと、`completeUpdates` がどの順でキューを流すのかは、次章で読む。

---
確度:
- 実ソース確認済み：`runUpdates` の全行、`createRoot` と `runWithOwner` だけが `init` を真で呼ぶこと、`createEffect` が `Effects` の有無で積むか即実行かを分けること、`handleError` がエラー処理をエフェクトとして積む条件
- 履歴、PR由来：二本のキューと `init`・`wait` の導入（`0126e41d`、2020-09-11）、`createEffect` の遅延（CHANGELOG 0.20.0）
- 推測：`init` が `Updates` を作らない理由（明文の記述は見つからず）
- 実行で確認：npmの `solid-js@1.9.15` をNode.js（`--conditions=browser`）で動かし、`createRoot` の構築中の書き込みでメモはその場で更新され、エフェクトは構築の完了後に走ることを確かめた
