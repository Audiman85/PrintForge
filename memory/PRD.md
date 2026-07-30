# PrintForge — 3D Print Marketplace

## Problem Statement
"Need a site to show products to 3D print and need it to allow searching all the 3D modeling sites and ability to send me files to print would like the ability for customers login on with wishlist creation upload and share customers own designs"

## User Choices
- Auth: Emergent Google Social Login
- 3D Search: Real integration + curated catalog (multi-site aggregator UI ready; live API integrations for Thingiverse/Printables can be added when keys are provided)
- File storage: Emergent Object Storage (STL/OBJ/3MF/STEP/ZIP up to 60MB)
- Payments: Deferred (no Stripe yet — order request only, contact-and-quote model)
- Visual style: Dark techy warm aesthetic ("Warm Industrial Tech")

## Architecture
- Backend: FastAPI + Motor (Mongo), Emergent Object Storage, Emergent Google Auth
- Frontend: React 19 + Tailwind + Shadcn/UI, Sonner toasts, lucide-react icons

## Personas
- Buyer — browses catalog, wishlists items, requests prints
- Contributor — Google-signs-in and uploads original designs, tracks likes/downloads
- Print client — uploads their own STL/OBJ and gets it printed & shipped

## Core Requirements (static)
1. Curated marketplace with categories, search, wishlist
2. Aggregated 3D model search across major sites
3. File upload for "send me a file to print" (guest or authed)
4. Customer design uploads to community gallery with likes & downloads
5. Google sign-in, per-user wishlist, orders, designs
6. Dashboard with wishlist / orders / designs tabs

## Implemented (2026-02)
- Backend endpoints: /auth/session, /auth/me, /auth/logout, /products (list/detail/create), /search/external, /wishlist (list/toggle), /orders (create/list), /designs (upload/list/like/get), /files/download
- Frontend routes: /, /search, /product/:id, /print, /community, /dashboard, and OAuth callback (hash-based)
- Object Storage integration for print-order and design uploads
- 9 seeded marketplace products
- Wishlist, orders, and designs tabs in dashboard

## Backlog (P0/P1/P2)
- P1: Live Thingiverse/Printables API keys wired in (currently curated result set)
- P1: Stripe checkout for confirmed print quotes
- P2: In-browser STL viewer (three.js + drei) replacing the mock
- P2: Design search & filter, order status updates by admin
- P2: Email notifications on quote / order status change
