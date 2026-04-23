<script setup lang="ts">
withDefaults(defineProps<{ data?: QuotationPayload }>(), {
  data: () => ({
    logoUrl: 'https://redcatpictures.com/logo-dark.svg',
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
    budgetMarkdown: `
  | Description | Deliverables | Amount (INR) |
  | --- | --- | --- |
  | Photography | 40-50 products per product 3-4 photos with basic editing | 10000 |
  | Models and stylist | 2 male models | 6000 |
  | Studio | AP Studio | 4000 |
  | Food and Travel |  | 2000 |
  | Total |  | 22000 |
  | Discount |  | 3000 (16%) |
  | Total discounted price |  | 19000 |`,
    termsMarkdown: `### 1. Introduction\n\nBy using our photography/videography services (“Services”), you agree to comply with these Terms & Conditions (“Terms”), including our Privacy Policy. If you disagree with any provision herein, discontinue use of our Services immediately.\n\n### 2. Service Scope & Delivery\n\n- **Delivery Timeline:**\nPhotos and videos will be delivered within 10–20 days from the 2nd instalment.\nDelivery commences only after the second instalment is received.\n- **Deliverables Release:**\nDeliverables are only released post second instalment.\n- **Data Liability:**\nRED CAT PICTURES is not liable for data loss after one month from the shoot date.\nClients are advised to provide a hard drive on the shoot day for immediate backup.\n- **Digital Delivery:**\nAll deliverables will be provided via our secure RED CAT Drive and remain accessible for 6 months from the date of delivery.\nFor any storage holding beyond 6 months, additional charges will apply.\n- **Project Scope Changes:**\nAny modification, substitution, or update to the originally quoted deliverables, services, or shoot specifications after quotation approval will require a revised quotation, with corresponding adjustments to project timeline and budget.\nThe shoot or production will be held until such changes are documented and mutually agreed, and any additional costs or delays arising therefrom will be borne by the client.\n\n### 3. Shoot Arrangements & Supervision\n\n- **Editing Revisions:**\nEditing will begin only after a coordination meeting between the client and our team to review the brief, scope, and revision expectations. Once the final requirements are confirmed in writing via email, we will proceed with the editing work. Two rounds of editing revisions are included; any additional edits or modification requests beyond these two rounds will be subject to additional charges.\n- **Reshoot Policy:**\nAll reshoot requests except of Technical errors, regardless of the reason, will incur separate charges as per RED CAT PICTURES’ current rates.\nFree reshoots are provided only for technical errors when the client has explicitly specified requirements via mail and they were not met. This includes:\n    - Incorrect aspect ratio (when specified by client)\n    - Wrong product usage (when specified by client)\n    - Incorrect video duration (when specified by client)\n    - Other technical specifications explicitly provided by client in the brief\n\n    Clients must provide all technical requirements upfront. Any technical details not included in the original brief cannot be grounds for a free reshoot. Creative differences, subjective preferences, or changes in vision do not qualify as technical errors and are not eligible for free reshoots.\n\n- **Creative Supervision:**\nInterference in the creative process may impact the outcome;\nRED CAT PICTURES shall not be held liable for artistic dissatisfaction.\n\n### 4. Payment Terms\n\n- **Structure:**\n    - 20% advance payment at booking confirmation (shoot finalization).\n    - 70% due post shoot completion.\n    - Remaining 10% upon delivery of final materials.\n    - Advance payment must be completed at least 1 day prior to the scheduled shoot date.\n- **Banking Policy:**\nAll transactions must be conducted via bank transfer (NEFT/IMPS/RTGS/UPI).\nNo cash payments are accepted.\n- **Clearances:**\nPayment clearance is required prior to any corrections or changes in final deliverables.\n- **Travel & Accommodation:**\nCharges, if applicable, must be paid in advance.\n- **Invoice Disputes:**\nAny dispute with invoices must be raised within 7 days of issue.\n- **Due Date:**\nAll dues must be cleared within 7 days of final delivery; failure may put invoice and deliverables on hold.\n\n### 5. Cancellations & Postponements\n\n- **Advance Payment:**\nNon-refundable in case of cancellation or postponement initiated by the Client/Agency.\n- **Shoot Date Changes:**\nDate can be rescheduled only once within 29 days of advance payment.\nFailure to book a date in this window results in cancellation.\n\n### 6. Pricing & Adjustments\n\n- **Budget:**\nOnce the project is finalized with advance payment, budget is non-negotiable by the client.\n- **Large Scale Projects:**\nFor multi-individual projects, budget may increase to meet desired outcomes.\n- **Fee Variance:**\nRED CAT PICTURES reserves the right to reasonably adjust fee structures; taxes and applicable conversions extra.\n\n### 7. Copyrights & Usage\n\n- Copyright Law Compliance:\nIn accordance with the Copyright Act, 1957, RED CAT PICTURES retains original rights to all images and videos produced.\n- License Grant:\nThe client receives a lifetime commercial usage license for delivered materials.\n- **Promotional Use:**\nRED CAT PICTURES reserves the right to use the end client’s brand name and logo for promotional purposes-including display on our website, social media, blogs, and marketing platforms-unless a separate written agreement states otherwise.\n- **Content Ownership:**\nClients may not reverse engineer or misuse any platform/IP belonging to RED CAT PICTURES.\n\n### 8. Travel & Logistics\n\n- **Arrangements:**\nThe client is responsible for arranging necessary travel, accommodation, and meals for the production team for outside studio shoot.\n- **Team Welfare:**\nThe production team is entitled to regular meal breaks during production hours.\n\n### 9. Payments\n\nAll payments and transactions must be conducted via banking channels only; cash payments are not accepted.\n\n### 10. Behaviour & Termination\n\n- **Conduct:**\nMisconduct or inappropriate behaviour towards RED CAT PICTURES personnel is grounds for immediate termination of services without liability or refund.\n\n### 11. Indemnification\n\nClients indemnify and hold RED CAT PICTURES harmless from any claims, costs, or losses arising from use, misuse, or breach of these Terms.\n\n### 12. Governing Law\n\nThese Terms are governed by the laws of India.\nJurisdiction for disputes lies exclusively with the courts in Kolkata.\n\n### 13. Changes To Terms\n\nRED CAT PICTURES may modify these Terms at any time.\nContinued use of Services after modifications constitutes acceptance of the revised Terms.\n\n### 14. MSME Registration\n\n“RED CAT PICTURES” is a registered MSME (Micro, Small and Medium Enterprise) under the laws of India. Udyam Registration Number UDYAM-WB-18-0156360`,
  }),
})
</script>

