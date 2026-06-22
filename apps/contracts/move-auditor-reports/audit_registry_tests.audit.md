# Executive Summary
This test-only module audits the AuditRegistry contract surface through three positive-path tests. The test suite reveals critical coverage gaps: anchor_audit accepts fully caller-controlled blob_id and risk_score with no cryptographic binding to a trusted AI oracle, and no access-control negative tests exist to confirm non-admin callers are rejected. The shared-registry architecture combined with unconstrained write access creates a high-severity attack surface where any actor can anchor fraudulent audit records with arbitrary risk scores and Walrus blob references, undermining the entire trust model of the AI-powered audit system.

# Overall Risk Assessment
The overall risk of the contract is **HIGH**, due to the lack of access control, the ability for any actor to anchor fraudulent audit records, and the absence of cryptographic binding to a trusted AI oracle.

# Detailed Findings
## High Severity Findings
### FIND-001: anchor_audit Has No Access-Control Negative Tests — Production Gate Unverified
* **Severity:** HIGH
* **Category:** ACCESS_CONTROL
* **Location:** move_auditor::registry_tests, test_anchor_audit_adds_record, Lines 28-47
* **Description:** Every test in this module calls anchor_audit as ADMIN (@0xCAFE). There is no test that attempts the call from a different address and asserts it aborts.
* **Impact:** Any address can anchor an arbitrary audit record for any contract hash. Attackers can register malicious contracts as 'LOW risk' or forge audit records for contracts they do not own, poisoning the registry that downstream consumers (wallets, dApps, badge issuers) rely on.
* **Recommendation:** Introduce an AdminCap or AuditorCap resource. anchor_audit must require `_cap: &AdminCap` or similar. Add a negative test: call anchor_audit from @0xDEAD and assert it aborts with the expected error code.

### FIND-002: AI Oracle Trust Boundary Violated — blob_id and risk_score Are Fully Caller-Controlled
* **Severity:** HIGH
* **Category:** OTHER
* **Location:** move_auditor::registry_tests, test_anchor_audit_adds_record, Lines 34-36
* **Description:** blob_id (b"walrus_blob_xyz") and risk_score (3) are raw caller-supplied values with no cryptographic binding to an authoritative AI model output.
* **Impact:** Any caller can anchor a blob_id pointing to a fabricated or attacker-controlled Walrus object paired with a self-asserted risk_score of 0 (CLEAN). Downstream consumers that read the registry to make security decisions will act on fraudulent AI outputs.
* **Recommendation:** Require an oracle signature over (contract_hash, blob_id, risk_score, epoch) verified on-chain before anchoring. Alternatively, restrict anchor_audit to a trusted oracle address via capability.

### FIND-003: Duplicate Anchor / Overwrite Behavior Untested
* **Severity:** HIGH
* **Category:** LOGIC
* **Location:** move_auditor::registry_tests, test_anchor_audit_adds_record, Lines 28-47
* **Description:** No test calls anchor_audit twice with the same contract_hash. The production registry may silently overwrite an existing audit record, or it may abort.
* **Impact:** If overwrite is allowed: attacker anchors contract_hash with risk_score=0 after a legitimate HIGH audit, erasing the warning. If abort-on-duplicate: legitimate re-audit of an updated contract is blocked forever by whoever anchors first (griefing / DoS on audit lifecycle).
* **Recommendation:** Define explicit policy: immutable-once-anchored or updateable-by-capability-only. If immutable, abort with E_ALREADY_ANCHORED on duplicate. If updateable, require the same capability used to create.

