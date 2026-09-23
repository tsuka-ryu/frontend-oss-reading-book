# formStateのどのキーを読んだかを覚える

> 読んだ版：react-hook-form/react-hook-form `28334fa`（2026-09-23、タグ v7.88.0、package.jsonの版も7.88.0）の `src/logic/getProxyFormState.ts`、`src/logic/shouldRenderFormState.ts`、`src/useForm.ts`
>
> この章のミニ実装：`code/rhf/02-proxy-form-state/`（`code/rhf/` で `npm install` のあと `node --test "code/rhf/02-proxy-form-state/*.test.ts"`）

前章のミニ実装には欠点があった。
`errors` しか読まないコンポーネントでも、`isDirty` が変わるたびに再描画されてしまう。

```tsx
function ErrorText() {
  const { formState } = useForm();
  return <p>{formState.errors.email}</p>; // isDirtyは読んでいない
}
```

この章の目標は、`ErrorText` が `isDirty` の変化では再描画されないようにすることである。
そのためには、`formState` のどのキーが実際に読まれたかを、`useForm` の側が知っている必要がある。

## 読んだキーをgetterで記録する

`formState.errors` を読むとは、JavaScriptの言葉で言えば、`formState` というオブジェクトの `errors` プロパティにアクセスすることである。
プロパティへのアクセスは、`Object.defineProperty` で**getter**を仕込めば横取りできる。
getterは、プロパティを読むたびに呼ばれる関数である。

```ts
export default function getProxyFormState(
  formState: FormState,
  proxyFormState: ProxyFormState,
) {
  const result = {} as FormState;
  for (const key of Object.keys(formState) as (keyof FormState)[]) {
    Object.defineProperty(result, key, {
      enumerable: true,
      get() {
        proxyFormState[key] = true;
        return formState[key];
      },
    });
  }
  return result;
}
```

`formState` のキーひとつひとつに、素通しのgetterを付けた別オブジェクト `result` を作る。
値を返す前に `proxyFormState[key] = true` と書き込むのが要点である。
一度でも読まれたキーは `true` のまま残る。

`useForm` は、`_formState` をそのまま返す代わりに、この関数を通した `result` を返す。

```ts
const formStateProxy = useMemo(
  () => getProxyFormState(formState, control._proxyFormState),
  [control, formState],
);
return { ..._formControl.current, formState: formStateProxy };
```

`control._proxyFormState` は `{ isDirty: false, errors: false }` から始まる、controlひとつにつき1個のオブジエクトである。
`ErrorText` が `formState.errors` を読めば `errors` だけが `true` になり、`isDirty` は `false` のままになる。

## 変化したキーが読まれていたときだけ通知する

記録するだけでは再描画は減らない。
記録を使って、通知を止める関数を作る。

```ts
export default function shouldRenderFormState(
  changed: Partial<FormState>,
  proxyFormState: ProxyFormState,
) {
  const keys = Object.keys(changed) as (keyof ProxyFormState)[];
  return keys.length === 0 || keys.some((key) => proxyFormState[key]);
}
```

`changed` は、`_subjects.state` に流れてきた差分（`{ isDirty: true }` のような部分オブジェクト）である。
そのキーのうち一つでも `proxyFormState` で `true`（読まれたことがある）なら、通知してよいと判断する。
`createFormControl` の `_subscribe` は、この関数の返り値でReactへの `callback` を呼ぶかどうかを決める。

```ts
const _subscribe = (props: { callback: () => void }) =>
  _subjects.state.subscribe({
    next: (diff) => {
      if (shouldRenderFormState(diff, _proxyFormState)) {
        props.callback();
      }
    },
  }).unsubscribe;
```

`_formState`（controlが持つ実体）は、この判定より前の、別の購読者がすでに書き換えている。
止めているのは、Reactの `updateFormState` を呼ぶかどうかだけである。

## テストで確かめること

テストは全部で16個ある。
前章から引き継いだ8個に加え、`_proxyFormState`単体の挙動を確かめる4個、`getProxyFormState`と`shouldRenderFormState`をそれぞれ単体で確かめる4個を足した。

中心になるのは次の2つである。
`errors` だけを読むコンポーネントは、入力で `isDirty` が変わっても再描画しない。
`isDirty` を読むコンポーネントは、同じ入力で再描画する。
同じ `control` を共有する2つのコンポーネントが、読んだキーに応じて別々に反応することを、この2つのテストで確かめている。

## 本物と並べる

本物の `getProxyFormState.ts` は、ミニ実装と同じ形のgetterを使う。

```ts
Object.defineProperty(result, key, {
  get: () => {
    const _key = key as keyof FormState<TFieldValues> & keyof ReadFormState;
    if (control._proxyFormState[_key] !== VALIDATION_MODE.all) {
      control._proxyFormState[_key] = !isRoot || VALIDATION_MODE.all;
    }
    localProxyFormState && (localProxyFormState[_key] = true);
    return formState[_key];
  },
});
```

省いたのは型注釈である。
違うのは、`true` の代わりに `isRoot`（このProxyがルートの `useForm` 由来かどうか）で分岐している点と、`localProxyFormState` という2つ目の記録先を持てる点である。
`useController` や `useWatch` は、`useForm` とは別に自分専用の記録先（`localProxyFormState`）を持てるため、同じcontrolを複数のhookが共有しても、それぞれが読んだキーだけで再描画を判断できる。
ミニ実装は `useForm` しか作っていないので、記録先は `control._proxyFormState` の1つに絞った。

