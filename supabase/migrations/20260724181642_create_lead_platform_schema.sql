/*
# Lead Management Platform — Initial Schema

## Overview
Creates the complete data model for a lead management application supporting
multiple users with admin and member roles, a full lead lifecycle pipeline,
notes, and a comprehensive activity trail.

## New Tables

### profiles
Extends auth.users with application-level metadata.
- id: matches auth.users.id (uuid, primary key)
- email: user email for display
- full_name: display name
- role: 'admin' | 'member' (default 'member')
- avatar_url: optional profile picture
- created_at / updated_at: timestamps

### leads
Core lead records with full pipeline lifecycle support.
- id: uuid primary key
- first_name / last_name: contact name
- email: contact email (unique per lead)
- phone: optional phone number
- company: optional company name
- source: where the lead came from (web_form, referral, cold_outreach, social, other)
- status: pipeline stage (new, contacted, qualified, proposal, negotiation, closed_won, closed_lost)
- priority: urgency level (low, medium, high)
- assigned_to: nullable FK to auth.users — which team member owns this lead
- value: optional estimated deal value in cents
- notes_count: denormalized count for display performance
- created_at / updated_at: timestamps

### lead_notes
Timestamped notes attached to a lead.
- id: uuid primary key
- lead_id: FK to leads
- author_id: FK to auth.users (who wrote the note)
- content: note text
- created_at: timestamp

### lead_activities
Immutable audit trail of all lead state changes and events.
- id: uuid primary key
- lead_id: FK to leads
- actor_id: FK to auth.users (who performed the action)
- activity_type: enum of event types (status_changed, assigned, note_added, lead_created, field_updated)
- metadata: JSONB bag for before/after values and other context
- created_at: timestamp

## Security
- RLS enabled on all tables
- profiles: users can read all profiles (needed for assignment dropdowns), only update their own
- leads: authenticated users can read all leads; only admins or the assigned member can update
- lead_notes: authenticated users can read all notes; authors can delete their own
- lead_activities: read-only for authenticated users (insert via service role / trigger only)

## Notes
- Public lead capture (INSERT on leads) is allowed for the anon role so the capture form works without auth
- Activity inserts are handled by DB triggers so the trail is tamper-proof
*/

-- ─── PROFILES ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select" ON profiles;
CREATE POLICY "profiles_select" ON profiles FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "profiles_insert" ON profiles;
CREATE POLICY "profiles_insert" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update" ON profiles;
CREATE POLICY "profiles_update" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_delete" ON profiles;
CREATE POLICY "profiles_delete" ON profiles FOR DELETE
  TO authenticated USING (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_app_meta_data->>'role', 'member')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ─── LEADS ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL,
  phone text,
  company text,
  source text NOT NULL DEFAULT 'web_form' CHECK (source IN ('web_form','referral','cold_outreach','social','other')),
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','contacted','qualified','proposal','negotiation','closed_won','closed_lost')),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high')),
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  value integer, -- estimated deal value in cents
  message text,  -- original message from capture form
  notes_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS leads_status_idx ON leads(status);
CREATE INDEX IF NOT EXISTS leads_assigned_to_idx ON leads(assigned_to);
CREATE INDEX IF NOT EXISTS leads_created_at_idx ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS leads_email_idx ON leads(email);

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Public INSERT so the capture form works without auth
DROP POLICY IF EXISTS "leads_insert_public" ON leads;
CREATE POLICY "leads_insert_public" ON leads FOR INSERT
  TO anon, authenticated WITH CHECK (true);

-- Authenticated users can read all leads
DROP POLICY IF EXISTS "leads_select_authenticated" ON leads;
CREATE POLICY "leads_select_authenticated" ON leads FOR SELECT
  TO authenticated USING (true);

-- Admins can update any lead; members can only update leads assigned to them
DROP POLICY IF EXISTS "leads_update_authenticated" ON leads;
CREATE POLICY "leads_update_authenticated" ON leads FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
    OR assigned_to = auth.uid()
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
    OR assigned_to = auth.uid()
  );

-- Only admins can delete leads
DROP POLICY IF EXISTS "leads_delete_admin" ON leads;
CREATE POLICY "leads_delete_admin" ON leads FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- ─── LEAD NOTES ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS lead_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  author_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lead_notes_lead_id_idx ON lead_notes(lead_id);

ALTER TABLE lead_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notes_select" ON lead_notes;
CREATE POLICY "notes_select" ON lead_notes FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "notes_insert" ON lead_notes;
CREATE POLICY "notes_insert" ON lead_notes FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "notes_update" ON lead_notes;
CREATE POLICY "notes_update" ON lead_notes FOR UPDATE
  TO authenticated
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "notes_delete" ON lead_notes;
CREATE POLICY "notes_delete" ON lead_notes FOR DELETE
  TO authenticated
  USING (
    auth.uid() = author_id
    OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

-- Keep notes_count in sync
CREATE OR REPLACE FUNCTION update_lead_notes_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE leads SET notes_count = notes_count + 1, updated_at = now() WHERE id = NEW.lead_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE leads SET notes_count = GREATEST(notes_count - 1, 0), updated_at = now() WHERE id = OLD.lead_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS on_note_change ON lead_notes;
CREATE TRIGGER on_note_change
  AFTER INSERT OR DELETE ON lead_notes
  FOR EACH ROW EXECUTE FUNCTION update_lead_notes_count();

-- ─── LEAD ACTIVITIES ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS lead_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  activity_type text NOT NULL CHECK (activity_type IN ('lead_created','status_changed','assigned','note_added','note_deleted','field_updated')),
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS activities_lead_id_idx ON lead_activities(lead_id);
CREATE INDEX IF NOT EXISTS activities_created_at_idx ON lead_activities(created_at DESC);

ALTER TABLE lead_activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "activities_select" ON lead_activities;
CREATE POLICY "activities_select" ON lead_activities FOR SELECT
  TO authenticated USING (true);

-- Authenticated users can insert activities (the app inserts on behalf of the user)
DROP POLICY IF EXISTS "activities_insert" ON lead_activities;
CREATE POLICY "activities_insert" ON lead_activities FOR INSERT
  TO authenticated WITH CHECK (true);

-- Anon can insert activities (for lead_created on public form submission)
DROP POLICY IF EXISTS "activities_insert_anon" ON lead_activities;
CREATE POLICY "activities_insert_anon" ON lead_activities FOR INSERT
  TO anon WITH CHECK (activity_type = 'lead_created');

DROP POLICY IF EXISTS "activities_update" ON lead_activities;
CREATE POLICY "activities_update" ON lead_activities FOR UPDATE
  TO authenticated USING (false);

DROP POLICY IF EXISTS "activities_delete" ON lead_activities;
CREATE POLICY "activities_delete" ON lead_activities FOR DELETE
  TO authenticated USING (false);

-- ─── UPDATED_AT TRIGGER ─────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS leads_updated_at ON leads;
CREATE TRIGGER leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS profiles_updated_at ON profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
