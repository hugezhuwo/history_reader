#!/bin/zsh
cd "$(dirname "$0")" || exit 1
if [[ ! -x .venv/bin/python ]]; then
  print '请先按 README 建立 .venv 环境并安装依赖。'
  read '?按回车退出…'
  exit 1
fi
reader_port=$(.venv/bin/python -c 'from settings import PORT; print(PORT)') || exit 1
reader_url="http://127.0.0.1:${reader_port}/"
open_reader() {
  if [[ -d /Applications/Doubao.app ]]; then
    /usr/bin/open -a /Applications/Doubao.app "$reader_url"
  else
    print "没有找到豆包，请先安装，或使用普通启动文件。"
  fi
}
if /usr/bin/curl --max-time 3 -sf "${reader_url}api/books" >/dev/null; then
  open_reader
  exit 0
fi
(
  for attempt in {1..60}; do
    if /usr/bin/curl --max-time 3 -sf "${reader_url}api/books" >/dev/null; then
      open_reader
      exit 0
    fi
    sleep 1
  done
  print '阅读器未启动成功，请查看终端错误信息。'
) &
.venv/bin/python server.py
