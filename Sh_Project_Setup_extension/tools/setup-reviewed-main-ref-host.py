#!/usr/bin/env python3
"""Explicit, user-local registration for a read-only Brave main extension host.
No automated extension edits, sudo, Git writes, or credential collection.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import stat
import subprocess
import sys

HOST = 'com.plementus.reviewed_git_refs_main'
ROOT = Path.home() / '.local/share/plementus-reviewed-ref-main-v1'
CONFIG = Path(os.environ.get('XDG_CONFIG_HOME') or (Path.home() / '.config'))
BRAVE = CONFIG / 'BraveSoftware/Brave-Browser'
REG = BRAVE / 'NativeMessagingHosts' / (HOST + '.json')

def digest(data):
    return hashlib.sha256(data).hexdigest()

def write_new(path, data, mode=0o600):
    # O_EXCL refuses any existing file, including a dangling symlink.
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, mode)
    with os.fdopen(fd, 'wb') as out:
        out.write(data)


def regular_bytes(path):
    if not stat.S_ISREG(path.lstat().st_mode):
        raise ValueError('Expected regular non-symlink file: ' + str(path))
    return path.read_bytes()


def install(source, eid):
    if not BRAVE.is_dir():
        raise ValueError('Default Brave stable profile directory not found. Do not guess a registration path.')
    if os.path.lexists(REG) or os.path.lexists(ROOT):
        raise ValueError('Existing registration or main host directory; refusing to overwrite. Inspect before proceeding.')
    expected = {'src/background/reviewed-native-ref-bridge.mjs': 'e9b23071e7544ffbec42a9383df7c0b4e9134e5cbdffafa90dfb951bf74ab32d', 'src/background/reviewed-sandbox-execution.mjs': 'f57d143e03c96058d4db087e1e0fcb660206f4437d0b5583bb228b5f21169182', 'src/background/sandbox-preparation-controller.mjs': 'db63a41f406f95ad05bbcd05a61ac5da837130e8be3648f70b532b9e857cd428', 'src/popup/workspace-branch-preparation.mjs': '5791fc630912284678e7c358d2af731671a59a90ad0b26004391e26b5667df38', 'src/popup/sandbox-branch-assistant.mjs': 'dbdc4bc450547aab9ea319551b71733cccb42cf35d3de2ef1a7b4eee0a4721f5', 'src/github/reviewed-sandbox-submission.mjs': '032b9abd1ea72ec5c0301d182577c822547b2f8c452ba95cf03e3e574fa9f6fe', 'tools/reviewed-native-ref-host.mjs': '082278e942e36e4d62c671f021a030fbfbd89fd36db14cd92a2f03262a7e98ac', 'tools/reviewed-git-ref-reader.mjs': '60f7e616feb235343cbdea43827ca80a780ea0a2077d7989afce54650a2d8872'}
    files = {}
    for relative, sha in expected.items():
        data = regular_bytes(source/relative)
        if digest(data) != sha:
            raise ValueError('Reviewed source fingerprint mismatch: ' + relative)
        files[relative] = data
    node_path = shutil.which('node')
    if not node_path:
        raise ValueError('Node.js not found')
    node = str(Path(node_path).resolve(strict=True))
    env = {k:v for k,v in os.environ.items() if k in ('HOME','PATH','LANG','LC_ALL')}
    version = subprocess.check_output([node,'--version'],env=env,timeout=3,text=True).strip()
    if not re.fullmatch(r'v[0-9]+\.[0-9]+\.[0-9]+',version) or int(version[1:].split('.')[0]) < 22:
        raise ValueError('Node.js 22 or newer required for this host')
    if not re.fullmatch(r'[a-p]{32}',eid) or eid == 'nphjnioegoldloofjbpnjfpjlblndimh':
        raise ValueError('Provide the actual main extension ID, not the diagnostic probe ID')
    manifest = json.loads(regular_bytes(source/'manifest.json'))
    if manifest.get('name')!='Plementus Project Setup' or manifest.get('optional_permissions')!=['nativeMessaging']:
        raise ValueError('Main extension manifest mismatch')
    ROOT.mkdir(mode=0o700,parents=True,exist_ok=False)
    host = ROOT/'host'
    host.mkdir(mode=0o700)
    for relative,data in files.items():
        dest=host/relative
        dest.parent.mkdir(mode=0o700,parents=True,exist_ok=True)
        write_new(dest,data)
    # The launcher accepts only the browser's exact origin argument, fixes the
    # host path and Node executable, and owns a process group for bounded cleanup.
    # It does not authenticate untrusted local administrators or malicious helpers.
    launcher = f'''#!/usr/bin/python3
import os, signal, subprocess, sys
NODE={node!r}
ENTRY={str(host/'tools/reviewed-native-ref-host.mjs')!r}
ID={eid!r}
if len(sys.argv)!=2 or sys.argv[1] not in ('chrome-extension://'+ID, 'chrome-extension://'+ID+'/'):
    sys.exit(2)
allowed=('HOME','PATH','LANG','LC_ALL','XDG_CONFIG_HOME','XDG_RUNTIME_DIR','DBUS_SESSION_BUS_ADDRESS','GNUPGHOME')
env={{k:os.environ[k] for k in allowed if k in os.environ}}
env['PATH']='/usr/local/bin:/usr/bin:/bin'
p=None
def stop(*_):
    raise SystemExit(3)
for s in (signal.SIGTERM, signal.SIGINT, signal.SIGHUP): signal.signal(s,stop)
try:
    p=subprocess.Popen([NODE,ENTRY,'--allowed-extension-id',ID,sys.argv[1]],env=env,start_new_session=True)
    sys.exit(p.wait(timeout=7.5))
except subprocess.TimeoutExpired:
    sys.exit(4)
finally:
    if p is not None:
        try: os.killpg(p.pid,signal.SIGKILL)
        except ProcessLookupError: pass
        try: p.wait(timeout=1)
        except subprocess.TimeoutExpired: pass
'''
    write_new(ROOT/'launch-host.py',launcher.encode(),0o700)
    payload=(json.dumps({'name':HOST,'description':'Plementus main extension read-only sandbox verifier','path':str(ROOT/'launch-host.py'),'type':'stdio','allowed_origins':[f'chrome-extension://{eid}/']},indent=2)+'\n').encode()
    write_new(ROOT/'registered-manifest.json',payload)
    REG.parent.mkdir(mode=0o700,parents=True,exist_ok=True)
    write_new(REG,payload)
    print('REGISTERED_READ_ONLY_TEST')
    print('Node:',version)
    print('Extension directory:',source)
    print('Extension ID:',eid)
    print('Read-only page:',f'chrome-extension://{eid}/src/popup/reviewed-ref-check.html')
    print('Registration:',REG)
    print('No branch creation enabled. Separate diagnostic registration unchanged.')


def unregister():
    saved = regular_bytes(ROOT/'registered-manifest.json')
    if regular_bytes(REG) != saved:
        raise ValueError('Registration differs from this host; refusing removal')
    value=json.loads(saved)
    if value.get('name')!=HOST or value.get('path')!=str(ROOT/'launch-host.py') or not isinstance(value.get('allowed_origins'),list) or len(value['allowed_origins'])!=1 or not re.fullmatch(r'chrome-extension://[a-p]{32}/',value['allowed_origins'][0]):
        raise ValueError('Registration does not match exact main host')
    REG.unlink()
    print('UNREGISTERED: exact main host manifest only. Revoke main extension Native Messaging permission; files retained for review:',ROOT)

if __name__=='__main__':
    os.umask(0o077)
    parser=argparse.ArgumentParser(description=__doc__)
    group=parser.add_mutually_exclusive_group(required=True)
    group.add_argument('--install-read-only-test',action='store_true')
    group.add_argument('--unregister-read-only-test',action='store_true')
    parser.add_argument('--extension-root',type=Path)
    parser.add_argument('--extension-id')
    args=parser.parse_args()
    try:
        if args.install_read_only_test:
            if args.extension_root is None: raise ValueError('--extension-root required')
            install(args.extension_root.resolve(strict=True), args.extension_id or "")
        else: unregister()
    except (OSError,ValueError,subprocess.SubprocessError) as error:
        print('STOP:',error,file=sys.stderr)
        sys.exit(1)
