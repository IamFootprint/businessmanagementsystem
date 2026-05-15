# Supplier Rules Research — Kgolaentle Holdings
**Generated:** 2026-05-15  
**Updated:** 2026-05-15 (added 9 × 2025 monthly PDFs for full-year confidence calibration)  
**Source data:** Bank PDFs only — May 2025 to Mar 2026 (12 months) + Jan/Feb 2023 (historical context).  
**Bank:** Standard Bank BIZLAUNCH — Account 33 272 236 8  
**Business:** Fastway courier franchise, Chaneng/Rustenburg, North West Province  

> ⚠️ **NOTE ON DATA SOURCES:** The `2025/Jan-Dec 2025.xlsx` file was explicitly excluded at user instruction — its content does not reflect true bank transaction history. All rules below are derived purely from official Standard Bank PDF statements: 9 × 2025 monthly PDFs (Jan–May aggregate, then May, Jun, Jul, Aug, Sep, Oct, Nov, Dec) + 3 × 2026 monthly PDFs (Jan, Feb, Mar) + 2 × 2023 monthly PDFs (Jan, Feb) for historical context.
>
> **Confidence calibration:** Patterns confirmed in 8+ months across 2025–2026 are HIGH confidence. Patterns confirmed in 4–7 months are MEDIUM. Patterns seen in fewer months but with consistent format are LOW–MEDIUM. The 2026 PDFs were given additional weight as they reflect the most current business state.

---

## Summary

| Metric | Value |
|--------|-------|
| Total PDFs processed | 14 (9 × 2025 monthly + 3 × 2026 monthly + 2 × 2023 historical) |
| Statement period covered (current) | Jan 2025 – Mar 2026 (~15 months) |
| Statement period covered (historical) | Dec 2022 – Feb 2023 (2 monthly PDFs) |
| Supplier/pattern rules drafted | 70+ current + 10 historical |
| Primary revenue source | VHH Group (PTY) LTD — Fastway franchise income |
| Largest expense category | Salaries (12+ named recipients across 2025–2026), then Fuel |
| Named staff identified across 2025–2026 | 13 (active turnover throughout the year) |

---

## REVENUE RULES

### R1 — VHH Group / Fastway CF Income
**What it is:** Primary franchise income from VHH Group (Pty) Ltd — the master franchisee of Fastway Couriers South Africa. Payments arrive via EFT, Netcash payroll system, and real-time transfers.  
**Website:** fastway.co.za  
**Category:** Fastway CF Income  
**Transaction type:** REVENUE  
**Description patterns (match ANY):**
- `VHH GROUP`
- `NETCASH071VHH`
- `CF WEEKLY PAYME`
- `VHH GROUP (PTY)1219408263`

**Direction:** CREDIT  
**Frequency:** 2–4 payments/month, sometimes split across same day  
**Typical amount per payment:** R6,995–R9,941 (recent observations)  
**Confidence:** HIGH  
**Auto-review:** YES — core revenue, always same payer  
**Notes:** Some Netcash entries label as "SALARY" but these are still franchise income, not employee salary.

---

### R2 — EFTPOS / Card Machine Settlements (POS Income)
**What it is:** Standard Bank card machine settlements — income from customers paying via card at point of collection/delivery. Two variants: `CR EFTPOS 2KC 2` (credit card transactions) and `DR EFTPOS 2KC 2` (debit card transactions). Both are CREDITS.  
**Category:** Courier Revenue / POS Income *(new category recommended)*  
**Transaction type:** REVENUE  
**Description patterns:**
- `CR EFTPOS 2KC`
- `DR EFTPOS 2KC`
- `CREDIT CARD EFTPOS SETTLEMENT`

**Direction:** CREDIT  
**Frequency:** Multiple settlements per week  
**Typical amount per settlement:** R110–R6,870  
**Confidence:** HIGH  
**Notes:** Appear in CR/DR pairs on same day (same terminal, different card types). Reference numbers increment sequentially.

---

### R3 — CASHFOCUS Settlements
**What it is:** Another payment collection reference — appears to be a separate settlement run from the POS system or a different payment processor.  
**Category:** Courier Revenue / POS Income  
**Transaction type:** REVENUE  
**Description pattern:** `CASHFOCUS`  
**Direction:** CREDIT  
**Frequency:** Irregular  
**Typical amount:** R970 (one observation in current PDFs)  
**Confidence:** MEDIUM (only 1 occurrence in current PDFs)  

---

### R4 — Incoming PayShap / IB Transfers from Individuals
**What it is:** Small ad-hoc payments received via PayShap proxy or IB transfer. Likely individual customers or refunds.  
**Description patterns:**
- `PAYSHAP PAYMENT FROM` (followed by name)
- `KATLEGO TAU` (IB payment from)
- `D NTSHODISHANE`
- `THULI`
- `ABSA BANK CHULUMANCO MAPAPU` (credit transfer)
- `MAGTAPE CREDIT` (followed by name)

**Direction:** CREDIT  
**Typical amount:** R390–R770  
**Confidence:** MEDIUM  
**Notes:** These need manual review per occurrence — could be customer payments, refunds, or personal deposits. Don't auto-categorise.

---

### R5 — Capital Injections (Internal Transfers — NOT Revenue)
**What it is:** Owner depositing money into the business account from another account (capital contribution). Do NOT count as revenue.  
**Description patterns:**
- `IB TRANSFER FROM CAPITAL INJECT`
- `IB TRANSFER FROM STOCK CAPITAL`

**Direction:** CREDIT  
**Transaction type:** TRANSFER (exclude from P&L)  
**Confidence:** HIGH  

---

## EXPENSE RULES — STANDARD BANK FEES

### E1 — Overdraft Interest
**Description pattern:** `OVERDRAFT INTEREST`  
**Category:** Bank Charges  
**Transaction type:** BANK_CHARGE  
**Direction:** DEBIT  
**Frequency:** Monthly  
**Typical amount:** R149–R215/month  
**Confidence:** HIGH (3/3 current PDFs)  
**Auto-review:** YES  

### E2 — Monthly Management Fee
**Description pattern:** `MONTHLY MANAGEMENT FEE`  
**Category:** Bank Charges  
**Transaction type:** BANK_CHARGE  
**Direction:** DEBIT  
**Frequency:** Monthly (end of month)  
**Typical amount:** R300–R315/month  
**Confidence:** HIGH (3/3)  
**Auto-review:** YES  

