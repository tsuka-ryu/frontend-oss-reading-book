# 入れ子の計算を誰が片付けるか

> 読んだ版：solidjs/solid `b25c557`（2026-09-04、solid-js 1.9.15）の `packages/solid/src/reactive/signal.ts`
>
> この章のミニ実装：`code/signals/05-owner/`（`node --test "code/signals/05-owner/*.test.ts"`）

この章の目標は、次のコードで最後の `setB(1)` が内側のエフェクトを一度だけ走らせることである。

```ts
createRoot(() => {
  createEffect(() => {
    a();
    createEffect(() => b());
  });
});
setA(1);
setA(2);
setB(1); // 内側は一度だけ走ってほしい
```

前章のミニ実装では、外側が走るたびに内側のエフェクトが新しく作られ、古いものも `b` を購読したまま残る。
UIに置き換えると、表示を切り替えるたびに、消えたはずの部品の処理が裏で動き続けることにあたる。
古い内側のエフェクトは、誰が、いつ片付ければよいのか。

## 作る：所有者を覚える

計算を作るとき、「いま実行中の計算」をその計算の**所有者**（owner）として覚える。
所有者の側は、自分が実行中に作った計算を `owned` に持つ。
全体は、所有者を親とする木になる。

いま実行中の計算は `Listener` で分かるが、所有者用に別の変数 `Owner` を用意する。
`untrack` のように「依存は記録しないが、所有はする」場面があるためである（ミニ実装には `untrack` はない）。

```ts
function createComputation(fn, pure, state) {
  const c: Computation = {
    fn, state, pure,
    sources: new Set(),
    owner: Owner,
    owned: null,
    cleanups: null
  };
  if (Owner) {
    if (!Owner.owned) Owner.owned = [c];
    else Owner.owned.push(c);
  }
  return c;
}
```

`runComputation` は、`Listener` と一緒に `Owner` も自分に置いてから関数を実行する（抜粋は省略）。

## 作る：片付けを cleanNode に足す

前章の `cleanNode` は、実行の直前に呼ばれ、読んだものを外していた。
ここに、作ったものを片付ける処理を足す。

```ts
if (node.owned) {
  for (let i = node.owned.length - 1; i >= 0; i--)
    cleanNode(node.owned[i]);
  node.owned = null;
}
if (node.cleanups) {
  for (let i = node.cleanups.length - 1; i >= 0; i--)
    node.cleanups[i]();
  node.cleanups = null;
}
```

子の `cleanNode` を呼ぶので、子が読んだものも外れ、孫も片付く。
`cleanups` は、`onCleanup(fn)` で所有者に登録された後始末の関数で、タイマーの解除やイベントの購読の解除に使う。
どちらも、作った順とは逆の順で片付ける。

木の根は `createRoot` が作る。
根は計算ではないので、自分からは走らない。
`createRoot` に渡した関数は、根を片付ける関数 `dispose` を引数に受け取る。

## 作る：親から先に走らせる

所有者を持つと、実行の順序に新しい問題が出る。
親と子が同じ更新で同時に古くなり、子が先にキューに入っていたとする。
順に走らせると、子は古い値で一度走ってから、親の再実行で破棄される。
その一度は無駄であり、グリッチにもなる。

そこで `runTop` は、キューの計算を走らせる前に所有者の鎖を根の方へ辿り、印の付いた祖先を集めて、外側から順に処理する。

```ts
const ancestors = [node];
let o = node.owner as Computation | null;
while (o) {
  if (o.state) ancestors.push(o);
  o = o.owner as Computation | null;
}
for (let i = ancestors.length - 1; i >= 0; i--) {
  const n = ancestors[i];
  if (n.state === STALE) updateComputation(n);
  else if (n.state === PENDING) lookUpstream(n);
}
```

親が先に走ると、`cleanNode` で古い子が片付き、子の印も消える。
ループが子の番に来たときには印がないので、古い子は走らない。

## 作る：構築中のエフェクトを遅らせる

最後に、`createRoot` の中で作ったエフェクトを、根の構築が終わるまで遅らせる。
UIの部品を組み立てている途中でエフェクトが走ると、まだ組み立て終わっていない部分に触れてしまうからである。

`createRoot` は、`runUpdates` を `init` を真にして呼ぶ。
`init` が真のとき、`runUpdates` は `Effects` だけを作り、`Updates` は作らない。
`createEffect` は、`Effects` があれば積むだけにし、なければその場で走る。

```ts
export function createEffect(fn: () => void) {
  const c = createComputation(fn, false, STALE);
  if (Effects) Effects.push(c);
  else updateComputation(c);
}
```

構築中にシグナルへ書き込むと、`Updates` がないので、その書き込みは自分で `Updates` を作って流す。
`Effects` はすでにあるので、エフェクトは根に任せる（3章で足した `wait`）。
その結果、構築中の書き込みでもメモはその場で最新になり、エフェクトだけが構築の完了まで待つ。

