-- ==========================================
-- Fix RLS policies for services & products
-- Date: 2026-03-04
-- 
-- Allow managers and admins to manage services/products.
-- Allow NULL branch_id (global/shared items).
-- Allow authenticated users to read service/product categories.
-- ==========================================

-- ------------------------------------------
-- Category tables: enable RLS + open read
-- ------------------------------------------

ALTER TABLE service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS service_categories_read ON service_categories;
CREATE POLICY service_categories_read ON service_categories
FOR SELECT
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS service_categories_write ON service_categories;
CREATE POLICY service_categories_write ON service_categories
FOR ALL
USING (app_is_manager_or_admin())
WITH CHECK (app_is_manager_or_admin());

DROP POLICY IF EXISTS product_categories_read ON product_categories;
CREATE POLICY product_categories_read ON product_categories
FOR SELECT
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS product_categories_write ON product_categories;
CREATE POLICY product_categories_write ON product_categories
FOR ALL
USING (app_is_manager_or_admin())
WITH CHECK (app_is_manager_or_admin());

-- ------------------------------------------
-- Services: relax policy for NULL branch_id
-- and allow manager-level writes
-- ------------------------------------------

DROP POLICY IF EXISTS services_branch_access ON services;

-- Read: any authenticated user can see services in their branch OR global (NULL branch_id)
CREATE POLICY services_read ON services
FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND (
    branch_id IS NULL
    OR app_is_admin()
    OR app_has_branch_access(branch_id)
  )
);

-- Write: managers/admins can insert, update, delete
CREATE POLICY services_write ON services
FOR ALL
USING (
  app_is_manager_or_admin()
  AND (
    branch_id IS NULL
    OR app_is_admin()
    OR app_has_branch_access(branch_id)
  )
)
WITH CHECK (
  app_is_manager_or_admin()
  AND (
    branch_id IS NULL
    OR app_is_admin()
    OR app_has_branch_access(branch_id)
  )
);

-- ------------------------------------------
-- Products: relax policy for NULL branch_id
-- and allow manager-level writes
-- ------------------------------------------

DROP POLICY IF EXISTS products_branch_access ON products;

-- Read: any authenticated user can see products in their branch OR global (NULL branch_id)
CREATE POLICY products_read ON products
FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND (
    branch_id IS NULL
    OR app_is_admin()
    OR app_has_branch_access(branch_id)
  )
);

-- Write: managers/admins can insert, update, delete
CREATE POLICY products_write ON products
FOR ALL
USING (
  app_is_manager_or_admin()
  AND (
    branch_id IS NULL
    OR app_is_admin()
    OR app_has_branch_access(branch_id)
  )
)
WITH CHECK (
  app_is_manager_or_admin()
  AND (
    branch_id IS NULL
    OR app_is_admin()
    OR app_has_branch_access(branch_id)
  )
);
