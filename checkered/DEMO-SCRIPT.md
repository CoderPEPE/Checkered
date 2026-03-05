# Checkered — Demo Video Script

**Target length**: 3–4 minutes
**Tone**: Casual, direct, developer-to-reviewer. No hype — just show it working.

---

## INTRO (0:00–0:20)

**[Screen: Checkered dashboard, not connected]**

> "This is Checkered — a tournament platform for iRacing sim racing, built on Base.
> The idea is simple: smart contracts hold entry fees in USDC escrow, and when the race
> is over, prizes distribute automatically. No admin handling money, no payout disputes,
> everything verifiable on-chain."

---

## SCENE 1: Connect Wallet (0:20–0:50)

**[Action: Click "Connect Wallet" in header]**

> "First, connecting a wallet. We use OnchainKit's Wallet component, which supports
> both Coinbase Smart Wallet and MetaMask."

**[Action: Show the Smart Wallet option — email/passkey creation flow]**

> "Smart Wallet is the key one here. Most sim racers aren't crypto people — they don't
> have MetaMask installed. With Smart Wallet, they create a wallet with just an email
> or a passkey. No seed phrase, no extension to install."

**[Action: Connect successfully, show wallet name + avatar in header]**

> "Connected. You can see the wallet identity in the header — that's OnchainKit's
> Identity component pulling the display name and avatar."

---

## SCENE 2: Fund Wallet (0:50–1:15)

**[Action: Click the FundButton in the header]**

> "Players need USDC to pay entry fees. This is the Coinbase Onramp — the FundButton
> opens the funding flow right from the app. Players can go from dollars in their bank
> account to USDC in their wallet in a couple minutes."

**[Action: Show the Onramp UI briefly, then close it]**

> "We also have a fund link in the wallet dropdown for easy access."

**[Action: Click wallet dropdown, show WalletDropdownFundLink]**

---

## SCENE 3: Create Tournament (1:15–1:50)

**[Action: Click "+ New Tournament" button in header]**

> "As an admin, I can create tournaments. This opens the creation form."

**[Action: Fill in: "Friday Night Thunder", $5 entry, 20 max players, 60/30/10 split, subsession ID]**

> "I'll set up a $5 USDC entry fee, max 20 players, with a 60/30/10 prize split for
> the top 3. The subsession ID links this to a specific iRacing hosted session."

**[Action: Click "Create Tournament", approve in wallet]**

> "That's a direct smart contract call — the tournament now exists on Base with those
> parameters locked in. Nobody can change the prize split or fee after creation."

**[Action: Show the new tournament card appear in the grid]**

---

## SCENE 4: Register as a Player (1:50–2:30)

**[Action: Click the tournament card to open details]**

> "Now let me register as a player."

**[Action: Enter iRacing Customer ID, click Register]**

> "I enter my iRacing customer ID and hit register. Two things to notice here."

**[Action: Show the transaction confirmation — highlight "Sponsored" badge]**

> "First — this transaction is gasless. We're using the Base Paymaster through
> OnchainKit's isSponsored flag. The player doesn't need any ETH for gas.
> That's a huge deal for onboarding non-crypto users."

> "Second — under the hood, OnchainKit is batching two calls into one: a USDC approval
> and the tournament registration. The smart contract pulls the entry fee, and it goes
> straight into escrow."

**[Action: Transaction confirms, player count updates]**

> "Done. My $5 is now locked in the contract. I can verify that on BaseScan."

---

## SCENE 5: On-Chain Verification (2:30–2:50)

**[Action: Open BaseScan in a new tab, show the tournament contract]**

> "Here's the contract on BaseScan. You can see the USDC balance — that's the escrowed
> entry fees. Every registration, every payout, every cancellation is a verifiable
> transaction. Full transparency."

---

## SCENE 6: Oracle & Prize Distribution (2:50–3:30)

**[Action: Switch to terminal showing oracle backend logs]**

> "After the race runs on iRacing, the oracle backend kicks in. It polls the iRacing
> API for results, maps iRacing customer IDs to wallet addresses, and submits the
> results on-chain."

**[Action: Show oracle log entry — "Submitting results", "Winners:", TX hash]**

> "The oracle calls submitResultsAndDistribute on the smart contract. The contract
> automatically splits the prize pool — 60% to first, 30% to second, 10% to third —
> minus a 5% platform fee. All in one atomic transaction."

**[Action: Show BaseScan — the distribution transaction with USDC transfers]**

> "Here's the distribution on BaseScan. Three USDC transfers to the winners, one to
> the treasury. No admin touched that money — it went directly from the contract to
> the winners' wallets."

---

## SCENE 7: Wrap-Up (3:30–3:50)

**[Screen: Back to Checkered dashboard showing Completed tournament]**

> "That's Checkered. Three CDP integrations — Smart Wallet for easy onboarding,
> Onramp for fiat-to-USDC, and Paymaster for gasless registration. All on Base,
> where the low gas fees make even $1 micro-entry tournaments viable."

> "The contracts are deployed on Base Sepolia, the code is open source, and the
> 35-test suite covers every edge case. Next step is a security audit and
> mainnet deployment."

> "Thanks for watching."

---

## Recording Tips

- **Resolution**: 1920x1080, browser at 90% zoom so UI elements are readable
- **Browser**: Use Chrome with a clean profile (no extensions visible except wallet)
- **Wallets**: Have two wallets ready — one admin (for creating tournaments) and one player (for registering)
- **Pre-fund**: Mint test USDC to both wallets before recording (`npx hardhat run scripts/mint-usdc.js --network baseSepolia`)
- **Backend**: Start oracle in mock mode so results submit immediately when triggered
- **Pace**: Pause 1–2 seconds after each action so viewers can see what happened
- **Editing**: Cut out wallet confirmation wait times — just show the click and the result
- **Music**: Optional subtle background, keep it minimal
