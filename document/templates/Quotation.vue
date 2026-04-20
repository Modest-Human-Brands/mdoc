<script setup lang="ts">
defineProps<{
  logoBase64: string
  client: { name: string; address: string; phone: string; email: string }
  project: { quoteNumber: string; quoteDate: string; quoteExpiry: string; shootDate: string; shootLocation: string }
  budgetHtml: string
  termsHtml: string
}>()
</script>

<template>
  <div class="text-[14px] leading-relaxed" style="font-family: 'Exo 2', sans-serif">
    <div id="header" class="block w-full text-center my-16">
      <div>
        <img :src="logoBase64" class="h-12 align-middle mr-4 inline-block" alt="Logo" />
        <span class="text-[32px] font-semibold tracking-wide align-middle">RED CAT PICTURES</span>
      </div>
      <div class="text-base text-black mt-2 leading-relaxed max-w-[85%] mx-auto">
        Registered Address: 17, Netaji Subhash Road, Beltala, P.O.- Harinavi SO, P.S.- Sonarpur, District: South 24 Parganas, Pincode: 700148, Ward No. 23<br />
        Email: contact@redcatpictures.com &nbsp;|&nbsp; Phone: +912269711501 &nbsp;
        <br />
        Website: https://redcatpictures.com
      </div>
    </div>

    <h1 class="text-[24px] text-center mt-2.5 mb-7.5 font-semibold">Photography & Videography Quotation</h1>

    <!-- Metadata Section 1 -->
    <div class="mb-7.5 table w-full">
      <div class="table-row">
        <div class="table-cell font-semibold py-1 pr-4 w-35">Client Name:</div>
        <div class="table-cell py-1">{{ client.name }}</div>
      </div>
      <div class="table-row">
        <div class="table-cell font-semibold py-1 pr-4 w-35">Client Address:</div>
        <div class="table-cell py-1">{{ client.address }}</div>
      </div>
      <div class="table-row">
        <div class="table-cell font-semibold py-1 pr-4 w-35">Client Phone No:</div>
        <div class="table-cell py-1">{{ client.phone }}</div>
      </div>
      <div class="table-row">
        <div class="table-cell font-semibold py-1 pr-4 w-35">Client Email:</div>
        <div class="table-cell py-1">{{ client.email }}</div>
      </div>
    </div>

    <!-- Metadata Section 2 -->
    <div class="mb-7.5 table w-full">
      <div class="table-row">
        <div class="table-cell font-semibold py-1 pr-4 w-35">Quote Number:</div>
        <div class="table-cell py-1">{{ project.quoteNumber }}</div>
      </div>
      <div class="table-row">
        <div class="table-cell font-semibold py-1 pr-4 w-35">Quote Date:</div>
        <div class="table-cell py-1">{{ project.quoteDate }}</div>
      </div>
      <div class="table-row">
        <div class="table-cell font-semibold py-1 pr-4 w-35">Quote Expiry:</div>
        <div class="table-cell py-1">{{ project.quoteExpiry }}</div>
      </div>
    </div>

    <!-- Shoot Details -->
    <div class="bg-[#f9f9f9] p-4 block border-l-4 border-[#333] mb-[30px]">
      <div class="mb-2"><strong>Shoot Date:</strong> {{ project.shootDate }}</div>
      <div><strong>Shoot Location:</strong> {{ project.shootLocation }}</div>
    </div>

    <h2 class="text-[18px] border-b-2 border-[#333] pb-1 mt-8.75 mb-5 font-bold">Scope of Work</h2>

    <!-- Render Raw HTML using v-html -->
    <div class="custom-table" v-html="budgetHtml"></div>

    <div class="break-before-page"></div>

    <h2 class="text-[18px] border-b-2 border-[#333] pb-1 mt-8.75 mb-5 font-bold">Terms & Conditions</h2>
    <div class="text-[13.5px] custom-terms" v-html="termsHtml"></div>

    <!-- Acceptance Section -->
    <div class="acceptance-page">
      <h2 class="text-[18px] border-none pb-1 mt-8.75 mb-5 font-bold">Acceptance of Quotation</h2>
      <p class="text-base mb-7.5">I, _____________________________, accept the quotation and agree to the terms and conditions stated above.</p>

      <table class="w-full mt-7.5 border-none">
        <thead>
          <tr>
            <th class="bg-[#f5f5f5] border-none p-3.75 text-base text-left">For RED CAT PICTURES</th>
            <th class="bg-[#f5f5f5] border-none p-3.75 text-base text-left">For Client</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="border-none pt-8.75 px-3.75 pb-2.5 w-1/2 align-top">
              <div class="mb-12.5 text-base text-[#111]">Signature:</div>
              <div class="mb-12.5 text-base text-[#111]">Name:</div>
              <div class="mb-12.5 text-base text-[#111]">Date:</div>
              <div class="mb-12.5 text-base text-[#111]">Place:</div>
            </td>
            <td class="border-none pt-8.75 px-3.75 pb-2.5 w-1/2 align-top">
              <div class="mb-12.5 text-base text-[#111]">Signature:</div>
              <div class="mb-12.5 text-base text-[#111]">Name:</div>
              <div class="mb-12.5 text-base text-[#111]">Date:</div>
              <div class="mb-12.5 text-base text-[#111]">Place:</div>
            </td>
          </tr>
        </tbody>
      </table>

      <div class="text-[12px] italic mt-10 border-t border-[#ddd] pt-3.75">N.B: This Letter consists of 5 pages including this one. Please sign on all pages.</div>
    </div>
  </div>
</template>
