import DropZone from "@/components/upload/DropZone";

export default function DashboardPage() {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">Dashboard</h2>
      <DropZone />
    </div>
  );
}
