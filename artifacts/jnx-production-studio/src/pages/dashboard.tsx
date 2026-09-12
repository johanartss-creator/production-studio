import { Link } from 'wouter';
import { useGetProjectSummary, useListProjects } from '@workspace/api-client-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, LayoutGrid, AlertTriangle, FileText, ChevronRight, Activity } from 'lucide-react';
import { format } from 'date-fns';

export function Dashboard() {
  const { data: summary, isLoading: loadingSummary } = useGetProjectSummary();
  const { data: projects, isLoading: loadingProjects } = useListProjects();

  return (
    <div className="container max-w-6xl py-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Production Desk</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Overview of JNX pattern developments and factory packages.
          </p>
        </div>
        <Link href="/projects/new" className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 py-2 font-mono uppercase tracking-wider text-xs">
          <Plus className="h-4 w-4" />
          Initialize Project
        </Link>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="rounded-none border-t-4 border-t-primary/20 hover:border-t-primary transition-colors">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
              Total Active Styles
              <LayoutGrid className="h-4 w-4 opacity-50" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingSummary ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-3xl font-bold font-mono">
                {summary?.totalProjects.toString().padStart(3, '0') || '000'}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-none border-t-4 border-t-destructive/20 hover:border-t-destructive transition-colors">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
              Preliminary Patterns
              <AlertTriangle className="h-4 w-4 opacity-50" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingSummary ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-3xl font-bold font-mono text-destructive">
                {summary?.preliminaryProjects.toString().padStart(3, '0') || '000'}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-none border-t-4 border-t-secondary/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
              System Activity
              <Activity className="h-4 w-4 opacity-50" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingSummary ? (
              <Skeleton className="h-8 w-16" />
            ) : summary?.latestProject ? (
              <div className="flex flex-col justify-center">
                <span className="text-sm font-medium truncate">Latest: {summary.latestProject.styleNumber}</span>
                <span className="text-xs text-muted-foreground font-mono">
                  {format(new Date(summary.latestProject.updatedAt), 'MMM dd, HH:mm')}
                </span>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">No recent activity</div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight border-b pb-2">Recent Projects</h2>
        
        {loadingProjects ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-16 w-full rounded-sm" />
            ))}
          </div>
        ) : !projects?.length ? (
          <div className="border border-dashed rounded-sm p-12 text-center flex flex-col items-center">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
              <FileText className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium">No projects found</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
              Initialize a new project using one of the controlled garment templates.
            </p>
            <Link href="/projects/new" className="mt-4 inline-flex items-center justify-center whitespace-nowrap rounded-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2 font-mono text-xs">
              New Project
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2">
            {projects.map(project => (
              <Link key={project.id} href={`/projects/${project.id}`}>
                <div className="group flex items-center justify-between p-4 border bg-card hover:bg-accent/50 transition-colors rounded-sm hover-elevate">
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col items-center justify-center w-12 h-12 bg-secondary rounded-sm">
                      <span className="font-mono text-[10px] uppercase text-muted-foreground">REV</span>
                      <span className="font-mono font-bold leading-none">{project.revision.toString().padStart(2, '0')}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold px-2 py-0.5 bg-primary/10 text-primary rounded-sm">
                          {project.styleNumber}
                        </span>
                        <h3 className="font-semibold">{project.styleName}</h3>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground font-mono">
                        <span>{project.garmentType.replaceAll('_', ' ').replace(/\b\w/g, letter => letter.toUpperCase())}</span>
                        <span className="w-1 h-1 rounded-full bg-border" />
                        <span>Base: {project.baseSize}</span>
                        <span className="w-1 h-1 rounded-full bg-border" />
                        <span>{format(new Date(project.updatedAt), 'MMM dd, yyyy')}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6">
                    {project.validationState === 'PRELIMINARY_UNVALIDATED' && (
                      <Badge variant="outline" className="text-destructive border-destructive/30 bg-destructive/5 font-mono text-[10px] hidden sm:inline-flex gap-1.5">
                        <AlertTriangle className="h-3 w-3" />
                        PRELIMINARY
                      </Badge>
                    )}
                    {project.validationState === 'APPROVED' && (
                      <Badge variant="outline" className="text-green-600 border-green-600/30 bg-green-600/5 font-mono text-[10px] hidden sm:inline-flex">
                        APPROVED
                      </Badge>
                    )}
                    <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors group-hover:translate-x-1 duration-200" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}