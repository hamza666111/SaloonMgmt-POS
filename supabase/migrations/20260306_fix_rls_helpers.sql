-- Harden RLS helper functions to avoid recursion and 500 errors
-- Date: 2026-03-04

BEGIN;

-- Ensure helper functions bypass RLS and use a safe search_path
CREATE OR REPLACE FUNCTION app_current_user_branch_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT branch_id
  FROM users
  WHERE id = auth.uid()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION app_current_user_role()
RETURNS role_type
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT r.name
  FROM users u
  JOIN roles r ON r.id = u.role_id
  WHERE u.id = auth.uid()
  LIMIT 1;
$$;

-- Keep admin/manager helpers delegating to the secured functions
CREATE OR REPLACE FUNCTION app_is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(app_current_user_role() = 'admin'::role_type, false);
$$;

CREATE OR REPLACE FUNCTION app_is_manager_or_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(app_current_user_role() IN ('admin'::role_type, 'manager'::role_type), false);
$$;

CREATE OR REPLACE FUNCTION app_has_branch_access(target_branch UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT app_is_admin() OR app_current_user_branch_id() = target_branch;
$$;

-- Set owner to postgres so SECURITY DEFINER can bypass RLS on users/roles
ALTER FUNCTION app_current_user_branch_id() OWNER TO postgres;
ALTER FUNCTION app_current_user_role() OWNER TO postgres;
ALTER FUNCTION app_is_admin() OWNER TO postgres;
ALTER FUNCTION app_is_manager_or_admin() OWNER TO postgres;
ALTER FUNCTION app_has_branch_access(UUID) OWNER TO postgres;

COMMIT;
