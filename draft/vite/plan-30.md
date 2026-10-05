# Vite パス1: 約30章の章立て（plan-30）

対象: vitejs/vite（クローン先 `/tmp/oss/vite`、`main`）
基準の版: コミット `10033218`（2026-10-01、`release: v8.3.2`）。`packages/vite/package.json` の version は 8.3.2。
FOCUS: 開発サーバの解決とHMR
除外: プラグインエコシステム、バンドラ（Rolldown）の内部

この章立ては、`--depth 1` の浅いcloneで作った。
git履歴とPR本文はまだ一つも読んでいない。
各章の「履歴の手がかり」は、パス3で調べる項目の宛先だけを書く。理由の記述はすべてパス3の仕事である。

ファイルパスと関数名は、`10033218` の作業ツリーで `ls` と `grep` をかけて実在を確かめたものだけを書いた。
確かめていない名前は「未確認」と付けた。行番号はパス2で確かめる。

---

## この章立てで判断した点

### 題材のミニ実装

全章を通して、「バンドルしない小さなdevサーバーを、静的配信からHMRまで一本育てる」ミニ実装を作る。
言語はTypeScriptで、`code/vite/NN-slug/` に置く。各章で足す機能は一つにする。
ブラウザ側は、Nodeのテストで動くよう、ごく小さな偽のクライアントを章の中で持つ。

### FOCUSの広げ方

FOCUS「開発サーバの解決とHMR」を、次の問いに言い換えた。

「バンドルをやめてブラウザにimportを任せたとき、サーバーは何を覚え、ファイルが変わったとき何を無効にし、何をブラウザに送るのか」

アークは、ブラウザに任せる骨格、プラグインによる解決と変換、無効化の波及、受け入れの宣言と配信、依存の事前バンドル、環境という一般化、の6つに分けた。

### 現行の版について

この版（v8系）はRolldownとoxcを使う。`node/plugins/oxc.ts` と `oxcResolvePlugin` があり、`esbuild.ts` も残っている（用途は未確認、パス2で確かめる）。
以前の版（esbuild／Rollup時代）との差は、パス3で履歴を読むときに「いつ入れ替わったか」として確かめる。

### 捨てた候補

- ビルド（`build.ts`、`importAnalysisBuild.ts`、`manifest.ts`）：FOCUS外。25章と30章で違いに触れるにとどめる
- Rolldownの内部、`rolldownDepPlugin.ts` の中身：除外
- 個別のプラグイン（`plugin-legacy`、`wasm.ts`、`worker.ts`、`json.ts`）：除外（プラグインエコシステム）
- `create-vite` のテンプレート：FOCUS外
- プロキシ、`preview`、`openBrowser`、`shortcuts`：FOCUS外
- `import.meta.glob`（`importMetaGlob.ts`）：解決の一種だが、足す機能が `importAnalysis` と同じ型になるので捨てた
- SSRの出力とマニフェスト（`ssrManifestPlugin.ts`）：除外。27、28章は変換の形と実行器だけ読む

### 履歴の調べ方（パス3への申し送り）

- 浅いcloneでは履歴が読めないので、対象のパスに絞って `git fetch --deepen` か、`git log -- packages/vite/src/node/server` で取得する
- `docs/changes/` に破壊的変更の理由が残っている。入口にする
- PR本文とissueは、このセッションの範囲内のリポジトリではないので読めるかをパス3の最初に確かめる（未確認）

### エピグラフについて

各章の候補は仮である。パス4で底本を決めるときに出典の確度を確かめる。全章「候補なし」とし、既存パートの出典と重ならないよう、パス4で探す。

---

## ディレクトリマップ（`packages/vite/src/`）

