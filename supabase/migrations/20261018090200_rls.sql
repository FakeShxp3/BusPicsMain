-- ===========================================================================
-- TransitSpotter - 003 row level security
-- Every row is owned by exactly one authenticated user. Anonymous access is
-- denied outright; ownership is checked in the database, not in the client.
-- ===========================================================================

alter table transitspotter.profiles enable row level security;
alter table transitspotter.user_preferences enable row level security;
alter table transitspotter.operators enable row level security;
alter table transitspotter.vehicles enable row level security;
alter table transitspotter.sightings enable row level security;
alter table transitspotter.photos enable row level security;
alter table transitspotter.vehicle_status_history enable row level security;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
drop policy if exists "profiles_select_own" on transitspotter.profiles;
create policy "profiles_select_own"
  on transitspotter.profiles for select to authenticated
  using (id = (select auth.uid()));

drop policy if exists "profiles_insert_own" on transitspotter.profiles;
create policy "profiles_insert_own"
  on transitspotter.profiles for insert to authenticated
  with check (id = (select auth.uid()));

drop policy if exists "profiles_update_own" on transitspotter.profiles;
create policy "profiles_update_own"
  on transitspotter.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- user_preferences
-- ---------------------------------------------------------------------------
drop policy if exists "user_preferences_select_own" on transitspotter.user_preferences;
create policy "user_preferences_select_own"
  on transitspotter.user_preferences for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "user_preferences_insert_own" on transitspotter.user_preferences;
create policy "user_preferences_insert_own"
  on transitspotter.user_preferences for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "user_preferences_update_own" on transitspotter.user_preferences;
create policy "user_preferences_update_own"
  on transitspotter.user_preferences for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- operators
-- ---------------------------------------------------------------------------
drop policy if exists "operators_select_own" on transitspotter.operators;
create policy "operators_select_own"
  on transitspotter.operators for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "operators_insert_own" on transitspotter.operators;
create policy "operators_insert_own"
  on transitspotter.operators for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "operators_update_own" on transitspotter.operators;
create policy "operators_update_own"
  on transitspotter.operators for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "operators_delete_own" on transitspotter.operators;
create policy "operators_delete_own"
  on transitspotter.operators for delete to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- vehicles
-- ---------------------------------------------------------------------------
drop policy if exists "vehicles_select_own" on transitspotter.vehicles;
create policy "vehicles_select_own"
  on transitspotter.vehicles for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "vehicles_insert_own" on transitspotter.vehicles;
create policy "vehicles_insert_own"
  on transitspotter.vehicles for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and (
      operator_id is null
      or exists (
        select 1 from transitspotter.operators o
        where o.id = operator_id and o.user_id = (select auth.uid())
      )
    )
  );

drop policy if exists "vehicles_update_own" on transitspotter.vehicles;
create policy "vehicles_update_own"
  on transitspotter.vehicles for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and (
      operator_id is null
      or exists (
        select 1 from transitspotter.operators o
        where o.id = operator_id and o.user_id = (select auth.uid())
      )
    )
  );

drop policy if exists "vehicles_delete_own" on transitspotter.vehicles;
create policy "vehicles_delete_own"
  on transitspotter.vehicles for delete to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- sightings
-- ---------------------------------------------------------------------------
drop policy if exists "sightings_select_own" on transitspotter.sightings;
create policy "sightings_select_own"
  on transitspotter.sightings for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "sightings_insert_own" on transitspotter.sightings;
create policy "sightings_insert_own"
  on transitspotter.sightings for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from transitspotter.vehicles v
      where v.id = vehicle_id and v.user_id = (select auth.uid())
    )
  );

drop policy if exists "sightings_update_own" on transitspotter.sightings;
create policy "sightings_update_own"
  on transitspotter.sightings for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from transitspotter.vehicles v
      where v.id = vehicle_id and v.user_id = (select auth.uid())
    )
  );

drop policy if exists "sightings_delete_own" on transitspotter.sightings;
create policy "sightings_delete_own"
  on transitspotter.sightings for delete to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- photos
-- ---------------------------------------------------------------------------
drop policy if exists "photos_select_own" on transitspotter.photos;
create policy "photos_select_own"
  on transitspotter.photos for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "photos_insert_own" on transitspotter.photos;
create policy "photos_insert_own"
  on transitspotter.photos for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from transitspotter.sightings s
      where s.id = sighting_id and s.user_id = (select auth.uid())
    )
  );

drop policy if exists "photos_update_own" on transitspotter.photos;
create policy "photos_update_own"
  on transitspotter.photos for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from transitspotter.sightings s
      where s.id = sighting_id and s.user_id = (select auth.uid())
    )
  );

drop policy if exists "photos_delete_own" on transitspotter.photos;
create policy "photos_delete_own"
  on transitspotter.photos for delete to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- vehicle_status_history (append-only from the client's perspective)
-- ---------------------------------------------------------------------------
drop policy if exists "vehicle_status_history_select_own" on transitspotter.vehicle_status_history;
create policy "vehicle_status_history_select_own"
  on transitspotter.vehicle_status_history for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "vehicle_status_history_insert_own" on transitspotter.vehicle_status_history;
create policy "vehicle_status_history_insert_own"
  on transitspotter.vehicle_status_history for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from transitspotter.vehicles v
      where v.id = vehicle_id and v.user_id = (select auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- explicit privileges: authenticated only
-- ---------------------------------------------------------------------------
revoke all on transitspotter.profiles from anon;
revoke all on transitspotter.user_preferences from anon;
revoke all on transitspotter.operators from anon;
revoke all on transitspotter.vehicles from anon;
revoke all on transitspotter.sightings from anon;
revoke all on transitspotter.photos from anon;
revoke all on transitspotter.vehicle_status_history from anon;

grant select, insert, update on transitspotter.profiles to authenticated;
grant select, insert, update on transitspotter.user_preferences to authenticated;
grant select, insert, update, delete on transitspotter.operators to authenticated;
grant select, insert, update, delete on transitspotter.vehicles to authenticated;
grant select, insert, update, delete on transitspotter.sightings to authenticated;
grant select, insert, update, delete on transitspotter.photos to authenticated;
grant select, insert on transitspotter.vehicle_status_history to authenticated;

grant usage on schema transitspotter to authenticated;
