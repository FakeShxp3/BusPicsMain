export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export type ShellUser = {
  name: string;
  email: string | null;
  initials: string;
};

export type SearchVehicleResult = {
  id: string;
  fleet_number: string | null;
  operator_name: string | null;
  manufacturer: string | null;
  model: string | null;
};

export type SearchSightingResult = {
  id: string;
  vehicle_id: string;
  fleet_number: string | null;
  operator_name: string | null;
  spotted_at: string;
  route: string | null;
  location_name: string | null;
};

export type SearchOperatorResult = {
  id: string;
  name: string;
  abbreviation: string | null;
};

export type SearchResponse = {
  vehicles: SearchVehicleResult[];
  sightings: SearchSightingResult[];
  operators: SearchOperatorResult[];
};
