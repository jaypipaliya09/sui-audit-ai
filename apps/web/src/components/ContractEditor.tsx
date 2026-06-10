import React, { useState } from 'react';
import Editor from '@monaco-editor/react';

const VULNERABLE_CONTRACT = `/// A vulnerable DeFi vault contract for demo purposes.
/// Contains 3 intentional bugs:
///   1. CRITICAL: No access control on withdraw — anyone can drain the vault
///   2. HIGH: No slippage protection on swap — sandwich attack vector
///   3. MEDIUM: Unbounded loop in batch_claim — DoS vector
module vulnerable_defi::vault {
    use sui::object::{Self, UID};
    use sui::coin::{Self, Coin};
    use sui::balance::{Self, Balance};
    use sui::sui::SUI;
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};
    use sui::vec_map::{Self, VecMap};

    // ─── Error codes ─────────────────────────────────────────────────
    const E_INSUFFICIENT_BALANCE: u64 = 0;
    const E_ZERO_AMOUNT: u64 = 1;

    // ─── Structs ─────────────────────────────────────────────────────

    /// The main vault that holds user deposits
    struct Vault has key {
        id: UID,
        total_balance: Balance<SUI>,
        fee_percentage: u64,       // basis points (e.g., 30 = 0.3%)
        pending_rewards: VecMap<address, u64>,
    }

    /// Admin capability — should be required for sensitive operations
    struct AdminCap has key, store {
        id: UID,
    }

    // ─── Initialization ──────────────────────────────────────────────

    fun init(ctx: &mut TxContext) {
        let admin_cap = AdminCap {
            id: object::new(ctx),
        };
        transfer::transfer(admin_cap, tx_context::sender(ctx));

        let vault = Vault {
            id: object::new(ctx),
            total_balance: balance::zero<SUI>(),
            fee_percentage: 30,
            pending_rewards: vec_map::empty(),
        };
        transfer::share_object(vault);
    }

    // ─── Deposit (safe) ──────────────────────────────────────────────

    /// Users can deposit SUI into the vault
    public entry fun deposit(
        vault: &mut Vault,
        coin: Coin<SUI>,
        _ctx: &mut TxContext,
    ) {
        let amount = coin::value(&coin);
        assert!(amount > 0, E_ZERO_AMOUNT);

        let balance = coin::into_balance(coin);
        balance::join(&mut vault.total_balance, balance);
    }

    // ─── BUG #1: CRITICAL — No access control on withdraw ───────────
    //
    // This function should require AdminCap or check that the caller
    // is the depositor. Currently ANYONE can call it and drain the vault.

    /// Withdraw SUI from the vault
    public entry fun withdraw(
        vault: &mut Vault,
        amount: u64,
        ctx: &mut TxContext,
    ) {
        // BUG: No ownership check! Anyone can withdraw any amount.
        assert!(
            balance::value(&vault.total_balance) >= amount,
            E_INSUFFICIENT_BALANCE,
        );

        let withdrawn = balance::split(&mut vault.total_balance, amount);
        let coin = coin::from_balance(withdrawn, ctx);
        transfer::public_transfer(coin, tx_context::sender(ctx));
    }

    // ─── BUG #2: HIGH — No slippage protection on swap ──────────────
    //
    // This swap function has no minimum output amount parameter,
    // making it vulnerable to sandwich attacks and front-running.

    /// Swap SUI for vault shares (simplified)
    public entry fun swap(
        vault: &mut Vault,
        coin_in: Coin<SUI>,
        ctx: &mut TxContext,
    ) {
        let amount_in = coin::value(&coin_in);
        assert!(amount_in > 0, E_ZERO_AMOUNT);

        // BUG: No min_amount_out parameter — sandwich attack vector
        let fee = (amount_in * vault.fee_percentage) / 10000;
        let amount_out = amount_in - fee;

        let balance_in = coin::into_balance(coin_in);
        balance::join(&mut vault.total_balance, balance_in);

        // Simplified: return the net amount back (in real DeFi, this would be a different token)
        let out_balance = balance::split(&mut vault.total_balance, amount_out);
        let out_coin = coin::from_balance(out_balance, ctx);
        transfer::public_transfer(out_coin, tx_context::sender(ctx));
    }

    // ─── BUG #3: MEDIUM — Unbounded loop in batch_claim ─────────────
    //
    // Iterating over all pending_rewards without a limit means a
    // malicious user can add many entries and cause out-of-gas on claim.

    /// Batch claim all pending rewards
    public entry fun batch_claim(
        vault: &mut Vault,
        ctx: &mut TxContext,
    ) {
        let size = vec_map::size(&vault.pending_rewards);

        // BUG: Unbounded loop — DoS if pending_rewards grows too large
        let i = 0;
        while (i < size) {
            let (_addr, reward_amount) = vec_map::pop(&mut vault.pending_rewards);

            if (reward_amount > 0 && balance::value(&vault.total_balance) >= reward_amount) {
                let reward_balance = balance::split(&mut vault.total_balance, reward_amount);
                let reward_coin = coin::from_balance(reward_balance, ctx);
                transfer::public_transfer(reward_coin, tx_context::sender(ctx));
            };

            i = i + 1;
        };
    }

    // ─── View functions ──────────────────────────────────────────────

    /// Get the total vault balance
    public fun get_balance(vault: &Vault): u64 {
        balance::value(&vault.total_balance)
    }

    /// Get the fee percentage
    public fun get_fee(vault: &Vault): u64 {
        vault.fee_percentage
    }
}
`;

