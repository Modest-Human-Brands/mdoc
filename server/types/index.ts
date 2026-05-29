export const resourceTypes = ['document'] as const

export type ResourceType = (typeof resourceTypes)[number]

export type NotionDB = { [K in ResourceType]: string }

type NotionImage =
  | {
      type: 'file'
      file: {
        url: string
        expiry_time: string
      }
    }
  | {
      type: 'external'
      external: {
        url: string
      }
    }
  | null

export interface NotionDocument {
  id: string
  created_time: string
  last_edited_time: string
  cover: NotionImage
  icon: NotionImage
  properties: {
    Name: {
      type: 'title'
      title: { plain_text: string }[]
    }
    Organization: {
      type: 'relation'
      relation: { id: string }[]
    }
    'Template ID': {
      type: 'select'
      select: {
        name: 'internship-completion-certificate' | 'quotation'
      }
    }
    Status: {
      type: 'status'
      status: {
        name: 'Plan' | 'Draft' | 'Ready' | 'Sent' | 'Partially Signed' | 'Completed' | 'Void'
      }
    }
    'Mime Type': {
      type: 'select'
      select: {
        name: 'application/pdf'
      }
    }
    SizeBytes: {
      type: 'number'
      number: number
    }
    'Routing Queue': {
      type: 'rich_text'
      rich_text: {
        text: { content: string }
      }[]
    }
    'Routing Type': {
      type: 'select'
      select: {
        name: 'SEQUENTIAL' | 'PARALLEL'
      }
    }
    'Next Signer': {
      type: 'email'
      email: string
    }
  }
}
