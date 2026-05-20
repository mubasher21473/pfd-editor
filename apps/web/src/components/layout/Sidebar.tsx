import Link from "next/link";

export default function Sidebar() {
  return (
    <aside className="w-64 border-r bg-white p-4">
      <nav className="space-y-2">
        <Link className="block" href="/dashboard">Dashboard</Link>
        <Link className="block" href="/upgrade">Upgrade</Link>
      </nav>
    </aside>
  );
}
