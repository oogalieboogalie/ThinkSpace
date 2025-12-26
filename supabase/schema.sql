-- ============================================
-- Knowledge Companion - Supabase Schema
-- Run this in Supabase SQL Editor
-- ============================================

-- Enable UUID extension (usually already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USER KNOWLEDGE TABLE
-- Stores notes, facts, and knowledge per user
-- ============================================
CREATE TABLE IF NOT EXISTS user_knowledge (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  node_type TEXT DEFAULT 'NOTE' CHECK (node_type IN ('NOTE', 'FACT', 'CONCEPT', 'QUESTION', 'INSIGHT')),
  importance FLOAT DEFAULT 0.5 CHECK (importance >= 0 AND importance <= 1),
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_user_knowledge_user_id ON user_knowledge(user_id);
CREATE INDEX IF NOT EXISTS idx_user_knowledge_created_at ON user_knowledge(created_at DESC);

-- ============================================
-- USER SESSIONS TABLE
-- Stores chat history, canvas state, etc.
-- ============================================
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  session_data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);

-- ============================================
-- USER IMAGES TABLE
-- Stores generated images metadata
-- ============================================
CREATE TABLE IF NOT EXISTS user_images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  prompt TEXT NOT NULL,
  image_url TEXT NOT NULL,
  style TEXT,
  aspect_ratio TEXT DEFAULT '1:1',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_images_user_id ON user_images(user_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- Users can ONLY access their own data
-- ============================================

-- Enable RLS on all tables
ALTER TABLE user_knowledge ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_images ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for re-running)
DROP POLICY IF EXISTS "Users can view own knowledge" ON user_knowledge;
DROP POLICY IF EXISTS "Users can insert own knowledge" ON user_knowledge;
DROP POLICY IF EXISTS "Users can update own knowledge" ON user_knowledge;
DROP POLICY IF EXISTS "Users can delete own knowledge" ON user_knowledge;

DROP POLICY IF EXISTS "Users can view own sessions" ON user_sessions;
DROP POLICY IF EXISTS "Users can insert own sessions" ON user_sessions;
DROP POLICY IF EXISTS "Users can update own sessions" ON user_sessions;
DROP POLICY IF EXISTS "Users can delete own sessions" ON user_sessions;

DROP POLICY IF EXISTS "Users can view own images" ON user_images;
DROP POLICY IF EXISTS "Users can insert own images" ON user_images;
DROP POLICY IF EXISTS "Users can delete own images" ON user_images;

-- Policies for user_knowledge
CREATE POLICY "Users can view own knowledge" ON user_knowledge
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own knowledge" ON user_knowledge
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own knowledge" ON user_knowledge
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own knowledge" ON user_knowledge
  FOR DELETE USING (auth.uid() = user_id);

-- Policies for user_sessions
CREATE POLICY "Users can view own sessions" ON user_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions" ON user_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions" ON user_sessions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sessions" ON user_sessions
  FOR DELETE USING (auth.uid() = user_id);

-- Policies for user_images
CREATE POLICY "Users can view own images" ON user_images
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own images" ON user_images
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own images" ON user_images
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- STORAGE BUCKETS (run in Storage section)
-- ============================================
-- Note: Create these manually in Supabase Dashboard > Storage
-- 
-- 1. knowledge-base (public read for shared guides)
-- 2. user-uploads (private, RLS enabled)
--
-- For user-uploads, add this policy:
-- CREATE POLICY "Users can manage own uploads"
-- ON storage.objects FOR ALL
-- USING (bucket_id = 'user-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ============================================
-- HELPER FUNCTION: Update timestamp
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to tables
DROP TRIGGER IF EXISTS update_user_knowledge_updated_at ON user_knowledge;
CREATE TRIGGER update_user_knowledge_updated_at
  BEFORE UPDATE ON user_knowledge
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_sessions_updated_at ON user_sessions;
CREATE TRIGGER update_user_sessions_updated_at
  BEFORE UPDATE ON user_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- DONE! Your schema is ready.
-- ============================================
