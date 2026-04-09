import * as XLSX from 'xlsx';
import * as fflate from 'fflate';
import { categories, subcategoriesByCategory } from '@/data/categories';
import { getFieldsForCategory } from '@/data/category-fields-config';
import type { CategoryFieldConfig } from '@/data/category-fields-config';
import { VIVELO_ZONES, PRICE_UNITS, EXTRA_PRICE_TYPES } from '@/lib/constants';
import type { ServiceCategory, CancellationPolicy } from '@/types/database';

// ─── Types ─────────────────────────────────────────────────

export interface ImportError {
  row: number;
  sheet: 'Servicios' | 'Extras';
  field: string;
  message: string;
}

export interface ImportResult {
  created: number;
  failed: number;
  errors: ImportError[];
  services: { id: string; title: string }[];
}

export interface ColumnDef {
  key: string;
  header: string;
  type: 'text' | 'number' | 'dropdown' | 'multi_select';
  required: boolean;
  options?: string[];
}

export interface RawServiceRow {
  titulo: string;
  descripcion?: string;
  subcategoria: string;
  precio_base: number;
  unidad_precio: string;
  min_invitados?: number;
  max_invitados: number;
  min_horas?: number;
  max_horas?: number;
  horas_base_evento?: number;
  zonas: string;
  buffer_antes_min?: number;
  buffer_despues_min?: number;
  politica_cancelacion?: string;
  url_imagen_1?: string;
  url_imagen_2?: string;
  url_imagen_3?: string;
  url_imagen_4?: string;
  url_imagen_5?: string;
  url_video_1?: string;
  url_video_2?: string;
  [key: string]: unknown;
}

export interface RawExtraRow {
  titulo_servicio: string;
  nombre: string;
  descripcion?: string;
  precio: number;
  tipo_precio: string;
  cantidad_maxima: number;
  depende_invitados?: string;
  depende_horas?: string;
  url_imagen?: string;
}

export interface ParsedService {
  title: string;
  description: string;
  subcategory: string;
  base_price: number;
  price_unit: string;
  min_guests: number;
  max_guests: number;
  min_hours?: number;
  max_hours?: number;
  base_event_hours?: number | null;
  zones: string[];
  buffer_before_minutes: number;
  buffer_after_minutes: number;
  cancellation_policy_id?: string | null;
  image_urls: string[];
  video_urls: string[];
  category_details: Record<string, unknown>;
}

export interface ParsedExtra {
  service_title: string;
  name: string;
  description?: string;
  price: number;
  price_type: 'fixed' | 'per_person' | 'per_hour';
  max_quantity: number;
  depends_on_guests: boolean;
  depends_on_hours: boolean;
  image_url?: string;
}

// ─── Constants ─────────────────────────────────────────────

const ZONE_LABELS: string[] = VIVELO_ZONES.map(z => z.label);
const PRICE_UNIT_VALUES: string[] = PRICE_UNITS.map(p => p.value);
const EXTRA_PRICE_TYPE_MAP: Record<string, string> = {
  'fixed': 'fixed',
  'per_person': 'per_person',
  'per_hour': 'per_hour',
  'Precio fijo': 'fixed',
  'Por persona': 'per_person',
  'Por hora': 'per_hour',
};

const CORE_COLUMNS: ColumnDef[] = [
  { key: 'titulo', header: 'titulo', type: 'text', required: true },
  { key: 'descripcion', header: 'descripcion', type: 'text', required: false },
  { key: 'subcategoria', header: 'subcategoria', type: 'dropdown', required: true, options: [] },
  { key: 'precio_base', header: 'precio_base', type: 'number', required: true },
  { key: 'unidad_precio', header: 'unidad_precio', type: 'dropdown', required: true, options: PRICE_UNIT_VALUES },
  { key: 'min_invitados', header: 'min_invitados', type: 'number', required: false },
  { key: 'max_invitados', header: 'max_invitados', type: 'number', required: true },
  { key: 'min_horas', header: 'min_horas', type: 'number', required: false },
  { key: 'max_horas', header: 'max_horas', type: 'number', required: false },
  { key: 'horas_base_evento', header: 'horas_base_evento', type: 'number', required: false },
  { key: 'zonas', header: 'zonas', type: 'text', required: true },
  { key: 'buffer_antes_min', header: 'buffer_antes_min', type: 'number', required: false },
  { key: 'buffer_despues_min', header: 'buffer_despues_min', type: 'number', required: false },
  { key: 'politica_cancelacion', header: 'politica_cancelacion', type: 'dropdown', required: false, options: [] },
  { key: 'url_imagen_1', header: 'url_imagen_1', type: 'text', required: false },
  { key: 'url_imagen_2', header: 'url_imagen_2', type: 'text', required: false },
  { key: 'url_imagen_3', header: 'url_imagen_3', type: 'text', required: false },
  { key: 'url_imagen_4', header: 'url_imagen_4', type: 'text', required: false },
  { key: 'url_imagen_5', header: 'url_imagen_5', type: 'text', required: false },
  { key: 'url_video_1', header: 'url_video_1', type: 'text', required: false },
  { key: 'url_video_2', header: 'url_video_2', type: 'text', required: false },
];

