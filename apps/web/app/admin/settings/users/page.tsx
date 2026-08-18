import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import type { UserRole } from "@prisma/client";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { GrantAccessForm } from "./grant-access-form";

const ROLES: UserRole[] = ["super_admin", "company_admin", "company_member", "vendor", "reseller"];
// Roles that appear in this list / can be granted here. company_member = normal customer (revokes access).
const PRIVILEGED_ROLES: UserRole[] = ["super_admin", "company_admin", "vendor", "reseller"];

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

/**
 * Server action: revoke a user's elevated access.
 * Drops them back to company_member — the normal customer role — so they keep
 * their account and order history but disappear from this list. Deleting the
 * User row is deliberately NOT offered: it would cascade their orders away.
 */
async function revokeAccess(formData: FormData) {
  "use server";
  const session = await auth();
  if (!session || session.user.role !== "super_admin") {
    throw new Error("Forbidden");
  }
  const userId = String(formData.get("userId"));
  if (userId === session.user.id) {
    // Don't let the last admin lock themselves out of the admin.
    throw new Error("You cannot remove your own access.");
  }

  await prisma.user.update({
    where: { id: userId },
    data: { role: "company_member" },
  });

  revalidatePath("/admin/settings/users");
}

/**
 * Server action: grant an elevated role to a registered user by email.
 * The user must already have signed in with Google once.
 */
async function grantAccessByEmail(formData: FormData) {
  "use server";
  const session = await auth();
  if (!session || session.user.role !== "super_admin") {
    throw new Error("Forbidden");
  }
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const role = String(formData.get("role")) as UserRole;

  if (!email) redirect("/admin/settings/users?error=missing");
  if (!PRIVILEGED_ROLES.includes(role)) throw new Error("Invalid role");

  const user = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    select: { id: true },
  });
  if (!user) {
    redirect(`/admin/settings/users?error=notfound&email=${encodeURIComponent(email)}`);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { role },
  });

  revalidatePath("/admin/settings/users");
  redirect(`/admin/settings/users?granted=${encodeURIComponent(email)}`);
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams?: { error?: string; email?: string; granted?: string };
}) {
  const session = await auth();
  if (!session || session.user.role !== "super_admin") redirect("/unauthorized");

  const [users, companies] = await Promise.all([
    prisma.user.findMany({
      where: { role: { in: PRIVILEGED_ROLES } },
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
          Only users with elevated access are listed here — regular customers are managed
          under Clients. Role changes take effect on the user&apos;s next request — no re-login required.
        </p>
      </div>

      {searchParams?.error === "notfound" && (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] text-rose-700">
          No registered user found with <span className="font-medium">{searchParams.email}</span>.
          Ask them to sign in with Google once, then try again.
        </div>
      )}
      {searchParams?.error === "missing" && (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] text-rose-700">
          Please enter an email address.
        </div>
      )}
      {searchParams?.granted && (
        <div className="rounded-md border border-em/20 bg-em-50 px-4 py-3 text-[13px] text-em-700">
          Access granted to <span className="font-medium">{searchParams.granted}</span>.
        </div>
      )}

      <GrantAccessForm action={grantAccessByEmail} roles={PRIVILEGED_ROLES} />

      <div className="rounded-md bg-white shadow-card overflow-hidden">
        <div className="grid grid-cols-12 gap-3 border-b border-bdr bg-canvas px-4 py-2.5 text-[10px] font-normal uppercase tracking-wider text-ink-3">
          <div className="col-span-4">User</div>
          <div className="col-span-3">Company</div>
          <div className="col-span-2">Role</div>
          <div className="col-span-3 text-right">Joined</div>
        </div>

        {users.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm text-ink-3">No users with elevated access yet. Grant access by email above.</p>
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

              <div className="col-span-2">
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

              <div className="col-span-3 flex items-center justify-end gap-2">
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
                {/* Same form, different action — one click drops them to
                    company_member without hunting through the role dropdown. */}
                <button
                  type="submit"
                  formAction={revokeAccess}
                  className="rounded-md border border-rose-200 bg-white px-2.5 py-1 text-[11px] font-normal text-rose-600 hover:bg-rose-50 disabled:opacity-40"
                  disabled={u.id === session.user.id}
                  title="Remove admin access — keeps their customer account"
                >
                  Remove access
                </button>
              </div>
            </form>
          ))
        )}
      </div>

      <div className="rounded-md border border-gold/20 bg-gold-50 p-4 text-[12px] text-gold-700">
        <p className="font-normal">Tip</p>
        <p className="mt-0.5">
          <span className="font-medium">Remove access</span> drops a user back to a normal
          customer: they leave this list but keep their account, company and order history.
          Nothing is deleted, and you can grant access again any time by email above.
          You cannot remove your own access.
        </p>
      </div>
    </div>
  );
}
