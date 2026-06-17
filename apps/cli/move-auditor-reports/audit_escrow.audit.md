# Executive Summary
The move_auditor::escrow module implements a single-job payment escrow for audit fees on Sui. However, its fundamental security flaw is that the payer can unilaterally call refund() at any time, including after the audit completes, providing no binding payment guarantee to the authority. The status tracking system (STATUS_LOCKED) is entirely dead code, and the absence of mutual-consent gates, time-locks, or proof-of-delivery checks means this contract cannot be safely used in a trust-minimized payment context.

# Overall Risk Assessment
The overall risk of the contract is **HIGH** due to the lack of binding payment guarantees and the presence of several high-severity vulnerabilities.

# Detailed Findings
## High Severity
### FIND-001: Payer Can Unilaterally Self-Refund — No Binding Payment Guarantee for Authority
* **Severity:** HIGH
* **Category:** LOGIC
* **Location:** move_auditor::escrow, refund, Lines 97-113
* **Description:** refund() permits either the payer or the authority to trigger a refund with no preconditions. Because the payer is an authorized caller, they can invoke refund() at any point in the lifecycle, including immediately after the authority delivers the audit report.
* **Impact:** A payer can submit refund() the moment the audit report is delivered, retrieving their locked funds without paying the authority.
* **Recommendation:** Remove the payer from the authorized callers of refund(). Only the authority should be able to initiate a refund.

### FIND-002: Race Condition — Payer Can Front-Run Authority's capture() with refund()
* **Severity:** HIGH
* **Category:** ACCESS_CONTROL
* **Location:** move_auditor::escrow, capture / refund, Lines 83-113
* **Description:** Both capture() and refund() are gated only by payer/authority address membership with no ordering constraint or mutual-exclusion mechanism beyond Sui's object consumption.
* **Impact:** A payer acting in bad faith can race to refund after the authority broadcasts capture(), extracting funds and forcing the authority to absorb the full cost of completed audit work.
* **Recommendation:** Separate the authority's capture right from the payer's refund right with an explicit time-based or state-based ordering.

## Medium Severity
### FIND-003: STATUS_LOCKED Constant and status Field Are Dead Code — Lifecycle Never Enforced
* **Severity:** MEDIUM
* **Category:** LOGIC
* **Location:** move_auditor::escrow, Lines 11, 27, 66, 91, 101
* **Description:** STATUS_LOCKED (value 0) is assigned to escrow.status at creation in lock(), but both capture() and refund() destructure the struct with status: _, discarding the field without reading it.
* **Impact:** The dead status field gives a false impression of lifecycle enforcement to readers and integrators.
* **Recommendation:** Delete the status field and STATUS_LOCKED constant entirely, or define STATUS_CAPTURED and STATUS_REFUNDED variants and assert status == STATUS_LOCKED at the top of both capture() and refund().

### FIND-004: Authority Can Unilaterally Refund Completed Audits — Compromised Key Drains Revenue
* **Severity:** MEDIUM
* **Category:** LOGIC
* **Location:** move_auditor::escrow, refund, Lines 97-113
* **Description:** The authority is permitted to call refund(), returning funds to the payer. A compromised, stolen, or buggy authority key can refund any open escrow at will, transferring all locked funds back to payers without payment.
* **Impact:** A compromised authority private key can drain all in-progress and completed escrows to their respective payers, causing total revenue loss for the service operator.
* **Recommendation:** Document explicitly that the authority key has full refund power and must be protected with HSM or multisig key management.