## Medium Severity Findings
### FIND-004: contract_hash Input Length Not Validated — Undersized Hash Accepted
* **Severity:** MEDIUM
* **Category:** LOGIC
* **Location:** move_auditor::registry_tests, test_anchor_audit_adds_record, Line 33
* **Description:** The test uses b"abc123hash" (10 bytes) as contract_hash. A real contract identifier would be a 32-byte SHA-256 or 20-byte address.
* **Impact:** Two different contracts with hashes that share a prefix (or an attacker who crafts a short hash matching an existing entry's prefix) could produce false verify_audit results.
* **Recommendation:** Add `assert!(vector::length(&contract_hash) == 32, E_INVALID_HASH_LENGTH)` in anchor_audit. Add a test that passes an empty or short hash and asserts abort.

### FIND-005: risk_score Range Not Validated or Documented
* **Severity:** MEDIUM
* **Category:** LOGIC
* **Location:** move_auditor::registry_tests, test_anchor_audit_adds_record, Line 37
* **Description:** The comment `// HIGH risk` implies a risk taxonomy, but no boundary test exists. Values like 255 or u64::MAX are never tested for rejection.
* **Impact:** Caller supplies risk_score = 0 to falsely mark a critical contract as clean, or supplies 255 to corrupt display logic in consumers that map the score to a label array.
* **Recommendation:** Define and enforce `assert!(risk_score <= MAX_RISK_LEVEL, E_INVALID_RISK_SCORE)` in anchor_audit. Add boundary tests: score at max valid value (passes), score at max+1 (aborts).

## Low Severity Findings
### FIND-006: No Event Emission Verified — Off-Chain Indexers Operate Blind
* **Severity:** LOW
* **Category:** OTHER
* **Location:** move_auditor::registry_tests, test_anchor_audit_adds_record, Lines 28-47
* **Description:** The test verifies registry state via verify_audit but does not assert that an AuditAnchored event (or equivalent) is emitted.
* **Impact:** Silent anchoring means no off-chain notification. Fraudulent anchors go undetected until an indexer performs an expensive full-state scan.
* **Recommendation:** Emit a structured event in anchor_audit: AuditAnchored { contract_hash, blob_id, risk_score, auditor: ctx.sender(), epoch }. Add a test that checks event emission using ts::next_tx event inspection.

### FIND-007: Capability Enforcement Not Tested — init_for_testing May Bypass Production Guards
* **Severity:** LOW
* **Category:** ACCESS_CONTROL
* **Location:** move_auditor::registry_tests, setup, Lines 9-13
* **Description:** The setup function calls init_for_testing rather than the production init. Test-only initializers commonly skip capability issuance or access-control wiring to simplify test setup.
* **Impact:** Tests pass in a permissive test environment but production init correctly issues a cap — tests then provide no signal about whether anchor_audit correctly requires the cap.
* **Recommendation:** Ensure init_for_testing mirrors production init exactly for all security-relevant state (cap issuance, admin address). Tests should explicitly take the AdminCap from the scenario and pass it to anchor_audit to confirm the production signature.

# Recommendations and Next Steps
1. **Add capability-gated access control to anchor_audit**: Introduce an AdminCap or AuditorCap resource. anchor_audit must require `_cap: &AdminCap` or similar.
2. **Implement on-chain oracle signature verification**: Require an oracle signature over (contract_hash, blob_id, risk_score, epoch) verified on-chain before anchoring.
3. **Add duplicate-anchor policy**: Define explicit policy: immutable-once-anchored or updateable-by-capability-only. If immutable, abort with E_ALREADY_ANCHORED on duplicate.
4. **Enforce vector<u8> length == 32 for contract_hash**: Add `assert!(vector::length(&contract_hash) == 32, E_INVALID_HASH_LENGTH)` in anchor_audit.
5. **Add risk_score range assertion**: Define and enforce `assert!(risk_score <= MAX_RISK_LEVEL, E_INVALID_RISK_SCORE)` in anchor_audit.
6. **Emit structured AuditAnchored events**: Emit a structured event in anchor_audit: AuditAnchored { contract_hash, blob_id, risk_score, auditor: ctx.sender(), epoch }. Add a test that checks event emission using ts::next_tx event inspection.