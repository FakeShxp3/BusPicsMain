-- ===========================================================================
-- TransitSpotter - 001 initial schema
-- Requires PostgreSQL 15+ (Supabase).
-- ===========================================================================

create extension if not exists pg_trgm with schema extensions;

-- ---------------------------------------------------------------------------
-- profiles: one row per authenticated user (account metadata only)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  display_name text check (display_name is null or length(btrim(display_name)) between 1 and 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'Account metadata for each authenticated user.';

-- ---------------------------------------------------------------------------
-- user_preferences: interface and display preferences
-- ---------------------------------------------------------------------------
create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  theme text not null default 'system' check (theme in ('light', 'dark', 'system')),
  date_style text not null default 'medium' check (date_style in ('medium', 'short', 'iso', 'long')),
  time_format text not null default '12h' check (time_format in ('12h', '24h')),
  units text not null default 'metric' check (units in ('metric', 'imperial')),
  default_vehicle_view text not null default 'table' check (default_vehicle_view in ('table', 'grid')),
  default_sighting_view text not null default 'list' check (default_sighting_view in ('list', 'gallery')),
  gallery_density text not null default 'comfortable' check (gallery_density in ('compact', 'comfortable', 'spacious')),
  map_center_lat double precision check (map_center_lat is null or map_center_lat between -90 and 90),
  map_center_lng double precision check (map_center_lng is null or map_center_lng between -180 and 180),
  map_zoom smallint not null default 11 check (map_zoom between 1 and 19),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_preferences_map_center_pair check ((map_center_lat is null) = (map_center_lng is null))
);

