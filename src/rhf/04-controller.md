# Controllerと名前で絞り込む購読

> 読んだ版：react-hook-form/react-hook-form `28334fa`（2026-09-23、タグ v7.88.0、package.jsonの版も7.88.0）の `src/useController.ts`、`src/controller.tsx`、`src/logic/shouldSubscribeByName.ts`
>
> この章のミニ実装：`code/rhf/04-controller/`（`code/rhf/` で `npm install` のあと `node --test "code/rhf/04-controller/*.test.ts"`）

前章の`register`は、DOMノードへの`ref`を頼りに値を書き込んでいた。

```ts
register("volume"); // refをどこにも渡していない
setValue("volume", "80");
// control._fields.volume が undefined のまま、画面には反映されない
```

スライダーや独自のセレクトボックスのような、UIライブラリの部品には`ref`が届かないことが多い。
この章の目標は、そうした部品にも値を届けることである。

```ts
const { field } = useController({ control, name: "volume" });
// <Slider value={field.value} onChange={field.onChange} />
```

`field.onChange`を呼ぶと`field.value`が更新され、そのフィールドだけが再描画される。

## controllerを足す

DOMノードがない以上、値はReactの`state`として持ち直すしかない。
まず、`control`に`register`のControlled版として`controller`を足す。

```ts
const controller = (name: string) => {
  _formValues[name] ??= "";
  const onChange = (value: string) => {
    _formValues[name] = value;
    _subjects.state.next({ name, values: { ..._formValues } });
    _updateIsDirty();
  };
  return { name, onChange };
};
```

`register`のonChangeと違い、`_subjects.state.next`に`name`を乗せる。
これが「どのフィールド向けの通知か」を運ぶ。

## 名前で絞り込むsubscribe

`name`を乗せただけでは、まだ全購読者に届いてしまう。
`_subscribe`に、通知の`name`と自分が欲しい`name`を突き合わせる関門を足す。

```ts
const _subscribe = (props: {
  name?: string;
  formState?: ReadState;
  callback: (diff: StateDiff) => void;
}) =>
  _subjects.state.subscribe({
    next: (diff) => {
      if (
        shouldSubscribeByName(props.name, diff.name) &&
        shouldRenderFormState(diff, props.formState ?? _proxyFormState)
      ) {
        props.callback(diff);
      }
    },
  }).unsubscribe;
```

`shouldSubscribeByName`は名前が一致するかだけを見る。

```ts
export default function shouldSubscribeByName(
  name: string | undefined,
  signalName: string | undefined,
) {
  return !name || !signalName || name === signalName;
}
```

名前を指定しない購読（`useForm`本体）は、この関門を素通りする。
もう一つの関門`shouldRenderFormState`には、`_proxyFormState`の代わりに`{ values: true }`という上書きを渡す。
`isDirty`や`errors`を読んでいなくても、`values`だけは無条件に通す指定である。
`useController`フックは、この2つの関門を使って`useState`を更新する。

```ts
const { onChange: controllerOnChange } = control.controller(name);
const [value, setValue] = useState(() => control._formValues[name] ?? "");

useEffect(() => control._subscribe({
  name,
  formState: { values: true },
  callback: () => setValue(control._formValues[name]),
}), [control, name]);
```

## テストで確かめること

`createFormControl.test.ts`に、名前で絞り込む関門のテストを5個足した。
違う名前への通知では`callback`が呼ばれないこと、`formState: { values: true }`を指定しない購読は`controller`の通知だけでは呼ばれないことを確かめている。
`useController.test.ts`では、`volume`と`balance`という2つの`useController`を並べて描画し、`volume`側の`onChange`を呼んでも`balance`側の再描画が起きないことを確認した。
この振る舞いは、実際のnpmパッケージ（react-hook-form 7.88.0、React 19.3、happy-dom）でも同じ構成のコンポーネントを描画し、同じ結果になることを確かめている。

## 本物と並べる

本物の`useController`は、値の取得を`useWatch`に、`fieldState`の取得を`useFormState`に委ねている。

```ts
const value = useWatch({ control, name, defaultValue, exact });
const formState = useFormState({ control, name, exact });
const onChange = (event) => {
  const value = getEventValue(event);
  return _registerProps.current.onChange({
    target: { value, name },
    type: EVENTS.CHANGE,
  });
};
```

