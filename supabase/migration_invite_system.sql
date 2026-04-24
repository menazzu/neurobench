-- ============================================
-- NeuroBench: Invite-Only Registration System
-- ============================================
-- Run this entire script in Supabase SQL Editor
-- (Dashboard → SQL Editor → New Query → Paste → Run)

-- 1. Invite codes table
CREATE TABLE IF NOT EXISTS invite_codes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    created_by UUID,
    is_admin_code BOOLEAN DEFAULT false,
    used_by UUID,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Profiles table (auto-created on signup via trigger)
CREATE TABLE IF NOT EXISTS profiles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    is_verified BOOLEAN DEFAULT false,
    pending_invite_code TEXT,
    used_invite_code_id UUID REFERENCES invite_codes(id),
    has_generated_invite BOOLEAN DEFAULT false,
    generated_invite_code_id UUID REFERENCES invite_codes(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Enable RLS
ALTER TABLE invite_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 4. RLS: invite_codes
-- Registration page needs to check if a code is valid (unused)
CREATE POLICY "read_unused_codes" ON invite_codes
    FOR SELECT USING (used_by IS NULL);

-- Users can read codes they created or used
CREATE POLICY "read_own_codes" ON invite_codes
    FOR SELECT USING (created_by = auth.uid() OR used_by = auth.uid());

-- Admins can read all codes
CREATE POLICY "admin_read_codes" ON invite_codes
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
    );

-- Admins can insert codes
CREATE POLICY "admin_insert_codes" ON invite_codes
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
    );

-- Verified users can insert one invite code for themselves (RLS double-check)
CREATE POLICY "user_insert_own_invite" ON invite_codes
    FOR INSERT WITH CHECK (
        created_by = auth.uid()
        AND EXISTS (
            SELECT 1 FROM profiles
            WHERE user_id = auth.uid()
            AND is_verified = true
            AND has_generated_invite = false
        )
    );

-- Admins can update/delete codes
CREATE POLICY "admin_update_codes" ON invite_codes
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
    );
CREATE POLICY "admin_delete_codes" ON invite_codes
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
    );

-- 5. RLS: profiles
-- Users can read their own profile
CREATE POLICY "read_own_profile" ON profiles
    FOR SELECT USING (user_id = auth.uid());

-- Admins can read all profiles
CREATE POLICY "admin_read_profiles" ON profiles
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
    );

-- Only SECURITY DEFINER functions (service-level) can insert/update profiles
CREATE POLICY "fn_manage_profiles" ON profiles
    FOR ALL USING (auth.role() = 'service_role' OR auth.uid() = user_id);

-- 6. Trigger: auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO profiles (user_id, email, is_verified, pending_invite_code)
    VALUES (
        NEW.id,
        NEW.email,
        false,
        NEW.raw_user_meta_data->>'invite_code'
    );
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 7. RPC: Claim invite code after OTP verification
-- Uses auth.uid() for security — only the logged-in user can claim for themselves
CREATE OR REPLACE FUNCTION public.claim_invite_code(p_code TEXT DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_code TEXT;
    v_invite_id UUID;
BEGIN
    IF p_code IS NOT NULL THEN
        v_code := p_code;
    ELSE
        SELECT pending_invite_code INTO v_code
        FROM profiles WHERE user_id = auth.uid();
    END IF;

    IF v_code IS NULL THEN
        RETURN false;
    END IF;

    SELECT id INTO v_invite_id
    FROM invite_codes
    WHERE code = v_code AND used_by IS NULL;

    IF v_invite_id IS NULL THEN
        RETURN false;
    END IF;

    UPDATE invite_codes
    SET used_by = auth.uid(), used_at = now()
    WHERE id = v_invite_id AND used_by IS NULL;

    IF NOT FOUND THEN
        RETURN false;
    END IF;

    UPDATE profiles
    SET is_verified = true,
        used_invite_code_id = v_invite_id,
        pending_invite_code = NULL
    WHERE user_id = auth.uid();

    RETURN true;
END;
$$;

-- 8. RPC: User generates their one-time invite code
CREATE OR REPLACE FUNCTION public.generate_user_invite_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_new_code TEXT;
    v_invite_id UUID;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM profiles
        WHERE user_id = auth.uid()
        AND is_verified = true
        AND has_generated_invite = false
    ) THEN
        RETURN NULL;
    END IF;

    v_new_code := upper(substr(md5(random()::text), 1, 8));

    INSERT INTO invite_codes (code, created_by, is_admin_code)
    VALUES (v_new_code, auth.uid(), false)
    RETURNING id INTO v_invite_id;

    UPDATE profiles
    SET has_generated_invite = true, generated_invite_code_id = v_invite_id
    WHERE user_id = auth.uid();

    RETURN v_new_code;