- `node/server/`: devサーバー。`index.ts`（`createServer`）、`moduleGraph.ts`、`transformRequest.ts`、`pluginContainer.ts`、`hmr.ts`、`ws.ts`、`warmup.ts`、`environment.ts`、`bundledDev.ts`
- `node/server/middlewares/`: `transform.ts`、`indexHtml.ts`、`static.ts`、`htmlFallback.ts` など
- `node/server/environments/`: `runnableEnvironment.ts`、`fetchableEnvironments.ts`
- `node/plugins/`: 標準プラグイン。`importAnalysis.ts`、`resolve.ts`、`css.ts`、`clientInjections.ts`、`optimizedDeps.ts`、`preAlias.ts`
- `node/optimizer/`: 依存の事前バンドル。`index.ts`、`optimizer.ts`、`scan.ts`
- `node/ssr/`: `ssrTransform.ts`、`fetchModule.ts`、`runtime/serverModuleRunner.ts`
- `node/plugin.ts`、`node/config.ts`、`node/baseEnvironment.ts`、`node/environment.ts`: プラグインの型、設定、環境
- `client/`: ブラウザ側。`client.ts`、`overlay.ts`
- `shared/`: サーバーとクライアントが共有する。`hmr.ts`（`HMRContext`、`HMRClient`）、`hmrHandler.ts`
- `docs/guide/`、`docs/changes/`: 設計の説明と破壊的変更の記録

## 語彙集（仮）

- モジュールグラフ：`EnvironmentModuleGraph`。URLとファイルでモジュールを引き、importの辺を持つ
- `transformRequest`：URLを受けて、解決、読み込み、変換して結果を返す関数
- プラグインコンテナ：Rollup互換のフックをdevで呼ぶ。`createEnvironmentPluginContainer`
- HMRの境界：`accept` を宣言したモジュール。更新の波及はここで止まる
- `import.meta.hot`：モジュールごとのHMR API。実体は `HMRContext`
- 事前バンドル：`optimizeDeps`。依存を1つのESMにまとめる
- 環境（`Environment`）：`client`、`ssr` など。それぞれグラフとコンテナを持つ

## 主要な呼び出しパス（仮。パス2で行番号まで確かめる）

1. 起動：`createServer` → `_createServer`（`server/index.ts`）→ 環境の初期化 → ミドルウェアの登録 → `listen`
2. リクエスト：`transformMiddleware` → `transformRequest` → `doTransform` → `loadAndTransform`（`resolveId`、`load`、`transform`）→ `importAnalysis` が import を書き換え → モジュールグラフに保存
3. HMR：watcherの `change` → `handleHMRUpdate`（`hmr.ts`）→ `hotUpdate` フック → `updateModules` → `propagateUpdate` → ws で `update` を送る
4. クライアント：`handleMessage`（`client.ts`）→ `HMRClient` → 動的import → `accept` のコールバック
5. 依存：`optimizeDeps` / `createDepsOptimizer` → `scanImports` → まとめ → `tryOptimizedResolve` で `/node_modules/.vite/deps/` に解決

---

## アーク1　ブラウザに任せると、何が変わるのか（1〜5章）

### 1章　バンドルせずにdevサーバーを立てると、何が速くなるのか

- ミニ実装: `code/vite/01-serve-esm/`
- 足す機能: `index.html` と `.js` を返すだけの静的サーバー。`<script type="module">` からブラウザが依存を辿る
- 並べる本物: `packages/vite/src/node/server/index.ts`（`createServer`、`_createServer`）、`docs/guide/why.md`
- 履歴の手がかり: 「バンドル先行」を捨てた動機は `docs/guide/why.md` に書かれているか。初期コミットの時点の設計。パス3
- 章末の欠点: `import vue from 'vue'` のような素の名前をブラウザは解決できない
- エピグラフ: 候補なし

### 2章　素の名前のimportを、どう書き換えるのか

- ミニ実装: `code/vite/02-rewrite-imports/`
- 足す機能: import文を字句で見つけ、`'vue'` を `/node_modules/vue/...` のURLに書き換える
- 並べる本物: `node/plugins/importAnalysis.ts`（`importAnalysisPlugin`、`isExplicitImportRequired`）
- 履歴の手がかり: importを正規表現でなく専用のレキサで読む理由（未確認）。パス3
- 章末の欠点: 書き換えは通ったが、どのURLがどのファイルかを覚えていない
- エピグラフ: 候補なし

### 3章　URLとファイルの対応を、誰が覚えるのか

- ミニ実装: `code/vite/03-module-graph/`
- 足す機能: URLからモジュールを引く表と、ファイルからモジュールを引く表を持つ小さなグラフ
- 並べる本物: `node/server/moduleGraph.ts`（`EnvironmentModuleGraph`、`EnvironmentModuleNode`、`ensureEntryFromUrl`、`getModulesByFile`）
- 履歴の手がかり: `urlToModuleMap` と `fileToModulesMap` が別々にある理由。同じファイルが複数URLになる例（`?import`、`?raw` など）。パス3
- 章末の欠点: グラフはできたが、importerとimporteeの辺をまだ張っていない
- エピグラフ: 候補なし

