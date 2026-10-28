# Phase 02.01: Minimal Chrome MV3 manifest

**Status: READY_FOR_REVIEW.** Recorded 2026-10-28 (Africa/Cairo). Progress: **2/20 master phases; 7/72 micro-phases accepted.**

## Scope

Added `manifest.json` at the extension root with `manifest_version: 3`, the name `Plementus Project Setup`, and version `0.1.0`. The approved vanilla JavaScript, no-bundler direction remains unchanged. No source folders were created because this phase has no source entry point; Phase 02.02 owns the worker and popup files.

## Validation

```text
node --input-type=module --eval "import fs from 'node:fs'; const manifest=JSON.parse(fs.readFileSync('Sh_Project_Setup_extension/manifest.json','utf8')); const forbidden=['permissions','optional_permissions','host_permissions','optional_host_permissions','background','action','content_scripts']; if(manifest.manifest_version!==3||typeof manifest.name!=='string'||!manifest.name.trim()||!/^\\d+\\.\\d+\\.\\d+$/.test(manifest.version)||forbidden.some((key)=>key in manifest)||Object.keys(manifest).some((key)=>/url|script|worker|popup/i.test(key))) throw new Error('invalid minimal manifest'); console.log('manifest validation passed');"
manifest validation passed
node --input-type=module --eval "import fs from 'node:fs'; import path from 'node:path'; const root='Sh_Project_Setup_extension/docs'; const files=[]; const walk=(dir)=>{for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const target=path.join(dir,entry.name); entry.isDirectory()?walk(target):entry.name.endsWith('.md')&&files.push(target)}}; walk(root); const missing=[]; for(const file of files){const text=fs.readFileSync(file,'utf8'); for(const match of text.matchAll(/(?<!!)\[[^\]]*\]\(([^)#]+)(?:#[^)]*)?\)/g)){const href=match[1]; if(/^[a-z][a-z+.-]*:/i.test(href)) continue; if(!fs.existsSync(path.resolve(path.dirname(file),href))) missing.push(file+' -> '+href)}} if(missing.length) throw new Error(missing.join('\\n')); console.log('markdown links passed: '+files.length+' files');"
markdown links passed: 27 files
git diff --check
exit 0
```

The check parsed `manifest.json`, asserted `manifest_version === 3`, a non-empty name, a valid three-part numeric version, and the absence of `permissions`, `optional_permissions`, `host_permissions`, `optional_host_permissions`, `background`, `action`, `content_scripts`, and externally referenced files. `git diff --check` and local Markdown-link validation also passed.

Browser extension loading, runtime behavior, provider access, and provider tests: **NOT RUN**.

## Stop point

**STOP for ChatGPT acceptance of Phase 02.01.** Phase 02.02 has not started.
