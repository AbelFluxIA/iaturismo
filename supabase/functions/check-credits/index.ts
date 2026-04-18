import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { phone, name } = await req.json();

    if (!phone) {
      return new Response(
        JSON.stringify({ error: "O campo 'phone' é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Normalize phone: remove spaces, dashes, etc
    const normalizedPhone = phone.replace(/[\s\-\(\)]/g, '');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if customer exists
    const { data: existing, error: fetchError } = await supabase
      .from('customers')
      .select('*')
      .eq('phone', normalizedPhone)
      .maybeSingle();

    if (fetchError) throw fetchError;

    if (existing) {
      // Customer exists - check credits
      if (existing.free_credits <= 0) {
        return new Response(
          JSON.stringify({
            allowed: false,
            message: "Sem créditos gratuitos disponíveis",
            customer: {
              phone: existing.phone,
              name: existing.name,
              free_credits: existing.free_credits,
            }
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Has credits - consume one
      const { error: updateError } = await supabase
        .from('customers')
        .update({ free_credits: existing.free_credits - 1 })
        .eq('id', existing.id);

      if (updateError) throw updateError;

      // Update name if provided and different
      if (name && name !== existing.name) {
        await supabase
          .from('customers')
          .update({ name })
          .eq('id', existing.id);
      }

      return new Response(
        JSON.stringify({
          allowed: true,
          message: `Crédito consumido. Restam ${existing.free_credits - 1} crédito(s) gratuito(s).`,
          customer: {
            phone: existing.phone,
            name: name || existing.name,
            free_credits: existing.free_credits - 1,
          }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // New customer - create with default credits (3) and consume one
    const { data: newCustomer, error: insertError } = await supabase
      .from('customers')
      .insert({
        phone: normalizedPhone,
        name: name || null,
        free_credits: 2, // starts with 3 default, minus 1 consumed now
      })
      .select()
      .single();

    if (insertError) throw insertError;

    return new Response(
      JSON.stringify({
        allowed: true,
        message: "Primeiro roteiro gratuito! Resta 1 crédito gratuito.",
        customer: {
          phone: newCustomer.phone,
          name: newCustomer.name,
          free_credits: newCustomer.free_credits,
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
