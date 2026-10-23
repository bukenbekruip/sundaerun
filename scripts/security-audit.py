"""Scan tracked text, archived text and reachable history for common secret formats.

This is a bounded, high-confidence pattern scan, not a guarantee or penetration test.
Only paths/types/line numbers are reported; matching values are never printed.
"""
import argparse
import io
import json
import re
import subprocess
import zipfile
from pathlib import Path

TEXT = {'.js', '.mjs', '.py', '.css', '.html', '.json', '.md', '.txt', '.yml', '.yaml', '.svg', '.xml', '.lock'}
PATTERNS = {
    'private-key': rb'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----',
    'github-token': rb'gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{60,}',
    'aws-access-key': rb'\b(?:AKIA|ASIA)[A-Z0-9]{16}\b',
    'stripe-live-secret': rb'\bsk_live_[A-Za-z0-9]{16,}',
    'google-api-key': rb'AIza[0-9A-Za-z_-]{35}',
}
PATTERNS = {key: re.compile(value) for key, value in PATTERNS.items()}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--history', action='store_true')
    parser.add_argument('--output', type=Path)
    args = parser.parse_args()
    report = {'scope': 'tracked working tree and ZIP text', 'text_files': 0, 'history_blobs': 0, 'archive_text_entries': 0, 'findings': [], 'limitations': ['High-confidence common credential patterns only; no entropy or provider validation.', 'No credentials, registrar records or external services are modified.']}

    def scan(data, label):
        for kind, pattern in PATTERNS.items():
            for match in pattern.finditer(data):
                report['findings'].append({'path': label, 'kind': kind, 'line': data[:match.start()].count(b'\n') + 1, 'value': '[REDACTED]'})

    def inspect(data, path):
        if Path(path).suffix == '.zip':
            with zipfile.ZipFile(io.BytesIO(data)) as archive:
                entries = archive.infolist()
                if sum(entry.file_size for entry in entries) > 256 * 1024 * 1024:
                    raise ValueError('Archive exceeds scanner budget: ' + path)
                for entry in entries:
                    if Path(entry.filename).suffix in TEXT:
                        scan(archive.read(entry), path + '!' + entry.filename)
                        report['archive_text_entries'] += 1
        else:
            scan(data, path)

    files = subprocess.check_output(['git', 'ls-files', '-z']).decode().split('\0')[:-1]
    for name in files:
        if Path(name).suffix in TEXT or Path(name).name.startswith('.env') or Path(name).suffix == '.zip':
            path = Path(name)
            if path.exists():
                inspect(path.read_bytes(), name)
                report['text_files'] += 1
    if args.history:
        report['scope'] += ' plus unique reachable Git-history text/ZIP blobs'
        objects = subprocess.check_output(['git', 'rev-list', '--objects', '--all']).decode().splitlines()
        seen = set()
        process = subprocess.Popen(['git', 'cat-file', '--batch'], stdin=subprocess.PIPE, stdout=subprocess.PIPE)
        try:
            for line in objects:
                parts = line.split(' ', 1)
                if len(parts) != 2:
                    continue
                sha, name = parts
                if sha in seen or not (Path(name).suffix in TEXT or Path(name).name.startswith('.env') or Path(name).suffix == '.zip'):
                    continue
                seen.add(sha)
                process.stdin.write((sha + '\n').encode()); process.stdin.flush()
                header = process.stdout.readline().decode().split()
                size = int(header[2]); data = process.stdout.read(size); process.stdout.read(1)
                if header[1] == 'blob':
                    inspect(data, sha[:12] + ':' + name)
                    report['history_blobs'] += 1
        finally:
            process.stdin.close(); process.wait()
    report['status'] = 'passed' if not report['findings'] else 'review-required'
    output = json.dumps(report, indent=2) + '\n'
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(output)
    print(output)
    if report['findings']:
        raise SystemExit(1)


if __name__ == '__main__':
    main()
