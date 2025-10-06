## Punk Auction Watcher

A lightweight TypeScript watcher that polls the on-chain strategy and token, then prints a clean dashboard each tick. Calls are batched to minimize RPC load.

### Prerequisites
- Node.js 18+
- An Ethereum RPC endpoint (HTTP)

### Install (step-by-step)
1) Install Node Version Manager (nvm):
   - Follow the official instructions: https://github.com/nvm-sh/nvm

2) Install Node with nvm and set it active:
```bash
nvm install node
nvm use node
```

3) Install dependencies (from package.json):
```bash
npm install
```

### Run
```bash
# Minimal
RPC_URL=https://ethereum-rpc.publicnode.com npx tsx watch.ts

# Custom refresh interval (ms) and show ETH for a given PAST amount
INTERVAL_MS=3000 \
PAST_AMOUNT=500 \
RPC_URL=https://ethereum-rpc.publicnode.com \
npx tsx watch.ts
```

### What it shows
```bash
punk.auction watcher @ 2025-10-06T20:39:33.964Z
================================================================================
Strategy
- currentAuctionPrice 66665 PAST
  - holder:           37.652 ETH
  - minter:           46.019 ETH
- auction:            active=true id=0 punkId=4859 start=2025-10-06T11:04:23.000Z
┌────────┬────────────────────┬────────────────────┐
│ Target │ Redeem             │ Mint               │
├────────┼────────────────────┼────────────────────┤
│ 50 ETH │ X                  │ X                  │
├────────┼────────────────────┼────────────────────┤
│ 40 ETH │ X                  │ 0 hours 23 minutes │
├────────┼────────────────────┼────────────────────┤
│ 30 ETH │ 0 hours 37 minutes │ 1 hours 11 minutes │
└────────┴────────────────────┴────────────────────┘

Token
- price (redeem):     0.000565 ETH
- price (mint):       0.000690 ETH
- totalSupply:        5113476 PAST
- effectiveSupply:    5113476 PAST
- lockedSupply:       0 PAST
- reserve:            962.679 ETH
- surplus:            8.514 ETH
- previewRedeem:      0.565 ETH (1000 PAST)
```

### Environment variables
- RPC_URL: HTTP RPC endpoint (required)
- INTERVAL_MS: refresh interval in milliseconds (optional; default 5000)
- PAST_AMOUNT: a token amount to quote via previewRedeem (optional; integer or decimal string)

### Addresses (mainnet)
- PunkStrategy: `0x489f2913588cC34De20fE55Ee1130529656A6625`
- PunkStrategyToken: `0x38778E6d4d0dbE9bEceF3aE8B938570209efa48B`

### Notes
- The script performs one multicall for core fields and a single on-chain `previewRedeem(1 PAST)`; all other ETH equivalents are derived locally from that rate.
- Time-to-50-ETH uses the current PAST/ETH rate and the on-chain exponential decay rate; it’s an approximation.
