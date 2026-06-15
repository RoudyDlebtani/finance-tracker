/**
 * Seed realistic demo data for an existing user.
 *
 * Prereqs (see .env.local):
 *   - SUPABASE_SERVICE_ROLE_KEY  (Supabase → Settings → API)
 *   - SEED_USER_EMAIL            (email of a user created via the app signup)
 *
 * Run with:  npm run seed
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { faker } from "@faker-js/faker";
import { subMonths, format, startOfMonth, setDate } from "date-fns";

config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.env.SEED_USER_EMAIL;

if (!url || !serviceKey || !email) {
  console.error(
    "Missing env. Set NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and SEED_USER_EMAIL in .env.local",
  );
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const iso = (d: Date) => format(d, "yyyy-MM-dd");

async function findUserId(targetEmail: string): Promise<string | null> {
  // Paginate through users to find the matching email.
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 100 });
    if (error) throw error;
    const match = data.users.find(
      (u) => u.email?.toLowerCase() === targetEmail.toLowerCase(),
    );
    if (match) return match.id;
    if (data.users.length < 100) break;
  }
  return null;
}

async function main() {
  const userId = await findUserId(email!);
  if (!userId) {
    console.error(
      `No user found for ${email}. Sign up with this email in the app first, then re-run.`,
    );
    process.exit(1);
  }
  console.log(`Seeding data for ${email} (${userId})…`);

  // Clear previous demo data for a clean slate.
  await admin.from("transactions").delete().eq("user_id", userId);
  await admin.from("budgets").delete().eq("user_id", userId);
  await admin.from("goals").delete().eq("user_id", userId);

  // Categories are created by the on-signup trigger.
  const { data: categories } = await admin
    .from("categories")
    .select("id, name")
    .eq("user_id", userId);

  if (!categories || categories.length === 0) {
    console.error(
      "No categories found. Make sure the schema.sql (with the signup trigger) was run.",
    );
    process.exit(1);
  }

  const cat = (name: string) =>
    categories.find((c) => c.name === name)?.id ?? categories[0].id;

  const expenseCats = categories.filter(
    (c) => !["Salary"].includes(c.name),
  );

  type Row = {
    user_id: string;
    category_id: string;
    amount: number;
    type: "income" | "expense";
    date: string;
    note: string;
    is_recurring: boolean;
    recurrence_interval: string | null;
  };
  const rows: Row[] = [];

  // 6 months of history including the current month.
  for (let m = 5; m >= 0; m--) {
    const monthStart = startOfMonth(subMonths(new Date(), m));

    // Monthly salary (recurring income).
    rows.push({
      user_id: userId,
      category_id: cat("Salary"),
      amount: 4200,
      type: "income",
      date: iso(setDate(monthStart, 1)),
      note: "Monthly salary",
      is_recurring: true,
      recurrence_interval: "monthly",
    });

    // Rent (recurring expense).
    rows.push({
      user_id: userId,
      category_id: cat("Rent"),
      amount: 1300,
      type: "expense",
      date: iso(setDate(monthStart, 3)),
      note: "Apartment rent",
      is_recurring: true,
      recurrence_interval: "monthly",
    });

    // Random everyday expenses across categories.
    const count = faker.number.int({ min: 15, max: 25 });
    for (let i = 0; i < count; i++) {
      const c = faker.helpers.arrayElement(expenseCats);
      rows.push({
        user_id: userId,
        category_id: c.id,
        amount: faker.number.float({ min: 5, max: 180, fractionDigits: 2 }),
        type: "expense",
        date: iso(setDate(monthStart, faker.number.int({ min: 1, max: 28 }))),
        note: faker.commerce.productName(),
        is_recurring: false,
        recurrence_interval: null,
      });
    }

    // Occasional side income.
    if (faker.datatype.boolean()) {
      rows.push({
        user_id: userId,
        category_id: cat("Other"),
        amount: faker.number.float({ min: 100, max: 600, fractionDigits: 2 }),
        type: "income",
        date: iso(setDate(monthStart, faker.number.int({ min: 5, max: 25 }))),
        note: "Freelance project",
        is_recurring: false,
        recurrence_interval: null,
      });
    }
  }

  const { error: txErr } = await admin.from("transactions").insert(rows);
  if (txErr) throw txErr;
  console.log(`Inserted ${rows.length} transactions.`);

  // Budgets for a few categories + an overall budget.
  await admin.from("budgets").insert([
    { user_id: userId, category_id: null, amount: 2500, period: "monthly" },
    { user_id: userId, category_id: cat("Food"), amount: 500, period: "monthly" },
    { user_id: userId, category_id: cat("Transport"), amount: 200, period: "monthly" },
    { user_id: userId, category_id: cat("Entertainment"), amount: 150, period: "monthly" },
  ]);
  console.log("Inserted budgets.");

  // Savings goals.
  await admin.from("goals").insert([
    {
      user_id: userId,
      name: "Emergency fund",
      target_amount: 10000,
      current_amount: 6200,
      deadline: iso(subMonths(new Date(), -6)),
    },
    {
      user_id: userId,
      name: "Vacation",
      target_amount: 3000,
      current_amount: 850,
      deadline: iso(subMonths(new Date(), -4)),
    },
  ]);
  console.log("Inserted goals.");

  console.log("✅ Seed complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
