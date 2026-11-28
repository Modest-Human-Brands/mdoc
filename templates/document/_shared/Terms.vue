<script setup lang="ts">
import { computed } from 'vue'
import { View, Text } from './pdf'
import type { TermSection } from './terms'

const props = defineProps<{
  sections: TermSection[]
  /** Optional section heading, for example "TERMS & CONDITIONS". Omit to render the terms inline. */
  heading?: string
  headingStyle?: Record<string, string | number>
}>()

type Block = TermSection['blocks'][number]
type ListItem = NonNullable<Block['items']>[number]

type Part = { kind: 'heading' | 'title' | 'termHeading' | 'subHeading' | 'paragraph'; text: string } | { kind: 'item'; item: ListItem; endsList: boolean }

/** A short line ending in a colon ("The Client shall:") introduces what follows, like a heading does. */
const LEAD_IN_MAX_CHARS = 200

const introduces = (part: Part) => {
  if (part.kind === 'item') return false
  if (part.kind !== 'paragraph') return true
  return part.text.length <= LEAD_IN_MAX_CHARS && part.text.trimEnd().endsWith(':')
}

const blockParts = (block: Block, titled: boolean): Part[] => {
  if (block.type === 'list') {
    const items = block.items ?? []
    return items.map((item, index) => ({ kind: 'item', item, endsList: index === items.length - 1 }))
  }
  if (block.type === 'heading') return [{ kind: titled ? 'subHeading' : 'termHeading', text: block.text ?? '' }]
  return [{ kind: 'paragraph', text: block.text ?? '' }]
}

// Estimates in points, on the generous side. Terms run the full width of the page.
const CHARS_PER_LINE = 70
const LINE_HEIGHT = 18
/** Room a block may take and still be sure to fit on one page. A taller block that must not wrap is cut off. */
const MAX_UNBROKEN_HEIGHT = 540
/** Space each kind of part adds around its text: margins, and for the large headings their bigger type. */
const PART_SPACING: Record<Part['kind'], number> = { heading: 70, title: 20, termHeading: 32, subHeading: 9, paragraph: 6, item: 3 }

const textHeight = (text: string) => Math.max(1, Math.ceil(text.length / CHARS_PER_LINE)) * LINE_HEIGHT

const partHeight = (part: Part) => {
  const texts = part.kind === 'item' ? [part.item.text, ...(part.item.subitems ?? []).map((subitem) => subitem.text)] : [part.text]
  return texts.reduce((height, text) => height + textHeight(text), PART_SPACING[part.kind])
}

const toChunk = (parts: Part[]) => ({ parts, fits: parts.reduce((height, part) => height + partHeight(part), 0) <= MAX_UNBROKEN_HEIGHT })

/**
 * The pieces the page breaker may move between pages. The rule is "keep with next": anything that introduces
 * something (headings, term titles, lead-in lines) stays with the first paragraph or list item that follows it,
 * even across several headings or into the next section. A list may break between its items. A short section
 * stays whole.
 */
const chunks = computed(() => {
  const result: ReturnType<typeof toChunk>[] = []
  let pending: Part[] = props.heading ? [{ kind: 'heading', text: props.heading }] : []

  for (const section of props.sections) {
    if (section.title) pending.push({ kind: 'title', text: `${section.number}. ${section.title}` })
    const parts = section.blocks.flatMap((block) => blockParts(block, Boolean(section.title)))

    if (section.keepTogether && parts.some((part) => !introduces(part))) {
      const whole = toChunk([...pending, ...parts])
      // A section ending on a lead-in still has to travel with what follows, so it is split up below instead.
      if (whole.fits && !introduces(parts[parts.length - 1]!)) {
        result.push(whole)
        pending = []
        continue
      }
    }

    for (const part of parts) {
      pending.push(part)
      if (introduces(part)) continue
      result.push(toChunk(pending))
      pending = []
    }
  }

  if (pending.length > 0) result.push(toChunk(pending))
  return result
})

const styles = {
  title: { fontSize: 13, fontWeight: 'bold' as const, color: '#000000', marginTop: 14, marginBottom: 4 },
  termHeading: { fontSize: 16, fontWeight: 'bold' as const, marginTop: 16, marginBottom: 8, color: '#000000' },
  subHeading: { fontSize: 12, fontWeight: 'bold' as const, marginTop: 6, marginBottom: 3, color: '#000000' },
  paragraph: { color: '#444444', fontSize: 12, marginBottom: 6 },
  listItem: { marginLeft: 8 },
  lastListItem: { marginLeft: 8, marginBottom: 6 },
  bulletRow: { flexDirection: 'row' as const, marginBottom: 3 },
  bulletText: { flex: 1, color: '#555555', fontSize: 12, lineHeight: 1.4 },
}
</script>

<template>
  <View v-if="sections.length > 0">
    <!-- A flat list on purpose: the page breaker cannot move a block that is the first thing inside its own wrapper. -->
    <View v-for="(chunk, cIndex) in chunks" :key="cIndex" :wrap="!chunk.fits">
      <template v-for="(part, pIndex) in chunk.parts" :key="pIndex">
        <View v-if="part.kind === 'item'" :style="part.endsList ? styles.lastListItem : styles.listItem">
          <View :style="styles.bulletRow">
            <Text :style="styles.bulletText">- {{ part.item.text }}</Text>
          </View>
          <View v-if="part.item.subitems" :style="{ marginLeft: 16 }">
            <View v-for="(subitem, subIndex) in part.item.subitems" :key="'sub_' + subIndex" :style="styles.bulletRow">
              <Text :style="styles.bulletText">• {{ subitem.text }}</Text>
            </View>
          </View>
        </View>
        <Text v-else-if="part.kind === 'heading'" :style="headingStyle">{{ part.text }}</Text>
        <Text v-else :style="styles[part.kind]">{{ part.text }}</Text>
      </template>
    </View>
  </View>
</template>