本物の `shouldRenderFormState.ts` も、判定の中心はミニ実装と同じである。

```ts
return (
  !keys.length ||
  (isRoot && keys.length >= Object.keys(_proxyFormState).length) ||
  keys.find(
    (key) =>
      _proxyFormState[key as keyof ReadFormState] ===
      (!isRoot || VALIDATION_MODE.all),
  )
);
```

真ん中の1行が、ミニ実装にはない安全弁である。
変化したキーの数が、記録している全キー数以上になったとき（`reset()` のように、ほぼ全部のキーが一度に変わるとき）は、個々のキーを見ずに無条件で再描画する。
ただし `isRoot` が真のとき、つまり `useForm` 本体の購読に対してだけである。

| | ミニ実装 | 本物 |
| --- | --- | --- |
| 読んだキーの記録 | `Object.defineProperty` によるgetter | 同じ（過去に`Proxy`だった時期がある。次節） |
| 記録先 | `control._proxyFormState` の1か所 | `control._proxyFormState`（ルート）＋hookごとの`localProxyFormState` |
| 通知の判定 | 変化したキーが読まれているか | 同じ＋「ほぼ全部変わったら無条件」の安全弁（`isRoot`時のみ） |

## 本物はなぜ違うか

`getProxyFormState.ts` と `shouldRenderFormState.ts` は、どちらもReact Hook FormのV7への全面書き換え（コミット `9555d16f`、2021-04-01、PR #3741）で今の場所に切り出された。
ただしV7の時点では、getterではなくJavaScript標準の **`Proxy`** を使っていた。

```ts
// V7時点のgetProxyFormState.ts（抜粋）
isProxyEnabled
  ? new Proxy(formState, {
      get: (obj, prop) => {
        readFormStateRef.current[prop] = true;
        return obj[prop];
      },
    })
  : formState;
```

`isProxyEnabled` は `'Proxy' in window` を見るだけの判定で、`Proxy` が使えない環境では素の `formState` をそのまま返し、最適化をあきらめていた。
このパターンはV7より前の `useForm.ts` にもすでにあり、V7がしたのは独立したファイルへの切り出しだけだった。

3か月後のコミット `a4b2c0ad`（PR #5958、2021-07-31、v7.13.0）に含まれるサブPR #5999で、`Proxy` は今の `Object.defineProperty` によるgetterに置き換わり、`isProxyEnabled` はファイルごと削除された。
PR #5999の本文は「use basic getter api of js instead」とだけ書かれており、具体的な理由（対応環境の違いか、バンドルサイズか）は記されていない。
`createFormControl`をReactから切り離した同じコミットの一部であることから、環境を選ぶAPIをやめて挙動をそろえる意図があったと考えられるが、これは推測である。
`getProxyFormState`という名前だけが、`Proxy`を使っていた時期の名残として今も残っている。

もう一つの違い、`isRoot`による安全弁の分岐は、2026年のコミット `2adb9c08`（PR #13398）で入った。
それまでは、ほぼ全部のキーが変わったときの無条件再描画が、`useWatch`のようなルート以外の購読者にもかかっていた。
無関係なフィールドのバリデーションが多くのキーを一度に変えると、値だけを見ているはずの`useWatch`まで再描画してしまう不具合があり、その修正として `isRoot &&` の1条件が足された。

## 足りないもの

`_formValues` は、`register` が返す `onChange` が呼ばれたときしか書き換わらない。
逆に言えば、`_formValues` の値をどこかから書き戻したくても、`<input>` に書き込む手段がない。

```ts
log.form.control._formValues.email = "prefilled@example.com";
// <input>のvalueはこれで変わらない
```

本物の `register` は `ref` を返し、そのDOMノードへの参照を保つ。
`setValue` や `reset` は、この `ref` を使って `input.value` を直接書き換える。
`<input>` に `value` プロパティを渡さない**非制御コンポーネント**だからこそ、Reactの再描画を経ずに書き換えられる。

次章では `register` に `ref` を足し、値の読み書きをDOMのノードそのものに移す。

---
確度:
- 実ソース確認済み：`getProxyFormState.ts`のgetter実装、`shouldRenderFormState.ts`の判定式（`isRoot`分岐含む）、`_subscribe`が`shouldRenderFormState`の返り値でcallbackを呼び分けること、`setFieldValue`が`fieldReference.ref.value = fieldValue`でDOMへ直接書き込むこと（`src/logic/createFormControl.ts`）
- 履歴、PR由来：V7でのファイル切り出し（`9555d16f`、#3741、2021-04-01。この時点はまだ`Proxy`を使用）、`Proxy`から`Object.defineProperty`への書き換えと`isProxyEnabled`の削除（`a4b2c0ad`所収の#5999、2021-07-31）、`isRoot`安全弁の追加（`2adb9c08`、#13398、無関係なフィールドのバリデーションで`useWatch`が再描画する不具合の修正）
- 推測：`Proxy`をやめた具体的な理由（PR #5999本文に明記なし。`createFormControl`のReact分離と同時期だったことからの推測）
- 実行で確認（ミニ実装）：16件のテスト（`node --test`、Node.js 22.22、React 19.3、happy-dom）。うち1つは足りないものを確かめるもの
- 実行で確認（本物）：npmのreact-hook-form 7.88.0を同じテスト環境で動かし、`errors`だけを読むコンポーネントは`isDirty`の変化で再描画されず、`isDirty`を読むコンポーネントは再描画されること、`setValue`が`<input>`の`value`をDOM側で直接書き換えることを確認した
