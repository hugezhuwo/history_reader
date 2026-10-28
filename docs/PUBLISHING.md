# 发布前检查

可以提交：源代码、配置示例、教程、合成测试。

不要提交：书籍 PDF/电子书、书页截图、模型权重/分词器、虚拟环境、Hugging Face 缓存、下载的第三方地图原始数据、config.json、密钥、.env、日志、阅读缓存、定位选择、原型备份或个人绝对路径。

.gitignore 只是辅助，发布前检查实际暂存区：

```sh
git status --short
git diff --cached --stat
git ls-files
python -m unittest discover -s tests -v
```

测试临时生成 PDF 和合成地点数据，不需要任何私人书籍、模型或地图。演示截图如需发布，请使用自己生成的演示文档，并核对没有个人路径、密钥或受版权保护书页。

第三方资源各有许可，不自动适用项目 LICENSE，见 THIRD_PARTY_NOTICES.md。
