# AAV Integration Proposal for Safe-Spend

## Overview

This document proposes a design for integrating **Agent Authority Vault (AAV)** with Safe-Spend to enable cryptographic verification of agent identity and authority before allowing spend operations. The goal is to ensure that only agents with valid AAV grants can access specific escrow accounts and operate under specific fiduciary policies.

---

## 1. Schema Changes

### 1.1 EscrowAccount Model

Add fields to restrict which agents can access this trust account:

```prisma
model EscrowAccount {
  // ... existing fields ...
  
  // AAV Integration
  aavEnabled            Boolean  @default(false) @map("aav_enabled")
  authorizedAgentIds    String   @default("[]") @map("authorized_agent_ids")  // JSON array of AAV agent IDs
  aavGrantIds           String   @default("[]") @map("aav_grant_ids")         // JSON array of AAV grant IDs
  aavEnforcementMode    String   @default("none") @map("aav_enforcement_mode") // none | warn | strict
  
  // ... relations ...
}
```

**Field Definitions:**

| Field | Type | Description |
|-------|------|-------------|
| `aavEnabled` | Boolean | Master toggle for AAV enforcement on this escrow |
| `authorizedAgentIds` | JSON Array | List of AAV agent identifiers allowed to spend |
| `aavGrantIds` | JSON Array | List of AAV grant IDs that authorize spending |
| `aavEnforcementMode` | Enum | `none` = no check, `warn` = log but allow, `strict` = deny if unauthorized |

### 1.2 SpendingPolicy Model

Add fields for fine-grained agent restrictions at the policy level:

```prisma
model SpendingPolicy {
  // ... existing fields ...
  
  // AAV Integration (overrides escrow-level if set)
  aavEnabled            Boolean  @default(false) @map("aav_enabled")
  authorizedAgentIds    String   @default("[]") @map("authorized_agent_ids")  // JSON array
  aavGrantIds           String   @default("[]") @map("aav_grant_ids")         // JSON array
  aavEnforcementMode    String?  @map("aav_enforcement_mode")                 // null = inherit from escrow
  
  // ... relations ...
}
```

### 1.3 SpendRequest Model

Track which agent made the request for audit purposes:

```prisma
model SpendRequest {
  // ... existing fields ...
  
  // AAV Integration (captured at request time)
  aavAgentId            String?  @map("aav_agent_id")           // Agent ID from AAV claim
  aavGrantId            String?  @map("aav_grant_id")           // Grant ID used for authorization
  aavVerificationStatus String?  @map("aav_verification_status") // verified | unverified | bypassed
  
  // ... relations ...
}
```

### 1.4 New Model: AAVConfiguration (Organization-level)

```prisma
model AAVConfiguration {
  id                    String   @id @default(uuid())
  orgId                 String   @unique @map("org_id")
  
  // AAV Connection
  aavEndpoint           String?  @map("aav_endpoint")           // AAV API endpoint
  aavPublicKey          String?  @map("aav_public_key")         // For JWT/signature verification
  aavApiKey             String?  @map("aav_api_key")            // For AAV API calls (encrypted)
  
  // Default behavior
  defaultEnforcementMode String  @default("none") @map("default_enforcement_mode")
  
  // Status
  isConfigured          Boolean  @default(false) @map("is_configured")
  lastVerifiedAt        DateTime? @map("last_verified_at")
  
  createdAt             DateTime @default(now()) @map("created_at")
  updatedAt             DateTime @updatedAt @map("updated_at")

  organization          Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)

  @@map("aav_configurations")
}
```

---

## 2. Rules Engine Integration

### 2.1 New Step in Validation Cascade

Insert **AAV AGENT AUTHORIZATION** as **Step 2.5** (after escrow check, before idempotency):

```
Current Cascade:
1. KEY VALIDATION
2. ESCROW ACCOUNT CHECK
3. IDEMPOTENCY CHECK       <- AAV check should be BEFORE this
4. BALANCE CHECK
...

Proposed Cascade:
1. KEY VALIDATION
2. ESCROW ACCOUNT CHECK
2.5 AAV AGENT AUTHORIZATION  <- NEW
3. IDEMPOTENCY CHECK
4. BALANCE CHECK
...
```

**Rationale:** The AAV check should happen early because:
- It's a fundamental authorization check (who is allowed to spend?)
- Should fail fast before any state is examined
- Must occur before idempotency to avoid caching unauthorized attempts

### 2.2 AAV Verification Logic

