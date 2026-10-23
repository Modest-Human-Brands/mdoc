import { definePlugin } from 'nitro'
import { useStorage } from 'nitro/storage'
import { useRuntimeConfig } from 'nitro/runtime-config'
import fsDriver from 'unstorage/drivers/fs'
import s3Driver from 'unstorage/drivers/s3'

export default definePlugin(() => {
  const config = useRuntimeConfig().private
  const storage = useStorage()

  if (!config.documentBucket) {
    if (process.env.NODE_ENV === 'production') throw new Error('Document storage is not configured. Set NITRO_PRIVATE_DOCUMENT_BUCKET, _ENDPOINT, _ACCESS_KEY_ID and _SECRET_ACCESS_KEY.')
    storage.mount('documents', fsDriver({ base: './.data/documents' }))
    return
  }

  storage.mount(
    'documents',
    s3Driver({
      accessKeyId: config.documentAccessKeyId,
      secretAccessKey: config.documentSecretAccessKey,
      endpoint: config.documentEndpoint,
      bucket: config.documentBucket,
      region: config.documentRegion,
      lib: () => import('aws4fetch'),
    })
  )
})
