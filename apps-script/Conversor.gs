/**
 * Conversor.gs — Plantilla SdA AdF 26-27 → piezas para el Google Site
 * IES Valle del Jerte · Aula del Futuro
 *
 * Entrada: el documento exportado a Markdown.
 * Salida:
 *   - site:   HTML sencillo para pegar en un cuadro de texto del Site (indexable)
 *   - embed:  HTML completo para Insertar › Incrustar › Código (tablas, etiquetas…)
 *   - avisos: apartados vacíos o que faltan, para la revisión
 *
 * Cada apartado del documento aparece en UNA sola de las dos piezas.
 */

// Apartados que van como texto nativo en el Site (clave normalizada → título mostrado)
var SDA_NATIVOS = {
  'pregunta o reto': 'Reto',
  'descripcion': 'Descripción',
  'producto final': 'Producto final',
  'zonas de aprendizaje utilizadas': 'Zonas del Aula del Futuro',
  'tematica': 'Palabras clave'
};

function sdaConvertir(md, titulo) {
  var d = sdaParse_(md);
  var avisos = [];

  // ---------- Ficha (tabla «Datos de identificación») ----------
  var todos = d.pre.slice();
  d.secciones.forEach(function (s) {
    todos = todos.concat(s.intro);
    s.subs.forEach(function (x) { todos = todos.concat(x.bloques); });
  });
  var tId = todos.filter(function (b) {
    return b.tipo === 'tabla' && /^datos de identificacion/.test(sdaNorm_(b.cab[0] || ''));
  })[0];

  var ficha = [];
  if (!tId) {
    avisos.push('No encuentro la tabla «Datos de identificación».');
  } else {
    var vistos = {};
    tId.filas.forEach(function (f) {
      var k = sdaNorm_(f[0] || '');
      var et = null;
      if (/autoria|docente/.test(k)) et = 'Docentes';
      else if (/curso|etapa/.test(k)) et = 'Curso';
      else if (/area|materia|modulo/.test(k)) et = 'Materias';
      if (!et || vistos[et]) return;
      vistos[et] = true;
      if (sdaPlain_(f[1] || '')) ficha.push([et, f[1]]);
      else avisos.push('Falta el dato: ' + et.toLowerCase() + '.');
    });
  }

  // ---------- Apartados nativos ----------
  var nat = {};
  d.secciones.forEach(function (s) {
    s.subs.forEach(function (x) {
      var k = sdaNorm_(x.titulo);
      if (SDA_NATIVOS[k] && !nat[k]) { nat[k] = x; x.nativo = true; }
    });
  });
  ['pregunta o reto', 'descripcion', 'producto final', 'zonas de aprendizaje utilizadas'].forEach(function (k) {
    if (!nat[k] || !sdaTieneTexto_(nat[k].bloques)) avisos.push('Apartado vacío o ausente: ' + SDA_NATIVOS[k] + '.');
  });
  if (!d.secciones.length) avisos.unshift('El documento no parece seguir la plantilla SdA 26-27.');

  var site = ficha.map(function (p) {
    return '<p><strong>' + p[0] + ':</strong> ' + sdaInline_(p[1]) + '</p>';
  }).join('\n');
  ['pregunta o reto', 'descripcion', 'producto final', 'zonas de aprendizaje utilizadas'].forEach(function (k) {
    if (nat[k] && sdaTieneTexto_(nat[k].bloques)) {
      site += '\n<h3>' + SDA_NATIVOS[k] + '</h3>\n' + sdaBloquesHtml_(nat[k].bloques, 'site');
    }
  });
  if (nat['tematica'] && sdaTieneTexto_(nat['tematica'].bloques)) {
    site += '\n<p><strong>Palabras clave:</strong> ' + sdaInline_(sdaTextoPlano_(nat['tematica'].bloques)) + '</p>';
  }

  // ---------- Ficha completa incrustable ----------
  var n = 0, cuerpo = '';
  d.secciones.forEach(function (s) {
    var subs = s.subs.filter(function (x) { return !x.nativo && sdaTieneTexto_(x.bloques); });
    var hayIntro = sdaTieneTexto_(s.intro);
    if (!subs.length && !hayIntro) return;
    n++;
    var tit = sdaPlain_(s.titulo).replace(/^\d+\s*[.)\-]?\s*/, '');
    cuerpo += '<section>\n<h2><span class="n">' + n + '</span>' + sdaEsc_(tit) + '</h2>\n';
    cuerpo += sdaBloquesHtml_(s.intro, 'embed');
    subs.forEach(function (x) {
      cuerpo += '\n<h3>' + sdaEsc_(x.titulo) + '</h3>\n' + sdaBloquesHtml_(x.bloques, 'embed');
    });
    cuerpo += '\n</section>\n';
  });

  var embed = '<!DOCTYPE html>\n<html lang="es"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">' +
    '<base target="_blank"><title>' + sdaEsc_(titulo || 'Situación de aprendizaje') + '</title>' +
    '<style>' + SDA_CSS + '</style></head><body><main class="sda">\n' + cuerpo + '</main></body></html>';

  return { site: site, embed: embed, avisos: avisos };
}

