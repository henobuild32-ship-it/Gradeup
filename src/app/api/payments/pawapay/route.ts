import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * PawaPay payment initiation endpoint.
 * Expects a JSON payload with:
 *   - amount: number (in minor units, e.g., cents)
 *   - currency: string (ISO 4217, e.g., 'USD')
 *   - description: string (optional description of the transaction)
 *   - successUrl: string (URL to redirect after successful payment)
 *   - cancelUrl: string (URL to redirect if payment is cancelled)
 *
 * Returns JSON containing `redirectUrl` where the client should be redirected
 * to complete the payment.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { amount, currency, description, successUrl, cancelUrl } = body;

    if (!amount || !currency || !successUrl || !cancelUrl) {
      return NextResponse.json(
        { error: 'Missing required fields: amount, currency, successUrl, cancelUrl' },
        { status: 400 }
      );
    }

    const pawapayApiKey = process.env.PAWAPAY_API_KEY;
    const pawapaySecret = process.env.PAWAPAY_API_SECRET;
    
    // Fallback: En mode sandbox (pas de clés API configurées),
    // on redirige vers NOTRE propre page de checkout intégrée
    // au lieu de sauter directement vers l'URL de succès.
    if (!pawapayApiKey || !pawapaySecret || pawapayApiKey.includes('placeholder') || pawapaySecret.includes('placeholder')) {
      console.warn('PawaPay sandbox mode — using integrated checkout page.');
      
      // Construire l'URL de notre page de checkout avec les paramètres
      const checkoutUrl = new URL('/checkout', request.url);
      checkoutUrl.searchParams.set('amount', String(amount));
      checkoutUrl.searchParams.set('currency', currency);
      checkoutUrl.searchParams.set('description', description || 'GradeUp payment');
      checkoutUrl.searchParams.set('successUrl', successUrl);
      checkoutUrl.searchParams.set('cancelUrl', cancelUrl);
      
      return NextResponse.json({ redirectUrl: checkoutUrl.toString() }, { status: 200 });
    }

    // Mode production: vrai appel à l'API PawaPay
    const response = await fetch('https://sandbox-api.pawapay.io/v1/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${pawapayApiKey}`,
      },
      body: JSON.stringify({
        amount,
        currency,
        description: description ?? 'GradeUp payment',
        successUrl,
        cancelUrl,
        referenceId: crypto.randomUUID(),
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: 'PawaPay request failed', details: errorData },
        { status: response.status }
      );
    }

    const data = await response.json();
    const redirectUrl = data.checkoutUrl || data.redirectUrl;
    if (!redirectUrl) {
      return NextResponse.json(
        { error: 'PawaPay response missing redirect URL' },
        { status: 500 }
      );
    }

    return NextResponse.json({ redirectUrl }, { status: 200 });
  } catch (err) {
    console.error('PawaPay endpoint error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
