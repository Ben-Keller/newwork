import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {root} from './lib.mjs';
import {verifyRootRelease} from './root-release-validation.mjs';
const config = JSON.parse(await readFile(new URL(process.argv.includes('--review') ? './review-release.json' : './root-release.json', import.meta.url), 'utf8'));
const result = await verifyRootRelease(path.join(root, config.output), config, {production: process.argv.includes('--production')});
console.log(`Verified ${result.pages} root/legacy routes, sixteen gallery tiles, local references and ${result.mode} metadata.`);
