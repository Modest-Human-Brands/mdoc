<script setup lang="ts">
withDefaults(defineProps<{ data?: InternshipCompletionCertificatePayload }>(), {
  data: () => ({
    recipientName: 'Nilima Kumar',
    role: 'Nuxt Developer',
    company: 'RED CAT PICTURES',
    startDate: 'Sep 8th, 2025',
    endDate: 'Dec 8, 2025',
    issueDate: 'January 16th, 2026',
    description:
      'During this period, she displayed exemplary dedication and technical proficiency in developing scalable web solutions using Nuxt.js, Node.js, and Tailwind CSS. Beyond her core responsibilities of module development and bug fixing, she successfully led the implementation of a RAG-based AI chatbot leveraging our private knowledge base, adding significant value to our user experience.',
    signatureUrl: '',
    signerName: 'Aratrik Nandy',
    signerTitle: 'CEO, RED CAT PICTURES',
    logoUrl: 'https://redcatpictures.com/logo-dark.svg',
  }),
})
</script>

<template>
  <main>
    <component
      :is="'link'"
      rel="stylesheet"
      href="https://fonts.googleapis.com/css2?family=Exo+2:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400;1,600&family=Pinyon+Script&family=IM+Fell+English:ital@0;1&display=swap" />

    <section id="certificate" class="relative p-[18px] bg-gradient-to-br from-[#3d0a0a] via-[#5c1515] to-[#3d0a0a]">
      <div class="absolute inset-0 pointer-events-none m-2 border border-[#c89664]/25" />

      <div class="relative bg-white flex flex-col items-center h-full px-12 pt-10 pb-9">
        <template v-for="corner in ['tl', 'tr', 'bl', 'br']" :key="corner">
          <div
            class="absolute pointer-events-none w-7 h-7"
            :class="[corner.startsWith('t') ? 'top-[14px] border-t-2' : 'bottom-[14px] border-b-2', corner.endsWith('l') ? 'left-[14px] border-l-2' : 'right-[14px] border-r-2', 'border-[#8B1A1A]']" />
        </template>

        <div class="mb-5 mt-2">
          <img :src="data.logoUrl" alt="Company Logo" class="size-20 object-contain" />
        </div>

        <div class="text-center mb-1 font-['IM_Fell_English']">
          <h1 class="text-[2rem] tracking-tight leading-[1.2] text-[#1a1a1a]">
            <em class="text-[#cc2020] italic font-normal">Certificate</em>
            <span class="font-normal"> of Internship</span>
          </h1>
        </div>

        <div class="mb-6 w-[120px] h-[0.125rem] bg-gradient-to-r from-transparent via-[#cc2020] to-transparent" />

        <p class="mb-3 text-center font-['Exo_2'] text-[0.9rem] text-gray-600 tracking-widest">This is to certify that</p>

        <div class="mb-4 text-center">
          <span class="font-['Pinyon_Script'] text-[3rem] text-[#1a1a1a] leading-[1.1]">
            {{ data.recipientName }}
          </span>
        </div>

        <p class="mb-2 text-center font-['Exo_2'] text-sm text-[#333]">has successfully completed an internship as a</p>

        <p class="mb-1 text-center font-['Exo_2'] font-bold text-[1.1rem] text-[#cc2020] tracking-wide">
          {{ data.role }}
        </p>

        <p class="mb-1 text-center font-['Exo_2'] font-semibold text-[0.9rem] text-[#1a1a1a] tracking-[0.08em]">at {{ data.company }}</p>

        <p class="mb-7 text-center font-['Exo_2'] text-sm text-[#333]">from {{ data.startDate }} to {{ data.endDate }}</p>

        <p class="text-center mb-10 leading-relaxed font-['Exo_2'] text-[0.8rem] text-gray-600 max-w-[420px]">
          {{ data.description }}
        </p>

        <div class="flex-1" />

        <div class="w-full flex items-end justify-between mt-auto pt-4">
          <div class="min-w-[180px]">
            <p class="font-['Exo_2'] text-[0.78rem] text-[#333]">Date: {{ data.issueDate }}</p>
          </div>

          <div class="flex flex-col items-end min-w-[180px]">
            <template v-if="data.signatureUrl">
              <img :src="data.signatureUrl" :alt="`Signature of ${data.signerName}`" class="h-12 object-contain mb-0.5" />
            </template>
            <template v-else>
              <span class="font-['Pinyon_Script'] text-[1.6rem] text-[#1a1a1a] leading-none mb-0.5">
                {{ data.signerName }}
              </span>
            </template>
            <div class="w-40 h-[1px] bg-gray-400 mb-1" />
            <p class="font-['Exo_2'] text-[0.78rem] text-[#333] text-right">
              {{ data.signerTitle }}
            </p>
          </div>
        </div>
      </div>
    </section>
  </main>
</template>
