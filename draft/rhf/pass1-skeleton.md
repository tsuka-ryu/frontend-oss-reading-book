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

1. **全体構造：useFormとcontrolオブジェクト** — `createFormControl` がReact非依存のプレーン関数である事実、`useForm` はそれを`useRef`で保持するだけの薄い層だという構造
2. **registerと非制御コンポーネント：再描画を減らす仕組み** — `register`がrefを直接DOMに刺す設計、非制御コンポーネントを選ぶ理由
3. **フォームの状態管理：formStateの購読とProxy** — `_proxyFormState`とProxyオブジェクトによる遅延購読
4. **ControllerとuseFieldArray** — 制御コンポーネントを避けられない場面での再描画の閉じ込め方