### E3 — Immediate Payment Fee
**Description pattern:** `FEE IMMEDIATE PAYMENT`  
**Category:** Bank Charges  
**Transaction type:** BANK_CHARGE  
**Direction:** DEBIT  
**Frequency:** Per-transaction (3–6 times/month)  
**Typical amount:** R45/transaction  
**Confidence:** HIGH  
**Auto-review:** YES  

### E4 — Electronic Account Payment Fee
**Description pattern:** `FEE-ELECTRONIC ACCOUNT PAYMENT`  
**Category:** Bank Charges  
**Transaction type:** BANK_CHARGE  
**Direction:** DEBIT  
**Frequency:** Per-transaction  
**Typical amount:** R8.90–R9.30  
**Confidence:** HIGH  
**Auto-review:** YES  

### E5 — Overdraft Service Fee
**Description pattern:** `OVERDRAFT SERVICE FEE`  
**Category:** Bank Charges  
**Transaction type:** BANK_CHARGE  
**Direction:** DEBIT  
**Frequency:** Monthly  
**Typical amount:** R99/month  
**Confidence:** HIGH  
**Auto-review:** YES  

### E6 — Cheque Card / Debit Card Purchase Fee
**Description patterns:**
- `FEE-CHEQ CARD PURCHASE`
- `DEBIT CARD PURCHASE FEE`

**Category:** Bank Charges  
**Transaction type:** BANK_CHARGE  
**Direction:** DEBIT  
**Frequency:** Per-transaction (multiple times daily)  
**Typical amount:** R4.70–R4.90  
**Confidence:** HIGH  
**Auto-review:** YES  

### E7 — Unused Facility Fee
**Description pattern:** `FEE: UNUSED FACILITY`  
**Category:** Bank Charges  
**Transaction type:** BANK_CHARGE  
**Direction:** DEBIT  
**Frequency:** Monthly  
**Typical amount:** R26–R34/month  
**Confidence:** HIGH  
**Auto-review:** YES  

### E8 — Prepaid Top-up Fee
**Description pattern:** `FEE: PREPAID MOBILE PURCHASE`  
**Category:** Bank Charges  
**Transaction type:** BANK_CHARGE  
**Direction:** DEBIT  
**Frequency:** Per-transaction  
**Typical amount:** R0.70–R1.00  
**Confidence:** HIGH  
**Auto-review:** YES  

### E9 — PayShap Fees
**Description patterns:**
- `FEE: PAYSHAP PAY BY PROXY`
- `FEE: PAYSHAP PAYMENT`

**Category:** Bank Charges  
**Transaction type:** BANK_CHARGE  
**Direction:** DEBIT  
**Typical amount:** R2.00/transaction  
**Confidence:** HIGH  
**Auto-review:** YES  

### E10 — International Card Transaction Bank Charges
**Description pattern:** `#INTERNATIONAL4278193343490900`  
**Category:** Bank Charges  
**Transaction type:** BANK_CHARGE  
**Direction:** DEBIT  
**Frequency:** Irregular (triggered by GoDaddy, Facebook, Wix, etc.)  
**Typical amount:** R2.40–R41.49  
**Confidence:** HIGH  
**Notes:** Forex conversion fees on international card transactions.

### E11 — MyUpdates for Business
**Description pattern:** `FEE: MYUPDATES FOR BUSINESS`  
**Category:** Bank Charges  
**Transaction type:** BANK_CHARGE  
**Direction:** DEBIT  
**Frequency:** Monthly  
**Typical amount:** R31.95–R42.50/month  
**Confidence:** HIGH  
**Auto-review:** YES  

### E12 — UCount Membership Fee
**Description pattern:** `MEMBERSHIP FEE` + `UCOUNT` (typically on next line)  
**Category:** Bank Charges  
**Transaction type:** BANK_CHARGE  
**Direction:** DEBIT  
**Frequency:** Monthly  
**Typical amount:** R30/month  
**Confidence:** HIGH  
**Auto-review:** YES  

### E13 — Annual Review Fee
**Description pattern:** `FEE: ANNUAL REVIEW`  
**Category:** Bank Charges  
**Transaction type:** BANK_CHARGE  
**Direction:** DEBIT  
**Frequency:** Annual (observed Feb 2026)  
**Typical amount:** R485  
**Confidence:** MEDIUM  

### E14 — Debit Order Processing Fee
**Description pattern:** `FEE - DEBIT ORDER`  
**Category:** Bank Charges  
**Transaction type:** BANK_CHARGE  
**Direction:** DEBIT  
**Frequency:** Monthly  
**Typical amount:** R20/month  
**Confidence:** HIGH  
**Auto-review:** YES  

### E15 — Email Payment Confirmation Fee
**Description pattern:** `FEE: PAYMENT CONFIRM - EMAIL`  
**Category:** Bank Charges  
**Transaction type:** BANK_CHARGE  
**Direction:** DEBIT  
**Frequency:** Per-payment confirmation requested  
**Typical amount:** R0.80  
**Confidence:** HIGH  

### E16 — Instant Money Send Fee
**Description pattern:** `FEE - INSTANT MONEY`  
**Category:** Bank Charges  
**Transaction type:** BANK_CHARGE  
**Direction:** DEBIT  
**Typical amount:** R30/transaction  
**Confidence:** MEDIUM (1 observation)  

### E17 — Electricity Purchase Fee
**Description pattern:** `FEE: ELECTRICITY PURCHASE`  
**Category:** Bank Charges  
**Transaction type:** BANK_CHARGE  
**Direction:** DEBIT  
**Typical amount:** R1.60  
**Confidence:** MEDIUM  

---

## EXPENSE RULES — INSURANCE / DEBIT ORDERS

### E18 — Bidvest Insurance: Vehicle Premium
**What it is:** Bidvest Insurance vehicle policy premium. Reference 819045252 is the policy number.  
**Website:** bidvestinsurance.co.za  
**Description pattern:** `BDG/BUSINS819045252`  
**Category:** Insurance - Vehicle  
**Transaction type:** EXPENSE  
**Direction:** DEBIT  
**Frequency:** Monthly (last day of month, debit order)  
**Typical amount:** R2,989.45/month  
**Confidence:** HIGH (3/3 current PDFs)  
**Auto-review:** YES  

---

## EXPENSE RULES — FUEL & VEHICLE

