import { AudioLines, House, Mail, MonitorPlay } from "lucide-react";
import { PitchArt } from "@/components/auth/brand-panel";
import { LinkButton } from "@/components/ui/button";
import { LogoMark } from "@/components/ui/logo";
import { Card } from "@/components/ui/primitives";

const PILLARS = [
  {
    icon: House,
    title: "Feed",
    body: "Hot takes, match threads and the fans you follow, in one timeline.",
  },
  {
    icon: MonitorPlay,
    title: "Stream",
    body: "Watch live with the people who care as much as you do.",
  },
  {
    icon: AudioLines,
    title: "Spaces",
    body: "Jump into live audio rooms for post-match debates and tactics talk.",
  },
  { icon: Mail, title: "Chat", body: "Direct and group chats with your matchday crew." },
];

export default function LandingPage() {
  return (
    <div className="min-h-dvh pt-safe pb-safe">
      <header className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 lg:px-8">
        <div className="flex items-center gap-2">
          <LogoMark />
          <span className="text-xl font-black tracking-[0.12em]">VYRO</span>
        </div>
        <nav aria-label="Account" className="flex items-center gap-2">
          <LinkButton href="/login" variant="ghost" size="sm">
            Sign in
          </LinkButton>
          <LinkButton href="/signup" size="sm">
            Join
          </LinkButton>
        </nav>
      </header>

      <main id="main" className="mx-auto w-full max-w-6xl px-4 lg:px-8">
        <section className="grid items-center gap-10 py-12 md:py-20 lg:grid-cols-2">
          <div className="flex flex-col gap-6">
            <h1 className="text-4xl font-black tracking-tight text-balance sm:text-5xl desk:text-6xl">
              Every match. Every take. <span className="text-lime">Live.</span>
            </h1>
            <p className="max-w-xl text-lg text-muted">
              VYRO is where football and basketball fans watch together, argue in real time and talk
              it out in live audio spaces.
            </p>
            <div className="flex flex-wrap gap-3">
              <LinkButton href="/signup" size="lg">
                Create your account
              </LinkButton>
              <LinkButton href="/login" variant="secondary" size="lg">
                Sign in
              </LinkButton>
            </div>
          </div>
          <div className="relative">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 rounded-full bg-lime/10 blur-3xl"
            />
            <PitchArt className="relative w-full text-lime/50" />
          </div>
        </section>

        <section aria-labelledby="pillars" className="pb-16">
          <h2 id="pillars" className="sr-only">
            What you can do on VYRO
          </h2>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PILLARS.map(({ icon: Icon, title, body }) => (
              <li key={title}>
                <Card className="flex h-full flex-col gap-3 p-5">
                  <div className="flex size-10 items-center justify-center rounded-full bg-surface-2 text-lime">
                    <Icon aria-hidden="true" className="size-5" />
                  </div>
                  <h3 className="font-bold">{title}</h3>
                  <p className="text-sm text-muted">{body}</p>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
