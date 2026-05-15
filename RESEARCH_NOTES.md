# Research notes: economic S2 retention atlas PoC

## Goal

Use live public macroeconomic feeds to test whether a map-based DREAM/S2 decomposition helps reveal country and regional patterns that are not obvious from CPI inflation alone.

## Live-only rule

The app has no synthetic data path. The only economic records displayed are the JSON records written by `scripts/fetch_worldbank.py` from live World Bank API calls. If the live-source action fails or has not run, the app renders no economic data.

## Model version

Current formula version: `s2-econ-retention-poc-v0.5-official-cleaned-toggle-live-only` with app shell `v0.8-d3-svg-map-renderer`.

## Static-layer hypothesis

Observed inflation can be decomposed into visually separable research fields:

```text
observed positive inflation ~= productive component + residual pressure
residual pressure -> retention drag + symbolic/noise pressure
```

This is not asserted as an official macroeconomic identity. It is a research scaffold for visual exploration.

## Measurement-robust / Cleaned signal hypothesis

The first finance-field formula over-saturated high broad-money/private-credit countries. In particular, a hard 50..200 broad-money/GDP scale could make China appear as `100/100` financialization, while the U.S. could be understated when World Bank broad-money coverage was stale or absent. That should be treated as a model bug, not a finding.

The Cleaned signal mode therefore:

- smooths financial depth instead of hard-clipping it;
- keeps the old hard-clipped score only as `legacy_financialization_score` for audit;
- cross-checks CPI inflation against GDP-deflator inflation;
- adds broad-money growth as a monetary expansion signal;
- adds labor-force participation and employment-to-population as labor-stat cross-checks;
- emits a measurement divergence score so users can see when official series disagree.

This still does **not** truly reverse hedonics, CPI methodology, GDP-deflator methodology, or national labor definitions. It is a live-source robustness mode for research and PoC use; the UI lets users toggle Official/Cleaned globally across all tabs.

## Dynamics-layer hypothesis

The new layer treats country-year observations as points in a yearly retention-state space. It asks whether the global macro field forms visible:

- productive coherence zones;
- symbolic finance zones;
- retention-drag basins;
- dust/overhead zones;
- shock regions;
- transition regions.

A yearly pressure score is computed from present live-source inputs. Regional arcs are then inferred from year-over-year pressure-gradient changes. These arcs are **visual hypotheses only** and are not measured bilateral trade, capital, CPI, or migration flows.

## Null handling

- Missing live-source inputs remain `null`.
- Derived fields remain `null` when they lack enough live inputs.
- Each country emits a `quality.confidence` score based on observed model inputs.
- Country-year dynamic rows emit `input_count` so weak historical coverage is visible.

## Suggested next feeds

After the World Bank-only PoC works, add optional feed adapters:

1. OECD SDMX for higher-frequency OECD country indicators.
2. ECB Statistical Data Warehouse for Euro-area monetary and inflation feeds.
3. BIS credit/debt series.
4. IMF SDMX/DataMapper if the endpoint and licensing are stable for automated use.
5. FRED only if the repo owner is comfortable using a free API key through GitHub Actions secrets.
6. UN Comtrade or Atlas-style trade data for measured flow overlays, replacing the current inferred-gradient arcs.

## Validation checks to add next

- Country-level backtesting against inflation acceleration/deceleration.
- Regional clustering stability under formula parameter perturbation.
- Missingness sensitivity maps.
- Compare derived dust/coherence layers against future GDP growth revisions and inflation volatility.
- Compare inferred pressure-gradient arcs against measured trade/current-account/capital-flow data once a free source is added.
- Backtest the Cleaned signal mode against later inflation acceleration, GDP revisions, unemployment/participation changes, and crisis indicators.

## Playback and movie notes

The Dynamics layer can be played as a 40-year movie. The speed selector changes the year-step interval only; it does not alter data or interpolation. The movie-note text is generated from the selected year's live-source regional rollups and inferred pressure-gradient arcs. Voice narration has been removed; no browser speech synthesis is used.


## Official/Cleaned toggle

The next-release UI has a global Signal selector. Official mode shows direct World Bank-derived layers. Cleaned mode re-runs the same layer logic on measurement-adjusted proxy inputs: CPI is triangulated with GDP-deflator inflation and broad-money growth net of real growth; unemployment is cross-checked against labor-force participation and employment-to-population. This is not a true reversal of hedonics, GDP-deflator methodology, or labor-stat definitions. It is a robustness lens that asks whether the S2 pattern survives when the source signal is less dependent on one official headline series.

## Flow stripe bug note

The persistent horizontal stripe seen across Eurasia/North America was consistent with straight pressure-gradient polylines spanning longitudes across the map wrap/anti-meridian. The patched frontend now clears flows whenever the active layer is not Dynamics, includes the Signal mode in the flow cache key, lowers line opacity/weight, and splits anti-meridian segments instead of drawing one long wrapped line.


## v0.7 map-renderer change

The app shell now uses Apache D3/SVG for the world choropleth instead of Leaflet/OpenStreetMap raster tiles. This is a renderer/UI change only; it does not alter the live-feed ETL, formulas, Official/Cleaned toggle, Dynamics movie notes, or downloaded JSON schema. The purpose is to eliminate persistent horizontal stripe artifacts seen in the Leaflet build. Inferred flow arcs remain optional and are disabled by default. Very long longitude-jump arcs are skipped rather than wrapped across the map.


## v0.8 map-rendering note

The map renderer was changed from Leaflet/ECharts-style map components to a D3 SVG renderer using a Natural Earth projection. Country fills are applied directly to SVG paths, hover preserves the underlying fill color, and optional inferred-flow paths are hidden by default and clipped/skipped when they would create projection-spanning stripes.
