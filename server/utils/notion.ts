// server/utils/notion.ts
import { Client } from '@notionhq/client'
import { notionMockClient } from '~/server/utils/notion-mock'

const isDev = process.env.NODE_ENV === 'development'

const notionClientSingleton = () => {
  if (isDev) {
    return notionMockClient as unknown as Client
  }
  return new Client({ auth: process.env.NOTION_API_KEY })
}

// eslint-disable-next-line no-shadow-restricted-names
declare const globalThis: {
  notionGlobal: ReturnType<typeof notionClientSingleton>
}

const notion = globalThis.notionGlobal ?? notionClientSingleton()

export default notion

if (process.env.NODE_ENV !== 'production') globalThis.notionGlobal = notion
