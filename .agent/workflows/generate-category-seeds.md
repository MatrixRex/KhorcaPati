---
description: Expand the on-device category seed list (src/lib/categoryEmbed/seeds.json) with Bangladesh-specific expense terms in English, Banglish and Bangla.
---

# Task: expand the expense-category seed list for KhorcaPati

You are generating training examples for **KhorcaPati**, a personal expense tracker used mainly in **Bangladesh**.
Users type short, messy notes such as `bazar 1200`, `rickshaw vara 60`, `ওষুধ ৩২০`, `beton pelam 30000`.

On the phone, a small multilingual embedding model (`multilingual-e5-small`) assigns each item a category by
finding the **most similar entries in a seed list**. The model knows general English well but often does not know
local words, brands and Banglish spellings. For example, it matched "potol" to "petrol" and "fiverr" to "ferry".
**Your seed entries are what fixes this.** Every useful entry is a word or short phrase a real Bangladeshi user
would type, labelled with the right category.

## Output

A JSON object in exactly this shape (same as the existing `src/lib/categoryEmbed/seeds.json`):

```json
{
  "version": 2,
  "categories": {
    "Food & Dining": ["...", "..."],
    "Groceries": ["..."],
    "Transport": ["..."],
    "Bills & Utilities": ["..."],
    "Shopping": ["..."],
    "Healthcare": ["..."],
    "Entertainment": ["..."],
    "Education": ["..."],
    "Personal Care": ["..."],
    "Salary": ["..."]
  }
}
```

- Use **only these 10 category names**, spelled exactly as shown.
- **Keep every existing entry** from `seeds.json` and add new ones after them.
- Target **250–400 entries per category** (about 3,000 total). Quality over quantity: stop a category early rather than pad it.

## What a good entry looks like

- **1–4 words**, how people actually type it: `gari vara`, `kacha bazar`, `doctor fee`, `বাসা ভাড়া`.
- **No numbers, prices, quantities or units** (`rice 5kg 350` → `rice`). Exception: when the number is part of a name (`7up`).
- **Latin script in lowercase**; Bangla script as normally written.
- Cover each concept in the forms people use:
  - **English:** `onion`
  - **Banglish**, with 1–3 *common real* spellings: `piyaj`, `peyaj`, `piaj`. Typical swaps are sh↔s, v↔bh, oo↔u, o↔a, double letters. Don't invent spellings nobody uses.
  - **Bangla script:** `পেঁয়াজ`
- Include **short note phrasings**, not just nouns: `bazar korlam`, `cng te office`, `current bill dilam`. No full sentences or negations.
- Include **local brands, shops, apps and places** people actually name: superstores, ride apps, telecoms, hospitals, medicine brands, clothing brands, restaurants, streaming apps, coaching centres.
- **No duplicates** within or across categories, compared case-insensitively with spaces collapsed.

## Category scope and decision rules

Assign each entry to the single category a typical user would expect. When an entry could honestly be two
categories with no context (e.g. `bill`, `payment`, `fee`, `service`, `card`), **leave it out**.

| Category | Includes | Rules for borderline cases |
|---|---|---|
| **Food & Dining** | Meals, snacks and drinks bought ready to eat: restaurants, cafes, street food, sweets shops, food delivery apps, office canteen, tiffin, tea stalls | Prepared or eaten out → here. Raw ingredients → Groceries. |
| **Groceries** | Raw food for home: vegetables, fruit, fish, meat, eggs, rice, dal, oil, spices, dairy, bread, packaged staples; household supplies (detergent, dishwash, tissue); superstores and grocery apps; grocery brands (Pran, ACI, Teer, Fresh, Rupchanda, Radhuni) | Cooking oil `tel` → here (fuel is Transport). |
| **Transport** | Ride-share, rickshaw, CNG, bus, metro, train, launch and ferry, air travel and airlines, fuel, parking, tolls and bridges, vehicle repair | Plain `vara`/`bhara`/`ভাড়া` (fare) → here. |
| **Bills & Utilities** | Electricity (DESCO, DPDC, NESCO, REB), gas (Titas, cylinder), water (WASA), internet ISPs, mobile recharge and packs, house rent, service charge, cable/dish, building maintenance, mobile-banking cash-out charges | House rent (`bari bhara`, `basha bhara`) → here. Streaming subscriptions → Entertainment. |
| **Shopping** | Clothing, shoes, bags, accessories, electronics, gadgets, home goods, furniture, kitchenware, cosmetics bought as products, gifts, online marketplaces, clothing and shoe brands | |
| **Healthcare** | Doctors, hospitals, clinics, diagnostics and tests, pharmacies, common BD medicine names and brands, dental, eye care, physiotherapy | |
| **Entertainment** | Movies and cinemas, streaming apps, games and top-ups, concerts, trips and tours, parks, picnics, parties, hobbies | |
| **Education** | Tuition, school/college/university fees, admission and exam fees, coaching centres, books and stationery, online courses | Books for study → here. |
| **Personal Care** | Salon, parlour, barber, grooming and toiletries (soap, shampoo, toothpaste, skincare), gym and fitness, laundry, tailoring | Toiletries → here, not Groceries (matches existing seeds). |
| **Salary** | **All income**: salary, wages, bonuses, freelance and client payments, business income, commission, interest, profit, refunds, cashback, remittance received, rent received, selling something | This category means "income", so every money-received entry goes here. |

