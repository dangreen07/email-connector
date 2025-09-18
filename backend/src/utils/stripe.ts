import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil',
});

export const plans = {
  Basic: {
    productId: process.env.STRIPE_BASIC_PRODUCT!,
    apiCalls: 500_000,
    inboxes: 50,
    inboxPrice: 0.25,
    apiCallsPrice: 0.4, // Per 100,000
  },
  Growth: {
    productId: process.env.STRIPE_GROWTH_PRODUCT,
    apiCalls: 5_000_000,
    inboxes: 1_000,
    inboxPrice: 0.22,
    apiCallsPrice: 0.35,
  },
  Scale: {
    productId: process.env.STRIPE_SCALE_PRODUCT!,
    apiCalls: 20_000_000,
    inboxes: 5_000,
    inboxPrice: 0.2,
    apiCallsPrice: 0.3,
  },
};
