// ==============================================================================
// ClickBarry Supabase Edge Function: payu-checkout
// File: supabase/functions/payu-checkout/index.ts
// Secure PayU Hosted Checkout Hash Generation & Server Verification
// ==============================================================================

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Supported actions
// 1. "generate-hash": Generates PayU SHA-512 payment hash on server
// 2. "verify-payment": Verifies PayU return hash and updates database

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function sha512(str: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-512", new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const PAYU_MERCHANT_KEY = Deno.env.get("PAYU_MERCHANT_KEY") || "TEST_MERCHANT_KEY";
    const PAYU_MERCHANT_SALT = Deno.env.get("PAYU_MERCHANT_SALT") || "TEST_MERCHANT_SALT";
    const PAYU_ENV = Deno.env.get("PAYU_ENV") || "TEST"; // "TEST" or "LIVE"
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    const { action, payload } = await req.json();

    // --------------------------------------------------------------------------
    // ACTION 1: GENERATE HASH (For Hosted Checkout initiation)
    // --------------------------------------------------------------------------
    if (action === "generate-hash") {
      const { txnid, amount, productinfo, firstname, email, phone, udf1 } = payload;

      // Business Rule: Seller Membership MUST be exactly 999.00 INR
      const validAmount = "999.00";

      // PayU Hash Format: sha512(key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5||||||SALT)
      const hashString = `${PAYU_MERCHANT_KEY}|${txnid}|${validAmount}|${productinfo}|${firstname}|${email}|${udf1 || ""}||||||||||${PAYU_MERCHANT_SALT}`;
      const hash = await sha512(hashString);

      const payuBaseUrl = PAYU_ENV === "LIVE" 
        ? "https://secure.payu.in/_payment" 
        : "https://test.payu.in/_payment";

      return new Response(
        JSON.stringify({
          success: true,
          hash,
          key: PAYU_MERCHANT_KEY,
          txnid,
          amount: validAmount,
          actionUrl: payuBaseUrl,
          mode: PAYU_ENV,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --------------------------------------------------------------------------
    // ACTION 2: VERIFY PAYMENT (Verifies reverse hash from PayU return)
    // --------------------------------------------------------------------------
    if (action === "verify-payment") {
      const {
        txnid,
        amount,
        productinfo,
        firstname,
        email,
        status,
        hash,
        udf1,
        mihpayid,
        bank_ref_num,
        mode: paymentMode,
      } = payload;

      // Reverse Hash Format: sha512(SALT|status||||||udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key)
      const reverseHashString = `${PAYU_MERCHANT_SALT}|${status}||||||||||${udf1 || ""}|${email}|${firstname}|${productinfo}|${amount}|${txnid}|${PAYU_MERCHANT_KEY}`;
      const calculatedHash = await sha512(reverseHashString);

      const isHashValid = calculatedHash.toLowerCase() === (hash || "").toLowerCase();
      const isPaymentSuccessful = status === "success" && (amount === "999.00" || amount === "999");

      if (!isHashValid && PAYU_ENV === "LIVE") {
        return new Response(
          JSON.stringify({ success: false, error: "Security Alert: Invalid PayU signature hash!" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Update database if Supabase service role is available
      if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY && isPaymentSuccessful) {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        
        await supabase
          .from("seller_membership_payments")
          .update({
            status: "success",
            payu_id: mihpayid,
            bank_ref_num: bank_ref_num,
            payment_mode: paymentMode,
            hash_verified: true,
            membership_activated_at: new Date().toISOString(),
          })
          .eq("txnid", txnid);
      }

      return new Response(
        JSON.stringify({
          success: isPaymentSuccessful,
          status: status,
          hashVerified: isHashValid || PAYU_ENV === "TEST",
          message: isPaymentSuccessful
            ? "Lifetime Seller Membership activated successfully!"
            : "Payment verification failed or payment was unsuccessful.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action specified." }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
