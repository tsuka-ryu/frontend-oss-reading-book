# フォームの値はどこに置かれているか

> 読んだ版：react-hook-form/react-hook-form `5fd9ef65`（2026-09-23、package.jsonの版は7.88.0）の `src/useForm.ts`、`src/logic/createFormControl.ts`、`src/utils/createSubject.ts`
>
> この章のミニ実装：`code/rhf/01-useform-and-control/`（`code/rhf/` で `npm install` のあと `node --test "code/rhf/01-useform-and-control/*.test.ts"`）

この章の目標は、次のフォームで文字を打っても `App` が毎回は描画し直されない `useForm` を、自分で書くことである。

```tsx
function App() {
  const { register, formState } = useForm();
  return <input {...register("email")} />;
}
```

Reactでは、コンポーネントの関数をもう一度呼んで画面を計算し直すことを**再描画**という。
入力欄の値を `useState` で持つと、書き換えるたびに再描画が起きるので、1文字ごとにフォーム全体が再描画される。

React Hook Formは、値をReactのstateの外に置くことでこれを避けている。
では、値をどこに置き、再描画が必要なときだけReactにどう知らせればよいのか。

## 値を持つオブジェクトを作る

用語を先に決める。
**control**は、フォームの値と状態を持つ普通のJavaScriptのオブジェクトで、Reactには依存しない。
**formState**は、変更済みか（`isDirty`）やエラー（`errors`）のような、画面に出すための状態である。
**購読**は変化があったら呼んでほしい関数を登録しておくことで、それを呼ぶことを**通知**という。

