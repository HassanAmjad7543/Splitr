import { redirect } from "next/navigation";

import { SiteHeader } from "@/components/site-header";
import { getUser } from "@/lib/supabase/server";

export default async function GroupsLayout({ children }: { children: React.ReactNode }) {
  // Middleware already gates /groups; this is the server-side double check.
  const user = await getUser();
  if (!user) redirect("/login");

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader email={user.email} />
      <div className="flex-1">{children}</div>
    </div>
  );
}
