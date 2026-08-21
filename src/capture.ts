// Quick-capture parsing and price rollups.
//
// The capture field stays one field — anything that looks like a link or a
// currency-marked amount is lifted out of what you typed and filed as the
// idea's link and price. Paste a product URL with "$40" in front of it and
// you get a titled, priced, linked idea in the same two taps.

import { normaliseUrl } from './db'

export interface Captured {
  title: string
  price: string
  links: string[]
}

const URL_RE = /\bhttps?:\/\/\S+/gi
/** bare domains, so "amazon.com/dp/x" works without the scheme */
const BARE_URL_RE = /\b(?:www\.[^\s]+|[a-z0-9-]+\.(?:com|co\.uk|net|org|io|shop|store|dev)(?:\/[^\s]*)?)/gi
/**
 * Only a currency-marked amount counts. "200 piece puzzle" keeps its 200;
 * "$200" does not. Ranges ("$40-60") survive as one price.
 */
const PRICE_RE = /(?:^|\s)([$£€¥]\s?\d[\d.,]*(?:\s?[-–]\s?[$£€¥]?\d[\d.,]*)?)(?=\s|$)/

export function parseCapture(raw: string): Captured {
  let s = ` ${raw.trim()} `
  const links: string[] = []

  const take = (re: RegExp) => {
    s = s.replace(re, (m) => {
      // bare domains need a scheme or the <a href> resolves relative to the app
      links.push(normaliseUrl(m.replace(/[),.]+$/, '')))
      return ' '
    })
  }
  take(URL_RE)
  take(BARE_URL_RE)

  let price = ''
  const pm = s.match(PRICE_RE)
  if (pm) {
    price = pm[1].replace(/\s+/g, '')
    s = s.replace(pm[1], ' ')
  }

  const title = s.replace(/\s+/g, ' ').trim().replace(/^[-–·,]+|[-–·,]+$/g, '').trim()
  return { title, price, links }
}

/** One number out of a free-text price ("$40-ish" → 40). */
function amount(price: string): { sym: string; n: number } | null {
  const m = price.match(/([$£€¥])?\s?(\d[\d.,]*)/)
  if (!m) return null
  const n = parseFloat(m[2].replace(/,/g, ''))
  return Number.isFinite(n) ? { sym: m[1] ?? '', n } : null
}

/**
 * What a category costs, rolled up from its candidates: "$249–328", or just
 * "$52" when they agree. A category has no price of its own — the prices live
 * on the versions underneath it, and this is how the list gets to show them.
 */
export function priceRange(prices: string[]): string {
  const parsed = prices.map(amount).filter((p): p is { sym: string; n: number } => !!p)
  if (!parsed.length) return ''
  const sym = parsed.find((p) => p.sym)?.sym ?? ''
  const nums = parsed.map((p) => p.n).sort((a, b) => a - b)
  const lo = nums[0]
  const hi = nums[nums.length - 1]
  const num = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2))
  // the symbol leads the range once: "$249–328", not "$249–$328"
  return lo === hi ? sym + num(lo) : `${sym}${num(lo)}–${num(hi)}`
}
