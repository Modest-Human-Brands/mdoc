import { defineEventHandler } from 'nitro/h3'

export default defineEventHandler(() => {
  const node = process.env.HOSTNAME || 'unknown-node'

  return {
    status: 'OK',
    version: process.env.NITRO_APP_VERSION,
    buildTime: process.env.NITRO_APP_BUILD_TIME,
    node,
  }
})
