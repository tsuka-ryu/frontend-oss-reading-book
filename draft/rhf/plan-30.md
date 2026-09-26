# rhf パス1: 約30章の章立て（plan-30）

対象: react-hook-form/react-hook-form（クローン先 `/tmp/oss/react-hook-form`）
基準の版: タグ `v7.88.0`（コミット `28334faa`、2026-09-23）。既存の2〜4章の「読んだ版」と同じ。1章の冒頭は `5fd9ef65` と書いているが、これも package.json は 7.88.0 である。
FOCUS: 再描画を抑える購読の設計
除外: 各UIライブラリとの統合

関数名・変数名は、`v7.88.0` をチェックアウトした作業ツリーで `grep` し、実在を確かめたものだけを書いた。
履歴は `git log -S <識別子> --reverse`、`git log --follow`、`git show`、`git tag --contains`、CHANGELOG.md で拾った。
コミットの後ろの版は、そのコミットを含む最初の正式タグである。

PRとIssueの本文は、このセッションからGitHub APIに届かず読めていない。
以下の「なぜ」はコミットメッセージ（squashされたサブコミットの一覧を含む）、差分、CHANGELOG.mdが根拠で、PR本文は全章について「未確認」である。
各章のパス3でPR本文を読み直す。

---

## この章立てで判断した点

### FOCUSの広げ方

FOCUS「再描画を抑える購読の設計」を、「誰が、何を、いつ知らされるか」という問いに言い換えて広げた。
この言い換えで、次の三つを章に入れる理由が書ける。

- バリデーションの時機（mode、reValidateMode、isValid）：検証は `errors` と `isValid` を書き換え、それが通知になる。検証をいつ走らせるかは、そのまま通知の回数を決める。とくに本物は `isValid` を「読まれていなければ計算すらしない」（`_setValid` の `_isTracked('isValid')`）。これは2章の `_proxyFormState` の直接の続きである
- errors、touched、dirtyの持ち方：どれも「前と同じなら通知しない」判定（`shouldRenderByError`、`updateTouchAndDirty` の戻り値）と組で存在する。持ち方を扱わないと、通知を抑える判定が読めない
- defaultValues、reset、values prop、shouldUnregister、disabled：フォーム状態の中核である `_formValues` と `_defaultValues` を入れ替える操作で、入れ替えのたびに全購読者へ何をどう流すかが設計問題になる

逆に、通知の回数や範囲に効かない機能は、履歴が豊かでも入れなかった（下の「捨てた候補」）。

### アークの切り方

6つのアークに分けた。
アーク1は既存の1〜4章に5章を足して5章、アーク6は4章で、残りは5〜6章である。
アークの順は、ミニ実装の鎖が切れない順にした。

1. 値の置き場所と、名前による絞り込み（1〜5章）
2. 購読の入口（6〜11章）
3. 検証の時機（12〜17章）
4. フィールドごとの状態（18〜22章）
5. 値の正本の入れ替え（23〜27章）
6. 位置と時間のずれ（28〜31章）

### useFieldArrayを5章にしなかった理由

BACKLOG.md は5章を `useFieldArray` としていたが、配列は28〜30章（アーク6）に移した。
理由は二つある。

一つ目は、4章の「足りないもの」のテストが示している欠点が、配列ではなく名前の前方一致だからである。
4章は `"addresses"` の購読者に `"addresses.0.city"` の変化が届かないことをテストで示して終わる。
これに直接答えるのは、ドット区切りの名前と双方向の前方一致（`shouldSubscribeByName`）であり、1章で足す機能は一つという規則から、配列の管理とは分けるしかない。

二つ目は、本物の配列操作 `_setFieldArray` の複雑さの大半が、`errors`、`touchedFields`、`dirtyFields` を値と同じ位置にずらすことにある点である。
これらの状態を作る前（5章の時点）に配列を扱うと、「本物はなぜ違うか」がほぼ書けない。
アーク4でフィールドごとの状態を作ったあとなら、`_setFieldArray` が同じ `method` を値、エラー、touchedに順に当てる理由を、ミニ実装の欠点として見せられる。

これに伴い、4章の本文末尾の一文（「次章では、この配列フィールドの管理（useFieldArray）を扱う」）は、5章に合わせて「名前の前方一致」への引きに直す必要がある。
4章は別のエージェントが書き直し中なので、ここでは触らず、指摘だけ残す。

### 捨てた候補とその理由

- UIライブラリとの統合（MUIやshadcnへの橋渡し）：第0節の除外
- `<Form>` コンポーネント（`src/form.tsx`）とServer Actions対応：送信の転送であり、購読の設計に関わらない
- `ErrorMessage`（`src/errorMessage.tsx`）、`FormStateSubscribe`（`src/formState.tsx`）、`Watch`（`src/watch.tsx`）、`FieldArray`（`src/fieldArray.tsx`）：どれもhookをJSXで包んだ薄い層で、足す機能がない
- `delayError`：エラー表示を遅らせる機能。`shouldRenderByError` の中の分岐なので、18章の「本物はなぜ違うか」で触れる（`ea5eceef`、#5935、v7.12.0）。単独の章にすると機能が薄い
- `deps`（あるフィールドの検証で別のフィールドも検証する）：17章のresolverと同じ「フィールドをまたぐ検証」の問題で、17章で対比として触れる（`6fbc52f1`、#6141、v7.14.0）
- `criteriaMode`、`shouldUseNativeValidation`、`valueAs*`：検証規則の中身で、通知の回数に効かない
- フォーカス（`_focusError`、`setFocus`、`shouldFocusError`）：DOMへの `ref.focus()` で、購読を経由しない。履歴（`e7c6614e` #1828、`81c99d3b` #4623、`695f6231` #9978）はあるが、FOCUSとの接点が書けない
- `resetField`、`setValues`、`getErrors`、`resetDefaultValues`：それぞれ `reset`、`setValue`、`formState.errors`、`defaultValues` の変種で、足す機能が前の章と重なる。該当章で一行触れる
- 配列操作中のアンマウントの扱い（`_state.action`、`actionArrayLengths`）：2023年以降の不具合修正が多く（`33810a6b` #10026、`4bace71e` #13385、`5e9e0245` #13644）、一つの設計として語れない。29章の「本物はなぜ違うか」で触れる
- TypeScriptの型（`FieldPath` など）：購読の設計ではない

### エピグラフについて

1、3、4章は既存本文のエピグラフをそのまま書いた（2章は書き直し中のため空欄）。
5章以降の候補は、シグナルのパートとRHFの既存章で使った出典（バークリー、アウグスティヌス、ボルヘス、鴨長明、マグリット、老子、カフカ）と重ならないように選んだ。
訳文は拙訳で作ること。原文の確認はパス4で行い、確度の欄に書く。

---

## アーク1　値をReactの外に置いたまま、読んだ者にだけ変化を知らせるには何が要るか（1〜5章）

### 1章　フォームの値はどこに置かれているか（既存）

