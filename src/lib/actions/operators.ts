"use server";

import { revalidatePath } from "next/cache";
import { createClient, requireUser } from "@/lib/supabase/server";
import { operatorSchema } from "@/lib/validation/schemas";
import type { ActionResult } from "@/lib/types";
import {
  conflictFailure,
  dbFailure,
  invalidInput,
  isUniqueViolation,
  notFoundFailure,
} from "@/lib/actions/shared";
import { z } from "zod";

const idSchema = z.string().uuid("Invalid operator identifier");

function revalidateOperatorSurfaces() {
  revalidatePath("/operators");
  revalidatePath("/fleet");
  revalidatePath("/dashboard");
  revalidatePath("/settings");
}

export async function createOperator(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const parsed = operatorSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);

  const user = await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("operators")
    .insert({ user_id: user.id, ...parsed.data })
    .select("id")
    .single();

  if (error) {
    if (isUniqueViolation(error)) {
      return conflictFailure(
        "You already have an operator with that name.",
        "name",
      );
    }
    return dbFailure("create operator", error);
  }

  revalidateOperatorSurfaces();
  return { ok: true, data: { id: data.id } };
}

export async function updateOperator(
  operatorId: string,
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const id = idSchema.safeParse(operatorId);
  if (!id.success) return notFoundFailure("Invalid operator identifier.");
  const parsed = operatorSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);

  await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("operators")
    .update(parsed.data)
    .eq("id", id.data)
    .select("id")
    .maybeSingle();

  if (error) {
    if (isUniqueViolation(error)) {
      return conflictFailure(
        "You already have an operator with that name.",
        "name",
      );
    }
    return dbFailure("update operator", error);
  }
  if (!data) return notFoundFailure("Operator not found.");

  revalidateOperatorSurfaces();
  revalidatePath(`/operators/${id.data}`);
  return { ok: true, data: { id: data.id } };
}

export async function deleteOperator(
  operatorId: string,
): Promise<ActionResult<{ unlinkedVehicles: number }>> {
  const id = idSchema.safeParse(operatorId);
  if (!id.success) return notFoundFailure("Invalid operator identifier.");

  await requireUser();
  const supabase = await createClient();

  const { count } = await supabase
    .from("vehicles")
    .select("*", { count: "exact", head: true })
    .eq("operator_id", id.data);

  const { error } = await supabase
    .from("operators")
    .delete()
    .eq("id", id.data)
    .select("id")
    .maybeSingle();

  if (error) return dbFailure("delete operator", error);

  revalidateOperatorSurfaces();
  return { ok: true, data: { unlinkedVehicles: count ?? 0 } };
}
