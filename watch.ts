// @ts-nocheck
/*
  Simple watcher for PunkStrategy and PunkStrategyToken using viem.
  - Reads ABIs from ./abi-*.json
  - Polls key view functions and prints a clear dashboard

  Usage:
    1) npm i viem
    2) RPC_URL=https://your.rpc.url npx tsx watch.ts
*/

import { createPublicClient, http, formatUnits, parseUnits } from "viem";
import Table from "cli-table3";
import { mainnet } from "viem/chains";
import fs from "fs";
import path from "path";

// Minimal declaration to avoid needing @types/node in this repo
declare const process: any;

// === Addresses ===
const STRATEGY_ADDRESS = "0x489f2913588cC34De20fE55Ee1130529656A6625" as const;
const TOKEN_ADDRESS = "0x38778E6d4d0dbE9bEceF3aE8B938570209efa48B" as const;

// === Load ABIs ===
function loadJson(file: string) {
  const p = path.resolve(process.cwd(), file);
  const raw = fs.readFileSync(p, "utf8");
  return JSON.parse(raw);
}
function loadTokenAbi() { return loadJson("abi-token.json"); }
function loadStrategyAbi() { return loadJson("abi-strategy.json"); }

const strategyAbi = loadStrategyAbi();

const client = createPublicClient({
  chain: mainnet,
  transport: http(process.env.RPC_URL || "https://eth.llamarpc.com"),
});

function fmtEth(v: bigint) {
  const n = Number(formatUnits(v, 18));
  return `${n.toFixed(3)} ETH`;
}

function fmtPastInt(v: bigint, decimals: number) {
  const s = formatUnits(v, decimals);
  const intStr = s.split(".")[0];
  return `${intStr} PAST`;
}

