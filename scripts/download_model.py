#!/usr/bin/env python3
"""Download a model only after the user chooses its repository and reviews its license."""
import argparse,os,sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from settings import MODEL_DIR,ROOT
if __name__=='__main__':
 parser=argparse.ArgumentParser(description=__doc__)
 parser.add_argument('--repo',required=True,help='Hugging Face MLX model repository; review its license first')
 parser.add_argument('--output',type=Path,default=MODEL_DIR)
 args=parser.parse_args();os.environ.setdefault('HF_HOME',str(ROOT/'.local/huggingface'))
 try:from huggingface_hub import snapshot_download
 except ImportError:raise SystemExit('请先安装 requirements-model.txt，或单独安装 huggingface_hub')
 snapshot_download(args.repo,local_dir=str(args.output),allow_patterns=['*.json','*.safetensors','*.txt','*.model','README*','LICENSE*'])
 print('Model downloaded to:',args.output)
