import { z } from "zod";

/**
 * Result returned by every Server Action. Lets client forms surface a real
 * error message instead of silently swallowing failures.
 */
export type ActionResult = { ok: true } | { ok: false; error: string };

// ---------- Field helpers ----------
// FormData values arrive as strings (or are absent). These coerce the loose
// form input into well-typed, validated values and treat "" as "not provided".

const optionalId = z.preprocess(
  (v) => (typeof v === "string" && v.trim() !== "" ? v : undefined),
  z.string().uuid().optional(),
);

const nullableUuid = z.preprocess(
  (v) => (typeof v === "string" && v.trim() !== "" ? v : null),
  z.string().uuid("Invalid category").nullable(),
);

const nullableText = (max = 500) =>
  z.preprocess(
    (v) => (typeof v === "string" && v.trim() !== "" ? v.trim() : null),
    z.string().max(max).nullable(),
  );

const today = () => new Date().toISOString().slice(0, 10);

const dateString = z.preprocess(
  (v) => (typeof v === "string" && v.trim() !== "" ? v : undefined),
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date")
    .default(today),
);

const nullableDate = z.preprocess(
  (v) => (typeof v === "string" && v.trim() !== "" ? v : null),
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date").nullable(),
);

const positiveAmount = z.coerce
  .number()
  .positive("Enter an amount greater than 0");

const nonNegativeAmount = z.coerce
  .number()
  .min(0, "Amount can't be negative");

// Optional non-negative amount: empty/absent stays undefined (field not edited).
const optionalNonNegativeAmount = z.preprocess(
  (v) => (typeof v === "string" && v.trim() !== "" ? v : undefined),
  z.coerce.number().min(0, "Amount can't be negative").optional(),
);

const boolFromForm = z.preprocess(
  (v) => v === "on" || v === true || v === "true",
  z.boolean(),
);

// ---------- Entity schemas ----------

export const transactionSchema = z
  .object({
    id: optionalId,
    category_id: nullableUuid,
    amount: positiveAmount,
    type: z.enum(["income", "expense"]),
    date: dateString,
    note: nullableText(500),
    is_recurring: boolFromForm,
    recurrence_interval: z.preprocess(
      (v) => (typeof v === "string" && v.trim() !== "" ? v : null),
      z.enum(["weekly", "monthly", "yearly"]).nullable(),
    ),
  })
  .refine((d) => !d.is_recurring || d.recurrence_interval !== null, {
    message: "Choose how often it recurs",
    path: ["recurrence_interval"],
  });

export const categorySchema = z.object({
  id: optionalId,
  name: z.string().trim().min(1, "Name is required").max(60),
  color: z.preprocess(
    (v) => (typeof v === "string" && v.trim() !== "" ? v : undefined),
    z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/, "Invalid color")
      .default("#6366f1"),
  ),
  icon: z.preprocess(
    (v) => (typeof v === "string" && v.trim() !== "" ? v : undefined),
    z.string().default("circle"),
  ),
});

export const budgetSchema = z.object({
  category_id: nullableUuid,
  amount: nonNegativeAmount, // 0 means "remove this budget"
});

export const goalSchema = z.object({
  id: optionalId,
  name: z.string().trim().min(1, "Name is required").max(80),
  target_amount: positiveAmount,
  current_amount: optionalNonNegativeAmount, // only sent when editing
  deadline: nullableDate,
});

export const accountSchema = z.object({
  id: optionalId,
  name: z.string().trim().min(1, "Name is required").max(60),
  type: z.enum(["checking", "savings", "cash", "credit", "investment"]),
  balance: z.coerce.number(), // can be negative (e.g. a credit card)
  color: z.preprocess(
    (v) => (typeof v === "string" && v.trim() !== "" ? v : undefined),
    z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/, "Invalid color")
      .default("#6366f1"),
  ),
});

export const profileSchema = z.object({
  display_name: nullableText(80),
  currency: z.preprocess(
    (v) => (typeof v === "string" && v.trim() !== "" ? v.toUpperCase() : undefined),
    z
      .string()
      .regex(/^[A-Z]{3}$/, "Use a 3-letter currency code")
      .default("USD"),
  ),
});

export const contributeSchema = z.object({
  id: z.string().uuid(),
  amount: positiveAmount,
});

export const deleteSchema = z.object({
  id: z.string().uuid(),
});

// ---------- Form parsing ----------

/**
 * Validate a FormData against a schema. Returns the parsed data on success or a
 * user-facing message (the first validation issue) on failure.
 */
export function parseForm<S extends z.ZodType>(
  schema: S,
  formData: FormData,
): { ok: true; data: z.infer<S> } | { ok: false; error: string } {
  const raw: Record<string, FormDataEntryValue> = {};
  formData.forEach((value, key) => {
    raw[key] = value;
  });
  const result = schema.safeParse(raw);
  if (!result.success) {
    const issue = result.error.issues[0];
    return { ok: false, error: issue?.message ?? "Please check your input." };
  }
  return { ok: true, data: result.data };
}
