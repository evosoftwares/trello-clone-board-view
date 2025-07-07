-- Fix user points consistency by prioritizing profiles table
-- This migration corrects issues with the user_points_with_names view

-- 1. First, check and potentially migrate team_members data to profiles
-- This ensures we have a single source of truth for user data

-- 2. Recreate the view to prioritize profiles table only
CREATE OR REPLACE VIEW user_points_with_names AS
SELECT 
    up.id,
    up.user_id,
    p.name as user_name,
    p.email,
    p.avatar,
    up.total_points,
    up.created_at,
    up.updated_at,
    COALESCE(awards_count.count, 0) as total_awards
FROM user_points up
INNER JOIN profiles p ON up.user_id = p.id  -- Changed to INNER JOIN to ensure profile exists
LEFT JOIN (
    SELECT user_id, COUNT(*) as count 
    FROM user_point_awards 
    GROUP BY user_id
) awards_count ON up.user_id = awards_count.user_id;

-- 3. Update the detailed awards view as well
CREATE OR REPLACE VIEW user_point_awards_detailed AS
SELECT 
    upa.id,
    upa.user_id,
    p.name as user_name,
    upa.task_id,
    upa.task_title,
    upa.points_awarded,
    upa.task_complexity,
    upa.from_column_id,
    upa.to_column_id,
    upa.project_id,
    proj.name as project_name,
    upa.awarded_at
FROM user_point_awards upa
INNER JOIN profiles p ON upa.user_id = p.id  -- Changed to INNER JOIN
LEFT JOIN projects proj ON upa.project_id = proj.id;

-- 4. Add index for better performance on user_points queries
CREATE INDEX IF NOT EXISTS idx_user_points_user_id ON user_points(user_id);
CREATE INDEX IF NOT EXISTS idx_user_point_awards_user_id ON user_point_awards(user_id);
CREATE INDEX IF NOT EXISTS idx_user_point_awards_task_user ON user_point_awards(task_id, user_id);

-- 5. Add function to migrate team_members to profiles if needed
-- (This is safe to run multiple times)
CREATE OR REPLACE FUNCTION migrate_team_members_to_profiles()
RETURNS void AS $$
DECLARE
    tm_record RECORD;
BEGIN
    -- For each team_member that doesn't have a corresponding profile
    FOR tm_record IN 
        SELECT tm.* 
        FROM team_members tm 
        WHERE NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = tm.id)
    LOOP
        -- Insert into profiles
        INSERT INTO profiles (id, name, email, avatar, created_at, updated_at, bio)
        VALUES (
            tm_record.id,
            tm_record.name,
            tm_record.email,
            tm_record.avatar,
            COALESCE(tm_record.created_at, NOW()),
            COALESCE(tm_record.updated_at, NOW()),
            NULL  -- bio doesn't exist in team_members
        )
        ON CONFLICT (id) DO NOTHING;  -- Skip if already exists
        
        RAISE NOTICE 'Migrated team member % to profiles', tm_record.name;
    END LOOP;
    
    RAISE NOTICE 'Team member to profiles migration completed';
END;
$$ LANGUAGE plpgsql;

-- 6. Run the migration
SELECT migrate_team_members_to_profiles();

-- 7. Add comment explaining the change
COMMENT ON VIEW user_points_with_names IS 'View showing user points with profile information. Uses INNER JOIN with profiles to ensure data consistency.';
COMMENT ON VIEW user_point_awards_detailed IS 'Detailed view of point awards with user and project information. Uses profiles as the authoritative user source.';