export type RequestBody = {
  name: string
  orgId: string
  template: string
  data: Record<string, any>
}

export interface DocumentMeta {
  id: string
  name: string
  fileName: string
  extension: string
  sizeBytes: number
  templateId: string
  previewUrl: string
  createdAt: string
  updatedAt: string
}