### 4章　リクエスト一つは、どんな段を通って変換されるのか

- ミニ実装: `code/vite/04-transform-request/`
- 足す機能: URLを受けて、解決、読み込み、変換の3段を順に呼び、結果をモジュールに保存する
- 並べる本物: `node/server/transformRequest.ts`（`transformRequest`、`doTransform`、`loadAndTransform`）、`node/server/middlewares/transform.ts`（`transformMiddleware`）
- 履歴の手がかり: `transformMiddleware` が `.js`、`.css`、`import` クエリを見分ける条件。パス3
- 章末の欠点: 同じURLが同時に二度来ると、二度変換してしまう
- エピグラフ: 候補なし

### 5章　同じURLが同時に来たら、どうまとめるのか

- ミニ実装: `code/vite/05-pending-and-etag/`
- 足す機能: 進行中の変換のPromiseを共有し、変わっていなければ304を返す
- 並べる本物: `transformRequest.ts`（`doTransform` の `pending`、`getCachedTransformResult`）、`middlewares/transform.ts`（`cachedTransformMiddleware`）、`moduleGraph.ts`（`getModuleByEtag`）
- 履歴の手がかり: `pending` を持ち始めたPRと、etagを使う理由。パス3
- 章末の欠点: 変換の段が一枚岩で、プラグインを差し込めない
- エピグラフ: 候補なし

---

## アーク2　プラグインは、解決と変換をどう分担するのか（6〜10章）

### 6章　プラグインを、どんな順で呼ぶのか

- ミニ実装: `code/vite/06-plugin-container/`
- 足す機能: `resolveId`、`load`、`transform` を配列の順に呼ぶコンテナ。最初に値を返したところで止める／全員に通す
- 並べる本物: `node/server/pluginContainer.ts`（`createEnvironmentPluginContainer`、`resolveId`、`load`、`transform` のメソッド）、`node/plugin.ts`（`Plugin`、`enforce`）
- 履歴の手がかり: Rollupのプラグイン契約を借りた経緯。パス3
- 章末の欠点: 順序は配列の並びで決まる。`pre`/`post` の置き場がない
- エピグラフ: 候補なし

### 7章　`enforce` とフックの `order` は、何を並べ替えるのか

- ミニ実装: `code/vite/07-plugin-order/`
- 足す機能: `enforce: 'pre' | 'post'` で3つの組に分けて並べる
- 並べる本物: `node/plugin.ts`（`enforce`、`resolveEnvironmentPlugins`）、`node/config.ts`（プラグイン並べ替え、関数名は未確認）
- 履歴の手がかり: `enforce` が足された経緯。パス3
- 章末の欠点: 標準のプラグイン（解決、CSSなど）がまだ無い
- エピグラフ: 候補なし

### 8章　素の名前は、どこで実ファイルに解決されるのか

- ミニ実装: `code/vite/08-resolve/`
- 足す機能: `node_modules` を辿り、`package.json` の `exports` から入口を決める
- 並べる本物: `node/plugins/resolve.ts`（`oxcResolvePlugin`、`tryNodeResolve`、`tryFsResolve`、`resolvePackageEntry`）、`node/nodeResolve.ts`（`nodeResolveWithVite`）
- 履歴の手がかり: 自前の解決から外部リゾルバへ寄せた時期。`oxcResolvePlugin` の名前の由来。パス3
- 章末の欠点: 解決はできたが、条件（`browser`、`import`）の選び方が固定
- エピグラフ: 候補なし

### 9章　CSSは、なぜJavaScriptとして返すのか

- ミニ実装: `code/vite/09-css-as-js/`
- 足す機能: `.css` のimportを、`<style>` を差し込むJSに変換する
- 並べる本物: `node/plugins/css.ts`（`cssPlugin`、`isDirectCSSRequest`）、`client/client.ts`（`updateStyle`、`removeStyle`）
- 履歴の手がかり: CSSをJSにする方式と `?direct` の使い分け。パス3
- 章末の欠点: スタイルの差し替えが、ページ再読み込みに頼っている
- エピグラフ: 候補なし

### 10章　`index.html` は、なぜ変換の入口になるのか

