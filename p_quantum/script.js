/**
 * ============================================================================
 * QUANTUMLAB 1D — MOTOR QUÂNTICO NUMÉRICO & RENDERIZADOR TDSE
 * Resolução da Equação de Schrödinger Dependente do Tempo (1D TDSE)
 * Método Implícito Crank-Nicolson Unitário com Algoritmo de Thomas (TDMA) Complexo O(N)
 * ============================================================================
 * Autor: Sandro Junior Hoffmann de Oliveira (@sanjrhoff)
 * Formação: Bacharel em Física (UFES) & Graduando em TSI (IFES)
 * ============================================================================
 */

(function () {
  'use strict';

  /* ==========================================================================
     1. PARÂMETROS FÍSICOS E DISCRETIZAÇÃO DA MALHA
     ========================================================================== */
  const N = 600;                     // Número de nós na grade espacial 1D
  const DX = 0.25;                   // Espaçamento espacial dx (Domínio L = (N-1)*dx ≈ 149.75)
  const L = (N - 1) * DX;            // Comprimento total da cavidade unidimensional
  const SUB_STEPS = 8;               // Subpassos Crank-Nicolson por frame de renderização
  const DT_SUB = 0.010;              // Intervalo de tempo por subpasso dt
  const DT_FRAME = SUB_STEPS * DT_SUB; // dt total por frame (~0.080)
  const HBAR = 1.0;                  // Constante de Planck reduzida (unidades atômicas)
  const MASS = 1.0;                  // Massa da partícula

  // Coeficiente tridiagonal de Crank-Nicolson: alpha = dt / (4 * dx^2)
  const ALPHA = DT_SUB / (4.0 * DX * DX);

  /* ==========================================================================
     2. ARRAYS TIPADOS DE ALTA PERFORMANCE (ZERO GARBAGE COLLECTION NO LOOP)
     ========================================================================== */
  const psiR = new Float64Array(N);       // Parte Real de ψ(x, t)
  const psiI = new Float64Array(N);       // Parte Imaginária de ψ(x, t)
  const V = new Float64Array(N);          // Potencial Scalar Real V(x)
  const W = new Float64Array(N);          // Potencial Óptico Imaginário de Absorção -i W(x)

  // Vetores de trabalho do Algoritmo de Thomas (TDMA) Tridiagonal Complexo
  const cPrimeR = new Float64Array(N);
  const cPrimeI = new Float64Array(N);
  const bPrimeR = new Float64Array(N);
  const bPrimeI = new Float64Array(N);

  /* ==========================================================================
     3. ESTADO DA SIMULAÇÃO E INTERFACE
     ========================================================================== */
  const state = {
    isRunning: true,
    shadingMode: 'density-phase', // 'density-phase', 'density-pure', 'real-imag'
    currentPreset: 'tunneling',
    pmlActive: true,

    // Parâmetros do Pacote Gaussiano (Unidades Atômicas Calibradas: k < k_Nyquist)
    k0: 2.6,               // Momento linear incidente (k0) -> E0 = 0.5 * k0^2 ≈ 3.38 u
    sigmaFrac: 0.038,      // Largura σ como fração de L
    x0Frac: 0.20,          // Posição de injeção x0 como fração de L

    // Ferramentas de Pincel
    activeTool: 'brush',   // 'brush' ou 'eraser'
    brushV: 4.5,           // Altura de potencial para pintura
    brushRadiusPx: 14,     // Raio do pincel no canvas

    // Geometria Paramétrica de Barreira Calibrada (Tunelamento Físico Visível T ≈ 20%)
    barrierWidthFrac: 0.005, // Espessura a ≈ 0.75 u (4 nós)
    barrierHeight: 4.0,      // Altura V0 = 4.0 u > E0 (E0 ≈ 3.38 u, Barreira Quântica)

    // Telemetria Quântica
    norm: 1.0,
    transmission: 0.0,
    reflection: 0.0,
    barrierProb: 0.0,
    expectedX: 0.0,
    expectedP: 0.0,
    deltaX: 0.0,
    deltaP: 0.0,
    heisenbergProduct: 0.5,
    expectedE: 3.92,
    barrierXa: 0.49 * L,
    barrierXb: 0.51 * L,

    // Desempenho
    fps: 60.0,
    lastFrameTime: performance.now(),
    frameCount: 0,
    fpsTimer: performance.now(),

    // Histórico de Detecção T(t)
    detectorHistory: new Float32Array(150),
    detectorHead: 0,
    detectorCount: 0
  };

  /* ==========================================================================
     4. ELEMENTOS DO DOM
     ========================================================================== */
  const mainCanvas = document.getElementById('quantum-canvas');
  const ctx = mainCanvas.getContext('2d');
  const overlayCanvas = document.getElementById('overlay-canvas');
  const oCtx = overlayCanvas.getContext('2d');
  const detectorCanvas = document.getElementById('detector-canvas');
  const dCtx = detectorCanvas ? detectorCanvas.getContext('2d') : null;

  // Header Telemetry & Status
  const statNorm = document.getElementById('stat-norm');
  const statHeisenberg = document.getElementById('stat-heisenberg');
  const statFps = document.getElementById('stat-fps');
  const simStatusBadge = document.getElementById('sim-status-badge');
  const simStatusText = document.getElementById('sim-status-text');

  // Playback Buttons
  const btnTogglePlay = document.getElementById('btn-toggle-play');
  const iconPlay = document.getElementById('icon-play');
  const btnStep = document.getElementById('btn-step');
  const btnResetPacket = document.getElementById('btn-reset-packet');
  const btnClearPotential = document.getElementById('btn-clear-potential');
  const btnFirePacket = document.getElementById('btn-fire-packet');

  // Sliders & Values
  const sliderK0 = document.getElementById('slider-k0');
  const valK0 = document.getElementById('val-k0');
  const valKineticEnergy = document.getElementById('val-kinetic-energy');

  const sliderSigma = document.getElementById('slider-sigma');
  const valSigma = document.getElementById('val-sigma');
  const valInitialDeltaX = document.getElementById('val-initial-delta-x');

  const sliderX0 = document.getElementById('slider-x0');
  const valX0 = document.getElementById('val-x0');

  const sliderBrushV = document.getElementById('slider-brush-v');
  const valBrushV = document.getElementById('val-brush-v');
  const sliderBrushRadius = document.getElementById('slider-brush-radius');
  const valBrushRadius = document.getElementById('val-brush-radius');

  const sliderBarrierWidth = document.getElementById('slider-barrier-width');
  const valBarrierWidth = document.getElementById('val-barrier-width');
  const sliderBarrierHeight = document.getElementById('slider-barrier-height');
  const valBarrierHeight = document.getElementById('val-barrier-height');

  const btnApplyBarrier = document.getElementById('btn-apply-barrier');
  const btnApplyDoubleBarrier = document.getElementById('btn-apply-double-barrier');
  const togglePml = document.getElementById('toggle-pml');

  // Ferramentas de Pincel
  const toolBrush = document.getElementById('tool-brush-potential');
  const toolEraser = document.getElementById('tool-eraser-potential');

  // Telemetria Direita
  const metricTPct = document.getElementById('metric-t-pct');
  const metricTVal = document.getElementById('metric-t-val');
  const barT = document.getElementById('bar-t');
  const metricRPct = document.getElementById('metric-r-pct');
  const metricRVal = document.getElementById('metric-r-val');
  const barR = document.getElementById('bar-r');
  const metricTPlusR = document.getElementById('metric-t-plus-r');
  const unitCheckPill = document.getElementById('unit-check-pill');

  const obsX = document.getElementById('obs-x');
  const obsP = document.getElementById('obs-p');
  const obsDeltaX = document.getElementById('obs-delta-x');
  const obsDeltaP = document.getElementById('obs-delta-p');
  const heisenbergProduct = document.getElementById('heisenberg-product');
  const heisenbergBadge = document.getElementById('heisenberg-badge');

  // Overlays Flutuantes no Canvas
  const hudValT = document.getElementById('hud-val-t');
  const hudValR = document.getElementById('hud-val-r');
  const energyLineHud = document.getElementById('energy-line-hud');
  const hudEnergyVal = document.getElementById('hud-energy-val');
  const cursorQuantumHud = document.getElementById('cursor-quantum-hud');
  const cursorX = document.getElementById('cursor-x');
  const cursorProb = document.getElementById('cursor-prob');
  const cursorV = document.getElementById('cursor-v');
  const cursorPhase = document.getElementById('cursor-phase');
  const phaseLegendHud = document.getElementById('phase-legend-hud');

  // Dropdowns
  const btnPresetsToggle = document.getElementById('btn-presets-toggle');
  const presetsDropdownMenu = document.getElementById('presets-dropdown-menu');
  const btnShadingToggle = document.getElementById('btn-shading-toggle');
  const shadingDropdownMenu = document.getElementById('shading-dropdown-menu');

  // Ações Auxiliares
  const btnClearDetector = document.getElementById('btn-clear-detector');
  const btnCopyTelemetry = document.getElementById('btn-copy-telemetry');
  const toastEl = document.getElementById('quantum-toast');
  const footerNodes = document.getElementById('footer-nodes');
  const footerPml = document.getElementById('footer-pml');

  /* ==========================================================================
     5. INICIALIZAÇÃO DA CAMADA ABSORVEDORA ÓPTICA (PML / CAP)
     ========================================================================== */
  function updateAbsorbingLayer() {
    const N_ABS = 40;
    const W0 = 8.0;

    for (let j = 0; j < N; j++) {
      if (!state.pmlActive) {
        W[j] = 0.0;
      } else if (j < N_ABS) {
        const factor = (N_ABS - j) / N_ABS;
        W[j] = W0 * factor * factor;
      } else if (j > N - 1 - N_ABS) {
        const factor = (j - (N - 1 - N_ABS)) / N_ABS;
        W[j] = W0 * factor * factor;
      } else {
        W[j] = 0.0;
      }
    }

    if (footerPml) {
      footerPml.textContent = state.pmlActive ? 'Ativo' : 'Desativado';
    }
  }

  /* ==========================================================================
     6. CRIAÇÃO DE PACOTES QUÂNTICOS & CONDIÇÕES INICIAIS
     ========================================================================== */
  function initializeGaussianPacket(x0 = state.x0Frac * L, sigma = state.sigmaFrac * L, k0 = state.k0) {
    const normFactor = 1.0 / Math.pow(Math.PI * sigma * sigma, 0.25);

    for (let j = 0; j < N; j++) {
      const x = j * DX;
      const diff = x - x0;
      const env = normFactor * Math.exp(- (diff * diff) / (2.0 * sigma * sigma));
      const phase = k0 * diff;

      psiR[j] = env * Math.cos(phase);
      psiI[j] = env * Math.sin(phase);
    }

    // Condição de contorno de Dirichlet nas extremidades
    psiR[0] = 0.0;
    psiI[0] = 0.0;
    psiR[N - 1] = 0.0;
    psiI[N - 1] = 0.0;

    normalizeWaveFunction();
  }

  function normalizeWaveFunction() {
    let sum = 0.0;
    for (let j = 0; j < N; j++) {
      sum += (psiR[j] * psiR[j] + psiI[j] * psiI[j]) * DX;
    }

    if (sum > 1e-12) {
      const invNorm = 1.0 / Math.sqrt(sum);
      for (let j = 0; j < N; j++) {
        psiR[j] *= invNorm;
        psiI[j] *= invNorm;
      }
    }
  }

  /* ==========================================================================
     7. SOLUCIONADOR CRANK-NICOLSON ESTÁVEL VIA TDMA COMPLEXO EM O(N)
     ========================================================================== */
  function stepCrankNicolson() {
    // Forward Sweep (Eliminação Progressiva de Thomas): j = 1 até N-2
    cPrimeR[0] = 0.0;
    cPrimeI[0] = 0.0;
    bPrimeR[0] = 0.0;
    bPrimeI[0] = 0.0;

    const alpha = ALPHA;
    const halfDt = DT_SUB * 0.5;

    for (let j = 1; j < N - 1; j++) {
      const Vj = V[j];
      const Wj = W[j];

      // Diagonal principal d_j = (1 + halfDt * W_j) + i * (2*alpha + halfDt * V_j)
      const dR = 1.0 + halfDt * Wj;
      const dI = 2.0 * alpha + halfDt * Vj;

      // Vetor do lado direito b_j^n = (1 - halfDt * W_j - i(2*alpha + halfDt * V_j)) psi_j + i*alpha (psi_{j-1} + psi_{j+1})
      const sumNeighborsR = psiR[j - 1] + psiR[j + 1];
      const sumNeighborsI = psiI[j - 1] + psiI[j + 1];

      // i * alpha * (sumR + i*sumI) = -alpha*sumI + i*alpha*sumR
      const bR = (1.0 - halfDt * Wj) * psiR[j] + (2.0 * alpha + halfDt * Vj) * psiI[j] - alpha * sumNeighborsI;
      const bI = (1.0 - halfDt * Wj) * psiI[j] - (2.0 * alpha + halfDt * Vj) * psiR[j] + alpha * sumNeighborsR;

      // Denominador: denom_j = d_j - a_j * cPrime_{j-1}
      // Como a_j = -i * alpha, a_j * c' = -i*alpha*(c'R + i*c'I) = alpha*c'I - i*alpha*c'R
      const denomR = dR - alpha * cPrimeI[j - 1];
      const denomI = dI + alpha * cPrimeR[j - 1];
      const denMagSq = denomR * denomR + denomI * denomI;
      const invDen = 1.0 / denMagSq;

      // cPrime_j = c_j / denom_j, com c_j = -i * alpha
      // (-i*alpha) / (denR + i*denI) = [ -alpha*denI - i*alpha*denR ] / denMagSq
      cPrimeR[j] = (-alpha * denomI) * invDen;
      cPrimeI[j] = (-alpha * denomR) * invDen;

      // bPrime_j = (b_j - a_j * bPrime_{j-1}) / denom_j
      // a_j * b' = alpha*b'I - i*alpha*b'R
      const numR = bR - alpha * bPrimeI[j - 1];
      const numI = bI + alpha * bPrimeR[j - 1];

      // Divisão complexa: num / denom
      bPrimeR[j] = (numR * denomR + numI * denomI) * invDen;
      bPrimeI[j] = (numI * denomR - numR * denomI) * invDen;
    }

    // Condição de Dirichlet na borda direita: psi_{N-1} = 0
    psiR[N - 1] = 0.0;
    psiI[N - 1] = 0.0;

    // Back Substitution (Substituição Reversa de Thomas): j = N-2 até 1
    for (let j = N - 2; j >= 1; j--) {
      // psi_j = bPrime_j - cPrime_j * psi_{j+1}
      const pNextR = psiR[j + 1];
      const pNextI = psiI[j + 1];

      const prodR = cPrimeR[j] * pNextR - cPrimeI[j] * pNextI;
      const prodI = cPrimeR[j] * pNextI + cPrimeI[j] * pNextR;

      psiR[j] = bPrimeR[j] - prodR;
      psiI[j] = bPrimeI[j] - prodI;
    }

    // Condição de Dirichlet na borda esquerda
    psiR[0] = 0.0;
    psiI[0] = 0.0;
  }

  /* ==========================================================================
     8. CÁLCULO DE OBSERVÁVEIS QUÂNTICOS & TELEMETRIA
     ========================================================================== */
  function computeObservables() {
    let norm = 0.0;
    let expX = 0.0;
    let expX2 = 0.0;
    let expP = 0.0;
    let expP2 = 0.0;
    let expPotential = 0.0;

    // Detectar região da barreira se não for preset de estado ligado (poço harmônico/infinito)
    const isBoundState = (state.currentPreset === 'harmonic-oscillator' || state.currentPreset === 'infinite-well');

    let ja = Math.floor(N * 0.48);
    let jb = Math.floor(N * 0.52);

    if (!isBoundState) {
      if (state.barrierXa > 0 && state.barrierXb > state.barrierXa) {
        ja = Math.max(1, Math.floor(state.barrierXa / DX));
        jb = Math.min(N - 2, Math.floor(state.barrierXb / DX));
      } else {
        let barrierStart = -1;
        let barrierEnd = -1;
        for (let j = 0; j < N; j++) {
          if (Math.abs(V[j]) > 0.4) {
            if (barrierStart === -1) barrierStart = j;
            barrierEnd = j;
          }
        }
        if (barrierStart !== -1 && (barrierEnd - barrierStart) < N * 0.40) {
          ja = Math.max(1, barrierStart);
          jb = Math.min(N - 2, barrierEnd);
          state.barrierXa = ja * DX;
          state.barrierXb = jb * DX;
        }
      }
    } else {
      state.barrierXa = 0;
      state.barrierXb = 0;
    }

    let reflSum = 0.0;
    let transSum = 0.0;
    let barSum = 0.0;

    const twelveDx = 12.0 * DX;

    for (let j = 0; j < N; j++) {
      const pr = psiR[j];
      const pi = psiI[j];
      const probDense = pr * pr + pi * pi;
      const dP = probDense * DX;

      norm += dP;

      const x = j * DX;
      expX += x * dP;
      expX2 += (x * x) * dP;
      expPotential += V[j] * dP;

      // Reflexão, Transmissão e Probabilidade Intrabarreira
      if (!isBoundState) {
        if (j < ja) {
          reflSum += dP;
        } else if (j > jb) {
          transSum += dP;
        } else {
          barSum += dP;
        }
      }

      // Observáveis de Momento Linear (derivadas espaciais de 4ª ordem O(dx^4))
      if (j >= 2 && j < N - 2) {
        const dPsiR_dx = (-psiR[j + 2] + 8.0 * psiR[j + 1] - 8.0 * psiR[j - 1] + psiR[j - 2]) / twelveDx;
        const dPsiI_dx = (-psiI[j + 2] + 8.0 * psiI[j + 1] - 8.0 * psiI[j - 1] + psiI[j - 2]) / twelveDx;

        // <p> = ∫ (psiR * dPsiI/dx - psiI * dPsiR/dx) dx
        expP += (pr * dPsiI_dx - pi * dPsiR_dx) * DX;

        // <p^2> = ∫ (|dpsi/dx|^2) dx
        expP2 += (dPsiR_dx * dPsiR_dx + dPsiI_dx * dPsiI_dx) * DX;
      }
    }

    state.norm = norm;

    if (norm > 1e-9) {
      if (isBoundState) {
        state.reflection = 0.0;
        state.transmission = 0.0;
        state.barrierProb = 1.0;
      } else {
        state.reflection = reflSum / norm;
        state.transmission = transSum / norm;
        state.barrierProb = barSum / norm;
      }

      state.expectedX = expX / norm;
      const varX = (expX2 / norm) - (state.expectedX * state.expectedX);
      state.deltaX = Math.sqrt(Math.max(0.0, varX));

      state.expectedP = expP / norm;
      const varP = (expP2 / norm) - (state.expectedP * state.expectedP);
      state.deltaP = Math.sqrt(Math.max(0.0, varP));

      state.heisenbergProduct = state.deltaX * state.deltaP;
      // Energia total média <E> = <T> + <V> = 0.5 * <p^2> + <V>
      state.expectedE = (0.5 * expP2 + expPotential) / norm;
    } else {
      state.reflection = 0.0;
      state.transmission = 0.0;
      state.barrierProb = 0.0;
    }

    // Atualizar buffer histórico do detector T(t)
    state.detectorHistory[state.detectorHead] = state.transmission;
    state.detectorHead = (state.detectorHead + 1) % state.detectorHistory.length;
    if (state.detectorCount < state.detectorHistory.length) {
      state.detectorCount++;
    }
  }

  /* ==========================================================================
     9. ATUALIZAÇÃO DO DOM & INTERFACE DE TELEMETRIA
     ========================================================================== */
  function updateTelemetryUI() {
    if (statNorm) statNorm.textContent = state.norm.toFixed(6);

    if (statHeisenberg) {
      statHeisenberg.textContent = `${state.heisenbergProduct.toFixed(3)} ℏ`;
      if (state.heisenbergProduct < 0.490) {
        statHeisenberg.classList.add('text-amber');
        statHeisenberg.classList.remove('text-bright');
      } else {
        statHeisenberg.classList.remove('text-amber');
        statHeisenberg.classList.add('text-bright');
      }
    }

    if (statFps) statFps.textContent = state.fps.toFixed(1);

    const isBound = (state.currentPreset === 'harmonic-oscillator' || state.currentPreset === 'infinite-well');

    if (isBound) {
      const modeLabel = state.currentPreset === 'harmonic-oscillator' ? 'Oscilador Harmônico' : 'Poço Infinito';
      if (hudValT) hudValT.textContent = '0.0%';
      if (hudValR) hudValR.textContent = '100% Confinado';

      if (metricTPct) metricTPct.textContent = '0.0%';
      if (metricRPct) metricRPct.textContent = '100%';
      if (metricTVal) metricTVal.textContent = '0.00000';
      if (metricRVal) metricRVal.textContent = state.norm.toFixed(5);

      if (barT) barT.style.width = '0%';
      if (barR) barR.style.width = '100%';

      if (metricTPlusR) {
        metricTPlusR.textContent = `${state.norm.toFixed(5)} (${modeLabel})`;
      }
    } else {
      // Overlays de Tunelamento (T e R)
      const tPct = (state.transmission * 100).toFixed(1) + '%';
      const rPct = (state.reflection * 100).toFixed(1) + '%';

      if (hudValT) hudValT.textContent = tPct;
      if (hudValR) hudValR.textContent = rPct;

      if (metricTPct) metricTPct.textContent = tPct;
      if (metricRPct) metricRPct.textContent = rPct;
      if (metricTVal) metricTVal.textContent = state.transmission.toFixed(5);
      if (metricRVal) metricRVal.textContent = state.reflection.toFixed(5);

      if (barT) barT.style.width = Math.min(100, state.transmission * 100) + '%';
      if (barR) barR.style.width = Math.min(100, state.reflection * 100) + '%';

      if (metricTPlusR) {
        const sum = state.transmission + state.reflection + state.barrierProb;
        metricTPlusR.textContent = sum.toFixed(5);
      }
    }

    // Observáveis de Ehrenfest
    if (obsX) obsX.textContent = `${state.expectedX.toFixed(1)} u`;
    if (obsP) obsP.textContent = `${state.expectedP.toFixed(1)} rad/u`;
    if (obsDeltaX) obsDeltaX.textContent = `${state.deltaX.toFixed(2)} u`;
    if (obsDeltaP) obsDeltaP.textContent = `${state.deltaP.toFixed(2)} rad/u`;

    if (heisenbergProduct) {
      heisenbergProduct.textContent = state.heisenbergProduct.toFixed(3);
    }

    if (heisenbergBadge) {
      if (state.heisenbergProduct <= 0.550) {
        heisenbergBadge.textContent = 'Mínima Incerteza';
        heisenbergBadge.style.color = 'var(--energy-emerald)';
      } else {
        heisenbergBadge.textContent = 'Dispersão de Onda';
        heisenbergBadge.style.color = 'var(--text-dim)';
      }
    }

    // Indicador Flutuante de Energia Média <E>
    if (hudEnergyVal) {
      hudEnergyVal.textContent = `${state.expectedE.toFixed(1)} u`;
    }

    // Posicionamento vertical dinâmico da tag de energia
    if (energyLineHud && mainCanvas) {
      const canvasH = mainCanvas.height;
      const baselineY = canvasH * 0.82;
      const vScale = canvasH * 0.055;
      const energyY = Math.max(20, Math.min(canvasH - 40, baselineY - state.expectedE * vScale));
      energyLineHud.style.top = `${(energyY / canvasH) * 100}%`;
    }
  }

  /* ==========================================================================
     10. RENDERIZAÇÃO GRÁFICA NO CANVAS PRINCIPAL
     ========================================================================== */
  function renderMainCanvas() {
    const w = mainCanvas.width;
    const h = mainCanvas.height;

    // Limpar o viewport com a cor do vácuo
    ctx.fillStyle = '#070709';
    ctx.fillRect(0, 0, w, h);

    const baselineY = h * 0.82;
    const vScale = h * 0.055;          // Escala vertical para potenciais V(x)
    const probScale = h * 2.8;         // Escala de visualização da probabilidade |psi|^2

    // 1. Grade Cartesiana Técnica Subliminar
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    const gridCols = 12;
    const gridRows = 6;
    for (let c = 1; c < gridCols; c++) {
      const gx = (w / gridCols) * c;
      ctx.beginPath();
      ctx.moveTo(gx, 0);
      ctx.lineTo(gx, h);
      ctx.stroke();
    }
    for (let r = 1; r < gridRows; r++) {
      const gy = (h / gridRows) * r;
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.lineTo(w, gy);
      ctx.stroke();
    }

    // Linha de Base Zero
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.beginPath();
    ctx.moveTo(0, baselineY);
    ctx.lineTo(w, baselineY);
    ctx.stroke();

    // 2. Potencial V(x) — Bloco Âmbar com Hachura em Zonas Proibidas
    ctx.beginPath();
    let hasPotential = false;
    ctx.moveTo(0, baselineY);

    for (let j = 0; j < N; j++) {
      const px = (j / (N - 1)) * w;
      const py = baselineY - V[j] * vScale;
      ctx.lineTo(px, py);
      if (Math.abs(V[j]) > 0.05) hasPotential = true;
    }
    ctx.lineTo(w, baselineY);
    ctx.closePath();

    if (hasPotential) {
      ctx.fillStyle = 'rgba(245, 158, 11, 0.22)';
      ctx.fill();

      // Linha de contorno do topo do potencial
      ctx.lineWidth = 2.0;
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.90)';
      ctx.beginPath();
      for (let j = 0; j < N; j++) {
        const px = (j / (N - 1)) * w;
        const py = baselineY - V[j] * vScale;
        if (j === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }

    // 3. Camada Absorvedora PML nas Extremidades
    if (state.pmlActive) {
      const pmlPixelWidth = (40 / N) * w;
      const gradLeft = ctx.createLinearGradient(0, 0, pmlPixelWidth, 0);
      gradLeft.addColorStop(0, 'rgba(16, 185, 129, 0.16)');
      gradLeft.addColorStop(1, 'rgba(16, 185, 129, 0.0)');
      ctx.fillStyle = gradLeft;
      ctx.fillRect(0, 0, pmlPixelWidth, h);

      const gradRight = ctx.createLinearGradient(w - pmlPixelWidth, 0, w, 0);
      gradRight.addColorStop(0, 'rgba(16, 185, 129, 0.0)');
      gradRight.addColorStop(1, 'rgba(16, 185, 129, 0.16)');
      ctx.fillStyle = gradRight;
      ctx.fillRect(w - pmlPixelWidth, 0, pmlPixelWidth, h);
    }

    // 4. Linha de Energia Total Média <E>
    const energyY = baselineY - state.expectedE * vScale;
    ctx.save();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#10b981';
    ctx.setLineDash([6, 5]);
    ctx.beginPath();
    ctx.moveTo(0, energyY);
    ctx.lineTo(w, energyY);
    ctx.stroke();
    ctx.restore();

    // 5. Renderização da Função de Onda ψ(x, t) Conforme o Modo Selecionado
    if (state.shadingMode === 'density-phase') {
      renderDensityAndPhase(w, baselineY, probScale);
    } else if (state.shadingMode === 'density-pure') {
      renderPureDensity(w, baselineY, probScale);
    } else if (state.shadingMode === 'real-imag') {
      renderRealAndImaginary(w, baselineY, h);
    }
  }

  /**
   * Renderização Modo 1: Densidade |ψ|² com Espectro HSL Contínuo de Fase arg(ψ)
   */
  function renderDensityAndPhase(w, baselineY, probScale) {
    const colWidth = Math.max(1.0, w / (N - 1));

    for (let j = 0; j < N - 1; j++) {
      const pr = psiR[j];
      const pi = psiI[j];
      const prob = pr * pr + pi * pi;

      if (prob < 1e-6) continue;

      const px = (j / (N - 1)) * w;
      const height = prob * probScale;
      const py = baselineY - height;

      // Fase quântica θ = atan2(Im, Re) ∈ [-π, π]
      const phase = Math.atan2(pi, pr);
      // Mapeamento espectral: [-π, π] -> [0°, 360°]
      const hue = ((phase + Math.PI) / (2.0 * Math.PI)) * 360.0;
      // Luminância com decay suave
      const lightness = Math.min(65, 35 + prob * 120.0);

      ctx.fillStyle = `hsl(${hue}, 90%, ${lightness}%)`;
      ctx.fillRect(px, py, colWidth + 0.8, height);
    }

    // Crista superior suave com halo ciano neon
    ctx.lineWidth = 2.0;
    ctx.strokeStyle = '#22d3ee';
    ctx.shadowColor = 'rgba(6, 182, 212, 0.75)';
    ctx.shadowBlur = 8;
    ctx.beginPath();

    let started = false;
    for (let j = 0; j < N; j++) {
      const px = (j / (N - 1)) * w;
      const prob = psiR[j] * psiR[j] + psiI[j] * psiI[j];
      const py = baselineY - prob * probScale;

      if (!started) {
        ctx.moveTo(px, py);
        started = true;
      } else {
        ctx.lineTo(px, py);
      }
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  /**
   * Renderização Modo 2: Densidade Pura |ψ|² com Gradiente Translúcido Ciano
   */
  function renderPureDensity(w, baselineY, probScale) {
    ctx.beginPath();
    ctx.moveTo(0, baselineY);

    for (let j = 0; j < N; j++) {
      const px = (j / (N - 1)) * w;
      const prob = psiR[j] * psiR[j] + psiI[j] * psiI[j];
      const py = baselineY - prob * probScale;
      ctx.lineTo(px, py);
    }
    ctx.lineTo(w, baselineY);
    ctx.closePath();

    const grad = ctx.createLinearGradient(0, baselineY - probScale * 0.15, 0, baselineY);
    grad.addColorStop(0, 'rgba(6, 182, 212, 0.65)');
    grad.addColorStop(0.5, 'rgba(6, 182, 212, 0.25)');
    grad.addColorStop(1, 'rgba(6, 182, 212, 0.02)');
    ctx.fillStyle = grad;
    ctx.fill();

    // Contorno Neon
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#06b6d4';
    ctx.shadowColor = 'rgba(6, 182, 212, 0.8)';
    ctx.shadowBlur = 10;
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  /**
   * Renderização Modo 3: Curvas Explícitas de Re(ψ) (Azul) e Im(ψ) (Rosa)
   */
  function renderRealAndImaginary(w, baselineY, h) {
    const ampScale = h * 0.35;

    // Envoltória de densidade pontilhada de referência
    ctx.lineWidth = 1.0;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    for (let j = 0; j < N; j++) {
      const px = (j / (N - 1)) * w;
      const prob = psiR[j] * psiR[j] + psiI[j] * psiI[j];
      const py = baselineY - prob * (h * 2.5);
      if (j === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Curva da Parte Real Re(ψ) — Azul Celeste
    ctx.lineWidth = 2.0;
    ctx.strokeStyle = '#38bdf8';
    ctx.beginPath();
    for (let j = 0; j < N; j++) {
      const px = (j / (N - 1)) * w;
      const py = baselineY - psiR[j] * ampScale;
      if (j === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Curva da Parte Imaginária Im(ψ) — Magenta Vibrante
    ctx.lineWidth = 2.0;
    ctx.strokeStyle = '#f43f5e';
    ctx.beginPath();
    for (let j = 0; j < N; j++) {
      const px = (j / (N - 1)) * w;
      const py = baselineY - psiI[j] * ampScale;
      if (j === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }

  /* ==========================================================================
     11. MINI-CANVAS HISTÓRICO DO DETECTOR T(t)
     ========================================================================== */
  function renderDetectorGraph() {
    if (!dCtx || !detectorCanvas) return;

    const dw = detectorCanvas.width;
    const dh = detectorCanvas.height;

    dCtx.fillStyle = '#070709';
    dCtx.fillRect(0, 0, dw, dh);

    // Grade sutil
    dCtx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    dCtx.lineWidth = 1;
    dCtx.beginPath();
    dCtx.moveTo(0, dh * 0.25); dCtx.lineTo(dw, dh * 0.25);
    dCtx.moveTo(0, dh * 0.5);  dCtx.lineTo(dw, dh * 0.5);
    dCtx.moveTo(0, dh * 0.75); dCtx.lineTo(dw, dh * 0.75);
    dCtx.stroke();

    const count = state.detectorCount;
    if (count < 2) return;

    const hist = state.detectorHistory;
    const len = hist.length;
    const startIndex = (state.detectorHead - count + len) % len;

    // Área sob a curva de transmissão
    dCtx.beginPath();
    dCtx.moveTo(0, dh);

    for (let i = 0; i < count; i++) {
      const idx = (startIndex + i) % len;
      const val = hist[idx];
      const x = (i / (len - 1)) * dw;
      const y = dh - (val * (dh - 12));
      dCtx.lineTo(x, y);
    }

    dCtx.lineTo(((count - 1) / (len - 1)) * dw, dh);
    dCtx.closePath();

    const grad = dCtx.createLinearGradient(0, 0, 0, dh);
    grad.addColorStop(0, 'rgba(6, 182, 212, 0.35)');
    grad.addColorStop(1, 'rgba(6, 182, 212, 0.02)');
    dCtx.fillStyle = grad;
    dCtx.fill();

    // Linha do gráfico
    dCtx.lineWidth = 1.8;
    dCtx.strokeStyle = '#06b6d4';
    dCtx.beginPath();
    for (let i = 0; i < count; i++) {
      const idx = (startIndex + i) % len;
      const val = hist[idx];
      const x = (i / (len - 1)) * dw;
      const y = dh - (val * (dh - 12));
      if (i === 0) dCtx.moveTo(x, y);
      else dCtx.lineTo(x, y);
    }
    dCtx.stroke();
  }

  /* ==========================================================================
     12. CANVAS OVERLAY (PINCEL, TRACKING & BARREIRAS)
     ========================================================================== */
  let mouse = {
    x: 0,
    y: 0,
    isDown: false,
    inside: false
  };

  function renderOverlay() {
    const w = overlayCanvas.width;
    const h = overlayCanvas.height;

    oCtx.clearRect(0, 0, w, h);

    const isBound = (state.currentPreset === 'harmonic-oscillator' || state.currentPreset === 'infinite-well');

    // Marcadores de início e fim da barreira (apenas em espalhamento por barreira localizada)
    if (!isBound && state.barrierXa > 0 && state.barrierXb > state.barrierXa && (state.barrierXb - state.barrierXa) < 0.35 * L) {
      const xaPx = (state.barrierXa / L) * w;
      const xbPx = (state.barrierXb / L) * w;

      oCtx.lineWidth = 1;
      oCtx.setLineDash([4, 4]);
      oCtx.strokeStyle = 'rgba(245, 158, 11, 0.45)';

      oCtx.beginPath();
      oCtx.moveTo(xaPx, 0); oCtx.lineTo(xaPx, h);
      oCtx.moveTo(xbPx, 0); oCtx.lineTo(xbPx, h);
      oCtx.stroke();
      oCtx.setLineDash([]);
    }

    // Se o mouse estiver sobre o canvas, desenha a mira do pincel
    if (mouse.inside) {
      oCtx.save();
      oCtx.beginPath();
      const r = state.brushRadiusPx;
      oCtx.arc(mouse.x, mouse.y, r, 0, Math.PI * 2);

      if (state.activeTool === 'brush') {
        oCtx.strokeStyle = 'rgba(245, 158, 11, 0.85)';
        oCtx.fillStyle = 'rgba(245, 158, 11, 0.15)';
      } else {
        oCtx.strokeStyle = 'rgba(239, 68, 68, 0.85)';
        oCtx.fillStyle = 'rgba(239, 68, 68, 0.15)';
      }

      oCtx.lineWidth = 1.5;
      oCtx.fill();
      oCtx.stroke();

      // Linha vertical guia
      oCtx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
      oCtx.lineWidth = 1;
      oCtx.beginPath();
      oCtx.moveTo(mouse.x, 0);
      oCtx.lineTo(mouse.x, h);
      oCtx.stroke();
      oCtx.restore();
    }
  }

  /* ==========================================================================
     13. INTERAÇÃO DIRETA DE PINCEL DE POTENCIAL V(x)
     ========================================================================== */
  function applyBrushAt(canvasX) {
    const frac = canvasX / overlayCanvas.width;
    const centerNode = Math.floor(frac * (N - 1));
    const radiusNodes = Math.max(2, Math.floor((state.brushRadiusPx / overlayCanvas.width) * N));

    const jMin = Math.max(1, centerNode - radiusNodes);
    const jMax = Math.min(N - 2, centerNode + radiusNodes);

    for (let j = jMin; j <= jMax; j++) {
      const dist = Math.abs(j - centerNode);
      const factor = 0.5 * (1.0 + Math.cos((Math.PI * dist) / radiusNodes));

      if (state.activeTool === 'brush') {
        V[j] = V[j] * (1.0 - factor) + state.brushV * factor;
      } else if (state.activeTool === 'eraser') {
        V[j] *= (1.0 - factor * 0.85);
      }
    }
  }

  function setupCanvasInteractions() {
    function updateMousePos(e) {
      const rect = overlayCanvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;

      mouse.x = ((clientX - rect.left) / rect.width) * overlayCanvas.width;
      mouse.y = ((clientY - rect.top) / rect.height) * overlayCanvas.height;
      mouse.inside = true;

      // Atualizar HUD flutuante do cursor
      const nodeIndex = Math.min(N - 1, Math.max(0, Math.floor((mouse.x / overlayCanvas.width) * (N - 1))));
      const pr = psiR[nodeIndex];
      const pi = psiI[nodeIndex];
      const prob = pr * pr + pi * pi;
      const vVal = V[nodeIndex];
      const phase = Math.atan2(pi, pr);

      if (cursorQuantumHud) {
        cursorQuantumHud.style.display = 'flex';
        cursorQuantumHud.style.left = `${clientX - rect.left}px`;
        cursorQuantumHud.style.top = `${clientY - rect.top}px`;

        if (cursorX) cursorX.textContent = `${(nodeIndex * DX).toFixed(1)} u (${((nodeIndex / N) * 100).toFixed(0)}% L)`;
        if (cursorProb) cursorProb.textContent = prob.toFixed(5);
        if (cursorV) cursorV.textContent = `${vVal.toFixed(2)} u`;
        if (cursorPhase) cursorPhase.textContent = `${phase >= 0 ? '+' : ''}${phase.toFixed(2)} rad`;
      }
    }

    overlayCanvas.addEventListener('mousedown', (e) => {
      mouse.isDown = true;
      updateMousePos(e);
      applyBrushAt(mouse.x);
    });

    window.addEventListener('mousemove', (e) => {
      if (mouse.inside) {
        updateMousePos(e);
        if (mouse.isDown) {
          applyBrushAt(mouse.x);
        }
      }
    });

    window.addEventListener('mouseup', () => {
      mouse.isDown = false;
    });

    overlayCanvas.addEventListener('mouseenter', () => {
      mouse.inside = true;
    });

    overlayCanvas.addEventListener('mouseleave', () => {
      mouse.inside = false;
      mouse.isDown = false;
      if (cursorQuantumHud) cursorQuantumHud.style.display = 'none';
    });

    // Suporte a Toque em Tablets / Celulares
    overlayCanvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      mouse.isDown = true;
      mouse.inside = true;
      updateMousePos(e);
      applyBrushAt(mouse.x);
    }, { passive: false });

    overlayCanvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      updateMousePos(e);
      if (mouse.isDown) applyBrushAt(mouse.x);
    }, { passive: false });

    overlayCanvas.addEventListener('touchend', () => {
      mouse.isDown = false;
      mouse.inside = false;
      if (cursorQuantumHud) cursorQuantumHud.style.display = 'none';
    });
  }

  /* ==========================================================================
     14. PRESETS CIENTÍFICOS DIDÁTICOS DE MECÂNICA QUÂNTICA
     ========================================================================== */
  function loadPreset(presetKey) {
    state.currentPreset = presetKey;

    // Atualizar classe active nos itens do dropdown
    if (presetsDropdownMenu) {
      presetsDropdownMenu.querySelectorAll('.dropdown-item').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-preset') === presetKey);
      });
    }

    // Limpar histórico do detector
    state.detectorCount = 0;
    state.detectorHead = 0;

    switch (presetKey) {
      /* --------------------------------------------------------------------
         1. Tunelamento Quântico em Barreira Retangular (E < V0)
         -------------------------------------------------------------------- */
      case 'tunneling': {
        state.k0 = 2.6;            // E0 = 0.5 * k0^2 ≈ 3.38 u
        state.sigmaFrac = 0.038;
        state.x0Frac = 0.20;
        state.pmlActive = true;

        // Limpar potencial
        V.fill(0);

        // Injetar barreira central finita calibrada (T ≈ 20%, R ≈ 80%)
        // Barreira fina de 3 intervalos (a = 0.75 u, 4 nós) e altura V0 = 4.0 u > E0 (E0 ≈ 3.38 u)
        const ja = 298;
        const jb = 301;
        const V0 = 4.0;
        for (let j = ja; j <= jb; j++) {
          V[j] = V0;
        }

        state.barrierWidthFrac = 0.005; // a ≈ 0.75 u (4 nós)
        state.barrierHeight = 4.0;
        state.barrierXa = ja * DX;
        state.barrierXb = jb * DX;

        initializeGaussianPacket();
        showToast('Preset 1 Carregado: Tunelamento Quântico Visível (T ≈ 20%, E < V₀)');
        break;
      }

      /* --------------------------------------------------------------------
         2. Poço Infinito / Partícula na Caixa (Autoestados & Superposição)
         -------------------------------------------------------------------- */
      case 'infinite-well': {
        state.pmlActive = false; // Desativa PML para refletir 100% nas paredes da caixa

        V.fill(0);
        const jLeft = Math.floor(0.20 * N);
        const jRight = Math.floor(0.80 * N);

        for (let j = 0; j < jLeft; j++) V[j] = 80.0;
        for (let j = jRight; j < N; j++) V[j] = 80.0;

        // Iniciar com autoestado estacionário fundamental psi_1(x) = sqrt(2/w) * sin(pi * (x - x1) / w)
        const wellWidth = (jRight - jLeft) * DX;
        const normFactor = Math.sqrt(2.0 / wellWidth);

        psiR.fill(0);
        psiI.fill(0);

        for (let j = jLeft; j <= jRight; j++) {
          const xRel = (j - jLeft) * DX;
          // Superposição de psi_1 e psi_2 coerente
          const psi1 = normFactor * Math.sin((Math.PI * xRel) / wellWidth);
          const psi2 = normFactor * Math.sin((2.0 * Math.PI * xRel) / wellWidth);
          psiR[j] = (psi1 + psi2) / Math.SQRT2;
        }

        state.k0 = 0.0;
        state.sigmaFrac = (wellWidth * 0.3) / L;
        state.x0Frac = 0.50;
        state.barrierXa = 0;
        state.barrierXb = 0;

        normalizeWaveFunction();
        showToast('Preset 2 Carregado: Partícula na Caixa (Superposição Coerente)');
        break;
      }

      /* --------------------------------------------------------------------
         3. Oscilador Harmônico Quântico (Pacote Coerente de Mínima Incerteza)
         -------------------------------------------------------------------- */
      case 'harmonic-oscillator': {
        state.pmlActive = false;
        const omega0 = 0.075;     // Frequência angular calibrada para excelente proporção visual
        const xCenter = L * 0.50;

        // Potencial parabólico harmônico V(x) = 1/2 * m * omega0^2 * (x - x_center)^2
        for (let j = 0; j < N; j++) {
          const x = j * DX;
          const diff = x - xCenter;
          V[j] = 0.5 * omega0 * omega0 * (diff * diff);
        }

        // Estado Coerente de Mínima Incerteza de Glauber:
        // Largura natural do estado fundamental: sigma0 = sqrt(hbar / (m * omega0)) = 1 / sqrt(omega0)
        const sigmaCoherent = 1.0 / Math.sqrt(omega0); // ≈ 3.65 u (sem dispersão e sem breathing!)
        const xDisplaced = xCenter - 25.0;            // Solto do repouso no ponto de retorno clássico x0

        state.k0 = 0.0;
        state.sigmaFrac = sigmaCoherent / L;
        state.x0Frac = xDisplaced / L;
        state.barrierXa = 0;
        state.barrierXb = 0;

        initializeGaussianPacket(xDisplaced, sigmaCoherent, 0.0);
        showToast('Preset 3 Carregado: Oscilador Harmônico Quântico (Glauber Coerente)');
        break;
      }

      /* --------------------------------------------------------------------
         4. Tunelamento Ressonante em Dupla Barreira (Diodo Quântico RTD)
         -------------------------------------------------------------------- */
      case 'resonant-tunneling': {
        state.k0 = 2.6;
        state.sigmaFrac = 0.040;
        state.x0Frac = 0.18;
        state.pmlActive = true;

        V.fill(0);

        // Dupla barreira fina (RTD) com poço quântico central ressonante
        // Barreira 1: nós 288 a 291 (a = 0.75 u)
        // Barreira 2: nós 308 a 311 (a = 0.75 u)
        // Poço central: nós 292 a 307 (largura w = 4.0 u)
        const b1Start = 288;
        const b1End = 291;
        const b2Start = 308;
        const b2End = 311;
        const V0 = 4.2;

        for (let j = b1Start; j <= b1End; j++) V[j] = V0;
        for (let j = b2Start; j <= b2End; j++) V[j] = V0;

        state.barrierWidthFrac = 0.005;
        state.barrierHeight = 4.2;
        state.barrierXa = b1Start * DX;
        state.barrierXb = b2End * DX;

        initializeGaussianPacket();
        showToast('Preset 4 Carregado: Diodo RTD (Tunelamento Ressonante)');
        break;
      }

      /* --------------------------------------------------------------------
         5. Degrau de Potencial (Reflexão Quântica com E > V0)
         -------------------------------------------------------------------- */
      case 'potential-step': {
        state.k0 = 3.0; // E0 ≈ 4.50 u
        state.sigmaFrac = 0.038;
        state.x0Frac = 0.20;
        state.pmlActive = true;

        V.fill(0);
        const jStep = Math.floor(0.50 * N);
        const V0 = 3.2; // E > V0 clássico, porém mecânica quântica prevê reflexão parcial!
        for (let j = jStep; j < N; j++) {
          V[j] = V0;
        }

        state.barrierWidthFrac = 0.50;
        state.barrierHeight = 3.2;
        state.barrierXa = jStep * DX;
        state.barrierXb = (N - 1) * DX;

        initializeGaussianPacket();
        showToast('Preset 5 Carregado: Degrau de Potencial (Reflexão Quântica E > V₀)');
        break;
      }
    }

    if (togglePml) togglePml.checked = state.pmlActive;
    updateAbsorbingLayer();
    syncSlidersWithState();
  }

  function syncSlidersWithState() {
    if (sliderK0) {
      sliderK0.value = state.k0;
      if (valK0) valK0.textContent = `${state.k0.toFixed(1)} rad/u`;
      if (valKineticEnergy) valKineticEnergy.textContent = `E₀ ≈ ${(0.5 * state.k0 * state.k0).toFixed(1)} u`;
    }
    if (sliderSigma) {
      sliderSigma.value = state.sigmaFrac;
      if (valSigma) valSigma.textContent = `${state.sigmaFrac.toFixed(3)} L`;
      if (valInitialDeltaX) valInitialDeltaX.textContent = `Δx = ${(state.sigmaFrac * L / Math.SQRT2).toFixed(2)} u`;
    }
    if (sliderX0) {
      sliderX0.value = state.x0Frac;
      if (valX0) valX0.textContent = `${state.x0Frac.toFixed(2)} L`;
    }
    if (sliderBarrierWidth) {
      sliderBarrierWidth.value = state.barrierWidthFrac;
      if (valBarrierWidth) valBarrierWidth.textContent = `${state.barrierWidthFrac.toFixed(3)} L`;
    }
    if (sliderBarrierHeight) {
      sliderBarrierHeight.value = state.barrierHeight;
      if (valBarrierHeight) valBarrierHeight.textContent = `${state.barrierHeight.toFixed(1)} u`;
    }
  }

  /* ==========================================================================
     15. GERENCIAMENTO DE EVENTOS DA INTERFACE (LISTENERS)
     ========================================================================== */
  function setupEventListeners() {
    // Play / Pause
    if (btnTogglePlay) {
      btnTogglePlay.addEventListener('click', togglePlayPause);
    }

    // Passo Único (Step)
    if (btnStep) {
      btnStep.addEventListener('click', () => {
        state.isRunning = false;
        updatePlayPauseUI();
        for (let s = 0; s < SUB_STEPS; s++) {
          stepCrankNicolson();
        }
        computeObservables();
        updateTelemetryUI();
        renderMainCanvas();
        renderOverlay();
        renderDetectorGraph();
        showToast('Passo Único Executado (Δt)');
      });
    }

    // Reset Pacote
    if (btnResetPacket) {
      btnResetPacket.addEventListener('click', () => {
        initializeGaussianPacket();
        state.detectorCount = 0;
        showToast('Pacote Quântico Reinicializado em x₀');
      });
    }

    // Disparar Novo Pacote
    if (btnFirePacket) {
      btnFirePacket.addEventListener('click', () => {
        initializeGaussianPacket();
        state.detectorCount = 0;
        showToast('Novo Pacote Disparado!');
      });
    }

    // Zerar Potencial
    if (btnClearPotential) {
      btnClearPotential.addEventListener('click', () => {
        V.fill(0);
        showToast('Potencial V(x) Zerado: Espaço Livre');
      });
    }

    // Sliders de Pacote
    if (sliderK0) {
      sliderK0.addEventListener('input', (e) => {
        state.k0 = parseFloat(e.target.value);
        if (valK0) valK0.textContent = `${state.k0.toFixed(1)} rad/u`;
        if (valKineticEnergy) valKineticEnergy.textContent = `E₀ ≈ ${(0.5 * state.k0 * state.k0).toFixed(1)} u`;
      });
    }

    if (sliderSigma) {
      sliderSigma.addEventListener('input', (e) => {
        state.sigmaFrac = parseFloat(e.target.value);
        if (valSigma) valSigma.textContent = `${state.sigmaFrac.toFixed(3)} L`;
        if (valInitialDeltaX) valInitialDeltaX.textContent = `Δx = ${(state.sigmaFrac * L / Math.SQRT2).toFixed(2)} u`;
      });
    }

    if (sliderX0) {
      sliderX0.addEventListener('input', (e) => {
        state.x0Frac = parseFloat(e.target.value);
        if (valX0) valX0.textContent = `${state.x0Frac.toFixed(2)} L`;
      });
    }

    // Sliders do Pincel
    if (sliderBrushV) {
      sliderBrushV.addEventListener('input', (e) => {
        state.brushV = parseFloat(e.target.value);
        if (valBrushV) valBrushV.textContent = `${state.brushV.toFixed(1)} u`;
      });
    }

    if (sliderBrushRadius) {
      sliderBrushRadius.addEventListener('input', (e) => {
        state.brushRadiusPx = parseInt(e.target.value, 10);
        if (valBrushRadius) valBrushRadius.textContent = `${state.brushRadiusPx} px`;
      });
    }

    // Ferramentas de Pincel
    if (toolBrush) {
      toolBrush.addEventListener('click', () => {
        state.activeTool = 'brush';
        toolBrush.classList.add('active');
        if (toolEraser) toolEraser.classList.remove('active');
      });
    }

    if (toolEraser) {
      toolEraser.addEventListener('click', () => {
        state.activeTool = 'eraser';
        toolEraser.classList.add('active');
        if (toolBrush) toolBrush.classList.remove('active');
      });
    }

    // Sliders de Barreira
    if (sliderBarrierWidth) {
      sliderBarrierWidth.addEventListener('input', (e) => {
        state.barrierWidthFrac = parseFloat(e.target.value);
        if (valBarrierWidth) valBarrierWidth.textContent = `${state.barrierWidthFrac.toFixed(3)} L`;
      });
    }

    if (sliderBarrierHeight) {
      sliderBarrierHeight.addEventListener('input', (e) => {
        state.barrierHeight = parseFloat(e.target.value);
        if (valBarrierHeight) valBarrierHeight.textContent = `${state.barrierHeight.toFixed(1)} u`;
      });
    }

    // Botões de Injeção de Barreira
    if (btnApplyBarrier) {
      btnApplyBarrier.addEventListener('click', () => {
        state.currentPreset = 'tunneling';
        V.fill(0);
        const halfWidthNodes = Math.max(1, Math.floor((state.barrierWidthFrac * 0.5) * N));
        const centerNode = Math.floor(N * 0.5);
        const ja = Math.max(1, centerNode - halfWidthNodes);
        const jb = Math.min(N - 2, centerNode + halfWidthNodes);
        for (let j = ja; j <= jb; j++) {
          V[j] = state.barrierHeight;
        }
        state.barrierXa = ja * DX;
        state.barrierXb = jb * DX;
        showToast('Barreira Paramétrica Central Injetada');
      });
    }

    if (btnApplyDoubleBarrier) {
      btnApplyDoubleBarrier.addEventListener('click', () => {
        loadPreset('resonant-tunneling');
      });
    }

    // Toggle PML
    if (togglePml) {
      togglePml.addEventListener('change', (e) => {
        state.pmlActive = e.target.checked;
        updateAbsorbingLayer();
        showToast(state.pmlActive ? 'Camada Absorvedora PML Ativada' : 'PML Desativada (Fronteiras Refletoras)');
      });
    }

    // Dropdowns
    if (btnPresetsToggle && presetsDropdownMenu) {
      btnPresetsToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        presetsDropdownMenu.classList.toggle('show');
        if (shadingDropdownMenu) shadingDropdownMenu.classList.remove('show');
      });

      presetsDropdownMenu.querySelectorAll('.dropdown-item').forEach(item => {
        item.addEventListener('click', () => {
          const presetKey = item.getAttribute('data-preset');
          loadPreset(presetKey);
          presetsDropdownMenu.classList.remove('show');
        });
      });
    }

    if (btnShadingToggle && shadingDropdownMenu) {
      btnShadingToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        shadingDropdownMenu.classList.toggle('show');
        if (presetsDropdownMenu) presetsDropdownMenu.classList.remove('show');
      });

      shadingDropdownMenu.querySelectorAll('.dropdown-item').forEach(item => {
        item.addEventListener('click', () => {
          state.shadingMode = item.getAttribute('data-shading');
          shadingDropdownMenu.querySelectorAll('.dropdown-item').forEach(b => b.classList.remove('active'));
          item.classList.add('active');
          shadingDropdownMenu.classList.remove('show');

          if (phaseLegendHud) {
            phaseLegendHud.style.display = state.shadingMode === 'density-phase' ? 'flex' : 'none';
          }
          showToast(`Modo de Renderização: ${item.querySelector('strong').textContent}`);
        });
      });
    }

    // Fechar dropdowns ao clicar fora
    window.addEventListener('click', () => {
      if (presetsDropdownMenu) presetsDropdownMenu.classList.remove('show');
      if (shadingDropdownMenu) shadingDropdownMenu.classList.remove('show');
    });

    // Zerar histórico de detecção
    if (btnClearDetector) {
      btnClearDetector.addEventListener('click', () => {
        state.detectorCount = 0;
        state.detectorHead = 0;
        showToast('Gráfico do Detector Zerado');
      });
    }

    // Copiar dados quânticos
    if (btnCopyTelemetry) {
      btnCopyTelemetry.addEventListener('click', copyTelemetryToClipboard);
    }

    // Atalhos de Teclado
    window.addEventListener('keydown', handleKeyShortcuts);

    // Ajustar tamanho dos canvas em resize de janela
    window.addEventListener('resize', handleCanvasResize);
  }

  function togglePlayPause() {
    state.isRunning = !state.isRunning;
    updatePlayPauseUI();
  }

  function updatePlayPauseUI() {
    if (iconPlay) {
      if (state.isRunning) {
        iconPlay.className = 'fas fa-pause';
        if (simStatusBadge) {
          simStatusBadge.className = 'telemetry-status-badge live';
          if (simStatusText) simStatusText.textContent = 'Simulação Ativa';
        }
      } else {
        iconPlay.className = 'fas fa-play';
        if (simStatusBadge) {
          simStatusBadge.className = 'telemetry-status-badge paused';
          if (simStatusText) simStatusText.textContent = 'Pausada';
        }
      }
    }
  }

  function handleKeyShortcuts(e) {
    // Ignorar se estiver digitando em input
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    switch (e.code) {
      case 'Space':
        e.preventDefault();
        togglePlayPause();
        break;
      case 'KeyS':
        e.preventDefault();
        if (btnStep) btnStep.click();
        break;
      case 'KeyR':
        e.preventDefault();
        initializeGaussianPacket();
        state.detectorCount = 0;
        showToast('Pacote Quântico Reinicializado (R)');
        break;
      case 'KeyC':
        e.preventDefault();
        V.fill(0);
        showToast('Potencial V(x) Limpo (C)');
        break;
      case 'Digit1':
      case 'Numpad1':
        loadPreset('tunneling');
        break;
      case 'Digit2':
      case 'Numpad2':
        loadPreset('infinite-well');
        break;
      case 'Digit3':
      case 'Numpad3':
        loadPreset('harmonic-oscillator');
        break;
      case 'Digit4':
      case 'Numpad4':
        loadPreset('resonant-tunneling');
        break;
      case 'Digit5':
      case 'Numpad5':
        loadPreset('potential-step');
        break;
    }
  }

  function copyTelemetryToClipboard() {
    const textData = `--- QUANTUMLAB 1D: TELEMETRIA FÍSICA ---
Preset: ${state.currentPreset}
Norma Total ∫|ψ|²dx: ${state.norm.toFixed(6)}
Transmissão (T): ${(state.transmission * 100).toFixed(2)}% (${state.transmission.toFixed(5)})
Reflexão (R): ${(state.reflection * 100).toFixed(2)}% (${state.reflection.toFixed(5)})
Probabilidade na Barreira: ${(state.barrierProb * 100).toFixed(2)}%
Conservação (T + R + Pbar): ${(state.transmission + state.reflection + state.barrierProb).toFixed(6)}
Posição Média <x>: ${state.expectedX.toFixed(2)} u
Momento Linear Médio <p>: ${state.expectedP.toFixed(2)} rad/u
Incerteza Espacial Δx: ${state.deltaX.toFixed(3)} u
Incerteza Momento Δp: ${state.deltaP.toFixed(3)} rad/u
Produto de Heisenberg Δx·Δp: ${state.heisenbergProduct.toFixed(3)} ℏ (>= 0.500)
Energia Média <E>: ${state.expectedE.toFixed(1)} u
Nós da Malha N: ${N} | dx: ${DX} | dt: ${DT_SUB}`;

    navigator.clipboard.writeText(textData)
      .then(() => showToast('Dados Quânticos Copiados para a Área de Transferência!'))
      .catch(() => showToast('Falha ao copiar dados.'));
  }

  function showToast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastEl._timer);
    toastEl._timer = setTimeout(() => {
      toastEl.classList.remove('show');
    }, 2800);
  }

  /* ==========================================================================
     16. RESPONSIVIDADE & REDIMENSIONAMENTO DO CANVAS
     ========================================================================== */
  function handleCanvasResize() {
    const stageWrapper = document.getElementById('canvas-stage-wrapper');
    if (!stageWrapper) return;

    const rect = stageWrapper.getBoundingClientRect();
    const dpr = Math.min(2.0, window.devicePixelRatio || 1);

    // Ajustar resolução interna mantendo nitidez HiDPI
    const internalW = Math.floor(rect.width * dpr);
    const internalH = Math.floor(rect.height * dpr);

    if (mainCanvas.width !== internalW || mainCanvas.height !== internalH) {
      mainCanvas.width = internalW;
      mainCanvas.height = internalH;
      overlayCanvas.width = internalW;
      overlayCanvas.height = internalH;
    }
  }

  /* ==========================================================================
     17. LOOP PRINCIPAL DE SIMULAÇÃO (REQUEST ANIMATION FRAME)
     ========================================================================== */
  function simulationLoop(now) {
    // Cálculo do FPS em tempo real
    state.frameCount++;
    if (now - state.fpsTimer >= 1000) {
      state.fps = (state.frameCount * 1000.0) / (now - state.fpsTimer);
      state.frameCount = 0;
      state.fpsTimer = now;
    }

    // Se estiver em execução, evolui no tempo via Crank-Nicolson
    if (state.isRunning) {
      for (let s = 0; s < SUB_STEPS; s++) {
        stepCrankNicolson();
      }
    }

    // Observáveis e Telemetria a cada frame
    computeObservables();
    updateTelemetryUI();

    // Renderização visual dos elementos gráficos
    renderMainCanvas();
    renderOverlay();
    renderDetectorGraph();

    requestAnimationFrame(simulationLoop);
  }

  /* ==========================================================================
     18. BOOTSTRAP E INICIALIZAÇÃO DA APLICAÇÃO
     ========================================================================== */
  function init() {
    handleCanvasResize();
    updateAbsorbingLayer();
    setupCanvasInteractions();
    setupEventListeners();

    if (footerNodes) {
      footerNodes.textContent = `N = ${N}`;
    }

    // Carregar Preset Padrão: Tunelamento Quântico
    loadPreset('tunneling');

    // Iniciar loop a 60 FPS
    requestAnimationFrame(simulationLoop);
  }

  // Executar após carregamento completo do DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
