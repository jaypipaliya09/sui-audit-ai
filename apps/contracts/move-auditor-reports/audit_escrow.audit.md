# Executive Summary
The escrow contract implements a basic lock/capture/refund lifecycle for audit payments but has several significant flaws. Most critically, capture() requires zero proof of AI audit delivery — either party can sweep funds without any on-chain binding to an audit result, violating the oracle trust boundary central to this AI track. A second structural flaw is the fully dead status field: STATUS_LOCKED is set on creation but never checked, and status is silently discarded in every consuming function, indicating an incomplete state machine. The payer-can-refund-at-any-time design creates a reliable griefing vector against the auditing service performing off-chain AI work.

# Overall Risk Assessment
The overall risk assessment of the contract is **HIGH** due to the presence of several critical vulnerabilities that can be exploited by attackers to steal funds or disrupt the normal functioning of the contract.

# Detailed Findings
## High Severity Findings
### FIND-001: Capture Requires No Proof of AI Audit Delivery — Oracle Trust Boundary Violation
* **Severity:** HIGH
* **Category:** OTHER
* **Location:** move_auditor::escrow, function: capture, line hint: Lines 83-97
* **Description:** capture() allows either payer or authority to sweep escrow funds to authority with no on-chain evidence that an audit was performed or that any AI model output was delivered.
* **Impact:** Authority (or a compromised authority key) can call capture() at any time without delivering an audit report, stealing the payer's funds.
* **Recommendation:** Introduce a required audit result commitment before capture is permitted.

### FIND-002: Payer Can Unilaterally Refund Mid-Audit — Griefing the AI Service
* **Severity:** HIGH
* **Category:** LOGIC
* **Location:** move_auditor::escrow, function: refund, line hint: Lines 100-115
* **Description:** refund() permits the payer to trigger a refund at any time without authority consent.
* **Impact:** Payer performs a free AI audit: lock funds, trigger off-chain AI processing, receive results via event/callback, then call refund() before authority calls capture().
* **Recommendation:** Implement a time-locked refund: record a lock_epoch or lock_timestamp in AuditEscrow.

## Medium Severity Findings
### FIND-003: Dead Status Field — Incomplete State Machine
* **Severity:** MEDIUM
* **Category:** LOGIC
* **Location:** move_auditor::escrow, function: null, line hint: Lines 9, 22, 90, 111
* **Description:** STATUS_LOCKED (= 0) is defined and assigned in lock(), but the status field is explicitly ignored in both capture() and refund() destructuring.
* **Impact:** No direct exploit due to Move ownership guarantees, but the dead state field is misleading.
* **Recommendation:** Either remove the status field entirely or implement the full state machine with STATUS_CAPTURED and STATUS_REFUNDED.

### FIND-004: Payer Authorized to Trigger Capture — Unexpected Payment Authorization Model
* **Severity:** MEDIUM
* **Category:** ACCESS_CONTROL
* **Location:** move_auditor::escrow, function: capture, line hint: Lines 84-85
* **Description:** The capture() guard allows sender == escrow.payer in addition to sender == escrow.authority.
* **Impact:** Compromised payer key equals compromised capture key.
* **Recommendation:** Restrict capture() to sender == escrow.authority only.

### FIND-008: No Replay Protection for Off-Chain AI Result Submission
* **Severity:** MEDIUM
* **Category:** OTHER
* **Location:** move_auditor::escrow, function: capture, line hint: Lines 83-97
* **Description:** For the AI track specifically: capture() accepts no parameters representing the AI audit result.
* **Impact:** Off-chain AI result attestations cannot be cryptographically bound to a specific escrow without redesign.
* **Recommendation:** Add a job_id: ID field to AuditEscrow referencing the specific audit job.

## Low Severity Findings
### FIND-005: Zero-Amount Escrow Allowed
* **Severity:** LOW
* **Category:** LOGIC
* **Location:** move_auditor::escrow, function: lock, line hint: Lines 62-79
* **Description:** lock() does not assert that the payment coin has value > 0.
* **Impact:** Low-cost spam of shared objects and events.
* **Recommendation:** Add `assert!(amount > 0, EZeroAmount)` in lock().

### FIND-006: No Validation of Authority Address
* **Severity:** LOW
* **Category:** ACCESS_CONTROL
* **Location:** move_auditor::escrow, function: lock, line hint: Lines 62-79
* **Description:** lock() accepts any address as authority, including @0x0 (zero address) and the payer's own address.
* **Impact:** Payer setting authority == self can trivially refund at will with no meaningful escrow semantics.
* **Recommendation:** Assert `authority != payer` and `authority != @0x0` in lock().

### FIND-007: amount Field Redundant and Potentially Stale
* **Severity:** LOW
* **Category:** LOGIC
* **Location:** move_auditor::escrow, function: null, line hint: Lines 22-28
* **Description:** AuditEscrow stores both funds: Balance<T> and amount: u64.
* **Impact:** No current exploit.
* **Recommendation:** Remove the redundant amount field.

# Recommendations and Next Steps
1. **CRITICAL PRIORITY** — Bind capture() to on-chain AI result proof: require a result_blob_id or result_hash parameter in capture(), store a commitment hash in AuditEscrow at lock time or via a separate commit() function, and assert the submitted result matches before releasing funds.
2. **HIGH PRIORITY** — Add timelock to payer-initiated refunds: record lock_epoch in AuditEscrow, allow payer refund only after N epochs elapsed, giving the authority a window to deliver results and call capture() without race condition.
3. **HIGH PRIORITY** — Restrict capture() to authority-only: remove sender == escrow.payer from capture() guard to enforce role separation between the party paying and the party attesting to service delivery.
4. **MEDIUM PRIORITY** — Implement the status state machine or remove the field: either delete status: u8 entirely or add STATUS_CAPTURED/STATUS_REFUNDED with enforcement.
5. **LOW PRIORITY** — Add input validation in lock(): assert amount > 0, authority != @0x0, and authority != payer to prevent degenerate escrow configurations.
6. **DESIGN RECOMMENDATION** — Add a job_id: ID field linking each escrow to a specific audit job, enabling future non-interactive proof-of-delivery patterns and preventing cross-escrow result replay if signed attestations are introduced.