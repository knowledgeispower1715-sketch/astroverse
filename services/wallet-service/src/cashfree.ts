import crypto from 'crypto';

export interface CashfreeCustomerDetails {
  customer_id: string;
  customer_email?: string;
  customer_phone: string;
  customer_name?: string;
}

export interface CreateCashfreeOrderParams {
  orderId: string;
  orderAmount: number;
  orderCurrency?: string;
  customer: CashfreeCustomerDetails;
  returnUrl?: string;
  notifyUrl?: string;
  orderNote?: string;
}

export interface CashfreeOrderResponse {
  cf_order_id: string;
  order_id: string;
  order_status: 'ACTIVE' | 'PAID' | 'EXPIRED' | 'TERMINATED' | string;
  order_amount: number;
  order_currency: string;
  payment_session_id: string;
  created_at?: string;
}

export function isCashfreeConfigured(): boolean {
  const appId = (process.env.CASHFREE_APP_ID || '').trim();
  const secretKey = (process.env.CASHFREE_SECRET_KEY || '').trim();
  return Boolean(
    appId &&
    secretKey &&
    !appId.includes('YOUR_') &&
    !secretKey.includes('YOUR_') &&
    appId !== 'dummy_cashfree_app_id'
  );
}

export function getCashfreeBaseUrl(): string {
  const env = (process.env.CASHFREE_ENV || (process.env.NODE_ENV === 'production' ? 'production' : 'sandbox')).toLowerCase();
  return env === 'production'
    ? 'https://api.cashfree.com/pg'
    : 'https://sandbox.cashfree.com/pg';
}

export function getCashfreeApiVersion(): string {
  return process.env.CASHFREE_API_VERSION || '2026-01-01';
}

export async function createCashfreeOrder(params: CreateCashfreeOrderParams): Promise<CashfreeOrderResponse> {
  if (!isCashfreeConfigured()) {
    throw new Error('CASHFREE_NOT_CONFIGURED: Live Cashfree credentials (CASHFREE_APP_ID, CASHFREE_SECRET_KEY) are not configured.');
  }

  const appId = process.env.CASHFREE_APP_ID!.trim();
  const secretKey = process.env.CASHFREE_SECRET_KEY!.trim();
  const baseUrl = getCashfreeBaseUrl();
  const apiVersion = getCashfreeApiVersion();

  const payload: any = {
    order_id: params.orderId,
    order_amount: Number(params.orderAmount.toFixed(2)),
    order_currency: params.orderCurrency || 'INR',
    customer_details: {
      customer_id: params.customer.customer_id,
      customer_phone: params.customer.customer_phone || '9999999999',
      customer_email: params.customer.customer_email || 'seeker@astroverse.ai',
      customer_name: params.customer.customer_name || 'AstroVerse Seeker'
    },
    order_meta: {
      return_url: params.returnUrl || undefined,
      notify_url: params.notifyUrl || undefined
    },
    order_note: params.orderNote || 'AstroVerse Order'
  };

  const response = await fetch(`${baseUrl}/orders`, {
    method: 'POST',
    headers: {
      'x-client-id': appId,
      'x-client-secret': secretKey,
      'x-api-version': apiVersion,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const body: any = await response.json();
  if (!response.ok) {
    const errorMsg = body.message || body.error || `Cashfree order creation failed with status ${response.status}`;
    throw new Error(`CASHFREE_ORDER_FAILED: ${errorMsg}`);
  }

  return {
    cf_order_id: body.cf_order_id ? String(body.cf_order_id) : '',
    order_id: body.order_id,
    order_status: body.order_status,
    order_amount: body.order_amount,
    order_currency: body.order_currency,
    payment_session_id: body.payment_session_id,
    created_at: body.created_at
  };
}

export async function getCashfreeOrderStatus(orderId: string): Promise<CashfreeOrderResponse> {
  if (!isCashfreeConfigured()) {
    throw new Error('CASHFREE_NOT_CONFIGURED: Live Cashfree credentials are not configured.');
  }

  const appId = process.env.CASHFREE_APP_ID!.trim();
  const secretKey = process.env.CASHFREE_SECRET_KEY!.trim();
  const baseUrl = getCashfreeBaseUrl();
  const apiVersion = getCashfreeApiVersion();

  const response = await fetch(`${baseUrl}/orders/${encodeURIComponent(orderId)}`, {
    method: 'GET',
    headers: {
      'x-client-id': appId,
      'x-client-secret': secretKey,
      'x-api-version': apiVersion,
      'Content-Type': 'application/json'
    }
  });

  const body: any = await response.json();
  if (!response.ok) {
    const errorMsg = body.message || body.error || `Cashfree status lookup failed with status ${response.status}`;
    throw new Error(`CASHFREE_LOOKUP_FAILED: ${errorMsg}`);
  }

  return {
    cf_order_id: body.cf_order_id ? String(body.cf_order_id) : '',
    order_id: body.order_id,
    order_status: body.order_status,
    order_amount: body.order_amount,
    order_currency: body.order_currency,
    payment_session_id: body.payment_session_id,
    created_at: body.created_at
  };
}

export function verifyCashfreeWebhookSignature(
  rawBody: string | Buffer,
  timestamp: string,
  signature: string
): boolean {
  if (!isCashfreeConfigured()) return false;
  if (!timestamp || !signature) return false;

  const secretKey = process.env.CASHFREE_SECRET_KEY!.trim();
  const bodyString = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8');
  const signedPayload = timestamp + bodyString;

  const expectedSignature = crypto
    .createHmac('sha256', secretKey)
    .update(signedPayload)
    .digest('base64');

  try {
    const sigBuf = Buffer.from(signature, 'utf8');
    const expBuf = Buffer.from(expectedSignature, 'utf8');
    if (sigBuf.length !== expBuf.length) return false;
    return crypto.timingSafeEqual(sigBuf, expBuf);
  } catch {
    return false;
  }
}
