import {CheckmarkCircleIcon} from '@sanity/icons/CheckmarkCircle'
import {HomeIcon} from '@sanity/icons/Home'
import {ImagesIcon} from '@sanity/icons/Images'
import {LaunchIcon} from '@sanity/icons/Launch'
import {PlayIcon} from '@sanity/icons/Play'
import {ProjectsIcon} from '@sanity/icons/Projects'
import {Box, Card, Flex, Heading, Spinner, Text} from '@sanity/ui'
import {defineQuery} from 'groq'
import {useEffect, useState} from 'react'
import {useClient} from 'sanity'
import styled from 'styled-components'
import {SANITY_API_VERSION} from '../sanity.constants'

const PREVIEW_ENABLED =
  Boolean(process.env.SANITY_STUDIO_PREVIEW_ORIGIN) || process.env.NODE_ENV === 'development'

type DashboardStats = {
  review: number
  missingDescriptions: number
  rightsPending: number
}

const EMPTY_STATS: DashboardStats = {
  review: 0,
  missingDescriptions: 0,
  rightsPending: 0,
}

const DASHBOARD_STATS_QUERY = defineQuery(/* groq */ `{
  "review": count(*[_type == "work" && !(_id in path("drafts.**")) && editorialStatus == "review"]),
  "missingDescriptions": count(*[_type == "mediaItem" && !(_id in path("drafts.**")) && kind in ["image", "video"] && decorative != true && !defined(alt)]),
  "rightsPending": count(*[_type == "mediaItem" && !(_id in path("drafts.**")) && rightsApprovalStatus != "approved"])
}`)

const DashboardShell = styled(Box)`
  min-height: 100%;
  background: var(--card-bg-color);
`

const DashboardContent = styled.div`
  display: grid;
  gap: 2rem;
  margin: 0 auto;
  max-width: 1120px;
`

const DashboardHeader = styled.header`
  align-items: flex-end;
  display: flex;
  gap: 1rem 2rem;
  justify-content: space-between;

  @media (max-width: 640px) {
    align-items: flex-start;
    flex-direction: column;
  }
`

const HeaderCopy = styled.div`
  display: grid;
  gap: 0.55rem;
  max-width: 42rem;
`

const PageHeading = styled(Heading)`
  font-size: clamp(2rem, 4vw, 3rem) !important;
  letter-spacing: -0.045em;
  line-height: 1 !important;
`

const Intro = styled(Text)`
  display: block;
  line-height: 1.5 !important;
`

const QuietLink = styled.a`
  color: inherit;
  display: block;
  text-decoration: none;

  > div {
    height: 100%;
    transition: background-color 120ms ease, border-color 120ms ease;
  }

  &:hover > div,
  &:focus-visible > div {
    background-color: color-mix(in srgb, currentColor 5%, transparent);
  }

  &:focus-visible {
    border-radius: 0.375rem;
    outline: 2px solid currentColor;
    outline-offset: 2px;
  }
`

const PreviewLink = styled(QuietLink)`
  flex: none;
`

const Section = styled.section`
  display: grid;
  gap: 0.9rem;
`

const SectionHeading = styled(Heading)`
  line-height: 1.2 !important;
`

const ActionGrid = styled.div`
  display: grid;
  gap: 0.75rem;
  grid-template-columns: repeat(2, minmax(0, 1fr));

  @media (max-width: 760px) {
    grid-template-columns: 1fr;
  }
`

const ActionBody = styled.div`
  align-items: start;
  display: grid;
  gap: 1rem;
  grid-template-columns: 2.5rem minmax(0, 1fr);
  min-height: 4.5rem;
`

const ActionIcon = styled(Card)`
  align-items: center;
  box-sizing: border-box;
  display: flex;
  font-size: 1.25rem;
  height: 2.5rem;
  justify-content: center;
  width: 2.5rem;
`

const ActionCopy = styled.div`
  display: grid;
  gap: 0.35rem;
  min-width: 0;
`

const ActionTitle = styled(Heading)`
  line-height: 1.2 !important;
`

const ActionDescription = styled(Text)`
  display: block;
  line-height: 1.45 !important;
`

const StatusGrid = styled.div`
  display: grid;
  gap: 0.75rem;
  grid-template-columns: repeat(3, minmax(0, 1fr));

  @media (max-width: 760px) {
    grid-template-columns: 1fr;
  }
`

