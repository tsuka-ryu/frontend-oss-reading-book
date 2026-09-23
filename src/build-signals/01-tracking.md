# 読んだら覚えるシグナルを作る

> 読んだ版：solidjs/solid `b25c557`（2026-09-04、solid 1.9.15）の `packages/solid/src/reactive/signal.ts`
>
> この章で作るコード：このリポジトリの `code/signals/01-tracking/`（`node --test` で動く）

この章の目標は、次の3行が動くものを自分で書くことである。

```js
const [count, setCount] = createSignal(0);
createEffect(() => console.log(count()));
setCount(1); // 1 が表示される
```

`createEffect` に渡した関数は、`count` に依存しているとは一言も書いていない。
それでも `setCount` を呼ぶと再実行される。
この対応を、どこでどう覚えればよいのか。

## 作るもの

用語を先に決める。
**シグナル**は、値を一つ持ち、読み取り関数と書き込み関数の組として使うものである。
**エフェクト**は、関数を一つ持ち、その関数が読んだシグナルに書き込みがあると関数を実行し直すものである。

作るのは、この二つを作る関数 `createSignal` と `createEffect` だけである。
名前は、あとで比べやすいように、Solidの内部の名前（`Listener`、`observers`）に合わせる。

## 読み取りの瞬間に覚える

エフェクトが何を読むかは、関数を実行してみるまで分からない。
`if` の分岐で読むシグナルが変わることもある。
そこで、実行中に「いま誰が実行中か」をグローバル変数に置いておき、読み取り関数がそれを見て記録する。

```js
let Listener = null; // いま実行中のエフェクト

export function createSignal(value) {
  const s = { value, observers: new Set() };
  const read = () => {
    if (Listener) s.observers.add(Listener);
    return s.value;
  };
  const write = next => {
    s.value = next;
    for (const o of [...s.observers]) o.run();
  };
  return [read, write];
}
```

仕組みの中心は `read` の1行目で、`Listener` が空でなければ、それを購読者の集合 `observers` に足す。
`write` は値を置き換えてから、購読者を一つずつ実行し直す。
購読者の集合を配列に複製してから回すのは、実行中に新しく加わった購読者を同じループで拾わないためである。

エフェクトの側は、自分を `Listener` に置いてから関数を実行する。

```js
export function createEffect(fn) {
  const effect = {
    run() {
      const prev = Listener;
      Listener = effect;
      try {
        fn();
      } finally {
        Listener = prev;
      }
    }
  };
  effect.run();
}
```

ここでの要点は、`Listener` を `null` に戻すのではなく、直前の値 `prev` に戻すことである。
エフェクトの中で別のエフェクトを作ると、`run` が入れ子になる。
内側が終わったときに `null` に戻してしまうと、外側のエフェクトがその後に読んだシグナルが記録されない。
`finally` で戻すのは、関数が例外を投げても `Listener` が残らないようにするためである。

冒頭の3行はこれで動く。
同じフォルダのテストは、入れ子のエフェクトの後でも外側の読み取りが外側に記録されることも確かめている。

## Solidの readSignal と並べる

Solidで同じ役目を持つのが `readSignal` である。
依存を記録する部分だけを抜き出す。

```ts
if (Listener) {
  const observers = this.observers;
  if (!observers ||
      observers[observers.length - 1] !== Listener) {
    const sSlot = observers ? observers.length : 0;
    // ...（初回の配列作成を省略）
    Listener.sources.push(this);
    Listener.sourceSlots.push(sSlot);
    // ...（初回の配列作成を省略）
    observers.push(Listener);
    this.observerSlots.push(
      Listener.sources.length - 1);
  }
}
```

省略したのは、`sources` や `observers` がまだ `null` のときに配列を新しく作る分岐である。
`Listener` を見て記録するという骨格は、ミニ実装と同じである。

違いは記録の仕方にあり、対応は次のとおりである。

| | ミニ実装 | Solid |
| --- | --- | --- |
| 実行中の計算 | `Listener` | `Listener` |
| シグナル→計算 | `observers`（Set） | `observers`（配列） |
| 計算→シグナル | なし | `sources`（配列） |
| 相手側の位置 | なし | `observerSlots`、`sourceSlots` |
| 重複の防ぎ方 | Setが自動で防ぐ | 配列の末尾だけを比べる |

## 本物が配列を4本持つ理由

ミニ実装は、シグナルから計算への一方向しか覚えていない。
書き込みで購読者を呼び出すだけなら、それで足りる。

Solidは逆向きの `sources`（この計算が読んだシグナルの一覧）も持つ。
これは、計算を実行し直す前に、前回の依存を外すために使う。
ミニ実装にはこの処理がなく、そのせいで起きる不具合を最後の節で見る。

`observerSlots` と `sourceSlots` は、相手側の配列の中で自分が何番目にいるかを覚えておく配列である。
依存を外すとき、相手側の配列を先頭から探さずに済む。
外す処理そのものは4章で読む。
この4本の配列の形は、2020年3月のコミット `87c37523`（「reactive refactor」）で入った。

## 同じシグナルを何度も読んだら

ミニ実装では、エフェクトの中で同じシグナルを1000回読んでも、`Set` に同じ要素は一つしか入らない。

Solidは長いあいだ、読むたびに配列へ追加していた。
1000回読めば、`observers` にも `sources` にも1000個の要素が積まれていた。
この重複を防ぐ条件、`observers[observers.length - 1] !== Listener` は、2026年5月のコミット `fae8fbe3`（「Deduplicate repeated signal reads」）で入り、solid-js 1.9.13に含まれている。
同じコミットで、1000回読むエフェクトが1回の書き込みで1回だけ走ることを確かめるテストも足された。

この条件は、配列の末尾だけを見る。
コードから読む限り、同じシグナルを別の計算がはさまって読んだ場合は、重複が残る。
`Set` のような完全な重複排除にしなかった理由は、コミットにも変更記録にも書かれていない。
位置を覚える配列の仕組みと両立させるためだと考えられるが、これは推測である。

## このミニ実装で足りないもの

同じフォルダのテストには、ミニ実装の欠点を確かめるものが二つある。
どちらも、いまのミニ実装では「欠点のとおりに振る舞う」ことを確かめている。

- **使わなくなった依存が外れない**：`if (flag()) a()` のエフェクトで `flag` を偽にしたあとも、`a` への書き込みでエフェクトが走る。前回の依存を外していないからである。
- **同じ値を書いても走る**：`setV(0)` を二度呼べば二度走る。書き込みで値を比べていないからである。

このほか、`write` が購読者をその場で一つずつ実行するため、複数の書き込みをまとめる手段もない。
次章では、同じ値の書き込みを止める比較と、書き込みをキューに積む仕組みを足し、Solidの `writeSignal` と並べる。

---
確度:
- 実ソース確認済み：`readSignal` の依存記録の部分、`sources`・`observers` とそれぞれの位置の配列
- 実行で確認：ミニ実装の6つのテスト（`node --test`、Node.js）。うち2つは欠点を確かめるもの
- 履歴、PR由来：4本の配列の導入（`87c37523`、2020-03-21）、末尾比較による重複防止とそのテスト（`fae8fbe3`、2026-05-14、solid-js 1.9.13）
- 推測：`Set` を使わなかった理由（明文の記述は見つからず）
- コードから読んだが実行していない：別の計算がはさまって読むと重複が残ること
