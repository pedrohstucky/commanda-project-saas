-- =====================================================
-- RECRIAR POLICIES SEM RECURSÃO
-- =====================================================

-- 1. PROFILES
DROP POLICY IF EXISTS "Users view profiles in own tenant" ON profiles;
DROP POLICY IF EXISTS "Users insert profiles in own tenant" ON profiles;
DROP POLICY IF EXISTS "System creates profiles" ON profiles;
DROP POLICY IF EXISTS "System updates profiles" ON profiles;
DROP POLICY IF EXISTS "Users delete profiles in own tenant" ON profiles;

CREATE POLICY "Users view own profile"
ON profiles FOR SELECT
USING (id = auth.uid());

CREATE POLICY "Users insert own profile"
ON profiles FOR INSERT
WITH CHECK (id = auth.uid());

CREATE POLICY "Users update own profile"
ON profiles FOR UPDATE
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

CREATE POLICY "Users delete own profile"
ON profiles FOR DELETE
USING (id = auth.uid());

-- 2. WHATSAPP_INSTANCES
DROP POLICY IF EXISTS "Users view whatsapp instances in own tenant" ON whatsapp_instances;
DROP POLICY IF EXISTS "System creates whatsapp instances" ON whatsapp_instances;
DROP POLICY IF EXISTS "System updates whatsapp instances" ON whatsapp_instances;
DROP POLICY IF EXISTS "Users delete whatsapp instances in own tenant" ON whatsapp_instances;

CREATE POLICY "Users view whatsapp instances in own tenant"
ON whatsapp_instances FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.tenant_id = whatsapp_instances.tenant_id
    )
);

CREATE POLICY "System creates whatsapp instances"
ON whatsapp_instances FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.tenant_id = whatsapp_instances.tenant_id
    )
);

CREATE POLICY "System updates whatsapp instances"
ON whatsapp_instances FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.tenant_id = whatsapp_instances.tenant_id
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.tenant_id = whatsapp_instances.tenant_id
    )
);

CREATE POLICY "Users delete whatsapp instances in own tenant"
ON whatsapp_instances FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.tenant_id = whatsapp_instances.tenant_id
    )
);

-- 3. PRODUCTS
DROP POLICY IF EXISTS "Users view products in own tenant" ON products;
DROP POLICY IF EXISTS "Users insert products in own tenant" ON products;
DROP POLICY IF EXISTS "Users update products in own tenant" ON products;
DROP POLICY IF EXISTS "Users delete products in own tenant" ON products;

CREATE POLICY "Users view products in own tenant"
ON products FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.tenant_id = products.tenant_id
    )
);

CREATE POLICY "Users insert products in own tenant"
ON products FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.tenant_id = products.tenant_id
    )
);

CREATE POLICY "Users update products in own tenant"
ON products FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.tenant_id = products.tenant_id
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.tenant_id = products.tenant_id
    )
);

CREATE POLICY "Users delete products in own tenant"
ON products FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.tenant_id = products.tenant_id
    )
);

-- 4. ORDERS
DROP POLICY IF EXISTS "Users view orders in own tenant" ON orders;
DROP POLICY IF EXISTS "Users insert orders in own tenant" ON orders;
DROP POLICY IF EXISTS "Users update orders in own tenant" ON orders;
DROP POLICY IF EXISTS "Users delete orders in own tenant" ON orders;

CREATE POLICY "Users view orders in own tenant"
ON orders FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.tenant_id = orders.tenant_id
    )
);

CREATE POLICY "Users insert orders in own tenant"
ON orders FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.tenant_id = orders.tenant_id
    )
    AND created_by = auth.uid()
);

CREATE POLICY "Users update orders in own tenant"
ON orders FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.tenant_id = orders.tenant_id
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.tenant_id = orders.tenant_id
    )
);

-- Orders não tem DELETE (preservar histórico)

-- 5. ORDER_ITEMS
DROP POLICY IF EXISTS "Users view order items in own tenant" ON order_items;
DROP POLICY IF EXISTS "Users insert order items in own tenant" ON order_items;
DROP POLICY IF EXISTS "Users delete order items in own tenant" ON order_items;

CREATE POLICY "Users view order items in own tenant"
ON order_items FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM orders
        JOIN profiles ON profiles.tenant_id = orders.tenant_id
        WHERE orders.id = order_items.order_id
        AND profiles.id = auth.uid()
    )
);

CREATE POLICY "Users insert order items in own tenant"
ON order_items FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM orders
        JOIN profiles ON profiles.tenant_id = orders.tenant_id
        WHERE orders.id = order_items.order_id
        AND profiles.id = auth.uid()
    )
);

CREATE POLICY "Users delete order items in own tenant"
ON order_items FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM orders
        JOIN profiles ON profiles.tenant_id = orders.tenant_id
        WHERE orders.id = order_items.order_id
        AND profiles.id = auth.uid()
    )
);

-- 6. PAYMENTS
DROP POLICY IF EXISTS "Users view payments in own tenant" ON payments;
DROP POLICY IF EXISTS "Users insert payments in own tenant" ON payments;

CREATE POLICY "Users view payments in own tenant"
ON payments FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM orders
        JOIN profiles ON profiles.tenant_id = orders.tenant_id
        WHERE orders.id = payments.order_id
        AND profiles.id = auth.uid()
    )
);

CREATE POLICY "Users insert payments in own tenant"
ON payments FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM orders
        JOIN profiles ON profiles.tenant_id = orders.tenant_id
        WHERE orders.id = payments.order_id
        AND profiles.id = auth.uid()
    )
    AND processed_by = auth.uid()
);

-- Payments não tem DELETE (preservar histórico)

SELECT 'Policies corrigidas com sucesso!' as message;