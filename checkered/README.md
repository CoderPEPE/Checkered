# Checkered

**Blockchain-powered iRacing tournaments on Base with automated USDC prize distribution.**

Checkered brings trustless, transparent tournament management to sim racing. Smart contracts on Base chain handle USDC escrow and automated payouts — no middlemen, no payout disputes, every transaction verifiable on-chain.

## Architecture

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│   Frontend        │────▶│  Smart Contracts  │◀────│  Oracle Backend  │
│   (Next.js +      │     │  (Solidity/Base)  │     │  (Node.js)       │
│    OnchainKit)    │     │                   │     │                  │
│ • Smart Wallet    │     │ • USDC escrow     │     │ • iRacing API    │
│ • Tournament CRUD │     │ • Prize splits    │     │ • Result polling │
│ • Coinbase Onramp │     │ • Access control  │     │ • On-chain submit│
│ • Base Paymaster  │     │ • ReentrancyGuard │     │ • Wallet mapping │
└──────────────────┘     └──────────────────┘     └──────────────────┘
```

## CDP Integrations

| Integration | How It's Used |
|---|---|
| **CDP Smart Wallet** | OnchainKit Wallet component — email/passkey wallet creation for non-crypto users |
| **Coinbase Onramp** | FundButton + WalletDropdownFundLink — fiat-to-USDC in minutes |
| **Base Paymaster** | `isSponsored` on registration Transaction — gasless player registration |
| **Base Chain** | Deployed on Base Sepolia — <$0.01 gas makes micro-entry tournaments viable |

## How It Works

1. **Admin creates tournament** — sets entry fee, max players, prize split (e.g., 60/30/10)
2. **Players register** — connect wallet, pay USDC entry fee, link iRacing customer ID
3. **Smart contract escrows USDC** — funds locked until race completion or cancellation
4. **Race runs on iRacing** — oracle backend polls iRacing API for results
5. **Oracle submits results** — maps iRacing IDs to wallets, triggers on-chain distribution
6. **Prizes auto-distribute** — 1st/2nd/3rd paid in USDC, minus 5% platform fee

## Quick Start

### Prerequisites
- Node.js v18+
- Git

### 1. Install Dependencies
```bash
# Root (smart contracts + Hardhat)
npm install

# Oracle backend
cd backend && npm install && cd ..

# Next.js frontend
cd checkered && npm install && cd ..
```

### 2. Compile & Test Smart Contracts
```bash
npx hardhat compile
npx hardhat test
# 35 tests passing
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
| IRacingTournament | [`0x44cB744685c5591ac19E3b04d10569F735e5E263`](https://sepolia.basescan.org/address/0x44cB744685c5591ac19E3b04d10569F735e5E263) |
| MockUSDC | [`0x77905c2eDa81D18449015d979D670c29948A31F8`](https://sepolia.basescan.org/address/0x77905c2eDa81D18449015d979D670c29948A31F8) |

## Project Structure

```
checkered/
├── contracts/              # Solidity smart contracts
│   ├── IRacingTournament.sol
│   └── MockUSDC.sol
├── test/                   # Hardhat test suite (35 tests)
├── scripts/                # Deployment scripts
├── backend/                # Oracle backend (Node.js/Express)
│   └── src/
│       ├── index.js        # API server + polling loop
│       └── iracing-api.js  # iRacing Data API integration
├── checkered/              # Frontend (Next.js + OnchainKit)
│   └── app/
│       ├── layout.tsx      # Root layout with RootProvider
│       ├── page.tsx        # Main dashboard page
│       ├── rootProvider.tsx # OnchainKit + wagmi provider config
│       ├── contracts.ts    # Contract addresses + ABIs
│       ├── calls.ts        # Transaction call builders
│       ├── hooks/          # Custom hooks (useIsAdmin)
│       └── components/     # UI components
│           ├── Header.tsx              # Wallet + FundButton
│           ├── CreateTournament.tsx    # Admin tournament creation
│           ├── RegisterForTournament.tsx # Gasless player registration
│           ├── TournamentList.tsx      # Tournament overview
│           ├── TournamentDetail.tsx    # Single tournament view
│           └── OracleStatus.tsx        # Oracle health indicator
├── hardhat.config.js       # Hardhat config for Base networks
├── CLAUDE.md               # AI development instructions
└── README.md
```

## Why Base

- **<$0.01 gas fees** — Makes $1 micro-entry tournaments viable
- **Native USDC** — Circle partnership, no bridging needed
- **Coinbase Smart Wallet** — Email/passkey wallet creation for non-crypto users
- **Coinbase Onramp** — Fiat-to-USDC in minutes
- **Base Paymaster** — Gasless transactions for players

## License

MIT
