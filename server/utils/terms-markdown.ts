import { marked, type Token, type Tokens } from 'marked'

/**
 * Terms are authored as Tiptap JSON limited to what the PDF renders (see `ALLOWED_NODES` in the web app):
 * paragraphs, headings (h1-h3), bullet/ordered lists one level deep, hard breaks, bold and italic.
 * Documents snapshot the markdown form, which `parse-markdown` turns into PDF blocks.
 */
interface DocNode {
  type?: string
  attrs?: Record<string, unknown>
  marks?: { type?: string }[]
  content?: DocNode[]
  text?: string
}

export const emptyDoc = () => ({ type: 'doc', content: [] as DocNode[] })

const isNode = (value: unknown): value is DocNode => value !== null && typeof value === 'object'

function inline(nodes: DocNode[] = []) {
  return nodes
    .map((node) => {
      if (node.type === 'hardBreak') return '  \n'
      if (node.type !== 'text' || !node.text) return ''
      const marks = new Set((node.marks ?? []).map((mark) => mark.type))
      const wrap = `${marks.has('bold') ? '**' : ''}${marks.has('italic') ? '*' : ''}`
      const lead = /^\s*/.exec(node.text)![0]
      const trail = /\s*$/.exec(node.text)![0]
      const body = node.text.trim()
      return wrap && body ? `${lead}${wrap}${body}${wrap}${trail}` : node.text
    })
    .join('')
}

function list(node: DocNode, depth: number): string {
  const ordered = node.type === 'orderedList'
  const pad = '    '.repeat(depth)
  return (node.content ?? [])
    .map((item, index) => {
      const marker = ordered ? `${index + 1}.` : '-'
      const [first, ...rest] = item.content ?? []
      const head = first?.type === 'paragraph' ? inline(first.content) : ''
      const nested = (first?.type === 'paragraph' ? rest : (item.content ?? [])).filter((child) => child.type === 'bulletList' || child.type === 'orderedList').map((child) => list(child, depth + 1))
      return [`${pad}${marker} ${head}`, ...nested].join('\n')
    })
    .join('\n')
}

export function docToMarkdown(doc: unknown): string {
  if (!isNode(doc)) return ''
  return (doc.content ?? [])
    .map((node) => {
      switch (node.type) {
        case 'heading': {
          const level = Math.min(Math.max(Number(node.attrs?.level) || 3, 1), 3)
          return `${'#'.repeat(level)} ${inline(node.content)}`
        }
        case 'paragraph': {
          return inline(node.content)
        }
        case 'bulletList':
        case 'orderedList': {
          return list(node, 0)
        }
        default: {
          return ''
        }
      }
    })
    .filter((block) => block.trim() !== '')
    .join('\n\n')
    .trim()
}

function inlineNodes(tokens: Token[] = [], marks: { type: string }[] = []): DocNode[] {
  return tokens.flatMap((token): DocNode[] => {
    switch (token.type) {
      case 'strong': {
        return inlineNodes((token as Tokens.Strong).tokens, [...marks, { type: 'bold' }])
      }
      case 'em': {
        return inlineNodes((token as Tokens.Em).tokens, [...marks, { type: 'italic' }])
      }
      case 'br': {
        return [{ type: 'hardBreak' }]
      }
      case 'link':
      case 'del': {
        return inlineNodes((token as Tokens.Link).tokens, marks)
      }
      default: {
        const text = 'text' in token ? String((token as { text: string }).text) : ''
        return text
          .split('\n')
          .flatMap((line, index): DocNode[] => [...(index > 0 ? [{ type: 'hardBreak' }] : []), ...(line ? [{ type: 'text', text: line, ...(marks.length > 0 && { marks }) }] : [])])
      }
    }
  })
}

function listNode(token: Tokens.List, depth: number): DocNode {
  return {
    type: token.ordered ? 'orderedList' : 'bulletList',
    content: token.items.map((item): DocNode => {
      const content: DocNode[] = []
      const own = item.tokens.filter((child) => child.type !== 'list')
      const paragraph = inlineNodes(own.flatMap((child) => ('tokens' in child && child.tokens ? child.tokens : [child])))
      content.push({ type: 'paragraph', ...(paragraph.length > 0 && { content: paragraph }) })
      if (depth < 1) for (const child of item.tokens) if (child.type === 'list') content.push(listNode(child as Tokens.List, depth + 1))
      return { type: 'listItem', content }
    }),
  }
}

/** Converts authored markdown (for example the templates' built-in terms) into the editor's document. */
export function markdownToDoc(markdown: string) {
  const content: DocNode[] = []
  for (const token of marked.lexer(markdown)) {
    switch (token.type) {
      case 'heading': {
        const heading = token as Tokens.Heading
        content.push({ type: 'heading', attrs: { level: Math.min(heading.depth, 3) }, content: inlineNodes(heading.tokens) })

        break
      }
      case 'paragraph': {
        content.push({ type: 'paragraph', content: inlineNodes((token as Tokens.Paragraph).tokens) })

        break
      }
      case 'list': {
        content.push(listNode(token as Tokens.List, 0))

        break
      }
      // No default
    }
  }
  return { type: 'doc', content }
}
