// Standalone, read-only candidate. Not imported by extension runtime.
// Trust prerequisite: operator-controlled OS, Git binary, credential helpers,
// configuration and TLS trust. No native host or approval service is installed.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { homedir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { REVIEWED_SCOPE } from '../src/background/reviewed-sandbox-execution.mjs';

const executeGit = promisify(execFile);
const repository = REVIEWED_SCOPE.repository;
const remote = `https://github.com/${repository}.git`;
const git = '/usr/bin/git';
// Standalone observation budget only; not a runtime freshness extension.
const maxMs = 5000;
const maxBytes = 4096;
const common = ['-c','protocol.allow=never','-c','protocol.https.allow=always',
  '-c','http.followRedirects=false','-c','http.sslVerify=true','-c','credential.interactive=false'];
const main = `refs/heads/${REVIEWED_SCOPE.sourceBranch}`;
const destination = `refs/heads/${REVIEWED_SCOPE.newBranch}`;
const failure = reason => ({ok:false, reason});

// Deliberately do not inherit Git tracing, config-override or repository
// environment variables. Standard user Git config and credential helpers still
// apply; this is not isolation from an untrusted local administrator/helper.
function environment() {
  const env = {HOME:homedir(), PATH:'/usr/local/bin:/usr/bin:/bin', LC_ALL:'C',
    GIT_TERMINAL_PROMPT:'0', GIT_ASKPASS:'/bin/false', SSH_ASKPASS:'/bin/false', GCM_INTERACTIVE:'Never'};
  for (const k of ['XDG_CONFIG_HOME','XDG_RUNTIME_DIR','DBUS_SESSION_BUS_ADDRESS','GNUPGHOME']) {
    if (typeof process.env[k] === 'string') env[k] = process.env[k];
  }
  return env;
}

function parseHeads(stdout) {
  if (typeof stdout !== 'string' || Buffer.byteLength(stdout,'utf8') > maxBytes || !stdout.endsWith('\n')) return null;
  const lines = stdout.slice(0,-1).split('\n');
  if (lines.length < 1 || lines.length > 2) return null;
  const refs = new Set(), heads = [];
  for (const line of lines) {
    const match = /^([0-9a-f]{40})\t([^\t\r\n]+)$/.exec(line);
    if (!match || match[1] !== REVIEWED_SCOPE.sourceSha || ![main,destination].includes(match[2]) || refs.has(match[2])) return null;
    refs.add(match[2]); heads.push({ref:match[2],sha:match[1]});
  }
  return refs.has(main) ? heads.sort((a,b)=>a.ref.localeCompare(b.ref)) : null;
}

// Dependency injection is for offline tests only. The production-shaped CLI
// below uses the fixed system Git executable; it has no shell or dynamic URL.
export function createReviewedGitRefReader({execute=executeGit, wall=Date.now, monotonic=()=>performance.now()}={}) {
  return async requestedRepository => {
    if (requestedRepository !== repository) return failure('SCOPE_MISMATCH');
    const started = monotonic(), observedAt = wall();
    if (!Number.isFinite(started) || !Number.isSafeInteger(observedAt)) return failure('CLOCK_UNAVAILABLE');
    let phase = 'URL_CHECK';
    const elapsed = () => {
      const m=monotonic()-started, w=wall()-observedAt;
      return Number.isFinite(m) && Number.isFinite(w) && m>=0 && w>=0 ? Math.max(m,w) : Infinity;
    };
    async function command(args) {
      const remaining = Math.floor(maxMs-elapsed());
      if (remaining<=0) throw Error('deadline');
      // execFile timeout controls the direct child. OS-level process-tree and
      // helper custody need separate review before any native-host activation.
      return execute(git,[...common,'ls-remote',...args,'--',remote],{
        cwd:'/',env:environment(),timeout:remaining,killSignal:'SIGKILL',maxBuffer:maxBytes,encoding:'utf8',shell:false});
    }
    try {
      const resolved = await command(['--get-url']);
      if (elapsed()>=maxMs) return failure('DEADLINE_EXCEEDED');
      if (resolved?.stdout !== remote+'\n' || resolved?.stderr !== '') return failure('URL_CHECK_FAILED');
      phase='HEADS_READ';
      const result = await command(['--heads','--exit-code']);
      if (elapsed()>=maxMs) return failure('DEADLINE_EXCEEDED');
      const heads = result?.stderr === '' ? parseHeads(result.stdout) : null;
      if (!heads) return failure('REFS_MISMATCH');
      return {ok:true,snapshot:{repository,complete:true,observedAt,heads}};
    } catch {
      return failure(elapsed()>=maxMs?'DEADLINE_EXCEEDED':phase==='URL_CHECK'?'URL_CHECK_FAILED':'GIT_READ_FAILED');
    }
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const outcome = process.argv.length===2 ? await createReviewedGitRefReader()(repository) : failure('UNEXPECTED_ARGUMENTS');
  console.log(JSON.stringify(outcome));
  if (!outcome.ok) process.exitCode=1;
}
