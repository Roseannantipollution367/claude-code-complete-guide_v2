# GitHub Pages 部署说明

## 自动部署设置

由于 GitHub Personal Access Token 需要 `workflow` scope 才能创建 workflow 文件，请手动完成以下步骤：

### 步骤 1：创建 GitHub Actions workflow

在 GitHub 仓库网页上，点击 **Actions** -> **New workflow** -> **set up a workflow yourself**

将以下内容粘贴进去，文件名为 `deploy.yml`：

```yaml
name: Deploy VitePress to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Build VitePress
        run: npm run docs:build

      - name: Setup Pages
        uses: actions/configure-pages@v5

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: docs/.vitepress/dist

  deploy:
    environment:
      name: github-pages
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

### 步骤 2：配置 GitHub Pages

1. 进入仓库 **Settings** -> **Pages**
2. Source 选择 **GitHub Actions**
3. 保存

### 步骤 3：触发部署

推送任何更改到 `main` 分支，或在 Actions 页面手动触发 workflow。

部署完成后，访问 https://bcefghj.github.io/claude-code-complete-guide_v2/
