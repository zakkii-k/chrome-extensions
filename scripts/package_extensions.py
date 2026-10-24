#!/usr/bin/env python3
"""Package independent extensions using Python's standard library only."""
import argparse
import hashlib
import json
import re
from pathlib import Path
from zipfile import ZipFile, ZipInfo, ZIP_DEFLATED

ROOT = Path(__file__).resolve().parents[1]


def write_zip(destination, entries):
    with ZipFile(destination, 'w', compression=ZIP_DEFLATED) as archive:
        for source, name in sorted(entries, key=lambda item: item[1]):
            if source.is_symlink():
                raise ValueError(f'Symlinks are not packaged: {source}')
            info = ZipInfo(name, date_time=(2020, 1, 1, 0, 0, 0))
            info.compress_type = ZIP_DEFLATED
            info.external_attr = 0o100644 << 16
            archive.writestr(info, source.read_bytes())


def package_extension(name, output, tag=None):
    if not re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*', name):
        raise ValueError('Extension name must use lowercase letters, digits and hyphens')
    project = ROOT / 'extensions' / name
    source = project / 'src'
    manifest = json.loads((source / 'manifest.json').read_text())
    package = json.loads((project / 'package.json').read_text())
    version = manifest['version']
    if not re.fullmatch(r'\d+(?:\.\d+){0,3}', version):
        raise ValueError('Manifest version must be a numeric Chrome extension version')
    if package['version'] != version:
        raise ValueError('package.json and manifest.json versions must match')
    if tag is not None and tag != f'{name}/v{version}':
        raise ValueError(f'Tag must match {name}/v{version}')
    output.mkdir(parents=True, exist_ok=True)
    source_files = [(file, file.relative_to(source).as_posix())
                    for file in source.rglob('*') if file.is_file() and not any(part.startswith('.') for part in file.relative_to(source).parts)]
    extension_zip = output / f'{name}-{version}-extension.zip'
    write_zip(extension_zip, source_files)
    bundle = [(file, f'{name}/src/{relative}') for file, relative in source_files]
    for filename in ['README.md', 'CHANGELOG.md', 'PRIVACY.md', 'LICENSE']:
        file = project / filename
        if file.is_file():
            bundle.append((file, f'{name}/{filename}'))
    windows = project / 'windows'
    for file in windows.rglob('*') if windows.exists() else []:
        if file.is_file() and not file.name.startswith('.'):
            bundle.append((file, f'{name}/windows/{file.relative_to(windows).as_posix()}'))
    bundle_zip = output / f'{name}-{version}-windows.zip'
    write_zip(bundle_zip, bundle)
    return [extension_zip, bundle_zip]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('extensions', nargs='*')
    parser.add_argument('--output', type=Path, default=ROOT / 'dist')
    parser.add_argument('--tag')
    args = parser.parse_args()
    names = args.extensions or sorted(path.parent.name for path in (ROOT / 'extensions').glob('*/src/manifest.json'))
    if not names:
        parser.error('No extensions found')
    if args.tag and len(names) != 1:
        parser.error('--tag requires one extension')
    artifacts = [artifact for name in names for artifact in package_extension(name, args.output, args.tag)]
    sums = ''.join(f'{hashlib.sha256(file.read_bytes()).hexdigest()}  {file.name}\n' for file in artifacts)
    (args.output / 'SHA256SUMS').write_text(sums)
    for artifact in artifacts:
        print(artifact)
    print(args.output / 'SHA256SUMS')


if __name__ == '__main__':
    main()
