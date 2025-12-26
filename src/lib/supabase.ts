import { createClient } from '@supabase/supabase-js';

export const createSupabaseClient = (supabaseUrl: string, supabaseKey: string) => {
    return createClient(supabaseUrl, supabaseKey, {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
        },
    });
};