```javascript
/**
 * Step 2.5: AAV AGENT AUTHORIZATION
 * Verifies the requesting agent has AAV-issued authority to use this escrow/policy
 */
function checkAAVAuthorization(context) {
    const { escrowAccount, policies, request, aavClaims } = context;
    
    // Check if AAV is enabled at escrow level
    if (!escrowAccount.aavEnabled) {
        return {
            rule: 'aav_authorization',
            passed: true,
            reason: 'AAV enforcement not enabled for this escrow',
            metadata: { enforcement_mode: 'none' }
        };
    }
    
    // Get enforcement mode (escrow-level or policy-level override)
    const enforcementMode = getEffectiveEnforcementMode(escrowAccount, policies);
    
    if (enforcementMode === 'none') {
        return {
            rule: 'aav_authorization',
            passed: true,
            reason: 'AAV enforcement mode is none',
            metadata: { enforcement_mode: 'none' }
        };
    }
    
    // Extract agent identity from request
    const agentId = aavClaims?.agent_id || request.aav_agent_id;
    const grantId = aavClaims?.grant_id || request.aav_grant_id;
    
    // Check authorization
    const isAuthorized = checkAgentAuthorization(
        agentId, 
        grantId, 
        escrowAccount, 
        policies
    );
    
    if (!isAuthorized) {
        if (enforcementMode === 'warn') {
            // Log but allow (for gradual rollout)
            return {
                rule: 'aav_authorization',
                passed: true,
                reason: 'Agent not authorized (warning mode - allowed)',
                metadata: { 
                    enforcement_mode: 'warn',
                    agent_id: agentId,
                    authorized: false
                }
            };
        }
        
        // Strict mode - deny
        return {
            rule: 'aav_authorization',
            passed: false,
            reason: `Agent '${agentId || 'unknown'}' is not authorized to spend from this escrow`,
            metadata: {
                enforcement_mode: 'strict',
                agent_id: agentId,
                grant_id: grantId,
                allowed_agents: JSON.parse(escrowAccount.authorizedAgentIds || '[]')
            }
        };
    }
    
    return {
        rule: 'aav_authorization',
        passed: true,
        reason: `Agent '${agentId}' authorized via AAV`,
        metadata: {
            enforcement_mode: enforcementMode,
            agent_id: agentId,
            grant_id: grantId,
            verification_method: grantId ? 'grant' : 'agent_id'
        }
    };
}

/**
 * Check if agent is authorized at escrow or policy level
 */
function checkAgentAuthorization(agentId, grantId, escrow, policies) {
    // Check escrow-level authorization
    const escrowAgents = JSON.parse(escrow.authorizedAgentIds || '[]');
    const escrowGrants = JSON.parse(escrow.aavGrantIds || '[]');
    
    if (escrowAgents.includes(agentId) || escrowGrants.includes(grantId)) {
        return true;
    }
    
    // Check policy-level authorization (any matching policy grants access)
    for (const policy of policies) {
        if (!policy.isActive || policy.status !== 'active') continue;
        if (!policy.aavEnabled) continue;
        
        const policyAgents = JSON.parse(policy.authorizedAgentIds || '[]');
        const policyGrants = JSON.parse(policy.aavGrantIds || '[]');
        
        if (policyAgents.includes(agentId) || policyGrants.includes(grantId)) {
            return true;
        }
    }
    
    return false;
}
```

### 2.3 AAV Claims Extraction

Claims can come from multiple sources:

```javascript
/**
 * Extract AAV claims from the request
 * Priority: JWT header > X-AAV-Agent-Id header > request body
 */
function extractAAVClaims(req) {
    // Option 1: AAV-signed JWT in Authorization header
    const authHeader = req.headers['authorization'];
    if (authHeader?.startsWith('AAV ')) {
        const token = authHeader.slice(4);
        return verifyAAVToken(token); // Returns { agent_id, grant_id, ... }
    }
    
    // Option 2: Direct headers (for simpler integrations)
    const agentIdHeader = req.headers['x-aav-agent-id'];
    const grantIdHeader = req.headers['x-aav-grant-id'];
    const signatureHeader = req.headers['x-aav-signature'];
    
    if (agentIdHeader) {
        // Optionally verify signature if provided
        if (signatureHeader) {
            verifyAAVSignature(agentIdHeader, grantIdHeader, signatureHeader);
        }
        return {
            agent_id: agentIdHeader,
            grant_id: grantIdHeader,
            verified: !!signatureHeader
        };
    }
    
    // Option 3: Request body fields
    return {
        agent_id: req.body.aav_agent_id,
        grant_id: req.body.aav_grant_id,
        verified: false
    };
}
```

---

