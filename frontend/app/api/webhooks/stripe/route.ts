import { syncWithStripe } from "@/utils/stripe/actions";
import { NextRequest, NextResponse } from "next/server";
import stripe from "stripe";

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  const body = await request.text();
  if (!body) {
    return NextResponse.json({
      error: "No body found!",
    });
  }
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({
      error: "Webhook signature header not found!",
    });
  }
  try {
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      endpointSecret
    ); // Verify this is a valid signature
    const { customer: customerId } = event?.data?.object as {
      customer: string; // Sadly TypeScript does not know this
    };

    // This helps make it typesafe and also lets me know if my assumption is wrong
    if (typeof customerId !== "string") {
      throw new Error(
        `[STRIPE HOOK][CANCER] ID isn't string.\nEvent type: ${event.type}`
      );
    }
    await syncWithStripe(customerId);
  } catch {
    return NextResponse.json({
      error: "Webhook signature verification failed.",
    });
  }
  return Response.json({ message: "Hello World" });
}
