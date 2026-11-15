# BTCPay Server — the 100% free, 0% fee payment method

BTCPay Server is a self-hosted, open-source Bitcoin/Lightning payment
processor. There are **no fees of any kind** — you accept payments directly
into your own wallet. This is the only way to accept real money with literally
zero ongoing cost.

> BTCPay is a separate project (GPLv3) and is not bundled in this repo.
> Run it alongside your gateway, then connect it in Admin → Settings.

## 1. Run BTCPay Server (Docker)

Official docs: https://docs.btcpayserver.org/Deployment/

```bash
# On a fresh VPS (Ubuntu) with a domain pointing at it:
git clone https://github.com/btcpayserver/btcpayserver-docker
cd btcpayserver-docker
. ./btcpay-setup.sh -i "btcpay.example.com" -s "btcpay.example.com"
```

Housing BTCPay at home works too — you need an inbound-reachable domain or
port-forward, plus the BTCPay Docker setup.

## 2. Create a store + API key in BTCPay

1. Open BTCPay → **Create store** → note the **Store ID** (Settings → General).
2. **Settings → Access Tokens** (or Account → API Keys) → create a key with
   **Invoices: create/query** permission → copy the API key.
3. In BTCPay: **Store → Settings → Webhooks → Create webhook**
   - Payload URL: `https://pay.yourdomain.com/webhooks/btcpay`
   - Secret: pick a long random string
   - Everything enabled is fine; we react to `InvoiceSettled` / `InvoicePaymentSettled`.

## 3. Configure in this gateway

Admin → Settings → **BTCPay Server**:

| Field | Value |
|---|---|
| BTCPay Server URL | `https://btcpay.example.com` |
| BTCPay store ID | `YourStoreId` |
| BTCPay API key | `your-token` |
| BTCPay webhook secret | the webhook secret |

## 4. Test

- Use BTCPay **regtest/testnet** mode first.
- Create a checkout via the API (see README) and pay it with a Lightning wallet
  (e.g. Phoenix/Wallet of Satoshi on testnet) or on-chain on testnet.
- The gateway will show the invoice as **paid** automatically when BTCPay
  confirms, and your merchant webhook will fire.

## What the gateway does automatically

- Creates BTCPay invoices with `metadata.orderId = <your invoice id>`
- Redirects the customer to BTCPay's hosted crypto checkout
- Verifies the webhook signature (`BTCPay-Sig`, HMAC-SHA256) and marks the
  invoice paid on `InvoiceSettled` / `InvoicePaymentSettled` / `InvoiceProcessing`
