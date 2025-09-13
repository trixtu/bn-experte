import { createAccessControl } from "better-auth/plugins/access";

const statment = {
  project: ["create", "share", "update", "delete"],
} as const;

const ac = createAccessControl(statment);

const member = ac.newRole({
  project: ["create"],
});

const admin = ac.newRole({
  project: ["create", "update"],
});

const owner = ac.newRole({
  project: ["create", "update", "delete"],
});

const myCustomRole = ac.newRole({
  project: ["create", "update", "delete"],
});

export { admin, member, owner, ac, statment };
