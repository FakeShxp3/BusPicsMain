import type { VehicleStatus } from "@/lib/db/database.types";

export type VehicleFormValues = {
  operator_id: string;
  fleet_number: string;
  manufacturer: string;
  model: string;
  generation: string;
  vehicle_category: string;
  powertrain: string;
  length_m: string;
  model_year: string;
  in_service_year: string;
  notes: string;
  status: VehicleStatus;
  status_verified_on: string;
  status_note: string;
};

export type SightingFormValues = {
  vehicle_id: string;
  spotted_at: string;
  route: string;
  direction: string;
  location_name: string;
  latitude: string;
  longitude: string;
  camera_model: string;
  lens: string;
  aperture: string;
  shutter_speed: string;
  iso: string;
  focal_length: string;
  weather: string;
  notes: string;
};
