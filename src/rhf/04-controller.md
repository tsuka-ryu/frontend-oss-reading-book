# Controllerと名前で絞り込む購読

> ここには、ほかの誰も入ることはできなかった。この入口は、おまえのためだけに定められていたのだから。さあ、わたしは行って、これを閉める。
>
> ——Franz Kafka「掟の前」（1915年、拙訳）

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

DOMノードがない以上、値はReactのstateとして持ち直すしかない。
ところが前章までの通知は「`formState`のどのキーを読んだか」で絞られていて、スライダーは`isDirty`も`errors`も読まない。
読んでいない部品に、どうやって通知を届けるのか。
届けたとして、隣のスライダーまで起こさずに済むのはなぜか。

## 一歩目：誰も描き直さない

まず素朴に、`useController`は描画のたびに`_formValues`を読むだけにする。
値を書くのは、`control`に足す`controller(name).onChange`である。

```ts
function useController({ name }: { name: string }) {
  const { onChange } = control.controller(name);
  const value = control._formValues[name];
  return { field: { name, value, onChange } };
}
```

スライダー役を描画し、`onChange("80")`を呼ぶ。

```text
_formValues: 80
field.value: ""
描画回数: 1
```

帳簿には`80`が入ったが、`field.value`は空のままで、描画は最初の1回きりである。
Reactは、stateが変わらない限りコンポーネントを描き直さない。
前章で`register`が狙って避けた性質に、ここでは足をすくわれている。

値を`useState`に持ち、`control`を購読して、通知が来たら読み直す。

```ts
const [value, setValue] = useState(
  () => control._formValues[name] ?? "");
useEffect(() => control._subscribe({
  callback: () => setValue(control._formValues[name]),
}), [control, name]);
```

## 二歩目：通知が関門で止まる

購読しても、通知を流す側がなければ何も来ない。
`controller`の`onChange`は、値を書いたら`_subjects.state.next`で知らせる。

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

`register`のonChangeと違い、通知に「どのフィールド向けか」を示す`name`を乗せる。

ところが、`_subscribe`を前章のままにして流すと、こうなる。

```text
volume への通知: 0
```

前章で作った関門`shouldRenderFormState`は、通知のキーのうち一つでも「読んだ」と記録されていれば通す。
記録があるのは`isDirty`と`errors`だけで、`name`と`values`は誰にも読まれたことになっていない。
関門は前章で決めたとおりに判定し、スライダー宛ての通知を捨てている。

直し方は二つある。
関門は`name`をキーとして数えないようにし、購読者は`_proxyFormState`（読んだキーの記録）の代わりに自分の指定を渡せるようにする。

```ts
useEffect(() => control._subscribe({
  formState: { values: true },
  callback: () => setValue(control._formValues[name]),
}), [control, name]);
```

`isDirty`や`errors`を読んでいなくても、`values`だけは無条件に通す指定である。

## 三歩目：隣のスライダーまで起きる

`volume`と`balance`を並べて購読し、`volume`だけを動かす。

```text
{ volume: 1, balance: 1 }
```

`balance`は何も変わっていないのに起こされた。
`values: true`は、どの名前の値の変化でも通す。
`_subscribe`に、通知の`name`と自分が欲しい`name`を突き合わせる関門をもう一つ足す。

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

同じ入力で、今度は`{ volume: 1, balance: 0 }`になる。
名前を指定しない購読（`useForm`本体）は、この関門を素通りする。
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

シグナルのパートでは、シグナルを読んだだけで、読んだ計算が名簿に載った。
ここでは読んだかどうかは誰も見ていない。
購読者が自分の名前を文字列で申告し、その文字列が一致した通知だけを受け取る。

## 確かめる

`createFormControl.test.ts`に、名前で絞り込む関門のテストを5個足した。
違う名前への通知では`callback`が呼ばれないこと、`formState: { values: true }`を指定しない購読は`controller`の通知だけでは呼ばれないことを確かめている。
`useController.test.ts`では、`volume`と`balance`という2つの`useController`を並べて描画し、`volume`側の`onChange`を呼んでも`balance`側の再描画が起きないことを確認した。
本物のnpmパッケージ（react-hook-form 7.88.0）で同じ構成を描画しても、同じ結果になる。

## 本物の useController と並べる

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

`useWatch`の内部は、`control._subscribe`に`name`と`formState: { values: true }`を渡す、ミニ実装とほぼ同じ形である。

| | ミニ実装 | 本物 |
| --- | --- | --- |
| 名前の一致判定 | 完全一致のみ | 前方一致（双方向）。`"addresses"`と`"addresses.0.city"`も一致する |
| onChangeの入力 | `field.onChange`はDOMイベントを1段階だけ剥がす | `getEventValue`がイベントか生の値かを判定してから渡す |
| 値の登録経路 | `controller`専用の関数 | `useController`内部でも`control.register`を呼び、`register`と同じ経路に合流する |

