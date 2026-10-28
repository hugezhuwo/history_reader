# 从零安装

## 1. 准备环境

安装 Python 3.12，下载并解压本仓库，进入包含 server.py 的目录。所有命令在这个目录执行。

macOS / Linux：

```sh
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
```

Windows PowerShell：

```powershell
py -3.12 -m venv .venv
.venv\Scripts\python.exe -m pip install -r requirements.txt
```

后续 `python` 若没有激活环境，则替换为 `.venv/bin/python` 或 `.venv\Scripts\python.exe`。无需管理员权限、Node.js 或前端构建，不必修改 Windows 系统执行策略。

## 2. 下载地图资源

```sh
python scripts/download_resources.py
```

脚本直接向 DataV 请求两份文件，不上传书页：

| 本地文件 | 来源 |
| --- | --- |
| data/provinces.json | https://geo.datav.aliyun.com/areas_v3/bound/100000_full.json |
| data/modern_places.json | https://geo.datav.aliyun.com/areas_v3/bound/all.json |

数据不随仓库再次分发。使用条件以提供方为准；只用于阅读参考，不用于测绘或权属判断。

离线方法：在联网电脑上执行脚本，把生成的这两个文件复制到离线电脑的 data 目录。手动准备时，省界保存为 provinces.json；行政区 JSON 数组须包装为 `{"source":"上面的来源地址","retrieved":"实际下载日期","records":[原始数组内容]}` 后保存为 modern_places.json。

## 3. 加入书籍

将你有权使用的 PDF 放进 books，支持子目录。新增后点击刷新书架。

没有测试书可以生成原创单页样本：

```sh
python scripts/generate_demo.py
```

自动翻译需要 PDF 文本层。无文本扫描本只能读图；请自行用 OCR 工具添加文本层。本项目不会替你上传书籍，也没有内置 OCR。

## 4A. 配置兼容接口

服务必须支持 Chat Completions；Base URL 应保留需要的 /v1 前缀，但不要带最后的 /chat/completions。

macOS / Linux：

```sh
export LLM_BASE_URL=http://127.0.0.1:11434/v1
export LLM_MODEL=你的服务实际提供的模型名
# export LLM_API_KEY=仅在接口需要认证时填写
python server.py
```

Windows：

```powershell
$env:LLM_BASE_URL="http://127.0.0.1:11434/v1"
$env:LLM_MODEL="你的服务实际提供的模型名"
# $env:LLM_API_KEY="仅在接口需要认证时填写"
.venv\Scripts\python.exe server.py
```

示例不替你安装 Ollama 或其他服务。若指定远程接口，选中文字及附近上下文会发给该服务，请自行选择可信提供方。密钥只从环境变量读取。

## 4B. Apple 芯片 Mac 本地模型

```sh
python -m pip install -r requirements-model.txt
```

MLX 的芯片、macOS 和 Python 要求参照 https://github.com/ml-explore/mlx-lm 。Windows、Linux、Intel Mac 请用兼容接口。

先阅读模型页面的许可证、硬件和磁盘要求，再明确指定要下载的 MLX 仓库：

```sh
python scripts/download_model.py --repo mlx-community/Qwen2.5-3B-Instruct-4bit
```

这个示例 3B 模型标注 qwen-research 研究许可证，不等同于任意用途开放授权；商用等用途请自行核对条款或选择许可允许的其他模型。项目不自动下载或打包模型，不替你接受其许可。

默认模型目录 models/local。另一个目录可设置 LOCAL_MODEL_PATH；另一个推理环境可设置 MODEL_PYTHON 为其 Python 路径。设置 LLM_BASE_URL 时优先使用接口；要切回 MLX，清除环境变量和配置文件中对应字段。

## 5. 配置、启动与排错

复制 config.example.json 为 config.json。相对路径从项目根目录计算；可改成自己的绝对路径。环境变量优先。

Windows JSON 路径使用正斜杠，或将反斜杠写成双反斜杠。密钥不放配置文件；自己的 config.json 不提交 Git。

```sh
python server.py
```

打开 http://127.0.0.1:8765 。端口冲突就在配置里修改 PORT，随后重启。停止按 Ctrl+C。

- 没有书：检查书籍目录，点击刷新书架；空书架也能启动。
- 缺地图：执行资源下载脚本，检查 data 里的两份文件。
- 无模型：下载模型或配置接口；PDF 阅读、地图、候选读音不依赖模型。
- 推理失败：确认当前环境安装了 mlx-lm、模型完整、系统兼容，或改用接口。
- 原扫描模糊：高清重绘有源文件精度上限，不会凭空补字。
- 地名同名异地：结合年代核对来源，不能只看名称。
- 缓存含书页文字、译文和定位选择，保存在 .local/cache；不要上传。
- 浏览器本地保存每本书页码、缩放和侧栏偏好，清理站点存储可重置。

## 6. 使用提示

连续滚动只保留三页；当前阅读页驱动翻译和最近十页地图。放大后在阅读区横向移动，100% / 适宽适配当前阅读区。

本页地点以深色突出。地图下方先显示本页的所有条目，包括已定位和待定位，再显示其他页；待定位可按需联网核对后采用。

服务只绑定本机地址并拒绝跨站写请求，没有公网部署、账号或认证方案，不要直接暴露到互联网。
