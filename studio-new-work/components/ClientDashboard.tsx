import {CheckmarkCircleIcon} from '@sanity/icons/CheckmarkCircle'
import {ComposeIcon} from '@sanity/icons/Compose'
import {ControlsIcon} from '@sanity/icons/Controls'
import {HomeIcon} from '@sanity/icons/Home'
import {ImagesIcon} from '@sanity/icons/Images'
import {LaunchIcon} from '@sanity/icons/Launch'
import {ProjectsIcon} from '@sanity/icons/Projects'
import {Badge, Box, Card, Flex, Grid, Heading, Inline, Spinner, Stack, Text} from '@sanity/ui'
import {defineQuery} from 'groq'
import {useEffect, useState} from 'react'
import {useClient} from 'sanity'
import styled from 'styled-components'
import {SANITY_API_VERSION} from '../sanity.constants'

const PREVIEW_ENABLED = Boolean(process.env.SANITY_STUDIO_PREVIEW_ORIGIN) || process.env.NODE_ENV === 'development'

type DashboardStats = {
  projects: number
  review: number
  ready: number
  approved: number
  assets: number
  missingDescriptions: number
  rightsPending: number
}

const EMPTY_STATS: DashboardStats = {
  projects: 0,
  review: 0,
  ready: 0,
  approved: 0,
  assets: 0,
  missingDescriptions: 0,
  rightsPending: 0,
}

const DASHBOARD_STATS_QUERY = defineQuery(/* groq */ `{
  "projects": count(*[_type == "project" && !(_id in path("drafts.**"))]),
  "review": count(*[_type == "project" && !(_id in path("drafts.**")) && editorialStatus == "review"]),
  "ready": count(*[_type == "project" && !(_id in path("drafts.**")) && editorialStatus == "ready"]),
  "approved": count(*[_type == "project" && !(_id in path("drafts.**")) && editorialStatus == "approved"]),
  "assets": count(*[_type == "mediaItem" && !(_id in path("drafts.**"))]),
  "missingDescriptions": count(*[_type == "mediaItem" && !(_id in path("drafts.**")) && kind in ["image", "video"] && decorative != true && !defined(alt)]),
  "rightsPending": count(*[_type == "mediaItem" && !(_id in path("drafts.**")) && rightsApprovalStatus != "approved"])
}`)

const DashboardShell = styled(Box)`
  min-height: 100%;
  background:
    radial-gradient(circle at 12% 0%, color-mix(in srgb, currentColor 7%, transparent), transparent 26rem),
    var(--card-bg-color);
`

const QuietLink = styled.a`
  color: inherit;
  display: block;
  text-decoration: none;

  > div {
    height: 100%;
    transition: border-color 140ms ease, transform 140ms ease, box-shadow 140ms ease;
  }

  &:hover > div,
  &:focus-visible > div {
    box-shadow: 0 12px 32px rgb(0 0 0 / 12%);
    transform: translateY(-2px);
  }

  &:focus-visible {
    outline: none;
  }
`

const HeroCard = styled(Card)`
  overflow: hidden;
  position: relative;

  &::after {
    content: 'NW';
    font-size: clamp(8rem, 23vw, 20rem);
    font-weight: 700;
    letter-spacing: -0.12em;
    line-height: 0.7;
    opacity: 0.045;
    pointer-events: none;
    position: absolute;
    right: 0.03em;
    top: 0.1em;
  }
`

const HeroHeading = styled(Heading)`
  font-size: clamp(2.25rem, 5vw, 4.75rem) !important;
  letter-spacing: -0.055em;
  line-height: 0.98 !important;
  margin-bottom: 0.4em;
`

const HeroCopy = styled(Text)`
  display: block;
  line-height: 1.55 !important;
  max-width: 680px;
`

const MetricGrid = styled.div`
  display: grid;
  gap: 0.75rem;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin-top: 1.25rem;

  @media (min-width: 760px) {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
`

const TwoColumnGrid = styled.div`
  display: grid;
  gap: 0.75rem;
  grid-template-columns: 1fr;

  @media (min-width: 760px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`

const DashboardSection = styled.section`
  display: grid;
  gap: 1rem;
  margin-top: 2rem;
`

const BottomGrid = styled(TwoColumnGrid)`
  margin-top: 2rem;
`

const QuickCopy = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  min-width: 0;
`

const QuickTitle = styled(Heading)`
  line-height: 1.15 !important;
`

const QuickDescription = styled(Text)`
  display: block;
  line-height: 1.45 !important;
