module move_auditor::registry {
    use sui::object::{Self, UID};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use sui::event;
    use sui::table::{Self, Table};

    /// Shared object that stores all audit records on-chain.
    struct AuditRegistry has key {
        id: UID,
        records: Table<vector<u8>, AuditRecord>,
        total_audits: u64,
    }

    /// Individual audit record stored inside the registry table.
    struct AuditRecord has store, copy, drop {
        contract_hash: vector<u8>,
        walrus_blob_id: vector<u8>,
        overall_risk: u8,          // 0=Clean 1=Low 2=Medium 3=High 4=Critical
        audited_at: u64,
        auditor_address: address,
    }

    /// Event emitted every time an audit is anchored on-chain.
    struct AuditAnchored has copy, drop {
        contract_hash: vector<u8>,
        walrus_blob_id: vector<u8>,
        overall_risk: u8,
        audited_at: u64,
    }

    /// Module initializer — creates the shared AuditRegistry object.
    fun init(ctx: &mut TxContext) {
        transfer::share_object(AuditRegistry {
            id: object::new(ctx),
            records: table::new(ctx),
            total_audits: 0,
        });
    }

    /// Anchor a new audit record on-chain. Emits an AuditAnchored event.
    public entry fun anchor_audit(
        registry: &mut AuditRegistry,
        contract_hash: vector<u8>,
        walrus_blob_id: vector<u8>,
        overall_risk: u8,
        ctx: &mut TxContext
    ) {
        let audited_at = tx_context::epoch_timestamp_ms(ctx);
        let auditor_address = tx_context::sender(ctx);

        table::add(&mut registry.records, contract_hash, AuditRecord {
            contract_hash,
            walrus_blob_id,
            overall_risk,
            audited_at,
            auditor_address,
        });

        registry.total_audits = registry.total_audits + 1;

        event::emit(AuditAnchored {
            contract_hash,
            walrus_blob_id,
            overall_risk,
            audited_at,
        });
    }

    /// Check whether a contract hash has been audited (read-only).
    public fun verify_audit(registry: &AuditRegistry, contract_hash: vector<u8>): bool {
        table::contains(&registry.records, contract_hash)
    }
}
