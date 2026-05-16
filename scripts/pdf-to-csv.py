#!/usr/bin/env python3
"""
Convert Standard Bank PDF statements to BMS-importable CSV.

Usage:
  python3 pdf-to-csv.py <input.pdf> [output.csv]
  python3 pdf-to-csv.py --batch <input-dir> <output-dir>

CSV format expected by BMS:
  Date, Description, Amount, Balance
  - Date: "DD Mon YYYY" (e.g. "02 Apr 2025")
  - Amount: negative for debits, positive for credits (no thousands separator)
  - Balance: same numeric convention

Requires `pdftotext` (poppler-utils) in PATH.
"""

import re
import sys
import csv
import subprocess
from pathlib import Path
from datetime import datetime

MONTH_NUM = {
    'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'may': 5, 'jun': 6,
    'jul': 7, 'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12,
    'january': 1, 'february': 2, 'march': 3, 'april': 4, 'june': 6,
    'july': 7, 'august': 8, 'september': 9, 'october': 10,
    'november': 11, 'december': 12,
}
MONTH_ABBR = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
              'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

DATA_LINE_RE = re.compile(
    r'^(.+?)\s+'
    r'(?:##\s+)?'
    r'([\d,]+\.\d{2})(-?)\s+'
    r'(\d{2})\s+(\d{2})\s+'
    r'([\d,]+\.\d{2})(-?)\s*$'
)

# Special pattern for BALANCE BROUGHT FORWARD lines — no transaction amount, only date + balance
BBF_LINE_RE = re.compile(
    r'^(BALANCE BROUGHT FORWARD|OPENING BALANCE)\s+'
    r'(\d{2})\s+(\d{2})\s+'
    r'([\d,]+\.\d{2})(-?)\s*$'
)

PERIOD_RE = re.compile(
    r'Statement from\s+(\d{1,2})\s+(\w+)\s+(\d{4})\s+to\s+(\d{1,2})\s+(\w+)\s+(\d{4})',
    re.IGNORECASE,
)

LETTER_RE = re.compile(r'[A-Za-z]')

# Lines that look like data but should be skipped
SKIP_ACTION_KEYWORDS = (
    'BALANCE BROUGHT FORWARD',
    'BALANCE CARRIED FORWARD',
    'OPENING BALANCE',
    'CLOSING BALANCE',
)

# Detail-line noise that should never be appended to descriptions
DETAIL_NOISE = (
    'Please verify', 'Please visit', 'Standard Bank', 'VAT Reg',
    'Code of Banking', 'Ombudsman', 'CLEARWATER', 'PO BOX', 'MARSHALLTOWN',
    'Business Banking', 'KGOLAENTLE', 'WHISPERING', 'TROPIC BIRD',
    'BLAIRGOWRIE', 'CHANENG', 'BANK STATEMENT', 'BIZLAUNCH',
    'Account Number', 'Month-end Balance', 'Statement / Invoice',
    'Statement Frequency', 'Statement from', 'Details', 'Debits',
    'Credits', 'Service Fee', 'Page ', 'These fees include',
    'Limit Structure', 'Overdraft Details', 'VAT Summary',
    'Account Summary', 'This document constitutes',
    '##  These', 'e-mail:', 'Authorised financial', 'Bank Statement',
    'Up to R', 'Above R', 'Review Date', 'visit www.', 'subject to',
    'STAND NO', 'BizDirect Contact', 'Statement No:', 'Customer Care',
    'Total charge amount', 'Total VAT',
    'Balance outstanding', 'Balance at date', 'Current Limit',
    'Arranged Limit', 'Summary of Transactions',
    'Nett Payment Received', 'MONTHLY EMAIL',
    'subscribe to the Code', 'on this statement and notify',
    'view the terms and conditions',
)


def parse_amount(s, sign):
    val = float(s.replace(',', ''))
    return -val if sign == '-' else val


def infer_year(month, day, period_from, period_to):
    """Pick whichever statement-period year contains (month, day)."""
    for candidate_year in (period_from.year, period_to.year):
        try:
            d = datetime(candidate_year, month, day)
        except ValueError:
            continue
        if period_from <= d <= period_to:
            return candidate_year
    # Fallback
    return period_from.year if month >= period_from.month else period_to.year


def is_noise(line: str) -> bool:
    return any(noise in line for noise in DETAIL_NOISE)


RANGE_RE = re.compile(
    r'Transaction date range:\s*(\d{1,2})\s+(\w+)\s+(\d{4})\s*[-–]\s*(\d{1,2})\s+(\w+)\s+(\d{4})',
    re.IGNORECASE,
)

# 3-month statement row formats. The Date can also wrap with the description above it.
# Try both single-line and split formats.
THREE_MONTH_DATE_RE = re.compile(r'^\s*(\d{1,2})\s+(\w{3})\s+')
# Capture signed amounts inline. Standard Bank's 3-month uses space as thousands separator
# and a separated +/- sign: e.g. "+ 8 198.42" or "- 1 025.99" or "-40 836.48" (balance).
SIGNED_AMOUNT_RE = re.compile(r'([+-])\s*(\d[\d\s]*\.\d{2})')
# Balance is the LAST signed number on the line (could be like "-40 836.48")
BALANCE_AT_END_RE = re.compile(r'(-?\d[\d\s]*\.\d{2})\s*$')


