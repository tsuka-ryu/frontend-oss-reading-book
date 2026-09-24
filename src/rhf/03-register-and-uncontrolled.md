# registerと非制御コンポーネント

> 読んだ版：react-hook-form/react-hook-form `28334fa`（2026-09-23、タグ v7.88.0、package.jsonの版も7.88.0）の `src/logic/createFormControl.ts` の `register` 関数、`src/logic/getFieldValue.ts`
>
> この章のミニ実装：`code/rhf/03-register-and-uncontrolled/`（`code/rhf/` で `npm install` のあと `node --test "code/rhf/03-register-and-uncontrolled/*.test.ts"`）

前章までのミニ実装には、まだ`setValue`がなかった。
値を外から書き戻す手段がなく、`_formValues`を直接書き換えても`<input>`の表示は変わらなかった。

```ts
control._formValues.email = "prefilled@example.com";
// <input>のvalueはこれで変わらない
```

この章の目標は、次のコードで`<input>`の表示が実際に変わるようにすることである。

```ts
form.setValue("email", "prefilled@example.com");
```

`<input>`には`value`プロパティを渡していない。
Reactの再描画を経ずに画面を変えるには、DOMノードそのものを書き換えるしかない。

## registerにrefを足す

`register`が返すオブジェクトに`ref`コールバックを足す。
Reactは、DOMノードが繋がったとき・外れたときにこの関数を呼ぶ。

```ts
const register = (name: string) => {
  _formValues[name] ??= "";
  const ref = (instance: FieldRef | null) => {
    if (instance) {
      _fields[name] = instance;
      instance.value = _formValues[name]; // 初期値をDOMへ書き込む
    } else {
      delete _fields[name]; // アンマウント：書き込み先を手放す
    }
  };
  return { name, onChange, ref };
};
```

`_fields`は、名前ごとに実際のDOMノードを保持するオブジェクトである。
`instance`が`null`で呼ばれるのは、そのノードがアンマウントされたときで、書き込み先を手放す合図になる。

これで`setValue`が書ける。

```ts
const setValue = (name: string, value: string) => {
  _formValues[name] = value;
  const field = _fields[name];
  if (field) {
    field.value = value; // Reactを介さず、DOMノードへ直接書く
  }
  _updateIsDirty();
};
```

`_formValues`への書き込みは残したままにする。
`getValues`のようにキャッシュだけを読む機能のために、DOMノードとは別に値を持っておく。

## テストで確かめること

テストは全部で20個ある。
中心になるのは、`register("email").ref(node)`でDOMノードを渡したあと、`setValue("email", "...")`を呼ぶと、そのノードの`value`が直接書き換わることである。
`<input>`に`value`プロパティを渡さずに描画し、`act(() => form.setValue(...))`のあとで`input.value`を読むテストでも、同じことをブラウザに近い環境（happy-dom）で確かめている。

もう一つ、`ref`をどこにも渡さなかった場合のテストもある。
`_formValues`のキャッシュは更新されるが、`_fields`に書き込み先がないため、画面には何も反映されない。

## 本物と並べる

本物の`register`が返す`ref`コールバックは、チェックボックスやラジオボタンの束ね方まで扱うぶん長い。
本質だけを抜くと、ミニ実装と同じ形をしている。

```ts
ref: (ref: HTMLInputElement | null): void => {
  if (ref) {
    // ...チェックボックス・ラジオボタンの束ね直しは省略
    const newField = { ...field._f, ref };
    set(_fields, name, { _f: newField });
    updateValidAndValue(name, false, undefined, ref);
  } else {
    field = get(_fields, name, {});
    if (field._f) {
      field._f.mount = false; // アンマウント：以後の対象から外す
    }
  }
},
```

値の読み取り側、`getFieldValue.ts`はこうなっている。

```ts
export default function getFieldValue(_f: Field['_f']) {
  const ref = _f.ref;
  if (isFileInput(ref)) return ref.files;
  if (isRadioInput(ref)) return getRadioValue(_f.refs).value;
  if (isMultipleSelect(ref)) {
    return [...ref.selectedOptions].map(({ value }) => value);
  }
  if (isCheckBox(ref)) return getCheckboxValue(_f.refs).value;
  return getFieldValueAs(ref.value, _f);
}
```

