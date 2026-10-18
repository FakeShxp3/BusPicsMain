-- ===========================================================================
-- TransitSpotter - 003 row level security
-- Every row is owned by exactly one authenticated user. Anonymous access is
-- denied outright; ownership is checked in the database, not in the client.
-- ===========================================================================

alter table public.profiles enable row level security;
alter table public.user_preferences enable row level security;
alter table public.operators enable row level security;
alter table public.vehicles enable row level security;
alter table public.sightings enable row level security;
alter table public.photos enable row level security;
alter table public.vehicle_status_history enable row level security;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()));

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles for insert to authenticated
  with check (id = (select auth.uid()));

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- user_preferences
-- ---------------------------------------------------------------------------
drop policy if exists "user_preferences_select_own" on public.user_preferences;
create policy "user_preferences_select_own"
  on public.user_preferences for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "user_preferences_insert_own" on public.user_preferences;
create policy "user_preferences_insert_own"
  on public.user_preferences for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "user_preferences_update_own" on public.user_preferences;
create policy "user_preferences_update_own"
  on public.user_preferences for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- operators
-- ---------------------------------------------------------------------------
drop policy if exists "operators_select_own" on public.operators;
create policy "operators_select_own"
  on public.operators for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "operators_insert_own" on public.operators;
create policy "operators_insert_own"
  on public.operators for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "operators_update_own" on public.operators;
create policy "operators_update_own"
  on public.operators for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "operators_delete_own" on public.operators;
create policy "operators_delete_own"
  on public.operators for delete to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- vehicles
-- ---------------------------------------------------------------------------
drop policy if exists "vehicles_select_own" on public.vehicles;
create policy "vehicles_select_own"
  on public.vehicles for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "vehicles_insert_own" on public.vehicles;
create policy "vehicles_insert_own"
  on public.vehicles for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and (
      operator_id is null
      or exists (
        select 1 from public.operators o
        where o.id = operator_id and o.user_id = (select auth.uid())
      )
    )
  );

drop policy if exists "vehicles_update_own" on public.vehicles;
create policy "vehicles_update_own"
  on public.vehicles for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and (
      operator_id is null
      or exists (
        select 1 from public.operators o
        where o.id = operator_id and o.user_id = (select auth.uid())
      )
    )
  );

drop policy if exists "vehicles_delete_own" on public.vehicles;
create policy "vehicles_delete_own"
  on public.vehicles for delete to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- sightings
-- ---------------------------------------------------------------------------
drop policy if exists "sightings_select_own" on public.sightings;
create policy "sightings_select_own"
  on public.sightings for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "sightings_insert_own" on public.sightings;
create policy "sightings_insert_own"
  on public.sightings for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.vehicles v
      where v.id = vehicle_id and v.user_id = (select auth.uid())
    )
  );

drop policy if exists "sightings_update_own" on public.sightings;
create policy "sightings_update_own"
  on public.sightings for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.vehicles v
      where v.id = vehicle_id and v.user_id = (select auth.uid())
    )
  );

drop policy if exists "sightings_delete_own" on public.sightings;
create policy "sightings_delete_own"
  on public.sightings for delete to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- photos
-- ---------------------------------------------------------------------------
drop policy if exists "photos_select_own" on public.photos;
create policy "photos_select_own"
  on public.photos for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "photos_insert_own" on public.photos;
create policy "photos_insert_own"
  on public.photos for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.sightings s
      where s.id = sighting_id and s.user_id = (select auth.uid())
    )
  );

drop policy if exists "photos_update_own" on public.photos;
create policy "photos_update_own"
  on public.photos for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.sightings s
      where s.id = sighting_id and s.user_id = (select auth.uid())
    )
  );

drop policy if exists "photos_delete_own" on public.photos;
create policy "photos_delete_own"
  on public.photos for delete to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- vehicle_status_history (append-only from the client's perspective)
-- ---------------------------------------------------------------------------
drop policy if exists "vehicle_status_history_select_own" on public.vehicle_status_history;
create policy "vehicle_status_history_select_own"
  on public.vehicle_status_history for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "vehicle_status_history_insert_own" on public.vehicle_status_history;
create policy "vehicle_status_history_insert_own"
  on public.vehicle_status_history for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.vehicles v
      where v.id = vehicle_id and v.user_id = (select auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- explicit privileges: authenticated only
-- ---------------------------------------------------------------------------
revoke all on public.profiles from anon;
revoke all on public.user_preferences from anon;
revoke all on public.operators from anon;
revoke all on public.vehicles from anon;
revoke all on public.sightings from anon;
revoke all on public.photos from anon;
revoke all on public.vehicle_status_history from anon;

grant select, insert, update on public.profiles to authenticated;
grant select, insert, update on public.user_preferences to authenticated;
grant select, insert, update, delete on public.operators to authenticated;
grant select, insert, update, delete on public.vehicles to authenticated;
grant select, insert, update, delete on public.sightings to authenticated;
grant select, insert, update, delete on public.photos to authenticated;
grant select, insert on public.vehicle_status_history to authenticated;
