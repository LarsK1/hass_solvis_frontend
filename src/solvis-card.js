/*
  Solvis Control Card – lightweight Web Component that works as a
  Home Assistant Lovelace card. No build step required.
*/

const DEFAULT_CONFIG = {
  type: 'custom:solvis-card',
  title: 'Solvis',
  model: 'ben', // 'ben' | 'max' | 'auto'
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
    // Update dynamic values from entities if available
    this._values = this._readEntityValues();
    this._scheduleRender();
  }

  setConfig(config) {
    this._config = deepMerge(DEFAULT_CONFIG, config || {});
    this._scheduleRender();
  }

  static getStubConfig() {
    return DEFAULT_CONFIG;
  }

  static getConfigElement() {
    return document.createElement('solvis-card-editor');
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
    };
  }

  _togglePump() {
    this._state.pumpOn = !this._state.pumpOn;
    this._values = this._readEntityValues();
    this._scheduleRender();
  }

  _render() {
    const { title, model, features } = this._config;
    const V = this._values || this._readEntityValues();
    const isMax = (model || '').toLowerCase() === 'max';
    const svgPipes = `
      <line x1="60" y1="120" x2="280" y2="120" stroke="#333" stroke-width="4"/>
      <line x1="280" y1="120" x2="420" y2="120" stroke="#333" stroke-width="4"/>
      <circle cx="140" cy="120" r="10" fill="${this._state.valveOpen ? '#4caf50' : '#f44336'}" />
      <g class="pump" cursor="pointer" aria-label="Pump" tabindex="0" transform="translate(245,105)" role="button">
        <circle cx="0" cy="0" r="14" fill="#2196f3" />
        <polygon points="-4,-6 8,0 -4,6" fill="#fff"/>
      </g>
    `;

    const wi = (label, value, unit, x, y) => `
      <g transform="translate(${x},${y})">
        <rect x="-38" y="-16" width="76" height="22" rx="4" fill="#fff" stroke="#ddd"/>
        <text x="0" y="0" text-anchor="middle" font-size="11" fill="#111">${value}${unit}</text>
        <text x="0" y="14" text-anchor="middle" font-size="9" fill="#666">${label}</text>
      </g>`;

    const smartGrid = features.smart_grid
      ? `<div class="badge">Smart Grid · ${this._state.pumpOn ? 'Boost' : 'Normal'}</div>`
      : '';

    const heatPump = features.heat_pump
      ? `<g>
           <rect x="420" y="70" width="120" height="100" fill="#fafafa" stroke="#222"/>
           <text x="480" y="95" text-anchor="middle" font-size="12">Heat Pump</text>
           <rect x="430" y="105" width="60" height="50" fill="#ddd" stroke="#666"/>
           <text x="490" y="140" font-size="11">${V.pumpSpeed}%</text>
         </g>`
      : '';

    const solar = features.solar
      ? `<g>
           <polygon points="330,55 370,55 400,110 300,110" fill="#ffe082" stroke="#ffb300"/>
           <text x="350" y="50" text-anchor="middle" font-size="11">Solar</text>
         </g>`
      : '';

    const circuits = Number(features.circuits || 0);
    const radiators = Array.from({ length: Math.min(Math.max(circuits, 0), 4) }, (_, i) =>
      `<g transform="translate(${60 + i * 70},170)">
         <rect x="0" y="0" width="40" height="28" fill="#eee" stroke="#555"/>
         <text x="20" y="20" text-anchor="middle" font-size="9">HK ${i + 1}</text>
       </g>`
    ).join('');

    const headerRight = `${Number(V.outdoor).toFixed(1)}°C`;

    this.shadowRoot.innerHTML = `
      <style>
        :host { --solvis-accent: #e53935; display:block; }
        .wrapper { font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; }
        .frame { border: 1px solid #d0d3d7; border-radius: 12px; background: #f4f6f8; box-shadow: inset 0 1px 2px rgba(0,0,0,0.06); }
        .topbar { background: var(--solvis-accent); color: #fff; padding: 8px 10px; border-radius: 10px 10px 0 0; display:flex; justify-content: space-between; align-items:center; font-weight:600; }
        .content { background:#fff; padding: 10px; border-radius: 0 0 10px 10px; }
        svg { width: 100%; height: 230px; }
        .badge { margin: 6px 0; background:#111; color:#fff; display:inline-block; padding:4px 8px; border-radius:6px; font-size:12px; }
        .legend { display:flex; gap:14px; color:#666; font-size:12px; margin-top:6px; flex-wrap:wrap; }
        .footer { display:flex; justify-content:space-between; align-items:center; margin-top:8px; color:#777; font-size:12px; }
        button.small { font-size:12px; padding:4px 8px; }
      </style>
      <ha-card header="${title}">
        <div class="wrapper">
          <div class="frame">
            <div class="topbar">
              <div>${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
              <div>${isMax ? 'Anlagenschema – Heizung' : 'Anlagenschema – Wärmepumpe'}</div>
              <div>${headerRight}</div>
            </div>
            <div class="content">
              ${smartGrid}
              <svg viewBox="0 0 560 210" part="diagram" aria-label="Solvis schema">
                <g id="pipes">${svgPipes}</g>
                ${heatPump}
                ${solar}
                ${radiators}
                ${wi('Boiler', Number(V.boiler).toFixed(1), '°C', 60, 80)}
                ${wi('Warmwasser', Number(V.hotWater).toFixed(1), '°C', 220, 80)}
                ${wi('Volumenstrom', Number(V.flowRate).toFixed(1), ' l/min', 300, 140)}
              </svg>
              <div class="legend">
                <span>Model: ${model.toUpperCase()}</span>
                ${features.hot_water ? '<span>Warmwasser</span>' : ''}
                ${features.heat_pump ? '<span>WP</span>' : ''}
                ${features.solar ? '<span>Solar</span>' : ''}
                ${features.smart_grid ? '<span>Smart Grid</span>' : ''}
              </div>
              <div class="footer">
                <div>Pump: ${this._state.pumpOn ? 'On' : 'Off'}</div>
                <div>
                  <button class="small" id="btn-pump">Toggle pump</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </ha-card>
    `;

    // Bind interactivity
    const pump = this.shadowRoot.querySelector('.pump');
    if (pump) pump.addEventListener('click', () => this._togglePump());
    const btn = this.shadowRoot.getElementById('btn-pump');
    if (btn) btn.onclick = () => this._togglePump();
  }
}

