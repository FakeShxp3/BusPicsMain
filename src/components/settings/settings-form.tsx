"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  LoaderCircleIcon,
  LogOutIcon,
  MonitorIcon,
  MoonIcon,
  SaveIcon,
  SunIcon,
} from "lucide-react";
import { toast } from "sonner";
import { signOut } from "@/lib/actions/auth";
import {
  persistTheme,
  updatePreferences,
  updateProfile,
} from "@/lib/actions/preferences";
import type {
  UserPreferences,
  DateStyle,
  GalleryDensity,
  SightingView,
  ThemePreference,
  TimeFormat,
  Units,
  VehicleView,
} from "@/lib/db/database.types";
import {
  DATE_STYLE_LABELS,
  DEFAULT_MAP_CENTER,
  UNITS_LABELS,
} from "@/lib/constants";
import { writeThemeCookie } from "@/lib/theme-cookie";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/forms/form-field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type PrefState = {
  theme: ThemePreference;
  date_style: DateStyle;
  time_format: TimeFormat;
  units: Units;
  default_vehicle_view: VehicleView;
  default_sighting_view: SightingView;
  gallery_density: GalleryDensity;
  map_center_lat: string;
  map_center_lng: string;
  map_zoom: string;
};

function toState(preferences: UserPreferences): PrefState {
  return {
    theme: preferences.theme,
    date_style: preferences.date_style,
    time_format: preferences.time_format,
    units: preferences.units,
    default_vehicle_view: preferences.default_vehicle_view,
    default_sighting_view: preferences.default_sighting_view,
    gallery_density: preferences.gallery_density,
    map_center_lat:
      preferences.map_center_lat !== null ? String(preferences.map_center_lat) : "",
    map_center_lng:
      preferences.map_center_lng !== null ? String(preferences.map_center_lng) : "",
    map_zoom: String(preferences.map_zoom),
  };
}

const THEMES: { value: ThemePreference; label: string; icon: typeof SunIcon }[] = [
  { value: "light", label: "Light", icon: SunIcon },
  { value: "dark", label: "Dark", icon: MoonIcon },
  { value: "system", label: "System", icon: MonitorIcon },
];

