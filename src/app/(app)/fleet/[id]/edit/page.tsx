import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/common/page-header";
import { VehicleForm } from "@/components/vehicles/vehicle-form";
import { getOperatorOptions } from "@/lib/queries/facets";
import { getVehicleDetail } from "@/lib/queries/vehicles";

export const metadata: Metadata = { title: "Edit vehicle" };

export default async function EditVehiclePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [detail, operators] = await Promise.all([
    getVehicleDetail(id),
    getOperatorOptions(),
  ]);

  if (!detail) notFound();

  const title = detail.vehicle.fleet_number
    ? `Edit fleet #${detail.vehicle.fleet_number}`
    : "Edit vehicle";

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Fleet database"
        title={title}
        description="Update the vehicle's specifications, operator or notes. Status changes are recorded separately so its history stays intact."
        back={{ href: `/fleet/${detail.vehicle.id}`, label: "Back to vehicle" }}
      />
      <VehicleForm mode="edit" vehicle={detail.vehicle} operators={operators} />
    </div>
  );
}