- ミニ実装: `code/vite/10-index-html/`
- 足す機能: HTMLに `<script type="module" src="/@vite/client">` を差し込んで返す
- 並べる本物: `node/server/middlewares/indexHtml.ts`（`indexHtmlMiddleware`、`createDevHtmlTransformFn`）、`node/plugins/clientInjections.ts`（`clientInjectionsPlugin`）、`plugin.ts`（`transformIndexHtml`）
- 履歴の手がかり: HTMLを入口にした設計の理由。パス3
- 章末の欠点: クライアントはあるが、サーバーと話す道がない
- エピグラフ: 候補なし

---

## アーク3　ファイルが変わったとき、何を無効にするのか（11〜15章）

### 11章　ファイルの変更を、どうモジュールに結びつけるのか

- ミニ実装: `code/vite/11-watch/`
- 足す機能: ファイル監視の通知を受け、`fileToModulesMap` から該当モジュールを引く
- 並べる本物: `node/server/index.ts`（`watcher` の `change` ハンドラ）、`node/watch.ts`（`resolveChokidarOptions`）、`moduleGraph.ts`（`onFileChange`）
- 履歴の手がかり: chokidar を使い続ける理由と、設定の既定値。パス3
- 章末の欠点: 変わったモジュールは分かるが、それを使う側を知らない
- エピグラフ: 候補なし

### 12章　importする側の辺は、いつ張られるのか

- ミニ実装: `code/vite/12-import-edges/`
- 足す機能: 変換のたびにimportの一覧を取り、前回との差を辺に反映する
- 並べる本物: `moduleGraph.ts`（`updateModuleInfo`、`importedModules`、`importers`）、`importAnalysis.ts`（`updateModuleInfo` の呼び出し）
- 履歴の手がかり: 辺をリクエスト時に張る設計（静的に張らない）の理由。パス3
- 章末の欠点: 辺はできたが、使われなくなったモジュールを掃除していない
- エピグラフ: 候補なし

### 13章　使われなくなったモジュールを、どう掃除するのか

- ミニ実装: `code/vite/13-prune/`
- 足す機能: 辺が外れて孤立したモジュールを検出し、`prune` を通知する
- 並べる本物: `server/hmr.ts`（`handlePrunedModules`）、`moduleGraph.ts`（`updateModuleInfo` の戻り値）、`shared/hmr.ts`（`HMRContext.prune`）
- 履歴の手がかり: pruneコールバックが入った経緯。パス3
- 章末の欠点: 掃除はできるが、変更の波及先をどこで止めるか決まっていない
- エピグラフ: 候補なし

### 14章　変更は、どこまで上へ伝わるのか

- ミニ実装: `code/vite/14-propagate/`
- 足す機能: importerを辿り、`accept` したモジュールで止める。誰も止めなければ全再読み込み
- 並べる本物: `server/hmr.ts`（`updateModules`、`propagateUpdate`、`areAllImportsAccepted`）
- 履歴の手がかり: 「境界」という考え方がwebpack由来かどうか。パス3
- 章末の欠点: 循環importで永遠に回る
- エピグラフ: 候補なし

### 15章　循環importは、更新の波及をどう壊すのか

- ミニ実装: `code/vite/15-circular/`
- 足す機能: 波及中に出会った循環を検出し、止まらない更新を全再読み込みに落とす
- 並べる本物: `server/hmr.ts`（`isNodeWithinCircularImports`）
- 履歴の手がかり: 循環の扱いが入ったissue。パス3
- 章末の欠点: accept の宣言をどう見つけるかが、まだ素朴
- エピグラフ: 候補なし

---

## アーク4　受け入れの宣言を、どう読み、どう届けるのか（16〜20章）

### 16章　`import.meta.hot.accept` は、どうサーバーに知られるのか

- ミニ実装: `code/vite/16-lex-accept/`
- 足す機能: ソースを走査して `accept(...)` の呼び出しと依存の文字列を取り出す
- 並べる本物: `server/hmr.ts`（`lexAcceptedHmrDeps`、`lexAcceptedHmrExports`）、`importAnalysis.ts`（`isSelfAccepting` の設定）
- 履歴の手がかり: 字句解析を選んだ理由と制約（文字列リテラルのみ、など）。パス3
- 章末の欠点: サーバーは知ったが、クライアントのAPIがない
- エピグラフ: 候補なし

### 17章　モジュールごとの `hot` オブジェクトは、何を持つのか