### E19 — Global Tlayang Filling Station (and C-Store)
**Description patterns:**
- `GLOBAL TLAYANG FILLING`
- `GLOBAL TLAYANG C-STORE`

**Category:** Fuel & Oil  
**Transaction type:** EXPENSE  
**Direction:** DEBIT  
**Frequency:** Weekly  
**Typical amount:** R1,093–R1,300/fill  
**Confidence:** HIGH (multiple in current PDFs)  
**Auto-review:** YES  

### E20 — River Service Station
**Description pattern:** `RIVER SERVICE STATION`  
**Category:** Fuel & Oil  
**Transaction type:** EXPENSE  
**Direction:** DEBIT  
**Frequency:** Monthly  
**Typical amount:** R1,182–R1,320/fill  
**Confidence:** HIGH  
**Auto-review:** YES  

### E21 — Global Boikhutso Filling Station
**Description pattern:** `GLOBAL BOIKHUTSO FILLI`  
**Category:** Fuel & Oil  
**Transaction type:** EXPENSE  
**Direction:** DEBIT  
**Frequency:** Monthly  
**Typical amount:** R1,124–R1,164/fill  
**Confidence:** HIGH  
**Auto-review:** YES  

### E22 — Engen Mankwe
**Website:** engen.co.za  
**Description pattern:** `ENGEN MANKWE`  
**Category:** Fuel & Oil  
**Transaction type:** EXPENSE  
**Direction:** DEBIT  
**Frequency:** Monthly  
**Typical amount:** R1,281–R1,339/fill  
**Confidence:** HIGH  
**Auto-review:** YES  

### E23 — Engen Sun City
**Description pattern:** `ENGEN SUN CITY`  
**Category:** Fuel & Oil  
**Transaction type:** EXPENSE  
**Direction:** DEBIT  
**Frequency:** Monthly  
**Typical amount:** ~R1,300/fill  
**Confidence:** MEDIUM (1 in current PDFs, more in 2023)  

### E24 — Shalom Petro Wash
**Description pattern:** `SHALOM PETRO WAS`  
**Category:** Fuel & Oil  
**Transaction type:** EXPENSE  
**Direction:** DEBIT  
**Frequency:** Multiple times/month  
**Typical amount:** R974–R1,278/fill  
**Confidence:** HIGH  
**Auto-review:** YES  

### E25 — Obaro Rustenburg FC
**Description pattern:** `OBARO RUSTENBURG`  
**Category:** Fuel & Oil  
**Transaction type:** EXPENSE  
**Direction:** DEBIT  
**Frequency:** Multiple times/month  
**Typical amount:** R1,000–R2,850/fill  
**Confidence:** HIGH (heavy in 2023 PDFs, lighter in 2026)  

### E26 — Other Fuel Stations (catch-all)
**Description patterns:**
- `DIE KRAAL FILLING`
- `BP RIVER`
- `FM BEESTEKRAAL`
- `SHELL SAULSPOORT`
- `BP MOGWASE`
- `BP MIDTOWN`
- `RAPI SERVICE STATION`
- `SHELL N4 PLATINUM`

**Category:** Fuel & Oil  
**Transaction type:** EXPENSE  
**Direction:** DEBIT  
**Frequency:** Irregular  
**Confidence:** MEDIUM  
**Notes:** Less frequent fill-ups. All should still auto-categorise as Fuel & Oil.

### E27 — CNN Korean Parts (vehicle parts)
**Description patterns:**
- `CNN KOREAN PARTS`
- `CNN KOREAN PART`

**Category:** Vehicle Maintenance/Repairs  
**Transaction type:** EXPENSE  
**Direction:** DEBIT  
**Frequency:** Monthly  
**Typical amount:** R700–R1,635/purchase  
**Confidence:** HIGH  
**Auto-review:** YES  

### E28 — HPY* / Happy Motors Spare
**Description pattern:** `HPY*HAPPY MOTORS SPARE`  
**Category:** Vehicle Maintenance/Repairs  
**Transaction type:** EXPENSE  
**Direction:** DEBIT  
**Typical amount:** R380  
**Confidence:** MEDIUM  

### E29 — Glasfit (windscreen)
**Website:** glasfit.co.za  
**Description pattern:** `GLASFIT RUSTENBURG`  
**Category:** Vehicle Maintenance/Repairs  
**Transaction type:** EXPENSE  
**Direction:** DEBIT  
**Frequency:** Occasional  
**Typical amount:** R1,100  
**Confidence:** MEDIUM  

### E30 — Pilanesburg Motors
**Description pattern:** `PILANESBURG MOTORS`  
**Category:** Vehicle Maintenance/Repairs  
**Direction:** DEBIT  
**Typical amount:** R1,344  
**Confidence:** MEDIUM  

### E31 — MR SM Katane (Truck Service)
**Description pattern:** `MR SM KATANE`  
**Category:** Vehicle Maintenance/Repairs  
**Direction:** DEBIT  
**Typical amount:** R600  
**Confidence:** MEDIUM  
**Notes:** Individual mechanic, ad-hoc H100 truck service work.

### E32 — Truck Service (PayShap proxy)
**Description pattern:** `PAYSHAP PAY BY PROXY` + `TRUCK SERVICE`  
**Category:** Vehicle Maintenance/Repairs  
**Direction:** DEBIT  
**Typical amount:** R650  
**Confidence:** MEDIUM  

---

## EXPENSE RULES — COMPLIANCE & LICENCES

### E33 — RTMC (Vehicle Licences online)
**Website:** rtmc.co.za  
**Description pattern:** `RTMC`  
**Category:** Vehicle Licenses  
**Transaction type:** EXPENSE  
**Direction:** DEBIT  
**Frequency:** Annual per vehicle (clustered)  
**Typical amount:** R483  
**Confidence:** HIGH  

### E34 — Traffic Department Rustenburg (Vehicle Licences in-person)
**Description pattern:** `TRAFFIC DEPARTMENT RUSTENBURG`  
**Category:** Vehicle Licenses  
**Transaction type:** EXPENSE  
**Direction:** DEBIT  
**Frequency:** Annual  
**Typical amount:** R1,120  
**Confidence:** MEDIUM  

### E35 — CIPC (Companies Commission)
**Website:** cipc.co.za  
**Description pattern:** `CIPC`  
**Category:** Compliance & Legal *(new category recommended)*  
**Transaction type:** EXPENSE  
**Direction:** DEBIT  
**Frequency:** Annual returns + ad-hoc changes  
**Typical amount:** R200–R1,400  
**Confidence:** HIGH  

