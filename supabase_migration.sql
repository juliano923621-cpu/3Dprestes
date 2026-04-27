-- 1. Tabela de Configurações
CREATE TABLE settings (
  user_id UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
  material_price_per_kg FLOAT8 DEFAULT 120,
  machine_price_per_hour FLOAT8 DEFAULT 5,
  multiplier_low FLOAT8 DEFAULT 1.5,
  multiplier_medium FLOAT8 DEFAULT 2.0,
  multiplier_high FLOAT8 DEFAULT 2.5,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver suas próprias configurações" 
ON settings FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar suas próprias configurações" 
ON settings FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem editar suas próprias configurações" 
ON settings FOR UPDATE USING (auth.uid() = user_id);

-- 2. Tabela de Clientes
CREATE TABLE clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver seus próprios clientes" 
ON clients FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem criar seus próprios clientes" 
ON clients FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem editar seus próprios clientes" 
ON clients FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar seus próprios clientes" 
ON clients FOR DELETE USING (auth.uid() = user_id);

-- 3. Tabela de Pedidos
CREATE TABLE orders (
  id TEXT PRIMARY KEY, -- Usando o formato ORD-XXXX do frontend
  user_id UUID REFERENCES auth.users NOT NULL,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  piece_name TEXT NOT NULL,
  material_id TEXT,
  weight_grams FLOAT8,
  print_time_hours FLOAT8,
  status TEXT DEFAULT 'quoted',
  price FLOAT8,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver seus próprios pedidos" 
ON orders FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem criar seus próprios pedidos" 
ON orders FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem editar seus próprios pedidos" 
ON orders FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar seus próprios pedidos" 
ON orders FOR DELETE USING (auth.uid() = user_id);
