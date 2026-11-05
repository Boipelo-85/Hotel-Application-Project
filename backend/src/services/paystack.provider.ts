import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import type {
  CheckoutRequest,
  CheckoutSession,
  PaymentProvider,
  VerifiedPaymentEvent,
} from '../config/payment.js';
import { AppError } from '../utils/errors.js';

const PAYSTACK_API = 'https://api.paystack.co';
const REQUEST_TIMEOUT_MS = 15_000;

export interface PaystackOptions {
  secretKey: string;
  callbackUrl: string;
  fetchImpl?: typeof fetch;
}

interface PaystackEnvelope<T> {
  status: boolean;
  message: string;
  data: T;
}

interface PaystackTransactionData {
  id?: number | string;
  status?: string;
  reference?: string;
  amount?: number | string;
  currency?: string;
}

interface PaystackRefundData {
  transaction_reference?: string;
  amount?: number | string;
  currency?: string;
}

function minorUnitDigits(currency: string): number {
  if (!/^[A-Za-z]{3}$/.test(currency)) {
    throw new AppError(400, 'Invalid payment currency', 'INVALID_AMOUNT');
  }
  try {
    const digits = new Intl.NumberFormat('en', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).resolvedOptions().maximumFractionDigits;
    if (typeof digits !== 'number') throw new Error('Currency precision is unavailable');
    return digits;
  } catch {
    throw new AppError(400, 'Invalid payment currency', 'INVALID_AMOUNT');
  }
}

export function toSubunits(amount: string, currency = 'USD'): string {
  const match = /^(\d+)(?:\.(\d+))?$/.exec(amount);
  if (!match || match[1] === undefined) {
    throw new AppError(400, 'Invalid payment amount', 'INVALID_AMOUNT');
  }

  const digits = minorUnitDigits(currency);
  const fraction = match[2] ?? '';
  if (fraction.length > digits && /[^0]/.test(fraction.slice(digits))) {
    throw new AppError(400, 'Payment amount precision is invalid', 'INVALID_AMOUNT');
  }
  const normalizedFraction = fraction.slice(0, digits).padEnd(digits, '0');
  const base = 10n ** BigInt(digits);
  const fractionalUnits = normalizedFraction ? BigInt(normalizedFraction) : 0n;
  const minorUnits = BigInt(match[1]) * base + fractionalUnits;
  if (minorUnits > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new AppError(400, 'Payment amount is too large', 'INVALID_AMOUNT');
  }
  return minorUnits.toString();
}

export function fromSubunits(value: number | string | undefined, currency = 'USD'): string {
  if (value === undefined || !/^\d+$/.test(String(value))) {
    throw new AppError(400, 'Payment provider event is invalid', 'INVALID_PAYMENT_EVENT');
  }
  const digits = minorUnitDigits(currency);
  const units = BigInt(String(value));
  const base = 10n ** BigInt(digits);
  const major = units / base;
  if (digits === 0) return major.toString();
  const fraction = (units % base).toString().padStart(digits, '0');
  return `${major}.${fraction}`;
}

function safeReferencePart(value: string): string {
  return value.replace(/[^A-Za-z0-9.=-]/g, '').slice(0, 40);
}

function invalidProviderResponse(): AppError {
  return new AppError(502, 'Payment provider returned an invalid response', 'INVALID_PROVIDER_RESPONSE');
}