---

## EXPENSE RULES — WAGES / SALARIES

### E36 — Thabang John Moreo
**Description patterns (match ANY containing this name):**
- `THABANG JOHN MOREO`
- `THABANG JOHN MORE` (truncated)
- `(numeric prefix) THABANG JOHN MOREO`

**Category:** Wage/Salaries  
**Transaction type:** EXPENSE  
**Direction:** DEBIT  
**Frequency:** Monthly salary + ad-hoc advances  
**Typical amount (salary):** R7,000–R10,000/month  
**Confidence:** HIGH  
**Notes:** Same person also receives smaller amounts (R100–R550) for vehicle repair work — those should be classified as Vehicle Maintenance, not Salary. Amount-threshold logic recommended: >R3,000 = Wage/Salaries; <R3,000 = Vehicle Maintenance/Repairs.

### E37 — Tunnel Mangozvana
**Description pattern:** `TUNNEL MANGOZVANA`  
**Category:** Wage/Salaries  
**Direction:** DEBIT  
**Frequency:** Monthly  
**Typical amount:** R6,539–R10,825/month  
**Confidence:** HIGH (3/3 PDFs)  
**Auto-review:** YES  

### E38 — Irene Sarifo
**Description pattern:** `IRENE SARIFO`  
**Category:** Wage/Salaries  
**Direction:** DEBIT  
**Frequency:** Monthly  
**Typical amount:** R3,602–R7,496/month  
**Confidence:** HIGH (3/3 PDFs)  
**Auto-review:** YES  

### E39 — C Nyoni Charlotte
**Description pattern:** `C NYONI CHARLOTTE`  
**Category:** Wage/Salaries  
**Direction:** DEBIT  
**Frequency:** Monthly  
**Typical amount:** R3,758–R5,819/month  
**Confidence:** HIGH (3/3 PDFs)  
**Auto-review:** YES  

### E40 — Tryness Tembo (new in 2026)
**Description pattern:** `TRYNESS TEMBO`  
**Category:** Wage/Salaries  
**Direction:** DEBIT  
**Frequency:** Monthly  
**Typical amount:** R1,349–R2,024/month  
**Confidence:** HIGH (2/3 of 2026 PDFs)  
**Auto-review:** YES  
**Notes:** Zero occurrences in 2025 — joined in late 2025 / early 2026.

### E40a — Thandeka Ncele (2025 staff)
**Description pattern:** `THANDEKA NCELE`  
**Category:** Wage/Salaries  
**Direction:** DEBIT  
**Frequency:** Monthly in 2025  
**Typical amount:** ~R4,238/month  
**Confidence:** MEDIUM (2 occurrences in 2025 PDFs)  
**Notes:** No occurrences in 2026 PDFs — may have left.

### E40b — Thandekile S Dlamini (2025 staff)
**Description pattern:** `THANDEKILE S DLAMINI`  
**Category:** Wage/Salaries  
**Direction:** DEBIT  
**Typical amount:** R1,206–R3,089/month  
**Confidence:** MEDIUM (2 occurrences in 2025 PDFs)  
**Notes:** Different person from Thandeka Ncele. Status in 2026 unconfirmed.

### E40c — Dorah D Letsholo (2025 staff)
**Description pattern:** `DORAH D LETSHOLO` (sometimes referenced as `NEO LETSHOLO`)  
**Category:** Wage/Salaries  
**Direction:** DEBIT  
**Typical amount:** R1,757–R3,667 per payment  
**Confidence:** MEDIUM (4 occurrences in 2025)  
**Notes:** No occurrences in 2026 — likely left.

### E40d — Monalisa Mhande (2025 staff)
**Description patterns:**
- `MONALISA GRACE MHAND`
- `MS MONALISA MHANDE`
- `MONALISA SAL`

**Category:** Wage/Salaries  
**Direction:** DEBIT  
**Typical amount:** R800–R3,764/month  
**Confidence:** MEDIUM (4+ occurrences across 2025)  
**Notes:** Multiple description formats — use first-name match. No occurrences in 2026.

### E40e — Vongai T Marutsi / Trish (2025 staff)
**Description patterns:**
- `MRS VONGAI T MARUTSI`
- `MRS VONGAI T MARU`
- `TRISH SALARY`

**Category:** Wage/Salaries  
**Direction:** DEBIT  
**Typical amount:** ~R4,028/month  
**Confidence:** MEDIUM (1 large payment + smaller ones in 2025)  
**Notes:** "Trish" is the salary reference. No occurrences in 2026.

### E40f — Yeukai Vera (2025 staff)
**Description pattern:** `MRS YEUKAI VERA`  
**Category:** Wage/Salaries  
**Direction:** DEBIT  
**Typical amount:** ~R1,568/month  
**Confidence:** LOW (2 occurrences in 2025)  
**Notes:** Could be part-time. No occurrences in 2026.

### E40g — Vuyokazi Mjobo (2025 staff)
**Description pattern:** `MISS VUYOKAZI MJOBO`  
**Category:** Wage/Salaries  
**Direction:** DEBIT  
**Typical amount:** R808–R1,044/month  
**Confidence:** LOW (2 occurrences in 2025)  
**Notes:** Likely junior/part-time. No occurrences in 2026.

### E40h — Esethu Jama (once-off contractor)
**Description pattern:** `MS ESETHU JAMA`  
**Category:** Wage/Salaries OR Contractor Fees  
**Direction:** DEBIT  
**Typical amount:** R2,576 once-off  
**Confidence:** LOW (1 occurrence in 2025)  
**Notes:** Treat as contractor/once-off until pattern confirmed.

---

## EXPENSE RULES — COURIER / FREIGHT (B2B)

### E35a — Trans-Natal Express (interstate courier)
**What it is:** Trans-Natal Express — interstate courier/freight company in South Africa. Used regularly throughout 2025 for deliveries between Gauteng and KZN/Natal.  
**Description patterns (match ANY):**
- `C*TRANS NATAL`
- `C*TRANS-NATAL`

