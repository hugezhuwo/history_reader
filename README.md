# History Reader · 本地历史阅读器

一个面向中文历史读物的轻量本地 PDF 阅读器。连续读原书，在侧栏看古文释义，在地图上理解书中的地点。Python + 原生 HTML/CSS/JavaScript，无需 Node.js 或前端构建。

## 能做什么

- 连续上下滚动，阅读窗口只保留三页；支持 50%–300% 缩放与高清重绘。
- 侧栏独立占右侧空间，可拖动调宽、收起；标题和翻页控件不占顶部阅读空间。
- 多本 PDF 切换，每本书分别记住页码和缩放比例。
- 当前页引文机翻、点击段落翻译、疑难字候选读音；支持本地 MLX 或兼容 Chat Completions 的接口。
- 地图累计最近十页，优先根据书内“某地（今某省某县）”说明定位。现代省界、不标省名，地名排在地图外侧。
- 未定位地名可按需联网查看来源；核对后手动采用参考点，保留出处。
- 本页地名以深色突出；地图下方先列出本页已定位和待定位的全部条目，再列其他页。

**仓库只发布程序和教程。** 书籍、模型权重、地图原始数据、个人配置、密钥、阅读缓存和含书页的截图均不随仓库发布。

## 五步跑起来

先安装 **Python 3.12**。macOS、Linux、Windows 均可用兼容接口进行翻译；内置 MLX 本地推理需要 Apple 芯片 Mac，系统兼容性参照 MLX 官方要求。

### 1. 下载代码、建立环境

```sh
git clone https://github.com/hugezhuwo/history_reader.git
cd history_reader
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
```

Windows PowerShell：把 `python3` 改成 `py -3.12`，激活环境使用 `.venv\Scripts\Activate.ps1`。也可直接运行 `.venv\Scripts\python.exe`，无需修改系统执行策略。

### 2. 下载地图数据

```sh
python scripts/download_resources.py
```

脚本只向 DataV 官方地址请求省界和行政区中心参考点，不发送书页。文件保存在 `data/`，不纳入 Git。下载失败或离线准备方法见 [完整安装教程](docs/SETUP.md)。外部数据的使用条件与许可由提供方规定。

### 3. 放入你有权使用的 PDF

把带文本层的 PDF 复制到 `books/`。支持子文件夹，添加后点击侧栏的刷新书架按钮。

没有现成测试书也可以生成一份原创演示文档：

```sh
python scripts/generate_demo.py
```

它只含自行编写的测试文字和短小古文例句，不依赖商业书籍。首次启动没有书也不会报错。

### 4. 选择翻译方式

**A. 已有兼容接口（所有支持的平台）**

macOS / Linux 示例：

```sh
export LLM_BASE_URL=http://127.0.0.1:11434/v1
export LLM_MODEL=你的模型名称
# 只有接口要求认证时再设置；不要提交真实密钥
# export LLM_API_KEY=你的密钥
```

Windows、配置文件和完整示例见 [安装教程](docs/SETUP.md)。接口必须提供 `/chat/completions`，`LLM_BASE_URL` 应包含需要的 `/v1` 前缀。

**B. Apple 芯片 Mac 本地模型**

```sh
python -m pip install -r requirements-model.txt
```

先选定 MLX 格式模型并阅读它的许可证，再下载：

```sh
python scripts/download_model.py --repo mlx-community/Qwen2.5-3B-Instruct-4bit
```

**注意：这个 3B 示例模型标注为 `qwen-research` 研究许可证，不能把项目的 AGPL 许可证套用到模型，商业用途须自行核对其条款。** 仓库不包含模型，不自动下载模型，也不替你接受许可。你可以换用符合用途的其他 MLX 模型，或选择兼容接口。

模型来源与许可：[示例模型页面](https://huggingface.co/mlx-community/Qwen2.5-3B-Instruct-4bit)、[原始 Qwen 模型](https://huggingface.co/Qwen/Qwen2.5-3B-Instruct)、[MLX LM](https://github.com/ml-explore/mlx-lm)。默认下载目录为 `models/local/`。

### 5. 启动

```sh
python server.py
```

打开 <http://127.0.0.1:8765>。停止时在终端按 Ctrl+C。

不配置模型也能阅读 PDF、缩放、切书、查看离线地图和候选读音；机翻会提示尚未配置。

## 配置与使用

复制 `config.example.json` 为 `config.json`，即可修改书籍目录、数据目录、模型目录、缓存目录和端口。相对路径以项目根目录为准，环境变量优先。密钥只从环境变量 `LLM_API_KEY` 读取，不放配置文件。

- 滚动切换阅读页时，翻译和最近十页地图自动跟随；页码是 PDF 顺序页。
- “100% / 适宽”适合当前阅读区，放大后可横向移动；Ctrl+滚轮也可缩放。
- 现代行政区坐标仅作城市/县城参考。“南”“东北”等方位保留书中说明，不伪造古址坐标。
- “待定位地名”只是候选。联网结果可能同名异地，结合书中年代核对后再采用。
- 本地模型译文可能误解专名、数字或制度术语；请对照原文和出处。
- 无 OCR：扫描 PDF 若没有文本层，只能读图，自动翻译和地名提取不可用。

## 数据、隐私和许可

- 默认本地模型分析不上传书页。配置远程 LLM 后，选中片段及邻近上下文会发往你指定的接口。
- “联网查证”向汉典 / 维基文库发送所选字词或检索短句；“联网查地名”向维基百科发送所选地名。均需点击触发，不自动联网整本书。
- 缓存含译文、片段和定位选择，位于 `.local/cache/`，不要上传。浏览器还会本地保存页码等偏好。
- 服务仅监听 `127.0.0.1`，用于本机个人阅读。没有账号、鉴权和公网部署方案，不要直接公开到互联网。
- 项目源代码采用 **AGPL-3.0-or-later**。PDF 组件 PyMuPDF 采用 AGPL / 商业双重许可，详见 [第三方说明](THIRD_PARTY_NOTICES.md)。模型、书籍和外部数据分别适用各自许可，不受项目 LICENSE 授权。

## 开发与测试

```sh
python -m unittest discover -s tests -v
```

测试用程序临时生成的 PDF 和合成数据，不需要私人书籍、模型、网络或第三方地图下载。GitHub Actions 使用相同步骤。

主要文件：`server.py` 本地服务和 PDF，`geography.py` 地名解析与来源查询，`model_worker.py` 本地模型适配，`settings.py` 配置，`app.js` / `index.html` / `style.css` 界面。详见 [安装教程](docs/SETUP.md) 与 [发布前检查](docs/PUBLISHING.md)。

## 自己上传到 GitHub

本地整理完成不代表已经发布。请按 [手把手上传教程](docs/UPLOAD_TO_GITHUB.md) 新建仓库并上传，包含不需要终端的网页操作步骤。

GitHub 连接的仓库授权入口见 [授权教程](docs/GITHUB_AUTHORIZATION.md)：插件设置中的「代码仓库访问权限 → 在 GitHub 上配置」。
