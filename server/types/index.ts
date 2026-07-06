export const resourceTypes = ['user', 'contact', 'project', 'document'] as const

export type ResourceType = (typeof resourceTypes)[number]

export type NotionDB = { [K in ResourceType]: string }

export interface ResourceRecordMap {
  user: NotionUser
  contact: NotionContact
  project: NotionProject
  document: NotionDocument
}

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

export interface NotionUser {
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
    Role: {
      type: 'select'
      select: {
        name: 'Admin' | 'Editor' | 'Viewer'
      }
    }
    Status: {
      type: 'status'
      status: {
        name: 'Unfilled' | 'Filled' | 'Verified' | 'Active' | 'Inactive'
      }
    }
    Gender: {
      type: 'select'
      select: {
        name: 'Male' | 'Female' | 'Other'
      }
    }
    DOB: {
      type: 'date'
      date: {
        start: string
      }
    }
    Email: {
      type: 'email'
      email: string
    }
    Phone: {
      type: 'phone_number'
      phone_number: string
    }
    Emails: {
      type: 'relation'
      relation: { id: string }[]
    }
  }
}

export interface NotionContact {
  id: string
  created_time: string
  last_edited_time: string
  cover: NotionImage | null
  icon: NotionImage | null
  url: string
  properties: {
    Name: {
      type: 'title'
      title: { plain_text: string; text: { content: string } }[]
    }
    Index: {
      type: 'number'
      number: number | null
    }
    Status: {
      type: 'select'
      select: { name: 'Researched' | 'Active' | 'Inactive' | 'External Contact' | string } | null
    }
    Company: {
      type: 'rich_text'
      rich_text: { plain_text: string; text: { content: string } }[]
    }
    Type: {
      type: 'select'
      select: { name: string } | null
    }
    Address: {
      type: 'rich_text'
      rich_text: { plain_text: string; text: { content: string } }[]
    }
    Place: {
      type: 'rich_text'
      rich_text: { plain_text: string; text: { content: string } }[]
    }
    Email: {
      type: 'email'
      email: string | null
    }
    Whatsapp: {
      type: 'phone_number'
      phone_number: string | null
    }
    Phone: {
      type: 'phone_number'
      phone_number: string | null
    }
    Website: {
      type: 'url'
      url: string | null
    }
    Facebook: {
      type: 'url'
      url: string | null
    }
    Instagram: {
      type: 'url'
      url: string | null
    }
    Twitter: {
      type: 'url'
      url: string | null
    }
    LinkedIn: {
      type: 'url'
      url: string | null
    }
    'Platform Profile': {
      type: 'url'
      url: string | null
    }
    Username: {
      type: 'rich_text'
      rich_text: { plain_text: string; text: { content: string } }[]
    }
    Tags: {
      type: 'multi_select'
      multi_select: { name: string }[]
    }

    'PoC Person': {
      type: 'rich_text'
      rich_text: { plain_text: string; text: { content: string } }[]
    }
    'PoC Company': {
      type: 'rich_text'
      rich_text: { plain_text: string; text: { content: string } }[]
    }
    'PoC Address': {
      type: 'rich_text'
      rich_text: { plain_text: string; text: { content: string } }[]
    }
    'PoC Email': {
      type: 'email'
      email: string | null
    }
    'PoC Phone': {
      type: 'phone_number'
      phone_number: string | null
    }

    Project: {
      type: 'relation'
      relation: { id: string }[]
    }
    'Acquisition Date': {
      type: 'date'
      date: { start: string; end?: string | null } | null
    }

    Organization: {
      type: 'relation'
      relation: { id: string }[]
    }
    Emails: {
      type: 'relation'
      relation: { id: string }[]
    }
    Messages: {
      type: 'relation'
      relation: { id: string }[]
    }
    Calls: {
      type: 'relation'
      relation: { id: string }[]
    }

    'Last Active'?: {
      type: 'date'
      date: { start: string; end?: string | null } | null
    }
    'Last Message Snippet': {
      type: 'rich_text'
      rich_text: { plain_text: string; text: { content: string } }[]
    }
  }
}

export interface NotionProject {
  id: string
  created_time: Date
  last_edited_time: Date
  cover: NotionImage
  icon: NotionImage
  properties: {
    Index: {
      type: 'number'
      number: number
    }
    Name: {
      type: 'title'
      title: {
        plain_text: string
      }[]
    }
    Slug: {
      type: 'formula'
      formula: { string: string }
    }
    Status: {
      type: 'status'
      status: {
        name: 'Plan' | 'Quotation' | 'Shoot' | 'Edit' | 'Delivered'
      }
    }
    Quotation: {
      type: 'number'
      number: number
    }
    Address: {
      type: 'rich_text'
      rich_text: {
        text: {
          content: string
        }
      }[]
    }
    Date: {
      type: 'date'
      date: {
        start: string
        end: string
      }
    }
    Contact: {
      type: 'relation'
      relation: { id: string }[]
      has_more: boolean
    }
    Budget: {
      type: 'number'
      number: number
    }
    Asset: {
      type: 'relation'
      relation: { id: string }[]
      has_more: boolean
    }
  }
  url: string
  public_url: null
}

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
    Data: {
      type: 'rich_text'
      rich_text: {
        text: { content: string }
      }[]
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
    Category: {
      type: 'multi_select'
      multi_select: { name: string }[]
    }
    'Created by': {
      type: 'created_by'
      created_by: { id: string }
    }
    'Last edited by': {
      type: 'last_edited_by'
      last_edited_by: { id: string }
    }
    Contact: {
      type: 'rollup'
      rollup: {
        array: {
          title: { plain_text: string }[]
        }[]
      }
    }
    Project: {
      type: 'relation'
      relation: { id: string }[]
    }
    Organization: {
      type: 'relation'
      relation: { id: string }[]
    }
  }
}
