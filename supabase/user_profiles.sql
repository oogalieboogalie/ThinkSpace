-- ============================================
-- User Profiles & Subscription Tiers
-- Run this AFTER schema.sql in Supabase SQL Editor
-- ============================================

-- User profiles table with subscription info
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  
  -- Subscription tier
  tier TEXT DEFAULT 'free' CHECK (tier IN ('free', 'paid', 'power', 'admin')),
  
  -- Usage tracking
  daily_message_count INTEGER DEFAULT 0,
  daily_image_count INTEGER DEFAULT 0,
  usage_reset_date DATE DEFAULT CURRENT_DATE,
  
  -- Lifetime stats
  total_messages INTEGER DEFAULT 0,
  total_images INTEGER DEFAULT 0,
  
  -- Payment integration (for later)
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  subscription_status TEXT DEFAULT 'none' CHECK (subscription_status IN ('none', 'active', 'canceled', 'past_due')),
  
  -- Optional: User's own API key (BYOK for power users)
  own_minimax_key TEXT,
  
  -- Profile info
  display_name TEXT,
  avatar_url TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Users can only see/edit their own profile
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;

CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

-- Allow insert for new users (via trigger)
DROP POLICY IF EXISTS "System can create profiles" ON user_profiles;
CREATE POLICY "System can create profiles" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- ============================================
-- Rate Limits Configuration
-- Easy to adjust without code changes
-- ============================================

CREATE TABLE IF NOT EXISTS tier_limits (
  tier TEXT PRIMARY KEY,
  daily_messages INTEGER NOT NULL,
  daily_images INTEGER NOT NULL,
  description TEXT
);

-- Insert default limits
INSERT INTO tier_limits (tier, daily_messages, daily_images, description) VALUES
  ('free', 15, 5, 'Free tier - limited daily usage'),
  ('paid', 500, 50, 'Paid tier ($9/mo) - generous limits'),
  ('power', 9999, 9999, 'Power users with own API keys - unlimited'),
  ('admin', 9999, 9999, 'Admin accounts - unlimited')
ON CONFLICT (tier) DO UPDATE SET
  daily_messages = EXCLUDED.daily_messages,
  daily_images = EXCLUDED.daily_images,
  description = EXCLUDED.description;

-- ============================================
-- Auto-create profile on user signup
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, display_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- Daily usage reset function
-- Run this as a cron job (Supabase pg_cron)
-- ============================================

CREATE OR REPLACE FUNCTION reset_daily_usage()
RETURNS void AS $$
BEGIN
  UPDATE user_profiles
  SET 
    daily_message_count = 0,
    daily_image_count = 0,
    usage_reset_date = CURRENT_DATE
  WHERE usage_reset_date < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Helper function to check usage limits
-- Called by Edge Functions
-- ============================================

CREATE OR REPLACE FUNCTION check_and_increment_usage(
  p_user_id UUID,
  p_usage_type TEXT  -- 'message' or 'image'
)
RETURNS JSON AS $$
DECLARE
  v_profile user_profiles%ROWTYPE;
  v_limits tier_limits%ROWTYPE;
  v_current_count INTEGER;
  v_limit INTEGER;
BEGIN
  -- Reset if new day
  UPDATE user_profiles
  SET 
    daily_message_count = 0,
    daily_image_count = 0,
    usage_reset_date = CURRENT_DATE
  WHERE id = p_user_id AND usage_reset_date < CURRENT_DATE;

  -- Get user profile
  SELECT * INTO v_profile FROM user_profiles WHERE id = p_user_id;
  
  -- Create profile if doesn't exist
  IF NOT FOUND THEN
    INSERT INTO user_profiles (id, tier) VALUES (p_user_id, 'free')
    RETURNING * INTO v_profile;
  END IF;
  
  -- Get tier limits
  SELECT * INTO v_limits FROM tier_limits WHERE tier = v_profile.tier;
  
  -- Check which type
  IF p_usage_type = 'message' THEN
    v_current_count := v_profile.daily_message_count;
    v_limit := v_limits.daily_messages;
  ELSE
    v_current_count := v_profile.daily_image_count;
    v_limit := v_limits.daily_images;
  END IF;
  
  -- Check if over limit
  IF v_current_count >= v_limit THEN
    RETURN json_build_object(
      'allowed', false,
      'tier', v_profile.tier,
      'current', v_current_count,
      'limit', v_limit,
      'message', 'Daily limit reached. Upgrade for more!'
    );
  END IF;
  
  -- Increment usage
  IF p_usage_type = 'message' THEN
    UPDATE user_profiles 
    SET daily_message_count = daily_message_count + 1,
        total_messages = total_messages + 1
    WHERE id = p_user_id;
  ELSE
    UPDATE user_profiles 
    SET daily_image_count = daily_image_count + 1,
        total_images = total_images + 1
    WHERE id = p_user_id;
  END IF;
  
  RETURN json_build_object(
    'allowed', true,
    'tier', v_profile.tier,
    'current', v_current_count + 1,
    'limit', v_limit,
    'remaining', v_limit - v_current_count - 1,
    'own_key', v_profile.own_minimax_key
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Grant access to the function for Edge Functions
-- ============================================
GRANT EXECUTE ON FUNCTION check_and_increment_usage TO authenticated;
GRANT EXECUTE ON FUNCTION check_and_increment_usage TO service_role;

-- ============================================
-- DONE! Tier system is ready.
-- ============================================