**Category:** Courier / Subcontractor Fees *(new sub-category recommended under Vehicle/Operations)*  
**Transaction type:** EXPENSE  
**Direction:** DEBIT  
**Frequency:** Multiple times per month throughout 2025  
**Typical amount:** R176–R863/transaction  
**Confidence:** HIGH (14 occurrences in 2025 PDFs)  
**Notes:** Likely used to fulfil courier jobs Fastway doesn't handle directly. Also appeared in 2023 historical data (different role then — inventory delivery). Currently a sub-contracted courier service.

### E35b — Fastway Couriers (head office payments)
**What it is:** Payments TO Fastway Couriers head office (not the VHH Group revenue). Likely franchise fees or wholesale costs.  
**Description pattern:** `FASTWAY COURIERS`  
**Category:** Franchise Fees *(new category recommended)*  
**Direction:** DEBIT  
**Typical amount:** R1,150 (one observation in 2025; R2,300 in 2023)  
**Confidence:** LOW (occasional)  

---

## EXPENSE RULES — TELECOMS & PREPAID

### E41 — Prepaid Airtime (Telkom & Vodacom & VAS)
**What it is:** Prepaid airtime and data top-ups via Standard Bank's airtime portal (VAS). Multiple phone numbers being topped up — likely staff phones.  
**Description patterns (match ANY):**
- `TELKOM MOBILE`
- `VODACOM 0636670821`
- `VOD PREPAID`
- `VAS00` + digits
- `PREPAID MOBILE PURCHASE`

**Category:** Prepaid Airtime/Data  
**Transaction type:** EXPENSE  
**Direction:** DEBIT  
**Frequency:** Multiple times/month  
**Typical amount:** R12–R250/top-up  
**Confidence:** HIGH (3/3)  
**Auto-review:** YES  

### E42 — Vox Telecom (VoIP)
**Website:** voxtelecom.co.za  
**Description patterns:**
- `VOX TELECOMMS`
- `VOX TELECOMMS VOIP LINE`

**Category:** Telecommunications *(new category recommended)*  
**Transaction type:** EXPENSE  
**Direction:** DEBIT  
**Frequency:** Monthly  
**Typical amount:** R500–R600/month  
**Confidence:** HIGH (3/3)  
**Auto-review:** YES  

---

## EXPENSE RULES — SUBSCRIPTIONS / SOFTWARE / MARKETING

### E43 — GoDaddy (Domain Registrar)
**Website:** godaddy.com  
**Description patterns:**
- `DNH*GODADDY`
- `GODADDY`

**Category:** Software & Subscriptions *(new category recommended)*  
**Transaction type:** EXPENSE  
**Direction:** DEBIT  
**Frequency:** Multiple charges per month (multiple domains)  
**Typical amount:** R102–R332/charge  
**Confidence:** HIGH  
**Auto-review:** YES  

### E44 — Wix.com (Website Builder)
**Website:** wix.com  
**Description pattern:** `WIX.COM`  
**Category:** Software & Subscriptions  
**Transaction type:** EXPENSE  
**Direction:** DEBIT  
**Frequency:** Monthly  
**Typical amount:** R198–R203/month  
**Confidence:** HIGH  
**Auto-review:** YES  

### E45 — MyAppointment / Opulent
**Description pattern:** `MYAPPTMENTMY`  
**Category:** Software & Subscriptions  
**Transaction type:** EXPENSE  
**Direction:** DEBIT  
**Frequency:** Monthly  
**Typical amount:** R560/month  
**Confidence:** HIGH (2/3)  
**Notes:** Likely OpulenMD or similar appointment booking SaaS.

### E46 — Facebook / Meta Ads
**Website:** facebook.com  
**Description pattern:** `FACEBK`  
**Category:** Marketing & Advertising *(new category recommended)*  
**Transaction type:** EXPENSE  
**Direction:** DEBIT  
**Frequency:** Monthly / per-campaign  
**Typical amount:** R87–R1,509  
**Confidence:** HIGH  
**Notes:** Campaign codes change per ad (`FACEBK *ZJ5LG`, `FACEBK *CVJPP`, `FACEBK *AD6XW`, `FACEBK *M5TF9`). Use `FACEBK` prefix to catch all.

### E46a — Jetline (Printing / Signage)
**What it is:** Jetline — South African print and signage chain. Likely used for marketing material, vehicle signage, or business cards.  
**Website:** jetline.co.za  
**Description pattern:** `JETLINE CONST`  
**Category:** Marketing & Advertising  
**Direction:** DEBIT  
**Frequency:** Occasional  
**Typical amount:** R244/order  
**Confidence:** MEDIUM (5 occurrences across 2025)  

### E46b — Multiple Hub (subscription)
**Description pattern:** `MULTIPLE HUB`  
**Category:** Software & Subscriptions *(likely)* — needs user confirmation  
**Direction:** DEBIT  
**Frequency:** Occasional monthly  
**Typical amount:** R95  
**Confidence:** MEDIUM (3 occurrences across 2025)  
**Notes:** Unknown service — possibly a hub/internet provider or business directory subscription.

### E46c — PayFast Subscriptions (via PayFast as billing rail)
**What it is:** Two subscriptions billed through PayFast — `PAYFAST*LUSCI` and `PAYFAST*MY AP`. PayFast is a payment gateway; merchants use it to charge customers, so these are subscriptions to "Luscious-something" and "My Appointment" billed via PayFast.  
**Description pattern:** `PAYFAST*`  
**Category:** Software & Subscriptions  
**Direction:** DEBIT  
**Typical amount:** R552–R758  
**Confidence:** LOW (3 occurrences)  
**Notes:** Distinct from the historical PayFast revenue (CREDIT) of the e-commerce era. Investigate what these are.

### E46d — MyAppointment (initial/setup payment)
**Description pattern:** `MYAPPOINTMENT`  
**Category:** Software & Subscriptions  
**Direction:** DEBIT  
**Typical amount:** R2,150 once-off (likely setup) — plus the monthly R560 (`MYAPPTMENTMY` see E45)  

---

## EXPENSE RULES — OFFICE / BUSINESS SUPPLIES

### E46e — Makro Strubenvale (business supplies)
**What it is:** Makro Strubenvale branch — wholesale business supplies. The `C*` prefix indicates card processor.  
**Description pattern:** `C*MAKRO STREU` (also see `MAKRO` matches below for non-prefixed)  
**Category:** Office Supplies *(new category recommended)*  
**Direction:** DEBIT  
**Frequency:** Multiple times in 2025  
**Typical amount:** R182–R580  
**Confidence:** HIGH (7 occurrences across 2025 PDFs)  
**Notes:** Distinguishes business supplies from `MAKRO STREUBE` (which appears in 2026 PDFs separately).

