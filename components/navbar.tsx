import codingInFlowLogo from "@/assets/coding_in_flow_logo.jpg";
import { ModeToggle } from "@/components/mode-toggle";
import { UserDropdown } from "@/components/user-dropdown";
import { getServerSession } from "@/lib/get-session";

import Image from "next/image";
import Link from "next/link";

export async function Navbar() {
  return (
    <div className="flex items-center gap-2">
      <ModeToggle />
    </div>
  );
}