- ミニ実装: `code/vite/17-hot-context/`
- 足す機能: `createHotContext(ownerPath)` が `accept`、`dispose`、`data` を持つ文脈を返す
- 並べる本物: `shared/hmr.ts`（`HMRContext`、`HMRClient`）、`client/client.ts`（`createHotContext`）
- 履歴の手がかり: `hot.data` を残す理由。パス3
- 章末の欠点: 文脈はあるが、更新のメッセージを受け取る道がない
- エピグラフ: 候補なし

### 18章　サーバーとブラウザは、何でつながるのか

- ミニ実装: `code/vite/18-ws-channel/`
- 足す機能: WebSocketでJSONを送り合う小さなチャネル。接続時に `connected` を送る
- 並べる本物: `server/ws.ts`（`createWebSocketServer`、`HMR_HEADER`）、`server/hmr.ts`（`HotChannel`、`normalizeHotChannel`、`createServerHotChannel`）
- 履歴の手がかり: WebSocketとSSEの比較。HotChannelに一般化した経緯。パス3
- 章末の欠点: メッセージの種類が一つしかない
- エピグラフ: 候補なし

### 19章　更新のメッセージには、どんな種類があるのか

- ミニ実装: `code/vite/19-payload/`
- 足す機能: `update`、`full-reload`、`prune`、`error`、`custom` を送り分ける
- 並べる本物: `client/client.ts`（`handleMessage`）、`types/hmrPayload.d.ts`（未確認）
- 履歴の手がかり: `custom` イベントの用途と `import.meta.hot.send`。パス3
- 章末の欠点: 更新を受けても、新しいコードを取り込む手順がない
- エピグラフ: 候補なし

### 20章　新しいコードは、どう取り込まれるのか

- ミニ実装: `code/vite/20-fetch-update/`
- 足す機能: 変更したモジュールを `?t=タイムスタンプ` 付きで動的importし、`accept` のコールバックに渡す
- 並べる本物: `shared/hmr.ts`（`HMRClient`）、`client/client.ts`（`injectQuery`）、`moduleGraph.ts`（`lastHMRTimestamp`）
- 履歴の手がかり: `?t=` でキャッシュを避ける方式と、`import` のURL書き換えとの関係。パス3
- 章末の欠点: 複数の更新が連続すると順序が崩れる
- エピグラフ: 候補なし

---

## アーク5　依存パッケージを、どう速く読むのか（21〜25章）

### 21章　`node_modules` の依存は、なぜ事前にまとめるのか

- ミニ実装: `code/vite/21-prebundle-why/`
- 足す機能: 数百のファイルに分かれた依存を、1つのESMにまとめる
- 並べる本物: `docs/guide/dep-pre-bundling.md`、`node/optimizer/index.ts`（`optimizeDeps`）
- 履歴の手がかり: lodash-es のようなパッケージの例と、CommonJSの変換が理由として書かれているか。パス3
- 章末の欠点: どの依存をまとめるべきか分からない
- エピグラフ: 候補なし

### 22章　まとめる対象を、どう見つけるのか

- ミニ実装: `code/vite/22-scan/`
- 足す機能: エントリHTMLから `import` を辿り、素の名前の依存を集める
- 並べる本物: `optimizer/scan.ts`（`scanImports`、`ScanEnvironment`）、`optimizer/index.ts`（`discoverProjectDependencies`）
- 履歴の手がかり: スキャン専用の環境を持つ理由。パス3
- 章末の欠点: 起動時の一度きりで、後から現れる依存を拾えない
- エピグラフ: 候補なし

### 23章　途中で見つけた新しい依存は、どう扱うのか

- ミニ実装: `code/vite/23-late-discovery/`
- 足す機能: 実行中に見つかった依存を溜め、まとめ直してページを再読み込みする
- 並べる本物: `optimizer/optimizer.ts`（`createDepsOptimizer`）、`plugins/optimizedDeps.ts`（`optimizedDepsPlugin`、`throwOutdatedRequest`）
- 履歴の手がかり: 「新しい依存を見つけたら再読み込み」の経緯。パス3
- 章末の欠点: まとめ直しのたびに全部やり直す
- エピグラフ: 候補なし

### 24章　前回の結果を、いつ使い回せるのか

