import { marked } from 'marked'

export interface ParsedListItem {
  text: string
  subitems?: ParsedListItem[]
}

export interface ParsedTerm {
  type: 'heading' | 'list' | 'paragraph'
  text?: string
  items?: ParsedListItem[]
}

export default function parseMarkdown(rawMarkdown: string, variables: Record<string, any> = {}): ParsedTerm[] {
  const parsedTerms: ParsedTerm[] = []

  const resolvedMarkdown = rawMarkdown.replace(/{{\s*([\w.]+)\s*}}/g, (match, path) => {
    let value: any = variables
    for (const part of path.split('.')) {
      if (value == null) {
        value = undefined
        break
      }
      value = value[part]
    }
    return value !== undefined && value !== null ? String(value) : match
  })

  const tokens = marked.lexer(resolvedMarkdown)

  const cleanText = (text: string) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .trim()
  }

  const parseListItems = (listToken: any): ParsedListItem[] => {
    return listToken.items.map((item: any) => {
      let textContent = ''
      let subitems: ParsedListItem[] | undefined = undefined

      if (item.tokens) {
        for (const t of item.tokens) {
          if (t.type === 'text' || t.type === 'paragraph') {
            textContent += t.text + ' '
          } else if (t.type === 'list') {
            subitems = parseListItems(t)
          }
        }
      } else {
        textContent = item.text
      }

      return {
        text: cleanText(textContent.replace(/\n/g, ' ')),
        ...(subitems && subitems.length > 0 ? { subitems } : {}),
      }
    })
  }

  for (const token of tokens) {
    switch (token.type) {
      case 'heading': {
        parsedTerms.push({ type: 'heading', text: cleanText(token.text) })
        break
      }
      case 'paragraph': {
        const flatText = token.text.replace(/\n/g, ' ')
        parsedTerms.push({ type: 'paragraph', text: cleanText(flatText) })
        break
      }
      case 'list': {
        parsedTerms.push({ type: 'list', items: parseListItems(token) })
        break
      }
    }
  }

  return parsedTerms
}
