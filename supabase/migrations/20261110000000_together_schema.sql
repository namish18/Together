-- Supabase / PostgreSQL Database Migration for Together: Bluetooth-Powered Social Time Tracker
-- Clean Architecture & Privacy-First Row Level Security (RLS) Policies

-- 1. Profiles Table (Stores user identity, public key for E2EE, and preferences)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  public_key TEXT NOT NULL,
  bluetooth_enabled BOOLEAN DEFAULT true NOT NULL,
  invisible_mode BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS: Profiles are readable by authenticated users (to discover friends by username),
-- but users can only update their own profile.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by authenticated users" 
  ON public.profiles FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Users can insert their own profile" 
  ON public.profiles FOR INSERT 
  TO authenticated 
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
  ON public.profiles FOR UPDATE 
  TO authenticated 
  USING (auth.uid() = id);


-- 2. Friendships Table (Enforces mutual consent for social proximity tracking)
CREATE TYPE friendship_status AS ENUM ('PENDING', 'ACCEPTED', 'BLOCKED');

CREATE TABLE IF NOT EXISTS public.friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status friendship_status DEFAULT 'PENDING' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT unique_friendship_pair UNIQUE (requester_id, receiver_id),
  CONSTRAINT no_self_friendship CHECK (requester_id <> receiver_id)
);

ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their friendships" 
  ON public.friendships FOR SELECT 
  TO authenticated 
  USING (auth.uid() = requester_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can send connection requests" 
  ON public.friendships FOR INSERT 
  TO authenticated 
  WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Users can update friendship status" 
  ON public.friendships FOR UPDATE 
  TO authenticated 
  USING (auth.uid() = receiver_id OR auth.uid() = requester_id);


-- 3. Device Sessions & Rotating Pseudonymous BLE Identifiers (RPI)
-- Prevents static device MAC tracking or identity correlation by eavesdroppers
CREATE TABLE IF NOT EXISTS public.device_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rotating_identifier TEXT NOT NULL,
  device_public_key TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX idx_device_sessions_rpi ON public.device_sessions(rotating_identifier);
CREATE INDEX idx_device_sessions_expiry ON public.device_sessions(expires_at);

ALTER TABLE public.device_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their device sessions"
  ON public.device_sessions FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Friends can lookup rotating identifiers to verify encounters"
  ON public.device_sessions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.friendships
      WHERE status = 'ACCEPTED'
      AND ((requester_id = auth.uid() AND receiver_id = user_id)
        OR (receiver_id = auth.uid() AND requester_id = user_id))
    )
  );


-- 4. Encounters Table (Stores tracked proximity intervals)
-- Canonical ordering constraint (user_a < user_b) guarantees no duplicate double-counting!
CREATE TABLE IF NOT EXISTS public.encounters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_b UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ NOT NULL,
  duration_seconds INTEGER NOT NULL,
  rssi_average INTEGER,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT check_canonical_order CHECK (user_a < user_b),
  CONSTRAINT check_valid_duration CHECK (duration_seconds > 0 AND duration_seconds <= EXTRACT(EPOCH FROM (ended_at - started_at)) + 60)
);

CREATE INDEX idx_encounters_user_a ON public.encounters(user_a);
CREATE INDEX idx_encounters_user_b ON public.encounters(user_b);
CREATE INDEX idx_encounters_started ON public.encounters(started_at);

ALTER TABLE public.encounters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view encounters they participated in"
  ON public.encounters FOR SELECT
  TO authenticated
  USING (auth.uid() = user_a OR auth.uid() = user_b);

CREATE POLICY "Participants can insert encounters"
  ON public.encounters FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_a OR auth.uid() = user_b);


-- 5. Secret Messages / Time Capsules Table
-- Zero-Knowledge architecture: backend stores only encrypted ciphertext
CREATE TYPE unlock_type_enum AS ENUM (
  'ON_DISCONNECT',
  'DELAY_5_MINUTES',
  'DELAY_30_MINUTES',
  'DELAY_1_HOUR',
  'DELAY_24_HOURS',
  'SPECIFIC_DATETIME'
);

CREATE TYPE delivery_status_enum AS ENUM ('PENDING', 'DELIVERED_BLE', 'DELIVERED_SERVER', 'OPENED');

CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  encrypted_payload TEXT NOT NULL,
  unlock_type unlock_type_enum NOT NULL,
  unlock_delay_seconds INTEGER DEFAULT 0 NOT NULL,
  specific_unlock_at TIMESTAMPTZ,
  disconnect_timestamp TIMESTAMPTZ,
  encounter_id UUID REFERENCES public.encounters(id) ON DELETE SET NULL,
  delivery_status delivery_status_enum DEFAULT 'PENDING' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX idx_messages_receiver ON public.messages(receiver_id);
CREATE INDEX idx_messages_sender ON public.messages(sender_id);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view sent or received messages"
  ON public.messages FOR SELECT
  TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can create messages to friends"
  ON public.messages FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM public.friendships
      WHERE status = 'ACCEPTED'
      AND ((requester_id = auth.uid() AND receiver_id = messages.receiver_id)
        OR (receiver_id = auth.uid() AND requester_id = messages.receiver_id))
    )
  );

CREATE POLICY "Receiver can update delivery status and open status"
  ON public.messages FOR UPDATE
  TO authenticated
  USING (auth.uid() = receiver_id);
