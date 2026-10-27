import { LinkButton } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main
      id="main"
      className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-4 text-center"
    >
      <p className="text-6xl font-black text-lime">404</p>
      <h1 className="text-xl font-extrabold">Page not found</h1>
      <p className="text-sm text-muted">
        That page doesn&apos;t exist or isn&apos;t available to you.
      </p>
      <LinkButton href="/feed" variant="secondary">
        Back to VYRO
      </LinkButton>
    </main>
  );
}