export function SettingsForm({
  displayName,
  email,
  preferences,
}: {
  displayName: string;
  email: string | null;
  preferences: UserPreferences;
}) {
  const router = useRouter();
  const { setTheme } = useTheme();
  const [name, setName] = useState(displayName);
  const [prefs, setPrefs] = useState<PrefState>(() => toState(preferences));
  const [savingName, startSavingName] = useTransition();
  const [savingPrefs, startSavingPrefs] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setName(displayName);
  }, [displayName]);

  function chooseTheme(theme: ThemePreference) {
    setPrefs((current) => ({ ...current, theme }));
    setTheme(theme);
    writeThemeCookie(theme);
    void persistTheme(theme);
  }

  function saveName() {
    startSavingName(async () => {
      const result = await updateProfile({ display_name: name });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Display name updated.");
      router.refresh();
    });
  }

  function savePreferences() {
    setError(null);
    const latitude = prefs.map_center_lat.trim();
    const longitude = prefs.map_center_lng.trim();
    if ((latitude === "") !== (longitude === "")) {
      setError("Set both map latitude and longitude, or leave both empty.");
      return;
    }
    const latValue = latitude === "" ? null : Number(latitude);
    const lngValue = longitude === "" ? null : Number(longitude);
    if (
      (latValue !== null && (!Number.isFinite(latValue) || latValue < -90 || latValue > 90)) ||
      (lngValue !== null && (!Number.isFinite(lngValue) || lngValue < -180 || lngValue > 180))
    ) {
      setError("Enter valid coordinates (latitude −90 to 90, longitude −180 to 180).");
      return;
    }
    const zoomValue = Number(prefs.map_zoom);
    if (!Number.isFinite(zoomValue) || zoomValue < 1 || zoomValue > 19) {
      setError("Map zoom must be between 1 and 19.");
      return;
    }

    startSavingPrefs(async () => {
      const result = await updatePreferences({
        theme: prefs.theme,
        date_style: prefs.date_style,
        time_format: prefs.time_format,
        units: prefs.units,
        default_vehicle_view: prefs.default_vehicle_view,
        default_sighting_view: prefs.default_sighting_view,
        gallery_density: prefs.gallery_density,
        map_center_lat: latValue,
        map_center_lng: lngValue,
        map_zoom: Math.round(zoomValue),
      });
      if (!result.ok) {
        setError(result.error);
        toast.error(result.error);
        return;
      }
      toast.success("Preferences saved.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>
            The identity attached to this private archive.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Display name" htmlFor="settings-name">
              <Input
                id="settings-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={80}
                placeholder="How your archive greets you"
              />
            </FormField>
            <FormField label="Email" htmlFor="settings-email" hint="Read-only">
              <Input id="settings-email" value={email ?? ""} readOnly disabled />
            </FormField>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] text-muted-foreground">
              Your email and password are managed by Supabase Auth.
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={saveName}
                disabled={savingName || name.trim() === displayName}
              >
                {savingName ? <LoaderCircleIcon className="animate-spin" /> : <SaveIcon />}
                Save name
              </Button>
              <form action={signOut}>
                <Button type="submit" variant="ghost" size="sm">
                  <LogOutIcon />
                  Sign out
                </Button>
              </form>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>
            Theme is applied immediately and saved to your account and this browser.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <p className="mb-2 text-[12.5px] font-medium">Theme</p>
            <div className="grid grid-cols-3 gap-2 sm:max-w-md">
              {THEMES.map((theme) => {
                const Icon = theme.icon;
                const active = prefs.theme === theme.value;
                return (
                  <button
                    key={theme.value}
                    type="button"
                    onClick={() => chooseTheme(theme.value)}
                    aria-pressed={active}
                    className={
                      active
                        ? "flex flex-col items-start gap-2 rounded-md border border-primary/40 bg-primary/5 p-3 text-left ring-1 ring-primary/20"
                        : "flex flex-col items-start gap-2 rounded-md border border-border bg-card p-3 text-left transition-colors hover:bg-muted"
                    }
                  >
                    <Icon className={active ? "size-4 text-primary" : "size-4 text-muted-foreground"} />
                    <span className="text-[12px] font-medium">{theme.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Date style" htmlFor="settings-date-style">
              <Select
                value={prefs.date_style}
                onValueChange={(value) =>
                  setPrefs({ ...prefs, date_style: value as DateStyle })
                }
              >
                <SelectTrigger id="settings-date-style">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(DATE_STYLE_LABELS) as DateStyle[]).map((value) => (
                    <SelectItem key={value} value={value}>
                      {DATE_STYLE_LABELS[value]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField label="Time format" htmlFor="settings-time-format">
              <Select
                value={prefs.time_format}
                onValueChange={(value) =>
                  setPrefs({ ...prefs, time_format: value as TimeFormat })
                }
              >
                <SelectTrigger id="settings-time-format">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="12h">12-hour (3:42 PM)</SelectItem>
                  <SelectItem value="24h">24-hour (15:42)</SelectItem>
                </SelectContent>
              </Select>
            </FormField>

            <FormField
              label="Units"
              htmlFor="settings-units"
              hint="Vehicle lengths and distances"
            >
              <Select
                value={prefs.units}
                onValueChange={(value) => setPrefs({ ...prefs, units: value as Units })}
              >
                <SelectTrigger id="settings-units">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(UNITS_LABELS) as Units[]).map((value) => (
                    <SelectItem key={value} value={value}>
                      {UNITS_LABELS[value]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <div className="flex items-end">
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                Dates are shown in your browser&apos;s time zone, detected automatically.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Defaults</CardTitle>
          <CardDescription>
            How lists, galleries and the map open for you.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <FormField label="Fleet database" htmlFor="settings-vehicle-view">
              <Select
                value={prefs.default_vehicle_view}
                onValueChange={(value) =>
                  setPrefs({ ...prefs, default_vehicle_view: value as VehicleView })
                }
              >
                <SelectTrigger id="settings-vehicle-view">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="table">Table view</SelectItem>
                  <SelectItem value="grid">Grid view</SelectItem>
                </SelectContent>
              </Select>
            </FormField>

            <FormField label="Sightings" htmlFor="settings-sighting-view">
              <Select
                value={prefs.default_sighting_view}
                onValueChange={(value) =>
                  setPrefs({ ...prefs, default_sighting_view: value as SightingView })
                }
              >
                <SelectTrigger id="settings-sighting-view">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="list">List view</SelectItem>
                  <SelectItem value="gallery">Gallery view</SelectItem>
                </SelectContent>
              </Select>
            </FormField>

            <FormField label="Gallery density" htmlFor="settings-density">
              <Select
                value={prefs.gallery_density}
                onValueChange={(value) =>
                  setPrefs({ ...prefs, gallery_density: value as GalleryDensity })
                }
              >
                <SelectTrigger id="settings-density">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="compact">Compact</SelectItem>
                  <SelectItem value="comfortable">Comfortable</SelectItem>
                  <SelectItem value="spacious">Spacious</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
          </div>

          <div className="border-t border-border/70 pt-4">
            <p className="text-[12.5px] font-medium">Default map view</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Used when there are no sightings to fit. Leave both coordinates empty to use
              the built-in fallback ({DEFAULT_MAP_CENTER.lat}, {DEFAULT_MAP_CENTER.lng}, zoom{" "}
              {DEFAULT_MAP_CENTER.zoom}).
            </p>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <FormField label="Latitude" htmlFor="settings-lat">
                <Input
                  id="settings-lat"
                  value={prefs.map_center_lat}
                  onChange={(event) =>
                    setPrefs({ ...prefs, map_center_lat: event.target.value })
                  }
                  placeholder={String(DEFAULT_MAP_CENTER.lat)}
                  className="font-mono"
                  inputMode="decimal"
                />
              </FormField>
              <FormField label="Longitude" htmlFor="settings-lng">
                <Input
                  id="settings-lng"
                  value={prefs.map_center_lng}
                  onChange={(event) =>
                    setPrefs({ ...prefs, map_center_lng: event.target.value })
                  }
                  placeholder={String(DEFAULT_MAP_CENTER.lng)}
                  className="font-mono"
                  inputMode="decimal"
                />
              </FormField>
              <FormField label="Zoom level" htmlFor="settings-zoom">
                <Input
                  id="settings-zoom"
                  value={prefs.map_zoom}
                  onChange={(event) =>
                    setPrefs({ ...prefs, map_zoom: event.target.value })
                  }
                  type="number"
                  min="1"
                  max="19"
                  className="font-mono"
                />
              </FormField>
            </div>
          </div>

          {error ? (
            <p className="rounded-md border border-destructive/25 bg-destructive/10 px-3 py-2 text-[12px] text-destructive">
              {error}
            </p>
          ) : null}

          <div className="flex justify-end">
            <Button type="button" onClick={savePreferences} disabled={savingPrefs}>
              {savingPrefs ? <LoaderCircleIcon className="animate-spin" /> : <SaveIcon />}
              Save preferences
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
