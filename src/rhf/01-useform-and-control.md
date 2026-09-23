# 全体構造：useFormとcontrolオブジェクト

`useForm` は、`register`、`handleSubmit`、`formState` など、フォームに必要なものを一式返すフックである。
中身を見ずに使っていると、フィールドの値もエラーも全部Reactのstateとして持っていて、何かが変わるたびに`useForm`を呼んでいるコンポーネントごと再描画される、よくあるカスタムフックの一種だろうと考えたくなる。

しかし数百のフィールドを並べた大きなフォームで一文字ずつ入力してみると、その理解とは違う挙動に気づく。
1つの`input`に文字を打っても、フォーム全体が再描画されるわけではない。
値そのものがReactのstateなら、値が変わるたびに再描画が起きるはずである。
再描画が起きないということは、値はどこかReactのstateの外に置かれている。

## 値を持っているのはどこか

その置き場所が`control`である。
`useForm`本体の仕事は薄く、フィールドの値やバリデーションの状態を実際に持っているのは`createFormControl`という関数で、こちらはコアロジックを1本にまとめた別のモジュール（2,256行）に置かれている。
このファイルの冒頭のimportに`react`は現れない。
Reactの型もhookも使わない、ただのTypeScript関数である。

```ts
const _formControl = React.useRef<
  UseFormReturn<TFieldValues, TContext, TTransformedValues> | undefined
>(undefined);
// ...（formControlプロパティが渡された場合の分岐を省略）

if (!_formControl.current) {
  const { formControl, ...rest } = createFormControl(props);
  _formControl.current = { ...rest, formState };
}

const control = _formControl.current.control;
control._options = props;
```

`useForm`がしているのは、`createFormControl`の戻り値を`useRef`に一度だけ詰め込むことと、再レンダーのたびに最新の`props`をcontrolへ反映することだけである。
`control`は、フィールドの参照や現在値、バリデーション結果といった内部状態をgetter・setterとして公開したオブジェクトで、コンポーネントが何度再描画されても同じ参照のまま生き続ける。

## 再描画はどこから起きるか

値そのものはReactの外にあるとして、画面の更新はどこから起きるのか。
`control`の内部には購読の仕組みがあり、値やエラーが変わるたびにそこへ通知が流れる。
`useForm`はエフェクトの中でこの購読先に登録し、通知を受け取ったときだけ、本物の`useState`のsetterを呼ぶ。
再描画のトリガーは、この1本の登録だけに絞られている。
`register`で登録した`input`への書き込みは、まずcontrolの中の値を直接書き換え、再描画が必要だと判定された場合に限って、この登録済みのsetterを通って`useForm`側に伝わる。

`useController`や`useWatch`のような他のフックも、`useFormContext`が配る同じ`control`を受け取って動く。
1つのフォームにつき`control`は1つしか作られず、どのフックも同じ通知先を見ている。

## controlを切り出したという判断

この分離は最初からあったわけではない。
2021年7月のプルリクエスト#5958で、`useForm`本体から1,200行を超えるロジックが`createFormControl`へ切り出された。
プルリクエストの説明はこの切り出しの狙いを「more js and less react for performance reasons」と述べている。
同じプルリクエストには、深くネストしたフィールド構成（2000×2×2000）でキー入力の反映にかかる時間が2000msから550msに縮んだという計測値も添えられている。
Reactのstate更新とレンダーサイクルを経由しなければ値を読み書きできない設計から、値の保管と読み書きをプレーンなオブジェクトに任せ、Reactは再描画が要るときだけ呼び出す設計に切り替えた変更である。

通知の仕組み自体はこれより前からある。
2020年12月のプルリクエスト#3736で導入された購読の仕組みは、当初は「アンマウント判定用の余計なrefを避ける」という狭い目的のためのものだった。
2021年4月のv7への全面書き換えを経て、この小さな仕組みが`control`全体の再描画通知を担う土台になった。
性能を理由にした大きな切り出しの前に、小さな通知の仕組みがすでに存在していた、という順序になる。

controlという1つの可変なオブジェクトにフォームの状態を集め、Reactのstateはその上に薄く乗せる。
値がどこに書き込まれ、どこで再描画の判定が打ち切られるのかは、`register`の実装に立ち入らないと見えてこない。
どのキーが読まれたかを覚えておいて再描画を絞り込む仕組みも、次章の話題になる。

---
確度:
- 実ソース確認済み：`useForm`のuseRefパターン、`createFormControl`がreactをimportしないこと、`control`がgetter・setterで内部状態を公開する構造、値の書き込みが登録済みのsetter経由でしかReactのstateに届かないこと
- 履歴、PR由来：controlの分離（PR #5958、2021-07-31、v7.13.0）とその理由、性能計測値（PR本文）。購読の仕組みの初出（PR #3736、2020-12-20）とv7全面書き換え（PR #3741、2021-04-01）
- 推測：`useController`などがcontrolを引数優先・Context次点で受け取る設計がいつどの目的で入ったかは、明文の記述が見つからず特定できていない
