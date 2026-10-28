"""Book-context locations, modern administrative references and opt-in source review."""
import json,re,hashlib,urllib.request
from pathlib import Path
from functools import lru_cache
from urllib.parse import urlencode
ROOT=Path(__file__).parent
from settings import DATA_DIR
ANNOTATION=re.compile(r'([\u3400-\u9fff]{1,20})[（(]([^()（）]{0,70}?(?:今|在)[^()（）]{1,70})[）)]')
PROVINCE_SHORT={'内蒙古自治区':'内蒙古','黑龙江省':'黑龙江','广西壮族自治区':'广西','宁夏回族自治区':'宁夏','新疆维吾尔自治区':'新疆','西藏自治区':'西藏','香港特别行政区':'香港','澳门特别行政区':'澳门'}
VERBS=['围攻','攻下','进攻','进犯','退守','驻守','驻扎','镇守','移驻','屯兵','屯驻','救援','移迁','重镇','进入','退到','迁到','镇','屯','起','自','了','把','的','于','到','在','至','从','、','和','与']
def historical_name(raw):
 for verb in VERBS:raw=raw.split(verb)[-1]
 return raw.strip()
def short_name(name):return re.sub(r'(特别行政区|自治区|自治州|自治县|地区|省|市|县|区|盟|旗)$','',name)
@lru_cache(maxsize=1)
def gazetteer():
 if not (DATA_DIR/'modern_places.json').exists():raise ValueError('缺少现代地点数据，请按 README 下载地图数据')
 data=json.loads((DATA_DIR/'modern_places.json').read_text(encoding='utf-8'));rows=data['records'];byid={x['adcode']:x for x in rows};out=[]
 for row in rows:
  if row['level'] not in ['city','district']:continue
  parent=row;seen=set()
  while parent.get('level')!='province' and parent.get('parent') in byid and parent['adcode'] not in seen:
   seen.add(parent['adcode']);parent=byid[parent['parent']]
  if parent.get('level')!='province':continue
  province=PROVINCE_SHORT.get(parent['name'],short_name(parent['name']))
  out.append(dict(province=province,province_full=parent['name'],name=row['name'],alias=short_name(row['name']),lon=row['lng'],lat=row['lat'],level=row['level'],code=row['adcode'],parent=row.get('parent'),source=data['source']))
 return out

def modern_reference(note):
 # Take the first explicitly described modern place. Preserve multi-place range text.
 note=note.replace('在今','今')
 m=re.search(r'(?:今|在)([\u3400-\u9fff]+)',note)
 if not m:return None
 address=m.group(1);matches=[]
 for g in gazetteer():
  for prefix in sorted(set([g['province_full'],g['province']]),key=len,reverse=True):
   if not address.startswith(prefix):continue
   rest=address[len(prefix):]
   if rest.startswith('省'):rest=rest[1:]
   for alias in set([g['name'],g['alias']]):
    if len(alias)>=2 and rest.startswith(alias):matches.append((len(alias),g))
 if not matches:return None
 best=max(n for n,_ in matches);options={g['code'] or (g['province'],g['name']):g for n,g in matches if n==best}
 if len(options)>1:
  cities=[g for g in options.values() if g['level']=='city']
  if len(cities)==1 and all(g is cities[0] or g.get('parent')==cities[0]['code'] for g in options.values()):return cities[0]
  return None
 return next(iter(options.values()))

def annotations(text,page):
 text=text.replace('\n','');found=[]
 for m in ANNOTATION.finditer(text):
  raw,note=m.groups()
  # Exclude a parenthetical that merely mentions a person or year.
  if not re.search(r'(?:今|在)(?:北京|天津|上海|重庆|河北|山西|内蒙古|辽宁|吉林|黑龙江|江苏|浙江|安徽|福建|江西|山东|河南|湖北|湖南|广东|广西|海南|四川|贵州|云南|西藏|陕西|甘肃|青海|宁夏|新疆|台湾|香港|澳门)',note):continue
  name=historical_name(raw)
  if not name or len(name)>8:continue
  reference=modern_reference(note)
  item=dict(original=name,modern=note,page=page,evidence=m.group(0),source_page=page,basis='书内现代位置说明')
  if reference:
   item.update(lon=reference['lon'],lat=reference['lat'],reference=reference['name'],coordinate_source=reference['source'])
  else:item['reason']='书中有现代说明，但本地参考点未能唯一匹配'
  found.append(item)
 return found

