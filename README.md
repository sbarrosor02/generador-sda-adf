# Generador de SdA para el Site del Aula del Futuro

Convierte una situación de aprendizaje escrita con la **plantilla SdA AdF 26-27** en las dos piezas que se publican en el Google Site del Aula del Futuro del IES Valle del Jerte (Cabezuela–Navaconcejo):

1. **Texto para el Site**: ficha (docentes, curso, materias), reto, descripción, producto final, zonas del Aula del Futuro y palabras clave. Se pega en un cuadro de texto, así que el buscador del Site lo encuentra.
2. **Ficha completa para incrustar**: objetivos, saberes, competencias, metodología, temporalización, secuencia de actividades y evaluación, con tablas y etiquetas. Se pega con *Insertar › Incrustar › Insertar código*.

Cada apartado del documento aparece en una sola de las dos piezas, sin repeticiones. El generador también avisa de los apartados obligatorios vacíos y renumera las secciones de la ficha.

## Uso (página web)

Abre la página publicada con GitHub Pages:

**https://sbarrosor02.github.io/generador-sda-adf/**

1. En Google Docs, abre la SdA y usa **Archivo › Descargar › Markdown (.md)**.
2. Arrastra el archivo a la página (o pega el Markdown con *Editar › Copiar como Markdown*).
3. Copia el título, el texto y el código, y pégalos en la página de la SdA en el Site.
4. Estira el recuadro incrustado hasta la altura que indica la página.

Todo se procesa en el navegador: el documento no se envía a ningún servidor.

Para probarlo sin una SdA real, usa [`ejemplo/ejemplo-sda.md`](ejemplo/ejemplo-sda.md).

## Uso (web app de Google Apps Script)

Alternativa que lee el documento directamente desde su enlace de Google Docs, sin descargarlo.

1. En [script.google.com](https://script.google.com), crea un proyecto nuevo.
2. Copia los archivos de [`apps-script/`](apps-script): `Code.gs`, `Conversor.gs` (secuencia de comandos), `Index.html` (HTML, llamado `Index`).
3. En *Configuración del proyecto*, activa *Mostrar el archivo de manifiesto* y sustituye `appsscript.json`.
4. *Implementar › Probar implementaciones › Aplicación web* y abre la URL que acaba en `/dev`.

## Estructura

| Ruta | Qué es |
| --- | --- |
| `index.html` | Página web del generador (GitHub Pages) |
| `conversor.js` | Conversor Markdown → piezas del Site |
| `apps-script/` | Versión web app de Google Apps Script |
| `ejemplo/ejemplo-sda.md` | SdA ficticia para probar |

`conversor.js` y `apps-script/Conversor.gs` son el mismo código: si cambias uno, copia el cambio al otro.

## Requisitos de la plantilla

El conversor reconoce los apartados por su título, así que la plantilla debe mantener los encabezados originales (*Descripción*, *Pregunta o reto*, *Producto final*, *Zonas de aprendizaje utilizadas*, etc.) y la tabla *Datos de identificación* al principio.
