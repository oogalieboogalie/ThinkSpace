# Supabase Edge Functions Deployment Guide

## Overview

These Edge Functions handle AI API calls with tier-based rate limiting.
Your API keys are stored securely in Supabase secrets - never exposed to users.

## Prerequisites

1. Use `npx supabase` (no global install needed - it downloads automatically):
   ```bash
   npx supabase login
   ```

2. Link your project:
   ```bash
   npx supabase link --project-ref eaglbsdsaryrwydkpkpm
   ```

---

## Step 1: Run the SQL Schemas

In your Supabase Dashboard > SQL Editor, run these files in order:

1. `supabase/schema.sql` - Base tables
2. `supabase/user_profiles.sql` - Tier system & rate limiting

---

## Step 2: Set Your API Keys as Secrets

```bash
# AI Chat (required)
npx supabase secrets set MINIMAX_API_KEY=your_minimax_api_key_here

# TKG Memory - Qdrant Cloud (for AI memory/knowledge graph)
npx supabase secrets set QDRANT_URL=https://your-cluster.cloud.qdrant.io:6333
npx supabase secrets set QDRANT_API_KEY=your_qdrant_api_key_here
npx supabase secrets set QDRANT_COLLECTION=TheDojoKnowledge

# TKG Memory - Cohere (for embeddings)
npx supabase secrets set COHERE_API_KEY=your_cohere_api_key_here
```

This stores your keys securely - only Edge Functions can access them.

---

## Step 3: Deploy Edge Functions

```bash
# Deploy chat function
npx supabase functions deploy chat

# Deploy image generation function  
npx supabase functions deploy generate-image

# Deploy TKG (memory) functions
npx supabase functions deploy tkg-query
npx supabase functions deploy tkg-store
```

---

## Step 4: Test the Functions

```bash
# Test chat (replace with your auth token)
curl -X POST 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/chat' \
  -H 'Authorization: Bearer YOUR_USER_JWT' \
  -H 'Content-Type: application/json' \
  -d '{"messages": [{"role": "user", "content": "Hello!"}]}'
```

---

## Rate Limits (Configurable)

| Tier | Messages/Day | Images/Day | Notes |
|------|-------------|------------|-------|
| `free` | 15 | 5 | Default for new users |
| `paid` | 500 | 50 | $9/mo subscribers |
| `power` | 9999 | 9999 | BYOK users |
| `admin` | 9999 | 9999 | You and team |

To change limits, update the `tier_limits` table in Supabase.

---

## Upgrading a User to Paid

```sql
-- In Supabase SQL Editor or via API
UPDATE user_profiles 
SET tier = 'paid', subscription_status = 'active'
WHERE id = 'user-uuid-here';
```

Or in your app:
```typescript
await supabase
  .from('user_profiles')
  .update({ tier: 'paid', subscription_status: 'active' })
  .eq('id', userId);
```

---

## Later: Stripe Integration

When you're ready to add payments:

1. Add Stripe webhook handler Edge Function
2. On successful payment: `UPDATE user_profiles SET tier = 'paid'`
3. On subscription cancel: `UPDATE user_profiles SET tier = 'free'`

I can help you build this when you're ready!

---

## Monitoring Usage

```sql
-- See all users and their usage
SELECT 
  id, 
  display_name, 
  tier, 
  daily_message_count,
  daily_image_count,
  total_messages,
  total_images
FROM user_profiles
ORDER BY total_messages DESC;

-- See users hitting limits
SELECT * FROM user_profiles
WHERE daily_message_count >= 15 AND tier = 'free';
```
