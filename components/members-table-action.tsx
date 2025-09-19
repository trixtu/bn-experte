"use client";

import { Button } from "./ui/button";
import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { removeUser, updateUser } from "@/server/users";
import { MdEdit } from "react-icons/md";
import { RiDeleteBin5Line } from "react-icons/ri";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Role, Status, User } from "@/prisma/lib/generated/prisma";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

export default function MembersTableAction({
  memberId,
  user,
}: {
  memberId: string;
  user: User;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<Status>(user.status);
  const [role, setRole] = useState<Role>(user.role);
  const router = useRouter();

  const handleRemoveMember = async () => {
    try {
      setIsLoading(true);
      const { success, error } = await removeUser(memberId);

      if (!success) {
        toast.error(error || "Failed to remove member");
        return;
      }

      setIsLoading(false);
      toast.success("Member removed from organization");
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error("Failed to remove member from organization");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditMember = async () => {
    try {
      setIsLoading(true);
      const { success, error } = await updateUser(memberId, { status, role });

      if (!success) {
        toast.error(error || "Failed to update member");
        return;
      }

      toast.success("Member updated successfully");
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error("Failed to update member");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Dialog>
        <DialogTrigger asChild>
          <Button className="cursor-pointer" size="sm" disabled={isLoading}>
            <MdEdit />
            Edit
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit member</DialogTitle>
            <DialogDescription>
              Update status and role for this member.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Status</Label>
              <Select
                value={status}
                onValueChange={(val: string) => setStatus(val as Status)}
              >
                <SelectTrigger defaultValue={status}>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={Status.pending}>Pending</SelectItem>
                  <SelectItem value={Status.active}>Approved</SelectItem>
                  <SelectItem value={Status.blocked}>Blocked</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Role</Label>
              <Select
                value={role}
                onValueChange={(val: string) => setRole(val as Role)}
              >
                <SelectTrigger defaultValue={role}>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={Role.member}>Member</SelectItem>
                  <SelectItem value={Role.admin}>Admin</SelectItem>
                  <SelectItem value={Role.owner}>Owner</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleEditMember}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                "Save changes"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Button
        className="ml-2 cursor-pointer"
        onClick={handleRemoveMember}
        variant="destructive"
        size="sm"
        disabled={isLoading}
      >
        <RiDeleteBin5Line />
        {isLoading ? <Loader2 className="size-4 animate-spin" /> : "Remove"}
      </Button>
    </>
  );
}
