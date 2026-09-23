# rhf パス3: 履歴・PR調査メモ

## controlオブジェクトの分離（v7.13.0）

- コミット `a4b2c0ad` 2021-07-31「General performance enhancement and enhanced useWatch, watch, getValues and etc」(#5958)
- タグ `v7.13.0` に含まれる
- このコミットで `src/logic/createFormControl.ts` が新設され、`useForm.ts` は1256行の削減（diffで `useForm.ts | 1256 +-------------------`）
- PR本文（GitHub、#5958）から:
  - 「The current design tight user inputs reference with value, however, this also has an impact on deeply nested input value lookup, with the new value store. We can skip that nested value lookup and straightway access the value store.」— 深くネストしたフィールドで値を読むたびに入力の参照をたどっていた設計をやめ、専用の値ストアを直接読む方式にした
  - 別の貢献として「create form control move logic into its own factory function」を挙げ、その狙いを「more js and less react for performance reasons」としている
  - 計測値: 2000×2×2000フィールドの深いネストで、キー入力からの反映が2000msから550msに短縮（PR本文の記載）
- この時点で `createFormControl` はReactのimportを一切持たないプレーンな関数になった（現行v7.88.0のソースでも同様、`grep -i react src/logic/createFormControl.ts` の import 行に該当なし）

## Subject（Pub/Sub）の導入時期

- 初出コミット `8aec47d3` 2020-12-20「introduce Subject to avoid extra ref for the unmount check and useFormState」(#3736)
  - この時点ではcontrolオブジェクトはまだ存在せず、目的も「アンマウント判定用の余計なrefを避ける」「useFormStateのため」という限定的なもの
- `9555d16f` 2021-04-01「V7」(#3741) でv7への全面書き換えが行われ、Subjectはこの中で再整理されている
- `d3be33ff` 2021-10-23「change subject from class to function base to improve readability and reduce size」(#6843) でクラスベースから現行の関数ベース（`createSubject`）へ変更。可読性とバンドルサイズの縮小が理由（コミットメッセージ原文）
- controlオブジェクトの分離（v7.13.0、2021-07-31）は、Subject導入（2020-12）より後に起きている。Subjectという小さな通知の仕組みが先にあり、その上にcontrolという大きな分離が乗った、という順序になる

## controlをContext経由で配る設計

- `useFormContext`/`FormProvider`（`src/useFormContext.tsx`）は `control` を含む `methods` をContextで渡す
- `useController`/`useWatch`/`useFormState` はいずれも `control` を明示的な引数として受け取るか、Context経由の `useFormControlContext()` にフォールバックする
- この二重の受け取り方（引数優先、Contextはフォールバック）がいつ入ったかは、今回の絞り込みでは特定できず → 推測: FormProviderを使わない小規模フォームでも`useController`単体を使えるようにするための設計と考えられるが、明示的な記述は見つからなかった

## _proxyFormState / getProxyFormState / shouldRenderFormState の履歴

- `src/logic/getProxyFormState.ts` と `src/logic/shouldRenderFormState.ts` は、どちらもV7の全面書き換え（`9555d16f`、2021-04-01、#3741）で新設された。ただしこの時点の内容は現行と異なる
- V7時点の `getProxyFormState.ts`（`git show 9555d16f:src/logic/getProxyFormState.ts`）は、JavaScript標準の `Proxy` を使っていた。`isProxyEnabled`（`'Proxy' in window` を見るだけの判定）が真のときだけ `new Proxy(formState, { get: ... })` を返し、偽なら素の `formState` をそのまま返していた
- V7より前（親コミット `56f8105f`）の `useForm.ts` にも、同じ `isProxyEnabled` 判定とほぼ同じ `get` トラップがすでにあった。V7がやったのは、この仕組みを `useForm.ts` から独立したファイルへ切り出したことで、`Proxy`自体の採用はV7より前から続いていた
- 3か月後のコミット `a4b2c0ad`（#5958、2021-07-31、v7.13.0。チャプター1で扱った`createFormControl`の切り出しと同じコミット）に含まれるサブPR #5999（コミットメッセージ中の「change getProxyFormState to use getter api of js instead of Proxy api」）で、`Proxy` から `Object.defineProperty` によるgetterへ書き換えられ、`isProxyEnabled` ファイルごと削除された
  - PR #5999本文（GitHub）は「use basic getter api of js instead」とだけ書かれており、具体的な理由（バンドルサイズ、IE11でのふるまいの違いなど）は明記されていない → 推測: `createFormControl`のReact依存を外す同じコミットの一部であり、`Proxy`という「対応環境を選ぶAPI」をやめて、どの環境でも同じに動く`Object.defineProperty`に寄せた可能性がある。明示的な記述はない
  - 現行のファイル名 `getProxyFormState.ts` は、この書き換えの前の名残である。中身はもう`Proxy`を使っていない
- `shouldRenderFormState.ts` はその後も複数回変更されている（`git log --follow` で確認できる主なコミット：`a9f76a8f` #4722「useFormStateにnameを渡して名前単位の再描画にする」、`0f3e19e2` #9777「useFormStateの更新漏れの修正」、`7f95b265` #11522「createFormControlとsubscribeの公開API化」、`2adb9c08` #13398「無関係なフィールドのバリデーションでuseWatchが再描画してしまう不具合の修正」）
  - `2adb9c08`（#13398）は、この章のFOCUSに直結する修正。それまでの判定は「変化したキーの数が`_proxyFormState`の全キー数以上なら、購読者が何を読んでいたかにかかわらず無条件に再描画する」という安全弁を、ルート（`useForm`本体）以外の購読者（`useWatch`など）にも適用していた。この安全弁に `isRoot &&` を追加し、ルート以外の購読者では効かないようにした。差分は次の1行（`src/logic/shouldRenderFormState.ts`）：
    ```ts
    -    Object.keys(formState).length >= Object.keys(_proxyFormState).length ||
    +    (isRoot &&
    +      Object.keys(formState).length >= Object.keys(_proxyFormState).length) ||
    ```
  - この安全弁自体（「ほぼ全部変わったなら、個別の判定を飛ばして再描画する」）はミニ実装では作らない。範囲外と明記する

## 未確認・推測

- `createFormControl`という名前自体がいつ確定したか（同名の別実装からのリネームか、新規ファイルとしての追加か）は、shallowなrename検出の限界で追いきれなかった。ファイルの初出コミットはa4b2c0adであることのみ確認済み
- `_subjects`（Pub/Sub）の導入時期は今回のFOCUS（購読設計）にとって重要だが、パス3の時間内では特定に至らず。次回の検証で `git log -p -- src/utils/createSubject.ts` を追う
