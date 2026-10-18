"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { LoaderCircleIcon, SaveIcon } from "lucide-react";
import { toast } from "sonner";
import { createVehicle, updateVehicle } from "@/lib/actions/vehicles";
import type { VehicleOverview, VehicleStatus } from "@/lib/db/database.types";
import type { OperatorOption } from "@/lib/queries/facets";
import type { VehicleFormValues } from "@/lib/forms/types";
import {
  MANUFACTURER_SUGGESTIONS,
  POWERTRAIN_SUGGESTIONS,
  VEHICLE_CATEGORY_SUGGESTIONS,
  VEHICLE_STATUSES,
  VEHICLE_STATUS_LABELS,
} from "@/lib/constants";
import { FormAlert, FormField, FormSection } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function VehicleForm({
  mode,
  vehicle,
  operators,
}: {
  mode: "create" | "edit";
  vehicle?: VehicleOverview;
  operators: OperatorOption[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isDirty },
  } = useForm<VehicleFormValues>({
    defaultValues: {
      operator_id: vehicle?.operator_id ?? "",
      fleet_number: vehicle?.fleet_number ?? "",
      manufacturer: vehicle?.manufacturer ?? "",
      model: vehicle?.model ?? "",
      generation: vehicle?.generation ?? "",
      vehicle_category: vehicle?.vehicle_category ?? "",
      powertrain: vehicle?.powertrain ?? "",
      length_m:
        vehicle?.length_m !== null && vehicle?.length_m !== undefined
          ? String(vehicle.length_m)
          : "",
      model_year: vehicle?.model_year ? String(vehicle.model_year) : "",
      in_service_year: vehicle?.in_service_year ? String(vehicle.in_service_year) : "",
      notes: vehicle?.notes ?? "",
      status: (vehicle?.status ?? "unknown") as VehicleStatus,
      status_verified_on: vehicle?.status_verified_on ?? "",
      status_note: "",
    },
  });

  function submit(values: VehicleFormValues) {
    setFormError(null);

    if (
      !values.fleet_number.trim() &&
      !values.manufacturer.trim() &&
      !values.model.trim()
    ) {
      setFormError(
        "Add at least a fleet number, manufacturer or model so you can recognise this vehicle later.",
      );
      document.getElementById("vehicle-fleet-number")?.focus();
      return;
    }

    const payload = {
      operator_id: values.operator_id || null,
      fleet_number: values.fleet_number,
      manufacturer: values.manufacturer,
      model: values.model,
      generation: values.generation,
      vehicle_category: values.vehicle_category,
      powertrain: values.powertrain,
      length_m: values.length_m === "" ? null : values.length_m,
      model_year: values.model_year === "" ? null : values.model_year,
      in_service_year: values.in_service_year === "" ? null : values.in_service_year,
      notes: values.notes,
      ...(mode === "create"
        ? {
            status: values.status,
            status_verified_on: values.status_verified_on || null,
            status_note: values.status_note,
          }
        : {}),
    };

    startTransition(async () => {
      const result =
        mode === "create"
          ? await createVehicle(payload)
          : await updateVehicle(vehicle!.id, payload);

      if (!result.ok) {
        setFormError(result.error);
        const fieldErrors = result.fieldErrors ?? {};
        for (const [key, messages] of Object.entries(fieldErrors)) {
          if (messages && messages[0]) {
            setError(key as keyof VehicleFormValues, {
              type: "server",
              message: messages[0],
            });
          }
        }
        return;
      }

      toast.success(
        mode === "create"
          ? "Vehicle added to your fleet."
          : "Vehicle details updated.",
      );
      router.push(`/fleet/${mode === "create" ? result.data.id : vehicle!.id}`);
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-5" noValidate>
      {formError ? <FormAlert>{formError}</FormAlert> : null}

      <FormSection
        title="Vehicle identity"
        description="Only what you know. Fleet numbers and specifications can be filled in later."
        action={
          <Link
            href="/operators"
            target="_blank"
            className="text-[11px] text-primary underline-offset-4 hover:underline"
          >
            Manage operators
          </Link>
        }
      >
        <FormField label="Operator" htmlFor="vehicle-operator" hint="Optional">
          <Controller
            control={control}
            name="operator_id"
            render={({ field }) => (
              <Select
                value={field.value || "none"}
                onValueChange={(value) => field.onChange(value === "none" ? "" : value)}
              >
                <SelectTrigger id="vehicle-operator">
                  <SelectValue placeholder="Select operator" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No operator</SelectItem>
                  {operators.map((operator) => (
                    <SelectItem key={operator.id} value={operator.id}>
                      {operator.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </FormField>

        <FormField
          label="Fleet number"
          htmlFor="vehicle-fleet-number"
          hint="Optional"
          error={errors.fleet_number?.message}
        >
          <Input
            id="vehicle-fleet-number"
            {...register("fleet_number")}
            placeholder="e.g. 1204"
            autoComplete="off"
            className="font-mono"
          />
        </FormField>

        <FormField
          label="Manufacturer"
          htmlFor="vehicle-manufacturer"
          hint="Optional"
          error={errors.manufacturer?.message}
        >
          <Input
            id="vehicle-manufacturer"
            {...register("manufacturer")}
            list="manufacturer-suggestions"
            placeholder="e.g. New Flyer"
            autoComplete="off"
          />
          <datalist id="manufacturer-suggestions">
            {MANUFACTURER_SUGGESTIONS.map((value) => (
              <option key={value} value={value} />
            ))}
          </datalist>
        </FormField>

        <FormField
          label="Model"
          htmlFor="vehicle-model"
          hint="Optional"
          error={errors.model?.message}
        >
          <Input
            id="vehicle-model"
            {...register("model")}
            placeholder="e.g. XN40"
            autoComplete="off"
          />
        </FormField>

        <FormField
          label="Generation / variant"
          htmlFor="vehicle-generation"
          hint="Optional"
          error={errors.generation?.message}
        >
          <Input
            id="vehicle-generation"
            {...register("generation")}
            placeholder="e.g. 2019 facelift"
            autoComplete="off"
          />
        </FormField>

        <FormField
          label="Vehicle category"
          htmlFor="vehicle-category"
          hint="Free text"
          error={errors.vehicle_category?.message}
        >
          <Input
            id="vehicle-category"
            {...register("vehicle_category")}
            list="category-suggestions"
            placeholder="e.g. Articulated bus"
            autoComplete="off"
          />
          <datalist id="category-suggestions">
            {VEHICLE_CATEGORY_SUGGESTIONS.map((value) => (
              <option key={value} value={value} />
            ))}
          </datalist>
        </FormField>

        <FormField
          label="Powertrain"
          htmlFor="vehicle-powertrain"
          hint="Free text"
          error={errors.powertrain?.message}
        >
          <Input
            id="vehicle-powertrain"
            {...register("powertrain")}
            list="powertrain-suggestions"
            placeholder="e.g. Battery-electric"
            autoComplete="off"
          />
          <datalist id="powertrain-suggestions">
            {POWERTRAIN_SUGGESTIONS.map((value) => (
              <option key={value} value={value} />
            ))}
          </datalist>
        </FormField>
      </FormSection>

      <FormSection
        title="Technical details"
        description="All optional. Length is stored in metres and shown in your preferred units."
      >
        <FormField
          label="Length (metres)"
          htmlFor="vehicle-length"
          hint="Optional"
          error={errors.length_m?.message}
        >
          <Input
            id="vehicle-length"
            {...register("length_m")}
            type="number"
            inputMode="decimal"
            step="0.1"
            min="0"
            max="60"
            placeholder="e.g. 12.2"
          />
        </FormField>

        <FormField
          label="Model year"
          htmlFor="vehicle-model-year"
          hint="Optional"
          error={errors.model_year?.message}
        >
          <Input
            id="vehicle-model-year"
            {...register("model_year")}
            type="number"
            inputMode="numeric"
            min="1900"
            max="2200"
            placeholder="e.g. 2021"
            className="font-mono"
          />
        </FormField>

        <FormField
          label="In-service year"
          htmlFor="vehicle-in-service-year"
          hint="If known"
          error={errors.in_service_year?.message}
        >
          <Input
            id="vehicle-in-service-year"
            {...register("in_service_year")}
            type="number"
            inputMode="numeric"
            min="1900"
            max="2200"
            placeholder="e.g. 2022"
            className="font-mono"
          />
        </FormField>
      </FormSection>

      {mode === "create" ? (
        <FormSection
          title="Recorded status"
          description="Status is maintained manually by you. Nothing is synchronised with a transit agency."
        >
          <FormField label="Status" htmlFor="vehicle-status" hint="Manually maintained">
            <Controller
              control={control}
              name="status"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={(value) => field.onChange(value as VehicleStatus)}
                >
                  <SelectTrigger id="vehicle-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VEHICLE_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {VEHICLE_STATUS_LABELS[status]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>

          <FormField
            label="Status verified on"
            htmlFor="vehicle-status-date"
            hint="Optional"
            error={errors.status_verified_on?.message}
          >
            <Input
              id="vehicle-status-date"
              type="date"
              {...register("status_verified_on")}
            />
          </FormField>

          <FormField
            label="Status note"
            htmlFor="vehicle-status-note"
            hint="Saved to status history"
            className="sm:col-span-2"
            error={errors.status_note?.message}
          >
            <Input
              id="vehicle-status-note"
              {...register("status_note")}
              placeholder="e.g. Seen in service on route 25"
              maxLength={5000}
            />
          </FormField>
        </FormSection>
      ) : (
        <div className="rounded-lg border border-border bg-muted/25 px-5 py-4">
          <p className="text-[12.5px] font-medium text-foreground">Status is changed from the vehicle page</p>
          <p className="mt-0.5 text-[11.5px] leading-relaxed text-muted-foreground">
            Every change is appended to the status history with its date and note.
            Open the vehicle and choose{" "}
            <span className="font-medium text-foreground">Update status</span> to make a
            change.
          </p>
        </div>
      )}

      <FormSection
        title="Notes"
        description="Condition, depot, unusual details, or anything worth remembering."
        contentClassName="sm:grid-cols-1"
      >
        <FormField label="General notes" htmlFor="vehicle-notes" hint="Optional" error={errors.notes?.message}>
          <Textarea
            id="vehicle-notes"
            {...register("notes")}
            rows={5}
            placeholder="e.g. Ex-demo unit, repainted front end in 2023…"
            maxLength={20000}
          />
        </FormField>
      </FormSection>

      <div className="sticky bottom-0 z-10 -mx-4 flex flex-wrap items-center justify-between gap-2 border-t border-border bg-background/95 px-4 py-3 backdrop-blur-sm sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <p className="text-[11px] text-muted-foreground">
          {mode === "edit"
            ? isDirty
              ? "You have unsaved changes."
              : "No changes yet."
            : "Nothing is saved until you press Save vehicle."}
        </p>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm" disabled={pending}>
            <Link href={mode === "edit" && vehicle ? `/fleet/${vehicle.id}` : "/fleet"}>
              Cancel
            </Link>
          </Button>
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? <LoaderCircleIcon className="animate-spin" /> : <SaveIcon />}
            {mode === "create" ? "Save vehicle" : "Save changes"}
          </Button>
        </div>
      </div>
    </form>
  );
}
