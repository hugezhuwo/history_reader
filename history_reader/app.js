let bookId='',bookEpoch=0,booksList=[];
let current=1,generation=0,pageData;
const $=s=>document.querySelector(s);
function el(tag,cls,text){const x=document.createElement(tag);x.className=cls||'';if(text)x.textContent=text;return x}
async function api(url,options){const r=await fetch(url,options),d=await r.json();if(!r.ok)throw Error(d.error);return d}
function post(path,body){return api(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({book:bookId,...body})})}
function sourceList(data,container){
 container.append(el('p','hint',data.note));
 for(const [i,s] of data.sources.entries()){
  const row=el('div','source'),a=el('a','',`[${i+1}] ${s.title}`);a.href=s.url;a.target='_blank';a.rel='noopener noreferrer';
  row.append(el('small','',s.kind),a,el('p','',s.snippet));container.append(row);
 }
 for(const error of data.errors||[])container.append(el('p','hint',error));
 if(!data.sources.length)container.append(el('p','hint','未找到可用资料，不能据此确认词义。可换一个较短的字词查询。'));
}
async function lookup(text,page,container,button){
 const sourceBook=bookId;button.disabled=true;container.replaceChildren(el('p','hint','正在查询汉典 / 维基文库…'));
 try{
  const data=await post('/api/research',{book:sourceBook,page,text});container.replaceChildren();sourceList(data,container);
  if(data.sources.length){
   const redo=el('button','','依据来源辅助释义'),out=el('div','translation');container.append(redo,out);
   redo.onclick=async()=>{redo.disabled=true;out.textContent='正在结合来源生成释义…';try{const r=await post('/api/translate',{book:sourceBook,page,text,researched:true});out.textContent='联网辅助释义（需核对）\n'+r.translation}catch(e){out.textContent=e.message}finally{redo.disabled=false}};
  }
 }catch(e){container.replaceChildren(el('p','hint',e.message))}finally{button.disabled=false}
}
function makeCard(text,page,token){
 const cardBook=bookId;
 const card=el('div','card'),quote=el('div','quote',text),out=el('div','translation','等待机翻…'),actions=el('div','actions');
 const retry=el('button','','重试机翻'),web=el('button','','联网查证'),sources=el('div','research');
 actions.append(retry,web);card.append(quote,out,actions,sources);$('#cards').append(card);
 const run=async()=>{
  if(token!==generation)return;
  retry.disabled=true;out.textContent='正在机翻…';
  try{const r=await post('/api/translate',{book:cardBook,page,text});if(token===generation)out.textContent=r.translation}catch(e){if(token===generation)out.textContent=e.message}finally{retry.disabled=false}
 };
 retry.onclick=run;web.onclick=()=>lookup(text,page,sources,web);return run;
}
async function allQuotes(){
 if(!pageData)return;
 const token=++generation;$('#cards').replaceChildren();
 const phrases=pageData.candidates;
 $('#status').textContent=pageData.text.trim()?phrases.length?`本页 ${phrases.length} 段引文 · 逐段机翻（短引文也包含）`:'本页未检测到成对引号，可点击正文段落翻译。':'本页无文本层，暂不分析。';
 // Show every quote immediately so the user can see pending items.
 const jobs=phrases.map(text=>makeCard(text,pageData.page,token));
 for(const job of jobs){if(token!==generation)return;await job()}
}
function showTab(id){for(const t of ['map','translation'])$('#'+t).hidden=t!==id;document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===id))}
// Keep only three PDF pages mounted. Analysis follows the page being read.
let rendered=new Map(),windowGeneration=0,adjustingScroll=false,scrollTimer;
const pendingPages=new Map();
function getPage(n){
 if(rendered.has(n))return Promise.resolve(rendered.get(n).data);
 const key=bookId+':'+n;
 if(!pendingPages.has(key))pendingPages.set(key,api('/api/page?n='+n+'&book='+encodeURIComponent(bookId)).finally(()=>pendingPages.delete(key)));
 return pendingPages.get(key);
}
function createPage(d){
 const sheet=el('article','pdf-page');sheet.dataset.page=d.page;sheet.setAttribute('aria-label','PDF 第 '+d.page+' 页');
 const paper=el('div','paper');paper.style.aspectRatio=d.width+'/'+d.height;
 const image=el('img','scan');image.alt='PDF 第 '+d.page+' 页原文';image.src='/api/image?n='+d.page+'&book='+encodeURIComponent(d.book_id)+'&width='+imagePixels();image.width=d.width;image.height=d.height;image.draggable=false;
 const overlay=el('div','overlay');
 for(const b of d.blocks){
  const btn=el('button','block');btn.title='点击翻译这一段';btn.setAttribute('aria-label',b.text.slice(0,40));const[x,y,w,h]=b.box;
  Object.assign(btn.style,{left:x*100+'%',top:y*100+'%',width:w*100+'%',height:h*100+'%'});
  btn.onclick=()=>{activatePage(d);const t=++generation;document.querySelectorAll('.selected').forEach(e=>e.classList.remove('selected'));btn.classList.add('selected');setSidebarCollapsed(false);showTab('translation');$('#cards').replaceChildren();$('#status').textContent='PDF 第 '+d.page+' 页 · 所选段落';makeCard(b.text,d.page,t)();load(d.page,false)};
  overlay.append(btn);
 }
 paper.append(image,overlay);sheet.append(paper);return {node:sheet,data:d};
}
function activatePage(d){
 if(pageData?.page===d.page)return;
 ++generation;current=d.page;pageData=d;localStorage.setItem('historyPage:'+bookId,current);$('#page').value=current;$('#page').max=d.total;$('#total').textContent='/ '+d.total;
 $('#prev').disabled=current<=1;$('#next').disabled=current>=d.total;
 $('#characters').replaceChildren();$('#termResult').replaceChildren();$('#term').value='';
 for(const c of d.rare||[]){const b=el('button','char',`${c.char} ${c.readings.join(' / ')}`);b.onclick=()=>{$('#term').value=c.char;lookup(c.char,d.page,$('#termResult'),b)};$('#characters').append(b)}
 if(!d.rare?.length)$('#characters').append(el('p','hint','未发现词表中的疑难字，可手动输入本页任意字词。'));
 if(d.text_warning)$('#characters').append(el('p','hint',d.text_warning));
 updateMap(current);allQuotes();
}
async function load(n,jump=true){
 const token=++windowGeneration;
 if(!Number.isInteger(n)||n<1||(pageData&&n>pageData.total)){$('#readerMessage').textContent='请输入有效页码';return}
 if(jump)$('#readerMessage').textContent='正在读取书页…';
 try{
  const d=await getPage(n);if(token!==windowGeneration)return;
  activatePage(d);
  const start=Math.max(1,Math.min(n-1,d.total-2)),end=Math.min(d.total,start+2),numbers=Array.from({length:end-start+1},(_,i)=>start+i);
  const data=await Promise.all(numbers.map(getPage));if(token!==windowGeneration)return;
  const reader=$('#reader'),anchor=rendered.get(n)?.node,oldTop=anchor?.getBoundingClientRect().top;
  const next=new Map(data.map(d=>[d.page,rendered.get(d.page)||createPage(d)]));
  adjustingScroll=true;
  $('#pages').replaceChildren(...[...next.values()].map(p=>p.node));rendered=next;applyZoomLayout();refreshImages();
  if(jump)reader.scrollTop=rendered.get(n).node.offsetTop-12;
  else if(oldTop!==undefined)reader.scrollTop+=rendered.get(n).node.getBoundingClientRect().top-oldTop;
  $('#readerMessage').textContent='';$('#windowInfo').textContent=`窗口 ${start}–${end} 页 · 滚动自动接续`;
  requestAnimationFrame(()=>{adjustingScroll=false});
 }catch(e){if(token===windowGeneration)$('#readerMessage').textContent=e.message}
}
function scrollFocus(){
 if(adjustingScroll||!rendered.size)return;
 const reader=$('#reader'),y=reader.getBoundingClientRect().top+Math.min(180,reader.clientHeight*.25);
 let best=null,distance=Infinity;
 for(const p of rendered.values()){
  const box=p.node.getBoundingClientRect(),gap=y<box.top?box.top-y:y>box.bottom?y-box.bottom:0;
  if(gap<distance){best=p;distance=gap}
 }
 if(best&&best.data.page!==current)load(best.data.page,false);
}
$('#reader').addEventListener('scroll',()=>{if(adjustingScroll)return;clearTimeout(scrollTimer);scrollTimer=setTimeout(scrollFocus,120)},{passive:true});
// Preserve the same position within the PDF when sidebar width changes.
function keepReadingPosition(change){
 const reader=$('#reader'),page=rendered.get(current)?.node;
 const ref=Math.min(180,reader.clientHeight*.25),fraction=page?(reader.scrollTop+ref-page.offsetTop)/page.offsetHeight:0;
 adjustingScroll=true;change();applyZoomLayout();scheduleImageRefresh();
 if(page)reader.scrollTop=page.offsetTop+fraction*page.offsetHeight-ref;
 requestAnimationFrame(()=>{adjustingScroll=false});
}
let pdfZoom=100,imageRefreshTimer;
function applyZoomLayout(){
 const reader=$('#reader'),styles=getComputedStyle(reader),fit=Math.max(100,reader.clientWidth-parseFloat(styles.paddingLeft)-parseFloat(styles.paddingRight));
 $('#pages').style.width=Math.round(fit*pdfZoom/100)+'px';
 $('#pages').style.marginLeft=pdfZoom<=100?'auto':'0';$('#pages').style.marginRight=pdfZoom<=100?'auto':'0';
 $('#zoomPercent').value=pdfZoom;$('#zoomOut').disabled=pdfZoom<=50;$('#zoomIn').disabled=pdfZoom>=300;
}
function imagePixels(){return Math.min(3840,Math.max(1024,Math.ceil((parseFloat($('#pages').style.width)||$('#reader').clientWidth)*(devicePixelRatio||1)/128)*128))}
function refreshImages(){
 for(const item of rendered.values()){
  const pixels=imagePixels(),image=item.node.querySelector('.scan');
  const src='/api/image?n='+item.data.page+'&book='+encodeURIComponent(item.data.book_id)+'&width='+pixels;
  if(image.getAttribute('src')!==src)image.src=src;
 }
}
function scheduleImageRefresh(){clearTimeout(imageRefreshTimer);imageRefreshTimer=setTimeout(refreshImages,180)}
function setZoom(value){
 const number=Number(value);if(!Number.isFinite(number))return;
 const reader=$('#reader'),oldWidth=$('#pages').offsetWidth,center=oldWidth?(reader.scrollLeft+reader.clientWidth/2)/oldWidth:.5;
 keepReadingPosition(()=>{pdfZoom=Math.max(50,Math.min(300,Math.round(number)));applyZoomLayout()});
 reader.scrollLeft=pdfZoom<=100?0:center*$('#pages').offsetWidth-reader.clientWidth/2;
 if(bookId)localStorage.setItem('readerZoom:'+bookId,pdfZoom);
}
$('#zoomOut').onclick=()=>setZoom(pdfZoom-25);$('#zoomIn').onclick=()=>setZoom(pdfZoom+25);$('#zoomFit').onclick=()=>setZoom(100);$('#zoomPercent').onchange=e=>setZoom(e.target.value);
$('#reader').addEventListener('wheel',e=>{if(e.ctrlKey){e.preventDefault();setZoom(pdfZoom+(e.deltaY<0?10:-10))}},{passive:false});
$('#reader').addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&['+','=','-','0'].includes(e.key)){e.preventDefault();setZoom(e.key==='0'?100:pdfZoom+(e.key==='-'?-25:25))}});
let preferredSidebarWidth=Number(localStorage.getItem('readerSidebarWidth')||320),sidebarWidth=preferredSidebarWidth;
function setSidebarWidth(width,remember=true){
 const maximum=Math.min(640,Math.max(180,innerWidth*.45));
 sidebarWidth=Math.max(180,Math.min(maximum,width));
 keepReadingPosition(()=>document.documentElement.style.setProperty('--sidebar-width',sidebarWidth+'px'));
 $('#sidebarResize').setAttribute('aria-valuenow',Math.round(sidebarWidth));$('#sidebarResize').setAttribute('aria-valuemin','180');$('#sidebarResize').setAttribute('aria-valuemax',Math.floor(maximum));
 if(remember){preferredSidebarWidth=sidebarWidth;localStorage.setItem('readerSidebarWidth',sidebarWidth)}
}
function setSidebarCollapsed(collapsed){
 keepReadingPosition(()=>document.body.classList.toggle('sidebar-collapsed',collapsed));
 $('#openSidebar').hidden=!collapsed;$('#openSidebar').setAttribute('aria-expanded',!collapsed);$('#sidebar').inert=collapsed;
 localStorage.setItem('readerSidebarCollapsed',String(collapsed));
}
$('#collapseSidebar').onclick=()=>setSidebarCollapsed(true);$('#openSidebar').onclick=()=>setSidebarCollapsed(false);
const resizeHandle=$('#sidebarResize');
resizeHandle.onpointerdown=e=>{if(e.button!==0)return;e.preventDefault();resizeHandle.setPointerCapture(e.pointerId);document.body.classList.add('resizing-sidebar');};
resizeHandle.onpointermove=e=>{if(resizeHandle.hasPointerCapture(e.pointerId))setSidebarWidth(innerWidth-e.clientX-4)};
const endResize=e=>{if(resizeHandle.hasPointerCapture(e.pointerId))resizeHandle.releasePointerCapture(e.pointerId);document.body.classList.remove('resizing-sidebar')};
resizeHandle.onpointerup=endResize;resizeHandle.onpointercancel=endResize;
resizeHandle.onkeydown=e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();setSidebarWidth(sidebarWidth+(e.key==='ArrowLeft'?20:-20))}};
window.addEventListener('resize',()=>setSidebarWidth(preferredSidebarWidth,false));
setSidebarWidth(preferredSidebarWidth,false);
const savedCollapsed=localStorage.getItem('readerSidebarCollapsed');setSidebarCollapsed(savedCollapsed===null?innerWidth<650:savedCollapsed==='true');
// Reserve two external label columns; no label can enter the map rectangle.
let mapOffsetY=0;
const project=([lon,lat])=>[250+(lon-73)/63*700,35+(54-lat)/36*570+mapOffsetY];
function svg(tag,attrs){const e=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const[k,v]of Object.entries(attrs))e.setAttribute(k,v);return e}
function arrangeRail(groups,height){
 groups.sort((a,b)=>a.y-b.y);
 let bottom=24;
 for(const g of groups){g.labelY=Math.max(g.y,bottom+g.labelHeight/2);bottom=g.labelY+g.labelHeight/2+14}
 let top=height-24;
 for(const g of [...groups].reverse()){g.labelY=Math.min(g.labelY,top-g.labelHeight/2);top=g.labelY-g.labelHeight/2-14}
}
let geography,mapGeneration=0;
async function updateMap(n){
 const token=++mapGeneration;$('#mapRange').textContent='正在读取最近 10 页…';$('#places').replaceChildren();$('#mapSvg').replaceChildren();
 try{
  const [data,geo]=await Promise.all([api('/api/map?n='+n+'&book='+encodeURIComponent(bookId)),geography?Promise.resolve(geography):api('/provinces.json')]);if(token!==mapGeneration)return;geography=geo;
  $('#mapRange').textContent=`PDF 第 ${data.start}–${data.end} 页 · 已定位 ${data.places.length} · 待查 ${data.unresolved.length}`;$('#count').textContent=data.places.length;drawMap(data);renderUnresolved(data);
 }catch(e){if(token===mapGeneration)$('#mapRange').textContent='地图未完成：'+e.message}
}
function drawMap(data){
 const canvas=$('#mapSvg');canvas.replaceChildren();$('#mapLegend').replaceChildren(el('span','legend-current',`● 本页 ${current}`),el('span','legend-earlier','● 最近其他页'));mapOffsetY=0;
 for(const f of geography.features){const polys=f.geometry.type==='MultiPolygon'?f.geometry.coordinates:[f.geometry.coordinates];for(const p of polys){const d=p.map(r=>r.map((pt,i)=>(i?'L':'M')+project(pt).join(',')).join(' ')+'Z').join(' ');const path=svg('path',{d,'aria-hidden':'true'});canvas.append(path)}}
 $('#places').replaceChildren();$('#currentPagePlaces').replaceChildren();
 if(!data.places.length)$('#places').append(el('p','hint','这 10 页没有可可靠定位的书内地名说明。'));
 const clusters=[];
 data.places.forEach((p,i)=>{
  const isCurrent=p.pages.includes(Number(current));const card=el('div','place'+(isCurrent?' place-current':''));card.id='place'+i;if(isCurrent)card.append(el('span','current-badge','本页 · 已定位')); card.append(el('b','',`${i+1}. ${p.original}`),el('div','',p.modern),el('small','',`参考点：${p.reference}中心附近；不推算方向偏移`),el('small','',`依据：${p.basis||'书内现代说明'}`),el('small','',`原句：${p.evidence}`));if(p.source_url){const link=el('a','source-link',p.source_title||'定位来源');link.href=p.source_url;link.target='_blank';link.rel='noopener noreferrer';card.append(link)}
  const pages=el('div','page-links','PDF 页：');for(const n of p.pages){const b=el('button','',String(n));b.onclick=()=>{closeMap();load(n);showTab('map')};pages.append(b)}card.append(pages);(isCurrent?$('#currentPagePlaces'):$('#places')).append(card);card.dataset.placeName=p.original;
  const[x,y]=project([p.lon,p.lat]);let group=clusters.find(g=>Math.hypot(g.x-x,g.y-y)<11);
  if(group)group.items.push({p,i});else clusters.push({x,y,items:[{p,i}]});
 });
 // Partition west/east in geographic order. Within each side, sort north/south.
 const ordered=[...clusters].sort((a,b)=>a.x-b.x);
 const cut=ordered.length===1?(ordered[0].x<600?1:0):Math.ceil(ordered.length/2);
 const left=ordered.slice(0,cut),right=ordered.slice(cut);
 for(const g of clusters){
  g.lines=[...new Set(g.items.map(v=>v.p.original))].flatMap(name=>name.match(/.{1,8}/gu)||[name]);
  g.labelHeight=g.lines.length*28+18;
 }
 const railHeight=groups=>groups.reduce((sum,g)=>sum+g.labelHeight+14,48);
 const height=Math.max(840,railHeight(left),railHeight(right));
 // If many names need more height, center the map rather than stacking labels over it.
 mapOffsetY=(height-840)/2;
 if(mapOffsetY){for(const node of [...canvas.children])node.setAttribute('transform',`translate(0 ${mapOffsetY})`);for(const g of clusters)g.y+=mapOffsetY}
 canvas.setAttribute('viewBox',`0 0 1200 ${height}`);
 arrangeRail(left,height);arrangeRail(right,height);
 const leaders=svg('g',{'aria-hidden':'true'}),labels=svg('g',{}),dots=svg('g',{});
 canvas.append(leaders,labels,dots);
 for(const [side,groups] of [['left',left],['right',right]])for(const g of groups){
  const labelX=side==='left'?18:984,labelW=198,edge=side==='left'?labelX+labelW:labelX;
  const elbow=side==='left'?232:968;
  const group=svg('g',{class:'location-label '+(g.items.some(v=>v.p.pages.includes(Number(current)))?'is-current':'is-earlier'),role:'button',tabindex:'0','aria-label':g.items.map(v=>v.p.original).join('、'),'data-side':side});
  const title=svg('title',{});title.textContent=g.items.map(v=>`${v.p.original}：${v.p.modern}`).join('\n');
  group.append(title,svg('rect',{x:labelX,y:g.labelY-g.labelHeight/2,width:labelW,height:g.labelHeight,rx:7}));
  g.lines.forEach((name,i)=>{const text=svg('text',{x:labelX+labelW/2,y:g.labelY+(i-(g.lines.length-1)/2)*28,'text-anchor':'middle','dominant-baseline':'central',class:g.items.some(v=>v.p.original.includes(name)&&v.p.pages.includes(Number(current)))?'name-current':'name-earlier'});text.textContent=name;group.append(text)});
  const select=()=>{document.querySelectorAll('.place.focused').forEach(c=>c.classList.remove('focused'));for(const v of g.items)$('#place'+v.i).classList.add('focused');$('#place'+g.items[0].i).scrollIntoView({behavior:'smooth',block:'nearest'})};
  group.onclick=select;group.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();select()}};labels.append(group);
  for(const item of g.items){
   const[px,py]=project([item.p.lon,item.p.lat]);
   leaders.append(svg('polyline',{points:`${px},${py} ${elbow},${g.labelY} ${edge},${g.labelY}`,class:'location-line '+(item.p.pages.includes(Number(current))?'is-current':'is-earlier')}));
   const point=svg('circle',{cx:px,cy:py,r:item.p.pages.includes(Number(current))?6.5:4,class:'location-dot '+(item.p.pages.includes(Number(current))?'is-current':'is-earlier'),role:'button',tabindex:'0','aria-label':item.p.original});
   const tip=svg('title',{});tip.textContent=item.p.original;point.append(tip);point.onclick=select;point.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();select()}};dots.append(point);
  }
 }

}
function renderUnresolved(data){
 const currentPending=data.unresolved.filter(p=>p.pages.includes(Number(current)));const earlierPending=data.unresolved.length-currentPending.length;
 $('#unresolvedCount').textContent=`最近其他页待定位（${earlierPending}）`;$('#unresolvedPlaces').replaceChildren();
 $('#currentPageHeading').textContent=`本页地名 · 已定位 ${data.places.filter(p=>p.pages.includes(Number(current))).length} · 待定位 ${currentPending.length}`;
 for(const item of data.unresolved){
  const row=el('div','place'+(item.pages.includes(Number(current))?' place-current':'')),button=el('button','','联网查地名'),result=el('div','geo-result');
  if(item.pages.includes(Number(current)))row.append(el('span','current-badge','本页 · 待定位'));row.append(el('b','',item.original),el('div','',item.modern||item.reason),el('small','',`PDF ${item.pages.join('、')} 页 · ${item.evidence}`),button,result);(item.pages.includes(Number(current))?$('#currentPagePlaces'):$('#unresolvedPlaces')).append(row);row.dataset.placeName=item.original;
  button.onclick=async()=>{
   const sourceBook=bookId,sourcePage=current;button.disabled=true;result.replaceChildren(el('p','hint','正在查询地名来源和参考坐标…'));
   try{
    const response=await post('/api/geo/search',{book:sourceBook,page:sourcePage,name:item.original});result.replaceChildren(el('p','hint',response.note));
    if(!response.sources.length)result.append(el('p','hint','未找到可用来源，暂不标点。'));
    for(const source of response.sources){
     const part=el('div','source'),link=el('a','',source.title);link.href=source.url;link.target='_blank';link.rel='noopener noreferrer';part.append(link,el('p','',source.snippet));
     if(source.lon!==undefined){
      const accept=el('button','','核对后采用此参考点');part.append(el('small','',`${source.method} · ${source.reference}`),accept);
      accept.onclick=async()=>{accept.disabled=true;try{await post('/api/geo/accept',{book:sourceBook,page:sourcePage,name:item.original,source_id:source.id});if(bookId===sourceBook)updateMap(current)}catch(e){part.append(el('p','hint',e.message));accept.disabled=false}};
     }else part.append(el('small','', '此来源未提供可用坐标，暂不能标点'));
     result.append(part);
    }
   }catch(e){result.replaceChildren(el('p','hint','查询未完成：'+e.message))}finally{button.disabled=false}
  };
 }
 const text=(pageData?.text||'').replace(/\n/g,'');
 const cards=[...$('#currentPagePlaces').children];cards.sort((a,b)=>{const x=text.indexOf(a.dataset.placeName),y=text.indexOf(b.dataset.placeName);return (x<0?Infinity:x)-(y<0?Infinity:y)});$('#currentPagePlaces').append(...cards);
 if(!cards.length)$('#currentPagePlaces').append(el('p','hint','本页暂未识别出地名。'));

}
function closeMap(){const d=$('#mapDialog');if(d.open)d.close()}
$('#expandMap').onclick=()=>{const dialog=$('#mapDialog');dialog.append($('#map'));$('#map').hidden=false;dialog.showModal()};
$('#mapDialog').addEventListener('close',()=>{$('#mapHome').append($('#map'))});$('#closeMap').onclick=closeMap;
$('#prev').onclick=()=>load(Math.max(1,current-1));$('#next').onclick=()=>{if(pageData)load(Math.min(pageData.total,current+1))};$('#page').onchange=e=>load(Number(e.target.value));$('#allQuotes').onclick=allQuotes;
$('#lookup').onclick=()=>{const text=$('#term').value.trim();if(!pageData||!text||!pageData.text.replace(/\n/g,'').includes(text)){$('#termResult').textContent='请输入当前页中实际出现的字词。';return}lookup(text,pageData.page,$('#termResult'),$('#lookup'))};
$('#term').onkeydown=e=>{if(e.key==='Enter')$('#lookup').click()};
async function switchBook(identity){
 const selected=booksList.find(b=>b.id===identity);if(!selected)return;
 ++bookEpoch;++generation;++windowGeneration;++mapGeneration;clearTimeout(scrollTimer);closeMap();
 bookId=identity;pdfZoom=Number(localStorage.getItem('readerZoom:'+identity)||100);applyZoomLayout();localStorage.setItem('readerBookId',identity);$('#bookSelect').value=identity;$('#bookTitle').textContent=selected.title+' · '+selected.pages+' 页';document.title=selected.title+' · 有趣的阅读';
 pageData=undefined;rendered=new Map();$('#pages').replaceChildren();$('#unresolvedPlaces').replaceChildren();$('#cards').replaceChildren();$('#places').replaceChildren();$('#mapSvg').replaceChildren();$('#count').textContent='';$('#mapRange').textContent='';$('#characters').replaceChildren();$('#termResult').replaceChildren();$('#prev').disabled=true;$('#next').disabled=true;
 const saved=localStorage.getItem('historyPage:'+identity);
 const page=Math.max(1,Math.min(selected.pages,Number(saved||1)||1));
 $('#page').value=page;$('#page').max=selected.pages;$('#total').textContent='/ '+selected.pages;$('#windowInfo').textContent='正在打开书籍…';
 await load(page);
}
async function refreshBooks(initial=false){
 try{
  const catalog=await api('/api/books');booksList=catalog.books;$('#bookSelect').replaceChildren();
  for(const book of booksList){const option=el('option','',book.title+'（'+book.pages+' 页）');option.value=book.id;option.title=book.relative;$('#bookSelect').append(option)}
  if(!booksList.length){$('#readerMessage').textContent='工作区没有可读 PDF。请将 PDF 放入“书本”文件夹后刷新书架。';return}
  const desired=initial?localStorage.getItem('readerBookId'):bookId;
  if(!booksList.some(b=>b.id===desired)||initial)await switchBook(booksList.some(b=>b.id===desired)?desired:catalog.default);
  else $('#bookSelect').value=bookId;
 }catch(e){$('#readerMessage').textContent='读取书架失败：'+e.message}
}
$('#bookSelect').onchange=e=>switchBook(e.target.value);$('#refreshBooks').onclick=()=>refreshBooks();
document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>showTab(b.dataset.tab));refreshBooks(true);
