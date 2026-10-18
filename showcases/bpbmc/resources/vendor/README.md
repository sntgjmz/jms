# Local frontend dependencies

These assets keep the BPBMC portfolio demo independent of external CDNs. The
original project is PHP with HTML, CSS, and JavaScript; the showcase retains its
public clinic images and styles and replaces server behavior with fictional
browser-only data.

| Dependency | Version / selection | Local stylesheet or script |
| --- | --- | --- |
| Bootstrap | 5.0.2 | `bootstrap/bootstrap.min.css`, `bootstrap/bootstrap.bundle.min.js` |
| Boxicons | 2.1.4 | `boxicons/css/boxicons.min.css` |
| Font Awesome Free | 6.4.2 | `fontawesome/css/all.min.css` |
| Unicons Line | 4.0.8 | `unicons/css/line.css` |
| Poppins | Weights 300, 400, 500, 600, 700 | `fonts/fonts.css` |
| Archivo Black | Weight 400 | `fonts/fonts.css` |
| Swiper | 10.3.1, copied from the original project | `../library/swiper/swiper-bundle.min.css`, `../library/swiper/swiper-bundle.min.js` |

Font URLs are local. Original Google Fonts `@import` declarations were removed
from the copied clinic stylesheets; the demo injects `fonts/fonts.css` once.
Existing vendor copyright notices are retained. Upstream license files are
included in each corresponding directory. Font Awesome Free's license covers
its code, fonts, and icons separately; consult its included `LICENSE.txt`.

`manifest.json` records exact download sources and the selected dependency
versions. Public source URLs in that manifest and license notices are attribution
information; the demo does not request them while running.

No original PHP files, database exports, private uploads, medical PDFs,
verification documents, server configuration, or original application JavaScript
were copied into this resources directory.
