// TKG Store Edge Function - Store knowledge to Qdrant
// Deploy to Supabase Edge Functions
// SECURITY: User can only store to their own user_id (enforced from JWT)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TKGStoreRequest {
    content: string;
    nodeType?: string;
    importance?: number;
}

Deno.serve(async (req: Request) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        // Get secrets from environment
        const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
        const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const QDRANT_URL = Deno.env.get('QDRANT_URL');
        const QDRANT_API_KEY = Deno.env.get('QDRANT_API_KEY');
        const COHERE_API_KEY = Deno.env.get('COHERE_API_KEY');
        const QDRANT_COLLECTION = Deno.env.get('QDRANT_COLLECTION') || 'TheDojoKnowledge';

        if (!QDRANT_URL || !QDRANT_API_KEY || !COHERE_API_KEY) {
            return new Response(
                JSON.stringify({ error: 'TKG not configured. Missing API keys.' }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // SECURITY: Get authenticated user from JWT
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return new Response(
                JSON.stringify({ error: 'Missing authorization header' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Verify the JWT and get user
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            return new Response(
                JSON.stringify({ error: 'Invalid or expired token' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // SECURITY: Use the authenticated user's ID - cannot be spoofed
        const userId = user.id;

        // Parse request
        const { content, nodeType = 'FACT', importance = 0.5 } = await req.json() as TKGStoreRequest;

        if (!content || content.trim().length === 0) {
            return new Response(
                JSON.stringify({ error: 'Missing content parameter' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // 1. Generate embedding with Cohere
        const embedResponse = await fetch('https://api.cohere.ai/v1/embed', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${COHERE_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                texts: [content],
                model: 'embed-english-v3.0',
                input_type: 'search_document',
            }),
        });

        if (!embedResponse.ok) {
            const errorText = await embedResponse.text();
            console.error('Cohere error:', errorText);
            return new Response(
                JSON.stringify({ error: 'Failed to generate embedding' }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const embedData = await embedResponse.json();
        const vector = embedData.embeddings[0];

        // 2. Generate unique point ID
        const pointId = crypto.randomUUID();

        // 3. Store in Qdrant with user_id in payload (for filtering)
        const qdrantResponse = await fetch(`${QDRANT_URL}/collections/${QDRANT_COLLECTION}/points?wait=true`, {
            method: 'PUT',
            headers: {
                'api-key': QDRANT_API_KEY,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                points: [{
                    id: pointId,
                    vector: vector,
                    payload: {
                        content: content,
                        node_type: nodeType,
                        importance: importance,
                        user_id: userId, // SECURITY: Always use authenticated user ID
                        timestamp: new Date().toISOString(),
                    },
                }],
            }),
        });

        if (!qdrantResponse.ok) {
            const errorText = await qdrantResponse.text();
            console.error('Qdrant error:', errorText);
            return new Response(
                JSON.stringify({ error: 'Failed to store knowledge' }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        return new Response(
            JSON.stringify({
                success: true,
                id: pointId,
                message: 'Knowledge stored successfully'
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        console.error('TKG Store error:', error);
        return new Response(
            JSON.stringify({ error: `Server error: ${error.message}` }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
