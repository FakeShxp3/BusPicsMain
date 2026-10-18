"use client";

import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import L from "leaflet";
import { MapContainer, Marker, TileLayer, useMapEvents } from "react-leaflet";
import type { MapDefaults } from "@/lib/map-types";

const markerIcon = L.divIcon({
  className: "ts-marker ts-marker--selected",
  html: '<span class="ts-marker__dot"></span>',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

function ClickHandler({
  onChange,
}: {
  onChange: (latitude: number, longitude: number) => void;
}) {
  useMapEvents({
    click(event) {
      onChange(
        Number(event.latlng.lat.toFixed(6)),
        Number(event.latlng.lng.toFixed(6)),
      );
    },
  });
  return null;
}

function Recenter({
  latitude,
  longitude,
}: {
  latitude: number | null;
  longitude: number | null;
}) {
  const map = useMapEvents({});
  useEffect(() => {
    if (latitude !== null && longitude !== null) {
      map.setView([latitude, longitude], Math.max(map.getZoom(), 14));
    }
  }, [latitude, longitude, map]);
  return null;
}

export default function LocationPickerInner({
  latitude,
  longitude,
  onChange,
  center,
}: {
  latitude: number | null;
  longitude: number | null;
  onChange: (latitude: number, longitude: number) => void;
  center: MapDefaults;
}) {
  const position: [number, number] = [
    latitude ?? center.latitude,
    longitude ?? center.longitude,
  ];

  return (
    <MapContainer
      center={position}
      zoom={center.zoom}
      scrollWheelZoom
      className="ts-map-picker h-full w-full"
    >
      <TileLayer
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        maxZoom={19}
      />
      <ClickHandler onChange={onChange} />
      <Recenter latitude={latitude} longitude={longitude} />
      {latitude !== null && longitude !== null ? (
        <Marker position={[latitude, longitude]} icon={markerIcon} />
      ) : null}
    </MapContainer>
  );
}
