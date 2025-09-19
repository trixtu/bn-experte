import { getServerSession } from "@/lib/get-session";
import type { Metadata } from "next";
import { forbidden, unauthorized } from "next/navigation";
import { getUsers } from "@/server/users";
import MembersTable from "@/components/members-table";

export const metadata: Metadata = {
  title: "Admin",
};

export default async function AdminPage() {
  const session = await getServerSession();
  const users = await getUsers();
  const user = session?.user;

  if (!user) unauthorized();

  if (user.role !== "admin") forbidden();

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-12">
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">Admin</h1>
          <p className="text-muted-foreground">
            You have administrator access.
          </p>
        </div>
        {/* <AllUsers users={users} /> */}
        <MembersTable users={users} />
        {/* <DeleteApplication /> */}
      </div>
    </main>
  );
}
