/**
 * Supplier-name extractor for Standard Bank statement descriptions.
 *
 * Bank lines look like:
 *   CHEQUE CARD PURCHASE - MAKRO STREUBE 4278*0900 15 MAR
 *   DEBIT CARD PURCHASE FROM - HPY*HAPPY MOTORS SPARE CHANEN
 *   IB PAYMENT TO - LESEDI MASOKO MASSAGE BED
 *   PAYSHAP PAYMENT FROM - THULI
 *
 * We strip the bank's framing tokens and surface the merchant string in the
 * middle. The output is heuristic — fuzzy-matching against known suppliers and
 * a human review step compensate for misses.
 */

// Order matters: longer prefixes first so they win the `startsWith` race.
const PREFIXES = [
  'CELLPHONE INSTANTMON CASH TO - ',
  'IMMEDIATE INTERACCOUNT TRF - ',
  'ELECTRONIC ACCOUNT PAYMENT - ',
  'ELECTRONIC TRF-CREDIT CARD - ',
  'IB PAYMENT TO BIZFLEX LOAN - ',
  'DEBIT CARD PURCHASE FROM - ',
  'PAYSHAP PAYMENT FROM - ',
  'PAYSHAP PAYMENT TO - ',
  'CHEQUE CARD PURCHASE - ',
  'REAL TIME TRANSFER - ',
  'IB TRANSFER FROM - ',
  'CREDIT TRANSFER - ',
  'FAST EFT FROM - ',
  'EFT PAYMENT TO - ',
  'DEBIT TRANSFER - ',
  'MAGTAPE CREDIT - ',
  'MAGTAPE DEBIT - ',
  'IB TRANSFER TO - ',
  'IB PAYMENT FROM - ',
  'FAST PAYMENT - ',
  'IB PAYMENT TO - ',
  'ACB CREDIT - ',
  'ACB DEBIT - ',
  'EXT - ',
]

// Processor / aggregator prefixes that sit in front of the actual merchant name.
const MERCHANT_TAG_PREFIXES = ['HPY*', 'S2S*', 'PP *', 'PP*', 'DNH*', 'C*', 'I*', 'SP*']

// Descriptions that are bank charges or otherwise synthetic — never a supplier.
const SKIP_SUBSTRINGS = [
  'MONTHLY MANAGEMENT FEE',
  'OVERDRAFT INTEREST',
  'OVERDRAFT SERVICE FEE',
  'FEE - DEBIT ORDER',
  'FEE IMMEDIATE PAYMENT',
  'FEE-ELECTRONIC ACCOUNT PAYMENT',
  'FEE-CHEQ CARD PURCHASE',
  'DEBIT CARD PURCHASE FEE',
  'FEE: UNUSED FACILITY',
  'FEE: PREPAID MOBILE PURCHASE',
  'FEE: PAYSHAP',
  'FEE: PAYMENT CONFIRM',
  'FEE: ANNUAL REVIEW',
  'MYUPDATES FOR BUSINESS',
  'UCOUNT',
  '#INTERNATIONAL',
  '#INTL',
  'MEMBERSHIP FEE',
  'FEE - INSTANT MONEY',
  'INSTANT MONEY',
  'PREPAID MOBILE PURCHASE',
  'VAS00',
  'DEPOSIT - ',
  'OPENING BALANCE',
  'CLOSING BALANCE',
  // Bank-internal lines that look like merchants but aren't
  'BIZFLEX LOAN',
  'INTL TRANS FE',
  'OVERDRAFT FACILITY',
]

const LONG_MONTH = /\b(JANUARY|FEBRUARY|MARCH|APRIL|MAY|JUNE|JULY|AUGUST|SEPTEMBER|OCTOBER|NOVEMBER|DECEMBER)\b/
const PHONE_LIKE = /^\d{9,11}(\s|$)/      // 0603095371 ...
const STARTS_WITH_DATE = /^\d{1,2}\s+(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC|JANUARY|FEBRUARY|MARCH|APRIL|MAY|JUNE|JULY|AUGUST|SEPTEMBER|OCTOBER|NOVEMBER|DECEMBER)/

