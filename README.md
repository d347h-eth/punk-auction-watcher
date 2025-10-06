## Punk Auction Watcher

A lightweight TypeScript watcher that polls the on-chain strategy and token, then prints a clean dashboard each tick. Calls are batched to minimize RPC load.

### Prerequisites
- Node.js 18+
- An Ethereum RPC endpoint (HTTP)

### Install
```bash
npm i viem tsx
```

### Run
```bash
# Minimal
RPC_URL=https://your.rpc npx tsx watch.ts

# Custom refresh interval (ms) and show ETH for a given PAST amount
INTERVAL_MS=3000 \
PAST_AMOUNT=500 \
RPC_URL=https://your.rpc \
npx tsx watch.ts
```

### What it shows
```bash
punk.auction watcher @ 2025-10-06T15:29:53.914Z
================================================================================
Strategy
- currentAuctionPrice 427217 PAST (273.487 ETH)
- price (1 PAST):     0.000640 ETH
- auction:            active=true id=0 punkId=4859 start=2025-10-06T11:04:23.000Z
- decay to 50 ETH:    4 hours 43 minutes

Token
- totalSupply:        5443982 PAST
- effectiveSupply:    5443982 PAST
- lockedSupply:       0 PAST
- reserve:            1161.670 ETH
- surplus:            24.786 ETH
- previewRedeem:      0.640 ETH (1000 PAST)
```


- Strategy
  - currentAuctionPrice: PAST amount (integer) and ETH equivalent
  - auction: active flag, auction id, punk id, start time (UTC)
  - decay to 50 ETH: printed twice — holder view (redeem) and minter view (mint)
- Token
  - price (1 PAST): redeem and mint prices in ETH (6 decimals)
  - totalSupply, effectiveSupply, lockedSupply (PAST, integer-rounded)
  - reserve, surplus (ETH, 3 decimals)
  - previewRedeem: ETH (3 decimals) for `PAST_AMOUNT` shown as: `previewRedeem: X.XXX ETH (N PAST)`

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
