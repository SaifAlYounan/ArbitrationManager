import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  Scale,
  CalendarDays,
  FolderOpen,
  FileText,
  Mic2,
  DollarSign,
  Search,
  ArrowRight,
  CheckCircle2,
  Globe,
  Shield,
  Clock,
} from "lucide-react";

const FEATURES = [
  {
    icon: CalendarDays,
    title: "Procedural Calendar",
    desc: "Track every deadline, memorial, and submission date. Colour-coded countdown alerts flag overdue items, with ICC-standard milestones seeded automatically.",
  },
  {
    icon: FolderOpen,
    title: "Exhibits Register",
    desc: "Auto-numbered exhibits by party (C-001, R-001). Full register with party, description, document reference, and status tracking across all filings.",
  },
  {
    icon: FileText,
    title: "Procedural Orders",
    desc: "Draft, format, and finalize POs with auto-numbered paragraphs and standard ICC language. Apply orders directly to extend deadlines with one click.",
  },
  {
    icon: Mic2,
    title: "Hearing Logistics",
    desc: "Manage hearing sessions, participant schedules, time zone grids, witness timetables, and a 15-item ICC preparation checklist — all in one place.",
  },
  {
    icon: DollarSign,
    title: "Costs Tracker",
    desc: "Team rate card, time entries by phase, disbursements, ICC advance on costs, and a full costs summary with per-phase charts and a printable statement.",
  },
  {
    icon: Search,
    title: "Global Search",
    desc: "Instant command-palette search across deadlines, exhibits, procedural orders, and time entries for any case with ⌘K.",
  },
];

const WORKFLOW = [
  { step: "01", label: "Open a Case", detail: "Enter the case reference, parties, seat, language, and applicable ICC rules." },
  { step: "02", label: "Constitute the Tribunal", detail: "Add arbitrators and party representatives with their roles, firms, and time zones." },
  { step: "03", label: "Build the Calendar", detail: "Seed ICC-standard milestones in one click or add custom deadlines linked to procedural orders." },
  { step: "04", label: "File Exhibits", detail: "Register claimant and respondent exhibits with auto-numbering, date, and document reference." },
  { step: "05", label: "Track Costs", detail: "Log time entries against a rate card, record disbursements, and monitor the ICC advance." },
  { step: "06", label: "Prepare Hearings", detail: "Build participant schedules, generate time zone grids, and run through the preparation checklist." },
];

