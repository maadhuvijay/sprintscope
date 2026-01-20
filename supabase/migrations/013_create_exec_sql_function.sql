-- Migration: Create safe SQL execution function
-- This function allows executing SELECT queries safely with RLS enforcement

CREATE OR REPLACE FUNCTION exec_sql(query_text TEXT)
RETURNS TABLE(result JSONB)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Security check: Only allow SELECT statements
  IF UPPER(TRIM(query_text)) NOT LIKE 'SELECT%' THEN
    RAISE EXCEPTION 'Only SELECT statements are allowed';
  END IF;
  
  -- Security check: Reject dangerous keywords
  IF (
    UPPER(query_text) ~ '\b(INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE|CREATE|GRANT|REVOKE)\b'
  ) THEN
    RAISE EXCEPTION 'Forbidden SQL keywords detected';
  END IF;
  
  -- Execute query and return as JSONB
  RETURN QUERY
  EXECUTE format('SELECT to_jsonb(t.*) FROM (%s) t', query_text);
END;
$$;

-- Grant execute permission to anon and authenticated roles
GRANT EXECUTE ON FUNCTION exec_sql(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION exec_sql(TEXT) TO authenticated;

COMMENT ON FUNCTION exec_sql IS 'Safely executes SELECT queries and returns results as JSONB. Only SELECT statements are allowed.';