## 3. API Changes

### 3.1 Spend Request Endpoint

Update `POST /api/v1/spend` to accept AAV claims:

```javascript
// Request body additions
{
    "escrow_id": "esc_xxx",
    "amount_cents": 5000,
    "vendor": "OpenAI",
    // ... existing fields ...
    
    // AAV fields (optional)
    "aav_agent_id": "agent_marketing_bot_v2",
    "aav_grant_id": "grant_abc123"
}

// Or via headers:
// X-AAV-Agent-Id: agent_marketing_bot_v2
// X-AAV-Grant-Id: grant_abc123
// X-AAV-Signature: <hmac_signature>
```

### 3.2 Escrow Account Endpoints

Update create/update escrow to include AAV fields:

```javascript
// POST /api/v1/escrow-accounts
{
    "name": "Marketing Budget",
    // ... existing fields ...
    
    // AAV configuration
    "aav_enabled": true,
    "authorized_agent_ids": ["agent_marketing_bot", "agent_social_manager"],
    "aav_grant_ids": ["grant_marketing_q1"],
    "aav_enforcement_mode": "strict"
}
```

### 3.3 Policy Endpoints

Update create/update policy to include AAV fields:

```javascript
// POST /api/v1/policies
{
    "escrow_id": "esc_xxx",
    "name": "Marketing Agent Policy",
    "purpose": "Marketing campaigns",
    // ... existing fields ...
    
    // AAV configuration (optional, overrides escrow)
    "aav_enabled": true,
    "authorized_agent_ids": ["agent_marketing_bot"],
    "aav_enforcement_mode": "strict"
}
```

### 3.4 New: AAV Configuration Endpoint

```javascript
// GET /api/v1/settings/aav
// Returns current AAV configuration

// PUT /api/v1/settings/aav
{
    "aav_endpoint": "https://aav.agentictrust.app/api/v1",
    "aav_public_key": "-----BEGIN PUBLIC KEY-----...",
    "default_enforcement_mode": "warn"
}

// POST /api/v1/settings/aav/verify
// Tests connection to AAV and validates configuration
```

---

## 4. UI Changes

### 4.1 Escrow Account Form

Add an "Agent Authorization" section to the escrow create/edit form:

```
┌─────────────────────────────────────────────────────────────┐
│  Agent Authorization (AAV Integration)                       │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────┐   │
│  │ [x] Enable AAV verification for this escrow          │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  Enforcement Mode:                                           │
│  ○ None (no verification)                                   │
│  ○ Warn (log unauthorized, but allow)                       │
│  ● Strict (deny unauthorized agents)                        │
│                                                              │
│  Authorized Agents:                                          │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ agent_marketing_bot                              [x] │   │
│  │ agent_social_manager                             [x] │   │
│  │ + Add agent ID                                       │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  AAV Grants (alternative):                                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ grant_marketing_q1_2026                          [x] │   │
│  │ + Add grant ID                                       │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  💡 Tip: Use grants for time-bound access, agent IDs for    │
│     permanent authorization.                                 │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Policy Wizard - Step 3 (Restrictions)

Add an "Agent Restrictions" subsection:

```
┌─────────────────────────────────────────────────────────────┐
│  Agent Restrictions (AAV)                                    │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────┐   │
│  │ [x] Override escrow-level agent restrictions         │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  Only allow these agents to use this policy:                 │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ agent_marketing_bot                                  │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  📋 Inheriting from escrow: agent_social_manager            │
└─────────────────────────────────────────────────────────────┘
```

### 4.3 Settings Page - AAV Configuration

Add a new section to organization settings:

```
┌─────────────────────────────────────────────────────────────┐
│  Agent Authority Vault (AAV) Integration                     │
├─────────────────────────────────────────────────────────────┤
│  Status: ● Connected                                         │
│                                                              │
│  AAV Endpoint:                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ https://aav.agentictrust.app/api/v1                  │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  Public Key:                                                 │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ -----BEGIN PUBLIC KEY-----                           │   │
│  │ MIIBIjANBg...                                        │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  Default Enforcement:                                        │
│  [v] Warn (recommended for initial rollout)                 │
│                                                              │
│  [Test Connection]  [Save Configuration]                     │
└─────────────────────────────────────────────────────────────┘
```

### 4.4 Transaction Detail View

Show AAV verification status on spend requests:

```
┌─────────────────────────────────────────────────────────────┐
│  Rules Evaluation                                            │
├─────────────────────────────────────────────────────────────┤
│  ✓ Key Validation           Passed                          │
│  ✓ Escrow Account           Active, sufficient balance      │
│  ✓ AAV Authorization        Agent 'agent_marketing_bot'     │  <- NEW
│                             verified via grant_abc123        │
│  ✓ Balance Check            $50.00 available               │
│  ...                                                         │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. Implementation Phases

