"use client";

import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import Link from "next/link";
import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import type { MapDefaults, MapSighting } from "@/lib/map-types";
import { DEFAULT_MAP_CENTER } from "@/lib/constants";

const markerIcon = L.divIcon({
  className: "ts-marker",
  html: '<span class="ts-marker__dot"></span>',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
  popupAnchor: [0, -8],
});

function FitBounds({ points, fallback }: { points: MapSighting[]; fallback: MapDefaults }) {
  const map = useMap();
  const key = points.map((point) => `${point.id}:${point.latitude},${point.longitude}`).join("|");

  useEffect(() => {
    if (points.length === 0) {
      map.setView([fallback.latitude, fallback.longitude], fallback.zoom);
      return;
    }
    if (points.length === 1) {
      const only = points[0];
      if (only) map.setView([only.latitude, only.longitude], Math.max(map.getZoom(), 14));
      return;
    }
    const bounds = L.latLngBounds(
      points.map((point) => [point.latitude, point.longitude] as [number, number]),
    );
    map.fitBounds(bounds.pad(0.18), { maxZoom: 15 });
    // `key` captures the coordinates; points identity changes on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, map]);

  return null;
}

export default function SightingsMapInner({
  points,
  defaults,
}: {
  points: MapSighting[];
  defaults?: MapDefaults;
}) {
  const fallback: MapDefaults = defaults ?? {
    latitude: DEFAULT_MAP_CENTER.lat,
    longitude: DEFAULT_MAP_CENTER.lng,
    zoom: DEFAULT_MAP_CENTER.zoom,
  };

  const first = points[0];
  const center: [number, number] = first
    ? [first.latitude, first.longitude]
    : [fallback.latitude, fallback.longitude];

  return (
    <MapContainer
      center={center}
      zoom={first ? 12 : fallback.zoom}
      scrollWheelZoom
      className="h-full w-full"
      style={{ minHeight: "100%" }}
    >
      <TileLayer
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        maxZoom={19}
      />
      <FitBounds points={points} fallback={fallback} />
      {points.map((point) => (
        <Marker
          key={point.id}
          position={[point.latitude, point.longitude]}
          icon={markerIcon}
        >
          <Popup>
            <div className="overflow-hidden">
              {point.coverUrl ? (
                <img
                  src={point.coverUrl}
                  alt={`Fleet ${point.fleetNumber ?? ""} at ${point.locationName ?? "spotting location"}`}
                  className="block h-28 w-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="flex h-16 items-center justify-center bg-muted text-[10px] text-muted-foreground">
                  No photograph
                </div>
              )}
              <div className="space-y-1 p-3">
                <p className="font-mono text-sm font-semibold text-foreground">
                  {point.fleetNumber ? `#${point.fleetNumber}` : "Unnumbered vehicle"}
                </p>
                <p className="text-[11px] text-muted-foreground">{point.dateLabel}</p>
                <p className="text-[11.5px] text-foreground">
                  {point.route ? `Route ${point.route}` : "Route not recorded"}
                  {point.locationName ? ` · ${point.locationName}` : ""}
                </p>
                <div className="flex gap-3 pt-1 text-[11px] font-medium">
                  <Link href={`/sightings/${point.sightingId}`} className="text-primary hover:underline">
                    Open sighting
                  </Link>
                  <Link href={`/fleet/${point.vehicleId}`} className="text-primary hover:underline">
                    Vehicle
                  </Link>
                </div>
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