const CLEAN_CONTRACT = `/// A well-written NFT collection contract for demo purposes.
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
`;

interface ContractEditorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function ContractEditor({ value, onChange, disabled }: ContractEditorProps) {
  const MAX_CHARS = 49000;
  
  return (
    <div className="flex flex-col w-full h-[600px] border border-gray-800 rounded-lg overflow-hidden bg-[#1e1e1e]">
      <div className="flex flex-row gap-4 p-4 border-b border-gray-800 bg-[#121212]">
        <button
          onClick={() => onChange(VULNERABLE_CONTRACT)}
          disabled={disabled}
          className="px-4 py-2 text-sm font-medium text-orange-400 bg-orange-400/10 hover:bg-orange-400/20 rounded border border-orange-400/20 transition-colors disabled:opacity-50"
        >
          Load Vulnerable Contract
        </button>
        <button
          onClick={() => onChange(CLEAN_CONTRACT)}
          disabled={disabled}
          className="px-4 py-2 text-sm font-medium text-green-400 bg-green-400/10 hover:bg-green-400/20 rounded border border-green-400/20 transition-colors disabled:opacity-50"
        >
          Load Clean Contract
        </button>
      </div>

      <div className="flex-1 w-full relative">
        <Editor
          height="100%"
          language="plaintext"
          theme="vs-dark"
          value={value}
          onChange={(val) => onChange(val || '')}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: 'on',
            wordWrap: 'off',
            readOnly: disabled,
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
          }}
          loading={
            <div className="flex items-center justify-center h-full w-full text-gray-500">
              <div className="animate-pulse flex items-center space-x-2">
                <div className="h-4 w-4 bg-gray-600 rounded-full"></div>
                <span>Loading Editor...</span>
              </div>
            </div>
          }
        />
      </div>

      <div className="flex flex-row justify-between items-center p-3 border-t border-gray-800 bg-[#121212] text-xs text-gray-400">
        <div>
          Move Smart Contract
        </div>
        <div className={`flex items-center gap-2 ${value.length > MAX_CHARS ? 'text-red-400' : ''}`}>
          {value.length > MAX_CHARS && <span>⚠️ 50KB max exceeded</span>}
          <span>{value.length.toLocaleString()} / 50,000 chars</span>
        </div>
      </div>
    </div>
  );
}
