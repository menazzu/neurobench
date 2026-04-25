-- ============================================
-- NeuroBench: Fix FK + Multi-use invites + User deletion
-- ============================================
-- Run this in Supabase SQL Editor

-- 1. Fix FK constraints: SET NULL instead of RESTRICT on delete
--    This prevents "violates foreign key constraint" when deleting users
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_used_invite_code_id_fkey;
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_generated_invite_code_id_fkey;
ALTER TABLE profiles ADD CONSTRAINT profiles_used_invite_code_id_fkey
    FOREIGN KEY (used_invite_code_id) REFERENCES invite_codes(id) ON DELETE SET NULL;
ALTER TABLE profiles ADD CONSTRAINT profiles_generated_invite_code_id_fkey
    FOREIGN KEY (generated_invite_code_id) REFERENCES invite_codes(id) ON DELETE SET NULL;

-- 2. Add multi-use columns to invite_codes
ALTER TABLE invite_codes ADD COLUMN IF NOT EXISTS max_uses INTEGER DEFAULT 1;
ALTER TABLE invite_codes ADD COLUMN IF NOT EXISTS use_count INTEGER DEFAULT 0;

-- 3. Create invite_code_uses table (tracks each use of a code)
CREATE TABLE IF NOT EXISTS invite_code_uses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    invite_code_id UUID REFERENCES invite_codes(id) ON DELETE CASCADE,
    user_id UUID,
    used_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE invite_code_uses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_read_code_uses" ON invite_code_uses;
CREATE POLICY "admin_read_code_uses" ON invite_code_uses
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
    );

-- 4. Backfill: set use_count based on existing used_by
UPDATE invite_codes SET use_count = 1 WHERE used_by IS NOT NULL AND use_count = 0;
-- Set max_uses = 1 for existing regular codes, NULL (unlimited) for admin codes without limit
UPDATE invite_codes SET max_uses = 1 WHERE is_admin_code = false AND max_uses IS NULL;
UPDATE invite_codes SET max_uses = 10 WHERE is_admin_code = true AND max_uses = 1;

-- 5. Migrate existing used_by into invite_code_uses
INSERT INTO invite_code_uses (invite_code_id, user_id, used_at)
SELECT id, used_by, COALESCE(used_at, created_at)
FROM invite_codes
WHERE used_by IS NOT NULL
ON CONFLICT DO NOTHING;

-- 6. Update claim_invite_code RPC for multi-use codes
CREATE OR REPLACE FUNCTION public.claim_invite_code(p_code TEXT DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_code TEXT;
    v_invite_id UUID;
    v_max_uses INTEGER;
    v_current_uses INTEGER;
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

    SELECT id, max_uses, use_count INTO v_invite_id, v_max_uses, v_current_uses
    FROM invite_codes
    WHERE code = v_code AND (max_uses IS NULL OR use_count < max_uses);

    IF v_invite_id IS NULL THEN
        RETURN false;
    END IF;

    IF EXISTS (SELECT 1 FROM invite_code_uses WHERE invite_code_id = v_invite_id AND user_id = auth.uid()) THEN
        RETURN false;
    END IF;

    UPDATE invite_codes
    SET use_count = use_count + 1,
        used_by = auth.uid(),
        used_at = now()
    WHERE id = v_invite_id;

    INSERT INTO invite_code_uses (invite_code_id, user_id)
    VALUES (v_invite_id, auth.uid());

    UPDATE profiles
    SET is_verified = true,
        used_invite_code_id = v_invite_id,
        pending_invite_code = NULL
    WHERE user_id = auth.uid();

    RETURN true;
END;
$$;

-- 7. Update admin_delete_invite_code: allow deleting, reset owner's has_generated_invite
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
    UPDATE profiles
    SET has_generated_invite = false,
        generated_invite_code_id = NULL
    WHERE generated_invite_code_id = p_id;
    DELETE FROM invite_code_uses WHERE invite_code_id = p_id;
    DELETE FROM invite_codes WHERE id = p_id;
    RETURN FOUND;
END;
$$;

-- 8. Update admin_generate_invite_code: accept max_uses parameter
CREATE OR REPLACE FUNCTION public.admin_generate_invite_code(p_max_uses INTEGER DEFAULT 10)
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

    INSERT INTO invite_codes (code, created_by, is_admin_code, max_uses)
    VALUES (v_new_code, auth.uid(), true, p_max_uses);

    RETURN v_new_code;
END;
$$;

-- 9. Update RLS: read codes with remaining uses
DROP POLICY IF EXISTS "read_unused_codes" ON invite_codes;
CREATE POLICY "read_unused_codes" ON invite_codes
    FOR SELECT USING (max_uses IS NULL OR use_count < max_uses);

-- 10. Update read_own_codes to also show codes the user used
DROP POLICY IF EXISTS "read_own_codes" ON invite_codes;
CREATE POLICY "read_own_codes" ON invite_codes
    FOR SELECT USING (
        created_by = auth.uid()
        OR EXISTS (SELECT 1 FROM invite_code_uses WHERE invite_code_id = invite_codes.id AND user_id = auth.uid())
    );

-- 11. RPC: Admin get invite code uses (for detailed view)
CREATE OR REPLACE FUNCTION public.admin_get_invite_code_uses(p_code_id UUID)
RETURNS SETOF invite_code_uses
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()) THEN
        RETURN;
    END IF;
    RETURN QUERY SELECT * FROM invite_code_uses WHERE invite_code_id = p_code_id ORDER BY used_at DESC;
END;
$$;

-- 12. Fix existing telegram profiles that are missing telegram_id
UPDATE profiles p
SET telegram_id = replace(p.email, 'telegram_', ''),
    is_verified = true
WHERE p.email LIKE 'telegram_%@neurobench.local'
  AND p.telegram_id IS NULL;

-- 13. Fix profiles where invite code was deleted but has_generated_invite still true
UPDATE profiles
SET has_generated_invite = false,
    generated_invite_code_id = NULL
WHERE has_generated_invite = true
  AND generated_invite_code_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM invite_codes WHERE id = profiles.generated_invite_code_id);

UPDATE profiles
SET has_generated_invite = false,
    generated_invite_code_id = NULL
WHERE has_generated_invite = true
  AND generated_invite_code_id IS NULL;

-- 14. Update getUserDisplayName to include invite_use_count
DROP FUNCTION IF EXISTS public.get_user_display_name();

CREATE OR REPLACE FUNCTION public.get_user_display_name()
RETURNS TABLE(
    telegram_first_name TEXT,
    telegram_last_name TEXT,
    telegram_username TEXT,
    telegram_photo_url TEXT,
    display_name TEXT,
    is_verified BOOLEAN,
    has_generated_invite BOOLEAN,
    generated_code TEXT,
    invite_use_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT p.telegram_first_name,
           p.telegram_last_name,
           p.telegram_username,
           p.telegram_photo_url,
           COALESCE(p.telegram_first_name, split_part(p.email, '@', 1)) AS display_name,
           p.is_verified,
           p.has_generated_invite,
           ic.code AS generated_code,
           ic.use_count AS invite_use_count
    FROM profiles p
    LEFT JOIN invite_codes ic ON p.generated_invite_code_id = ic.id
    WHERE p.user_id = auth.uid();
END;
$$;