// ─── Column generation ─────────────────────────────────────

function getCategoryDetailColumns(category: ServiceCategory, fields?: CategoryFieldConfig[]): ColumnDef[] {
  const resolvedFields = fields || getFieldsForCategory(category);
  const cols: ColumnDef[] = [];

  for (const field of resolvedFields) {
    if (field.type === 'matrix_select') {
      for (const col of field.columns || []) {
        cols.push({
          key: `${field.key}_${col}`,
          header: `${field.key}_${col}`,
          type: 'dropdown',
          required: false,
          options: field.rows || [],
        });
      }
    } else if (field.type === 'multi_select') {
      cols.push({
        key: field.key,
        header: field.key,
        type: 'multi_select',
        required: false,
        options: field.options,
      });
    } else if (field.type === 'dropdown') {
      cols.push({
        key: field.key,
        header: field.key,
        type: 'dropdown',
        required: false,
        options: field.options,
      });
    } else if (field.type === 'switch') {
      cols.push({
        key: field.key,
        header: field.key,
        type: 'dropdown',
        required: false,
        options: ['Si', 'No'],
      });
    } else if (field.type === 'number' || field.type === 'currency') {
      cols.push({
        key: field.key,
        header: field.key,
        type: 'number',
        required: false,
      });
    } else {
      cols.push({
        key: field.key,
        header: field.key,
        type: 'text',
        required: false,
      });
    }
  }

  return cols;
}

export function getTemplateColumns(category: ServiceCategory, fields?: CategoryFieldConfig[]): ColumnDef[] {
  const subcats = subcategoriesByCategory[category] || [];
  const core = CORE_COLUMNS.map(c => {
    if (c.key === 'subcategoria') {
      return { ...c, options: subcats.map(s => s.label) };
    }
    return c;
  });
  return [...core, ...getCategoryDetailColumns(category, fields)];
}

// ─── Template generation ───────────────────────────────────

