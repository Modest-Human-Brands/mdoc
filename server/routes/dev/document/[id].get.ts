import { defineEventHandler, getValidatedRouterParams, HTTPError } from 'nitro/h3'
import { templateRegistry } from '~/server/utils/template-registry'
import { z } from 'zod'

import '~/templates/document'

const pathParamsSchema = z.object({ id: z.string() })

export default defineEventHandler(async (event) => {
  const { id: templateId } = await getValidatedRouterParams(event, pathParamsSchema)

  if (!templateId) {
    throw new HTTPError({ statusCode: 400, statusMessage: 'Missing templateId parameter.' })
  }

  const templateDef = templateRegistry[templateId]
  if (!templateDef) {
    throw new HTTPError({ statusCode: 404, statusMessage: `Template '${templateId}' not found.` })
  }

  const variables: Record<string, any> = {}

  function initMockData(shape: any, mockSource: any = {}): any {
    const obj: any = {}
    for (const [key, zodItem] of Object.entries(shape)) {
      let currentDef = zodItem as any
      while (currentDef?._def?.innerType) currentDef = currentDef._def.innerType

      const typeName = currentDef?._def?.typeName || ''
      if (typeName === 'ZodObject' && currentDef.shape) {
        obj[key] = initMockData(currentDef.shape, mockSource[key] || {})
      } else if (typeName === 'ZodArray') {
        obj[key] = mockSource[key] || []
      } else {
        obj[key] = mockSource[key] === undefined ? '' : mockSource[key]
      }
    }
    return obj
  }

  if (templateDef.schema?.shape) {
    Object.assign(variables, initMockData(templateDef.schema.shape, templateDef.placeholders || {}))
  }

  const signerFieldsMap: Record<string, any[]> = {}
  const fields = templateDef.signerFields || []

  for (const field of fields) {
    if (!signerFieldsMap[field.signerOrder]) {
      signerFieldsMap[field.signerOrder] = []
    }
    signerFieldsMap[field.signerOrder].push(field)
  }

  const html = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MDoc | PDF Studio - ${templateId}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://unpkg.com/vue@3/dist/vue.global.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
    <script>pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';</script>
  </head>
  <body class="bg-gray-100 overflow-hidden h-screen flex text-gray-800 font-sans">
    
    <div id="app" class="flex size-full">

      <div class="w-2/3 h-full flex flex-col border-r border-gray-300 bg-white min-w-0">

        <div class="p-4 bg-gray-50 border-b border-gray-200 font-semi-bold text-gray-700 flex justify-between items-center shadow-sm z-10 shrink-0">
          <span>PDF Template: <span class="text-blue-600">${templateId}</span></span>
          <span class="flex items-center gap-2">
            <span class="w-2 h-2 rounded-full" :class="isRendering ? 'bg-blue-500 animate-pulse' : 'bg-green-500'"></span>
            <span class="text-xs tracking-wide" :class="isRendering ? 'text-blue-700' : 'text-green-700'">
              {{ isRendering ? 'Rendering...' : 'Live Sync Active' }}
            </span>
          </span>
        </div>

        <div class="flex-1 min-h-0 overflow-auto bg-gray-500 p-8 flex flex-col items-center gap-8 relative" id="pdf-scroll-container">

          <div v-if="errorHtml" v-html="errorHtml" class="w-full max-w-[800px] bg-white shadow-2xl p-8 border border-gray-200"></div>

          <div
            v-for="page in pdfPages"
            :key="page.pageNumber"
            class="relative bg-white shadow-2xl shrink-0 border border-gray-200"
            :style="{ width: page.width + 'px', height: page.height + 'px' }"
          >
            <canvas :id="'page-canvas-' + page.pageNumber" class="absolute top-0 left-0 size-full"></canvas>

            <div
              v-for="field in getFieldsForPage(page.pageNumber)"
              class="absolute border-2 flex flex-col items-center justify-center text-[10px] font-bold cursor-default backdrop-blur-[1px]"
              :style="{
                left: field.x + 'px',
                bottom: field.y + 'px',
                width: field.width + 'px',
                height: field.height + 'px',
                borderColor: getOrderColor(field.signerOrder).border,
                backgroundColor: getOrderColor(field.signerOrder).bg,
                color: getOrderColor(field.signerOrder).text
              }"
            >
              <span class="tracking-widest uppercase">{{ field.type }}</span>
              <span class="text-[8px] opacity-80 font-normal truncate w-full text-center px-1">{{ field.id }}</span>
            </div>
          </div>

          <div v-if="!pdfDataUrl && !errorHtml" class="text-gray-300 font-medium tracking-wide mt-20">
            Waiting for PDF render...
          </div>

          <div v-if="isRendering" class="fixed bottom-6 left-6 bg-black bg-opacity-80 text-white text-xs px-4 py-2 rounded-full animate-pulse shadow-lg z-50 flex items-center gap-2">
            <span class="w-2 h-2 bg-blue-400 rounded-full animate-ping"></span> Compiling PDF Elements...
          </div>

        </div>
      </div>
      <div class="w-1/3 h-full bg-white flex flex-col min-w-0">

        <div class="p-4 bg-gray-50 border-b border-gray-200 font-semi-bold text-gray-700 shadow-sm z-10 flex justify-start items-center shrink-0">
          <span>Live Variables Editor</span>
        </div>

        <div class="flex-1 min-h-0 overflow-y-auto p-6 space-y-6 bg-white">
          <editor-node
            v-for="(val, key) in variables"
            :key="key"
            :node-key="key"
            v-model="variables[key]"
          ></editor-node>

          <div v-if="Object.keys(variables).length === 0" class="text-sm text-gray-400 italic">
            No variables defined in schema.
          </div>
        </div>

      </div>
      </div>

    <template id="editor-node-template">
      <div class="flex flex-col">
        <label
          class="text-xs font-bold uppercase tracking-wider mb-2"
          :class="isObject ? 'text-blue-500' : 'text-gray-500'"
        >
          {{ nodeKey }}
        </label>

        <div v-if="isObject" class="pl-4 border-l-2 border-blue-200 ml-1 flex flex-col gap-4 mt-1 mb-2">
          <editor-node
            v-for="(val, key) in modelValue"
            :key="key"
            :node-key="key"
            :model-value="val"
            @update:model-value="updateNested(key, $event)"
          ></editor-node>
        </div>

        <textarea
          v-else-if="isArray"
          class="border border-gray-300 rounded-md p-2.5 text-sm font-mono focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all h-24"
          :value="JSON.stringify(modelValue, null, 2)"
          @input="updateArray"
        ></textarea>

        <input
          v-else
          type="text"
          :value="modelValue"
          @input="$emit('update:modelValue', $event.target.value)"
          class="border border-gray-300 bg-gray-50 rounded-md p-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all focus:bg-white"
          :placeholder="'Enter ' + nodeKey"
        />
      </div>
    </template>

    <script>
      const EditorNode = {
        name: 'EditorNode',
        template: '#editor-node-template',
        props: ['modelValue', 'nodeKey'],
        emits: ['update:modelValue'],
        computed: {
          isObject() {
            return this.modelValue !== null && typeof this.modelValue === 'object' && !Array.isArray(this.modelValue);
          },
          isArray() {
            return Array.isArray(this.modelValue);
          }
        },
        methods: {
          updateNested(key, val) {
            this.$emit('update:modelValue', { ...this.modelValue, [key]: val });
          },
          updateArray(e) {
            try {
              this.$emit('update:modelValue', JSON.parse(e.target.value));
            } catch (err) { /* ignore invalid JSON mid-typing */ }
          }
        }
      };

      const App = {
        data() {
          return {
            variables: ${JSON.stringify(variables)},
            signerFields: ${JSON.stringify(signerFieldsMap)},
            pdfDataUrl: false,
            pdfPages: [],
            pdfScale: 1.5,
            errorHtml: '',
            isRendering: false,
            renderTimeout: null
          }
        },
        mounted() {
          this.triggerRender();
        },
        methods: {
          async renderPdfClientSide(base64Data) {
            const binaryString = window.atob(base64Data);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }

            const loadingTask = pdfjsLib.getDocument({ data: bytes });
            this._pdfDocument = await loadingTask.promise;
            const totalPages = this._pdfDocument.numPages;

            // Calculate dynamic scale to fit container height
            const container = document.getElementById('pdf-scroll-container');
            const availableHeight = container ? container.clientHeight - 64 : 800; // 64px for p-8 padding
            const firstPage = await this._pdfDocument.getPage(1);
            const baseViewport = firstPage.getViewport({ scale: 1.0 });
            this.pdfScale = availableHeight / baseViewport.height;

            this.pdfPages = [];

            for (let i = 1; i <= totalPages; i++) {
              const page = await this._pdfDocument.getPage(i);
              const viewport = page.getViewport({ scale: this.pdfScale });
              this.pdfPages.push({ pageNumber: i, width: viewport.width, height: viewport.height });
            }

            this.$nextTick(() => {
              this.pdfPages.forEach(async (pageData) => {
                const canvas = document.getElementById('page-canvas-' + pageData.pageNumber);
                if (canvas) {
                  canvas.width = pageData.width;
                  canvas.height = pageData.height;
                  const page = await this._pdfDocument.getPage(pageData.pageNumber);
                  const viewport = page.getViewport({ scale: this.pdfScale });
                  page.render({ canvasContext: canvas.getContext('2d'), viewport });
                }
              });
            });
          },

          getFieldsForPage(pageNum) {
            const totalPages = this._pdfDocument ? this._pdfDocument.numPages : 1;
            const allFields = Object.values(this.signerFields).flat();
            const currentIdx = pageNum - 1;

            return allFields
              .filter(field => {
                const pIdx = field.pageIndex;
                const resolveIdx = (idx) => (idx < 0 ? totalPages + idx : idx);

                if (typeof pIdx === 'number') {
                  return currentIdx === resolveIdx(pIdx);
                } else if (Array.isArray(pIdx)) {
                  return pIdx.some(idx => currentIdx === resolveIdx(idx));
                } else if (typeof pIdx === 'string') {
                  if (pIdx === 'all') return true;
                  if (pIdx === 'all-except-last') return currentIdx < (totalPages - 1);
                  if (pIdx === 'odd') return currentIdx % 2 === 0;
                  if (pIdx === 'even') return currentIdx % 2 !== 0;
                  if (pIdx.startsWith('*/')) {
                    const step = parseInt(pIdx.replace('*/', ''), 10);
                    if (!isNaN(step) && step > 0) return currentIdx % step === 0;
                  } else if (pIdx.includes(',')) {
                    const indices = pIdx.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
                    return indices.some(idx => currentIdx === resolveIdx(idx));
                  } else if (pIdx.includes('-')) {
                    const parts = pIdx.split('-').map(s => parseInt(s.trim(), 10));
                    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
                      return currentIdx >= resolveIdx(parts[0]) && currentIdx <= resolveIdx(parts[1]);
                    }
                  }
                }
                return false;
              })
              .map(field => ({
                ...field,
                x:      field.x      * this.pdfScale,
                y:      field.y      * this.pdfScale,
                width:  field.width  * this.pdfScale,
                height: field.height * this.pdfScale,
              }));
          },

          getOrderColor(order) {
            const colors = [
              { bg: '#3b82f64d', border: '#3b82f6', text: '#1e3a8a' }, 
              { bg: '#eab3084d', border: '#eab308', text: '#713f12' }, 
              { bg: '#22c55e4d', border: '#22c55e', text: '#14532d' },
            ];
            return colors[(order - 1) % colors.length] || colors[0];
          },

          async triggerRender() {
            this.isRendering = true;
            this.errorHtml = '';
            
            try {
              const res = await fetch('/api/document/template/preview', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  templateId: '${templateId}',
                  variables: this.variables,
                })
              });
              
              const data = await res.json();
              
              if (data.pdfBase64) {
                this.pdfDataUrl = true;
                await this.renderPdfClientSide(data.pdfBase64);
              } else if (data.error) {
                this.errorHtml = '<div style="padding:20px; color:red; font-family:sans-serif;"><b>Compilation Error:</b><br><br>' + data.error + '</div>';
                this.pdfDataUrl = false;
                this.pdfPages = [];
              }
            } catch (err) {
              this.errorHtml = '<div style="padding:20px; color:red; font-family:sans-serif;"><b>Network Error:</b><br><br>' + err.message + '</div>';
              this.pdfDataUrl = false;
              this.pdfPages = [];
            } finally {
              this.isRendering = false;
            }
          },
        },

        watch: {
          variables: {
            deep: true,
            handler() {
              clearTimeout(this.renderTimeout);
              this.renderTimeout = setTimeout(() => {
                this.triggerRender();
              }, 400);
            }
          }
        }
      };

      const vueApp = Vue.createApp(App);
      vueApp.component('editor-node', EditorNode);
      vueApp.mount('#app');
    </script>
  </body>
  </html>
  `

  event.res.headers.set('content-type', 'text/html')
  return html
})
