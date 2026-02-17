// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title MonarchIntel
 * @notice NFT contract for minting Intel posts on Base
 * @dev Each Intel post becomes an ERC-721 NFT with metadata stored via tokenURI
 */
contract MonarchIntel is ERC721URIStorage, Ownable, ReentrancyGuard {
    // ============ State Variables ============

    /// @notice USDC token contract address on Base
    /// Mainnet: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
    /// Sepolia: 0x036CbD53842c5426634e7929541eC2318f3dCF7e
    IERC20 public immutable usdc;

    /// @notice Mint fee in USDC (6 decimals)
    /// Default: 0.50 USDC = 500000 (6 decimals)
    uint256 public mintFee = 500000;

    /// @notice Agent revenue share percentage (basis points)
    /// 7000 = 70%, 9000 = 90%
    uint256 public agentShareBps = 7000;

    /// @notice Platform treasury address
    address public treasury;

    /// @notice Token ID counter
    uint256 private _tokenIdCounter;

    // ============ Events ============

    event IntelMinted(
        uint256 indexed tokenId,
        address indexed minter,
        address indexed agent,
        string metadataURI,
        uint256 agentPayout,
        uint256 platformFee
    );

    event MintFeeUpdated(uint256 newFee);
    event AgentShareUpdated(uint256 newShareBps);
    event TreasuryUpdated(address newTreasury);

    // ============ Errors ============

    error InsufficientPayment();
    error InvalidAgent();
    error InvalidShare();
    error TransferFailed();

    // ============ Constructor ============

    /**
     * @param _usdc USDC token contract address
     * @param _treasury Platform treasury address
     */
    constructor(
        address _usdc,
        address _treasury
    ) ERC721("Monarch Intel", "INTEL") Ownable(msg.sender) {
        usdc = IERC20(_usdc);
        treasury = _treasury;
    }

    // ============ Minting ============

    /**
     * @notice Mint an Intel NFT
     * @param metadataURI IPFS or HTTP URL to Intel metadata JSON
     * @param agentAddress Agent's wallet address (receives revenue share)
     * @param rating Agent rating (0-5) determines revenue split
     * @return tokenId The newly minted token ID
     */
    function mintIntel(
        string calldata metadataURI,
        address agentAddress,
        uint256 rating
    ) external nonReentrant returns (uint256) {
        if (agentAddress == address(0)) revert InvalidAgent();

        // Transfer USDC from minter to this contract
        bool success = usdc.transferFrom(msg.sender, address(this), mintFee);
        if (!success) revert InsufficientPayment();

        // Calculate revenue split based on rating (0-5)
        // Rating 5 = 90%, Rating 0 = 70%
        uint256 ratingBonus = (rating * 400); // 0-2000 bps (0-20%)
        uint256 agentShare = agentShareBps + ratingBonus; // 7000-9000 bps
        if (agentShare > 10000) agentShare = 10000; // Cap at 100%

        uint256 agentPayout = (mintFee * agentShare) / 10000;
        uint256 platformFee = mintFee - agentPayout;

        // Pay agent
        usdc.transfer(agentAddress, agentPayout);

        // Pay platform
        usdc.transfer(treasury, platformFee);

        // Mint NFT
        uint256 tokenId = _tokenIdCounter++;
        _safeMint(msg.sender, tokenId);
        _setTokenURI(tokenId, metadataURI);

        emit IntelMinted(
            tokenId,
            msg.sender,
            agentAddress,
            metadataURI,
            agentPayout,
            platformFee
        );

        return tokenId;
    }

    // ============ Admin Functions ============

    /**
     * @notice Update mint fee
     * @param newFee New fee in USDC (6 decimals)
     */
    function setMintFee(uint256 newFee) external onlyOwner {
        mintFee = newFee;
        emit MintFeeUpdated(newFee);
    }

    /**
     * @notice Update base agent share (in basis points)
     * @param newShareBps New share (7000 = 70%)
     */
    function setAgentShare(uint256 newShareBps) external onlyOwner {
        if (newShareBps > 10000) revert InvalidShare();
        agentShareBps = newShareBps;
        emit AgentShareUpdated(newShareBps);
    }

    /**
     * @notice Update treasury address
     * @param newTreasury New treasury address
     */
    function setTreasury(address newTreasury) external onlyOwner {
        treasury = newTreasury;
        emit TreasuryUpdated(newTreasury);
    }

    /**
     * @notice Emergency withdraw stuck tokens
     * @param token Token address (use address(0) for ETH)
     */
    function emergencyWithdraw(address token) external onlyOwner {
        if (token == address(0)) {
            (bool success, ) = owner().call{value: address(this).balance}("");
            if (!success) revert TransferFailed();
        } else {
            IERC20(token).transfer(
                owner(),
                IERC20(token).balanceOf(address(this))
            );
        }
    }

    // ============ View Functions ============

    /**
     * @notice Get total supply of Intel NFTs
     */
    function totalSupply() external view returns (uint256) {
        return _tokenIdCounter;
    }

    /**
     * @notice Calculate payout for a given rating
     * @param rating Agent rating (0-5)
     * @return agentPayout Amount agent receives
     * @return platformFee Amount platform receives
     */
    function calculatePayout(uint256 rating) external view returns (
        uint256 agentPayout,
        uint256 platformFee
    ) {
        uint256 ratingBonus = (rating * 400);
        uint256 agentShare = agentShareBps + ratingBonus;
        if (agentShare > 10000) agentShare = 10000;

        agentPayout = (mintFee * agentShare) / 10000;
        platformFee = mintFee - agentPayout;
    }
}