- ミニ実装: `code/rhf/01-useform-and-control/`
- 足す機能: `createFormControl`、`createSubject`、`useForm` の骨格
- エピグラフ: マグリット《イメージの裏切り》（1929年）（既存）

### 2章　formStateのどのキーを読んだかを覚える（既存）

- ミニ実装: `code/rhf/02-proxy-form-state/`
- 足す機能: `_proxyFormState`、`getProxyFormState`、`shouldRenderFormState`
- エピグラフ: 書き直し中のため空欄

### 3章　registerと非制御コンポーネント（既存）

- ミニ実装: `code/rhf/03-register-and-uncontrolled/`
- 足す機能: `register` の `ref` と `setValue` のDOM直接書き込み
- エピグラフ: 『老子』第37章（既存）

### 4章　Controllerと名前で絞り込む購読（既存）

- ミニ実装: `code/rhf/04-controller/`
- 足す機能: `controller` と、`name` で絞り込む `_subscribe`（完全一致）
- 章末の欠点: `"addresses"` の購読者に `"addresses.0.city"` の変化が届かない（テストで示し済み）
- エピグラフ: カフカ「掟の前」（1915年）（既存）

### 5章　名前の中のドットは、誰に知らせるかをどう変えるのか

- ミニ実装: `code/rhf/05-nested-names/`
- 足す機能: ドット区切りの名前で `_formValues` を入れ子に読み書きする `get`・`set`、および `shouldSubscribeByName` の双方向の前方一致
- 並べる本物: `src/utils/get.ts`、`src/utils/set.ts`、`src/utils/stringToPath.ts`（`FIELD_PATH_RE`）、`src/utils/isKey.ts`（`IS_KEY_RE`）、`src/logic/shouldSubscribeByName.ts`（`exact` の分岐を含む）
- 履歴の手がかり:
  - `eb1177ea`（2019-06-13）「support nested data object」：入れ子の値を扱い始めた最初のコミット
  - v6までは `fieldsRef.current[name]` という平らなキー（`"a.b.c"` のまま）で持ち、読むときに `transformToNestObject` で木に組み直していた（`git show 9555d16f^:src/useForm.ts` で確認）。V7（`9555d16f`、#3741、v7.0.0）で `set(_fields, name, …)` の入れ子に変わった。CHANGELOGの v7.0.0-alpha.2 に「remove transformToNestObject (#4089)」とある（#4089 はV7にsquashされていて単独のコミットはない）
  - `c1243995`（#6768、v7.17.3）「useFieldArray trigger validation by field name」：前方一致を `shouldSubscribeByName` に切り出し、`useWatch` と `useFormState` で判定を揃えた（pass3で既出）
  - `2371e8b4`（#6983、v7.20.0）`exact` の追加、`390c01e7`（#10707）、`de4a917f`（#10947）で現在の一本の式になった（pass3で既出）
  - `cee92e2b`（#13524、v7.80.0）「perf: make rhf more performant」で `isKey.ts` と `stringToPath.ts` が正規表現の定数化などで書き換えられている（差分の統計から。理由の本文は未確認）
- 章末の欠点: 値は入れ子で読めるようになったが、`App` の中で `email` の今の値を表示する手段がない。`getValues` は呼んだ瞬間の値を返すだけで、変わっても再描画されない
- エピグラフ候補: アリストテレス『カテゴリー論』第3章（1b10〜12）。「あるものが別のものの主語について述語されるとき、述語について言われることはすべて主語についても言われる」。親の名前に届く知らせは子の名前にも関わる、という片方向の包含と構造が同じ。双方向の前方一致との違い（子の変化も親に届く）を本文で書ける

---

## アーク2　同じ値を読む入口が、なぜ六つもあるのか（6〜11章）

### 6章　watchは、なぜフォーム全体を描き直すのか

- ミニ実装: `code/rhf/06-watch/`
- 足す機能: `watch(name)`。呼ばれた名前を `_names.watch` に記録し、その名前が変わったら `useForm` 本体（ルート）に通知する
- 並べる本物: `createFormControl.ts` の `watch`、`_getWatch`、`src/logic/generateWatchOutput.ts`（`isGlobal` のとき `_names.watch.add`、名前なしなら `_names.watchAll = true`）、`src/logic/isWatched.ts`、`onChange` の `watched` 分岐（`!isBlurEvent && watched && _subjects.state.next({ ..._formState })`）
- 履歴の手がかり:
  - v6以前は `watchFieldsRef`（`62aade02`、2019-04-03「clean up existing code」が最古）と `isWatchAllRef`（`40a68ac8`、2019-04-06）という `useRef` の集合で持っていた
  - `isWatched` はV7（`9555d16f`、#3741）で新設、`_names.watch` は `a4b2c0ad`（#5958、v7.13.0）でcontrolに移った
  - 2章の「安全弁」（`shouldRenderFormState` の `isRoot && keys.length >= …`）は、`watch` がルートを描き直すときに `_formState` 全体を流す経路と組になっている。`2adb9c08`（#13398、v7.75.0）はこの安全弁をルート限定にした修正
- 章末の欠点: `watch` を使うと、値を表示したいのは小さな一か所なのに、`useForm` を呼んだコンポーネントごと描き直される
- エピグラフ候補: ユウェナリス『風刺詩』第6歌（オックスフォード断片 O31〜O32、流布本では347〜348行とされる箇所）「だが、見張りを誰が見張るのか（quis custodiet ipsos custodes?）」。見張る者（ルート）自身が見張りの代価を払う構造。行番号は版によって違うので、パス4で底本を決める

### 7章　useWatchは、描き直しをどこまで小さくできるのか

- ミニ実装: `code/rhf/07-use-watch/`
- 足す機能: `useWatch({ name })`。自分の `useState` を持ち、`_subscribe({ name, formState: { values: true } })` で名前の一致した通知だけを受けて、自分だけ描き直す
- 並べる本物: `src/useWatch.ts` の `refreshValue`、`_subscribe` の呼び出し、`getInitialOutput`、`generateWatchOutput` の `isGlobal = false`（`_names.watch` に登録しない点がwatchとの違い）
- 履歴の手がかり:
  - `useWatch` の初出は `19758760`「V6」（#1471、v6.0.0、2020-05-19）
  - v6の `useWatch` は、`useWatchFieldsRef` と `useWatchRenderFunctionsRef`（hookごとの再描画関数を登録する表）で動いていた（`git show 9555d16f^:src/useWatch.ts`）。Subjectへの一本化は `a4b2c0ad`（#5958）
  - `22843cb4`（#6614、v7.16.1）「refactor subscription logic into useSubscribe」で `useSubscribe` が作られ、`7f95b265`（#11522、v7.55.0）で `control._subscribe` に置き換えられて消えた
  - `0b8be385`（#13070）「make `useWatch` and `useController` to react to `name` change」
