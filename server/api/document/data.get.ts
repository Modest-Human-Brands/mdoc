export default defineEventHandler(async () => {
  const budgetMarkdown = `
  | Description | Deliverables | Amount (INR) |
  | --- | --- | --- |
  | Photography | 40-50 products per product 3-4 photos with basic editing | 10000 |
  | Models and stylist | 2 male models | 6000 |
  | Studio | AP Studio | 4000 |
  | Food and Travel |  | 2000 |
  | Total |  | 22000 |
  | Discount |  | 3000 (16%) |
  | Total discounted price |  | 19000 |`

  const { terms } = await $fetch<{
    terms: {
      content: string
      lastUpdated: string
    }
  }>('https://redcatpictures.com/api/complience')

  const data = {
    logoUrl: 'https://redcatpictures.com/logo-dark.svg',
    client: {
      name: 'RP Square Ventures LLP',
      address: 'A-402, SJR Hamilton Homes primecorp, Rayasandra Main road, Gattahalli Bangalore, Karnataka 560099',
      email: 'teavante@teavante.com',
      phone: '6360943657',
    },
    project: {
      quoteNumber: 'RCP-Q-70-1',
      quoteDate: 'Apr 4, 2026',
      quoteExpiry: 'May 3, 2026',
      shootDate: 'Apr 14, 2026',
      shootLocation: 'N. S. C. Road, Mahinagar, Malancha Bazar, Rajpur Sonarpur, 700145',
    },
    budgetMarkdown,
    termsMarkdown: terms.content,
  }

  return data
})
