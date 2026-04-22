-- Card news templates, scoped per project.
-- Replaces localStorage-only storage so templates sync across browsers/devices.

CREATE TABLE card_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  bg_color TEXT NOT NULL DEFAULT '#ffffff',
  image_y NUMERIC NOT NULL DEFAULT 50,
  text_blocks JSONB NOT NULL DEFAULT '[]',
  preview JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_card_templates_project ON card_templates(project_id);

-- Records which built-in templates a project has hidden.
CREATE TABLE card_hidden_builtins (
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  builtin_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (project_id, builtin_id)
);