export function createPaystackProvider(options: PaystackOptions): PaymentProvider {
  const doFetch = options.fetchImpl ?? fetch;

  async function paystack<T>(
    path: string,
    init: { method: 'GET' | 'POST'; body?: unknown },
    failureCode: 'INVALID_PROVIDER_RESPONSE' | 'REFUND_UNAVAILABLE',
  ): Promise<T> {
    let response: Response;
    try {
      response = await doFetch(`${PAYSTACK_API}${path}`, {
        method: init.method,
        headers: {
          Authorization: `Bearer ${options.secretKey}`,
          'Content-Type': 'application/json',
        },
        body: init.body === undefined ? undefined : JSON.stringify(init.body),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch {
      throw new AppError(502, 'Could not reach the payment provider', failureCode);
    }

    const payload = (await response.json().catch(() => null)) as PaystackEnvelope<T> | null;
    if (!response.ok || !payload || payload.status !== true) {
      throw new AppError(
        502,
        `Payment provider rejected the request: ${payload?.message ?? response.statusText}`,
        failureCode,
      );
    }
    return payload.data;
  }

  function toEvent(
    data: PaystackTransactionData,
    transactionReference: string,
    status: 'successful' | 'failed',
  ): VerifiedPaymentEvent {
    if (
      !data.currency ||
      !data.reference ||
      data.reference !== transactionReference ||
      data.id === undefined
    ) {
      throw invalidProviderResponse();
    }
    return {
      eventId: `charge.${status === 'successful' ? 'success' : 'failed'}:${data.id}`,
      transactionReference,
      status,
      amount: fromSubunits(data.amount, data.currency),
      currency: data.currency,
    };
  }

  return {
    name: 'paystack',

    async createCheckout(request: CheckoutRequest): Promise<CheckoutSession> {
      if (!request.customerEmail) {
        throw new AppError(400, 'A customer email is required to start payment', 'INVALID_DATA');
      }
      const idempotencyToken = createHash('sha256')
        .update(request.idempotencyKey)
        .digest('hex')
        .slice(0, 16);
      const reference = `HB-${safeReferencePart(request.bookingReference)}-${idempotencyToken}`;
      const data = await paystack<{ authorization_url?: string; reference?: string }>(
        '/transaction/initialize',
        {
          method: 'POST',
          body: {
            email: request.customerEmail,
            amount: Number(toSubunits(request.amount, request.currency)),
            currency: request.currency.toUpperCase(),
            reference,
            callback_url: options.callbackUrl,
            channels: request.paymentMethod === 'eft' ? ['eft'] : ['card'],
            metadata: {
              booking_reference: request.bookingReference,
              payment_method: request.paymentMethod,
            },
          },
        },
        'INVALID_PROVIDER_RESPONSE',
      );
      if (!data.authorization_url || !data.reference) throw invalidProviderResponse();
      let checkoutUrl: URL;
      try {
        checkoutUrl = new URL(data.authorization_url);
      } catch {
        throw invalidProviderResponse();
      }
      if (checkoutUrl.protocol !== 'https:' || !checkoutUrl.hostname.endsWith('.paystack.com')) {
        throw invalidProviderResponse();
      }
      return { checkoutUrl: checkoutUrl.toString(), transactionReference: data.reference };
    },

    async requestRefund(request): Promise<void> {
      await paystack(
        '/refund',
        {
          method: 'POST',
          body: {
            transaction: request.transactionReference,
            amount: Number(toSubunits(request.amount, request.currency)),
            currency: request.currency.toUpperCase(),
            merchant_note: 'Booking cancelled',
          },
        },
        'REFUND_UNAVAILABLE',
      );
    },

    async verifyWebhook(rawBody: Buffer, signature: string | undefined): Promise<VerifiedPaymentEvent | null> {
      const expected = createHmac('sha512', options.secretKey).update(rawBody).digest('hex');
      const given = Buffer.from(signature ?? '', 'utf8');
      const wanted = Buffer.from(expected, 'utf8');
      if (given.length !== wanted.length || !timingSafeEqual(given, wanted)) {
        throw new AppError(401, 'Invalid webhook signature', 'UNAUTHORIZED');
      }

      let body: { event?: string; data?: unknown };
      try {
        body = JSON.parse(rawBody.toString('utf8')) as { event?: string; data?: unknown };
      } catch {
        throw new AppError(400, 'Webhook must contain valid JSON', 'INVALID_WEBHOOK_BODY');
      }

      if (body.event !== 'charge.success' && body.event !== 'refund.processed') return null;
      if (!body.data || typeof body.data !== 'object') throw invalidProviderResponse();

      if (body.event === 'charge.success') {
        const data = body.data as PaystackTransactionData;
        if (data.status !== 'success' || !data.reference || data.id === undefined) {
          throw invalidProviderResponse();
        }
        return toEvent(data, data.reference, 'successful');
      }

      const data = body.data as PaystackRefundData;
      if (!data.transaction_reference || !data.currency) throw invalidProviderResponse();
      return {
        eventId: `refund.processed:${data.transaction_reference}`,
        transactionReference: data.transaction_reference,
        status: 'refunded',
        amount: fromSubunits(data.amount, data.currency),
        currency: data.currency,
      };
    },

    async verifyTransaction(transactionReference: string): Promise<VerifiedPaymentEvent | null> {
      const data = await paystack<PaystackTransactionData>(
        `/transaction/verify/${encodeURIComponent(transactionReference)}`,
        { method: 'GET' },
        'INVALID_PROVIDER_RESPONSE',
      );
      if (data.status === 'success') return toEvent(data, transactionReference, 'successful');
      if (data.status === 'failed') return toEvent(data, transactionReference, 'failed');
      return null;
    },
  };
}
