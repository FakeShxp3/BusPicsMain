import type { Metadata } from "next";
import { PageHeader } from "@/components/common/page-header";
import { OperatorsManager } from "@/components/operators/operators-manager";
import { listOperators } from "@/lib/queries/operators";

export const metadata: Metadata = { title: "Operators" };

export default async function OperatorsPage() {
  const operators = await listOperators();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Library · operators"
        title="Operators"
        description="The transit agencies, companies and collections your fleet belongs to. Nothing is limited to one city or numbering system."
        back={{ href: "/fleet", label: "Fleet database" }}
      />
      <OperatorsManager operators={operators} />
    </div>
  );
}
