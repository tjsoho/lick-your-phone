import { getClient } from "@/server-actions/clients";
import { getStates } from "@/server-actions/states";
import { getAppUrl } from "@/lib/app-url";
import ClientDetailView from "@/components/admin/ClientDetailView";
import { notFound } from "next/navigation";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [{ data: client, error }, { data: states }, appUrl] = await Promise.all([
    getClient(id),
    getStates(),
    getAppUrl(),
  ]);

  if (error || !client) {
    notFound();
  }

  return (
    <ClientDetailView client={client} states={states ?? []} appUrl={appUrl} />
  );
}