`

const quickLinks = [
  {
    href: '/structure/workPage',
    icon: HomeIcon,
    eyebrow: 'CURATE',
    title: 'Work page & gallery',
    description: 'Edit the opening copy, drag projects into order, and set gallery emphasis.',
  },
  {
    href: '/structure/projects;projects-needs-attention',
    icon: ProjectsIcon,
    eyebrow: 'REVIEW',
    title: 'Project pages',
    description: 'Finish project facts, page sections, credits, approvals, and sharing details.',
  },
  {
    href: '/structure/assets;assets-accessibility',
    icon: ImagesIcon,
    eyebrow: 'ORGANIZE',
    title: 'Asset library',
    description: 'Add descriptions, confirm rights, and see which projects use each asset.',
  },
  {
    href: '/structure/aboutPage',
    icon: ComposeIcon,
    eyebrow: 'EDIT',
    title: 'Site copy',
    description: 'Update About, Contact, the footer, and navigation from dedicated editors.',
  },
]

const workflow = [
  ['1', 'Working draft', 'Content is being assembled.'],
  ['2', 'Needs review', 'Facts, media, accessibility, and rights need a human check.'],
  ['3', 'Ready to publish', 'The page is complete and awaiting final approval.'],
  ['4', 'Approved for website', 'Publishing this document makes it eligible for the public site.'],
]

export function ClientDashboard() {
  const client = useClient({apiVersion: SANITY_API_VERSION})
  const [stats, setStats] = useState<DashboardStats>(EMPTY_STATS)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    client
      .fetch<DashboardStats>(DASHBOARD_STATS_QUERY)
      .then((result) => {
        if (active) setStats(result)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [client])

  return (
    <DashboardShell padding={[4, 5, 6]}>
      <Stack space={5} style={{maxWidth: 1320, margin: '0 auto'}}>
        <HeroCard padding={[5, 6, 7]} radius={4} shadow={1} tone="transparent" border>
          <Stack space={5} style={{maxWidth: 760, position: 'relative', zIndex: 1}}>
            <Inline space={2}>
              <Badge tone="primary" mode="outline">CLIENT WORKSPACE</Badge>
              <Badge tone="positive" mode="outline">LIVE WEBSITE CONTENT</Badge>
            </Inline>
            <Stack space={3}>
              <HeroHeading size={5}>New Work website editor</HeroHeading>
              <HeroCopy size={2} muted>
                Start with the task you want to complete. The technical migration details stay out
                of the way, while review and approval checks remain visible when they matter.
              </HeroCopy>
            </Stack>
            <Inline space={3}>
              {PREVIEW_ENABLED ? (
                <QuietLink href="/presentation">
                  <Card padding={3} radius={3} tone="primary" border>
                    <Flex align="center" gap={2}>
                      <LaunchIcon />
                      <Text weight="semibold">Open website preview</Text>
                    </Flex>
                  </Card>
                </QuietLink>
              ) : (
                <Card padding={3} radius={3} tone="transparent" border>
                  <Flex align="center" gap={2}>
                    <LaunchIcon />
                    <Text weight="semibold" muted>Preview connects after website hosting</Text>
                  </Flex>
                </Card>
              )}
              <QuietLink href="/structure/siteSettings">
                <Card padding={3} radius={3} border>
                  <Flex align="center" gap={2}>
                    <ControlsIcon />
                    <Text weight="semibold">Brand & navigation</Text>
                  </Flex>
                </Card>
              </QuietLink>
            </Inline>
          </Stack>
        </HeroCard>

        <MetricGrid>
          {[
            ['Projects', stats.projects, 'default'],
            ['Needs review', stats.review, stats.review ? 'caution' : 'positive'],
            ['Missing descriptions', stats.missingDescriptions, stats.missingDescriptions ? 'caution' : 'positive'],
            ['Rights to confirm', stats.rightsPending, stats.rightsPending ? 'caution' : 'positive'],
          ].map(([label, value, tone]) => (
            <Card key={String(label)} padding={4} radius={3} border tone={tone as 'default' | 'caution' | 'positive'}>
              <Stack space={3}>
                <Text size={1} muted>{label}</Text>
                {loading ? <Spinner muted /> : <Heading size={3}>{value}</Heading>}
              </Stack>
            </Card>
          ))}
        </MetricGrid>

        <DashboardSection>
          <Heading size={2}>What would you like to do?</Heading>
          <TwoColumnGrid>
            {quickLinks.map((item) => {
              const Icon = item.icon
              return (
                <QuietLink href={item.href} key={item.href}>
                  <Card padding={5} radius={3} border>
                    <Flex gap={4} align="flex-start">
                      <Card padding={3} radius={3} tone="primary">
                        <Text size={2}><Icon /></Text>
                      </Card>
                      <QuickCopy>
                        <Text size={0} weight="semibold" muted>{item.eyebrow}</Text>
                        <QuickTitle size={2}>{item.title}</QuickTitle>
                        <QuickDescription size={1} muted>{item.description}</QuickDescription>
                      </QuickCopy>
                    </Flex>
                  </Card>
                </QuietLink>
              )
            })}
          </TwoColumnGrid>
        </DashboardSection>

        <BottomGrid>
          <Card padding={5} radius={3} border>
            <Stack space={4}>
              <Heading size={2}>Simple publishing workflow</Heading>
              {workflow.map(([number, title, description]) => (
                <Flex gap={3} align="flex-start" key={number}>
                  <Badge tone={number === '4' ? 'positive' : 'primary'}>{number}</Badge>
                  <Stack space={2}>
                    <Text weight="semibold">{title}</Text>
                    <Text size={1} muted>{description}</Text>
                  </Stack>
                </Flex>
              ))}
            </Stack>
          </Card>
          <Card padding={5} radius={3} border tone="transparent">
            <Stack space={4}>
              <Flex align="center" gap={3}>
                <CheckmarkCircleIcon />
                <Heading size={2}>Safe by design</Heading>
              </Flex>
              <Text muted>
                Editing creates a draft first. A project must also be marked “Approved for website”
                and have its rights checks completed before it is eligible for the public portfolio.
              </Text>
              <Grid columns={2} gap={3}>
                <Card padding={3} radius={2} border>
                  <Stack space={2}>
                    <Text size={0} muted>READY</Text>
                    <Heading size={2}>{loading ? '—' : stats.ready}</Heading>
                  </Stack>
                </Card>
                <Card padding={3} radius={2} border>
                  <Stack space={2}>
                    <Text size={0} muted>APPROVED</Text>
                    <Heading size={2}>{loading ? '—' : stats.approved}</Heading>
                  </Stack>
                </Card>
              </Grid>
              <Text size={1} muted>{stats.assets} managed assets are available in the library.</Text>
            </Stack>
          </Card>
        </BottomGrid>
      </Stack>
    </DashboardShell>
  )
}