const MONTH_TOKEN = /\b(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\b/
const CARD_STUB = /\s+\d{4}\*\d{2,4}.*$/  // "4278*0900 15 MAR"
const TRAILING_DATE = /\s+\d{1,2}\s+(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC).*$/
const TRAILING_LONGDATE = /\s+\d{1,2}\s+(?:JANUARY|FEBRUARY|MARCH|APRIL|MAY|JUNE|JULY|AUGUST|SEPTEMBER|OCTOBER|NOVEMBER|DECEMBER)\s+\d{4}\s*$/
const TRAILING_NUMERIC = /\s+\d{6,}\s*$/   // long numeric refs
const TIMESTAMP_TOKEN = /\s+\d{1,2}H\d{2}\s*$/
const ONLY_DIGITS_OR_NOISE = /^[\d\s*#.\-/_]+$/

export type ExtractResult = {
  merchant: string | null
  reason?: 'skip' | 'empty' | 'numeric_only' | 'too_short' | 'date_only'
}

export function extractMerchantName(rawDescription: string): ExtractResult {
  if (!rawDescription) return { merchant: null, reason: 'empty' }
  const upper = rawDescription.trim().toUpperCase().replace(/\s+/g, ' ')
  if (!upper) return { merchant: null, reason: 'empty' }

  // Skip-list: bank fees etc. never become suppliers.
  for (const skip of SKIP_SUBSTRINGS) {
    if (upper.includes(skip)) return { merchant: null, reason: 'skip' }
  }

  // Pure date descriptions (e.g. "CHEQUE CARD PURCHASE - 20 February 2026")
  // — strip the prefix and check what's left
  let remainder = upper
  for (const prefix of PREFIXES) {
    if (remainder.startsWith(prefix)) {
      remainder = remainder.slice(prefix.length)
      break
    }
  }

  // Strip card stubs, trailing dates, timestamps, long numeric refs
  remainder = remainder
    .replace(CARD_STUB, '')
    .replace(TRAILING_LONGDATE, '')
    .replace(TRAILING_DATE, '')
    .replace(TIMESTAMP_TOKEN, '')
    .replace(TRAILING_NUMERIC, '')
    .trim()

  // Strip merchant-tag prefixes
  for (const tag of MERCHANT_TAG_PREFIXES) {
    if (remainder.startsWith(tag)) {
      remainder = remainder.slice(tag.length).trim()
      break
    }
  }

  // If what's left is just a date, all numbers, or empty — bail
  if (!remainder) return { merchant: null, reason: 'empty' }
  if (ONLY_DIGITS_OR_NOISE.test(remainder)) return { merchant: null, reason: 'numeric_only' }
  if (PHONE_LIKE.test(remainder)) return { merchant: null, reason: 'numeric_only' }
  if (remainder.length < 3) return { merchant: null, reason: 'too_short' }

  // If it's date-only after stripping (e.g. "20 FEBRUARY 2026", "15 MAR")
  if (STARTS_WITH_DATE.test(remainder)) return { merchant: null, reason: 'date_only' }
  if (LONG_MONTH.test(remainder) && /^\d/.test(remainder)) return { merchant: null, reason: 'date_only' }
  if (MONTH_TOKEN.test(remainder) && /^\d/.test(remainder)) return { merchant: null, reason: 'date_only' }

  // Collapse whitespace, title-case for readability
  const merchant = remainder.replace(/\s+/g, ' ').trim()
  return { merchant: titleCaseMerchant(merchant) }
}

function titleCaseMerchant(s: string): string {
  return s
    .split(' ')
    .map((w) => {
      if (w.length <= 2) return w // keep AB, OS, SA, etc.
      if (/^\d/.test(w)) return w // numeric tokens stay
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
    })
    .join(' ')
}
