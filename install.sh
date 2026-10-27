#!/bin/bash
# knowledge-workshop DSH 插件安装脚本（Linux/macOS）
# 用法: ./install.sh --kb-root "/path/to/kb" --license-key "xxxx-xxxx"

set -e

KB_ROOT=""
LICENSE_KEY=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --kb-root) KB_ROOT="$2"; shift 2 ;;
    --license-key) LICENSE_KEY="$2"; shift 2 ;;
    *) echo "未知参数: $1"; exit 1 ;;
  esac
done

PLUGIN_DIR="$(cd "$(dirname "$0")" && pwd)"
PROFILES_DIR="$HOME/.dsh/profiles/desktop"
TARGET_DIR="$PROFILES_DIR/dsh-knowledge-workshop"

echo "📚 知识工坊插件安装"
echo "目标目录: $TARGET_DIR"

mkdir -p "$TARGET_DIR"

cp "$PLUGIN_DIR/index.js" "$TARGET_DIR/"
cp "$PLUGIN_DIR/client.js" "$TARGET_DIR/"
cp "$PLUGIN_DIR/cordis.patch.yml" "$TARGET_DIR/"
cp "$PLUGIN_DIR/icon.svg" "$TARGET_DIR/"
cp "$PLUGIN_DIR/package.json" "$TARGET_DIR/"
[ -d "$PLUGIN_DIR/locale" ] && cp -r "$PLUGIN_DIR/locale" "$TARGET_DIR/"

if [ -n "$KB_ROOT" ]; then
  echo "KNOWLEDGE_WORKSHOP_ROOT=$KB_ROOT" > "$TARGET_DIR/.env"
  echo "✅ 知识库根目录: $KB_ROOT"
fi

if [ -n "$LICENSE_KEY" ]; then
  echo "$LICENSE_KEY" > "$TARGET_DIR/.license"
  echo "✅ 许可证已写入"
fi

echo ""
echo "🔧 下一步操作："
echo "  1. 打开 DSH → 设置 → 插件"
echo "  2. 点击「安装本地插件」，选择: $TARGET_DIR"
echo "  3. 启用 dsh-knowledge-workshop"
echo "  4. 刷新 DSH Web GUI 页面"
echo ""
echo "✅ 安装完成！"
