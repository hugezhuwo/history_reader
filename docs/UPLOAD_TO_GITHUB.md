# 手把手上传到 GitHub

本地项目已经整理好。**目前没有上传到 GitHub，也没有创建远程仓库。**

推荐第一次使用网页上传，不需要终端、Git 命令或访问令牌。

## 方法一：GitHub 网页上传

### 1. 新建一个空仓库

1. 用你自己能正常登录的浏览器打开 https://github.com/new 。
2. Owner 选择自己的账号。此项目 README 中的示例账号是 `hugezhuwo`。
3. Repository name 填 `history_reader`。
4. Description 可填：`面向中文历史读物的本地 PDF 阅读器：古文释义、地名地图、连续阅读。`
5. 要开源就选择 **Public**。公开后任何人都可以下载源代码。
6. **不要勾选 Add a README，不要再选择 .gitignore 或 License**。项目内已经有这些文件，许可证是 AGPL-3.0-or-later。
7. 点击 **Create repository**。

### 2. 选择本地文件

1. 在新仓库页面点击 **uploading an existing file**。如果没有这个链接，可选择 **Add file → Upload files**。
2. 在访达打开 `桌面 → 有趣的阅读 → history_reader`。
3. 按 **Command + Shift + .** 显示隐藏文件。
4. 选中这个文件夹**里面的文件和子文件夹**，包括 `.gitignore`、`.gitattributes`、`.github`、README.md、server.py、docs、scripts、tests 等，拖进 GitHub 上传区。
5. 上传的是项目内容，不要把外面的“有趣的阅读”整个拖进去，也不要把 ZIP 本身当作代码上传。
6. 最终 README.md、server.py 应直接位于仓库首页，不应多套一层 history_reader 目录。

首次整理的文件夹只包含可发布内容。若以后运行过项目，上传前还要排除 `.local`、`.venv`、config.json、模型、下载的地图数据和书籍。**网页上传不会自动按照 .gitignore 帮你过滤文件。**

### 3. 检查并提交

1. 在 GitHub 上传列表确认没有 PDF、电子书、书页截图、模型权重、config.json、密钥、缓存、日志或虚拟环境。
2. Commit message 填：`Initial open-source release`。
3. 点击 **Commit changes**，等待上传完成。
4. 仓库地址应类似 https://github.com/hugezhuwo/history_reader 。只有实际创建并上传成功后，这个地址才是你的项目。

### 4. 上传后检查

- 首页能显示 README，LICENSE 被识别为 AGPL。
- 根目录能看到 server.py、settings.py、geography.py、app.js。
- docs 里有安装、发布和本教程。
- books、data、models 目录里只有说明文件，没有真实书籍、下载数据或权重。
- 若 `.github/workflows/tests.yml` 也上传了，Actions 页面会自动运行合成测试；第一次可能需要你自行启用 Actions。
- 点击 Code → Download ZIP，在新目录解压，按照 README 从头安装，验证其他人能够复现。

## 方法二：以后使用 Git 更新（可选）

如果习惯终端，在 GitHub 新建空仓库之后，可以在自己的项目目录运行下面的命令。不要把密钥或令牌粘贴到聊天、源码或 README 中。

```sh
cd ~/Desktop/有趣的阅读/history_reader
git init -b main
git add .
git status --short
git diff --cached --stat
```

检查暂存文件没有私人内容后，再执行：

```sh
git commit -m "Initial open-source release"
git remote add origin https://github.com/hugezhuwo/history_reader.git
git push -u origin main
```

如果 Git 要求设置身份，只在当前仓库设置你希望公开的署名及 GitHub 隐私邮箱；可在 GitHub Settings → Emails 找到自己的 noreply 地址。

如果 HTTPS 推送要求认证，GitHub 不接受普通账号密码直接用于 Git 推送。第一次使用建议改用上面的网页上传，或使用 GitHub 官方 GitHub Desktop 完成浏览器登录；无需把凭据提供给任何人。

后续修改时：

```sh
git add .
git diff --cached --stat
git commit -m "Describe your update"
git push
```

每次提交前都检查文件列表。`git add .` 会遵守 .gitignore，但已经被跟踪的文件不受新增忽略规则影响。

## 如需让 Codex 继续提交修改

已有 GitHub 连接时，在「插件设置 → GitHub → GitHub」找到「代码仓库访问权限」，点击右侧「在 GitHub 上配置」，将目标仓库加入访问范围并保存。不要先断开重连。详见 [仓库授权教程](GITHUB_AUTHORIZATION.md)。
