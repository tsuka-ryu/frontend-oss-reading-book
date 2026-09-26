# フォームの値はどこに置かれているか

> Ceci n'est pas une pipe.（これはパイプではない。）
>
> ——René Magritte《イメージの裏切り》（1929年）に描き込まれた文

> 読んだ版：react-hook-form/react-hook-form `5fd9ef65`（2026-09-23、package.jsonの版は7.88.0）の `src/useForm.ts`、`src/logic/createFormControl.ts`、`src/utils/createSubject.ts`
>
> この章のミニ実装：`code/rhf/01-useform-and-control/`（`code/rhf/` で `npm install` のあと `node --test "code/rhf/01-useform-and-control/*.test.ts"`）

React Hook Formの入口は、たいていこの形をしている。

```tsx
function App() {
  const { register, formState } = useForm();
  return <input {...register("email")} />;
}
```

この欄に文字を打っても、`App` は毎回は描き直されない。
Reactの教科書どおりなら、値は `useState` に置き、打つたびに描き直すはずである。
React Hook Formはその「当たり前」をやめ、値をReactのstateの外に置いた。

では、値はどこにあるのか。
そして、Reactが値を知らないのに、画面の表示が古いまま取り残されないのはなぜか。

## 用語を先に

Reactでは、コンポーネントの関数をもう一度呼んで画面を計算し直すことを**再描画**という。
**control**は、フォームの値と状態を持つ普通のJavaScriptのオブジェクトで、Reactに依存しない。
**formState**は、変更済みか（`isDirty`）やエラー（`errors`）のような、画面に出すための状態である。
**購読**は変化があったら呼んでほしい関数を登録しておくことで、それを呼ぶことを**通知**という。

## 一歩目：1文字ごとにフォーム全体が描き直される

まず、教科書どおりに書く。

```ts
function useForm() {
  const [values, setValues] =
    useState<Record<string, string>>({});
  const register = (name: string) => ({
    name,
    value: values[name] ?? "",
    onChange: (e: FieldEvent) =>
      setValues((v) => ({ ...v,
        [e.target.name]: e.target.value })),
  });
  return { register, values };
}
```

`a`、`ab`、`abc` と打つと、描画回数（最初の描画を含む）はこうなる。

```
"a" のあと 描画回数: 2
"ab" のあと 描画回数: 3
"abc" のあと 描画回数: 4
```

正しく動く。
そして、1文字ごとにフォームの関数全体が呼び直される。
欄が50個あれば、50個の欄を含む画面を1文字ごとに計算し直す。

## 二歩目：親が描き直すと値が消える

stateに置くから描き直される。
ならば、ただのオブジェクトに置く。

```ts
function createFormControl() {
  const _formValues: Record<string, string> = {};
  const onChange = (e: FieldEvent) => {
    _formValues[e.target.name] = e.target.value;
  };
  const register = (name: string) =>
    ({ name, onChange });
  return { register, control: { _formValues } };
}
function useForm() {
  return createFormControl(); // 描画のたびに作る
}
```

`abc` と打ったあと、親が `App` を描き直すとこうなる。

```
描画回数: 1
値: abc
親の再描画のあと 値: undefined
```

コンポーネントの関数は描画のたびに呼ばれ直すので、中で作ったcontrolも毎回作り直される。
stateからは逃げたが、描画の周期からは逃げられていない。

描画をまたいで同じものを持ち続ける入れ物が `useRef` で、中身を書き換えても再描画は起きない。

```ts
const _formControl = useRef<FormControl>(undefined);
if (!_formControl.current) {
  _formControl.current = createFormControl(props);
}
const control = _formControl.current.control;
```

これでcontrolは初回に一度だけ作られ、親が描き直しても値は `abc` のまま残る。

## 三歩目：値は残ったが、画面が知らない

controlに `isDirty` を持たせて入力があれば真にし（簡略化してある）、`useForm` は描画のときにその複製を `formState` として返す。

```
描画回数: 1
画面の isDirty: false
control の isDirty: true
```

再描画が起きないので、`formState` は最初の描画で取った写しのまま止まっている。
消したかったのは、要らない再描画だけだったはずである。

そこで通知を足す。
`createSubject` は購読者の配列を持ち、`subscribe` で足し、`next` で全員を呼ぶだけの関数である。
controlは流れてきた差分を、ほかの購読者より先に自分の `_formState` へ写す。
`useForm` はそれを購読し、通知が来たら `useState` のsetterを呼ぶ。

```ts
const [formState, updateFormState] =
  useState<FormState>({ isDirty: false, errors: {} });
// ...（controlを一度だけ作る部分は二歩目と同じ）
useLayoutEffect(() => control._subscribe({
  callback: () =>
    updateFormState({ ...control._formState }),
}), [control]);
return { ..._formControl.current, formState };
```

