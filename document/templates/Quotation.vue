<script setup lang="ts">
// Types for our injected props
defineProps<{
  logoBase64: string
  client: { name: string; address: string; phone: string; email: string }
  project: { quoteNumber: string; quoteDate: string; quoteExpiry: string; shootDate: string; shootLocation: string }
  budgetHtml: string
  termsHtml: string
}>()
</script>

<template>
  <!-- Explicitly set the font family on the wrapper -->
  <div class="text-[14px] leading-relaxed" style="font-family: 'Exo 2', sans-serif">
    <!-- Load Exo 2 from Google Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="true" />
    <link href="https://fonts.googleapis.com/css2?family=Exo+2:ital,wght@0,100..900;1,100..900&display=swap" rel="stylesheet" />
    <!-- Header -->
    <div id="header" class="block w-full text-center my-16">
      <div>
        <img :src="logoBase64" class="h-12 align-middle mr-4 inline-block" alt="Logo" />
        <span class="text-[32px] font-semibold tracking-wide align-middle">RED CAT PICTURES</span>
      </div>
      <div class="text-[16px] text-black mt-2 leading-relaxed max-w-[85%] mx-auto">
        Registered Address: 17, Netaji Subhash Road, Beltala, P.O.- Harinavi SO, P.S.- Sonarpur, District: South 24 Parganas, Pincode: 700148, Ward No. 23<br />
        Email: contact@redcatpictures.com &nbsp;|&nbsp; Phone: +912269711501 &nbsp;
        <br />
        Website: https://redcatpictures.com
      </div>
    </div>

    <h1 class="text-[24px] text-center mt-2.5 mb-[30px] font-semibold">Photography & Videography Quotation</h1>

    <!-- Metadata Section 1 -->
    <div class="mb-[30px] table w-full">
      <div class="table-row">
        <div class="table-cell font-semibold py-1 pr-[15px] w-[140px]">Client Name:</div>
        <div class="table-cell py-1">{{ client.name }}</div>
      </div>
      <div class="table-row">
        <div class="table-cell font-semibold py-1 pr-[15px] w-[140px]">Client Address:</div>
        <div class="table-cell py-1">{{ client.address }}</div>
      </div>
      <div class="table-row">
        <div class="table-cell font-semibold py-1 pr-[15px] w-[140px]">Client Phone No:</div>
        <div class="table-cell py-1">{{ client.phone }}</div>
      </div>
      <div class="table-row">
        <div class="table-cell font-semibold py-1 pr-[15px] w-[140px]">Client Email:</div>
        <div class="table-cell py-1">{{ client.email }}</div>
      </div>
    </div>

    <!-- Metadata Section 2 -->
    <div class="mb-[30px] table w-full">
      <div class="table-row">
        <div class="table-cell font-semibold py-1 pr-[15px] w-[140px]">Quote Number:</div>
        <div class="table-cell py-1">{{ project.quoteNumber }}</div>
      </div>
      <div class="table-row">
        <div class="table-cell font-semibold py-1 pr-[15px] w-[140px]">Quote Date:</div>
        <div class="table-cell py-1">{{ project.quoteDate }}</div>
      </div>
      <div class="table-row">
        <div class="table-cell font-semibold py-1 pr-[15px] w-[140px]">Quote Expiry:</div>
        <div class="table-cell py-1">{{ project.quoteExpiry }}</div>
      </div>
    </div>

    <!-- Shoot Details -->
    <div class="bg-[#f9f9f9] p-[15px] block border-l-4 border-[#333] mb-[30px]">
      <div class="mb-2"><strong>Shoot Date:</strong> {{ project.shootDate }}</div>
      <div><strong>Shoot Location:</strong> {{ project.shootLocation }}</div>
    </div>

    <h2 class="text-[18px] border-b-2 border-[#333] pb-1 mt-[35px] mb-[20px] font-bold">Scope of Work</h2>

    <!-- Render Raw HTML using v-html -->
    <div class="custom-table" v-html="budgetHtml"></div>

    <div class="break-before-page"></div>

    <h2 class="text-[18px] border-b-2 border-[#333] pb-1 mt-[35px] mb-[20px] font-bold">Terms & Conditions</h2>
    <div class="text-[13.5px] custom-terms" v-html="termsHtml"></div>

    <!-- Acceptance Section -->
    <div class="acceptance-page">
      <h2 class="text-[18px] border-none pb-1 mt-[35px] mb-[20px] font-bold">Acceptance of Quotation</h2>
      <p class="text-[15px] mb-[30px]">I, _____________________________, accept the quotation and agree to the terms and conditions stated above.</p>

      <table class="w-full mt-[30px] border-none">
        <thead>
          <tr>
            <th class="bg-[#f5f5f5] border-none p-[15px] text-[15px] text-left">For RED CAT PICTURES</th>
            <th class="bg-[#f5f5f5] border-none p-[15px] text-[15px] text-left">For Client</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="border-none pt-[35px] px-[15px] pb-[10px] w-1/2 align-top">
              <div class="mb-[50px] text-[15px] text-[#111]">Signature:</div>
              <div class="mb-[50px] text-[15px] text-[#111]">Name:</div>
              <div class="mb-[50px] text-[15px] text-[#111]">Date:</div>
              <div class="mb-[50px] text-[15px] text-[#111]">Place:</div>
            </td>
            <td class="border-none pt-[35px] px-[15px] pb-[10px] w-1/2 align-top">
              <div class="mb-[50px] text-[15px] text-[#111]">Signature:</div>
              <div class="mb-[50px] text-[15px] text-[#111]">Name:</div>
              <div class="mb-[50px] text-[15px] text-[#111]">Date:</div>
              <div class="mb-[50px] text-[15px] text-[#111]">Place:</div>
            </td>
          </tr>
        </tbody>
      </table>

      <div class="text-[12px] italic mt-[40px] border-t border-[#ddd] pt-[15px]">N.B: This Letter consists of 5 pages including this one. Please sign on all pages.</div>
    </div>
  </div>
</template>
