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
- Backend endpoints: /auth/*, /products, /search/external, /wishlist, /orders, /designs, /files/download (now serves inline for images with cache), /shipping/quotes, /chat/messages, /filament/stock, /filament/store-link
- **Stripe donations**: `POST /api/donate/checkout`, `GET /api/donate/status/{sid}`, `POST /api/stripe/webhook`, `GET /api/supporters`
- **Stripe order checkout**: `POST /api/orders/checkout`, `GET /api/orders/status/{sid}` — one-tap Buy Now on product page with quote + shipping
- **Supporter badge**: `GET /api/supporters/emails` + client-side badge on Community design cards for donors
- **Restock alerts**: `POST /api/restock/subscribe`, `GET /api/restock/subscriptions` (admin), `POST /api/restock/notify` (admin) — uses Resend if `RESEND_API_KEY` set, otherwise queues in DB
- **Bulk CSV product import**: `POST /api/products/bulk`, `GET /api/products/bulk/template`
- Frontend routes: /, /search, /product/:id, /print, /community, /dashboard, /admin/products, /donate/success, /donate/cancel, **/supporters**, **/profile**, **/order/success**
- **Donate Modal + Supporter Wall**: $3/$5/$10 + custom, opt-in name + optional message, anonymous toggle
- **Dedicated /supporters page** (in main nav + mobile tab strip)
- **Mobile UX pass**: compact top-row search on mobile, Upload button (with label) retained on mobile, unified header layout guest/authed, Home/Community/Supporters/Contact tab strip, chat button raised, shipping card expandable
- **Community photo fix**: /api/files/download serves images inline + client-side onError fallback
- **Buy Now with Stripe**: primary CTA on ProductDetail + mobile sticky, opens Stripe Checkout with quote + shipping total, redirects to /order/success
- **Restock Alert Modal**: triggered by clicking an out-of-stock colour swatch in `PrintConfigurator`, subscribes email + material + colours
- **Bulk CSV Upload**: drag-drop CSV in `/admin/products` with template download and per-row error report
- **Supporter Badge**: chip shown next to community design authors who have donated
- "Curated" copy replaced with "3D Marketplace" globally
- Object Storage integration for print-order and design uploads
- Multi-carrier shipping (11 carriers, best/fast/overnight badges)
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
