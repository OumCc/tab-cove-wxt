# 发布 Tab Cove 到 GitHub

桌面 Chrome 用户从 GitHub Release 的 **Assets** 下载扩展 ZIP，解压后手动加载。下文以 `package.json` 中的 `0.0.2` 为例，后续发布时同步替换版本号、Git 标签和 ZIP 文件名。

## 1. 确认发布版本并打包

确认 `package.json` 的 `version` 为 `0.0.2`，准备发布的代码和文档都已提交到 `main`，工作区干净。打包时使用最终要打标签的同一个提交。

使用 `.node-version` 指定的 Node 版本和项目的 pnpm。全新检出且尚未安装依赖时，先运行 `pnpm install --frozen-lockfile`。依赖就绪后执行以下命令。

```sh
pnpm run test
pnpm run compile
pnpm run zip
unzip -t .output/tab-cove-wxt-0.0.2-chrome.zip
unzip -p .output/tab-cove-wxt-0.0.2-chrome.zip manifest.json
```

`pnpm run zip` 会构建 Chrome 生产版并生成 `.output/tab-cove-wxt-0.0.2-chrome.zip`。确认 ZIP 根目录包含 `manifest.json`，其中 `version` 为 `0.0.2`，`manifest_version` 为 `3`。把这个 ZIP 解压到临时目录，在桌面 Chrome 中加载并打开工作台，用几个收藏实际试一次「打开所选标签页」。[WXT 打包文档](https://wxt.dev/guide/essentials/publishing) · [Chrome 手动加载文档](https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world#load-unpacked)

## 2. 创建 Git 标签并上传附件

确认 `v0.0.2` 可用于本次发布，然后从用于打包的 `main` 执行以下命令。`.output/` 已被 Git 忽略，ZIP 通过 Release 附件上传。

```sh
git push origin main
git tag -a v0.0.2 -m "Tab Cove v0.0.2"
git push origin v0.0.2
```

1. 打开仓库的 **Releases**，选择 **Draft a new release**，选择已推送的标签 `v0.0.2`。[Tab Cove Releases](https://github.com/OumCc/tab-cove-wxt/releases) · [GitHub Release 文档](https://docs.github.com/en/repositories/releasing-projects-on-github/managing-releases-in-a-repository#creating-a-release)
2. 标题填写 `Tab Cove v0.0.2`。说明可以写「在集合卡片上勾选要打开的标签页，支持普通打开或打开为 Chrome 标签组」，并附上[安装与手动更新说明](https://github.com/OumCc/tab-cove-wxt/blob/v0.0.2/README.md#下载与安装)。
3. 上传 `.output/tab-cove-wxt-0.0.2-chrome.zip`。确认附件名与版本一致后，点击 **Publish release**。

## 3. 验证下载并分享给用户

如果面向任意访客，发布前确认仓库为公开。发布后用未登录窗口打开版本页，从 **Assets** 下载并解压 `tab-cove-wxt-0.0.2-chrome.zip`。私有仓库的下载对象需要有仓库访问权限，可用有权限的用户账号验证。[仓库可见性说明](https://docs.github.com/en/repositories/creating-and-managing-repositories/about-repositories#about-repository-visibility)

将[版本页](https://github.com/OumCc/tab-cove-wxt/releases/tag/v0.0.2)发给用户。初次安装时，在桌面 Chrome 打开 `chrome://extensions`，开启「开发者模式」，点击「加载已解压的扩展程序」，选择直接包含 `manifest.json` 的目录。更新时先在 Tab Cove 的「数据管理」中下载备份，再用新版解压文件覆盖原安装目录，最后在扩展管理页重新加载。[下载、安装与手动更新](../README.md#下载与安装)
