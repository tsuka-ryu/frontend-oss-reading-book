# 名前の中のドットは、誰に知らせるかをどう変えるのか

> あるものが別のものについて述語されるとき、述語について言われることはすべて、主語についても言われる。
>
> ——アリストテレス『カテゴリー論』第3章（1b10〜12、拙訳）

> 読んだ版：react-hook-form/react-hook-form `28334fa`（2026-09-23、タグ v7.88.0）の `src/utils/get.ts`、`src/utils/set.ts`、`src/utils/stringToPath.ts`、`src/utils/isKey.ts`、`src/logic/shouldSubscribeByName.ts`
>
> この章のミニ実装：`code/rhf/05-nested-names/`（`code/rhf/` で `npm install` のあと `node --test "code/rhf/05-nested-names/*.test.ts"`）

前章は、購読者が名前を申告し、一致した通知だけを受け取る仕組みを作った。
ところが名前が文字列の完全一致では、こういう書き方が報われない。

```ts
register("addresses.0.city");
control._subscribe({ name: "addresses", /* ... */ });
```

住所の配列全体を見ている部品に、1件目の市の変更が届いてほしい。
この章の目標は、ドット入りの名前を木の道筋として読み、送信するデータも木の形にすることである。
名前の中のドットは、誰に知らせるかをどう変えるのか。

## 一歩目：ドットは、ただの文字である

素朴に、`_formValues[name] = value`のまま`"user.email"`に書いてみる。

```text
{ 'user.email': 'a@b' }
```

送信したいのは`{ user: { email: "a@b" } }`という形である。
平らな辞書では、`user`の下にある値を取り出す手段もない。
名前をドットで割り、一段ずつ降りて書く`set`を作る。

```ts
export default function set(object: Record<string, any>,
  path: string, value: unknown) {
  const keys = path.split(".");
  keys.forEach((key, i) => {
    if (i === keys.length - 1) { object[key] = value; return; }
    object[key] ??= {}; // 途中の枝がなければ作る
    object = object[key];
  });
}
```

途中の枝がなければ空のオブジェクトを作りながら降りるのが要点である。
読む側の`get`は、同じ道筋を`reduce`でたどるだけの数行で済む。

## 二歩目：配列がオブジェクトになる

`"addresses.0.city"`を書いてみる。

```text
{ addresses: { '0': { city: 'Tokyo' } } } false
```

最後の`false`は`Array.isArray(addresses)`である。
`0`はオブジェクトの鍵としても有効なので、エラーにならないまま配列でないものができた。
JSONにすると`[...]`ではなく`{"0": ...}`になり、サーバーは受け取ってくれない。

次の鍵が数字なら配列を作る、と判定する一行で直る。

```ts
object[key] ??= isNaN(+keys[i + 1]) ? {} : [];
```

`"users.0"`の`0`は添字で、`"users.first"`の`first`は名前だという区別を、名前の見た目だけで付けている。
（`"item.007"`のような名前の扱いは、ここでは見ない。）

## 三歩目：親に、子の知らせを届ける

値が木になったので、通知の絞り込みも木に合わせる。
`"addresses"`を見る購読者は、その下の`"addresses.0.city"`の変化を知りたい。
逆に`"addresses.0.city"`を見る購読者は、`"addresses"`が丸ごと入れ替わったときにも知りたい。
双方向の前方一致にする。

```ts
const m = (n: string, s: string) => n.startsWith(s) || s.startsWith(n);
```

```text
m("addresses", "addresses.0.city") → true
m("user", "username") → true
```

二行目が困る。
`user`と`username`は無関係な別の欄で、文字列の頭が同じなだけである。
`user`の購読者が、`username`を打つたびに起こされる。

一致を、「同じ名前」か「相手が自分の名前と`.`で始まる」かに限る。

```ts
const isAncestor = (parent: string, child: string) =>
  parent === child || child.startsWith(parent + ".");

// isAncestor(name, signalName) || isAncestor(signalName, name)
```

文字列の前方一致から、木の祖先関係の判定に変わった。
名前を指定しない購読は、前章のとおり素通りする。

## 確かめる

`createFormControl.test.ts`に、次の7つを足した。
ドット入りの名前が入れ子の値になること。
数字の鍵が配列になること。
入れ子の初期値と比べて`isDirty`が変わること。
親の購読者に子の変化が、子の購読者に親の変化が届くこと。
`user`の購読者に`username`の変化が届かないこと。
最後の一つは次節の欠点を示すテストである。

前章の「足りないもの」を示していたテスト（親の購読者に子が届かない）は、欠点が直ったので、届くことを確かめるテストに置き換えた。
全体は34件で、すべて通る。

## 本物の get・set と並べる

本物の`set`は、ミニ実装とほぼ同じ形をしている。

```ts
const tempPath = isKey(path) ? [path] : stringToPath(path);
// ...
newValue =
  isObject(objValue) || Array.isArray(objValue)
    ? objValue
    : !isNaN(+tempPath[index + 1]) ? [] : {};
```

途中の枝が既にオブジェクトか配列ならそれを使い、なければ次の鍵が数字かどうかで配列か`{}`を作る。
ミニ実装の`??=`は、既存の値が文字列などでも残してしまうが、本物は上書きして枝を作り直す。

