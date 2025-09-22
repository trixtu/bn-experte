import { ModeToggle } from "@/components/mode-toggle";
import LocaleSwitcher from "./local-switcher";

export async function Navbar() {
  return (
    <div className="flex items-center gap-2">
      {/* selector limbă */}
      <LocaleSwitcher />
      <ModeToggle />
    </div>
  );
}
