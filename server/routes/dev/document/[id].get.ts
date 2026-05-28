import { defineEventHandler, getRouterParams, HTTPError } from 'nitro/h3'
import { templateRegistry } from '~/server/utils/template-registry'

import '~/templates/document'

export default defineEventHandler((event) => {
  const { id: templateId } = getRouterParams(event)

  if (!templateId) {
    throw new HTTPError({ statusCode: 400, statusMessage: 'Missing templateId parameter.' })
  }

  const templateDef = templateRegistry[templateId]
  if (!templateDef) {
    throw new HTTPError({ statusCode: 404, statusMessage: `Template '${templateId}' not found.` })
  }

  const variables: Record<string, any> = {}

  // Recursive initialization of mock data based on the Zod schema
  function initMockData(shape: any, mockSource: any = {}): any {
    const obj: any = {}
    for (const [key, zodItem] of Object.entries(shape)) {
      let currentDef = zodItem as any
      // Unwrap .optional(), .nullable()
      while (currentDef?._def?.innerType) currentDef = currentDef._def.innerType

      const typeName = currentDef?._def?.typeName || ''
      if (typeName === 'ZodObject' && currentDef.shape) {
        obj[key] = initMockData(currentDef.shape, mockSource[key] || {})
      } else if (typeName === 'ZodArray') {
        obj[key] = mockSource[key] || []
      } else {
        // Fallback to empty string for standard inputs if no mock provided
        obj[key] = mockSource[key] === undefined ? '' : mockSource[key]
      }
    }
    return obj
  }

  // FIXED: Now correctly injecting templateDef.placeholders instead of an empty object
  if (templateDef.schema?.shape) {
    Object.assign(variables, initMockData(templateDef.schema.shape, templateDef.placeholders || {}))
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
  </head>
  <body class="bg-gray-100 overflow-hidden h-screen flex text-gray-800 font-sans">
    
    <div id="app" class="flex w-full h-full">

      <div class="w-2/3 h-full flex flex-col border-r border-gray-300 bg-white">
        <div class="p-4 bg-gray-50 border-b border-gray-200 font-semibold text-gray-700 flex justify-between items-center shadow-sm z-10">
           <span>PDF Template: <span class="text-blue-600">${templateId}</span></span>
           <span class="flex items-center gap-2">
             <span class="w-2 h-2 rounded-full" :class="socketConnected ? 'bg-green-500' : 'bg-red-500'"></span>
             <span class="text-xs tracking-wide" :class="socketConnected ? 'text-green-700' : 'text-red-700'">
                {{ socketConnected ? 'WebSocket Active' : 'Disconnected' }}
             </span>
           </span>
        </div>
        
        <div class="flex-1 overflow-auto bg-gray-500 flex justify-center p-8">
           <div class="bg-white shadow-2xl min-h-[800px] w-full max-w-[800px] border border-gray-200 overflow-hidden relative flex flex-col">
              
              <iframe v-if="pdfDataUrl && !errorHtml" :src="pdfDataUrl" class="w-full h-full border-none flex-1"></iframe>
              
              <div v-else-if="errorHtml" v-html="errorHtml" class="w-full h-full p-8 bg-white"></div>
              
              <div v-else class="flex flex-1 justify-center items-center text-gray-400">
                Waiting for PDF render...
              </div>
              
              <div v-if="isRendering" class="absolute top-2 right-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded-md animate-pulse">
                Rendering PDF...
              </div>
           </div>
        </div>
      </div>

      <div class="w-1/3 h-full bg-white flex flex-col">
        <div class="p-4 bg-gray-50 border-b border-gray-200 font-semibold text-gray-700 shadow-sm z-10 flex justify-between">
           <span>Live Variables Editor</span>
           <span class="text-xs font-normal text-gray-500 mt-1">Zod Schema Extracted</span>
        </div>
        <div class="flex-1 overflow-y-auto p-6 space-y-6 bg-white">
           
           <editor-node
             v-for="(val, key) in variables"
             :key="key"
             :node-key="key"
             v-model="variables[key]"
           ></editor-node>

        </div>
      </div>

    </div>

    <template id="editor-node-template">
      <div class="flex flex-col">
        <label class="text-xs font-bold uppercase tracking-wider mb-2" :class="isObject ? 'text-blue-500' : 'text-gray-500'">
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
            } catch(err) { /* ignore invalid JSON mid-typing */ } 
          }
        }
      };

      const App = {
        data() {
          return {
            variables: ${JSON.stringify(variables)},
            pdfDataUrl: null,
            errorHtml: '',
            ws: null,
            socketConnected: false,
            isRendering: false,
            renderTimeout: null
          }
        },
        mounted() {
          this.connectWebSocket();
        },
        methods: {
          connectWebSocket() {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            this.ws = new WebSocket(protocol + '//' + window.location.host + '/api/document/template/preview');
            
            this.ws.onopen = () => {
              this.socketConnected = true;
              this.triggerRender();
            };
            
            this.ws.onclose = () => {
              this.socketConnected = false;
              setTimeout(() => this.connectWebSocket(), 3000); 
            };

            this.ws.onmessage = (event) => {
              const data = JSON.parse(event.data);
              this.isRendering = false;
              
              if (data.pdfBase64) {
                this.pdfDataUrl = 'data:application/pdf;base64,' + data.pdfBase64;
                this.errorHtml = '';
              } else if (data.error) {
                this.errorHtml = '<div style="padding:20px; color:red; font-family:sans-serif;"><b>Compilation Error:</b><br><br>' + data.error + '</div>';
                this.pdfDataUrl = null;
              }
            };
          },
          triggerRender() {
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
              this.isRendering = true;
              this.ws.send(JSON.stringify({
                templateId: '${templateId}',
                variables: this.variables
              }));
            }
          }
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
