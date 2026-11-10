import { Logo } from "@/components/logo";

export default function ShareNotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4 text-center">
      <Logo />
      <div className="max-w-sm">
        <h1 className="text-2xl font-semibold">This link doesn&apos;t work</h1>
        <p className="mt-2 text-muted-foreground">
          It may have been reset or the group deleted. Ask whoever sent it for a fresh link.
        </p>
      </div>
    </main>
  );
}
