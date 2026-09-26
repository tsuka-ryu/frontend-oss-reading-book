# registerと非制御コンポーネント

> 道常無為而無不為
>
> 道は常に無為にして、而も為さざるは無し。
>
> ——『老子』第37章

> 読んだ版：react-hook-form/react-hook-form `28334fa`（2026-09-23、タグ v7.88.0、package.jsonの版も7.88.0）の `src/logic/createFormControl.ts` の `register` 関数、`src/logic/getFieldValue.ts`
>
> この章のミニ実装：`code/rhf/03-register-and-uncontrolled/`（`code/rhf/` で `npm install` のあと `node --test "code/rhf/03-register-and-uncontrolled/*.test.ts"`）

前章までのミニ実装には、まだ`setValue`がなかった。
値を外から書き戻す手段がなく、`_formValues`を直接書き換えても`<input>`の表示は変わらなかった。

```ts
control._formValues.email = "prefilled@example.com";
// <input>のvalueはこれで変わらない
```

この章の目標は、次の1行で`<input>`の表示が実際に変わるようにすることである。

```ts
form.setValue("email", "prefilled@example.com");
```

ここで一つ条件がある。
`<input>`には`value`プロパティを渡さない。

`value`を渡して、表示する値をReactのstateから毎回決める入力欄を**制御コンポーネント**という。
渡さずに、値を入力欄（DOMノード）自身に持たせておく入力欄を**非制御コンポーネント**という。
React Hook Formは後者を選んでいる。

Reactのためのライブラリが、値をReactに持たせない。
では、Reactに何も頼まずに、どうやって画面の値を書き換えるのか。

## 一歩目：キャッシュに書いても画面は知らない

まず素朴に、`setValue`は`_formValues`に書くだけにする。

```ts
const setValue = (name: string, value: string) => {
  _formValues[name] = value;
};
```

`<input>`の代わりに`{ value: "" }`というオブジェクトを置き、`register("email")`のあとで`setValue`を呼ぶ。

```text
_formValues: prefilled@example.com
input.value: ""
```

フォームの帳簿は書き換わったが、入力欄は空のままである。
当然で、`control`は入力欄への参照を一つも持っていない。
Reactの再描画を経ずに画面を変えるには、DOMノードそのものを掴んで書き換えるしかない。

シグナルのパートで作った`writeSignal`は、書き込むと名簿の全員を実行し直した。
ここで欲しいのは名簿ではなく、書き込み先のノードそのものである。

## 二歩目：掴んだが、最初の値を入れていない

`register`が返すオブジェクトに`ref`コールバックを足す。
Reactは、DOMノードを繋いだときにこの関数をノードを引数にして呼ぶ。

```ts
const ref = (instance: FieldRef) => {
  _fields[name] = instance;
};
// setValue の中
_fields[name].value = value;
```

`_fields`は、名前ごとに実際のDOMノードを保持するオブジェクトである。
これで`setValue`は画面に届く。
ただし、`defaultValues: { email: "a@b" }`で作ったフォームに繋ぐと、こうなる。

```text
_formValues: a@b
input.value: ""
setValue後: prefilled@example.com
```

`setValue`を呼べば書き換わるが、それまでは空欄である。
初期値は帳簿にしかなく、ノードを掴んだ瞬間に誰もそれを入力欄に写していない。
直すのは1行で、掴んだときに書く。

```ts
_fields[name] = instance;
instance.value = _formValues[name]; // 初期値をDOMへ書き込む
```

## 三歩目：外れたノードを握ったまま

Reactは、DOMノードを外すときにも同じ`ref`を呼ぶ。
今度の引数は`null`である。
素朴な版は、その`null`を律儀に`_fields`へしまう。
アンマウントのあとで`setValue`を呼ぶと、こうなる。

```text
input.value: a@b
TypeError: Cannot set properties of null (setting 'value')
```

入力欄を閉じたあとにフォームの値を書き戻すだけで、例外が飛ぶ。
`null`を「書き込み先を手放せ」という合図として読むように直す。

```ts
const ref = (instance: FieldRef | null) => {
  if (instance) {
    _fields[name] = instance;
    instance.value = _formValues[name];
  } else {
    delete _fields[name]; // アンマウント：書き込み先を手放す
  }
};
```

`setValue`の側も、書き込み先があるときだけ書く。

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
この`if (field)`が、あとで「足りないもの」の入口になる。

## 確かめる

テストは全部で20個ある。
中心になるのは、`register("email").ref(node)`でDOMノードを渡したあと、`setValue("email", "...")`を呼ぶと、そのノードの`value`が直接書き換わることである。
`<input>`に`value`プロパティを渡さずに描画し、`act(() => form.setValue(...))`のあとで`input.value`を読むテストでも、同じことをブラウザに近い環境（happy-dom）で確かめている。

