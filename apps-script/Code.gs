/**
 * Code.gs — Generador de SdA para el Site del Aula del Futuro
 * IES Valle del Jerte (Cabezuela–Navaconcejo) · curso 2026-2027
 *
 * Web app: pegas el enlace del documento de la SdA (plantilla 26-27)
 * y obtienes:
 *   1) el texto para pegar en un cuadro de texto del Site
 *   2) el código para Insertar › Incrustar › Código
 */

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Generador SdA · Aula del Futuro')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/** Llamada desde la interfaz. */
function generar(url) {
  var id = extraerId_(url);
  if (!id) throw new Error('No reconozco el enlace. Pega la URL del documento de Google Docs.');

  var file;
  try {
    file = DriveApp.getFileById(id);
  } catch (e) {
    throw new Error('No tengo acceso a ese documento. Comprueba que está compartido contigo.');
  }
  if (file.getMimeType() !== MimeType.GOOGLE_DOCS) {
    throw new Error('El enlace no es un documento de Google Docs. Si es un .docx, ábrelo y usa Archivo › Guardar como documento de Google.');
  }

  var titulo = limpiarTitulo_(file.getName());
  var res = sdaConvertir(exportarMarkdown_(id), titulo);
  res.titulo = titulo;
  return res;
}

function exportarMarkdown_(id) {
  var token = ScriptApp.getOAuthToken();
  var urls = [
    'https://www.googleapis.com/drive/v3/files/' + id + '/export?mimeType=text%2Fmarkdown',
    'https://docs.google.com/document/d/' + id + '/export?format=md'
  ];
  var ultimo = '';
  for (var i = 0; i < urls.length; i++) {
    var r = UrlFetchApp.fetch(urls[i], {
      headers: { Authorization: 'Bearer ' + token },
      muteHttpExceptions: true
    });
    if (r.getResponseCode() === 200) return r.getContentText('UTF-8');
    ultimo = r.getResponseCode() + ' ' + r.getContentText().slice(0, 200);
  }
  throw new Error('No se pudo leer el documento (' + ultimo + ').');
}

function extraerId_(url) {
  var s = String(url || '').trim();
  var m = s.match(/\/d\/([a-zA-Z0-9_-]{20,})/) ||
          s.match(/[?&]id=([a-zA-Z0-9_-]{20,})/) ||
          s.match(/^([a-zA-Z0-9_-]{25,})$/);
  return m ? m[1] : null;
}

/** «DUPLICADO Vivenciando… - Plantilla_SdA_AdF_26-27» → «Vivenciando…» */
function limpiarTitulo_(nombre) {
  return String(nombre)
    .replace(/^\s*(DUPLICADO|Copia de|Copy of)\s+/i, '')
    .replace(/\s*[-–—]\s*Plantilla[_\s]*SdA.*$/i, '')
    .trim();
}