export function generateTemplate(
  category: ServiceCategory,
  policies: CancellationPolicy[],
  fields?: CategoryFieldConfig[],
): ArrayBuffer {
  const wb = XLSX.utils.book_new();
  const columns = getTemplateColumns(category, fields);

  // Update policy column options
  const policyNames = policies.map(p => p.name);
  const policyCol = columns.find(c => c.key === 'politica_cancelacion');
  if (policyCol) policyCol.options = policyNames;

  // Sheet 1: Servicios
  const serviceHeaders = columns.map(c => c.header);
  const wsServices = XLSX.utils.aoa_to_sheet([serviceHeaders]);

  // Set column widths
  wsServices['!cols'] = columns.map(c => ({
    wch: Math.max(c.header.length + 2, 15),
  }));

  XLSX.utils.book_append_sheet(wb, wsServices, 'Servicios');

  // Sheet 2: Extras
  const extraHeaders = [
    'titulo_servicio', 'nombre', 'descripcion', 'precio',
    'tipo_precio', 'cantidad_maxima', 'depende_invitados', 'depende_horas', 'url_imagen',
  ];
  const wsExtras = XLSX.utils.aoa_to_sheet([extraHeaders]);
  wsExtras['!cols'] = extraHeaders.map(h => ({ wch: Math.max(h.length + 2, 15) }));
  XLSX.utils.book_append_sheet(wb, wsExtras, 'Extras');

  // Sheet 3: Instrucciones
  const catInfo = categories.find(c => c.value === category);
  const subcats = subcategoriesByCategory[category] || [];
  const detailFields = fields || getFieldsForCategory(category);

  const instrRows: (string | number)[][] = [
    ['INSTRUCCIONES PARA IMPORTAR SERVICIOS'],
    [''],
    [`Categoria: ${catInfo?.label || category}`],
    [''],
    ['REGLAS GENERALES:'],
    ['- Todos los servicios se crean como "Pendiente de revision"'],
    ['- Maximo 50 servicios por archivo'],
    ['- Los campos obligatorios estan marcados con * en la lista de abajo'],
    ['- Para imagenes y videos, pega URLs publicas (JPG, PNG, WebP)'],
    ['- Las zonas se separan por coma. Ejemplo: Ciudad de Mexico, Puebla'],
    ['- Los campos multi-seleccion se separan por coma'],
    [''],
    ['CAMPOS OBLIGATORIOS:'],
    ['- titulo *'],
    ['- subcategoria *'],
    ['- precio_base *'],
    ['- unidad_precio *'],
    ['- max_invitados *'],
    ['- zonas *'],
    ['- min_horas y max_horas son obligatorios si unidad_precio = "por hora"'],
    [''],
    ['ZONAS VALIDAS:'],
    ...ZONE_LABELS.map(z => [`  - ${z}`]),
    [''],
    ['SUBCATEGORIAS VALIDAS:'],
    ...subcats.map(s => [`  - ${s.label}`]),
    [''],
    ['UNIDADES DE PRECIO:'],
    ...PRICE_UNITS.map(p => [`  - ${p.value} (${p.label})`]),
    [''],
    ['TIPOS DE PRECIO (EXTRAS):'],
    ...EXTRA_PRICE_TYPES.map(p => [`  - ${p.value} (${p.label})`]),
    [''],
  ];

  // Document category detail fields and their options
  if (detailFields.length > 0) {
    instrRows.push(['CAMPOS ESPECIFICOS DE CATEGORIA:']);
    for (const field of detailFields) {
      instrRows.push([`  ${field.key} (${field.type}): ${field.label}`]);
      if (field.options && field.options.length > 0) {
        instrRows.push(['    Opciones:']);
        for (const opt of field.options) {
          instrRows.push([`      - ${opt}`]);
        }
      }
      if (field.type === 'matrix_select' && field.columns) {
        instrRows.push([`    Columnas en Excel: ${field.columns.map(c => `${field.key}_${c}`).join(', ')}`]);
        if (field.rows) {
          instrRows.push(['    Valores validos:']);
          for (const r of field.rows) {
            instrRows.push([`      - ${r}`]);
          }
        }
      }
    }
    instrRows.push(['']);
  }

  if (policyNames.length > 0) {
    instrRows.push(['POLITICAS DE CANCELACION DISPONIBLES:']);
    for (const name of policyNames) {
      instrRows.push([`  - ${name}`]);
    }
    instrRows.push(['']);
  }

  // Add hidden validation lists in Instrucciones sheet (for dropdown references)
  // Column B onwards: lists for dropdowns that exceed 255 chars
  const maxListRows = Math.max(
    subcats.length,
    ZONE_LABELS.length,
    ...detailFields.filter(f => f.options).map(f => f.options!.length),
    policyNames.length,
    6, // min
  );

  // Build lists data starting from column C
  type ListDef = { name: string; values: string[] };
  const lists: ListDef[] = [
    { name: 'Subcategorias', values: subcats.map(s => s.label) },
    { name: 'UnidadPrecio', values: [...PRICE_UNIT_VALUES] },
    { name: 'TipoPrecioExtra', values: EXTRA_PRICE_TYPES.map(e => e.value) },
    { name: 'SiNo', values: ['Si', 'No'] },
  ];
  if (policyNames.length > 0) {
    lists.push({ name: 'Politicas', values: policyNames });
  }
  // Add field-specific option lists
  for (const field of detailFields) {
    if (field.options && field.options.length > 0) {
      lists.push({ name: `opt_${field.key}`, values: field.options });
    }
    if (field.type === 'matrix_select' && field.rows) {
      lists.push({ name: `rows_${field.key}`, values: field.rows });
    }
  }

  // We extend the instrucciones rows to be at least maxListRows + header long
  while (instrRows.length < maxListRows + 2) {
    instrRows.push(['']);
  }

  // Add list headers and values starting at column C (index 2)
  for (let li = 0; li < lists.length; li++) {
    const colIdx = li + 2; // Start at column C
    instrRows[0][colIdx] = lists[li].name;
    for (let ri = 0; ri < lists[li].values.length; ri++) {
      if (!instrRows[ri + 1]) instrRows[ri + 1] = [''];
      instrRows[ri + 1][colIdx] = lists[li].values[ri];
    }
  }

  const wsInstr = XLSX.utils.aoa_to_sheet(instrRows);
  wsInstr['!cols'] = [{ wch: 70 }, { wch: 5 }, ...lists.map(() => ({ wch: 30 }))];
  XLSX.utils.book_append_sheet(wb, wsInstr, 'Instrucciones');

  // Generate the xlsx as array buffer
  const xlsxBuf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;

  // Post-process: inject data validations via fflate
  return injectDataValidations(xlsxBuf, columns, lists);
}

// ─── Data validation injection ─────────────────────────────

