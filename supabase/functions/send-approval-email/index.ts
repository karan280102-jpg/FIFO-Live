// Supabase Edge Function: send-approval-email
// Deploy with: supabase functions deploy send-approval-email
// Requires a secret: supabase secrets set RESEND_API_KEY=your_resend_key
//
// Called from the frontend as:
//   supabase.functions.invoke('send-approval-email', { body: { item, coldStore, lotNo, qty, requestedBy, blockers } })

// @ts-ignore - Deno global is available in the Supabase Edge Functions runtime
Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { item, coldStore, lotNo, qty, requestedBy, blockers } = await req.json();

    const ADMIN_EMAIL = 'Karan280102@gmail.com';
    // @ts-ignore
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ ok: false, reason: 'RESEND_API_KEY not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const blockerLines = (blockers || [])
      .map((b: any) => `- Lot ${b.lot_no} (received ${b.lot_date}) still has ${b.pending_qty} kg pending`)
      .join('\n');

    const subject = `FIFO Approval Needed — ${item} (${coldStore})`;
    const text = [
      'A dispatch request would break FIFO order and needs your approval.',
      '',
      `Item: ${item}`,
      `Cold Store: ${coldStore}`,
      `Lot requested for dispatch: ${lotNo}`,
      `Quantity requested: ${qty} kg`,
      `Requested by: ${requestedBy}`,
      '',
      'This lot would be dispatched ahead of:',
      blockerLines,
      '',
      'Open the FIFO Live Approvals tab to approve or reject this request.'
    ].join('\n');

    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'FIFO Live <onboarding@resend.dev>', // replace with your verified sender domain once you add one in Resend
        to: [ADMIN_EMAIL],
        subject,
        text
      })
    });

    if (!resp.ok) {
      const errText = await resp.text();
      return new Response(JSON.stringify({ ok: false, reason: `Resend error: ${errText}` }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, reason: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
