import Layout from '@/components/Layout';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Activity,
  BellRing,
  BookOpenText,
  Layers3,
  LifeBuoy,
  Radar,
  ShieldCheck,
  Sparkles,
  Workflow,
} from 'lucide-react';

const releaseNotes = [
  {
    version: 'v1.6.0',
    label: 'Current',
    notes: [
      'Improved notification center with unread, read, and all-alert views.',
      'Added stronger audit visibility for account actions, edits, deletes, and session events.',
      'Expanded live refresh behavior across management pages for better operations monitoring.',
    ],
  },
  {
    version: 'v1.5.0',
    label: 'Stability',
    notes: [
      'Connected more frontend modules to backend-backed data flows.',
      'Refined admin and operator account controls with better session handling.',
      'Improved data consistency for alerts, activity history, and account status.',
    ],
  },
  {
    version: 'v1.4.0',
    label: 'Foundation',
    notes: [
      'Strengthened booking, vessel, and operator management workflows.',
      'Organized settings coverage for fares, barangays, schedules, and contact details.',
      'Prepared the platform for cleaner QA hardening and deployment validation.',
    ],
  },
];

const highlights = [
  {
    title: 'Live Operations',
    description: 'Track boats, bookings, and operational changes with less dead air across management screens.',
    icon: Radar,
  },
  {
    title: 'Safer Admin Control',
    description: 'Stronger account controls, session checks, and visibility for superadmin and admin oversight.',
    icon: ShieldCheck,
  },
  {
    title: 'Audit Visibility',
    description: 'See who created, edited, updated, or deleted records through a cleaner activity history flow.',
    icon: BellRing,
  },
  {
    title: 'Connected Modules',
    description: 'Bookings, vessels, operators, settings, reports, and alerts are structured to work as one platform.',
    icon: Workflow,
  },
];

