# Checkered — Grant Application Notes

## One-Liner
Checkered is a trustless iRacing tournament platform on Base where smart contracts handle USDC escrow and automated prize distribution — bringing blockchain transparency to competitive sim racing.

## Problem
Sim racing tournaments currently rely on manual payout management by league admins. This creates disputes about prize distribution, delays in payouts, and a trust dependency on a single person. Entry fees are collected through PayPal or Venmo with no transparency, and there's no verifiable record of results or payouts.

## Solution
Checkered replaces manual tournament management with smart contracts on Base:
- **Entry fees** are escrowed in USDC by the smart contract — no admin can misappropriate funds
- **Prize distribution** is automated and verifiable on-chain — 1st/2nd/3rd receive USDC based on configurable splits
- **Results are oracle-verified** — an off-chain oracle polls the iRacing API and submits cryptographically signed results
- **Everything is on-chain** — players can verify the full lifecycle on BaseScan

## CDP Integrations

### 1. CDP Smart Wallet (via OnchainKit)
- **What**: OnchainKit `Wallet` component with `preference: "all"` enables both Smart Wallet (email/passkey) and traditional EOA (MetaMask) connections
- **Why**: Most iRacing players are NOT crypto-native. Smart Wallet lets them create a wallet with just an email, eliminating the biggest onboarding barrier
- **Where**: `checkered/app/components/Header.tsx` — Wallet, ConnectWallet, WalletDropdown components

### 2. Coinbase Onramp
- **What**: `FundButton` in header + `WalletDropdownFundLink` in wallet dropdown
- **Why**: Players need USDC to pay tournament entry fees. Onramp lets them go from USD → USDC in minutes without leaving the app
- **Where**: `checkered/app/components/Header.tsx` — FundButton + WalletDropdownFundLink

### 3. Base Paymaster (Gasless Transactions)
- **What**: `isSponsored={true}` on the registration `Transaction` component, with Paymaster URL configured in OnchainKit provider
- **Why**: New-to-crypto players shouldn't need ETH for gas to register for a tournament. Sponsored transactions remove that friction entirely
- **Where**: `checkered/app/components/RegisterForTournament.tsx` — Transaction with isSponsored; `checkered/app/rootProvider.tsx` — Paymaster config

### 4. Base Chain
- **What**: All contracts deployed on Base Sepolia (testnet), targeting Base mainnet for production
- **Why**: Gas fees <$0.01 make $1 micro-entry tournaments economically viable. Native USDC via Circle partnership means no bridging. Coinbase ecosystem alignment (Smart Wallet, Onramp, Paymaster all integrate natively)

## Technical Differentiators
1. **Oracle-verified results** — iRacing API data is cryptographically hashed and submitted on-chain, creating a verifiable record
2. **Batched transactions** — OnchainKit's Transaction component batches USDC approve + tournament register into a single flow via EIP-5792
3. **Full lifecycle on-chain** — Creation, registration, results, distribution, and cancellation/refunds are all contract operations
4. **Role-based access** — OpenZeppelin AccessControl separates Admin, Oracle, and Player permissions
5. **Security-first** — ReentrancyGuard, Pausable, SafeERC20, 35 passing tests covering all edge cases

## Deployed Contracts
- **IRacingTournament**: [0x325C6D6d0386F0cAf0200d94043eef9A87a21aEA](https://sepolia.basescan.org/address/0x325C6D6d0386F0cAf0200d94043eef9A87a21aEA) (Base Sepolia)
- **MockUSDC**: [0xD24Ed1355C533771360A4a8dC724C1c1Fe2cB918](https://sepolia.basescan.org/address/0xD24Ed1355C533771360A4a8dC724C1c1Fe2cB918) (Base Sepolia)

## Demo Video Talking Points
1. **Connect wallet** — Show Smart Wallet creation (email/passkey) and MetaMask option
2. **Fund wallet** — Click FundButton to show Coinbase Onramp flow
3. **Create tournament** — Admin creates a tournament with entry fee, max players, prize split
4. **Register as player** — Enter iRacing ID, show the gasless (Paymaster-sponsored) registration transaction
5. **Show on-chain** — Open BaseScan to show the escrowed USDC and contract state
6. **Oracle flow** — Show the backend polling and submitting results (mock mode)
7. **Prize distribution** — Show the automated USDC payout to winners on BaseScan

## Market Opportunity
- iRacing has 200,000+ active subscribers globally
- Sim racing is the fastest-growing motorsport category
- Existing tournament platforms (iRacing leagues, SimRacingGP) have no blockchain integration
- Entry fee tournaments are already popular — Checkered makes them trustless and automated

## Roadmap
1. **Now**: Base Sepolia testnet deployment with all CDP integrations working
2. **Next**: Security audit + Base mainnet deployment
3. **Then**: Partner with iRacing league organizers for real-world testing
4. **Future**: Expand to other sim platforms (ACC, rFactor 2), add Swap API for multi-token entry fees