const StatusBody = styled.div`
  align-items: center;
  display: grid;
  gap: 0.85rem;
  grid-template-columns: auto minmax(0, 1fr);
`

const StatusValue = styled(Heading)`
  font-variant-numeric: tabular-nums;
  line-height: 1 !important;
`

const ClearState = styled.div`
  align-items: center;
  display: flex;
  gap: 0.75rem;
  min-height: 1.5rem;

  svg {
    flex: none;
    font-size: 1.25rem;
  }
`

const quickLinks = [
  {
    href: '/structure/workPage',
    icon: HomeIcon,
    title: 'Work page',
    description: 'Arrange the gallery and edit its introduction.',
  },
  {
    href: '/structure/aboutPage',
    icon: PlayIcon,
    title: 'About page',
    description: 'Edit the motion page, fallback, and sharing copy.',
  },
  {
    href: '/structure/work;work-needs-attention',
    icon: ProjectsIcon,
    title: 'Project pages',
    description: 'Review project content, media, and approvals.',
  },
  {
    href: '/structure/assets;assets-accessibility',
    icon: ImagesIcon,
    title: 'Asset library',
    description: 'Manage media descriptions and usage rights.',
  },
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
      .catch(() => undefined)
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [client])

  const attentionItems = [
    {
      href: '/structure/work;work-needs-attention',
      label: 'Needs review',
      value: stats.review,
    },
    {
      href: '/structure/assets;assets-accessibility',
      label: 'Missing descriptions',
      value: stats.missingDescriptions,
    },
    {
      href: '/structure/assets;assets-rights',
      label: 'Rights to confirm',
      value: stats.rightsPending,
    },
  ].filter((item) => item.value > 0)

  return (
    <DashboardShell padding={[4, 5, 6]}>
      <DashboardContent>
        <DashboardHeader>
          <HeaderCopy>
            <PageHeading size={4}>Start here</PageHeading>
            <Intro size={2} muted>
              Choose what you want to update. Items that need attention appear only when there is
              something to fix.
            </Intro>
          </HeaderCopy>

          {PREVIEW_ENABLED ? (
            <PreviewLink href="/presentation">
              <Card padding={3} radius={3} tone="primary" border>
                <Flex align="center" gap={2}>
                  <LaunchIcon />
                  <Text weight="semibold">Preview website</Text>
                </Flex>
              </Card>
            </PreviewLink>
          ) : null}
        </DashboardHeader>

        <Section aria-labelledby="status-heading">
          <SectionHeading id="status-heading" size={2}>
            Status
          </SectionHeading>

          {loading ? (
            <Card padding={4} radius={3} border>
              <Flex align="center" gap={3}>
                <Spinner muted />
                <Text muted>Checking your content…</Text>
              </Flex>
            </Card>
          ) : attentionItems.length > 0 ? (
            <StatusGrid>
              {attentionItems.map((item) => (
                <QuietLink href={item.href} key={item.label}>
                  <Card padding={4} radius={3} tone="caution" border>
                    <StatusBody>
                      <StatusValue size={3}>{item.value}</StatusValue>
                      <Text weight="semibold">{item.label}</Text>
                    </StatusBody>
                  </Card>
                </QuietLink>
              ))}
            </StatusGrid>
          ) : (
            <Card padding={4} radius={3} tone="positive" border>
              <ClearState>
                <CheckmarkCircleIcon />
                <Text weight="semibold">Everything is ready.</Text>
              </ClearState>
            </Card>
          )}
        </Section>

        <Section aria-labelledby="actions-heading">
          <SectionHeading id="actions-heading" size={2}>
            What would you like to do?
          </SectionHeading>

          <ActionGrid>
            {quickLinks.map((item) => {
              const Icon = item.icon

              return (
                <QuietLink href={item.href} key={item.href}>
                  <Card padding={4} radius={3} border>
                    <ActionBody>
                      <ActionIcon padding={2} radius={2} tone="primary">
                        <Icon />
                      </ActionIcon>
                      <ActionCopy>
                        <ActionTitle size={2}>{item.title}</ActionTitle>
                        <ActionDescription size={1} muted>
                          {item.description}
                        </ActionDescription>
                      </ActionCopy>
                    </ActionBody>
                  </Card>
                </QuietLink>
              )
            })}
          </ActionGrid>
        </Section>
      </DashboardContent>
    </DashboardShell>
  )
}
