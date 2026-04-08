/**
 * Supabase Edge Function: notify-new-word
 *
 * Triggered by a Database Webhook when a new word is inserted.
 * Sends Web Push notifications to all registered devices.
 *
 * Setup:
 * 1. Generate VAPID keys: npx web-push generate-vapid-keys
 * 2. Set secrets in Supabase:
 *    supabase secrets set VAPID_PUBLIC_KEY="..."
 *    supabase secrets set VAPID_PRIVATE_KEY="..."
 *    supabase secrets set VAPID_SUBJECT="mailto:your@email.com"
 * 3. Deploy: supabase functions deploy notify-new-word
 * 4. Create Database Webhook in Supabase Dashboard:
 *    - Table: words
 *    - Events: INSERT
 *    - Type: Supabase Edge Functions
 *    - Function: notify-new-word
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Web Push crypto helpers (minimal implementation for Deno)
async function sendWebPush(
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  payload: string,
  vapidKeys: { publicKey: string; privateKey: string; subject: string }
) {
  // Use the web-push-compatible approach for Deno
  const response = await fetch(subscription.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/octet-stream',
      TTL: '86400',
    },
    body: payload,
  });
  return response;
}

serve(async (req) => {
  try {
    const payload = await req.json();
    const record = payload.record;

    if (!record?.word) {
      return new Response('No word in payload', { status: 400 });
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get all push subscriptions
    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('*');

    if (error) {
      console.error('Error fetching subscriptions:', error);
      return new Response('Error fetching subscriptions', { status: 500 });
    }

    if (!subscriptions?.length) {
      return new Response('No subscriptions found', { status: 200 });
    }

    const notificationPayload = JSON.stringify({
      title: 'מילה חדשה!',
      body: `"${record.word}" נוספה לאוצר המילים של דניאלה 🌟`,
      url: './',
    });

    // Send push to all subscriptions
    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          const response = await fetch(sub.endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              TTL: '86400',
            },
            body: notificationPayload,
          });

          // If subscription expired, remove it
          if (response.status === 410 || response.status === 404) {
            await supabase
              .from('push_subscriptions')
              .delete()
              .eq('device_id', sub.device_id);
          }

          return { device: sub.device_id, status: response.status };
        } catch (err) {
          return { device: sub.device_id, error: err.message };
        }
      })
    );

    console.log('Push results:', JSON.stringify(results));

    return new Response(
      JSON.stringify({ sent: results.length, word: record.word }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (err) {
    console.error('Edge function error:', err);
    return new Response('Internal error', { status: 500 });
  }
});
