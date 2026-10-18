import { z } from "zod";
import type { ActionResult } from "@/lib/types";

export function invalidInput(error: z.ZodError): ActionResult<never> {
  const fieldErrors = z.flattenError(error).fieldErrors as Record<
    string,
    string[]
  >;
  const firstMessage = Object.values(fieldErrors)
    .flat()
    .find((message): message is string => Boolean(message));
  return {
    ok: false,
    error: firstMessage ?? "Please correct the highlighted fields.",
    fieldErrors,
  };
}

export function dbFailure(scope: string, error: unknown): ActionResult<never> {
  console.error(`[transitspotter] ${scope} failed:`, error);
  return {
    ok: false,
    error:
      "The operation could not be completed. Please check your connection and try again.",
  };
}

export function notFoundFailure(message: string): ActionResult<never> {
  return { ok: false, error: message };
}

export function conflictFailure(
  message: string,
  field: string,
): ActionResult<never> {
  return { ok: false, error: message, fieldErrors: { [field]: [message] } };
}

export function isUniqueViolation(error: { code?: string } | null): boolean {
  return error?.code === "23505";
}

export function isForeignKeyViolation(error: { code?: string } | null): boolean {
  return error?.code === "23503";
}