customElements.define('solvis-card', SolvisCard);

// GUI editor – basic form
class SolvisCardEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._config = structuredClone(DEFAULT_CONFIG);
  }

  set hass(hass) { this._hass = hass; }

  setConfig(config) {
    this._config = deepMerge(DEFAULT_CONFIG, config || {});
    this._render();
  }

  _emit() { this.dispatchEvent(new CustomEvent('config-changed', { detail: { config: this._config } })); }

  _render() {
    const c = this._config;
    this.shadowRoot.innerHTML = `
      <style>
        :host { font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; display:block; }
        fieldset { border: 1px solid #ddd; border-radius: 6px; margin: 0 0 10px; }
        legend { color:#444; }
        .row { display:flex; gap:10px; align-items:center; margin:6px 0; }
        label { min-width: 130px; color:#333; }
        input[type="text"], select, input[type="number"] { flex:1; padding:6px; border:1px solid #ccc; border-radius:4px; }
      </style>
      <div class="editor">
        <fieldset>
          <legend>General</legend>
          <div class="row">
            <label>Title</label>
            <input id="title" type="text" value="${c.title}" />
          </div>
          <div class="row">
            <label>Model</label>
            <select id="model">
              ${['auto','ben','max'].map(m => `<option value="${m}" ${c.model===m?'selected':''}>${m.toUpperCase()}</option>`).join('')}
            </select>
          </div>
        </fieldset>
        <fieldset>
          <legend>Features</legend>
          ${this._checkbox('solar', c.features.solar, 'Solar')}
          ${this._checkbox('heat_pump', c.features.heat_pump, 'Heat pump')}
          ${this._checkbox('hot_water', c.features.hot_water, 'Hot water')}
          ${this._checkbox('smart_grid', c.features.smart_grid, 'Smart grid')}
          <div class="row">
            <label>Heating circuits</label>
            <input id="circuits" type="number" min="0" max="4" value="${Number(c.features.circuits || 0)}" />
          </div>
        </fieldset>
        <fieldset>
          <legend>Entities (optional)</legend>
          ${this._text('outdoor_temperature', c.entities.outdoor_temperature, 'sensor.outdoor_temperature')}
          ${this._text('hot_water_temperature', c.entities.hot_water_temperature, 'sensor.hot_water_temperature')}
          ${this._text('flow_rate', c.entities.flow_rate, 'sensor.flow_rate')}
          ${this._text('pump_speed', c.entities.pump_speed, 'sensor.pump_speed')}
          ${this._text('boiler_temperature', c.entities.boiler_temperature, 'sensor.boiler_temperature')}
        </fieldset>
      </div>
    `;

    const byId = (id) => this.shadowRoot.getElementById(id);
    byId('title').oninput = (e) => { this._config.title = e.target.value; this._emit(); };
    byId('model').onchange = (e) => { this._config.model = e.target.value; this._emit(); };
    byId('circuits').oninput = (e) => { this._config.features.circuits = Number(e.target.value || 0); this._emit(); };
    for (const key of ['solar','heat_pump','hot_water','smart_grid']) {
      const el = byId(`f-${key}`);
      if (el) el.onchange = (e) => { this._config.features[key] = !!e.target.checked; this._emit(); };
    }
    for (const key of ['outdoor_temperature','hot_water_temperature','flow_rate','pump_speed','boiler_temperature']) {
      const el = byId(`e-${key}`);
      if (el) el.oninput = (e) => { this._config.entities[key] = e.target.value; this._emit(); };
    }
  }

  _checkbox(id, value, label) {
    return `
      <div class="row">
        <label>${label}</label>
        <input id="f-${id}" type="checkbox" ${value ? 'checked' : ''} />
      </div>`;
  }

  _text(id, value, placeholder) {
    return `
      <div class="row">
        <label>${id}</label>
        <input id="e-${id}" type="text" value="${value || ''}" placeholder="${placeholder}" />
      </div>`;
  }
}

customElements.define('solvis-card-editor', SolvisCardEditor);

// Register for HA card picker
window.customCards = window.customCards || [];
window.customCards.push({
  type: 'solvis-card',
  name: 'Solvis Control Card',
  description: 'Interactive schema for Solvis devices (Ben/Max) with optional Solar, Heat Pump, and Hot Water.',
  preview: true,
});

export { SolvisCard };
