type PaymentConfig = {
  stripePaymentLink?: string;
};

export function resolveStripePaymentLink(payment: PaymentConfig) {
  const link =
    process.env.STRIPE_PAYMENT_LINK?.trim() ??
    payment.stripePaymentLink?.trim() ??
    "";

  if (link === "" || link === "#") {
    return "";
  }

  return link;
}

export function isStripePaymentLink(link: string) {
  return /^https:\/\/buy\.stripe\.com\/[A-Za-z0-9_/-]+$/.test(link);
}