def parse_3month_pdf(text: str, pdf_path: Path):
    """Parse a Standard Bank '3-month statement' style PDF."""
    m = RANGE_RE.search(text)
    if not m:
        raise ValueError(f"No date range found in 3-month statement: {pdf_path}")
    period_from = datetime(int(m.group(3)), MONTH_NUM[m.group(2).lower()], int(m.group(1)))
    period_to = datetime(int(m.group(6)), MONTH_NUM[m.group(5).lower()], int(m.group(4)))

    rows = []
    opening_balance = None
    closing_balance = None
    last_balance = None
    current_year = period_from.year

    lines = text.split('\n')
    # Pre-scan: capture year markers (lines containing JUST a year)
    i = 0
    while i < len(lines):
        line = lines[i].rstrip()
        stripped = line.strip()

        # Year marker line
        if re.fullmatch(r'\d{4}', stripped):
            current_year = int(stripped)
            i += 1
            continue

        # Date prefix line
        date_match = THREE_MONTH_DATE_RE.match(line)
        if not date_match:
            i += 1
            continue

        day = int(date_match.group(1))
        mon_abbr = date_match.group(2).lower()
        if mon_abbr not in MONTH_NUM:
            i += 1
            continue
        month = MONTH_NUM[mon_abbr]

        # Year inference — usually the most recent "year marker", but verify
        try:
            tx_date = datetime(current_year, month, day)
        except ValueError:
            i += 1
            continue

        # Collect the full text of this row + any wrapped description lines.
        # Description wraps appear ABOVE or AT the date line, then continue below.
        # Heuristic: the date appears in the leftmost column when present;
        # wrapped continuation lines have NO date prefix.

        # Build content: date line + any continuation lines (until next date or blank)
        content_parts = [line]
        j = i + 1
        while j < len(lines):
            nxt = lines[j].rstrip()
            if not nxt.strip():
                break
            if THREE_MONTH_DATE_RE.match(nxt):
                break
            if re.fullmatch(r'\d{4}', nxt.strip()):
                break
            content_parts.append(nxt)
            j += 1

        content = ' '.join(p.strip() for p in content_parts).strip()
        # Remove the leading "DD Mon" from the content
        content = re.sub(r'^\d{1,2}\s+\w{3}\s+', '', content)

        # Extract balance (last signed number on the row)
        bal_m = BALANCE_AT_END_RE.search(content)
        if not bal_m:
            i = j
            continue
        balance_raw = bal_m.group(1).replace(' ', '')
        try:
            balance = float(balance_raw)
        except ValueError:
            i = j
            continue

        # Description is everything before any signed amount (or balance)
        first_amount_match = SIGNED_AMOUNT_RE.search(content)
        if first_amount_match:
            desc_text = content[:first_amount_match.start()].strip()
        else:
            desc_text = content[:bal_m.start()].strip()

        # Find the SIGNED amount that represents the transaction (In/Out/Bank fees columns)
        signed = SIGNED_AMOUNT_RE.findall(content[:bal_m.start()])
        # First signed amount before the balance is the txn amount
        if not signed:
            # Try opening balance / no-amount row
            if 'opening' in desc_text.lower() or 'balance brought forward' in desc_text.lower():
                if opening_balance is None:
                    opening_balance = balance
                last_balance = balance
            i = j
            continue

        sign, num_raw = signed[0]
        amount = float(num_raw.replace(' ', '')) * (-1 if sign == '-' else 1)

        # Skip "OPENING BALANCE" if it appears with zero amount
        if 'opening balance' in desc_text.lower():
            if opening_balance is None:
                opening_balance = balance
            last_balance = balance
            i = j
            continue
        if 'closing balance' in desc_text.lower():
            closing_balance = balance
            i = j
            continue

        # Clean description — remove the trailing transaction-type descriptor (after " - ")
        # The 3-month format has descriptions like "MERCHANT - credit card purchase"
        # while the monthly format has "ACTION - MERCHANT". For consistency we don't reorder.

        rows.append({
            'Date': f"{tx_date.day:02d} {MONTH_ABBR[tx_date.month]} {tx_date.year}",
            'Description': desc_text,
            'Amount': f"{amount:.2f}",
            'Balance': f"{balance:.2f}",
        })
        last_balance = balance
        i = j

    if closing_balance is None:
        closing_balance = last_balance

    return rows, opening_balance, closing_balance


