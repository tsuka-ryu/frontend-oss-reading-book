#!/usr/bin/env bash
# 初回セットアップ。リポジトリを作って push するところまで。
set -euo pipefail

USER="${1:-}"
if [ -z "$USER" ]; then
  echo "usage: ./setup.sh <github-username> [repo-name]" >&2
  exit 1
fi
REPO="${2:-oss-reading}"

# 1. 文章規範を取得
mkdir -p spec/japanese-tech-writing
curl -sL https://gist.githubusercontent.com/k16shikano/fd287c3133457c4fd8f5601d34aa817d/raw/SKILL.md \
  -o spec/japanese-tech-writing/SKILL.md
echo "fetched: spec/japanese-tech-writing/SKILL.md"

# 2. プレースホルダを置換
grep -rl 'USER/oss-reading' . --include='*.toml' --include='*.md' \
  | xargs sed -i.bak "s#USER/oss-reading#${USER}/${REPO}#g"
find . -name '*.bak' -delete
echo "replaced: USER/oss-reading -> ${USER}/${REPO}"

# 3. リポジトリを作って push
git init -b main
git add -A
git commit -m "初期構成。mdBook、デプロイ、執筆仕様"
gh repo create "${REPO}" --public --source=. --push

echo
echo "残り一手。Settings > Pages > Source を GitHub Actions にする:"
echo "  https://github.com/${USER}/${REPO}/settings/pages"
