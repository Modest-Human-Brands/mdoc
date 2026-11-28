<script setup lang="ts" generic="T">
import { computed } from 'vue'
import { View, fitsOnPage } from './pdf'

/**
 * A heading and the rows under it, such as a table title with its column row. The heading is never left at the foot of
 * a page: it moves together with the first row. Later rows break as they like. Use the `heading` slot for everything
 * above the first row, the `item` slot for one row, and the default slot for anything after the rows.
 */
const props = defineProps<{
  items: T[]
  /** The text one row holds, to judge whether it can be kept with the heading. */
  textsOf: (item: T) => (string | undefined)[]
  /** Text in the heading itself, when it is long enough to matter. */
  headingTexts?: string[]
  charsPerLine?: number
}>()

defineSlots<{
  heading(): unknown
  item(props: { item: T; index: number }): unknown
  default(): unknown
}>()

/** Fewer than a full page, to leave room for the heading. */
const MAX_LINES_WITH_HEADING = 24

const keepHeading = computed(() => {
  const first = props.items[0]
  return fitsOnPage([...(props.headingTexts ?? []), ...(first === undefined ? [] : props.textsOf(first))], props.charsPerLine, MAX_LINES_WITH_HEADING)
})
</script>

<template>
  <View>
    <View :wrap="!keepHeading">
      <slot name="heading" />
      <slot v-if="items.length > 0" name="item" :item="items[0]!" :index="0" />
    </View>
    <slot v-for="(item, index) in items.slice(1)" :key="index" name="item" :item="item" :index="index + 1" />
    <slot />
  </View>
</template>
