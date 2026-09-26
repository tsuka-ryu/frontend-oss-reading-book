# formStateのどのキーを読んだかを覚える

> そして、おまえが長く深淵をのぞきこむなら、深淵もまたおまえをのぞきこむ。
>
> ——Friedrich Nietzsche『善悪の彼岸』第146節（1886年、拙訳）

> 読んだ版：react-hook-form/react-hook-form `28334fa`（2026-09-23、タグ v7.88.0、package.jsonの版も7.88.0）の `src/logic/getProxyFormState.ts`、`src/logic/shouldRenderFormState.ts`、`src/useForm.ts`
>
> この章のミニ実装：`code/rhf/02-proxy-form-state/`（`code/rhf/` で `npm install` のあと `node --test "code/rhf/02-proxy-form-state/*.test.ts"`）

前章のミニ実装は、このコンポーネントを無駄に描き直す。

```tsx
function ErrorText() {
  const { formState } = useForm();
  return <p>{formState.errors.email}</p>; // isDirtyは読んでいない
}
```

`errors` しか読んでいないのに、`isDirty` が変わるたびに再描画される。
本物のReact Hook Formは再描画しない。

奇妙なのは、`useForm` の呼び出しには何を読むかが一言も書かれていないことである。
では、本物はどうやって「このコンポーネントは `isDirty` を読まなかった」と知るのか。

## 一歩目：読むキーを宣言させる

知らないなら、教えてもらえばよい。
`useForm` に読むキーを渡させ、購読の側でそのキーの変化だけを通す。

```ts
const _subscribe = (props: {
  keys: string[]; callback: () => void;
}) =>
  _subjects.state.subscribe({
    next: (diff) => {
      if (Object.keys(diff).some(
        (k) => props.keys.includes(k)))
        props.callback();
    },
  }).unsubscribe;
```

`useForm({ keys: ["errors"] })` と書けば、`isDirty` の変化では描き直さない。
ここで、宣言を `errors` のままにして、表示に `formState.isDirty` を足してみる。
1文字打ったあとはこうなる。

```
描画回数: 1
画面の isDirty: false
control の isDirty: true
```

宣言と実際の読み取りがずれると、画面が黙って古くなる。
Reactの `useEffect` の依存配列と同じ形の問題で、シグナルのパートの冒頭で見たとおり、あちらには書き忘れを見つけるlintルールまである。
それを、フォームのために作り直したことになる。

## 二歩目：読まれた側が書き留める

宣言をやめ、読み取りそのものを捕まえる。
プロパティへのアクセスは、`Object.defineProperty` で**getter**（プロパティを読むたびに呼ばれる関数）を仕込めば横取りできる。

```ts
export default function getProxyFormState(
  formState: FormState,
  proxyFormState: ProxyFormState,
) {
  const result = {} as FormState;
  for (const key of Object.keys(formState) as
    (keyof FormState)[]) {
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

キーごとに素通しのgetterを付けた別オブジェクト `result` を作り、値を返す前に `proxyFormState[key] = true` と書き込む。
`useForm` は `_formState` の写しをそのまま返す代わりに、これを通したものを返す。

```ts
const formStateProxy = useMemo(
  () => getProxyFormState(
    formState, control._proxyFormState),
  [control, formState],
);
return { ..._formControl.current,
  formState: formStateProxy };