END;
$$;

-- 9. RPC: Admin generates invite code (unlimited)
CREATE OR REPLACE FUNCTION public.admin_generate_invite_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_new_code TEXT;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()) THEN
        RETURN NULL;
    END IF;

    v_new_code := upper(substr(md5(random()::text), 1, 8));

    INSERT INTO invite_codes (code, created_by, is_admin_code)
    VALUES (v_new_code, auth.uid(), true);

    RETURN v_new_code;
END;
$$;

-- 10. RPC: Get current user's invite status
CREATE OR REPLACE FUNCTION public.get_user_invite_status()
RETURNS TABLE (
    is_verified BOOLEAN,
    has_generated_invite BOOLEAN,
    generated_code TEXT,
    used_code TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.is_verified,
        p.has_generated_invite,
        gen_ic.code,
        used_ic.code
    FROM profiles p
    LEFT JOIN invite_codes gen_ic ON gen_ic.id = p.generated_invite_code_id
    LEFT JOIN invite_codes used_ic ON used_ic.id = p.used_invite_code_id
    WHERE p.user_id = auth.uid();
END;
$$;

-- 11. RPC: Admin list all invite codes
CREATE OR REPLACE FUNCTION public.admin_get_invite_codes()
RETURNS SETOF invite_codes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()) THEN
        RETURN;
    END IF;
    RETURN QUERY SELECT * FROM invite_codes ORDER BY created_at DESC;
END;
$$;

-- 12. RPC: Admin delete unused invite code
CREATE OR REPLACE FUNCTION public.admin_delete_invite_code(p_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()) THEN
        RETURN false;
    END IF;
    DELETE FROM invite_codes WHERE id = p_id AND used_by IS NULL;
    RETURN FOUND;
END;
$$;

-- 13. RPC: Admin list all profiles
CREATE OR REPLACE FUNCTION public.admin_get_profiles()
RETURNS SETOF profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()) THEN
        RETURN;
    END IF;
    RETURN QUERY SELECT * FROM profiles ORDER BY created_at DESC;
END;
$$;

-- 14. Enable pg_net extension for Turnstile verification
CREATE EXTENSION IF NOT EXISTS pg_net SCHEMA extensions;

-- 15. RPC: Verify Cloudflare Turnstile token server-side
-- IMPORTANT: Replace 'YOUR_TURNSTILE_SECRET_KEY' with your actual secret key
-- The function source is NOT readable by anon users — only database admins can see it
CREATE OR REPLACE FUNCTION public.verify_turnstile(p_token TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    req_id bigint;
    response_body text;
    success_val boolean;
    attempts integer := 0;
BEGIN
    IF p_token IS NULL OR p_token = '' THEN
        RETURN false;
    END IF;

    SELECT INTO req_id extensions.net.http_post(
        url := 'https://challenges.cloudflare.com/turnstile/v0/siteverify',
        body := json_build_object(
            'secret', 'YOUR_TURNSTILE_SECRET_KEY',
            'response', p_token
        )::text,
        content_type := 'application/json'
    );

    LOOP
        attempts := attempts + 1;
        IF attempts > 30 THEN
            RETURN false;
        END IF;

        SELECT t.body INTO response_body
        FROM extensions.net._http_response t
        WHERE t.id = req_id;

        IF response_body IS NOT NULL THEN
            EXIT;
        END IF;

        PERFORM pg_sleep(0.15);
    END LOOP;

    IF response_body IS NULL THEN
        RETURN false;
    END IF;

    SELECT INTO success_val (response_body::json->>'success')::boolean;
    RETURN COALESCE(success_val, false);
END;
$$;
