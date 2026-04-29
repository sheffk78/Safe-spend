import React from 'react';
import { DocsHeading, DocsText, Callout, InlineCode } from '@/components/docs/DocsComponents';
import { CodeBlock, TabbedCodeBlock } from '@/components/docs/DocsCodeBlock';

const DocsWebhooks = () => {
    const verifySignatureTabs = [
        {
            label: 'Node.js',
            language: 'typescript',
            code: `import crypto from 'crypto';

function verifyWebhookSignature(
  payload: string,
  signature: string,
  timestamp: string,
  secret: string
): boolean {
  // Check timestamp is within 5 minutes
  const timestampMs = parseInt(timestamp);
  const now = Date.now();
  if (Math.abs(now - timestampMs) > 5 * 60 * 1000) {
    return false; // Reject old webhooks
  }

  // Compute expected signature
  const signedPayload = \`\${timestamp}.\${payload}\`;
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex');

  // Compare signatures
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// Express handler example
app.post('/webhooks/safespend', (req, res) => {
  const signature = req.headers['x-safespend-signature'];
  const timestamp = req.headers['x-safespend-timestamp'];
  const payload = JSON.stringify(req.body);

  if (!verifyWebhookSignature(payload, signature, timestamp, WEBHOOK_SECRET)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  // Process the webhook
  const event = req.body;
  console.log(\`Received event: \${event.type}\`);
  
  res.status(200).json({ received: true });
});`
        },
        {
            label: 'Python',
            language: 'python',
            code: `import hmac
import hashlib
import time
from flask import Flask, request, jsonify

app = Flask(__name__)
WEBHOOK_SECRET = "whsec_..."

def verify_webhook_signature(payload: str, signature: str, timestamp: str) -> bool:
    # Check timestamp is within 5 minutes
    timestamp_ms = int(timestamp)
    now_ms = int(time.time() * 1000)
    if abs(now_ms - timestamp_ms) > 5 * 60 * 1000:
        return False  # Reject old webhooks
    
    # Compute expected signature
    signed_payload = f"{timestamp}.{payload}"
    expected_signature = hmac.new(
        WEBHOOK_SECRET.encode(),
        signed_payload.encode(),
        hashlib.sha256
    ).hexdigest()
    
    # Compare signatures (timing-safe)
    return hmac.compare_digest(signature, expected_signature)

@app.route('/webhooks/safespend', methods=['POST'])
def handle_webhook():
    signature = request.headers.get('X-SafeSpend-Signature')
    timestamp = request.headers.get('X-SafeSpend-Timestamp')
    payload = request.get_data(as_text=True)
    
    if not verify_webhook_signature(payload, signature, timestamp):
        return jsonify({"error": "Invalid signature"}), 401
    
    # Process the webhook
    event = request.get_json()
    print(f"Received event: {event['type']}")
    
    return jsonify({"received": True}), 200`
        }
    ];

    return (
        <div data-testid="docs-webhooks-page">
            <DocsHeading level={1}>Webhooks</DocsHeading>
            
            <DocsText>
                Webhooks allow you to receive real-time notifications when events occur in your Safe-Spend organization. 
                Instead of polling the API, you register an endpoint and Safe-Spend pushes events to you.
            </DocsText>

            <DocsHeading level={2} id="supported-events">Supported Events</DocsHeading>

            <div className="space-y-6 mb-8">
                <div>
                    <h4 className="font-semibold text-ss-text mb-2">Spend Events</h4>
                    <div className="bg-ss-surface rounded-lg border border-[rgba(255,255,255,0.06)] overflow-hidden">
                        <table className="w-full text-sm">
                            <tbody>
                                <tr className="border-b border-[rgba(255,255,255,0.03)]">
                                    <td className="py-2 px-4"><InlineCode>spend.approved</InlineCode></td>
                                    <td className="py-2 px-4 text-ss-text-secondary">A spend request was approved</td>
                                </tr>
                                <tr className="border-b border-[rgba(255,255,255,0.03)]">
                                    <td className="py-2 px-4"><InlineCode>spend.denied</InlineCode></td>
                                    <td className="py-2 px-4 text-ss-text-secondary">A spend request was denied by policy</td>
                                </tr>
                                <tr>
                                    <td className="py-2 px-4"><InlineCode>spend.expired</InlineCode></td>
                                    <td className="py-2 px-4 text-ss-text-secondary">A pending spend expired without approval</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <div>
                    <h4 className="font-semibold text-ss-text mb-2">Approval Events</h4>
                    <div className="bg-ss-surface rounded-lg border border-[rgba(255,255,255,0.06)] overflow-hidden">
                        <table className="w-full text-sm">
                            <tbody>
                                <tr className="border-b border-[rgba(255,255,255,0.03)]">
                                    <td className="py-2 px-4"><InlineCode>approval.requested</InlineCode></td>
                                    <td className="py-2 px-4 text-ss-text-secondary">A new approval is pending human review</td>
                                </tr>
                                <tr className="border-b border-[rgba(255,255,255,0.03)]">
                                    <td className="py-2 px-4"><InlineCode>approval.approved</InlineCode></td>
                                    <td className="py-2 px-4 text-ss-text-secondary">An approval was approved by a human</td>
                                </tr>
                                <tr className="border-b border-[rgba(255,255,255,0.03)]">
                                    <td className="py-2 px-4"><InlineCode>approval.denied</InlineCode></td>
                                    <td className="py-2 px-4 text-ss-text-secondary">An approval was denied by a human</td>
                                </tr>
                                <tr>
                                    <td className="py-2 px-4"><InlineCode>approval.expired</InlineCode></td>
                                    <td className="py-2 px-4 text-ss-text-secondary">An approval expired without action</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <div>
                    <h4 className="font-semibold text-ss-text mb-2">Escrow Events</h4>
                    <div className="bg-ss-surface rounded-lg border border-[rgba(255,255,255,0.06)] overflow-hidden">
                        <table className="w-full text-sm">
                            <tbody>
                                <tr className="border-b border-[rgba(255,255,255,0.03)]">
                                    <td className="py-2 px-4"><InlineCode>escrow.funded</InlineCode></td>
                                    <td className="py-2 px-4 text-ss-text-secondary">Funds were added to an escrow account</td>
                                </tr>
                                <tr className="border-b border-[rgba(255,255,255,0.03)]">
                                    <td className="py-2 px-4"><InlineCode>escrow.paused</InlineCode></td>
                                    <td className="py-2 px-4 text-ss-text-secondary">An escrow account was paused</td>
                                </tr>
                                <tr className="border-b border-[rgba(255,255,255,0.03)]">
                                    <td className="py-2 px-4"><InlineCode>escrow.resumed</InlineCode></td>
                                    <td className="py-2 px-4 text-ss-text-secondary">A paused escrow account was resumed</td>
                                </tr>
                                <tr>
                                    <td className="py-2 px-4"><InlineCode>escrow.closed</InlineCode></td>
                                    <td className="py-2 px-4 text-ss-text-secondary">An escrow account was closed</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* AAV & Cross-tool Events */}
            <div className="space-y-6 mb-10">
                <div>
                    <h4 className="font-semibold text-ss-text mb-2">AAV Verification Events</h4>
                    <div className="bg-ss-surface rounded-lg border border-[rgba(255,255,255,0.06)] overflow-hidden">
                        <table className="w-full text-sm">
                            <tbody>
                                <tr className="border-b border-[rgba(255,255,255,0.03)]">
                                    <td className="py-2 px-4"><InlineCode>aav.verification_passed</InlineCode></td>
                                    <td className="py-2 px-4 text-ss-text-secondary">AAV authority verification passed</td>
                                </tr>
                                <tr className="border-b border-[rgba(255,255,255,0.03)]">
                                    <td className="py-2 px-4"><InlineCode>aav.verification_denied</InlineCode></td>
                                    <td className="py-2 px-4 text-ss-text-secondary">AAV authority verification denied</td>
                                </tr>
                                <tr>
                                    <td className="py-2 px-4"><InlineCode>aav.verification_failed</InlineCode></td>
                                    <td className="py-2 px-4 text-ss-text-secondary">AAV verification failed (unreachable/error)</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <div>
                    <h4 className="font-semibold text-ss-text mb-2">Cross-Tool Events</h4>
                    <div className="bg-ss-surface rounded-lg border border-[rgba(255,255,255,0.06)] overflow-hidden">
                        <table className="w-full text-sm">
                            <tbody>
                                <tr className="border-b border-[rgba(255,255,255,0.03)]">
                                    <td className="py-2 px-4"><InlineCode>safe_spend.spend.approved</InlineCode></td>
                                    <td className="py-2 px-4 text-ss-text-secondary">Cross-tool: spend approved</td>
                                </tr>
                                <tr className="border-b border-[rgba(255,255,255,0.03)]">
                                    <td className="py-2 px-4"><InlineCode>safe_spend.spend.denied</InlineCode></td>
                                    <td className="py-2 px-4 text-ss-text-secondary">Cross-tool: spend denied</td>
                                </tr>
                                <tr className="border-b border-[rgba(255,255,255,0.03)]">
                                    <td className="py-2 px-4"><InlineCode>safe_spend.spend.expired</InlineCode></td>
                                    <td className="py-2 px-4 text-ss-text-secondary">Cross-tool: spend expired</td>
                                </tr>
                                <tr className="border-b border-[rgba(255,255,255,0.03)]">
                                    <td className="py-2 px-4"><InlineCode>safe_spend.escrow.paused</InlineCode></td>
                                    <td className="py-2 px-4 text-ss-text-secondary">Cross-tool: escrow paused</td>
                                </tr>
                                <tr className="border-b border-[rgba(255,255,255,0.03)]">
                                    <td className="py-2 px-4"><InlineCode>safe_spend.escrow.closed</InlineCode></td>
                                    <td className="py-2 px-4 text-ss-text-secondary">Cross-tool: escrow closed</td>
                                </tr>
                                <tr>
                                    <td className="py-2 px-4"><InlineCode>safe_spend.escrow.funded</InlineCode></td>
                                    <td className="py-2 px-4 text-ss-text-secondary">Cross-tool: escrow funded</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <DocsHeading level={2} id="subscribing">Subscribing to Events</DocsHeading>

            <DocsText>
                Create a webhook via the dashboard or API. You'll receive a secret key for signature verification.
            </DocsText>

            <CodeBlock 
                language="bash"
                title="Create Webhook"
                code={`curl -X POST https://api.safe-spend.dev/v1/webhooks \\
  -H "Authorization: Bearer sk_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "url": "https://your-app.com/webhooks/safespend",
    "events": ["spend.approved", "spend.denied", "approval.requested"]
  }'`}
            />

            <CodeBlock 
                language="json"
                title="Response"
                code={`{
  "id": "whk_abc123",
  "url": "https://your-app.com/webhooks/safespend",
  "events": ["spend.approved", "spend.denied", "approval.requested"],
  "secret": "whsec_abc123def456...",
  "is_active": true,
  "created_at": "2026-03-24T12:00:00Z"
}`}
            />

            <Callout type="warning" title="Save Your Secret">
                The webhook secret is only shown once. Store it securely for signature verification.
            </Callout>

            <DocsHeading level={2} id="payload-structure">Payload Structure</DocsHeading>

            <DocsText>
                All webhook payloads follow this structure:
            </DocsText>

            <CodeBlock 
                language="json"
                title="Generic Envelope"
                code={`{
  "id": "evt_abc123",
  "type": "spend.approved",
  "created_at": "2026-03-24T12:00:00Z",
  "data": {
    // Event-specific data
  }
}`}
            />

            <DocsHeading level={3}>spend.approved Example</DocsHeading>

            <CodeBlock 
                language="json"
                code={`{
  "id": "evt_abc123",
  "type": "spend.approved",
  "created_at": "2026-03-24T12:00:00Z",
  "data": {
    "spend_id": "spr_xyz789",
    "escrow_id": "esc_9f3k2m",
    "amount_cents": 4999,
    "currency": "usd",
    "vendor": "Anthropic",
    "category": "ai_compute",
    "status": "approved",
    "rules_evaluated": [
      { "rule": "balance_check", "result": "pass" },
      { "rule": "per_transaction_limit", "result": "pass" },
      { "rule": "auto_approve_threshold", "result": "auto_approved" }
    ]
  }
}`}
            />

            <DocsHeading level={3}>approval.requested Example</DocsHeading>

            <CodeBlock 
                language="json"
                code={`{
  "id": "evt_def456",
  "type": "approval.requested",
  "created_at": "2026-03-24T12:00:00Z",
  "data": {
    "approval_id": "apr_abc123",
    "spend_id": "spr_xyz789",
    "escrow_id": "esc_9f3k2m",
    "amount_cents": 75000,
    "vendor": "OpenAI",
    "requested_at": "2026-03-24T12:00:00Z",
    "expires_at": "2026-03-24T13:00:00Z"
  }
}`}
            />

            <DocsHeading level={2} id="security">Security & Signatures</DocsHeading>

            <DocsText>
                Every webhook request includes two headers for signature verification:
            </DocsText>

            <ul className="list-disc list-inside space-y-2 mb-6 text-ss-text-secondary">
                <li><InlineCode>X-SafeSpend-Signature</InlineCode> — HMAC-SHA256 signature of the payload</li>
                <li><InlineCode>X-SafeSpend-Timestamp</InlineCode> — Unix timestamp (milliseconds) when the webhook was sent</li>
            </ul>

            <DocsText>
                To verify a webhook:
            </DocsText>

            <ol className="list-decimal list-inside space-y-2 mb-6 text-ss-text-secondary">
                <li>Check the timestamp is within 5 minutes of the current time (prevents replay attacks)</li>
                <li>Compute the expected signature: <InlineCode>HMAC-SHA256(timestamp.payload, secret)</InlineCode></li>
                <li>Compare signatures using a timing-safe comparison</li>
            </ol>

            <TabbedCodeBlock tabs={verifySignatureTabs} />

            <Callout type="error" title="Always Verify Signatures">
                Never process webhooks without verifying the signature. An attacker could send fake events to your endpoint.
            </Callout>

            <DocsHeading level={2} id="retries">Retries & Best Practices</DocsHeading>

            <DocsText>
                Safe-Spend automatically retries failed webhook deliveries:
            </DocsText>

            <ul className="list-disc list-inside space-y-2 mb-6 text-ss-text-secondary">
                <li>Retries on 5xx errors and network failures</li>
                <li>Exponential backoff: 1 min, 2 min, 4 min, 8 min... up to 1 hour</li>
                <li>Maximum 10 retry attempts</li>
                <li>Successful delivery requires a 2xx response within 30 seconds</li>
            </ul>

            <DocsHeading level={3}>Best Practices</DocsHeading>

            <div className="space-y-4 mb-6">
                <div className="bg-ss-surface p-4 rounded-lg border border-[rgba(255,255,255,0.06)]">
                    <h4 className="font-semibold text-ss-text mb-1">Respond Quickly</h4>
                    <p className="text-ss-text-secondary text-sm">
                        Return a 2xx response immediately, then process the event asynchronously. 
                        Don't do heavy processing in the request handler.
                    </p>
                </div>

                <div className="bg-ss-surface p-4 rounded-lg border border-[rgba(255,255,255,0.06)]">
                    <h4 className="font-semibold text-ss-text mb-1">Handle Duplicates</h4>
                    <p className="text-ss-text-secondary text-sm">
                        Webhooks may be delivered more than once. Use the event <InlineCode>id</InlineCode> to 
                        deduplicate and make your handlers idempotent.
                    </p>
                </div>

                <div className="bg-ss-surface p-4 rounded-lg border border-[rgba(255,255,255,0.06)]">
                    <h4 className="font-semibold text-ss-text mb-1">Monitor Deliveries</h4>
                    <p className="text-ss-text-secondary text-sm">
                        Check the Webhooks page in your dashboard to see delivery status, failures, and retry history.
                    </p>
                </div>
            </div>

            <DocsHeading level={2} id="testing">Testing Webhooks</DocsHeading>

            <DocsText>
                Use the test endpoint to send a sample event to your webhook:
            </DocsText>

            <CodeBlock 
                language="bash"
                code={`curl -X POST https://api.safe-spend.dev/v1/webhooks/whk_abc123/test \\
  -H "Authorization: Bearer sk_live_..."`}
            />

            <DocsText>
                This sends a <InlineCode>test.ping</InlineCode> event to your endpoint so you can verify 
                your signature verification and processing logic.
            </DocsText>
        </div>
    );
};

export default DocsWebhooks;
