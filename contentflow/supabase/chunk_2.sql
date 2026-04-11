CREATE TABLE base_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID REFERENCES contents(id) ON DELETE CASCADE,
  title TEXT,
  body TEXT NOT NULL DEFAULT '',
  body_plain_text TEXT,
  word_count INTEGER DEFAULT 0,
  factcheck_status TEXT CHECK (factcheck_status IN ('unchecked','checking','checked')),
  factcheck_score INTEGER,
  factcheck_report JSONB,
  prompt_used TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE blog_contents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID REFERENCES contents(id) ON DELETE CASCADE,
  seo_title TEXT,
  seo_score INTEGER,
  seo_details JSONB,
  naver_keywords JSONB,
  status TEXT DEFAULT 'draft',
  published_url TEXT,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE blog_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blog_content_id UUID REFERENCES blog_contents(id) ON DELETE CASCADE,
  card_type TEXT NOT NULL CHECK (card_type IN ('text','image','divider','quote','list')),
  content JSONB NOT NULL,
  sort_order INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