`onChange` には、値を書いたあと `_subjects.state.next({ isDirty })` を足す。
画面から外れるときは、`_subscribe` が返した解除の関数をReactが呼ぶ。

## 四歩目：知らせすぎると一歩目に戻る

`a`、`ab`、`abc` と打ってみる。

```
"a" のあと 描画回数: 2
"ab" のあと 描画回数: 3
"abc" のあと 描画回数: 4
```

一歩目と同じ数字である。
値をstateの外に出し、`useRef` で守り、購読まで書いて、元の場所に戻ってきた。
入力のたびにsetterを呼ぶなら、値を `useState` に置いたのと変わらない。

直すのは3行で、`isDirty` が変わったときだけ通知する。

```ts
const onChange = (event: FieldEvent) => {
  const { name, value } = event.target;
  _formValues[name] = value;
  const isDirty = Object.keys(_formValues).some(
    (k) => _formValues[k] !== (_defaultValues[k] ?? ""),
  );
  if (isDirty !== _formState.isDirty) {
    _subjects.state.next({ isDirty });
  }
};
```

```
"a" のあと 描画回数: 2
"ab" のあと 描画回数: 2
"abc" のあと 描画回数: 2
```

描き直すのは最初の1文字で `isDirty` が偽から真になるときだけで、あとは `_formValues` に書くだけでReactには何も伝えない。
controlのファイルは `react` をimportしておらず、Reactなしで動く。

## 確かめる

テストは8つある。
前半の4つはReactなしでcontrolを動かし、3回入力しても通知は `isDirty` が変わった1回だけであることなどを確かめる。
後半の4つはhappy-dom（Node.jsの中でDOMを模倣するライブラリ）の上で描画し、2文字目以降の入力では再描画が起きず、`setError` では起きることを確かめる。

## 本物のuseFormと並べる

本物の `useForm` から、controlを作る部分と購読する部分を抜き出す。

```ts
const _formControl = React.useRef<
  UseFormReturn<TFieldValues, TContext,
    TTransformedValues> | undefined
>(undefined);
// ...（ほかのrefとformStateのuseStateを省略）
// ...（外で作ったcontrolを渡された場合の条件と分岐を省略）
if (!_formControl.current) {
  const { formControl, ...rest } =
    createFormControl(props);
  _formControl.current = { ...rest, formState };
}
const control = _formControl.current.control;
// ...（propsをcontrolに反映する処理を省略）
useIsomorphicLayoutEffect(() => {
  // ...（再接続時の同期を省略）
  const unsubscribe = control._subscribe({
    formState: control._proxyFormState,
    callback: () =>
      updateFormState({
        ...control._formState,
        defaultValues: control._defaultValues,
      }),
    reRenderRoot: true,
  });
  // ...（isReadyの設定を省略）
```

省いたのは、外から渡されたcontrolを使う分岐と、propsをcontrolに反映する複数の `useEffect` と、型の指定である。
controlを一度だけ作り、通知でだけsetterを呼ぶ骨格は、二歩目と三歩目と同じである。

本物の `createFormControl.ts` は2,344行あるが、`react` はimportしておらず、`createSubject.ts` もミニ実装とほぼ同じ形である。

違うのは四歩目である。
本物の `onChange` は、値を `_formValues` に書いたあと、formStateが変わったかどうかに関わらず入力のたびに `_subjects.state.next({ name, type })` を呼ぶ。
四歩目で「一歩目に戻る」と笑った通知の仕方である。
それでも再描画しないのは、受け取る側の `_subscribe` が再描画するかを判定しているからである。

```ts
const { unsubscribe } = _subjects.state.subscribe({
  next: (formState) => {
    if (
      shouldSubscribeByName(
        props.name, formState.name, props.exact) &&
      shouldRenderFormState(
        formState,
        props.formState || _proxyFormState,
        _setFormState,
        props.reRenderRoot,
      )
    ) {
      // ...（値の複製を作る）
      props.callback({
        // ...（値とformStateをまとめる）
      });
    }
  },
});
```

省いたのは型注釈と、`callback` に渡す値とformStateをまとめる部分である。
判定の材料は、`useForm` が渡した `_proxyFormState` で、判定の中身は次章で読む。

| | ミニ実装 | 本物 |
| --- | --- | --- |
| 値の置き場所 | `_formValues` | `_formValues` |
| 通知の仕組み | `createSubject` | `createSubject` |
| 通知の経路 | `_subjects.state` | `_subjects.state`、`_subjects.array` |
| controlの保持 | `useRef` | `useRef` |
| 購読の登録 | `useLayoutEffect` | `useIsomorphicLayoutEffect` |
| 再描画するかの判定 | 送る側（formStateが変わったか） | 受ける側（`shouldRenderFormState`） |

## controlがuseFormの外に出た経緯

値をReactのstateの外に置く設計は、controlより古い。
controlを切り出す直前の `useForm.ts`（1,287行）では、値は `fieldsRef`（登録した入力欄の一覧を持つref）の各欄に置かれ、全体の値が要るたびに一覧をたどって組み立てていた。

