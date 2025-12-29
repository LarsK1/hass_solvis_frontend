// Version: 0.1.1 — 2025-12-28
/*
  Solvis Control Card – lightweight Web Component that works as a
  Home Assistant Lovelace card. No build step required.
*/

const DEFAULT_CONFIG = {
  type: 'custom:solvis-card',
  title: 'Solvis',
  model: 'ben', // 'ben' | 'max' | 'auto'
  mode: 'both', // 'heating' | 'hot_water' | 'both'
  show_legend: false,
  features: {
    solar: true,
    heat_pump: true,
    hot_water: true,
    smart_grid: false,
    circuits: 2,
  },
  entities: {
    outdoor_temperature: '',
    hot_water_temperature: '',
    flow_rate: '',
    pump_speed: '',
    boiler_temperature: '',
    hot_water_priority: '',
    ww_target_temp: '',
    ww_current_temp: '',
    ww_flow_rate: '',
    ww_pump_speed: '',
    ww_buffer_temp: '',
    cw_temp: '',
    circulation_mode: '',
    circulation_temp: '',
    circulation_pump: '',
    burner_modulation: '',
    burner_status: '',
    buffer_top_temp: '',
    buffer_bottom_temp: '',
    hc_pump_status: '',
    hc2_pump_status: '',
    hc3_pump_status: '',
    storage_ref_temp: '',
  },
};

