import {getCliClient} from 'sanity/cli'
import {SANITY_API_VERSION} from '../sanity.constants'

async function main() {
  const authenticatedClient = getCliClient({apiVersion: SANITY_API_VERSION})
  const token = authenticatedClient.config().token
  if (!token) throw new Error('Sanity CLI authentication did not provide a user token.')

  process.env.SANITY_WRITE_TOKEN = token
  process.argv = [process.argv[0], process.argv[1]]

  const {runSanitySeed} = await import('../../new-work-site/scripts/seed-sanity')
  await runSanitySeed()
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
