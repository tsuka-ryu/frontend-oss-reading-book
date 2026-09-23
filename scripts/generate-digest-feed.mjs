#!/usr/bin/env node
// src/digest/daily/*.md の号一覧から src/digest/feed.xml を作る。
// mdbookはsrc/以下の非Markdownファイルをそのままbook/へコピーするので、
// ここで生成した feed.xml をコミットしておけば `mdbook build` だけで
// book/digest/feed.xml として配信される（ワークフロー側の変更は不要）。
// 依存はNode.js組み込みモジュールのみ。
//
// 実行タイミング：ダイジェストの号を書いた（src/digest/daily/YYYY-MM-DD.md を
// 追加・更新した）ら、コミット前にこのスクリプトを実行してfeed.xmlを更新する。

import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const dailyDir = path.join(repoRoot, "src", "digest", "daily");
const outFile = path.join(repoRoot, "src", "digest", "feed.xml");

const SITE_URL = "https://tsuka-ryu.github.io/frontend-oss-reading-book";
const FEED_URL = `${SITE_URL}/digest/feed.xml`;
const CHANNEL_URL = `${SITE_URL}/digest/index.html`;

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function cdata(value) {
  // "]]>" はCDATA内に書けないので分割してエスケープする
  return `<![CDATA[${String(value).replace(/]]>/g, "]]]]><![CDATA[>")}]]>`;
}

function parseIssue(filePath, date) {
  const text = readFileSync(filePath, "utf8");

  const titleMatch = text.match(/^#\s+(.+)$/m);
  const title = titleMatch ? titleMatch[1].trim() : date;

  const hitokotoMatch = text.match(/今日のひとこと[:：]\s*(.+)/);
  const description = hitokotoMatch ? hitokotoMatch[1].trim() : "";

  return { date, title, description };
}

function toPubDate(date) {
  // 号はJSTの日付単位なので、その日のJST 00:00を発行時刻として扱う
  return new Date(`${date}T00:00:00+09:00`).toUTCString();
}

function main() {
  const files = readdirSync(dailyDir).filter((name) =>
    /^\d{4}-\d{2}-\d{2}\.md$/.test(name),
  );

  if (files.length === 0) {
    console.error("no daily digest files found, skipping feed generation");
    return;
  }

  const issues = files
    .map((name) => {
      const date = name.replace(/\.md$/, "");
      return parseIssue(path.join(dailyDir, name), date);
    })
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  const lastBuildDate = new Date().toUTCString();

  const items = issues
    .map((issue) => {
      const link = `${SITE_URL}/digest/daily/${issue.date}.html`;
      return `    <item>
      <title>${cdata(issue.title)}</title>
      <link>${escapeXml(link)}</link>
      <guid isPermaLink="true">${escapeXml(link)}</guid>
      <pubDate>${toPubDate(issue.date)}</pubDate>
      <description>${cdata(issue.description)}</description>
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${cdata("フロントエンドの基盤を読む — ダイジェスト")}</title>
    <link>${escapeXml(CHANNEL_URL)}</link>
    <description>${cdata(
      "Web仕様とフロントエンドOSSの動きを、毎朝届くニュースとしてまとめるダイジェスト。",
    )}</description>
    <language>ja</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    <atom:link xmlns:atom="http://www.w3.org/2005/Atom" href="${escapeXml(
      FEED_URL,
    )}" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>
`;

  writeFileSync(outFile, xml, "utf8");
  console.log(`wrote ${issues.length} issue(s) to ${outFile}`);
}

main();