| | ミニ実装 | 本物 |
| --- | --- | --- |
| DOMノードの保持 | `_fields[name]`にノード1個 | `field._f.ref`（単数）＋`field._f.refs`（ラジオ・チェックボックスの束） |
| 値の読み方 | 常に`.value` | 要素の種類ごとに`files`・`checked`・`selectedOptions`・`.value`を出し分け |
| アンマウントの検知 | `ref`が`null`で呼ばれる | 同じ。ただし過去には別の仕組みがあった（次節） |

`onChange`にも違いがある。
本物は、イベントが来た要素にネイティブの`type`があれば、渡された`event.target.value`を信用せず`getFieldValue`で読み直す。
チェックボックスやラジオボタンは、変化したのが自分以外の選択肢でも`onChange`が呼ばれるため、イベントの値だけでは正しい状態を再構成できないからである。
ミニ実装は`<input type="text">`しか想定しないため、この読み直しは省いた。

## 本物はなぜ違うか

`getFieldValue.ts`の要素ごとの出し分けは、後から足された機能ではない。
`git log --follow`で追える最初期のコミットからすでに存在し、V7の全面書き換えより前からある。
値の読み書きをReactのstateではなくDOMノードそのものに委ねるという設計は、このライブラリの立ち上げ当初からの前提だったことになる。

その立ち位置を表す言葉も変わっている。
READMEの機能一覧は2019年、「uncontrolled form validation」という項目を持っていた。
1年後のコミット（2020-05-26）で、この1行は「native form validation」に書き換えられた。
差分はこの1行だけで、理由を説明する記述は見つからなかった。
推測になるが、「Reactの制御／非制御」という枠組みではなく、「HTMLの入力要素をそのまま使う」という立ち位置を強調する言い換えだったのではないか。

アンマウントの検知方法も変わっている。
V7より前は、DOMから要素が取り除かれたことを`MutationObserver`で監視していた。
V7の全面書き換え（2021-04-01、PR #3741）でこの監視は削除され、`ref`コールバックが`null`で呼ばれること自体を合図にする、今の形に変わった。
「外部から見張る」から「Reactが教えてくれる」への切り替えだが、PR本文にはこの一点についての理由の記載はなかった。

## 足りないもの

ミニ実装の`_fields`は、渡された`instance`が`{ value: string }`を持つ前提で書き込む。
`<input>`のようなネイティブ要素なら成り立つが、`ref`を転送しない関数コンポーネント（多くのUIライブラリの独自部品がこれにあたる）を渡すと、`ref`コールバック自体が実体を受け取れない。

```ts
register("volume"); // refをどこにも渡していない
setValue("volume", "80");
// control._formValues.volume は更新されるが、
// control._fields.volume は undefined のまま
```

内部のキャッシュは書き換わるのに、画面に反映する手段がない。
次章では、DOMノードへの参照が使えない場面のために、値を`props`として渡す`Controller`を足す。

---
確度:
- 実ソース確認済み：`register`の`ref`コールバックがDOMノードを`_fields`（本物は`field._f.ref`）に保持すること、`getFieldValue.ts`の要素ごとの出し分け、`onChange`が`target.type`を見て`getFieldValue`で読み直すこと（`src/logic/createFormControl.ts`）、`MutationObserver`が現行ソースに存在しないこと
- 履歴、PR由来：READMEの「uncontrolled form validation」追加（2019-05-25）と「native form validation」への書き換え（2020-05-26）、`MutationObserver`の初出（最初期のコミット群）とV7での削除（2021-04-01、PR #3741）、`getFieldValue.ts`がV7より前から存在すること（`git log --follow`）
- 推測：「uncontrolled」から「native」への言い換えの理由、`MutationObserver`を削除した具体的な理由（どちらもPR本文に明記なし）
- 実行で確認（ミニ実装）：20件のテスト（`node --test`、Node.js 22.22、React 19.3、happy-dom）。うち1つは足りないものを確かめるもの
- 実行で確認（本物）：npmのreact-hook-form 7.88.0を同じ環境で動かし、`setValue`が`<input>`の`value`とチェックボックスの`checked`をどちらもDOMへ直接書き込み、`getValues()`にも反映されることを確認した