function colLetter(idx: number): string {
  let s = '';
  let n = idx;
  while (n >= 0) {
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26) - 1;
  }
  return s;
}

function injectDataValidations(
  xlsxBuf: ArrayBuffer,
  columns: ColumnDef[],
  lists: { name: string; values: string[] }[],
): ArrayBuffer {
  const zip = fflate.unzipSync(new Uint8Array(xlsxBuf));

  // Build a map of list name → Instrucciones column reference
  const listRefMap: Record<string, string> = {};
  for (let li = 0; li < lists.length; li++) {
    const col = colLetter(li + 2); // C, D, E, ...
    const lastRow = lists[li].values.length + 1;
    listRefMap[lists[li].name] = `Instrucciones!$${col}$2:$${col}$${lastRow}`;
  }

  // Inject validations for Sheet1 (Servicios)
  const sheet1Key = Object.keys(zip).find(k => k === 'xl/worksheets/sheet1.xml') || 'xl/worksheets/sheet1.xml';
  if (zip[sheet1Key]) {
    const xml = new TextDecoder().decode(zip[sheet1Key]);
    const validations = buildServiceValidations(columns, listRefMap);
    if (validations) {
      const injected = injectValidationXml(xml, validations);
      zip[sheet1Key] = fflate.strToU8(injected);
    }
  }

  // Inject validations for Sheet2 (Extras)
  const sheet2Key = Object.keys(zip).find(k => k === 'xl/worksheets/sheet2.xml') || 'xl/worksheets/sheet2.xml';
  if (zip[sheet2Key]) {
    const xml = new TextDecoder().decode(zip[sheet2Key]);
    const validations = buildExtraValidations(listRefMap);
    if (validations) {
      const injected = injectValidationXml(xml, validations);
      zip[sheet2Key] = fflate.strToU8(injected);
    }
  }

  const result = fflate.zipSync(zip);
  return result.buffer as ArrayBuffer;
}

function buildServiceValidations(
  columns: ColumnDef[],
  listRefMap: Record<string, string>,
): string {
  const dvs: string[] = [];
  const maxRow = 200; // Allow up to 200 rows of data

  for (let i = 0; i < columns.length; i++) {
    const col = columns[i];
    const letter = colLetter(i);
    const sqref = `${letter}2:${letter}${maxRow}`;

    if (col.key === 'subcategoria' && listRefMap['Subcategorias']) {
      dvs.push(`<dataValidation type="list" allowBlank="1" showDropDown="0" showErrorMessage="1" sqref="${sqref}"><formula1>${listRefMap['Subcategorias']}</formula1></dataValidation>`);
    } else if (col.key === 'unidad_precio' && listRefMap['UnidadPrecio']) {
      dvs.push(`<dataValidation type="list" allowBlank="1" showDropDown="0" showErrorMessage="1" sqref="${sqref}"><formula1>${listRefMap['UnidadPrecio']}</formula1></dataValidation>`);
    } else if (col.key === 'politica_cancelacion' && listRefMap['Politicas']) {
      dvs.push(`<dataValidation type="list" allowBlank="1" showDropDown="0" showErrorMessage="1" sqref="${sqref}"><formula1>${listRefMap['Politicas']}</formula1></dataValidation>`);
    } else if (col.type === 'dropdown' && col.options && col.options.length > 0) {
      // Check if there's a matching list ref
      const fieldKey = col.key.replace(/_[^_]+$/, ''); // strip matrix suffix
      const listName = listRefMap[`opt_${col.key}`] || listRefMap[`rows_${fieldKey}`] || listRefMap[`opt_${fieldKey}`];
      if (listName) {
        dvs.push(`<dataValidation type="list" allowBlank="1" showDropDown="0" showErrorMessage="1" sqref="${sqref}"><formula1>${listName}</formula1></dataValidation>`);
      } else {
        // Inline list (only if short enough)
        const joined = col.options.join(',');
        if (joined.length <= 255) {
          dvs.push(`<dataValidation type="list" allowBlank="1" showDropDown="0" showErrorMessage="1" sqref="${sqref}"><formula1>"${escapeXml(joined)}"</formula1></dataValidation>`);
        }
      }
    }
  }

  if (dvs.length === 0) return '';
  return `<dataValidations count="${dvs.length}">${dvs.join('')}</dataValidations>`;
}

