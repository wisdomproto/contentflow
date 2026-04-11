-- Project members table
CREATE TABLE project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'editor', 'viewer')),
  invited_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, user_id)
);

-- Enable RLS on all tables
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE contents ENABLE ROW LEVEL SECURITY;
ALTER TABLE base_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_contents ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE instagram_contents ENABLE ROW LEVEL SECURITY;
ALTER TABLE instagram_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE threads_contents ENABLE ROW LEVEL SECURITY;
ALTER TABLE threads_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE youtube_contents ENABLE ROW LEVEL SECURITY;
ALTER TABLE youtube_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;

-- Helper function: check if user is member of project
CREATE OR REPLACE FUNCTION is_project_member(p_project_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM project_members
    WHERE project_id = p_project_id
    AND user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Projects: members can read, admins can update/delete
CREATE POLICY "Members can view projects"
  ON projects FOR SELECT
  USING (is_project_member(id));

CREATE POLICY "Admins can update projects"
  ON projects FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM project_members
    WHERE project_id = projects.id
    AND user_id = auth.uid()
    AND role = 'admin'
  ));

CREATE POLICY "Admins can delete projects"
  ON projects FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM project_members
    WHERE project_id = projects.id
    AND user_id = auth.uid()
    AND role = 'admin'
  ));

CREATE POLICY "Authenticated users can create projects"
  ON projects FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Contents: follow project membership
CREATE POLICY "Members can view contents"
  ON contents FOR SELECT
  USING (is_project_member(project_id));

CREATE POLICY "Editors+ can manage contents"
  ON contents FOR ALL
  USING (EXISTS (
    SELECT 1 FROM project_members
    WHERE project_id = contents.project_id
    AND user_id = auth.uid()
    AND role IN ('admin', 'editor')
  ));

-- Project members: admins manage, all members can view
CREATE POLICY "Members can view team"
  ON project_members FOR SELECT
  USING (is_project_member(project_id));

CREATE POLICY "Admins can manage team"
  ON project_members FOR ALL
  USING (EXISTS (
    SELECT 1 FROM project_members pm
    WHERE pm.project_id = project_members.project_id
    AND pm.user_id = auth.uid()
    AND pm.role = 'admin'
  ));

-- Auto-add creator as admin when project is created
CREATE OR REPLACE FUNCTION add_project_creator()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO project_members (project_id, user_id, role)
  VALUES (NEW.id, auth.uid(), 'admin');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_project_created
  AFTER INSERT ON projects
  FOR EACH ROW
  EXECUTE FUNCTION add_project_creator();
