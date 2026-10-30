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
  idempotencyKey?: string;
}

export interface CashfreePaymentEntity {
  cf_payment_id: string | number;
  payment_status: 'SUCCESS' | 'FAILED' | 'PENDING' | 'USER_DROPPED' | 'CANCELLED' | string;
  payment_amount: number;
  payment_currency: string;
  payment_message?: string;
  payment_time?: string;
  payment_group?: string;
  payment_method?: any;
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

export enum PaymentReadinessState {
  READY = 'READY',
  DISABLED_BY_MERCHANT_CONFIGURATION = 'DISABLED_BY_MERCHANT_CONFIGURATION',
  MISSING_SERVER_CREDENTIALS = 'MISSING_SERVER_CREDENTIALS',
  ENVIRONMENT_MISMATCH = 'ENVIRONMENT_MISMATCH',
  CASHFREE_AUTHENTICATION_FAILED = 'CASHFREE_AUTHENTICATION_FAILED',
  MERCHANT_NOT_ACTIVATED = 'MERCHANT_NOT_ACTIVATED',
  DOMAIN_CONFIGURATION_REQUIRED = 'DOMAIN_CONFIGURATION_REQUIRED',
  BACKEND_UNAVAILABLE = 'BACKEND_UNAVAILABLE',
  INVALID_PRODUCT_CONFIGURATION = 'INVALID_PRODUCT_CONFIGURATION'
}

export interface PaymentReadinessReport {
  state: PaymentReadinessState;
  configured: boolean;
  environment: 'production' | 'sandbox';
  gateway: 'CASHFREE';
  appIdMasked: string;
  adminExplanation: string;
  customerMessage: string;
}

export function getPaymentReadinessStatus(options?: { featureFlagEnabled?: boolean }): PaymentReadinessReport {
  const appId = (process.env.CASHFREE_APP_ID || '').trim();
  const secretKey = (process.env.CASHFREE_SECRET_KEY || '').trim();
  const env = (process.env.CASHFREE_ENV || (process.env.NODE_ENV === 'production' ? 'production' : 'sandbox')).toLowerCase() as 'production' | 'sandbox';

  const appIdMasked = appId.length > 8
    ? `${appId.slice(0, 4)}...${appId.slice(-4)}`
    : (appId ? '***' : 'NOT_CONFIGURED');

  if (options?.featureFlagEnabled === false) {
    return {
      state: PaymentReadinessState.DISABLED_BY_MERCHANT_CONFIGURATION,
      configured: false,
      environment: env,
      gateway: 'CASHFREE',
      appIdMasked,
      adminExplanation: 'Online payments have been paused via administrative feature flag.',
      customerMessage: 'Online payments are currently paused for scheduled maintenance.'
    };
  }

  if (!appId || !secretKey || appId.includes('YOUR_') || secretKey.includes('YOUR_') || appId === 'dummy_cashfree_app_id') {
    return {
      state: PaymentReadinessState.MISSING_SERVER_CREDENTIALS,
      configured: false,
      environment: env,
      gateway: 'CASHFREE',
      appIdMasked,
      adminExplanation: 'Live Cashfree API credentials (CASHFREE_APP_ID or CASHFREE_SECRET_KEY) are missing or set to placeholder values.',
      customerMessage: 'Online payment gateway is undergoing configuration. Please try again later or contact support.'
    };
  }

  // Detect credential/environment mismatch:
  // Production secret keys have format cfsk_ma_prod_...
  // Sandbox secret keys have format cfsk_ma_test_... and appId TEST...
  const isProdKey = secretKey.startsWith('cfsk_ma_prod_');
  const isTestKey = secretKey.startsWith('cfsk_ma_test_') || appId.startsWith('TEST');

  if (env === 'production' && isTestKey) {
    return {
      state: PaymentReadinessState.ENVIRONMENT_MISMATCH,
      configured: false,
      environment: env,
      gateway: 'CASHFREE',
      appIdMasked,
      adminExplanation: 'Environment mismatch: CASHFREE_ENV is "production" but provided secret key is a sandbox test credential (cfsk_ma_test_).',
      customerMessage: 'Online payment gateway configuration mismatch. Please contact support.'
    };
  }

  if (env === 'sandbox' && isProdKey) {
    return {
      state: PaymentReadinessState.ENVIRONMENT_MISMATCH,
      configured: false,
      environment: env,
      gateway: 'CASHFREE',
      appIdMasked,
      adminExplanation: 'Environment mismatch: CASHFREE_ENV is "sandbox" but provided secret key is a live production credential (cfsk_ma_prod_). Sandbox base URL rejects production keys.',
      customerMessage: 'Online payment gateway configuration mismatch. Please contact support.'
    };
  }

  return {
    state: PaymentReadinessState.READY,
    configured: true,
    environment: env,
    gateway: 'CASHFREE',
    appIdMasked,
    adminExplanation: `Cashfree Payment Gateway is fully configured and ready for transactions in ${env.toUpperCase()} mode.`,
    customerMessage: 'Online payments are active and secure.'
  };
}

export function isCashfreeConfigured(): boolean {
  const readiness = getPaymentReadinessStatus();
  return readiness.configured;
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

  const headers: Record<string, string> = {
    'x-client-id': appId,
    'x-client-secret': secretKey,
    'x-api-version': apiVersion,
    'Content-Type': 'application/json'
  };
  if (params.idempotencyKey) {
    headers['x-idempotency-key'] = params.idempotencyKey;
  }

  const response = await fetch(`${baseUrl}/orders`, {
    method: 'POST',
    headers,
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

export async function getPaymentsForCashfreeOrder(orderId: string): Promise<CashfreePaymentEntity[]> {
  if (!isCashfreeConfigured()) {
    throw new Error('CASHFREE_NOT_CONFIGURED: Live Cashfree credentials are not configured.');
  }

  const appId = process.env.CASHFREE_APP_ID!.trim();
  const secretKey = process.env.CASHFREE_SECRET_KEY!.trim();
  const baseUrl = getCashfreeBaseUrl();
  const apiVersion = getCashfreeApiVersion();

  const response = await fetch(`${baseUrl}/orders/${encodeURIComponent(orderId)}/payments`, {
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
    const errorMsg = body.message || body.error || `Cashfree payments lookup failed with status ${response.status}`;
    throw new Error(`CASHFREE_PAYMENTS_LOOKUP_FAILED: ${errorMsg}`);
  }

  if (Array.isArray(body)) {
    return body.map((p: any) => ({
      cf_payment_id: p.cf_payment_id,
      payment_status: p.payment_status,
      payment_amount: p.payment_amount,
      payment_currency: p.payment_currency,
      payment_message: p.payment_message,
      payment_time: p.payment_time,
      payment_group: p.payment_group,
      payment_method: p.payment_method
    }));
  }
  return [];
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