```

`control._proxyFormState` は `{ isDirty: false, errors: false }` から始まる、controlごとに1個のオブジェクトである。
`ErrorText` で1文字打つと、こうなる。

```
記録: { isDirty: false, errors: true }
描画回数: 2
```

記録は正しいが、まだ描き直している。
書き留めただけで、誰もその記録を見ていない。

## 三歩目：通知の手前で記録を見る

記録を使って、通知を止める関数を作る。

```ts
export default function shouldRenderFormState(
  changed: Partial<FormState>,
  proxyFormState: ProxyFormState,
) {
  const keys = Object.keys(changed) as
    (keyof ProxyFormState)[];
  return keys.length === 0 ||
    keys.some((key) => proxyFormState[key]);
}
```

`changed` は `_subjects.state` に流れてきた差分（`{ isDirty: true }` のような部分オブジェクト）である。
そのキーのうち一つでも読まれたことがあれば、通知してよいと判断する。
ミニ実装では、キーを一つも含まない差分は、何が変わったかを言っていないので止める根拠がないとして通す（`some` だけだと `{}` に `false` を返す）。
`_subscribe` は、この返り値で `callback` を呼ぶかどうかを決める。

```ts
next: (diff) => {
  if (shouldRenderFormState(diff, _proxyFormState)) {
    props.callback();
  }
},
```

同じ操作の結果はこうなる。

```
記録: { isDirty: false, errors: true }
描画回数: 1
```

`_formState`（controlが持つ実体）は、この判定より前の、別の購読者がすでに書き換えている。
止めているのは、Reactの `updateFormState` を呼ぶかどうかだけである。

## 四歩目：あとから読みはじめたら

意地の悪い入力を試す。
エラーがあるときだけ `isDirty` を表示するので、最初の描画では `isDirty` を読まない。

```
入力"a"  描画1 記録{"isDirty":false,"errors":true} 表示:未読
setError 描画2 記録{"isDirty":true,"errors":true} 表示:true
入力""   描画3 記録{"isDirty":true,"errors":true} 表示:false
```

壊れない。
読まれていないキーは画面に出ていないので、変化を見逃しても古くなりようがない。
読みはじめるのは描画の最中で、そのとき `formState` は最新の写しである。

逆向きは少し事情が違う。
エラーを消して `isDirty` をもう読まなくしても、記録は `true` のまま残り、`isDirty` の変化で1回余分に描き直す（`描画回数: 3` が `4` になる）。
シグナルのパートでは、使わなくなった依存を外す仕組みに1章を使った。
この記録には消す手段がない。
本物の7.88.0でも、`_proxyFormState` のキーに代入しているのは `getProxyFormState` のgetterだけで、書く値は真か `"all"` である（ソースを検索して確かめた）。
余分な再描画は、古い表示より害が小さい。
本物がこれで済ませている理由はそこにあると考えられるが、推測である。

## 確かめる

テストは16個ある。
controlの購読（5個）と `useForm` の描画（6個）に、`getProxyFormState`（2個）と `shouldRenderFormState`（3個）の単体テストを足した。

中心は次の2つである。
`errors` だけを読むコンポーネントは、入力で `isDirty` が変わっても再描画しない。
`isDirty` を読むコンポーネントは、同じ入力で再描画する。

## 本物と並べる

本物の `getProxyFormState.ts` は、ミニ実装と同じ形のgetterを使う。

```ts
Object.defineProperty(result, key, {
  get: () => {
    const _key = key as keyof FormState<TFieldValues>
      & keyof ReadFormState;
    if (control._proxyFormState[_key] !==
        VALIDATION_MODE.all) {
      control._proxyFormState[_key] =
        !isRoot || VALIDATION_MODE.all;
    }
    localProxyFormState &&
      (localProxyFormState[_key] = true);
    return formState[_key];
  },
});
```

違うのは、`true` の代わりに `isRoot`（ルートの `useForm` 由来かどうか）で書く値を分けている点と、`localProxyFormState` という2つ目の記録先を持てる点である。
`useController` や `useWatch` は自分専用の記録先を持てるため、同じcontrolを複数のhookが共有しても、それぞれが読んだキーだけで再描画を判断できる。
ミニ実装は `useForm` しか作っていないので、記録先は1つに絞った。

本物の `shouldRenderFormState.ts` も、判定の中心は同じである。

```ts
return (
  !keys.length ||
  (isRoot &&
    keys.length >= Object.keys(_proxyFormState).length) ||
  keys.find(
    (key) =>
      _proxyFormState[key as keyof ReadFormState] ===
      (!isRoot || VALIDATION_MODE.all),
  )
);
```

真ん中の条件が、ミニ実装にはない安全弁である。
変化したキーの数が記録している全キー数以上になったとき（`reset()` のように、ほぼ全部のキーが一度に変わるとき）は、個々のキーを見ずに再描画する。
ただし `isRoot` が真のとき、つまり `useForm` 本体の購読に対してだけである。

| | ミニ実装 | 本物 |
| --- | --- | --- |
| 読んだキーの記録 | `Object.defineProperty` によるgetter | 同じ（過去に`Proxy`だった時期がある。次節） |
| 記録先 | `control._proxyFormState` の1か所 | `control._proxyFormState`（ルート）＋hookごとの`localProxyFormState` |
| 通知の判定 | 変化したキーが読まれているか | 同じ＋「ほぼ全部変わったら無条件」の安全弁（`isRoot`時のみ） |

## 本物はなぜ違うか

二つのファイルは、V7への全面書き換え（コミット `9555d16f`、2021-04-01、PR #3741）で今の場所に切り出された。
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

`isProxyEnabled` は `'Proxy' in window` を見るだけの判定で、使えない環境では素の `formState` を返し、最適化をあきらめていた。
このパターンはV7より前の `useForm.ts` にもあり、V7がしたのは独立したファイルへの切り出しだけだった。

3か月後のコミット `a4b2c0ad`（PR #5958、2021-07-31、v7.13.0）に含まれるサブPR #5999で、`Proxy` は今のgetterに置き換わり、`isProxyEnabled` はファイルごと削除された。
PR #5999の本文は「use basic getter api of js instead」とだけあり、理由（対応環境の違いか、バンドルサイズか）は書かれていない。
`createFormControl` をReactから切り離した同じコミットの一部であることから、環境を選ぶAPIをやめて挙動をそろえる意図があったと考えられるが、推測である。
`getProxyFormState` という名前だけが、`Proxy` を使っていた時期の名残として残っている。

`isRoot` による分岐は、2026年のコミット `2adb9c08`（PR #13398）で入った。
それまでは、ほぼ全部のキーが変わったときの無条件再描画が、`useWatch` のようなルート以外の購読者にもかかっていた。
無関係なフィールドのバリデーションが多くのキーを一度に変えると、値だけを見ているはずの `useWatch` まで再描画する不具合があり、その修正として `isRoot &&` の1条件が足された。

## 深淵はのぞき返すか

エピグラフは、のぞく者がのぞかれる側になるという一文である。
`formState` を読むコンポーネントは、値をのぞいているつもりでいる。
実際には、読んだ瞬間に `formState` の側が「このキーは読まれた」と書き留め、それが以後そのコンポーネントをいつ描き直すかを決める。
のぞいた結果、変わるのはのぞいた側の扱いである。

違いは三つある。
getterは、読まれたときにだけ同期して走る関数で、自分から見返しに来ることはない。
記録するのは何を読んだかで、誰が読んだかではない（誰が、は記録先を分けることで表す。ミニ実装ではcontrolごとに1つ、本物ではそれに加えてhookごとの `localProxyFormState` がある）。
そして「長く」のぞく必要がない。
一度読めば、四歩目で見たとおり、記録は二度と消えない。

## 足りないもの

`_formValues` は `onChange` が呼ばれたときしか書き換わらず、逆に `_formValues` から `<input>` へ書き戻す手段がない。

```ts
log.form.control._formValues.email =
  "prefilled@example.com";
