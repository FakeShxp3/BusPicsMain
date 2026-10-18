import { createClient } from "@/lib/supabase/server";
import type { OperatorOverview } from "@/lib/db/database.types";

export async function listOperators(): Promise<OperatorOverview[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("operator_overview")
    .select("*")
    .order("name", { ascending: true });

  if (error) throw new Error(`Could not load operators: ${error.message}`);
  return data ?? [];
}

export async function getOperator(
  operatorId: string,
): Promise<OperatorOverview | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("operator_overview")
    .select("*")
    .eq("id", operatorId)
    .maybeSingle();

  if (error) throw new Error(`Could not load operator: ${error.message}`);
  return data;
}
