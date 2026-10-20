import {ArrowTopRightIcon} from '@sanity/icons/ArrowTopRight'
import {CheckmarkCircleIcon} from '@sanity/icons/CheckmarkCircle'
import {Box, Card, Flex, Heading, Spinner, Text} from '@sanity/ui'
import {defineQuery} from 'groq'
import {useEffect, useState} from 'react'
import {useClient} from 'sanity'
import {StateLink} from 'sanity/router'
import {NewWorkWordmark} from './NewWorkWordmark'
import styled from 'styled-components'
import {SANITY_API_VERSION} from '../sanity.constants'
import {PUBLISHING_HELP, WEBSITE_URL} from '../website'

const PREVIEW_ENABLED = Boolean(process.env.SANITY_STUDIO_PREVIEW_ORIGIN) || process.env.NODE_ENV === 'development'
type Stats = {projects: number; assets: number; gallery: number; missingDescriptions: number; updatedAt?: string}
type Release = {builtAt: string; contentUpdatedAt: string}
const query = defineQuery(/* groq */ `{
  "projects": count(*[_type == "work" && !(_id in path("drafts.**")) && editorialStatus == "approved"]),
  "assets": count(*[_type == "mediaItem" && !(_id in path("drafts.**"))]),
  "gallery": count(*[_id == "workPage"][0].gallery),
  "missingDescriptions": count(*[_type == "mediaItem" && !(_id in path("drafts.**")) && kind in ["image", "video"] && decorative != true && (!defined(alt) || alt == "")]),
  "updatedAt": *[!(_id in path("drafts.**")) && !(_id in path("versions.**")) && _type in ["siteSettings", "workPage", "footerSettings", "contactPage", "work", "mediaItem", "sanity.imageAsset", "sanity.fileAsset"]] | order(_updatedAt desc)[0]._updatedAt
}`)
const Shell = styled(Box)`min-height: 100%; background: var(--card-bg-color);`
const Content = styled.div`max-width: 1120px; margin: auto; display: grid; gap: 2rem;`
const Hero = styled.header`
  background: #191a17; color: #f3f0e8; padding: clamp(1.5rem, 4vw, 3rem);
  display: grid; gap: 2.5rem; border-radius: 3px;
  .brand-wordmark { display: block; width: min(330px, 100%); height: auto; }
`
const HeroTop = styled.div`
  display: flex; align-items: center; justify-content: space-between; gap: 1.5rem; flex-wrap: wrap;
  a { color: inherit; text-decoration: none; border-bottom: 1px solid #8b8d81; padding: .5rem 0; font-size: .875rem; }
  a:focus-visible { outline: 2px solid currentColor; outline-offset: 6px; }
`
const HeroBottom = styled.div`
  display: flex; align-items: flex-end; justify-content: space-between; gap: 1.5rem; flex-wrap: wrap;
  h1 { margin: 0 0 .65rem; font-size: clamp(1.6rem, 3vw, 2.5rem); letter-spacing: -.045em; font-weight: 500; }
  p { margin: 0; max-width: 32rem; color: #caccc1; font-size: .9rem; line-height: 1.6; }
`
const Board = styled.div`
  display: flex; gap: 2px; padding: 5px; background: #090a08; border: 1px solid #47483e;
  span { position: relative; display: grid; place-items: center; width: 1.25rem; height: 2rem; background: linear-gradient(#30322b 49%, #20221c 50%); font: 500 1rem/1 monospace; }
  span::after { content: ''; position: absolute; inset: 49% 0 auto; border-top: 1px solid #090a08; }
`
const StatsGrid = styled.div`
  display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); border-block: 1px solid var(--card-border-color);
  > div { padding: 1.5rem 1rem; border-right: 1px solid var(--card-border-color); }
  > div:last-child { border: 0; }
  strong { display: block; font-size: 2rem; font-weight: 500; letter-spacing: -.05em; margin-bottom: .5rem; }
  span { font-size: .75rem; }
`
const Section = styled.section`display: grid; gap: 1rem;`
const Grid = styled.div`
  display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: .75rem;
  @media(max-width: 720px) { grid-template-columns: 1fr; }
`
const LinkCard = styled.a`
  color: inherit; text-decoration: none; display: flex; flex-direction: column; gap: .7rem;
  padding: 1.4rem; border: 1px solid var(--card-border-color); border-radius: 3px;
  transition: background 140ms ease;
  &:hover { background: color-mix(in srgb, currentColor 4%, transparent); }
  &:focus-visible { outline: 2px solid currentColor; outline-offset: 3px; }
  .number { font: .7rem/1 monospace; opacity: .65; }
  h3 { margin: .3rem 0 0; font-size: 1.1rem; font-weight: 600; letter-spacing: -.02em; }
  p { margin: 0; font-size: .85rem; line-height: 1.5; opacity: .8; max-width: 29rem; }
`
const Guide = styled.div`
  display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 1.5rem;
  p { font-size: .85rem; line-height: 1.6; margin: .65rem 0 0; opacity: .8; }
  h3 { font-size: .95rem; margin: 0; }
  @media(max-width: 720px) { grid-template-columns: 1fr; }
`
const actions = [
  {href: '/structure/workPage', title: 'Homepage', description: 'Curate the 16 gallery tiles, train-board messages, city clocks and behind-the-scenes photographs.'},
  {href: '/structure/work;work-live', title: 'Project pages', description: 'Edit approved work, shape project stories or create a new film, photo or featured project.'},
  {href: '/structure/assets', title: 'Asset library', description: 'Keep images, short clips and brand files organized by project, with useful descriptions.'},
  {href: '/structure/contactPage', title: 'Contact details', description: 'Update the public email, address and social links. Current placeholders can stay until ready.'},
  {href: '/structure/footerSettings', title: 'Footer & callout', description: 'Edit the contact invitation, footer train-board messages, client logos and copyright.'},
  {href: '/structure/siteSettings', title: 'Brand & navigation', description: 'Manage the approved logo arrangements, header wording, navigation and search information.'},
]

