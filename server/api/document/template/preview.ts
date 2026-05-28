import { defineWebSocketHandler } from 'nitro/h3'
import { h } from 'vue'
import { renderToBuffer } from '@ceereals/vue-pdf'
import { templateRegistry } from '~/server/utils/template-registry'

import '~/templates/document'

export default defineWebSocketHandler({
  open(peer) {
    console.log(`[MDoc Studio]: 🟢 Render Socket Connected (${peer.id})`)
  },

  async message(peer, message) {
    try {
      const payload = JSON.parse(message.text())
      const { templateId, variables } = payload

      const templateDef = templateRegistry[templateId]
      if (!templateDef) {
        peer.send(JSON.stringify({ error: `Template '${templateId}' not found.` }))
        return
      }

      // 1. Transform raw variables into the computed format expected by the Vue component
      const transformedProps = templateDef.transformPayload(variables || {})

      // 2. Instantiate the Vue component with props and render it to a Node Buffer
      const pdfBuffer = await renderToBuffer(h(templateDef.component, transformedProps))

      // 3. Convert the binary Buffer to a Base64 string for the browser iframe
      const pdfBase64 = Buffer.isBuffer(pdfBuffer) ? pdfBuffer.toString('base64') : Buffer.from(pdfBuffer).toString('base64')

      // 4. Send the payload back to the client
      peer.send(JSON.stringify({ pdfBase64 }))
    } catch (error: any) {
      console.error('❌ [MDoc Studio Render Error]:', error)

      // Extract a readable error message to display in the frontend error UI state
      const errorMessage = error instanceof Error ? error.message : 'Unknown PDF compilation error.'
      peer.send(JSON.stringify({ error: errorMessage }))
    }
  },

  close(peer) {
    console.log(`[MDoc Studio]: 🔴 Render Socket Disconnected (${peer.id})`)
  },
})
