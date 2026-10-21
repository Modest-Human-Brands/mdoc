import { definePlugin } from 'nitro'

const EMPTY_STRING_CHILD = "Invalid '' string child outside <Text> component"

export default definePlugin(() => {
  const warn = console.warn
  console.warn = (...args: unknown[]) => {
    if (args[0] !== EMPTY_STRING_CHILD) warn(...args)
  }
})
