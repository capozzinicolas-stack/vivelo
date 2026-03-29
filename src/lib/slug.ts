export function generateSlug(title: string): string {
  return title
    .replace(/ñ/gi, 'n')          // ñ → n antes de NFD
    .normalize('NFD')              // descomponer acentos
    .replace(/[\u0300-\u036f]/g, '') // quitar diacriticos
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '') // solo alfanumerico + espacios + guiones
    .replace(/[\s_]+/g, '-')      // espacios → guiones
    .replace(/-+/g, '-')          // colapsar guiones multiples
    .replace(/^-|-$/g, '');       // quitar guiones al inicio/final
}

export function isUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}
