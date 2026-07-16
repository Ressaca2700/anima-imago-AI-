-- Anima Imago — esquema do banco de dados
-- Cole este arquivo inteiro no SQL Editor do Supabase (Menu lateral > SQL Editor > New query) e clique em "Run".

create extension if not exists pgcrypto;

create table if not exists products (
  id bigint generated always as identity primary key,
  created_at timestamptz default now(),
  title_en text not null,
  title_es text not null,
  title_zh text not null,
  desc_en text default '',
  desc_es text default '',
  desc_zh text default '',
  price numeric not null,
  category text not null default 'abstract',
  image_path text not null,       -- caminho do arquivo dentro do bucket "pieces" no Storage
  sold boolean not null default false,
  sold_at timestamptz
);

create table if not exists downloads (
  id uuid primary key default gen_random_uuid(),
  product_id bigint references products(id),
  token text unique not null,
  stripe_session_id text,
  paid boolean not null default false,
  created_at timestamptz default now(),
  expires_at timestamptz default (now() + interval '7 days')
);

-- Segurança: bloqueia leitura/escrita direta pelo público; só o servidor (com a service role key) acessa.
alter table products enable row level security;
alter table downloads enable row level security;

-- Permite leitura pública somente das peças NÃO vendidas (para a galeria funcionar sem passar pela nossa API, se quisermos no futuro).
-- Por enquanto, toda leitura/escrita passa pelas funções do servidor, então nenhuma policy pública é criada aqui.

-- Cria o "bucket" (pasta segura) onde os arquivos de imagem ficam guardados.
-- Ele é PRIVADO — ninguém acessa os arquivos diretamente, só através do nosso site.
insert into storage.buckets (id, name, public)
values ('pieces', 'pieces', false)
on conflict (id) do nothing;

-- Pedidos de encomenda ("Commission a Piece"): um cliente pede uma peça sob medida,
-- paga um sinal de 50% na hora, e você entrega o restante depois combinado.
create table if not exists commissions (
  id bigint generated always as identity primary key,
  created_at timestamptz default now(),
  customer_name text not null,
  customer_email text not null,
  brief text not null,           -- descrição do que a pessoa imagina
  style_notes text default '',   -- referências de estilo/cores, opcional
  reference_image_path text,     -- caminho de uma imagem de referência anexada pelo cliente, opcional
  price numeric not null,        -- valor total combinado da encomenda
  deposit_amount numeric not null, -- valor do sinal (50% do total)
  stripe_session_id text,
  deposit_paid boolean not null default false,
  status text not null default 'awaiting_deposit',
  -- status possíveis: awaiting_deposit, new, in_progress, ready, delivered, cancelled
  delivery_image_path text,      -- caminho do arquivo final no Storage, preenchido quando pronta
  delivery_token text            -- token único do link de download da peça encomendada
);

alter table commissions enable row level security;
-- Assim como products/downloads, nenhuma policy pública é criada — só o servidor acessa.

-- Se você já rodou este arquivo antes (versão sem a imagem de referência), esta linha
-- adiciona a coluna que falta sem apagar nada — pode rodar este arquivo de novo com segurança.
alter table commissions add column if not exists reference_image_path text;