def resolved(text,page):return [x for x in annotations(text,page) if 'lon' in x]

HISTORICAL_NAMES=set('长安 建康 金陵 江陵 幽州 荆州 汉中 剑门 淮水 淮北 襄阳 洛阳 广陵 彭城 盱眙 淮阴 三阿 上明 下邳 湖陆 竟陵 巴东 建平'.split())
@lru_cache(maxsize=1)
def candidate_pattern():
 names=HISTORICAL_NAMES|{g['alias'] for g in gazetteer() if 2<=len(g['alias'])<=4}
 return re.compile('|'.join(map(re.escape,sorted(names,key=lambda n:(-len(n),n)))))
def unlocated_candidates(text,page,known):
 outside=re.sub(r'[（(][^（）()]*[）)]','',text.replace('\n',''));out=[]
 for m in candidate_pattern().finditer(outside):
  name=m.group();before=outside[max(0,m.start()-8):m.start()];after=outside[m.end():m.end()+6]
  if name in known or after.startswith(('军','氏','公','侯','王')):continue
  if name not in HISTORICAL_NAMES and not (re.search(r'(围攻|攻下|进攻|进犯|退守|屯兵|驻|镇|从|自|于|出|入|至|往|到)$',before) or re.match(r'(失守|被围|震动|一带|以南|以北|以东|以西|一线)',after)):continue
  if not any(x['original']==name for x in out):out.append(dict(original=name,page=page,pages=[page],evidence=outside[max(0,m.start()-22):m.end()+32],modern='',reason='发现地名候选，尚无可核对的书内现代位置说明'))
 return out

def lookup_online(name):
 params={'action':'query','generator':'search','gsrsearch':name,'gsrlimit':5,'prop':'extracts|coordinates|info','exintro':1,'explaintext':1,'exsentences':3,'inprop':'url','format':'json','colimit':'max','redirects':1}
 url='https://zh.wikipedia.org/w/api.php?'+urlencode(params)
 req=urllib.request.Request(url,headers={'User-Agent':'LocalHistoryReader/0.5 (user-requested geographical lookup)'})
 with urllib.request.urlopen(req,timeout=25) as r:data=json.load(r)
 sources=[]
 for page in sorted(data.get('query',{}).get('pages',{}).values(),key=lambda p:p.get('index',100)):
  excerpt=page.get('extract','')[:700];coordinate=next((c for c in page.get('coordinates',[]) if c.get('globe','earth')=='earth' and 73<=c['lon']<=136 and 3<=c['lat']<=54),None)
  # A modern city mentioned explicitly in a source can serve as a reference,
  # but is never silently treated as the exact historical location.
  ref=None
  if not coordinate:
   ref=modern_reference(excerpt)
  item=dict(title=page['title'],url=page.get('fullurl',''),snippet=excerpt)
  if coordinate:item.update(lon=coordinate['lon'],lat=coordinate['lat'],reference=page['title'],method='来源页面坐标')
  elif ref:item.update(lon=ref['lon'],lat=ref['lat'],reference=ref['name'],method='来源中的现代行政区参考点')
  item['id']=hashlib.sha256(json.dumps(item,sort_keys=True,ensure_ascii=False).encode()).hexdigest()[:20]
  if item['url'] and excerpt:sources.append(item)
 return dict(name=name,sources=sources,note='请结合书中年代和上下文核对。只有你点击采用后，参考点才加入当前书的地图；行政区或河流的点位不代表其全部范围。')