## 確かめる

テストは4つある。
冒頭の例で内側が一度だけ走ること、`onCleanup` が再実行の前と `dispose` のときに呼ばれること、構築中の書き込みでメモは即座に、エフェクトは構築の後に更新されることを確かめている。
残る1つは、子が先にキューに入っても親が先に走り、古い子が走らないことを確かめる。
`runTop` の祖先の確認を外すと、このテストは古い子が一度走って失敗する。

## Solidの runTop と並べる

Solidの `runTop` から、Transitionと、Suspense（読み込み中の表示を出す機能）の分岐を省いて引く。

```ts
function runTop(node) {
  if (node.state === 0) return;
  if (node.state === PENDING) return lookUpstream(node);
  // ...（Suspenseの分岐を省略）
  const ancestors = [node];
  while (
    (node = node.owner) &&
    (!node.updatedAt || node.updatedAt < ExecCount)
  ) {
    if (node.state) ancestors.push(node);
  }
  for (let i = ancestors.length - 1; i >= 0; i--) {
    node = ancestors[i];
    if (node.state === STALE) {
      updateComputation(node);
    } else if (node.state === PENDING) {
      const updates = Updates;
      Updates = null;
      runUpdates(() =>
        lookUpstream(node, ancestors[0]), false);
      Updates = updates;
    }
  }
}
```

| | ミニ実装 | Solid |
| --- | --- | --- |
| 祖先を辿る範囲 | 根まで | このサイクルで未実行の祖先まで |
| `PENDING` の祖先 | `lookUpstream` | `Updates` を退避して `lookUpstream` |
| エフェクトの種類 | 1種類 | レンダラ用と開発者用の2種類 |

Solidは、このサイクルですでに走った祖先（`updatedAt` が `ExecCount` 以上）で遡るのをやめる。
`PENDING` の祖先を確かめるときに `Updates` を退避するのは、3章で見た `readSignal` と同じ理由である。
`lookUpstream` に渡す `ancestors[0]` は、確認の途中で元の計算自身を走らせないための `ignore` である。

表の最後の行は、ミニ実装で作っていない部分である。
Solidでは、`createEffect` で作ったエフェクトに `user` の印が付き、キューを流す関数 `runUserEffects` が、印のないレンダラ用のエフェクトを先に、開発者のエフェクトを後に走らせる。
開発者のエフェクトが走る時点では、DOMは組み立て終わっている。

## 本物はなぜこうなったか

外側から順に祖先を処理する現在の `runTop` は、2021年7月のコミット `46af8c2a`（「better topological sort」）で入った。
それ以前の `runTop` は、いちばん外側の古い祖先を一つだけ選んで実行する作りだった。
差分から読む限り、途中に `PENDING` の祖先が挟まる場合を正しく扱うための書き換えと考えられるが、コミットに説明はない。

構築中にエフェクトを遅らせる `init` と `wait` は、2020年9月のコミット `0126e41d` で、キューの分割と同時に入った。
v0.20.0のCHANGELOGは、`createEffect` をレンダリングの後に遅らせたと説明している。
同じリリースで、遅らされては困る用途（派生データを別のシグナルへ書き戻す処理）のために、遅らせない `createComputed` が分けられた。

## このパートで作らなかったもの

ミニ実装は、Solidのリアクティブコアのうち、依存の記録、伝播、再計算、張り直し、所有者の木までを作った。
次のものは作っていない。

- **Transition**：更新を別の世界で先に計算し、準備ができてから切り替える仕組み。`tState` や `tValue` という別の印と値を持つ
- **Suspense**：非同期の読み込み中にエフェクトを保留する仕組み
- **エラー境界**：計算の中の例外を、所有者の木を遡って処理する仕組み（`handleError`）
- **二種類のエフェクト**：上で見た `runUserEffects` による順序付け

どれも、この章までの仕組み（印、キュー、所有者の木）の上に足されている。

---
確度:
- 実ソース確認済み：`createComputation` の `owner` と `owned` への登録、`cleanNode` の子の破棄と `cleanups` の実行、`onCleanup`、`createRoot` が `runUpdates(fn, true)` を呼ぶこと、`createEffect` が `Effects` の有無で積むか即実行かを分けること、`runTop` の祖先の収集、`runUserEffects` の二巡の実行
- 履歴、PR由来：祖先を外側から処理する形（`46af8c2a`、2021-07-25）、`init` と `wait` とキューの分割（`0126e41d`、2020-09-11）、`createEffect` の遅延と `createComputed` の分離（CHANGELOG 0.20.0）
- 推測：`46af8c2a` の書き換えの理由（コミットに説明はなく、差分からの読み取り）
- 実行で確認：ミニ実装の4つのテスト。4つとも `solid-js@1.9.15` に差し替えて動かし、本物でも通ることを確かめた。`runTop` の祖先の確認を外すとテストが失敗することも確かめた