-- ---------------------------------------------------------------------------
-- operators: user-maintained transit operators
-- ---------------------------------------------------------------------------
create table if not exists public.operators (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 120),
  abbreviation text check (abbreviation is null or length(btrim(abbreviation)) between 1 and 24),
  region text check (region is null or length(btrim(region)) between 1 and 120),
  ownership_type text check (ownership_type is null or length(btrim(ownership_type)) between 1 and 60),
  notes text check (notes is null or length(notes) <= 10000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists operators_user_name_unique
  on public.operators (user_id, lower(name));
create index if not exists operators_user_id_idx on public.operators (user_id);

-- ---------------------------------------------------------------------------
-- vehicles: the personal fleet database
-- ---------------------------------------------------------------------------
create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  operator_id uuid references public.operators (id) on delete set null,
  fleet_number text check (fleet_number is null or length(btrim(fleet_number)) between 1 and 40),
  manufacturer text check (manufacturer is null or length(btrim(manufacturer)) between 1 and 120),
  model text check (model is null or length(btrim(model)) between 1 and 120),
  generation text check (generation is null or length(btrim(generation)) between 1 and 120),
  vehicle_category text check (vehicle_category is null or length(btrim(vehicle_category)) between 1 and 60),
  powertrain text check (powertrain is null or length(btrim(powertrain)) between 1 and 60),
  length_m numeric(5, 2) check (length_m is null or (length_m > 0 and length_m <= 60)),
  model_year integer check (model_year is null or model_year between 1900 and 2200),
  in_service_year integer check (in_service_year is null or in_service_year between 1900 and 2200),
  status text not null default 'unknown'
    check (status in ('active', 'retired', 'scrapped', 'transferred', 'unknown')),
  status_verified_on date,
  notes text check (notes is null or length(notes) <= 20000),
  cover_photo_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column public.vehicles.status is
  'Manually maintained by the user. Never synchronised from a transit agency.';
comment on column public.vehicles.cover_photo_id is
  'Optional cover photograph. Must belong to a sighting of this vehicle (enforced by trigger).';

create unique index if not exists vehicles_user_operator_fleet_unique
  on public.vehicles (user_id, operator_id, fleet_number)
  where operator_id is not null and fleet_number is not null;
create index if not exists vehicles_user_id_idx on public.vehicles (user_id);
create index if not exists vehicles_user_created_idx on public.vehicles (user_id, created_at desc);
create index if not exists vehicles_user_operator_idx on public.vehicles (user_id, operator_id);
create index if not exists vehicles_user_status_idx on public.vehicles (user_id, status);
create index if not exists vehicles_user_model_idx on public.vehicles (user_id, model);
create index if not exists vehicles_user_manufacturer_idx on public.vehicles (user_id, manufacturer);
create index if not exists vehicles_cover_photo_idx on public.vehicles (cover_photo_id);
create index if not exists vehicles_fleet_trgm_idx
  on public.vehicles using gin (fleet_number extensions.gin_trgm_ops);
create index if not exists vehicles_model_trgm_idx
  on public.vehicles using gin (model extensions.gin_trgm_ops);
create index if not exists vehicles_manufacturer_trgm_idx
  on public.vehicles using gin (manufacturer extensions.gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- sightings: one observation of a vehicle at a moment in time
-- ---------------------------------------------------------------------------
create table if not exists public.sightings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  spotted_at timestamptz not null default now(),
  route text check (route is null or length(btrim(route)) between 1 and 80),
  direction text check (direction is null or length(btrim(direction)) between 1 and 160),
  location_name text check (location_name is null or length(btrim(location_name)) between 1 and 200),
  latitude double precision check (latitude is null or latitude between -90 and 90),
  longitude double precision check (longitude is null or longitude between -180 and 180),
  camera_model text check (camera_model is null or length(btrim(camera_model)) between 1 and 120),
  lens text check (lens is null or length(btrim(lens)) between 1 and 120),
  aperture text check (aperture is null or length(btrim(aperture)) between 1 and 40),
  shutter_speed text check (shutter_speed is null or length(btrim(shutter_speed)) between 1 and 40),
  iso integer check (iso is null or (iso > 0 and iso <= 1000000)),
  focal_length text check (focal_length is null or length(btrim(focal_length)) between 1 and 40),
  weather text check (weather is null or length(btrim(weather)) between 1 and 160),
  notes text check (notes is null or length(notes) <= 20000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sightings_coordinate_pair check ((latitude is null) = (longitude is null))
);

create index if not exists sightings_user_spotted_idx
  on public.sightings (user_id, spotted_at desc);
create index if not exists sightings_vehicle_spotted_idx
  on public.sightings (vehicle_id, spotted_at desc);
create index if not exists sightings_user_route_idx on public.sightings (user_id, route);
create index if not exists sightings_user_created_idx on public.sightings (user_id, created_at desc);
create index if not exists sightings_route_trgm_idx
  on public.sightings using gin (route extensions.gin_trgm_ops);
create index if not exists sightings_location_trgm_idx
  on public.sightings using gin (location_name extensions.gin_trgm_ops);
create index if not exists sightings_notes_trgm_idx
  on public.sightings using gin (notes extensions.gin_trgm_ops);
create index if not exists sightings_geo_idx
  on public.sightings (user_id, latitude, longitude)
  where latitude is not null;

-- ---------------------------------------------------------------------------
-- photos: image metadata; the binary lives in Supabase Storage
-- ---------------------------------------------------------------------------
create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  sighting_id uuid not null references public.sightings (id) on delete cascade,
  storage_path text not null unique,
  original_filename text not null check (length(original_filename) between 1 and 255),
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp')),
  file_size bigint check (file_size is null or (file_size > 0 and file_size <= 26214400)),
  width integer check (width is null or width > 0),
  height integer check (height is null or height > 0),
  caption text check (caption is null or length(caption) <= 500),
  alt_text text check (alt_text is null or length(alt_text) <= 500),
  sort_order integer not null default 0,
  is_cover boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists photos_sighting_order_idx on public.photos (sighting_id, sort_order, created_at);
create index if not exists photos_user_idx on public.photos (user_id);
create unique index if not exists photos_one_cover_per_sighting
  on public.photos (sighting_id) where is_cover;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'vehicles_cover_photo_fk') then
    alter table public.vehicles
      add constraint vehicles_cover_photo_fk
      foreign key (cover_photo_id) references public.photos (id) on delete set null;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- vehicle_status_history: append-only manual status timeline
-- ---------------------------------------------------------------------------
create table if not exists public.vehicle_status_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  previous_status text check (previous_status is null or previous_status in ('active', 'retired', 'scrapped', 'transferred', 'unknown')),
  new_status text not null check (new_status in ('active', 'retired', 'scrapped', 'transferred', 'unknown')),
  changed_on date not null default current_date,
  notes text check (notes is null or length(notes) <= 5000),
  created_at timestamptz not null default now()
);

create index if not exists vehicle_status_history_vehicle_idx
  on public.vehicle_status_history (vehicle_id, changed_on desc, created_at desc);
create index if not exists vehicle_status_history_user_idx
  on public.vehicle_status_history (user_id);
