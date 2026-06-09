/// A vulnerable DeFi vault contract for demo purposes.
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
