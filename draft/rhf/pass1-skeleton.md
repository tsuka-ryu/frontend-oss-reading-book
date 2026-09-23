# rhf パス1: 骨格

対象: react-hook-form/react-hook-form（クローン先 `/tmp/oss/react-hook-form`）
バージョン: v7.88.0（タグ）
FOCUS: 再描画を抑える購読の設計
除外: 各UIライブラリとの統合

## ディレクトリマップ

- `src/useForm.ts`（194行）— 公開APIの入口。React hookそのものはごく薄い
- `src/logic/createFormControl.ts`（2256行）— コアロジック本体。Reactに依存しないプレーンな関数
- `src/logic/` — createFormControl以外の補助ロジック（validateField、getDirtyFields等）
- `src/utils/` — createSubject、cloneObject、deepEqual等の汎用ユーティリティ
- `src/controller.tsx` / `src/useController.ts` — 制御コンポーネント用ラッパー
- `src/useWatch.ts` / `src/watch.tsx` — 値の購読
- `src/useFormState.ts` — formStateのみを購読するhook
- `src/useFieldArray.ts` — 配列フィールド
- `src/useFormContext.tsx` / `src/useFormControlContext.ts` — Context経由でcontrolを配る
- `src/types/` — 型定義（FOCUS外、必要箇所のみ参照）

## 語彙集

- **control** — `createFormControl` が返すオブジェクト。`_fields`、`_formValues`、`_formState`、`_names`、`_subjects` などをgetter/setterで公開する。Reactの外側にある可変な実体
- **createFormControl** — controlを組み立てるファクトリ関数。Reactの型やhookを一切importしない、プレーンなTypeScript関数
- **_subjects** — `createSubject()` で作るPub/Sub。`state`（formState全体）と`array`（フィールド配列の変更）の2本
- **createSubject** — `src/utils/createSubject.ts`。observerの配列を持ち、`next`で全observerに通知するだけの最小実装
- **_proxyFormState** — formStateのどのキーが実際に読まれた（購読された）かを記録するフラグの集合
- **formControl（props）** — `useForm({ formControl })` で外部から生成済みのcontrolを注入するオプション
- **useFormControlContext** — `Controller`や`useController`がcontrolを親から受け取るためのContext

## 主要な呼び出しパス

### 1. フォームの初期化
`useForm(props)` →
- `useRef` が空なら `createFormControl(props)` を一度だけ呼ぶ
- 戻り値のうち `control` を `_formControl.current` に保持
- `formState` はReactの `useState` で別に持つ（controlの中の `_formState` とは別オブジェクト）

### 2. controlをuseRefに閉じ込める
`useForm` 内 →
- `_formControl.current` が存在する限り、再レンダーのたびに新しい `createFormControl` は呼ばれない
- `control._options = props` で最新のpropsだけをcontrolに反映
- 返り値の `control` は再レンダーをまたいで同一の参照を保つ

### 3. Reactへの再描画通知
`useIsomorphicLayoutEffect` →
- `control._subscribe({ formState: control._proxyFormState, callback: updateFormState, reRenderRoot: true })` を登録
- `_subjects.state` に何かがpushされるたびに、条件を満たせば `updateFormState` （Reactのstate更新）が呼ばれる
- 逆に言えば、`_subjects` にpushされただけでは再描画は起きない。登録されたcallbackを経由して初めてReactのstateが動く

### 4. 他のhookがcontrolを共有する
`useController` / `useWatch` / `useFormState` →
- 引数の `control`、またはContext経由の `useFormControlContext()` で同じcontrolを受け取る
- 各hookは自分の関心のある範囲だけ `control._subjects.state` を購読する
- controlそのものは1つのフォームにつき1つしか存在しない

## 章立て案

BACKLOG.mdの章の候補の順を正とする（下の段階計画もこの順に合わせた）。

1. **フォームの値はどこに置かれているか（useFormとcontrol）** — `createFormControl` がReact非依存のプレーン関数である事実、`useForm` はそれを`useRef`で保持するだけの薄い層だという構造
2. **formStateのどのキーを読んだかを覚える（_proxyFormStateとshouldRenderFormState）** — 読まれたキーだけを記録し、変化したキーがそこに含まれるときだけ再描画する仕組み
3. **registerと非制御コンポーネント** — `register`がrefを直接DOMに刺す設計、値をJSの複製ではなくDOMそのものから読む理由
4. **ControllerとuseFieldArray** — 制御コンポーネントを避けられない場面での再描画の閉じ込め方

## ミニ実装の段階計画

| 章 | 足す機能 | 並べる本物の関数／ファイル | その章の終わりに残る欠点 |
| --- | --- | --- | --- |
| 1 | `createFormControl`・`createSubject`・`useForm`の骨格。`_formValues`に値を置き、`isDirty`が変わったときだけ通知する | `src/logic/createFormControl.ts`、`src/utils/createSubject.ts`、`src/useForm.ts` | 読んでいないキー（`errors`のみ読むコンポーネントなど）の変化でも再描画してしまう |
| 2 | `_proxyFormState`（読んだキーの記録）、`getProxyFormState`（読み取り時にフラグを立てるgetter）、`shouldRenderFormState`（変化したキーが読まれていたときだけ通知を通す） | `src/logic/getProxyFormState.ts`、`src/logic/shouldRenderFormState.ts` | `_formValues`はonChangeが呼ばれたときしか更新されないため、DOM側で直接書き換えられた値（ブラウザの自動入力や外部からの操作）を拾えない |
| 3 | `register`が返す`ref`。値をDOMのノードから直接読み書きし、`_formValues`への複製をやめる（非制御コンポーネント） | `src/logic/createFormControl.ts`の`register`関数、`src/logic/getFieldValue.ts` | `Controller`のような制御コンポーネントや、`useFieldArray`がやる配列単位の登録・削除には対応しない |
| 4 | `Controller`・`useFieldArray`の骨格。制御コンポーネントの値をcontrolに橋渡しし、配列フィールドの増減を`_subjects.array`で通知する | `src/controller.tsx`、`src/useController.ts`、`src/useFieldArray.ts` | 本の対象範囲（購読の設計）を超えるバリデーションやUI統合は扱わない |

この表は概算であり、各章のパス1・パス3で実ソースに当たって更新する。
