"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Database, MessageSquare, Mic, LayoutGrid, Settings, User } from "lucide-react";
import { cn } from "@/lib/utils";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const navItems = [
    { href: "/dashboard", icon: LayoutGrid, label: "Assistants" },
    { href: "/dashboard/knowledge", icon: Database, label: "Knowledge" },
    {
      href: "/dashboard/playground",
      icon: MessageSquare,
      label: "Test Playground"
    },
    { href: "/dashboard/settings", icon: Settings, label: "Settings" }
  ];

  return (
    <div className="flex h-screen bg-background text-foreground font-sans tracking-tight overflow-hidden">
      {/* Premium Sidebar */}
      <aside className="w-64 border-r border-border bg-sidebar flex flex-col relative z-10 transition-colors">
        <div className="h-[72px] flex items-center px-6 border-b border-border">
          <Link href="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-80">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-fuchsia-600 p-[1px] shadow-sm shadow-indigo-500/20">
              <div className="w-full h-full rounded-[7px] bg-background flex items-center justify-center">
                <Mic className="w-4 h-4 text-foreground" />
              </div>
            </div>
            <span className="text-foreground font-medium text-[15px] tracking-tight">Vocalize AI</span>
          </Link>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-[14px] font-medium transition-all duration-200 group",
                  isActive 
                    ? "bg-accent text-accent-foreground shadow-sm ring-1 ring-border" 
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <item.icon className={cn("w-4 h-4 transition-colors", isActive ? "text-indigo-400" : "text-muted-foreground group-hover:text-foreground")} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        
        <div className="p-4 border-t border-border bg-sidebar/50">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted transition-colors cursor-pointer ring-1 ring-transparent hover:ring-border">
            <div className="w-8 h-8 rounded-full border border-border bg-gradient-to-tr from-indigo-500/20 to-fuchsia-600/20 flex items-center justify-center shrink-0">
              <User className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-medium text-foreground truncate">Guest User</span>
              <span className="text-xs text-muted-foreground truncate">Free Tier</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto w-full relative">
        <div className="w-full max-w-7xl mx-auto px-8 lg:px-12 py-10">
          {children}
        </div>
      </main>
    </div>
  );
}