## Forbidden words (the app's accuracy test uses them)

Do **not** include the following, alone or inside a longer phrase. They are reserved for measuring how well
the model generalizes, so adding them would make the score dishonest. The source of truth is
`HELDOUT_KEY_TERMS` in `src/lib/categoryEmbed/heldout.ts`; a test fails if any seed contains one as a whole word.

```
shawarma, chicken fry, pizza hut, starbucks, jhalmuri, khichuri, bhat, biscuit, বার্গার, ইফতার, দই ফুচকা,
tomato, cauliflower, potol, begun, lau, rui, ilish, mosur, ইলিশ, চিংড়ি, ডজন,
bike ride, indrive, motorcycle, train er ticket, ট্যাক্সি, বিমান,
prepaid meter, electricity token, broadband bill, gp, robi, পানি বিল,
tshirt, sneakers, earphone, power bank, aarong, sunglass, eid er jama, ঈদের, চাদর,
ace plus, insulin, eye drop, dental, blood sugar, oshud, ঔষধ, দেখালাম,
concert ticket, bowling, prime video, ps5, nandan park, ঈদে,
ielts, udemy, semester, photocopy, ssc, admission coaching, স্কুলের,
beard, facewash, deodorant, gym membership, chul katano, নাপিত,
upwork, fiverr, eid bonus, bank interest, mash er beton, project payment, office theke, পেয়েছি
```

Related entries are fine and encouraged, e.g. `pangas mach`, `uber moto`, `grameenphone recharge`,
`banglalink pack`, `daater doctor`. Only the listed words themselves are off-limits.

## How to work

1. Work **one category at a time**. Before writing, brainstorm sub-areas so coverage is broad, not 50 spellings of one word.
   For example, Groceries: vegetables, fish, meat, staples, spices, dairy, packaged brands, household supplies, superstores.
2. For each concept, add its English, Banglish (common spellings) and Bangla forms where people really use them.
   Brand names usually only need their Latin form plus a Bangla form if people write it.
3. Re-check against the decision rules, the duplicate rule and the forbidden list.
4. If your output limit is reached, finish the current category cleanly and continue in the next response.
5. At the end, list (a) entries you deliberately left out as ambiguous and (b) any rule you had to interpret, so a human can review them.

## If you have access to the repository

Do these steps instead of only returning JSON:

1. Edit `src/lib/categoryEmbed/seeds.json` in place: keep existing entries, add new ones, set `"version": 2`.
2. Run `pnpm test` and fix any seed failures (duplicates, forbidden terms, unknown categories) **by changing the seed
   list**. Never edit `heldout.ts` or the tests to make them pass.
3. Run `pnpm seeds:build` to rebuild `seedVectors.json` (needs network the first time to download the model).
4. Run `pnpm seeds:eval` and report held-out accuracy before and after. The baseline with 413 seeds is **79% overall**
   (English 72%, Banglish 93%, Bangla 72%). Include the remaining mistakes list in your report.
5. Run `pnpm test && npx tsc -b` again; both must pass.
6. Do not commit; leave the changes for review.