この合流は、FOCUS（購読の設計）から外れるため、ミニ実装では分けたままにした。

## 本物はなぜ違うか

`Controller`コンポーネント自体は`fa5e71ca`「V4」（2019-12-23、#666）が初出で、V7の全面書き換え（2021-04-01）より1年以上前からある。
`useController`フックは後発で、`b675f819`（2020-12-10、#3488）で追加された。
`Controller`は以後、`props.render(useController(props))`を呼ぶだけの薄いラッパーになっている。

名前による絞り込み（`shouldSubscribeByName`）は、`Controller`のために生まれたのではない。
初出は`c1243995`「fix #6765 useFieldArray trigger validation by field name」（2021-10-12、#6768）で、配列フィールドの1項目に対するバリデーションが、別の名前を見ている購読者にまで届いてしまうバグの修正だった。

修正前は、`useWatch`が前方一致の判定をインラインで持つ一方、`useFormState`（`useController`が内部で使う）は完全一致でしか名前を比較していなかった。
修正は、この2つを`shouldSubscribeByName`にまとめ、前方一致に統一した。

前方一致が双方向（`currentName.startsWith(signalName)`と`signalName.startsWith(currentName)`の両方）なのは、`"addresses"`を監視する購読者に配列の1項目の変化を、`"addresses.0.city"`を監視する購読者に配列全体の変化を、どちらも届けるためだと読める。
この双方向の一致は、配列・入れ子のパスを扱うために必要になったものであり、`Controller`単体の要件からは出てこない。

## おまえのためだけの入口

エピグラフは、Kafkaの寓話「掟の前」の結びである。
男は掟の門の前で入る許しを待ち続け、最期に門番から、この入口はおまえのためだけのものだったと告げられる。

`shouldSubscribeByName`が作っているのも、名前ごとの入口である。
`volume`の購読者には、`volume`宛ての通知しか入ってこない。
`useEffect`に渡した関数は`_subscribe`の戻り値（購読の解除）を返すので、コンポーネントが消えるとReactがそれを呼び、入口は閉じられる。

違うのは、入口が自分用だといつ知るかである。
寓話の男はそれを最期に告げられるが、`useController`は購読するときに自分で`name`を申告するので、最初から知っている。
しかも中に入る必要がなく、自分宛ての通知を受け取れば仕事は終わる。

もう一つ違うのは、本物の入口が「おまえのためだけ」ではないことである。
前方一致の関門では、`"addresses"`の入口から`"addresses.0.city"`の通知も入ってくる。
ミニ実装の完全一致のほうが、寓話の門には忠実である。

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

名前が`"addresses.0.city"`のように番号を含むとき、その番号は誰が振るのか。
2番目の住所を削除したら、3番目は`"addresses.1"`に振り直すのか。
振り直すなら、名前で絞った入口はどれも付け替えが要る。
本物では、この配列フィールドの管理を`useFieldArray`が受け持っている。
名前を鍵にした購読は、名前そのものが動き出したときにどうなるのか。

---
確度:
- 実ソース確認済み：`useController`が`useWatch`と`useFormState`を組み合わせて実装されていること、`onChange`が`getEventValue`でイベントと生の値を判定すること、`Controller`が`props.render(useController(props))`だけの薄いラッパーであること（`src/useController.ts`、`src/controller.tsx`）
- 履歴、PR由来：`Controller`の初出（V4、2019-12-23、#666）と`useController`の追加（2020-12-10、#3488）の時期差、`shouldSubscribeByName`が`useFieldArray`のバリデーション不具合の修正（2021-10-12、#6768）として生まれたこと、修正前は`useWatch`と`useFormState`で名前の一致判定が違っていたこと
- 推測：前方一致が双方向である理由（配列・入れ子のパスを両方向に一致させるためと読めるが、PR本文に明示的な記述はなく、コードの挙動からの読み取りにとどまる）
- 実行で確認（ミニ実装）：28件のテスト（`node --test`、Node.js 22.22、React 19.3、happy-dom）。一歩目から三歩目の直す前の版（描画時に`_formValues`を読むだけの`useController`、前章の関門のままの`_subscribe`、名前で絞らない`_subscribe`）は別に書いて`node`で動かし、本文の出力はその実出力である。三歩目を直した版の`{ volume: 1, balance: 0 }`も同じく実出力
- 実行で確認（本物）：npmのreact-hook-form 7.88.0を同じ環境（React 19.3、happy-dom）で動かし、`volume`と`balance`という2つの`useController`のうち、`volume`側だけに`onChange`を発生させると`volume`側だけが再描画されることを確認した
- 引用：原文は "Hier konnte niemand sonst Einlaß erhalten, denn dieser Eingang war nur für dich bestimmt. Ich gehe jetzt und schließe ihn."（Franz Kafka, *Vor dem Gesetz*, 1915）。訳は拙訳