| | ミニ実装 | 本物 |
| --- | --- | --- |
| 名前の分割 | `split(".")` | 正規表現 `/[.[\]'"]/` で割る。`a[0].b`も`a.0.b`と同じ道筋になる |
| 平らな名前 | 常に割る | `/^\w*$/` に合えば割らずに一段として扱う（`isKey`） |
| 読めなかったとき | `undefined` | 割って読めなければ、`"a.b"`という鍵そのものも探す |
| 危険な鍵 | 考えない | `__proto__`、`constructor`、`prototype` を含む道筋は無視する |
| 通知の一致 | `.`の境界で祖先関係を見る | 既定は境界を見ない `startsWith` の双方向。`exact`で境界を見る |

最後の行が、この章でいちばん皮肉なところである。
本物の既定は、ミニ実装が二歩目で捨てた素朴な版のままで、`"user"`と`"username"`は一致する。

## 本物はなぜ違うか

入れ子の値を扱い始めたのは古く、`eb1177ea`「support nested data object」（2019-06-13）が最初のコミットである。
V6までは、フィールドを`fieldsRef.current["a.b.c"]`という平らなキーで持ち、読むときに`transformToNestObject`で木に組み直していた。
V7（`9555d16f`、#3741、2021-04-01）が`set`で入れ子に直接書く形に変え、組み直しの関数は`src/`から消えた。
書くときに木にしておけば、読むたびの組み直しが要らない、という整理だと読める。

前方一致の判定は、前章で見たとおり`c1243995`（#6768、2021-10-12）で`shouldSubscribeByName`に切り出された。
そのときは「頭が同じなら一致」の式のままだった。
`exact`が足されたのは`2371e8b`（#6983、2021-11-14）で、`useWatch`と`useFormState`のprop（オプション引数）としてである。

`exact`の式は`currentName === signalName || currentName.startsWith(signalName + '.')`である。
これは一方向で、購読者の名前が通知の名前の子孫のときだけ通す。
`user`の購読者に`user.email`の通知は届かない。
ミニ実装の双方向の境界つき判定とは別物なので、対応表には「近い」としか書けなかった。

`get`が`"a.b"`という鍵そのものも探す理由は、履歴からは特定できなかった。
V6までの平らなキーで作られたデータを読める、という互換のためではないかと推測するが、確かめていない。
危険な鍵の除外は、`6aa81f9e`（#13479、2026-05-25）と`a00a1e37`（#13559、2026-06-30）で、`get`と`unset`に後から足された。
ドット入りの文字列でオブジェクトの奥に書き込める道具は、`__proto__`という名前を通すと全オブジェクトの共通の親を書き換えられる、という代償を最初から抱えていた。
それがコードに表れたのは、7年後だった。

## 子について言えることは、親についても

エピグラフは、ある述語が主語に当てはまるなら、その述語についての述語も主語に当てはまる、という趣旨の一節である。
名前の木では、`addresses`の下に`addresses.0.city`があり、上位の名前に関わる知らせは下位の名前にも関わる。
この片方向の包含は、`exact`の式の向きに近い。

ミニ実装の双方向は、アリストテレスより広い。
子の変化が親にも届くからである。
`addresses.0.city`の一文字で、`addresses`全体を読む部品が描き直される。
何を読んだかを問う購読の設計は、木になると、読んだ範囲が広いほど起こされやすいという代償を払う。

## 足りないもの

値は入れ子で読み書きでき、通知も木の関係で届くようになった。
ところが、`register`の`onChange`は、値を入れても購読者に何も流さない。

```ts
control._subscribe({ name: "user.email",
  formState: { values: true }, callback: () => notified++ });
register("user.email").onChange(type("user.email", "a@b"));
// notified は 0 のまま
```

`Controller`の値はReactのstateに持ち直されたが、`register`の欄は、DOMだけが最新の値を知っている。
`App`の中で、いま入力中のメールアドレスを画面に出したいとき、どこから読めばよいのか。
`getValues`は呼んだ瞬間の値を返すだけで、変わっても描き直しは起きない。
描き直しは、フォーム全体を丸ごとにしてよいのか。
次章は、`watch`が、なぜフォーム全体を描き直すのかを見る。

---
確度:
- 実ソース確認済み：`get`、`set`、`stringToPath`（`FIELD_PATH_RE`）、`isKey`（`IS_KEY_RE`）、`PROTOTYPE_KEYWORDS`、`shouldSubscribeByName`（`exact`の分岐を含む）の中身（v7.88.0）
- 履歴、PR由来：`eb1177ea`（コミットメッセージと日付のみ確認、差分は読んでいない）、V6までの`transformToNestObject`（`9555d16f^:src/useForm.ts` に呼び出しがあることを確認）、V7での置き換え、`c1243995`、`2371e8b`、`6aa81f9e`、`a00a1e37`（いずれもコミットの題と日付）
- 推測：V7で木に直した理由、`get`が平らな鍵も探す理由（互換のためと思われるが記述は見つからず）、`exact`が一方向な理由
- 実行で確認：ミニ実装の34件のテスト（Node.js 22.22）。本文の一歩目から三歩目の出力は、直す前の版を別に書いて動かした実出力。本物のコードは読んだだけで、動かして比べてはいない（`"user"`と`"username"`が既定で一致する点はソースの式からの読み取り）
- 引用：アリストテレス『カテゴリー論』第3章 1b10〜12（ベッカー版の行番号）。ギリシア語原文を本文と照合しておらず、記憶にもとづく大意の拙訳。逐語ではない
