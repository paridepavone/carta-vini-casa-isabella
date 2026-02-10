# Copilot Instructions for La Cantina del Duca Wine List

## Project Overview
This is a single-page web application for browsing a wine list ("Carta Vini"). It fetches wine data from a Google Sheets API, displays a filterable grid of wines, and shows detailed views. Built with vanilla HTML, JavaScript, and CSS. No build tools or frameworks.

## Key Files
- `index.html`: Main structure with list and detail views, filter form.
- `script.js`: Handles data fetching, filtering, rendering, and hash-based routing.
- `styles.css`: Responsive design with CSS variables for theming.

## Data Model
Wines have fields: `id`, `titolo`, `tipologia`, `luogo`, `annata`, `uvaggio`, `prezzo`, `descrizione`, `immagine`. Data normalized and cleaned on load.

## Patterns & Conventions
- **State Management**: Global `ALL` array, `FILTERED` array, `BY_ID` Map. Update via `applyFilters()` and re-render.
- **Rendering**: Use template literals for HTML strings (e.g., `wineCardHtml()`, `wineDetailHtml()`). Always escape HTML with `escapeHtml()`.
- **Filtering**: Real-time on input/change. Search across `titolo`, `tipologia`, `luogo`, `annata`, `uvaggio`, `descrizione`. Price filter allows wines without price.
- **Sorting**: By `tipologia` (alpha), then `titolo` (alpha), then `annata` (desc).
- **Routing**: Hash-based (`#wine=<id>`). Handle with `handleRoute()` on load/hashchange.
- **Utilities**: `toNumber()` for prices, `normalizeText()` for strings, `fmtPrice()` for Italian formatting.
- **Error Handling**: Catch fetch errors, display in grid with `<code>` for details.
- **Accessibility**: Add `role="button"`, `tabindex="0"`, `aria-label` for interactive cards. Keyboard navigation (Enter/Space).
- **Images**: Lazy load with `loading="lazy"`. Placeholder with 🍷 emoji if no image.
- **Language**: Italian UI text, comments, and sorting (`localeCompare` with "it").

## Development Workflow
- Open `index.html` in browser to test (handles CORS for API).
- API URL in `script.js` config; uses `cache: "no-store"` for fresh data.
- No tests or linters; manual testing of filters, routing, and responsiveness.

## Examples
- Adding a filter: Bind event in `bindEvents()`, update `getFilters()`, filter in `applyFilters()`.
- New wine field: Add to normalization in `loadWines()`, update rendering functions, and search haystack.
- Styling: Use CSS variables like `--bordeaux` for wine-themed colors.</content>
<parameter name="filePath">/Users/paridecarminepavone/Desktop/La Cantina del Duca/.github/copilot-instructions.md