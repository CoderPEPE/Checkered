# Checkered — iRacing Tournament Platform on Base

## What This Project Is
Checkered is a blockchain-powered tournament platform for iRacing sim racing.
It uses smart contracts on Base chain (Ethereum L2 by Coinbase) to provide
trustless USDC escrow and automated prize distribution for tournaments.

## Important Context
- I am NOT a developer. I am building this with AI assistance.
- Always explain what you're doing and why before making changes.
- Ask me before making breaking changes or deleting files.
- Test everything before telling me it works.
- If something fails, explain what went wrong in plain English.
- Keep changes small and incremental — one thing at a time.
- When you write code, add comments explaining what each section does.
- If there are multiple approaches, explain the tradeoffs and let me choose.

## Architecture (3 Components)

### 1. Smart Contracts (Solidity)
- Location: `contracts/IRacingTournament.sol`
- Chain: Base (Ethereum L2) — Sepolia testnet first, then mainnet
- Key features: Tournament creation, USDC escrow, automated prize distribution,
  role-based access (Admin/Oracle), ReentrancyGuard, Pausable
- Entry fees and payouts in USDC (6 decimals)
- Prize splits configurable per tournament (e.g., 60/30/10 for top 3)
- Platform fee: 5% (capped at 20% max in contract)
- Status flow: Created → RegistrationClosed → Racing → ResultsSubmitted → Completed (or Cancelled)

### 2. Oracle Backend (Node.js/Express)
- Location: `backend/src/`
- Purpose: Bridge between iRacing API and the blockchain
- Polls iRacing Data API for race results after tournament starts
- Maps iRacing customer IDs to wallet addresses
- Submits verified results on-chain via oracle role
- Auth: Cookie-based iRacing auth with SHA-256 password hashing
- Admin endpoints protected by API key (X-API-Key header)
- Winston logger with file + console transports

### 3. Frontend (Next.js + OnchainKit)
- Location: `checkered/` (Next.js app)
- Wallet connection: Coinbase Smart Wallet + MetaMask via OnchainKit
- OnchainKit handles wallet modal, identity display, and transaction batching
- Coinbase Onramp: FundButton + WalletDropdownFundLink for fiat-to-USDC
- Base Paymaster: `isSponsored` on registration transactions for gasless UX
- Features: Tournament CRUD (admin), player registration, oracle status
- Design: Dark theme (zinc-950), Inter font, gradient accents
- API proxy: Next.js rewrites forward /api/* to backend on port 3001

## Key Addresses & Config
- USDC on Base Mainnet: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
- USDC on Base Sepolia: 0xD24Ed1355C533771360A4a8dC724C1c1Fe2cB918 (MockUSDC)
- Tournament Contract (Base Sepolia): 0x325C6D6d0386F0cAf0200d94043eef9A87a21aEA
- Base Sepolia Chain ID: 84532
- Base Mainnet Chain ID: 8453
- Base Sepolia RPC: https://sepolia.base.org
- Base Mainnet RPC: https://mainnet.base.org

## Tech Stack
- Solidity ^0.8.20 + Hardhat (smart contracts)
- OpenZeppelin v5 (AccessControl, ReentrancyGuard, Pausable, SafeERC20)
- Node.js + Express + ethers.js v6 (backend)
- Next.js 15 + TypeScript + OnchainKit (frontend)
- wagmi + viem (wallet/chain interaction)
- Tailwind CSS (styling)

## Contract Roles
- DEFAULT_ADMIN_ROLE: Can grant/revoke other roles
- ADMIN_ROLE: Can create tournaments, close registration, cancel
- ORACLE_ROLE: Can submit results and trigger prize distribution

## Contract Key Functions
- `createTournament(name, entryFee, maxPlayers, splits[], subsessionId)` — Admin creates tournament
- `register(tournamentId, iRacingId)` — Player pays USDC entry + registers
- `submitResultsAndDistribute(tournamentId, winners[3], resultHash)` — Oracle submits results
- `cancelTournament(tournamentId)` — Admin cancels, enables refunds
- `claimRefund(tournamentId)` — Player claims refund from cancelled tournament

## Oracle Flow
1. Oracle polls active tournaments every 30 seconds
2. For each tournament with status "Racing", checks iRacing API for subsession completion
3. Fetches race results, identifies top 3 finishers by position
4. Maps iRacing customer IDs to registered wallet addresses
5. Submits cryptographically signed results on-chain
6. Smart contract automatically distributes prizes

## CDP Integrations (Grant-Relevant)
- **CDP Smart Wallet**: OnchainKit Wallet component with `preference: "all"` (Smart Wallet + EOA)
- **Coinbase Onramp**: FundButton + WalletDropdownFundLink for fiat-to-USDC
- **Base Paymaster**: `isSponsored={true}` on registration Transaction component for gasless player UX
- **Base Chain**: Deployed on Base Sepolia; low gas fees make micro-entry tournaments viable

## Current Status
- [x] Smart contracts written and tested (30+ tests passing)
- [x] Oracle backend written (iRacing API integration, result polling)
- [x] Frontend migrated to Next.js + OnchainKit
- [x] CDP Smart Wallet integration (via OnchainKit)
- [x] Coinbase Onramp integration (FundButton + WalletDropdownFundLink)
- [x] Base Paymaster integration (isSponsored on registration)
- [x] Base Sepolia deployment (Tournament + MockUSDC contracts)
- [ ] End-to-end testing (manual walkthrough)
- [ ] Demo video
- [ ] GitHub public repo
- [ ] Grant application

## What We're Building Toward
1. ~~Deploy contracts to Base Sepolia testnet~~ DONE
2. ~~Integrate CDP Smart Wallet + Coinbase Onramp + Base Paymaster~~ DONE
3. Run end-to-end test tournaments with real iRacing leagues
4. Apply for Base Builder Grants and CDP Builder Grants
5. Security audit → Base mainnet deployment

## Grant Requirements (Keep These in Mind)
- Must integrate at least one CDP tool: Wallet SDK, Onramp, or Swap API
- Must be deployed on Base (Sepolia counts for initial application)
- Must have a working demo and demo video
- Open-source codebase on GitHub preferred
- Real usage metrics strengthen the application significantly

## Commands Reference
- `npx hardhat compile` — Compile smart contracts
- `npx hardhat test` — Run contract test suite
- `npx hardhat run scripts/deploy.js --network baseSepolia` — Deploy to testnet
- `npx hardhat verify --network baseSepolia CONTRACT_ADDRESS ARGS` — Verify on BaseScan
- `cd backend && npm run dev` — Start oracle backend (development mode)
- `cd checkered && npm run dev` — Start Next.js frontend dev server
- `cd checkered && npm run build` — Build frontend for production

## Environment Variables Needed

### Root .env
```
DEPLOYER_PRIVATE_KEY=
BASE_RPC_URL=
BASESCAN_API_KEY=
USDC_ADDRESS=
TREASURY_ADDRESS=
ORACLE_ADDRESS=
```

### backend/.env
```
PORT=3001
NODE_ENV=development
BASE_RPC_URL=
TOURNAMENT_CONTRACT_ADDRESS=
USDC_ADDRESS=
ORACLE_PRIVATE_KEY=
ADMIN_API_KEY=
IRACING_EMAIL=
IRACING_PASSWORD=
IRACING_MOCK_MODE=true
POLL_INTERVAL=30000
```

### checkered/.env
```
NEXT_PUBLIC_PROJECT_NAME=checkered
NEXT_PUBLIC_ONCHAINKIT_API_KEY=
```
