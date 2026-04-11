CREATE TABLE threads_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  threads_content_id UUID REFERENCES threads_contents(id) ON DELETE CASCADE,
  text_content TEXT NOT NULL,
  media_url TEXT,
  media_type TEXT,
  sort_order INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE youtube_contents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID REFERENCES contents(id) ON DELETE CASCADE,
  video_title TEXT,
  video_description TEXT,
  video_tags TEXT[],
  video_category TEXT,
  target_duration TEXT CHECK (target_duration IN ('short','mid','long')),
  thumbnail_url TEXT,
  video_url TEXT,
  status TEXT DEFAULT 'draft',
  youtube_video_id TEXT,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE youtube_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  youtube_content_id UUID REFERENCES youtube_contents(id) ON DELETE CASCADE,
  section_type TEXT,
  narration_text TEXT,
  screen_direction TEXT,
  subtitle_text TEXT,
  sort_order INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

