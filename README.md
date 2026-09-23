# ZenCart — Enterprise AI-Powered Multi-Vendor Cosmetics eCommerce ERP Platform

[![NestJS](https://img.shields.io/badge/NestJS-10-red)](https://nestjs.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org)
[![Prisma](https://img.shields.io/badge/Prisma-5-brightgreen)](https://prisma.io)
[![License](https://img.shields.io/badge/License-UNLICENSED-yellow)](LICENSE)

> **ZenCart** is a fully dynamic, enterprise-grade, AI-powered multi-vendor cosmetics eCommerce ERP platform built with NestJS, Prisma, Supabase PostgreSQL, Redis, OpenAI, and Cloudinary.

---

## 🏗️ Architecture Overview

```
src/
├── main.ts                         # Bootstrap + Swagger + Global middleware
├── app.module.ts                   # Root module registering all 40+ feature modules
│
├── config/                         # Environment configuration
│
├── common/                         # Shared utilities across modules
│   ├── decorators/                 # @CurrentUser, @Public, @Roles, @RequirePermission
│   ├── filters/                    # Global HTTP exception filter
│   ├── guards/                     # JWT, Roles, Permissions guards
│   ├── interceptors/               # Transform, Logging, Cache interceptors
│   ├── pipes/                      # ValidationPipe configuration
│   └── dto/                        # PaginationDto, IdDto, paginate() helper
│
├── shared/                         # Domain events, interfaces, utilities
│   ├── events/                     # OrderPlacedEvent, UserRegisteredEvent, etc.
│   ├── interfaces/                 # PaginatedResult<T>
│   └── utils/                      # hash.util, string.util, price.util
│
├── infrastructure/                 # External service adapters
│   ├── database/                   # PrismaService (global)
│   ├── cache/                      # RedisService (global)
│   ├── queue/                      # BullMQ queue definitions
│   ├── search/                     # MeiliSearchService (global)
│   ├── storage/                    # CloudinaryService (global)
│   └── websocket/                  # RealtimeGateway (WebSocket)
│
└── modules/                        # 40+ feature modules
    ├── ai/                         # OpenAI integration, AI product, insights, chat, recommendations
    ├── auth/                       # JWT, OAuth, 2FA, sessions, refresh tokens
    ├── users/                      # Profiles, beauty AI, addresses, wishlist
    ├── vendors/                    # Onboarding, KYC, analytics, plans
    ├── products/                   # Catalog, variants, AI enhancement, search
    ├── categories/                 # Tree structure, dynamic filters
    ├── brands/                     # Brand management
    ├── inventory/                  # Multi-warehouse, stock alerts, expiry
    ├── orders/                     # Order lifecycle, split by vendor
    ├── cart/                       # Session cart, coupon application
    ├── checkout/                   # Summary, tax + shipping calculation
    ├── coupons/                    # 12+ discount types, AI coupons
    ├── campaigns/                  # Flash sales, bundle offers
    ├── flash-sales/                # Real-time flash sale management
    ├── dynamic-pricing/            # AI pricing engine, flash sale scheduler
    ├── recommendations/            # Personalized, similar, FBT, upsell
    ├── commissions/                # Dynamic commission engine
    ├── payments/                   # Stripe, bKash, SSLCommerz, Nagad
    ├── shipping/                   # Pathao, SteadFast, rate calculation
    ├── notifications/              # Email, in-app, push, real-time
    ├── reviews/                    # Ratings, AI summary, vendor reply
    ├── cms/                        # Dynamic pages, blocks, menus, homepage
    ├── blogs/                      # AI blog writer, publishing
    ├── seo/                        # Dynamic meta, sitemap, robots.txt
    ├── analytics/                  # KPIs, funnel, cohort, revenue charts
    ├── reports/                    # Sales, inventory, customer, CSV export
    ├── permissions/                # Dynamic RBAC engine, permission matrix
    ├── audit/                      # Activity logs, compliance
    ├── media/                      # Cloudinary upload, AI background removal
    ├── localization/               # i18n, multi-currency, translation
    ├── taxation/                   # Dynamic tax rules, calculation
    ├── finance/                    # P&L, payouts, vendor settlements
    ├── support/                    # Tickets, AI auto-reply, staff management
    ├── crm/                        # Customer segments, churn, LTV
    ├── erp/                        # ERP dashboard, system health
    ├── warehouse/                  # Multi-warehouse, stock transfers
    ├── affiliate/                  # Affiliate program, links, conversions
    ├── influencer/                 # Influencer profiles, campaigns
    ├── loyalty/                    # Points engine, tiers, redemption
    ├── wallets/                    # Digital wallet, topup, cashback
    ├── subscriptions/              # Vendor subscription plans
    ├── webhooks/                   # Outbound event webhooks
    ├── fraud-detection/            # AI fraud scoring, velocity checks
    ├── automation/                 # Marketing automation, workflows
    ├── workflows/                  # Business workflow engine
    ├── feature-flags/              # Dynamic feature toggles, rollout %
    ├── ab-testing/                 # A/B experiment engine
    ├── realtime/                   # WebSocket event broadcasting
    ├── integrations/               # 3rd party integrations catalog
    └── dashboards/                 # Admin, vendor dashboards
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- Docker & Docker Compose
- PostgreSQL (via Supabase or local)
- Redis
- Meilisearch (optional, graceful fallback)

### 1. Clone and install

```bash
git clone https://github.com/your-org/ZenCart.git
cd ZenCart
npm install
```

### 2. Environment setup

```bash
cp .env.example .env
# Edit .env with your credentials:
# DATABASE_URL, REDIS_HOST, OPENAI_API_KEY, CLOUDINARY_*, STRIPE_*, etc.
```

### 3. Start infrastructure with Docker

```bash
docker-compose up -d postgres redis meilisearch
```

### 4. Database setup

```bash
# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Seed database with defaults
npm run prisma:seed
```

### 5. Start the application

```bash
# Development (with hot reload)
npm run start:dev

# Production
npm run build
npm run start:prod
```

### 6. Access the API

| Resource | URL |
|----------|-----|
| **API Base** | `http://localhost:3000/api/v1` |
| **Swagger Docs** | `http://localhost:3000/api/docs` |
| **WebSocket** | `ws://localhost:3000/realtime` |

### Default Credentials (after seed)

| Role | Email | Password |
|------|-------|----------|
| Super Admin | `admin@ZenCart.com` | `Admin@12345` |

---

## 🔑 Key Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | ✅ |
| `REDIS_HOST` | Redis host | ✅ |
| `JWT_SECRET` | JWT signing secret | ✅ |
| `OPENAI_API_KEY` | OpenAI API key for AI features | ✅ |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name | ✅ |
| `CLOUDINARY_API_KEY` | Cloudinary API key | ✅ |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | ✅ |
| `STRIPE_SECRET_KEY` | Stripe secret key | Optional |
| `BKASH_APP_KEY` | bKash app key | Optional |
| `SSLCOMMERZ_STORE_ID` | SSLCommerz store ID | Optional |
| `PATHAO_CLIENT_ID` | Pathao courier ID | Optional |
| `MEILI_HOST` | Meilisearch host | Optional |

---

## 📡 API Endpoints Summary

### Authentication
```
POST   /api/v1/auth/register         Register new user
POST   /api/v1/auth/login            Login (returns JWT + refresh token)
POST   /api/v1/auth/refresh          Refresh access token
POST   /api/v1/auth/logout           Logout current session
POST   /api/v1/auth/forgot-password  Request password reset
POST   /api/v1/auth/reset-password   Reset password with token
GET    /api/v1/auth/me               Get current user
```

### Products
```
GET    /api/v1/products              List products (filterable)
GET    /api/v1/products/featured     Featured products
GET    /api/v1/products/bestsellers  Bestseller products
GET    /api/v1/products/search       Full-text search
GET    /api/v1/products/slug/:slug   Product by slug
GET    /api/v1/products/:id          Product by ID
POST   /api/v1/products              Create product (Vendor)
PUT    /api/v1/products/:id          Update product
POST   /api/v1/products/:id/images   Upload images
PATCH  /api/v1/products/:id/publish  Publish product
```

### Cart & Checkout
```
GET    /api/v1/cart                  Get cart
POST   /api/v1/cart/items            Add to cart
PUT    /api/v1/cart/items/:id        Update quantity
DELETE /api/v1/cart/items/:id        Remove item
POST   /api/v1/cart/coupon           Apply coupon
POST   /api/v1/checkout/summary      Get checkout summary
GET    /api/v1/checkout/validate     Validate cart
```

### Orders
```
POST   /api/v1/orders                Place order
GET    /api/v1/orders/my             My orders
GET    /api/v1/orders/:id            Order details
PATCH  /api/v1/orders/:id/status     Update status (Admin/Vendor)
PATCH  /api/v1/orders/:id/cancel     Cancel order
```

### AI Features
```
POST   /api/v1/ai/product/generate-description   AI product description
POST   /api/v1/ai/product/generate-seo           AI SEO metadata
POST   /api/v1/ai/product/:id/enhance            Full AI enhancement
POST   /api/v1/ai/chat                           AI shopping assistant
POST   /api/v1/ai/chat/beauty-recommendation     AI beauty advice
POST   /api/v1/ai/chat/shade-match               AI shade matching
POST   /api/v1/ai/chat/skincare-routine          Generate routine
GET    /api/v1/ai/recommendations/personalized   Personalized recs
GET    /api/v1/ai/recommendations/trending       Trending products
GET    /api/v1/ai/insights                       AI business insights
POST   /api/v1/ai/insights/discount-analysis     Discount effectiveness
POST   /api/v1/ai/content/blog                   AI blog generator
POST   /api/v1/ai/content/email-campaign         AI email campaign
```

### Vendors
```
POST   /api/v1/vendors               Create vendor profile
GET    /api/v1/vendors/my/dashboard  Vendor dashboard stats
GET    /api/v1/vendors/my/analytics/sales    Sales chart
GET    /api/v1/vendors/my/onboarding         Onboarding checklist
GET    /api/v1/vendors/store/:slug           Public store page
PATCH  /api/v1/vendors/:id/approve          Approve vendor (Admin)
```

### CMS
```
GET    /api/v1/cms/homepage          Full homepage layout
GET    /api/v1/cms/pages/:slug       Page by slug
GET    /api/v1/cms/blocks/:id        CMS block
GET    /api/v1/cms/menus/:location   Navigation menu
```

### Analytics (Admin)
```
GET    /api/v1/analytics/dashboard   KPI dashboard
GET    /api/v1/analytics/revenue     Revenue chart
GET    /api/v1/analytics/funnel      Conversion funnel
GET    /api/v1/analytics/cohort      Cohort analysis
```

---

## 🧠 AI Features

| Feature | Description |
|---------|-------------|
| **Product Description AI** | GPT-4o generates SEO-optimized product descriptions |
| **Ingredient Summarizer** | Consumer-friendly breakdown of cosmetic ingredients |
| **AI SEO Generator** | Meta titles, descriptions, keywords auto-generated |
| **AI Tag Generator** | Automatic product tagging from content |
| **Duplicate Detector** | AI detects duplicate products before creation |
| **AI Beauty Consultant** | Personalized skincare advice chatbot |
| **Shade Matching AI** | Recommends foundation shades by skin tone |
| **Skincare Routine AI** | Custom routine builder based on skin profile |
| **AI Recommendations** | Personalized, similar, frequently-bought-together |
| **Business Insights AI** | "20% discount increased conversion by 37%" |
| **Churn Prediction** | Identifies at-risk customers before they leave |
| **AI Blog Writer** | Full blog post generation with SEO optimization |
| **Email Campaign AI** | Personalized email copy generation |
| **Optimal Pricing AI** | Suggests data-driven price adjustments |
| **Review Summarizer** | AI summary of product reviews with pros/cons |

---

## 🛡️ Security Features

- **JWT Authentication** with short-lived access tokens + refresh token rotation
- **OAuth 2.0** — Google & Facebook login
- **Two-Factor Authentication** — TOTP (Google Authenticator compatible)
- **Device Session Tracking** — manage all active sessions
- **Dynamic RBAC** — 8 roles × granular module/action permissions
- **Rate Limiting** — per-endpoint throttling with Redis
- **AI Fraud Detection** — velocity checks, IP reputation, risk scoring
- **Audit Logs** — all critical actions logged with before/after data
- **Helmet.js** — HTTP security headers
- **Input Validation** — class-validator on all DTOs

---

## 💳 Payment Gateways

| Gateway | Market | Status |
|---------|--------|--------|
| **Stripe** | Global | ✅ Implemented |
| **bKash** | Bangladesh | ✅ Implemented |
| **SSLCommerz** | Bangladesh | ✅ Implemented |
| **Nagad** | Bangladesh | 🔧 Config ready |
| **Wallet** | Internal | ✅ Implemented |
| **COD** | All | ✅ Implemented |

---

## 🚢 Shipping Integrations

| Courier | Market | Status |
|---------|--------|--------|
| **Pathao** | Bangladesh | ✅ Implemented |
| **SteadFast** | Bangladesh | ✅ Implemented |
| **Standard** | Fallback | ✅ Implemented |

---

## 🗃️ Database Schema

The Prisma schema defines **35+ models** including:

- `User`, `Session`, `Address`
- `Vendor`, `VendorPlan`
- `Product`, `ProductVariant`, `ProductCategory`, `BundleItem`
- `Category`, `Brand`
- `Inventory`, `Warehouse`
- `Order`, `OrderItem`, `OrderStatusHistory`
- `Payment`, `Wallet`, `WalletTransaction`
- `Commission`, `Payout`
- `Coupon`, `CouponUsage`, `FlashSale`
- `Shipment`
- `Review`
- `Wishlist`, `WishlistItem`
- `LoyaltyPoint`
- `Notification`
- `Page`, `CmsBlock`, `Blog`, `Menu`
- `AffiliateProfile`, `AffiliateLink`
- `InfluencerProfile`
- `SupportTicket`, `TicketMessage`
- `ChatMessage`
- `AiInsight`, `AiPromptTemplate`
- `Permission`, `AuditLog`
- `Setting`, `FeatureFlag`
- `Currency`, `Language`, `Translation`
- `SeoRule`, `TaxRule`
- `AnalyticsEvent`, `CrmProfile`
- `Webhook`, `WebhookDelivery`

---

## ⚡ Performance

- **Redis Caching** — products, categories, user profiles, API responses
- **Database Indexing** — all foreign keys + frequently queried fields
- **Event-Driven** — order processing, commissions, notifications via events
- **Queue-Based** — background jobs for AI, email, media processing (BullMQ)
- **WebSocket** — real-time order tracking, live notifications
- **Meilisearch** — millisecond full-text product search
- **Cloudinary CDN** — auto WebP/AVIF, responsive images, edge delivery

---

## 🐳 Docker Deployment

```bash
# Start all services
docker-compose up -d

# Run migrations
docker-compose exec app npm run prisma:migrate

# Seed database
docker-compose exec app npm run prisma:seed
```

---

## 📄 License

UNLICENSED — Proprietary software. All rights reserved.
