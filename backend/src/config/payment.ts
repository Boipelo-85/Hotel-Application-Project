export interface CheckoutRequest {
  idempotencyKey: string;
  bookingReference: string;
  amount: string;
  currency: string;
}

export interface CheckoutSession {
  checkoutUrl: string;
  transactionReference: string;
}

export interface VerifiedPaymentEvent {
  eventId: string;
  transactionReference: string;
  status: 'successful' | 'failed' | 'refunded';
  amount: string;
  currency: string;
}

export interface PaymentProvider {
  readonly name: string;
  createCheckout(request: CheckoutRequest): Promise<CheckoutSession>;
  requestRefund(request: {
    idempotencyKey: string;
    transactionReference: string;
    amount: string;
    currency: string;
  }): Promise<void>;
  verifyWebhook(rawBody: Buffer, signature: string | undefined): Promise<VerifiedPaymentEvent>;
}

let activeProvider: PaymentProvider | undefined;

export function installPaymentProvider(provider: PaymentProvider): void {
  if (activeProvider) {
    throw new Error('A payment provider has already been installed');
  }
  activeProvider = provider;
}

export function getPaymentProvider(): PaymentProvider | undefined {
  return activeProvider;
}
