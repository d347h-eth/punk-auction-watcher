// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {IStrategyToken} from "./interfaces/IStrategyToken.sol";
import {IPunks} from "./interfaces/IPunks.sol";
import {AuctionHouse} from "./AuctionHouse.sol";
import {SafeTransferLib} from "solady/utils/SafeTransferLib.sol";

contract PunkStrategy is AuctionHouse {
    IStrategyToken public token;
    IPunks public punks;

    uint256 public constant REWARD = 0.01 ether;

    error NotPunkOwner();

    event PunkBought(uint256 indexed punkId, uint256 price);

    constructor(address _token, address _punks) {
        token = IStrategyToken(_token);
        punks = IPunks(_punks);
    }

    function buyPunk(uint256 punkId) external payable {
        // check if punk for sale and get punk price

        // Fetch punk offer details
        (,,, uint256 minValue,) = punks.punksOfferedForSale(punkId);

        // Calculate required ETH (punk price + reward)
        uint256 totalRequired = minValue + REWARD;
        uint256 balance = address(this).balance;

        // pull needed funds from token contract
        if (balance < totalRequired) {
            uint256 needed = totalRequired - balance;
            token.useSurplus(needed);
        }

        // Buy the punk
        punks.buyPunk{value: minValue}(punkId);
        require(punks.punkIndexToAddress(punkId) == address(this), "Not punk owner");

        emit PunkBought(punkId, minValue);

        // pay reward to sender
        SafeTransferLib.safeTransferETH(msg.sender, REWARD);
    }

    receive() external payable {} // can receive ETH

    function _prepareAuction(uint256 punkId) internal view override {
        require(punks.punkIndexToAddress(punkId) == address(this), "Not punk owner");
    }

    function _settleAuction(uint256 punkId, address buyer, uint256 price) internal override {
        token.lock(price, buyer);
        punks.transferPunk(buyer, punkId);
    }
}