/**
 * ============================================================================
 * CHAOSPENDULUM — MECÂNICA ANALÍTICA & DINÂMICA NÃO LINEAR
 * Solução das Equações de Euler-Lagrange via Runge-Kutta de 4ª Ordem (RK4)
 * Zero dependências externas • Vanilla JavaScript ES6+
 * ============================================================================
 */

(function () {
  'use strict';

  /* ==========================================================================
     Constantes Físicas & Parâmetros Numéricos
     ========================================================================== */
  const SUB_STEPS = 8;        // Subpassos temporais por quadro para alta conservação hamiltoniana
  const BASE_DT = 0.02;       // dt por quadro (subpasso dt = BASE_DT / SUB_STEPS = 0.0025s)

  /* ==========================================================================
     Estado da Simulação
     ========================================================================== */
  const state = {
    isRunning: true,
    time: 0,
    showTrail: true,
    showGhosts: false,
    trailLength: 600,

    // Parâmetros Mecânicos Universais
    l1: 130,                  // Comprimento da haste 1 (px)
    l2: 130,                  // Comprimento da haste 2 (px)
    m1: 2.0,                  // Massa concentrada 1 (kg)
    m2: 2.0,                  // Massa concentrada 2 (kg)
    g: 9.81,                  // Aceleração da gravidade (m/s²)
    damping: 0.000,           // Amortecimento viscoso (0 = Conservação pura)

    // Família de pêndulos ativos (1 pêndulo padrão ou 100 no modo Enxame)
    pendulums: [],
    isSwarmActive: false,

    // Conservação de energia e Lyapunov
    initialEnergy: 0,
    currentEnergy: 0,
    d0: 1e-6,                 // Separação inicial para Lyapunov
    lyapunovHistory: [],      // Histórico de ln(d/d0)
    phaseSpaceHistory: [],    // Histórico de (theta1, omega1) para o atrator

    // Interação de arrasto manual das massas
    draggedBob: null,         // 1 = m1, 2 = m2
    isDragging: false,
    pivot: { x: 0, y: 0 },

    activePreset: 'moderate'
  };

  /* ==========================================================================
     Elementos DOM e Contextos de Canvas
     ========================================================================== */
  const canvas = document.getElementById('pendulum-canvas');
  const ctx = canvas.getContext('2d');
  const phaseCanvas = document.getElementById('phasespace-canvas');
  const phaseCtx = phaseCanvas.getContext('2d');
  const lyapunovCanvas = document.getElementById('lyapunov-canvas');
  const lyapCtx = lyapunovCanvas.getContext('2d');

  /* ==========================================================================
     Classe do Pêndulo Duplo (Mecânica de Euler-Lagrange)
     ========================================================================== */
  class DoublePendulum {
    constructor(theta1, theta2, omega1 = 0, omega2 = 0, color = '#22d3ee', isReference = false) {
      this.theta1 = theta1;
      this.theta2 = theta2;
      this.omega1 = omega1;
      this.omega2 = omega2;
      this.color = color;
      this.isReference = isReference;
      this.trail = [];
    }

    // Posições Cartesianas no plano
    getPositions(pivotX, pivotY, l1, l2) {
      const x1 = pivotX + l1 * Math.sin(this.theta1);
      const y1 = pivotY + l1 * Math.cos(this.theta1);
      const x2 = x1 + l2 * Math.sin(this.theta2);
      const y2 = y1 + l2 * Math.cos(this.theta2);
      return { x1, y1, x2, y2 };
    }

    // Derivadas Analíticas de Euler-Lagrange: d/dt [θ1, ω1, θ2, ω2]
    static derivatives(t1, t2, w1, w2, m1, m2, l1, l2, g, damping) {
      const delta = t1 - t2;
      const sinDelta = Math.sin(delta);
      const cosDelta = Math.cos(delta);

      // Denominador comum da matriz inercial
      const den = 2 * m1 + m2 - m2 * Math.cos(2 * t1 - 2 * t2);

      // Aceleração angular theta1_ddot
      const num1 = -g * (2 * m1 + m2) * Math.sin(t1) -
                   m2 * g * Math.sin(t1 - 2 * t2) -
                   2 * sinDelta * m2 * (w2 * w2 * l2 + w1 * w1 * l1 * cosDelta);
      const alpha1 = (num1 / (l1 * den)) - damping * w1;

      // Aceleração angular theta2_ddot
      const num2 = 2 * sinDelta * (
        w1 * w1 * l1 * (m1 + m2) +
        g * (m1 + m2) * Math.cos(t1) +
        w2 * w2 * l2 * m2 * cosDelta
      );
      const alpha2 = (num2 / (l2 * den)) - damping * w2;

      return { dTheta1: w1, dOmega1: alpha1, dTheta2: w2, dOmega2: alpha2 };
    }

    // Integração Numérica Runge-Kutta 4 (RK4)
    stepRK4(dt, m1, m2, l1, l2, g, damping) {
      const t1 = this.theta1;
      const t2 = this.theta2;
      const w1 = this.omega1;
      const w2 = this.omega2;

      // k1
      const k1 = DoublePendulum.derivatives(t1, t2, w1, w2, m1, m2, l1, l2, g, damping);

      // k2
      const t1_k2 = t1 + 0.5 * dt * k1.dTheta1;
      const t2_k2 = t2 + 0.5 * dt * k1.dTheta2;
      const w1_k2 = w1 + 0.5 * dt * k1.dOmega1;
      const w2_k2 = w2 + 0.5 * dt * k1.dOmega2;
      const k2 = DoublePendulum.derivatives(t1_k2, t2_k2, w1_k2, w2_k2, m1, m2, l1, l2, g, damping);

      // k3
      const t1_k3 = t1 + 0.5 * dt * k2.dTheta1;
      const t2_k3 = t2 + 0.5 * dt * k2.dTheta2;
      const w1_k3 = w1 + 0.5 * dt * k2.dOmega1;
      const w2_k3 = w2 + 0.5 * dt * k2.dOmega2;
      const k3 = DoublePendulum.derivatives(t1_k3, t2_k3, w1_k3, w2_k3, m1, m2, l1, l2, g, damping);

      // k4
      const t1_k4 = t1 + dt * k3.dTheta1;
      const t2_k4 = t2 + dt * k3.dTheta2;
      const w1_k4 = w1 + dt * k3.dOmega1;
      const w2_k4 = w2 + dt * k3.dOmega2;
      const k4 = DoublePendulum.derivatives(t1_k4, t2_k4, w1_k4, w2_k4, m1, m2, l1, l2, g, damping);

      // Atualização RK4
      this.theta1 += (dt / 6.0) * (k1.dTheta1 + 2 * k2.dTheta1 + 2 * k3.dTheta1 + k4.dTheta1);
      this.omega1 += (dt / 6.0) * (k1.dOmega1 + 2 * k2.dOmega1 + 2 * k3.dOmega1 + k4.dOmega1);
      this.theta2 += (dt / 6.0) * (k1.dTheta2 + 2 * k2.dTheta2 + 2 * k3.dTheta2 + k4.dTheta2);
      this.omega2 += (dt / 6.0) * (k1.dOmega2 + 2 * k2.dOmega2 + 2 * k3.dOmega2 + k4.dOmega2);
    }

    // Energia Mecânica Total Hamiltoniana (E = T + V)
    getEnergy(m1, m2, l1, l2, g) {
      // Energia Cinética T
      const T1 = 0.5 * m1 * l1 * l1 * this.omega1 * this.omega1;
      const T2 = 0.5 * m2 * (
        l1 * l1 * this.omega1 * this.omega1 +
        l2 * l2 * this.omega2 * this.omega2 +
        2 * l1 * l2 * this.omega1 * this.omega2 * Math.cos(this.theta1 - this.theta2)
      );
      const T = T1 + T2;

      // Energia Potencial V (referência zero na posição de repouso inferior estável: theta1=0, theta2=0)
      const V1 = m1 * g * l1 * (1.0 - Math.cos(this.theta1));
      const V2 = m2 * g * (l1 * (1.0 - Math.cos(this.theta1)) + l2 * (1.0 - Math.cos(this.theta2)));
      const V = V1 + V2;

      return T + V;
    }
  }

  /* ==========================================================================
     Inicialização de Pêndulos e Presets
     ========================================================================== */
  function createSinglePendulum(theta1, theta2) {
    state.isSwarmActive = false;
    state.pendulums = [
      new DoublePendulum(theta1, theta2, 0, 0, '#a855f7', true)
    ];

    // Cria também um gêmeo infinitesimalmente perturbado para monitoramento contínuo de Lyapunov
    state.pendulums.push(
      new DoublePendulum(theta1 + state.d0, theta2, 0, 0, 'rgba(6, 182, 212, 0.4)', false)
    );

    recalculateInitialEnergy();
    resetTelemetry();
  }

  function createSwarm(theta1Base, theta2Base, count = 100) {
    state.isSwarmActive = true;
    state.pendulums = [];

    // Cria família de 100 pêndulos com micro-perturbação angular dtheta = 10^-6 rad
    for (let k = 0; k < count; k++) {
      const dTheta = k * 1e-6;
      // Gradiente cromático HSL ao longo do arco-íris
      const hue = Math.round(180 + (k * 180) / count) % 360;
      const color = `hsl(${hue}, 90%, 60%)`;

      state.pendulums.push(
        new DoublePendulum(theta1Base + dTheta, theta2Base, 0, 0, color, k === 0)
      );
    }

    const badge = document.getElementById('swarm-active-badge');
    const badgeText = document.getElementById('swarm-count-text');
    if (badge && badgeText) {
      badge.style.display = 'flex';
      badgeText.textContent = `${count} pêndulos`;
    }

    recalculateInitialEnergy();
    resetTelemetry();
  }

  function recalculateInitialEnergy() {
    if (state.pendulums.length > 0) {
      state.initialEnergy = state.pendulums[0].getEnergy(
        state.m1, state.m2, state.l1, state.l2, state.g
      );
      state.currentEnergy = state.initialEnergy;
    }
  }

  function resetTelemetry() {
    state.lyapunovHistory = [];
    state.phaseSpaceHistory = [];
  }

  function loadPreset(name) {
    state.activePreset = name;
    const DEG = Math.PI / 180;

    const pTitle = document.getElementById('preset-info-title');
    const pDesc = document.getElementById('preset-info-desc');

    const badge = document.getElementById('swarm-active-badge');
    if (badge && name !== 'swarm') badge.style.display = 'none';

    switch (name) {
      case 'linear':
        // Pequenas Oscilações (Regime Quase-Linear, Não Caótico)
        state.l1 = 130;
        state.l2 = 130;
        state.m1 = 2.0;
        state.m2 = 2.0;
        state.damping = 0.000;
        createSinglePendulum(15 * DEG, 15 * DEG);
        if (pTitle) pTitle.textContent = 'Pequenas Oscilações (Regime Linear)';
        if (pDesc) pDesc.textContent = 'Em ângulos pequenos (< 20°), as equações não lineares se aproximam de modos normais acoplados harmônicos. O movimento é quase-periódico e previsível a longo prazo (λ ≈ 0).';
        break;

      case 'moderate':
        // Caos Moderado (Lançamento Horizontal 90°)
        state.l1 = 130;
        state.l2 = 130;
        state.m1 = 2.0;
        state.m2 = 2.0;
        state.damping = 0.000;
        createSinglePendulum(90 * DEG, 90 * DEG);
        if (pTitle) pTitle.textContent = 'Caos Moderado (Lançamento a 90°)';
        if (pDesc) pDesc.textContent = 'Lançamento com as duas hastes horizontais. O sistema possui energia suficiente para alternar inversões angulares caóticas e batimentos complexos, exibindo sensibilidade às condições iniciais.';
        break;

      case 'extreme':
        // Caos Extremo (Loops de 360°)
        state.l1 = 120;
        state.l2 = 120;
        state.m1 = 2.0;
        state.m2 = 2.0;
        state.damping = 0.000;
        createSinglePendulum(175 * DEG, 175 * DEG);
        if (pTitle) pTitle.textContent = 'Caos Extremo (Loops Completos de 360°)';
        if (pDesc) pDesc.textContent = 'Com energia potencial próxima ao topo vertical instável, o pêndulo secundário executa piruetas e giros completos de 360° em direções imprevisíveis com divergência violenta de trajetórias.';
        break;

      case 'swarm':
        // Enxame Efeito Borboleta (100 Pêndulos)
        state.l1 = 130;
        state.l2 = 130;
        state.m1 = 2.0;
        state.m2 = 2.0;
        state.damping = 0.000;
        createSwarm(90 * DEG, 90 * DEG, 100);
        if (pTitle) pTitle.textContent = 'Enxame Efeito Borboleta (100 Pêndulos)';
        if (pDesc) pDesc.textContent = 'Cem pêndulos liberados simultaneamente com diferença microscópica de 10⁻⁶ rad. Nos primeiros segundos movem-se colapsados em perfeita sincronia; ao cruzar o ponto crítico caótico, abrem-se em um leque cromático espetacular!';
        break;

      case 'resonance':
        // Ressonância 1:2
        state.l1 = 140;
        state.l2 = 70;
        state.m1 = 3.0;
        state.m2 = 1.0;
        state.damping = 0.000;
        createSinglePendulum(45 * DEG, 0 * DEG);
        if (pTitle) pTitle.textContent = 'Ressonância Não Linear (1:2)';
        if (pDesc) pDesc.textContent = 'Proporção geométrica assimétrica gerando troca periódica e alternada de momento angular e energia mecânica entre o elo superior e o elo inferior.';
        break;
    }

    syncControlsToState();
  }

  function syncControlsToState() {
    const sL1 = document.getElementById('slider-l1');
    const vL1 = document.getElementById('val-l1');
    if (sL1 && vL1) { sL1.value = state.l1; vL1.textContent = `${state.l1} px`; }

    const sL2 = document.getElementById('slider-l2');
    const vL2 = document.getElementById('val-l2');
    if (sL2 && vL2) { sL2.value = state.l2; vL2.textContent = `${state.l2} px`; }

    const sM1 = document.getElementById('slider-m1');
    const vM1 = document.getElementById('val-m1');
    if (sM1 && vM1) { sM1.value = state.m1; vM1.textContent = `${state.m1.toFixed(1)} kg`; }

    const sM2 = document.getElementById('slider-m2');
    const vM2 = document.getElementById('val-m2');
    if (sM2 && vM2) { sM2.value = state.m2; vM2.textContent = `${state.m2.toFixed(1)} kg`; }

    const sG = document.getElementById('slider-g');
    const vG = document.getElementById('val-g');
    if (sG && vG) { sG.value = state.g; vG.textContent = `${state.g.toFixed(2)} m/s²`; }

    const sDamp = document.getElementById('slider-damping');
    const vDamp = document.getElementById('val-damping');
    if (sDamp && vDamp) {
      sDamp.value = state.damping;
      vDamp.textContent = state.damping === 0 ? '0.000 (Conservativo)' : state.damping.toFixed(3);
    }
  }

  /* ==========================================================================
     Integração Numérica do Sistema
     ========================================================================== */
  function stepSimulation() {
    const subDt = BASE_DT / SUB_STEPS;

    for (let s = 0; s < SUB_STEPS; s++) {
      for (let p of state.pendulums) {
        p.stepRK4(subDt, state.m1, state.m2, state.l1, state.l2, state.g, state.damping);
      }
      state.time += subDt;
    }

    // Registra rastro para a ponta do bob 2 de cada pêndulo
    for (let p of state.pendulums) {
      const pos = p.getPositions(state.pivot.x, state.pivot.y, state.l1, state.l2);
      p.trail.unshift({ x: pos.x2, y: pos.y2 });
      if (p.trail.length > state.trailLength) {
        p.trail.pop();
      }
    }

    // Telemetria do Pêndulo de Referência (p0)
    const p0 = state.pendulums[0];
    if (p0) {
      state.currentEnergy = p0.getEnergy(state.m1, state.m2, state.l1, state.l2, state.g);

      // Registra ponto no espaço de fase (theta1 normalizado vs omega1)
      const normTheta1 = Math.atan2(Math.sin(p0.theta1), Math.cos(p0.theta1));
      state.phaseSpaceHistory.push({ theta: normTheta1, omega: p0.omega1 });
      if (state.phaseSpaceHistory.length > 500) {
        state.phaseSpaceHistory.shift();
      }
    }

    // Medição da divergência no espaço de fase entre p0 e p1 (ou p0 e gêmeo)
    if (state.pendulums.length > 1) {
      const p1 = state.pendulums[1];
      const dTheta1 = p1.theta1 - p0.theta1;
      const dOmega1 = p1.omega1 - p0.omega1;
      const dTheta2 = p1.theta2 - p0.theta2;
      const dOmega2 = p1.omega2 - p0.omega2;

      // Distância Euclidiana 4D no espaço de fase
      const dPhase = Math.sqrt(
        dTheta1 * dTheta1 + dOmega1 * dOmega1 +
        dTheta2 * dTheta2 + dOmega2 * dOmega2
      );

      const lnRatio = Math.log(Math.max(1e-12, dPhase / state.d0));
      state.lyapunovHistory.push({ t: state.time, val: lnRatio, dist: dPhase });
      if (state.lyapunovHistory.length > 200) {
        state.lyapunovHistory.shift();
      }
    }
  }

  /* ==========================================================================
     Renderização Visual no Canvas Principal
     ========================================================================== */
  function renderPendulums() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const px = state.pivot.x;
    const py = state.pivot.y;

    // 1. Grade técnica radial de referência de ângulos
    renderRadialGuides(px, py);

    // 2. Rastros Fotográficos
    if (state.showTrail) {
      renderTrails();
    }

    // 3. Hastes e Massas de Todos os Pêndulos
    if (state.isSwarmActive) {
      // Modo Enxame: Renderiza hastes translúcidas finas
      ctx.save();
      ctx.lineWidth = 1.0;
      for (let p of state.pendulums) {
        const pos = p.getPositions(px, py, state.l1, state.l2);
        ctx.strokeStyle = p.color;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(pos.x1, pos.y1);
        ctx.lineTo(pos.x2, pos.y2);
        ctx.stroke();

        // Bob pontual
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(pos.x2, pos.y2, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    } else {
      // Modo Pêndulo Individual: Renderização de alta fidelidade industrial
      const p = state.pendulums[0];
      if (p) {
        const pos = p.getPositions(px, py, state.l1, state.l2);

        ctx.save();
        // Haste 1
        ctx.strokeStyle = '#52525b';
        ctx.lineWidth = 4.0;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(pos.x1, pos.y1);
        ctx.stroke();

        // Haste 2
        ctx.strokeStyle = '#71717a';
        ctx.beginPath();
        ctx.moveTo(pos.x1, pos.y1);
        ctx.lineTo(pos.x2, pos.y2);
        ctx.stroke();

        // Mancal Central (Pivô fixo superior)
        ctx.fillStyle = '#1e1e26';
        ctx.strokeStyle = '#22d3ee';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(px, py, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Massa 1 (Articulação intermediária)
        const r1 = 8 + state.m1 * 2;
        ctx.fillStyle = '#22d3ee';
        ctx.shadowColor = '#22d3ee';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(pos.x1, pos.y1, r1, 0, Math.PI * 2);
        ctx.fill();

        // Massa 2 (Bob caótico da extremidade)
        const r2 = 9 + state.m2 * 2;
        ctx.fillStyle = '#a855f7';
        ctx.shadowColor = '#a855f7';
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.arc(pos.x2, pos.y2, r2, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }
    }

    // 4. Atualiza HUD de Ângulos
    updateAnglesHud();
  }

  function renderRadialGuides(px, py) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;

    // Círculos de alcance máximo
    const rMax = state.l1 + state.l2;
    ctx.beginPath();
    ctx.arc(px, py, state.l1, 0, Math.PI * 2);
    ctx.arc(px, py, rMax, 0, Math.PI * 2);
    ctx.stroke();

    // Eixo vertical
    ctx.setLineDash([3, 4]);
    ctx.beginPath();
    ctx.moveTo(px, py - 40);
    ctx.lineTo(px, py + rMax + 20);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  function renderTrails() {
    ctx.save();

    for (let p of state.pendulums) {
      const trail = p.trail;
      if (trail.length < 2) continue;

      ctx.beginPath();
      ctx.moveTo(trail[0].x, trail[0].y);
      for (let i = 1; i < trail.length; i++) {
        ctx.lineTo(trail[i].x, trail[i].y);
      }

      // Estilo de traço
      if (state.isSwarmActive) {
        ctx.strokeStyle = p.color;
        ctx.globalAlpha = 0.35;
        ctx.lineWidth = 1.2;
      } else {
        ctx.strokeStyle = 'rgba(168, 85, 247, 0.7)';
        ctx.shadowColor = '#a855f7';
        ctx.shadowBlur = 8;
        ctx.globalAlpha = 0.85;
        ctx.lineWidth = 2.0;
      }

      ctx.stroke();
    }

    ctx.restore();
  }

  function updateAnglesHud() {
    const p = state.pendulums[0];
    if (!p) return;

    const elT1 = document.getElementById('hud-theta1');
    const elW1 = document.getElementById('hud-omega1');
    const elT2 = document.getElementById('hud-theta2');
    const elW2 = document.getElementById('hud-omega2');

    const toDeg = 180 / Math.PI;
    const normT1 = ((p.theta1 * toDeg) % 360).toFixed(1);
    const normT2 = ((p.theta2 * toDeg) % 360).toFixed(1);

    if (elT1) elT1.textContent = `${normT1}°`;
    if (elW1) elW1.textContent = `${p.omega1.toFixed(2)} rad/s`;
    if (elT2) elT2.textContent = `${normT2}°`;
    if (elW2) elW2.textContent = `${p.omega2.toFixed(2)} rad/s`;
  }

  /* ==========================================================================
     Renderização dos Gráficos Laterais (Espaço de Fase & Lyapunov)
     ========================================================================== */
  function renderPhaseSpaceGraph() {
    const w = phaseCanvas.width;
    const h = phaseCanvas.height;
    phaseCtx.clearRect(0, 0, w, h);

    phaseCtx.fillStyle = '#060608';
    phaseCtx.fillRect(0, 0, w, h);

    // Eixos cartesianos
    const cx = w / 2;
    const cy = h / 2;
    phaseCtx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    phaseCtx.lineWidth = 1;
    phaseCtx.beginPath();
    phaseCtx.moveTo(0, cy);
    phaseCtx.lineTo(w, cy);
    phaseCtx.moveTo(cx, 0);
    phaseCtx.lineTo(cx, h);
    phaseCtx.stroke();

    // Rótulos
    phaseCtx.fillStyle = '#71717a';
    phaseCtx.font = '9px JetBrains Mono, monospace';
    phaseCtx.fillText('−π', 4, cy - 4);
    phaseCtx.fillText('+π', w - 16, cy - 4);
    phaseCtx.fillText('+ω₁', cx + 4, 12);
    phaseCtx.fillText('−ω₁', cx + 4, h - 4);

    // Traça órbita de fase (theta1 vs omega1)
    const pts = state.phaseSpaceHistory;
    if (pts.length < 2) return;

    phaseCtx.save();
    phaseCtx.strokeStyle = '#8b5cf6';
    phaseCtx.lineWidth = 1.5;
    phaseCtx.beginPath();

    const scaleX = (w * 0.45) / Math.PI;
    const scaleY = 4.5;

    for (let i = 0; i < pts.length; i++) {
      const px = cx + pts[i].theta * scaleX;
      const py = cy - pts[i].omega * scaleY;
      if (i === 0) phaseCtx.moveTo(px, py);
      else phaseCtx.lineTo(px, py);
    }
    phaseCtx.stroke();

    // Ponto atual na ponta da trajetória
    const last = pts[pts.length - 1];
    phaseCtx.fillStyle = '#22d3ee';
    phaseCtx.shadowColor = '#22d3ee';
    phaseCtx.shadowBlur = 6;
    phaseCtx.beginPath();
    phaseCtx.arc(cx + last.theta * scaleX, cy - last.omega * scaleY, 3.5, 0, Math.PI * 2);
    phaseCtx.fill();
    phaseCtx.restore();
  }

  function renderLyapunovGraph() {
    const w = lyapunovCanvas.width;
    const h = lyapunovCanvas.height;
    lyapCtx.clearRect(0, 0, w, h);

    lyapCtx.fillStyle = '#060608';
    lyapCtx.fillRect(0, 0, w, h);

    // Linhas de grade
    lyapCtx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    lyapCtx.lineWidth = 1;
    for (let y = 0; y < h; y += 25) {
      lyapCtx.beginPath();
      lyapCtx.moveTo(0, y);
      lyapCtx.lineTo(w, y);
      lyapCtx.stroke();
    }

    const hist = state.lyapunovHistory;
    if (hist.length < 2) return;

    // Encontra max ln
    let maxVal = 10;
    for (let pt of hist) {
      if (pt.val > maxVal) maxVal = pt.val;
    }

    // Traça curva de ln(d/d0)
    lyapCtx.save();
    lyapCtx.strokeStyle = '#f59e0b';
    lyapCtx.lineWidth = 1.8;
    lyapCtx.beginPath();

    for (let i = 0; i < hist.length; i++) {
      const x = (i / (hist.length - 1)) * w;
      const y = h - (hist[i].val / maxVal) * (h - 16) - 8;
      if (i === 0) lyapCtx.moveTo(x, y);
      else lyapCtx.lineTo(x, y);
    }
    lyapCtx.stroke();
    lyapCtx.restore();

    // Estimação numérica da inclinação (Maior Expoente de Lyapunov lambda)
    if (hist.length > 30) {
      const pFirst = hist[0];
      const pLast = hist[hist.length - 1];
      const dtElapsed = pLast.t - pFirst.t;
      let lambdaEst = dtElapsed > 0.1 ? (pLast.val - pFirst.val) / dtElapsed : 0;
      if (lambdaEst < 0) lambdaEst = 0;

      const elLyap = document.getElementById('stat-lyapunov');
      const elLyapMet = document.getElementById('metric-lambda');
      const formatted = `+${lambdaEst.toFixed(2)} bit/s`;

      if (elLyap) elLyap.textContent = formatted;
      if (elLyapMet) elLyapMet.textContent = formatted;

      const elDiv = document.getElementById('metric-divergence');
      if (elDiv && pLast.dist !== undefined) {
        const ratio = pLast.dist / state.d0;
        if (ratio < 1e3) elDiv.textContent = `${ratio.toFixed(1)} d₀`;
        else elDiv.textContent = `${ratio.toExponential(1)} d₀`;
      }
    }

    // Atualiza telemetria de conservação
    const elTotE = document.getElementById('metric-total-energy');
    const elDrift = document.getElementById('metric-drift');
    const elHeaderDrift = document.getElementById('stat-energy-drift');

    if (elTotE) elTotE.textContent = `${state.currentEnergy.toFixed(2)} J`;

    const eRef = Math.max(1.0, Math.abs(state.initialEnergy));
    const drift = Math.abs((state.currentEnergy - state.initialEnergy) / eRef) * 100;
    const driftStr = `${drift.toFixed(4)}%`;
    if (elDrift) elDrift.textContent = driftStr;
    if (elHeaderDrift) elHeaderDrift.textContent = drift < 0.001 ? '< 0.001%' : driftStr;

    const statPendulums = document.getElementById('stat-pendulums');
    if (statPendulums) statPendulums.textContent = state.pendulums.length;
  }

  /* ==========================================================================
     Interação Tátil: Arrastar as Massas com Mouse / Touch
     ========================================================================== */
  function getCanvasCoords(evt) {
    const rect = canvas.getBoundingClientRect();
    const clientX = evt.clientX || (evt.touches && evt.touches[0].clientX);
    const clientY = evt.clientY || (evt.touches && evt.touches[0].clientY);
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height)
    };
  }

  function handlePointerDown(e) {
    const coords = getCanvasCoords(e);
    const p = state.pendulums[0];
    if (!p) return;

    const pos = p.getPositions(state.pivot.x, state.pivot.y, state.l1, state.l2);

    // Verifica se clicou perto de m2 (extremidade)
    if (Math.hypot(coords.x - pos.x2, coords.y - pos.y2) < 28) {
      state.isDragging = true;
      state.draggedBob = 2;
      return;
    }

    // Verifica se clicou perto de m1 (articulação intermediária)
    if (Math.hypot(coords.x - pos.x1, coords.y - pos.y1) < 28) {
      state.isDragging = true;
      state.draggedBob = 1;
      return;
    }
  }

  function handlePointerMove(e) {
    if (!state.isDragging) return;
    const coords = getCanvasCoords(e);
    const p = state.pendulums[0];
    if (!p) return;

    const px = state.pivot.x;
    const py = state.pivot.y;

    if (state.draggedBob === 1) {
      // Ajusta theta1 a partir do pivô superior
      p.theta1 = Math.atan2(coords.x - px, coords.y - py);
      p.omega1 = 0;
      p.omega2 = 0;
    } else if (state.draggedBob === 2) {
      // Calcula posição atual de m1
      const x1 = px + state.l1 * Math.sin(p.theta1);
      const y1 = py + state.l1 * Math.cos(p.theta1);

      // Ajusta theta2 a partir de m1
      p.theta2 = Math.atan2(coords.x - x1, coords.y - y1);
      p.omega1 = 0;
      p.omega2 = 0;
    }

    // Se houver gêmeo ou enxame, sincroniza suas posições iniciais
    for (let k = 1; k < state.pendulums.length; k++) {
      state.pendulums[k].theta1 = p.theta1 + k * 1e-6;
      state.pendulums[k].theta2 = p.theta2;
      state.pendulums[k].omega1 = 0;
      state.pendulums[k].omega2 = 0;
    }

    recalculateInitialEnergy();
    renderPendulums();
  }

  function handlePointerUp() {
    state.isDragging = false;
    state.draggedBob = null;
    recalculateInitialEnergy();
  }

  function setupInteractions() {
    // Mouse
    canvas.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);

    // Touch
    canvas.addEventListener('touchstart', (e) => {
      handlePointerDown(e);
      e.preventDefault();
    }, { passive: false });

    canvas.addEventListener('touchmove', (e) => {
      handlePointerMove(e);
      e.preventDefault();
    }, { passive: false });

    window.addEventListener('touchend', handlePointerUp);

    // Botão Hero: Soltar Enxame
    document.getElementById('btn-hero-swarm')?.addEventListener('click', () => {
      const p = state.pendulums[0];
      const t1 = p ? p.theta1 : 90 * (Math.PI / 180);
      const t2 = p ? p.theta2 : 90 * (Math.PI / 180);
      createSwarm(t1, t2, 100);
    });

    // Sliders
    const sL1 = document.getElementById('slider-l1');
    const vL1 = document.getElementById('val-l1');
    sL1?.addEventListener('input', (e) => {
      state.l1 = parseInt(e.target.value, 10);
      if (vL1) vL1.textContent = `${state.l1} px`;
      recalculateInitialEnergy();
    });

    const sL2 = document.getElementById('slider-l2');
    const vL2 = document.getElementById('val-l2');
    sL2?.addEventListener('input', (e) => {
      state.l2 = parseInt(e.target.value, 10);
      if (vL2) vL2.textContent = `${state.l2} px`;
      recalculateInitialEnergy();
    });

    const sM1 = document.getElementById('slider-m1');
    const vM1 = document.getElementById('val-m1');
    sM1?.addEventListener('input', (e) => {
      state.m1 = parseFloat(e.target.value);
      if (vM1) vM1.textContent = `${state.m1.toFixed(1)} kg`;
      recalculateInitialEnergy();
    });

    const sM2 = document.getElementById('slider-m2');
    const vM2 = document.getElementById('val-m2');
    sM2?.addEventListener('input', (e) => {
      state.m2 = parseFloat(e.target.value);
      if (vM2) vM2.textContent = `${state.m2.toFixed(1)} kg`;
      recalculateInitialEnergy();
    });

    const sG = document.getElementById('slider-g');
    const vG = document.getElementById('val-g');
    sG?.addEventListener('input', (e) => {
      state.g = parseFloat(e.target.value);
      if (vG) vG.textContent = `${state.g.toFixed(2)} m/s²`;
      recalculateInitialEnergy();
    });

    const sDamp = document.getElementById('slider-damping');
    const vDamp = document.getElementById('val-damping');
    sDamp?.addEventListener('input', (e) => {
      state.damping = parseFloat(e.target.value);
      if (vDamp) vDamp.textContent = state.damping === 0 ? '0.000 (Conservativo)' : state.damping.toFixed(3);
    });

    const sTrail = document.getElementById('slider-trail-len');
    const vTrail = document.getElementById('val-trail-len');
    sTrail?.addEventListener('input', (e) => {
      state.trailLength = parseInt(e.target.value, 10);
      if (vTrail) vTrail.textContent = `${state.trailLength} pts`;
    });

    // Play / Pause
    const btnPlay = document.getElementById('btn-toggle-play');
    const iconPlay = document.getElementById('icon-play');
    const simText = document.getElementById('sim-status-text');
    const simBadge = document.getElementById('sim-status-badge');

    btnPlay?.addEventListener('click', () => {
      state.isRunning = !state.isRunning;
      if (state.isRunning) {
        iconPlay.className = 'fas fa-pause';
        if (simText) simText.textContent = state.isSwarmActive ? 'Enxame Ativo' : 'Regime Caótico';
        if (simBadge) simBadge.className = 'telemetry-status-badge live';
      } else {
        iconPlay.className = 'fas fa-play';
        if (simText) simText.textContent = 'Pausado';
        if (simBadge) simBadge.className = 'telemetry-status-badge';
      }
    });

    // Rastro toggle
    const btnTrail = document.getElementById('btn-toggle-trail');
    btnTrail?.addEventListener('click', () => {
      state.showTrail = !state.showTrail;
      btnTrail.classList.toggle('active', state.showTrail);
    });

    // Limpar rastros
    document.getElementById('btn-clear-trails')?.addEventListener('click', () => {
      for (let p of state.pendulums) p.trail.length = 0;
      resetTelemetry();
    });

    // Presets
    setupDropdown('btn-presets-toggle', 'presets-dropdown-menu', (target) => {
      const presetName = target.closest('[data-preset]')?.dataset.preset;
      if (presetName) loadPreset(presetName);
    });

    // Teclas de Atalho
    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT') return;
      if (e.code === 'Space') {
        e.preventDefault();
        btnPlay?.click();
      } else if (e.key === 't' || e.key === 'T') {
        btnTrail?.click();
      } else if (e.key === 'c' || e.key === 'C') {
        document.getElementById('btn-clear-trails')?.click();
      } else if (e.key === '1') loadPreset('linear');
      else if (e.key === '2') loadPreset('moderate');
      else if (e.key === '3') loadPreset('extreme');
      else if (e.key === '4') loadPreset('swarm');
      else if (e.key === '5') loadPreset('resonance');
    });

    window.addEventListener('resize', handleResize);
  }

  function setupDropdown(toggleId, menuId, onSelect) {
    const toggle = document.getElementById(toggleId);
    const menu = document.getElementById(menuId);
    if (!toggle || !menu) return;

    toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      menu.classList.toggle('show');
    });

    menu.addEventListener('click', (e) => {
      onSelect(e.target);
      menu.classList.remove('show');
    });

    document.addEventListener('click', (e) => {
      if (!toggle.contains(e.target) && !menu.contains(e.target)) {
        menu.classList.remove('show');
      }
    });
  }

  function handleResize() {
    const container = document.querySelector('.pendulum-viewport-container');
    if (!container) return;

    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;

    state.pivot.x = canvas.width / 2;
    state.pivot.y = canvas.height * 0.38;
  }

  /* ==========================================================================
     Loop Principal a 60 FPS
     ========================================================================== */
  let lastTime = performance.now();
  let frameCount = 0;

  function mainLoop(now) {
    requestAnimationFrame(mainLoop);

    const dtMs = now - lastTime;
    lastTime = now;

    if (state.isRunning && !state.isDragging) {
      stepSimulation();
    }

    renderPendulums();

    frameCount++;
    if (frameCount % 2 === 0) {
      renderPhaseSpaceGraph();
      renderLyapunovGraph();
    }
  }

  /* ==========================================================================
     Inicialização do Laboratório
     ========================================================================== */
  function init() {
    handleResize();
    setupInteractions();
    loadPreset('moderate');
    requestAnimationFrame(mainLoop);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
