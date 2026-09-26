#!/bin/bash
# 사용법: ./deploy.sh "커밋 메시지"
# 버전 번호를 올려서, 방문자 브라우저에 저장된 예전 페이지/파일 대신 최신 버전이 바로 보이게 함
set -e
cd "$(dirname "$0")"
V=$(date +%Y%m%d%H%M%S)
sed -i '' -E "s#(css/style.css|js/main.js|js/birthday.js)\?v=[0-9]+#\1?v=$V#g; s#var PAGE_VERSION = \"[0-9]+\"#var PAGE_VERSION = \"$V\"#" index.html
echo "$V" > version.txt
git add -A
git commit -qm "${1:-Update site}"
git push -q
echo "deployed $V"
