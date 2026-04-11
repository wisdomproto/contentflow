CREATE TABLE instagram_contents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID REFERENCES contents(id) ON DELETE CASCADE,
  caption TEXT,
  hashtags TEXT[],
  content_type TEXT DEFAULT 'carousel' CHECK (content_type IN ('carousel','video','single')),
  video_settings JSONB,
  status TEXT DEFAULT 'draft',
  published_url TEXT,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE instagram_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instagram_content_id UUID REFERENCES instagram_contents(id) ON DELETE CASCADE,
  text_content TEXT,
  background_color TEXT,
  background_image_url TEXT,
  text_style JSONB,
  sort_order INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE threads_contents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID REFERENCES contents(id) ON DELETE CASCADE,
  thread_type TEXT DEFAULT 'single' CHECK (thread_type IN ('single','multi')),
  status TEXT DEFAULT 'draft',
  published_url TEXT,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

