/**
 * Utilidades para el blog: deteccion HTML vs markdown, strip HTML, TOC, conversion.
 */

/** Detecta si el contenido es HTML (vs markdown legacy) */
export function isHtmlContent(content: string): boolean {
  const trimmed = content.trim();
  return /^<[a-z][\s\S]*>/i.test(trimmed);
}

/** Quita tags HTML para mostrar texto plano */
export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/** Extrae headings H2 del HTML para TOC */
export function extractHeadingsFromHtml(html: string): { id: string; text: string }[] {
  const headings: { id: string; text: string }[] = [];
  const regex = /<h2[^>]*>([\s\S]*?)<\/h2>/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    const text = match[1].replace(/<[^>]*>/g, '').trim();
    const id = text
      .toLowerCase()
      .replace(/ñ/gi, 'n')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-');
    headings.push({ id, text });
  }
  return headings;
}

/** Agrega id= a tags H2 para anchor links del TOC */
export function addHeadingIds(html: string): string {
  return html.replace(/<h2([^>]*)>([\s\S]*?)<\/h2>/gi, (_, attrs, inner) => {
    const text = inner.replace(/<[^>]*>/g, '').trim();
    const id = text
      .toLowerCase()
      .replace(/ñ/gi, 'n')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-');
    return `<h2${attrs} id="${id}">${inner}</h2>`;
  });
}

/** Convierte markdown legacy a HTML basico (para editar posts viejos en Tiptap) */
export function markdownToBasicHtml(md: string): string {
  const lines = md.split('\n');
  const htmlLines: string[] = [];
  let inList = false;

  for (const line of lines) {
    // Close list if we're not in a list item
    if (inList && !line.startsWith('- ')) {
      htmlLines.push('</ul>');
      inList = false;
    }

    // Images: ![alt](url)
    const imgMatch = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (imgMatch) {
      htmlLines.push(`<img src="${imgMatch[2]}" alt="${imgMatch[1]}">`);
      continue;
    }

    // Headings
    if (line.startsWith('### ')) {
      htmlLines.push(`<h3>${convertInline(line.slice(4))}</h3>`);
      continue;
    }
    if (line.startsWith('## ')) {
      htmlLines.push(`<h2>${convertInline(line.slice(3))}</h2>`);
      continue;
    }
    if (line.startsWith('# ')) {
      htmlLines.push(`<h1>${convertInline(line.slice(2))}</h1>`);
      continue;
    }

    // Blockquote
    if (line.startsWith('> ')) {
      htmlLines.push(`<blockquote><p>${convertInline(line.slice(2))}</p></blockquote>`);
      continue;
    }

    // Horizontal rule
    if (/^---+$/.test(line.trim())) {
      htmlLines.push('<hr>');
      continue;
    }

    // List items
    if (line.startsWith('- ')) {
      if (!inList) {
        htmlLines.push('<ul>');
        inList = true;
      }
      htmlLines.push(`<li>${convertInline(line.slice(2))}</li>`);
      continue;
    }

    // Empty line
    if (line.trim() === '') {
      continue;
    }

    // Paragraph (check if it's a YouTube URL)
    const trimmed = line.trim();
    if (/^https?:\/\/(www\.)?(youtube\.com\/watch|youtu\.be\/)/.test(trimmed)) {
      htmlLines.push(`<div data-youtube-video><iframe src="${youtubeUrlToEmbed(trimmed)}"></iframe></div>`);
      continue;
    }

    htmlLines.push(`<p>${convertInline(trimmed)}</p>`);
  }

  if (inList) {
    htmlLines.push('</ul>');
  }

  return htmlLines.join('');
}

/** Convierte inline markdown: **bold**, *italic*, [link](url) */
function convertInline(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
}

/** Convierte URL de YouTube a URL de embed */
function youtubeUrlToEmbed(url: string): string {
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (match) return `https://www.youtube-nocookie.com/embed/${match[1]}`;
  return url;
}