もう一つ、`ref`をどこにも渡さなかった場合のテストもある。
`_formValues`のキャッシュは更新されるが、`_fields`に書き込み先がないため、画面には何も反映されない。

## 本物の ref と並べる

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

省いたのは、同じ名前の選択肢を一つの束にまとめ直す処理である。
`null`で外れを知るという三歩目の骨格は同じで、違いは、`_fields`から消す代わりに`mount = false`の印を付ける点にある。

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

入力欄の種類ごとに、値がDOMのどこにあるかを知っている関数である。

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

その立ち位置を表す言葉は変わっている。
READMEの機能一覧は2019年、「uncontrolled form validation」という項目を持っていた。
1年後のコミット（2020-05-26）で、この1行は「native form validation」に書き換えられた。
差分はこの1行だけで、理由を説明する記述は見つからなかった。
推測になるが、「Reactの制御／非制御」という枠組みではなく、「HTMLの入力要素をそのまま使う」という立ち位置を強調する言い換えだったのではないか。

アンマウントの検知方法も変わっている。
V7より前は、DOMから要素が取り除かれたことを`MutationObserver`（DOMの変化を監視するブラウザの仕組み）で見張っていた。
V7の全面書き換え（2021-04-01、PR #3741）でこの監視は削除され、`ref`コールバックが`null`で呼ばれること自体を合図にする、今の形に変わった。
三歩目で例外を出してから足した`else`の枝は、本物ではV7まで別の仕組みが受け持っていたことになる。
PR本文には、この一点についての理由の記載はなかった。

## 何もしないで、フォームが動く

エピグラフの『老子』第37章は、道は常に何も為さないが、それでいて為されないことはない、と言う。

非制御コンポーネントのReactは、この形にかなり近い。
入力欄の値について、Reactは何もしない。
値のためのstateを持たず、値が変わったことを理由に再描画もしない。
それでも文字は入力欄に入り、フォームは動く。
入力された文字を保持しているのはブラウザのDOMノードで、Reactの出番はもともとない。

違うのは、React Hook Form自身は無為ではないという点である。
`ref`で入力欄を一つずつ掴み、`setValue`では横からDOMノードに値を書き込み、`onChange`では種類ごとに値を読み直す。
Reactに何もさせないために、ライブラリの側が裏で手を動かしている。
何も為さないのはReactだけで、その分の仕事は`ref`の向こうに移っただけである。

## 足りないもの

ミニ実装の`_fields`は、渡された`instance`が`{ value: string }`を持つ前提で書き込む。
`<input>`のようなネイティブ要素なら成り立つが、`ref`を転送しない関数コンポーネント（多くのUIライブラリの独自部品がこれにあたる）を渡すと、`ref`コールバック自体が実体を受け取れない。

```ts
register("volume"); // refをどこにも渡していない
setValue("volume", "80");
// control._formValues.volume は更新されるが、
// control._fields.volume は undefined のまま
```

三歩目で足した`if (field)`は、例外を出さずに黙って何もしない。
帳簿は書き換わり、画面はそのままで、エラーも出ない。
掴むべきDOMノードがない部品に、値はどうやって届けるのか。
DOMノードに頼れないなら、残る置き場所はReactのstateしかない。
しかしそれでは、この章で避けた再描画を呼び戻すことになる。
フォーム全体を巻き込まずに、その部品一つだけを再描画させる方法はあるのか。

---
確度:
- 実ソース確認済み：`register`の`ref`コールバックがDOMノードを`_fields`（本物は`field._f.ref`）に保持すること、`getFieldValue.ts`の要素ごとの出し分け、`onChange`が`target.type`を見て`getFieldValue`で読み直すこと（`src/logic/createFormControl.ts`）、`MutationObserver`が現行ソースに存在しないこと
- 履歴、PR由来：READMEの「uncontrolled form validation」追加（2019-05-25）と「native form validation」への書き換え（2020-05-26）、`MutationObserver`の初出（最初期のコミット群）とV7での削除（2021-04-01、PR #3741）、`getFieldValue.ts`がV7より前から存在すること（`git log --follow`）
- 推測：「uncontrolled」から「native」への言い換えの理由、`MutationObserver`を削除した具体的な理由（どちらもPR本文に明記なし）
- 実行で確認（ミニ実装）：20件のテスト（`node --test`、Node.js 22.22、React 19.3、happy-dom）。うち1つは足りないものを確かめるもの。一歩目から三歩目の直す前の版（キャッシュにしか書かない`setValue`、初期値を書かない`ref`、`null`をしまう`ref`）は別に書いて`node`で動かし、本文の出力はその実出力である
- 実行で確認（本物）：npmのreact-hook-form 7.88.0を同じ環境で動かし、`setValue`が`<input>`の`value`とチェックボックスの`checked`をどちらもDOMへ直接書き込み、`getValues()`にも反映されることを確認した
- 引用：原文「道常無為而無不為」（『老子』第37章）。書き下しは通行の読みによる
