-- Fix: infinite recursion in RLS policies on user_profiles
-- Run this in the Supabase SQL Editor (or via psql).

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE auth_id = auth.uid() AND role = 'admin'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, anon;

DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can update profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can manage labs" ON labs;
DROP POLICY IF EXISTS "Admins can manage computers" ON computers;
DROP POLICY IF EXISTS "Admins can manage tickets" ON maintenance_tickets;

CREATE POLICY "Admins can view all profiles" ON user_profiles
  FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins can update profiles" ON user_profiles
  FOR UPDATE USING (public.is_admin());

CREATE POLICY "Admins can manage labs" ON labs
  FOR ALL USING (public.is_admin());

CREATE POLICY "Admins can manage computers" ON computers
  FOR ALL USING (public.is_admin());

CREATE POLICY "Admins can manage tickets" ON maintenance_tickets
  FOR ALL USING (public.is_admin());
