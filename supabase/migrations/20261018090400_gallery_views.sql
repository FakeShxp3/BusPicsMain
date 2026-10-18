-- ===========================================================================
-- TransitSpotter - 005 gallery and operator read models
-- security_invoker keeps the caller's Row Level Security in force.
-- ===========================================================================

create or replace view transitspotter.photo_overview
with (security_invoker = true)
as
select
  p.id,
  p.user_id,
  p.sighting_id,
  p.storage_path,
  p.original_filename,
  p.mime_type,
  p.file_size,
  p.width,
  p.height,
  p.caption,
  p.alt_text,
  p.sort_order,
  p.is_cover,
  p.created_at,
  s.spotted_at,
  s.route,
  s.direction,
  s.location_name,
  s.latitude,
  s.longitude,
  s.vehicle_id,
  v.fleet_number,
  v.manufacturer,
  v.model,
  v.generation,
  v.vehicle_category,
  v.powertrain,
  v.operator_id,
  o.name as operator_name,
  o.abbreviation as operator_abbreviation
from transitspotter.photos p
join transitspotter.sightings s on s.id = p.sighting_id
join transitspotter.vehicles v on v.id = s.vehicle_id
left join transitspotter.operators o on o.id = v.operator_id;

comment on view transitspotter.photo_overview is
  'Photographs enriched with sighting, vehicle and operator metadata for the gallery.';

create or replace view transitspotter.operator_overview
with (security_invoker = true)
as
select
  o.id,
  o.user_id,
  o.name,
  o.abbreviation,
  o.region,
  o.ownership_type,
  o.notes,
  o.created_at,
  o.updated_at,
  coalesce(v.vehicle_count, 0) as vehicle_count,
  coalesce(s.sighting_count, 0) as sighting_count,
  coalesce(p.photo_count, 0) as photo_count
from transitspotter.operators o
left join lateral (
  select count(*)::integer as vehicle_count
  from transitspotter.vehicles veh
  where veh.operator_id = o.id
) v on true
left join lateral (
  select count(*)::integer as sighting_count
  from transitspotter.sightings si
  join transitspotter.vehicles veh on veh.id = si.vehicle_id
  where veh.operator_id = o.id
) s on true
left join lateral (
  select count(*)::integer as photo_count
  from transitspotter.photos ph
  join transitspotter.sightings si on si.id = ph.sighting_id
  join transitspotter.vehicles veh on veh.id = si.vehicle_id
  where veh.operator_id = o.id
) p on true;

comment on view transitspotter.operator_overview is
  'Operators with vehicle, sighting and photograph counts.';

grant select on transitspotter.photo_overview to authenticated;
grant select on transitspotter.operator_overview to authenticated;
revoke all on transitspotter.photo_overview from anon;
revoke all on transitspotter.operator_overview from anon;
