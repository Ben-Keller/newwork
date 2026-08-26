import {spawn} from 'node:child_process'
import {mkdir} from 'node:fs/promises'
import path from 'node:path'
import {fileURLToPath} from 'node:url'

const studioDirectory = fileURLToPath(new URL('..', import.meta.url))
const snapshotDirectory = path.join(studioDirectory, '.sanity', 'backups')
const timestamp = new Date().toISOString().replace(/[:.]/gu, '-')
const snapshotPath = path.join(snapshotDirectory, `production-${timestamp}.tar.gz`)
const commandOptions = new Set(process.argv.slice(2))
const unknownOptions = [...commandOptions].filter((option) => option !== '--dry-run')
if (unknownOptions.length > 0) {
  throw new Error(`Unknown snapshot option(s): ${unknownOptions.join(', ')}`)
}

const sanityBinary = path.join(
  studioDirectory,
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'sanity.cmd' : 'sanity',
)

if (commandOptions.has('--dry-run')) {
  console.log(`Would export the production dataset to ${snapshotPath}`)
} else {
  await mkdir(snapshotDirectory, {recursive: true})

  const exitCode = await new Promise((resolve, reject) => {
    const child = spawn(
      sanityBinary,
      ['dataset', 'export', 'production', snapshotPath, '--overwrite'],
      {stdio: 'inherit'},
    )
    child.once('error', reject)
    child.once('close', resolve)
  })

  if (exitCode !== 0) {
    throw new Error(`Sanity export failed with exit code ${String(exitCode)}.`)
  }

  console.log(`Production content snapshot saved to ${snapshotPath}`)
}
