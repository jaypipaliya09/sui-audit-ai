module move_auditor::escrow {
    use sui::object::{Self, UID, ID};
    use sui::tx_context::{Self, TxContext};
    use sui::coin::{Self, Coin};
    use sui::balance::{Self, Balance};
    use sui::transfer;
    use sui::event;

    /// Escrow that is still holding the payer's funds (blocked, not yet spent).
    const STATUS_LOCKED: u8 = 0;

    /// Caller is not allowed to perform this action on the escrow.
    const ENotAuthorized: u64 = 1;

    /// Shared escrow object that holds blocked coins for a single audit job.
    /// Generic over the coin type `T` so it works with USDC (or any Coin<T>).
    ///
    /// Lifecycle:
    ///   lock()    -> funds are blocked inside this object (status LOCKED)
    ///   capture() -> authority sweeps the funds to itself  (success / deposit)
    ///   refund()  -> payer or authority returns the funds  (failure / Ctrl+C)
    struct AuditEscrow<phantom T> has key {
        id: UID,
        payer: address,
        authority: address,
        funds: Balance<T>,
        amount: u64,
        status: u8,
    }

    /// Emitted when funds are blocked.
    struct EscrowLocked has copy, drop {
        escrow_id: ID,
        payer: address,
        authority: address,
        amount: u64,
    }

    /// Emitted when funds are deposited to the authority (audit succeeded).
    struct EscrowCaptured has copy, drop {
        escrow_id: ID,
        authority: address,
        amount: u64,
    }

    /// Emitted when funds are returned to the payer (audit failed / interrupted).
    struct EscrowRefunded has copy, drop {
        escrow_id: ID,
        payer: address,
        amount: u64,
    }

    /// Block `payment` into a new shared escrow object.
    /// Called and signed by the payer (the wallet being audited).
    public entry fun lock<T>(
        payment: Coin<T>,
        authority: address,
        ctx: &mut TxContext
    ) {
        let payer = tx_context::sender(ctx);
        let amount = coin::value(&payment);

        let escrow = AuditEscrow<T> {
            id: object::new(ctx),
            payer,
            authority,
            funds: coin::into_balance(payment),
            amount,
            status: STATUS_LOCKED,
        };

        event::emit(EscrowLocked {
            escrow_id: object::id(&escrow),
            payer,
            authority,
            amount,
        });

        transfer::share_object(escrow);
    }

    /// Deposit the blocked funds to the treasury (audit completed successfully).
    /// The funds always go to the recorded `authority` (treasury), so the
    /// payer can sign capture themselves — the treasury never needs a key.
    public entry fun capture<T>(escrow: AuditEscrow<T>, ctx: &mut TxContext) {
        let sender = tx_context::sender(ctx);
        assert!(sender == escrow.payer || sender == escrow.authority, ENotAuthorized);

        let AuditEscrow { id, payer: _, authority, funds, amount, status: _ } = escrow;
        let escrow_id = object::uid_to_inner(&id);

        let payout = coin::from_balance(funds, ctx);
        transfer::public_transfer(payout, authority);

        event::emit(EscrowCaptured { escrow_id, authority, amount });
        object::delete(id);
    }

    /// Return the blocked funds to the payer (audit failed or was interrupted).
    /// Either the payer or the authority may refund, so the CLI can roll back
    /// on Ctrl+C without needing the authority to be online.
    public entry fun refund<T>(escrow: AuditEscrow<T>, ctx: &mut TxContext) {
        let sender = tx_context::sender(ctx);
        assert!(sender == escrow.payer || sender == escrow.authority, ENotAuthorized);

        let AuditEscrow { id, payer, authority: _, funds, amount, status: _ } = escrow;
        let escrow_id = object::uid_to_inner(&id);

        let payout = coin::from_balance(funds, ctx);
        transfer::public_transfer(payout, payer);

        event::emit(EscrowRefunded { escrow_id, payer, amount });
        object::delete(id);
    }

    /// Read the blocked amount (read-only helper).
    public fun amount<T>(escrow: &AuditEscrow<T>): u64 {
        balance::value(&escrow.funds)
    }
}
