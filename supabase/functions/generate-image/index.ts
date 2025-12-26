// Supabase Edge Function: Image Generation
// Handles rate limiting per subscription tier

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        // Get auth token
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) {
            return new Response(
                JSON.stringify({ error: "Missing authorization header" }),
                { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Create Supabase client
        const supabase = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_ANON_KEY") ?? "",
            { global: { headers: { Authorization: authHeader } } }
        );

        // Get user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
            return new Response(
                JSON.stringify({ error: "Invalid token" }),
                { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Parse request
        const { prompt, aspectRatio = "1:1" } = await req.json();

        if (!prompt) {
            return new Response(
                JSON.stringify({ error: "Prompt required" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Check usage limits
        const { data: usageCheck, error: usageError } = await supabase
            .rpc("check_and_increment_usage", {
                p_user_id: user.id,
                p_usage_type: "image"
            });

        if (usageError) {
            console.error("Usage check error:", usageError);
            return new Response(
                JSON.stringify({ error: "Failed to check usage limits" }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        if (!usageCheck.allowed) {
            return new Response(
                JSON.stringify({
                    error: "rate_limit",
                    message: usageCheck.message,
                    tier: usageCheck.tier,
                    current: usageCheck.current,
                    limit: usageCheck.limit,
                }),
                { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Get API key
        const apiKey = usageCheck.own_key || Deno.env.get("MINIMAX_API_KEY");

        if (!apiKey) {
            return new Response(
                JSON.stringify({ error: "API key not configured" }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Call MiniMax Image API
        const minimaxResponse = await fetch(
            "https://api.minimaxi.chat/v1/image/generation",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                    model: "image-01",
                    prompt,
                    aspect_ratio: aspectRatio,
                }),
            }
        );

        if (!minimaxResponse.ok) {
            const errorText = await minimaxResponse.text();
            console.error("MiniMax Image API error:", errorText);
            return new Response(
                JSON.stringify({ error: "Image generation failed", details: errorText }),
                { status: minimaxResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const result = await minimaxResponse.json();
        const imageUrl = result.data?.image_url || result.image_url;

        if (!imageUrl) {
            return new Response(
                JSON.stringify({ error: "No image URL returned" }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Optionally save to user_images table
        await supabase.from("user_images").insert({
            user_id: user.id,
            prompt,
            image_url: imageUrl,
        });

        return new Response(
            JSON.stringify({
                imageUrl,
                usage: {
                    tier: usageCheck.tier,
                    remaining: usageCheck.remaining,
                    limit: usageCheck.limit,
                }
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

    } catch (error) {
        console.error("Edge function error:", error);
        return new Response(
            JSON.stringify({ error: "Internal server error", details: error.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
