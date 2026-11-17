import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, Check, ChevronRight, BookOpen, Code2, Webhook, CreditCard, ShieldCheck, RotateCcw, Zap, ArrowRight, RefreshCw, ShoppingCart, Store, Link2, FileCode, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

type EndpointSection =
  | "redirect-checkout" | "verify-payment" | "refund-payment" | "webhook-guides"
  | "embed-widget"
  | "woocommerce-plugin" | "shopify-app" | "zapier-make"
  | "sdk-javascript" | "sdk-php" | "sdk-python";

interface Param {
  name: string;
  type: string;
  required: boolean;
  description: string;
  example?: string;
}

interface EndpointDoc {
  id: EndpointSection;
  title: string;
  method: "POST" | "GET";
  url: string;
  description: string;
  icon: React.ReactNode;
  group: string;
  quickStart: string[];
  params: Param[];
  headers: Param[];
  responseSuccess: string;
  responseError: string;
  codeExamples: Record<string, string>;
}

interface IntegrationDoc {
  id: EndpointSection;
  title: string;
  description: string;
  icon: React.ReactNode;
  group: string;
  sections: { heading: string; content?: string; code?: string; language?: string }[];
}

const LANG_LABELS: Record<string, string> = {
  curl: "cURL",
  node: "Node.js",
  php: "PHP",
  python: "Python",
  ruby: "Ruby",
};

