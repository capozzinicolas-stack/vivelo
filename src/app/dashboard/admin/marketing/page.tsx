'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, Pencil } from 'lucide-react';
import type { FeaturedPlacement, Campaign, FeaturedSection, Service, ShowcaseItem, SiteBanner } from '@/types/database';
import { FEATURED_SECTION_LABELS, CAMPAIGN_STATUS_LABELS, CAMPAIGN_STATUS_COLORS, GRADIENT_OPTIONS, BANNER_KEY_LABELS } from '@/lib/constants';
import { useCatalog } from '@/providers/catalog-provider';
import { useToast } from '@/hooks/use-toast';
import {
  getAllFeaturedPlacements, createFeaturedPlacement, deleteFeaturedPlacement,
  getCampaigns, createCampaign, updateCampaignStatus,
  getAllServices, createNotification,
  getAllShowcaseItems, createShowcaseItem, updateShowcaseItem, deleteShowcaseItem,
  getAllSiteBanners, updateSiteBanner,
} from '@/lib/supabase/queries';

export default function AdminMarketingPage() {
  const { categories, getSubcategoriesByCategory } = useCatalog();
  const { toast } = useToast();
  const [placements, setPlacements] = useState<FeaturedPlacement[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [placementDialogOpen, setPlacementDialogOpen] = useState(false);
  const [campaignDialogOpen, setCampaignDialogOpen] = useState(false);

  // Placement form
  const [pServiceId, setPServiceId] = useState('');
  const [pSection, setPSection] = useState<FeaturedSection>('servicios_destacados');
  const [pPosition, setPPosition] = useState(0);
  const [pStartDate, setPStartDate] = useState('');
  const [pEndDate, setPEndDate] = useState('');

  // Showcase & Banner state
  const [showcaseItems, setShowcaseItems] = useState<ShowcaseItem[]>([]);
  const [siteBanners, setSiteBanners] = useState<SiteBanner[]>([]);
  const [showcaseDialogOpen, setShowcaseDialogOpen] = useState(false);
  const [bannerDialogOpen, setBannerDialogOpen] = useState(false);
  const [editingShowcaseId, setEditingShowcaseId] = useState<string | null>(null);
  const [editingBannerId, setEditingBannerId] = useState<string | null>(null);

  // Showcase form
  const [sLabel, setSLabel] = useState('');
  const [sDescription, setSDescription] = useState('');
  const [sSubcategory, setSSubcategory] = useState('');
  const [sParentCategory, setSParentCategory] = useState('');
  const [sGradientColor, setSGradientColor] = useState('from-purple-500 to-pink-500');
  const [sPosition, setSPosition] = useState(0);

  // Banner form
  const [bTitle, setBTitle] = useState('');
  const [bSubtitle, setBSubtitle] = useState('');
  const [bButtonText, setBButtonText] = useState('');
  const [bButtonLink, setBButtonLink] = useState('');
  const [bGradient, setBGradient] = useState('');
  const [bIsActive, setBIsActive] = useState(true);

  // Campaign form
  const [cInternalName, setCInternalName] = useState('');
  const [cExternalName, setCExternalName] = useState('');
  const [cDescription, setCDescription] = useState('');
  const [cDiscountPct, setCDiscountPct] = useState(0);
  const [cCommissionReduction, setCCommissionReduction] = useState(0);
  const [cViveloAbsorbs, setCViveloAbsorbs] = useState(100);
  const [cProviderAbsorbs, setCProviderAbsorbs] = useState(0);
  const [cStartDate, setCStartDate] = useState('');
  const [cEndDate, setCEndDate] = useState('');
  const [cChannels, setCChannels] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [p, c, s, si, sb] = await Promise.all([
        getAllFeaturedPlacements(),
        getCampaigns(),
        getAllServices(),
        getAllShowcaseItems(),
        getAllSiteBanners(),
      ]);
      setPlacements(p);
      setCampaigns(c);
      setServices(s.filter(sv => sv.status === 'active'));
      setShowcaseItems(si);
      setSiteBanners(sb);
    } catch (err) {
      console.error('Error loading marketing data:', err);
    }
    setLoading(false);
  }

  async function handleCreatePlacement() {
    if (!pServiceId || !pStartDate || !pEndDate) {
      toast({ title: 'Campos incompletos', description: 'Selecciona servicio, fecha inicio y fecha fin.', variant: 'destructive' });
      return;
    }
    try {
      await createFeaturedPlacement({
        service_id: pServiceId,
        section: pSection,
        position: pPosition,
        start_date: new Date(pStartDate).toISOString(),
        end_date: new Date(pEndDate).toISOString(),
      });
      const service = services.find(s => s.id === pServiceId);
      if (service?.provider_id) {
        const startLabel = new Date(pStartDate).toLocaleDateString('es-MX');
        const endLabel = new Date(pEndDate).toLocaleDateString('es-MX');
        await createNotification({
          recipient_id: service.provider_id,
          type: 'featured_placement',
          title: 'Tu servicio fue destacado',
          message: `Tu servicio "${service.title}" fue escogido para destaque en la seccion ${FEATURED_SECTION_LABELS[pSection]} del ${startLabel} al ${endLabel}.`,
          link: '/dashboard/proveedor/servicios',
        });
      }
      setPlacementDialogOpen(false);
      resetPlacementForm();
      await loadData();
      toast({ title: 'Destaque creado', description: `"${service?.title}" agregado a ${FEATURED_SECTION_LABELS[pSection]}. Notificacion enviada al proveedor.` });
    } catch (err) {
      console.error('Error creating placement:', err);
      toast({ title: 'Error', description: 'No se pudo crear el destaque.', variant: 'destructive' });
    }
  }

  async function handleDeletePlacement(id: string) {
    try {
      await deleteFeaturedPlacement(id);
      await loadData();
      toast({ title: 'Destaque eliminado' });
    } catch (err) {
      console.error('Error deleting placement:', err);
      toast({ title: 'Error', description: 'No se pudo eliminar el destaque.', variant: 'destructive' });
    }
  }

  async function handleCreateCampaign() {
    if (!cInternalName || !cExternalName || !cStartDate || !cEndDate) {
      toast({ title: 'Campos incompletos', description: 'Completa nombre interno, externo y fechas.', variant: 'destructive' });
      return;
    }
    try {
      await createCampaign({
        internal_name: cInternalName,
        external_name: cExternalName,
        description: cDescription || undefined,
        discount_pct: cDiscountPct,
        commission_reduction_pct: cCommissionReduction,
        vivelo_absorbs_pct: cViveloAbsorbs,
        provider_absorbs_pct: cProviderAbsorbs,
        start_date: new Date(cStartDate).toISOString(),
        end_date: new Date(cEndDate).toISOString(),
        exposure_channels: cChannels.split(',').map(c => c.trim()).filter(Boolean),
      });
      setCampaignDialogOpen(false);
      resetCampaignForm();
      await loadData();
      toast({ title: 'Campana creada', description: `"${cExternalName}" creada como borrador.` });
    } catch (err) {
      console.error('Error creating campaign:', err);
      toast({ title: 'Error', description: 'No se pudo crear la campana.', variant: 'destructive' });
    }
  }

  async function handleCampaignAction(id: string, action: 'active' | 'ended' | 'cancelled') {
    const labels = { active: 'activada', ended: 'finalizada', cancelled: 'cancelada' };
    try {
      await updateCampaignStatus(id, action);
      await loadData();
      toast({ title: `Campana ${labels[action]}` });
    } catch (err) {
      console.error('Error updating campaign:', err);
      toast({ title: 'Error', description: 'No se pudo actualizar la campana.', variant: 'destructive' });
    }
  }

  function resetPlacementForm() {
    setPServiceId('');
    setPSection('servicios_destacados');
    setPPosition(0);
    setPStartDate('');
    setPEndDate('');
  }

  function resetCampaignForm() {
    setCInternalName('');
    setCExternalName('');
    setCDescription('');
    setCDiscountPct(0);
    setCCommissionReduction(0);
    setCViveloAbsorbs(100);
    setCProviderAbsorbs(0);
    setCStartDate('');
    setCEndDate('');
    setCChannels('');
  }

  // Showcase handlers
  function resetShowcaseForm() {
    setSLabel(''); setSDescription(''); setSSubcategory(''); setSParentCategory(''); setSGradientColor('from-purple-500 to-pink-500'); setSPosition(0);
    setEditingShowcaseId(null);
  }

  function openEditShowcase(item: ShowcaseItem) {
    setSLabel(item.label); setSDescription(item.description); setSSubcategory(item.subcategory); setSParentCategory(item.parent_category); setSGradientColor(item.gradient_color); setSPosition(item.position);
    setEditingShowcaseId(item.id);
    setShowcaseDialogOpen(true);
  }

  async function handleSaveShowcase() {
    if (!sLabel || !sSubcategory || !sParentCategory) {
      toast({ title: 'Campos incompletos', description: 'Completa label, subcategoria y categoria.', variant: 'destructive' });
      return;
    }
    try {
      if (editingShowcaseId) {
        await updateShowcaseItem(editingShowcaseId, { label: sLabel, description: sDescription, subcategory: sSubcategory, parent_category: sParentCategory, gradient_color: sGradientColor, position: sPosition });
        toast({ title: 'Item actualizado' });
      } else {
        await createShowcaseItem({ label: sLabel, description: sDescription, subcategory: sSubcategory, parent_category: sParentCategory, gradient_color: sGradientColor, position: sPosition });
        toast({ title: 'Item creado' });
      }
      setShowcaseDialogOpen(false);
      resetShowcaseForm();
      await loadData();
    } catch {
      toast({ title: 'Error', description: 'No se pudo guardar el item.', variant: 'destructive' });
    }
  }

  async function handleDeleteShowcase(id: string) {
    try {
      await deleteShowcaseItem(id);
      await loadData();
      toast({ title: 'Item eliminado' });
    } catch {
      toast({ title: 'Error', description: 'No se pudo eliminar.', variant: 'destructive' });
    }
  }

  async function handleToggleShowcaseActive(item: ShowcaseItem) {
    try {
      await updateShowcaseItem(item.id, { is_active: !item.is_active });
      await loadData();
    } catch {
      toast({ title: 'Error', variant: 'destructive' });
    }
  }

  // Banner handlers
  function openEditBanner(banner: SiteBanner) {
    setBTitle(banner.title); setBSubtitle(banner.subtitle ?? ''); setBButtonText(banner.button_text ?? ''); setBButtonLink(banner.button_link ?? ''); setBGradient(banner.gradient ?? ''); setBIsActive(banner.is_active);
    setEditingBannerId(banner.id);
    setBannerDialogOpen(true);
  }

  async function handleSaveBanner() {
    if (!editingBannerId) return;
    try {
      await updateSiteBanner(editingBannerId, { title: bTitle, subtitle: bSubtitle || null, button_text: bButtonText || null, button_link: bButtonLink || null, gradient: bGradient || null, is_active: bIsActive });
      setBannerDialogOpen(false);
      setEditingBannerId(null);
      await loadData();
      toast({ title: 'Banner actualizado' });
    } catch {
      toast({ title: 'Error', description: 'No se pudo actualizar el banner.', variant: 'destructive' });
    }
  }

  // Available subcategories based on selected parent category
  const availableSubcategories = sParentCategory
    ? getSubcategoriesByCategory(sParentCategory)
    : [];

  const groupedPlacements = (['servicios_destacados', 'servicios_recomendados', 'mas_vendidos'] as FeaturedSection[]).map(section => ({
    section,
    label: FEATURED_SECTION_LABELS[section],
    items: placements.filter(p => p.section === section),
  }));

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Marketing</h1>

      <Tabs defaultValue="destaques">
        <TabsList>
          <TabsTrigger value="destaques">Areas de Destaque</TabsTrigger>
          <TabsTrigger value="campanas">Campanas</TabsTrigger>
          <TabsTrigger value="banners">Banners y Showcase</TabsTrigger>
        </TabsList>

        <TabsContent value="destaques" className="space-y-6">
          <div className="flex justify-end">
            <Dialog open={placementDialogOpen} onOpenChange={setPlacementDialogOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-2" />Agregar Destaque</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Nuevo Destaque</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Seccion</Label>
                    <Select value={pSection} onValueChange={(v) => setPSection(v as FeaturedSection)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(FEATURED_SECTION_LABELS).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Servicio</Label>
                    <Select value={pServiceId} onValueChange={setPServiceId}>
                      <SelectTrigger><SelectValue placeholder="Seleccionar servicio" /></SelectTrigger>
                      <SelectContent>
                        {services.map(s => (
                          <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Posicion</Label>
                    <Input type="number" value={pPosition} onChange={e => setPPosition(Number(e.target.value))} min={0} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Fecha inicio</Label>
                      <Input type="date" value={pStartDate} onChange={e => setPStartDate(e.target.value)} />
                    </div>
                    <div>
                      <Label>Fecha fin</Label>
                      <Input type="date" value={pEndDate} onChange={e => setPEndDate(e.target.value)} />
                    </div>
                  </div>
                  <Button onClick={handleCreatePlacement} className="w-full">Crear Destaque</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {groupedPlacements.map(group => (
            <Card key={group.section}>
              <CardHeader>
                <CardTitle className="text-lg">{group.label}</CardTitle>
              </CardHeader>
              <CardContent>
                {group.items.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sin destaques en esta seccion</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Pos</TableHead>
                        <TableHead>Servicio</TableHead>
                        <TableHead>Inicio</TableHead>
                        <TableHead>Fin</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {group.items.map(p => (
                        <TableRow key={p.id}>
                          <TableCell>{p.position}</TableCell>
                          <TableCell>{p.service?.title ?? p.service_id}</TableCell>
                          <TableCell>{new Date(p.start_date).toLocaleDateString('es-MX')}</TableCell>
                          <TableCell>{new Date(p.end_date).toLocaleDateString('es-MX')}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" onClick={() => handleDeletePlacement(p.id)}>
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="campanas" className="space-y-6">
          <div className="flex justify-end">
            <Dialog open={campaignDialogOpen} onOpenChange={setCampaignDialogOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-2" />Nueva Campana</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle>Nueva Campana</DialogTitle></DialogHeader>
                <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                  <div>
                    <Label>Nombre interno</Label>
                    <Input value={cInternalName} onChange={e => setCInternalName(e.target.value)} placeholder="Ej: Promo Q1 2026" />
                  </div>
                  <div>
                    <Label>Nombre externo</Label>
                    <Input value={cExternalName} onChange={e => setCExternalName(e.target.value)} placeholder="Ej: Ofertas de Temporada" />
                  </div>
                  <div>
                    <Label>Descripcion</Label>
                    <Input value={cDescription} onChange={e => setCDescription(e.target.value)} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Descuento (%)</Label>
                      <Input type="number" value={cDiscountPct} onChange={e => setCDiscountPct(Number(e.target.value))} min={0} max={100} />
                    </div>
                    <div>
                      <Label>Reduccion comision (%)</Label>
                      <Input type="number" value={cCommissionReduction} onChange={e => setCCommissionReduction(Number(e.target.value))} min={0} max={100} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Vivelo absorbe (%)</Label>
                      <Input type="number" value={cViveloAbsorbs} onChange={e => { setCViveloAbsorbs(Number(e.target.value)); setCProviderAbsorbs(100 - Number(e.target.value)); }} min={0} max={100} />
                    </div>
                    <div>
                      <Label>Proveedor absorbe (%)</Label>
                      <Input type="number" value={cProviderAbsorbs} onChange={e => { setCProviderAbsorbs(Number(e.target.value)); setCViveloAbsorbs(100 - Number(e.target.value)); }} min={0} max={100} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Fecha inicio</Label>
                      <Input type="date" value={cStartDate} onChange={e => setCStartDate(e.target.value)} />
                    </div>
                    <div>
                      <Label>Fecha fin</Label>
                      <Input type="date" value={cEndDate} onChange={e => setCEndDate(e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <Label>Canales de exposicion (separados por coma)</Label>
                    <Input value={cChannels} onChange={e => setCChannels(e.target.value)} placeholder="homepage, email, social_media" />
                  </div>
                  <Button onClick={handleCreateCampaign} className="w-full">Crear Campana</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre Interno</TableHead>
                    <TableHead>Nombre Externo</TableHead>
                    <TableHead>Descuento</TableHead>
                    <TableHead>Fechas</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaigns.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Sin campanas</TableCell></TableRow>
                  ) : campaigns.map(c => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.internal_name}</TableCell>
                      <TableCell>{c.external_name}</TableCell>
                      <TableCell>{c.discount_pct}%</TableCell>
                      <TableCell className="text-sm">
                        {new Date(c.start_date).toLocaleDateString('es-MX')} - {new Date(c.end_date).toLocaleDateString('es-MX')}
                      </TableCell>
                      <TableCell>
                        <Badge className={CAMPAIGN_STATUS_COLORS[c.status]}>{CAMPAIGN_STATUS_LABELS[c.status]}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {c.status === 'draft' && (
                            <Button size="sm" variant="outline" onClick={() => handleCampaignAction(c.id, 'active')}>Activar</Button>
                          )}
                          {c.status === 'active' && (
                            <>
                              <Button size="sm" variant="outline" onClick={() => handleCampaignAction(c.id, 'ended')}>Finalizar</Button>
                              <Button size="sm" variant="outline" onClick={() => handleCampaignAction(c.id, 'cancelled')}>Cancelar</Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="banners" className="space-y-6">
          {/* Site Banners Section */}
          <Card>
            <CardHeader><CardTitle>Banners del Sitio</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {siteBanners.length === 0 ? (
                <p className="text-sm text-muted-foreground">No hay banners configurados</p>
              ) : siteBanners.map(banner => (
                <div key={banner.id} className="flex items-center justify-between p-4 rounded-lg border">
                  <div>
                    <p className="font-medium">{BANNER_KEY_LABELS[banner.banner_key] || banner.banner_key}</p>
                    <p className="text-sm text-muted-foreground">{banner.title}</p>
                    {banner.subtitle && <p className="text-xs text-muted-foreground">{banner.subtitle}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={banner.is_active ? 'default' : 'secondary'}>{banner.is_active ? 'Activo' : 'Inactivo'}</Badge>
                    <Button variant="outline" size="sm" onClick={() => openEditBanner(banner)}>
                      <Pencil className="h-3 w-3 mr-1" />Editar
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Banner Edit Dialog */}
          <Dialog open={bannerDialogOpen} onOpenChange={setBannerDialogOpen}>
            <DialogContent>
              <DialogHeader><DialogTitle>Editar Banner</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Titulo</Label>
                  <Input value={bTitle} onChange={e => setBTitle(e.target.value)} />
                </div>
                <div>
                  <Label>Subtitulo</Label>
                  <Input value={bSubtitle} onChange={e => setBSubtitle(e.target.value)} />
                </div>
                <div>
                  <Label>Texto del boton</Label>
                  <Input value={bButtonText} onChange={e => setBButtonText(e.target.value)} placeholder="Ej: Todos los servicios" />
                </div>
                <div>
                  <Label>Link del boton</Label>
                  <Input value={bButtonLink} onChange={e => setBButtonLink(e.target.value)} placeholder="Ej: /servicios" />
                </div>
                <div>
                  <Label>Gradiente</Label>
                  <Select value={bGradient} onValueChange={setBGradient}>
                    <SelectTrigger><SelectValue placeholder="Sin gradiente" /></SelectTrigger>
                    <SelectContent>
                      {GRADIENT_OPTIONS.map(g => (
                        <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={bIsActive} onCheckedChange={setBIsActive} />
                  <Label>Activo</Label>
                </div>
                <Button onClick={handleSaveBanner} className="w-full">Guardar</Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Showcase Items Section */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Showcase de Subcategorias</CardTitle>
              <Button size="sm" onClick={() => { resetShowcaseForm(); setShowcaseDialogOpen(true); }}>
                <Plus className="h-4 w-4 mr-1" />Agregar Item
              </Button>
            </CardHeader>
            <CardContent>
              {showcaseItems.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin items de showcase</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pos</TableHead>
                      <TableHead>Label</TableHead>
                      <TableHead>Subcategoria</TableHead>
                      <TableHead>Color</TableHead>
                      <TableHead>Activo</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {showcaseItems.map(item => (
                      <TableRow key={item.id}>
                        <TableCell>{item.position}</TableCell>
                        <TableCell className="font-medium">{item.label}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{item.subcategory}</TableCell>
                        <TableCell>
                          <div className={`w-8 h-8 rounded bg-gradient-to-br ${item.gradient_color}`} />
                        </TableCell>
                        <TableCell>
                          <Switch checked={item.is_active} onCheckedChange={() => handleToggleShowcaseActive(item)} />
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openEditShowcase(item)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteShowcase(item.id)}>
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Showcase Item Dialog */}
          <Dialog open={showcaseDialogOpen} onOpenChange={(open) => { setShowcaseDialogOpen(open); if (!open) resetShowcaseForm(); }}>
            <DialogContent>
              <DialogHeader><DialogTitle>{editingShowcaseId ? 'Editar Item' : 'Nuevo Item'}</DialogTitle></DialogHeader>
              <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                <div>
                  <Label>Label</Label>
                  <Input value={sLabel} onChange={e => setSLabel(e.target.value)} placeholder="Ej: Animadores" />
                </div>
                <div>
                  <Label>Descripcion</Label>
                  <Textarea value={sDescription} onChange={e => setSDescription(e.target.value)} rows={3} />
                </div>
                <div>
                  <Label>Categoria padre</Label>
                  <Select value={sParentCategory} onValueChange={(v) => { setSParentCategory(v); setSSubcategory(''); }}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar categoria" /></SelectTrigger>
                    <SelectContent>
                      {categories.filter(c => c.is_active).map(c => (
                        <SelectItem key={c.slug} value={c.slug}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Subcategoria</Label>
                  <Select value={sSubcategory} onValueChange={setSSubcategory} disabled={!sParentCategory}>
                    <SelectTrigger><SelectValue placeholder={sParentCategory ? 'Seleccionar subcategoria' : 'Primero selecciona categoria'} /></SelectTrigger>
                    <SelectContent>
                      {availableSubcategories.filter(sc => sc.is_active).map(sc => (
                        <SelectItem key={sc.slug} value={sc.slug}>{sc.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Color (gradiente)</Label>
                  <Select value={sGradientColor} onValueChange={setSGradientColor}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {GRADIENT_OPTIONS.map(g => (
                        <SelectItem key={g.value} value={g.value}>
                          <div className="flex items-center gap-2">
                            <div className={`w-4 h-4 rounded bg-gradient-to-br ${g.value}`} />
                            {g.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Posicion</Label>
                  <Input type="number" value={sPosition} onChange={e => setSPosition(Number(e.target.value))} min={0} />
                </div>
                <Button onClick={handleSaveShowcase} className="w-full">{editingShowcaseId ? 'Guardar Cambios' : 'Crear Item'}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>
    </div>
  );
}
