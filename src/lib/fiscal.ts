/**
 * Modulo de datos fiscales para proveedores.
 *
 * AISLADO: No importa ni depende de commission.ts, booking-state-machine.ts,
 * cancellation.ts, checkout, ni ningun flujo de pago.
 *
 * Las retenciones se calculan para VISUALIZACION en reportes de liquidacion,
 * nunca se inyectan en el flujo de booking/pago.
 */

import type { RegimenFiscal, PersonaType } from '@/types/database';

// ─── Regimenes fiscales SAT ─────────────────────────────────

export const REGIMENES_FISCALES: Record<RegimenFiscal, string> = {
  '601': 'General de Ley Personas Morales',
  '603': 'Personas Morales con Fines no Lucrativos',
  '605': 'Sueldos y Salarios e Ingresos Asimilados a Salarios',
  '606': 'Arrendamiento',
  '607': 'Regimen de Enajenacion o Adquisicion de Bienes',
  '608': 'Demas ingresos',
  '610': 'Residentes en el Extranjero sin Establecimiento Permanente en Mexico',
  '611': 'Ingresos por Dividendos (socios y accionistas)',
  '612': 'Personas Fisicas con Actividades Empresariales y Profesionales',
  '614': 'Ingresos por intereses',
  '615': 'Regimen de los ingresos por obtencion de premios',
  '616': 'Sin obligaciones fiscales',
  '620': 'Sociedades Cooperativas de Produccion que optan por diferir sus ingresos',
  '621': 'Incorporacion Fiscal',
  '622': 'Actividades Agricolas, Ganaderas, Silvicolas y Pesqueras',
  '623': 'Opcional para Grupos de Sociedades',
  '624': 'Coordinados',
  '625': 'Regimen de las Actividades Empresariales con ingresos a traves de Plataformas Tecnologicas',
  '626': 'Regimen Simplificado de Confianza (RESICO)',
};

// Regimenes validos por tipo de persona
export const REGIMENES_PERSONA_FISICA: RegimenFiscal[] = [
  '605', '606', '607', '608', '611', '612', '614', '615', '616', '621', '622', '625', '626',
];

export const REGIMENES_PERSONA_MORAL: RegimenFiscal[] = [
  '601', '603', '610', '620', '622', '623', '624', '625',
];

// ─── Validacion de RFC ──────────────────────────────────────

// RFC Persona Fisica: 4 letras + 6 digitos (fecha) + 3 caracteres (homoclave)
const RFC_FISICA_REGEX = /^[A-Z&Ñ]{4}\d{6}[A-Z0-9]{3}$/;

// RFC Persona Moral: 3 letras + 6 digitos (fecha) + 3 caracteres (homoclave)
const RFC_MORAL_REGEX = /^[A-Z&Ñ]{3}\d{6}[A-Z0-9]{3}$/;

/**
 * Valida formato de RFC segun tipo de persona.
 * NO valida contra SAT — solo valida estructura.
 */
export function validateRFC(rfc: string, tipoPersona: PersonaType): { valid: boolean; error?: string } {
  const normalized = rfc.toUpperCase().trim();

  if (!normalized) {
    return { valid: false, error: 'RFC es requerido' };
  }

  if (tipoPersona === 'fisica') {
    if (normalized.length !== 13) {
      return { valid: false, error: 'RFC de persona fisica debe tener 13 caracteres' };
    }
    if (!RFC_FISICA_REGEX.test(normalized)) {
      return { valid: false, error: 'Formato de RFC invalido para persona fisica (XXXX000000XXX)' };
    }
  } else {
    if (normalized.length !== 12) {
      return { valid: false, error: 'RFC de persona moral debe tener 12 caracteres' };
    }
    if (!RFC_MORAL_REGEX.test(normalized)) {
      return { valid: false, error: 'Formato de RFC invalido para persona moral (XXX000000XXX)' };
    }
  }

  return { valid: true };
}

// ─── Validacion de CLABE ────────────────────────────────────

const CLABE_REGEX = /^\d{18}$/;

export function validateCLABE(clabe: string): { valid: boolean; error?: string } {
  const normalized = clabe.trim();
  if (!normalized) {
    return { valid: false, error: 'CLABE es requerida' };
  }
  if (!CLABE_REGEX.test(normalized)) {
    return { valid: false, error: 'CLABE debe tener 18 digitos numericos' };
  }
  return { valid: true };
}

