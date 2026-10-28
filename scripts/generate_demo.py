#!/usr/bin/env python3
"""Generate a synthetic, original single-page PDF locally. No commercial book required."""
import argparse,sys
from pathlib import Path
import fitz
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from settings import BOOK_ROOT

def create_demo(path):
 path=Path(path);path.parent.mkdir(parents=True,exist_ok=True)
 if path.exists():raise FileExistsError('不会覆盖已有文件：'+str(path))
 with fitz.open() as doc:
  page=doc.new_page(width=595,height=842)
  page.draw_rect(page.rect,color=None,fill=(.98,.98,.95))
  page.insert_text((50,85),'历史阅读器 - 功能演示',fontsize=24,fontname='china-s',color=(.2,.36,.29))
  lines=['这份演示文档由程序生成，不包含商业书籍内容。',
         '古文：“学而时习之，不亦说乎？”',
         '短引文：“被甲者少。”',
         '地点说明：洛阳（今河南洛阳）。',
         '疑难字示例：鬻。',
         '可测试书籍切换、当前页翻译、地图、缩放与侧栏。']
  for i,line in enumerate(lines):page.insert_text((50,155+i*48),line,fontsize=14,fontname='china-s')
  doc.set_metadata({'title':'历史阅读器功能演示','author':'History Reader contributors'})
  doc.save(path)
 return path
if __name__=='__main__':
 parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--output',type=Path,default=BOOK_ROOT/'demo.pdf');args=parser.parse_args()
 print(create_demo(args.output))
