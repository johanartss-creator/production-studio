import { useState } from 'react';
import { useRoute } from 'wouter';
import { 
  useGetProject, 
  useUpdateProject, 
  useDeleteProject,
  useGetFlatPreview, 
  useGetPatternPreview, 
  useGetGradingTable, 
  useGenerateFactoryPackage,
  getGetProjectQueryKey,
  getGetFlatPreviewQueryKey,
  getGetPatternPreviewQueryKey,
  getGetGradingTableQueryKey,
  getListProjectsQueryKey,
  getGetProjectSummaryQueryKey
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle, ArrowLeft, CheckCircle2, Download, FileArchive, Layers, PenTool, Ruler, FileText, Loader2, Save, Trash2 } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export function ProjectDetail() {
  const [, params] = useRoute('/projects/:id');
  const [, setLocation] = useLocation();
  const projectId = params?.id;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: project, isLoading: loadingProject } = useGetProject(projectId!, {
    query: { enabled: !!projectId, queryKey: getGetProjectQueryKey(projectId!) }
  });
  
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();
  
  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<any>(null);

  // Previews
  const { data: flatPreview, isLoading: loadingFlat } = useGetFlatPreview(projectId!, { query: { enabled: !!projectId, queryKey: getGetFlatPreviewQueryKey(projectId!) } });
  const { data: patternPreview, isLoading: loadingPattern } = useGetPatternPreview(projectId!, { query: { enabled: !!projectId, queryKey: getGetPatternPreviewQueryKey(projectId!) } });
  
  // Grading
  const { data: gradingTable, isLoading: loadingGrading } = useGetGradingTable(projectId!, { query: { enabled: !!projectId, queryKey: getGetGradingTableQueryKey(projectId!) } });
  
  // Factory Package
  const generatePackage = useGenerateFactoryPackage();
  const [factoryPackage, setFactoryPackage] = useState<any>(null);

  if (loadingProject) {
    return (
      <div className="container max-w-6xl py-8 space-y-8 animate-pulse">
        <Skeleton className="h-12 w-1/3" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!project) {
    return <div className="container max-w-6xl py-8 text-center text-muted-foreground">Project not found.</div>;
  }

  const handleStartEdit = () => {
    setEditForm({ ...project });
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    if (!editForm) return;
    updateProject.mutate({
      projectId: project.id,
      data: {
        styleName: editForm.styleName,
        styleNumber: editForm.styleNumber,
        garmentType: editForm.garmentType,
        baseSize: editForm.baseSize,
        season: editForm.season,
        fit: editForm.fit,
        description: editForm.description,
        concept: editForm.concept,
        primaryColor: editForm.primaryColor,
        measurements: editForm.measurements,
        materials: editForm.materials,
        artworks: editForm.artworks
      }
    }, {
      onSuccess: (updated) => {
        queryClient.setQueryData(getGetProjectQueryKey(project.id), updated);
        setIsEditing(false);
        toast({ title: 'Project Updated', description: 'Revisions saved successfully.' });
      },
      onError: (error) => {
        toast({ title: 'Update Failed', description: error.message, variant: 'destructive' });
      }
    });
  };

  const updateMeasurement = (index: number, field: 'valueCm' | 'toleranceCm' | 'gradeRule', value: string) => {
    setEditForm((current: any) => {
      if (!current) return current;
      const measurements = current.measurements.map((measurement: any, measurementIndex: number) =>
        measurementIndex === index
          ? { ...measurement, [field]: field === 'gradeRule' ? value : Number(value) }
          : measurement
      );
      return { ...current, measurements };
    });
  };

  const handleGeneratePackage = () => {
    generatePackage.mutate({ projectId: project.id }, {
      onSuccess: (data) => {
        setFactoryPackage(data);
        toast({ title: 'Factory Package Generated', description: 'Ready for download.' });
      },
      onError: (error) => {
        toast({ title: 'Generation Failed', description: error.message, variant: 'destructive' });
      }
    });
  };

  const handleDelete = () => {
    if (!confirm('Are you sure you want to delete this project? This cannot be undone.')) return;
    deleteProject.mutate({ projectId: project.id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetProjectSummaryQueryKey() });
        toast({ title: 'Project Deleted' });
        setLocation('/');
      },
      onError: (error) => {
        toast({ title: 'Delete Failed', description: error.message, variant: 'destructive' });
      }
    });
  };

  return (
    <div className="container max-w-6xl py-8 space-y-6 animate-in fade-in duration-500 pb-24">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-6">
        <div className="flex items-start gap-4">
          <Link href="/" className="inline-flex items-center justify-center whitespace-nowrap rounded-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 w-9 mt-1 shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Badge variant="outline" className="font-mono text-xs rounded-sm bg-primary/5 text-primary border-primary/20">
                {project.styleNumber}
              </Badge>
              <Badge variant="secondary" className="font-mono text-[10px] rounded-sm uppercase tracking-wider">
                REV {project.revision.toString().padStart(2, '0')}
              </Badge>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">{project.styleName}</h1>
            <p className="text-muted-foreground text-sm font-mono mt-1">
              {project.garmentType.replaceAll('_', ' ').toUpperCase()} // {project.season} // BASE: {project.baseSize}
            </p>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2 mb-2">
            <Button variant="outline" size="sm" onClick={handleDelete} disabled={deleteProject.isPending} className="text-destructive border-destructive/20 hover:bg-destructive/10 hover:text-destructive font-mono text-[10px] h-7">
              {deleteProject.isPending ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Trash2 className="h-3 w-3 mr-1" />}
              DELETE PROJECT
            </Button>
          </div>
          {project.validationState === 'PRELIMINARY_UNVALIDATED' && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-sm bg-destructive/10 border border-destructive/20 text-destructive text-sm font-semibold tracking-wide shadow-[0_0_15px_rgba(255,0,0,0.1)]">
              <AlertTriangle className="h-4 w-4" />
              PRELIMINARY / UNVALIDATED
            </div>
          )}
          {project.validationState === 'APPROVED' && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-sm bg-green-600/10 border border-green-600/20 text-green-700 text-sm font-semibold tracking-wide">
              <CheckCircle2 className="h-4 w-4" />
              BULK APPROVED
            </div>
          )}
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="w-full justify-start rounded-none border-b bg-transparent p-0 h-auto space-x-6">
          <TabsTrigger value="overview" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 py-3 font-mono text-xs uppercase tracking-wider">
            Overview
          </TabsTrigger>
          <TabsTrigger value="measurements" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 py-3 font-mono text-xs uppercase tracking-wider">
            Measurements
          </TabsTrigger>
          <TabsTrigger value="previews" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 py-3 font-mono text-xs uppercase tracking-wider">
            Previews
          </TabsTrigger>
          <TabsTrigger value="grading" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 py-3 font-mono text-xs uppercase tracking-wider">
            Grading Table
          </TabsTrigger>
          <TabsTrigger value="package" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 py-3 font-mono text-xs uppercase tracking-wider text-primary">
            Factory Package
          </TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="overview" className="space-y-6 m-0">
            <Card className="rounded-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle>Technical Specs</CardTitle>
                  <CardDescription>Core product metadata and design concept.</CardDescription>
                </div>
                {!isEditing ? (
                  <Button variant="outline" size="sm" onClick={handleStartEdit} className="font-mono text-xs h-8">
                    <PenTool className="h-3 w-3 mr-2" />
                    Edit Specs
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)} className="font-mono text-xs h-8">
                      Cancel
                    </Button>
                    <Button size="sm" onClick={handleSaveEdit} disabled={updateProject.isPending} className="font-mono text-xs h-8">
                      {updateProject.isPending ? <Loader2 className="h-3 w-3 mr-2 animate-spin" /> : <Save className="h-3 w-3 mr-2" />}
                      Save
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-6">
                {!isEditing ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div className="space-y-1">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Style No.</span>
                      <p className="font-mono font-medium">{project.styleNumber}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Season</span>
                      <p className="font-mono font-medium">{project.season}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Base Size</span>
                      <p className="font-mono font-medium">{project.baseSize}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Color</span>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-sm border" style={{ backgroundColor: project.primaryColor.hex }} />
                        <p className="font-mono font-medium text-sm">{project.primaryColor.name} ({project.primaryColor.pantone})</p>
                      </div>
                    </div>
                    <div className="col-span-2 md:col-span-4 space-y-1">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Fit & Concept</span>
                      <p className="text-sm font-medium">{project.fit}</p>
                      <p className="text-sm text-muted-foreground mt-1">{project.concept}</p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Style Number</Label>
                      <Input value={editForm.styleNumber} onChange={e => setEditForm({...editForm, styleNumber: e.target.value})} className="font-mono" />
                    </div>
                    <div className="space-y-2">
                      <Label>Style Name</Label>
                      <Input value={editForm.styleName} onChange={e => setEditForm({...editForm, styleName: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label>Season</Label>
                      <Input value={editForm.season} onChange={e => setEditForm({...editForm, season: e.target.value})} className="font-mono" />
                    </div>
                    <div className="space-y-2">
                      <Label>Fit</Label>
                      <Input value={editForm.fit} onChange={e => setEditForm({...editForm, fit: e.target.value})} />
                    </div>
                    <div className="space-y-2 col-span-2">
                      <Label>Concept</Label>
                      <Textarea value={editForm.concept} onChange={e => setEditForm({...editForm, concept: e.target.value})} />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="measurements" className="m-0">
            <Card className="rounded-sm">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Base Size Measurements ({project.baseSize})</CardTitle>
                  <CardDescription>These values drive the parametric pattern geometry and grading table.</CardDescription>
                </div>
                {!isEditing ? (
                  <Button variant="outline" size="sm" onClick={handleStartEdit} className="font-mono text-xs h-8">
                    <PenTool className="h-3 w-3 mr-2" /> Edit Measurements
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)} className="font-mono text-xs h-8">Cancel</Button>
                    <Button size="sm" onClick={handleSaveEdit} disabled={updateProject.isPending} className="font-mono text-xs h-8">
                      <Save className="h-3 w-3 mr-2" /> Save Revision
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                <div className="border rounded-sm overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead className="w-24 font-mono text-xs">CODE</TableHead>
                        <TableHead className="font-mono text-xs">POINT OF MEASURE</TableHead>
                        <TableHead className="text-right font-mono text-xs">VALUE (CM)</TableHead>
                        <TableHead className="text-right font-mono text-xs">TOL (+/-)</TableHead>
                        <TableHead className="text-right font-mono text-xs">GRADE RULE</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {project.measurements.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No measurements defined.</TableCell>
                        </TableRow>
                      ) : (
                        (isEditing && editForm ? editForm.measurements : project.measurements).map((m: any, index: number) => (
                          <TableRow key={m.code} className="hover:bg-muted/30">
                            <TableCell className="font-mono font-medium">{m.code}</TableCell>
                            <TableCell>{m.name}</TableCell>
                            <TableCell className="text-right font-mono">
                              {isEditing ? <Input type="number" step="0.1" value={m.valueCm} onChange={e => updateMeasurement(index, 'valueCm', e.target.value)} className="h-8 w-24 ml-auto text-right font-mono" /> : m.valueCm.toFixed(1)}
                            </TableCell>
                            <TableCell className="text-right font-mono text-muted-foreground">
                              {isEditing ? <Input type="number" step="0.1" value={m.toleranceCm} onChange={e => updateMeasurement(index, 'toleranceCm', e.target.value)} className="h-8 w-20 ml-auto text-right font-mono" /> : m.toleranceCm.toFixed(1)}
                            </TableCell>
                            <TableCell className="text-right font-mono text-muted-foreground">
                              {isEditing ? <Input type="number" step="0.1" value={m.gradeRule} onChange={e => updateMeasurement(index, 'gradeRule', e.target.value)} className="h-8 w-20 ml-auto text-right font-mono" /> : m.gradeRule}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="previews" className="space-y-6 m-0">
            {project.validationState === 'PRELIMINARY_UNVALIDATED' && (
              <div className="bg-destructive/5 border border-destructive/20 p-4 rounded-sm flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-destructive uppercase tracking-wider">Preliminary Output Warning</h4>
                  <p className="text-sm text-destructive/80 mt-1">
                    These previews are automatically generated from preliminary specifications. Do not use for bulk cutting. Sample production required.
                  </p>
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="rounded-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <PenTool className="h-4 w-4 text-muted-foreground" />
                    Technical Flat
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex justify-center p-6 bg-muted/20 border-t min-h-[400px]">
                  {loadingFlat ? (
                    <div className="flex flex-col items-center justify-center text-muted-foreground h-full">
                      <Loader2 className="h-8 w-8 animate-spin mb-4" />
                      <span className="font-mono text-xs uppercase tracking-wider">Rendering Flat...</span>
                    </div>
                  ) : flatPreview ? (
                    <div className="w-full max-w-sm" dangerouslySetInnerHTML={{ __html: flatPreview.svg }} />
                  ) : (
                    <div className="flex items-center justify-center text-muted-foreground h-full font-mono text-sm">Preview Unavailable</div>
                  )}
                </CardContent>
                {flatPreview?.warning && (
                  <CardFooter className="bg-orange-50 border-t border-orange-100 p-3">
                    <p className="text-xs text-orange-800 font-mono flex items-center gap-2">
                      <AlertTriangle className="h-3 w-3" /> {flatPreview.warning}
                    </p>
                  </CardFooter>
                )}
              </Card>

              <Card className="rounded-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Layers className="h-4 w-4 text-muted-foreground" />
                    Graded Pattern
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex justify-center p-6 bg-muted/20 border-t min-h-[400px]">
                  {loadingPattern ? (
                    <div className="flex flex-col items-center justify-center text-muted-foreground h-full">
                      <Loader2 className="h-8 w-8 animate-spin mb-4" />
                      <span className="font-mono text-xs uppercase tracking-wider">Plotting Pattern...</span>
                    </div>
                  ) : patternPreview ? (
                    <div className="w-full max-w-sm" dangerouslySetInnerHTML={{ __html: patternPreview.svg }} />
                  ) : (
                    <div className="flex items-center justify-center text-muted-foreground h-full font-mono text-sm">Preview Unavailable</div>
                  )}
                </CardContent>
                {patternPreview?.warning && (
                  <CardFooter className="bg-orange-50 border-t border-orange-100 p-3">
                    <p className="text-xs text-orange-800 font-mono flex items-center gap-2">
                      <AlertTriangle className="h-3 w-3" /> {patternPreview.warning}
                    </p>
                  </CardFooter>
                )}
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="grading" className="m-0">
            <Card className="rounded-sm border-t-4 border-t-secondary">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Ruler className="h-5 w-5 text-muted-foreground" />
                  Full Size Run Grading
                </CardTitle>
                <CardDescription>Calculated grade increments across all sizes.</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingGrading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : !gradingTable?.length ? (
                  <div className="text-center py-12 text-muted-foreground border border-dashed rounded-sm">No grading rules defined.</div>
                ) : (
                  <div className="border rounded-sm overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-muted/50">
                        <TableRow>
                          <TableHead className="w-16 font-mono text-xs">CODE</TableHead>
                          <TableHead className="font-mono text-xs min-w-[150px]">POM</TableHead>
                          {Object.keys(gradingTable[0].sizes).map(size => (
                            <TableHead key={size} className="text-right font-mono text-xs font-bold text-foreground">
                              {size}
                            </TableHead>
                          ))}
                          <TableHead className="text-right font-mono text-xs text-muted-foreground">TOL</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {gradingTable.map(row => (
                          <TableRow key={row.code} className="hover:bg-muted/30">
                            <TableCell className="font-mono font-medium">{row.code}</TableCell>
                            <TableCell className="truncate max-w-[200px]" title={row.name}>{row.name}</TableCell>
                            {Object.entries(row.sizes).map(([size, val]) => (
                              <TableCell key={size} className={`text-right font-mono ${size === project.baseSize ? 'font-bold bg-primary/5 text-primary' : ''}`}>
                                {val.toFixed(1)}
                              </TableCell>
                            ))}
                            <TableCell className="text-right font-mono text-muted-foreground text-xs">{row.toleranceCm.toFixed(1)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="package" className="m-0">
            <Card className="rounded-sm border-2 border-primary/20 bg-primary/5">
              <CardHeader className="text-center pb-2 pt-8">
                <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4 text-primary">
                  <FileArchive className="h-8 w-8" />
                </div>
                <CardTitle className="text-2xl">Factory Technical Package</CardTitle>
                <CardDescription className="max-w-md mx-auto mt-2">
                  Generate the comprehensive .zip archive including tech pack PDF, DXF pattern files, marker maps, and AI artwork templates.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center pb-8 pt-4">
                
                {project.validationState === 'PRELIMINARY_UNVALIDATED' && (
                  <div className="max-w-md w-full bg-background border border-destructive/20 rounded-sm p-4 text-center mb-6 shadow-sm">
                    <AlertTriangle className="h-6 w-6 text-destructive mx-auto mb-2" />
                    <p className="text-sm font-semibold text-destructive">UNVALIDATED PRELIMINARY DATA</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      The generated package will be watermarked as preliminary. Factory should only proceed with sampling, not bulk production.
                    </p>
                  </div>
                )}

                {!factoryPackage ? (
                  <Button 
                    size="lg" 
                    className="font-mono uppercase tracking-wider text-sm px-8"
                    onClick={handleGeneratePackage}
                    disabled={generatePackage.isPending}
                  >
                    {generatePackage.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Compiling Package...
                      </>
                    ) : (
                      <>
                        <Download className="mr-2 h-4 w-4" />
                        Generate Package
                      </>
                    )}
                  </Button>
                ) : (
                  <div className="w-full max-w-lg bg-background border rounded-sm shadow-sm overflow-hidden animate-in zoom-in-95">
                    <div className="bg-primary/10 p-4 border-b flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                        <span className="font-semibold">{factoryPackage.packageName}</span>
                      </div>
                      <a href={factoryPackage.downloadUrl} download>
                        <Button size="sm" className="font-mono text-xs">
                          <Download className="h-3 w-3 mr-2" /> Download ZIP
                        </Button>
                      </a>
                    </div>
                    <div className="p-4">
                      <h4 className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-3">Included Artifacts</h4>
                      <ul className="space-y-2">
                        {factoryPackage.files.map((file: string, i: number) => (
                          <li key={i} className="flex items-center gap-3 text-sm font-mono p-2 bg-muted/30 rounded-sm">
                            <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                            <span className="truncate">{file}</span>
                          </li>
                        ))}
                      </ul>
                      {factoryPackage.warning && (
                        <p className="mt-4 text-xs text-destructive font-mono border-t pt-3 flex gap-2 items-start">
                          <AlertTriangle className="h-4 w-4 shrink-0" />
                          {factoryPackage.warning}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}