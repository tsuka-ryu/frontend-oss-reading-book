# Next.js パス1: 約30章の章立て（plan-30）

対象: vercel/next.js（クローン先 `/tmp/oss/next.js`、`canary`）
基準の版: コミット `fa8dcf34`（2026-10-06）。`packages/next/package.json` の version は 16.5.0-canary.1。
FOCUS: RSCの境界がどこにどう引かれているか
除外: デプロイ、ホスティング固有の機能

この章立ては、`--depth 1` の浅いcloneで作った。
git履歴とPR本文はまだ一つも読んでいない。
各章の「履歴の手がかり」は、パス3で調べる項目の宛先だけを書く。理由の記述はすべてパス3の仕事である。

ファイルパス（`packages/next/src/` 以下）は、`fa8dcf34` の作業ツリーで実在を確かめたものだけを書いた。
関数名は一部しか確かめていない。確かめきれていないものは「未確認」と付けた。行番号はパス2で確かめる。

---

## この章立てで判断した点

### FOCUSの広げ方

FOCUS「RSCの境界がどこにどう引かれているか」を、次の問いに言い換えた。

「サーバーとクライアントの境界を、Next.jsはビルド時に何で検出し、実行時にどんな形でネットワークとバンドルを越えさせ、ブラウザ側でどう受け取るのか」

境界は3種類ある。モジュールの境界（`'use client'` / `'use server'`）、木の境界（レイアウトとセグメント）、時間の境界（静的と動的、キャッシュ）。
アークは、モジュール境界のビルド、サーバーでのレンダリング、境界を越える値、クライアントのルーター、サーバーアクション、静的と動的の境界、の6つに分けた。

### 題材のミニ実装

全章を通して、「ディレクトリ構成からルート木を作り、サーバーコンポーネントをFlight風のペイロードに直列化し、クライアントがそれを受けて木を差し替える小さなフレームワーク」を一本育てる。
言語はTypeScriptで、`code/nextjs/NN-slug/` に置く。Reactの実物は使わず、小さな要素木とJSON行のストリームで置き換え、Nodeのテストだけで動かす。
各章で足す機能は一つにする。

### 範囲の線引き

- Flightのワイヤ形式そのもの（`react-server-dom-webpack`）はReactの側にあり、このリポジトリでは `packages/next/src/compiled/` などの取り込み物として現れる。章では「Next.jsが何を渡し、何を受け取るか」までを読み、プロトコルの内部は深追いしない
- ビルドはwebpackとTurbopackの二系統がある。TurbopackはRustで別の場所にあるので、読むのはwebpack側のプラグインとSWC変換（`crates/next-custom-transforms`）に絞る。Turbopack側の実装は触れるだけにする

### 捨てた候補

- Pages Router（`pages/`、`render.tsx`）：App Routerとの対比で名前だけ出す
- 画像、フォント、メタデータの最適化：RSCの境界と関係が薄い
- Middleware（Proxy）、Edgeランタイム、`next start` のサーバー実装：ホスティング寄り
- ISRの配信とCDNキャッシュのヘッダ：デプロイ固有
- Turbopackの内部、Rust側のバンドラ：別の本の範囲
- 開発用オーバーレイ、DevTools、HMRの配信：RSCの境界ではない
- `next/image`、`next/link` のpropsの個別仕様：Linkはプリフェッチの章で必要な範囲だけ読む

### 履歴の調べ方（パス3への申し送り）

- 浅いcloneでは履歴が読めない。`git fetch --deepen` か、対象のパスに絞った `git log` を使う。このリポジトリは巨大なので、全履歴は取らない
- 履歴の節目は、`app/` ディレクトリの導入（Next 13）、Server Actionsの安定化（14）、PPRと `use cache`（15〜16）、セグメントキャッシュの導入（15.x）。コミットは未確認
- PR本文とissueが読める範囲かは、パス3の最初に確かめる（未確認）

### エピグラフについて