通知の仕組みも先にあり、2020年12月のコミット `8aec47d3`（#3736、題は「introduce Subject to avoid extra ref for the unmount check」で始まる）で、クラスの `Subject` が入った。
それまでは `isUnMount` というrefで画面から外れていないかを確かめてからsetterを呼んでいたのを、`useEffect` で購読し、外れるときに解除する形に置き換えている。

切り出しは2021年7月のコミット `a4b2c0ad`（#5958、v7.13.0）で行われた。
`useForm.ts` は105行になり、`src/logic/createFormControl.ts` が1,227行で新設された。
コミットメッセージに並ぶ「dedicated value store」「improve perf getValues, watch, useWatch」「remove React reference」から、一覧をたどる代わりに専用の置き場所 `_formValues` を読むようにし、同時にReactへの参照を外したことが分かる。
`Subject` は、2021年10月のコミット `d3be33ff`（#6843）で、読みやすさとサイズの縮小を理由に関数の `createSubject` に書き換えられた。

2025年1月のコミット `7f95b265`（#11522、v7.55.0）では `createFormControl` が公開され、コンポーネントの外で作ったcontrolを `useForm({ formControl })` に渡せるようになった。
2021年にこの使い方まで見込んでいたのかは、コミットからは読み取れない。
値の読み取りを速くすることが主な動機だったと考えられるが、これは推測である。

## これはstateではない

エピグラフは、Magritteがパイプの絵の下に書き込んだ一文である。
描かれたパイプには煙草を詰められない。
絵はパイプを表しているだけである。

入力欄に見えている `abc` も、Reactのstateではない。
ミニ実装の `register` は `value` を渡さないので、欄の文字はDOMの入力欄が持っている。
値はcontrolの `_formValues` にあり、Reactのstateにあるのは `formState` の写しだけである。

違うのは、この隔たりが放っておくと害になる点である。
絵とパイプの隔たりは誰も困らせないが、三歩目の `画面の isDirty: false` は利用者から見ればただの不具合である。
React Hook Formは隔たりを残したまま、通知で、必要な分だけ写しを取り直す。

## このミニ実装で足りないもの

最後のテストは、ミニ実装の欠点を確かめている。
`formState.errors` しか読まないコンポーネントでも、`isDirty` が変わると再描画される。
ミニ実装の購読者は、どのキーを読んだかを覚えていないからである。

本物は再描画しない。
npmのreact-hook-form 7.88.0で試すと、`errors` だけを読むコンポーネントは最初の入力で再描画されず、`isDirty` を読むコンポーネントは1回再描画された。

`useForm` は `formState` を返すだけで、それがどう読まれたかを見ていない。
それなのに本物は、読まれなかったキーを知っている。
返したオブジェクトの中で、何が起きているのか。

---
確度:
- 実ソース確認済み：`useForm` が `useRef` にcontrolを一度だけ作る部分と `_subscribe` の登録、`createFormControl.ts` のimportに `react` がないこと、`onChange` が入力ごとに `_subjects.state.next` を呼ぶこと、`_subscribe` の判定、`createSubject` の形
- 履歴、PR由来：`Subject` の導入と `isUnMount` の置き換え（`8aec47d3`、#3736、2020-12-20）、controlの切り出しと `_formValues` の新設（`a4b2c0ad`、#5958、2021-07-31、v7.13.0、コミットメッセージと差分から）、関数版 `createSubject` への書き換え（`d3be33ff`、#6843、2021-10-23）、`createFormControl` の公開（`7f95b265`、#11522、2025-01-12、v7.55.0）
- 推測：2021年にReactへの参照を外した動機（コミットメッセージに理由の記述はなく、PR本文は今回確認できていない）
- 実行で確認（ミニ実装）：8つのテスト（`node --test`、Node.js 22.22、React 19.3、happy-dom）。うち1つは欠点を確かめるもの
- 実行で確認（途中の版）：一歩目から四歩目の途中の版（`useState` 版、描画のたびにcontrolを作る版、通知のない版、入力ごとに通知する版）を別に書き、同じReactとhappy-domで動かした。本文の出力はその実出力である。四歩目の直したあとの出力は、`code/rhf/01-useform-and-control/` の `useForm` を同じ手順で動かしたもの
- 実行で確認（本物）：npmのreact-hook-form 7.88.0を同じテスト環境で描画し、`errors` だけを読むコンポーネントは `isDirty` の変化で再描画されず、`isDirty` を読むコンポーネントは再描画されること。読んだコミット `5fd9ef65` ではなく、公開済みの7.88.0で動かした
- 引用：原文は "Ceci n'est pas une pipe."（René Magritte, *La Trahison des images*, 1929年、絵の中に描き込まれた文）。訳は拙訳。絵そのものは今回確認しておらず、文言と年は広く知られた作品情報による