<template>
  <main>
    <header class="w-full pb-6 block text-center">
      <div class="mb-6 flex items-center justify-center">
        <img :src="data.logoUrl" alt="RED CAT PICTURES Logo" class="h-16 mr-3.5 inline-block align-middle" />
        <span class="text-4xl font-medium tracking-wide inline-block align-middle"> RED CAT PICTURES </span>
      </div>
      <div class="mb-2 px-4 md:px-12">
        <span class="font-semibold">Registered Address:</span>
        17, Netaji Subhash Road, Beltala, P.O.- Harinavi SO, P.S.- Sonarpur, District: South 24 Parganas, Pincode: 700148, Ward No. 23
      </div>
      <div class="mb-1.5 flex justify-center gap-4">
        <span>Email: <a href="mailto:contact@redcatpictures.com" class="text-blue-700 underline">contact@redcatpictures.com</a></span>
        <span>Phone: +912269711501</span>
      </div>
      <div>Website: <a href="https://redcatpictures.com" class="text-blue-700 underline">https://redcatpictures.com</a></div>
    </header>
    <section>
      <h2 class="text-2xl font-bold text-center mt-6 mb-8">Photography &amp; Videography Quotation</h2>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <div class="text-left space-y-1">
          <p><span class="font-bold">Client Name:</span> {{ data.client.name }}</p>
          <p><span class="font-bold">Client Address:</span> {{ data.client.address }}</p>
          <p><span class="font-bold">Client Phone No:</span> {{ data.client.phone }}</p>
          <p>
            <span class="font-bold">Client Email:</span>
            <a :href="`mailto:${data.client.email}`" class="text-blue-700 underline">{{ data.client.email }}</a>
          </p>
        </div>
        <div class="text-left space-y-1">
          <p><span class="font-bold">Quote Number:</span> {{ data.project.quoteNumber }}</p>
          <p><span class="font-bold">Quote Date:</span> {{ data.project.quoteDate }}</p>
          <p><span class="font-bold">Quote Expiry:</span> {{ data.project.quoteExpiry }}</p>
          <p class="mt-4"><span class="font-bold">Shoot Date:</span> {{ data.project.shootDate }}</p>
          <p><span class="font-bold">Shoot Location:</span> {{ data.project.shootLocation }}</p>
        </div>
      </div>

      <h2 class="text-xl font-bold text-center mt-8 mb-4">Scope of Work</h2>
      <div class="markdown-body w-full my-6">
        <MarkdownContent :content="data.budgetMarkdown" />
      </div>

      <div class="break-before-page my-10" />

      <h2 class="text-xl font-bold text-center mt-8 mb-4">Terms &amp; Conditions</h2>
      <div class="markdown-body w-full my-6">
        <MarkdownContent :content="data.termsMarkdown" />
      </div>

      <div class="break-before-page my-10" />

      <h2 class="text-xl font-bold text-center mt-8 mb-6">Acceptance of Quotation</h2>
      <p class="text-left mt-6 mb-8">I, _____________________________, accept the quotation and agree to the terms and conditions stated above.</p>

      <table class="w-full border-separate border-spacing-y-5 text-left text-[15px]">
        <thead>
          <tr>
            <th class="w-1/2 p-2.5 font-bold border-none bg-transparent">For RED CAT PICTURES</th>
            <th class="w-1/2 p-2.5 font-bold border-none bg-transparent">For Client</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in ['Signature', 'Name', 'Date', 'Place']" :key="row">
            <td class="w-1/2 p-2.5 border-none">{{ row }}: ______________________</td>
            <td class="w-1/2 p-2.5 border-none">{{ row }}: ______________________</td>
          </tr>
        </tbody>
      </table>

      <p class="text-left mt-6 italic text-gray-600">N.B: This Letter consists of 5 pages including this one. Please sign on all pages.</p>
    </section>
    <footer class="relative size-full pt-12 pb-4 mt-16 flex justify-between items-center overflow-hidden">
      <img
        src="https://redcatpictures.com/logo-dark.svg"
        alt="RED CAT PICTURES Logo"
        class="absolute right-0 top-0 w-[300px] opacity-10 pointer-events-none select-none translate-x-[15%] -translate-y-[60%] md:left-[-104px] md:-translate-y-[37%] md:w-[560px] md:translate-x-0" />
      <span class="z-10 bg-white/80 pr-4">
        <span class="font-bold">Signature: ______________________</span>
      </span>
      <span class="z-10 bg-white/80 pl-4">Page <span class="pageNumber">1</span> of <span class="totalPages">5</span></span>
    </footer>
  </main>
</template>

<style>
.markdown-body table {
  border-collapse: collapse;
  width: 100%;
  margin: 2em 0;
}

.markdown-body th,
.markdown-body td {
  border: 1px solid #bbb;
  padding: 7px 10px;
}

.markdown-body th {
  background: #f3f3f3;
  text-align: left;
}
</style>
