"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BusFrontIcon,
  CameraIcon,
  LoaderCircleIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
  UsersIcon,
} from "lucide-react";
import { toast } from "sonner";
import {
  createOperator,
  deleteOperator,
  updateOperator,
} from "@/lib/actions/operators";
import type { OperatorOverview } from "@/lib/db/database.types";
import { OWNERSHIP_TYPE_SUGGESTIONS } from "@/lib/constants";
import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormAlert, FormField } from "@/components/forms/form-field";

type FormState = {
  name: string;
  abbreviation: string;
  region: string;
  ownership_type: string;
  notes: string;
};

const EMPTY_FORM: FormState = {
  name: "",
  abbreviation: "",
  region: "",
  ownership_type: "",
  notes: "",
};

export function OperatorsManager({ operators }: { operators: OperatorOverview[] }) {
  const router = useRouter();
  const [dialog, setDialog] = useState<
    { mode: "create" } | { mode: "edit"; operator: OperatorOverview } | null
  >(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [deleting, setDeleting] = useState<OperatorOverview | null>(null);
  const [pending, startTransition] = useTransition();

  function openCreate() {
    setForm(EMPTY_FORM);
    setError(null);
    setFieldErrors({});
    setDialog({ mode: "create" });
  }

  function openEdit(operator: OperatorOverview) {
    setForm({
      name: operator.name,
      abbreviation: operator.abbreviation ?? "",
      region: operator.region ?? "",
      ownership_type: operator.ownership_type ?? "",
      notes: operator.notes ?? "",
    });
    setError(null);
    setFieldErrors({});
    setDialog({ mode: "edit", operator });
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});
    startTransition(async () => {
      const result = dialog?.mode === "edit"
        ? await updateOperator(dialog.operator.id, form)
        : await createOperator(form);

      if (!result.ok) {
        setError(result.error);
        setFieldErrors(result.fieldErrors ?? {});
        return;
      }

      toast.success(dialog?.mode === "edit" ? "Operator updated." : "Operator added.");
      setDialog(null);
      router.refresh();
    });
  }

  function confirmDelete() {
    if (!deleting) return;
    startTransition(async () => {
      const result = await deleteOperator(deleting.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setDeleting(null);
      toast.success(
        result.data.unlinkedVehicles > 0
          ? `Operator deleted. ${result.data.unlinkedVehicles} vehicle(s) kept but unlinked.`
          : "Operator deleted.",
      );
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[12px] text-muted-foreground">
          {operators.length} operator{operators.length === 1 ? "" : "s"} · used to group
          your fleet
        </p>
        <Button type="button" size="sm" onClick={openCreate}>
          <PlusIcon />
          Add operator
        </Button>
      </div>

      {operators.length === 0 ? (
        <EmptyState
          icon={UsersIcon}
          eyebrow="No operators yet"
          title="Add the transit operators you photograph"
          description="Operators group your fleet and appear in filters, statistics and exports. They are entirely yours to define — no built-in city or agency list."
          action={
            <Button type="button" onClick={openCreate}>
              <PlusIcon />
              Add first operator
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {operators.map((operator) => (
            <Card key={operator.id} className="flex flex-col">
              <CardHeader className="flex-row items-start justify-between gap-2">
                <div className="min-w-0">
                  <CardTitle className="truncate text-[14px]">{operator.name}</CardTitle>
                  <p className="mt-0.5 font-mono text-[10.5px] tracking-wide text-muted-foreground uppercase">
                    {operator.abbreviation ?? "No abbreviation"}
                  </p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Actions for ${operator.name}`}
                    >
                      <MoreHorizontalIcon />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    <DropdownMenuItem onSelect={() => openEdit(operator)}>
                      <PencilIcon />
                      Edit operator
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href={`/fleet?operator=${operator.id}`}>
                        <BusFrontIcon />
                        View fleet
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      onSelect={() => setDeleting(operator)}
                    >
                      <TrashIcon />
                      Delete operator
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-3">
                <p className="text-[11.5px] text-muted-foreground">
                  {[operator.region, operator.ownership_type]
                    .filter(Boolean)
                    .join(" · ") || "No region or ownership recorded"}
                </p>

                <div className="grid grid-cols-3 gap-2 border-y border-border/70 py-2.5">
                  <div>
                    <p className="numeric text-sm font-semibold text-foreground">
                      {operator.vehicle_count}
                    </p>
                    <p className="text-[9.5px] tracking-wide text-muted-foreground uppercase">
                      Vehicles
                    </p>
                  </div>
                  <div>
                    <p className="numeric text-sm font-semibold text-foreground">
                      {operator.sighting_count}
                    </p>
                    <p className="text-[9.5px] tracking-wide text-muted-foreground uppercase">
                      Sightings
                    </p>
                  </div>
                  <div>
                    <p className="numeric text-sm font-semibold text-foreground">
                      {operator.photo_count}
                    </p>
                    <p className="text-[9.5px] tracking-wide text-muted-foreground uppercase">
                      Photos
                    </p>
                  </div>
                </div>

                {operator.notes ? (
                  <p className="line-clamp-3 text-[11.5px] leading-relaxed text-muted-foreground">
                    {operator.notes}
                  </p>
                ) : null}

                <div className="mt-auto flex items-center justify-between gap-2 pt-1">
                  <Link
                    href={`/fleet?operator=${operator.id}`}
                    className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
                  >
                    <BusFrontIcon className="size-3" />
                    View vehicles
                  </Link>
                  <Link
                    href={`/sightings?operator=${operator.id}`}
                    className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
                  >
                    <CameraIcon className="size-3" />
                    Sightings
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog
        open={dialog !== null}
        onOpenChange={(open) => {
          if (!open) setDialog(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialog?.mode === "edit" ? "Edit operator" : "Add operator"}
            </DialogTitle>
            <DialogDescription>
              Operators are personal to your archive. Add any agency, company or
              museum, in any city or country.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={submit} className="space-y-3" noValidate>
            {error ? <FormAlert>{error}</FormAlert> : null}

            <FormField
              label="Name"
              htmlFor="operator-name"
              required
              error={fieldErrors.name?.[0]}
            >
              <Input
                id="operator-name"
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                placeholder="e.g. TransLink"
                autoFocus
                maxLength={120}
              />
            </FormField>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FormField
                label="Abbreviation"
                htmlFor="operator-abbreviation"
                hint="Optional"
                error={fieldErrors.abbreviation?.[0]}
              >
                <Input
                  id="operator-abbreviation"
                  value={form.abbreviation}
                  onChange={(event) =>
                    setForm({ ...form, abbreviation: event.target.value })
                  }
                  placeholder="e.g. TL"
                  className="font-mono"
                  maxLength={24}
                />
              </FormField>

              <FormField
                label="Region"
                htmlFor="operator-region"
                hint="Optional"
                error={fieldErrors.region?.[0]}
              >
                <Input
                  id="operator-region"
                  value={form.region}
                  onChange={(event) => setForm({ ...form, region: event.target.value })}
                  placeholder="e.g. Metro Vancouver, BC"
                  maxLength={120}
                />
              </FormField>
            </div>

            <FormField
              label="Ownership"
              htmlFor="operator-ownership"
              hint="Optional"
              error={fieldErrors.ownership_type?.[0]}
            >
              <Input
                id="operator-ownership"
                value={form.ownership_type}
                onChange={(event) =>
                  setForm({ ...form, ownership_type: event.target.value })
                }
                list="ownership-type-suggestions"
                placeholder="e.g. Public"
                maxLength={60}
              />
              <datalist id="ownership-type-suggestions">
                {OWNERSHIP_TYPE_SUGGESTIONS.map((value) => (
                  <option key={value} value={value} />
                ))}
              </datalist>
            </FormField>

            <FormField
              label="Notes"
              htmlFor="operator-notes"
              hint="Optional"
              error={fieldErrors.notes?.[0]}
            >
              <Textarea
                id="operator-notes"
                value={form.notes}
                onChange={(event) => setForm({ ...form, notes: event.target.value })}
                rows={3}
                maxLength={10000}
                placeholder="Livery notes, operating area, anything useful…"
              />
            </FormField>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialog(null)}
                disabled={pending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? <LoaderCircleIcon className="animate-spin" /> : null}
                {dialog?.mode === "edit" ? "Save changes" : "Add operator"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleting?.name}?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-[13px] leading-relaxed text-muted-foreground">
                <p>
                  The operator will be removed. Vehicles and sightings are{" "}
                  <span className="font-medium text-foreground">kept</span>, but their
                  operator link is cleared.
                </p>
                {deleting && deleting.vehicle_count > 0 ? (
                  <p>
                    {deleting.vehicle_count} vehicle
                    {deleting.vehicle_count === 1 ? "" : "s"} will become unlinked.
                  </p>
                ) : null}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Keep operator</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                confirmDelete();
              }}
              disabled={pending}
            >
              {pending ? <LoaderCircleIcon className="animate-spin" /> : <TrashIcon />}
              Delete operator
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
