// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {FixedPointMathLib} from "solady/utils/FixedPointMathLib.sol";

abstract contract AuctionHouse {
    uint256 public constant AUCTION_START_PRICE = 21_000_000 * 1e17; // 10% of total supply
    uint256 public constant AUCTION_DECAY_RATE = 1e14;

    event AuctionStarted(uint256 indexed auctionId, uint256 indexed punkId);
    event AuctionSettled(
        uint256 indexed auctionId, uint256 indexed punkId, address indexed buyer, uint256 price
    );

    Auction public auction;

    uint256 public _nextAuctionId;

    struct Auction {
        bool active;
        uint256 auctionId;
        uint256 punkId;
        uint256 startTime;
    }

    modifier whenAuctionActive() {
        require(auction.active, "Auction not active");
        _;
    }

    modifier whenAuctionNotActive() {
        require(!auction.active, "Auction already active");
        _;
    }

    function startAuction(uint256 punkId)
        external
        whenAuctionNotActive
        returns (uint256 auctionId)
    {
        _prepareAuction(punkId);

        auctionId = _nextAuctionId++;
        auction = Auction({
            active: true,
            auctionId: auctionId,
            punkId: punkId,
            startTime: block.timestamp
        });
        emit AuctionStarted(auctionId, punkId);
    }

    function take(uint256 maxPrice) external whenAuctionActive {
        uint256 price = currentAuctionPrice();
        require(price <= maxPrice, "Price too high");

        auction.active = false;
        uint256 punkId = auction.punkId;
        uint256 auctionId = auction.auctionId;
        _settleAuction(punkId, msg.sender, price);
        emit AuctionSettled(auctionId, punkId, msg.sender, price);
    }

    function currentAuction() external view returns (Auction memory) {
        return auction;
    }

    function isAuctionActive() external view returns (bool) {
        return auction.active;
    }

    function currentAuctionPrice() public view returns (uint256) {
        if (!auction.active) return 0;
        return _priceAt(block.timestamp - auction.startTime);
    }

    function _priceAt(uint256 t) internal pure virtual returns (uint256 price) {
        int256 exp = -int256(AUCTION_DECAY_RATE) * int256(t);
        uint256 ratio = uint256(FixedPointMathLib.expWad(exp));

        if (ratio == 0) return 1;

        price = FixedPointMathLib.mulWadUp(AUCTION_START_PRICE, ratio);
    }

    function _prepareAuction(uint256 punkId) internal virtual;
    function _settleAuction(uint256 punkId, address buyer, uint256 price) internal virtual;
}