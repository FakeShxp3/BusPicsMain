export type MapSighting = {
  id: string;
  sightingId: string;
  latitude: number;
  longitude: number;
  fleetNumber: string | null;
  dateLabel: string;
  route: string | null;
  locationName: string | null;
  coverUrl: string | null;
  vehicleId: string;
};

export type MapDefaults = {
  latitude: number;
  longitude: number;
  zoom: number;
};
