export const dynamic = "force-dynamic";
// src/app/(admin)/admin/plans/page.tsx
import { getPlans, PLAN_KEYS } from "@/lib/plans";
import { PlanEditor } from "@/components/admin/plan-editor";

export default async function AdminPlansPage() {
  const plans = await getPlans();
  const initial = PLAN_KEYS.map((k) => plans[k]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">Plans</h1>
        <p className="text-sm text-stone-500 mt-1">
          Edit what each plan costs and includes. Changes apply immediately to the Billing page and to the event and
          guest limits. Leave a limit empty for unlimited. Existing subscribers keep their plan.
        </p>
      </div>
      <PlanEditor initial={initial} />
    </div>
  );
}