function deepMerge(target, src) {
  const out = { ...target };
  for (const [k, v] of Object.entries(src || {})) {
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      out[k] = deepMerge(target[k] || {}, v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

class SolvisCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._config = structuredClone(DEFAULT_CONFIG);
    this._state = {
      pumpOn: false,
      valveOpen: true,
      lastUpdated: new Date(),
    };
  }

  set hass(hass) {
    this._hass = hass;
    this._scheduleRender();
  }

  setConfig(config) {
    this._config = deepMerge(DEFAULT_CONFIG, config || {});
    this._scheduleRender();
  }

  static getStubConfig() {
    return DEFAULT_CONFIG;
  }

  static getConfigForm() {
    return {
      schema: [
        { name: 'title', selector: { text: {} } },
        {
          name: '',
          type: 'grid',
          schema: [
            {
              name: 'model',
              selector: {
                select: {
                  options: [
                    { value: 'auto', label: 'AUTO' },
                    { value: 'ben', label: 'BEN' },
                    { value: 'max', label: 'MAX' },
                  ],
                },
              },
            },
            {
              name: 'mode',
              selector: {
                select: {
                  options: [
                    { value: 'both', label: 'BOTH' },
                    { value: 'heating', label: 'HEATING' },
                    { value: 'hot_water', label: 'HOT_WATER' },
                  ],
                },
              },
            },
          ],
        },
        { name: 'show_legend', selector: { boolean: {} } },
        {
          name: 'features',
          type: 'expandable',
          title: 'Features',
          schema: [
            {
              name: '',
              type: 'grid',
              schema: [
                { name: 'solar', selector: { boolean: {} } },
                { name: 'heat_pump', selector: { boolean: {} } },
                { name: 'hot_water', selector: { boolean: {} } },
                { name: 'smart_grid', selector: { boolean: {} } },
              ],
            },
            { name: 'circuits', selector: { number: { min: 0, max: 3, mode: 'box' } } },
          ],
        },
        {
          name: 'entities',
          type: 'expandable',
          title: 'Entities',
          schema: [
            { name: 'outdoor_temperature', selector: { entity: {} } },
            { name: 'hot_water_temperature', selector: { entity: {} } },
            { name: 'flow_rate', selector: { entity: {} } },
            { name: 'pump_speed', selector: { entity: {} } },
            { name: 'boiler_temperature', selector: { entity: {} } },
            { name: 'hot_water_priority', selector: { entity: {} } },
            { name: 'ww_target_temp', selector: { entity: {} } },
            { name: 'ww_current_temp', selector: { entity: {} } },
            { name: 'ww_flow_rate', selector: { entity: {} } },
            { name: 'ww_pump_speed', selector: { entity: {} } },
            { name: 'ww_buffer_temp', selector: { entity: {} } },
            { name: 'cw_temp', selector: { entity: {} } },
            { name: 'circulation_mode', selector: { entity: {} } },
            { name: 'circulation_temp', selector: { entity: {} } },
            { name: 'circulation_pump', selector: { entity: {} } },
            { name: 'burner_modulation', selector: { entity: {} } },
            { name: 'burner_status', selector: { entity: {} } },
            { name: 'buffer_top_temp', selector: { entity: {} } },
            { name: 'buffer_bottom_temp', selector: { entity: {} } },
            { name: 'hc_pump_status', selector: { entity: {} } },
            { name: 'hc2_pump_status', selector: { entity: {} } },
            { name: 'hc3_pump_status', selector: { entity: {} } },
            { name: 'storage_ref_temp', selector: { entity: {} } },
          ],
        },
      ],
    };
  }

  getCardSize() {
    return 6;
  }

  _scheduleRender() {
    clearTimeout(this._rfid);
    this._rfid = setTimeout(() => this._render(), 0);
  }

  _readEntityValues() {
    const e = this._config.entities || {};
    const read = (id, fallback) =>
      this._hass && id && this._hass.states && this._hass.states[id]
        ? this._hass.states[id].state
        : fallback;
    return {
      outdoor: read(e.outdoor_temperature, '9.5'),
      hotWater: read(e.hot_water_temperature, '49.1'),
      flowRate: read(e.flow_rate, '10.7'),
      pumpSpeed: read(e.pump_speed, this._state.pumpOn ? '60' : '0'),
      boiler: read(e.boiler_temperature, '42.7'),
      wwPriority: read(e.hot_water_priority, 'Normal'),
      wwTarget: read(e.ww_target_temp, '50.0'),
      wwCurrent: read(e.ww_current_temp, read(e.hot_water_temperature, '48.5')),
      wwFlow: read(e.ww_flow_rate, '0.0'),
      wwPump: read(e.ww_pump_speed, '0'),
      wwBuffer: read(e.ww_buffer_temp, '52.0'),
      cwTemp: read(e.cw_temp, '12.0'),
      circMode: read(e.circulation_mode, '0'),
      circTemp: read(e.circulation_temp, '40.0'),
      circPump: read(e.circulation_pump, 'off'),
      burnerMod: read(e.burner_modulation, '0'),
      burnerStatus: read(e.burner_status, 'off'),
      bufferTop: read(e.buffer_top_temp, '55.0'),
      bufferBottom: read(e.buffer_bottom_temp, '35.0'),
      hcPump: read(e.hc_pump_status, 'off'),
      hc2Pump: read(e.hc2_pump_status, 'off'),
      hc3Pump: read(e.hc3_pump_status, 'off'),
      storageRef: read(e.storage_ref_temp, '45.0'),
    };
  }

  _togglePump() {
    this._state.pumpOn = !this._state.pumpOn;
    this._scheduleRender();
  }

  _render() {
    const { title, model, features, mode = 'both', show_legend = false } = this._config;
    const V = this._readEntityValues();
    const isMax = (model || '').toLowerCase() === 'max';
    const circuits = Number(features.circuits || 0);
    const pumpActive = Number(V.pumpSpeed) > 0 || this._state.pumpOn;
    const burnerActive = String(V.burnerStatus).toLowerCase() === 'on' || V.burnerStatus === '1' || V.burnerStatus === true || Number(V.burnerMod) > 0;
    const hcPumpActive = String(V.hcPump).toLowerCase() === 'on' || V.hcPump === '1' || V.hcPump === true;
    const hc2PumpActive = String(V.hc2Pump).toLowerCase() === 'on' || V.hc2Pump === '1' || V.hc2Pump === true;
    const hc3PumpActive = String(V.hc3Pump).toLowerCase() === 'on' || V.hc3Pump === '1' || V.hc3Pump === true;

    const showHeating = mode === 'both' || mode === 'heating';
    const showHotWater = mode === 'both' || mode === 'hot_water';

    const wi = (label, value, unit, x, y) => `
      <g transform="translate(${x},${y})">
        <rect x="-35" y="-12" width="70" height="24" rx="4" fill="rgba(255,255,255,0.9)" stroke="#ccc" stroke-width="1"/>
        <text x="0" y="4" text-anchor="middle" font-size="11" font-weight="bold" fill="#333">${value}${unit}</text>
        <text x="0" y="24" text-anchor="middle" font-size="10" font-weight="500" fill="#555">${label}</text>
      </g>`;

    // --- Dynamic SVG Components ---

    const tank = `
      <defs>
        <linearGradient id="tankGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" style="stop-color:#d1d1d1;stop-opacity:1" />
          <stop offset="50%" style="stop-color:#f8f8f8;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#d1d1d1;stop-opacity:1" />
        </linearGradient>
        <radialGradient id="burnerGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" style="stop-color:#ff9800;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#f44336;stop-opacity:0" />
        </radialGradient>
      </defs>
      <rect x="180" y="30" width="100" height="150" rx="15" fill="url(#tankGrad)" stroke="#888" stroke-width="2"/>
      <path d="M 180 70 L 280 70 M 180 120 L 280 120" stroke="#aaa" stroke-width="1" stroke-dasharray="4,2"/>
      <text x="230" y="25" text-anchor="middle" font-size="11" font-weight="bold" fill="#444" style="text-transform:uppercase; letter-spacing:1px;">Solvis${isMax ? 'Max' : 'Ben'}</text>
      
      <!-- Burner Visualization -->
      <g transform="translate(230, 150)">
        ${burnerActive ? `
          <circle r="15" fill="url(#burnerGrad)">
            <animate attributeName="r" values="12;16;12" dur="1s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.6;1;0.6" dur="1s" repeatCount="indefinite" />
          </circle>
          <text y="5" text-anchor="middle" font-size="8" font-weight="bold" fill="#fff">${V.burnerMod}%</text>
        ` : ''}
        <text y="20" text-anchor="middle" font-size="8" fill="#666">Brenner</text>
      </g>
    `;

    const solar = (features.solar && showHeating) ? `
      <g transform="translate(350, 20)">
        <rect x="0" y="0" width="80" height="50" fill="#2c3e50" stroke="#34495e" stroke-width="2" rx="2"/>
        <path d="M 0 16 L 80 16 M 0 33 L 80 33 M 26 0 L 26 50 M 53 0 L 53 50" stroke="#5d6d7e" stroke-width="1"/>
        <text x="40" y="-5" text-anchor="middle" font-size="10" fill="#555">Solar</text>
        <circle cx="40" cy="25" r="15" fill="rgba(255, 235, 59, 0.2)">
           <animate attributeName="opacity" values="0.2;0.6;0.2" dur="3s" repeatCount="indefinite" />
        </circle>
      </g>
      <path d="M 430 45 L 450 45 L 450 100 L 280 100" fill="none" stroke="#e67e22" stroke-width="3" stroke-linecap="round"/>
      ${pumpActive ? '<circle r="3" fill="#e67e22"><animateMotion dur="3s" repeatCount="indefinite" path="M 430 45 L 450 45 L 450 100 L 280 100" /></circle>' : ''}
    ` : '';

    const heatPump = (features.heat_pump && showHeating) ? `
      <g transform="translate(380, 120)">
        <rect x="0" y="0" width="100" height="60" rx="5" fill="#ecf0f1" stroke="#bdc3c7" stroke-width="2"/>
        <circle cx="30" cy="30" r="20" fill="none" stroke="#bdc3c7" stroke-width="1"/>
        <g class="fan">
          <path d="M 30 15 L 30 45 M 15 30 L 45 30" stroke="#7f8c8d" stroke-width="3">
            ${pumpActive ? '<animateTransform attributeName="transform" type="rotate" from="0 30 30" to="360 30 30" dur="2s" repeatCount="indefinite" />' : ''}
          </path>
        </g>
        <text x="70" y="35" text-anchor="middle" font-size="12" font-weight="bold" fill="#2c3e50">${V.pumpSpeed}%</text>
        <text x="50" y="75" text-anchor="middle" font-size="10" fill="#555">WP</text>
      </g>
      <path d="M 380 150 L 280 150" fill="none" stroke="#2980b9" stroke-width="3"/>
      ${pumpActive ? '<circle r="3" fill="#2980b9"><animateMotion dur="2s" repeatCount="indefinite" path="M 380 150 L 280 150" /></circle>' : ''}
    ` : '';

    const radiatorIcons = showHeating ? Array.from({ length: Math.min(Math.max(circuits, 0), 3) }, (_, i) => {
      const isActive = i === 0 ? hcPumpActive : i === 1 ? hc2PumpActive : i === 2 ? hc3PumpActive : false;
      return `
      <g transform="translate(${25 + i * 40}, 140)">
        <rect x="0" y="0" width="25" height="30" rx="2" fill="#f8f9fa" stroke="#adb5bd" stroke-width="1.5"/>
        <path d="M 6 0 L 6 30 M 12 0 L 12 30 M 18 0 L 18 30" stroke="#dee2e6" stroke-width="1"/>
        <text x="12" y="42" text-anchor="middle" font-size="8" fill="#666">HK ${i + 1}</text>
        <path d="M 12 0 L 12 -20 L 180 ${-20 + i * 5}" fill="none" stroke="#c0392b" stroke-width="1.5" opacity="0.6"/>
        ${isActive ? `
          <circle cx="12" cy="15" r="8" fill="none" stroke="#4caf50" stroke-width="1.5" stroke-dasharray="2,2">
            <animateTransform attributeName="transform" type="rotate" from="0 12 15" to="360 12 15" dur="3s" repeatCount="indefinite" />
          </circle>
        ` : ''}
      </g>
    `}).join('') : '';

    const circModeMap = {
      '0': 'Aus',
      '1': 'Puls',
      '2': 'Zeit',
      '3': 'Puls/Zeit'
    };
    const circModeLabel = circModeMap[String(V.circMode)] || V.circMode;

    const hotWater = (features.hot_water && showHotWater) ? `
      <!-- Pipes with rounded corners -->
      <!-- Red: Hot Water -->
      <path d="M 230 40 L 230 25 Q 230 15 220 15 L 70 15 Q 60 15 60 25 L 60 45" fill="none" stroke="#e74c3c" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      
      <!-- Purple: Circulation -->
      <path d="M 60 35 L 25 35 Q 15 35 15 45 L 15 185 Q 15 195 25 195 L 180 195" fill="none" stroke="#9b59b6" stroke-width="2" stroke-dasharray="4,2" stroke-linecap="round" stroke-linejoin="round"/>
      
      <!-- Blue: Cold Water -->
      <path d="M 10 205 L 165 205 Q 175 205 175 195 L 175 70 Q 175 60 185 60" fill="none" stroke="#3498db" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>

      <!-- Tap Icon -->
      <g transform="translate(45, 45)">
        <path d="M 0 0 Q 10 0 15 5 L 15 12" fill="none" stroke="#7f8c8d" stroke-width="4" stroke-linecap="round" />
        <path d="M -2 -4 L 8 0" stroke="#95a5a6" stroke-width="3" stroke-linecap="round" />
        ${Number(V.wwFlow) > 0 ? `
          <path d="M 15 15 L 15 35" stroke="#3498db" stroke-width="3" stroke-dasharray="3,1">
             <animate attributeName="stroke-dashoffset" from="4" to="0" dur="0.2s" repeatCount="indefinite" />
          </path>
        ` : ''}
      </g>

      <!-- Labels & Values -->
      <g font-family="sans-serif">
        <text x="75" y="30" font-size="12" font-weight="bold" fill="#e74c3c">${Number(V.wwCurrent).toFixed(1)}°C</text>
        ${Number(V.wwFlow) > 0 ? `<text x="75" y="44" font-size="10" fill="#555">${V.wwFlow} l/m</text>` : ''}
        
        <text x="25" y="165" font-size="11" fill="#3498db" font-weight="bold">${Number(V.cwTemp).toFixed(1)}°C</text>
        <text x="25" y="178" font-size="9" fill="#777">Kaltwasser</text>

        <text x="22" y="110" font-size="10" fill="#9b59b6" transform="rotate(-90 22 110)" text-anchor="middle" font-weight="bold">${Number(V.circTemp).toFixed(1)}°C</text>
      </g>
      
      <!-- Animations on lines -->
      ${Number(V.wwFlow) > 0 ? `
        <circle r="3" fill="#e74c3c"><animateMotion dur="2s" repeatCount="indefinite" path="M 230 40 L 230 25 Q 230 15 220 15 L 70 15 Q 60 15 60 25 L 60 45" /></circle>
      ` : ''}
      ${(String(V.circPump).toLowerCase() === 'on' || V.circPump === '1' || V.circPump === true) ? `
        <circle r="2.5" fill="#9b59b6"><animateMotion dur="3s" repeatCount="indefinite" path="M 60 35 L 25 35 Q 15 35 15 45 L 15 185 Q 15 195 25 195 L 180 195" /></circle>
      ` : ''}

      <!-- Status Info Box -->
      <g transform="translate(80, 75)">
        <rect x="0" y="0" width="85" height="60" rx="4" fill="rgba(255,255,255,0.9)" stroke="#ccc" stroke-width="0.5"/>
        <text x="5" y="12" font-size="9" fill="#333" font-weight="bold">Warmwasser</text>
        <text x="5" y="23" font-size="8" fill="#555">Soll: ${V.wwTarget}°C</text>
        <text x="5" y="33" font-size="8" fill="#555">Prio: ${V.wwPriority}</text>
        <text x="5" y="43" font-size="8" fill="#555">Zirk: ${circModeLabel}</text>
        <text x="5" y="53" font-size="8" fill="#555">Pumpe: ${V.wwPump}%</text>
      </g>
    ` : '';

    const smartGrid = (features.smart_grid && showHeating)
      ? `<div class="badge ${this._state.pumpOn ? 'boost' : ''}">Smart Grid: ${this._state.pumpOn ? 'Boost' : 'Normal'}</div>`
      : '';

    const headerRight = `${Number(V.outdoor).toFixed(1)}°C`;
    const subTitle = mode === 'heating' ? 'Heizung' : mode === 'hot_water' ? 'Warmwasser' : (isMax ? 'SolvisMax' : 'SolvisBen');
    const footerLabel = mode === 'hot_water' ? 'WW-Ladepumpe' : 'Heizpumpe';

    this.shadowRoot.innerHTML = `
      <style>
        :host { --solvis-accent: #e53935; --card-bg: #ffffff; display:block; }
        .wrapper { font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; }
        .frame { border: 1px solid #e0e0e0; border-radius: 12px; background: #fafafa; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
        .topbar { background: var(--solvis-accent); color: #fff; padding: 10px 16px; display:flex; justify-content: space-between; align-items:center; font-weight: 500; font-size: 14px; }
        .content { background: var(--card-bg); padding: 16px; position: relative; }
        svg { width: 100%; height: auto; max-height: 320px; display: block; }
        .badge { margin-bottom: 12px; background:#455a64; color:#fff; display:inline-block; padding:4px 10px; border-radius:20px; font-size:11px; font-weight: bold; text-transform: uppercase; }
        .badge.boost { background: #2e7d32; }
        .legend { display:flex; gap:16px; color:#757575; font-size:12px; margin-top:12px; flex-wrap:wrap; border-top: 1px solid #eee; padding-top: 12px; }
        .legend span { display: flex; align-items: center; gap: 4px; }
        .legend span::before { content: '●'; color: var(--solvis-accent); opacity: 0.7; }
        .footer { display:flex; justify-content:space-between; align-items:center; margin-top:12px; padding-top: 8px; }
        .status-item { font-size: 13px; color: #444; font-weight: 500; display: flex; align-items: center; gap: 6px; }
        .dot { height: 8px; width: 8px; background-color: #bbb; border-radius: 50%; display: inline-block; }
        .dot.active { background-color: #4caf50; box-shadow: 0 0 8px #4caf50; animation: pulse 2s infinite; }
        @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }
        button.small { 
          background: #fff; border: 1px solid #dcdcdc; padding: 6px 14px; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 600; color: #444; transition: all 0.2s;
        }
        button.small:hover { background: #f8f8f8; border-color: #c0c0c0; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .fan { transform-origin: 30px 30px; }
      </style>
      <ha-card>
        <div class="wrapper">
          <div class="frame">
            <div class="topbar">
              <div>${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
              <div style="text-transform: uppercase; letter-spacing: 1.5px; font-weight: 700;">${subTitle}</div>
              <div>Aussen: ${headerRight}</div>
            </div>
            <div class="content">
              ${smartGrid}
              <svg viewBox="0 0 500 220" part="diagram">
                ${tank}
                ${solar}
                ${heatPump}
                ${radiatorIcons}
                ${hotWater}
                ${(features.hot_water && showHotWater)
                  ? wi('Oben (S4)', Number(V.bufferTop).toFixed(1), '°C', 230, 75) + 
                    wi('Unten (S9)', Number(V.bufferBottom).toFixed(1), '°C', 230, 125)
                  : wi('Speicher (S3)', Number(V.storageRef).toFixed(1), '°C', 230, 100)}
                ${showHeating ? wi('Vorlauf', Number(V.flowRate).toFixed(1), ' l/m', 330, 100) : ''}
              </svg>
              ${show_legend ? `
              <div class="legend">
                <span>Model: ${model.toUpperCase()}</span>
                ${(features.hot_water && showHotWater) ? '<span>Frischwasser</span>' : ''}
                ${(features.heat_pump && showHeating) ? '<span>WP-Modul</span>' : ''}
                ${(features.solar && showHeating) ? '<span>Solar-Modul</span>' : ''}
                ${(features.smart_grid && showHeating) ? '<span>SG Ready</span>' : ''}
              </div>` : ''}
              <div class="footer">
                <div class="status-item">
                  <span class="dot ${this._state.pumpOn ? 'active' : ''}"></span>
                  ${footerLabel}: ${this._state.pumpOn ? 'Aktiv' : 'Bereit'}
                </div>
                <button class="small" id="btn-pump">${this._state.pumpOn ? 'AUS' : 'AN'}</button>
              </div>
            </div>
          </div>
        </div>
      </ha-card>
    `;

    // Bind interactivity
    const btn = this.shadowRoot.getElementById('btn-pump');
    if (btn) btn.onclick = () => this._togglePump();
  }
}

customElements.define('solvis-card', SolvisCard);

// Register for HA card picker
window.customCards = window.customCards || [];
window.customCards.push({
  type: 'solvis-card',
  name: 'Solvis Control Card',
  description: 'Interactive schema for Solvis devices (Ben/Max) with optional Solar, Heat Pump, and Hot Water.',
  preview: true,
});

window.customCards.push({
  type: 'solvis-card-heating',
  name: 'Solvis Heating Card',
  description: 'Heating-focused view for Solvis systems.',
  preview: true,
});

window.customCards.push({
  type: 'solvis-card-hot-water',
  name: 'Solvis Hot Water Card',
  description: 'Hot water production view for Solvis systems.',
  preview: true,
});

export { SolvisCard };
