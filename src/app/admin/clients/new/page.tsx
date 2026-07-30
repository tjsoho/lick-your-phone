import ClientForm from "@/components/admin/ClientForm";

export default function NewClientPage() {
  return (
    <div>
      <h1 className="text-2xl font-heading font-bold text-lyp-black mb-6">
        Add New Client
      </h1>
      <ClientForm />
    </div>
  );
}
