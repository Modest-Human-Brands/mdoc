import { defineEventHandler, HTTPError } from 'nitro/h3'
import { ofetch } from 'ofetch'
import renderTemplate from '../../utils/render-template'
import generatePdfFromHtml from '../../utils/generate-pdf-from-html'

async function getLogoBase64(url: string): Promise<string> {
  const res = await ofetch.raw(url, { responseType: 'arrayBuffer' })
  const type = res.headers.get('content-type') || 'image/svg+xml'
  const base64 = Buffer.from(res._data as ArrayBuffer).toString('base64')
  return `data:${type};base64,${base64}`
}

export default defineEventHandler(async (event) => {
  try {
    const logoBase64 = await getLogoBase64('https://redcatpictures.com/logo-dark.svg')

    // 1. Prepare your data layer
    const data = {
      logoBase64,
      client: {
        name: 'RP Square Ventures LLP',
        address: 'A-402, SJR Hamilton Homes primecorp, Rayasandra Main road, Gattahalli Bangalore, Karnataka 560099',
        email: 'teavante@teavante.com',
        phone: '6360943657',
      },
      project: {
        quoteNumber: 'RCP-Q-70-1',
        quoteDate: 'Apr 4, 2026',
        quoteExpiry: 'May 3, 2026',
        shootDate: 'Apr 14, 2026',
        shootLocation: 'N. S. C. Road, Mahinagar, Malancha Bazar, Rajpur Sonarpur, 700145',
      },
      budgetHtml: `
      <table>
        <thead>
          <tr><th>Description</th><th>Deliverables</th><th>Amount (INR)</th></tr>
        </thead>
        <tbody>
          <tr><td>Photography</td><td>32 photos (4 photos each product for 8 products)</td><td>9600</td></tr>
          <tr><td>Videography</td><td>1 standard creative video (upto 30 sec vertical)</td><td>10000</td></tr>
          <tr style="font-weight: bold;"><td>Total</td><td></td><td>19600</td></tr>
          <tr style="color: #666;"><td>Discount (8%)</td><td></td><td>-1600</td></tr>
          <tr style="font-size: 1.1em; border-top: 2px solid #000;">
            <td><b>Discounted Price</b></td><td></td><td><b>18000</b></td>
          </tr>
        </tbody>
      </table>
      `,
      termsHtml: `
      <h3>1. Introduction</h3>
      <p>By using our services, you agree to these Terms and Conditions.</p>
      <h3>2. Service Scope & Delivery</h3>
      <p>Timeline: 10-20 days from the 2nd instalment. Data liability ends 1 month post-shoot.</p>
      <h3>4. Payment Terms</h3>
      <ul>
        <li>20% advance at booking.</li>
        <li>70% post-shoot completion.</li>
        <li>10% upon final delivery.</li>
      </ul>
      <p><b>Governing Law:</b> India; Jurisdiction: Kolkata.</p>
      `,
    }

    // 2. Render the Handlebars template dynamically
    const html = await renderTemplate('quotation', data)

    // 3. Generate PDF using WeasyPrint
    const pdfBuffer = await generatePdfFromHtml(html)

    // 4. Return PDF payload with proper headers
    event.res.headers.set('Content-Type', 'application/pdf')
    event.res.headers.set('Content-Disposition', 'inline; filename="quotation.pdf"')

    return pdfBuffer
  } catch (error: any) {
    console.error('PDF Generation Error:', error.message)
    throw new HTTPError({
      statusCode: 500,
      statusMessage: 'Failed to generate PDF',
    })
  }
})