### Phase 1: Schema & Basic Enforcement (Week 1)
- [ ] Add schema fields to EscrowAccount, SpendingPolicy, SpendRequest
- [ ] Add AAVConfiguration model
- [ ] Run migrations
- [ ] Add AAV check to rules engine (Step 2.5)
- [ ] Support `aav_agent_id` in request body

### Phase 2: API & Headers (Week 2)
- [ ] Update escrow and policy CRUD endpoints
- [ ] Add `X-AAV-Agent-Id` / `X-AAV-Grant-Id` header support
- [ ] Add `/settings/aav` configuration endpoint
- [ ] Update API documentation

### Phase 3: UI Integration (Week 3)
- [ ] Add AAV section to escrow create/edit forms
- [ ] Add agent restrictions to policy wizard
- [ ] Add AAV configuration to settings page
- [ ] Update transaction detail to show AAV status

### Phase 4: AAV Token Verification (Week 4)
- [ ] Implement JWT verification with AAV public key
- [ ] Add `Authorization: AAV <token>` header support
- [ ] Add signature verification for header-based auth
- [ ] Integration testing with AAV service

---

## 6. Security Considerations

### 6.1 Trust Model

| Source | Trust Level | Use Case |
|--------|-------------|----------|
| AAV JWT | High | Production agents with cryptographic proof |
| Signed Headers | Medium | Internal agents with shared secret |
| Request Body | Low | Development/testing only |

### 6.2 Audit Trail

All AAV-related decisions are logged:
- Agent ID and grant ID captured on every spend request
- Verification status recorded (verified/unverified/bypassed)
- Rules evaluation includes AAV check result
- Denied requests show which agents are authorized

### 6.3 Failure Modes

| Scenario | Behavior |
|----------|----------|
| AAV service unavailable | Depends on `aav_enforcement_mode` - `strict` fails closed, `warn` allows |
| Invalid AAV signature | Always denied |
| Expired grant | Denied with clear error message |
| Missing agent ID | Treated as unauthorized |

---

## 7. Example Workflows

### 7.1 Marketing Agent Setup

1. **Create escrow** with AAV enabled:
   ```json
   {
     "name": "Marketing Budget Q1",
     "aav_enabled": true,
     "authorized_agent_ids": ["agent_marketing_bot_v2"],
     "aav_enforcement_mode": "strict"
   }
   ```

2. **Create policy** with same agent:
   ```json
   {
     "name": "Ad Spend Policy",
     "purpose": "Marketing campaigns",
     "per_transaction_limit_cents": 10000,
     "authorized_agent_ids": ["agent_marketing_bot_v2"]
   }
   ```

3. **Agent makes spend request**:
   ```bash
   curl -X POST /api/v1/spend \
     -H "Authorization: Bearer sk_agent_xxx" \
     -H "X-AAV-Agent-Id: agent_marketing_bot_v2" \
     -d '{"escrow_id": "esc_xxx", "amount_cents": 5000, "vendor": "Google Ads"}'
   ```

### 7.2 Multi-Agent Shared Escrow

```json
{
  "name": "Shared Operations Budget",
  "aav_enabled": true,
  "authorized_agent_ids": [
    "agent_procurement",
    "agent_devops", 
    "agent_hr_assistant"
  ],
  "aav_enforcement_mode": "strict"
}
```

Each agent can only spend if their ID matches the authorized list.

---

## 8. Open Questions

1. **Grant Expiration**: Should Safe-Spend check grant expiration with AAV, or trust the JWT claims?

2. **Agent Hierarchy**: Can a "parent" agent authorize spend on behalf of a "child" agent?

3. **Rate Limits**: Should there be per-agent rate limits in addition to per-policy limits?

4. **Revocation**: How do we handle real-time grant revocation from AAV?

---

## 9. Summary

This integration adds **agent-level authorization** to Safe-Spend's existing **policy-based controls**, creating a two-layer security model:

| Layer | Controls | Who Decides |
|-------|----------|-------------|
| **AAV (New)** | Which agents can access | Identity/Authority |
| **Fiduciary Policy** | How much, when, where | Governance/Trust |

The result: Only authorized agents can spend, and they can only spend within the bounds of their fiduciary mandate.

---

*Proposal Version: 1.0*  
*Last Updated: March 24, 2026*
