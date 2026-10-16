import { spawnSync } from 'node:child_process';
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { filesWithin, redirectHtml, root } from './lib.mjs';
import { publishedContent } from './content-fingerprint.mjs';
const config = JSON.parse(await readFile(new URL(process.argv.includes('--review') ? './review-release.json' : './root-release.json',import.meta.url),'utf8'));
const production = process.argv.includes('--production');
const mode = production ? 'production' : 'prototype';
const base = config.base === '/' ? '' : config.base;
const env = { ...process.env, PUBLIC_SITE_URL: config.site, PUBLIC_BASE_PATH: config.base, PUBLIC_CONTENT_MODE: mode, PUBLIC_REVIEW_NOINDEX: config.indexable === false ? 'true' : 'false' };
// Capture before building: a publish during the build will trigger another check.
const content = production ? await publishedContent() : {};
const cwd = path.join(root,config.source);
const run = (command,args) => { const result=spawnSync(command,args,{cwd,env,stdio:'inherit'}); if(result.status!==0)throw new Error(`${command} ${args.join(' ')} failed`); };
if(production)run('npm',['run','sanity:audit']);
run('npm',['run','build']);run('npm',['run','verify:dist']);
const source = path.join(cwd,'dist');
if (production) {
  const contact = await readFile(path.join(source, 'contact/index.html'), 'utf8');
  if (/lorem\.ipsum|example\.invalid|Lorem ipsum|Dolor sit amet/iu.test(contact)) {
    console.warn('Contact placeholders retained by owner instruction (16 October 2026). The client can replace them in Sanity → Contact page.');
  }
}

const output = path.join(root,config.output);
// Never overwrite the last successfully packaged candidate on a failed build.
await rm(output,{recursive:true,force:true}); await cp(source,output,{recursive:true});
const html = (await filesWithin(source)).filter(file=>file.endsWith('/index.html'));
for(const prefix of config.legacyPrefixes){
  for(const file of html){
    const relative=path.relative(source,file);const route=relative==='index.html'?'':relative.slice(0,-'index.html'.length);
    const destination=path.join(output,prefix,relative);await mkdir(path.dirname(destination),{recursive:true});
    await writeFile(destination,redirectHtml(`${base}/${route}`,'New Work Agency'));
  }
}
await writeFile(path.join(output,'.nojekyll'),'');
await writeFile(path.join(output,'release-info.json'),JSON.stringify({source:config.source,mode,origin:config.site,base:config.base,indexable:production && config.indexable !== false,commit:process.env.GITHUB_SHA || null,...content,builtAt:new Date().toISOString(),legacyPrefixes:config.legacyPrefixes},null,2)+'\n');
console.log(`${config.site}${base}/ ${mode} candidate prepared at ${output}. Nothing published.`);
