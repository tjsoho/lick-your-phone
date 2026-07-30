import { getStates } from "@/server-actions/states";
import StatesList from "@/components/admin/StatesList";

export default async function StatesPage() {
  const { data: states } = await getStates();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-heading font-bold text-lyp-black">
          States
        </h1>
      </div>
      <StatesList states={states ?? []} />
    </div>
  );
}