// <input>のvalueはこれで変わらない
```

本物の `register` は `ref` を返し、そのDOMノードへの参照を保つ。
`setValue` や `reset` は、この `ref` を使って `input.value` を直接書き換える。
`<input>` に `value` プロパティを渡さない**非制御コンポーネント**だからこそ、Reactの再描画を経ずに書き換えられる。

前章で、画面に見えている値はReactのstateではないと書いた。
では、その値はライブラリとブラウザのどちらが持っているのか。
次章では `register` に `ref` を足し、値の読み書きをDOMのノードそのものに移す。

---
確度:
- 実ソース確認済み：`getProxyFormState.ts`のgetter実装、`shouldRenderFormState.ts`の判定式（`isRoot`分岐含む）、`_subscribe`が`shouldRenderFormState`の返り値でcallbackを呼び分けること、`setFieldValue`が`fieldReference.ref.value = fieldValue`でDOMへ直接書き込むこと（`src/logic/createFormControl.ts`）、`_proxyFormState` のキーへの代入がgetterの中だけで、書く値が真か `"all"` であること（`src` をgrepで検索）
- 履歴、PR由来：V7でのファイル切り出し（`9555d16f`、#3741、2021-04-01。この時点はまだ`Proxy`を使用）、`Proxy`から`Object.defineProperty`への書き換えと`isProxyEnabled`の削除（`a4b2c0ad`所収の#5999、2021-07-31）、`isRoot`安全弁の追加（`2adb9c08`、#13398、無関係なフィールドのバリデーションで`useWatch`が再描画する不具合の修正）
- 推測：`Proxy`をやめた具体的な理由（PR #5999本文に明記なし。`createFormControl`のReact分離と同時期だったことからの推測）、記録を消さずに済ませている理由（明文の記述は探していない）
- 実行で確認（ミニ実装）：16件のテスト（`node --test`、Node.js 22.22、React 19.3、happy-dom）。うち1つは足りないものを確かめるもの
- 実行で確認（途中の版）：一歩目の宣言版と、二歩目の記録だけして判定しない版を別に書き、同じReactとhappy-domで動かした。本文の出力はその実出力である。三歩目の描画回数、`{}` に対する `some` だけの判定、四歩目の条件付きの読み取りと記録が残ることは、`code/rhf/02-proxy-form-state/` をそのまま動かして確かめた
- 実行で確認（本物）：npmのreact-hook-form 7.88.0を同じテスト環境で動かし、`errors`だけを読むコンポーネントは`isDirty`の変化で再描画されず、`isDirty`を読むコンポーネントは再描画されること、`setValue`が`<input>`の`value`をDOM側で直接書き換えることを確認した
- 引用：原文は "Und wenn du lange in einen Abgrund blickst, blickt der Abgrund auch in dich hinein."（*Jenseits von Gut und Böse*, 第146節、1886年）。訳は拙訳。原典の版とは今回照合していない