async function tick() {
  const tokenAbi = loadTokenAbi();

  const mc = await client.multicall({
    allowFailure: false,
    contracts: [
      { address: STRATEGY_ADDRESS, abi: strategyAbi, functionName: "auction", args: [] },
      { address: STRATEGY_ADDRESS, abi: strategyAbi, functionName: "currentAuctionPrice", args: [] },
      { address: STRATEGY_ADDRESS, abi: strategyAbi, functionName: "AUCTION_DECAY_RATE", args: [] },

      { address: TOKEN_ADDRESS, abi: tokenAbi, functionName: "decimals", args: [] },
      { address: TOKEN_ADDRESS, abi: tokenAbi, functionName: "totalSupply", args: [] },
      { address: TOKEN_ADDRESS, abi: tokenAbi, functionName: "effectiveSupply", args: [] },
      { address: TOKEN_ADDRESS, abi: tokenAbi, functionName: "lockedSupply", args: [] },
      { address: TOKEN_ADDRESS, abi: tokenAbi, functionName: "reserve", args: [] },
      { address: TOKEN_ADDRESS, abi: tokenAbi, functionName: "surplus", args: [] },
    ],
  });

  const sAuction = mc[0] as unknown as {
    active: boolean;
    auctionId: bigint;
    punkId: bigint;
    startTime: bigint;
  };
  const sCurPrice = mc[1] as bigint;
  const sDecayRate = mc[2] as bigint;

  const tDecimals = mc[3] as number;
  const tSupply = mc[4] as bigint;
  const tEffSupply = mc[5] as bigint;
  const tLocked = mc[6] as bigint;
  const tReserve = mc[7] as bigint;
  const tSurplus = mc[8] as bigint;

  const auction = sAuction;

  console.clear();
  const now = new Date().toISOString();
  console.log(`punk.auction watcher @ ${now}`);
  console.log("".padEnd(80, "="));

  const decimalsNum = Number(tDecimals);

  console.log("Strategy");
  // Fetch only price for 1 PAST, derive other ETH equivalents locally
  let curPriceEthStr = "n/a";
  let curPriceEthNum = 0;
  let onePastEthStr = "n/a";
  let onePastEthNum = 0;

  const onePastBase = parseUnits("1", decimalsNum);
  const mc2 = await client.multicall({
    allowFailure: false,
    contracts: [
      { address: TOKEN_ADDRESS, abi: tokenAbi, functionName: "previewRedeem", args: [onePastBase] },
      { address: TOKEN_ADDRESS, abi: tokenAbi, functionName: "previewMint", args: [onePastBase] },
    ],
  });
  const oneOut = mc2[0] as bigint;
  onePastEthNum = Number(formatUnits(oneOut, 18));
  onePastEthStr = `${onePastEthNum.toFixed(6)} ETH`;
  // 1 PAST mint price in ETH (6 decimals)
  const oneMintOut = mc2[1] as bigint;
  const onePastMintEthNum = Number(formatUnits(oneMintOut, 18));
  const onePastMintEthStr = `${onePastMintEthNum.toFixed(6)} ETH`;
  // Derive auction price ETH
  const curPastNum = Number(formatUnits(sCurPrice as bigint, decimalsNum));
  curPriceEthNum = curPastNum * onePastEthNum;
  curPriceEthStr = `${curPriceEthNum.toFixed(3)} ETH`;
  const curPriceEthMintNum = curPastNum * onePastMintEthNum;
  const curPriceEthMintStr = `${curPriceEthMintNum.toFixed(3)} ETH`;

  // PAST integer display for auction price
  const curPricePastStr = fmtPastInt(sCurPrice as bigint, decimalsNum);

  // Approx time until price hits 50 ETH using redeem and mint rates
  const k = Number(sDecayRate) / 1e18; // effective per-second decay
  let timeTo50Redeem = "n/a";
  let timeTo50Mint = "n/a";
  let timeTo40Redeem = "n/a";
  let timeTo40Mint = "n/a";
  let timeTo30Redeem = "n/a";
  let timeTo30Mint = "n/a";
  try {
    if (curPastNum > 0 && onePastEthNum > 0 && k > 0) {
      const toStr = (seconds: number) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return `${hours} hours ${minutes} minutes`;
      };

      // Redeem-based decay
      const setRedeem = (eth: number) => {
        const targetPast = eth / onePastEthNum;
        const ratio = curPastNum / targetPast;
        if (ratio <= 1) return `0 hours 0 minutes`;
        return toStr(Math.log(ratio) / k);
      };
      timeTo50Redeem = setRedeem(50);
      timeTo40Redeem = setRedeem(40);
      timeTo30Redeem = setRedeem(30);

      // Mint-based decay
      const setMint = (eth: number) => {
        const targetPast = eth / onePastMintEthNum;
        const ratio = curPastNum / targetPast;
        if (ratio <= 1) return `0 hours 0 minutes`;
        return toStr(Math.log(ratio) / k);
      };
      timeTo50Mint = setMint(50);
      timeTo40Mint = setMint(40);
      timeTo30Mint = setMint(30);
    }
  } catch {}

  // Auction start time in UTC
  const startUtc = new Date(Number(auction.startTime) * 1000).toISOString();

  console.log(`- currentAuctionPrice ${curPricePastStr}`);
  console.log(`  - holder:           ${curPriceEthStr}`);
  console.log(`  - minter:           ${curPriceEthMintStr}`);
  console.log(
    `- auction:            active=${auction.active} id=${auction.auctionId.toString()} punkId=${auction.punkId.toString()} start=${startUtc}`,
  );
  const table = new Table({ head: ["Target", "Redeem", "Mint"], style: { head: ["cyan"] } });
  table.push(
    ["50 ETH", timeTo50Redeem, timeTo50Mint],
    ["40 ETH", timeTo40Redeem, timeTo40Mint],
    ["30 ETH", timeTo30Redeem, timeTo30Mint],
  );
  console.log(table.toString());

  console.log("");
  console.log("Token");
  console.log(`- price (1 PAST):     ${onePastEthStr} (redeem)`);
  console.log(`- price (1 PAST):     ${onePastMintEthStr} (mint)`);
  console.log(`- totalSupply:        ${fmtPastInt(tSupply as bigint, decimalsNum)}`);
  console.log(`- effectiveSupply:    ${fmtPastInt(tEffSupply as bigint, decimalsNum)}`);
  console.log(`- lockedSupply:       ${fmtPastInt(tLocked as bigint, decimalsNum)}`);
  console.log(`- reserve:            ${fmtEth(tReserve as bigint)}`);
  console.log(`- surplus:            ${fmtEth(tSurplus as bigint)}`);

  // Optional: compute ETH value for a user-specified PAST amount by deriving from 1 PAST rate
  const pastAmountEnv = process.env.PAST_AMOUNT;
  if (pastAmountEnv && pastAmountEnv.trim().length > 0) {
    try {
      const amount = Number(pastAmountEnv.trim());
      const eth = amount * onePastEthNum;
      console.log(`- previewRedeem:      ${eth.toFixed(3)} ETH (${pastAmountEnv} PAST)`);
    } catch (e) {
      console.log(`- previewRedeem:      error (${(e as Error).message || e}) (${pastAmountEnv} PAST)`);
    }
  }
}

async function main() {
  const intervalMs = Number(process.env.INTERVAL_MS || 5000);
  // Run immediately, then on interval
  await tick().catch((e) => console.error(e));
  setInterval(() => {
    tick().catch((e) => console.error(e));
  }, intervalMs);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


