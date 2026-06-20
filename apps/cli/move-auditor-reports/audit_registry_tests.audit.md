# Executive Summary
This is a test-only module for the AuditRegistry contract. While the module itself carries no production risk, the tests reveal critical gaps in the production registry's security posture: anchor_audit appears to be permissionless (any address can anchor audit records), no duplicate-anchor prevention is tested, and no adversarial scenarios are covered. These test omissions strongly suggest the underlying production contract lacks key access controls and integrity guarantees.

# Overall Risk Assessment
The overall risk of the contract is **HIGH**, due to the lack of access control and duplicate-anchor prevention in the anchor_audit function, as well as the absence of adversarial scenario testing.

# Detailed Findings
## High Severity Findings
### FIND-001: anchor_audit appears permissionless — no access control enforced or tested
* **Severity:** HIGH
* **Category:** ACCESS_CONTROL
* **Location:** move_auditor::registry_tests, test_anchor_audit_adds_record (Lines 29-45)
* **Description:** The test calls registry::anchor_audit with only &mut AuditRegistry and TxContext — no capability object, no admin witness, no signer allowlist check. The production function signature inferred from this test accepts no authorization parameter. Any address on-chain can therefore anchor arbitrary audit records with any contract_hash, blob_id, and risk_level they choose.
* **Impact:** Attacker can poison the registry: anchor a malicious blob_id under a legitimate contract_hash, or anchor a clean risk_level (0) for a known-vulnerable contract, undermining the integrity of the entire audit provenance system. This defeats the purpose of an immutable audit registry.
* **Recommendation:** Require an AdminCap or AuditorCap capability object as a parameter to anchor_audit. Only holders of the cap can write records. Add a test that asserts a non-admin address cannot call anchor_audit (use #[test, expected_failure]).

### FIND-002: No duplicate-anchor prevention tested — registry records may be overwritable
* **Severity:** HIGH
* **Category:** ASSET_SAFETY
* **Location:** move_auditor::registry_tests, test_anchor_audit_adds_record (Lines 29-45)
* **Description:** No test anchors the same contract_hash twice to verify behavior. If the production anchor_audit uses Table::add (which aborts on duplicate) the contract is safe; if it uses Table::upsert or a raw insert, an attacker or even a legitimate auditor can overwrite an existing audit record — changing the blob_id or risk_level after the fact. The absence of this test leaves the invariant unverified.
* **Impact:** If overwrite is possible: a previously recorded CRITICAL audit can be replaced with a CLEAN one, or a legitimate blob_id replaced with a malicious one. This breaks audit immutability and replay-protection of the registry.
* **Recommendation:** Add a test that anchors the same hash twice and asserts the second call aborts with expected_failure. In production code, ensure Table::add (not upsert) is used so duplicate anchoring is rejected at the VM level.

## Medium Severity Findings
### FIND-003: risk_level has no range validation or boundary tests
* **Severity:** MEDIUM
* **Category:** LOGIC
* **Location:** move_auditor::registry_tests, test_anchor_audit_adds_record (Line 36)
* **Description:** risk_level is passed as a raw u8 integer (value 3, commented as HIGH). No test exercises boundary values (0, 255, or any value outside the expected 0–4 or 0–5 enum range). If the production code does not validate the range, callers can store arbitrary numeric risk levels that downstream consumers (UI, verifiers) may misinterpret.
* **Impact:** A caller passes risk_level = 0 for a known-critical contract, or 255 as an undefined sentinel, causing consumers to display incorrect risk ratings or panic on enum conversion.
* **Recommendation:** Assert valid risk_level range in production anchor_audit (e.g., assert!(risk_level <= MAX_RISK, EInvalidRiskLevel)). Add tests for out-of-range values using expected_failure.

### FIND-004: No test for empty or malformed contract_hash / blob_id inputs
* **Severity:** MEDIUM
* **Category:** LOGIC
* **Location:** move_auditor::registry_tests, test_anchor_audit_adds_record (Lines 32-33)
* **Description:** Both contract_hash and blob_id are accepted as vector<u8> with no length validation tested. An empty vector (b"") anchored as a contract_hash would create a zero-key registry entry. Depending on production code, this could allow a griefing attack where an attacker anchors the empty-string hash first, permanently blocking legitimate use of that key if duplicates abort.
* **Impact:** Griefing: anchor b"" or a collision-prone short hash to block legitimate auditors. Data integrity: consumers comparing hashes may produce false-positives on empty inputs.
* **Recommendation:** Add length assertions in production: assert!(vector::length(&contract_hash) == 32, EInvalidHash) for a SHA-256 or similar fixed-size hash. Test that empty input aborts.

## Low Severity Findings
### FIND-005: verify_audit leaks registry state — no test for timing or enumeration risk
* **Severity:** LOW
* **Category:** ACCESS_CONTROL
* **Location:** move_auditor::registry_tests, test_verify_returns_false_for_unknown_hash (Lines 55-67)
* **Description:** verify_audit is a public read function returning bool. This is likely intentional for on-chain composability, but no test or documentation verifies whether the full audit record (blob_id, auditor address, risk_level, timestamp) is also publicly readable. If registry entries expose the auditor's address, it could be used to target or impersonate auditors.
* **Impact:** Low — informational for most deployments. In adversarial environments, knowing which address anchored a specific audit enables social engineering or targeted attacks against auditors.
* **Recommendation:** Confirm registry record fields are intentionally public. If auditor identity should be confidential, store only a commitment hash of the auditor address rather than the raw address.

### FIND-006: Test suite lacks adversarial coverage — no negative/failure path tests except one
* **Severity:** LOW
* **Category:** OTHER
* **Location:** move_auditor::registry_tests (Lines 1-74)
* **Description:** Only one negative test exists (verify returns false for unknown hash). Missing: unauthorized anchor attempt, duplicate anchor, invalid risk_level, empty hash, anchor then verify mismatch after attempted overwrite. For a security-critical audit registry, the test suite should be dominated by adversarial cases.
* **Impact:** High-confidence false assurance: the green test suite does not validate the security properties the contract is supposed to provide.
* **Recommendation:** Add #[test, expected_failure] tests for: (1) non-admin calling anchor_audit, (2) duplicate hash anchor, (3) out-of-range risk_level, (4) empty contract_hash. Follow the pattern of property-based testing where invariants are explicitly asserted.

# Recommendations and Next Steps
1. **CRITICAL PRIORITY:** Add a capability object (AdminCap or AuditorCap) as a required parameter to anchor_audit in the production registry module. The current test proves no authorization exists. Deploy this fix before mainnet.
2. **HIGH PRIORITY:** Use Table::add (aborting on duplicate) in production anchor_audit to enforce immutability. Add a #[test, expected_failure] confirming duplicate hash anchoring aborts.
3. **HIGH PRIORITY:** Validate contract_hash length matches your hash function output (e.g., 32 bytes for SHA-256). Reject empty or undersized hashes at the entry point.
4. **MEDIUM PRIORITY:** Add explicit risk_level range validation in production (0–N where N is your max enum value) with a named abort code. Test boundary violations.
5. **MEDIUM PRIORITY:** Expand test suite to adversarial scenarios — for every public write function, there must be at least one test proving unauthorized callers are rejected.

---

## 🌊 Stored on Walrus

This report is permanently stored on Walrus (decentralized storage):

- **Report:** [https://aggregator.walrus-testnet.walrus.space/v1/blobs/SGSFgiFQTTjLMHP1T-tmaXPyEYJNQXiiv_CpRD5mbps](https://aggregator.walrus-testnet.walrus.space/v1/blobs/SGSFgiFQTTjLMHP1T-tmaXPyEYJNQXiiv_CpRD5mbps)
- **Blob ID:** `SGSFgiFQTTjLMHP1T-tmaXPyEYJNQXiiv_CpRD5mbps`