const TRUST = [
  { icon: Globe, label: "ICC 2021 Rules", sub: "Aligned with the 2021 ICC Arbitration Rules" },
  { icon: Shield, label: "Privilege-Aware", sub: "Designed for internal case management" },
  { icon: Clock, label: "Deadline Alerts", sub: "Configurable warning windows with email support" },
  { icon: CheckCircle2, label: "Print-Friendly", sub: "All reports formatted for submission" },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-white font-sans selection:bg-[#0F2547]/20">
      {/* ── Navigation ── */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#0F2547] flex items-center justify-center">
              <Scale className="w-5 h-5 text-white" />
            </div>
            <span className="font-display font-bold text-[#0F2547] text-lg tracking-tight">ICC Procedural Manager</span>
          </div>
          <Link href="/app">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="px-5 py-2 bg-[#0F2547] text-white text-sm font-medium rounded-lg hover:bg-[#1e3a6e] transition-colors"
            >
              Open App
            </motion.button>
          </Link>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="bg-[#0F2547] text-white relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full bg-blue-500/10 blur-3xl translate-x-1/3 -translate-y-1/4" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-indigo-500/10 blur-3xl -translate-x-1/4 translate-y-1/4" />
        </div>
        <div className="relative max-w-7xl mx-auto px-6 lg:px-8 py-24 lg:py-36">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl"
          >
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-sm text-blue-200 mb-8">
              <Scale className="w-3.5 h-3.5" />
              Built for ICC International Arbitration
            </div>
            <h1 className="text-5xl lg:text-6xl font-display font-bold leading-[1.1] tracking-tight mb-6">
              Every deadline,<br />
              <span className="text-blue-300">every exhibit,</span><br />
              every cost. Managed.
            </h1>
            <p className="text-xl text-blue-100 leading-relaxed max-w-2xl mb-10">
              A purpose-built case management platform for counsel running ICC arbitration proceedings.
              From constitution of the tribunal to the costs statement, everything your team needs
              — in one professionally structured workspace.
            </p>
            <div className="flex items-center gap-4 flex-wrap">
              <Link href="/app">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="inline-flex items-center gap-2 px-7 py-3.5 bg-white text-[#0F2547] font-semibold text-base rounded-xl hover:bg-blue-50 transition-colors shadow-lg"
                >
                  Open My Cases
                  <ArrowRight className="w-4 h-4" />
                </motion.button>
              </Link>
              <span className="text-blue-300/70 text-sm">No sign-up required for internal use</span>
            </div>
          </motion.div>
        </div>

        {/* Stat bar */}
        <div className="relative border-t border-white/10 bg-white/5">
          <div className="max-w-7xl mx-auto px-6 lg:px-8 py-6 grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { n: "7", label: "Integrated modules" },
              { n: "100+", label: "ICC procedural touchpoints" },
              { n: "15", label: "Hearing checklist items" },
              { n: "∞", label: "Cases, deadlines, exhibits" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-3xl font-display font-bold text-white">{s.n}</div>
                <div className="text-sm text-blue-300 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-display font-bold text-[#0F2547] mb-4">
              Every module counsel needs
            </h2>
            <p className="text-gray-500 text-lg max-w-2xl mx-auto">
              Designed around the lifecycle of an ICC arbitration — from the first filing through to the final award.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.4 }}
                className="bg-white rounded-2xl p-7 border border-gray-100 shadow-sm hover:shadow-md transition-shadow group"
              >
                <div className="w-11 h-11 rounded-xl bg-[#0F2547]/8 flex items-center justify-center mb-5 group-hover:bg-[#0F2547]/12 transition-colors">
                  <f.icon className="w-5 h-5 text-[#0F2547]" />
                </div>
                <h3 className="font-display font-semibold text-[#0F2547] text-lg mb-2">{f.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it Works ── */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl lg:text-4xl font-display font-bold text-[#0F2547] mb-4">
                From day one<br />to the award
              </h2>
              <p className="text-gray-500 text-lg mb-8">
                The platform mirrors the natural lifecycle of an ICC proceeding, so your team always knows where the case stands.
              </p>
              <div className="space-y-5">
                {WORKFLOW.map((w) => (
                  <div key={w.step} className="flex gap-4 items-start">
                    <div className="w-10 h-10 rounded-lg bg-[#0F2547] text-white font-mono text-xs font-bold flex items-center justify-center flex-shrink-0">
                      {w.step}
                    </div>
                    <div>
                      <div className="font-semibold text-[#0F2547]">{w.label}</div>
                      <div className="text-gray-500 text-sm mt-0.5">{w.detail}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-[#0F2547] rounded-3xl p-8 text-white space-y-5">
              <div className="text-blue-200 text-xs font-mono uppercase tracking-widest mb-6">What lawyers told us they needed</div>
              {[
                'I need to see every overdue deadline the moment I open a case.',
                'Our exhibit numbering was a mess between claimant and respondent counsel.',
                'The costs statement took us two days to draft. It should take two minutes.',
                'We lost track of which PO extended which deadline.',
                'Coordinating hearing logistics across three time zones was a spreadsheet nightmare.',
              ].map((q, i) => (
                <div key={i} className="border-l-2 border-blue-400/40 pl-4">
                  <p className="text-blue-100 text-sm italic leading-relaxed">&ldquo;{q}&rdquo;</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Trust Bar ── */}
      <section className="py-16 bg-gray-50 border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {TRUST.map((t) => (
              <div key={t.label} className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-[#0F2547]/8 flex items-center justify-center flex-shrink-0">
                  <t.icon className="w-5 h-5 text-[#0F2547]" />
                </div>
                <div>
                  <div className="font-semibold text-[#0F2547] text-sm">{t.label}</div>
                  <div className="text-gray-500 text-xs mt-0.5">{t.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-24 bg-[#0F2547] text-white text-center">
        <div className="max-w-2xl mx-auto px-6">
          <Scale className="w-12 h-12 text-blue-300 mx-auto mb-6 opacity-80" />
          <h2 className="text-3xl lg:text-4xl font-display font-bold mb-4">
            Your active proceedings, organised.
          </h2>
          <p className="text-blue-200 text-lg mb-10 leading-relaxed">
            Open the app and see your current cases — all deadlines, exhibits, costs, and hearing logistics in one professional dashboard.
          </p>
          <Link href="/app">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="inline-flex items-center gap-2 px-8 py-4 bg-white text-[#0F2547] font-semibold text-base rounded-xl hover:bg-blue-50 transition-colors shadow-xl"
            >
              Open ICC Procedural Manager
              <ArrowRight className="w-4 h-4" />
            </motion.button>
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-[#0a1a38] text-blue-300/60 text-xs text-center py-6 px-6">
        <div className="flex items-center justify-center gap-2 mb-1">
          <Scale className="w-3.5 h-3.5" />
          <span className="font-medium text-blue-200/80">ICC Procedural Manager</span>
        </div>
        <p>Internal case management tool · Aligned with ICC Arbitration Rules 2021</p>
      </footer>
    </div>
  );
}
