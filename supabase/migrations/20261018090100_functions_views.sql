-- ===========================================================================
-- TransitSpotter - 002 functions, triggers and read models
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- updated_at bookkeeping
-- ---------------------------------------------------------------------------
create or replace function transitspotter.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on transitspotter.profiles;
create trigger profiles_set_updated_at
  before update on transitspotter.profiles
  for each row execute function transitspotter.set_updated_at();

drop trigger if exists user_preferences_set_updated_at on transitspotter.user_preferences;
create trigger user_preferences_set_updated_at
  before update on transitspotter.user_preferences
  for each row execute function transitspotter.set_updated_at();

drop trigger if exists operators_set_updated_at on transitspotter.operators;
create trigger operators_set_updated_at
  before update on transitspotter.operators
  for each row execute function transitspotter.set_updated_at();

drop trigger if exists vehicles_set_updated_at on transitspotter.vehicles;
create trigger vehicles_set_updated_at
  before update on transitspotter.vehicles
  for each row execute function transitspotter.set_updated_at();

drop trigger if exists sightings_set_updated_at on transitspotter.sightings;
create trigger sightings_set_updated_at
  before update on transitspotter.sightings
  for each row execute function transitspotter.set_updated_at();

drop trigger if exists photos_set_updated_at on transitspotter.photos;
create trigger photos_set_updated_at
  before update on transitspotter.photos
  for each row execute function transitspotter.set_updated_at();

-- ---------------------------------------------------------------------------
-- new auth user bootstrap (profile + preferences)
-- ---------------------------------------------------------------------------
create or replace function transitspotter.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into transitspotter.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(
      nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''),
      nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
      split_part(coalesce(new.email, 'spotter'), '@', 1)
    )
  )
  on conflict (id) do nothing;

  insert into transitspotter.user_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists transitspotter_on_auth_user_created on auth.users;
create trigger transitspotter_on_auth_user_created
  after insert on auth.users
  for each row execute function transitspotter.handle_new_user();

-- Backfill for accounts created before the trigger existed.
insert into transitspotter.profiles (id, email, display_name)
select u.id, u.email, split_part(coalesce(u.email, 'spotter'), '@', 1)
from auth.users u
on conflict (id) do nothing;

insert into transitspotter.user_preferences (user_id)
select u.id from auth.users u
on conflict (user_id) do nothing;

-- ---------------------------------------------------------------------------
-- vehicle cover photograph must belong to one of that vehicle's sightings
-- ---------------------------------------------------------------------------
create or replace function transitspotter.validate_vehicle_cover_photo()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.cover_photo_id is not null then
    if not exists (
      select 1
      from transitspotter.photos p
      join transitspotter.sightings s on s.id = p.sighting_id
      where p.id = new.cover_photo_id
        and p.user_id = new.user_id
        and s.user_id = new.user_id
        and s.vehicle_id = new.id
    ) then
      raise exception 'Cover photograph must belong to a sighting of this vehicle'
        using errcode = 'check_violation';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists vehicles_validate_cover_photo on transitspotter.vehicles;
create trigger vehicles_validate_cover_photo
  before insert or update of cover_photo_id on transitspotter.vehicles
  for each row execute function transitspotter.validate_vehicle_cover_photo();

