<script setup lang="ts">
// import { Previewer } from 'pagedjs'

const { data } = await useFetch('/api/document/data')

// const contentRef = useTemplateRef<HTMLElement>('content-source')
// const containerRef = useTemplateRef<HTMLElement>('print-render')

/* onMounted(async () => {
  if (import.meta.client) {
    let paged = new Previewer();

    setTimeout(() => {
      if (contentRef.value && containerRef.value) {
        paged.preview(contentRef.value.innerHTML, null, containerRef.value).then((flow) => {
          console.log("Rendered", flow.total, "pages.");
        });
      }
    }, 500);
  }
}); */
</script>

<template>
  <div v-if="data" class="mx-auto text-sm p-8 md:p-12 max-w-3xl">
    <div ref="print-render"></div>
    <header class="w-full text-base pb-6 block text-center">
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
    <main ref="content-source">
      <h2 class="text-2xl font-bold text-center mt-6 mb-8">Photography &amp; Videography Quotation</h2>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <div class="text-left space-y-1">
          <p><span class="font-bold">Client Name:</span> {{ data.client.name }}</p>
          <p><span class="font-bold">Client Address:</span> {{ data.client.address }}</p>
          <p><span class="font-bold">Client Phone No:</span> {{ data.client.phone }}</p>
          <p>
            <span class="font-bold">Client Email:</span> <a :href="`mailto:${data.client.email}`" class="text-blue-700 underline">{{ data.client.email }}</a>
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
      <div class="markdown-body w-full my-6 text-sm">
        <MarkdownContent :content="data.budgetMarkdown" />
      </div>

      <div class="break-before-page my-10" />

      <h2 class="text-xl font-bold text-center mt-8 mb-4">Terms &amp; Conditions</h2>
      <div class="markdown-body w-full my-6 text-sm">
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
          <tr>
            <td class="w-1/2 p-2.5 border-none">Signature: ______________________</td>
            <td class="w-1/2 p-2.5 border-none">Signature: ______________________</td>
          </tr>
          <tr>
            <td class="w-1/2 p-2.5 border-none">Name: ______________________</td>
            <td class="w-1/2 p-2.5 border-none">Name: ______________________</td>
          </tr>
          <tr>
            <td class="w-1/2 p-2.5 border-none">Date: ______________________</td>
            <td class="w-1/2 p-2.5 border-none">Date: ______________________</td>
          </tr>
          <tr>
            <td class="w-1/2 p-2.5 border-none">Place: ______________________</td>
            <td class="w-1/2 p-2.5 border-none">Place: ______________________</td>
          </tr>
        </tbody>
      </table>

      <p class="text-left mt-6 italic text-sm text-gray-600">N.B: This Letter consists of 5 pages including this one. Please sign on all pages.</p>
    </main>
    <footer class="relative w-full text-sm pt-12 pb-4 mt-16 flex justify-between items-center overflow-hidden">
      <img
        src="https://redcatpictures.com/logo-dark.svg"
        alt="RED CAT PICTURES Logo"
        class="absolute right-0 top-0 w-[300px] opacity-10 pointer-events-none select-none translate-x-[15%] -translate-y-[60%] md:left-[-104px] md:-translate-y-[37%] md:w-[560px] md:translate-x-0" />

      <span class="z-10 bg-white/80 backdrop-blur-sm pr-4">
        <span class="text-sm font-bold">Signature: ______________________</span>
      </span>

      <span class="z-10 bg-white/80 backdrop-blur-sm pl-4"> Page <span class="pageNumber">1</span> of <span class="totalPages">5</span> </span>
    </footer>
  </div>
</template>

<style scoped>
:deep(.markdown-body table) {
  border-collapse: collapse;
  width: 100%;
  margin: 2em 0;
}

:deep(.markdown-body th),
:deep(.markdown-body td) {
  border: 1px solid #bbb;
  padding: 7px 10px;
}

:deep(.markdown-body th) {
  background: #f3f3f3;
  text-align: left;
}

:deep(.markdown-body h3),
:deep(.markdown-body h4),
:deep(.markdown-body h5),
:deep(.markdown-body h6) {
  text-align: left;
  margin-top: 1.2em;
  margin-bottom: 0.6em;
  font-weight: 600;
}

:deep(.markdown-body li) {
  text-align: left;
  margin-top: 0.6em;
}
</style>
