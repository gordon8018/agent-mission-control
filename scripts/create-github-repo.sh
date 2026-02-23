#!/bin/bash

# GitHub 仓库创建脚本
# 用途：自动创建 GitHub 仓库并推送代码

set -e

# GitHub 仓库配置
GITHUB_USER="gordon8018"
GITHUB_REPO="agent-mission-control"
GITHUB_REPO_FULL="${GITHUB_USER}/${GITHUB_REPO}"

# 颜色输出
echo "🚀 GitHub 仓库创建脚本"
echo "=========================================="
echo ""
echo "仓库信息："
echo "  - 用户: ${GITHUB_USER}"
echo "  - 仓库名: ${GITHUB_REPO}"
echo "  - 完整路径: ${GITHUB_REPO_FULL}"
echo ""
echo "=========================================="
echo ""

# 检查是否已登录
echo "📋 检查 GitHub 认证状态..."
if gh auth status &> /dev/null; then
  echo "✅ 已登录到 GitHub"
  echo ""
else
  echo "❌ 未登录到 GitHub"
  echo ""
  echo "🔧 请先登录："
  echo "   gh auth login"
  echo ""
  echo "   然后重新运行此脚本"
  exit 1
fi

# 检查仓库是否已存在
echo "📋 检查仓库是否已存在..."
if gh repo view "${GITHUB_REPO_FULL}" &> /dev/null; then
  echo "⚠️  仓库已存在"
  echo ""
  echo "仓库: https://github.com/${GITHUB_REPO_FULL}"
  echo ""
  echo "如果需要重新创建，请先删除仓库："
  echo "   gh repo delete ${GITHUB_USER}/${GITHUB_REPO}"
  echo ""
  echo "或直接推送代码："
  echo "   git push"
  exit 0
else
  echo "✅ 仓库不存在，可以创建"
  echo ""
fi

# 创建仓库
echo "🚀 创建新仓库..."
gh repo create "${GITHUB_REPO}" \
  --public \
  --source=. \
  --description="Mission Control: Task management and AI team collaboration platform with calendar scheduling, full-text search, and intelligent agents." \
  --topics="task-management","calendar","ai","team","collaboration","kanban","full-text-search"

if [ $? -eq 0 ]; then
  echo "✅ 仓库创建成功"
  echo ""
  echo "仓库地址:"
  echo "   https://github.com/${GITHUB_REPO_FULL}"
  echo ""

  # 推送代码
  echo "🚀 推送代码到 GitHub..."
  git push -u origin

  if [ $? -eq 0 ]; then
    echo ""
    echo "✅ 代码推送成功"
    echo ""
    echo "=========================================="
    echo "🎉 完成！"
    echo "=========================================="
    echo ""
    echo "GitHub 仓库:"
    echo "   https://github.com/${GITHUB_REPO_FULL}"
    echo ""
    echo "本地仓库:"
    echo "   $(pwd)"
    echo ""
    echo "下一步:"
    echo "   1. 在 GitHub 仓库设置中："
    echo "      - 添加描述"
    echo "      - 设置主题颜色"
    echo "      - 配置 GitHub Pages（可选）"
    echo "   2. 部署到 Vercel 或其他平台"
    echo "   3. 创建第一个 Release"
    echo ""
  else
    echo "❌ 代码推送失败"
    echo ""
    echo "请手动推送："
    echo "   git push -u origin"
    echo ""
  fi
else
  echo "❌ 仓库创建失败"
  echo ""
  echo "请检查错误信息并重试"
  exit 1
fi