export function ClientDashboard() {
  const client = useClient({apiVersion: SANITY_API_VERSION})
  const [stats, setStats] = useState<Stats | null>(null)
  const [release, setRelease] = useState<Release | null>(null)
  const [failed, setFailed] = useState(false)
  const [releaseFailed, setReleaseFailed] = useState(false)
  useEffect(() => {
    let active = true
    const controller = new AbortController()
    const refresh = () => {
      client.withConfig({perspective: 'published'}).fetch<Stats>(query).then(value => {
        if (active) { setStats(value); setFailed(false) }
      }).catch(() => { if (active) setFailed(true) })
      fetch(`${WEBSITE_URL}release-info.json?check=${Date.now()}`, {signal: controller.signal, cache: 'no-store'})
        .then(async response => {
          if (!response.ok) throw new Error('Website status unavailable')
          const value = await response.json() as Release
          if (!value.builtAt || !value.contentUpdatedAt) throw new Error('Website status unavailable')
          if (active) { setRelease(value); setReleaseFailed(false) }
        }).catch(() => { if (active) setReleaseFailed(true) })
    }
    refresh()
    const interval = setInterval(refresh, 60000)
    return () => { active = false; controller.abort(); clearInterval(interval) }
  }, [client])
  const pending = stats?.updatedAt && release && stats.updatedAt > release.contentUpdatedAt
  return (
    <Shell padding={[3, 4, 5]}>
      <Content>
        <Hero>
          <HeroTop>
            <NewWorkWordmark />
            <a href={WEBSITE_URL} target="_blank" rel="noopener noreferrer">Open website <ArrowTopRightIcon /></a>
          </HeroTop>
          <HeroBottom>
            <div><h1>Your work. In motion.</h1><p>A home for your projects, pictures and the details that make New Work yours.</p></div>
            <Board aria-label="Studio"><span>S</span><span>T</span><span>U</span><span>D</span><span>I</span><span>O</span></Board>
          </HeroBottom>
        </Hero>
        {failed ? <Card padding={4} tone="caution" border><Text>Content counts are unavailable. Refresh to try again.</Text></Card> : stats ? (
          <StatsGrid aria-label="Published content">
            <div><strong>{stats.projects}</strong><span>Approved projects</span></div>
            <div><strong>{stats.gallery} / 16</strong><span>Gallery tiles</span></div>
            <div><strong>{stats.assets}</strong><span>Library assets</span></div>
          </StatsGrid>
        ) : <Flex gap={3} align="center"><Spinner /><Text>Loading your content…</Text></Flex>}
        <Section aria-labelledby="edit-heading">
          <Heading size={2} id="edit-heading">Make an update</Heading>
          <Grid>{actions.map((item, index) => (
            <LinkCard as={StateLink} state={{panes: item.href.replace('/structure/', '').split(';').map(id => [{id}])}} key={item.href}>
              <Flex justify="space-between"><span className="number">0{index + 1}</span><ArrowTopRightIcon /></Flex>
              <h3>{item.title}</h3><p>{item.description}</p>
            </LinkCard>
          ))}</Grid>
        </Section>
        <Section aria-labelledby="publish-heading">
          <Heading size={2} id="publish-heading">From edit to website</Heading>
          <Guide>
            <div><h3>01 · Make it yours</h3><p>Your changes save as drafts. Edit freely; draft changes do not appear on the website.</p></div>
            <div><h3>02 · Publish when ready</h3><p>Publish the project and its assets, then any page that selects them. Projects also need Approved for website.</p></div>
            <div><h3>03 · See it online</h3><p>{PUBLISHING_HELP}</p></div>
          </Guide>
          <Card padding={4} border radius={2} tone={pending ? 'caution' : 'default'}>
            <Flex gap={3} align="center"><CheckmarkCircleIcon /><Text size={1}>
              {releaseFailed ? 'Website update status is temporarily unavailable.' : !release ? 'Checking the latest website update…' : pending ? 'Published changes are waiting for the next website update.' : `Website last updated ${new Date(release.builtAt).toLocaleString([], {dateStyle: 'medium', timeStyle: 'short'})}.`}
            </Text></Flex>
          </Card>
          {stats && stats.missingDescriptions > 0 ? <Card padding={4} tone="caution" border radius={2}><Text size={1}>{stats.missingDescriptions} assets need an image description. Add these in the Asset library.</Text></Card> : null}
          {PREVIEW_ENABLED ? <LinkCard href="/presentation"><h3>Open local draft preview <ArrowTopRightIcon /></h3><p>Review changes before publishing with the connected development preview.</p></LinkCard> : null}
        </Section>
      </Content>
    </Shell>
  )
}