各章の候補は仮である。パス4で底本を決めるときに出典の確度を確かめる。全章「候補なし」とし、既存パートの出典と重ならないよう、パス4で探す。

---

## ディレクトリマップ（`packages/next/src/` ほか）

- `build/webpack/loaders/next-flight-loader/`: `'use client'` / `'use server'` を見て、モジュールを参照（プロキシ）に差し替えるローダー
- `build/webpack/loaders/next-app-loader/`: `app/` のファイル群から、ルートごとのエントリを組み立てる
- `build/webpack/plugins/flight-client-entry-plugin.ts`、`flight-manifest-plugin.ts`: クライアント境界ごとにエントリとマニフェストを作る
- `crates/next-custom-transforms/src/transforms/`: SWC変換。`react_server_components.rs`、`server_actions.rs`
- `server/app-render/`: App Routerのサーバー側レンダリング。`app-render.tsx`、`create-component-tree.tsx`、`action-handler.ts`
- `server/route-modules/app-page/`: ページのルートモジュール
- `server/use-cache/`: `'use cache'` の実装
- `client/components/`: ルーター（`app-router.tsx`、`layout-router.tsx`、`router-reducer/`、`segment-cache/`）
- `shared/lib/app-router-types.ts`: 木の型

## 語彙集（仮）

- Server Component / Client Component：既定でサーバーで動く部品と、`'use client'` で境界の内側に入る部品
- 境界：`'use client'` を書いたモジュール。ここから先の依存はすべてクライアントのバンドルに入る
- 参照（reference）：境界を越える関数やコンポーネントを、IDだけで表した代理
- Flight / RSCペイロード：サーバーが返す、直列化された描画結果のストリーム
- ローダーツリー：`app/` のファイルから作る、`layout`・`page`・`loading` などの木
- セグメント：URLの一区切りと、それに対応するローダーツリーの一枚
- Server Action：`'use server'` で公開する、クライアントから呼べるサーバー関数
- PPR / `use cache`：静的な殻と動的な穴、結果の再利用の境界

## 主要な呼び出しパス（仮。パス2で行番号まで確かめる）

1. ビルド：`next-app-loader` → `next-flight-loader`（`transformSource`）→ `FlightClientEntryPlugin` → `FlightManifestPlugin`
2. リクエスト：`app-page` のルートモジュール → `renderToHTMLOrFlight`（`app-render.tsx`、名前は未確認）→ `createComponentTree` → Flightのストリーム
3. ナビゲーション：`app-router.tsx` → `router-reducer` の `navigateReducer` → `fetchServerResponse`（名前は未確認）→ `layout-router.tsx`
4. アクション：`handleAction`（`action-handler.ts`）→ `decryptActionBoundArgs`（`encryption.ts`）→ `serverActionReducer`

---

## 章立て（30章、6アーク）

各章の形は、パス1では「問い／足す機能／読む本物の場所」の3点に絞る。

### アーク1 モジュールの境界をビルドで引く（1〜5）

1. `'use client'` と書くと、何が変わるのか
   足す機能：ディレクティブを検出し、モジュールをクライアント境界として印を付ける
   読む場所：`next-flight-loader/index.ts` の `transformSource`、`crates/.../react_server_components.rs`
2. クライアントのコンポーネントを、サーバーはどう参照するのか
   足す機能：境界のモジュールを「IDだけの代理」に差し替える
   読む場所：`next-flight-loader/module-proxy.ts`、`lib/client-and-server-references.ts` の `isClientReference`
3. サーバー専用のコードが、クライアントに混ざらないようにするには
   足す機能：境界の向きに違反するimportを、ビルド時に弾く
   読む場所：`next-invalid-import-error-loader.ts`、`react_server_components.rs` の検査（名前は未確認）
4. 境界ごとに、どのチャンクを読み込むのか
   足す機能：境界のモジュールからクライアントエントリを作り、マニフェストに登録する
   読む場所：`flight-client-entry-plugin.ts`、`flight-manifest-plugin.ts`、`next-flight-client-entry-loader.ts`
