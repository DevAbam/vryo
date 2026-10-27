import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/primitives";
import { signOutAction } from "@/server/actions/auth";

export const metadata: Metadata = { title: "Account restricted" };

export default function AccountRestrictedPage() {
  return (
    <main id="main" className="mx-auto flex min-h-dvh max-w-md items-center px-4">
      <Card className="flex flex-col gap-4 p-6">
        <h1 className="text-xl font-extrabold">Your account is restricted</h1>
        <p className="text-sm text-muted">
          This account can&apos;t use VYRO right now. If you think this is a mistake, contact
          support from the email address on your account.
        </p>
        <form action={signOutAction}>
          <Button type="submit" variant="secondary">
            Sign out
          </Button>
        </form>
      </Card>
    </main>
  );
}
