export default async function (assetStorage: ReturnType<typeof useStorage>, fallbackFont = 'Exo2') {
  const allFontKeys = await assetStorage.getKeys('font')

  const entries = await Promise.all(
    allFontKeys.map<Promise<null | [string, { data: Uint8Array<ArrayBuffer>; fallback?: boolean; subset?: boolean }]>>(async (key) => {
      // key format → "font:Exo2-Regular.ttf"
      const fontName = key.split(':')[1]!.split('-')[0]!
      const data = await assetStorage.getItemRaw<Uint8Array<ArrayBuffer>>(key)
      if (!data) return null
      return [fontName, { data, fallback: fontName === fallbackFont }]
    })
  )

  return Object.fromEntries(entries.filter(Boolean) as NonNullable<(typeof entries)[number]>[])
}