5. 1つの木のなかで、2つの世界は同じモジュールをどう持つのか
   足す機能：サーバーとクライアントで別々のモジュールグラフを持たせる
   読む場所：`next-swc-loader.ts` のレイヤー指定、`build/webpack-config.ts`（未確認）

### アーク2 サーバーで木を描く（6〜10）

6. `app/` のファイルから、ルートの木をどう作るのか
   足す機能：ディレクトリを走査して、`layout`・`page` のローダーツリーを作る
   読む場所：`next-app-loader/index.ts`、`next-app-loader/create-app-route-code.ts`、`shared/lib/router/utils/app-paths.ts`
7. 入れ子のレイアウトを、どの順で組み立てるのか
   足す機能：セグメントごとに、レイアウトの中にページを差し込む
   読む場所：`server/app-render/create-component-tree.tsx` の `createComponentTree`
8. サーバーコンポーネントの出力を、ストリームにするには
   足す機能：木をJSON行のチャンクとして順に流す
   読む場所：`server/app-render/app-render.tsx`、`server/app-render/use-flight-response.tsx`
9. 同じ木から、HTMLとRSCペイロードの2つを作るのはなぜか
   足す機能：一度のレンダリングで、HTMLのストリームと埋め込みペイロードを分岐させる
   読む場所：`app-render.tsx`、`server/app-render/stream-ops.ts`（呼び出し経路は未確認）
10. 1回のリクエストの間、リクエスト固有の情報をどこに持つのか
    足す機能：非同期の文脈（AsyncLocalStorage）に、リクエストの状態を載せる
    読む場所：`server/app-render/work-async-storage.external.ts`、`work-unit-async-storage.external.ts`、`async-local-storage.ts`

### アーク3 境界を越える値（11〜15）

11. サーバーからクライアントへ、何を渡せて何を渡せないのか
    足す機能：直列化できない値を、境界で検出して弾く
    読む場所：`server/app-render/rsc/taint.ts`（未確認）、`react-server.node.ts`（呼び出し経路は未確認）
12. 機密データを、うっかり境界の向こうへ渡さないようにするには
    足す機能：taintで印を付けた値を、直列化時に拒否する
    読む場所：`server/app-render/rsc/taint.ts`
13. クライアントが読むスクリプトを、サーバーはいつ事前に教えるのか
    足す機能：境界のチャンクを、`preload` として先に出す
    読む場所：`server/app-render/rsc/preloads.ts`、`create-component-styles-and-scripts.tsx`
14. 描画中の `redirect` と `notFound` を、どう木の外へ伝えるのか
    足す機能：例外を投げて、木の途中から抜ける
    読む場所：`client/components/redirect.ts`、`not-found.ts`、`http-access-fallback/`、`is-next-router-error.ts`
15. 描画中のエラーを、サーバーとクライアントでどう分けて扱うのか
    足す機能：本番ではメッセージを隠し、ダイジェストだけを渡す
    読む場所：`server/app-render/create-error-handler.tsx`、`client/components/error-boundary.tsx`

### アーク4 クライアントのルーター（16〜21）

16. 受け取ったペイロードから、画面の木をどう作り直すのか
    足す機能：ペイロードを受け取り、ルートの木を差し替える
    読む場所：`client/components/app-router.tsx`、`app-router-instance.ts`、`router-reducer/create-initial-router-state.ts`
17. ナビゲーションは、なぜreducerで書かれているのか
    足す機能：ナビゲーションを状態遷移の関数にする
    読む場所：`router-reducer/router-reducer.ts`、`reducers/navigate-reducer.ts`、`use-action-queue.ts`
18. 変わった部分だけを、どう取りに行くのか
    足す機能：現在の木と次の木を比べ、共通のレイアウトを飛ばす
    読む場所：`router-reducer/compute-changed-path.ts`、`fetch-server-response.ts`、`parse-and-validate-flight-router-state.tsx`
