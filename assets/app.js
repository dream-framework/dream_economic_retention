(() => {
  'use strict';

  const DATA_URL = new URL('data/econ_latest.json', window.location.href).href;
  const AUDIT_URL = new URL('data/source_audit.json', window.location.href).href;
  const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';
  const MAP_NAME = 'dream_world_echarts';

  const CLUSTER_COLORS = {
    productive_coherence: '#79f2b0',
    symbolic_finance: '#b9a1ff',
    retention_drag: '#ffb84d',
    inflation_shock: '#ff6478',
    dust_overhead: '#9a7a57',
    transition: '#74d7ff',
    low_signal: '#2a3745'
  };

  const LAYERS = [
    {
      key: 'inflation',
      label: 'Inflation',
      short: 'CPI',
      unit: '%',
      source: 'values',
      min: -3,
      max: 25,
      decimals: 1,
      description: 'Observed annual consumer-price inflation from the newest non-null World Bank / IMF IFS country observation.'
    },
    {
      key: 'productive_inflation',
      label: 'Productive',
      short: 'Productive',
      unit: '%',
      source: 'derived',
      min: 0,
      max: 12,
      decimals: 1,
      description: 'Research proxy: inflation share statistically accompanied by real GDP and GDP-per-capita growth.'
    },
    {
      key: 'retention_drag',
      label: 'Retention drag',
      short: 'Drag',
      unit: '%',
      source: 'derived',
      min: 0,
      max: 18,
      decimals: 1,
      description: 'Research proxy: residual inflation weighted by debt-service, government-expense, and weak-growth pressures.'
    },
    {
      key: 'dynamics',
      label: 'Dynamics',
      short: '40y dynamics',
      unit: 'cluster',
      mode: 'dynamics',
      decimals: 0,
      description: '40-year live-feed layer: yearly DREAM/S2 proxy clusters plus inferred regional retention-pressure-gradient arcs. Arcs are hypotheses, not measured bilateral flows.'
    },
    {
      key: 'pressure_score',
      label: 'S2 pressure',
      short: 'S2',
      unit: '/100',
      source: 'derived',
      min: 0,
      max: 100,
      decimals: 0,
      description: 'Composite DREAM/S2 retention-pressure score. The Official/Cleaned toggle changes whether this uses direct official-series inputs or the measurement-robust cleaned proxy inputs.'
    },
    {
      key: 'symbolic_inflation',
      label: 'Symbolic / noise',
      short: 'Noise',
      unit: '%',
      source: 'derived',
      min: 0,
      max: 14,
      decimals: 1,
      description: 'Research proxy: residual inflation weighted by broad-money and private-credit financialization signals.'
    },
    {
      key: 'dust_index',
      label: 'Dust index',
      short: 'Dust',
      unit: '/100',
      source: 'derived',
      min: 0,
      max: 100,
      decimals: 0,
      description: 'Maintenance/overhead proxy using debt-service, financialization, government expense, unemployment, and negative growth pressure.'
    },
    {
      key: 'coherence_score',
      label: 'Coherence',
      short: 'Coherence',
      unit: '/100',
      source: 'derived',
      min: 0,
      max: 100,
      decimals: 0,
      invert: false,
      description: 'Stability proxy: higher means lower inflation deviation, debt pressure, labor slack, and financialization pressure.'
    },
    {
      key: 'financialization_score',
      label: 'Finance field',
      short: 'Finance',
      unit: '/100',
      source: 'derived',
      min: 0,
      max: 100,
      decimals: 0,
      description: 'Financialization proxy from broad money/GDP and domestic private credit/GDP where live-source coverage exists.'
    },
    {
      key: 'debt_pressure_score',
      label: 'Debt pressure',
      short: 'Debt',
      unit: '/100',
      source: 'derived',
      min: 0,
      max: 100,
      decimals: 0,
      description: 'Debt-service pressure proxy from total debt service as a share of exports where the live source has coverage.'
    }
  ];

  const state = {
    data: null,
    countryByIso3: new Map(),
    countryByNumeric: new Map(),
    selectedLayer: LAYERS.find(layer => layer.key === 'dynamics') || LAYERS[0],
    selectedCountry: null,
    geoLayer: null,
    geoFeatures: null,
    featureByMapName: new Map(),
    countryByMapName: new Map(),
    chart: null,
    map: null,
    region: 'all',
    search: '',
    dynamicYear: null,
    dynamicsTimer: null,
    dynamicSpeed: 1,
    dataMode: 'official',
    flowsVisible: false,
    styleFrame: null,
    lastFlowKey: null,
    svg: null,
    viewport: null,
    countryLayer: null,
    flowLayer: null,
    sphereLayer: null,
    tooltip: null,
    projection: null,
    geoPath: null,
    featureCollection: null,
    zoomBehavior: null
  };

  const els = {
    status: document.getElementById('feedStatus'),
    meta: document.getElementById('feedMeta'),
    tabs: document.getElementById('layerTabs'),
    region: document.getElementById('regionFilter'),
    search: document.getElementById('countrySearch'),
    dataModeToggle: document.getElementById('dataModeToggle'),
    downloadData: document.getElementById('downloadData'),
    map: document.getElementById('map'),
    mapMessage: document.getElementById('mapMessage'),
    legendTitle: document.getElementById('legendTitle'),
    legendRamp: document.getElementById('legendRamp'),
    legendTicks: document.getElementById('legendTicks'),
    countryTitle: document.getElementById('countryTitle'),
    countrySubtitle: document.getElementById('countrySubtitle'),
    countryMetrics: document.getElementById('countryMetrics'),
    layerTitle: document.getElementById('layerTitle'),
    layerDescription: document.getElementById('layerDescription'),
    layerValue: document.getElementById('layerValue'),
    sparkline: document.getElementById('sparkline'),
    auditTrail: document.getElementById('auditTrail'),
    dynamicsPanel: document.getElementById('dynamicsPanel'),
    yearSlider: document.getElementById('yearSlider'),
    yearLabel: document.getElementById('yearLabel'),
    playButton: document.getElementById('playDynamics'),
    speedSelect: document.getElementById('speedSelect'),
    flowToggle: document.getElementById('flowToggle'),
    narrationText: document.getElementById('narrationText'),
    dynamicsNote: document.getElementById('dynamicsNote')
  };

  function setStatus(text, mode = 'loading', detail = '') {
    const spinner = mode === 'loading' ? '<span class="tiny-spinner" aria-hidden="true"></span>' : '';
    const badge = mode === 'ok' ? '●' : mode === 'warn' ? '▲' : mode === 'error' ? '×' : '';
    els.status.innerHTML = `${spinner}<span class="status-${mode}">${badge ? `${badge} ` : ''}${escapeHtml(text)}</span>`;
    if (detail) els.meta.textContent = detail;
  }

  function showMapMessage(message) {
    els.mapMessage.textContent = message;
    els.mapMessage.classList.remove('hidden');
  }

  function hideMapMessage() {
    els.mapMessage.classList.add('hidden');
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>'"]/g, char => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[char]));
  }

  function isDynamicsLayer(layer = state.selectedLayer) {
    return layer.mode === 'dynamics';
  }

  function isCleanMode() {
    return state.dataMode === 'cleaned';
  }

  function activeValues(country) {
    if (!country) return null;
    return isCleanMode() ? (country.cleaned?.values || country.values) : country.values;
  }

  function activeDerived(country) {
    if (!country) return null;
    return isCleanMode() ? (country.cleaned?.derived || country.derived) : country.derived;
  }

  function rowValue(row, key) {
    if (!row) return null;
    return isCleanMode() ? (row[`clean_${key}`] ?? row[key]) : row[key];
  }

  function rowCluster(row) {
    if (!row) return 'low_signal';
    return isCleanMode() ? (row.clean_cluster || row.cluster || 'low_signal') : (row.cluster || 'low_signal');
  }

  function rowClusterLabel(row) {
    const key = rowCluster(row);
    return isCleanMode() ? (row?.clean_cluster_label || clusterLabel(key)) : (row?.cluster_label || clusterLabel(key));
  }

  function activeRollupsByYear() {
    if (!state.data?.dynamics) return {};
    return isCleanMode()
      ? (state.data.dynamics.region_rollups_by_year_cleaned || state.data.dynamics.region_rollups_by_year || {})
      : (state.data.dynamics.region_rollups_by_year || {});
  }

  function activeFlowsByYear() {
    if (!state.data?.dynamics) return {};
    return isCleanMode()
      ? (state.data.dynamics.flows_by_year_cleaned || state.data.dynamics.flows_by_year || {})
      : (state.data.dynamics.flows_by_year || {});
  }

  function signalLabel() {
    return isCleanMode() ? 'Cleaned signal' : 'Official signal';
  }

  function availableYears() {
    return state.data?.dynamics?.available_years || [];
  }

  function clusterLabel(key) {
    return state.data?.cluster_labels?.[key] || key || 'n/a';
  }

  function formatValue(value, layer = state.selectedLayer) {
    if (isDynamicsLayer(layer)) return value || 'n/a';
    if (value === null || value === undefined || Number.isNaN(Number(value))) return 'n/a';
    return `${Number(value).toFixed(layer.decimals)}${layer.unit === '%' ? '%' : ` ${layer.unit}`}`;
  }

  function historyRowForYear(country, year = state.dynamicYear) {
    if (!country || !Array.isArray(country.history)) return null;
    return country.history.find(row => Number(row.year) === Number(year)) || null;
  }

  function metric(country, layer) {
    if (!country) return null;
    if (isDynamicsLayer(layer)) {
      const row = historyRowForYear(country);
      return row ? row.cluster_label || clusterLabel(row.cluster) : null;
    }
    const bucket = layer.source === 'derived' ? activeDerived(country) : activeValues(country);
    return bucket ? bucket[layer.key] : null;
  }

  function dynamicPressure(country) {
    const row = historyRowForYear(country);
    return rowValue(row, 'pressure_score');
  }

  function dynamicCluster(country) {
    const row = historyRowForYear(country);
    return rowCluster(row);
  }

  function clamp01(value) {
    return Math.max(0, Math.min(1, value));
  }

  function valueRatio(value, layer) {
    if (value === null || value === undefined || Number.isNaN(Number(value))) return null;
    return clamp01((Number(value) - layer.min) / (layer.max - layer.min));
  }

  function lerp(a, b, t) {
    return Math.round(a + (b - a) * t);
  }

  function hexToRgb(hex) {
    const clean = hex.replace('#', '');
    return [parseInt(clean.slice(0, 2), 16), parseInt(clean.slice(2, 4), 16), parseInt(clean.slice(4, 6), 16)];
  }

  function rgbToHex(rgb) {
    return `#${rgb.map(v => v.toString(16).padStart(2, '0')).join('')}`;
  }

  function mix(c1, c2, t) {
    const a = hexToRgb(c1);
    const b = hexToRgb(c2);
    return rgbToHex([lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]);
  }

  function colorFor(value, layer) {
    const ratio = valueRatio(value, layer);
    if (ratio === null) return '#192632';
    const r = layer.invert ? 1 - ratio : ratio;
    if (r < 0.25) return mix('#22344a', '#2f87ff', r / 0.25);
    if (r < 0.5) return mix('#2f87ff', '#74e1ff', (r - 0.25) / 0.25);
    if (r < 0.75) return mix('#74e1ff', '#ffd36e', (r - 0.5) / 0.25);
    return mix('#ffd36e', '#ff7f6e', (r - 0.75) / 0.25);
  }

  function featureIso3(feature) {
    const props = feature.properties || {};
    return props.ISO_A3 || props.ADM0_A3 || props.SOV_A3 || props.iso_a3 || props.name;
  }

  function featureNumeric(feature) {
    if (feature.id !== undefined && feature.id !== null) return String(feature.id).padStart(3, '0');
    const props = feature.properties || {};
    const raw = props.ISO_N3 || props.iso_n3 || props.ADM0_A3_IS || props.WB_A3;
    return raw ? String(raw).padStart(3, '0') : null;
  }

  function countryForFeature(feature) {
    const iso3 = featureIso3(feature);
    const numeric = featureNumeric(feature);
    return state.countryByIso3.get(iso3) || state.countryByNumeric.get(numeric) || null;
  }

  function countryMatchesFilters(country) {
    if (!country) return false;
    if (state.region !== 'all' && country.region !== state.region) return false;
    if (state.search) {
      const q = state.search.toLowerCase();
      const hay = `${country.name} ${country.iso3} ${country.iso2 || ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  }

  function countryStyle(feature) {
    const country = countryForFeature(feature);
    const hasMatch = countryMatchesFilters(country);

    if (isDynamicsLayer()) {
      const row = hasMatch ? historyRowForYear(country) : null;
      const cluster = rowCluster(row);
      const color = row ? CLUSTER_COLORS[cluster] || CLUSTER_COLORS.low_signal : '#192632';
      return {
        color: hasMatch ? 'rgba(255,255,255,0.76)' : 'rgba(255,255,255,0.12)',
        weight: hasMatch ? 0.75 : 0.25,
        opacity: hasMatch ? 0.82 : 0.25,
        fillColor: color,
        fillOpacity: row ? 0.78 : 0.08
      };
    }

    const value = hasMatch ? metric(country, state.selectedLayer) : null;
    return {
      color: hasMatch ? 'rgba(255,255,255,0.72)' : 'rgba(255,255,255,0.12)',
      weight: hasMatch ? 0.65 : 0.25,
      opacity: hasMatch ? 0.75 : 0.25,
      fillColor: colorFor(value, state.selectedLayer),
      fillOpacity: hasMatch && value !== null && value !== undefined ? 0.78 : 0.08
    };
  }

  function tooltipHtml(country, feature) {
    const name = country?.name || (feature.properties && (feature.properties.name || feature.properties.ADMIN)) || 'Unmatched geography';
    if (!country) {
      return `<strong>${escapeHtml(name)}</strong><br/>No live World Bank country match.`;
    }
    if (isDynamicsLayer()) {
      const row = historyRowForYear(country);
      if (!row) {
        return `<strong>${escapeHtml(country.name)}</strong><br/>No live dynamic record for ${escapeHtml(state.dynamicYear || 'selected year')}.`;
      }
      return [
        `<strong>${escapeHtml(country.name)}</strong>`,
        `Year: <b>${escapeHtml(row.year)}</b>`,
        `Signal: <b>${escapeHtml(signalLabel())}</b>`,
        `Cluster: <b>${escapeHtml(rowClusterLabel(row))}</b>`,
        `Pressure: <b>${escapeHtml(rowValue(row, 'pressure_score') ?? 'n/a')}</b>/100`,
        `Δ pressure: <b>${escapeHtml(rowValue(row, 'pressure_delta') ?? 'n/a')}</b>`
      ].join('<br/>');
    }
    const value = metric(country, state.selectedLayer);
    return [
      `<strong>${escapeHtml(country.name)}</strong>`,
      `${escapeHtml(state.selectedLayer.label)}: <b>${escapeHtml(formatValue(value))}</b>`,
      `Year: ${escapeHtml(country.latest_source_year || 'n/a')}`,
      `Confidence: ${Math.round((country.quality?.confidence || 0) * 100)}%`
    ].join('<br/>');
  }

  function setSelectedCountry(country) {
    state.selectedCountry = country;
    renderInspector();
  }

  function prepareFeatureCollection(features) {
    state.countryByMapName.clear();
    state.featureByMapName.clear();
    const prepared = features.map((feature, index) => {
      const country = countryForFeature(feature);
      const mapName = country?.iso3 || `unmatched-${feature.id ?? index}`;
      feature.properties = {
        ...(feature.properties || {}),
        original_name: feature.properties?.name || feature.properties?.ADMIN || mapName,
        display_name: country?.name || feature.properties?.name || feature.properties?.ADMIN || mapName,
        name: mapName
      };
      state.featureByMapName.set(mapName, feature);
      if (country) state.countryByMapName.set(mapName, country);
      return feature;
    });
    return { type: 'FeatureCollection', features: prepared };
  }

  function mapSize() {
    const rect = els.map.getBoundingClientRect();
    return {
      width: Math.max(420, rect.width || 900),
      height: Math.max(300, rect.height || 600)
    };
  }

  function resizeProjection() {
    if (!state.svg || !state.projection || !state.geoPath || !state.featureCollection) return;
    const { width, height } = mapSize();
    state.svg.attr('viewBox', `0 0 ${width} ${height}`);
    state.projection.fitExtent([[18, 18], [width - 18, height - 18]], state.featureCollection);
    state.sphereLayer.attr('d', state.geoPath({ type: 'Sphere' }));
  }

  function pointerPosition(event) {
    const rect = els.map.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function showTooltip(event, html) {
    if (!state.tooltip) return;
    const { x, y } = pointerPosition(event);
    state.tooltip
      .html(html)
      .classed('hidden', false)
      .style('left', `${Math.min(x + 14, els.map.clientWidth - 270)}px`)
      .style('top', `${Math.max(12, y + 14)}px`);
  }

  function hideTooltip() {
    if (state.tooltip) state.tooltip.classed('hidden', true);
  }

  function stylePath(selection) {
    selection
      .attr('d', state.geoPath)
      .style('fill', feature => countryStyle(feature).fillColor)
      .style('fill-opacity', feature => countryStyle(feature).fillOpacity)
      .style('stroke', feature => countryStyle(feature).color)
      .style('stroke-width', feature => countryStyle(feature).weight)
      .style('stroke-opacity', feature => countryStyle(feature).opacity);
  }

  function safeProjectedPoint(lon, lat) {
    const p = state.projection([Number(lon), Number(lat)]);
    if (!p || !Number.isFinite(p[0]) || !Number.isFinite(p[1])) return null;
    return p;
  }

  function flowPath(flow) {
    if (!state.projection) return null;
    const lon0 = Number(flow.from_longitude);
    const lat0 = Number(flow.from_latitude);
    const lon1 = Number(flow.to_longitude);
    const lat1 = Number(flow.to_latitude);
    if (![lon0, lat0, lon1, lat1].every(Number.isFinite)) return null;

    // The stripe bug was caused by long geodesic/wrapped lines being drawn across the projection.
    // For this PoC we skip long jumps instead of trying to imply measured bilateral flows.
    const lonDelta = Math.abs(lon1 - lon0);
    if (lonDelta > 95) return null;

    const p0 = safeProjectedPoint(lon0, lat0);
    const p1 = safeProjectedPoint(lon1, lat1);
    if (!p0 || !p1) return null;

    const dx = p1[0] - p0[0];
    const dy = p1[1] - p0[1];
    const distance = Math.hypot(dx, dy);
    if (!Number.isFinite(distance) || distance < 6 || distance > Math.max(els.map.clientWidth, els.map.clientHeight) * 0.55) return null;

    const bend = Math.min(42, Math.max(10, distance * 0.18));
    const nx = -dy / Math.max(distance, 1);
    const ny = dx / Math.max(distance, 1);
    const cx = (p0[0] + p1[0]) / 2 + nx * bend;
    const cy = (p0[1] + p1[1]) / 2 + ny * bend;
    return `M${p0[0].toFixed(1)},${p0[1].toFixed(1)} Q${cx.toFixed(1)},${cy.toFixed(1)} ${p1[0].toFixed(1)},${p1[1].toFixed(1)}`;
  }

  function currentFlowData() {
    if (!isDynamicsLayer() || !state.flowsVisible) return [];
    const flows = activeFlowsByYear()[String(state.dynamicYear)] || [];
    return flows.map(flow => ({ flow, path: flowPath(flow) })).filter(d => d.path);
  }

  function renderFlowLayer() {
    if (!state.flowLayer) return;
    const data = currentFlowData();
    state.flowLayer.selectAll('path.flow-line')
      .data(data, d => `${d.flow.from_region || 'from'}-${d.flow.to_region || 'to'}-${d.flow.strength || 0}`)
      .join(
        enter => enter.append('path')
          .attr('class', 'flow-line')
          .on('mousemove', (event, d) => showTooltip(event, flowTooltip(d.flow)))
          .on('mouseleave', hideTooltip),
        update => update,
        exit => exit.remove()
      )
      .attr('d', d => d.path)
      .style('stroke-width', d => Math.max(0.7, Math.min(2.0, Number(d.flow.strength || 0) / 42)))
      .style('opacity', d => Math.max(0.10, Math.min(0.28, Number(d.flow.strength || 0) / 230)));
  }

  function refreshMapStyles(options = {}) {
    if (!state.svg || !state.geoFeatures || !state.geoPath) return;
    if (state.styleFrame) window.cancelAnimationFrame(state.styleFrame);
    state.styleFrame = window.requestAnimationFrame(() => {
      state.styleFrame = null;
      resizeProjection();
      const paths = state.countryLayer.selectAll('path.country-shape')
        .data(state.geoFeatures, feature => feature.properties.name);

      const merged = paths.join(
        enter => enter.append('path')
          .attr('class', 'country-shape')
          .on('mousemove', (event, feature) => {
            const country = countryForFeature(feature);
            if (country) setSelectedCountry(country);
            const style = countryStyle(feature);
            state.countryLayer.selectAll('path.country-shape.hovered').classed('hovered', false);
            d3.select(event.currentTarget)
              .classed('hovered', true)
              .style('fill', style.fillColor)
              .style('fill-opacity', Math.min(0.95, (style.fillOpacity || 0.75) + 0.12))
              .style('stroke', '#ffd36e')
              .style('stroke-width', 1.4)
              .style('stroke-opacity', 0.95);
            showTooltip(event, tooltipHtml(country, feature));
          })
          .on('mouseleave', (event, feature) => {
            const style = countryStyle(feature);
            d3.select(event.currentTarget)
              .classed('hovered', false)
              .style('fill', style.fillColor)
              .style('fill-opacity', style.fillOpacity)
              .style('stroke', style.color)
              .style('stroke-width', style.weight)
              .style('stroke-opacity', style.opacity);
            hideTooltip();
          })
          .on('click', (event, feature) => {
            const country = countryForFeature(feature);
            if (country) setSelectedCountry(country);
          }),
        update => update,
        exit => exit.remove()
      );
      stylePath(merged);
      renderFlowLayer();
    });
  }

  function renderFlows() {
    refreshMapStyles({ skipTooltip: true });
  }

  function renderTabs() {
    els.tabs.innerHTML = '';
    LAYERS.forEach(layer => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `layer-tab ${layer.key === state.selectedLayer.key ? 'active' : ''}`;
      button.textContent = layer.label;
      button.addEventListener('click', () => {
        state.selectedLayer = layer;
        renderTabs();
        renderLegend();
        renderDynamicsControls();
        state.lastFlowKey = null;
        refreshMapStyles();
        renderInspector();
      });
      els.tabs.appendChild(button);
    });
  }

  function renderLegend() {
    const layer = state.selectedLayer;
    if (isDynamicsLayer(layer)) {
      els.legendTitle.textContent = `${signalLabel()} dynamics clusters (${state.dynamicYear || 'year'})`;
      els.legendRamp.className = 'cluster-legend';
      const labels = state.data?.cluster_labels || {};
      els.legendRamp.innerHTML = Object.entries(CLUSTER_COLORS).map(([key, color]) => `
        <div class="cluster-chip"><span style="background:${color}"></span>${escapeHtml(labels[key] || key)}</div>
      `).join('');
      els.legendTicks.innerHTML = '<span>low signal</span><span>mixed</span><span>shock</span>';
      return;
    }
    els.legendTitle.textContent = `${layer.label} (${layer.unit}) · ${signalLabel()}`;
    els.legendRamp.className = 'legend-ramp';
    els.legendRamp.innerHTML = '';
    els.legendTicks.innerHTML = `
      <span>${formatTick(layer.min, layer)}</span>
      <span>${formatTick((layer.min + layer.max) / 2, layer)}</span>
      <span>${formatTick(layer.max, layer)}</span>
    `;
  }

  function formatTick(value, layer) {
    const decimals = layer.decimals === 0 ? 0 : 1;
    return `${Number(value).toFixed(decimals)}${layer.unit === '%' ? '%' : ''}`;
  }

  function renderRegionFilter() {
    const regions = [...new Set(state.data.countries.map(c => c.region).filter(Boolean))].sort();
    for (const region of regions) {
      const option = document.createElement('option');
      option.value = region;
      option.textContent = region;
      els.region.appendChild(option);
    }
    els.region.addEventListener('change', () => {
      state.region = els.region.value;
      refreshMapStyles();
    });
    els.search.addEventListener('input', () => {
      state.search = els.search.value.trim();
      refreshMapStyles();
    });
    if (els.dataModeToggle) {
      els.dataModeToggle.value = state.dataMode;
      els.dataModeToggle.addEventListener('change', () => {
        state.dataMode = els.dataModeToggle.value === 'cleaned' ? 'cleaned' : 'official';
        state.lastFlowKey = null;
        renderTabs();
        renderLegend();
        renderDynamicsControls();
        refreshMapStyles();
        renderInspector();
      });
    }
    if (els.downloadData) {
      els.downloadData.addEventListener('click', downloadAnalysisJson);
    }
  }


  function slugPart(value) {
    return String(value || 'all').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'all';
  }

  function triggerJsonDownload(filename, payload) {
    const json = JSON.stringify(payload, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function downloadAnalysisJson() {
    if (!state.data) {
      showMapMessage('No live-feed JSON is loaded yet. Run the refresh workflow or wait for the page to finish loading.');
      return;
    }

    const button = els.downloadData;
    const previousText = button ? button.textContent : '';
    if (button) {
      button.disabled = true;
      button.textContent = 'Preparing...';
    }

    let sourceAudit = null;
    let sourceAuditError = null;
    try {
      sourceAudit = await loadJson(AUDIT_URL, 'Source audit');
    } catch (error) {
      sourceAuditError = error.message;
    }

    const selectedCountry = state.selectedCountry ? {
      name: state.selectedCountry.name,
      iso3: state.selectedCountry.iso3,
      region: state.selectedCountry.region,
      latest_source_year: state.selectedCountry.latest_source_year
    } : null;

    const bundle = {
      export_type: 'dream_economic_retention_analysis_bundle',
      export_version: 'v0.8-d3-svg-map-download-json',
      exported_at_utc: new Date().toISOString(),
      app_url: window.location.href,
      data_url: DATA_URL,
      source_audit_url: AUDIT_URL,
      selected_view: {
        signal_mode: state.dataMode,
        layer_key: state.selectedLayer?.key || null,
        layer_label: state.selectedLayer?.label || null,
        dynamic_year: state.dynamicYear,
        region_filter: state.region,
        search_filter: state.search,
        flows_visible: state.flowsVisible,
        selected_country: selectedCountry
      },
      analysis_notes: [
        'This bundle contains the live econ_latest.json payload loaded by the app.',
        'Official and cleaned fields are both included when emitted by the ETL.',
        'Inferred flow arcs are pressure-gradient hypotheses, not measured bilateral trade or capital flows.',
        'Use source_audit to verify indicator coverage, formula version, and feed freshness.'
      ],
      econ_latest: state.data,
      source_audit: sourceAudit,
      source_audit_error: sourceAuditError
    };

    const generated = slugPart(state.data.generated_at_utc || new Date().toISOString().slice(0, 10));
    const mode = slugPart(state.dataMode);
    const layer = slugPart(state.selectedLayer?.key || 'layer');
    const filename = `dream-economic-retention-${mode}-${layer}-${generated}.json`;
    triggerJsonDownload(filename, bundle);

    if (button) {
      button.textContent = previousText;
      button.disabled = false;
    }
  }

  function renderDynamicsControls() {
    if (!els.dynamicsPanel) return;
    const years = availableYears();
    if (!isDynamicsLayer()) {
      els.dynamicsPanel.classList.add('hidden');
      stopDynamicsPlayback();
      state.lastFlowKey = null;
      renderFlows();
      return;
    }

    els.dynamicsPanel.classList.remove('hidden');
    if (!years.length) {
      els.yearLabel.textContent = 'no dynamic years';
      els.yearSlider.disabled = true;
      els.playButton.disabled = true;
      if (els.speedSelect) els.speedSelect.disabled = true;
      if (els.narrationText) els.narrationText.textContent = 'No dynamic movie notes are available until the live 40-year feed has usable observations.';
      return;
    }

    if (!state.dynamicYear) state.dynamicYear = state.data.dynamics?.default_year || years[years.length - 1];
    els.yearSlider.min = String(Math.min(...years));
    els.yearSlider.max = String(Math.max(...years));
    els.yearSlider.step = '1';
    els.yearSlider.value = String(state.dynamicYear);
    els.yearSlider.disabled = false;
    els.playButton.disabled = false;
    if (els.speedSelect) {
      els.speedSelect.disabled = false;
      els.speedSelect.value = String(state.dynamicSpeed);
    }
    els.yearLabel.textContent = String(state.dynamicYear);
    els.dynamicsNote.textContent = state.data.dynamics?.flow_interpretation || 'Inferred pressure gradients from historical live-source indicators.';
    updateNarration();
  }

  function setDynamicYear(year) {
    const years = availableYears();
    if (!years.length) return;
    const minYear = Math.min(...years);
    const maxYear = Math.max(...years);
    const bounded = Math.max(minYear, Math.min(maxYear, Number(year)));
    const nextYear = years.includes(bounded) ? bounded : nearestYear(bounded, years);
    if (Number(state.dynamicYear) === Number(nextYear)) return;
    state.dynamicYear = nextYear;
    if (els.yearSlider) els.yearSlider.value = String(state.dynamicYear);
    if (els.yearLabel) els.yearLabel.textContent = String(state.dynamicYear);
    renderLegend();
    refreshMapStyles({ skipTooltip: true });
    renderInspector();
    updateNarration();
  }

  function nearestYear(year, years) {
    return years.reduce((best, candidate) => Math.abs(candidate - year) < Math.abs(best - year) ? candidate : best, years[0]);
  }

  function stopDynamicsPlayback() {
    if (state.dynamicsTimer) {
      window.clearInterval(state.dynamicsTimer);
      state.dynamicsTimer = null;
    }
    if (els.playButton) els.playButton.textContent = '▶';
  }

  function playbackIntervalMs() {
    const speed = Number(state.dynamicSpeed) || 1;
    const table = { 0.5: 1800, 1: 1200, 2: 650, 4: 350 };
    return table[speed] || Math.max(180, Math.round(900 / speed));
  }

  function startDynamicsPlayback() {
    const years = availableYears();
    if (!years.length) return;
    stopDynamicsPlayback();
    if (els.playButton) els.playButton.textContent = '❚❚';
    updateNarration();
    state.dynamicsTimer = window.setInterval(() => {
      const idx = years.indexOf(state.dynamicYear);
      const next = idx >= 0 && idx < years.length - 1 ? years[idx + 1] : years[0];
      setDynamicYear(next);
    }, playbackIntervalMs());
  }

  function toggleDynamicsPlayback() {
    if (state.dynamicsTimer) {
      stopDynamicsPlayback();
      return;
    }
    startDynamicsPlayback();
  }

  function updateNarration() {
    if (!els.narrationText || !isDynamicsLayer()) return;
    els.narrationText.textContent = buildDynamicNarration();
  }

  function buildDynamicNarration() {
    const years = availableYears();
    const year = Number(state.dynamicYear);
    if (!years.length || !year) return 'No dynamic movie notes are available until the live 40-year feed has usable observations.';

    const rollups = activeRollupsByYear()[String(year)] || {};
    const entries = Object.values(rollups).filter(row => row && row.pressure_score !== null && row.pressure_score !== undefined);
    if (!entries.length) return `${year}: live-source coverage is too sparse to narrate a global retention state.`;

    const ranked = entries.slice().sort((a, b) => Number(b.pressure_score || 0) - Number(a.pressure_score || 0));
    const top = ranked[0];
    const calm = ranked[ranked.length - 1];
    const flows = activeFlowsByYear()[String(year)] || [];
    const topFlow = flows[0];
    const prevYear = years.filter(candidate => candidate < year).pop();
    let trend = '';
    if (prevYear) {
      const prevEntries = Object.values(activeRollupsByYear()[String(prevYear)] || {}).filter(row => row && row.pressure_score !== null && row.pressure_score !== undefined);
      const currentAvg = average(entries.map(row => row.pressure_score));
      const prevAvg = average(prevEntries.map(row => row.pressure_score));
      if (currentAvg !== null && prevAvg !== null) {
        const delta = currentAvg - prevAvg;
        const direction = delta > 0.4 ? 'rising' : delta < -0.4 ? 'cooling' : 'mostly stable';
        trend = ` Global average retention pressure is ${direction} versus ${prevYear}, by ${Math.abs(delta).toFixed(1)} points.`;
      }
    }

    const cluster = clusterLabel(top.dominant_cluster || 'low_signal').toLowerCase();
    const calmName = calm && calm.region !== top.region ? ` The calmest regional field is ${calm.region}, near ${Number(calm.pressure_score || 0).toFixed(0)}.` : '';
    const flowText = topFlow ? ` The strongest inferred pressure-gradient arc runs from ${topFlow.from_region} toward ${topFlow.to_region}, strength ${Number(topFlow.strength || 0).toFixed(0)}.` : ' No strong regional pressure-gradient arc is visible this year.';
    return `${year} (${signalLabel()}): ${top.region} carries the strongest retention pressure, near ${Number(top.pressure_score || 0).toFixed(0)}, with a ${cluster} signature.${calmName}${flowText}${trend} Arcs are inferred gradients, not measured trade or capital flows.`;
  }

  function average(values) {
    const nums = values.map(Number).filter(Number.isFinite);
    if (!nums.length) return null;
    return nums.reduce((sum, value) => sum + value, 0) / nums.length;
  }

  function splitAntiMeridian(from, to) {
    const [lat1, lon1] = from;
    const [lat2, lon2] = to;
    if (Math.abs(lon2 - lon1) <= 180) return [[from, to]];
    const adjustedLon2 = lon2 > lon1 ? lon2 - 360 : lon2 + 360;
    const boundary = lon1 > adjustedLon2 ? -180 : 180;
    const t = (boundary - lon1) / (adjustedLon2 - lon1);
    const midLat = lat1 + (lat2 - lat1) * t;
    const opposite = boundary === 180 ? -180 : 180;
    return [
      [[lat1, lon1], [midLat, boundary]],
      [[midLat, opposite], [lat2, lon2]]
    ];
  }

  function flowTooltip(flow) {
    return [
      `<strong>Inferred pressure-gradient arc</strong>`,
      `${escapeHtml(flow.from_region)} → ${escapeHtml(flow.to_region)}`,
      `Strength: <b>${escapeHtml(flow.strength ?? 'n/a')}</b>`,
      `Δ source: ${escapeHtml(flow.from_delta ?? 'n/a')} · Δ sink: ${escapeHtml(flow.to_delta ?? 'n/a')}`,
      `<span class="muted">Not measured trade/capital flow.</span>`
    ].join('<br/>');
  }

  function renderInspector() {
    const country = state.selectedCountry;
    const layer = state.selectedLayer;
    els.layerTitle.innerHTML = `${escapeHtml(layer.label)} <span class="signal-mode-badge">${escapeHtml(signalLabel())}</span>`;
    els.layerDescription.textContent = layer.description;

    if (!country) {
      els.countryTitle.textContent = 'No country selected';
      els.countrySubtitle.textContent = isDynamicsLayer() ? 'Move over the map to inspect the selected year.' : 'Move over the map after the live feed loads.';
      els.countryMetrics.innerHTML = '';
      els.layerValue.textContent = '--';
      els.sparkline.textContent = 'No country selected.';
      els.auditTrail.textContent = isDynamicsLayer() ? 'Select a country to inspect its 40-year retention state path.' : 'Select a country to inspect live-source inputs.';
      return;
    }

    els.countryTitle.textContent = country.name;
    els.countrySubtitle.innerHTML = `${escapeHtml(country.iso3)} · ${escapeHtml(country.region || 'region n/a')} · ${escapeHtml(country.income || 'income n/a')} <span class="quality-pill">confidence ${Math.round((country.quality?.confidence || 0) * 100)}%</span>`;

    if (isDynamicsLayer()) {
      const row = historyRowForYear(country);
      els.layerValue.textContent = row ? rowClusterLabel(row) : 'n/a';
      els.countryMetrics.innerHTML = dynamicMetricCards(country, row);
      renderDynamicSparkline(country);
      renderDynamicAudit(country, row);
      return;
    }

    const value = metric(country, layer);
    els.layerValue.textContent = formatValue(value, layer);
    els.countryMetrics.innerHTML = metricCards(country);
    renderSparkline(country);
    renderAudit(country);
  }

  function metricCards(country) {
    const values = activeValues(country) || {};
    const derived = activeDerived(country) || {};
    const rows = [
      [isCleanMode() ? 'Cleaned price pressure' : 'CPI inflation', values.inflation, '%', 1],
      ['GDP growth', values.gdp_growth, '%', 1],
      ['GDP pc growth', values.gdp_pc_growth, '%', 1],
      ['GDP deflator', values.gdp_deflator_inflation, '%', 1],
      ['Money growth', values.broad_money_growth, '%', 1],
      ['S2 pressure', derived.pressure_score, '/100', 0],
      ['Stats divergence', derived.measurement_divergence_score, '/100', 0],
      ['Hidden labor slack', derived.hidden_labor_slack_score, '/100', 0],
      ['Finance field', derived.financialization_score, '/100', 0],
      ['Coherence', derived.coherence_score, '/100', 0]
    ];
    return rows.map(([label, value, unit, decimals]) => metricCard(label, value, unit, decimals)).join('');
  }

  function dynamicMetricCards(country, row) {
    if (!row) {
      return '<div class="metric wide"><div class="label">Dynamic record</div><div class="value">n/a</div></div>';
    }
    const rows = [
      ['Year', row.year, '', 0],
      ['Signal', signalLabel(), 'text', 0],
      ['Cluster', rowClusterLabel(row), 'text', 0],
      ['Pressure score', rowValue(row, 'pressure_score'), '/100', 0],
      ['Δ pressure', rowValue(row, 'pressure_delta'), 'pts', 1],
      [isCleanMode() ? 'Cleaned price pressure' : 'CPI inflation', rowValue(row, 'inflation'), '%', 1],
      ['Retention drag', rowValue(row, 'retention_drag'), '%', 1],
      ['Dust index', rowValue(row, 'dust_index'), '/100', 0],
      ['Stats divergence', rowValue(row, 'measurement_divergence_score'), '/100', 0],
      ['Coherence', rowValue(row, 'coherence_score'), '/100', 0]
    ];
    return rows.map(([label, value, unit, decimals]) => metricCard(label, value, unit, decimals)).join('');
  }

  function metricCard(label, value, unit, decimals) {
    let formatted;
    if (unit === 'text') {
      formatted = value || 'n/a';
    } else if (value === null || value === undefined || Number.isNaN(Number(value))) {
      formatted = 'n/a';
    } else {
      formatted = `${Number(value).toFixed(decimals)}${unit === '%' ? '%' : unit ? ` ${unit}` : ''}`;
    }
    return `<div class="metric"><div class="label">${escapeHtml(label)}</div><div class="value">${escapeHtml(formatted)}</div></div>`;
  }

  function renderSparkline(country) {
    const key = isCleanMode() ? 'clean_inflation' : 'inflation';
    const title = isCleanMode() ? 'Cleaned price-pressure %' : 'CPI inflation %';
    const history = Array.isArray(country.history) ? country.history.filter(d => d[key] !== null && d[key] !== undefined) : [];
    if (history.length < 2) {
      els.sparkline.textContent = 'Not enough live-source history for this country.';
      return;
    }
    renderLineChart(history, key, title, value => `${Number(value).toFixed(1)}%`);
  }

  function renderDynamicSparkline(country) {
    const key = isCleanMode() ? 'clean_pressure_score' : 'pressure_score';
    const history = Array.isArray(country.history) ? country.history.filter(d => d[key] !== null && d[key] !== undefined) : [];
    if (history.length < 2) {
      els.sparkline.textContent = 'Not enough live-source dynamic history for this country.';
      return;
    }
    renderLineChart(history, key, `${signalLabel()} retention pressure /100`, value => `${Number(value).toFixed(0)}/100`);
  }

  function renderLineChart(history, key, title, valueFormatter) {
    const width = 318;
    const height = 122;
    const pad = 22;
    const values = history.map(d => Number(d[key]));
    const min = Math.min(...values, 0);
    const max = Math.max(...values, 1);
    const x = i => pad + (i / Math.max(1, history.length - 1)) * (width - pad * 2);
    const y = v => height - pad - ((v - min) / Math.max(1e-9, max - min)) * (height - pad * 2);
    const points = history.map((d, i) => `${x(i).toFixed(1)},${y(Number(d[key])).toFixed(1)}`).join(' ');
    const latest = history[history.length - 1];
    const selected = history.find(row => Number(row.year) === Number(state.dynamicYear));
    const selectedDot = selected ? `<circle cx="${x(history.indexOf(selected)).toFixed(1)}" cy="${y(Number(selected[key])).toFixed(1)}" r="5" fill="#ff6478" />` : '';
    els.sparkline.innerHTML = `
      <svg class="sparkline-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(title)} history">
        <line x1="${pad}" y1="${y(0).toFixed(1)}" x2="${width - pad}" y2="${y(0).toFixed(1)}" stroke="rgba(255,255,255,0.22)" stroke-width="1" />
        <polyline points="${points}" fill="none" stroke="#74d7ff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
        <circle cx="${x(history.length - 1).toFixed(1)}" cy="${y(Number(latest[key])).toFixed(1)}" r="4" fill="#ffd36e" />
        ${selectedDot}
        <text x="${pad}" y="14" fill="#8fa5b4" font-size="10">${escapeHtml(title)}</text>
        <text x="${pad}" y="${height - 4}" fill="#8fa5b4" font-size="10">${escapeHtml(history[0].year)}</text>
        <text x="${width - pad - 34}" y="${height - 4}" fill="#8fa5b4" font-size="10">${escapeHtml(latest.year)}</text>
        <text x="${width - pad - 80}" y="16" fill="#e8f2f8" font-size="12">${escapeHtml(valueFormatter(latest[key]))}</text>
      </svg>
    `;
  }

  function renderAudit(country) {
    const q = country.quality || {};
    const missing = Array.isArray(q.missing_inputs) && q.missing_inputs.length ? q.missing_inputs.join(', ') : 'none';
    els.auditTrail.innerHTML = [
      `<div>Latest source year: <b>${escapeHtml(country.latest_source_year || 'n/a')}</b></div>`,
      `<div>Missing model inputs: ${escapeHtml(missing)}</div>`,
      `<div>Generated UTC: ${escapeHtml(state.data.generated_at_utc || 'n/a')}</div>`,
      `<div>Formula version: ${escapeHtml(state.data.formula_version || 'n/a')}</div>`,
      `<div>Signal mode: <b>${escapeHtml(signalLabel())}</b></div>`,
      `<div>Cleaned mode is a measurement-robust proxy; it does not truly reverse hedonics or national statistical methods.</div>`,
      `<div>Finance note: smoothed broad-money/private-credit depth; legacy hard-clipped field is not used for the visible Finance score.</div>`
    ].join('');
  }

  function renderDynamicAudit(country, row) {
    const note = state.data?.model_notes?.dynamics_layer || 'Dynamics layer uses historical live-source indicators.';
    els.auditTrail.innerHTML = [
      `<div>Selected year: <b>${escapeHtml(state.dynamicYear || 'n/a')}</b></div>`,
      `<div>Country-year inputs present: <b>${escapeHtml(row?.input_count ?? 'n/a')}</b> / 8 core inputs</div>`,
      `<div>Signal mode: <b>${escapeHtml(signalLabel())}</b></div>`,
      `<div>Cluster method: rule-based DREAM/S2 proxy state classification.</div>`,
      `<div>Flow warning: inferred pressure-gradient arcs, not observed bilateral flows.</div>`,
      `<div>${escapeHtml(note)}</div>`
    ].join('');
  }

  function initMap() {
    if (!window.d3 || !window.topojson) {
      throw new Error('D3 or topojson-client failed to load from the CDN. Check network/CDN access or vendor d3.min.js into the repo.');
    }

    els.map.innerHTML = '';
    state.svg = d3.select(els.map).append('svg').attr('class', 'd3-world-map');
    state.viewport = state.svg.append('g').attr('class', 'map-viewport');
    state.sphereLayer = state.viewport.append('path').attr('class', 'sphere-bg');
    state.countryLayer = state.viewport.append('g').attr('class', 'country-layer');
    state.flowLayer = state.viewport.append('g').attr('class', 'flow-layer');
    state.tooltip = d3.select(els.map).append('div').attr('class', 'map-tooltip hidden');
    state.projection = d3.geoNaturalEarth1();
    state.geoPath = d3.geoPath(state.projection);

    state.zoomBehavior = d3.zoom()
      .scaleExtent([0.9, 7])
      .on('zoom', event => {
        state.viewport.attr('transform', event.transform);
      });
    state.svg.call(state.zoomBehavior);
    state.svg.on('mouseleave', hideTooltip);
    window.addEventListener('resize', () => refreshMapStyles());
  }

  async function loadJson(url, label) {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`${label} fetch failed: HTTP ${response.status} ${response.statusText} (${url})`);
    }
    return response.json();
  }

  function validatePayload(payload) {
    if (!payload || !Array.isArray(payload.countries) || !payload.countries.length) {
      throw new Error('Live feed JSON loaded but contains no countries array. Run the refresh-data workflow and inspect scripts/fetch_worldbank.py output.');
    }
  }

  function indexCountries(payload) {
    state.data = payload;
    state.countryByIso3.clear();
    state.countryByNumeric.clear();
    for (const country of payload.countries) {
      if (country.iso3) state.countryByIso3.set(country.iso3, country);
      if (country.isoNumeric) state.countryByNumeric.set(String(country.isoNumeric).padStart(3, '0'), country);
    }
    const years = availableYears();
    state.dynamicYear = payload.dynamics?.default_year || (years.length ? years[years.length - 1] : null);
  }

  function bindDynamicsEvents() {
    if (!els.yearSlider) return;
    els.yearSlider.addEventListener('input', () => setDynamicYear(Number(els.yearSlider.value)));
    els.playButton.addEventListener('click', toggleDynamicsPlayback);
    if (els.speedSelect) {
      els.speedSelect.addEventListener('change', () => {
        state.dynamicSpeed = Number(els.speedSelect.value) || 1;
        if (state.dynamicsTimer) startDynamicsPlayback();
        updateNarration();
      });
    }
    els.flowToggle.addEventListener('change', () => {
      state.flowsVisible = els.flowToggle.checked;
      state.lastFlowKey = null;
      renderFlows();
    });
  }

  async function bootstrap() {
    renderTabs();
    renderLegend();
    initMap();
    bindDynamicsEvents();
    showMapMessage('Loading live feed and country boundaries...');

    try {
      const [payload, topology] = await Promise.all([
        loadJson(DATA_URL, 'Live economic feed'),
        loadJson(GEO_URL, 'Country boundaries')
      ]);
      validatePayload(payload);
      indexCountries(payload);

      const features = window.topojson.feature(topology, topology.objects.countries).features;
      const featureCollection = prepareFeatureCollection(features);
      state.geoFeatures = featureCollection.features;
      state.geoLayer = true;
      state.featureCollection = featureCollection;
      refreshMapStyles();

      renderRegionFilter();
      if (els.downloadData) els.downloadData.disabled = false;
      renderDynamicsControls();
      renderInspector();
      hideMapMessage();
      const countryCount = state.data.countries.length;
      const updated = state.data.generated_at_utc || 'unknown generation time';
      const years = availableYears();
      const yearText = years.length ? `; dynamics ${years[0]}-${years[years.length - 1]}` : '';
      setStatus(`live feed loaded: ${countryCount} countries`, 'ok', `Generated ${updated}; source last update ${state.data.source_lastupdated || 'n/a'}${yearText}.`);
    } catch (error) {
      console.error(error);
      setStatus('no live feed data rendered', 'error', error.message);
      showMapMessage(`No live feed data rendered. ${error.message}`);
    }
  }

  document.addEventListener('DOMContentLoaded', bootstrap);
})();
