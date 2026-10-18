"use client";

import dynamic from "next/dynamic";
import { CrosshairIcon, MapPinIcon, XIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { DEFAULT_MAP_CENTER } from "@/lib/constants";
import type { MapDefaults } from "@/lib/map-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const LocationPickerInner = dynamic(() => import("./location-picker-inner"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[240px] w-full items-center justify-center bg-muted text-[11px] text-muted-foreground">
      Loading map…
    </div>
  ),
});

export function LocationPicker({
  latitude,
  longitude,
  onChange,
  defaults,
}: {
  latitude: number | null;
  longitude: number | null;
  onChange: (latitude: number | null, longitude: number | null) => void;
  defaults?: MapDefaults;
}) {
  const [locating, setLocating] = useState(false);
  const [latitudeText, setLatitudeText] = useState(
    latitude === null ? "" : String(latitude),
  );
  const [longitudeText, setLongitudeText] = useState(
    longitude === null ? "" : String(longitude),
  );
  const center: MapDefaults = defaults ?? {
    latitude: DEFAULT_MAP_CENTER.lat,
    longitude: DEFAULT_MAP_CENTER.lng,
    zoom: DEFAULT_MAP_CENTER.zoom,
  };

  // Keep the text inputs in sync with map clicks without fighting typing.
  useEffect(() => {
    if (latitude === null) {
      setLatitudeText((current) => (current === "" ? current : ""));
      return;
    }
    setLatitudeText((current) => {
      const parsed = Number(current);
      if (current.trim() !== "" && !Number.isNaN(parsed) && parsed === latitude) {
        return current;
      }
      return String(latitude);
    });
  }, [latitude]);

  useEffect(() => {
    if (longitude === null) {
      setLongitudeText((current) => (current === "" ? current : ""));
      return;
    }
    setLongitudeText((current) => {
      const parsed = Number(current);
      if (current.trim() !== "" && !Number.isNaN(parsed) && parsed === longitude) {
        return current;
      }
      return String(longitude);
    });
  }, [longitude]);

  function locate() {
    if (!("geolocation" in navigator)) {
      toast.error("This browser does not support location lookup.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        onChange(
          Number(position.coords.latitude.toFixed(6)),
          Number(position.coords.longitude.toFixed(6)),
        );
        setLocating(false);
        toast.success("Location captured. You can still adjust the pin.");
      },
      () => {
        setLocating(false);
        toast.error(
          "Could not read your location. Check browser permissions, or click the map to drop a pin.",
        );
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  return (
    <div className="space-y-2.5">
      <div className="h-[240px] overflow-hidden rounded-md border border-border">
        <LocationPickerInner
          latitude={latitude}
          longitude={longitude}
          onChange={onChange}
          center={center}
        />
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[110px] flex-1 space-y-1">
          <Label htmlFor="sighting-latitude" className="text-[11px]">
            Latitude
          </Label>
          <Input
            id="sighting-latitude"
            inputMode="decimal"
            placeholder="49.2827"
            value={latitudeText}
            onChange={(event) => {
              const value = event.target.value;
              setLatitudeText(value);
              const parsed = Number(value);
              onChange(value.trim() === "" || Number.isNaN(parsed) ? null : parsed, longitude);
            }}
            className="h-8 font-mono text-xs"
          />
        </div>
        <div className="min-w-[110px] flex-1 space-y-1">
          <Label htmlFor="sighting-longitude" className="text-[11px]">
            Longitude
          </Label>
          <Input
            id="sighting-longitude"
            inputMode="decimal"
            placeholder="-123.1207"
            value={longitudeText}
            onChange={(event) => {
              const value = event.target.value;
              setLongitudeText(value);
              const parsed = Number(value);
              onChange(latitude, value.trim() === "" || Number.isNaN(parsed) ? null : parsed);
            }}
            className="h-8 font-mono text-xs"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={locate}
          disabled={locating}
          className="h-8"
        >
          <CrosshairIcon />
          {locating ? "Locating…" : "My location"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onChange(null, null)}
          disabled={latitude === null && longitude === null}
          className="h-8"
        >
          <XIcon />
          Clear pin
        </Button>
      </div>
      <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-muted-foreground">
        <MapPinIcon className="mt-0.5 size-3 shrink-0" />
        Click the map to place the pin. GPS metadata embedded in photographs is
        ignored; only coordinates you enter here are saved.
      </p>
    </div>
  );
}