- ミニ実装: `code/vite/24-cache-metadata/`
- 足す機能: ロックファイルと設定のハッシュを保存し、同じなら再利用する
- 並べる本物: `optimizer/index.ts`（`loadCachedDepOptimizationMetadata`、`DepOptimizationMetadata`、`OptimizedDepInfo`）
- 履歴の手がかり: ハッシュに入れる要素の増減。パス3
- 章末の欠点: 事前にまとめたものと、元のURLの対応が必要
- エピグラフ: 候補なし

### 25章　事前バンドルしたものを、どのURLで配るのか

- ミニ実装: `code/vite/25-optimized-url/`
- 足す機能: `/node_modules/.vite/deps/` のURLに解決し、`?v=hash` で強いキャッシュをかける
- 並べる本物: `resolve.ts`（`tryOptimizedResolve`）、`plugins/preAlias.ts`（`preAliasPlugin`）、`plugins/optimizedDeps.ts`、`middlewares/static.ts`
- 履歴の手がかり: `?v=` で `immutable` にできる理由。パス3
- 章末の欠点: dev専用の仕組みが、ビルドでは別物になる
- エピグラフ: 候補なし

---

## アーク6　環境という一般化と、速さの限界（26〜30章）

### 26章　devサーバーは、なぜ「環境」を複数持つのか

- ミニ実装: `code/vite/26-environments/`
- 足す機能: `client` と `ssr` の2つの環境がそれぞれモジュールグラフとプラグインコンテナを持つ
- 並べる本物: `node/baseEnvironment.ts`（`BaseEnvironment`）、`node/server/environment.ts`（`DevEnvironment`）、`docs/guide/api-environment.md`
- 履歴の手がかり: 環境APIが入る前のグローバルな `moduleGraph` との違い。`docs/changes/per-environment-apis.md`。パス3
- 章末の欠点: 環境ごとに変換結果が違う理由を知らない
- エピグラフ: 候補なし

### 27章　SSRのコードは、なぜ別の形に変換されるのか

- ミニ実装: `code/vite/27-ssr-transform/`
- 足す機能: `import`/`export` を `__vite_ssr_import__` 呼び出しに書き換える
- 並べる本物: `node/ssr/ssrTransform.ts`（`ssrTransform`、`ssrImportKey`、`ssrExportNameKey`）、`shared/ssrTransform.ts`
- 履歴の手がかり: Nodeのネイティブ読み込みを使わない理由。パス3（SSR本体は除外。変換の形だけ読む）
- 章末の欠点: 書き換えたコードを動かす側がない
- エピグラフ: 候補なし

### 28章　変換したコードは、誰が実行するのか

- ミニ実装: `code/vite/28-module-runner/`
- 足す機能: 書き換えたモジュールを、取得して評価する小さな実行器
- 並べる本物: `node/ssr/runtime/serverModuleRunner.ts`、`node/ssr/fetchModule.ts`、`server/environments/runnableEnvironment.ts`（`createRunnableDevEnvironment`）
- 履歴の手がかり: `ssrLoadModule` から `ModuleRunner` に移した経緯。`docs/changes/ssr-using-modulerunner.md`。パス3
- 章末の欠点: devでは一度に1ファイルずつ取る。大きなアプリで遅い
- エピグラフ: 候補なし

### 29章　モジュールが多すぎるとき、何が詰まるのか

- ミニ実装: `code/vite/29-warmup/`
- 足す機能: よく使うファイルを先に変換しておき、リクエストの連鎖を短くする
- 並べる本物: `server/warmup.ts`（`warmupFiles`）、`docs/guide/performance.md`
- 履歴の手がかり: ウォーターフォールの問題と対策の経緯。パス3
- 章末の欠点: 根本はバンドルしないことの代償
- エピグラフ: 候補なし

### 30章　バンドルしないという賭けは、何を失ったのか

- ミニ実装: `code/vite/30-bundled-dev/`
- 足す機能: 変換結果をメモリ上のファイルとして返す方式の素描
- 並べる本物: `node/server/bundledDev.ts`（`BundledDev`、`MemoryFiles`）、`middlewares/memoryFiles.ts`、`client/bundledDevClient.ts`
- 履歴の手がかり: フルバンドルのdevの位置づけ（実験的かどうか）。パス3（Rolldown内部は除外）
- 章末の欠点: —（最終章。残る問いを書いて終える）
- エピグラフ: 候補なし

---
