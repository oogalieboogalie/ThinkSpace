// Supabase Edge Function: Chat with AI
// Handles rate limiting per subscription tier

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ChatMessage {
    role: "user" | "assistant" | "system";
    content: string;
}

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        // Get auth token from request
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) {
            return new Response(
                JSON.stringify({ error: "Missing authorization header" }),
                { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Create Supabase client with user's auth
        const supabase = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_ANON_KEY") ?? "",
            { global: { headers: { Authorization: authHeader } } }
        );

        // Get user from token
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
            return new Response(
                JSON.stringify({ error: "Invalid token" }),
                { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Parse request body
        const { messages, systemPrompt } = await req.json() as {
            messages: ChatMessage[];
            systemPrompt?: string;
        };

        if (!messages || !Array.isArray(messages)) {
            return new Response(
                JSON.stringify({ error: "Messages array required" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Check usage limits using our database function
        const { data: usageCheck, error: usageError } = await supabase
            .rpc("check_and_increment_usage", {
                p_user_id: user.id,
                p_usage_type: "message"
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

        // Determine which API key to use
        // Priority: User's own key > Your shared key
        const apiKey = usageCheck.own_key || Deno.env.get("MINIMAX_API_KEY");

        if (!apiKey) {
            return new Response(
                JSON.stringify({ error: "API key not configured" }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Build messages array with optional system prompt
        const fullMessages: ChatMessage[] = [];
        if (systemPrompt) {
            fullMessages.push({ role: "system", content: systemPrompt });
        }
        fullMessages.push(...messages);

        // Call MiniMax API
        const minimaxResponse = await fetch(
            "https://api.minimaxi.chat/v1/text/chatcompletion_v2",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                    model: "MiniMax-Text-01",
                    messages: fullMessages,
                    max_tokens: 4096,
                }),
            }
        );

        if (!minimaxResponse.ok) {
            const errorText = await minimaxResponse.text();
            console.error("MiniMax API error:", errorText);
            return new Response(
                JSON.stringify({ error: "AI service error", details: errorText }),
                { status: minimaxResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const result = await minimaxResponse.json();
        const content = result.choices?.[0]?.message?.content || "No response generated";

        return new Response(
            JSON.stringify({
                content,
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
