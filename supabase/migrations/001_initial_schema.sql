-- ============================================================
-- Toad Kanban — Initial Schema
-- ============================================================

-- Private schema for security-definer helpers
CREATE SCHEMA IF NOT EXISTS private;

-- ============================================================
-- TABLES
-- ============================================================

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  owner_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.project_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  invited_email text NOT NULL,
  role text DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(project_id, invited_email)
);

CREATE TABLE public.columns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  position integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  column_id uuid NOT NULL REFERENCES public.columns(id) ON DELETE RESTRICT,
  title text NOT NULL,
  description text DEFAULT '',
  priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  labels text[] DEFAULT '{}',
  assignee_email text,
  due_date date,
  position integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================
-- INDEXES (for RLS performance)
-- ============================================================

CREATE INDEX ix_project_members_user_id ON public.project_members(user_id);
CREATE INDEX ix_project_members_project_id ON public.project_members(project_id);
CREATE INDEX ix_columns_project_id ON public.columns(project_id);
CREATE INDEX ix_issues_project_id ON public.issues(project_id);
CREATE INDEX ix_issues_column_id ON public.issues(column_id);

-- ============================================================
-- PRIVATE HELPER FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION private.is_project_member(p_project_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_id = p_project_id
      AND user_id = (SELECT auth.uid())
  );
$$;

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Auto-create profile row when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Claim pending project invites when a user signs up
CREATE OR REPLACE FUNCTION public.claim_pending_invites()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.project_members
  SET user_id = NEW.id
  WHERE invited_email = NEW.email
    AND user_id IS NULL;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_claim_invites
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.claim_pending_invites();

-- Auto-update updated_at on issues
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER issues_updated_at
  BEFORE UPDATE ON public.issues
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.issues ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS POLICIES
-- ALL policies: TO authenticated, (select auth.uid()) wrapper
-- ============================================================

-- profiles
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = (SELECT auth.uid()));

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));

-- projects
CREATE POLICY "projects_select_member" ON public.projects
  FOR SELECT TO authenticated
  USING (private.is_project_member(id));

CREATE POLICY "projects_insert_authenticated" ON public.projects
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = (SELECT auth.uid()));

CREATE POLICY "projects_update_member" ON public.projects
  FOR UPDATE TO authenticated
  USING (private.is_project_member(id))
  WITH CHECK (private.is_project_member(id));

CREATE POLICY "projects_delete_owner" ON public.projects
  FOR DELETE TO authenticated
  USING (owner_id = (SELECT auth.uid()));

-- project_members
CREATE POLICY "project_members_select" ON public.project_members
  FOR SELECT TO authenticated
  USING (private.is_project_member(project_id));

CREATE POLICY "project_members_insert" ON public.project_members
  FOR INSERT TO authenticated
  WITH CHECK (
    -- Allow inserting self as owner (new project creation flow)
    (user_id = (SELECT auth.uid()) AND role = 'owner')
    OR
    -- Allow owner to invite others
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = project_members.project_id
        AND pm.user_id = (SELECT auth.uid())
        AND pm.role = 'owner'
    )
  );

CREATE POLICY "project_members_delete_owner" ON public.project_members
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = project_members.project_id
        AND pm.user_id = (SELECT auth.uid())
        AND pm.role = 'owner'
    )
  );

-- columns
CREATE POLICY "columns_select" ON public.columns
  FOR SELECT TO authenticated
  USING (private.is_project_member(project_id));

CREATE POLICY "columns_insert" ON public.columns
  FOR INSERT TO authenticated
  WITH CHECK (private.is_project_member(project_id));

CREATE POLICY "columns_update" ON public.columns
  FOR UPDATE TO authenticated
  USING (private.is_project_member(project_id))
  WITH CHECK (private.is_project_member(project_id));

CREATE POLICY "columns_delete" ON public.columns
  FOR DELETE TO authenticated
  USING (private.is_project_member(project_id));

-- issues
CREATE POLICY "issues_select" ON public.issues
  FOR SELECT TO authenticated
  USING (private.is_project_member(project_id));

CREATE POLICY "issues_insert" ON public.issues
  FOR INSERT TO authenticated
  WITH CHECK (private.is_project_member(project_id));

CREATE POLICY "issues_update" ON public.issues
  FOR UPDATE TO authenticated
  USING (private.is_project_member(project_id))
  WITH CHECK (private.is_project_member(project_id));

CREATE POLICY "issues_delete" ON public.issues
  FOR DELETE TO authenticated
  USING (private.is_project_member(project_id));