export default function AboutPage() {
  return (
    <Layout className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef6ff_100%)] p-4 dark:bg-[linear-gradient(180deg,#020617_0%,#0f172a_100%)]">
      <div className="space-y-4">
        <div className="overflow-hidden rounded-[20px] border border-slate-200/70 bg-white/92 shadow-[0_14px_40px_rgba(15,23,42,0.05)] backdrop-blur dark:border-slate-800 dark:bg-slate-950/78">
          <div className="grid gap-3 px-4 py-4 lg:grid-cols-[minmax(0,1.5fr),360px] lg:px-5">
            <div className="space-y-2.5">
              <span className="inline-flex w-fit items-center rounded-lg border border-sky-200 bg-sky-50 px-3 py-1 text-sm font-medium text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-200">
                About Desk
              </span>
              <div>
                <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">About Isla Sakay</h1>
                <p className="mt-0.5 text-sm font-medium text-slate-500 dark:text-slate-400">Platform overview, release notes, and product direction for the boat booking and management system</p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-2">
              <div className="rounded-2xl border border-sky-200/70 bg-sky-50/90 p-3 dark:border-sky-500/20 dark:bg-sky-500/10">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-sky-700 dark:text-sky-200">Version</p>
                <p className="mt-1 text-lg font-semibold text-sky-900 dark:text-sky-50">1.6.0</p>
              </div>
              <div className="rounded-2xl border border-emerald-200/70 bg-emerald-50/90 p-3 dark:border-emerald-500/20 dark:bg-emerald-500/10">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-200">Highlights</p>
                <p className="mt-1 text-lg font-semibold text-emerald-900 dark:text-emerald-50">{highlights.length}</p>
              </div>
            </div>
          </div>
        </div>

        <Card className="overflow-hidden border-sky-500/20 bg-gradient-to-br from-[#06142f] via-[#081b3f] to-[#0b1739] shadow-[0_24px_80px_-40px_rgba(56,189,248,0.55)] dark:border-sky-500/20 dark:from-[#06142f] dark:via-[#081b3f] dark:to-[#0b1739]">
          <CardContent className="grid gap-8 p-6 md:grid-cols-[1.4fr_0.9fr] md:p-8">
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-3">
                <Badge className="border-cyan-400/30 bg-cyan-500/10 px-3 py-1 text-cyan-200 hover:bg-cyan-500/10">
                  Maritime Operations Platform
                </Badge>
                <Badge className="border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-emerald-200 hover:bg-emerald-500/10">
                  Version 1.6.0
                </Badge>
              </div>

              <div className="space-y-3">
                <h2 className="text-3xl font-semibold tracking-tight text-white md:text-4xl">
                  A more operational, visible, and accountable Isla Sakay.
                </h2>
                <p className="max-w-3xl text-sm leading-7 text-slate-200 md:text-base">
                  Isla Sakay is built to centralize boat operations, passenger and cargo booking, account control,
                  alerting, and audit visibility in one admin platform. The current direction is less mock behavior,
                  stronger backend connectivity, and cleaner interfaces that support actual daily use.
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-1">
              <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                <img src={`${import.meta.env.BASE_URL}logo3.png`} alt="Isla Sakay" className="h-40 w-40 object-contain" />
                <p className="mt-4 text-center text-xs uppercase tracking-[0.2em] text-slate-400">Island Boat Operations</p>
              </div>

              <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                <img src={`${import.meta.env.BASE_URL}logo1.png`} alt="Isla Sakay" className="h-32 w-32 object-contain" />
                <p className="mt-4 text-center text-xs uppercase tracking-[0.2em] text-slate-400">Maritime Platform</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {highlights.map(({ title, description, icon: Icon }) => (
            <Card
              key={title}
              className="border-slate-200/70 bg-white/80 shadow-[0_18px_45px_-35px_rgba(59,130,246,0.25)] backdrop-blur dark:border-slate-800 dark:bg-[#07152f]/90 dark:shadow-[0_18px_45px_-35px_rgba(59,130,246,0.55)]"
            >
              <CardHeader className="space-y-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-sky-400/15 bg-sky-500/10 text-sky-600 dark:text-sky-200">
                  <Icon className="h-5 w-5" />
                </div>
                <CardTitle className="text-base text-slate-900 dark:text-white">{title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">{description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <Card className="border-slate-200/70 bg-white/85 dark:border-slate-800 dark:bg-[#07152f]">
            <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
                  <BookOpenText className="h-5 w-5 text-cyan-500 dark:text-cyan-300" />
                  Release Notes
                </CardTitle>
                <p className="text-sm text-slate-500 dark:text-slate-400">A quick view of the latest direction and improvements.</p>
              </div>
              <Badge className="border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200 dark:hover:bg-slate-800/80">
                Updated Build Notes
              </Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              {releaseNotes.map((item) => (
                <div
                  key={item.version}
                  className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 shadow-[0_18px_40px_-35px_rgba(34,197,94,0.18)] dark:border-slate-800 dark:bg-slate-950/30 dark:shadow-[0_18px_40px_-35px_rgba(34,197,94,0.45)]"
                >
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="rounded-xl bg-emerald-500/12 p-2 text-emerald-600 dark:text-emerald-200">
                        <Sparkles className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">{item.version}</p>
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{item.label}</p>
                      </div>
                    </div>
                  </div>
                  <ul className="space-y-2 text-sm leading-6 text-slate-700 dark:text-slate-300">
                    {item.notes.map((note) => (
                      <li key={note} className="flex gap-3">
                        <span className="mt-2 h-1.5 w-1.5 rounded-full bg-cyan-500 dark:bg-cyan-300" />
                        <span>{note}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="grid gap-6">
            <Card className="border-slate-200/70 bg-white/85 dark:border-slate-800 dark:bg-[#07152f]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
                  <Layers3 className="h-5 w-5 text-sky-500 dark:text-sky-300" />
                  Current Direction
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm leading-6 text-slate-700 dark:text-slate-300">
                <p>
                  The product direction is to make Isla Sakay feel less like a static school project and more like a
                  working administrative control panel. That means cleaner live data handling, better audit trails,
                  stronger account management, and more visible operational status.
                </p>
                <p>
                  The About page should communicate maturity, not filler. This version is structured to show what the
                  platform does, what changed recently, and what should be improved next.
                </p>
              </CardContent>
            </Card>

            <Card className="border-slate-200/70 bg-white/85 dark:border-slate-800 dark:bg-[#07152f]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
                  <Activity className="h-5 w-5 text-emerald-500 dark:text-emerald-300" />
                  Recommended Next Updates
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-slate-700 dark:text-slate-300">
                <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-950/30">
                  Add environment details, deployment target, and support contact ownership if this page will also be
                  used during turnover or presentation.
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-950/30">
                  Add release date labels pulled from backend config later if you want real version tracking instead of
                  frontend-only notes.
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-950/30">
                  Consider adding a roadmap section only if it will be maintained. Dead roadmap content weakens trust.
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200/70 bg-gradient-to-br from-slate-50 to-sky-50/80 dark:border-slate-800 dark:from-[#091933] dark:to-[#0d2144]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
                  <LifeBuoy className="h-5 w-5 text-violet-500 dark:text-violet-300" />
                  Why This Page Matters
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm leading-6 text-slate-700 dark:text-slate-300">
                <p>
                  A strong About page helps new admins, reviewers, and stakeholders understand what the system covers
                  without digging through every module first.
                </p>
                <p>
                  It also becomes the right place to surface product updates, current build notes, and the platform
                  identity in a cleaner way than the previous static card layout.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
