/**
 * Development stand-ins for the Notion "Organization" and "Organization Member" databases. Page IDs and branding
 * follow the real rows; every other value is made up.
 */
export const MOCK_ORGANIZATION_DB = 'mock-organization-db'
const MOCK_MEMBER_DB = 'mock-organization-member-db'

/** Users who may act for the seeded organisations. The first is the mock user that owns the seeded document. */
const MEMBER_USERS = ['19cee3b0-289a-8072-bc12-f4728d11c002', '307ee3b0-289a-8179-a8a8-d2efcdb67bbf', '368ee3b0-289a-8066-818f-c6994958263e']

const text = (content: string) => ({ rich_text: content ? [{ text: { content } }] : [] })

const page = (id: string, dataSourceId: string, properties: Record<string, unknown>) => ({
  id,
  parent: { data_source_id: dataSourceId },
  created_time: '2026-01-01T00:00:00.000Z',
  last_edited_time: '2026-01-01T00:00:00.000Z',
  properties,
})

interface Seed {
  pageId: string
  slug: string
  name: string
  memberPrefix: string
  branding: Record<string, unknown>
}

const SEEDS: Seed[] = [
  {
    pageId: '3d7ee3b0-289a-80d4-8f0e-c55b44df80a6',
    slug: 'modest-human-brands',
    name: 'Modest Human Brands',
    memberPrefix: 'aaaaaaaa-0000-4000-8000-00000000000',
    branding: { logo: 'https://modesthumanbrands.com/logo.svg', color: { primary: '#111827', accent: '#5945EA' }, font: 'Exo2' },
  },
  {
    pageId: '307ee3b0-289a-8116-afb0-f6a1795a27a0',
    slug: 'red-cat-pictures-1',
    name: 'RED CAT PICTURES',
    memberPrefix: 'bbbbbbbb-0000-4000-8000-00000000000',
    branding: { logo: 'https://redcatpictures.com/logo-dark.svg', color: { primary: '#262626', accent: '#CD2D2D' }, font: 'Oxanium' },
  },
]

export function seedOrganizationPages(): Record<string, ReturnType<typeof page>> {
  const pages = SEEDS.flatMap((seed) => {
    const members = MEMBER_USERS.map((userId, index) => page(`${seed.memberPrefix}${index}`, MOCK_MEMBER_DB, { Status: { status: { name: 'Verified' } }, User: { relation: [{ id: userId }] } }))
    const organization = page(seed.pageId, MOCK_ORGANIZATION_DB, {
      Name: { title: [{ text: { content: seed.name } }] },
      Id: text(seed.slug),
      'Contact Email': { email: 'contact@example.com' },
      Branding: text(JSON.stringify(seed.branding)),
      'Organization Members': { relation: members.map(({ id }) => ({ id })) },
    })
    return [organization, ...members]
  })
  return Object.fromEntries(pages.map((item) => [item.id, item]))
}