-- ---------------------------------------------------------------------------
-- record_vehicle_status: atomically append history and update the vehicle
-- ---------------------------------------------------------------------------
create or replace function transitspotter.record_vehicle_status(
  p_vehicle_id uuid,
  p_status text,
  p_changed_on date default current_date,
  p_notes text default null
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_previous text;
  v_effective_date date := coalesce(p_changed_on, current_date);
begin
  if p_status not in ('active', 'retired', 'scrapped', 'transferred', 'unknown') then
    raise exception 'Invalid vehicle status: %', p_status using errcode = 'check_violation';
  end if;

  -- Row Level Security restricts this lookup to the caller's own vehicles.
  select v.status into v_previous
  from transitspotter.vehicles v
  where v.id = p_vehicle_id;

  if not found then
    raise exception 'Vehicle not found' using errcode = 'no_data_found';
  end if;

  insert into transitspotter.vehicle_status_history
    (user_id, vehicle_id, previous_status, new_status, changed_on, notes)
  values
    (auth.uid(), p_vehicle_id, v_previous, p_status, v_effective_date, nullif(btrim(p_notes), ''));

  update transitspotter.vehicles
  set status = p_status,
      status_verified_on = v_effective_date
  where id = p_vehicle_id;
end;
$$;

revoke all on function transitspotter.record_vehicle_status(uuid, text, date, text) from public;
grant execute on function transitspotter.record_vehicle_status(uuid, text, date, text) to authenticated;

-- ---------------------------------------------------------------------------
-- vehicle_overview: denormalised read model for fleet list / detail pages
-- ---------------------------------------------------------------------------
create or replace view transitspotter.vehicle_overview
with (security_invoker = true)
as
select
  v.id,
  v.user_id,
  v.operator_id,
  o.name as operator_name,
  o.abbreviation as operator_abbreviation,
  v.fleet_number,
  v.manufacturer,
  v.model,
  v.generation,
  v.vehicle_category,
  v.powertrain,
  v.length_m,
  v.model_year,
  v.in_service_year,
  v.status,
  v.status_verified_on,
  v.notes,
  v.cover_photo_id,
  cp.storage_path as cover_storage_path,
  v.created_at,
  v.updated_at,
  coalesce(s.sighting_count, 0) as sighting_count,
  coalesce(pc.photo_count, 0) as photo_count,
  s.first_spotted_at,
  s.last_spotted_at,
  coalesce(s.routes, array[]::text[]) as routes
from transitspotter.vehicles v
left join transitspotter.operators o on o.id = v.operator_id
left join transitspotter.photos cp on cp.id = v.cover_photo_id
left join lateral (
  select
    count(*)::integer as sighting_count,
    min(si.spotted_at) as first_spotted_at,
    max(si.spotted_at) as last_spotted_at,
    array_agg(distinct si.route order by si.route) filter (where si.route is not null) as routes
  from transitspotter.sightings si
  where si.vehicle_id = v.id
) s on true
left join lateral (
  select count(*)::integer as photo_count
  from transitspotter.photos p
  join transitspotter.sightings sp on sp.id = p.sighting_id
  where sp.vehicle_id = v.id
) pc on true;

comment on view transitspotter.vehicle_overview is
  'Vehicle rows enriched with operator, sighting and photo aggregates. Respects RLS via security_invoker.';

-- ---------------------------------------------------------------------------
-- sighting_overview: denormalised read model for lists, map and galleries
-- ---------------------------------------------------------------------------
create or replace view transitspotter.sighting_overview
with (security_invoker = true)
as
select
  s.id,
  s.user_id,
  s.vehicle_id,
  s.spotted_at,
  s.route,
  s.direction,
  s.location_name,
  s.latitude,
  s.longitude,
  s.camera_model,
  s.lens,
  s.aperture,
  s.shutter_speed,
  s.iso,
  s.focal_length,
  s.weather,
  s.notes,
  s.created_at,
  s.updated_at,
  v.fleet_number,
  v.manufacturer,
  v.model,
  v.generation,
  v.vehicle_category,
  v.powertrain,
  v.status as vehicle_status,
  v.operator_id,
  o.name as operator_name,
  o.abbreviation as operator_abbreviation,
  coalesce(p.photo_count, 0) as photo_count,
  p.cover_photo_id,
  p.cover_storage_path
from transitspotter.sightings s
join transitspotter.vehicles v on v.id = s.vehicle_id
left join transitspotter.operators o on o.id = v.operator_id
left join lateral (
  select
    count(*)::integer as photo_count,
    (array_agg(ph.id order by ph.is_cover desc, ph.sort_order asc, ph.created_at asc))[1] as cover_photo_id,
    (array_agg(ph.storage_path order by ph.is_cover desc, ph.sort_order asc, ph.created_at asc))[1] as cover_storage_path
  from transitspotter.photos ph
  where ph.sighting_id = s.id
) p on true;

comment on view transitspotter.sighting_overview is
  'Sightings enriched with vehicle/operator details and cover photo. Respects RLS via security_invoker.';

grant select on transitspotter.vehicle_overview to authenticated;
grant select on transitspotter.sighting_overview to authenticated;
revoke all on transitspotter.vehicle_overview from anon;
revoke all on transitspotter.sighting_overview from anon;
