CREATE TABLE media_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_type TEXT NOT NULL,
  parent_id UUID NOT NULL,
  asset_type TEXT NOT NULL CHECK (asset_type IN ('image','audio','video')),
  file_url TEXT NOT NULL,
  prompt TEXT,
  generation_params JSONB,
  version INTEGER NOT NULL DEFAULT 1,
  is_current BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE factcheck_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type TEXT NOT NULL,
  content_id UUID NOT NULL,
  claims JSONB NOT NULL,
  trust_score INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE publish_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type TEXT NOT NULL,
  content_id UUID NOT NULL,
  platform TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending','uploading','success','failed')),
  platform_post_id TEXT,
  error_message TEXT,
  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

