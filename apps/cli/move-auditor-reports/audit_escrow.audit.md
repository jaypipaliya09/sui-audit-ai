# Executive Summary
The escrow contract implements a simple two-party payment flow for audit jobs with correct object-consumption semantics. However, the payer retains unilateral refund rights at all times with no time-lock or completion proof, making it impossible for the authority to guarantee payment after delivering work. Additionally, the payer freely sets the authority address at lock time with no on-chain verification, allowing self-dealing. The status field is dead code, and zero-value escrows are unchecked.

# Overall Risk Assessment
The overall risk of the contract is **HIGH**. This is due to several high-severity findings, including the payer's ability to unconditionally refund the escrow, potentially allowing them to exploit the authority. The contract's logic and access control issues contribute to this high risk assessment.

# Detailed Findings
## High Severity
### FIND-001: Payer retains unconditional refund rights — authority cannot guarantee payment
* **Severity:** HIGH
* **Category:** LOGIC
* **Location:** move_auditor::escrow, function: refund, Lines 97-112
* **Description:** The payer can call refund() at any time, and there is no state transition that locks out the payer once audit work has begun or completed. The authority calls capture(), but the payer can race with or preemptively submit a refund() transaction.
* **Impact:** The payer can reclaim funds after audit delivery by racing refund() against capture(). The authority bears full counterparty risk with no on-chain remedy.
* **Recommendation:** Introduce a two-phase or time-locked commit, or require the authority to sign capture and add a deadline after which the payer may reclaim.

### FIND-002: Payer controls authority address — self-dealing bypasses escrow intent
* **Severity:** MEDIUM
* **Category:** ACCESS_CONTROL
* **Location:** move_auditor::escrow, function: lock, Lines 60-80
* **Description:** The authority address is supplied by the payer at lock() time with no on-chain validation. A payer can pass their own address (or any address they control) as authority.
* **Impact:** The payer can create a fake escrow that never actually exposes funds to a real auditor, potentially for UI spoofing, off-chain fraud, or fee gaming.
* **Recommendation:** Restrict lock() to accept only a whitelisted authority address or assert authority != payer inside lock().

## Medium Severity
*No medium-severity findings beyond FIND-002.*

## Low Severity
### FIND-003: status field is dead code — false impression of state-machine enforcement
* **Severity:** LOW
* **Category:** LOGIC
* **Location:** move_auditor::escrow, Lines 22, 27, 73
* **Description:** The status field is assigned on object creation and is never read or asserted in capture() or refund().
* **Impact:** No direct exploit, but the misleading structure can cause future developers to omit status checks when adding new states.
* **Recommendation:** Remove the status field and STATUS_LOCKED constant or implement actual state assertions in capture/refund.

### FIND-004: Zero-amount escrow not prevented
* **Severity:** LOW
* **Category:** ASSET_SAFETY
* **Location:** move_auditor::escrow, function: lock, Lines 60-80
* **Description:** lock() does not assert amount > 0, allowing creation of AuditEscrow objects with no funds.
* **Impact:** Spam/dust escrow objects, off-chain accounting confusion, and wasted storage deposits.
* **Recommendation:** Add assert!(amount > 0, EZeroAmount) immediately after computing amount in lock().

## Informational
### FIND-005: Redundant amount field diverges from funds balance if contract is extended
* **Severity:** INFO
* **Category:** OTHER
* **Location:** move_auditor::escrow, Lines 26-27
* **Description:** The struct stores both funds: Balance<T> and amount: u64. The amount field is set once at lock time and only appears in events.
* **Impact:** No current exploit, but the risk surface grows if the contract is extended with partial-capture or fee logic.
* **Recommendation:** Remove the amount: u64 field and compute it on-the-fly from balance::value(&escrow.funds) at event emission.

### FIND-006: Shared object creation imposes sequencing overhead for every escrow
* **Severity:** INFO
* **Category:** GAS
* **Location:** move_auditor::escrow, function: lock, Line 77
* **Description:** transfer::share_object() makes AuditEscrow a consensus-sequenced shared object, requiring consensus sequencing on all future operations.
* **Impact:** Higher latency and gas cost per escrow lifecycle.
* **Recommendation:** Consider transferring the escrow object to the authority as an owned object or evaluate a programmable transaction block pattern.

# Recommendations and Next Steps
1. **CRITICAL PATH:** Add a completion gate — authority-only mark_complete() with a payer-dispute window — before any mainnet deployment.
2. Validate that authority != payer and optionally restrict authority to a whitelisted registry to prevent self-dealing.
3. Remove the dead status field and STATUS_LOCKED constant or implement real state-machine transitions with assertions.
4. Assert amount > 0 in lock() to prevent zero-value spam escrows.
5. Consider migrating to an owned-object model (escrow held by authority) to eliminate consensus overhead on every capture/refund call.
6. Remove the redundant amount: u64 field and compute it on-the-fly from balance::value(&escrow.funds) at event emission.
7. Evaluate gas optimization suggestions, including using owned-object transfer and batch EscrowLocked event data.

---

## 🌊 Stored on Walrus

This report is permanently stored on Walrus (decentralized storage):

- **Report:** [https://aggregator.walrus-testnet.walrus.space/v1/blobs/Ms1lNHgHeVBgZY-UTM1FvkR8ltpAj8Gj_8R04aLpqSg](https://aggregator.walrus-testnet.walrus.space/v1/blobs/Ms1lNHgHeVBgZY-UTM1FvkR8ltpAj8Gj_8R04aLpqSg)
- **Blob ID:** `Ms1lNHgHeVBgZY-UTM1FvkR8ltpAj8Gj_8R04aLpqSg`
