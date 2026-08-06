"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";

type Suggestion = { email: string; name: string | null; image: string | null };

export function GrantAccessForm({
  action,
  roles,
}: {
  action: (formData: FormData) => Promise<void>;
  roles: string[];
}) {
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);

  const { data } = useQuery<{ success: boolean; data: Suggestion[] }>({
    queryKey: ["admin-user-search", debounced],
    queryFn: () =>
      fetch(`/api/admin/users/search?q=${encodeURIComponent(debounced)}`).then((r) => r.json()),
    enabled: open && debounced.length >= 2,
  });

  const suggestions = data?.data ?? [];

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  return (
    <form action={action} className="rounded-md bg-white p-4 shadow-card">
      <p className="text-[13px] font-medium">Grant access</p>
      <p className="mt-0.5 text-[12px] text-ink-3">
        Enter the email of a registered user to give them a role. They must have signed in with
        Google at least once.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <div ref={boxRef} className="relative w-full max-w-[320px]">
          <input
            type="email"
            name="email"
            required
            autoComplete="off"
            placeholder="name@company.com"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            className="h-8 w-full rounded-md border border-bdr-2 bg-white px-2.5 text-[13px]"
          />
          {open && debounced.length >= 2 && suggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-md border border-bdr bg-white shadow-card">
              {suggestions.map((s) => (
                <button
                  key={s.email}
                  type="button"
                  onClick={() => {
                    setQ(s.email);
                    setOpen(false);
                  }}
                  className="flex w-full items-center gap-2 px-2.5 py-2 text-left hover:bg-elevated"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[12px] font-medium">
                      {s.name ?? <span className="italic text-ink-3">No name</span>}
                    </p>
                    <p className="truncate text-[11px] text-ink-3">{s.email}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        <select
          name="role"
          defaultValue="super_admin"
          className="h-8 rounded-md border border-bdr-2 bg-white px-2 text-[12px]"
        >
          {roles.map((r) => (
            <option key={r} value={r}>
              {r.replace("_", " ")}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-md bg-em px-3 py-1.5 text-[12px] font-normal text-white hover:bg-em-600"
        >
          Grant access
        </button>
      </div>
    </form>
  );
}
