"""Self-contained tests: synthetic documents/data only; no book/model/network required."""
import importlib.util,json,tempfile,threading,unittest,urllib.request,urllib.error
from pathlib import Path
from unittest.mock import patch
import fitz
import server,geography
spec=importlib.util.spec_from_file_location('demo',Path(__file__).parents[1]/'scripts/generate_demo.py')
demo=importlib.util.module_from_spec(spec);spec.loader.exec_module(demo)

class ReaderTests(unittest.TestCase):
 def setUp(self):
  self.temp=tempfile.TemporaryDirectory();self.root=Path(self.temp.name).resolve()
  self.books=self.root/'books';self.books.mkdir();self.cache=self.root/'cache';self.cache.mkdir();self.data=self.root/'data';self.data.mkdir()
  demo.create_demo(self.books/'demo.pdf')
  with fitz.open() as doc:
   for i in range(4):doc.new_page().insert_text((40,70),'Page '+str(i+1))
   doc.save(self.books/'second.pdf')
  rows=[{'adcode':410000,'name':'河南省','level':'province','parent':100000,'lng':113,'lat':34},
        {'adcode':410300,'name':'洛阳市','level':'city','parent':410000,'lng':112.45,'lat':34.62},
        {'adcode':320000,'name':'江苏省','level':'province','parent':100000,'lng':118,'lat':32},
        {'adcode':320800,'name':'淮安市','level':'city','parent':320000,'lng':119,'lat':33},
        {'adcode':320830,'name':'盱眙县','level':'district','parent':320800,'lng':118.49,'lat':33.00}]
  (self.data/'modern_places.json').write_text(json.dumps({'source':'synthetic-test-fixture','records':rows}),encoding='utf-8')
  self.patches=[patch.object(server,'BOOK_ROOT',self.books),patch.object(server,'CACHE',self.cache),patch.object(geography,'DATA_DIR',self.data)]
  for p in self.patches:p.start()
  geography.gazetteer.cache_clear();geography.candidate_pattern.cache_clear()
 def tearDown(self):
  for p in reversed(self.patches):p.stop()
  geography.gazetteer.cache_clear();geography.candidate_pattern.cache_clear();server.render_page.cache_clear();self.temp.cleanup()
 def test_empty_library(self):
  with patch.object(server,'BOOK_ROOT',self.root/'empty'):
   self.assertEqual(server.book_catalog()['books'],[])
   with self.assertRaises(ValueError):server.book_path()
 def test_book_isolation_and_page_bounds(self):
  books=server.book_catalog()['books'];self.assertEqual(len(books),2)
  self.assertEqual(server.page_data(1,books[0]['id'])['total'],1)
  self.assertEqual(server.page_data(4,books[1]['id'])['total'],4)
  self.assertNotEqual(server.book_key(server.book_path(books[0]['id'])),server.book_key(server.book_path(books[1]['id'])))
  for page in [0,2]:
   with self.assertRaises(ValueError):server.page_data(page,books[0]['id'])
  with self.assertRaises(ValueError):server.book_path('../private.pdf')
 def test_quotes(self):
  self.assertEqual(len(server.candidates(''.join('“短句%d”'%i for i in range(12)))),12)
  self.assertEqual(server.candidates('「外层『内层』」'),['外层『内层』'])
  self.assertEqual(server.candidates('后半句。”','“前半句'),['后半句。'])
 def test_book_annotations(self):
  p=server.places('围攻盱眙（今江苏盱眙东北），重镇洛阳（今河南洛阳）。',1)
  self.assertEqual([x['original'] for x in p],['盱眙','洛阳'])
  self.assertFalse(server.places('长安在远方，某地（今未知省未知县）',1))
  self.assertIsNotNone(geography.modern_reference('约在今江苏盱眙东北'))
 def test_map_and_manual_source_isolation(self):
  book=server.book_catalog()['books'][0]['id'];m=server.map_window(1,book)
  self.assertEqual((m['start'],m['end']),(1,1));self.assertEqual(m['places'][0]['original'],'洛阳')
  self.assertEqual(server.geo_overrides(book),{})
  server.geo_storage(book).write_text('{"test":{"lon":100,"lat":30}}')
  other=server.book_catalog()['books'][1]['id'];self.assertEqual(server.geo_overrides(other),{})
 def test_resolution(self):
  path=server.book_path();fingerprint=server.book_key(path)
  for width in [1024,2048]:self.assertEqual(fitz.Pixmap(server.render_page(str(path),fingerprint,1,width)).width,width)
 def test_offline_rare_char(self):
  self.assertIn('yù',next(c for c in server.rare_chars('鬻') if c['char']=='鬻')['readings'])
 def test_http_origin_checks(self):
  http=server.ThreadingHTTPServer(('127.0.0.1',0),server.Handler)
  thread=threading.Thread(target=http.serve_forever,daemon=True);thread.start();base=f'http://127.0.0.1:{http.server_port}'
  try:
   with urllib.request.urlopen(base+'/api/books') as response:self.assertEqual(len(json.load(response)['books']),2)
   request=urllib.request.Request(base+'/api/translate',data=b'{}',headers={'Content-Type':'application/json','Origin':'https://untrusted.invalid'})
   with self.assertRaises(urllib.error.HTTPError) as caught:urllib.request.urlopen(request)
   self.assertEqual(caught.exception.code,403)
  finally:http.shutdown();http.server_close();thread.join()

if __name__=='__main__':unittest.main()