## Low Severity
### FIND-005: No Validation on authority Address — Zero Address Burns Funds, Self-Authority Bypasses Escrow
* **Severity:** LOW
* **Category:** ACCESS_CONTROL
* **Location:** move_auditor::escrow, lock, Lines 57-79
* **Description:** lock() accepts any address as authority with no validation. Two edge cases: (1) authority == @0x0 — capture() transfers funds to the zero address, which no one controls on Sui, effectively burning them permanently. (2) authority == payer — the payer becomes both parties; they can call both capture() and refund() unilaterally, making the escrow trivially escapable with no counterparty guarantee at all.
* **Impact:** User error or a malicious CLI client supplying a bad authority address results in burned funds or a meaningless escrow.
* **Recommendation:** Add validation to lock(): assert!(authority != @0x0, EInvalidAuthority); assert!(authority != tx_context::sender(ctx), EInvalidAuthority);

### FIND-006: Redundant amount Field — Events Emit Stale Lock-Time Value Instead of Actual Balance
* **Severity:** LOW
* **Category:** LOGIC
* **Location:** move_auditor::escrow, capture / refund, Lines 27, 64, 93, 104
* **Description:** The amount field stores coin::value(&payment) at lock time. The public amount() helper correctly reads balance::value(&escrow.funds), but EscrowCaptured and EscrowRefunded events emit the stored amount field rather than the live balance at transfer time.
* **Impact:** Low immediate risk under current code. In any future upgrade that adjusts the balance post-lock, downstream systems relying on event amounts for financial reconciliation will observe incorrect values with no on-chain indication of the discrepancy.
* **Recommendation:** Remove the amount field from the struct and compute the emission value from balance::value(&funds) at the point of destructuring.

## Informational
### FIND-007: Zero-Amount Escrow Creation Allowed — Storage Spam Vector
* **Severity:** INFO
* **Category:** OTHER
* **Location:** move_auditor::escrow, lock, Lines 57-79
* **Description:** lock() does not assert that the payment amount exceeds zero. A zero-value Coin<T> is valid in Sui, so any caller can create unbounded spam escrow objects with no economic commitment, consuming shared object slots and emitting EscrowLocked events without meaningful payment.
* **Impact:** Negligible per-object economic impact. At scale, zero-amount escrows could contribute to Sui state bloat, inflate event indexes, and confuse off-chain monitoring systems that parse EscrowLocked events to track payment volume.
* **Recommendation:** Add assert!(coin::value(&payment) > 0, EZeroAmount) in lock() to prevent zero-value spam escrow creation.

# Recommendations and Next Steps
1. **Remove payer from refund() authorized callers**: This is the primary security failure and should be addressed immediately.
2. **Implement a time-locked state machine**: A LOCKED phase where only capture() is callable, followed by an optional DISPUTED/EXPIRED phase where payer-initiated refund is permitted only after a mandatory window.
3. **Replace the single authority address with a multisig or program-derived address**: Eliminate the single-point-of-key-compromise risk for authority-initiated refunds.
4. **Validate authority address in lock()**: Reject @0x0 and authority == payer to prevent fund burning and trivially bypassable escrow creation.
5. **Delete the status field and STATUS_LOCKED constant**: They are dead code creating false lifecycle assurances.
6. **Replace the stored amount field with live balance::value(&funds) reads**: Guarantee event accuracy and eliminate the redundant storage slot.
7. **Consider switching to an owned-object model**: Transfer to authority at lock time to eliminate shared-object consensus overhead and enable Sui fast-path execution for all escrow operations.
8. **Add assert!(coin::value(&payment) > 0, EZeroAmount) in lock()**: Prevent zero-value spam escrow creation.

---

## 🌊 Stored on Walrus

This report is permanently stored on Walrus (decentralized storage):

- **Report:** [https://aggregator.walrus-testnet.walrus.space/v1/blobs/d0ypmUK9EH6_lEQEScrAD0w7u_4hUE6c1n4qWGYeByU](https://aggregator.walrus-testnet.walrus.space/v1/blobs/d0ypmUK9EH6_lEQEScrAD0w7u_4hUE6c1n4qWGYeByU)
- **Blob ID:** `d0ypmUK9EH6_lEQEScrAD0w7u_4hUE6c1n4qWGYeByU`
