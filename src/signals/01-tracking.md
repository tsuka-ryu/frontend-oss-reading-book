# 読んだら覚えるシグナルを作る

> 読んだ版：solidjs/solid `b25c557`（2026-09-04、solid-js 1.9.15）の `packages/solid/src/reactive/signal.ts`
>
> この章のミニ実装：`code/signals/01-tracking/`（`node --test "code/signals/01-tracking/*.test.ts"`）

この章の目標は、次の3行が動くものを自分で書くことである。

```ts
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
Solidの内部では、エフェクトのように再実行される側を**計算**（Computation）と呼ぶ。

このパートでは、SolidJSのリアクティブコアを小さく作り直す。
コアは `signal.ts` という約1,800行のファイル一つで、関数名と変数名は、あとで比べやすいようにこのファイルに合わせる。
この章で作るのは `createSignal` と `createEffect` だけである。

## 読み取りの瞬間に覚える

エフェクトが何を読むかは、関数を実行してみるまで分からない。
`if` の分岐で読むシグナルが変わることもある。
そこで、実行中に「いま誰が実行中か」をグローバル変数に置いておき、読み取り関数がそれを見て記録する。
この変数の名前は、Solidと同じ `Listener` にする。

```ts
let Listener: Computation | null = null;

export function createSignal<T>(value: T) {
  const s: SignalState<T> = {
    value,
    observers: new Set()
  };
  const read = () => readSignal(s);
  const write = (v: T) => writeSignal(s, v);
  return [read, write] as const;
}

function readSignal<T>(s: SignalState<T>): T {
  if (Listener) s.observers.add(Listener);
  return s.value;
}

function writeSignal<T>(s: SignalState<T>, value: T) {
  s.value = value;
  for (const o of [...s.observers]) runComputation(o);
}
```

仕組みの中心は `readSignal` の1行目で、`Listener` が空でなければ、それを購読者の集合 `observers` に足す。
`writeSignal` は値を置き換えてから、購読者を一つずつ実行し直す。
購読者の集合を配列に複製してから回すのは、実行中に新しく加わった購読者を同じループで拾わないためである。

エフェクトの側は、自分を `Listener` に置いてから関数を実行する。

```ts
export function createEffect(fn: () => void) {
  runComputation({ fn });
}

function runComputation(node: Computation) {
  const listener = Listener;
  Listener = node;
  try {
    node.fn();
  } finally {
    Listener = listener;
  }
}
```

ここでの要点は、終わったときに `Listener` を `null` に戻すのではなく、直前の値に戻すことである。
エフェクトの中で別のエフェクトを作ると、`runComputation` が入れ子になる。
内側が終わったときに `null` に戻してしまうと、外側のエフェクトがその後に読んだシグナルが記録されない。
`finally` で戻すのは、関数が例外を投げても `Listener` が残らないようにするためである。

## 確かめる

テストは6つある。
冒頭の3行が動くこと、エフェクトの外での読み取りは記録されないこと、入れ子のエフェクトの後でも外側の読み取りが外側に記録されること、同じシグナルを1000回読んでも1回の書き込みで1回しか走らないことを確かめている。
残りの2つは、次の章に渡す性質を確かめるもので、最後の節で扱う。

## Solidの readSignal と並べる

Solidで同じ役目を持つのも `readSignal` である。
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

違いは記録の仕方にある。

| | ミニ実装 | Solid |
| --- | --- | --- |
| 実行中の計算 | `Listener` | `Listener` |
| シグナル→計算 | `observers`（Set） | `observers`（配列） |
| 計算→シグナル | なし | `sources`（配列） |
| 相手側の位置 | なし | `observerSlots`、`sourceSlots` |
| 重複の防ぎ方 | Setが自動で防ぐ | 配列の末尾だけを比べる |

Solidは逆向きの `sources`（この計算が読んだシグナルの一覧）も持つ。
これは、計算を実行し直す前に前回の依存を外すためのもので、ミニ実装では3章で足し、4章で使う。
`observerSlots` と `sourceSlots` は、相手側の配列の中で自分が何番目にいるかを覚えておく配列である。
依存を外すとき、相手側の配列を先頭から探さずに済む。
この4本の配列の形は、2020年3月のコミット `87c37523`（「reactive refactor」）で入った。

## 本物はなぜ配列で持つのか

ミニ実装では、エフェクトの中で同じシグナルを1000回読んでも、`Set` に同じ要素は一つしか入らない。

Solidは長いあいだ、読むたびに配列へ追加していた。
1000回読めば、`observers` にも `sources` にも1000個の要素が積まれていた。
先の抜粋にある重複防止の条件、`observers[observers.length - 1] !== Listener` は、2026年5月のコミット `fae8fbe3`（「Deduplicate repeated signal reads」）で入り、solid-js 1.9.13に含まれている。
同じコミットで、1000回読むエフェクトが1回の書き込みで1回だけ走ることを確かめるテストも足された。
ミニ実装の同名のテストは、このテストを写したものである。

この条件は、配列の末尾だけを見る。
コードから読む限り、同じシグナルを別の計算がはさまって読んだ場合は、重複が残る。
`Set` のような完全な重複排除にしなかった理由は、コミットにも変更記録にも書かれていない。
位置を覚える配列の仕組みと両立させるためだと考えられるが、これは推測である。

読み取りで依存を記録する方式そのものは、Solidの発明ではない。
`signal.ts` の冒頭にはAdam Haile氏のリアクティブライブラリ**S.js**のライセンスが転記されている。
Solidは2019年5月のコミット `276dd32e`（「internalize reactive library」）まで、S.jsを外部依存として使っていた。

## 足りないもの

ミニ実装の `writeSignal` は、値を置き換えるとその場で購読者を全部走らせる。
このため、次の二つが起きる。

- **同じ値を書いても走る**：`setV(0)` を二度呼べば二度走る。値を比べていないからである。
- **書き込みをまとめる手段がない**：3回続けて書けば、3回走る。

どちらもテストで確かめている。
後者はSolidでも、何もせずに3回書けば3回走る。
Solidには、それをまとめる `batch` という関数がある。
次章では、値の比較と、書き込みをキューに積んでまとめて流す仕組みを足し、Solidの `writeSignal` と並べる。

---
確度:
- 実ソース確認済み：`readSignal` の依存記録の部分、`sources`・`observers` とそれぞれの位置の配列、`signal.ts` 冒頭のS.jsのライセンス表示
- 履歴、PR由来：4本の配列の導入（`87c37523`、2020-03-21）、末尾比較による重複防止とそのテスト（`fae8fbe3`、2026-05-14、solid-js 1.9.13）、S.jsからの切り替え（`276dd32e`、2019-05-25）
- 推測：`Set` を使わなかった理由（明文の記述は見つからず）
- 実行で確認：ミニ実装の6つのテスト。同じテストのうち欠点を示すもの以外を、npmの `solid-js@1.9.15` に差し替えて動かし、本物でも通ることを確かめた。「3回書くと3回走る」も本物で通る
- コードから読んだが実行していない：別の計算がはさまって読むと重複が残ること
