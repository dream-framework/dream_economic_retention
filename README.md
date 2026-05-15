# S2 Global Economic Retention Atlas

Live-feed GitHub Pages proof-of-concept for a DREAM/S2 economic atlas.

This repo is intentionally **free-stack** and **live-only**:

- No backend server.
- No paid map service.
- No API keys.
- No demo or mocked economic data.
- GitHub Actions refreshes public live-source data into repo JSON.
- GitHub Pages serves the static app.

## Stack

| Layer | Choice | Why |
| --- | --- | --- |
| App | Plain HTML/CSS/JavaScript | No build pipeline needed for the PoC. |
| Map | Apache D3/SVG + world-atlas GeoJSON/TopoJSON | Free, no key, static-friendly, avoids raster tile seams and Leaflet wrap artifacts. |
| Boundaries | world-atlas TopoJSON CDN | Static geography only, not demo economic data. |
| Data ETL | Python | Easy source audit and metric formulas. |
| Scheduler | GitHub Actions cron + manual trigger | Free for public repos and simple for private repos within GitHub limits. |
| Storage | `/data/econ_latest.json` committed to the repo | The GitHub Page feeds from the GitHub repo itself. |

## Live data sources

The PoC pulls from the World Bank Indicators API using World Development Indicators and linked source databases. The ETL queries a rolling **40-year** date window and reads the newest non-null country observation for the static layers.

Indicators used:

| Key | World Bank code | Role |
| --- | --- | --- |
| `inflation` | `FP.CPI.TOTL.ZG` | observed CPI inflation |
| `cpi_index` | `FP.CPI.TOTL` | observed CPI level |
| `gdp_deflator_inflation` | `NY.GDP.DEFL.KD.ZG` | economy-wide inflation cross-check |
| `gdp_growth` | `NY.GDP.MKTP.KD.ZG` | real output growth |
| `gdp_pc_growth` | `NY.GDP.PCAP.KD.ZG` | productive growth proxy |
| `broad_money_gdp` | `FM.LBL.BMNY.GD.ZS` | smoothed financial depth proxy |
| `broad_money_growth` | `FM.LBL.BMNY.ZG` | monetary expansion proxy |
| `domestic_credit_private_gdp` | `FS.AST.PRVT.GD.ZS` | financialization proxy |
| `debt_service_exports` | `DT.TDS.DECT.EX.ZS` | debt pressure proxy |
| `gov_expense_gdp` | `GC.XPN.TOTL.GD.ZS` | overhead proxy |
| `unemployment` | `SL.UEM.TOTL.ZS` | labor slack proxy |
| `labor_force_participation` | `SL.TLF.CACT.ZS` | hidden labor slack cross-check |
| `employment_to_population` | `SL.EMP.TOTL.SP.ZS` | hidden labor slack cross-check |
| `trade_gdp` | `NE.TRD.GNFS.ZS` | openness context |

## Derived research layers

These are research proxies, not official economic categories. A global **Signal** toggle switches every tab between Official and Cleaned mode. Official mode uses direct World Bank series; Cleaned mode uses a measurement-robust proxy input set that triangulates CPI against GDP-deflator inflation, broad-money growth, hidden labor slack, debt/overhead, weak growth, and smoothed finance depth. This does not truly reverse hedonics or national-statistical methodology.

- **Observed inflation**: latest non-null CPI inflation.
- **Productive inflation**: positive CPI inflation multiplied by present positive-growth scores from GDP growth and GDP-per-capita growth.
- **Retention drag**: residual positive inflation after productive component, weighted by present debt-service, government-expense, and negative-growth pressure scores.
- **Symbolic/noise inflation**: residual positive inflation weighted by smoothed broad-money/GDP and private-credit/GDP financialization scores.
- **S2 pressure**: composite retention-pressure score shown in either Official or Cleaned mode.
- **Dust index**: 0-100 maintenance/overhead proxy from present debt, finance, government expense, unemployment, and negative-growth pressures.
- **Coherence score**: 100 minus present pressure scores from inflation deviation, debt, finance, labor slack, and negative growth.
- **Dynamics**: yearly 40-year cluster states plus inferred regional retention-pressure-gradient arcs.

The ETL emits `null` when needed source inputs are missing. It does not substitute demo values.

## Dynamics layer

The **Dynamics** tab adds the requested historical layer:

- timeline slider across the live-source years available in the 40-year pull;
- play/pause animation;
- playback speed control at 0.5x, 1x, 2x, and 4x;
- text movie notes that summarize the selected year from live-source rollups;
- no voice narration or browser speech;
- per-country yearly cluster state;
- country inspector for pressure score, pressure delta, inflation, retention drag, dust, and coherence;
- regional flow arcs.

