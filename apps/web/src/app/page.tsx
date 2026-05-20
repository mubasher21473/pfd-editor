import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="mx-auto max-w-4xl p-8">
      <h1 className="text-4xl font-bold">PDF Object Editor</h1>
      <p className="mt-4 text-slate-600">Production-ready PDF object editing SaaS scaffold.</p>
      <div className="mt-6 flex gap-4">
        <Link className="rounded bg-slate-900 px-4 py-2 text-white" href="/login">
          Get started
        </Link>
        <Link className="rounded border px-4 py-2" href="/dashboard">
          Dashboard
        </Link>
      </div>
    </main>
  );
}