def parse_pdf(pdf_path: Path):
    """Return (list of {Date, Description, Amount, Balance}, opening_balance, closing_balance)."""
    text = subprocess.check_output(
        ['pdftotext', '-layout', str(pdf_path), '-'],
        text=True,
    )

    # Detect format: 3-month statement uses "Transaction date range:" header
    if RANGE_RE.search(text):
        return parse_3month_pdf(text, pdf_path)

    m = PERIOD_RE.search(text)
    if not m:
        raise ValueError(f"No statement period found in {pdf_path}")

    period_from = datetime(
        int(m.group(3)),
        MONTH_NUM[m.group(2).lower()],
        int(m.group(1)),
    )
    period_to = datetime(
        int(m.group(6)),
        MONTH_NUM[m.group(5).lower()],
        int(m.group(4)),
    )

    lines = text.split('\n')
    rows = []
    opening_balance = None
    closing_balance = None
    last_balance = None

    i = 0
    while i < len(lines):
        line = lines[i].rstrip()

        # Opening balance (no transaction amount)
        bbf = BBF_LINE_RE.match(line)
        if bbf:
            bal = parse_amount(bbf.group(4), bbf.group(5))
            if opening_balance is None:
                opening_balance = bal
            last_balance = bal
            i += 1
            continue

        match = DATA_LINE_RE.match(line)
        if not match:
            i += 1
            continue

        action = match.group(1).strip()
        amount = parse_amount(match.group(2), match.group(3))
        month = int(match.group(4))
        day = int(match.group(5))
        balance = parse_amount(match.group(6), match.group(7))

        upper_action = action.upper()

        if 'BALANCE CARRIED FORWARD' in upper_action or 'CLOSING BALANCE' in upper_action:
            closing_balance = balance
            i += 1
            continue

        try:
            year = infer_year(month, day, period_from, period_to)
            tx_date = datetime(year, month, day)
        except ValueError:
            i += 1
            continue

        # Collect detail from following non-empty, non-noise lines (up to 2)
        detail_parts = []
        j = i + 1
        consumed = 0
        while j < len(lines) and consumed < 3:
            nxt = lines[j].rstrip()
            stripped = nxt.strip()
            if not stripped:
                j += 1
                continue
            if DATA_LINE_RE.match(nxt):
                break
            if is_noise(stripped):
                j += 1
                continue
            # Reject lines without letters (e.g. standalone postal codes, page numbers)
            if not LETTER_RE.search(stripped):
                j += 1
                continue
            detail_parts.append(stripped)
            consumed += 1
            j += 1
            # Stop after first substantive detail (must contain letters AND be longer than 3 chars)
            if len(stripped) > 3:
                break

        detail = ' '.join(detail_parts).strip()
        description = f"{action} - {detail}".strip(' -') if detail else action

        rows.append({
            'Date': f"{tx_date.day:02d} {MONTH_ABBR[tx_date.month]} {tx_date.year}",
            'Description': description,
            'Amount': f"{amount:.2f}",
            'Balance': f"{balance:.2f}",
        })
        last_balance = balance
        i += 1  # advance one, allow detail lines to be re-scanned

    if closing_balance is None:
        closing_balance = last_balance

    return rows, opening_balance, closing_balance


def write_csv(rows, out_path: Path, opening, closing):
    """Write rows + opening/closing balance markers in the CSV format BMS expects."""
    with open(out_path, 'w', newline='') as f:
        w = csv.DictWriter(f, fieldnames=['Date', 'Description', 'Amount', 'Balance'])
        w.writeheader()
        if opening is not None and rows:
            w.writerow({
                'Date': rows[0]['Date'],
                'Description': 'OPENING BALANCE',
                'Amount': '0.00',
                'Balance': f"{opening:.2f}",
            })
        for r in rows:
            w.writerow(r)
        if closing is not None and rows:
            w.writerow({
                'Date': rows[-1]['Date'],
                'Description': 'CLOSING BALANCE',
                'Amount': '0.00',
                'Balance': f"{closing:.2f}",
            })


def main():
    args = sys.argv[1:]
    if not args:
        print(__doc__, file=sys.stderr)
        sys.exit(1)

    if args[0] == '--batch':
        in_dir, out_dir = Path(args[1]), Path(args[2])
        out_dir.mkdir(parents=True, exist_ok=True)
        total = 0
        for pdf in sorted(in_dir.glob('*.pdf')):
            try:
                rows, op, cl = parse_pdf(pdf)
            except Exception as e:
                print(f'  ✗ {pdf.name}: {e}', file=sys.stderr)
                continue
            csv_name = pdf.stem.replace(' ', '_') + '.csv'
            csv_path = out_dir / csv_name
            write_csv(rows, csv_path, op, cl)
            print(f'  ✓ {pdf.name} → {csv_name}  ({len(rows)} rows, OB={op}, CB={cl})')
            total += len(rows)
        print(f'\nTotal rows across {len(list(in_dir.glob("*.pdf")))} PDFs: {total}')
    else:
        pdf = Path(args[0])
        out = Path(args[1]) if len(args) > 1 else pdf.with_suffix('.csv')
        rows, op, cl = parse_pdf(pdf)
        write_csv(rows, out, op, cl)
        print(f'✓ {len(rows)} rows written to {out}  (OB={op}, CB={cl})')


if __name__ == '__main__':
    main()
