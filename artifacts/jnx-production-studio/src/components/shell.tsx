import { ReactNode } from 'react';
import { Link } from 'wouter';
import { useHealthCheck } from '@workspace/api-client-react';
import { Activity, Hexagon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export function Shell({ children }: { children: ReactNode }) {
  const { data: health, isError } = useHealthCheck();

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background selection:bg-primary/30">
      <header className="sticky top-0 z-50 w-full border-b bg-card/80 backdrop-blur">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
              <Hexagon className="h-5 w-5 text-primary fill-primary/10" />
              <span className="font-bold tracking-tight text-foreground uppercase">
                JNX Studio
              </span>
            </Link>
            <nav className="flex items-center gap-4 text-sm font-medium">
              <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors">
                Dashboard
              </Link>
              <Link href="/projects/new" className="text-muted-foreground hover:text-foreground transition-colors">
                New Project
              </Link>
            </nav>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs font-mono">
              <Activity className="h-3 w-3 text-muted-foreground" />
              {isError ? (
                <span className="text-destructive">API OFFLINE</span>
              ) : health ? (
                <span className="text-primary">SYS.ONLINE</span>
              ) : (
                <span className="text-muted-foreground animate-pulse">CONNECTING...</span>
              )}
            </div>
            <div className="h-4 w-px bg-border"></div>
            <Badge variant="outline" className="font-mono text-[10px] rounded-sm tracking-widest">
              v2.1.0-beta
            </Badge>
          </div>
        </div>
      </header>
      
      <main className="flex-1 flex flex-col relative">
        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        {children}
      </main>
    </div>
  );
}