// ─── Retenciones ISR/IVA ────────────────────────────────────
//
// IMPORTANTE: Estas funciones son SOLO para visualizacion en reportes
// de liquidacion. NO se usan en el flujo de pago ni en bookings.
//
// Las retenciones se calculan sobre el monto NETO que recibe el proveedor
// (total - comision), NO sobre el total del booking.

interface RetentionResult {
  isr_rate: number;
  iva_rate: number;
  isr_amount: number;
  iva_amount: number;
  net_after_retentions: number;
}

/**
 * Calcula retenciones ISR e IVA segun regimen fiscal.
 *
 * @param netAmount - Monto neto del proveedor (total - comision). Ya calculado externamente.
 * @param regimen - Regimen fiscal del proveedor
 * @param tipoPersona - Tipo de persona (fisica/moral)
 * @returns Montos de retencion para visualizacion
 */
export function calculateRetentions(
  netAmount: number,
  regimen: RegimenFiscal,
  tipoPersona: PersonaType,
): RetentionResult {
  let isrRate = 0;
  let ivaRate = 0;

  // Retenciones para plataformas tecnologicas (regimen 625)
  if (regimen === '625') {
    // Plataformas tecnologicas: tasas reducidas
    isrRate = tipoPersona === 'fisica' ? 0.01 : 0; // 1% ISR personas fisicas
    ivaRate = tipoPersona === 'fisica' ? 0.08 : 0; // 8% IVA (50% del 16%)
  }
  // RESICO (regimen 626)
  else if (regimen === '626') {
    isrRate = 0.0125; // 1.25% ISR
    ivaRate = 0;
  }
  // Persona fisica con actividades empresariales (regimen 612)
  else if (regimen === '612' && tipoPersona === 'fisica') {
    isrRate = 0.10; // 10% ISR
    ivaRate = 0; // IVA trasladado, no retenido
  }
  // General de Ley Personas Morales (regimen 601)
  else if (regimen === '601') {
    isrRate = 0; // Personas morales no tienen retencion ISR por plataforma
    ivaRate = 0;
  }
  // Arrendamiento (regimen 606)
  else if (regimen === '606' && tipoPersona === 'fisica') {
    isrRate = 0.10; // 10% ISR
    ivaRate = 0;
  }

  // Calculo con redondeo a 2 decimales (centavos MXN)
  const isrAmount = Math.round(netAmount * isrRate * 100) / 100;
  const ivaAmount = Math.round(netAmount * ivaRate * 100) / 100;
  const netAfterRetentions = Math.round((netAmount - isrAmount - ivaAmount) * 100) / 100;

  return {
    isr_rate: isrRate,
    iva_rate: ivaRate,
    isr_amount: isrAmount,
    iva_amount: ivaAmount,
    net_after_retentions: netAfterRetentions,
  };
}

// ─── Bancos de Mexico ───────────────────────────────────────

export const BANCOS_MEXICO = [
  'BBVA',
  'Banorte',
  'Santander',
  'HSBC',
  'Scotiabank',
  'Citibanamex',
  'Banco Azteca',
  'Inbursa',
  'BanCoppel',
  'Banregio',
  'Afirme',
  'Multiva',
  'Banbajio',
  'Mifel',
  'Monex',
  'Intercam',
  'Actinver',
  'Ve por Mas',
  'Compartamos',
  'STP',
  'Otro',
] as const;

// ─── Usos de CFDI ──────────────────────────────────────────

export const USOS_CFDI: Record<string, string> = {
  'G01': 'Adquisicion de mercancias',
  'G02': 'Devoluciones, descuentos o bonificaciones',
  'G03': 'Gastos en general',
  'I01': 'Construcciones',
  'I02': 'Mobiliario y equipo de oficina por inversiones',
  'I03': 'Equipo de transporte',
  'I04': 'Equipo de computo y accesorios',
  'I08': 'Otra maquinaria y equipo',
  'D01': 'Honorarios medicos, dentales y gastos hospitalarios',
  'D02': 'Gastos medicos por incapacidad o discapacidad',
  'D03': 'Gastos funerales',
  'D04': 'Donativos',
  'P01': 'Por definir',
  'S01': 'Sin efectos fiscales',
  'CP01': 'Pagos',
};