// ---------------------------------------------------------------- Parser

function sdaParse_(md) {
  var lines = String(md).replace(/\r/g, '').split('\n');
  var doc = { pre: [], secciones: [] };
  var h1 = null, h2 = null;
  function destino() { return h2 ? h2.bloques : (h1 ? h1.intro : doc.pre); }
  var reCheck = /^[-*+]\s+\[[ xX]\]/;
  var reLista = /^([-*+]|\d+[.)])\s+/;
  var i = 0, m;

  while (i < lines.length) {
    var line = lines[i].trim();
    if (!line) { i++; continue; }

    if ((m = line.match(/^(#{1,6})\s*(.*)$/))) {
      var txt = sdaPlain_(m[2]);
      if (txt) {
        if (m[1].length === 1) {
          h1 = { titulo: txt, intro: [], subs: [] }; doc.secciones.push(h1); h2 = null;
        } else {
          if (!h1) { h1 = { titulo: '', intro: [], subs: [] }; doc.secciones.push(h1); }
          h2 = { titulo: txt, bloques: [] }; h1.subs.push(h2);
        }
      }
      i++; continue;
    }

    if (line.charAt(0) === '|') {
      var filas = [];
      while (i < lines.length && lines[i].trim().charAt(0) === '|') {
        var r = lines[i].trim();
        if (!/^\|[\s:|-]+\|?$/.test(r)) filas.push(sdaCeldas_(r));
        i++;
      }
      if (filas.length) destino().push({ tipo: 'tabla', cab: filas[0], filas: filas.slice(1) });
      continue;
    }

    if (reCheck.test(line)) {
      var items = [];
      while (i < lines.length && reCheck.test(lines[i].trim())) {
        var mm = lines[i].trim().match(/^[-*+]\s+\[([ xX])\]\s*(.*)$/);
        items.push({ ok: mm[1].toLowerCase() === 'x', texto: mm[2].trim() });
        i++;
      }
      destino().push({ tipo: 'checks', items: items });
      continue;
    }

    if (reLista.test(line)) {
      var li = [];
      while (i < lines.length && reLista.test(lines[i].trim()) && !reCheck.test(lines[i].trim())) {
        li.push(lines[i].trim().replace(reLista, ''));
        i++;
      }
      destino().push({ tipo: 'lista', items: li });
      continue;
    }

    var buf = [line]; i++;
    while (i < lines.length) {
      var l2 = lines[i].trim();
      if (!l2 || /^#/.test(l2) || l2.charAt(0) === '|' || reLista.test(l2) || reCheck.test(l2)) break;
      buf.push(l2); i++;
    }
    destino().push({ tipo: 'p', texto: buf.join(' ') });
  }
  return doc;
}

function sdaCeldas_(row) {
  var r = row.replace(/\\\|/g, '\u0001').replace(/^\|/, '').replace(/\|\s*$/, '');
  return r.split('|').map(function (c) { return c.replace(/\u0001/g, '|').trim(); });
}

// ---------------------------------------------------------------- Render

function sdaBloquesHtml_(bloques, modo) {
  return bloques.map(function (b) {
    if (b.tipo === 'p') return sdaPlain_(b.texto) ? '<p>' + sdaInline_(b.texto) + '</p>' : '';
    if (b.tipo === 'lista') {
      return '<ul>' + b.items.map(function (t) { return '<li>' + sdaInline_(t) + '</li>'; }).join('') + '</ul>';
    }
    if (b.tipo === 'checks') {
      var ok = b.items.filter(function (x) { return x.ok && sdaPlain_(x.texto); });
      if (!ok.length) return '';
      if (modo === 'site') return '<p>' + ok.map(function (x) { return sdaInline_(x.texto); }).join(' · ') + '</p>';
      return '<ul class="chips">' + ok.map(function (x) { return '<li>' + sdaInline_(x.texto) + '</li>'; }).join('') + '</ul>';
    }
    if (b.tipo === 'tabla') return sdaTablaHtml_(b);
    return '';
  }).join('\n');
}

function sdaTablaHtml_(t) {
  var cab = t.cab;
  var filas = t.filas.filter(function (f) { return f.some(function (c) { return sdaPlain_(c); }); });

  // Tabla de una fila con datos cortos (p. ej. temporalización) → tarjetas
  if (filas.length === 1 && cab.length <= 5 &&
      filas[0].every(function (c) { return sdaPlain_(c).length <= 40; })) {
    return '<div class="stats">' + cab.map(function (h, i) {
      return '<div class="stat"><span class="v">' + (sdaInline_(filas[0][i] || '') || '—') +
        '</span><span class="k">' + sdaInline_(h) + '</span></div>';
    }).join('') + '</div>';
  }

  var esAct = /^actividad/.test(sdaNorm_(cab[0] || ''));
  var h = '<div class="tw"><table><thead><tr>' +
    cab.map(function (c) { return '<th>' + sdaInline_(c) + '</th>'; }).join('') +
    '</tr></thead><tbody>';
  filas.forEach(function (f) {
    h += '<tr>' + cab.map(function (_, i) {
      var c = f[i] || '';
      if (i === 0 && esAct) {
        var m = sdaPlain_(c).match(/^(\d+)\s*(.+?)\s+(Sesi(?:ón|on|ones)\s.*)$/i);
        if (m) {
          return '<td><div class="act"><span class="num">' + m[1] + '</span><div><strong>' +
            sdaEsc_(m[2]) + '</strong><small>' + sdaEsc_(m[3]) + '</small></div></div></td>';
        }
      }
      return '<td>' + sdaInline_(c) + '</td>';
    }).join('') + '</tr>';
  });
  return h + '</tbody></table></div>';
}

// ---------------------------------------------------------------- Utilidades de texto

function sdaUnesc_(s) { return String(s).replace(/\\([\\`*_{}\[\]()#+\-.!|>~])/g, '$1'); }

function sdaEsc_(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function sdaPlain_(s) {
  return sdaUnesc_(String(s).replace(/<br\s*\/?>/gi, ' ')).replace(/\*\*/g, '').replace(/\s+/g, ' ').trim();
}

function sdaInline_(s) {
  var t = String(s).replace(/<br\s*\/?>/gi, '\u0002');
  t = sdaEsc_(sdaUnesc_(t).trim());
  t = t.replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  t = t.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*\*/g, '');
  t = t.replace(/\s{2,}/g, ' ');
  return t.replace(/\u0002/g, '<br>');
}

function sdaNorm_(s) {
  return sdaPlain_(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/^\d+\s*[.)\-]?\s*/, '').replace(/[*_:]/g, '').trim();
}

function sdaTieneTexto_(bloques) {
  return (bloques || []).some(function (b) {
    if (b.tipo === 'p') return !!sdaPlain_(b.texto);
    if (b.tipo === 'lista') return b.items.length > 0;
    if (b.tipo === 'checks') return b.items.some(function (x) { return x.ok; });
    if (b.tipo === 'tabla') return b.filas.length > 0;
    return false;
  });
}

function sdaTextoPlano_(bloques) {
  return bloques.map(function (b) {
    if (b.tipo === 'p') return b.texto;
    if (b.tipo === 'lista') return b.items.join(', ');
    return '';
  }).filter(String).join(' ');
}

// ---------------------------------------------------------------- Estilo de la ficha incrustada

var SDA_CSS = [
  ':root{--acc:#1f7a99;--acc-2:#e2f3f9;--ink:#1d2a30;--mut:#5c6b72;--bd:#d5e5eb;--row:#f6fbfc}',
  '*{box-sizing:border-box}',
  'body{margin:0;background:#fff;color:var(--ink);font:15px/1.6 "Lato","Segoe UI",Arial,sans-serif}',
  '.sda{max-width:980px;margin:0 auto;padding:4px 16px 28px}',
  'section{margin-top:26px}',
  'h2{display:flex;align-items:center;gap:10px;margin:0 0 12px;padding-bottom:8px;border-bottom:2px solid var(--acc-2);color:var(--acc);font-size:1.25rem}',
  'h2 .n{flex:none;display:inline-flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:50%;background:var(--acc);color:#fff;font-size:.95rem}',
  'h3{margin:18px 0 6px;font-size:1rem;color:var(--ink)}',
  'p{margin:0 0 10px}',
  'ul{margin:0 0 10px;padding-left:20px}',
  'li{margin:3px 0}',
  'ul.chips{display:flex;flex-wrap:wrap;gap:6px;padding:0;list-style:none}',
  'ul.chips li{margin:0;padding:3px 12px;border-radius:999px;background:var(--acc-2);color:#0e4f66;font-size:.88rem}',
  '.tw{overflow-x:auto;margin:6px 0 14px;border:1px solid var(--bd);border-radius:8px}',
  'table{width:100%;border-collapse:collapse;font-size:.92rem}',
  'th{padding:9px 12px;background:var(--acc);color:#fff;text-align:left;font-weight:600;white-space:nowrap}',
  'td{padding:9px 12px;border-top:1px solid var(--bd);vertical-align:top}',
  'tbody tr:nth-child(even) td{background:var(--row)}',
  '.act{display:flex;gap:10px;align-items:flex-start;min-width:170px}',
  '.act .num{flex:none;display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:50%;background:var(--acc-2);color:var(--acc);font-weight:700}',
  '.act small{display:block;color:var(--mut)}',
  '.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;margin:6px 0 14px}',
  '.stat{padding:12px 14px;border:1px solid var(--bd);border-radius:10px;background:var(--row)}',
  '.stat .v{display:block;font-size:1.15rem;font-weight:700;color:var(--acc)}',
  '.stat .k{display:block;font-size:.82rem;color:var(--mut);text-transform:uppercase;letter-spacing:.04em}',
  'a{color:var(--acc)}'
].join('');

if (typeof module !== 'undefined') module.exports = { sdaConvertir: sdaConvertir };
