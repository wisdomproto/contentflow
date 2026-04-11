CREATE TABLE writing_guides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('global','blog','instagram','threads','youtube')),
  file_url TEXT NOT NULL,
  file_name TEXT,
  extracted_text TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE contents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT,
  tags TEXT[],
  memo TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','in_progress','published')),
  ai_model_settings JSONB,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE reference_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID REFERENCES contents(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('pdf','docx','md','txt','hwp','youtube','url')),
  source_url TEXT,
  file_url TEXT,
  file_name TEXT,
  extracted_text TEXT,
  summary TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