### E46f — TB Machines
**Description pattern:** `TB MACHINES`  
**Category:** Vehicle Maintenance/Repairs OR Office Equipment — needs review  
**Direction:** DEBIT  
**Typical amount:** R950  
**Confidence:** LOW (2 occurrences in 2025)  

### E46g — Department of Labour: UIF Registration
**What it is:** Department of Employment and Labour — Unemployment Insurance Fund registration / contributions.  
**Description pattern:** `DEPT OF LABOUR UIF`  
**Category:** Compliance & Legal  
**Direction:** DEBIT  
**Typical amount:** R2,167 once-off (likely registration fee)  
**Confidence:** LOW (1 occurrence in 2025)  
**Notes:** May trigger annually for contributions once registered.

---

### E47 — Takealot (dual-mode — sales revenue early 2025, then fees only)
**Website:** takealot.com  
**Description pattern:** `TAKEALOT`  
**Category split by direction:**
- **CREDIT** (revenue from Takealot sales) → E-commerce Revenue *(only seen in Jan–May 2025 — R142–R846 per settlement)*
- **DEBIT** (Takealot seller fees) → Software & Subscriptions or Marketing Fees *(only seen in 2026 — R466–R506/month)*

**Direction:** Both — split by direction!  
**Confidence:** MEDIUM  
**Notes:** Important — direction-aware classification is required. Until mid-2025 this was income (active Takealot store); from late 2025 onward it's a small recurring DEBIT (seller platform subscription) with no inbound revenue. **The amount and direction together tell you which era a transaction belongs to.**

---

## EXPENSE RULES — RENT

### E48 — Seeff Properties
**Website:** seeff.com  
**Description patterns:**
- `SEEFF JHB NORTH WEST`
- `(numeric prefix) SEEFF JHB NORTH WEST`

**Category:** Rent *(new category recommended)*  
**Transaction type:** EXPENSE  
**Direction:** DEBIT  
**Frequency:** Monthly (sometimes multiple payments same month)  
**Typical amount:** R8,825–R26,000  
**Confidence:** MEDIUM  
**Notes:** Amounts vary significantly. Could be business premises rent + residential rent, or deposit + first rent. **Needs user review to confirm and possibly split into multiple rules.**

### E49 — J Govender / Opulent Rent
**Description pattern:** `J GOVENDER OPULENT RENT`  
**Category:** Rent  
**Transaction type:** EXPENSE  
**Direction:** DEBIT  
**Frequency:** Monthly  
**Typical amount:** R8,800/month (fixed)  
**Confidence:** HIGH (3/3)  
**Auto-review:** YES  
**Notes:** Private landlord, fixed monthly amount. Likely residential.

---

## RULES FLAGGED — NEEDS USER REVIEW / LIKELY PERSONAL

These appear regularly on the business account but look like personal expenditure. Recommendation: flag as `isPersonal: true` or create an `OWNER_DRAW` category so they're excluded from business P&L. Frequency now calibrated against 12 months of 2025–2026 PDFs.

| Description pattern | Likely classification | Months seen | Typical amount |
|---------------------|----------------------|-------------|----------------|
| `PLANET NAILS` | Personal — Beauty | 9/9 of 2025 + 3/3 of 2026 | R129–R1,270 |
| `BESTCO LIFEST` | Personal — Lifestyle | 8/9 of 2025 | R18–R241 |
| `BLING GIRL*` | Personal — Clothing | 6/9 of 2025 + 2026 | R185–R2,064 |
| `CRAZY PLASTIC` | Personal — Household | 6/9 of 2025 + 2026 | R69–R580 |
| `NETFLIX.COM` | Personal — Streaming | 2/9 of 2025 | R199/month |
| `PP *SHOWMAX` | Personal — Streaming | 5+ of 2025 | ~R99/month |
| `I SPA` | Personal — Beauty/Spa | 3/9 of 2025 | R440/visit |
| `LIQUORSHOP` | Personal — Liquor | 2/9 of 2025 | varies |
| `PNB KRUGERSDO` / `PNP CRP ` | Personal — Pick n Pay | 7 occurrences in 2025 | varies |
| `CONSTANTIA SU` | Personal — SuperSpar Constantia | 2/9 of 2025 | varies |
| `IK *ANTHONYS` | Personal — Anthony's | 2/9 of 2025 | varies |
| `C*LIME LIGHT` | Personal — Lime Light | 2/9 of 2025 | varies |
| `DISCHEM` / `CLICKS KWENA` | Personal — Pharmacy | Occasional | R195–R353 |
| `WIMPY` / `KFC` | Personal — Food | Occasional 2026 | R325–R1,578 |
| `KISS AND MISS` | Personal — Clothing | Once 2026 | R2,171 |
| `JULLIE BEAUTY` | Personal — Beauty | Once 2026 | R156 |
| `S2S*PARTYGIFT` | Personal | Once 2026 | R169 |
| `SHOP 26C CHIN` | Personal | Once 2026 | R982 |
| `GAOYA FURNITU` | Personal/Office furniture | Occasional | R260–R2,400 |
| `AB STORE 1` | Personal — Fashion | Once 2026 | R400–R610 |
| `CHECKERS ALLE` / `SUPERSPAR` | Personal — Groceries | Occasional | R193–R275 |
| `CURTAIN STUDI` / `HPY*Z & I CUR` | Personal/Office | Once | R200–R2,650 |
| `LESEDI MASOKO MASSAGE BED` | Personal | Once | R900 |
| `HYPERLAND HIL` | Mixed | Once | R1,218 |
| `VALUECO CLEAR` | Personal | Once | R630 |
| `BWH STRUBENSV` | Possibly business travel — Best Western Hotel | Once | R1,099 |
| `BIDVEST WALTO` | Office Supplies (Waltons) | Once | R224 |
| `ASHAR ALI INV` | Unknown invoice — investigate | Once | R3,000 |
| `CELLPHONE INSTANTMON CASH TO` | Cash send to individual | 4/9 of 2025 | varies |
| `QS TRADING GAOYA F PATIO COUCH` | Once-off furniture | Once | R6,800 |

---

## INTERNAL / TRANSFER RULES (NOT P&L)

