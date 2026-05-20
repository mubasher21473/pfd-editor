import UserMenu from "@/components/layout/UserMenu";

export default function Header() {
  return (
    <header className="flex h-14 items-center justify-between border-b bg-white px-4">
      <span className="font-semibold">PDF Object Editor</span>
      <UserMenu />
    </header>
  );
}