`useWatch`の内部で、`control._subscribe`に`name`と`formState: { values: true }`を渡している構造は、ミニ実装とほぼ同じ形をしている。

| | ミニ実装 | 本物 |
| --- | --- | --- |
| 名前の一致判定 | 完全一致のみ | 前方一致（双方向）。`"addresses"`と`"addresses.0.city"`も一致する |
| onChangeの入力 | `field.onChange`はDOMイベントを1段階だけ剥がす | `getEventValue`がイベントか生の値かを判定してから渡す |
| 値の登録経路 | `controller`専用の関数 | `useController`内部でも`control.register`を呼び、`register`と同じ経路に合流する |

`register`と`controller`が最終的に同じ`register`関数へ合流する点は、ミニ実装では分けたままにしている。
FOCUS（購読の設計）から外れるため、今回は追わない。

## 本物はなぜ違うか

`Controller`コンポーネント自体は`fa5e71ca`「V4」（2019-12-23、#666）が初出で、V7の全面書き換え（2021-04-01）より1年以上前からある。
`useController`フックは後発で、`b675f819`（2020-12-10、#3488）で追加された。
`Controller`は以後、`props.render(useController(props))`を呼ぶだけの薄いラッパーになっている。

名前による絞り込み（`shouldSubscribeByName`）は、`Controller`の設計として生まれたのではない。
初出は`c1243995`「fix #6765 useFieldArray trigger validation by field name」（2021-10-12、#6768）で、配列フィールドの1項目に対するバリデーションが、別の名前を見ている購読者にまで届いてしまうバグの修正だった。
修正前は、`useWatch`が前方一致の判定をインラインで持つ一方、`useFormState`（`useController`が内部で使う）は完全一致でしか名前を比較していなかった。
この2つを`shouldSubscribeByName`として1つにまとめ、前方一致に統一したのが、この修正の中身である。
前方一致が双方向（`currentName.startsWith(signalName)`と`signalName.startsWith(currentName)`の両方）なのは、`"addresses"`を監視する購読者に配列の1項目の変化を、`"addresses.0.city"`を監視する購読者に配列全体の変化を、どちらも届けるためだと読める。
この双方向の一致は、配列・入れ子のパスを扱うために必要になったものであり、`Controller`単体の要件からは出てこない。

## 足りないもの

ミニ実装の`shouldSubscribeByName`は完全一致しか見ない。

```ts
control._subscribe({
  name: "addresses",
  formState: { values: true },
  callback: () => notified++,
});
controller("addresses.0.city").onChange("Tokyo");
// notified は 0 のまま。名前としては別物として扱われる
```

配列の要素ごとにフィールドを増減させ、その要素に名前を付けて購読するには、この前方一致に加えて、要素自体の管理が要る。
次章では、この配列フィールドの管理（`useFieldArray`）を扱う。

---
確度:
- 実ソース確認済み：`useController`が`useWatch`と`useFormState`を組み合わせて実装されていること、`onChange`が`getEventValue`でイベントと生の値を判定すること、`Controller`が`props.render(useController(props))`だけの薄いラッパーであること（`src/useController.ts`、`src/controller.tsx`）
- 履歴、PR由来：`Controller`の初出（V4、2019-12-23、#666）と`useController`の追加（2020-12-10、#3488）の時期差、`shouldSubscribeByName`が`useFieldArray`のバリデーション不具合の修正（2021-10-12、#6768）として生まれたこと、修正前は`useWatch`と`useFormState`で名前の一致判定が違っていたこと
- 推測：前方一致が双方向である理由（配列・入れ子のパスを両方向に一致させるためと読めるが、PR本文に明示的な記述はなく、コードの挙動からの読み取りにとどまる）
- 実行で確認（ミニ実装）：28件のテスト（`node --test`、Node.js 22.22、React 19.3、happy-dom）
- 実行で確認（本物）：npmのreact-hook-form 7.88.0を同じ環境（React 19.3、happy-dom）で動かし、`volume`と`balance`という2つの`useController`のうち、`volume`側だけに`onChange`を発生させると`volume`側だけが再描画されることを確認した
