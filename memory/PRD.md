# PrintForge — 3D Print Marketplace

## Problem Statement
"Need a site to show products to 3D print and need it to allow searching all the 3D modeling sites and ability to send me files to print would like the ability for customers login on with wishlist creation upload and share customers own designs"

## User Choices
- Auth: Emergent Google Social Login
- 3D Search: Real integration + 3D-marketplace catalog (multi-site aggregator UI ready)
- File storage: Emergent Object Storage (STL/OBJ/3MF/STEP/ZIP up to 60MB)
- Payments: Stripe (claimable sandbox — one-time donations shipped; catalog checkout is future work)
- Visual style: Dark techy warm aesthetic ("Warm Industrial Tech")

## Architecture
- Backend: FastAPI + Motor (Mongo), Emergent Object Storage, Emergent Google Auth, Stripe SDK
- Frontend: React 19 + Tailwind + Shadcn/UI, Sonner toasts, lucide-react icons, Three.js STL viewer
- i18n: 12 languages (react-i18next)
- PWA: manifest + service-worker for installable web app

## Personas
- Buyer — browses catalog, wishlists items, requests prints
- Contributor — Google-signs-in and uploads original designs, tracks likes/downloads
- Print client — uploads their own STL/OBJ and gets it printed & shipped
- Supporter — donates via Stripe modal, opts to appear on Supporter Wall

## Core Requirements (static)
1. 3D Marketplace with categories, search, wishlist
2. Aggregated 3D model search across major sites
3. File upload for "send me a file to print" (guest or authed)
4. Customer design uploads to community gallery with likes & downloads
5. Google sign-in, per-user wishlist, orders, designs
6. Dashboard with wishlist / orders / designs tabs
7. In-site Donate Modal ($3/$5/$10/custom) with Supporter Wall
8. Multi-carrier shipping calculator (US + 9 intl. destinations, 11 carriers, expandable card)
9. 12-language i18n with GPT-5.2 auto-translated live chat
10. Installable PWA + mobile sticky CTA + affiliate filament links

## Implemented (2026-02)
- Backend endpoints: /auth/*, /products (?include_archived), /search/external, /wishlist, /orders, /designs, /files/download (inline for images), /shipping/quotes (**now 28 carriers across USPS/UPS/FedEx/DHL/Amazon/OnTrac/LaserShip/Purolator/Canada Post/Royal Mail/Evri/Japan Post/Yamato/Aramex + bike + pickup**), /chat/messages, /filament/stock, /filament/store-link
- **Stripe donations**: `POST /api/donate/checkout`, `GET /api/donate/status/{sid}`, `POST /api/stripe/webhook`, `GET /api/supporters`, `GET /api/supporters/emails`
- **Stripe order checkout (server-verified quote)**: `POST /api/orders/checkout` re-computes the quote server-side and rejects any client-tampered totals (>1% & >$0.50 delta). `GET /api/orders/status/{sid}` powers the polling success page.
- **Restock alerts**: `POST /api/restock/subscribe`, `GET /api/restock/subscriptions`, `GET /api/restock/stats` (per-material counts + colour breakdown), `POST /api/restock/notify` — sends via Resend when `RESEND_API_KEY` is set, otherwise queues in `restock_notifications`
- **Email receipts**: on paid donation and paid print order — sends via Resend when key present, otherwise recorded in `receipts` collection with outcome=queued
- **Bulk CSV import (CRUD)**: `POST /api/products/bulk` supports action column `create|update|archive|delete` (matched by title). Template now includes examples of each. Public `/products` hides archived by default; `?include_archived=1` reveals them.
- Frontend routes: /, /search, /product/:id, /print, /community, /dashboard, /admin/products, /donate/success, /donate/cancel, /supporters, /profile, /order/success, **/admin/restock, /tools**
- **Tools page (MakerLab)**: 16 curated MakerLab generators (Make My Sign, Make My Vase, Pixel Puzzle, Image→3D, Image→Keychain, Make My Statue, Relief Sculpture, AI Scanner, Lithophane, Photo Box, Stamp, Coin, Cookie Cutter, Badge, Colour Swatch, Ruler) with search + category filters + external MakerLab links; new "Tools" tab in header + mobile strip
- **Restock Admin UI** at `/admin/restock`: per-material subscriber cards, click a colour or "Notify" button to open the notify form, sends alerts + queues if email not configured
- **Buy Now with Stripe**: primary CTA on ProductDetail + mobile sticky, server-verified quote
- **Restock Alert Modal**: bell icon on OOS filament swatches → subscribe modal
- **Shipping section redesign**: compact expand/collapse card with country/postal, filter tabs (All/Cheap/Fast/Overnight/Eco), scrollable radio-list of every carrier, all badges (BEST/FAST/OVERNIGHT/ECO/INSURED), no horizontal overflow, "Extras" (signature + insurance) hidden by default
- **Bulk CSV Upload**: drag-drop CSV in `/admin/products` with template download, per-row error report, action-aware summary (added/updated/archived/deleted counts)
- **Supporter Badge**: chip next to community design authors who tipped
- **Donate Modal + Supporter Wall**: presets $3/$5/$10 + custom, anonymous toggle
- **Dedicated /supporters page** + Supporter Wall on Home
- **Mobile UX pass**: compact top-row search, Upload button with label on mobile, unified header layout guest/authed, floating chat button raised to avoid sticky Add-to-cart overlap
- **Community photo fix**: /api/files/download serves images inline + client-side onError fallback
- "Curated" copy replaced with "3D Marketplace" globally; footer "Marketplace" → "Home"; "Send Files To Print" removed from footer
- Object Storage for print-order and design uploads
- 12-language i18n + GPT-5.2 translated real-time chat
- PWA (installable web app) + install nudge + swipeable App screens carousel
- AnyCubic affiliate filament stock signal + referral URLs

## Stripe Configuration
- Flow A (claimable sandbox) via job `1ce5b433-1adc-453b-8c31-277317bbfbf4`
- Tax mode: **DIY (Stripe just processes the payment, no tax help)** — appropriate for donations since gifts are not taxable revenue
- Test card: `4242 4242 4242 4242`, any future expiry, any CVC
- Preset donations: `tip_3` $3, `tip_5` $5, `tip_10` $10; custom range $1 – $500
- Webhook path: `/api/stripe/webhook` (auto-fallback polling in status endpoint if webhook is delayed)

## Backlog (P0/P1/P2)
- P1: Wire real emails to Restock Alerts (drop `RESEND_API_KEY` into `backend/.env` + set `RESTOCK_FROM_EMAIL`; `/api/restock/notify` already sends via Resend when key is present, otherwise queues in `restock_notifications`)
- P1: Live Thingiverse/Printables API keys wired in
- P2: Order tracking UI (poll /api/orders/status/{sid} for status transitions after payment)
- P2: Push notifications & offline wishlist cache (PWA)
- P2: Admin management for uploaded/searched models
