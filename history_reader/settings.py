"""Local configuration. Secrets are read from environment variables, never committed."""
import json,os,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parent
config_file=ROOT/'config.json'
CONFIG=json.loads(config_file.read_text(encoding='utf-8')) if config_file.exists() else {}
def value(name,default):return os.environ.get(name,str(CONFIG.get(name,default)))
def path(name,default):
 p=Path(value(name,default)).expanduser()
 return (p if p.is_absolute() else ROOT/p).resolve()
BOOK_ROOT=path('HISTORY_READER_BOOK_DIR','books')
DATA_DIR=path('HISTORY_READER_DATA_DIR','data')
CACHE=path('HISTORY_READER_CACHE_DIR','.local/cache')
MODEL_DIR=path('LOCAL_MODEL_PATH','models/local')
MODEL_PYTHON=value('MODEL_PYTHON',sys.executable)
PORT=int(value('PORT',8765))
for name in ['LLM_BASE_URL','LLM_MODEL']:
 if name in CONFIG:os.environ.setdefault(name,str(CONFIG[name]))
