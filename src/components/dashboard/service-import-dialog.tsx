'use client';

import { useState, useCallback, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Upload, FileSpreadsheet, Download, CheckCircle2, XCircle, AlertTriangle, Loader2 } from 'lucide-react';
import {
  generateTemplate,
  parseImportFile,
  validateImportData,
  getCategoryValues,
  getCategoryLabel,
} from '@/lib/service-import-export';
import type {
  ImportError,
  ImportResult,
  ParsedService,
  ParsedExtra,
} from '@/lib/service-import-export';
import { useCatalog } from '@/providers/catalog-provider';
import type { ServiceCategory, CancellationPolicy } from '@/types/database';

interface ServiceImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  policies: CancellationPolicy[];
  onImportComplete?: () => void;
}

type Step = 'category' | 'upload' | 'errors' | 'progress';

export function ServiceImportDialog({ open, onOpenChange, policies, onImportComplete }: ServiceImportDialogProps) {
  const { toast } = useToast();
  const { getFieldsForCategory } = useCatalog();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>('category');
  const [category, setCategory] = useState<ServiceCategory | ''>('');
  const [validServices, setValidServices] = useState<ParsedService[]>([]);
  const [validExtras, setValidExtras] = useState<ParsedExtra[]>([]);
  const [errors, setErrors] = useState<ImportError[]>([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, phase: '' });
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const categories = getCategoryValues();

  const reset = useCallback(() => {
    setStep('category');
    setCategory('');
    setValidServices([]);
    setValidExtras([]);
    setErrors([]);
    setImporting(false);
    setProgress({ current: 0, total: 0, phase: '' });
    setImportResult(null);
  }, []);

  const handleOpenChange = (open: boolean) => {
    if (!open) reset();
    onOpenChange(open);
  };

  const handleDownloadTemplate = () => {
    if (!category) return;
    try {
      const fields = getFieldsForCategory(category);
      const buffer = generateTemplate(category as ServiceCategory, policies, fields);
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `plantilla-${category.toLowerCase()}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: 'Plantilla descargada' });
    } catch (err) {
      console.error('[ImportDialog] Template generation error:', err);
      toast({ title: 'Error generando plantilla', variant: 'destructive' });
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !category) return;

    try {
      const buffer = await file.arrayBuffer();
      const { services, extras } = parseImportFile(buffer);

      if (services.length === 0) {
        toast({ title: 'El archivo no contiene servicios', description: 'Verifica que la hoja "Servicios" tenga datos.', variant: 'destructive' });
        return;
      }

      const catFields = getFieldsForCategory(category);
      const result = validateImportData(services, extras, category as ServiceCategory, policies, catFields);
      setValidServices(result.valid);
      setValidExtras(result.validExtras);
      setErrors(result.errors);

      if (result.errors.length > 0) {
        setStep('errors');
      } else {
        setStep('errors'); // Show summary even with no errors
      }
    } catch (err) {
      console.error('[ImportDialog] Parse error:', err);
      toast({
        title: 'Error leyendo archivo',
        description: err instanceof Error ? err.message : 'Verifica que el archivo sea un .xlsx valido.',
        variant: 'destructive',
      });
    }

    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleImport = async () => {
    if (validServices.length === 0 || !category) return;

    setStep('progress');
    setImporting(true);
    setProgress({ current: 0, total: validServices.length, phase: 'Creando servicios...' });

    try {
      const res = await fetch('/api/provider/services/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          services: validServices,
          extras: validExtras,
        }),
      });

      const result: ImportResult = await res.json();

      if (!res.ok) {
        toast({
          title: 'Error en importacion',
          description: (result as unknown as { error: string }).error || 'Error desconocido',
          variant: 'destructive',
        });
        setImporting(false);
        return;
      }

      setProgress({ current: result.created, total: validServices.length, phase: 'Servicios creados' });

      // Download images for created services
      const servicesWithImages = validServices.filter(s =>
        s.image_urls.length > 0 && result.services.some(rs => rs.title === s.title)
      );

      if (servicesWithImages.length > 0) {
        setProgress(prev => ({ ...prev, phase: 'Descargando imagenes...' }));

        for (let i = 0; i < servicesWithImages.length; i++) {
          const svc = servicesWithImages[i];
          const created = result.services.find(rs => rs.title === svc.title);
          if (!created) continue;

          setProgress(prev => ({
            ...prev,
            current: i + 1,
            total: servicesWithImages.length,
            phase: `Descargando imagenes... ${i + 1}/${servicesWithImages.length}`,
          }));

          try {
            await fetch('/api/provider/services/download-images', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                serviceId: created.id,
                imageUrls: svc.image_urls,
                videoUrls: svc.video_urls,
              }),
            });
          } catch (err) {
            console.error(`[ImportDialog] Image download error for "${svc.title}":`, err);
          }
        }
      }

      setImportResult(result);
      setImporting(false);

      if (result.created > 0) {
        onImportComplete?.();
      }
    } catch (err) {
      console.error('[ImportDialog] Import error:', err);
      toast({ title: 'Error de conexion', variant: 'destructive' });
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar servicios masivamente</DialogTitle>
          <DialogDescription>
            {step === 'category' && 'Selecciona la categoria y descarga la plantilla Excel'}
            {step === 'upload' && 'Sube el archivo Excel con tus servicios'}
            {step === 'errors' && 'Revisa los resultados de la validacion'}
            {step === 'progress' && 'Importando servicios...'}
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: Category selection */}
        {step === 'category' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              {categories.map(c => (
                <button
                  key={c.value}
                  onClick={() => setCategory(c.value as ServiceCategory)}
                  className={`p-3 rounded-lg border text-left transition-colors ${
                    category === c.value
                      ? 'border-primary bg-primary/5 ring-1 ring-primary'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <span className="text-sm font-medium">{c.label}</span>
                </button>
              ))}
            </div>

            {category && (
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={handleDownloadTemplate}>
                  <Download className="h-4 w-4 mr-2" />
                  Descargar plantilla
                </Button>
                <Button className="flex-1" onClick={() => setStep('upload')}>
                  Continuar
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Step 2: File upload */}
        {step === 'upload' && (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Categoria: <Badge variant="secondary">{getCategoryLabel(category as ServiceCategory)}</Badge>
            </div>

            <div
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <FileSpreadsheet className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm font-medium">Haz click para seleccionar archivo</p>
              <p className="text-xs text-muted-foreground mt-1">Archivo .xlsx (maximo 50 servicios)</p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx"
              className="hidden"
              onChange={handleFileSelect}
            />

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep('category')}>
                Atras
              </Button>
              <Button variant="outline" onClick={handleDownloadTemplate}>
                <Download className="h-4 w-4 mr-2" />
                Descargar plantilla
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Validation results */}
        {step === 'errors' && (
          <div className="space-y-4">
            {/* Summary */}
            <div className="flex gap-3">
              <div className="flex-1 p-3 rounded-lg bg-green-50 border border-green-200">
                <div className="text-2xl font-bold text-green-700">{validServices.length}</div>
                <div className="text-xs text-green-600">Servicios validos</div>
              </div>
              <div className="flex-1 p-3 rounded-lg bg-blue-50 border border-blue-200">
                <div className="text-2xl font-bold text-blue-700">{validExtras.length}</div>
                <div className="text-xs text-blue-600">Extras validos</div>
              </div>
              {errors.length > 0 && (
                <div className="flex-1 p-3 rounded-lg bg-red-50 border border-red-200">
                  <div className="text-2xl font-bold text-red-700">{errors.length}</div>
                  <div className="text-xs text-red-600">Errores</div>
                </div>
              )}
            </div>

            {/* Error table */}
            {errors.length > 0 && (
              <div className="rounded-md border max-h-[300px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Fila</TableHead>
                      <TableHead className="w-20">Hoja</TableHead>
                      <TableHead>Campo</TableHead>
                      <TableHead>Error</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {errors.map((err, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-mono text-xs">{err.row}</TableCell>
                        <TableCell><Badge variant="outline" className="text-xs">{err.sheet}</Badge></TableCell>
                        <TableCell className="text-xs font-medium">{err.field}</TableCell>
                        <TableCell className="text-xs text-red-600">{err.message}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep('upload')}>
                Subir otro archivo
              </Button>
              {validServices.length > 0 && (
                <Button onClick={handleImport}>
                  <Upload className="h-4 w-4 mr-2" />
                  Importar {validServices.length} servicio{validServices.length !== 1 ? 's' : ''}
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Step 4: Progress & Result */}
        {step === 'progress' && (
          <div className="space-y-4">
            {importing && (
              <>
                <div className="flex items-center gap-2 text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {progress.phase}
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-300"
                    style={{ width: progress.total > 0 ? `${(progress.current / progress.total) * 100}%` : '0%' }}
                  />
                </div>
              </>
            )}

            {!importing && importResult && (
              <>
                <div className="flex gap-3">
                  {importResult.created > 0 && (
                    <div className="flex-1 p-4 rounded-lg bg-green-50 border border-green-200 text-center">
                      <CheckCircle2 className="h-8 w-8 mx-auto text-green-500 mb-2" />
                      <div className="text-2xl font-bold text-green-700">{importResult.created}</div>
                      <div className="text-xs text-green-600">Servicios creados</div>
                    </div>
                  )}
                  {importResult.failed > 0 && (
                    <div className="flex-1 p-4 rounded-lg bg-red-50 border border-red-200 text-center">
                      <XCircle className="h-8 w-8 mx-auto text-red-500 mb-2" />
                      <div className="text-2xl font-bold text-red-700">{importResult.failed}</div>
                      <div className="text-xs text-red-600">Fallaron</div>
                    </div>
                  )}
                </div>

                {importResult.created > 0 && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 border border-blue-200">
                    <AlertTriangle className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                    <p className="text-xs text-blue-700">
                      Todos los servicios fueron creados como &quot;Pendiente de revision&quot;.
                      Un admin de Vivelo los revisara antes de publicarlos.
                    </p>
                  </div>
                )}

                {importResult.errors.length > 0 && (
                  <div className="rounded-md border max-h-[200px] overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-16">Fila</TableHead>
                          <TableHead>Error</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {importResult.errors.map((err, i) => (
                          <TableRow key={i}>
                            <TableCell className="font-mono text-xs">{err.row}</TableCell>
                            <TableCell className="text-xs text-red-600">{err.message}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                <div className="flex justify-end">
                  <Button onClick={() => handleOpenChange(false)}>
                    Cerrar
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
