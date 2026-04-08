-- Push notification subscriptions table
-- Run this in the Supabase SQL Editor to enable push notifications

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id TEXT UNIQUE NOT NULL,
  endpoint TEXT NOT NULL,
  keys_p256dh TEXT NOT NULL,
  keys_auth TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: same as words table (family app, public access)
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read" ON push_subscriptions FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON push_subscriptions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON push_subscriptions FOR UPDATE USING (true);
CREATE POLICY "Allow public delete" ON push_subscriptions FOR DELETE USING (true);

-- Index for faster lookups
CREATE INDEX idx_push_subs_device ON push_subscriptions (device_id);

-- Enable Realtime for the words table (needed for real-time sync)
-- Run this in Supabase SQL Editor:
ALTER PUBLICATION supabase_realtime ADD TABLE words;
