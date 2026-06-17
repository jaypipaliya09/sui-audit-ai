# Executive Summary
This registry module anchors off-chain AI audit results on-chain in a shared object, but it performs no access control or input validation on the write path, so any account can write arbitrary, attacker-controlled audit verdicts. The most serious problem is that `table::add` aborts on duplicate keys, letting an attacker permanently squat a contract hash with a forged record and block the legitimate audit from ever being recorded. Because the on-chain record fully trusts unverified off-chain AI output, the registry cannot be relied upon as a source of truth without authorization and an upsert/overwrite path.

# Overall Risk Assessment
The overall risk of the contract is **HIGH** due to the lack of access control, input validation, and authentication of off-chain AI results.

# Detailed Findings
## High Severity Findings
### FIND-001: Missing access control on anchor_audit allows anyone to forge audit records
* **Severity:** HIGH
* **Category:** ACCESS_CONTROL
* **Location:** move_auditor::registry, function anchor_audit, lines 45-72
* **Description:** anchor_audit is a public entry function with no capability check, allow-list, or admin gate. The auditor_address field is populated from tx_context::sender(ctx), meaning the 'auditor' is simply whoever submits the transaction. Any address can therefore anchor a record for any contract_hash with any overall_risk and any walrus_blob_id.
* **Impact:** An attacker can register a malicious contract as overall_risk=0 (Clean), or smear a legitimate contract as Critical, or point walrus_blob_id at a fabricated report. Any consumer that calls verify_audit and trusts the result can be deceived. The registry has no integrity guarantee.
* **Recommendation:** Introduce an AuditorCap (capability object) minted in init and transferred to the trusted auditor service, and require it as a parameter to anchor_audit. Alternatively maintain an on-chain allow-list of authorized auditor addresses and assert membership. Do not derive trust solely from tx sender.

### FIND-002: Duplicate-key abort enables permanent record squatting and re-audit DoS
* **Severity:** HIGH
* **Category:** DOS
* **Location:** move_auditor::registry, function anchor_audit, lines 56-63
* **Description:** The record is stored with table::add(&mut registry.records, contract_hash, ...). table::add aborts if the key already exists. Combined with the lack of access control (FIND-001), the first writer of any contract_hash owns that slot forever — there is no update, upsert, or remove path anywhere in the module.
* **Impact:** An attacker who front-runs or simply gets there first can pin a forged verdict to a contract_hash that can never be corrected. A legitimate re-audit (e.g. after the auditor improves, or to refresh a stale verdict) is impossible without it aborting. This is both an integrity lock-in and a denial-of-service against the audit workflow.
* **Recommendation:** Decide on intended semantics. If records should be updatable by an authorized auditor, check table::contains and use table::remove + table::add (or a mutable borrow) to overwrite. If records are immutable by design, the missing access control (FIND-001) must be fixed first so an attacker cannot pre-occupy keys, and consider keying by (contract_hash, version) to allow new audits over time.

## Medium Severity Findings
### FIND-003: Unverified off-chain AI result anchored on-chain (trust boundary / replay)
* **Severity:** MEDIUM
* **Category:** LOGIC
* **Location:** move_auditor::registry, function anchor_audit, lines 45-72
* **Description:** overall_risk and walrus_blob_id are off-chain AI model outputs passed in as raw parameters with no signature, attestation, or binding between contract_hash and the Walrus blob. The contract has no way to confirm that the blob at walrus_blob_id actually corresponds to contract_hash or that the risk score was produced by the intended model. There is also no nonce/epoch binding, so a previously valid (risk, blob) tuple for one contract can be replayed for another.
* **Impact:** On the AI track this is the core trust-boundary weakness: a caller can inject arbitrary AI verdicts or replay an old/benign audit result, and the chain records it as authoritative. Downstream dApps treating the anchored record as proof of audit are misled.
* **Recommendation:** Bind and authenticate the off-chain result: require the AuditorCap (FIND-001), and ideally verify a signature from the auditing service over the tuple (contract_hash, walrus_blob_id, overall_risk, audited_at/nonce). Emit and store the signer/model identity so consumers can scope their trust.

## Low Severity Findings
### FIND-004: overall_risk value is not range-validated
* **Severity:** LOW
* **Category:** LOGIC
* **Location:** move_auditor::registry, function anchor_audit, lines 50, 59
* **Description:** overall_risk is documented as 0..=4 (Clean..Critical) but is accepted as any u8. No assertion enforces the valid range.
* **Impact:** Out-of-range values (e.g. 200) get stored and emitted, breaking off-chain consumers and dashboards that map the integer to a risk label, and undermining any on-chain logic that branches on the score.
* **Recommendation:** Add assert!(overall_risk <= 4, E_INVALID_RISK); at the start of anchor_audit, with a named error constant.

### FIND-005: No validation of contract_hash / walrus_blob_id length or emptiness
* **Severity:** LOW
* **Category:** LOGIC
* **Location:** move_auditor::registry, function anchor_audit, lines 47-48
* **Description:** contract_hash and walrus_blob_id are arbitrary vector<u8> with no length checks. An empty vector or a wrong-length value is accepted, and an empty contract_hash can occupy the table key.
* **Impact:** Garbage or empty keys/blobs pollute the registry, and an empty contract_hash key can be squatted, reducing data quality and reliability of verify_audit lookups.
* **Recommendation:** Assert expected lengths (e.g. 32 bytes for a SHA-256 contract hash) and non-empty walrus_blob_id before insertion.

## Informational Findings
### FIND-006: Redundant storage of contract_hash inflates per-record storage cost
* **Severity:** INFO
* **Category:** GAS
* **Location:** move_auditor::registry, function anchor_audit, lines 56-63
* **Description:** contract_hash is used as the Table key and is also stored again inside the AuditRecord value. Each record persists the hash twice.
* **Impact:** Higher storage rebate footprint and per-audit gas cost; for a registry intended to scale to many audits this is pure overhead with no functional benefit since the key already identifies the record.
* **Recommendation:** Drop the contract_hash field from AuditRecord (the Table key already provides it), or remove it from the value if it is only needed for event emission.

# Recommendations and Next Steps
To address the identified findings and improve the security and reliability of the contract, the following steps are recommended:
1. **Introduce access control**: Implement an AuditorCap capability or an on-chain allow-list to restrict anchor_audit to authorized auditors.
2. **Fix duplicate-key behavior**: Decide on intended semantics and implement either updatable records or versioned keys to prevent permanent squatting.
3. **Authenticate off-chain AI results**: Bind and verify the off-chain result using a signature from the auditing service.
4. **Validate inputs**: Assert expected lengths and ranges for contract_hash, walrus_blob_id, and overall_risk.
5. **Optimize storage**: Remove redundant storage of contract_hash to reduce per-record storage cost.
6. **Consider gas optimization**: Implement input validation early to abort cheaply before performing storage writes, and minimize expensive patterns.
By addressing these findings and implementing the recommended changes, the security and reliability of the contract can be significantly improved.

---

## 🌊 Stored on Walrus

This report is permanently stored on Walrus (decentralized storage):

- **Report:** [https://aggregator.walrus-testnet.walrus.space/v1/blobs/0JxN0belacO-KC9PLCze3Of3PIDOhQ65TKTlzwobmpM](https://aggregator.walrus-testnet.walrus.space/v1/blobs/0JxN0belacO-KC9PLCze3Of3PIDOhQ65TKTlzwobmpM)
- **Blob ID:** `0JxN0belacO-KC9PLCze3Of3PIDOhQ65TKTlzwobmpM`
