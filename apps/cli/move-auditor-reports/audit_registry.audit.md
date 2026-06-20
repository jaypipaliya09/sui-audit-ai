# Executive Summary
The registry contract anchors smart-contract audit records on-chain but provides zero access control: any address may write any audit result for any contract hash, making the entire trust model trivially bypassable. A front-running DoS vector allows an adversary to permanently block legitimate audit records for any target hash. Combined with unvalidated input fields and no revocation path, the contract cannot reliably serve its stated purpose of providing trustworthy on-chain audit attestations for a payments/wallet context.

# Overall Risk Assessment
The overall risk of the contract is **CRITICAL**. The lack of access control, the possibility of front-running DoS attacks, and the absence of input validation and revocation mechanisms make the contract highly vulnerable to attacks and misuse.

# Detailed Findings
## Critical Findings
### FIND-001: Permissionless anchor_audit — anyone can fabricate audit results
* **Severity:** CRITICAL
* **Category:** ACCESS_CONTROL
* **Location:** move_auditor::registry, function anchor_audit, lines 43-67
* **Description:** The anchor_audit function is public and has no access control, allowing any address to write any audit result for any contract hash.
* **Impact:** An attacker can anchor a fraudulent 'CLEAN' record for any malicious payment contract before the real auditor does, causing downstream consumers of verify_audit to trust the malicious contract.
* **Recommendation:** Introduce a capability object (e.g., AuditorCap) minted only by init and transferred to the trusted auditor address. Require this capability as an argument to anchor_audit.

### FIND-002: Front-running DoS permanently blocks legitimate audit records
* **Severity:** HIGH
* **Category:** DOS
* **Location:** move_auditor::registry, function anchor_audit, line 53
* **Description:** An adversary monitoring the mempool can observe a pending legitimate anchor transaction, extract the contract_hash, and submit their own anchor_audit for the same hash with a higher gas price.
* **Impact:** Legitimate audits for targeted contracts can be blocked indefinitely at low cost.
* **Recommendation:** Either use table::upsert semantics (add if absent, overwrite if present) restricted to the capability holder, or store a vector of AuditRecord per hash to support versioned audits.

## Medium Findings
### FIND-003: overall_risk accepts out-of-range values (>4)
* **Severity:** MEDIUM
* **Category:** LOGIC
* **Location:** move_auditor::registry, function anchor_audit, lines 48, 55
* **Description:** The overall_risk field is documented as 0=Clean through 4=Critical, but no assertion enforces this range.
* **Impact:** Off-chain dashboards and on-chain integrations that switch on overall_risk may produce incorrect output or panic.
* **Recommendation:** Add an assertion to enforce the range: assert!(overall_risk <= 4, EInvalidRiskLevel);

### FIND-004: Unbounded input vectors enable gas griefing and storage bloat
* **Severity:** MEDIUM
* **Category:** GAS
* **Location:** move_auditor::registry, function anchor_audit, lines 44-45
* **Description:** contract_hash and walrus_blob_id are accepted as vector<u8> with no length validation.
* **Impact:** Shared object storage bloat degrades performance for all users.
* **Recommendation:** Enforce maximum lengths: assert!(vector::length(&contract_hash) == 32, EInvalidHash);

### FIND-005: No audit update or revocation mechanism
* **Severity:** MEDIUM
* **Category:** LOGIC
* **Location:** move_auditor::registry, function null, lines 43-67
* **Description:** Once an AuditRecord is anchored, the contract provides no function to update, supersede, or revoke it.
* **Impact:** Stale or incorrect audit records remain authoritative on-chain indefinitely.
* **Recommendation:** Add an update_audit entry function gated by AuditorCap to allow correction of stale or erroneous records.

## Low Findings
### FIND-006: AuditAnchored event omits auditor_address
* **Severity:** LOW
* **Category:** OTHER
* **Location:** move_auditor::registry, function anchor_audit, lines 26-30, 61-66
* **Description:** The AuditAnchored event does not include the auditor_address.
* **Impact:** Reduced auditability and accountability.
* **Recommendation:** Add auditor_address to the AuditAnchored struct and populate it from ctx sender in anchor_audit.

### FIND-007: walrus_blob_id not verified to reference an existing blob
* **Severity:** LOW
* **Category:** ASSET_SAFETY
* **Location:** move_auditor::registry, function anchor_audit, lines 45, 56
* **Description:** The walrus_blob_id field is accepted as an opaque byte vector with no on-chain verification.
* **Impact:** The on-chain record and off-chain audit report can be decoupled.
* **Recommendation:** At minimum, document the expected encoding of walrus_blob_id and validate its byte length.

### FIND-008: contract_hash key not validated as canonical hash format
* **Severity:** LOW
* **Category:** LOGIC
* **Location:** move_auditor::registry, function anchor_audit, lines 44, 52-53
* **Description:** contract_hash is used as the table key and is semantically intended to be a deterministic hash of the audited contract bytecode, but no length or format check is enforced.
* **Impact:** verify_audit can return false for a legitimately audited contract if the caller used a different encoding.
* **Recommendation:** Enforce assert!(vector::length(&contract_hash) == 32, EInvalidHash) for SHA-256.

# Recommendations and Next Steps
1. **CRITICAL FIRST:** Gate anchor_audit behind a capability object (AuditorCap) created in init and held by the trusted auditor.
2. Add input validation (hash length == 32, risk value <= 4, blob ID length bounded) before writing any record to prevent malformed data and gas griefing.
3. Implement an update_audit function gated by AuditorCap to allow correction of stale or erroneous records.
4. Add auditor_address to the AuditAnchored event to enable complete audit attribution from event streams alone.
5. Define and enforce a canonical walrus_blob_id format and document the expected relationship between the blob content and the on-chain risk score.

---

## 🌊 Stored on Walrus

This report is permanently stored on Walrus (decentralized storage):

- **Report:** [https://aggregator.walrus-testnet.walrus.space/v1/blobs/NtfWSTSQTL5sJHXfTj962ejZc4nThz_YGz-sZykPyow](https://aggregator.walrus-testnet.walrus.space/v1/blobs/NtfWSTSQTL5sJHXfTj962ejZc4nThz_YGz-sZykPyow)
- **Blob ID:** `NtfWSTSQTL5sJHXfTj962ejZc4nThz_YGz-sZykPyow`
