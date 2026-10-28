#!/usr/bin/env python3
"""Download external reference data directly from its provider; no books are sent."""
import argparse,json,sys,urllib.request
from datetime import date
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from settings import DATA_DIR
SOURCES={
 'provinces.json':'https://geo.datav.aliyun.com/areas_v3/bound/100000_full.json',
 'modern_places.json':'https://geo.datav.aliyun.com/areas_v3/bound/all.json',
}
def download(destination=DATA_DIR):
 destination=Path(destination);destination.mkdir(parents=True,exist_ok=True)
 for filename,url in SOURCES.items():
  req=urllib.request.Request(url,headers={'User-Agent':'HistoryReader/1.0 (reference-data download)'})
  with urllib.request.urlopen(req,timeout=60) as response:data=json.load(response)
  if filename=='provinces.json':
   if not isinstance(data,dict) or not data.get('features'):raise ValueError('省界文件格式不符合预期')
  else:
   if not isinstance(data,list) or not data or not all('adcode' in r and 'name' in r for r in data):raise ValueError('行政区文件格式不符合预期')
   data={'source':url,'retrieved':date.today().isoformat(),'records':data}
  target=destination/filename;temporary=target.with_suffix('.download')
  temporary.write_text(json.dumps(data,ensure_ascii=False),encoding='utf-8');temporary.replace(target)
  print('Downloaded:',filename)
if __name__=='__main__':
 parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--output',type=Path,default=DATA_DIR);args=parser.parse_args()
 try:download(args.output)
 except Exception as error:raise SystemExit('下载失败，请按 docs/SETUP.md 手动准备数据：'+str(error))
