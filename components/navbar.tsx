import { ModeToggle } from "@/components/mode-toggle";

export async function Navbar() {
  return (
    <div className="flex items-center gap-2">
      <ModeToggle />
    </div>
  );
}
