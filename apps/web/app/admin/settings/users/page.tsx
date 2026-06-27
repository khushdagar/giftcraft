import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import type { UserRole } from "@prisma/client";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

const ROLES: UserRole[] = ["super_admin", "company_admin", "company_member", "vendor", "reseller"];

/**
 * Server action: update a user's role.
 * Only super_admins can call this successfully — we re-check inside.
 */
async function updateUserRole(formData: FormData) {
  "use server";
  const session = await auth();
  if (!session || session.user.role !== "super_admin") {
    throw new Error("Forbidden");
  }
  const userId = String(formData.get("userId"));
  const role = String(formData.get("role")) as UserRole;
  const companyId = String(formData.get("companyId") || "") || null;

  if (!ROLES.includes(role)) throw new Error("Invalid role");
  if (userId === session.user.id && role !== "super_admin") {
    // don't let an admin lock themselves out
    throw new Error("You cannot demote yourself.");
  }

  await prisma.user.update({
    where: { id: userId },
    data: { role, companyId },
  });

  revalidatePath("/admin/settings/users");
}

export default async function AdminUsersPage() {
  const session = await auth();
  if (!session || session.user.role !== "super_admin") redirect("/unauthorized");

  const [users, companies] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      include: { company: true },
    }),
    prisma.company.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="max-w-[1100px] space-y-4">
      <div>
        <h1 className="text-[22px] font-normal font-display">Users & Roles</h1>
        <p className="text-[13px] text-ink-3">
          Promote clients to company admins, onboard vendors, or change permissions here.
          Role changes take effect on the user&apos;s next request — no re-login required.
        </p>
      </div>

      <div className="rounded-md bg-white shadow-card overflow-hidden">
        <div className="grid grid-cols-12 gap-3 border-b border-bdr bg-canvas px-4 py-2.5 text-[10px] font-normal uppercase tracking-wider text-ink-3">
          <div className="col-span-4">User</div>
          <div className="col-span-3">Company</div>
          <div className="col-span-3">Role</div>
          <div className="col-span-2 text-right">Joined</div>
        </div>

        {users.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm text-ink-3">No users yet. The first person to sign in with Google will land here.</p>
          </div>
        ) : (
          users.map((u) => (
            <form
              key={u.id}
              action={updateUserRole}
              className="grid grid-cols-12 items-center gap-3 border-b border-bdr px-4 py-3 text-[13px] last:border-0 hover:bg-elevated"
            >
              <input type="hidden" name="userId" value={u.id} />

              <div className="col-span-4 flex items-center gap-3 min-w-0">
                <Avatar className="h-9 w-9">
                  {u.image && <AvatarImage src={u.image} alt={u.name ?? ""} />}
                  <AvatarFallback>{u.name?.[0] ?? u.email[0]?.toUpperCase() ?? "?"}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {u.name ?? <span className="italic text-ink-3">No name</span>}
                    {u.id === session.user.id && <Badge variant="em" className="ml-2">You</Badge>}
                  </p>
                  <p className="truncate text-[11px] text-ink-3">{u.email}</p>
                </div>
              </div>

              <div className="col-span-3">
                <select
                  name="companyId"
                  defaultValue={u.companyId ?? ""}
                  className="h-8 w-full rounded-md border border-bdr-2 bg-white px-2 text-[12px]"
                >
                  <option value="">— no company —</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="col-span-3">
                <select
                  name="role"
                  defaultValue={u.role}
                  disabled={u.id === session.user.id}
                  className="h-8 w-full rounded-md border border-bdr-2 bg-white px-2 text-[12px] disabled:opacity-60"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>{r.replace("_", " ")}</option>
                  ))}
                </select>
              </div>

              <div className="col-span-2 flex items-center justify-end gap-2">
                <span className="text-[11px] text-ink-3">
                  {new Date(u.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                </span>
                <button
                  type="submit"
                  className="rounded-md bg-em px-2.5 py-1 text-[11px] font-normal text-white hover:bg-em-600 disabled:opacity-40"
                  disabled={u.id === session.user.id}
                >
                  Save
                </button>
              </div>
            </form>
          ))
        )}
      </div>

      <div className="rounded-md border border-gold/20 bg-gold-50 p-4 text-[12px] text-gold-700">
        <p className="font-normal">Tip</p>
        <p className="mt-0.5">
          To onboard a new company admin: ask them to sign in with Google once (this creates
          their user row), then assign their company here and switch their role to
          &quot;company admin&quot;.
        </p>
      </div>
    </div>
  );
}
