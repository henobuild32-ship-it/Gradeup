import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * GeniusPay payment initiation endpoint.
 * NOTE: kept under /pawapay path for backward compatibility.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { amount, currency, description, successUrl, cancelUrl } = body;

    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0 || !currency || !successUrl || !cancelUrl) {
      return NextResponse.json(
        { error: 'Missing required fields: amount, currency, successUrl, cancelUrl' },
        { status: 400 }
      );
    }

    const geniusPayApiKey = process.env.GENIUSPAY_API_KEY;
    const geniusPayApiSecret = process.env.GENIUSPAY_API_SECRET;
    const geniusPayBaseUrl = (process.env.GENIUSPAY_API_BASE_URL || 'https://geniuspay.ci/api/v1/merchant').replace(/\/$/, '');

    // Fallback local: if no credentials, use integrated checkout page.
    if (!geniusPayApiKey || !geniusPayApiSecret || geniusPayApiKey.includes('placeholder') || geniusPayApiSecret.includes('placeholder')) {
      const checkoutUrl = new URL('/checkout', request.url);
      checkoutUrl.searchParams.set('amount', String(parsedAmount));
      checkoutUrl.searchParams.set('currency', currency);
      checkoutUrl.searchParams.set('description', description || 'GradeUp payment');
      checkoutUrl.searchParams.set('successUrl', successUrl);
      checkoutUrl.searchParams.set('cancelUrl', cancelUrl);
      return NextResponse.json({ redirectUrl: checkoutUrl.toString() }, { status: 200 });
    }

    const response = await fetch(`${geniusPayBaseUrl}/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': geniusPayApiKey,
        'X-API-Secret': geniusPayApiSecret,
      },
      body: JSON.stringify({
        amount: parsedAmount,
        currency,
        description: description ?? 'GradeUp payment',
        success_url: successUrl,
        error_url: cancelUrl,
        metadata: {
          source: 'gradeup',
          module: 'student-card',
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.text().catch(() => '');
      return NextResponse.json(
        { error: 'GeniusPay request failed', details: errorData },
        { status: response.status }
      );
    }

    const data = await response.json();
    const redirectUrl =
      data?.data?.checkout_url ||
      data?.data?.payment_url ||
      data?.checkout_url ||
      data?.payment_url ||
      data?.redirectUrl;

    if (!redirectUrl) {
      return NextResponse.json(
        { error: 'GeniusPay response missing redirect URL' },
        { status: 500 }
      );
    }

    return NextResponse.json({ redirectUrl }, { status: 200 });
  } catch (err) {
    console.error('GeniusPay endpoint error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
