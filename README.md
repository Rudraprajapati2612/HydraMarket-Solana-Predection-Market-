# 🔮 HydraMarket - Hybrid Prediction Market Platform

> Trade the future with on-chain prediction markets powered by Solana and real-time oracles

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Rust](https://img.shields.io/badge/Rust-000000?style=for-the-badge&logo=rust&logoColor=white)](https://www.rust-lang.org/)
[![Solana](https://img.shields.io/badge/Solana-9945FF?style=for-the-badge&logo=solana&logoColor=white)](https://solana.com/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)

---

## 📑 Table of Contents

- [About](#about)
- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [API Reference](#api-reference)
- [Smart Contracts](#smart-contracts)
- [Workers & Services](#workers--services)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

---

## 🎯 About

**HydraMarket** is a **hybrid prediction market platform** built on Solana that combines the speed of centralized systems with the trust of decentralized settlement. Users can trade binary outcome tokens (YES/NO) on real-world events with **instant trades and zero gas fees**.

### 🔄 Hybrid Architecture

**Half Centralized + Half Decentralized** = Best of Both Worlds

- **Centralized Components**: Off-chain orderbook matching, PostgreSQL storage, instant secondary trades
- **Decentralized Components**: On-chain token minting, Solana settlement, oracle-based resolution, trustless payouts

### Key Highlights

- ⚡ **Instant Trading**: Database-only secondary trades (no blockchain delay)
- 🔒 **On-chain Settlement**: Blockchain for complementary matches & payouts
- 🤖 **Automated Resolution**: Pyth oracles & RapidAPI integration
- 💰 **Zero Trading Fees**: Only pay when minting new tokens
- 🎯 **Custodial Simplicity**: Trade without wallet friction

### Target Users

- **Traders**: Speculate on crypto prices, sports outcomes, and world events
- **Market Makers**: Provide liquidity and earn from spreads
- **Protocol Developers**: Fork and customize for specific use cases

---

## ✨ Features

### Core Trading
- 📊 **Binary Outcome Markets**: Trade YES/NO tokens on any event
- 📈 **Real-time Orderbook**: Limit and market orders with instant matching
- 💹 **Live Price Feeds**: Pyth Network integration for crypto markets
- 🎯 **Position Tracking**: View P&L, average prices, and token holdings

### Market Resolution
- 🤖 **Automated Oracles**: Pyth (crypto), RapidAPI (sports)
- ⚖️ **Dispute Mechanism**: Bond-based challenges with economic incentives
- 🛡️ **Admin Override**: Emergency resolution for edge cases
- 💰 **Instant Payouts**: Winners claim 1 USDC per winning token

### Wallet & Deposits
- 💳 **Memo-based Deposits**: Unique identifier system for user deposits
- 🔄 **Automated Indexing**: WebSocket monitoring of hot wallet
- 💸 **Fast Withdrawals**: 2-5 second Solana transfers
- 📊 **Full Transaction History**: Track all deposits, withdrawals, trades

### Admin Tools
- ➕ **Market Creation**: Quick time selection (5min, 1hr, 1 week, custom)
- 🔧 **Manual Resolution**: Override oracle with proof/reasoning
- 📈 **Analytics Dashboard**: TVL, volume, user metrics
- 👥 **User Management**: View positions, balances, activity

---

## 🏗️ Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        USER ACTIONS                          │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                    API GATEWAY (Bun + Elysia)                │
│  🔵 CENTRALIZED                                              │
│  - Authentication (JWT)                                      │
│  - Balance management (PostgreSQL)                           │
│  - Order placement (gRPC → Rust Matching Engine)            │
└─────────────────────────────────────────────────────────────┘
                           ↓
         ┌─────────────────┴─────────────────┐
         ↓                                     ↓
┌──────────────────────┐            ┌──────────────────────┐
│  MATCHING ENGINE     │            │   POSTGRESQL         │
│  (Rust)              │            │   🔵 CENTRALIZED     │
│  🔵 CENTRALIZED      │←──────────→│   - Users            │
│  - Orderbook         │            │   - Orders           │
│  - Price-time        │            │   - Positions        │
│  - Complementary     │            │   - Trades           │
│    detection         │            │   - Balances         │
└──────────────────────┘            └──────────────────────┘
         ↓
         ↓ (Complementary match found)
         ↓
┌──────────────────────┐
│  REDIS QUEUE         │
│  🔵 CENTRALIZED      │
│  mint:queue          │
└──────────────────────┘
         ↓
┌─────────────────────────────────────────────────────────────┐
│                   SETTLEMENT WORKER (Rust)                   │
│  🔵 CENTRALIZED                                              │
│  1. Pop from Redis                                           │
│  2. Transfer USDC: hot_wallet → escrow_vault                │
│  3. Mint YES/NO tokens on Solana                            │
│  4. Update positions in PostgreSQL                           │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                    SOLANA BLOCKCHAIN                         │
│  🟢 DECENTRALIZED                                            │
│  - Market Registry (Anchor program)                          │
│  - Escrow Vault (holds USDC collateral)                     │
│  - Resolution Adapter (oracle integration)                   │
│  - YES/NO SPL Token Mints                                    │
└─────────────────────────────────────────────────────────────┘
                           ↑
┌─────────────────────────────────────────────────────────────┐
│              RESOLUTION ADAPTER (TypeScript)                 │
│  🔵 CENTRALIZED (reads oracles)                              │
│  🟢 DECENTRALIZED (writes on-chain)                          │
│  - Cron job (hourly)                                         │
│  - Check expired markets                                     │
│  - Fetch oracle data (Pyth / RapidAPI)                      │
│  - Update market outcome on-chain                            │
│  - Trigger payout distribution                               │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                 WITHDRAWAL WORKER (Rust)                     │
│  🔵 CENTRALIZED (listens to DB)                              │
│  🟢 DECENTRALIZED (Solana transfers)                         │
│  - Poll withdrawals table (PENDING)                          │
│  - Transfer USDC: hot_wallet → user's Phantom               │
│  - Update status: CONFIRMED                                  │
└─────────────────────────────────────────────────────────────┘
```

### Trade Flow Diagram

```
USER DEPOSITS 100 USDC
         ↓
  [Database: balance += 100] 🔵 CENTRALIZED
         ↓
USER PLACES: BUY YES @ 0.60 ($60)
         ↓
  [Matching Engine finds: BUY NO @ 0.40 ($40)] 🔵 CENTRALIZED
         ↓
  COMPLEMENTARY MATCH! (0.60 + 0.40 = 1.00)
         ↓
  Push to Redis: mint:queue 🔵 CENTRALIZED
         ↓
  [Settlement Worker]
         ↓
  SOLANA: Mint 100 YES + 100 NO tokens 🟢 DECENTRALIZED
         ↓
  [Database: positions updated] 🔵 CENTRALIZED
         ↓
  USER NOW HOLDS: 100 YES tokens
         ↓
  MARKET RESOLVES: YES wins 🟢 DECENTRALIZED (on-chain)
         ↓
  [Resolution Adapter updates on-chain]
         ↓
  USER CLAIMS PAYOUT
         ↓
  SOLANA: Burn 100 YES → Transfer 100 USDC 🟢 DECENTRALIZED
         ↓
  [Database: balance += 100, is_claimed = true] 🔵 CENTRALIZED
```

### Why Hybrid?

| Component | Centralized | Decentralized | Reason |
|-----------|-------------|---------------|--------|
| **Orderbook** | ✅ | ❌ | Speed (instant matching) |
| **Secondary Trades** | ✅ | ❌ | No gas fees, instant |
| **Token Minting** | ❌ | ✅ | Trustless, verifiable |
| **Market Resolution** | ❌ | ✅ | Oracle-driven, transparent |
| **Payouts** | ❌ | ✅ | Non-custodial USDC release |
| **Withdrawals** | ❌ | ✅ | Direct to user's wallet |

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: React 18
- **Language**: TypeScript
- **Build Tool**: Vite
- **Styling**: TailwindCSS + Shadcn/ui
- **Charts**: Recharts
- **Wallet**: @solana/wallet-adapter-react
- **State Management**: Zustand
- **Forms**: React Hook Form + Zod

### Backend
- **API Gateway**: Bun + Elysia (TypeScript)
- **Matching Engine**: Rust + Tokio
- **Workers**: Rust (Settlement, Withdrawal)
- **Resolution**: TypeScript + Node-Cron
- **Database**: PostgreSQL + Prisma ORM
- **Cache**: Redis (queues)
- **WebSocket**: Deposit indexer

### Blockchain
- **Network**: Solana (Devnet/Mainnet)
- **Framework**: Anchor (Rust)
- **Programs**:
  - Market Registry
  - Escrow Vault
  - Resolution Adapter
- **Oracles**: Pyth Network, RapidAPI

### DevOps
- **CI/CD**: GitHub Actions
- **Deployment**: Vercel (frontend), AWS/Railway (backend)
- **Monitoring**: Datadog, Sentry

---

## 🚀 Getting Started

### Prerequisites

```bash
# Required
- Node.js 20+
- Rust 1.75+
- Bun 1.0+
- PostgreSQL 15+
- Redis 7+
- Solana CLI 1.18+
- Anchor CLI 0.29+

# Optional (for development)
- Docker & Docker Compose
```

### Installation

#### 1. Clone Repository

```bash
git clone https://github.com/Rudraprajapati2612/hydramarket.git
cd hydramarket
```

#### 2. Install Dependencies

```bash
# Root dependencies
bun install

# Backend services
cd apps/api-gateway && bun install
cd ../matching-engine && cargo build --release
cd ../settlement-worker && cargo build --release
cd ../withdrawal-worker && cargo build --release
cd ../deposit-indexer && bun install
cd ../resolution-adapter && bun install

# Frontend
cd ../frontend && npm install
```

#### 3. Setup Database

```bash
# Start PostgreSQL & Redis
docker-compose up -d postgres redis

# Run migrations
cd packages/db
bunx prisma migrate dev
bunx prisma generate
bunx --bun prisma db seed
```

#### 4. Deploy Solana Programs

**Smart Contracts Repository**: [HydraMarket-Contract](https://github.com/Rudraprajapati2612/HydraMarket-Contract)

```bash
# Clone smart contracts repo
git clone https://github.com/Rudraprajapati2612/HydraMarket-Contract.git
cd HydraMarket-Contract

# Build programs
anchor build

# Deploy to devnet
anchor deploy --provider.cluster devnet

# Copy program IDs to .env files
```

#### 5. Configure Environment Variables

Create `.env` files in each service directory:

**`apps/api-gateway/.env`**
```env
DATABASE_URL=postgresql://user:password@localhost:5432/hydramarket
JWT_SECRET=your-super-secret-jwt-key
MATCHING_ENGINE_URL=http://localhost:50051
HOT_WALLET_ADDRESS=YourHotWalletPublicKey
```

**`apps/matching-engine/.env`**
```env
DATABASE_URL=postgresql://user:password@localhost:5432/hydramarket
REDIS_URL=redis://localhost:6379
GRPC_PORT=50051
```

**`apps/settlement-worker/.env`**
```env
SOLANA_RPC_URL=https://api.devnet.solana.com
TREASURY_PRIVATE_KEY=base58_encoded_hot_wallet_key
ESCROW_PROGRAM_ID=YourEscrowProgramId
MARKET_REGISTRY_PROGRAM_ID=YourMarketRegistryProgramId
DATABASE_URL=postgresql://user:password@localhost:5432/hydramarket
REDIS_URL=redis://localhost:6379
```

**`apps/withdrawal-worker/.env`**
```env
SOLANA_RPC_URL=https://api.devnet.solana.com
HOT_WALLET_PRIVATE_KEY=base58_encoded_key
DATABASE_URL=postgresql://user:password@localhost:5432/hydramarket
POLL_INTERVAL_MS=5000
```

**`apps/resolution-adapter/.env`**
```env
SOLANA_RPC_URL=https://api.devnet.solana.com
ADMIN_PRIVATE_KEY=base58_encoded_admin_key
RESOLUTION_ADAPTER_PROGRAM_ID=YourResolutionProgramId
MARKET_REGISTRY_PROGRAM_ID=YourMarketRegistryProgramId
RAPIDAPI_CRICKET_KEY=your_rapidapi_key
CRON_SCHEDULE=0 * * * *
USDC_MINT=4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU
```

**`apps/deposit-indexer/.env`**
```env
SOLANA_RPC_URL=wss://api.devnet.solana.com
HOT_WALLET_ADDRESS=YourHotWalletPublicKey
DATABASE_URL=postgresql://user:password@localhost:5432/hydramarket
```

**`apps/frontend/.env.local`**
```env
VITE_API_URL=http://localhost:3000
VITE_SOLANA_NETWORK=devnet
```

### Running the Application

#### Option 1: Manual (Development)

```bash
# Terminal 1: API Gateway
cd apps/api-gateway
bun dev

# Terminal 2: Matching Engine
cd apps/matching-engine
cargo run --release

# Terminal 3: Settlement Worker
cd apps/settlement-worker
cargo run --release

# Terminal 4: Withdrawal Worker
cd apps/withdrawal-worker
cargo run --release

# Terminal 5: Resolution Adapter
cd apps/resolution-adapter
bun start

# Terminal 6: Deposit Indexer
cd apps/deposit-indexer
bun start

# Terminal 7: Frontend
cd apps/frontend
npm run dev
```

#### Option 2: Docker Compose (Recommended)

```bash
docker-compose up --build
```

Access the application:
- Frontend: http://localhost:5173
- API: http://localhost:3000
- Matching Engine: localhost:50051 (gRPC)

---

## 📂 Project Structure

```
hydramarket/
├── apps/
│   ├── api-gateway/              # REST API (Bun + Elysia)
│   │   ├── src/
│   │   │   ├── routes/           # API endpoints
│   │   │   ├── middleware/       # Auth, validation
│   │   │   └── services/         # Business logic
│   │   └── package.json
│   │
│   ├── matching-engine/          # Order matching (Rust)
│   │   ├── src/
│   │   │   ├── main.rs           # gRPC server
│   │   │   ├── orderbook.rs      # Orderbook logic
│   │   │   ├── matcher.rs        # Matching algorithm
│   │   │   └── redis_client.rs   # Queue operations
│   │   └── Cargo.toml
│   │
│   ├── settlement-worker/        # Token minting (Rust)
│   │   ├── src/
│   │   │   ├── main.rs           # Worker loop
│   │   │   ├── solana_client.rs  # Blockchain calls
│   │   │   └── database.rs       # PostgreSQL ops
│   │   └── Cargo.toml
│   │
│   ├── withdrawal-worker/        # USDC withdrawals (Rust)
│   │   ├── src/
│   │   │   ├── main.rs           # Polling loop
│   │   │   ├── config.rs
│   │   │   └── types.rs
│   │   └── Cargo.toml
│   │
│   ├── resolution-adapter/       # Oracle integration (TS)
│   │   ├── src/
│   │   │   ├── index.ts          # Cron scheduler
│   │   │   ├── adapters/
│   │   │   │   ├── pyth-adapter.ts
│   │   │   │   └── cricket-adapter.ts
│   │   │   └── services/
│   │   │       └── resolution-service.ts
│   │   └── package.json
│   │
│   ├── deposit-indexer/          # WebSocket monitor (TS)
│   │   ├── src/
│   │   │   └── index.ts          # Transaction listener
│   │   └── package.json
│   │
│   └── frontend/                 # React UI
│       ├── src/
│       │   ├── components/       # React components
│       │   ├── pages/            # Route pages
│       │   ├── lib/              # Utils, API client
│       │   └── App.tsx
│       └── package.json
│
├── packages/
│   └── db/                       # Prisma schema & migrations
│       ├── prisma/
│       │   ├── schema.prisma
│       │   └── seed.ts
│       └── package.json
│
├── docker-compose.yml            # Local development
├── .github/
│   └── workflows/                # CI/CD pipelines
└── README.md
```

---

## 🔌 API Reference

**Full API Documentation**: [HydraMarket API](https://registry.scalar.com/@default-team-1rvgn/apis/hydramarket-api@1.0.0)

**Base URL**: `http://localhost:3000`

### Authentication

```typescript
POST /auth/register
Body: { email, username, password, fullName? }
Response: { token, userId, depositeMemo }

POST /auth/login
Body: { email, password }
Response: { token, userId, username }

GET /auth/me
Headers: { Authorization: "Bearer <token>" }
Response: { userId, username, email, role }
```

### Markets

```typescript
GET /markets?state=OPEN&category=Crypto
Response: { success, data: Market[] }

GET /markets/:id
Response: { success, data: Market }

POST /markets  // Admin only
Body: { question, description, category, expiresAt, resolutionSource }
Response: { success, data: Market }
```

### Orders

```typescript
POST /orders
Body: { marketId, outcome: "YES" | "NO", orderType: "LIMIT" | "MARKET", price?, amount }
Response: { success, data: Order }

GET /orders?marketId=xyz
Response: { success, data: Order[] }

GET /orders/orderbook/:marketId/:outcome
Response: { success, data: OrderbookEntry[] }

DELETE /orders/:id
Response: { success }
```

### Balance & Wallet

```typescript
GET /balance
Response: { success, data: { USDC: { available, reserved } } }

GET /deposits/instructions
Response: { depositAddress, depositMemo, instructions[], warnings[] }

POST /withdrawals
Body: { asset: "USDC", amount, destinationAddress }
Response: { success, data: Withdrawal }

GET /withdrawals
Response: { success, data: Withdrawal[] }
```

### Positions & Payouts

```typescript
GET /positions
Response: { success, data: Position[] }

GET /payouts/claimable
Response: { success, data: ClaimablePosition[] }

POST /payouts/claim/:marketId
Response: { success, data: { payout, outcome, yesTokens, noTokens } }
```

### Admin

```typescript
GET /admin/markets/resolvable
Response: { success, data: Market[] }

POST /admin/markets/:id/resolve
Body: { outcome: "YES" | "NO" | "INVALID", proof? }
Response: { success, data: Market }
```

---

## 📜 Smart Contracts

**Repository**: [HydraMarket-Contract](https://github.com/Rudraprajapati2612/HydraMarket-Contract)

### Market Registry

**Program ID**: See contract repository for deployed program IDs

```rust
// Initialize market on-chain
pub fn initialize_market(
    ctx: Context<InitializeMarket>,
    params: MarketParams,
) -> Result<()>

// Open market for trading
pub fn open_market(ctx: Context<OpenMarket>) -> Result<()>

// Set to resolving state (expired)
pub fn resolving_market(ctx: Context<ResolvingMarket>) -> Result<()>

// Finalize with outcome
pub fn finalize_market(
    ctx: Context<FinalizeMarket>,
    outcome: Outcome,
) -> Result<()>
```

### Escrow Vault

```rust
// Initialize vault for a market
pub fn initialize_vault(ctx: Context<InitializeVault>) -> Result<()>

// Mint complementary YES/NO pairs
pub fn mint_pairs(
    ctx: Context<MintPairs>,
    pairs: u64,
) -> Result<()>

// Settle vault after resolution
pub fn settle(ctx: Context<Settle>) -> Result<()>

// Claim payout (burn tokens, get USDC)
pub fn claim_payout(ctx: Context<ClaimPayout>) -> Result<()>
```

### Resolution Adapter

```rust
// Initialize resolution for market
pub fn initialize_resolution(
    ctx: Context<InitializeResolution>,
    category: Category,
) -> Result<()>

// Propose outcome with bond
pub fn propose_crypto_outcome(
    ctx: Context<ProposeCryptoOutcome>,
    price_pair: String,
    condition: Condition,
    feed_ids: Vec<String>,
    bond_amount: u64,
) -> Result<()>

// Dispute a proposal
pub fn dispute_proposal(
    ctx: Context<DisputeProposal>,
    counter_outcome: Outcome,
    reason: String,
    bond_amount: u64,
) -> Result<()>

// Finalize after dispute window
pub fn finalize_outcome(
    ctx: Context<FinalizeOutcome>,
    outcome: Outcome,
) -> Result<()>
```

---

## ⚙️ Workers & Services

### Settlement Worker (Rust)

**Purpose**: Mint YES/NO tokens on Solana when complementary matches occur

**Architecture**: 🔵 Centralized (listens to Redis) + 🟢 Decentralized (writes to Solana)

**Flow**:
1. Pop from `mint:queue` (Redis)
2. Transfer USDC: hot_wallet → escrow_vault
3. Call `escrow_vault.mint_pairs()`
4. Update positions in PostgreSQL
5. Mark orders as FILLED

**Start**: `cargo run --release` in `apps/settlement-worker`

---

### Withdrawal Worker (Rust)

**Purpose**: Transfer USDC from hot wallet to user's Phantom wallet

**Architecture**: 🔵 Centralized (listens to DB) + 🟢 Decentralized (Solana transfers)

**Flow**:
1. Query `withdrawals` table WHERE status='PENDING'
2. Update status to 'PROCESSING'
3. Build Solana transaction
4. Transfer USDC via SPL Token program
5. Update status to 'CONFIRMED' + release reserved balance

**Start**: `cargo run --release` in `apps/withdrawal-worker`

---

### Resolution Adapter (TypeScript)

**Purpose**: Automatically resolve markets using oracles

**Architecture**: 🔵 Centralized (reads oracles) + 🟢 Decentralized (writes on-chain)

**Flow**:
1. Cron job runs every hour
2. Fetch expired markets (state=OPEN, expiresAt < NOW)
3. Determine oracle: Pyth (crypto) or RapidAPI (sports)
4. Fetch outcome data
5. Update market on-chain
6. Push to payout queue

**Supported Oracles**:
- **Pyth Hermes**: BTC/USD, ETH/USD, SOL/USD
- **RapidAPI Cricbuzz**: Cricket match results

**Start**: `bun start` in `apps/resolution-adapter`

---

### Deposit Indexer (TypeScript)

**Purpose**: Monitor hot wallet for incoming USDC transfers

**Architecture**: 🔵 Centralized

**Flow**:
1. Connect WebSocket to Solana RPC
2. Subscribe to hot wallet account changes
3. Parse transaction memo field
4. Match memo to user (`depositeMemo`)
5. Credit user balance in database

**Start**: `bun start` in `apps/deposit-indexer`

---

## 🌐 Deployment

### Frontend (Vercel)

```bash
cd apps/frontend
vercel --prod
```

**Environment Variables**:
- `VITE_API_URL`
- `VITE_SOLANA_NETWORK`

---

### Backend (Railway / AWS)

```bash
# API Gateway
cd apps/api-gateway
railway up

# Matching Engine (Docker)
docker build -t matching-engine .
docker run -p 50051:50051 matching-engine

# Workers (PM2)
pm2 start settlement-worker
pm2 start withdrawal-worker
pm2 start resolution-adapter
pm2 start deposit-indexer
```

---

### Solana Programs (Mainnet)

See the [HydraMarket-Contract](https://github.com/Rudraprajapati2612/HydraMarket-Contract) repository for deployment instructions.

```bash
cd HydraMarket-Contract
anchor build
anchor deploy --provider.cluster mainnet
```

**Update Program IDs** in:
- `.env` files
- `Anchor.toml`
- Frontend constants

---

## 🤝 Contributing

We welcome contributions! Please follow these guidelines:

### Development Process

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Standards

- **TypeScript**: ESLint + Prettier
- **Rust**: `cargo fmt` + `cargo clippy`
- **Commits**: Conventional Commits format
- **Tests**: Required for new features

### Areas to Contribute

- 🐛 **Bug fixes**: Check [Issues](https://github.com/Rudraprajapati2612/hydramarket/issues)
- ✨ **New features**: Propose in discussions
- 📚 **Documentation**: Always appreciated
- 🌍 **Translations**: Multi-language support
- 🎨 **UI/UX**: Design improvements

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

## 👤 Author

**Rudra Prajapati**  
Full-stack, Blockchain & AI Engineer

- 🐙 GitHub: [@Rudraprajapati2612](https://github.com/Rudraprajapati2612)
- 🐦 Twitter: [@0xRudraSol](https://x.com/0xRudraSol)
- 📧 Email: [rudraprajapati2612@gmail.com](mailto:rudraprajapati2612@gmail.com)

---

## 🙏 Acknowledgments

- [Solana Foundation](https://solana.org/) - Blockchain infrastructure
- [Pyth Network](https://pyth.network/) - Price oracles
- [Anchor Framework](https://www.anchor-lang.com/) - Smart contract development
- [RapidAPI](https://rapidapi.com/) - Sports data integration
- [Shadcn/ui](https://ui.shadcn.com/) - UI components

---

## 📊 Stats

![GitHub stars](https://img.shields.io/github/stars/Rudraprajapati2612/hydramarket?style=social)
![GitHub forks](https://img.shields.io/github/forks/Rudraprajapati2612/hydramarket?style=social)
![GitHub issues](https://img.shields.io/github/issues/Rudraprajapati2612/hydramarket)
![GitHub pull requests](https://img.shields.io/github/issues-pr/Rudraprajapati2612/hydramarket)

---

<p align="center">
  Made with ❤️ by Rudra Prajapati
</p>

<p align="center">
  <a href="#-table-of-contents">Back to Top ↑</a>
</p>
