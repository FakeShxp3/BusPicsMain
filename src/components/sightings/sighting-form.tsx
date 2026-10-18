"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Controller, useForm, useWatch } from "react-hook-form";
import { CameraIcon, LoaderCircleIcon, MapPinIcon, SaveIcon } from "lucide-react";
import { toast } from "sonner";
import { createSighting, updateSighting } from "@/lib/actions/sightings";
import type { SightingOverview } from "@/lib/db/database.types";
import type { OperatorOption } from "@/lib/queries/facets";
import type { VehicleOption } from "@/lib/queries/vehicles";
import type { SightingFormValues } from "@/lib/forms/types";
import { MAX_PHOTOS_PER_SIGHTING } from "@/lib/constants";
import type { MapDefaults } from "@/lib/map-types";
import {
  dateTimeLocalToIso,
  isoToDateTimeLocal,
  nowDateTimeLocal,
} from "@/lib/format";
import { FormAlert, FormField, FormSection } from "@/components/forms/form-field";
import { VehiclePicker } from "@/components/forms/vehicle-picker";
import { LocationPicker } from "@/components/map/location-picker";
import {
  PhotoDropzone,
  usePendingPhotos,
} from "@/components/photos/photo-dropzone";
import { SightingSaveProgress } from "@/components/sightings/sighting-save-progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function SightingForm({
  mode,
  sighting,
  vehicles,
  totalVehicles,
  operators,
  routes,
  userId,
  mapDefaults,
  initialVehicleId,
}: {
  mode: "create" | "edit";
  sighting?: SightingOverview;
  vehicles: VehicleOption[];
  totalVehicles: number;
  operators: OperatorOption[];
  routes: string[];
  userId: string;
  mapDefaults: MapDefaults;
  initialVehicleId?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ id: string; vehicleId: string } | null>(null);
  const { photos, addFiles, removePhoto } = usePendingPhotos(MAX_PHOTOS_PER_SIGHTING);

  const {
    register,
    control,
    handleSubmit,
    setValue,
    setError,
    formState: { errors },
  } = useForm<SightingFormValues>({
    defaultValues: {
      vehicle_id: sighting?.vehicle_id ?? initialVehicleId ?? "",
      spotted_at: "",
      route: sighting?.route ?? "",
      direction: sighting?.direction ?? "",
      location_name: sighting?.location_name ?? "",
      latitude: sighting?.latitude !== null && sighting?.latitude !== undefined ? String(sighting.latitude) : "",
      longitude:
        sighting?.longitude !== null && sighting?.longitude !== undefined
          ? String(sighting.longitude)
          : "",
      camera_model: sighting?.camera_model ?? "",
      lens: sighting?.lens ?? "",
      aperture: sighting?.aperture ?? "",
      shutter_speed: sighting?.shutter_speed ?? "",
      iso: sighting?.iso ? String(sighting.iso) : "",
      focal_length: sighting?.focal_length ?? "",
      weather: sighting?.weather ?? "",
      notes: sighting?.notes ?? "",
    },
  });

  useEffect(() => {
    if (mode === "edit" && sighting) {
      setValue("spotted_at", isoToDateTimeLocal(sighting.spotted_at), {
        shouldDirty: false,
      });
    } else {
      setValue("spotted_at", nowDateTimeLocal(), { shouldDirty: false });
    }
  }, [mode, sighting, setValue]);

  const vehicleId = useWatch({ control, name: "vehicle_id" });
  const spottedAt = useWatch({ control, name: "spotted_at" });
  const route = useWatch({ control, name: "route" });
  const locationName = useWatch({ control, name: "location_name" });
  const latitude = useWatch({ control, name: "latitude" }) ?? "";
  const longitude = useWatch({ control, name: "longitude" }) ?? "";

  const selectedVehicle = vehicles.find((vehicle) => vehicle.id === vehicleId);
  const vehicleLabel = selectedVehicle
    ? `Fleet ${selectedVehicle.fleet_number ?? "(unnumbered)"}${selectedVehicle.model ? ` · ${selectedVehicle.model}` : ""}`
    : "Selected vehicle";

  const spottedPreview = (() => {
    if (!spottedAt) return "Not set";
    const date = new Date(spottedAt);
    if (Number.isNaN(date.getTime())) return "Invalid date";
    return new Intl.DateTimeFormat("en-CA", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  })();

  function submit(values: SightingFormValues) {
    setFormError(null);

    if (!values.vehicle_id) {
      setError("vehicle_id", { type: "manual", message: "Choose a vehicle for this sighting." });
      return;
    }
    if (!values.spotted_at) {
      setError("spotted_at", { type: "manual", message: "Choose the date and time." });
      return;
    }
    const spottedAtIso = dateTimeLocalToIso(values.spotted_at);
    if (!spottedAtIso) {
      setError("spotted_at", { type: "manual", message: "Enter a valid date and time." });
      return;
    }

    const hasLatitude = values.latitude.trim() !== "";
    const hasLongitude = values.longitude.trim() !== "";
    if (hasLatitude !== hasLongitude) {
      setError("latitude", {
        type: "manual",
        message: "Latitude and longitude must be entered together.",
      });
      setError("longitude", {
        type: "manual",
        message: "Latitude and longitude must be entered together.",
      });
      return;
    }

    const payload = {
      vehicle_id: values.vehicle_id,
      spotted_at: spottedAtIso,
      route: values.route,
      direction: values.direction,
      location_name: values.location_name,
      latitude: hasLatitude ? values.latitude : null,
      longitude: hasLongitude ? values.longitude : null,
      camera_model: values.camera_model,
      lens: values.lens,
      aperture: values.aperture,
      shutter_speed: values.shutter_speed,
      iso: values.iso.trim() === "" ? null : values.iso,
      focal_length: values.focal_length,
      weather: values.weather,
      notes: values.notes,
    };

    startTransition(async () => {
      const result =
        mode === "create"
          ? await createSighting(payload)
          : await updateSighting(sighting!.id, payload);

      if (!result.ok) {
        setFormError(result.error);
        for (const [key, messages] of Object.entries(result.fieldErrors ?? {})) {
          if (messages?.[0]) {
            setError(key as keyof SightingFormValues, {
              type: "server",
              message: messages[0],
            });
          }
        }
        return;
      }

      if (mode === "edit") {
        toast.success("Sighting updated.");
        router.push(`/sightings/${result.data.id}`);
        router.refresh();
        return;
      }

      if (photos.length > 0) {
        setCreated({ id: result.data.id, vehicleId: result.data.vehicleId });
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }

      toast.success("Sighting recorded.");
      router.push(`/sightings/${result.data.id}`);
      router.refresh();
    });
  }

  if (created) {
    return (
      <SightingSaveProgress
        sightingId={created.id}
        vehicleId={created.vehicleId}
        userId={userId}
        label={vehicleLabel}
        photos={photos}
      />
    );
  }

  return (
    <form
      id="sighting-form"
      onSubmit={handleSubmit(submit)}
      className="space-y-5"
      noValidate
    >
      {formError ? <FormAlert>{formError}</FormAlert> : null}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-5">
          <FormSection
            title="Vehicle"
            description="Choose a bus from your fleet database, or add it without losing this form."
            contentClassName="sm:grid-cols-1"
          >
            <FormField
              label="Vehicle"
              htmlFor="sighting-vehicle"
              required
              error={errors.vehicle_id?.message}
            >
              <Controller
                control={control}
                name="vehicle_id"
                render={({ field }) => (
                  <VehiclePicker
                    id="sighting-vehicle"
                    value={field.value || null}
                    onChange={(value) => field.onChange(value ?? "")}
                    vehicles={vehicles}
                    total={totalVehicles}
                    operators={operators}
                    invalid={Boolean(errors.vehicle_id)}
                  />
                )}
              />
            </FormField>
          </FormSection>

          <FormSection
            title="When and where"
            description="The date defaults to now. Route, direction and coordinates are all optional."
          >
            <FormField
              label="Date and time"
              htmlFor="sighting-date"
              required
              error={errors.spotted_at?.message}
            >
              <Input id="sighting-date" type="datetime-local" {...register("spotted_at")} />
            </FormField>

            <FormField
              label="Route"
              htmlFor="sighting-route"
              hint="Optional"
              error={errors.route?.message}
            >
              <Input
                id="sighting-route"
                {...register("route")}
                list="route-suggestions"
                placeholder="e.g. N19"
                className="font-mono"
                autoComplete="off"
              />
              <datalist id="route-suggestions">
                {routes.map((value) => (
                  <option key={value} value={value} />
                ))}
              </datalist>
            </FormField>

            <FormField
              label="Direction or destination"
              htmlFor="sighting-direction"
              hint="Optional"
              error={errors.direction?.message}
            >
              <Input
                id="sighting-direction"
                {...register("direction")}
                placeholder="e.g. Downtown"
                autoComplete="off"
              />
            </FormField>

            <FormField
              label="Location name"
              htmlFor="sighting-location"
              hint="Optional"
              error={errors.location_name?.message}
              className="sm:col-span-2"
            >
              <Input
                id="sighting-location"
                {...register("location_name")}
                placeholder="e.g. Commercial–Broadway station"
                autoComplete="off"
              />
            </FormField>

            <div className="sm:col-span-2 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[12.5px] font-medium">Map position</p>
                <p className="text-[10.5px] text-muted-foreground">Optional</p>
              </div>
              <LocationPicker
                latitude={latitude.trim() === "" ? null : Number(latitude)}
                longitude={longitude.trim() === "" ? null : Number(longitude)}
                defaults={mapDefaults}
                onChange={(lat, lng) => {
                  setValue("latitude", lat === null ? "" : String(lat), {
                    shouldDirty: true,
                  });
                  setValue("longitude", lng === null ? "" : String(lng), {
                    shouldDirty: true,
                  });
                }}
              />
              {errors.latitude?.message || errors.longitude?.message ? (
                <p className="text-[11.5px] text-destructive">
                  {errors.latitude?.message ?? errors.longitude?.message}
                </p>
              ) : null}
            </div>
          </FormSection>

          <FormSection
            title="Camera and conditions"
            description="Optional photography metadata. Free text is fine for aperture, shutter speed and focal length."
          >
            <FormField label="Camera" htmlFor="sighting-camera" hint="Optional">
              <Input
                id="sighting-camera"
                {...register("camera_model")}
                placeholder="e.g. Sony A7 III"
                autoComplete="off"
              />
            </FormField>
            <FormField label="Lens" htmlFor="sighting-lens" hint="Optional">
              <Input
                id="sighting-lens"
                {...register("lens")}
                placeholder="e.g. 24–70mm f/2.8"
                autoComplete="off"
              />
            </FormField>
            <FormField label="Aperture" htmlFor="sighting-aperture" hint="Optional">
              <Input
                id="sighting-aperture"
                {...register("aperture")}
                placeholder="e.g. f/4"
                className="font-mono"
                autoComplete="off"
              />
            </FormField>
            <FormField label="Shutter speed" htmlFor="sighting-shutter" hint="Optional">
              <Input
                id="sighting-shutter"
                {...register("shutter_speed")}
                placeholder="e.g. 1/500"
                className="font-mono"
                autoComplete="off"
              />
            </FormField>
            <FormField label="ISO" htmlFor="sighting-iso" hint="Optional">
              <Input
                id="sighting-iso"
                {...register("iso")}
                type="number"
                inputMode="numeric"
                min="1"
                max="1000000"
                placeholder="e.g. 400"
                className="font-mono"
              />
            </FormField>
            <FormField label="Focal length" htmlFor="sighting-focal" hint="Optional">
              <Input
                id="sighting-focal"
                {...register("focal_length")}
                placeholder="e.g. 70mm"
                className="font-mono"
                autoComplete="off"
              />
            </FormField>
            <FormField
              label="Weather and lighting"
              htmlFor="sighting-weather"
              hint="Optional"
              className="sm:col-span-2"
            >
              <Input
                id="sighting-weather"
                {...register("weather")}
                placeholder="e.g. Overcast, soft light"
                autoComplete="off"
              />
            </FormField>
          </FormSection>

          {mode === "create" ? (
            <FormSection
              title="Photographs"
              description={`Optional. Up to ${MAX_PHOTOS_PER_SIGHTING} photographs per sighting.`}
              contentClassName="sm:grid-cols-1"
            >
              <PhotoDropzone
                photos={photos}
                addFiles={addFiles}
                removePhoto={removePhoto}
                maxPhotos={MAX_PHOTOS_PER_SIGHTING}
              />
            </FormSection>
          ) : (
            <div className="rounded-lg border border-border bg-muted/25 px-5 py-4">
              <p className="text-[12.5px] font-medium">Photographs are managed on the sighting page</p>
              <p className="mt-0.5 text-[11.5px] leading-relaxed text-muted-foreground">
                This keeps captions, cover choice and ordering together with the images.
                {sighting ? (
                  <>
                    {" "}
                    <Link
                      href={`/sightings/${sighting.id}`}
                      className="text-primary underline-offset-4 hover:underline"
                    >
                      Open the current sighting
                    </Link>
                    .
                  </>
                ) : null}
              </p>
            </div>
          )}

          <FormSection
            title="Notes"
            description="Anything memorable about the sighting."
            contentClassName="sm:grid-cols-1"
          >
            <FormField label="General notes" htmlFor="sighting-notes" hint="Optional">
              <Textarea
                id="sighting-notes"
                {...register("notes")}
                rows={5}
                maxLength={20000}
                placeholder="e.g. Repainted front, running with a full load…"
              />
            </FormField>
          </FormSection>
        </div>

        <aside className="space-y-3 lg:sticky lg:top-20 lg:self-start">
          <Card>
            <CardHeader>
              <CardTitle>Sighting summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-[10px] tracking-wide text-muted-foreground uppercase">
                  Vehicle
                </p>
                <p className="mt-0.5 text-[12.5px] font-medium text-foreground">
                  {vehicleLabel}
                </p>
                {selectedVehicle ? (
                  <p className="text-[11px] text-muted-foreground">
                    {[selectedVehicle.operator_name, selectedVehicle.manufacturer]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                ) : null}
              </div>
              <div className="border-t border-border/70 pt-2.5">
                <p className="text-[10px] tracking-wide text-muted-foreground uppercase">
                  When
                </p>
                <p className="mt-0.5 font-mono text-[11.5px] text-foreground">
                  {spottedPreview}
                </p>
              </div>
              <div className="border-t border-border/70 pt-2.5">
                <p className="text-[10px] tracking-wide text-muted-foreground uppercase">
                  Route and place
                </p>
                <p className="mt-0.5 text-[11.5px] text-foreground">
                  {[route ? `Route ${route}` : null, locationName || null]
                    .filter(Boolean)
                    .join(" · ") || "Not set"}
                </p>
              </div>
              <div className="flex items-center justify-between border-t border-border/70 pt-2.5 text-[11.5px]">
                <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                  <CameraIcon className="size-3.5" />
                  Photographs
                </span>
                <span className="font-mono text-foreground">{photos.length}</span>
              </div>
              <div className="flex items-center justify-between text-[11.5px]">
                <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                  <MapPinIcon className="size-3.5" />
                  Coordinates
                </span>
                <span className="font-mono text-foreground">
                  {latitude && longitude ? "set" : "none"}
                </span>
              </div>

              <Button type="submit" form="sighting-form" className="w-full" disabled={pending}>
                {pending ? (
                  <LoaderCircleIcon className="animate-spin" />
                ) : (
                  <SaveIcon />
                )}
                {mode === "create" ? "Save sighting" : "Save changes"}
              </Button>
              <p className="text-center text-[10.5px] leading-relaxed text-muted-foreground">
                A sighting can be saved without photographs, routes or camera details.
              </p>
            </CardContent>
          </Card>

          <Button asChild variant="ghost" size="sm" className="w-full">
            <Link href={mode === "edit" && sighting ? `/sightings/${sighting.id}` : "/sightings"}>
              Cancel
            </Link>
          </Button>
        </aside>
      </div>

      <div className="sticky bottom-0 z-10 -mx-4 flex items-center justify-between gap-2 border-t border-border bg-background/95 px-4 py-3 backdrop-blur-sm sm:-mx-6 sm:px-6 lg:hidden">
        <p className="text-[11px] text-muted-foreground">
          {vehicleLabel} · {spottedPreview}
        </p>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? <LoaderCircleIcon className="animate-spin" /> : <SaveIcon />}
          Save
        </Button>
      </div>
    </form>
  );
}
