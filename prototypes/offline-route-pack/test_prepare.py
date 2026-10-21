import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
import json
import prepare

class PackTests(unittest.TestCase):
    def test_build_without_network_and_reopen(self):
        with tempfile.TemporaryDirectory() as d, patch('socket.socket', side_effect=AssertionError('network disabled')):
            path = Path(d)/'pack.html'
            data = prepare.build(destination=path, progress=lambda _: None)
            self.assertEqual(data,path.read_bytes())
            text=data.decode()
            self.assertIn("default-src 'none'",text)
            self.assertNotIn('<script',text)
            self.assertNotIn(' src=',text)
            self.assertIn('Map tiles: 0. Terrain tiles: 0.',text)
            self.assertIn('269',text)
    def test_invalid_profile_preserves_previous_pack(self):
        with tempfile.TemporaryDirectory() as d:
            root=Path(d)
            for p in prepare.DATA.iterdir():
                if p.suffix in ('.json','.geojson'): (root/p.name).write_bytes(p.read_bytes())
            profile=json.loads((root/'elevation-profile.json').read_text())
            profile['samples'][1]['elevationM']=None
            (root/'elevation-profile.json').write_text(json.dumps(profile))
            destination=root/'pack.html';destination.write_text('previous')
            with self.assertRaises(ValueError): prepare.build(root,destination,lambda _:None)
            self.assertEqual(destination.read_text(),'previous')
            self.assertEqual(list(root.glob('*.partial')),[])
    def test_interrupted_write_preserves_previous_pack(self):
        with tempfile.TemporaryDirectory() as d:
            destination=Path(d)/'pack.html';destination.write_text('previous')
            with patch('os.replace',side_effect=OSError('disk failure')):
                with self.assertRaises(OSError): prepare.build(destination=destination,progress=lambda _:None)
            self.assertEqual(destination.read_text(),'previous')
            self.assertEqual(list(Path(d).glob('*.partial')),[])

if __name__=='__main__': unittest.main()