19. 共有レイアウトの状態を、ナビゲーションの間どう保つのか
    足す機能：レイアウトのコンポーネントを、遷移しても再生成しない
    読む場所：`client/components/layout-router.tsx`、`render-from-template-context.tsx`
20. リンクが画面に入ったとき、何を先読みするのか
    足す機能：表示に入ったリンクの先を、優先度つきで先読みする
    読む場所：`client/components/links.ts`、`segment-cache/scheduler.ts`、`prefetch.ts`
21. セグメント単位のキャッシュは、何をキーにするのか
    足す機能：セグメント単位のキャッシュと、LRUでの追い出し
    読む場所：`segment-cache/cache.ts`、`cache-key.ts`、`cache-map.ts`、`lru.ts`、`vary-path.ts`

### アーク5 Server Actions（22〜25）

22. `'use server'` の関数を、クライアントからどう呼ぶのか
    足す機能：関数を参照に差し替え、呼び出しをPOSTにする
    読む場所：`next-flight-server-reference-proxy-loader.ts`、`next-flight-loader/action-client-wrapper.ts`、`server-reference.ts`、`server_actions.rs`
23. サーバー側は、受け取ったPOSTをどう関数呼び出しに戻すのか
    足す機能：アクションのIDから関数を探して実行する
    読む場所：`server/app-render/action-handler.ts` の `handleAction`、`next-flight-action-entry-loader.ts`
24. クライアントから来た呼び出しを、なぜそのまま信用しないのか
    足す機能：Originの検証と、公開していない関数の拒否
    読む場所：`server/app-render/csrf-protection.ts`、`action-handler.ts` の `parseHostHeader`、`next-flight-loader/action-validate.ts`
25. クロージャに閉じ込めた値を、どうクライアントに預けるのか
    足す機能：束縛した引数を暗号化してクライアントに持たせる
    読む場所：`server/app-render/encryption.ts` の `decryptActionBoundArgs`、`encryption-utils.ts`

### アーク6 静的と動的の境界（26〜30）

26. 動的なAPIを呼ぶと、なぜ静的にできなくなるのか
    足す機能：`cookies()` などの呼び出しで、静的化を打ち切る
    読む場所：`server/app-render/dynamic-rendering.ts` の `markCurrentScopeAsDynamic`、`throwToInterruptStaticGeneration`、`client/components/hooks-server-context.ts`
27. 静的な殻に、動的な穴を空けるには
    足す機能：Suspense境界を穴にして、殻を先に返す（PPR）
    読む場所：`dynamic-rendering.ts`、`postponed-state.ts`、`staged-rendering.ts`
28. 関数の結果を、引数の組から再利用するには
    足す機能：`'use cache'` の関数を、引数をキーにして保存する
    読む場所：`server/use-cache/use-cache-wrapper.ts`、`next-flight-loader/cache-wrapper.ts`
29. キャッシュを、いつ・どの単位で捨てるのか
    足す機能：寿命のプロファイルとタグで、保存した結果を無効化する
    読む場所：`server/use-cache/cache-life.ts`、`cache-tag.ts`、`handlers.ts`、`tiered-cache-handler.ts`
30. レスポンスを返した後の仕事を、どこで続けるのか
    足す機能：レスポンス完了後に走る処理を登録する
    読む場所：`server/after/`、`server/app-render/after-task-async-storage.external.ts`

---

## 章ごとの未確認事項（パス2で確かめる）

- 3章、12章：`react_server_components.rs` の検査と `taint.ts` の役割
- 5章：レイヤー指定の実体（`WEBPACK_LAYERS` の定義場所）
- 9章：HTMLとペイロードを分岐させる実際の関数
- 21章：キャッシュのキーに入るもの（`vary-path.ts` の読み方）
- 27章、28章：PPRと `use cache` が実験フラグか既定かを、基準の版の設定で確かめる
