Title: API Documentation & Integration Guide - PayStation

URL Source: https://www.paystation.com.bd/documentation

Markdown Content:
API v1 & v2

Integrate secure payment processing, transaction verification, and payout services using our REST APIs.

Your Store

Secure Checkout

Amount

USD 100.00

Choose a payment method

VISA

AMEX

Pay

Secured by Pay

## Choose Your Integration

#### REST API

Full control for custom applications and mobile apps.

Active

#### WooCommerce

Install the plugin, add your Merchant ID, and start accepting payments.

Active

![Image 1: OpenCart](https://www.paystation.com.bd/paystation/opencart/opencart.png)

#### OpenCart

Upload the extension, configure credentials, and test checkout.

#### Shopify

Install the plugin and start accepting payments in minutes.

![Image 2: Odoo](https://res.cloudinary.com/di1vdilgj/image/upload/v1785745827/odoo-logo-png_seeklogo-320087_udrjxx.png)

#### Odoo

Connect Sales, Invoicing and Website checkout seamlessly.

## Overview

Welcome to PayStation Integration guide. PayStation provides a secure, flexible, and robust payment gateway solution in Bangladesh. Whether you are selling physical goods, software services, online bookings, or managing payouts, our developer suite offers rich tools for integration.

#### Hosted Checkout

Redirect customers to our beautiful checkout page supporting cards, mobile wallets, and internet banking.

#### API Ref Verification

Server-to-server endpoints to verify transaction status and details via secure API keys.

## Environments

We maintain separate environments for sandbox testing and production live payments. Ensure you are using the correct credentials and endpoints.

Secret Key Protection

Always keep your store passwords and secret keys securely stored on your backend servers. Do not expose them in clients, frontend scripts, or public GitHub repositories.

| Environment | Base URL | Purpose |
| --- | --- | --- |
|  | `https://sandbox.paystation.com.bd` | For building, verifying, and mock payment simulations. |
| Production (Live) | `https://api.paystation.com.bd` | For routing live customer cards and transaction clearing. |

## Sandbox

The PayStation Sandbox provides an isolated testing environment that mirrors production behaviors. You can build, simulate customer checkouts, test webhook notifications (IPN), and verify transactions safely without moving real funds.

Sandbox Base URL

`https://sandbox.paystation.com.bd`

Merchant ID

`104-1653730183`

Password

`gamecoderstorepass`

Use these credentials for testing against `https://sandbox.paystation.com.bd`. Do not use them in production.

## Authentication

PayStation verifies incoming requests via combination headers and body parameters. For the **Initiate Payment API**, parameters like `merchantId` and `password` are provided in the payload body. For the **Transaction Status APIs**, `merchantId` must be supplied inside the HTTP headers.

## Error Codes

When an API call returns a response, the `status_code` field reports the outcome.

| Status Code | Status Name | Meaning / Notes |
| --- | --- | --- |
| `200` | Success | The request was successfully authenticated and executed. |
| `1008` | Duplicate Invoice | The requested unique invoice number has already been processed. |
| `2001` | Invalid Token / Not Found | Transaction details could not be resolved or secret key mismatch. |

## Hosted Checkout

Redirect the customer to the PayStation Hosted Checkout. Our system lists all native cards, EMI choices, mobile wallets (bKash, Nagad, Rocket, Upay), and bank channels automatically. Once payment is complete, we direct the customer back to your `callback_url` with parameters indicating payment outcomes.

#### Checkout Integration Flow

*   1 Your backend initiates payment to PayStation
*   2 Retrieve the secure checkout URL in response
*   3 Redirect customer browser to checkout portal
*   4 Return callback to success page and capture parameters

![Image 3: Checkout Page](https://www.paystation.com.bd/paystation/logo/checkoutpage.png)

POST/initiate-payment

URL: https://api.paystation.com.bd/initiate-payment

#### Request Body Parameters

| Param | Type | Requirement | Description |
| --- | --- | --- | --- |
| `merchantId` | string | Required | Your Merchant ID will be provided by PayStation. Example: `204-16537301811` |
| `password` | string | Required | Your Password will be provided by PayStation. Example: `gamepass` |
| `invoice_number` | string | Required | Unique invoice number for the transaction. Example: `90011355` |
| `currency` | string | Optional | Currency code for the transaction. Example: `BDT` |
| `payment_amount` | integer | Required | Transaction amount. Example: `1` |
| `pay_with_charge` | integer | Required | If the parameter is provided, the value must be 1 or 0. Use 1 if the Customer pays the charge and 0 if the Merchant pays the charge. * * * The default value is always 0. Example: * Customer pays the charge: `1` * Merchant pays the charge: `0` |
| `reference` | string | Optional | Reference information for the transaction. Example: `Some Ref Info` |
| `cust_name` | string | Required | Customer's full name. Example: `MM` |
| `cust_phone` | string | Required | Customer's phone number. Example: `01726315133` |
| `cust_email` | string | Required | Customer's email address. Example: `mm@mm.com` |
| `cust_address` | string | Optional | Customer's physical address. Example: `Customer address` |
| `callback_url` | string (URL) | Required | URL to receive transaction status updates. Example: `https://api.paystation.com.bd/payment-success/104` |
| `checkout_items` | string / JSON | Optional | Details of the purchased items. Example: `Some text or JSON` |
| `opt_a` | string / JSON | Optional | Any optional information. Example: `Some text or JSON` |
| `opt_b` | string / JSON | Optional | Any optional information. Example: `Some text or JSON` |
| `opt_c` | string / JSON | Optional | Any optional information. Example: `Some text or JSON` |
| `emi` | integer | Optional | Send this if you want to do an EMI transaction, otherwise ignore it. Example: `1` |

Request Snippet

curl -X POST https://api.paystation.com.bd/initiate-payment \
  -H "Accept: application/json" \
  -d "merchantId=204-16537301811" \
  -d "password=gamepass" \
  -d "invoice_number=90011355" \
  -d "currency=BDT" \
  -d "payment_amount=1" \
  -d "reference=Some Ref Info" \
  -d "cust_name=MM" \
  -d "cust_phone=01726315133" \
  -d "cust_email=mm@mm.com" \
  -d "cust_address=Customer address" \
  -d "callback_url=https://api.paystation.com.bd/payment-success/104" \
  -d "checkout_items=Some text or JSON"

#### Response Fields

| Param | Description |
| --- | --- |
| `status_code` | Status code `200` indicates the request was successful. Any other code indicates failure. |
| `status` | Indicates the status of the request: `success` or `failed`. |
| `message` | Provides additional details about the response. Example: `Payment Link Created Successfully.` |
| `payment_amount` | The amount for the payment. Example: `1` |
| `invoice_number` | The unique invoice number for the transaction. Example: `90011335545343` |
| `payment_url` | The URL for the payment checkout page. Example: `https://api.paystation.com.bd/checkout/12117397758013220/ZzHkhjalJ1ulsjuJOdx1mCSN1nj5AGPAvr1BlBjpccTFlC02hX` |

## Transaction Status (v1)

Query payment status server-to-server using the unique invoice number generated by your system.

POST/transaction-status

Headers: `merchantId`

Status v1 Snippet

curl -X POST https://api.paystation.com.bd/transaction-status \
  -H "merchantId: 104-1653730183" \
  -d "invoice_number=2021252525"

#### Request Parameters

| Param | Location | Type | Requirement | Description |
| --- | --- | --- | --- | --- |
| `merchantId` | Header | string | Required | Your Merchant ID provided by PayStation. Example: `204-16537301811` |
| `invoice_number` | Body | string | Required | Your unique invoice number that you sent in the initiate payment create API. |

#### Response Fields

| Param | Description |
| --- | --- |
| `status_code` | Status code `200` indicates that the request was successfully processed. |
| `status` | Indicates the request status: `success` or `failed`. |
| `message` | Provides details about the response. Example: `Transaction found` |
| data object (Returned if status_code is 200) |
| `data.invoice_number` | The unique invoice number for the transaction. Example: `90011335545343` |
| `data.trx_status` | Current transaction status. Possible values: `processing`, `success`, `failed`, `refund`. **Processing:** indicates the customer initiated the payment process but has not completed it yet. |
| `data.trx_id` | Unique Payment Transaction ID. (Empty if not available) |
| `data.payment_amount` | The transaction amount. Example: `1.00` |
| `data.order_date_time` | The date and time of the transaction. Example: `2025-02-17 13:03:21` |
| `data.payer_mobile_no` | Payer's mobile number. (Empty if not available) |
| `data.payment_method` | Payment method used (bKash/Nagad/Rocket/Upay/Mastercard/Visa). |
| `data.reference` | Reference information sent during the payment creation. Example: `Some Ref Info` |
| `data.checkout_items` | The checkout items sent in the payment create API. Example: `Some text or JSON` |

## Transaction Status (v2)

Query payment status server-to-server using the unique `trxId` returned by PayStation after successful checkouts.

POST/v2/transaction-status

Headers: `merchantId`, `Content-Type: application/json`

Status v2 Snippet

curl -X POST https://api.paystation.com.bd/v2/transaction-status \
  -H "merchantId: 104-1653730183" \
  -H "Content-Type: application/json" \
  -d '{"trxId": "CG20D8AYB4"}'

#### Request Parameters

| Param | Location | Type | Requirement | Description |
| --- | --- | --- | --- | --- |
| `merchantId` | Header | string | Required | Your Merchant ID provided by PayStation. Example: `204-16537301811` |
| `trxId` | Body (JSON) | string | Required | Your unique trxId returned by PayStation in the payment creation response. |

#### Response Fields

| Param | Description |
| --- | --- |
| `status_code` | Status code `200` indicates that the request was successfully processed. |
| `status` | Indicates the request status: `success` or `failed`. |
| `message` | Provides details about the response. Example: `Transaction found` |
| data object (Returned if status_code is 200) |
| `data.invoice_number` | The unique invoice number for the transaction. Example: `90011335545343` |
| `data.trx_status` | Current transaction status. Possible values: `processing`, `success`, `failed`, `refund`. **Processing:** indicates the customer initiated the payment process but has not completed it yet. |
| `data.trx_id` | Unique Payment Transaction ID. Example: `CG20D8AYB4` |
| `data.trx_amount` | The actual transaction amount. Example: `2` |
| `data.trx_date` | The date when the transaction was made. Format: `YYYY-MM-DD`. Example: `2025-07-02` |
| `data.request_amount` | The amount requested for the transaction. Example: `2.00` |
| `data.payment_amount` | The payment amount processed. Example: `2.00` |
| `data.order_date_time` | The exact date and time of order creation. Format: `YYYY-MM-DD HH:MM:SS`. Example: `2025-07-02 20:21:13` |
| `data.payer_mobile_no` | Payer mobile number. (Empty if not available). Example: `01811361428` |
| `data.payment_method` | Payment method used. Possible values: `bKash`, `Nagad`, `Rocket`, `Upay`, `Mastercard`, `Visa`. Example: `bKash` |
| `data.reference` | Reference information sent during the payment creation. Example: `Event Ticket` |

## Merchant IPN (Instant Payment Notification) API

After every successful transaction, our payment gateway sends an IPN — a POST request with a JSON body — to the IPN URL provided by you (the merchant). Your endpoint must be publicly reachable and respond quickly so the notification can be acknowledged. This section documents the request format, field meanings, response expectations and the recommended way to handle it safely.

POST{your-ipn-url}— provided by merchant

Content-Type: `application/json` · Auth: `None` (server-to-server)

#### Overview

1.   1 This is a **server-to-server IPN** — it is not a browser redirect. When a customer completes a payment, the gateway's server calls your endpoint directly to notify you the transaction succeeded.
2.   2 The IPN is triggered **only for successful transactions**.
3.   3 The request is sent as `POST` with `Content-Type: application/json`.
4.   4 You must implement this endpoint on your side and share the URL with us.
5.   5 Your endpoint must be publicly accessible from the internet (no IP allow-listing requirement, but we recommend you verify the payload as described below).
6.   **Idempotency:** the IPN may be retried. Your handler must be safe to call more than once for the same transaction.

#### IPN Endpoint

The IPN URL is configured per merchant. Provide the full HTTPS URL — including `https://` — so the notification can be delivered securely.

#### Request Payload

The IPN body is a flat JSON object:

| Field | Type | Requirement | Description |
| --- | --- | --- | --- |
| `invoice_number` | string | Required | Your order / invoice reference — the same number generated when the payment was initiated. Use it to match the IPN to the order in your system. |
| `trx_status` | string | Required | Transaction status. For this IPN it is always `"Success"` — the IPN is only sent for successful transactions. |
| `trx_id` | string | Required | Unique transaction ID generated by the payment gateway. Keep it as your reference for disputes / reconciliation. |
| `trx_amount` | number | Required | Transaction amount in BDT (numeric, e.g. `600`). |
| `order_date_time` | string | Required | Date and time of the transaction, format `Y-m-d H:i:s` (e.g. `2026-08-01 15:52:28`). |
| `payment_method` | string | Required | Payment method used by the customer (e.g. `Nagad`, `bKash`, `Rocket`, `Visa`, `Mastercard`, …). |
| `reference` | string | Optional | Optional additional reference, typically the provider / gateway reference (e.g. `Nagad`). |

`trx_id` masking: in documentation examples `trx_id` is shown masked as `"****"`. In the real IPN it contains the actual gateway transaction ID.

#### Response Expectation

Your endpoint must acknowledge the IPN by returning an HTTP 200 (2xx) response. The body is not inspected — it can be empty or a simple JSON acknowledgement:

| Your Response | Gateway Behaviour |
| --- | --- |
| `200 — 2xx` | IPN acknowledged. No further attempt is made. |
| `4xx / 5xx` | IPN treated as failed and retried (see Retry & Idempotency below). |
| Timeout / unreachable | IPN treated as failed and retried (see Retry & Idempotency below). |

Respond fast

Return 200 as soon as the payload is received and validated. Do heavy work (order fulfilment, emails, webhooks to third parties) after acknowledging — or in a background job — so the response is not delayed.

#### Retry & Idempotency

*   If your endpoint does not answer with a 2xx status, the gateway retries the IPN a limited number of times with a delay between attempts.
*   Because of retries, the same IPN may arrive more than once — always guard against duplicate processing.
*   Recommended guard: before processing, check whether `invoice_number` (or `trx_id`) has already been marked as paid in your system; if so, just return 200 again without re-processing.
*   Never update an order from paid back to unpaid based on a retried IPN.

#### Verification Checklist (Recommended)

Because the IPN is a plain HTTP POST, treat it as untrusted input and validate it before acting on it:

| # | Check | Why |
| --- | --- | --- |
| 1 | `invoice_number` exists in your system and is in a pending state | Only fulfil orders you actually know about. |
| 2 | `trx_status` equals `"Success"` | This IPN fires for successes, but always confirm the value. |
| 3 | `trx_amount` matches the amount you initiated for that invoice | Prevents under/over-crediting if a request is tampered with or mismatched. |
| 4 | `trx_id` has not been processed already (idempotency) | Retries must not double-credit the order. |
| 5 | Optionally verify the request origin against the gateway's server IPs | Extra layer against forged IPNs. |

#### Code Examples

IPN Handler Snippet

// routes/api.php
Route::post('/payment/ipn', [IpnController::class, 'handle']);

// app/Http/Controllers/IpnController.php
public function handle(Request $request)
{
    $data = $request->json()->all();

    // 1. Look up the order by invoice number
    $order = Order::where('invoice_number', $data['invoice_number'] ?? '')->first();

    // 2. Validate the payload
    if (! $order) {
        return response()->json(['status' => 'error'], 404);
    }

    // 3. Reject if not successful
    if (($data['trx_status'] ?? '') !== 'Success') {
        return response()->json(['status' => 'error'], 422);
    }

    // 4. Amount check
    if ((int) $data['trx_amount'] !== (int) $order->amount) {
        return response()->json(['status' => 'amount_mismatch'], 422);
    }

    // 5. Idempotency — already paid? just acknowledge
    if ($order->status === 'paid') {
        return response()->json(['status' => 'success']);
    }

    // 6. Mark as paid
    $order->update([
        'status' => 'paid',
        'trx_id' => $data['trx_id'],
        'payment_method' => $data['payment_method'],
        'paid_at' => $data['order_date_time'],
    ]);

    return response()->json(['status' => 'success']);
}

#### Notes & Edge Cases

*   Only successful transactions trigger this IPN. Failed, cancelled or pending transactions are not reported here.
*   The IPN body is flat JSON — no nested objects or arrays.
*   `trx_amount` is a JSON number; parse it numerically (avoid string comparison pitfalls when checking equality).
*   `order_date_time` uses 24-hour format `Y-m-d H:i:s`.
*   If you change your IPN URL, inform us so new notifications go to the correct endpoint.
*   Keep IPN logs (raw body + your response) for at least a few weeks to help with reconciliation and support queries.

## WooCommerce Plugin

Active

Accept cards, mobile wallets, and EMI on your WooCommerce store with the official **Paystation Payment Gateway** plugin. Install it directly from your WordPress dashboard — no coding required.

Before you start

WordPress and WooCommerce must already be installed and activated on your site before installing the Paystation Payment Gateway plugin.

[Download Plugin](https://github.com/Pay-Station/pgw-wp-plugin)

#### Installation & Setup

1.   1 Download the plugin `.zip` file from the link above (GitHub → Code → Download ZIP).
2.   2 In your WordPress dashboard, go to **Plugins > Add New > Upload Plugin**, and upload the zip file.
3.   3 Activate the **Paystation Payment Gateway** plugin.
4.   4 Go to **WooCommerce > Settings > Payments > Paystation Payment Gateway > Manage**, and enter your **Merchant ID**&**Password**.
5.   5 Choose **Pay With Charge** (customer bears the charge) or **Pay Without Charge** (merchant bears the charge).
6.   6 Choose **EMI: Yes** (minimum order amount should be 5000 BDT) or **No**.
7.   Save changes — that's it, you're ready to accept payments!

![Image 4: OpenCart](https://www.paystation.com.bd/paystation/opencart/opencart.png)

## OpenCart Plugin

Active

Accept cards, mobile wallets, and EMI on your OpenCart 4.x store with the official **PayStation** payment extension. Test safely in Sandbox, then flip one setting to go Live.

Before you start

You'll need an OpenCart 4.x store with admin access, a PayStation merchant account with Sandbox and/or Live Merchant ID & Password, and your store's default currency set to **BDT**.

[Download Plugin](https://www.paystation.com.bd/extentions/paystation.ocmod.zip)

#### Installation & Setup

1.   1 Download the extension zip from the link above, then upload it under **Extensions > Installer** and click **Install**.
2.   2 Go to **Extensions > Extensions**, filter by type **Payment**, find **PayStation**, and click its **Install** button too.
3.   3 Click **Edit** and enter your Sandbox & Live **Merchant ID / Password**, set the success/failed order statuses, EMI and charge options, then turn **Status** on.
4.   4 Set **Active Environment** to **Sandbox** and place a test order to confirm checkout and order status updates work.
5.   5 Once testing looks good, switch **Active Environment** to **Live** and save — nothing else needs to change.
6.   Track every payment under **PayStation > Transactions**, and use **Recheck Status** if an order gets stuck on pending.

Only seeing card payment, or payments failing instantly?

This is almost always a store currency issue, not a plugin issue. Make sure **BDT** is enabled under **System > Localisation > Currency** and set as the default under **System > Settings > General**.

## Status Codes

PayStation maps statuses to clean parameters returned in the transaction query response:  
• `success`: Transaction paid successfully.  
• `processing`: Payment initialized by user, but not completed yet.  
• `failed`: Transaction failed at card/wallet authentication.

## Support Center

If you encounter issues during payment gateway integration, testing, card transactions, or store registration verification, please contact our merchant onboarding team.

[Contact Dev Support](https://www.paystation.com.bd/report-an-issue)