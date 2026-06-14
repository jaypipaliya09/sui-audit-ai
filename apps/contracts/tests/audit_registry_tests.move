#[test_only]
module move_auditor::registry_tests {
    use sui::test_scenario::{Self as ts, Scenario};
    use move_auditor::registry::{Self, AuditRegistry};

    const ADMIN: address = @0xCAFE;

    fun setup(scenario: &mut Scenario) {
        ts::next_tx(scenario, ADMIN);
        {
            registry::init_for_testing(ts::ctx(scenario));
        };
    }

    #[test]
    fun test_init_creates_shared_registry() {
        let mut scenario = ts::begin(ADMIN);
        setup(&mut scenario);

        ts::next_tx(&mut scenario, ADMIN);
        {
            let registry = ts::take_shared<AuditRegistry>(&scenario);
            ts::return_shared(registry);
        };

        ts::end(scenario);
    }

    #[test]
    fun test_anchor_audit_adds_record() {
        let mut scenario = ts::begin(ADMIN);
        setup(&mut scenario);

        ts::next_tx(&mut scenario, ADMIN);
        {
            let mut registry = ts::take_shared<AuditRegistry>(&scenario);
            let contract_hash = b"abc123hash";
            let blob_id = b"walrus_blob_xyz";

            registry::anchor_audit(
                &mut registry,
                contract_hash,
                blob_id,
                3, // HIGH risk
                ts::ctx(&mut scenario),
            );

            assert!(registry::verify_audit(&registry, contract_hash), 0);

            ts::return_shared(registry);
        };

        ts::end(scenario);
    }

    #[test]
    fun test_verify_returns_false_for_unknown_hash() {
        let mut scenario = ts::begin(ADMIN);
        setup(&mut scenario);

        ts::next_tx(&mut scenario, ADMIN);
        {
            let registry = ts::take_shared<AuditRegistry>(&scenario);
            let unknown_hash = b"unknown_hash_xyz";

            assert!(!registry::verify_audit(&registry, unknown_hash), 0);

            ts::return_shared(registry);
        };

        ts::end(scenario);
    }
}
