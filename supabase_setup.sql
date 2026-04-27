-- SQL Script for Supabase Setup - 3D Prestes
-- Copie e cole este script no SQL Editor do seu projeto Supabase em:
-- https://app.supabase.com/project/_/sql

-- 1. Tabela de Clientes
CREATE TABLE IF NOT EXISTS public.clients (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users NOT NULL,
    name text NOT NULL,
    email text,
    phone text,
    created_at timestamp with time zone DEFAULT now()
);

-- 2. Tabela de Pedidos
CREATE TABLE IF NOT EXISTS public.orders (
    id text PRIMARY KEY,
    user_id uuid REFERENCES auth.users NOT NULL,
    client_id uuid REFERENCES public.clients ON DELETE CASCADE NOT NULL,
    piece_name text NOT NULL,
    material_id text NOT NULL,
    weight_grams numeric NOT NULL,
    print_time_hours numeric NOT NULL,
    status text NOT NULL,
    price numeric NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

-- 3. Tabela de Configurações
CREATE TABLE IF NOT EXISTS public.settings (
    user_id uuid PRIMARY KEY REFERENCES auth.users NOT NULL,
    material_price_per_kg numeric DEFAULT 120,
    machine_price_per_hour numeric DEFAULT 5,
    multiplier_low numeric DEFAULT 1.5,
    multiplier_medium numeric DEFAULT 2,
    multiplier_high numeric DEFAULT 2.5,
    updated_at timestamp with time zone DEFAULT now()
);

-- 4. Habilitar Row Level Security (RLS)
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- 5. Políticas de Segurança (Cria apenas se não existirem)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can only access their own clients') THEN
        CREATE POLICY "Users can only access their own clients" ON public.clients FOR ALL USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can only access their own orders') THEN
        CREATE POLICY "Users can only access their own orders" ON public.orders FOR ALL USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can only access their own settings') THEN
        CREATE POLICY "Users can only access their own settings" ON public.settings FOR ALL USING (auth.uid() = user_id);
    END IF;
END $$;
