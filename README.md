# Checkered

**Blockchain-powered iRacing tournaments on Base with automated USDC prize distribution.**

Checkered brings trustless, transparent tournament management to sim racing. Smart contracts on Base chain handle USDC escrow and automated payouts -- no middlemen, no payout disputes, every transaction verifiable on-chain.

## Architecture

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│   Frontend        │────>│  Smart Contracts  │<────│  Oracle Backend  │
│   (Next.js +      │     │  (Solidity/Base)  │     │  (Node.js)       │
│    OnchainKit)    │     │                   │     │                  │
│                   │     │ • USDC escrow     │     │ • iRacing OAuth2 │
│ • Smart Wallet    │     │ • Prize splits    │     │ • Result polling │
│ • Tournament CRUD │     │ • Access control  │     │ • League auto-   │
│ • Coinbase Onramp │     │ • ReentrancyGuard │     │   discovery      │
│ • Base Paymaster  │     │ • Emergency       │     │ • On-chain submit│
│                   │     │   withdrawal      │     │ • Wallet mapping │
└──────────────────┘     └──────────────────┘     └──────────────────┘
```

## CDP Integrations

| Integration | How It's Used |
|---|---|
| **CDP Smart Wallet** | OnchainKit Wallet component -- email/passkey wallet creation for non-crypto users |
| **Coinbase Onramp** | FundButton + WalletDropdownFundLink -- fiat-to-USDC in minutes |
| **Base Paymaster** | `isSponsored` on registration Transaction -- gasless player registration |
| **Base Chain** | Deployed on Base Sepolia -- <$0.01 gas makes micro-entry tournaments viable |

## How It Works

1. **Admin creates tournament** -- sets entry fee, max players, prize split (e.g., 60/30/10), and optionally links an iRacing league for auto-discovery
2. **Players register** -- connect wallet, pay USDC entry fee, link iRacing customer ID
3. **Smart contract escrows USDC** -- funds locked until race completion or cancellation
4. **Race runs on iRacing** -- oracle backend polls iRacing API for results (supports league season auto-discovery)
5. **Oracle submits results** -- maps iRacing IDs to wallets, triggers on-chain distribution
6. **Prizes auto-distribute** -- winners paid in USDC, minus 5% platform fee

## Quick Start

### Prerequisites
- Node.js v18+
- Git

### 1. Install Dependencies
```bash
cd checkered

# Root (smart contracts + Hardhat)
npm install

# Oracle backend
cd backend && npm install && cd ..

# Next.js frontend
cd checkered && npm install && cd ..
```

### 2. Compile & Test Smart Contracts
```bash
cd checkered
npx hardhat compile
npx hardhat test
# 68 tests passing
```

### 3. Deploy to Base Sepolia
```bash
cp .env.example .env
# Edit .env with your deployer private key, RPC URL, etc.
npx hardhat run scripts/deploy.js --network baseSepolia
```

### 4. Run Oracle Backend
```bash
cd backend
cp .env.example .env
# Edit .env with deployed contract addresses + oracle private key
npm run dev
```

### 5. Run Frontend
```bash
cd checkered
cp .env.example .env
# Edit .env with your OnchainKit API key
npm run dev
# Opens at http://localhost:3000
```

## Deployed Contracts (Base Sepolia)

| Contract | Address |
|---|---|
| IRacingTournament | [`0x820e2b46C537938A05A4F1F3c742DC29f05D4B8d`](https://sepolia.basescan.org/address/0x820e2b46C537938A05A4F1F3c742DC29f05D4B8d) |
| MockUSDC | [`0xBc7A9d02e7ECe6F647954357d282614ff34e5954`](https://sepolia.basescan.org/address/0xBc7A9d02e7ECe6F647954357d282614ff34e5954) |

## Project Structure

```
checkered/
├── contracts/              # Solidity smart contracts
│   ├── IRacingTournament.sol  # Main tournament contract
│   └── MockUSDC.sol           # Test USDC token
├── test/                   # Hardhat test suite (68 tests)
├── scripts/                # Deployment scripts
├── backend/                # Oracle backend (Node.js/Express)
│   └── src/
│       ├── index.js        # API server + polling loop
│       ├── app.js          # Express app factory
│       └── iracing-api.js  # iRacing OAuth2 + league API
├── checkered/              # Frontend (Next.js + OnchainKit)
│   └── app/
│       ├── page.tsx        # Main dashboard
│       ├── contracts.ts    # Contract addresses + ABIs
│       ├── hooks/          # Custom hooks (useIsAdmin)
│       └── components/     # UI components
├── wallets/                # Wallet configs (gitignored, see .example files)
├── hardhat.config.js       # Hardhat config for Base networks
└── README.md
```

## Security

- Role-based access control (Admin, Oracle, DefaultAdmin)
- ReentrancyGuard on all fund-moving functions
- 30-day time-locked emergency withdrawal for stuck funds
- Timing-safe API key comparison (HMAC-based)
- Helmet security headers, CORS allowlist, rate limiting
- OAuth2 authentication for iRacing API (password_limited grant)
- Error sanitization -- no stack traces leak to clients
- Daily log rotation with size limits

## Key Features

- **League Integration**: Link tournaments to iRacing leagues -- oracle auto-discovers race subsessions from league seasons
- **Gasless Registration**: Base Paymaster sponsors player registration transactions
- **Smart Wallet**: Non-crypto users can create wallets with email/passkey via OnchainKit
- **Fiat Onramp**: Players can buy USDC directly through Coinbase Onramp
- **Configurable Prize Splits**: 1-10 winner positions with custom payout percentages
- **Emergency Withdrawal**: 30-day time-locked admin rescue for stuck tournament funds
- **Duplicate Winner Protection**: On-chain validation prevents double payouts

## Why Base

- **<$0.01 gas fees** -- Makes $1 micro-entry tournaments viable
- **Native USDC** -- Circle partnership, no bridging needed
- **Coinbase Smart Wallet** -- Email/passkey wallet creation for non-crypto users
- **Coinbase Onramp** -- Fiat-to-USDC in minutes
- **Base Paymaster** -- Gasless transactions for players

## Tech Stack

- Solidity ^0.8.20 + Hardhat + OpenZeppelin v5
- Node.js + Express + ethers.js v6
- Next.js 16 + TypeScript + OnchainKit + MUI
- wagmi + viem
- Vitest (frontend tests)

## License

MIT
