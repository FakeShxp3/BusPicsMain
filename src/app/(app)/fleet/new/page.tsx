import type { Metadata } from "next";
import { PageHeader } from "@/components/common/page-header";
import { VehicleForm } from "@/components/vehicles/vehicle-form";
import { getOperatorOptions } from "@/lib/queries/facets";

export const metadata: Metadata = { title: "Add vehicle" };

export default async function NewVehiclePage() {
  const operators = await getOperatorOptions();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Fleet database"
        title="Add a vehicle"
        description="Start with what you know. Everything except the vehicle's identity can be filled in later, and nothing is shared publicly."
        back={{ href: "/fleet", label: "Fleet database" }}
      />
      <VehicleForm mode="create" operators={operators} />
    </div>
  );
}
