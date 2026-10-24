import hashlib
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parents[2]
VERSION = json.loads((ROOT / 'extensions/new-tab-launcher/src/manifest.json').read_text())['version']


class ReleasePackages(unittest.TestCase):
    def test_all_extensions_are_discovered_without_arguments(self):
        with tempfile.TemporaryDirectory() as folder:
            subprocess.run([sys.executable, str(ROOT / 'scripts/package_extensions.py'),
                            '--output', folder], check=True, capture_output=True)
            self.assertTrue((Path(folder) / f'new-tab-launcher-{VERSION}-extension.zip').is_file())
            self.assertTrue((Path(folder) / f'new-tab-launcher-{VERSION}-windows.zip').is_file())
            for manifest_path in (ROOT / 'extensions').glob('*/src/manifest.json'):
                name = manifest_path.parents[1].name
                version = json.loads(manifest_path.read_text())['version']
                for suffix in ['extension', 'windows']:
                    self.assertTrue((Path(folder) / f'{name}-{version}-{suffix}.zip').is_file())

    def test_link_peek_package_contains_runtime_and_installation_files(self):
        with tempfile.TemporaryDirectory() as folder:
            version = json.loads((ROOT / 'extensions/link-peek/src/manifest.json').read_text())['version']
            subprocess.run([sys.executable, str(ROOT / 'scripts/package_extensions.py'), 'link-peek',
                            '--output', folder], check=True, capture_output=True)
            with ZipFile(Path(folder) / f'link-peek-{version}-extension.zip') as archive:
                self.assertIsNone(archive.testzip())
                manifest = json.loads(archive.read('manifest.json'))
                self.assertEqual(manifest['name'], 'Link Peek')
                for filename in ['content.js', 'background.js', 'policy.js', 'viewer.html', 'viewer.js', 'viewer.css']:
                    self.assertIn(filename, archive.namelist())
                self.assertNotIn('tests/policy.test.js', archive.namelist())
            with ZipFile(Path(folder) / f'link-peek-{version}-windows.zip') as archive:
                for filename in ['src/manifest.json', 'windows/prepare.ps1', 'PRIVACY.md', 'README.md']:
                    self.assertIn('link-peek/' + filename, archive.namelist())

    def test_release_archives_and_checksums(self):
        with tempfile.TemporaryDirectory() as folder:
            subprocess.run([sys.executable, str(ROOT / 'scripts/package_extensions.py'), 'new-tab-launcher',
                            '--output', folder, '--tag', f'new-tab-launcher/v{VERSION}'], check=True, capture_output=True)
            output = Path(folder)
            extension_zip = output / f'new-tab-launcher-{VERSION}-extension.zip'
            with ZipFile(extension_zip) as archive:
                self.assertIsNone(archive.testzip())
                self.assertEqual(json.loads(archive.read('manifest.json'))['version'], VERSION)
                self.assertIn('background.js', archive.namelist())
                self.assertNotIn('window.html', archive.namelist())
                self.assertFalse(any(name.startswith(('tests/', 'windows/', 'docs/')) for name in archive.namelist()))
                self.assertNotIn('package.json', archive.namelist())
                with tempfile.TemporaryDirectory() as extracted:
                    archive.extractall(extracted)
                    for name in ('background.js', 'destination.js', 'launch.js', 'suggestions.js', 'launcher.js', 'overlay.js', 'frame.html', 'popup.html', 'popup.css'):
                        self.assertTrue((Path(extracted) / name).is_file(), name)
            with ZipFile(output / f'new-tab-launcher-{VERSION}-windows.zip') as archive:
                self.assertIsNone(archive.testzip())
                names = archive.namelist()
                for name in ['src/manifest.json', 'windows/prepare.ps1', 'windows/launcher.ahk', 'README.md', 'PRIVACY.md', 'CHANGELOG.md']:
                    self.assertIn('new-tab-launcher/' + name, names)
                self.assertIn("src\\*", archive.read('new-tab-launcher/windows/prepare.ps1').decode())
            for line in (output / 'SHA256SUMS').read_text().splitlines():
                digest, name = line.split('  ')
                self.assertEqual(hashlib.sha256((output / name).read_bytes()).hexdigest(), digest)
            before = extension_zip.read_bytes()
            subprocess.run([sys.executable, str(ROOT / 'scripts/package_extensions.py'), 'new-tab-launcher', '--output', folder], check=True, capture_output=True)
            self.assertEqual(extension_zip.read_bytes(), before)

    def test_mismatched_tag_is_rejected(self):
        with tempfile.TemporaryDirectory() as folder:
            result = subprocess.run([sys.executable, str(ROOT / 'scripts/package_extensions.py'), 'new-tab-launcher',
                                     '--output', folder, '--tag', 'new-tab-launcher/v9.9.9'], capture_output=True)
            self.assertNotEqual(result.returncode, 0)
            self.assertEqual(list(Path(folder).iterdir()), [])


if __name__ == '__main__':
    unittest.main()
