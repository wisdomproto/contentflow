CREATE TABLE translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID NOT NULL REFERENCES contents(id) ON DELETE CASCADE,
  language TEXT NOT NULL,
  channel_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'translating', 'review', 'completed')),
  title TEXT,
  body TEXT,
  cards_json JSONB,
  seo_title TEXT,
  seo_description TEXT,
  translated_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(content_id, language, channel_type)
);

CREATE INDEX idx_translations_content ON translations(content_id);
CREATE INDEX idx_translations_status ON translations(status);

ALTER TABLE translations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view translations"
  ON translations FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM contents c
    JOIN project_members pm ON pm.project_id = c.project_id
    WHERE c.id = translations.content_id AND pm.user_id = auth.uid()
  ));

CREATE POLICY "Editors+ can manage translations"
  ON translations FOR ALL
  USING (EXISTS (
    SELECT 1 FROM contents c
    JOIN project_members pm ON pm.project_id = c.project_id
    WHERE c.id = translations.content_id AND pm.user_id = auth.uid() AND pm.role IN ('admin', 'editor')
  ));
