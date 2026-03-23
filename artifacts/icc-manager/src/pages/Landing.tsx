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
  Sparkles,
  Upload,
  ScanText,
  SquareCheck,
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
            <span className="font-display font-bold text-[#0F2547] text-lg tracking-tight">Procedural Manager</span>
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
            <p className="text-xl text-blue-100 leading-relaxed max-w-2xl mb-8">
              A purpose-built case management platform for counsel running ICC arbitration proceedings.
              From constitution of the tribunal to the costs statement, everything your team needs
              — in one professionally structured workspace.
            </p>

            {/* Smart Import callout */}
            <div className="bg-white/8 border border-white/15 rounded-2xl p-5 mb-10 max-w-2xl">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-blue-400/20 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-3.5 h-3.5 text-blue-300" />
                </div>
                <span className="text-sm font-semibold text-white">AI Smart Import — now live</span>
                <span className="ml-auto text-xs bg-blue-400/20 text-blue-200 border border-blue-400/20 px-2.5 py-0.5 rounded-full font-medium">New</span>
              </div>
              <p className="text-blue-100 text-sm leading-relaxed mb-4">
                Drop any arbitration document — a Procedural Order, a Request for Arbitration, a timetable letter — and Claude reads it with legal expertise, automatically extracting every exhibit reference, filing deadline, and procedural direction. Review the proposed additions, check or uncheck individual items, and apply them to your case record in one click. No copy-pasting. No missed obligations.
              </p>
              <div className="flex flex-wrap gap-2">
                {[
                  { icon: FolderOpen, label: "Exhibit references (C-001, R-001…)" },
                  { icon: CalendarDays, label: "Filing & hearing deadlines" },
                  { icon: FileText, label: "Procedural Orders & directions" },
                  { icon: ScanText, label: "Party obligations & expert directions" },
                ].map((chip) => (
                  <div key={chip.label} className="inline-flex items-center gap-1.5 bg-white/8 border border-white/12 rounded-lg px-3 py-1.5 text-xs text-blue-200">
                    <chip.icon className="w-3 h-3 text-blue-300 flex-shrink-0" />
                    {chip.label}
                  </div>
                ))}
              </div>
            </div>

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

      {/* ── Smart Import Feature ── */}
      <section className="py-24 bg-[#0F2547] text-white relative overflow-hidden">
        {/* background glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 right-0 w-[500px] h-[500px] rounded-full bg-blue-500/10 blur-3xl translate-x-1/3 -translate-y-1/2" />
          <div className="absolute bottom-0 left-1/4 w-[300px] h-[300px] rounded-full bg-indigo-400/10 blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-6 lg:px-8">
          {/* Label + headline */}
          <div className="text-center mb-16">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-sm text-blue-200 mb-6">
                <Sparkles className="w-3.5 h-3.5 text-blue-300" />
                AI-Powered · Flagship Feature
              </div>
              <h2 className="text-3xl lg:text-5xl font-display font-bold mb-5 leading-tight">
                Drop a document.<br />
                <span className="text-blue-300">Your case updates itself.</span>
              </h2>
              <p className="text-blue-100 text-lg max-w-2xl mx-auto leading-relaxed">
                Smart Import reads any arbitration document — procedural orders, memorials, correspondence —
                and extracts every exhibit, deadline, and procedural direction directly into your case record.
                No copy-pasting. No missed items.
              </p>
            </motion.div>
          </div>

          {/* 3-step flow */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20">
            {[
              {
                icon: Upload,
                step: "01",
                title: "Upload the document",
                desc: "Drop any PDF, Word, or text file — a Procedural Order, a Request for Arbitration, a timetable letter. Multiple files at once.",
                color: "bg-blue-500/20 text-blue-300",
              },
              {
                icon: ScanText,
                step: "02",
                title: "Claude reads it",
                desc: "Claude Sonnet analyses the document with arbitration expertise — identifying parties, dates, obligations, and procedural directions.",
                color: "bg-indigo-500/20 text-indigo-300",
              },
              {
                icon: SquareCheck,
                step: "03",
                title: "Review and apply",
                desc: "Every proposed exhibit, deadline, and PO is shown for your review. Check what you want, uncheck what you don't, and apply in one click.",
                color: "bg-emerald-500/20 text-emerald-300",
              },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.12, duration: 0.5 }}
                className="bg-white/8 border border-white/12 rounded-2xl p-7 relative"
              >
                <div className="flex items-center gap-3 mb-5">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.color}`}>
                    <item.icon className="w-5 h-5" />
                  </div>
                  <span className="font-mono text-xs text-white/30 font-bold tracking-widest">{item.step}</span>
                </div>
                <h3 className="font-display font-semibold text-white text-lg mb-2">{item.title}</h3>
                <p className="text-blue-200 text-sm leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>

          {/* What gets extracted — visual mock */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="bg-white/5 border border-white/10 rounded-3xl p-8 lg:p-10"
          >
            <div className="flex items-center gap-3 mb-8">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-blue-300" />
              </div>
              <div>
                <p className="text-xs text-white/40 font-mono uppercase tracking-widest">After analysis</p>
                <p className="text-sm font-semibold text-white">ICC-Sample-Procedural-Order-2.txt</p>
              </div>
              <div className="ml-auto">
                <span className="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/20 px-3 py-1 rounded-full font-medium">16 items found</span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* Exhibits */}
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 bg-blue-500/10 border-b border-blue-500/20">
                  <FolderOpen className="w-4 h-4 text-blue-300" />
                  <span className="text-sm font-semibold text-blue-200">Exhibits</span>
                  <span className="ml-auto text-xs bg-blue-500/30 text-blue-200 px-2 py-0.5 rounded-full">5</span>
                </div>
                <div className="divide-y divide-blue-500/10">
                  {[
                    { ref: "C-7", label: "Internal board memorandum re. disputed transaction", party: "Claimant" },
                    { ref: "C-8", label: "PwC independent audit report", party: "Claimant" },
                    { ref: "C-9", label: "Cure period correspondence (Oct–Dec 2023)", party: "Claimant" },
                    { ref: "R-5", label: "Regulatory approval file and authority communications", party: "Respondent" },
                    { ref: "R-6", label: "Financial model and projections at time of agreement", party: "Respondent" },
                  ].map((ex) => (
                    <div key={ex.ref} className="flex items-start gap-2.5 px-4 py-2.5">
                      <div className="w-4 h-4 mt-0.5 rounded border-2 border-blue-400/60 bg-[#0F2547] flex items-center justify-center flex-shrink-0">
                        <CheckCircle2 className="w-2.5 h-2.5 text-blue-300" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-mono text-blue-300 mr-1">{ex.ref}</span>
                        <span className="text-xs text-blue-100 leading-snug">{ex.label}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Deadlines */}
              <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 bg-orange-500/10 border-b border-orange-500/20">
                  <CalendarDays className="w-4 h-4 text-orange-300" />
                  <span className="text-sm font-semibold text-orange-200">Deadlines</span>
                  <span className="ml-auto text-xs bg-orange-500/30 text-orange-200 px-2 py-0.5 rounded-full">9</span>
                </div>
                <div className="divide-y divide-orange-500/10">
                  {[
                    { label: "Document production completed", date: "28 Feb 2026", party: "All" },
                    { label: "Tribunal ruling on contested requests", date: "15 Mar 2026", party: "Tribunal" },
                    { label: "Claimant Reply Memorial", date: "15 Apr 2026", party: "Claimant" },
                    { label: "Simultaneous expert reports", date: "30 Jun 2026", party: "All" },
                    { label: "Pre-Hearing Submissions", date: "30 Sep 2026", party: "All" },
                    { label: "Merits Hearing (5 days)", date: "26 Oct 2026", party: "All" },
                  ].map((dl) => (
                    <div key={dl.label} className="flex items-start gap-2.5 px-4 py-2.5">
                      <div className="w-4 h-4 mt-0.5 rounded border-2 border-orange-400/60 bg-[#0F2547] flex items-center justify-center flex-shrink-0">
                        <CheckCircle2 className="w-2.5 h-2.5 text-orange-300" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-orange-100 leading-snug">{dl.label}</p>
                        <p className="text-xs text-orange-300/70 mt-0.5">{dl.date} · {dl.party}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Procedural Orders */}
              <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 bg-purple-500/10 border-b border-purple-500/20">
                  <FileText className="w-4 h-4 text-purple-300" />
                  <span className="text-sm font-semibold text-purple-200">Procedural Orders</span>
                  <span className="ml-auto text-xs bg-purple-500/30 text-purple-200 px-2 py-0.5 rounded-full">1</span>
                </div>
                <div className="divide-y divide-purple-500/10">
                  <div className="flex items-start gap-2.5 px-4 py-2.5">
                    <div className="w-4 h-4 mt-0.5 rounded border-2 border-purple-400/60 bg-[#0F2547] flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="w-2.5 h-2.5 text-purple-300" />
                    </div>
                    <div>
                      <span className="text-xs font-mono text-purple-300 block mb-1">PO-2 · 3 Feb 2026</span>
                      <p className="text-xs text-purple-100 leading-snug">Amended timetable, document production protocol (Redfern Schedule), expert evidence directions, and merits hearing arrangements (26–30 Oct 2026, 5 days, 20h per party).</p>
                    </div>
                  </div>
                </div>

                {/* Apply button mock */}
                <div className="px-4 py-4 border-t border-purple-500/20 bg-purple-500/5">
                  <div className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-white text-[#0F2547] text-sm font-semibold opacity-90">
                    <CheckCircle2 className="w-4 h-4" />
                    Add 16 items to case
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
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
              Open Procedural Manager
              <ArrowRight className="w-4 h-4" />
            </motion.button>
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-[#0a1a38] text-blue-300/60 text-xs text-center py-6 px-6">
        <div className="flex items-center justify-center gap-2 mb-1">
          <Scale className="w-3.5 h-3.5" />
          <span className="font-medium text-blue-200/80">Procedural Manager</span>
        </div>
        <p>Internal case management tool · Aligned with ICC Arbitration Rules 2021</p>
      </footer>
    </div>
  );
}
