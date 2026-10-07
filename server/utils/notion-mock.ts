import * as fs from 'node:fs'
import * as path from 'node:path'
import crypto from 'node:crypto'

interface MockDbStorage {
  pages: Record<string, any>
  blocks: Record<string, any[]>
}

const DATA_DIR = path.resolve(process.cwd(), '.data')
const DB_FILE = path.join(DATA_DIR, 'notion-mock.json')

function seedInitialData(): MockDbStorage {
  return {
    pages: {
      '398ee3b0-289a-8197-a050-d3b993fdb642': {
        id: '398ee3b0-289a-8197-a050-d3b993fdb642',
        created_time: '2026-04-20T12:00:00.000Z',
        last_edited_time: '2026-04-20T12:00:00.000Z',
        properties: {
          Name: { title: [{ plain_text: 'RCP-CERT-2026-001', text: { content: 'RCP-CERT-2026-001' } }] },
          'Template ID': { select: { name: 'internship-completion-certificate' } },
          'Mime Type': { select: { name: 'application/pdf' } },
          SizeBytes: { number: 896_601 },
          Status: { status: { name: 'Draft' } },
          'Routing Type': { select: { name: 'SEQUENTIAL' } },
          'Next Signer': { email: 'alex.mercer@example.com' },
          'Routing Queue': {
            rich_text: [
              {
                plain_text: JSON.stringify([
                  {
                    order: 1,
                    name: 'Alex Mercer',
                    email: 'alex.mercer@example.com',
                    role: 'Recipient',
                    status: 'PENDING',
                  },
                ]),
                text: {
                  content: JSON.stringify([
                    {
                      order: 1,
                      name: 'Alex Mercer',
                      email: 'alex.mercer@example.com',
                      role: 'Recipient',
                      status: 'PENDING',
                    },
                  ]),
                },
              },
            ],
          },
          Category: { multi_select: [] },
          Contact: { relation: [{ id: '19cee3b0-289a-800a-b280-ff6e2055a401' }] },
          User: { relation: [{ id: '19cee3b0-289a-8072-bc12-f4728d11c002' }] },
          Project: { relation: [{ id: '23dee3b0-289a-81d0-9e6b-e539d914d969' }] },
          Organization: { relation: [{ id: '307ee3b0-289a-8116-afb0-f6a1795a27a0' }] },
        },
      },
      '19cee3b0-289a-800a-b280-ff6e2055a401': {
        id: '19cee3b0-289a-800a-b280-ff6e2055a401',
        created_time: '2026-01-01T00:00:00.000Z',
        last_edited_time: '2026-01-01T00:00:00.000Z',
        properties: {
          Name: { title: [{ plain_text: 'Alex Mercer', text: { content: 'Alex Mercer' } }] },
          Index: { number: 1 },
          Email: { email: 'alex.mercer@example.com' },
          Phone: { phone_number: '+1 555-0199' },
        },
      },
      '19cee3b0-289a-8072-bc12-f4728d11c002': {
        id: '19cee3b0-289a-8072-bc12-f4728d11c002',
        created_time: '2026-01-01T00:00:00.000Z',
        last_edited_time: '2026-01-01T00:00:00.000Z',
        properties: {
          Name: { title: [{ plain_text: 'Shirsendu Bairagi', text: { content: 'Shirsendu Bairagi' } }] },
          Email: { email: 'shirsendu2001@gmail.com' },
          Role: { select: { name: 'Admin' } },
        },
      },
      '23dee3b0-289a-81d0-9e6b-e539d914d969': {
        id: '23dee3b0-289a-81d0-9e6b-e539d914d969',
        created_time: '2026-01-01T00:00:00.000Z',
        last_edited_time: '2026-01-01T00:00:00.000Z',
        properties: {
          Name: { title: [{ plain_text: 'Brand Identity Strategy', text: { content: 'Brand Identity Strategy' } }] },
          Slug: { formula: { string: 'brand-identity' } },
          Status: { status: { name: 'Quotation' } },
          Contact: { relation: [{ id: '19cee3b0-289a-800a-b280-ff6e2055a401' }] },
        },
      },
    },
    blocks: {},
  }
}

class LocalNotionMockDatabase {
  private db: MockDbStorage

  constructor() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true })
    }

    if (fs.existsSync(DB_FILE)) {
      try {
        this.db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'))
      } catch {
        this.db = seedInitialData()
        this.persist()
      }
    } else {
      this.db = seedInitialData()
      this.persist()
    }
  }

  private persist() {
    fs.writeFileSync(DB_FILE, JSON.stringify(this.db, null, 2), 'utf8')
  }

  public pages = {
    retrieve: async ({ page_id }: { page_id: string }) => {
      const page = this.db.pages[page_id]
      if (!page) {
        const error: any = new Error(`Mock Notion: Page "${page_id}" not found.`)
        error.code = 'object_not_found'
        error.status = 404
        throw error
      }
      return page
    },
    create: async ({ properties, children }: { parent: any; properties: any; children?: any[] }) => {
      const id = crypto.randomUUID()
      const now = new Date().toISOString()
      const newPage = {
        id,
        created_time: now,
        last_edited_time: now,
        properties,
      }
      this.db.pages[id] = newPage
      if (children && children.length > 0) {
        this.db.blocks[id] = children
      }
      this.persist()
      return newPage
    },
    update: async ({ page_id, properties }: { page_id: string; properties: any }) => {
      const page = this.db.pages[page_id]
      if (!page) {
        const error: any = new Error(`Mock Notion: Page "${page_id}" not found.`)
        error.code = 'object_not_found'
        error.status = 404
        throw error
      }
      page.properties = { ...page.properties, ...properties }
      page.last_edited_time = new Date().toISOString()
      this.persist()
      return page
    },
  }

  public dataSources = {
    query: async () => {
      const results = Object.values(this.db.pages).filter((p) => p.properties?.['Template ID'])
      return {
        results,
        has_more: false,
        next_cursor: null,
      }
    },
  }

  public blocks = {
    children: {
      list: async ({ block_id }: { block_id: string }) => {
        return {
          results: this.db.blocks[block_id] || [],
          has_more: false,
          next_cursor: null,
        }
      },
    },
  }
}

export const notionMockClient = new LocalNotionMockDatabase()
