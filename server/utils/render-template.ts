import { createSSRApp, type Component } from 'vue'
import { renderToString } from '@vue/server-renderer'
import { useStorage } from 'nitro/storage'

import QuotationTemplate from '#document/templates/Quotation.vue'
// Import other templates here later (e.g., InvoiceTemplate)

const templates: Record<string, Component> = {
  quotation: QuotationTemplate,
  // 'invoice': InvoiceTemplate
}

/* --- Paged Media Setup --- */
const printStyles = `
  @page {
      size: A4;
      margin: 45mm 20mm 35mm 20mm; 
      
      @top-center { 
          content: element(header); 
      }
      
      @bottom-left { 
          content: "Signature: ______________________";
          font-family: 'Segoe UI', system-ui, Arial, sans-serif;
          font-size: 12px;
          font-weight: bold;
          padding-bottom: 16px;
      }

      @bottom-right { 
          content: "Page " counter(page) " of " counter(pages);
          font-family: 'Segoe UI', system-ui, Arial, sans-serif;
          font-size: 12px;
          padding-bottom: 15px;
      }
  }

  .acceptance-page {
      page: acceptance;
      page-break-before: always;
  }

  @page acceptance {
      @bottom-left { content: none; } 
  }

  #header {
      position: running(header);
  }

  .break-before-page {
      page-break-before: always;
  }

  /* Base styles for the raw v-html inserted content */
  .custom-table table { border-collapse: collapse; width: 100%; margin: 20px 0; font-size: 14px; }
  .custom-table th { background-color: #f5f5f5; border: 1px solid #ddd; padding: 12px; text-align: left; font-weight: 600; }
  .custom-table td { border: 1px solid #ddd; padding: 12px; vertical-align: top; }

  .custom-terms h3 { font-size: 15px; margin-top: 25px; margin-bottom: 10px; font-weight: bold; }
`

/**
 * Renders a Vue 3 SFC template to an HTML string.
 * @param templateName The key of the template mapped above.
 * @param data The JSON data/props to inject into the template.
 */
export default async function renderTemplate(templateName: string, data: any): Promise<string> {
  const vueComponent = templates[templateName]

  if (!vueComponent) {
    throw new Error(`Template not found: ${templateName}`)
  }

  try {
    const app = createSSRApp(vueComponent, data)

    const appHtml = await renderToString(app)

    let tailwindCss: null | string = ''
    const storage = useStorage()

    try {
      tailwindCss = await storage.getItem<string>('assets:tailwind-compiled.css')
      if (!tailwindCss) throw new Error('Tailwind CSS not found in Nitro storage')
    } catch {
      console.warn('Tailwind CSS not found in Nitro storage. PDF will render unstyled.')
    }

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="utf-8">
          <style>
            ${tailwindCss}
            ${printStyles}
          </style>
      </head>
      <body>
          ${appHtml}
      </body>
      </html>
    `
  } catch (error: any) {
    console.error(`Error rendering Vue template ${templateName}:`, error)
    throw new Error(`Failed to render Vue template: ${templateName}`)
  }
}
