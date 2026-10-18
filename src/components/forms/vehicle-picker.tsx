"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  BusFrontIcon,
  CheckIcon,
  LoaderCircleIcon,
  PlusIcon,
  SearchIcon,
} from "lucide-react";
import { toast } from "sonner";
import { createVehicle } from "@/lib/actions/vehicles";
import type { VehicleOption } from "@/lib/queries/vehicles";
import type { OperatorOption } from "@/lib/queries/facets";
import type { VehicleStatus } from "@/lib/db/database.types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FormField } from "@/components/forms/form-field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/vehicles/status-badge";

type VehiclePickerProps = {
  id?: string;
  value: string | null;
  onChange: (vehicleId: string | null) => void;
  vehicles: VehicleOption[];
  total: number;
  operators: OperatorOption[];
  disabled?: boolean;
  invalid?: boolean;
};

const CATEGORY_OPTIONS = [
  "Standard bus",
  "Articulated bus",
  "Double-decker bus",
  "Trolleybus",
  "Minibus",
  "Coach",
  "Other",
];

export function VehiclePicker({
  id,
  value,
  onChange,
  vehicles,
  total,
  operators,
  disabled,
  invalid,
}: VehiclePickerProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"list" | "create">("list");
  const [query, setQuery] = useState("");
  const [createdVehicle, setCreatedVehicle] = useState<VehicleOption | null>(null);

  const selected =
    vehicles.find((vehicle) => vehicle.id === value) ??
    (createdVehicle?.id === value ? createdVehicle : null);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    const base = term
      ? vehicles.filter((vehicle) =>
          [vehicle.fleet_number, vehicle.operator_name, vehicle.manufacturer, vehicle.model]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(term),
        )
      : vehicles;
    return base.slice(0, 60);
  }, [query, vehicles]);

  function closeDialog() {
    setOpen(false);
    setTimeout(() => {
      setMode("list");
      setQuery("");
    }, 150);
  }

  return (
    <>
      <button
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className={cn(
          "flex w-full items-center gap-3 rounded-md border border-input bg-card px-3 py-2.5 text-left shadow-xs transition-colors hover:border-primary/40 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60",
          invalid && "border-destructive",
        )}
      >
        <span className="grid size-9 shrink-0 place-items-center rounded border border-border bg-muted/60 text-muted-foreground">
          <BusFrontIcon className="size-4" />
        </span>
        {selected ? (
          <span className="min-w-0 flex-1">
            <span className="flex items-baseline gap-2">
              <span className="font-mono text-sm font-semibold text-foreground">
                {selected.fleet_number ? `#${selected.fleet_number}` : "No fleet number"}
              </span>
              <StatusBadge status={selected.status} />
            </span>
            <span className="mt-0.5 block truncate text-[11.5px] text-muted-foreground">
              {[selected.operator_name, selected.manufacturer, selected.model]
                .filter(Boolean)
                .join(" · ") || "No further details"}
            </span>
          </span>
        ) : (
          <span className="flex-1">
            <span className="block text-[13px] font-medium text-foreground">
              Select a vehicle
            </span>
            <span className="mt-0.5 block text-[11.5px] text-muted-foreground">
              Search your fleet database or add a new vehicle
            </span>
          </span>
        )}
        <span className="shrink-0 text-[11px] font-medium text-primary">Choose</span>
      </button>

      <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : closeDialog())}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {mode === "list" ? "Choose a vehicle" : "Add a vehicle to your fleet"}
            </DialogTitle>
            <DialogDescription>
              {mode === "list"
                ? "Your sighting form stays exactly as it is while you look around."
                : "Only a fleet number or model is enough. You can complete the record later."}
            </DialogDescription>
          </DialogHeader>

          {mode === "list" ? (
            <div className="space-y-3">
              <div className="relative">
                <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  autoFocus
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Fleet number, operator, model…"
                  className="pl-8"
                  aria-label="Filter vehicles"
                />
              </div>

              <div className="scrollbar-thin max-h-[46vh] space-y-1 overflow-y-auto rounded-md border border-border p-1">
                {filtered.length === 0 ? (
                  <div className="px-3 py-8 text-center">
                    <p className="text-[13px] font-medium">No matching vehicles</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {total === 0
                        ? "Your fleet database is empty. Add the first vehicle to record this sighting."
                        : "Try a different fleet number, model or operator."}
                    </p>
                  </div>
                ) : (
                  filtered.map((vehicle) => {
                    const active = vehicle.id === value;
                    return (
                      <button
                        key={vehicle.id}
                        type="button"
                        onClick={() => {
                          onChange(vehicle.id);
                          closeDialog();
                        }}
                        className={cn(
                          "flex w-full items-center gap-2.5 rounded px-2 py-2 text-left transition-colors",
                          active ? "bg-primary/10" : "hover:bg-muted",
                        )}
                      >
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-baseline gap-2">
                            <span className="font-mono text-[13px] font-semibold">
                              {vehicle.fleet_number ? `#${vehicle.fleet_number}` : "No fleet no."}
                            </span>
                            <StatusBadge status={vehicle.status} />
                          </span>
                          <span className="mt-0.5 block truncate text-[11.5px] text-muted-foreground">
                            {[vehicle.operator_name, vehicle.manufacturer, vehicle.model]
                              .filter(Boolean)
                              .join(" · ") || "No further details"}
                          </span>
                        </span>
                        {active ? <CheckIcon className="size-4 text-primary" /> : null}
                      </button>
                    );
                  })
                )}
              </div>

              {total > vehicles.length ? (
                <p className="text-[11px] text-muted-foreground">
                  Showing the first {vehicles.length} of {total} vehicles. Refine your
                  search to narrow the list.
                </p>
              ) : null}

              <div className="flex flex-col-reverse gap-2 border-t border-border/70 pt-3 sm:flex-row sm:items-center sm:justify-between">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (value) {
                      onChange(null);
                      closeDialog();
                    }
                  }}
                  disabled={!value}
                >
                  Clear selection
                </Button>
                <Button type="button" size="sm" onClick={() => setMode("create")}>
                  <PlusIcon />
                  New vehicle
                </Button>
              </div>
            </div>
          ) : (
            <CreateVehicleForm
              operators={operators}
              onCancel={() => setMode("list")}
              onCreated={(vehicle) => {
                setCreatedVehicle(vehicle);
                onChange(vehicle.id);
                toast.success(
                  vehicle.fleet_number
                    ? `Vehicle #${vehicle.fleet_number} added to your fleet.`
                    : "Vehicle added to your fleet.",
                );
                router.refresh();
                closeDialog();
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function CreateVehicleForm({
  operators,
  onCreated,
  onCancel,
}: {
  operators: OperatorOption[];
  onCreated: (vehicle: VehicleOption) => void;
  onCancel: () => void;
}) {
  const [fleetNumber, setFleetNumber] = useState("");
  const [operatorId, setOperatorId] = useState<string>("none");
  const [manufacturer, setManufacturer] = useState("");
  const [model, setModel] = useState("");
  const [category, setCategory] = useState<string>("none");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [pending, startTransition] = useTransition();

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});
    startTransition(async () => {
      const result = await createVehicle({
        fleet_number: fleetNumber,
        operator_id: operatorId === "none" ? null : operatorId,
        manufacturer,
        model,
        vehicle_category: category === "none" ? null : category,
        status: "unknown" as VehicleStatus,
      });

      if (!result.ok) {
        setError(result.error);
        setFieldErrors(result.fieldErrors ?? {});
        return;
      }

      const operator = operators.find((entry) => entry.id === operatorId);
      onCreated({
        id: result.data.id,
        fleet_number: fleetNumber.trim() || null,
        operator_name: operator?.name ?? null,
        manufacturer: manufacturer.trim() || null,
        model: model.trim() || null,
        status: "unknown",
        last_spotted_at: null,
      });
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      {error ? (
        <div
          role="alert"
          className="rounded-md border border-destructive/25 bg-destructive/10 px-3 py-2 text-[12px] text-destructive"
        >
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <FormField
          label="Fleet number"
          htmlFor="quick-fleet"
          error={fieldErrors.fleet_number?.[0]}
          hint="Optional"
        >
          <Input
            id="quick-fleet"
            value={fleetNumber}
            onChange={(event) => setFleetNumber(event.target.value)}
            placeholder="e.g. 1204"
            autoFocus
          />
        </FormField>

        <FormField label="Operator" htmlFor="quick-operator" hint="Optional">
          <Select value={operatorId} onValueChange={setOperatorId}>
            <SelectTrigger id="quick-operator">
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
        </FormField>

        <FormField label="Manufacturer" htmlFor="quick-manufacturer" hint="Optional">
          <Input
            id="quick-manufacturer"
            value={manufacturer}
            onChange={(event) => setManufacturer(event.target.value)}
            placeholder="e.g. New Flyer"
          />
        </FormField>

        <FormField label="Model" htmlFor="quick-model" hint="Optional">
          <Input
            id="quick-model"
            value={model}
            onChange={(event) => setModel(event.target.value)}
            placeholder="e.g. XN40"
          />
        </FormField>

        <FormField
          label="Category"
          htmlFor="quick-category"
          hint="Optional"
          className="sm:col-span-2"
        >
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger id="quick-category">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Not specified</SelectItem>
              {CATEGORY_OPTIONS.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
      </div>

      <p className="text-[11px] leading-relaxed text-muted-foreground">
        Technical details, status and photographs can be added later from the
        vehicle page.
      </p>

      <div className="flex flex-col-reverse gap-2 border-t border-border/70 pt-3 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={pending}>
          Back
        </Button>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? <LoaderCircleIcon className="animate-spin" /> : null}
          {pending ? "Adding…" : "Add vehicle"}
        </Button>
      </div>
    </form>
  );
}