通知の仕組み `createSubject` は、購読者の配列を持ち、`subscribe` で足し、`next` で全員を呼ぶだけの関数にした。
controlを作る `createFormControl` の中心は次の部分で、名前は本物に合わせてある。

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
const register = (name: string) => {
  _formValues[name] ??= "";
  return { name, onChange };
};
```

`register` は入力欄に渡す `name` と `onChange` を返す。
入力のたびに呼ばれる `onChange` は、値を `_formValues` に書き込むだけで、Reactには何も伝えない。
通知するのは、`isDirty` が変わったとき（最初の1文字で偽から真になるときなど）だけである。
このファイルは `react` をimportしておらず、Reactなしで動く。

## useFormはcontrolを一度だけ作る

Reactとは `useForm` がつなぐ。
`useRef` は、再描画をまたいで同じ値を持ち続ける入れ物で、中身を書き換えても再描画は起きない。

```ts
export function useForm(props: Props = {}) {
  const _formControl = useRef<FormControl>(undefined);
  const [formState, updateFormState] = useState<FormState>(
    { isDirty: false, errors: {} });

  if (!_formControl.current) {
    _formControl.current = createFormControl(props);
  }
  const control = _formControl.current.control;

  useLayoutEffect(() => control._subscribe({
    callback: () =>
      updateFormState({ ...control._formState }),
  }), [control]);

  return { ..._formControl.current, formState };
}
```

`createFormControl` は初回の描画で一度だけ呼ばれ、2回目以降は `useRef` から同じcontrolを取り出すだけである。
再描画の引き金は、`useLayoutEffect` で登録する購読一つに限られる。
通知が来ると、controlの `_formState` の複製を `useState` のsetter `updateFormState` に渡し、そこで初めて再描画が起きる。
画面から外れるときは、`_subscribe` が返した解除の関数をReactが呼ぶ。

## テストで確かめること

テストは8つある。
前半の4つはReactなしでcontrolを動かし、3回入力しても通知は `isDirty` が変わった1回だけであることなどを確かめる。
後半の4つはhappy-dom（Node.jsの中でDOMを模倣するライブラリ）の上で `useForm` を使うコンポーネントを描画し、2文字目以降の入力では再描画が起きず、`setError` では起きることを描画回数で確かめる。

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
controlを一度だけ作り、通知でだけsetterを呼ぶ骨格は、ミニ実装と同じである。

本物の `createFormControl.ts` は2,344行あるが、`react` はimportしておらず、`createSubject.ts` もミニ実装とほぼ同じ形である。

違いが大きいのは、通知を送る側である。
本物の `onChange` は、値を `_formValues` に書いたあと、formStateが変わったかどうかに関わらず入力のたびに `_subjects.state.next({ name, type })` を呼び、再描画するかどうかは受け取る側の `_subscribe` が判定する。

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

通知の仕組みも先にあった。
2020年12月のコミット `8aec47d3`（#3736、題は「introduce Subject to avoid extra ref for the unmount check」で始まる）で、クラスの `Subject` が入った。
それまでは `isUnMount` というrefで画面から外れていないかを確かめてからsetterを呼んでいたのを、`useEffect` で購読し、外れるときに解除する形に置き換えている。

切り出しは2021年7月のコミット `a4b2c0ad`（#5958、v7.13.0）で行われた。
`useForm.ts` は105行になり、`src/logic/createFormControl.ts` が1,227行で新設された。
コミットメッセージに並ぶ「dedicated value store」「improve perf getValues, watch, useWatch」「remove React reference」から、一覧をたどる代わりに専用の置き場所 `_formValues` を読むようにし、同時にReactへの参照を外したことが分かる。
`Subject` は、2021年10月のコミット `d3be33ff`（#6843）で、読みやすさとサイズの縮小を理由に関数の `createSubject` に書き換えられた。

2025年1月のコミット `7f95b265`（#11522、v7.55.0）では `createFormControl` が公開され、コンポーネントの外で作ったcontrolを `useForm({ formControl })` に渡せるようになった。
2021年にこの使い方まで見込んでReactを外したのかは、コミットからは読み取れない。
値の読み取りを速くすることが主な動機だったと考えられるが、これは推測である。

## このミニ実装で足りないもの

最後のテストは、ミニ実装の欠点を確かめている。
`formState.errors` しか読まないコンポーネントでも、`isDirty` が変わると再描画される。
ミニ実装の購読者は、どのキーを読んだかを覚えていないからである。

本物は同じ場面で再描画しない。
npmのreact-hook-form 7.88.0で同じ操作を試すと、`errors` だけを読むコンポーネントは最初の入力で再描画されず、`isDirty` を読むコンポーネントは1回再描画された。

次章では、formStateのどのキーが読まれたかを記録する `_proxyFormState` と、それを使う `shouldRenderFormState` を足し、本物の判定と並べる。

---
確度:
- 実ソース確認済み：`useForm` が `useRef` にcontrolを一度だけ作る部分と `_subscribe` の登録、`createFormControl.ts` のimportに `react` がないこと、`onChange` が入力ごとに `_subjects.state.next` を呼ぶこと、`_subscribe` の判定、`createSubject` の形
- 履歴、PR由来：`Subject` の導入と `isUnMount` の置き換え（`8aec47d3`、#3736、2020-12-20）、controlの切り出しと `_formValues` の新設（`a4b2c0ad`、#5958、2021-07-31、v7.13.0、コミットメッセージと差分から）、関数版 `createSubject` への書き換え（`d3be33ff`、#6843、2021-10-23）、`createFormControl` の公開（`7f95b265`、#11522、2025-01-12、v7.55.0）
- 推測：2021年にReactへの参照を外した動機（コミットメッセージに理由の記述はなく、PR本文は今回確認できていない）
- 実行で確認（ミニ実装）：8つのテスト（`node --test`、Node.js 22.22、React 19.3、happy-dom）。うち1つは欠点を確かめるもの
- 実行で確認（本物）：npmのreact-hook-form 7.88.0を同じテスト環境で描画し、`errors` だけを読むコンポーネントは `isDirty` の変化で再描画されず、`isDirty` を読むコンポーネントは再描画されること。読んだコミット `5fd9ef65` ではなく、公開済みの7.88.0で動かした
