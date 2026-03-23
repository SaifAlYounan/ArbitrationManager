import { Link } from "wouter";
import { Scale, LogOut, Settings, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { useImport } from "@/lib/import-context";
import DocumentImport from "@/components/DocumentImport";

export default function Layout({ children, noPadding }: { children: React.ReactNode; noPadding?: boolean }) {
  const { activeCaseId, activeCaseName, importOpen, openImport, closeImport } = useImport();

  return (
    <div className="min-h-screen bg-background font-sans selection:bg-primary/20">
      <header className="sticky top-0 z-30 w-full border-b border-border bg-card/80 backdrop-blur-md shadow-sm print:hidden">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/app" className="flex items-center gap-3 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm group-hover:bg-primary/90 transition-colors">
              <Scale className="h-5 w-5" />
            </div>
            <span className="font-display text-xl font-bold text-foreground tracking-tight">
              Procedural Manager
            </span>
            <span className="ml-1 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-red-500 text-white shadow-sm">
              Demo
            </span>
          </Link>

          <nav className="flex items-center gap-2">
            {activeCaseId !== null && (
              <button
                onClick={openImport}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0F2547] text-white text-sm font-semibold hover:bg-[#1e3a6e] transition-colors shadow-sm"
              >
                <Sparkles className="w-4 h-4 text-blue-300" />
                Smart Import
              </button>
            )}
            <button className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-colors">
              <Settings className="w-5 h-5" />
            </button>
            <button className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-colors">
              <LogOut className="w-5 h-5" />
            </button>
            <div className="h-8 w-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-sm font-semibold text-primary">
              JS
            </div>
          </nav>
        </div>
      </header>

      {noPadding ? (
        <main>{children}</main>
      ) : (
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            {children}
          </motion.div>
        </main>
      )}

      {importOpen && activeCaseId !== null && (
        <DocumentImport caseId={activeCaseId} caseName={activeCaseName ?? undefined} onClose={closeImport} />
      )}
    </div>
  );
}
