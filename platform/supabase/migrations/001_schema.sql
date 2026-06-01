-- Shawcliffe Platform — Core Schema
-- Canada region: always ensure your Supabase project is set to ca-central-1


-- ─── Root table (no client_id) ────────────────────────────────────────────────

create table clients (
  id               uuid        primary key default gen_random_uuid(),
  slug             text        unique not null,
  business_name    text        not null,
  vertical         text        not null check (vertical in ('produce_seller', 'baker', 'cleaner', 'welder')),
  tier             int         not null check (tier in (1, 2, 3)),
  operator_email   text        not null,
  operator_phone   text,
  active           boolean     not null default true,
  region           text        not null default 'ca',
  created_at       timestamptz not null default now()
);

-- ─── Tenant-scoped tables (client_id NOT NULL on every one) ──────────────────

create table client_branding (
  client_id        uuid        primary key references clients(id) on delete cascade,
  primary_color    text        not null default '#2563eb',
  secondary_color  text,
  accent_color     text,
  font_theme       text        not null default 'modern_sans'
                               check (font_theme in ('modern_sans','farmhouse','classic_serif','minimal','rustic')),
  logo_url         text,
  app_icon_url     text,
  splash_url       text,
  app_name         text        check (char_length(app_name) <= 30),
  tagline          text        check (char_length(tagline) <= 80),
  hero_photo_urls  text[]      not null default '{}',
  custom_domain    text,
  apple_bundle_id  text,
  android_package  text,
  theme_version    int         not null default 1
);

create table locations (
  client_id        uuid        not null references clients(id) on delete cascade,
  id               uuid        not null default gen_random_uuid(),
  display_name     text        not null,
  address          text,
  lat              numeric(9,6),
  lng              numeric(9,6),
  map_url          text,
  parking_notes    text        check (char_length(parking_notes) <= 200),
  primary key (client_id, id)
);

create table products (
  client_id        uuid        not null references clients(id) on delete cascade,
  id               uuid        not null default gen_random_uuid(),
  name             text        not null,
  category         text,
  price            numeric(10,2),
  bundle_description text,
  status           text        not null default 'available'
                               check (status in ('available','low','sold_out')),
  available_count  int,
  quantity_limit   int,
  hold_until       timestamptz,
  image_url        text,
  notes            text,
  sort_order       int         not null default 0,
  primary key (client_id, id)
);

create table daily_status (
  client_id        uuid        not null references clients(id) on delete cascade,
  id               uuid        not null default gen_random_uuid(),
  date             date        not null,
  status           text        not null
                               check (status in ('open','closed','sold_out','back_tomorrow','weather_delay','opening_soon')),
  hours_open       time,
  hours_close      time,
  location_id      uuid,
  custom_message   text,
  updated_at       timestamptz not null default now(),
  primary key (client_id, id),
  unique (client_id, date),
  -- Composite FK prevents cross-tenant location reference
  foreign key (client_id, location_id) references locations(client_id, id) on delete set null
);

create table customers (
  client_id            uuid        not null references clients(id) on delete cascade,
  id                   uuid        not null default gen_random_uuid(),
  name                 text        not null,
  phone                text,
  email                text,
  sms_consent          boolean     not null default false,
  email_consent        boolean     not null default false,
  apns_token           text,
  fcm_token            text,
  whatsapp_consent     boolean     not null default false,
  signup_source        text        check (signup_source in ('qr','website','app')),
  consent_timestamp    timestamptz not null default now(),
  consent_text_version text        not null,
  consent_ip_hash      text        not null,
  product_interests    text[]      not null default '{}',
  primary key (client_id, id)
);

create table preorders (
  client_id            uuid        not null references clients(id) on delete cascade,
  id                   uuid        not null default gen_random_uuid(),
  customer_id          uuid        not null,
  pickup_window_start  timestamptz,
  pickup_window_end    timestamptz,
  status               text        not null default 'pending'
                                   check (status in ('pending','confirmed','cancelled','completed')),
  notes                text,
  created_at           timestamptz not null default now(),
  hold_until           timestamptz not null default now() + interval '24 hours',
  primary key (client_id, id),
  -- Composite FK: cross-tenant customer reference is structurally impossible
  foreign key (client_id, customer_id) references customers(client_id, id)
);

create table preorder_items (
  client_id    uuid not null,
  preorder_id  uuid not null,
  product_id   uuid not null,
  quantity     int  not null check (quantity > 0),
  primary key (client_id, preorder_id, product_id),
  foreign key (client_id, preorder_id) references preorders(client_id, id) on delete cascade,
  foreign key (client_id, product_id)  references products(client_id, id)
);

create table announcements (
  client_id    uuid        not null references clients(id) on delete cascade,
  id           uuid        not null default gen_random_uuid(),
  headline     text        not null,
  body         text,
  published_at timestamptz,
  channels     text[]      not null default '{}',
  product_tags text[]      not null default '{}',
  sent         boolean     not null default false,
  primary key (client_id, id)
);

-- Payment stub — no Stripe at MVP; reserved for Phase 4
create table payment_intents (
  client_id    uuid        not null references clients(id) on delete cascade,
  id           uuid        not null default gen_random_uuid(),
  preorder_id  uuid        not null,
  amount_cents int         not null,
  currency     text        not null default 'cad',
  provider     text,
  provider_ref text,
  status       text        not null default 'pending',
  created_at   timestamptz not null default now(),
  primary key (client_id, id),
  foreign key (client_id, preorder_id) references preorders(client_id, id)
);

create table notification_log (
  client_id              uuid        not null references clients(id) on delete cascade,
  id                     uuid        not null default gen_random_uuid(),
  customer_id            uuid,
  channel                text        not null check (channel in ('sms','email','push','whatsapp')),
  message_preview        text,
  sent_at                timestamptz not null default now(),
  status                 text        not null,
  provider_message_id    text,
  twilio_subaccount_sid  text,
  primary key (client_id, id)
);

-- ─── Indexes ──────────────────────────────────────────────────────────────────

create index idx_clients_slug          on clients(slug);
create index idx_daily_status_date     on daily_status(client_id, date desc);
create index idx_products_client       on products(client_id, sort_order);
create index idx_preorders_customer    on preorders(client_id, customer_id);
create index idx_customers_phone       on customers(client_id, phone) where phone is not null;
create index idx_customers_email       on customers(client_id, email) where email is not null;
create index idx_notification_log_sent on notification_log(client_id, sent_at desc);
