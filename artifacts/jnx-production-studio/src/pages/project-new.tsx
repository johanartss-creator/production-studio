import { useState } from 'react';
import { useLocation } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useListTemplates, useCreateProject, getListProjectsQueryKey, getGetProjectSummaryQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Loader2, Ruler } from 'lucide-react';
import { Link } from 'wouter';
import { useToast } from '@/hooks/use-toast';

const projectSchema = z.object({
  templateId: z.enum(['oversized_hoodie', 'wide_cargo', 'boxy_tee', 'track_jacket', 'tailored_short'], { required_error: 'Please select a garment template' }),
  styleName: z.string().min(1, 'Style name is required'),
  styleNumber: z.string().min(1, 'Style number is required'),
  baseSize: z.string().min(1, 'Base size is required'),
  season: z.string().min(1, 'Season is required'),
  fit: z.string().min(1, 'Fit description is required'),
  description: z.string(),
  concept: z.string(),
  primaryColorName: z.string().min(1, 'Color name is required'),
  primaryColorHex: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Must be a valid hex color'),
  primaryColorPantone: z.string()
});

type ProjectFormValues = z.infer<typeof projectSchema>;

export function ProjectNew() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: templates, isLoading: loadingTemplates } = useListTemplates();
  const createProject = useCreateProject();

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      styleName: '',
      styleNumber: '',
      baseSize: 'L',
      season: 'FW24',
      fit: 'Oversized',
      description: '',
      concept: '',
      primaryColorName: 'Black',
      primaryColorHex: '#000000',
      primaryColorPantone: 'Black C'
    }
  });

  const onSubmit = (data: ProjectFormValues) => {
    const template = templates?.find(t => t.id === data.templateId);
    if (!template) {
      toast({ title: 'Error', description: 'Selected template not found', variant: 'destructive' });
      return;
    }

    createProject.mutate({
      data: {
        styleName: data.styleName,
        styleNumber: data.styleNumber,
        garmentType: template.id,
        baseSize: data.baseSize,
        season: data.season,
        fit: data.fit,
        description: data.description,
        concept: data.concept,
        primaryColor: {
          name: data.primaryColorName,
          hex: data.primaryColorHex,
          pantone: data.primaryColorPantone
        },
        measurements: template.measurements,
        materials: [],
        artworks: []
      }
    }, {
      onSuccess: (project) => {
        queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetProjectSummaryQueryKey() });
        toast({ title: 'Project Created', description: `Style ${project.styleNumber} initialized successfully.` });
        setLocation(`/projects/${project.id}`);
      },
      onError: (error) => {
        toast({ title: 'Creation Failed', description: error.message || 'Unknown error occurred', variant: 'destructive' });
      }
    });
  };

  return (
    <div className="container max-w-3xl py-8 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-4 mb-2">
        <Link href="/" className="inline-flex items-center justify-center whitespace-nowrap rounded-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-8 w-8">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Initialize Project</h1>
          <p className="text-muted-foreground text-sm">Create a new controlled apparel style.</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Card className="rounded-sm border-t-4 border-t-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Ruler className="h-5 w-5 text-primary" />
                Garment Template
              </CardTitle>
              <CardDescription>
                Select the base pattern block to initialize measurements. This cannot be changed later.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="templateId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Base Template</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={loadingTemplates}>
                      <FormControl>
                        <SelectTrigger className="font-mono h-12">
                          <SelectValue placeholder="Select a garment block..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {templates?.map(template => (
                          <SelectItem key={template.id} value={template.id} className="font-mono">
                            {template.name} ({template.id})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card className="rounded-sm">
            <CardHeader>
              <CardTitle>Identification</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="styleNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Style Number</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. JNX-HD-001" className="font-mono uppercase" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="styleName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Style Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Heavyweight Zip Hoodie" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="season"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Season</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. FW24" className="font-mono" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="baseSize"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Base Size</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. L" className="font-mono uppercase" {...field} />
                    </FormControl>
                    <FormDescription>Pattern is drafted at this size.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card className="rounded-sm">
            <CardHeader>
              <CardTitle>Design Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="fit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fit & Silhouette</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Dropped shoulder, cropped body" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FormField
                  control={form.control}
                  name="primaryColorName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Color Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Acid Wash Black" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="primaryColorHex"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Color Hex</FormLabel>
                      <div className="flex gap-2">
                        <div 
                          className="w-10 h-10 rounded-sm border" 
                          style={{ backgroundColor: form.watch('primaryColorHex') || '#000' }} 
                        />
                        <FormControl>
                          <Input placeholder="#000000" className="font-mono flex-1" {...field} />
                        </FormControl>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="primaryColorPantone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pantone Ref</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Black 6 C" className="font-mono" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="concept"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Design Concept (Optional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Inspiration, mood, intended usage..." className="min-h-24 resize-none" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Link href="/" className="inline-flex items-center justify-center whitespace-nowrap rounded-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2 font-mono uppercase tracking-wider text-xs">
              Cancel
            </Link>
            <Button 
              type="submit" 
              className="font-mono uppercase tracking-wider text-xs" 
              disabled={createProject.isPending}
            >
              {createProject.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Initialize Style
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}