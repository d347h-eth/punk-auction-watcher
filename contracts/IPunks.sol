// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

interface IPunks {
    function buyPunk(uint256 punkIndex) external payable;
    function transferPunk(address to, uint256 punkIndex) external;
    function offerPunkForSale(uint256 punkIndex, uint256 minSalePriceInWei) external;
    function punksOfferedForSale(uint256 punkId)
        external
        view
        returns (
            bool isForSale,
            uint256 punkIndex,
            address seller,
            uint256 minValue,
            address onlySellTo
        );
    function balanceOf(address owner) external view returns (uint256);
    function punkIndexToAddress(uint256 punkIndex) external view returns (address);
}