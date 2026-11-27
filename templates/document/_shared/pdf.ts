import { camelize, h, type FunctionalComponent } from 'vue'
import { Image as LibraryImage, Text as LibraryText, View as LibraryView } from '@ceereals/vue-pdf'

/**
 * View, Text and Image that pass on only the attributes a template actually sets. The library's own versions always add
 * `fixed: false`, and the page breaker only asks whether `fixed` is present, so it treated every element as fixed and
 * ignored `:wrap="false"`, `break` and `min-presence-ahead`: table rows came apart across two pages.
 */
function element<Component>(type: string): Component {
  const render: FunctionalComponent = (_props, { attrs, slots }) => {
    const props: Record<string, unknown> = {}
    for (const [name, value] of Object.entries(attrs)) {
      if (value === undefined) continue
      const key = camelize(name)
      // A bare attribute such as `<View fixed>` arrives as an empty string.
      props[key] = value === '' && (key === 'fixed' || key === 'wrap' || key === 'break') ? true : value
    }
    if (props.fixed === false) delete props.fixed
    return h(type, props, slots.default?.())
  }
  render.inheritAttrs = false
  return render as Component
}

export const View = element<typeof LibraryView>('VIEW')
export const Text = element<typeof LibraryText>('TEXT')
export const Image = element<typeof LibraryImage>('IMAGE')

/**
 * Whether a block holding this text is short enough to be kept on one page. Use it for `:wrap="!fitsOnPage(…)"`: a
 * block that must not wrap but is taller than a page is cut off at the page edge. The estimate assumes a narrow column,
 * so it lets a block split sooner rather than risk losing text.
 */
export function fitsOnPage(texts: (string | undefined)[], charsPerLine = 30, maxLines = 30): boolean {
  return texts.reduce((lines, text) => lines + Math.max(1, Math.ceil((text?.length ?? 0) / charsPerLine)), 0) <= maxLines
}