The arcs are **not measured bilateral trade, capital, or CPI flows**. They are explicitly labelled as inferred retention-pressure-gradient arcs from regional year-over-year pressure changes. This makes them suitable for visual hypothesis generation, not final econometric claims.

Cluster states:

| Cluster | Meaning |
| --- | --- |
| Productive coherence | Higher coherence, non-negative growth, moderate inflation. |
| Symbolic finance | High financialization pressure where symbolic residual dominates. |
| Retention drag | Residual inflation weighted by debt, overhead, or weak growth. |
| Inflation shock | Very high observed CPI inflation. |
| Dust / overhead | Maintenance/overhead pressures dominate. |
| Transition / mixed | No single pressure mode dominates. |
| Low signal | Insufficient live-source inputs for a strong state assignment. |


## v0.5 official/cleaned signal toggle

The app replaces the separate Clean S2 tab with a global **Signal: Official / Cleaned** toggle that affects every layer, including Dynamics and inferred flow arcs. It also corrects the earlier finance-field saturation problem. The old finance score clipped broad-money/GDP and private-credit/GDP at hard ceilings, which could display countries such as China as `100/100`. The new visible finance field uses a smooth asymptotic transform, keeps the old hard-clipped value only as `legacy_financialization_score` for audit, and adds cross-check inputs: GDP-deflator inflation, broad-money growth, labor-force participation, and employment-to-population.

## v0.4 UI stability patch

The app now opens directly on the Dynamics layer so the movie controls are visible immediately after the live JSON loads. The map renderer was also stabilized for timeline playback:

* Leaflet uses canvas-preferred rendering and disables zoom/fade animation.
* Timeline playback updates country styles through `requestAnimationFrame`.
* Tooltip text is not recomputed for every country on every movie tick.
* Flow arcs are redrawn only when the active year/filter actually changes.
* Default playback intervals are slightly slower to reduce raster-tile flicker.


## Download analysis JSON

The top toolbar includes a **Download JSON** button. After the live feed loads, it exports a single analysis bundle containing:

- the loaded `data/econ_latest.json` payload;
- the current app view context: Official/Cleaned mode, selected layer, selected Dynamics year, filters, and selected country;
- `data/source_audit.json` when available;
- notes reminding downstream analysis that inferred arcs are pressure-gradient hypotheses, not measured bilateral flows.

This export is meant for copy-off analysis, reproducibility checks, and sharing the exact live-feed state used in a visual inspection.

## Deploy

1. Create a new GitHub repo, for example `s2-economic-retention-atlas`.
2. Upload these files to the repo's `main` branch.
3. Go to **Settings -> Pages**.
4. Set **Source** to **GitHub Actions**.
5. Go to **Actions -> Refresh live economic data and deploy Pages**.
6. Click **Run workflow**.

The first successful run creates:

- `data/econ_latest.json`
- `data/source_audit.json`
- a deployed GitHub Pages site

Until the action has successfully written live JSON, the app shows a tiny loader and then an exact no-data/error message. This is expected because there is no demo fallback.

## Local validation

Syntax checks that do not require network access:

```bash
python -m py_compile scripts/fetch_worldbank.py
node --check assets/app.js
```

Live ETL check, requires internet:

```bash
pip install -r scripts/requirements.txt
python scripts/fetch_worldbank.py
python -m http.server 8000
```

Then open `http://localhost:8000`.

## Research caveats

- World Bank macro indicators are not real-time tick data. They are live public feeds that update as the source database updates.
- Country coverage varies by indicator, especially debt-service and government-expense fields.
- Flow arcs are inferred from pressure gradients and must not be interpreted as observed bilateral flows.
- The PoC is designed to test whether the visual decomposition is useful before adding more feeds such as OECD, IMF SDMX, ECB, BIS, or FRED-key-based feeds.
- The formulas are deliberately transparent and versioned in `scripts/fetch_worldbank.py` and in the output JSON.
- The Cleaned signal mode is a robustness cross-check, not a "true inflation" or shadow-statistics claim. It should be tested against later inflation acceleration, output revisions, and crisis onsets before being treated as evidence.


## v0.8 map-rendering note

The map renderer was changed from Leaflet/ECharts-style map components to a D3 SVG renderer using a Natural Earth projection. Country fills are applied directly to SVG paths, hover preserves the underlying fill color, and optional inferred-flow paths are hidden by default and clipped/skipped when they would create projection-spanning stripes.