// ─── Existing API Endpoints ───────────────────────────────────────
const ENDPOINTS: EndpointDoc[] = [
  {
    id: "redirect-checkout",
    title: "Redirect Checkout",
    method: "POST",
    url: "https://YOUR_PROJECT_REF.supabase.co/functions/v1/create-payment",
    description: "Create a payment session and get a checkout URL to redirect the customer for payment.",
    icon: <CreditCard className="h-4 w-4" />,
    group: "Integration V3+",
    quickStart: [
      "Get your API Key from the dashboard (Settings → API Keys).",
      "Send a POST request with customer details, amount, and callback URLs.",
      "Redirect the customer to the checkout_url from the response.",
      "After payment, the customer returns to your return_url with the transaction ID.",
      "Verify the payment status using the Verify Payment endpoint.",
      "Handle webhook notifications on your webhook_url for real-time updates.",
    ],
    params: [
      { name: "full_name", type: "string", required: true, description: "Customer's full name.", example: "John Doe" },
      { name: "email_address", type: "string", required: true, description: "Customer's email address.", example: "john@example.com" },
      { name: "mobile_number", type: "string", required: true, description: "Customer's mobile number.", example: "+8801700000000" },
      { name: "amount", type: "string", required: true, description: "The payment amount.", example: "500" },
      { name: "currency", type: "string", required: true, description: "The payment currency. For example: BDT, USD, INR", example: "BDT" },
      { name: "metadata", type: "string", required: true, description: 'Additional project-specific data in JSON format.', example: '{"order_id": "123", "product_id": "456"}' },
      { name: "return_url", type: "string", required: true, description: "The URL where the user will be redirected from checkout.", example: "https://yoursite.com/payment/callback" },
      { name: "webhook_url", type: "string", required: true, description: "A backend URL where payment status is sent via webhook.", example: "https://yoursite.com/api/webhook" },
    ],
    headers: [
      { name: "MHS-API-KEY", type: "string", required: true, description: "Your API Key from the dashboard. Also accepted as x-api-key or Authorization Bearer header." },
      { name: "Content-Type", type: "string", required: true, description: "Must be application/json." },
    ],
    responseSuccess: JSON.stringify({ success: true, ref: "174234567890123456789012345", transaction_id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890", checkout_url: "https://pay.example.com/payment/174234567890123456789012345", status: "pending" }, null, 2),
    responseError: JSON.stringify({ status: false, message: "Invalid API key or missing required fields", errors: { amount: ["The amount field is required."], email_address: ["The email address field is required."] } }, null, 2),
    codeExamples: {
      curl: `curl --request POST \\
  --url https://YOUR_PROJECT_REF.supabase.co/functions/v1/create-payment \\
  --header 'accept: application/json' \\
  --header 'content-type: application/json' \\
  --header 'MHS-API-KEY: sk_live_xxxxxxxxxxxx' \\
  --data '{
    "full_name": "John Doe",
    "email_address": "john@example.com",
    "mobile_number": "+8801700000000",
    "amount": "500",
    "currency": "BDT",
    "metadata": "{\\"order_id\\": \\"123\\"}",
    "return_url": "https://yoursite.com/callback",
    "webhook_url": "https://yoursite.com/api/webhook"
  }'`,
      node: `const response = await fetch('https://YOUR_PROJECT_REF.supabase.co/functions/v1/create-payment', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'MHS-API-KEY': 'sk_live_xxxxxxxxxxxx'
  },
  body: JSON.stringify({
    full_name: 'John Doe',
    email_address: 'john@example.com',
    mobile_number: '+8801700000000',
    amount: '500',
    currency: 'BDT',
    metadata: JSON.stringify({ order_id: '123' }),
    return_url: 'https://yoursite.com/callback',
    webhook_url: 'https://yoursite.com/api/webhook'
  })
});
const data = await response.json();

if (data.success) {
  window.location.href = data.checkout_url;
}`,
      php: `<?php
$apiKey = 'sk_live_xxxxxxxxxxxx';
$payload = [
  'full_name'      => 'John Doe',
  'email_address'  => 'john@example.com',
  'mobile_number'  => '+8801700000000',
  'amount'         => '500',
  'currency'       => 'BDT',
  'metadata'       => json_encode(['order_id' => '123']),
  'return_url'     => 'https://yoursite.com/callback',
  'webhook_url'    => 'https://yoursite.com/api/webhook',
];

$ch = curl_init('https://YOUR_PROJECT_REF.supabase.co/functions/v1/create-payment');
curl_setopt_array($ch, [
  CURLOPT_POST           => true,
  CURLOPT_HTTPHEADER     => [
    'Content-Type: application/json',
    "MHS-API-KEY: {$apiKey}",
  ],
  CURLOPT_POSTFIELDS     => json_encode($payload),
  CURLOPT_RETURNTRANSFER => true,
]);
$response = json_decode(curl_exec($ch), true);
curl_close($ch);

if ($response['success']) {
  header('Location: ' . $response['checkout_url']);
  exit;
}`,
      python: `import requests

response = requests.post(
    'https://YOUR_PROJECT_REF.supabase.co/functions/v1/create-payment',
    headers={
        'Content-Type': 'application/json',
        'MHS-API-KEY': 'sk_live_xxxxxxxxxxxx'
    },
    json={
        'full_name': 'John Doe',
        'email_address': 'john@example.com',
        'mobile_number': '+8801700000000',
        'amount': '500',
        'currency': 'BDT',
        'metadata': '{"order_id": "123"}',
        'return_url': 'https://yoursite.com/callback',
        'webhook_url': 'https://yoursite.com/api/webhook'
    }
)
data = response.json()

if data['success']:
    checkout_url = data['checkout_url']
    print(f"Redirect to: {checkout_url}")`,
      ruby: `require 'net/http'
require 'json'
require 'uri'

uri = URI('https://YOUR_PROJECT_REF.supabase.co/functions/v1/create-payment')
http = Net::HTTP.new(uri.host, uri.port)
http.use_ssl = true

request = Net::HTTP::Post.new(uri)
request['Content-Type'] = 'application/json'
request['MHS-API-KEY'] = 'sk_live_xxxxxxxxxxxx'
request.body = {
  full_name: 'John Doe',
  email_address: 'john@example.com',
  mobile_number: '+8801700000000',
  amount: '500',
  currency: 'BDT',
  metadata: { order_id: '123' }.to_json,
  return_url: 'https://yoursite.com/callback',
  webhook_url: 'https://yoursite.com/api/webhook'
}.to_json

response = http.request(request)
data = JSON.parse(response.body)

if data['success']
  redirect_to data['checkout_url']
end`,
    },
  },
  {
    id: "verify-payment",
    title: "Verify Payment",
    method: "POST",
    url: "https://YOUR_PROJECT_REF.supabase.co/functions/v1/verify-payment",
    description: "Verify the status of a payment transaction using its transaction ID or reference.",
    icon: <ShieldCheck className="h-4 w-4" />,
    group: "Integration V3+",
    quickStart: [
      "After the customer returns to your return_url, extract the transaction_id from the URL parameters.",
      "Send a POST request with the transaction_id to verify the payment status.",
      "Check the status field in the response: 'completed', 'pending', or 'failed'.",
      "Update your order/database based on the verified status.",
    ],
    params: [
      { name: "transaction_id", type: "string", required: true, description: "The transaction ID or reference returned from the checkout.", example: "TXN_abc123" },
    ],
    headers: [
      { name: "MHS-API-KEY", type: "string", required: true, description: "Your API Key from the dashboard. Also accepted as x-api-key or Authorization Bearer header." },
      { name: "Content-Type", type: "string", required: true, description: "Must be application/json." },
    ],
    responseSuccess: JSON.stringify({ success: true, transaction: { id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890", ref: "174234567890123456789012345", amount: 500, currency: "BDT", status: "completed", customer: { id: "...", name: "John Doe", email: "john@example.com", phone: "01700000000" }, gateway: { id: "...", display_name: "bKash", gateway_type: "bkash" }, metadata: { matched_trx_id: "BKS12345678", matched_sender: "01700000000", matched_at: "2025-01-15T10:30:00Z" }, created_at: "2025-01-15T10:00:00Z", updated_at: "2025-01-15T10:30:00Z" } }, null, 2),
    responseError: JSON.stringify({ error: "Transaction not found" }, null, 2),
    codeExamples: {
      curl: `curl --request POST \\
  --url https://YOUR_PROJECT_REF.supabase.co/functions/v1/verify-payment \\
  --header 'content-type: application/json' \\
  --header 'MHS-API-KEY: sk_live_xxxxxxxxxxxx' \\
  --data '{"transaction_id": "TXN_abc123"}'`,
      node: `const response = await fetch('https://YOUR_PROJECT_REF.supabase.co/functions/v1/verify-payment', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'MHS-API-KEY': 'sk_live_xxxxxxxxxxxx'
  },
  body: JSON.stringify({ transaction_id: 'TXN_abc123' })
});
const data = await response.json();

if (data.success && data.transaction.status === 'completed') {
  console.log('Payment verified! Amount:', data.transaction.amount);
}`,
      php: `<?php
$ch = curl_init('https://YOUR_PROJECT_REF.supabase.co/functions/v1/verify-payment');
curl_setopt_array($ch, [
  CURLOPT_POST           => true,
  CURLOPT_HTTPHEADER     => [
    'Content-Type: application/json',
    'MHS-API-KEY: sk_live_xxxxxxxxxxxx',
  ],
  CURLOPT_POSTFIELDS     => json_encode([
    'transaction_id' => 'TXN_abc123',
  ]),
  CURLOPT_RETURNTRANSFER => true,
]);
$response = json_decode(curl_exec($ch), true);
curl_close($ch);

if ($response['success'] && $response['transaction']['status'] === 'completed') {
  echo "Paid: " . $response['transaction']['amount'];
}`,
      python: `import requests

response = requests.post(
    'https://YOUR_PROJECT_REF.supabase.co/functions/v1/verify-payment',
    headers={
        'Content-Type': 'application/json',
        'MHS-API-KEY': 'sk_live_xxxxxxxxxxxx'
    },
    json={'transaction_id': 'TXN_abc123'}
)
data = response.json()

if data['success'] and data['transaction']['status'] == 'completed':
    print(f"Payment verified! Amount: {data['transaction']['amount']}")`,
      ruby: `require 'net/http'
require 'json'
require 'uri'

uri = URI('https://YOUR_PROJECT_REF.supabase.co/functions/v1/verify-payment')
http = Net::HTTP.new(uri.host, uri.port)
http.use_ssl = true

request = Net::HTTP::Post.new(uri)
request['Content-Type'] = 'application/json'
request['MHS-API-KEY'] = 'sk_live_xxxxxxxxxxxx'
request.body = { transaction_id: 'TXN_abc123' }.to_json

response = http.request(request)
data = JSON.parse(response.body)

if data['success'] && data['transaction']['status'] == 'completed'
  puts "Payment verified! Amount: #{data['transaction']['amount']}"
end`,
    },
  },
  {
    id: "refund-payment",
    title: "Refund Payment",
    method: "POST",
    url: "https://YOUR_PROJECT_REF.supabase.co/functions/v1/refund-payment",
    description: "Initiate a refund for a completed transaction. The refund will be queued for processing.",
    icon: <RotateCcw className="h-4 w-4" />,
    group: "Integration V3+",
    quickStart: [
      "Identify the transaction_id of the completed payment you want to refund.",
      "Send a POST request with the transaction_id. Optionally include amount for partial refund.",
      "The refund will be queued with status 'pending' and processed by your team.",
      "A webhook notification will be sent when the refund is processed.",
    ],
    params: [
      { name: "transaction_id", type: "string", required: true, description: "The transaction ID of the completed payment.", example: "TXN_abc123" },
      { name: "amount", type: "string", required: false, description: "Partial refund amount. Omit for full refund.", example: "200" },
      { name: "reason", type: "string", required: false, description: "Reason for the refund.", example: "Customer requested refund" },
    ],
    headers: [
      { name: "MHS-API-KEY", type: "string", required: true, description: "Your API Key from the dashboard. Also accepted as x-api-key or Authorization Bearer header." },
      { name: "Content-Type", type: "string", required: true, description: "Must be application/json." },
    ],
    responseSuccess: JSON.stringify({ success: true, ref: "174234567890123456789012345", status: "refunded", amount: 500, currency: "BDT" }, null, 2),
    responseError: JSON.stringify({ error: "Only completed transactions can be refunded" }, null, 2),
    codeExamples: {
      curl: `curl --request POST \\
  --url https://YOUR_PROJECT_REF.supabase.co/functions/v1/refund-payment \\
  --header 'content-type: application/json' \\
  --header 'MHS-API-KEY: sk_live_xxxxxxxxxxxx' \\
  --data '{
    "transaction_id": "TXN_abc123",
    "amount": "200",
    "reason": "Customer requested refund"
  }'`,
      node: `const response = await fetch('https://YOUR_PROJECT_REF.supabase.co/functions/v1/refund-payment', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'MHS-API-KEY': 'sk_live_xxxxxxxxxxxx'
  },
  body: JSON.stringify({
    transaction_id: 'TXN_abc123',
    amount: '200',
    reason: 'Customer requested refund'
  })
});
const data = await response.json();

if (data.success) {
  console.log('Refund successful:', data.ref, data.status);
}`,
      php: `<?php
$ch = curl_init('https://YOUR_PROJECT_REF.supabase.co/functions/v1/refund-payment');
curl_setopt_array($ch, [
  CURLOPT_POST           => true,
  CURLOPT_HTTPHEADER     => [
    'Content-Type: application/json',
    'MHS-API-KEY: sk_live_xxxxxxxxxxxx',
  ],
  CURLOPT_POSTFIELDS     => json_encode([
    'transaction_id' => 'TXN_abc123',
    'amount'         => '200',
    'reason'         => 'Customer requested refund',
  ]),
  CURLOPT_RETURNTRANSFER => true,
]);
$response = json_decode(curl_exec($ch), true);
curl_close($ch);

if ($response['success']) {
  echo "Refund successful: " . $response['ref'];
}`,
      python: `import requests

response = requests.post(
    'https://YOUR_PROJECT_REF.supabase.co/functions/v1/refund-payment',
    headers={
        'Content-Type': 'application/json',
        'MHS-API-KEY': 'sk_live_xxxxxxxxxxxx'
    },
    json={
        'transaction_id': 'TXN_abc123',
        'amount': '200',
        'reason': 'Customer requested refund'
    }
)
data = response.json()

if data['success']:
    print(f"Refund successful: {data['ref']}")`,
      ruby: `require 'net/http'
require 'json'
require 'uri'

uri = URI('https://YOUR_PROJECT_REF.supabase.co/functions/v1/refund-payment')
http = Net::HTTP.new(uri.host, uri.port)
http.use_ssl = true

request = Net::HTTP::Post.new(uri)
request['Content-Type'] = 'application/json'
request['MHS-API-KEY'] = 'sk_live_xxxxxxxxxxxx'
request.body = {
  transaction_id: 'TXN_abc123',
  amount: '200',
  reason: 'Customer requested refund'
}.to_json

response = http.request(request)
data = JSON.parse(response.body)

if data['success']
  puts "Refund successful: #{data['ref']}"
end`,
    },
  },
  {
    id: "webhook-guides",
    title: "Webhook Guides",
    method: "POST",
    url: "/api/webhook (your server)",
    description: "Webhooks are sent to your server when a payment status changes. Configure your webhook URL during checkout creation. Your endpoint should return HTTP 200 to acknowledge receipt.",
    icon: <Webhook className="h-4 w-4" />,
    group: "Integration V3+",
    quickStart: [
      "Set up a POST endpoint on your server to receive webhook payloads.",
      "Pass this endpoint URL as webhook_url when creating a checkout.",
      "When payment status changes, we send a POST request with the payload below.",
      "Validate the payload and update your order/database accordingly.",
      "Return HTTP 200 to acknowledge receipt. Non-2xx triggers automatic retry.",
      "Retries: 5 attempts with exponential backoff (1min → 5min → 15min → 60min).",
    ],
    params: [
      { name: "event", type: "string", required: true, description: "The event type. e.g., payment.completed, payment.failed", example: "payment.completed" },
      { name: "transaction_id", type: "string", required: true, description: "The transaction reference ID.", example: "TXN_abc123" },
      { name: "amount", type: "number", required: true, description: "The payment amount.", example: "500" },
      { name: "currency", type: "string", required: true, description: "The payment currency.", example: "BDT" },
      { name: "status", type: "string", required: true, description: "The transaction status: completed, failed, refunded.", example: "completed" },
      { name: "payment_method", type: "string", required: true, description: "The payment method used.", example: "bkash" },
      { name: "sender_number", type: "string", required: false, description: "Sender's mobile number (MFS payments).", example: "01700000000" },
      { name: "trx_id", type: "string", required: false, description: "MFS transaction ID.", example: "BKS12345678" },
      { name: "metadata", type: "object", required: false, description: "The original metadata you sent during checkout.", example: '{"order_id": "123"}' },
    ],
    headers: [
      { name: "X-Webhook-Event", type: "string", required: true, description: "The webhook event type." },
      { name: "X-Webhook-Attempt", type: "string", required: true, description: "The delivery attempt number (1-5)." },
      { name: "Content-Type", type: "string", required: true, description: "application/json" },
    ],
    responseSuccess: JSON.stringify({ event: "payment.completed", transaction_id: "TXN_abc123", amount: 500, currency: "BDT", status: "completed", payment_method: "bkash", sender_number: "01700000000", trx_id: "BKS12345678", metadata: { order_id: "123", product_id: "456" }, paid_at: "2025-01-15T10:30:00Z" }, null, 2),
    responseError: JSON.stringify({ info: "Webhook delivery retries with exponential backoff:", attempts: ["Attempt 1: Immediate", "Attempt 2: After 1 minute", "Attempt 3: After 5 minutes", "Attempt 4: After 15 minutes", "Attempt 5: After 60 minutes"], note: "Return HTTP 200 to acknowledge. Non-2xx triggers retry." }, null, 2),
    codeExamples: {
      curl: `# Webhook payloads are sent TO your server.
# Example: receiving a webhook in your backend

# Your endpoint should:
# 1. Validate the payload
# 2. Process the event (update order status, etc.)
# 3. Return HTTP 200

# Example webhook payload:
{
  "event": "payment.completed",
  "transaction_id": "TXN_abc123",
  "amount": 500,
  "currency": "BDT",
  "status": "completed",
  "payment_method": "bkash",
  "sender_number": "01700000000",
  "trx_id": "BKS12345678"
}`,
      node: `// Express.js webhook handler
const express = require('express');
const app = express();
app.use(express.json());

app.post('/api/webhook', (req, res) => {
  const { event, transaction_id, amount, status, metadata } = req.body;
  const attempt = req.headers['x-webhook-attempt'];

  console.log(\`[\${attempt}] \${event} — TXN: \${transaction_id}\`);

  switch (event) {
    case 'payment.completed':
      // Mark order as paid
      break;
    case 'payment.failed':
      // Handle failed payment
      break;
    case 'payment.refunded':
      // Handle refund
      break;
  }

  res.status(200).json({ received: true });
});

app.listen(3000, () => console.log('Webhook server running'));`,
      php: `<?php
$payload = json_decode(file_get_contents('php://input'), true);

$event         = $payload['event'] ?? '';
$transactionId = $payload['transaction_id'] ?? '';
$amount        = $payload['amount'] ?? 0;
$status        = $payload['status'] ?? '';
$metadata      = $payload['metadata'] ?? [];

error_log("Webhook [{$_SERVER['HTTP_X_WEBHOOK_ATTEMPT']}]: {$event} for {$transactionId}");

switch ($event) {
    case 'payment.completed':
        // Update order status in database
        break;
    case 'payment.failed':
        break;
    case 'payment.refunded':
        break;
}

http_response_code(200);
echo json_encode(['received' => true]);`,
      python: `from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route('/api/webhook', methods=['POST'])
def webhook():
    payload = request.get_json()
    event = payload.get('event')
    transaction_id = payload.get('transaction_id')
    attempt = request.headers.get('X-Webhook-Attempt', '1')

    print(f"[{attempt}] {event} — TXN: {transaction_id}")

    if event == 'payment.completed':
        pass  # Update order
    elif event == 'payment.failed':
        pass
    elif event == 'payment.refunded':
        pass

    return jsonify({'received': True}), 200

if __name__ == '__main__':
    app.run(port=3000)`,
      ruby: `require 'sinatra'
require 'json'

post '/api/webhook' do
  payload = JSON.parse(request.body.read)
  event = payload['event']
  transaction_id = payload['transaction_id']
  attempt = request.env['HTTP_X_WEBHOOK_ATTEMPT'] || '1'

  puts "[#{attempt}] #{event} — TXN: #{transaction_id}"

  case event
  when 'payment.completed'
    # Update order status
  when 'payment.failed'
    # Handle failed payment
  when 'payment.refunded'
    # Handle refund
  end

  content_type :json
  { received: true }.to_json
end`,
    },
  },
];

// ─── Integration & SDK Docs ──────────────────────────────────────
const INTEGRATION_DOCS: IntegrationDoc[] = [
  {
    id: "woocommerce-plugin",
    title: "WooCommerce Plugin",
    description: "Integrate FREE Payment Gateways into your WordPress/WooCommerce store as a payment gateway.",
    icon: <ShoppingCart className="h-4 w-4" />,
    group: "Plugins",
    sections: [
      {
        heading: "Overview",
        content: "This plugin adds FREE Payment Gateways as a payment method in WooCommerce checkout. Customers are redirected to FREE Payment Gateways's secure checkout page, and after payment, they return to your store with the order automatically updated via webhook.",
      },
      {
        heading: "Step 1: Create Plugin File",
        content: "Create a file named `free-payment-gateways-gateway.php` inside `wp-content/plugins/free-payment-gateways-gateway/` and paste the code below:",
        language: "php",
        code: `<?php
/**
 * Plugin Name: FREE Payment Gateways Payment Gateway
 * Description: Accept payments via FREE Payment Gateways (bKash, Nagad, Rocket, Bank Transfer & more)
 * Version: 1.0.0
 * Author: FREE Payment Gateways
 * Requires Plugins: woocommerce
 */

if (!defined('ABSPATH')) exit;

add_action('plugins_loaded', 'fpg_init_gateway');

function fpg_init_gateway() {
    if (!class_exists('WC_Payment_Gateway')) return;

    class WC_Gateway_FREE Payment Gateways extends WC_Payment_Gateway {
        public function __construct() {
            $this->id                 = 'free-payment-gateways';
            $this->method_title       = 'FREE Payment Gateways';
            $this->method_description = 'Accept bKash, Nagad, Rocket, Bank Transfer & more via FREE Payment Gateways';
            $this->has_fields         = false;
            $this->icon               = '';

            $this->init_form_fields();
            $this->init_settings();

            $this->title       = $this->get_option('title', 'FREE Payment Gateways');
            $this->description = $this->get_option('description', 'Pay securely via bKash, Nagad, Rocket or Bank Transfer');
            $this->api_key     = $this->get_option('api_key');
            $this->api_url     = 'https://YOUR_PROJECT_REF.supabase.co/functions/v1';

            add_action('woocommerce_update_options_payment_gateways_' . $this->id, [$this, 'process_admin_options']);
            add_action('woocommerce_api_fpg_callback', [$this, 'handle_callback']);
            add_action('woocommerce_api_fpg_webhook', [$this, 'handle_webhook']);
        }

        public function init_form_fields() {
            $this->form_fields = [
                'enabled' => [
                    'title'   => 'Enable/Disable',
                    'type'    => 'checkbox',
                    'label'   => 'Enable FREE Payment Gateways Payment Gateway',
                    'default' => 'no',
                ],
                'title' => [
                    'title'   => 'Title',
                    'type'    => 'text',
                    'default' => 'FREE Payment Gateways',
                ],
                'description' => [
                    'title'   => 'Description',
                    'type'    => 'textarea',
                    'default' => 'Pay securely via bKash, Nagad, Rocket or Bank Transfer',
                ],
                'api_key' => [
                    'title'       => 'API Key',
                    'type'        => 'text',
                    'description' => 'Enter your FREE Payment Gateways API Key (starts with sk_live_)',
                ],
            ];
        }

        public function process_payment($order_id) {
            $order = wc_get_order($order_id);

            $payload = [
                'full_name'      => $order->get_billing_first_name() . ' ' . $order->get_billing_last_name(),
                'email_address'  => $order->get_billing_email(),
                'mobile_number'  => $order->get_billing_phone(),
                'amount'         => (string) $order->get_total(),
                'currency'       => $order->get_currency(),
                'metadata'       => json_encode([
                    'order_id'   => (string) $order_id,
                    'order_key'  => $order->get_order_key(),
                ]),
                'return_url'     => home_url('/wc-api/fpg_callback?order_id=' . $order_id),
                'webhook_url'    => home_url('/wc-api/fpg_webhook'),
            ];

            $response = wp_remote_post($this->api_url . '/api/checkout/redirect', [
                'headers' => [
                    'Content-Type' => 'application/json',
                    'MHS-API-KEY'  => $this->api_key,
                ],
                'body'    => json_encode($payload),
                'timeout' => 30,
            ]);

            if (is_wp_error($response)) {
                wc_add_notice('Payment error: ' . $response->get_error_message(), 'error');
                return;
            }

            $body = json_decode(wp_remote_retrieve_body($response), true);

            if (!empty($body['success']) && !empty($body['checkout_url'])) {
                $order->update_meta_data('_fpg_ref', $body['ref']);
                $order->update_meta_data('_fpg_txn_id', $body['transaction_id']);
                $order->save();

                return [
                    'result'   => 'success',
                    'redirect' => $body['checkout_url'],
                ];
            }

            wc_add_notice('Payment error: ' . ($body['message'] ?? 'Unknown error'), 'error');
            return;
        }

        public function handle_callback() {
            $order_id = absint($_GET['order_id'] ?? 0);
            $order = wc_get_order($order_id);

            if (!$order) {
                wp_redirect(home_url());
                exit;
            }

            // Verify payment status
            $ref = $order->get_meta('_fpg_ref');
            $verify = wp_remote_post($this->api_url . '/api/payment/verify', [
                'headers' => [
                    'Content-Type' => 'application/json',
                    'MHS-API-KEY'  => $this->get_option('api_key'),
                ],
                'body' => json_encode(['ref' => $ref]),
            ]);

            $data = json_decode(wp_remote_retrieve_body($verify), true);

            if (!empty($data['success']) && $data['transaction']['status'] === 'completed') {
                $order->payment_complete($ref);
                $order->add_order_note('FREE Payment Gateways payment completed. Ref: ' . $ref);
                wp_redirect($this->get_return_url($order));
            } else {
                $order->add_order_note('FREE Payment Gateways: Payment pending verification.');
                wp_redirect($this->get_return_url($order));
            }
            exit;
        }

        public function handle_webhook() {
            $payload = json_decode(file_get_contents('php://input'), true);

            if (empty($payload['event']) || empty($payload['metadata']['order_id'])) {
                status_header(400);
                exit;
            }

            $order = wc_get_order(absint($payload['metadata']['order_id']));
            if (!$order) {
                status_header(404);
                exit;
            }

            switch ($payload['event']) {
                case 'payment.completed':
                    if ($order->get_status() !== 'completed' && $order->get_status() !== 'processing') {
                        $order->payment_complete($payload['transaction_id']);
                        $order->add_order_note(sprintf(
                            'FREE Payment Gateways webhook: Payment completed. TrxID: %s, Sender: %s',
                            $payload['trx_id'] ?? 'N/A',
                            $payload['sender_number'] ?? 'N/A'
                        ));
                    }
                    break;
                case 'payment.failed':
                    $order->update_status('failed', 'FREE Payment Gateways: Payment failed.');
                    break;
                case 'payment.refunded':
                    $order->update_status('refunded', 'FREE Payment Gateways: Payment refunded.');
                    break;
            }

            status_header(200);
            echo json_encode(['received' => true]);
            exit;
        }
    }

    add_filter('woocommerce_payment_gateways', function ($gateways) {
        $gateways[] = 'WC_Gateway_FREE Payment Gateways';
        return $gateways;
    });
}`,
      },
      {
        heading: "Step 2: Install & Activate",
        content: "1. Upload the `free-payment-gateways-gateway` folder to `/wp-content/plugins/`\n2. Go to **WordPress Admin → Plugins** and activate **FREE Payment Gateways Payment Gateway**\n3. Go to **WooCommerce → Settings → Payments** and enable FREE Payment Gateways\n4. Enter your API Key (from FREE Payment Gateways Dashboard → Settings → API Keys)\n5. Save changes — done!",
      },
      {
        heading: "Step 3: Test",
        content: "Place a test order on your WooCommerce store. You should be redirected to the FREE Payment Gateways checkout page. After completing the payment, you'll return to the order confirmation page. The webhook will automatically update the order status.",
      },
    ],
  },
  {
    id: "shopify-app",
    title: "Shopify Integration",
    description: "Connect your Shopify store to FREE Payment Gateways for accepting MFS and bank transfer payments.",
    icon: <Store className="h-4 w-4" />,
    group: "Platform Integrations",
    sections: [
      {
        heading: "Overview",
        content: "Integrate FREE Payment Gateways with your Shopify store using a custom payment flow. Since Shopify doesn't natively support custom MFS gateways, we use a redirect-based approach through Shopify's Additional Payment Methods or a standalone checkout link.",
      },
      {
        heading: "Option 1: Alternative Payment Method (Recommended)",
        content: "Use Shopify's \"Manual payment methods\" or create a custom app that redirects customers to FREE Payment Gateways checkout.\n\n1. Go to **Shopify Admin → Settings → Payments**\n2. Scroll to \"Manual payment methods\" → Add manual payment method\n3. Name it \"bKash / Nagad / Bank Transfer (FREE Payment Gateways)\"\n4. Add payment instructions for your customers\n\nThen use a Shopify Flow or custom app to create FREE Payment Gateways checkout sessions:",
        language: "node",
        code: `// Shopify App — FREE Payment Gateways Payment Session
// server.js (Node.js + Express)

const express = require('express');
const crypto = require('crypto');
const app = express();
app.use(express.json());

const FREE-PAYMENT-GATEWAYS_API_KEY = process.env.FREE-PAYMENT-GATEWAYS_API_KEY;
const FREE-PAYMENT-GATEWAYS_API_URL = 'https://YOUR_PROJECT_REF.supabase.co/functions/v1';
const SHOPIFY_SECRET  = process.env.SHOPIFY_WEBHOOK_SECRET;

// Verify Shopify webhook signature
function verifyShopifyWebhook(req) {
  const hmac = req.headers['x-shopify-hmac-sha256'];
  const hash = crypto.createHmac('sha256', SHOPIFY_SECRET)
    .update(JSON.stringify(req.body))
    .digest('base64');
  return hmac === hash;
}

// Create FREE Payment Gateways checkout for Shopify order
app.post('/create-payment', async (req, res) => {
  const { order_id, email, phone, name, amount, currency } = req.body;

  const response = await fetch(FREE-PAYMENT-GATEWAYS_API_URL + '/api/checkout/redirect', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'MHS-API-KEY': FREE-PAYMENT-GATEWAYS_API_KEY,
    },
    body: JSON.stringify({
      full_name: name,
      email_address: email,
      mobile_number: phone,
      amount: String(amount),
      currency: currency || 'BDT',
      metadata: JSON.stringify({ shopify_order_id: order_id }),
      return_url: \`https://yourstore.myshopify.com/pages/payment-success?order=\${order_id}\`,
      webhook_url: 'https://your-server.com/free-payment-gateways-webhook',
    }),
  });

  const data = await response.json();
  res.json(data);
});

// Handle FREE Payment Gateways webhook → Update Shopify order
app.post('/free-payment-gateways-webhook', async (req, res) => {
  const { event, metadata, transaction_id, amount } = req.body;
  const orderId = metadata?.shopify_order_id;

  if (event === 'payment.completed' && orderId) {
    // Use Shopify Admin API to mark order as paid
    await fetch(\`https://yourstore.myshopify.com/admin/api/2024-01/orders/\${orderId}/transactions.json\`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': process.env.SHOPIFY_ACCESS_TOKEN,
      },
      body: JSON.stringify({
        transaction: {
          kind: 'capture',
          amount: amount,
          gateway: 'FREE Payment Gateways',
        },
      }),
    });
  }

  res.json({ received: true });
});

app.listen(3000);`,
      },
      {
        heading: "Option 2: Payment Link in Order Confirmation",
        content: "A simpler approach: generate an FREE Payment Gateways payment link and embed it in the Shopify order confirmation email or thank-you page.\n\n1. Create a Payment Link from FREE Payment Gateways Dashboard → Payment Links\n2. Use Shopify's Additional Scripts or theme customization to display the link\n3. The webhook automatically notifies your server when payment completes",
      },
      {
        heading: "Webhook Configuration",
        content: "Make sure your webhook endpoint:\n- Returns HTTP 200 on success\n- Validates the payload matches the expected Shopify order\n- Updates the order status via Shopify Admin API\n- Handles duplicate webhook deliveries (idempotency)",
      },
    ],
  },
  {
    id: "zapier-make",
    title: "Zapier / Make",
    description: "Automate workflows when payments complete using Zapier or Make (Integromat) webhooks.",
    icon: <Link2 className="h-4 w-4" />,
    group: "Platform Integrations",
    sections: [
      {
        heading: "Overview",
        content: "Connect FREE Payment Gateways to 5000+ apps using Zapier or Make. When a payment completes, FREE Payment Gateways sends a webhook that triggers your automation — send emails, update spreadsheets, create invoices, notify your team, and more.",
      },
      {
        heading: "Zapier Setup",
        content: "1. Create a new Zap in Zapier\n2. Choose **Webhooks by Zapier** as the trigger\n3. Select **Catch Hook** as the event\n4. Copy the webhook URL provided by Zapier\n5. Paste this URL as the `webhook_url` when creating a checkout via API\n6. Test by making a payment — Zapier will capture the payload\n7. Add actions (Gmail, Google Sheets, Slack, etc.)",
      },
      {
        heading: "Zapier Webhook Example",
        content: "The webhook payload Zapier receives:",
        language: "node",
        code: `// Zapier receives this payload on payment.completed:
{
  "event": "payment.completed",
  "transaction_id": "174234567890123456789012345",
  "amount": 500,
  "currency": "BDT",
  "status": "completed",
  "payment_method": "bkash",
  "sender_number": "01700000000",
  "trx_id": "BKS12345678",
  "metadata": {
    "order_id": "123",
    "customer_name": "John Doe"
  },
  "paid_at": "2025-01-15T10:30:00Z"
}

// Example Zap actions you can set up:
// 1. Send confirmation email via Gmail
// 2. Add row to Google Sheets
// 3. Post message to Slack channel
// 4. Create invoice in QuickBooks
// 5. Update CRM record in HubSpot`,
      },
      {
        heading: "Make (Integromat) Setup",
        content: "1. Create a new Scenario in Make\n2. Add a **Webhooks** module → **Custom webhook**\n3. Copy the webhook URL\n4. Use this URL as `webhook_url` in your API calls\n5. Run a test payment to capture the data structure\n6. Add modules to process the payment data",
        language: "node",
        code: `// Make.com HTTP Module — Verify payment after webhook
// Add this as a second module in your Make scenario

// Module: HTTP > Make a request
{
  "url": "https://YOUR_PROJECT_REF.supabase.co/functions/v1/verify-payment",
  "method": "POST",
  "headers": [
    { "name": "Content-Type", "value": "application/json" },
    { "name": "MHS-API-KEY", "value": "sk_live_xxxxxxxxxxxx" }
  ],
  "body": {
    "ref": "{{1.transaction_id}}"
  }
}

// Then add conditional logic:
// IF status = "completed" → Send email, update sheet, etc.
// IF status = "failed" → Send alert to admin`,
      },
      {
        heading: "Pro Tips",
        content: "• **Idempotency**: Zapier/Make may receive the same webhook twice. Use the `transaction_id` to check for duplicates.\n• **Filters**: In Zapier, add a Filter step to only process `payment.completed` events.\n• **Delay**: Add a 30-second delay before verifying payment to ensure the status is finalized.\n• **Error handling**: Set up Zapier/Make error notifications so you know if automations fail.",
      },
    ],
  },
  {
    id: "sdk-javascript",
    title: "JavaScript SDK",
    description: "Official JavaScript/TypeScript SDK for Node.js and browser environments.",
    icon: <FileCode className="h-4 w-4" />,
    group: "SDKs",
    sections: [
      {
        heading: "Installation",
        content: "Install via npm, yarn, or pnpm:",
        language: "node",
        code: `npm install free-payment-gateways
# or
yarn add free-payment-gateways
# or
pnpm add free-payment-gateways`,
      },
      {
        heading: "Quick Start",
        language: "node",
        code: `import FREE Payment Gateways from 'free-payment-gateways';

const free-payment-gateways = new FREE Payment Gateways('sk_live_xxxxxxxxxxxx');

// Create a payment
const payment = await free-payment-gateways.createPayment({
  fullName: 'John Doe',
  email: 'john@example.com',
  phone: '+8801700000000',
  amount: 500,
  currency: 'BDT',
  metadata: { orderId: '123' },
  returnUrl: 'https://yoursite.com/callback',
  webhookUrl: 'https://yoursite.com/api/webhook',
});

console.log(payment.checkoutUrl); // Redirect customer here

// Verify a payment
const result = await free-payment-gateways.verifyPayment('174234567890123456789012345');
console.log(result.status); // 'completed' | 'pending' | 'failed'

// Refund a payment
const refund = await free-payment-gateways.refundPayment('TXN_abc123', {
  amount: 200,
  reason: 'Customer request',
});`,
      },
      {
        heading: "Full SDK Source Code",
        content: "You can use this class directly in your project without installing from npm:",
        language: "node",
        code: `// free-payment-gateways.ts — FREE Payment Gateways JavaScript/TypeScript SDK

interface PaymentParams {
  fullName: string;
  email: string;
  phone: string;
  amount: number;
  currency: string;
  metadata?: Record<string, any>;
  returnUrl: string;
  webhookUrl: string;
}

interface PaymentResult {
  success: boolean;
  ref: string;
  transactionId: string;
  checkoutUrl: string;
  status: string;
}

interface VerifyResult {
  success: boolean;
  transaction: {
    id: string;
    ref: string;
    amount: number;
    currency: string;
    status: 'completed' | 'pending' | 'failed' | 'refunded';
    customer: { id: string; name: string; email: string; phone: string };
    gateway: { id: string; display_name: string; gateway_type: string };
    metadata: Record<string, any>;
    created_at: string;
    updated_at: string;
  };
}

interface RefundResult {
  success: boolean;
  ref: string;
  status: string;
  amount: number;
  currency: string;
}

class FREE Payment Gateways {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string, baseUrl = 'https://YOUR_PROJECT_REF.supabase.co/functions/v1') {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  private async request<T>(endpoint: string, body: any): Promise<T> {
    const res = await fetch(this.baseUrl + endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'MHS-API-KEY': this.apiKey,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || err.message || \`HTTP \${res.status}\`);
    }

    return res.json();
  }

  async createPayment(params: PaymentParams): Promise<PaymentResult> {
    return this.request('/api/checkout/redirect', {
      full_name: params.fullName,
      email_address: params.email,
      mobile_number: params.phone,
      amount: String(params.amount),
      currency: params.currency,
      metadata: JSON.stringify(params.metadata || {}),
      return_url: params.returnUrl,
      webhook_url: params.webhookUrl,
    });
  }

  async verifyPayment(ref: string): Promise<VerifyResult> {
    return this.request('/api/payment/verify', { ref });
  }

  async refundPayment(transactionId: string, options?: { amount?: number; reason?: string }): Promise<RefundResult> {
    return this.request('/api/payment/refund', {
      transaction_id: transactionId,
      ...(options?.amount && { amount: String(options.amount) }),
      ...(options?.reason && { reason: options.reason }),
    });
  }
}

export default FREE Payment Gateways;`,
      },
      {
        heading: "Error Handling",
        language: "node",
        code: `try {
  const payment = await free-payment-gateways.createPayment({ ... });
} catch (error) {
  if (error.message.includes('Invalid API key')) {
    console.error('Check your API key');
  } else if (error.message.includes('amount')) {
    console.error('Invalid amount');
  } else {
    console.error('Payment failed:', error.message);
  }
}`,
      },
    ],
  },
  {
    id: "sdk-php",
    title: "PHP SDK",
    description: "Official PHP SDK for Laravel, WordPress, and vanilla PHP projects.",
    icon: <FileCode className="h-4 w-4" />,
    group: "SDKs",
    sections: [
      {
        heading: "Installation",
        content: "Install via Composer (coming soon) or copy the class directly:",
        language: "php",
        code: `composer require src/dashboard/free-payment-gateways-php
# or copy the class below into your project`,
      },
      {
        heading: "Quick Start",
        language: "php",
        code: `<?php
require_once 'FREE Payment Gateways.php';

$free-payment-gateways = new FREE Payment Gateways('sk_live_xxxxxxxxxxxx');

// Create payment
$payment = $free-payment-gateways->createPayment([
    'full_name'     => 'John Doe',
    'email'         => 'john@example.com',
    'phone'         => '+8801700000000',
    'amount'        => 500,
    'currency'      => 'BDT',
    'metadata'      => ['order_id' => '123'],
    'return_url'    => 'https://yoursite.com/callback',
    'webhook_url'   => 'https://yoursite.com/webhook.php',
]);

// Redirect to checkout
header('Location: ' . $payment['checkout_url']);
exit;

// Verify payment
$result = $free-payment-gateways->verifyPayment('174234567890123456789012345');
if ($result['transaction']['status'] === 'completed') {
    echo "Payment successful!";
}

// Refund
$refund = $free-payment-gateways->refundPayment('TXN_abc123', 200, 'Customer request');`,
      },
      {
        heading: "Full SDK Source Code",
        language: "php",
        code: `<?php
// FREE Payment Gateways.php — FREE Payment Gateways PHP SDK

class FREE Payment Gateways {
    private string $apiKey;
    private string $baseUrl;

    public function __construct(string $apiKey, string $baseUrl = 'https://YOUR_PROJECT_REF.supabase.co/functions/v1') {
        $this->apiKey  = $apiKey;
        $this->baseUrl = rtrim($baseUrl, '/');
    }

    private function request(string $endpoint, array $body): array {
        $ch = curl_init($this->baseUrl . $endpoint);
        curl_setopt_array($ch, [
            CURLOPT_POST           => true,
            CURLOPT_HTTPHEADER     => [
                'Content-Type: application/json',
                'MHS-API-KEY: ' . $this->apiKey,
            ],
            CURLOPT_POSTFIELDS     => json_encode($body),
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 30,
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error    = curl_error($ch);
        curl_close($ch);

        if ($error) {
            throw new Exception("FREE Payment Gateways API error: " . $error);
        }

        $data = json_decode($response, true);

        if ($httpCode >= 400) {
            throw new Exception($data['error'] ?? $data['message'] ?? "HTTP {$httpCode}");
        }

        return $data;
    }

    public function createPayment(array $params): array {
        return $this->request('/api/checkout/redirect', [
            'full_name'      => $params['full_name'],
            'email_address'  => $params['email'],
            'mobile_number'  => $params['phone'],
            'amount'         => (string) $params['amount'],
            'currency'       => $params['currency'],
            'metadata'       => json_encode($params['metadata'] ?? []),
            'return_url'     => $params['return_url'],
            'webhook_url'    => $params['webhook_url'],
        ]);
    }

    public function verifyPayment(string $ref): array {
        return $this->request('/api/payment/verify', ['ref' => $ref]);
    }

    public function refundPayment(string $transactionId, ?float $amount = null, ?string $reason = null): array {
        $body = ['transaction_id' => $transactionId];
        if ($amount !== null) $body['amount'] = (string) $amount;
        if ($reason !== null) $body['reason'] = $reason;
        return $this->request('/api/payment/refund', $body);
    }
}`,
      },
      {
        heading: "Laravel Integration",
        content: "For Laravel projects, add the API key to `.env` and create a service:",
        language: "php",
        code: `// .env
FREE-PAYMENT-GATEWAYS_API_KEY=sk_live_xxxxxxxxxxxx

// config/services.php
'free-payment-gateways' => [
    'key' => env('FREE-PAYMENT-GATEWAYS_API_KEY'),
],

// app/Services/FREE Payment GatewaysService.php
<?php
namespace App\\Services;

class FREE Payment GatewaysService extends \\FREE Payment Gateways {
    public function __construct() {
        parent::__construct(config('services.free-payment-gateways.key'));
    }
}

// Usage in Controller:
$free-payment-gateways = new \\App\\Services\\FREE Payment GatewaysService();
$payment = $free-payment-gateways->createPayment([...]);
return redirect($payment['checkout_url']);`,
      },
    ],
  },
  {
    id: "sdk-python",
    title: "Python SDK",
    description: "Official Python SDK for Django, Flask, and standalone Python applications.",
    icon: <FileCode className="h-4 w-4" />,
    group: "SDKs",
    sections: [
      {
        heading: "Installation",
        content: "Install via pip (coming soon) or copy the class directly:",
        language: "python",
        code: `pip install free-payment-gateways
# or copy the class below into your project`,
      },
      {
        heading: "Quick Start",
        language: "python",
        code: `from free-payment-gateways import FREE Payment Gateways

client = FREE Payment Gateways('sk_live_xxxxxxxxxxxx')

# Create a payment
payment = client.create_payment(
    full_name='John Doe',
    email='john@example.com',
    phone='+8801700000000',
    amount=500,
    currency='BDT',
    metadata={'order_id': '123'},
    return_url='https://yoursite.com/callback',
    webhook_url='https://yoursite.com/api/webhook',
)
print(payment['checkout_url'])  # Redirect customer here

# Verify a payment
result = client.verify_payment('174234567890123456789012345')
print(result['transaction']['status'])  # 'completed'

# Refund a payment
refund = client.refund_payment('TXN_abc123', amount=200, reason='Customer request')`,
      },
      {
        heading: "Full SDK Source Code",
        language: "python",
        code: `# free-payment-gateways.py — FREE Payment Gateways Python SDK

import requests
import json
from typing import Optional, Dict, Any


class FREE Payment GatewaysError(Exception):
    """Raised when the FREE Payment Gateways API returns an error."""
    def __init__(self, message: str, status_code: int = 0):
        self.message = message
        self.status_code = status_code
        super().__init__(self.message)


class FREE Payment Gateways:
    def __init__(self, api_key: str, base_url: str = 'https://YOUR_PROJECT_REF.supabase.co/functions/v1'):
        self.api_key = api_key
        self.base_url = base_url.rstrip('/')

    def _request(self, endpoint: str, body: dict) -> dict:
        response = requests.post(
            f'{self.base_url}{endpoint}',
            headers={
                'Content-Type': 'application/json',
                'MHS-API-KEY': self.api_key,
            },
            json=body,
            timeout=30,
        )

        data = response.json()

        if response.status_code >= 400:
            error_msg = data.get('error') or data.get('message') or f'HTTP {response.status_code}'
            raise FREE Payment GatewaysError(error_msg, response.status_code)

        return data

    def create_payment(
        self,
        full_name: str,
        email: str,
        phone: str,
        amount: float,
        currency: str,
        return_url: str,
        webhook_url: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> dict:
        return self._request('/api/checkout/redirect', {
            'full_name': full_name,
            'email_address': email,
            'mobile_number': phone,
            'amount': str(amount),
            'currency': currency,
            'metadata': json.dumps(metadata or {}),
            'return_url': return_url,
            'webhook_url': webhook_url,
        })

    def verify_payment(self, ref: str) -> dict:
        return self._request('/api/payment/verify', {'ref': ref})

    def refund_payment(
        self,
        transaction_id: str,
        amount: Optional[float] = None,
        reason: Optional[str] = None,
    ) -> dict:
        body: dict = {'transaction_id': transaction_id}
        if amount is not None:
            body['amount'] = str(amount)
        if reason is not None:
            body['reason'] = reason
        return self._request('/api/payment/refund', body)`,
      },
      {
        heading: "Django Integration",
        content: "For Django projects, add the API key to settings and create a view:",
        language: "python",
        code: `# settings.py
FREE-PAYMENT-GATEWAYS_API_KEY = os.environ.get('FREE-PAYMENT-GATEWAYS_API_KEY', '')

# views.py
from django.shortcuts import redirect
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from free-payment-gateways import FREE Payment Gateways
from django.conf import settings

client = FREE Payment Gateways(settings.FREE-PAYMENT-GATEWAYS_API_KEY)

def create_payment(request):
    order = get_order(request)  # your logic
    payment = client.create_payment(
        full_name=order.customer_name,
        email=order.email,
        phone=order.phone,
        amount=order.total,
        currency='BDT',
        metadata={'order_id': str(order.id)},
        return_url=request.build_absolute_uri('/payment/callback/'),
        webhook_url=request.build_absolute_uri('/api/webhook/'),
    )
    return redirect(payment['checkout_url'])

@csrf_exempt
def webhook(request):
    import json
    payload = json.loads(request.body)
    
    if payload.get('event') == 'payment.completed':
        order_id = payload['metadata']['order_id']
        # Update order status
        Order.objects.filter(id=order_id).update(status='paid')
    
    return JsonResponse({'received': True})`,
      },
      {
        heading: "Error Handling",
        language: "python",
        code: `from free-payment-gateways import FREE Payment Gateways, FREE Payment GatewaysError

client = FREE Payment Gateways('sk_live_xxxxxxxxxxxx')

try:
    payment = client.create_payment(...)
except FREE Payment GatewaysError as e:
    print(f"API Error ({e.status_code}): {e.message}")
except requests.exceptions.Timeout:
    print("Request timed out")
except Exception as e:
    print(f"Unexpected error: {e}")`,
      },
    ],
  },
  {
    id: "embed-widget" as EndpointSection,
    title: "Embed Widget",
    description: "Embed FREE Payment Gateways checkout directly on any website using an iframe or JavaScript snippet. No server-side code needed.",
    icon: <Monitor className="h-4 w-4" />,
    group: "Embed",
    sections: [
      {
        heading: "Overview",
        content: "The Embed Widget lets merchants add a checkout button or inline payment form to any website. It works via:\n\n• **iframe** — Simple HTML embed, no JavaScript required\n• **JavaScript SDK** — Dynamic widget with popup/inline modes and event callbacks\n\nBoth methods use your API key to create payments and redirect to FREE Payment Gateways's secure checkout within the embed.",
      },
      {
        heading: "Method 1: iframe Embed",
        content: "Add this HTML to your website. Replace the parameters with your values:",
        language: "html",
        code: `<!-- FREE Payment Gateways Checkout iframe -->
<iframe
  src="https://pay.example.com/embed/pay?api_key=sk_live_xxxxxxxxxxxx&amount=500&currency=BDT&name=John+Doe&email=john@example.com&phone=01700000000&return_url=https://yoursite.com/success&webhook_url=https://yoursite.com/api/webhook"
  width="100%"
  height="700"
  frameborder="0"
  allow="payment"
  style="border: none; border-radius: 12px; max-width: 480px;"
></iframe>`,
      },
      {
        heading: "iframe Parameters",
        content: "| Parameter | Required | Description |\n|-----------|----------|-------------|\n| api_key | ✅ | Your API key from Dashboard → API Keys |\n| amount | ✅ | Payment amount |\n| currency | ❌ | Currency code (default: BDT) |\n| name | ❌ | Customer name |\n| email | ❌ | Customer email |\n| phone | ❌ | Customer phone |\n| metadata | ❌ | JSON string with custom data |\n| return_url | ❌ | Redirect URL after payment |\n| webhook_url | ❌ | Backend URL for payment notifications |",
      },
      {
        heading: "Method 2: JavaScript Widget",
        content: "For more control, use the JavaScript snippet. This opens checkout in a popup or inline container with event callbacks:",
        language: "html",
        code: `<!-- FREE Payment Gateways Checkout Widget -->
<script>
  (function() {
    window.FREE Payment Gateways = {
      baseUrl: 'https://YOUR_PROJECT_REF.supabase.co/functions/v1',

      /**
       * Open checkout in a popup window
       */
      checkout: function(config) {
        var params = new URLSearchParams({
          api_key: config.apiKey,
          amount: String(config.amount),
          currency: config.currency || 'BDT',
          name: config.customerName || '',
          email: config.customerEmail || '',
          phone: config.customerPhone || '',
          metadata: JSON.stringify(config.metadata || {}),
          return_url: config.returnUrl || '',
          webhook_url: config.webhookUrl || '',
        });

        var url = this.baseUrl + '/embed/pay?' + params.toString();
        var width = 480, height = 700;
        var left = (screen.width - width) / 2;
        var top = (screen.height - height) / 2;

        var popup = window.open(
          url,
          'fpg_checkout',
          'width=' + width + ',height=' + height + ',left=' + left + ',top=' + top + ',scrollbars=yes'
        );

        // Listen for messages from checkout
        window.addEventListener('message', function handler(e) {
          if (e.data && e.data.type === 'fpg_payment_created') {
            if (config.onPaymentCreated) config.onPaymentCreated(e.data);
          }
          if (e.data && e.data.type === 'fpg_error') {
            if (config.onError) config.onError(e.data.error);
          }
        });

        return popup;
      },

      /**
       * Embed checkout inline in a container
       */
      inline: function(config) {
        var container = document.getElementById(config.containerId);
        if (!container) { console.error('FREE Payment Gateways: Container not found:', config.containerId); return; }

        var params = new URLSearchParams({
          api_key: config.apiKey,
          amount: String(config.amount),
          currency: config.currency || 'BDT',
          name: config.customerName || '',
          email: config.customerEmail || '',
          phone: config.customerPhone || '',
          metadata: JSON.stringify(config.metadata || {}),
          return_url: config.returnUrl || '',
          webhook_url: config.webhookUrl || '',
        });

        var iframe = document.createElement('iframe');
        iframe.src = this.baseUrl + '/embed/pay?' + params.toString();
        iframe.style.cssText = 'width:100%;height:700px;border:none;border-radius:12px;max-width:480px;';
        iframe.allow = 'payment';
        container.innerHTML = '';
        container.appendChild(iframe);

        // Listen for messages
        window.addEventListener('message', function(e) {
          if (e.data && e.data.type === 'fpg_payment_created' && config.onPaymentCreated) {
            config.onPaymentCreated(e.data);
          }
          if (e.data && e.data.type === 'fpg_error' && config.onError) {
            config.onError(e.data.error);
          }
        });
      }
    };
  })();
</script>`,
      },
      {
        heading: "JavaScript: Popup Example",
        language: "html",
        code: `<button onclick="openPayment()">Pay 500 BDT</button>

<script>
  function openPayment() {
    FREE Payment Gateways.checkout({
      apiKey: 'sk_live_xxxxxxxxxxxx',
      amount: 500,
      currency: 'BDT',
      customerName: 'John Doe',
      customerEmail: 'john@example.com',
      customerPhone: '01700000000',
      metadata: { order_id: '12345', product: 'Premium Plan' },
      returnUrl: 'https://yoursite.com/success',
      webhookUrl: 'https://yoursite.com/api/webhook',
      onPaymentCreated: function(data) {
        console.log('Payment created!', data.ref, data.transaction_id);
      },
      onError: function(error) {
        console.error('Payment error:', error);
      }
    });
  }
</script>`,
      },
      {
        heading: "JavaScript: Inline Example",
        language: "html",
        code: `<!-- Container where checkout will appear -->
<div id="free-payment-gateways-container"></div>

<script>
  FREE Payment Gateways.inline({
    containerId: 'free-payment-gateways-container',
    apiKey: 'sk_live_xxxxxxxxxxxx',
    amount: 1000,
    currency: 'BDT',
    customerName: 'Jane Doe',
    customerEmail: 'jane@example.com',
    metadata: { plan: 'enterprise' },
    webhookUrl: 'https://yoursite.com/api/webhook',
    onPaymentCreated: function(data) {
      console.log('Checkout loaded:', data.ref);
    }
  });
</script>`,
      },
      {
        heading: "React / Next.js Integration",
        language: "node",
        code: `// components/FREE Payment GatewaysCheckout.tsx
import { useEffect, useRef } from 'react';

interface FREE Payment GatewaysProps {
  apiKey: string;
  amount: number;
  currency?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  metadata?: Record<string, any>;
  returnUrl?: string;
  webhookUrl?: string;
  onPaymentCreated?: (data: any) => void;
  onError?: (error: string) => void;
}

export function FREE Payment GatewaysCheckout(props: FREE Payment GatewaysProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const params = new URLSearchParams({
      api_key: props.apiKey,
      amount: String(props.amount),
      currency: props.currency || 'BDT',
      name: props.customerName || '',
      email: props.customerEmail || '',
      phone: props.customerPhone || '',
      metadata: JSON.stringify(props.metadata || {}),
      return_url: props.returnUrl || '',
      webhook_url: props.webhookUrl || '',
    });

    const iframe = document.createElement('iframe');
    iframe.src = \`https://pay.example.com/embed/pay?\${params}\`;
    iframe.style.cssText = 'width:100%;height:700px;border:none;border-radius:12px;';
    iframe.allow = 'payment';

    if (containerRef.current) {
      containerRef.current.innerHTML = '';
      containerRef.current.appendChild(iframe);
    }

    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'fpg_payment_created') props.onPaymentCreated?.(e.data);
      if (e.data?.type === 'fpg_error') props.onError?.(e.data.error);
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [props.apiKey, props.amount]);

  return <div ref={containerRef} style={{ maxWidth: 480 }} />;
}

// Usage in your page:
// <FREE Payment GatewaysCheckout
//   apiKey="sk_live_xxxxxxxxxxxx"
//   amount={500}
//   customerEmail="user@example.com"
//   onPaymentCreated={(data) => console.log('Paid!', data)}
// />`,
      },
      {
        heading: "Event Reference",
        content: "The embed widget communicates with your page via `window.postMessage`. Listen for these events:\n\n| Event Type | Data | Description |\n|------------|------|-------------|\n| `fpg_payment_created` | `{ ref, transaction_id, checkout_url }` | Payment session created, checkout loaded |\n| `fpg_error` | `{ error }` | Payment creation failed |\n\n**Security Note:** Always validate the `event.origin` in production to ensure messages come from `https://pay.example.com`.",
      },
      {
        heading: "Styling Tips",
        content: "• Set `max-width: 480px` on the iframe container for best appearance\n• Use `border-radius: 12px` to match FREE Payment Gateways's rounded design\n• The widget automatically uses light mode regardless of your site's theme\n• For dark backgrounds, wrap the iframe in a white container with padding",
      },
    ],
  },
];

// ─── Sidebar Config ──────────────────────────────────────────────
const SIDEBAR_GROUPS = [
  { label: "Integration V3+", items: ENDPOINTS.map(e => ({ id: e.id, title: e.title, icon: e.icon })) },
  { label: "Embed", items: INTEGRATION_DOCS.filter(d => d.group === "Embed").map(d => ({ id: d.id, title: d.title, icon: d.icon })) },
  { label: "Plugins", items: INTEGRATION_DOCS.filter(d => d.group === "Plugins").map(d => ({ id: d.id, title: d.title, icon: d.icon })) },
  { label: "Platform Integrations", items: INTEGRATION_DOCS.filter(d => d.group === "Platform Integrations").map(d => ({ id: d.id, title: d.title, icon: d.icon })) },
  { label: "SDKs", items: INTEGRATION_DOCS.filter(d => d.group === "SDKs").map(d => ({ id: d.id, title: d.title, icon: d.icon })) },
];

const ALL_SECTION_IDS = [...ENDPOINTS.map(e => e.id), ...INTEGRATION_DOCS.map(d => d.id)];

// ─── Shared Components ──────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-7 w-7 absolute top-2 right-2 text-muted-foreground hover:text-foreground z-10"
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
    </Button>
  );
}

function CodeBlock({ code, language }: { code: string; language: string }) {
  return (
    <div className="relative">
      <CopyButton text={code} />
      <pre className="bg-[hsl(var(--card))] border rounded-lg p-3 sm:p-4 pr-10 overflow-x-auto text-[11px] sm:text-xs font-mono leading-relaxed text-foreground whitespace-pre-wrap break-words sm:whitespace-pre sm:break-normal">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function ParamRow({ param }: { param: Param }) {
  return (
    <div className="flex flex-col gap-1 py-3 border-b last:border-b-0">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-mono text-xs sm:text-sm font-semibold text-foreground">{param.name}</span>
        <span className="text-[10px] sm:text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{param.type}</span>
        {param.required && <span className="text-[10px] sm:text-xs text-destructive font-medium">required</span>}
      </div>
      <p className="text-xs sm:text-sm text-muted-foreground">{param.description}</p>
      {param.example && (
        <code className="text-[10px] sm:text-xs font-mono text-muted-foreground/70 break-all">Example: {param.example}</code>
      )}
    </div>
  );
}

function QuickStartSteps({ steps }: { steps: string[] }) {
  return (
    <div className="border rounded-lg p-3 sm:p-4 bg-primary/5 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Zap className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Quick Start Guide</h3>
      </div>
      <div className="space-y-2">
        {steps.map((step, i) => (
          <div key={i} className="flex gap-2.5 items-start">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center mt-0.5">
              {i + 1}
            </span>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{step}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function RetryTimeline() {
  const retries = [
    { attempt: 1, delay: "Immediate", icon: <ArrowRight className="h-3 w-3" /> },
    { attempt: 2, delay: "1 minute", icon: <RefreshCw className="h-3 w-3" /> },
    { attempt: 3, delay: "5 minutes", icon: <RefreshCw className="h-3 w-3" /> },
    { attempt: 4, delay: "15 minutes", icon: <RefreshCw className="h-3 w-3" /> },
    { attempt: 5, delay: "60 minutes", icon: <RefreshCw className="h-3 w-3" /> },
  ];
  return (
    <div className="border rounded-lg p-3 sm:p-4 bg-muted/30 mb-6">
      <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
        <RefreshCw className="h-4 w-4 text-primary" />
        Retry Logic
      </h4>
      <div className="flex flex-wrap gap-2">
        {retries.map((r, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <div className="flex items-center gap-1 bg-background border rounded px-2 py-1">
              {r.icon}
              <span className="text-[10px] sm:text-xs font-mono">#{r.attempt}</span>
            </div>
            <span className="text-[10px] sm:text-xs text-muted-foreground">{r.delay}</span>
            {i < retries.length - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground/40" />}
          </div>
        ))}
      </div>
      <p className="text-[10px] sm:text-xs text-muted-foreground mt-2">
        Return HTTP 200 to acknowledge. Non-2xx status codes trigger automatic retry.
      </p>
    </div>
  );
}

// ─── Endpoint View (API docs) ────────────────────────────────────

function EndpointView({ endpoint }: { endpoint: EndpointDoc }) {
  const [codeLang, setCodeLang] = useState("curl");
  const [responseTab, setResponseTab] = useState<"success" | "error">("success");
  const languages = Object.keys(endpoint.codeExamples);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground mb-2">{endpoint.title}</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge className="bg-green-600 hover:bg-green-700 text-white font-mono text-[10px] sm:text-xs px-2">
            {endpoint.method}
          </Badge>
          <code className="text-[11px] sm:text-sm font-mono text-muted-foreground bg-muted px-2 sm:px-3 py-1 rounded break-all">
            {endpoint.url}
          </code>
        </div>
        <p className="text-xs sm:text-sm text-muted-foreground mt-2 leading-relaxed">{endpoint.description}</p>
      </div>

      <QuickStartSteps steps={endpoint.quickStart} />
      {endpoint.id === "webhook-guides" && <RetryTimeline />}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 space-y-5">
          <div>
            <h3 className="text-sm sm:text-base font-semibold text-foreground mb-2">
              {endpoint.id === "webhook-guides" ? "Webhook Payload Fields" : "Body Parameters"}
            </h3>
            <div className="border rounded-lg px-3 sm:px-4">
              {endpoint.params.map(p => <ParamRow key={p.name} param={p} />)}
            </div>
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-semibold text-foreground mb-2">Headers</h3>
            <div className="border rounded-lg px-3 sm:px-4">
              {endpoint.headers.map(h => <ParamRow key={h.name} param={h} />)}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div>
            <div className="flex items-center gap-1 mb-2 flex-wrap">
              {languages.map(lang => (
                <Button
                  key={lang}
                  variant={codeLang === lang ? "default" : "ghost"}
                  size="sm"
                  className="h-6 sm:h-7 text-[10px] sm:text-xs px-2"
                  onClick={() => setCodeLang(lang)}
                >
                  {LANG_LABELS[lang] || lang}
                </Button>
              ))}
            </div>
            <CodeBlock code={endpoint.codeExamples[codeLang]} language={codeLang} />
          </div>

          <div>
            <h4 className="text-xs sm:text-sm font-semibold text-foreground mb-2">Response</h4>
            <div className="flex gap-2 mb-2 flex-wrap">
              <button
                className={cn(
                  "text-[10px] sm:text-xs font-medium px-2 py-1 rounded",
                  responseTab === "success"
                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                    : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => setResponseTab("success")}
              >
                ● 200 - {endpoint.id === "webhook-guides" ? "Payload" : "OK"}
              </button>
              <button
                className={cn(
                  "text-[10px] sm:text-xs font-medium px-2 py-1 rounded",
                  responseTab === "error"
                    ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                    : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => setResponseTab("error")}
              >
                ● 400 - {endpoint.id === "webhook-guides" ? "Retry Info" : "Bad Request"}
              </button>
            </div>
            <CodeBlock
              code={responseTab === "success" ? endpoint.responseSuccess : endpoint.responseError}
              language="json"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Integration View (Plugins / SDKs) ──────────────────────────

function IntegrationView({ doc }: { doc: IntegrationDoc }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground mb-2">{doc.title}</h1>
        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{doc.description}</p>
      </div>

      {doc.sections.map((section, i) => (
        <div key={i} className="space-y-3">
          <h2 className="text-sm sm:text-lg font-semibold text-foreground border-b pb-2">{section.heading}</h2>
          {section.content && (
            <div className="text-xs sm:text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
              {section.content}
            </div>
          )}
          {section.code && (
            <CodeBlock code={section.code} language={section.language || "text"} />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Main Content ────────────────────────────────────────────────

function ApiDocsContent() {
  const [activeSection, setActiveSection] = useState<EndpointSection>("redirect-checkout");

  const activeEndpoint = ENDPOINTS.find(e => e.id === activeSection);
  const activeIntegration = INTEGRATION_DOCS.find(d => d.id === activeSection);

  return (
    <>
      <div className="mb-4 sm:mb-6">
        <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground mb-1">
          <BookOpen className="h-4 w-4" />
          <span>Developer</span>
          <ChevronRight className="h-3 w-3" />
          <span>API Reference</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">API Documentation</h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          Complete reference for integrating with our payment API. Endpoints, plugins, platform guides, and SDK libraries.
        </p>
        <div className="mt-3 rounded-md border border-warning/40 bg-warning/10 p-3 text-xs sm:text-sm">
          <p className="font-medium text-foreground">⚠️ Important: Use the Functions URL below</p>
          <p className="mt-1 text-muted-foreground">
            The base API host is{" "}
            <code className="px-1 py-0.5 rounded bg-muted font-mono">
              https://YOUR_PROJECT_REF.supabase.co/functions/v1
            </code>
            . The marketing site at <code className="font-mono">pay.example.com/api/...</code> is <strong>not</strong> an API host and will return HTML — causing 502/JSON parse errors. Headers <code className="font-mono">MHS-API-KEY</code>, <code className="font-mono">x-api-key</code>, and <code className="font-mono">Authorization: Bearer</code> are all accepted.
          </p>
        </div>
      </div>

      {/* Mobile tabs */}
      <div className="md:hidden mb-4">
        <Tabs value={activeSection} onValueChange={(v) => setActiveSection(v as EndpointSection)}>
          <TabsList className="w-full flex-wrap h-auto gap-1 p-1">
            {ALL_SECTION_IDS.map(id => {
              const ep = ENDPOINTS.find(e => e.id === id);
              const ig = INTEGRATION_DOCS.find(d => d.id === id);
              const title = ep?.title || ig?.title || id;
              return (
                <TabsTrigger key={id} value={id} className="text-[10px] px-2 py-1.5 min-w-0">
                  {title}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>
      </div>

      <div className="flex gap-6">
        {/* Sidebar */}
        <div className="hidden md:block w-56 flex-shrink-0">
          <div className="sticky top-4 space-y-4">
            {SIDEBAR_GROUPS.map(group => (
              <div key={group.label}>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  {group.label}
                </p>
                <div className="space-y-0.5">
                  {group.items.map(item => (
                    <button
                      key={item.id}
                      onClick={() => setActiveSection(item.id)}
                      className={cn(
                        "w-full flex items-center gap-2 text-left px-3 py-2 rounded-md text-sm transition-colors",
                        activeSection === item.id
                          ? "bg-primary/10 text-primary font-medium"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted"
                      )}
                    >
                      {item.icon}
                      <span className="flex-1 truncate">{item.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {activeEndpoint && <EndpointView endpoint={activeEndpoint} />}
          {activeIntegration && <IntegrationView doc={activeIntegration} />}
        </div>
      </div>
    </>
  );
}

export default function ApiDocs() {
  const { session } = useAuth();

  if (session) {
    return (
      <DashboardLayout>
        <ApiDocsContent />
      </DashboardLayout>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <ApiDocsContent />
      </div>
    </div>
  );
}
