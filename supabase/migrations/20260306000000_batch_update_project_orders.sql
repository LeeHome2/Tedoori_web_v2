-- Create function for batch updating project display orders
-- This replaces N+1 queries with a single batch operation

CREATE OR REPLACE FUNCTION batch_update_project_orders(project_data jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  item jsonb;
BEGIN
  -- Loop through each project and update display_order
  FOR item IN SELECT * FROM jsonb_array_elements(project_data)
  LOOP
    UPDATE projects
    SET display_order = (item->>'display_order')::int
    WHERE id = item->>'id';
  END LOOP;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION batch_update_project_orders(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION batch_update_project_orders(jsonb) TO service_role;
