import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { encode as base64Encode } from 'https://deno.land/std@0.168.0/encoding/base64.ts';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const apiKey = Deno.env.get('ELEVENLABS_API_KEY');
    if (!apiKey) return json({ error: 'ELEVENLABS_API_KEY is not configured' }, 500);
    const { text } = await req.json();
    if (typeof text !== 'string' || !text.trim() || text.length > 1500) return json({ error: 'Invalid text' }, 400);

    // George — calm, warm male voice suited to a teacher.
    const res = await fetch(
      'https://api.elevenlabs.io/v1/text-to-speech/JBFqnCBsd6RMkjVDRZzb?output_format=mp3_44100_128',
      {
        method: 'POST',
        headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: { stability: 0.6, similarity_boost: 0.75, style: 0.3, use_speaker_boost: true, speed: 0.9 },
        }),
      },
    );
    if (!res.ok) {
      const details = await res.text();
      console.error(`TTS failed [${res.status}]: ${details}`);
      return json({ error: 'TTS failed', status: res.status, details }, res.status);
    }
    return json({ audioContent: base64Encode(await res.arrayBuffer()) });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Unknown error' }, 500);
  }
});
