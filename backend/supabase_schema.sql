-- ============================================================
-- XRayVision AI — Supabase Database Schema
-- Run this in Supabase SQL Editor to set up all tables
-- ============================================================

-- Profiles (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role TEXT DEFAULT 'Medical Student',
  avatar_url TEXT,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Scans (core diagnostic records)
CREATE TABLE IF NOT EXISTS scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  scan_type TEXT NOT NULL CHECK (scan_type IN ('chest', 'fracture', 'wound')),
  session_label TEXT,
  notes TEXT,
  image_url TEXT NOT NULL DEFAULT '',
  urgency TEXT CHECK (urgency IN ('critical', 'high', 'medium', 'low', 'clear')),
  findings JSONB NOT NULL DEFAULT '[]',
  agent_synthesis TEXT,
  agent_actions JSONB DEFAULT '[]',
  model_results JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Chat sessions
CREATE TABLE IF NOT EXISTS chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT DEFAULT 'New Chat',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Chat messages
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- Row Level Security Policies
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY "Service role can insert profiles"
  ON profiles FOR INSERT WITH CHECK (true);

-- Scans
CREATE POLICY "Users can view own scans"
  ON scans FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Service can insert scans"
  ON scans FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can delete own scans"
  ON scans FOR DELETE USING (user_id = auth.uid());

-- Chat sessions
CREATE POLICY "Users can view own chat sessions"
  ON chat_sessions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Service can insert chat sessions"
  ON chat_sessions FOR INSERT WITH CHECK (true);

-- Chat messages
CREATE POLICY "Users can view own chat messages"
  ON chat_messages FOR SELECT
  USING (session_id IN (SELECT id FROM chat_sessions WHERE user_id = auth.uid()));
CREATE POLICY "Service can insert chat messages"
  ON chat_messages FOR INSERT WITH CHECK (true);

-- ============================================================
-- Indexes for performance
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_scans_user_id ON scans(user_id);
CREATE INDEX IF NOT EXISTS idx_scans_created_at ON scans(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);

-- ============================================================
-- Auto-create profile on sign-up (trigger)
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'Medical Student')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