- 章末の欠点: 値は葉で読めるようになったが、`errors` や `isDirty` はまだ `useForm` の `formState` からしか読めない。エラー表示の部品のためにルートが描き直される
- エピグラフ候補: ヴォルテール『カンディード』第30章（1759年）「けれども、私たちの畑を耕さなければなりません（il faut cultiver notre jardin）」。自分の畑（部分木）だけを手入れする構造

### 8章　useFormStateは、同じformStateを部品ごとにどう読み分けるのか

- ミニ実装: `code/rhf/08-use-form-state/`
- 足す機能: `useFormState({ name })`。hookごとに自分の `_localProxyFormState` を持ち、`getProxyFormState` をそれに向けて呼ぶ
- 並べる本物: `src/useFormState.ts` の `_localProxyFormState`、`getProxyFormState(formState, control, _localProxyFormState.current, false)`（第4引数 `isRoot` が `false`）、`src/logic/shouldRenderFormState.ts` の `isRoot` 分岐（`=== (!isRoot || VALIDATION_MODE.all)`）
- 履歴の手がかり:
  - `8aec47d3`（#3736、2020-12-20）「introduce Subject to avoid extra ref for the unmount check and useFormState」：Subjectはそもそも `useFormState` のために入った（pass3で既出）
  - CHANGELOG v7.0.0-alpha.0「new custom hook `useFormState` (#3740)」
  - `a9f76a8f`（#4722、v7.4.0）「support name prop with useFormState to isolate re-render by name」
  - `881fd8ad`（#9380、v7.39.5）「flush extra re-render at `useFormState` to update current form state subscription」、`0f3e19e2`（#9777）「`useFormState` missing state update」：購読を始める前に起きた変化を取りこぼす問題
  - `2adb9c08`（#13398、v7.75.0）：ルート以外では安全弁を効かせない
- 章末の欠点: 子の部品に `control` を毎回propsで渡す必要がある
- エピグラフ候補: ライプニッツ『モナドロジー』第57節（1714年）。同じ町も眺める側によって違って見え、宇宙はモナドの数だけの視点で表される。同じ `_formState` を、hookごとの読み取り記録（視点）で見る構造

### 9章　Contextでcontrolを配ると、なぜ全員が描き直されるのか

- ミニ実装: `code/rhf/09-form-provider/`
- 足す機能: `FormProvider` と `useFormContext`。まず一つのContextで配って壊し、次に `control` だけを載せた二つ目のContextに分ける
- 並べる本物: `src/useFormContext.tsx` の `FormProvider`（`memoizedValue` の依存配列に `formState` が入っている）、`HookFormContext`、`src/useFormControlContext.ts` の `HookFormControlContext` と `useFormControlContext`。`useWatch`、`useFormState`、`useController`、`useFieldArray` は後者だけを読む
- 履歴の手がかり:
  - `9cd5161f`（#96、2019-06-23）「useFormContext」、`FormProvider` は `19758760`（V6、#1471）
  - `17c85ed7`（#13234、v7.71.0、2026-01-05）「perf: separate control context to prevent unnecessary rerenders」。コミット本文に「Introduce HookFormControlContext for internal hooks … to avoid rerenders when only control is needed」とある。`useFormContext` を読むだけの部品が `formState` の変化で描き直される問題への対処が、Context導入から6年半後だった点は皮肉の材料になる
  - 関連：`09a9a495`（#12424、v7.54.0）「useForm should return a new object on formState changes」が1か月足らずで `8bb16320`（#12475、v7.54.1）に取り消されている。戻り値の参照を変えると、それを依存に持つ側がすべて動く。取り消しの理由は本文がなく未確認
- 章末の欠点: `useWatch` は、見ている値が変わるたびに描き直す。「合計が100を超えたか」のような、値から計算した結果だけが要る部品でも、結果が変わらないまま描き直される
- エピグラフ候補: 候補なし

### 10章　値が変わっても、計算した結果が同じなら描き直さずに済むか

- ミニ実装: `code/rhf/10-use-watch-compute/`
- 足す機能: `useWatch({ compute })`。値から計算した結果を前回と `deepEqual` で比べ、違うときだけ `updateValue` する
- 並べる本物: `src/useWatch.ts` の `_compute`、`_computeFormValues`、`refreshValue` の中の `deepEqual(computedFormValues, _computeFormValues.current)`、`src/utils/deepEqual.ts`
- 履歴の手がかり:
  - `234396ca`（#12503、v7.61.0、2025-07-06）「compute prop for useWatch subscription」。squashされたサブコミットに「feat: improve reference update with useWatch (#12537)」がいったん入って取り消され（Revert 2件）、「update form value reference at consumer instead useWatch」に落ち着いた経緯がある
  - v6からの `useWatch` が5年間 `compute` なしで済んでいた理由は未確認
- 章末の欠点: 変化を知る手段が、すべてReactの部品の中にある。描画と関係なく「値が変わったら保存する」処理を書くには、何も描かない部品を置くしかない
- エピグラフ候補: コナン・ドイル「白銀号事件（Silver Blaze）」（1892年、のち『シャーロック・ホームズの思い出』所収）。夜中に犬が何もしなかったことが手がかりになる場面。「何も起きなかった」ことに意味を持たせる構造（計算結果が変わらなければ何もしない）

### 11章　Reactの外から、フォームの変化を購読できるか

- ミニ実装: `code/rhf/11-subscribe/`
- 足す機能: 公開の `subscribe({ formState, callback })`。購読者が申告したキーを `_proxySubscribeFormState` に合わせ、読まれているキーの判定（`_isTracked`）に含める
- 並べる本物: `createFormControl.ts` の `subscribe`、`_subscribe`、`_proxySubscribeFormState`、`_isTracked`、`watch(callback)` の分岐、`_valuesSubscriberCount`（値の購読者が一人もいなければ `onChange` で `_formValues` の複製を作らない）
- 履歴の手がかり:
  - CHANGELOG v7.0.0-alpha.0：`watch` がコールバックでフォーム全体を購読できるようになった
  - `7f95b265`（#11522、v7.55.0、2025-01-12）「`createFormControl` and `subscribe` function」。サブコミットに「split values and other formState sub」「fix render root issue」
  - `d799a628`（#12968、v7.69.0）「ensure each createFormControl.subscribe subscription listens only to the changes it subscribes to」
  - `cee92e2b`（#13524、v7.80.0）で `_valuesSubscriberCount` が入った。`06e4efdd`（#13662）「avoid cloning values in `unregister` without subscribers」
  - `911f8467`（#13690）と `753b4025`（#13699）で `_isTracked` に一本化（どちらも v7.88.0 に含まれる）
- 章末の欠点: 変化の通知は整ったが、`errors` は `setError` で手書きするしかない。入力が規則を満たすかを誰も確かめていない
- エピグラフ候補: ウィトゲンシュタイン『論理哲学論考』6.54（1921年）。登り終えた梯子は投げ捨てなければならない。`useForm` という梯子なしで `control` を使えるようになる構造。本の途中で使うなら、捨てた梯子を次章でまた使う点を本文で書く

---

## アーク3　検証を「いつ」走らせるかが、なぜ再描画の回数を決めるのか（12〜17章）

### 12章　送信の瞬間にだけ検証すれば、何回描き直すことになるか

- ミニ実装: `code/rhf/12-handle-submit/`
- 足す機能: `register(name, { required, pattern })` の規則と、`handleSubmit`。送信時に全フィールドを `validateField` で検証し、`isSubmitting`、`isSubmitted`、`submitCount`、`errors` を流す
- 並べる本物: `createFormControl.ts` の `handleSubmit`（`_subjects.state.next({ isSubmitting: true })` と、最後の一回の `next`）、`executeBuiltInValidation`、`src/logic/validateField.ts`
- 履歴の手がかり:
  - `validateField` は最初のコミット `1ff861bb`（2019-03-06「intial commit」）から存在する
  - `d42f98c2`（2019-05-04）「include submit count and is submitting in the form state」
  - `b7002c71`（#2798、2020-09-09）`isSubmitSuccessful`、`82f2e4be`（#5064）「isSubmitSuccessful set to false when submit Promise failed」
  - CHANGELOGの 7.42.0（2023-01-13）「`handleSubmit` no longer catch `onSubmit` callback error」。現行は `onValidError` を最後の `next` のあとで投げ直す
- 章末の欠点: エラーは送信を押すまで出ない。入力中や欄を離れたときに知らせたいフォームには使えない
- エピグラフ候補: ヘロドトス『歴史』第1巻第32節。ソロンがクロイソスに、人の生涯は終わりを見るまで幸福と呼べないと説く場面。結果を最後にまとめて判定する構造

### 13章　入力中に検証すると、なぜ描き直しが増えるのか

- ミニ実装: `code/rhf/13-validation-mode/`
- 足す機能: `mode`（`onSubmit`、`onBlur`、`onChange`、`onTouched`、`all`）。`getValidationModes` で旗にし、`skipValidation` で「このイベントでは検証しない」を決める
- 並べる本物: `src/logic/getValidationModes.ts`、`src/logic/skipValidation.ts`、`onChange` の `shouldSkipValidation` と `hasNoValidationEffect`、`_validationModeBeforeSubmit`
- 履歴の手がかり:
  - `skipValidation` の初出は `fa5e71ca`「V4」（#666、2019-12-23）
  - `59904ce7`（#2377、v6.4.0、2020-08-14）「new feature onTouched mode」
  - `cee92e2b`（#13524、v7.80.0）で `_validationModeBeforeSubmit` をキャッシュ（サブコミット「cache valdiation mode」）、`hasNoValidationEffect` もこのとき入った。規則のない欄の入力で検証の経路に入らない
- 章末の欠点: 一度送信して失敗したあとも、`onSubmit` のままだと、直した欄のエラーが次の送信まで消えない
- エピグラフ候補: ヒッポクラテス『箴言』第1章第1節。「人生は短く、術は長く、機会（カイロス）は逸しやすい」。いつ手を下すかという時機の問題と構造が同じ

### 14章　送信のあとは、なぜ検証の時機を変えるのか

- ミニ実装: `code/rhf/14-revalidate-mode/`
- 足す機能: `reValidateMode`。`isSubmitted` が立ったら `_validationModeAfterSubmit` のほうで `skipValidation` を判定する
- 並べる本物: `skipValidation` の `isSubmitted ? reValidateMode.isOnBlur : mode.isOnBlur` の三項、`_validationModeAfterSubmit`、`useForm.ts` の `mode`・`reValidateMode` を後から反映する `useEffect`
- 履歴の手がかり:
  - `21284b3b`（#362、2019-10-13）「feature on revalidate mode」。これを含む最初のタグは `2.28.2`（v2系の時期）
  - `59904ce7`（#2377）で `reValidateMode` の型が見直されている（サブコミット「improve reValidateMode type」）
- 章末の欠点: 送信ボタンを「全体が正しいときだけ押せる」ようにする `isValid` を作ると、入力のたびに全フィールドを検証することになる
- エピグラフ候補: 『論語』衛霊公篇「過ちて改めざる、是を過ちと謂う」。一度示した誤りは、直ったらすぐ取り下げる構造。章の番号は版により第29章・第30章と分かれるので、パス4で底本を決める

### 15章　isValidは、誰も読んでいないときにも計算すべきか

- ミニ実装: `code/rhf/15-lazy-is-valid/`
- 足す機能: `_setValid`。`_proxyFormState.isValid` が読まれているときだけ、全フィールドを `onlyCheckValid` で検証する
- 並べる本物: `createFormControl.ts` の `_setValid`（`_isTracked('isValid') || shouldUpdateValid`）、`executeBuiltInValidation` の `onlyCheckValid`、`useFormState.ts` の `_localProxyFormState.current.isValid && control._setValid(true)`
- 履歴の手がかり:
  - `446928d4`（#407、2019-10-26）「Using proxy to omit re-render」：`readFormStateRef` の導入。2章の源流
  - `c214d03a`（#94、2019-06-21）「Fix/is valid」、`5f82d33f`（2019-06-18）「fix isValid measure to combine with touched」
  - `48c20454`（2020-09-12）「improve DX with warnning message for isValid」
  - `_updateValid`（`a4b2c0ad`、#5958）から `_setValid`（`7f95b265`、#11522）への改名
  - `932c957e`（#13140、v7.66.1）「skip setValid() during batch array updates」
- 章末の欠点: 非同期の `validate` を使うと、先に始めた検証が後から終わり、新しい結果を古い結果で上書きする
- エピグラフ候補: シュレーディンガー「量子力学の現状」（Die gegenwärtige Situation in der Quantenmechanik、Naturwissenschaften 23巻、1935年、第5節）の猫。箱を開けるまで状態が決まらない。違い（猫は重ね合わせ、`isValid` は単に計算していないだけ）を本文で書ける

### 16章　遅れて届いた検証結果を、どう捨てるか

- ミニ実装: `code/rhf/16-stale-validation/`
- 足す機能: 呼び出しごとの番号（`_setValidCallId`）と、検証中に値が変わったかの確認（`_updateIsFieldValueUpdated`）。あわせて `isValidating` と `validatingFields`
- 並べる本物: `_setValid` の `callId === _setValidCallId`、`onChange` の `isFieldValueUpdated`、`_updateIsValidating`（`_isTracked('isValidating', 'validatingFields')` のときだけ流す）、`src/logic/hasPromiseValidation.ts`、`_resetCallId`
- 履歴の手がかり:
  - `3df3c209`（#3672、v6.14.0、2020-12-19）「new formState: isValidating」
  - `867fcfc0`（#10082、v7.43.6、2023-03-10）「prevent stabled aysnc validation」、`6d83aacb`（#10991）「Solve the issue of race condition with resolver」
  - `ebc1f2c3`（#10657、v7.51.0）`validatingFields`、`829d4924`（#12192、v7.53.0）「optimise re-render with validating fields subscription」で `hasPromiseValidation` を新設
  - `2791e4f6`（#13599、v7.82.0、2026-07-18）「prevent stale _setValid() calls from overwriting isValid/isValidating」。コミット本文に「_setValid() is fired-and-forget from 9 call sites and never awaited」「Give each call a monotonic id … mirroring the staleness check onChange already does」とある。欄ごとの対策（2023年）から、フォーム全体の対策（2026年）まで3年あいている
  - `1c12bcd2`（#13722）と `37561912`（#13733）で `reset` をまたぐ古いresolver結果も捨てるようになった
- 章末の欠点: 規則が欄ごとに散らばり、「確認用パスワードが一致するか」のような欄をまたぐ規則や、外部のスキーマを使えない
- エピグラフ候補: シェイクスピア『ロミオとジュリエット』第5幕第2場。ロレンス神父の手紙が届かず、ロミオは古い知らせのまま行動する。遅れと順序の逆転が結果を決める構造

### 17章　フォーム全体を一度に検証する関数に、欄ごとのエラーをどう答えさせるか

- ミニ実装: `code/rhf/17-resolver/`
- 足す機能: `resolver(values) => { values, errors }`。変わった欄の名前で、全体の結果から自分のエラーだけを取り出す
- 並べる本物: `_runSchema`、`executeSchemaAndUpdateState`、`src/logic/schemaErrorLookup.ts`、`src/logic/getResolverOptions.ts`、`onChange` の `_options.resolver` 分岐
- 履歴の手がかり:
  - `41444acf`（#974、v5.0.0、2020-02-07）「feature/support custom schema validation」、V6（`19758760`）で `resolver` になった
  - `e373b4be`（#6869、v7.18.0）「schema error parent level look up」、`741c6abf`（#6870）「improve schema validation with field array group error」
  - `1d28f03d`（#6929、v7.18.1）「prevent schema error before user's action」
  - 対比：`deps`（`6fbc52f1`、#6141、v7.14.0）はフィールドをまたぐ検証を登録側で書く別案。コミット本文に「break infinite trigger loop」
- 章末の欠点: 検証のたびに `errors` を丸ごと差し替えると、自分の欄のエラーが変わっていない部品まで描き直される
- エピグラフ候補: ユスティニアヌス『法学提要』第1巻第1章冒頭（533年）「正義とは、各人に各人のものを与えようとする恒常的で永続的な意思である（suum cuique）」。全体を一度に裁いて、各欄に自分の分だけ返す構造

---

## アーク4　エラー・触った・変えたを、変わった分だけ知らせるには、どう持てばよいか（18〜22章）

### 18章　同じエラーがもう一度出たとき、知らせるべきか

- ミニ実装: `code/rhf/18-errors-tree/`
- 足す機能: `errors` を名前の木として `set`・`unset` し、前のエラーと `deepEqual` で同じなら通知しない（`shouldRenderByError`）
- 並べる本物: `shouldRenderByError`、`updateErrors`、`setError`、`clearErrors`、`_setErrors`、`delayError` の分岐（`delayErrorCallbacks`、`debounce`）
- 履歴の手がかり:
  - v6は `shouldRenderBaseOnError`（`git show 9555d16f^:src/useForm.ts` の180行付近）。現行名は `c03c66eb`（#6691、v7.17.1）「refactor: improve createFormControl」から
  - `acd62142`（#1907）「fix/improve setError & clearError」、`414e4a74`（#2962）「nested error with clearErrors API」
  - `ea5eceef`（#5935、v7.12.0）「UX: useForm delayError」、`2e2f5826`（#6083）
- 章末の欠点: 欄に触れたかどうか（`touchedFields`）を持っていない。`onTouched` の判定も、「触れたらエラーを出す」表示もできない
- エピグラフ候補: 『コヘレトの言葉（伝道の書）』第1章第9節「日の下に新しいものは何一つない」。同じものが繰り返されるなら、知らせる価値はない

### 19章　一度触れた欄は、なぜ一度しか知らせないのか

- ミニ実装: `code/rhf/19-touched-fields/`
- 足す機能: `register` が返す `onBlur` で `touchedFields` を立てる。最初の一回だけ、かつ `touchedFields` が読まれているときだけ通知する
- 並べる本物: `updateTouchAndDirty` の `isBlurEvent` 分岐（`isPreviousFieldTouched`）、`register` の戻り値 `onBlur: onChange`、`onChange` の `isBlurEvent`
- 履歴の手がかり:
  - `60afbfc6`（#20、2019-04-21）「Feature/dirty touched」、`924f3025`（2019-05-31）「patch issue with touched」
  - `f101e091`（#947）「include touched fields in formState」
  - `updateTouchAndDirty` の初出は `6be4f509`（#5487、v7.8.0）「fix setValue with shouldTouch config」
- 章末の欠点: `isDirty` は1章の素朴な版のままで、欄ごとの「変えたか」がない。値を元に戻しても、どの欄が変わったままかを言えない
- エピグラフ候補: エドワード・フィッツジェラルド訳『ルバイヤート』初版（1859年）第51歌「動く指は書き、書き終えれば先へ進む」。一度記したら取り消せない構造（`touchedFields` は `reset` まで戻らない）

### 20章　元に戻した値は、変えていないことになるか

- ミニ実装: `code/rhf/20-dirty-fields/`
- 足す機能: `dirtyFields`。`_defaultValues` と今の値を欄ごとに `deepEqual` で比べ、元に戻せば外す。`isDirty` は `_getDirty` で全体を比べる
- 並べる本物: `src/logic/getDirtyFields.ts`、`_getDirty`、`updateTouchAndDirty` の dirty 側（`isCurrentFieldPristine`）、`useForm.ts` の `isDirty` を再計算する `useEffect`
- 履歴の手がかり:
  - `60afbfc6`（#20）、`ebdc8308`（#233、2019-08-21）「improve dirty check」
  - `9d22c8b7`（#7119）「issue with field array dirty fields」で `getDirtyFields.ts` が新設
  - `881fd8ad`（#9380）「minor improve on dirty and touch state update logic」
  - `cee92e2b`（#13524）サブコミット「perf: improve on dirty checking」
- 章末の欠点: 一つの欄の状態がほしい部品も、`errors` と `dirtyFields` と `touchedFields` を丸ごと読むので、他の欄の変化でも描き直される
- エピグラフ候補: ホメロス『オデュッセイア』第2歌（94〜110行付近、アンティノオスの言葉）。ペネロペは昼に織った布を夜にほどき、布はいつまでも仕上がらない。手を加えても元に戻れば「変わっていない」構造

### 21章　一つの欄の状態だけを読むとき、何を購読したことになるのか

- ミニ実装: `code/rhf/21-get-field-state/`
- 足す機能: `getFieldState(name, formState)`。第2引数に `formState` を渡すと、その中の `errors` などを読んだことが `_proxyFormState` に記録される
- 並べる本物: `createFormControl.ts` の `getFieldState`（`formState || _formState` と `get(targetFormState.errors, name)` など）、`useController.ts` の `fieldState`
- 履歴の手がかり:
  - `f68b9bdd`（#7475、v7.24.1）「unstable `getFieldState` API」。サブコミットに「keep formState at useController level」
  - `b5da7623`（#7617、v7.25.0）「enable getFieldState」（「logic reuse at useController」）
  - `40d05c52`（#7636）「getFieldState - error might be undefined」
  - 第2引数を渡さないと購読されない、という使い方の注意がいつどこに書かれたかは未確認
- 章末の欠点: `setValue` はDOMと `_formValues` を書き換えるだけで、`dirtyFields` も `touchedFields` も検証も動かない。コードから入れた値を「ユーザーの入力」として扱いたい場面がある
- エピグラフ候補: 候補なし

### 22章　コードで入れた値は、ユーザーが入れた値と同じに扱うべきか

- ミニ実装: `code/rhf/22-set-value-options/`
- 足す機能: `setValue(name, value, { shouldDirty, shouldTouch, shouldValidate })`。既定では状態を動かさず、選んだものだけ通知する
- 並べる本物: `_setValue`、`setFieldValue`（`options` を見る分岐）、`updateTouchAndDirty` の `shouldDirty` 引数、`trigger`、`setValues`（一度の `next` にまとめる変種）
- 履歴の手がかり:
  - `c80743ee`（#106、2019-07-01）「trigger validation with setValue as an option」
  - `61d1d4d1`（#1900、v6.0.0、2020-06-18）「set value should not set `dirty` to true and give users options」：既定を「dirtyにしない」に変えた転換点
  - `9b5c2a45`（#5181、v7.8.0）「support shouldTouch with setValue」
  - `916c7f0c`（#13671）「add `shouldTouch` option to `trigger()`」
- 章末の欠点: 値を「最初の状態」にまとめて戻す手段がない。値、エラー、dirty、touchedを一つずつ戻すと、そのたびに通知が出る
- エピグラフ候補: 候補なし

---

## アーク5　フォームの値の「正本」はどこにあり、入れ替えたとき何が起きるか（23〜27章）

### 23章　フォームを初めからやり直すとき、何を残せばよいか

- ミニ実装: `code/rhf/23-reset/`
- 足す機能: `reset(values, { keepDirty, keepErrors, keepTouched, keepDefaultValues, … })`。状態を一度に組み直し、最後に一回だけ流す
- 並べる本物: `_reset`、`reset`（`_options.resetOptions` との合成）、`keepDirtyValues` の分岐と `src/logic/collectDirtyFieldNames.ts`、`_resetCallId`
- 履歴の手がかり:
  - `keepDefaultValues` などの keep 系はV7（`9555d16f`）で入った。`866e1f1d`（#4860）、`c88e5771`（#4886）がV7直後の修正
  - `394ae5d8`（#8237、v7.31.0）「`reset` optional prop: `keepDirtyValues`」
  - `802b0472`（#12923、v7.60.0）「`reset` `keepFieldsRef` options keep fields reference」
  - `resetField`（`9dd34dd9`、#6891）は欄単位の変種として触れる
- 章末の欠点: `defaultValues` は `useForm` を呼ぶ時点で手元にないといけない。サーバーから取ってくる初期値は渡せない
- エピグラフ候補: デカルト『省察』第1省察冒頭（1641年）。一生に一度はすべてを根こそぎ覆し、最初の土台から始め直さなければならない。デカルトが『方法序説』第3部で「暫定的な道徳」を残したことと、keep 系の選択肢を対比できる

### 24章　初期値がまだ届いていないフォームは、何を表示すべきか

- ミニ実装: `code/rhf/24-async-default-values/`
- 足す機能: `defaultValues` に非同期関数を渡せるようにし、届くまで `isLoading` を立て、届いたら `reset` で流し込む
- 並べる本物: `createFormControl.ts` の `_formState.isLoading` の初期化（`isFunction(_options.defaultValues)`）、`_resetDefaultValues`、`useForm.ts` の `control._resetDefaultValues()` 呼び出し
- 履歴の手がかり:
  - `fcd7985c`（#9261、v7.41.0、2022-12-05）「support async `defaultValues` and form `values` update」
  - `411c8c16`（#9526、v7.41.0）「add `isLoading` state for async `defaultValues`」。サブコミットに「set default to true and avoid state flicking」
  - `ffccb4d6`（#10203、v7.43.9）「close async defaultValues not load」で `_resetDefaultValues` が入った
  - `54198d9d`（#13427、v7.77.0）の `resetDefaultValues` は公開APIの変種
- 章末の欠点: 非同期の初期値は一度しか入らない。サーバーのデータがあとで更新されても、フォームは追いかけない
- エピグラフ候補: サミュエル・ベケット『ゴドーを待ちながら』第1幕（仏語初版1952年）。待つ理由を問われ「ゴドーを待っている」と答えるやりとり。違い（ゴドーは来ないが、初期値は来る）を本文で書ける

### 25章　外から渡した値が変わったら、フォームはいつ追いかけるべきか

- ミニ実装: `code/rhf/25-values-prop/`
- 足す機能: `useForm({ values })`。前回と `deepEqual` で違うときだけ `_reset` する
- 並べる本物: `useForm.ts` の `props.values && !deepEqual(props.values, _values.current)` の `useEffect`、`resetOptions`、`keepFieldsRef: true`
- 履歴の手がかり:
  - `fcd7985c`（#9261、v7.41.0）。サブコミットに「auto reset form values with reactive values prop」「rename from `resetValuesOptions` to `resetOptions`」
  - `c3c48933`（#9959）「useForm `values` prop `keepDirtyValues` not update `isDirty`」
  - `d820110d`（#10525、v7.45.0）「equal `values` prop not reset form values」、`d3fff9f3`（#10606）
  - CHANGELOG（行162付近）「Use reactive `values` prop over `defaultValues` when `shouldUnregister` is true」
- 章末の欠点: 画面から消えた欄の値が `_formValues` に残り、送信される
- エピグラフ候補: アルフレッド・コージブスキー『科学と正気（Science and Sanity）』（1933年）「地図は土地ではない」。外の正本（土地）とフォームの写し（地図）の構造。章と頁は未確認なので、パス4で確かめられなければ候補なしにする

### 26章　画面から消えた欄の値は、まだフォームの値か

- ミニ実装: `code/rhf/26-should-unregister/`
- 足す機能: `shouldUnregister`。`ref` が `null` で呼ばれたら `_names.unMount` に入れ、描画のあとで `_removeUnmounted` が `unregister` する
- 並べる本物: `register` の `ref` コールバックの `else` 分岐（`_names.unMount.add(name)`）、`_removeUnmounted`（`live(ref)` で本当に外れたかを確かめる）、`unregister` の keep 系、`_formValues` の初期化（`_options.shouldUnregister ? {} : cloneObject(_defaultValues)`）
- 履歴の手がかり:
  - `1c8f0be8`（#1809、v6.0.0、2020-06-12）「config for auto un-register」。v6（`v6.15.4` の `src/useForm.ts` 90行）では `shouldUnregister = true` が既定
  - V7.0.0 ではこの設定自体がなくなり（`git grep` で v7.0.0 の `src/useForm.ts` に該当なし）、`706e0bdf`（#4758、v7.2.0、2021-04-17）「config `shouldUnregister`」で既定 `false` として戻った。CHANGELOG 7.2.0 に「default to false」
  - `_removeUnmounted` は `c03c66eb`（#6691）、`8ca89938`（#8073）「clean up at useForm useEffect」
  - 既定を反転した理由のPR本文は未確認
- 章末の欠点: 表示したまま送信からだけ外したい欄（編集できない欄）は、アンマウントでは表せない
- エピグラフ候補: トマス・ア・ケンピス『キリストに倣いて』第1巻第23章（15世紀前半）「目から取り去られれば、心からもすぐに過ぎ去る」。画面から消えたものが値からも消える構造

### 27章　無効にした欄は、検証と送信のどちらから外すべきか

- ミニ実装: `code/rhf/27-disabled/`
- 足す機能: 欄ごとの `disabled` を `_names.disabled` に記録し、送信する値から外す。`useForm({ disabled })` でフォーム全体も止める
- 並べる本物: `_setDisabledField`、`_names.disabled`、`handleSubmit` の `unset(fieldValues, name)` のループ、`_disableForm`、`src/logic/iterateFieldsByAction.ts`
- 履歴の手がかり:
  - `0d565fcf`（#10496、v7.48.0、2023-10-07）「feature: `disable` prop for `useForm`」
  - `c3d17567`（#12491、v7.54.2、2024-12-20）「track disabled fields and only omit data on submit」：値は持ったまま、送信のときだけ外す方針に変わった
  - `65c78bc5`（#13231）「update isValid when field disabled state changes」、`f2a905a9`（#13703）
- 章末の欠点: 欄が増減するリスト（`items.0`、`items.1`、…）で先頭を消すと、名前が一つずつずれ、Reactの `key` も値もエラーも対応がずれる
- エピグラフ候補: ハーマン・メルヴィル「書記バートルビー」（1853年）「しないほうがいいのですが（I would prefer not to）」。その場にいるが、仕事には加わらない構造

---

## アーク6　位置や時間がずれても、同じフィールド・同じ購読者だと言えるか（28〜31章）

### 28章　先頭を消したリストで、二番目の欄は誰になるのか

- ミニ実装: `code/rhf/28-field-array-ids/`
- 足す機能: `useFieldArray({ name })` の `fields`。値とは別に `generateId` で作ったidの配列を持ち、`fields` を返すときだけ `keyName` で付ける
- 並べる本物: `src/useFieldArray.ts` の `ids`（`React.useRef<string[]>`）、`generateId`（`src/logic/generateId.ts`）、`fields` の `useMemo`（`[keyName]: ids.current[index] || generateId()`）、`_getFieldArray`
- 履歴の手がかり:
  - `a6cbd943`（#768、v5.0.0、2020-01-14）「useFieldArray」
  - `ee17b354`（#957）「include keyName prop for custom id」、`11758f14`（#1281）「fix keyName without clobbering the data」
  - `39ceea84`（#7447、v7.23.0、2022-01-06）「improve useFieldArray performance with seperate id state」：idを値から外して別の `ref` に移した。サブコミットに「update useState to useRef」
  - それ以前は `omitKeys`（`a4b2c0ad`、`dbf6c74b` #6235）で値からidを取り除いていた
- 章末の欠点: 追加や削除のたびに、値、エラー、touched、dirtyを別々にずらして別々に通知している。途中の状態で描き直され、ずれた組み合わせが一瞬見える
- エピグラフ候補: プルタルコス『対比列伝』「テセウス伝」第23章第1節。朽ちた板を取り替え続けた船が同じ船かという、哲学者の議論の例。中身（値）が入れ替わってもid（名）を保つ構造

### 29章　配列を一つ動かすと、いくつの状態を一緒に動かす必要があるか

- ミニ実装: `code/rhf/29-set-field-array/`
- 足す機能: `_setFieldArray(name, values, method, args)`。同じ `method`（append、remove、swapなど）を値、`errors`、`touchedFields` に当て、`dirtyFields` を計算し直し、一回だけ通知する。`fields` 側には別のSubject `_subjects.array` で知らせる
- 並べる本物: `createFormControl.ts` の `_setFieldArray`（`fieldArrayErrors.root` を退避して戻す処理を含む）、`_subjects.array`、`useFieldArray.ts` の `control._subjects.array.subscribe` と `updateValues`、`src/utils/` の `append.ts`・`remove.ts`・`swap.ts`・`move.ts`・`insert.ts`・`prepend.ts`
- 履歴の手がかり:
  - `_subjects.array` は `a4b2c0ad`（#5958）で登場、`a8af1a5e`（#6215）「improve useFieldArray perf」
  - `6bf4c467`（#6226）で `_updateFieldArray` の形になり、`6da96622`（#7628）「improve useFieldArray code consistency」、`7f95b265`（#11522）で `_setFieldArray` に改名
  - `932c957e`（#13140、v7.66.1）「skip setValid() during batch array updates」
  - `c6c3d87e`（#13420）「notify all matching field-array roots on nested setValue updates」
  - アンマウント中の配列操作（`_state.action`、`actionArrayLengths`）の修正が続いている：`33810a6b`（#10026）、`4bace71e`（#13385）、`5e9e0245`（#13644）
- 章末の欠点: 「最低1件」「最大5件」のような、配列全体に対する規則を書く場所がない。個々の欄のエラーの木には、配列そのもののエラーを置く枝がない
- エピグラフ候補: ジョージ・ガモフ『1, 2, 3…無限大』第1章（1947年）で紹介されるヒルベルトのホテル。満室でも、全員が一つずつ隣の部屋へ移れば一人入れる。確度：ガモフの章は要確認。確かめられなければ候補なし

### 30章　配列そのもののエラーは、エラーの木のどこに置くのか

- ミニ実装: `code/rhf/30-field-array-rules/`
- 足す機能: `useFieldArray({ rules: { minLength, validate } })`。配列全体の検証結果を `errors.items.root` に置き、要素のエラーと並べる
- 並べる本物: `src/logic/updateFieldArrayRootError.ts`、`useFieldArray.ts` の `rules` と検証の `useEffect`、`_setFieldArray` の `rootError` の退避
- 履歴の手がかり:
  - `f27824d2`（#8562、元の提案は #8102、v7.34.0、2022-07-13）「useFieldArray `rules` props」。このコミットで `updateFieldArrayRootError.ts` が新設
  - `baea055c`（#12405）「nested array field invalid validation report on removed」
  - `6dc26dfa`（#13539）「useFieldArray min 1 item validation error changes its location in the errors object」、`86c29bd9`（#13419）
- 章末の欠点: `<Activity>` で隠した部品は購読を外される。隠れている間にフォームが変わると、戻ってきたときに古い値のまま表示される
- エピグラフ候補: アリストテレス『形而上学』第8巻（H）第6章（1045a8〜10）。部分の寄せ集めではない全体は、部分とは別の何かとしてある。配列全体の規則が要素の規則の和にならない構造

### 31章　購読を外していた間に起きた変化を、戻ってきた部品はどう知るのか

- ミニ実装: `code/rhf/31-resync-on-reconnect/`
- 足す機能: 購読を外す前に `snapshot` で値を写し、つなぎ直したときに `deepEqual` で比べ、違えば一度だけ `setState` する（`resyncIfNeeded`）
- 並べる本物: `src/useResyncOnReconnect.ts` の `resyncIfNeeded`、`snapshot`、`_connected`、`_renderCount`。これを使う `useForm.ts`、`useWatch.ts`、`useFormState.ts`、`useFieldArray.ts` の `useIsomorphicLayoutEffect` 内の呼び出し
- 履歴の手がかり:
  - `9fde5f38`（#13633、v7.85.0、2026-08-06）「support `<Activity />`」で `useResyncOnReconnect.ts` が新設
  - `4cbfe2d5`（#13688、v7.88.0）「reconcile stale fields after an Activity subtree reconnects」で `useFieldArray` にも広げた
  - `dfb71861`（#13698）「never reconciles when an Activity subtree is hidden on its first render」
  - 7年続いた「購読する、外す」の二択に、React側の新しい部品が三つ目の状態（外れているが、消えてはいない）を持ち込んだ、という読み方で本を閉じられる。この位置づけは推測で、PR本文は未確認
- 章末の欠点: 本の終わり。1章の問い（値をReactの外に置く）に戻り、`control` がReactの外にあったからこそ、つなぎ直した部品は `control` から今の値を読み直せた、という引きで閉じる
- エピグラフ候補: ワシントン・アーヴィング「リップ・ヴァン・ウィンクル」（『スケッチ・ブック』所収、1819年）。山で20年眠って村に戻り、世の中の変化を知らないまま話す男。引く一文は原文から選ぶ（未選定）

---

## 章の一覧（BACKLOG.md に写す用）

| 章 | アーク | タイトル案 | ミニ実装のフォルダ |
| --- | --- | --- | --- |
| 1 | 1 | フォームの値はどこに置かれているか | `01-useform-and-control` |
| 2 | 1 | formStateのどのキーを読んだかを覚える | `02-proxy-form-state` |
| 3 | 1 | registerと非制御コンポーネント | `03-register-and-uncontrolled` |
| 4 | 1 | Controllerと名前で絞り込む購読 | `04-controller` |
| 5 | 1 | 名前の中のドットは、誰に知らせるかをどう変えるのか | `05-nested-names` |
| 6 | 2 | watchは、なぜフォーム全体を描き直すのか | `06-watch` |
| 7 | 2 | useWatchは、描き直しをどこまで小さくできるのか | `07-use-watch` |
| 8 | 2 | useFormStateは、同じformStateを部品ごとにどう読み分けるのか | `08-use-form-state` |
| 9 | 2 | Contextでcontrolを配ると、なぜ全員が描き直されるのか | `09-form-provider` |
| 10 | 2 | 値が変わっても、計算した結果が同じなら描き直さずに済むか | `10-use-watch-compute` |
| 11 | 2 | Reactの外から、フォームの変化を購読できるか | `11-subscribe` |
| 12 | 3 | 送信の瞬間にだけ検証すれば、何回描き直すことになるか | `12-handle-submit` |
| 13 | 3 | 入力中に検証すると、なぜ描き直しが増えるのか | `13-validation-mode` |
| 14 | 3 | 送信のあとは、なぜ検証の時機を変えるのか | `14-revalidate-mode` |
| 15 | 3 | isValidは、誰も読んでいないときにも計算すべきか | `15-lazy-is-valid` |
| 16 | 3 | 遅れて届いた検証結果を、どう捨てるか | `16-stale-validation` |
| 17 | 3 | フォーム全体を一度に検証する関数に、欄ごとのエラーをどう答えさせるか | `17-resolver` |
| 18 | 4 | 同じエラーがもう一度出たとき、知らせるべきか | `18-errors-tree` |
| 19 | 4 | 一度触れた欄は、なぜ一度しか知らせないのか | `19-touched-fields` |
| 20 | 4 | 元に戻した値は、変えていないことになるか | `20-dirty-fields` |
| 21 | 4 | 一つの欄の状態だけを読むとき、何を購読したことになるのか | `21-get-field-state` |
| 22 | 4 | コードで入れた値は、ユーザーが入れた値と同じに扱うべきか | `22-set-value-options` |
| 23 | 5 | フォームを初めからやり直すとき、何を残せばよいか | `23-reset` |
| 24 | 5 | 初期値がまだ届いていないフォームは、何を表示すべきか | `24-async-default-values` |
| 25 | 5 | 外から渡した値が変わったら、フォームはいつ追いかけるべきか | `25-values-prop` |
| 26 | 5 | 画面から消えた欄の値は、まだフォームの値か | `26-should-unregister` |
| 27 | 5 | 無効にした欄は、検証と送信のどちらから外すべきか | `27-disabled` |
| 28 | 6 | 先頭を消したリストで、二番目の欄は誰になるのか | `28-field-array-ids` |
| 29 | 6 | 配列を一つ動かすと、いくつの状態を一緒に動かす必要があるか | `29-set-field-array` |
| 30 | 6 | 配列そのもののエラーは、エラーの木のどこに置くのか | `30-field-array-rules` |
| 31 | 6 | 購読を外していた間に起きた変化を、戻ってきた部品はどう知るのか | `31-resync-on-reconnect` |

---

## 未確認・推測のまとめ

- PRとIssueの本文は全章で未確認（GitHub APIに届かなかった）。「なぜ」は各章のパス3で読み直す
- 9章：`#12424` の取り消し（`8bb16320`）の理由
- 10章：`useWatch` に5年間 `compute` がなかった理由
- 21章：`getFieldState` の第2引数を渡さないと購読されない、という注意の初出
- 26章：v7で `shouldUnregister` の既定を `true` から `false` に反転した理由
- 31章：Activity対応を本の結びとする位置づけは、この章立ての読み方で、メンテナの記述ではない
- エピグラフの原文と章節は、パス4で底本に当たって確かめる。とくに6章（ユウェナリスの行番号）、14章（『論語』の章番号）、25章（コージブスキーの章）、29章（ガモフの章）は確認できなければ候補なしに戻す