### T1 — Credit Card Settlement to own collections account
**Description pattern:** `ELECTRONIC TRF - CREDIT CARD` + `KGOLAENTLE COLLECTIONS`  
**Direction:** DEBIT  
**Transaction type:** TRANSFER  
**Confidence:** HIGH  
**Notes:** Internal transfer to pay credit card balance.

### T2 — Capital Movements
**Description patterns:** `IB TRANSFER FROM CAPITAL INJECT`, `IB TRANSFER TO CAPITAL REIM`, `IB TRANSFER FROM STOCK CAPITAL`  
**Direction:** Both  
**Transaction type:** TRANSFER  
**Confidence:** HIGH  
**Notes:** Owner injecting/withdrawing capital — exclude from revenue/expense.

---

## RECOMMENDED NEW CATEGORIES

| Category Name | Type | Justification |
|--------------|------|---------------|
| **Telecommunications** | EXPENSE | Vox VoIP — separate from prepaid airtime |
| **Software & Subscriptions** | EXPENSE | GoDaddy, Wix, MyAppointment, Takealot seller fees |
| **Marketing & Advertising** | EXPENSE | Facebook Ads |
| **Rent** | EXPENSE | Seeff, J Govender — significant monthly cost |
| **Compliance & Legal** | EXPENSE | CIPC annual returns |
| **Owner Drawings** | OWNER_DRAW | Personal expenses on business account |
| **Courier Revenue / POS Income** | REVENUE | Separate POS settlements from franchise income |
| **Electricity** | EXPENSE | Prepaid electricity (VAS) |

---

## HISTORICAL CONTEXT — 2023 BUSINESS ERA

The 2023 statements (Jan & Feb only) reveal the business operated differently three years ago. These rules apply **only if 2023 statements are ever imported for back-fill**.

### Business Model Shift
| Era | Revenue Model |
|-----|---------------|
| **2023** | E-commerce (Takealot seller + Shopify store) selling furniture, rugs, home decor — sourcing from wholesale suppliers. Same Fastway Rustenburg franchise existed in parallel, paid monthly in lumps as `FASTWAY RBG`. |
| **2024 transition** | Fastway acquired by VHH Group; payment master switches. |
| **2025–2026** | Pure Fastway franchise via VHH Group (weekly Netcash payments). E-commerce side-line wound down — only residual Takealot seller fees remain. |

### H1 — FASTWAY RBG (legacy Fastway Rustenburg)
**Description pattern:** `FASTWAY RBG`  
**Category:** Fastway CF Income  
**Direction:** CREDIT  
**Amount:** R40k–R50k once/month  
**Confidence:** HIGH (2/2 PDFs)  

### H2 — PayFast (legacy online payment gateway)
**Website:** payfast.io  
**Description pattern:** `PAYFAST`  
**Category:** E-commerce Revenue *(historical only)*  
**Direction:** CREDIT  
**Amount:** R375–R6,332 per settlement  
**Confidence:** HIGH  

### H3 — Shopify (legacy — wound down late 2025)
**Description patterns:**
- `SHOPIFY*` (e.g. `SHOPIFY* 3634`, `SHOPIFY* 3883`, `SHOPIFY* 4013`)

**Category:** Software & Subscriptions (historical)  
**Direction:** DEBIT  
**Amount:** R11–R172  
**Confirmed timeline:** Active throughout 2025 (13 occurrences across 7 of 9 monthly PDFs). Zero occurrences in 2026 PDFs.  
**Notes:** Multiple Shopify store IDs visible (3634, 3883, 4013) — they ran multiple Shopify stores during 2025. Charged from Dublin in USD. Wound down by late 2025.

### H4 — Intuit QuickBooks (legacy — ended mid-2025)
**Description patterns:** `INTUIT *QB`, `INTUIT *QBOOK`  
**Category:** Software & Subscriptions (historical)  
**Direction:** DEBIT  
**Amount:** R8.50–R523  
**Confirmed timeline:** Only seen in Jan–May 2025 aggregate PDF (6 occurrences). Zero in June 2025 onwards.  
**Notes:** Charged in GBP. Cancelled around May 2025.

### H5 — Adobe Acrobat Pro (legacy — ended before 2025)
**Description pattern:** `ADOBE ACROPRO`  
**Category:** Software & Subscriptions  
**Direction:** DEBIT  
**Amount:** R397  
**Confirmed timeline:** Zero occurrences in 2025 monthly PDFs. Only seen in 2023 historical data.  
**Notes:** Cancelled in 2023 or 2024.

### H6 — Bizflex Loan (legacy — ended before 2025)
**Description pattern:** `BIZFLEX LOAN`  
**Category:** Loan Repayments  
**Direction:** DEBIT  
**Amount:** ~14.88% of each credit deposit, automatic deduction  
**Confirmed timeline:** Zero occurrences in any 2025 or 2026 PDF. Only seen in 2023 historical data.  
**Notes:** Loan facility was settled/closed before 2025. Replaced by R41k overdraft facility.

### H6a — PayFast (legacy revenue gateway — wound down late 2025)
**Description pattern:** `PAYFAST` (CREDIT direction)  
**Category:** E-commerce Revenue (historical)  
**Direction:** CREDIT (income from online store sales)  
**Amount:** R375–R6,332/settlement  
**Confirmed timeline:** Present in 5 of 9 monthly 2025 PDFs (Jan–May, Jun, Jul, Nov, Dec). Zero in 2026.  
**Notes:** Distinct from `PAYFAST*LUSCI` and `PAYFAST*MY AP` which are DEBIT subscriptions and still active.

### H7 — Legacy Inventory Suppliers (e-commerce era)
Wholesale furniture/decor suppliers — likely dormant now.

| Pattern | Notes |
|---------|-------|
| `MAYOS COFFEE TABLE` | Coffee table wholesaler |
| `AM ARMAN RUGS` | Rugs wholesaler |
| `CHINA SQUARE` | Chinese goods wholesale, JHB |
| `NARSAR TRADIN` | Narsar Trading (JHB) |
| `JOZI CURTAINS` | Jozi Curtains |
| `FANTASY CASH` | Cash & Carry wholesale |
| `C*TRANS NATAL` | Trans Natal Express courier (inventory delivery) |
| `SHAKA MOTER SPARES` | Motor spares |
| `KINGS MOTOR SPARES` | Motor spares |

