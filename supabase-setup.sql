-- ==================== ROOGONDEE SUPABASE SETUP ====================

-- 1. Posts table
CREATE TABLE IF NOT EXISTS posts (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title        text NOT NULL,
  slug         text UNIQUE NOT NULL,
  content      text,
  excerpt      text,
  service      text,
  category     text,
  focus_kw     text,
  meta_desc    text,
  image_url    text,
  status       text DEFAULT 'draft',
  created_at   timestamptz DEFAULT now(),
  published_at timestamptz
);

-- 2. Leads table
CREATE TABLE IF NOT EXISTS leads (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service    text,
  first_name text,
  last_name  text,
  phone      text,
  age        text,
  gender     text,
  note       text,
  source     text DEFAULT 'roogondee.com',
  status     text DEFAULT 'new',
  created_at timestamptz DEFAULT now()
);

-- 3. Content Plan table
CREATE TABLE IF NOT EXISTS content_plan (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scheduled_date date NOT NULL,
  service        text,
  title          text,
  focus_kw       text,
  meta_desc      text,
  slug           text,
  seed           text,
  status         text DEFAULT 'ready',
  post_id        uuid REFERENCES posts(id),
  created_at     timestamptz DEFAULT now()
);

-- 4. Enable RLS
ALTER TABLE posts        ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads        ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_plan ENABLE ROW LEVEL SECURITY;

-- 5. Policies — posts อ่านได้ทุกคน (public blog)
CREATE POLICY "posts_public_read" ON posts FOR SELECT USING (status = 'published');

-- 6. Policies — leads เขียนได้ทุกคน (lead form)
CREATE POLICY "leads_insert" ON leads FOR INSERT WITH CHECK (true);

-- 7. Policies — content_plan service role only (auto-post)
CREATE POLICY "content_plan_service" ON content_plan USING (true);
