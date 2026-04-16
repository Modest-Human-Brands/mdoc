import { defineEventHandler, HTTPError } from 'nitro/h3'
import { ofetch } from 'ofetch'
import { execa } from 'execa'

function getQuotationTemplate(data: { logoBase64: string; client: any; project: any; budgetHtml: string; termsHtml: string }) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <style>
        /* --- Fonts & Base Setup --- */
        body { 
            font-family: 'Segoe UI', system-ui, Arial, sans-serif; 
            font-size: 14px; /* Increased for better readability */
            color: #222; 
            line-height: 1.6; 
        }

        /* --- Paged Media Setup --- */
        @page {
            size: A4;
            margin: 45mm 20mm 35mm 20mm; /* Generous margins for header/footer spacing */
            
            @top-center { 
                content: element(header); 
            }
            
            /* Signature rigidly aligned to the Bottom-Left */
            @bottom-left { 
                content: "Signature: ______________________";
                font-family: 'Segoe UI', system-ui, Arial, sans-serif;
                font-size: 12px;
                font-weight: bold;
                padding-bottom: 16px;
            }

            /* Page Numbers rigidly aligned to the Bottom-Right */
            @bottom-right { 
                content: "Page " counter(page) " of " counter(pages);
                font-family: 'Segoe UI', system-ui, Arial, sans-serif;
                font-size: 12px;
                padding-bottom: 15px;
            }
        }

        /* --- Last Page Footer Override --- */
        /* This isolates the last page and removes the bottom-left signature */
        .acceptance-page {
            page: acceptance;
            page-break-before: always;
        }

        @page acceptance {
            @bottom-left { content: none; } 
        }

        /* --- Header Element --- */
        #header {
            display: block;
            position: running(header);
            width: 100%;
            text-align: center;           
        }
        .header-logo { height: 64px; vertical-align: middle; margin-right: 15px , margin-top: 64px;}
        .header-title { font-size: 32px; font-weight: 600; letter-spacing: 0.5px; vertical-align: middle; }
        .header-address { font-size: 16px; color: #000; margin-top: 8px; line-height: 1.4; max-width:85%; margin:auto,   margin-bottom: 64px; }

        /* --- Typography & Headings --- */
        h1 { font-size: 24px; text-align: center; margin-top: 10px; margin-bottom: 30px; font-weight: 600; }
        h2 { font-size: 18px; border-bottom: 2px solid #333; padding-bottom: 5px; margin-top: 35px; margin-bottom: 20px; }
        h3 { font-size: 15px; margin-top: 25px; margin-bottom: 10px; }

        /* --- Metadata Block (Tabular Alignment) --- */
        .meta-section { margin-bottom: 30px; display: table; width: 100%; }
        .meta-row { display: table-row; }
        .meta-label { display: table-cell; font-weight: 600; padding: 4px 15px 4px 0; width: 140px; }
        .meta-value { display: table-cell; padding: 4px 0; }

        /* --- Scope & Terms Tables --- */
        table { border-collapse: collapse; width: 100%; margin: 20px 0; font-size: 14px; }
        th { background-color: #f5f5f5; border: 1px solid #ddd; padding: 12px; text-align: left; font-weight: 600; }
        td { border: 1px solid #ddd; padding: 12px; vertical-align: top; }

        /* --- Acceptance Block (Pixel Perfect) --- */
        .acceptance-table { border: none; margin-top: 30px; }
        .acceptance-table th { background-color: #f5f5f5; border: none; padding: 15px; font-size: 15px; }
        .acceptance-table td { border: none; padding: 35px 15px 10px 15px; width: 50%; }
        .sig-field { margin-bottom: 50px; font-size: 15px; color: #111; }
        
        .nb-text { font-size: 12px; font-style: italic; margin-top: 40px; border-top: 1px solid #ddd; padding-top: 15px; }
        .page-break { page-break-before: always; }
    </style>
</head>
<body>

    <div id="header">
        <div>
            <img src="${data.logoBase64}" class="header-logo" alt="Logo">
            <span class="header-title">RED CAT PICTURES</span>
        </div>
        <div class="header-address">
            Registered Address: 17, Netaji Subhash Road, Beltala, P.O.- Harinavi SO, P.S.- Sonarpur, District: South 24 Parganas, Pincode: 700148, Ward No. 23<br>
            Email: contact@redcatpictures.com &nbsp;|&nbsp; Phone: +912269711501 &nbsp;
            <br> Website: https://redcatpictures.com
        </div>
    </div>

    <h1>Photography & Videography Quotation</h1>

    <div class="meta-section">
        <div class="meta-row"><div class="meta-label">Client Name:</div><div class="meta-value">${data.client.name}</div></div>
        <div class="meta-row"><div class="meta-label">Client Address:</div><div class="meta-value">${data.client.address}</div></div>
        <div class="meta-row"><div class="meta-label">Client Phone No:</div><div class="meta-value">${data.client.phone}</div></div>
        <div class="meta-row"><div class="meta-label">Client Email:</div><div class="meta-value">${data.client.email}</div></div>
    </div>

    <div class="meta-section">
        <div class="meta-row"><div class="meta-label">Quote Number:</div><div class="meta-value">${data.project.quoteNumber}</div></div>
        <div class="meta-row"><div class="meta-label">Quote Date:</div><div class="meta-value">${data.project.quoteDate}</div></div>
        <div class="meta-row"><div class="meta-label">Quote Expiry:</div><div class="meta-value">${data.project.quoteExpiry}</div></div>
    </div>

    <div class="meta-section" style="background-color: #f9f9f9; padding: 15px; display: block; border-left: 4px solid #333;">
        <div style="margin-bottom: 8px;"><strong>Shoot Date:</strong> ${data.project.shootDate}</div>
        <div><strong>Shoot Location:</strong> ${data.project.shootLocation}</div>
    </div>

    <h2>Scope of Work</h2>
    ${data.budgetHtml}

    <div class="page-break"></div>
    
    <h2>Terms & Conditions</h2>
    <div style="font-size: 13.5px;">
        ${data.termsHtml}
    </div>

    <div class="acceptance-page">
        <h2 style="border: none;">Acceptance of Quotation</h2>
        <p style="font-size: 15px; margin-bottom: 30px;">
            I, _____________________________, accept the quotation and agree to the terms and conditions stated above.
        </p>
        
        <table class="acceptance-table">
            <thead>
                <tr>
                    <th>For RED CAT PICTURES</th>
                    <th>For Client</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>
                        <div class="sig-field">Signature:</div>
                        <div class="sig-field">Name:</div>
                        <div class="sig-field">Date:</div>
                        <div class="sig-field">Place:</div>
                    </td>
                    <td>
                        <div class="sig-field">Signature:</div>
                        <div class="sig-field">Name:</div>
                        <div class="sig-field">Date:</div>
                        <div class="sig-field">Place:</div>
                    </td>
                </tr>
            </tbody>
        </table>
        
        <div class="nb-text">
            N.B: This Letter consists of 5 pages including this one. Please sign on all pages.
        </div>
    </div>

</body>
</html>
  `
}

async function getLogoBase64(url: string) {
  const res = await ofetch.raw(url, { responseType: 'arrayBuffer' })
  const type = res.headers.get('content-type') || 'image/svg+xml'
  const base64 = Buffer.from(res._data as ArrayBuffer).toString('base64')
  return `data:${type};base64,${base64}`
}

export default defineEventHandler(async (event) => {
  const logoBase64 = await getLogoBase64('https://redcatpictures.com/logo-dark.svg')

  const html = getQuotationTemplate({
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
  })

  try {
    const { stdout } = await execa('weasyprint', ['-', '-'], {
      input: html,
      encoding: 'buffer',
    })

    console.log(`Generated PDF Size: ${stdout.length} bytes`)

    event.res.headers.set('Content-Type', 'application/pdf')
    event.res.headers.set('Content-Disposition', 'inline; filename="report.pdf"')

    return stdout
  } catch (error: any) {
    console.error('PDF Generation Error:', error.stderr?.toString() || error.message)

    throw new HTTPError({
      statusCode: 500,
      statusMessage: 'Failed to generate PDF',
    })
  }
})
