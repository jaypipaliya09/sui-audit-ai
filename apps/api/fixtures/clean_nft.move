/// A well-written NFT collection contract for demo purposes.
/// This contract follows Sui Move best practices:
///   - Proper capability-based access control
///   - Safe object ownership patterns
///   - Input validation on all public functions
///   - No unbounded operations
module clean_nft::collection {
    use sui::object::{Self, UID};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};
    use sui::event;
    use sui::display::{Self, Display};
    use sui::package::{Self, Publisher};
    use std::string::{Self, String};

    // ─── Error codes ─────────────────────────────────────────────────
    const E_INVALID_NAME: u64 = 0;
    const E_INVALID_DESCRIPTION: u64 = 1;
    const E_MAX_SUPPLY_REACHED: u64 = 2;
    const E_NAME_TOO_LONG: u64 = 3;

    // ─── Constants ───────────────────────────────────────────────────
    const MAX_SUPPLY: u64 = 10000;
    const MAX_NAME_LENGTH: u64 = 128;
    const MAX_DESC_LENGTH: u64 = 512;

    // ─── Structs ─────────────────────────────────────────────────────

    /// One-time witness for the module (Sui pattern)
    struct COLLECTION has drop {}

    /// Admin capability — only the creator holds this
    struct MintCap has key, store {
        id: UID,
        minted_count: u64,
        max_supply: u64,
    }

    /// The NFT itself
    struct CollectibleNFT has key, store {
        id: UID,
        name: String,
        description: String,
        image_url: String,
        edition_number: u64,
        creator: address,
    }

    // ─── Events ──────────────────────────────────────────────────────

    struct NFTMinted has copy, drop {
        nft_id: address,
        edition_number: u64,
        creator: address,
        recipient: address,
    }

    struct NFTBurned has copy, drop {
        nft_id: address,
        edition_number: u64,
        burned_by: address,
    }

    // ─── Initialization ──────────────────────────────────────────────

    fun init(otw: COLLECTION, ctx: &mut TxContext) {
        // Claim the Publisher object
        let publisher = package::claim(otw, ctx);

        // Create Display for the NFT type
        let mut display = display::new<CollectibleNFT>(&publisher, ctx);
        display::add(&mut display, string::utf8(b"name"), string::utf8(b"{name}"));
        display::add(&mut display, string::utf8(b"description"), string::utf8(b"{description}"));
        display::add(&mut display, string::utf8(b"image_url"), string::utf8(b"{image_url}"));
        display::update_version(&mut display);

        // Transfer Publisher and Display to creator
        transfer::public_transfer(publisher, tx_context::sender(ctx));
        transfer::public_transfer(display, tx_context::sender(ctx));

        // Create and transfer MintCap to creator
        let mint_cap = MintCap {
            id: object::new(ctx),
            minted_count: 0,
            max_supply: MAX_SUPPLY,
        };
        transfer::transfer(mint_cap, tx_context::sender(ctx));
    }

    // ─── Minting (access-controlled) ─────────────────────────────────

    /// Mint a new NFT — requires MintCap (only admin can call)
    public entry fun mint(
        mint_cap: &mut MintCap,
        name: vector<u8>,
        description: vector<u8>,
        image_url: vector<u8>,
        recipient: address,
        ctx: &mut TxContext,
    ) {
        // Validate supply limit
        assert!(mint_cap.minted_count < mint_cap.max_supply, E_MAX_SUPPLY_REACHED);

        // Validate inputs
        let name_len = std::vector::length(&name);
        let desc_len = std::vector::length(&description);
        assert!(name_len > 0 && name_len <= MAX_NAME_LENGTH, E_NAME_TOO_LONG);
        assert!(desc_len > 0 && desc_len <= MAX_DESC_LENGTH, E_INVALID_DESCRIPTION);

        // Increment count
        mint_cap.minted_count = mint_cap.minted_count + 1;

        let nft = CollectibleNFT {
            id: object::new(ctx),
            name: string::utf8(name),
            description: string::utf8(description),
            image_url: string::utf8(image_url),
            edition_number: mint_cap.minted_count,
            creator: tx_context::sender(ctx),
        };

        // Emit mint event
        event::emit(NFTMinted {
            nft_id: object::uid_to_address(&nft.id),
            edition_number: mint_cap.minted_count,
            creator: tx_context::sender(ctx),
            recipient,
        });

        // Transfer to recipient
        transfer::public_transfer(nft, recipient);
    }

    // ─── Burn (owner-only, by possession) ────────────────────────────

    /// Burn an NFT — only the owner can call this (enforced by ownership)
    public entry fun burn(
        nft: CollectibleNFT,
        ctx: &mut TxContext,
    ) {
        event::emit(NFTBurned {
            nft_id: object::uid_to_address(&nft.id),
            edition_number: nft.edition_number,
            burned_by: tx_context::sender(ctx),
        });

        let CollectibleNFT {
            id,
            name: _,
            description: _,
            image_url: _,
            edition_number: _,
            creator: _,
        } = nft;
        object::delete(id);
    }

    // ─── View functions ──────────────────────────────────────────────

    /// Get the total minted count
    public fun minted_count(mint_cap: &MintCap): u64 {
        mint_cap.minted_count
    }

    /// Get remaining supply
    public fun remaining_supply(mint_cap: &MintCap): u64 {
        mint_cap.max_supply - mint_cap.minted_count
    }

    /// Get the NFT name
    public fun name(nft: &CollectibleNFT): &String {
        &nft.name
    }

    /// Get the NFT edition number
    public fun edition(nft: &CollectibleNFT): u64 {
        nft.edition_number
    }
}
