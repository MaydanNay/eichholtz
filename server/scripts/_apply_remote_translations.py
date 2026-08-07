#!/usr/bin/env python3
"""Upload description translations and apply them on production."""
import paramiko
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CACHE = ROOT / 'server/scripts/desc-translations.json'
APPLY = ROOT / 'server/scripts/apply-desc-translations.js'
HELP = ROOT / 'helpt.txt'

password = HELP.read_text().split('ssh root@89.35.124.219')[1].strip().splitlines()[0].strip()

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('89.35.124.219', username='root', password=password, timeout=30, allow_agent=False, look_for_keys=False)

print('uploading...', flush=True)
sftp = client.open_sftp()
sftp.put(str(CACHE), '/tmp/eicholtz-desc-translations.json')
sftp.put(str(APPLY), '/tmp/apply-desc-translations.js')
sftp.close()

print('applying on server...', flush=True)
cmd = (
    'docker cp /tmp/eicholtz-desc-translations.json eicholtz-app-1:/tmp/eicholtz-desc-translations.json && '
    'docker cp /tmp/apply-desc-translations.js eicholtz-app-1:/app/server/scripts/apply-desc-translations.js && '
    'docker exec -w /app eicholtz-app-1 node server/scripts/apply-desc-translations.js'
)
_, stdout, stderr = client.exec_command(cmd, timeout=900)
out = stdout.read().decode()
err = stderr.read().decode()
code = stdout.channel.recv_exit_status()
print(out[-8000:], flush=True)
if err.strip():
    print(err[-3000:], flush=True)
client.close()
if code != 0:
    raise SystemExit(code)
print('DONE', flush=True)