### H8 — Historical Staff
| Pattern | Notes |
|---------|-------|
| `B NQAI` | Historical employee, R5,250–R6,000/month. Not in 2026 — left. |
| `KAGISO JOSEPH TSE CAR WASH FAS` | Car wash service. R150 per visit. Not in 2026. |

### H9 — Honouring Fee / RTD / POS Declined (legacy bank charges)
**Description patterns:**
- `HONOURING FEE`
- `FEE-UNPAID ITEM`
- `RTD-NOT PROVIDED FOR`
- `FEE- POS DECLINED INSUFF FUNDS`

**Category:** Bank Charges  
**Direction:** DEBIT (RTD reversal is CREDIT)  
**Amount:** R8.50–R145/transaction  
**Notes:** Heavy in 2023 (cash flow crisis); rare in 2026.

### H10 — Legacy Phone Number
The 2023 prepaid top-up phone was `0684947294` (different Telkom number); current is `0680656597`. If old data imported, both should map to Prepaid Airtime/Data.

---

## RULE PRIORITY ORDER

When seeding rules, apply HIGH-confidence auto-review rules in this order:

1. **R1** — VHH Group / CF Income (core revenue)
2. **R2** — EFTPOS settlements (POS revenue)
3. **E18** — BDG Insurance debit order
4. **E1–E17** — All Standard Bank fee patterns
5. **E19–E25** — Named fuel stations (Global Tlayang, River Service, Global Boikhutso, Engen Mankwe, Shalom Petro, Obaro)
6. **E36–E40** — All salaries (Thabang, Tunnel, Irene, C Nyoni, Tryness)
7. **E27** — CNN Korean Parts
8. **E41** — Prepaid Airtime
9. **E42** — Vox Telecom
10. **E44** — Wix.com
11. **E49** — J Govender Opulent Rent

---

## FINAL SUMMARY

**Files actually processed for this report (14 PDFs total):**

| Year | File | Period |
|------|------|--------|
| 2025 | `Jan-May 2025.pdf` | Jan – May 2025 aggregate |
| 2025 | `20 May 25.pdf` | 20 Apr – 20 May 2025 |
| 2025 | `20 Jun 25.pdf` | 20 May – 20 Jun 2025 |
| 2025 | `19 Jul 25.pdf` | 20 Jun – 19 Jul 2025 |
| 2025 | `20 Aug 25.pdf` | 19 Jul – 20 Aug 2025 |
| 2025 | `20 September 2025.pdf` | 20 Aug – 20 Sep 2025 |
| 2025 | `20 October 2025.pdf` | 20 Sep – 20 Oct 2025 |
| 2025 | `20 November 2025.pdf` | 20 Oct – 20 Nov 2025 |
| 2025 | `20 December 2025.pdf` | 20 Nov – 20 Dec 2025 |
| 2026 | `20 January 2026.pdf` | 20 Dec 2025 – 20 Jan 2026 |
| 2026 | `20 February 2026.pdf` | 20 Jan – 20 Feb 2026 |
| 2026 | `20 March 2026.pdf` | 20 Feb – 20 Mar 2026 |
| 2023 | `Jan 2023.pdf` | 20 Dec 2022 – 20 Jan 2023 (historical) |
| 2023 | `Feb 2023.pdf` | 20 Jan – 20 Feb 2023 (historical) |

**Files explicitly NOT processed:**
- `2025/Jan-Dec 2025.xlsx` — **excluded at user instruction** (does not reflect true bank state)
- All other 2025 XLSX files (derived from the excluded XLSX)
- Duplicate PDFs (`19 July 2025.pdf`, `20 August 2025.pdf`, `Aug-Dec 2025.pdf`) — same content as their counterparts
- Remaining 2023 PDFs (`Mar 2023.pdf`, `Apr 2023.pdf`, `Dec 2022.pdf`, `3-Month statement.pdf`) — patterns covered by Jan/Feb 2023
- Top-level files (`AS208530919_AccountStatement.pdf`) — same content

**Key findings:**
- **70+ distinct rules** identified (R1–R5 revenue, E1–E49 + E40a–h staff + E35a–b + E46a–g + E47 = expenses, H1–H10 historical, T1–T2 transfers)
- **8 new categories** recommended: Telecommunications, Software & Subscriptions, Marketing & Advertising, Rent, Compliance & Legal, Owner Drawings, Courier/POS Income, Office Supplies, Franchise Fees, Courier/Subcontractor
- **13 named staff/contractor identities** found across 2025–2026:  
  *2025-only:* Thandeka Ncele, Thandekile S Dlamini, Dorah D Letsholo, Monalisa Mhande, Vongai T Marutsi, Yeukai Vera, Vuyokazi Mjobo, Esethu Jama  
  *2025 + 2026:* Thabang John Moreo, Tunnel Mangozvana, Irene Sarifo  
  *2026-only (new hires):* C Nyoni Charlotte, Tryness Tembo
- **Confirmed legacy timelines:**
  - Bizflex Loan: ended before 2025
  - Adobe Acrobat: ended before 2025
  - Intuit QuickBooks: ended ~May 2025
  - Takealot revenue (selling on platform): ended ~May 2025
  - Shopify stores: wound down late 2025 (3+ store IDs running)
  - PayFast revenue: wound down late 2025
- **Direction-aware rule needed for Takealot** — was CREDIT (revenue) in early 2025, now DEBIT (subscription fees only)
- **New 2025 personal subscriptions discovered:** Netflix (R199/mo), Showmax, I Spa, Pick n Pay, Liquorshop, Anthony's, Lime Light
- **New 2025 business suppliers discovered:** Trans-Natal Express (sub-contracted courier, 14x), Jetline (printing, 5x), Makro Strubenvale (office supplies, 7x), Multiple Hub, TB Machines
- **One-off compliance:** Dept of Labour UIF registration (R2,167)
- Business is essentially the same Fastway franchise as 2023, but in 2023 it ran in parallel with an e-commerce side-line (Takealot + multiple Shopify stores + PayFast revenue). The e-commerce side wound down progressively through 2025 and was gone by 2026.

---

*Report generated by analysis of Standard Bank BIZLAUNCH account 33 272 236 8 — Kgolaentle Holdings PTY LTD.*  
*Source: 14 × PDF statements only (9 × 2025, 3 × 2026, 2 × 2023). The `2025/Jan-Dec 2025.xlsx` file was excluded at user instruction.*
