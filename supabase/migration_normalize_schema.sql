-- ============================================
-- NeuroBench: Normalize schema — models, model_spaces, model_params, results
-- ============================================
-- Deduplicates models, extracts spaces & params per model,
-- migrates variants into normalized results table.
-- Run this in Supabase SQL Editor.

-- ==========================================
-- STEP 1: Create new tables
-- ==========================================

-- Models: global catalog, NOT tied to a prompt
CREATE TABLE IF NOT EXISTS models_new (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE models_new ENABLE ROW LEVEL SECURITY;

-- Model spaces: platforms where the model is tested (macro)
CREATE TABLE IF NOT EXISTS model_spaces (
    id SERIAL PRIMARY KEY,
    model_id INTEGER NOT NULL REFERENCES models_new(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    url TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(model_id, name)
);
ALTER TABLE model_spaces ENABLE ROW LEVEL SECURITY;

-- Model params: parameter definitions per model (e.g. "Thinking mode", "Tools")
CREATE TABLE IF NOT EXISTS model_params (
    id SERIAL PRIMARY KEY,
    model_id INTEGER NOT NULL REFERENCES models_new(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(model_id, name)
);
ALTER TABLE model_params ENABLE ROW LEVEL SECURITY;

-- Model param values: possible values for each parameter (e.g. "Low", "Medium", "High")
CREATE TABLE IF NOT EXISTS model_param_values (
    id SERIAL PRIMARY KEY,
    param_id INTEGER NOT NULL REFERENCES model_params(id) ON DELETE CASCADE,
    value TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(param_id, value)
);
ALTER TABLE model_param_values ENABLE ROW LEVEL SECURITY;

-- Results: test result = model + prompt + space + scores + SVG + author
CREATE TABLE IF NOT EXISTS results (
    id SERIAL PRIMARY KEY,
    model_id INTEGER NOT NULL REFERENCES models_new(id) ON DELETE CASCADE,
    prompt_id INTEGER NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
    model_space_id INTEGER REFERENCES model_spaces(id) ON DELETE SET NULL,
    test_date DATE,
    author TEXT,
    s_visual NUMERIC(3,1) NOT NULL DEFAULT 0,
    s_animation NUMERIC(3,1) NOT NULL DEFAULT 0,
    s_creative NUMERIC(3,1) NOT NULL DEFAULT 0,
    s_code NUMERIC(3,1) NOT NULL DEFAULT 0,
    s_detail NUMERIC(3,1) NOT NULL DEFAULT 0,
    overall NUMERIC(5,1) NOT NULL DEFAULT 0,
    svg_content TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE results ENABLE ROW LEVEL SECURITY;

-- Result param values: junction table linking a result to its parameter values (micro)
CREATE TABLE IF NOT EXISTS result_param_values (
    id SERIAL PRIMARY KEY,
    result_id INTEGER NOT NULL REFERENCES results(id) ON DELETE CASCADE,
    param_value_id INTEGER NOT NULL REFERENCES model_param_values(id) ON DELETE CASCADE,
    UNIQUE(result_id, param_value_id)
);
ALTER TABLE result_param_values ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- STEP 2: RLS policies for new tables
-- ==========================================

-- models_new: public read, admin write
CREATE POLICY "public_read_models_new" ON models_new
    FOR SELECT USING (true);
CREATE POLICY "admin_all_models_new" ON models_new
    FOR ALL USING (
        EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
    );

-- model_spaces: public read, admin write
CREATE POLICY "public_read_model_spaces" ON model_spaces
    FOR SELECT USING (true);
CREATE POLICY "admin_all_model_spaces" ON model_spaces
    FOR ALL USING (
        EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
    );

-- model_params: public read, admin write
CREATE POLICY "public_read_model_params" ON model_params
    FOR SELECT USING (true);
CREATE POLICY "admin_all_model_params" ON model_params
    FOR ALL USING (
        EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
    );

-- model_param_values: public read, admin write
CREATE POLICY "public_read_model_param_values" ON model_param_values
    FOR SELECT USING (true);
CREATE POLICY "admin_all_model_param_values" ON model_param_values
    FOR ALL USING (
        EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
    );

-- results: public read, admin write
CREATE POLICY "public_read_results" ON results
    FOR SELECT USING (true);
CREATE POLICY "admin_all_results" ON results
    FOR ALL USING (
        EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
    );

-- result_param_values: public read, admin write
CREATE POLICY "public_read_result_param_values" ON result_param_values
    FOR SELECT USING (true);
CREATE POLICY "admin_all_result_param_values" ON result_param_values
    FOR ALL USING (
        EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
    );

-- ==========================================
-- STEP 3: Migrate data from old models table
-- ==========================================

-- 3a. Deduplicate models by name and insert into models_new
--     NOTE: Old model names may contain parameter info as a hack,
--     e.g. "Gemini 2.5 Pro (High Think + Tools)".
--     These need to be manually cleaned up AFTER migration.
--     The migration preserves names as-is for safety.
--     Author is NOT migrated to models — it belongs to results (test author).
INSERT INTO models_new (name)
SELECT DISTINCT ON (name)
    name
FROM models
ORDER BY name;

-- 3b. Extract unique (model, space_label) combos into model_spaces
INSERT INTO model_spaces (model_id, name)
SELECT DISTINCT mn.id, v->>'label'
FROM models m
CROSS JOIN LATERAL jsonb_array_elements(
    CASE WHEN jsonb_typeof(m.variants) = 'array' THEN m.variants ELSE '[]'::jsonb END
) AS v
JOIN models_new mn ON mn.name = m.name
WHERE v->>'label' IS NOT NULL
  AND v->>'label' != '';

-- 3c. Migrate each variant into a result row
--     Author moves from models to results (test author, not model author).
INSERT INTO results (model_id, prompt_id, model_space_id, test_date, author,
    s_visual, s_animation, s_creative, s_code, s_detail, overall, svg_content)
SELECT
    mn.id,
    m.prompt_id,
    ms.id,
    CASE
        WHEN v->>'date' ~ '^\d{1,2}\.\d{1,2}\.\d{2,4}$' THEN
            make_date(
                CASE
                    WHEN length(split_part(v->>'date', '.', 3)) <= 2
                        THEN 2000 + split_part(v->>'date', '.', 3)::int
                    ELSE split_part(v->>'date', '.', 3)::int
                END,
                split_part(v->>'date', '.', 2)::int,
                split_part(v->>'date', '.', 1)::int
            )
        WHEN v->>'date' ~ '^\d{4}-\d{2}-\d{2}$' THEN
            (v->>'date')::date
        ELSE NULL
    END,
    m.author,
    COALESCE((v->'scores'->>0)::numeric, 0),
    COALESCE((v->'scores'->>1)::numeric, 0),
    COALESCE((v->'scores'->>2)::numeric, 0),
    COALESCE((v->'scores'->>3)::numeric, 0),
    COALESCE((v->'scores'->>4)::numeric, 0),
    COALESCE((v->>'overall')::numeric, 0),
    m.svg_content
FROM models m
CROSS JOIN LATERAL jsonb_array_elements(
    CASE WHEN jsonb_typeof(m.variants) = 'array' THEN m.variants ELSE '[]'::jsonb END
) AS v
JOIN models_new mn ON mn.name = m.name
LEFT JOIN model_spaces ms ON ms.model_id = mn.id AND ms.name = v->>'label';

-- ==========================================
-- STEP 4: Swap tables — rename old, promote new
-- ==========================================

-- 4a. Drop identity from old models.id (also drops its internal sequence)
ALTER TABLE models ALTER COLUMN id DROP IDENTITY IF EXISTS;

-- 4b. Rename old models table (keep as backup, no auto-increment needed)
ALTER TABLE models RENAME TO models_old;

-- 4c. Rename models_new → models
ALTER TABLE models_new RENAME TO models;

-- 4d. Rename the new sequence and wire it up
ALTER SEQUENCE models_new_id_seq RENAME TO models_id_seq;
ALTER TABLE models ALTER COLUMN id SET DEFAULT nextval('models_id_seq');
ALTER SEQUENCE models_id_seq OWNED BY models.id;

-- ==========================================
-- STEP 5: Indexes for performance
-- ==========================================

CREATE INDEX idx_model_spaces_model_id ON model_spaces(model_id);
CREATE INDEX idx_model_params_model_id ON model_params(model_id);
CREATE INDEX idx_model_param_values_param_id ON model_param_values(param_id);
CREATE INDEX idx_results_model_id ON results(model_id);
CREATE INDEX idx_results_prompt_id ON results(prompt_id);
CREATE INDEX idx_results_model_space_id ON results(model_space_id);
CREATE INDEX idx_results_overall ON results(overall DESC);
CREATE INDEX idx_results_prompt_model ON results(prompt_id, model_id);
CREATE INDEX idx_result_param_values_result_id ON result_param_values(result_id);
CREATE INDEX idx_result_param_values_param_value_id ON result_param_values(param_value_id);

-- ==========================================
-- STEP 6: Ensure admin_users has a SELECT policy
-- ==========================================

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_users_self_read" ON admin_users
    FOR SELECT USING (user_id = auth.uid());

-- ==========================================
-- STEP 7: Add author column to results (if not already present)
-- ==========================================

ALTER TABLE results ADD COLUMN IF NOT EXISTS author TEXT;

-- ==========================================
-- STEP 8: Drop author from models (moved to results)
-- ==========================================

ALTER TABLE models DROP COLUMN IF EXISTS author;

-- ==========================================
-- STEP 9: Reload PostGREST schema cache
-- ==========================================

NOTIFY pgrst, 'reload schema';