function buildExtraValidations(listRefMap: Record<string, string>): string {
  const dvs: string[] = [];
  const maxRow = 500;

  // tipo_precio (col E)
  if (listRefMap['TipoPrecioExtra']) {
    dvs.push(`<dataValidation type="list" allowBlank="1" showDropDown="0" showErrorMessage="1" sqref="E2:E${maxRow}"><formula1>${listRefMap['TipoPrecioExtra']}</formula1></dataValidation>`);
  }
  // depende_invitados (col G)
  if (listRefMap['SiNo']) {
    dvs.push(`<dataValidation type="list" allowBlank="1" showDropDown="0" showErrorMessage="1" sqref="G2:G${maxRow}"><formula1>${listRefMap['SiNo']}</formula1></dataValidation>`);
    // depende_horas (col H)
    dvs.push(`<dataValidation type="list" allowBlank="1" showDropDown="0" showErrorMessage="1" sqref="H2:H${maxRow}"><formula1>${listRefMap['SiNo']}</formula1></dataValidation>`);
  }

  if (dvs.length === 0) return '';
  return `<dataValidations count="${dvs.length}">${dvs.join('')}</dataValidations>`;
}

function injectValidationXml(xml: string, validationsXml: string): string {
  // Insert before </worksheet>
  const closeTag = '</worksheet>';
  const idx = xml.lastIndexOf(closeTag);
  if (idx === -1) return xml;
  return xml.substring(0, idx) + validationsXml + closeTag;
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ─── Parse import file ─────────────────────────────────────

export function parseImportFile(
  buffer: ArrayBuffer,
): { services: RawServiceRow[]; extras: RawExtraRow[] } {
  const wb = XLSX.read(buffer, { type: 'array' });

  // Parse Servicios sheet
  const wsServices = wb.Sheets['Servicios'];
  if (!wsServices) throw new Error('No se encontro la hoja "Servicios"');
  const serviceData = XLSX.utils.sheet_to_json<RawServiceRow>(wsServices, { defval: '' });

  // Parse Extras sheet
  const wsExtras = wb.Sheets['Extras'];
  const extraData = wsExtras
    ? XLSX.utils.sheet_to_json<RawExtraRow>(wsExtras, { defval: '' })
    : [];

  return {
    services: serviceData.filter(r => r.titulo && String(r.titulo).trim() !== ''),
    extras: extraData.filter(r => r.titulo_servicio && r.nombre && String(r.nombre).trim() !== ''),
  };
}

// ─── Validation ────────────────────────────────────────────

export function validateImportData(
  services: RawServiceRow[],
  extras: RawExtraRow[],
  category: ServiceCategory,
  policies: CancellationPolicy[],
  fields?: CategoryFieldConfig[],
): { valid: ParsedService[]; validExtras: ParsedExtra[]; errors: ImportError[] } {
  const errors: ImportError[] = [];
  const valid: ParsedService[] = [];
  const validExtras: ParsedExtra[] = [];
  const subcats = subcategoriesByCategory[category] || [];
  const subcatLabels = subcats.map(s => s.label);
  const subcatMap = Object.fromEntries(subcats.map(s => [s.label, s.value]));
  const policyMap = Object.fromEntries(policies.map(p => [p.name, p.id]));
  const detailFields = fields || getFieldsForCategory(category);

  if (services.length > 50) {
    errors.push({ row: 0, sheet: 'Servicios', field: 'general', message: 'Maximo 50 servicios por archivo' });
    return { valid: [], validExtras: [], errors };
  }

  const serviceTitles = new Set<string>();

  for (let i = 0; i < services.length; i++) {
    const row = services[i];
    const rowNum = i + 2; // 1-indexed, +1 for header
    let hasError = false;

    const addError = (field: string, message: string) => {
      errors.push({ row: rowNum, sheet: 'Servicios', field, message });
      hasError = true;
    };

    // Required fields
    const titulo = String(row.titulo || '').trim();
    if (!titulo) addError('titulo', 'El titulo es obligatorio');
    if (serviceTitles.has(titulo.toLowerCase())) {
      addError('titulo', `Titulo duplicado en el archivo: "${titulo}"`);
    }
    serviceTitles.add(titulo.toLowerCase());

    const subcatLabel = String(row.subcategoria || '').trim();
    if (!subcatLabel) {
      addError('subcategoria', 'La subcategoria es obligatoria');
    } else if (!subcatLabels.includes(subcatLabel)) {
      addError('subcategoria', `Subcategoria invalida: "${subcatLabel}". Opciones: ${subcatLabels.join(', ')}`);
    }

    const precioBase = Number(row.precio_base);
    if (!precioBase || precioBase <= 0) addError('precio_base', 'El precio base debe ser mayor a 0');

    const unidadPrecio = String(row.unidad_precio || '').trim();
    if (!unidadPrecio) {
      addError('unidad_precio', 'La unidad de precio es obligatoria');
    } else if (!PRICE_UNIT_VALUES.includes(unidadPrecio)) {
      addError('unidad_precio', `Unidad invalida: "${unidadPrecio}". Opciones: ${PRICE_UNIT_VALUES.join(', ')}`);
    }

    const maxInvitados = Number(row.max_invitados);
    if (!maxInvitados || maxInvitados < 1) addError('max_invitados', 'max_invitados debe ser >= 1');

    const minInvitados = row.min_invitados ? Number(row.min_invitados) : 1;
    if (minInvitados < 1) addError('min_invitados', 'min_invitados debe ser >= 1');

    // Hours validation for 'por hora'
    let minHoras: number | undefined;
    let maxHoras: number | undefined;
    if (unidadPrecio === 'por hora') {
      minHoras = Number(row.min_horas);
      maxHoras = Number(row.max_horas);
      if (!minHoras || minHoras < 0.5) addError('min_horas', 'min_horas debe ser >= 0.5 para servicios por hora');
      if (!maxHoras || maxHoras < 0.5) addError('max_horas', 'max_horas debe ser >= 0.5 para servicios por hora');
      if (minHoras && maxHoras && maxHoras < minHoras) addError('max_horas', 'max_horas debe ser >= min_horas');
    } else {
      if (row.min_horas) minHoras = Number(row.min_horas);
      if (row.max_horas) maxHoras = Number(row.max_horas);
    }

    // Zones
    const zonasStr = String(row.zonas || '').trim();
    if (!zonasStr) {
      addError('zonas', 'Debe seleccionar al menos una zona');
    }
    const zonas = zonasStr.split(',').map(z => z.trim()).filter(Boolean);
    for (const z of zonas) {
      if (!ZONE_LABELS.includes(z)) {
        addError('zonas', `Zona invalida: "${z}". Zonas validas: ${ZONE_LABELS.join(', ')}`);
        break;
      }
    }

    // Cancellation policy
    let cancellationPolicyId: string | null = null;
    const policyName = String(row.politica_cancelacion || '').trim();
    if (policyName) {
      if (policyMap[policyName]) {
        cancellationPolicyId = policyMap[policyName];
      } else {
        addError('politica_cancelacion', `Politica no encontrada: "${policyName}"`);
      }
    }

    // Image & video URLs
    const imageUrls: string[] = [];
    for (let j = 1; j <= 5; j++) {
      const url = String(row[`url_imagen_${j}`] || '').trim();
      if (url) {
        if (!isValidUrl(url)) addError(`url_imagen_${j}`, `URL invalida: "${url}"`);
        else imageUrls.push(url);
      }
    }
    const videoUrls: string[] = [];
    for (let j = 1; j <= 2; j++) {
      const url = String(row[`url_video_${j}`] || '').trim();
      if (url) {
        if (!isValidUrl(url)) addError(`url_video_${j}`, `URL invalida: "${url}"`);
        else videoUrls.push(url);
      }
    }

    // Category details
    const categoryDetails = buildCategoryDetails(row, detailFields, (field, msg) => {
      addError(field, msg);
    });

    // Base event hours
    let baseEventHours: number | null = null;
    if (row.horas_base_evento) {
      baseEventHours = Number(row.horas_base_evento);
      if (isNaN(baseEventHours) || baseEventHours < 0.5) {
        addError('horas_base_evento', 'horas_base_evento debe ser >= 0.5');
        baseEventHours = null;
      }
    }

    if (!hasError) {
      valid.push({
        title: titulo,
        description: String(row.descripcion || '').trim(),
        subcategory: subcatMap[subcatLabel] || subcatLabel,
        base_price: precioBase,
        price_unit: unidadPrecio,
        min_guests: minInvitados,
        max_guests: maxInvitados,
        min_hours: minHoras,
        max_hours: maxHoras,
        base_event_hours: baseEventHours,
        zones: zonas,
        buffer_before_minutes: Number(row.buffer_antes_min) || 0,
        buffer_after_minutes: Number(row.buffer_despues_min) || 0,
        cancellation_policy_id: cancellationPolicyId,
        image_urls: imageUrls,
        video_urls: videoUrls,
        category_details: categoryDetails,
      });
    }
  }

  // Validate extras
  const validTitles = new Set(valid.map(s => s.title.toLowerCase()));

  for (let i = 0; i < extras.length; i++) {
    const row = extras[i];
    const rowNum = i + 2;
    let hasError = false;

    const addError = (field: string, message: string) => {
      errors.push({ row: rowNum, sheet: 'Extras', field, message });
      hasError = true;
    };

    const tituloServicio = String(row.titulo_servicio || '').trim();
    if (!validTitles.has(tituloServicio.toLowerCase())) {
      addError('titulo_servicio', `No se encontro servicio con titulo "${tituloServicio}" en la hoja Servicios`);
    }

    const nombre = String(row.nombre || '').trim();
    if (!nombre) addError('nombre', 'El nombre del extra es obligatorio');

    const desc = String(row.descripcion || '').trim();
    if (desc.length > 150) addError('descripcion', 'La descripcion no puede exceder 150 caracteres');

    const precio = Number(row.precio);
    if (!precio || precio <= 0) addError('precio', 'El precio debe ser mayor a 0');

    const tipoPrecioRaw = String(row.tipo_precio || '').trim();
    const tipoPrecio = EXTRA_PRICE_TYPE_MAP[tipoPrecioRaw];
    if (!tipoPrecio) {
      addError('tipo_precio', `Tipo de precio invalido: "${tipoPrecioRaw}". Opciones: fixed, per_person, per_hour`);
    }

    const cantidadMaxima = Number(row.cantidad_maxima);
    if (!cantidadMaxima || cantidadMaxima < 1) addError('cantidad_maxima', 'cantidad_maxima debe ser >= 1');

    if (!hasError) {
      validExtras.push({
        service_title: tituloServicio,
        name: nombre,
        description: desc || undefined,
        price: precio,
        price_type: tipoPrecio as 'fixed' | 'per_person' | 'per_hour',
        max_quantity: cantidadMaxima,
        depends_on_guests: String(row.depende_invitados || '').trim().toLowerCase() === 'si',
        depends_on_hours: String(row.depende_horas || '').trim().toLowerCase() === 'si',
        image_url: String(row.url_imagen || '').trim() || undefined,
      });
    }
  }

  return { valid, validExtras, errors };
}

// ─── Build category details ────────────────────────────────

function buildCategoryDetails(
  row: RawServiceRow,
  fields: CategoryFieldConfig[],
  addError: (field: string, msg: string) => void,
): Record<string, unknown> {
  const details: Record<string, unknown> = {};

  for (const field of fields) {
    if (field.type === 'matrix_select') {
      const matrix: Record<string, string> = {};
      let hasAny = false;
      for (const col of field.columns || []) {
        const key = `${field.key}_${col}`;
        const val = String(row[key] || '').trim();
        if (val) {
          if (field.rows && !field.rows.includes(val)) {
            addError(key, `Valor invalido para ${key}: "${val}"`);
          } else {
            matrix[col] = val;
            hasAny = true;
          }
        }
      }
      if (hasAny) details[field.key] = matrix;
    } else if (field.type === 'multi_select') {
      const val = String(row[field.key] || '').trim();
      if (val) {
        const items = val.split(',').map(v => v.trim()).filter(Boolean);
        if (field.options) {
          for (const item of items) {
            if (!field.options.includes(item)) {
              addError(field.key, `Opcion invalida: "${item}"`);
            }
          }
        }
        details[field.key] = items;
      }
    } else if (field.type === 'dropdown') {
      const val = String(row[field.key] || '').trim();
      if (val) {
        if (field.options && !field.options.includes(val)) {
          addError(field.key, `Opcion invalida: "${val}". Opciones: ${field.options.join(', ')}`);
        } else {
          details[field.key] = val;
        }
      }
    } else if (field.type === 'switch') {
      const val = String(row[field.key] || '').trim().toLowerCase();
      if (val === 'si') details[field.key] = true;
      else if (val === 'no') details[field.key] = false;
    } else if (field.type === 'number' || field.type === 'currency') {
      const val = row[field.key];
      if (val !== undefined && val !== '' && val !== null) {
        const num = Number(val);
        if (isNaN(num)) {
          addError(field.key, `"${val}" no es un numero valido`);
        } else {
          details[field.key] = num;
        }
      }
    } else {
      // text_long, text_short
      const val = String(row[field.key] || '').trim();
      if (val) details[field.key] = val;
    }
  }

  return details;
}

// ─── Export services ───────────────────────────────────────

export function exportServices(
  services: Array<{
    title: string;
    description?: string;
    subcategory?: string | null;
    base_price: number;
    price_unit: string;
    min_guests: number;
    max_guests: number;
    min_hours?: number;
    max_hours?: number;
    base_event_hours?: number | null;
    zones: string[];
    buffer_before_minutes?: number;
    buffer_after_minutes?: number;
    cancellation_policy?: { name: string } | null;
    images?: string[];
    videos?: string[];
    category_details?: Record<string, unknown>;
    extras?: Array<{
      name: string;
      description?: string | null;
      price: number;
      price_type: string;
      max_quantity: number;
      depends_on_guests?: boolean;
      depends_on_hours?: boolean;
      image?: string | null;
    }>;
  }>,
  category: ServiceCategory,
  fields?: CategoryFieldConfig[],
): ArrayBuffer {
  const columns = getTemplateColumns(category, fields);
  const subcats = subcategoriesByCategory[category] || [];
  const subcatLabelMap = Object.fromEntries(subcats.map(s => [s.value, s.label]));
  const detailFields = fields || getFieldsForCategory(category);
  const wb = XLSX.utils.book_new();

  // Sheet 1: Servicios
  const headers = columns.map(c => c.header);
  const rows: (string | number)[][] = [];

  for (const svc of services) {
    const row: (string | number)[] = [];

    for (const col of columns) {
      switch (col.key) {
        case 'titulo': row.push(svc.title); break;
        case 'descripcion': row.push(svc.description || ''); break;
        case 'subcategoria': row.push(subcatLabelMap[svc.subcategory || ''] || svc.subcategory || ''); break;
        case 'precio_base': row.push(svc.base_price); break;
        case 'unidad_precio': row.push(svc.price_unit); break;
        case 'min_invitados': row.push(svc.min_guests); break;
        case 'max_invitados': row.push(svc.max_guests); break;
        case 'min_horas': row.push(svc.min_hours || ''); break;
        case 'max_horas': row.push(svc.max_hours || ''); break;
        case 'horas_base_evento': row.push(svc.base_event_hours || ''); break;
        case 'zonas': row.push(svc.zones.join(', ')); break;
        case 'buffer_antes_min': row.push(svc.buffer_before_minutes || 0); break;
        case 'buffer_despues_min': row.push(svc.buffer_after_minutes || 0); break;
        case 'politica_cancelacion': row.push(svc.cancellation_policy?.name || ''); break;
        case 'url_imagen_1': case 'url_imagen_2': case 'url_imagen_3':
        case 'url_imagen_4': case 'url_imagen_5': {
          const idx = parseInt(col.key.split('_').pop()!) - 1;
          row.push(svc.images?.[idx] || '');
          break;
        }
        case 'url_video_1': case 'url_video_2': {
          const idx = parseInt(col.key.split('_').pop()!) - 1;
          row.push(svc.videos?.[idx] || '');
          break;
        }
        default: {
          // Category detail columns
          const cd = svc.category_details || {};
          const field = detailFields.find(f => f.key === col.key || col.key.startsWith(`${f.key}_`));
          if (field?.type === 'matrix_select') {
            const matrixCol = col.key.replace(`${field.key}_`, '');
            const matrix = cd[field.key] as Record<string, string> | undefined;
            row.push(matrix?.[matrixCol] || '');
          } else if (field?.type === 'multi_select') {
            const arr = cd[field.key] as string[] | undefined;
            row.push(arr?.join(', ') || '');
          } else if (field?.type === 'switch') {
            const val = cd[field.key];
            row.push(val === true ? 'Si' : val === false ? 'No' : '');
          } else {
            row.push(cd[col.key] != null ? String(cd[col.key]) : '');
          }
        }
      }
    }

    rows.push(row);
  }

  const wsData = [headers, ...rows];
  const wsServices = XLSX.utils.aoa_to_sheet(wsData);
  wsServices['!cols'] = columns.map(c => ({ wch: Math.max(c.header.length + 2, 15) }));
  XLSX.utils.book_append_sheet(wb, wsServices, 'Servicios');

  // Sheet 2: Extras
  const extraHeaders = [
    'titulo_servicio', 'nombre', 'descripcion', 'precio',
    'tipo_precio', 'cantidad_maxima', 'depende_invitados', 'depende_horas', 'url_imagen',
  ];
  const extraRows: (string | number)[][] = [];
  for (const svc of services) {
    for (const ex of svc.extras || []) {
      extraRows.push([
        svc.title,
        ex.name,
        ex.description || '',
        ex.price,
        ex.price_type,
        ex.max_quantity,
        ex.depends_on_guests ? 'Si' : 'No',
        ex.depends_on_hours ? 'Si' : 'No',
        ex.image || '',
      ]);
    }
  }
  const wsExtras = XLSX.utils.aoa_to_sheet([extraHeaders, ...extraRows]);
  wsExtras['!cols'] = extraHeaders.map(h => ({ wch: Math.max(h.length + 2, 15) }));
  XLSX.utils.book_append_sheet(wb, wsExtras, 'Extras');

  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
}

// ─── Helpers ───────────────────────────────────────────────

function isValidUrl(s: string): boolean {
  try {
    const url = new URL(s);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function getCategoryLabel(category: ServiceCategory): string {
  return categories.find(c => c.value === category)?.label || category;
}

export function getCategoryValues(): { value: string; label: string }[] {
  return categories.map(c => ({ value: c.value, label: c.label }));
}
