/**
 * ============================================================================
 * WAVELAB 2D — MOTOR FDTD & DIFRAÇÃO ONDULATÓRIA
 * Solucionador da Equação de Onda 2D via Diferenças Finitas no Domínio do Tempo
 * Zero dependências externas • Vanilla JavaScript ES6+
 * ============================================================================
 */

(function () {
  'use strict';

  /* ==========================================================================
     Configurações e Parâmetros Numéricos FDTD
     ========================================================================== */
  const GRID_W = 260;
  const GRID_H = 160;
  const TOTAL_CELLS = GRID_W * GRID_H;

  // Parâmetros CFL (Courant-Friedrichs-Lewy)
  // S = c * dt / dx <= 1 / sqrt(2) ≈ 0.7071. Adotamos S = 0.50 => S² = 0.25 (Estabilidade incondicional)
  const S_COURANT = 0.50;
  const S_SQ = S_COURANT * S_COURANT;
  const C_PHASE = 1.0;
  const DT = 0.05;
  const PML_WIDTH = 18;
  const PML_GAMMA_MAX = 0.16;

  /* ==========================================================================
     Buffers de Malha (TypedArrays Float32Array para 60 FPS)
     ========================================================================== */
  let uPrev = new Float32Array(TOTAL_CELLS);
  let uCurr = new Float32Array(TOTAL_CELLS);
  let uNext = new Float32Array(TOTAL_CELLS);
  let walls = new Uint8Array(TOTAL_CELLS); // 1 = barreira, 0 = meio livre
  let damping = new Float32Array(TOTAL_CELLS); // Fator gama de amortecimento PML

  // Histórico de intensidade para o anteparo sensor de Young
  const SENSOR_X = GRID_W - 22;
  const sensorIntensity = new Float32Array(GRID_H);

  /* ==========================================================================
     Estado da Simulação
     ========================================================================== */
  const state = {
    isRunning: true,
    stepCount: 0,
    time: 0,
    shadingMode: 'cosmic', // 'cosmic' | 'bipolar' | 'magma' | 'neon'
    currentTool: 'wall-brush', // 'wall-brush' | 'wall-eraser' | 'pulse-drop' | 'harmonic-source' | 'doppler-source'
    brushSize: 4,
    frequency: 0.45,
    amplitude: 0.85,
    pmlEnabled: true,

    // Fonte Doppler
    doppler: {
      active: false,
      x: 35,
      y: GRID_H / 2,
      vx: 0.60, // em unidades de c
      radius: 5,
      phase: 0,
      freq: 0.50
    },

    // Emissores harmônicos ativos
    sources: [
      { x: 35, y: GRID_H / 2, freq: 0.45, amp: 0.85, phase: 0 }
    ],

    // Parâmetros da fenda de Young
    slit: {
      x: 88,
      width: 4,
      distance: 32,
      thickness: 3
    },

    // Controle de mouse/touch
    isPointerDown: false,
    pointerX: 0,
    pointerY: 0,
    activePreset: 'young'
  };

  /* ==========================================================================
     Elementos DOM e Contextos de Renderização
     ========================================================================== */
  const tankCanvas = document.getElementById('tank-canvas');
  const tankCtx = tankCanvas.getContext('2d', { willReadFrequently: true });
  const overlayCanvas = document.getElementById('overlay-canvas');
  const overlayCtx = overlayCanvas.getContext('2d');
  const sensorCanvas = document.getElementById('sensor-canvas');
  const sensorCtx = sensorCanvas.getContext('2d');

  // Buffer de ImageData para renderização por software de alta performance
  let tankImageData = tankCtx.createImageData(GRID_W, GRID_H);
  let pixelBuffer = new Uint32Array(tankImageData.data.buffer);

  // Tabelas de Cores Pré-computadas (Lookup Tables - LUT) para Shading
  const LUT_SIZE = 512;
  const luts = {
    cosmic: new Uint32Array(LUT_SIZE),
    bipolar: new Uint32Array(LUT_SIZE),
    magma: new Uint32Array(LUT_SIZE),
    neon: new Uint32Array(LUT_SIZE)
  };

  /* ==========================================================================
     Construção das Lookup Tables de Cores (RGBA em Little-Endian 32-bit)
     ========================================================================== */
  function buildLuts() {
    for (let i = 0; i < LUT_SIZE; i++) {
      // Normalizado de -1.0 a +1.0
      const norm = (i / (LUT_SIZE - 1)) * 2 - 1;
      const absVal = Math.min(1.0, Math.abs(norm));

      // 1. Deep Wave Cósmico: Cristas em Ciano (#67e8f9), Vales em Índigo (#1e1b4b), Zero em Quase-Preto
      let rC = 8, gC = 9, bC = 13;
      if (norm > 0) {
        // Transição para ciano (#67e8f9: 103, 232, 249)
        const t = Math.min(1.0, norm * 1.2);
        rC = Math.round(8 + (103 - 8) * t);
        gC = Math.round(9 + (232 - 9) * t);
        bC = Math.round(13 + (249 - 13) * t);
      } else {
        // Transição para azul/índigo (#1e1b4b: 30, 27, 75)
        const t = Math.min(1.0, -norm * 1.2);
        rC = Math.round(8 + (30 - 8) * t);
        gC = Math.round(9 + (27 - 9) * t);
        bC = Math.round(13 + (75 - 13) * t);
      }
      luts.cosmic[i] = (255 << 24) | (bC << 16) | (gC << 8) | rC;

      // 2. Interferometria Bipolar: Cristas em Vermelho (#ef4444), Vales em Ciano (#06b6d4)
      let rB = 8, gB = 8, bB = 12;
      if (norm > 0) {
        const t = Math.min(1.0, norm * 1.3);
        rB = Math.round(8 + (239 - 8) * t);
        gB = Math.round(8 + (68 - 8) * t);
        bB = Math.round(12 + (68 - 12) * t);
      } else {
        const t = Math.min(1.0, -norm * 1.3);
        rB = Math.round(8 + (6 - 8) * t);
        gB = Math.round(8 + (182 - 8) * t);
        bB = Math.round(12 + (212 - 12) * t);
      }
      luts.bipolar[i] = (255 << 24) | (bB << 16) | (gB << 8) | rB;

      // 3. Thermal Magma: Baseado em |u| (Preto -> Vermelho -> Âmbar -> Branco)
      let rM = 0, gM = 0, bM = 0;
      if (absVal < 0.35) {
        const t = absVal / 0.35;
        rM = Math.round(180 * t);
        gM = Math.round(20 * t);
        bM = Math.round(20 * t);
      } else if (absVal < 0.75) {
        const t = (absVal - 0.35) / 0.40;
        rM = Math.round(180 + 75 * t);
        gM = Math.round(20 + 138 * t);
        bM = Math.round(20 + 10 * t);
      } else {
        const t = (absVal - 0.75) / 0.25;
        rM = 255;
        gM = Math.round(158 + 97 * t);
        bM = Math.round(30 + 225 * t);
      }
      luts.magma[i] = (255 << 24) | (bM << 16) | (gM << 8) | rM;

      // 4. Laser Holográfico Neon: Verde esmeralda (#10b981) e ciano
      let rN = 6, gN = 8, bN = 10;
      if (absVal > 0.05) {
        const t = Math.min(1.0, absVal * 1.4);
        rN = Math.round(6 + (16 - 6) * t);
        gN = Math.round(8 + (240 - 8) * t);
        bN = Math.round(10 + (130 - 10) * t);
      }
      luts.neon[i] = (255 << 24) | (bN << 16) | (gN << 8) | rN;
    }
  }

  /* ==========================================================================
     Inicialização do Amortecimento PML (Camada Absorvente Perimetral)
     ========================================================================== */
  function initPML() {
    const baseDamping = 0.0015; // Amortecimento de fundo para evitar modos espúrios
    for (let y = 0; y < GRID_H; y++) {
      for (let x = 0; x < GRID_W; x++) {
        const idx = y * GRID_W + x;
        let dMin = PML_WIDTH;

        if (x < PML_WIDTH) dMin = Math.min(dMin, x);
        if (x >= GRID_W - PML_WIDTH) dMin = Math.min(dMin, GRID_W - 1 - x);
        if (y < PML_WIDTH) dMin = Math.min(dMin, y);
        if (y >= GRID_H - PML_WIDTH) dMin = Math.min(dMin, GRID_H - 1 - y);

        if (dMin < PML_WIDTH) {
          const factor = (PML_WIDTH - dMin) / PML_WIDTH;
          damping[idx] = baseDamping + PML_GAMMA_MAX * factor * factor;
        } else {
          damping[idx] = baseDamping;
        }
      }
    }
  }

  /* ==========================================================================
     Integração Numérica FDTD (Equação de Onda 2D Discretizada)
     ========================================================================== */
  function stepFDTD() {
    // 1. Atualização do campo interno resolvendo a equação hiperbólica
    // u^{t+1} = (2u^t - (1 - gamma/2) u^{t-1} + S² laplaciano) / (1 + gamma/2)
    const isPML = state.pmlEnabled;

    for (let y = 1; y < GRID_H - 1; y++) {
      const rowOffset = y * GRID_W;
      const rowAbove = (y - 1) * GRID_W;
      const rowBelow = (y + 1) * GRID_W;

      for (let x = 1; x < GRID_W - 1; x++) {
        const idx = rowOffset + x;

        // Se for barreira mecânica rígida, amplitude é identicamente zero (Dirichlet)
        if (walls[idx]) {
          uNext[idx] = 0;
          continue;
        }

        const uC = uCurr[idx];
        const uP = uPrev[idx];

        // Laplaciano bidimensional de 5 pontos (Δ² u)
        const laplacian = uCurr[idx + 1] + uCurr[idx - 1] + uCurr[rowBelow + x] + uCurr[rowAbove + x] - 4.0 * uC;

        const gam = isPML ? damping[idx] : 0.001;
        const halfGam = gam * 0.5;

        // Atualização FDTD
        const nextVal = (2.0 * uC - (1.0 - halfGam) * uP + S_SQ * laplacian) / (1.0 + halfGam);

        // Clamping suave para evitar overflow numérico
        uNext[idx] = Math.max(-2.5, Math.min(2.5, nextVal));
      }
    }

    // 2. Condição de contorno nas bordas extremas (Dirichlet u = 0)
    for (let x = 0; x < GRID_W; x++) {
      uNext[x] = 0;
      uNext[(GRID_H - 1) * GRID_W + x] = 0;
    }
    for (let y = 0; y < GRID_H; y++) {
      uNext[y * GRID_W] = 0;
      uNext[y * GRID_W + GRID_W - 1] = 0;
    }

    // 3. Excitação das fontes harmônicas ativas
    state.time += DT;
    for (let s of state.sources) {
      const idx = Math.round(s.y) * GRID_W + Math.round(s.x);
      if (idx >= 0 && idx < TOTAL_CELLS && !walls[idx]) {
        const val = s.amp * Math.sin(s.freq * state.stepCount + s.phase);
        uNext[idx] = val;
      }
    }

    // 4. Fonte Doppler móvel
    if (state.doppler.active) {
      const dop = state.doppler;
      // Atualiza posição com velocidade horizontal
      dop.x += dop.vx * (C_PHASE * 0.7);
      // Ao atingir a borda direita antes do anteparo, reinicia na esquerda
      if (dop.x >= SENSOR_X - 10) {
        dop.x = PML_WIDTH + 8;
      }

      const idxDop = Math.round(dop.y) * GRID_W + Math.round(dop.x);
      if (idxDop >= 0 && idxDop < TOTAL_CELLS && !walls[idxDop]) {
        const val = state.amplitude * Math.sin(dop.freq * state.stepCount);
        uNext[idxDop] = val;
        // Injeta também nós vizinhos para frente de onda coerente
        if (idxDop + 1 < TOTAL_CELLS) uNext[idxDop + 1] = val * 0.8;
        if (idxDop - 1 >= 0) uNext[idxDop - 1] = val * 0.8;
      }
    }

    // 5. Permutação circular dos buffers (Zero Garbage Collection)
    const temp = uPrev;
    uPrev = uCurr;
    uCurr = uNext;
    uNext = temp;

    state.stepCount++;

    // 6. Amostragem contínua para o sensor de Young no anteparo direito
    for (let y = 0; y < GRID_H; y++) {
      const idx = y * GRID_W + SENSOR_X;
      const amplitude = uCurr[idx];
      const instantEnergy = amplitude * amplitude;
      // Média móvel exponencial (EMA) com decaimento suave
      sensorIntensity[y] = 0.94 * sensorIntensity[y] + 0.06 * instantEnergy;
    }
  }

  /* ==========================================================================
     Injeção de Pulso Gaussiano Pontual (Gota d'Água)
     ========================================================================== */
  function injectGaussianPulse(cx, cy, amp = 1.0, sigma = 3.5) {
    const rMax = Math.ceil(sigma * 3.5);
    const twoSigmaSq = 2.0 * sigma * sigma;

    for (let dy = -rMax; dy <= rMax; dy++) {
      const y = cy + dy;
      if (y < 1 || y >= GRID_H - 1) continue;

      for (let dx = -rMax; dx <= rMax; dx++) {
        const x = cx + dx;
        if (x < 1 || x >= GRID_W - 1) continue;

        const idx = y * GRID_W + x;
        if (walls[idx]) continue;

        const distSq = dx * dx + dy * dy;
        const val = amp * Math.exp(-distSq / twoSigmaSq);
        uCurr[idx] += val;
        uPrev[idx] += val * 0.9; // Gera propagação radial outward imediata
      }
    }
  }

  /* ==========================================================================
     Manipulação de Barreiras e Meio Físico
     ========================================================================== */
  function applyBrush(cx, cy, radius, isWall) {
    const rSq = radius * radius;
    for (let dy = -radius; dy <= radius; dy++) {
      const y = cy + dy;
      if (y < 1 || y >= GRID_H - 1) continue;

      for (let dx = -radius; dx <= radius; dx++) {
        const x = cx + dx;
        if (x < 1 || x >= GRID_W - 1) continue;

        if (dx * dx + dy * dy <= rSq) {
          const idx = y * GRID_W + x;
          walls[idx] = isWall ? 1 : 0;
          if (isWall) {
            uCurr[idx] = 0;
            uPrev[idx] = 0;
            uNext[idx] = 0;
          }
        }
      }
    }
  }

  /* ==========================================================================
     Construção das Barreiras com Fendas de Young
     ========================================================================== */
  function buildYoungSlits(xPos, slitWidth, slitDistance, thickness = 3) {
    // 1. Limpa barreiras existentes na coluna da fenda
    for (let y = 0; y < GRID_H; y++) {
      for (let t = -1; t <= thickness; t++) {
        const x = xPos + t;
        if (x >= 0 && x < GRID_W) {
          walls[y * GRID_W + x] = 0;
        }
      }
    }

    // 2. Constrói a parede vertical contínua
    const centerY = Math.floor(GRID_H / 2);
    const slit1Center = centerY - Math.floor(slitDistance / 2);
    const slit2Center = centerY + Math.floor(slitDistance / 2);
    const halfWidth = Math.floor(slitWidth / 2);

    for (let y = 2; y < GRID_H - 2; y++) {
      // Verifica se a coordenada y cai dentro da Fenda 1 ou da Fenda 2
      const inSlit1 = Math.abs(y - slit1Center) <= halfWidth;
      const inSlit2 = Math.abs(y - slit2Center) <= halfWidth;

      if (!inSlit1 && !inSlit2) {
        for (let t = 0; t < thickness; t++) {
          const x = xPos + t;
          if (x >= 0 && x < GRID_W) {
            const idx = y * GRID_W + x;
            walls[idx] = 1;
            uCurr[idx] = 0;
            uPrev[idx] = 0;
          }
        }
      }
    }
  }

  /* ==========================================================================
     Construção de Difração com Fenda Única
     ========================================================================== */
  function buildSingleSlit(xPos, slitWidth, thickness = 3) {
    for (let y = 0; y < GRID_H; y++) {
      for (let t = -1; t <= thickness; t++) {
        const x = xPos + t;
        if (x >= 0 && x < GRID_W) walls[y * GRID_W + x] = 0;
      }
    }

    const centerY = Math.floor(GRID_H / 2);
    const halfWidth = Math.floor(slitWidth / 2);

    for (let y = 2; y < GRID_H - 2; y++) {
      const inSlit = Math.abs(y - centerY) <= halfWidth;
      if (!inSlit) {
        for (let t = 0; t < thickness; t++) {
          const x = xPos + t;
          if (x >= 0 && x < GRID_W) {
            walls[y * GRID_W + x] = 1;
            uCurr[y * GRID_W + x] = 0;
            uPrev[y * GRID_W + x] = 0;
          }
        }
      }
    }
  }

  /* ==========================================================================
     Construção da Cavidade Ressonante 2D
     ========================================================================== */
  function buildResonantCavity() {
    clearWalls();
    const x1 = 50, x2 = 210;
    const y1 = 25, y2 = 135;

    for (let x = x1; x <= x2; x++) {
      walls[y1 * GRID_W + x] = 1;
      walls[y2 * GRID_W + x] = 1;
    }
    for (let y = y1; y <= y2; y++) {
      walls[y * GRID_W + x1] = 1;
      walls[y * GRID_W + x2] = 1;
    }

    // Pequena abertura de guia de onda no topo esquerdo para acoplar energia
    for (let y = y1 + 10; y <= y1 + 22; y++) {
      walls[y * GRID_W + x1] = 0;
    }
  }

  function clearTank() {
    uPrev.fill(0);
    uCurr.fill(0);
    uNext.fill(0);
    sensorIntensity.fill(0);
  }

  function clearWalls() {
    walls.fill(0);
  }

  /* ==========================================================================
     Renderização do Tanque via ImageData Direto
     ========================================================================== */
  function renderTank() {
    const lut = luts[state.shadingMode];
    const wallColor = (255 << 24) | (70 << 16) | (63 << 8) | 63; // Cinza matte industrial #3f3f46
    const pmlEdgeColor = (255 << 24) | (20 << 16) | (15 << 8) | 12;

    for (let i = 0; i < TOTAL_CELLS; i++) {
      if (walls[i]) {
        pixelBuffer[i] = wallColor;
        continue;
      }

      // Mapeia amplitude u [-1.0, 1.0] para índice da LUT [0, 511]
      let val = uCurr[i];
      let lutIdx = Math.floor((val + 1.0) * 0.5 * (LUT_SIZE - 1));
      if (lutIdx < 0) lutIdx = 0;
      else if (lutIdx >= LUT_SIZE) lutIdx = LUT_SIZE - 1;

      pixelBuffer[i] = lut[lutIdx];
    }

    tankCtx.putImageData(tankImageData, 0, 0);

    // Renderiza elementos adicionais e overlays interativos
    renderOverlays();
  }

  /* ==========================================================================
     Renderização dos Overlays Vetoriais (Fontes, Cone de Mach, Sensores)
     ========================================================================== */
  function renderOverlays() {
    overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    const scaleX = overlayCanvas.width / GRID_W;
    const scaleY = overlayCanvas.height / GRID_H;

    // 1. Linha do anteparo sensor de Young na margem direita
    const sensorScreenX = SENSOR_X * scaleX;
    overlayCtx.save();
    overlayCtx.strokeStyle = 'rgba(16, 185, 129, 0.45)';
    overlayCtx.lineWidth = 1.5;
    overlayCtx.setLineDash([4, 4]);
    overlayCtx.beginPath();
    overlayCtx.moveTo(sensorScreenX, 0);
    overlayCtx.lineTo(sensorScreenX, overlayCanvas.height);
    overlayCtx.stroke();
    overlayCtx.setLineDash([]);
    overlayCtx.restore();

    // 2. Fontes Harmônicas
    for (let s of state.sources) {
      const sx = s.x * scaleX;
      const sy = s.y * scaleY;

      // Halo pulsante
      overlayCtx.save();
      overlayCtx.fillStyle = 'rgba(245, 158, 11, 0.2)';
      overlayCtx.beginPath();
      overlayCtx.arc(sx, sy, 10 + 4 * Math.sin(state.time * 6), 0, Math.PI * 2);
      overlayCtx.fill();

      // Círculo central da fonte
      overlayCtx.fillStyle = '#f59e0b';
      overlayCtx.strokeStyle = '#fafafa';
      overlayCtx.lineWidth = 1.5;
      overlayCtx.beginPath();
      overlayCtx.arc(sx, sy, 4.5, 0, Math.PI * 2);
      overlayCtx.fill();
      overlayCtx.stroke();
      overlayCtx.restore();
    }

    // 3. Fonte Doppler e Cone de Mach Supersônico
    if (state.doppler.active) {
      const dop = state.doppler;
      const dx = dop.x * scaleX;
      const dy = dop.y * scaleY;
      const mach = dop.vx / C_PHASE;

      overlayCtx.save();

      // Se Mach > 1 (Supersônico), desenha o Cone de Choque de Mach: sin(mu) = 1 / M
      if (mach > 1.0) {
        const mu = Math.asin(1.0 / mach); // Meio-ângulo do cone
        const coneLength = 140 * scaleX;

        // Vértice no ponto da fonte
        overlayCtx.strokeStyle = 'rgba(239, 68, 68, 0.85)';
        overlayCtx.fillStyle = 'rgba(239, 68, 68, 0.12)';
        overlayCtx.lineWidth = 2.0;

        const leftX = dx - coneLength;
        const deltaY = coneLength * Math.tan(mu);

        overlayCtx.beginPath();
        overlayCtx.moveTo(dx, dy);
        overlayCtx.lineTo(leftX, dy - deltaY);
        overlayCtx.lineTo(leftX, dy + deltaY);
        overlayCtx.closePath();
        overlayCtx.fill();
        overlayCtx.stroke();

        // Linha central de trajetória
        overlayCtx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
        overlayCtx.setLineDash([3, 3]);
        overlayCtx.beginPath();
        overlayCtx.moveTo(dx, dy);
        overlayCtx.lineTo(leftX, dy);
        overlayCtx.stroke();
        overlayCtx.setLineDash([]);
      }

      // Ícone da aeronave/fonte Doppler
      overlayCtx.fillStyle = mach > 1.0 ? '#ef4444' : (mach === 1.0 ? '#f59e0b' : '#10b981');
      overlayCtx.strokeStyle = '#ffffff';
      overlayCtx.lineWidth = 1.5;
      overlayCtx.beginPath();
      overlayCtx.arc(dx, dy, 5.5, 0, Math.PI * 2);
      overlayCtx.fill();
      overlayCtx.stroke();

      overlayCtx.restore();
    }
  }

  /* ==========================================================================
     Renderização do Gráfico do Sensor de Young I(θ)
     ========================================================================== */
  function renderSensorGraph() {
    const w = sensorCanvas.width;
    const h = sensorCanvas.height;
    sensorCtx.clearRect(0, 0, w, h);

    // Fundo do gráfico
    sensorCtx.fillStyle = '#060608';
    sensorCtx.fillRect(0, 0, w, h);

    // Grade sutil horizontal e vertical
    sensorCtx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    sensorCtx.lineWidth = 1;
    for (let y = 0; y < h; y += 30) {
      sensorCtx.beginPath();
      sensorCtx.moveTo(0, y);
      sensorCtx.lineTo(w, y);
      sensorCtx.stroke();
    }

    // Encontra o pico de intensidade máxima
    let iMax = 0.0001;
    for (let y = 0; y < GRID_H; y++) {
      if (sensorIntensity[y] > iMax) iMax = sensorIntensity[y];
    }

    // Escala gráfica de amplitude (horizontal) ao longo do eixo Y da simulação (vertical)
    const paddingX = 14;
    const graphWidth = w - paddingX * 2;

    // Plota a curva contínua I(y)
    sensorCtx.save();
    sensorCtx.beginPath();
    sensorCtx.moveTo(paddingX, 0);

    for (let gy = 0; gy < GRID_H; gy++) {
      const canvasY = (gy / (GRID_H - 1)) * h;
      const normalizedI = Math.min(1.0, sensorIntensity[gy] / iMax);
      const canvasX = paddingX + normalizedI * graphWidth;

      if (gy === 0) sensorCtx.moveTo(canvasX, canvasY);
      else sensorCtx.lineTo(canvasX, canvasY);
    }

    // Preenchimento gradiente ciano translúcido
    const grad = sensorCtx.createLinearGradient(paddingX, 0, w - paddingX, 0);
    grad.addColorStop(0, 'rgba(6, 182, 212, 0.05)');
    grad.addColorStop(1, 'rgba(6, 182, 212, 0.35)');

    sensorCtx.lineTo(paddingX, h);
    sensorCtx.lineTo(paddingX, 0);
    sensorCtx.fillStyle = grad;
    sensorCtx.fill();

    // Traçado da curva com brilho
    sensorCtx.strokeStyle = '#06b6d4';
    sensorCtx.lineWidth = 2.0;
    sensorCtx.shadowColor = '#06b6d4';
    sensorCtx.shadowBlur = 6;
    sensorCtx.beginPath();

    for (let gy = 0; gy < GRID_H; gy++) {
      const canvasY = (gy / (GRID_H - 1)) * h;
      const normalizedI = Math.min(1.0, sensorIntensity[gy] / iMax);
      const canvasX = paddingX + normalizedI * graphWidth;

      if (gy === 0) sensorCtx.moveTo(canvasX, canvasY);
      else sensorCtx.lineTo(canvasX, canvasY);
    }
    sensorCtx.stroke();
    sensorCtx.restore();

    // Detecção de picos (franjas claras)
    let peakCount = 0;
    sensorCtx.fillStyle = '#10b981';
    for (let gy = 2; gy < GRID_H - 2; gy++) {
      const cur = sensorIntensity[gy];
      if (cur > 0.05 * iMax && cur > sensorIntensity[gy - 1] && cur > sensorIntensity[gy + 1]) {
        peakCount++;
        const canvasY = (gy / (GRID_H - 1)) * h;
        const normalizedI = cur / iMax;
        const canvasX = paddingX + normalizedI * graphWidth;

        // Ponto de pico
        sensorCtx.beginPath();
        sensorCtx.arc(canvasX, canvasY, 3, 0, Math.PI * 2);
        sensorCtx.fill();
      }
    }

    // Atualiza telemetria no painel lateral
    const elImax = document.getElementById('metric-imax');
    const elFringes = document.getElementById('metric-fringes');
    const elLambda = document.getElementById('metric-lambda');
    const elTheta = document.getElementById('metric-theta');

    if (elImax) elImax.textContent = (iMax * 10).toFixed(3) + ' W/m²';
    if (elFringes) elFringes.textContent = peakCount + (peakCount === 1 ? ' pico' : ' picos');

    // Estimativa de comprimento de onda lambda = 2pi * c / omega
    const lambdaEst = (2.0 * Math.PI * C_PHASE) / (state.frequency * (GRID_W / 140));
    if (elLambda) elLambda.textContent = `~${lambdaEst.toFixed(1)} px`;

    // Separação angular de franjas delta theta ~ lambda / d
    const dSlit = state.slit.distance;
    const deltaTheta = lambdaEst / Math.max(1, dSlit);
    if (elTheta) elTheta.textContent = `${deltaTheta.toFixed(3)} rad`;
  }

  /* ==========================================================================
     Carregamento de Presets Científicos
     ========================================================================== */
  function loadPreset(name) {
    state.activePreset = name;
    clearTank();
    clearWalls();
    state.doppler.active = false;
    state.sources = [];

    const centerY = Math.floor(GRID_H / 2);

    switch (name) {
      case 'young':
        // Dupla Fenda de Young clássica
        state.frequency = 0.45;
        state.amplitude = 0.85;
        state.slit.x = 88;
        state.slit.width = 4;
        state.slit.distance = 32;
        buildYoungSlits(state.slit.x, state.slit.width, state.slit.distance);

        // Fonte harmônica colimada à esquerda
        state.sources.push({ x: 32, y: centerY, freq: state.frequency, amp: state.amplitude, phase: 0 });
        break;

      case 'single-slit':
        // Difração de Fenda Única (Princípio de Huygens)
        state.frequency = 0.50;
        state.amplitude = 0.90;
        state.slit.x = 88;
        state.slit.width = 8;
        buildSingleSlit(state.slit.x, state.slit.width);

        state.sources.push({ x: 30, y: centerY, freq: state.frequency, amp: state.amplitude, phase: 0 });
        break;

      case 'doppler-sub':
        // Efeito Doppler Subsônico (M = 0.60)
        state.frequency = 0.45;
        state.doppler.active = true;
        state.doppler.x = 40;
        state.doppler.y = centerY;
        state.doppler.vx = 0.60;
        state.doppler.freq = 0.45;
        updateMachBadge(0.60);
        break;

      case 'doppler-super':
        // Efeito Doppler Supersônico (M = 1.40) com cone de Mach
        state.frequency = 0.45;
        state.doppler.active = true;
        state.doppler.x = 40;
        state.doppler.y = centerY;
        state.doppler.vx = 1.40;
        state.doppler.freq = 0.45;
        updateMachBadge(1.40);
        break;

      case 'cavity':
        // Cavidade Ressonante 2D
        state.frequency = 0.38;
        state.amplitude = 0.80;
        buildResonantCavity();
        state.sources.push({ x: 32, y: 35, freq: state.frequency, amp: state.amplitude, phase: 0 });
        break;
    }

    // Sincroniza controles de interface
    syncControlsToState();
  }

  function updateMachBadge(vx) {
    const mach = vx / C_PHASE;
    const badge = document.getElementById('mach-badge');
    const label = document.getElementById('mach-label');
    const coneInfo = document.getElementById('val-mach-angle');

    if (!badge || !label) return;

    badge.classList.remove('subsônico', 'sônico', 'supersônico');

    if (mach < 0.95) {
      badge.classList.add('subsônico');
      label.textContent = `Subsônico (M = ${mach.toFixed(2)})`;
      if (coneInfo) coneInfo.textContent = 'N/A';
    } else if (mach <= 1.05) {
      badge.classList.add('sônico');
      label.textContent = `Sônico (M = ${mach.toFixed(2)})`;
      if (coneInfo) coneInfo.textContent = '90.0° (Barreira)';
    } else {
      badge.classList.add('supersônico');
      label.textContent = `Supersônico (M = ${mach.toFixed(2)})`;
      const muRad = Math.asin(1.0 / mach);
      const muDeg = (muRad * 180 / Math.PI).toFixed(1);
      if (coneInfo) coneInfo.textContent = `${muDeg}° (Cone de Mach)`;
    }
  }

  function syncControlsToState() {
    const sFreq = document.getElementById('slider-freq');
    const vFreq = document.getElementById('val-freq');
    if (sFreq && vFreq) {
      sFreq.value = state.frequency;
      vFreq.textContent = `${Number(state.frequency).toFixed(2)} rad/s`;
    }

    const sAmp = document.getElementById('slider-amp');
    const vAmp = document.getElementById('val-amp');
    if (sAmp && vAmp) {
      sAmp.value = state.amplitude;
      vAmp.textContent = Number(state.amplitude).toFixed(2);
    }

    const sDop = document.getElementById('slider-doppler-vel');
    const vDop = document.getElementById('val-doppler-vel');
    if (sDop && vDop) {
      sDop.value = state.doppler.vx;
      vDop.textContent = `${Number(state.doppler.vx).toFixed(2)} c`;
    }

    const sSlitW = document.getElementById('slider-slit-width');
    const vSlitW = document.getElementById('val-slit-width');
    if (sSlitW && vSlitW) {
      sSlitW.value = state.slit.width;
      vSlitW.textContent = `${state.slit.width} px`;
    }

    const sSlitD = document.getElementById('slider-slit-dist');
    const vSlitD = document.getElementById('val-slit-dist');
    if (sSlitD && vSlitD) {
      sSlitD.value = state.slit.distance;
      vSlitD.textContent = `${state.slit.distance} px`;
    }
  }

  /* ==========================================================================
     Tratamento de Eventos de Mouse / Touch no Tanque
     ========================================================================== */
  function getTankGridCoords(evt) {
    const rect = tankCanvas.getBoundingClientRect();
    const clientX = evt.clientX || (evt.touches && evt.touches[0].clientX);
    const clientY = evt.clientY || (evt.touches && evt.touches[0].clientY);

    const xRel = (clientX - rect.left) / rect.width;
    const yRel = (clientY - rect.top) / rect.height;

    const gx = Math.floor(xRel * GRID_W);
    const gy = Math.floor(yRel * GRID_H);

    return {
      x: Math.max(0, Math.min(GRID_W - 1, gx)),
      y: Math.max(0, Math.min(GRID_H - 1, gy))
    };
  }

  function handlePointerAction(coords) {
    const { x, y } = coords;

    switch (state.currentTool) {
      case 'wall-brush':
        applyBrush(x, y, state.brushSize, true);
        break;
      case 'wall-eraser':
        applyBrush(x, y, state.brushSize * 1.5, false);
        break;
      case 'pulse-drop':
        injectGaussianPulse(x, y, state.amplitude * 1.5, 3.5);
        break;
      case 'harmonic-source':
        // Posiciona ou move a fonte harmônica primária
        state.sources = [{ x, y, freq: state.frequency, amp: state.amplitude, phase: 0 }];
        break;
      case 'doppler-source':
        state.doppler.active = true;
        state.doppler.x = x;
        state.doppler.y = y;
        break;
    }
  }

  function setupInteractions() {
    // Canvas Mouse / Touch
    const wrapper = document.getElementById('tank-wrapper');

    wrapper.addEventListener('mousedown', (e) => {
      state.isPointerDown = true;
      const coords = getTankGridCoords(e);
      handlePointerAction(coords);
    });

    window.addEventListener('mouseup', () => {
      state.isPointerDown = false;
    });

    wrapper.addEventListener('mousemove', (e) => {
      const coords = getTankGridCoords(e);
      // Atualiza coordenadas no HUD
      const hudX = document.getElementById('hud-x');
      const hudY = document.getElementById('hud-y');
      const hudU = document.getElementById('hud-u');
      if (hudX) hudX.textContent = coords.x;
      if (hudY) hudY.textContent = coords.y;
      if (hudU) {
        const idx = coords.y * GRID_W + coords.x;
        hudU.textContent = uCurr[idx].toFixed(2);
      }

      if (state.isPointerDown) {
        handlePointerAction(coords);
      }
    });

    // Touch events para mobile / tablets
    wrapper.addEventListener('touchstart', (e) => {
      state.isPointerDown = true;
      const coords = getTankGridCoords(e);
      handlePointerAction(coords);
      e.preventDefault();
    }, { passive: false });

    wrapper.addEventListener('touchmove', (e) => {
      if (state.isPointerDown) {
        const coords = getTankGridCoords(e);
        handlePointerAction(coords);
      }
      e.preventDefault();
    }, { passive: false });

    window.addEventListener('touchend', () => {
      state.isPointerDown = false;
    });

    // Ferramentas da Toolbar
    const toolBtns = document.querySelectorAll('.tool-btn');
    toolBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        toolBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.currentTool = btn.dataset.tool;
      });
    });

    // Sliders
    const sBrush = document.getElementById('slider-brush-size');
    const vBrush = document.getElementById('val-brush-size');
    if (sBrush && vBrush) {
      sBrush.addEventListener('input', (e) => {
        state.brushSize = parseInt(e.target.value, 10);
        vBrush.textContent = `${state.brushSize} px`;
      });
    }

    const sFreq = document.getElementById('slider-freq');
    const vFreq = document.getElementById('val-freq');
    if (sFreq && vFreq) {
      sFreq.addEventListener('input', (e) => {
        state.frequency = parseFloat(e.target.value);
        vFreq.textContent = `${state.frequency.toFixed(2)} rad/s`;
        for (let s of state.sources) s.freq = state.frequency;
        state.doppler.freq = state.frequency;
      });
    }

    const sAmp = document.getElementById('slider-amp');
    const vAmp = document.getElementById('val-amp');
    if (sAmp && vAmp) {
      sAmp.addEventListener('input', (e) => {
        state.amplitude = parseFloat(e.target.value);
        vAmp.textContent = state.amplitude.toFixed(2);
        for (let s of state.sources) s.amp = state.amplitude;
      });
    }

    const sDop = document.getElementById('slider-doppler-vel');
    const vDop = document.getElementById('val-doppler-vel');
    if (sDop && vDop) {
      sDop.addEventListener('input', (e) => {
        const vel = parseFloat(e.target.value);
        state.doppler.vx = vel;
        vDop.textContent = `${vel.toFixed(2)} c`;
        updateMachBadge(vel);
      });
    }

    // Geometria da fenda
    const sSlitW = document.getElementById('slider-slit-width');
    const vSlitW = document.getElementById('val-slit-width');
    if (sSlitW && vSlitW) {
      sSlitW.addEventListener('input', (e) => {
        state.slit.width = parseInt(e.target.value, 10);
        vSlitW.textContent = `${state.slit.width} px`;
      });
    }

    const sSlitD = document.getElementById('slider-slit-dist');
    const vSlitD = document.getElementById('val-slit-dist');
    if (sSlitD && vSlitD) {
      sSlitD.addEventListener('input', (e) => {
        state.slit.distance = parseInt(e.target.value, 10);
        vSlitD.textContent = `${state.slit.distance} px`;
      });
    }

    const btnRebuildSlits = document.getElementById('btn-rebuild-slits');
    if (btnRebuildSlits) {
      btnRebuildSlits.addEventListener('click', () => {
        buildYoungSlits(state.slit.x, state.slit.width, state.slit.distance);
      });
    }

    // Dropdowns de Presets e Shading
    setupDropdown('btn-presets-toggle', 'presets-dropdown-menu', (target) => {
      const presetName = target.closest('[data-preset]')?.dataset.preset;
      if (presetName) loadPreset(presetName);
    });

    setupDropdown('btn-shading-toggle', 'shading-dropdown-menu', (target) => {
      const item = target.closest('[data-shading]');
      if (item) {
        document.querySelectorAll('#shading-dropdown-menu .dropdown-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        state.shadingMode = item.dataset.shading;
      }
    });

    // Controles de Play / Pause / Step
    const btnPlay = document.getElementById('btn-toggle-play');
    const iconPlay = document.getElementById('icon-play');
    const statusText = document.getElementById('sim-status-text');
    const statusBadge = document.getElementById('sim-status-badge');

    if (btnPlay) {
      btnPlay.addEventListener('click', () => {
        state.isRunning = !state.isRunning;
        if (state.isRunning) {
          iconPlay.className = 'fas fa-pause';
          statusText.textContent = 'Tanque Ativo';
          statusBadge.className = 'telemetry-status-badge live';
        } else {
          iconPlay.className = 'fas fa-play';
          statusText.textContent = 'Pausado';
          statusBadge.className = 'telemetry-status-badge';
        }
      });
    }

    const btnStep = document.getElementById('btn-step');
    if (btnStep) {
      btnStep.addEventListener('click', () => {
        stepFDTD();
        renderTank();
        renderSensorGraph();
      });
    }

    const btnPml = document.getElementById('btn-toggle-pml');
    const footerPml = document.getElementById('footer-pml-status');
    if (btnPml) {
      btnPml.addEventListener('click', () => {
        state.pmlEnabled = !state.pmlEnabled;
        btnPml.setAttribute('aria-pressed', state.pmlEnabled);
        btnPml.classList.toggle('active', state.pmlEnabled);
        if (footerPml) {
          footerPml.textContent = state.pmlEnabled ? 'Ativo (20 células)' : 'Desativado (Reflexivo)';
        }
      });
    }

    const btnClearTank = document.getElementById('btn-clear-tank');
    if (btnClearTank) {
      btnClearTank.addEventListener('click', clearTank);
    }

    const btnClearWalls = document.getElementById('btn-clear-walls');
    if (btnClearWalls) {
      btnClearWalls.addEventListener('click', clearWalls);
    }

    const btnResetSensor = document.getElementById('btn-reset-sensor');
    if (btnResetSensor) {
      btnResetSensor.addEventListener('click', () => {
        sensorIntensity.fill(0);
      });
    }

    // Teclas de Atalho
    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT') return;

      if (e.code === 'Space') {
        e.preventDefault();
        btnPlay?.click();
      } else if (e.key === 's' || e.key === 'S') {
        btnStep?.click();
      } else if (e.key === 'c' || e.key === 'C') {
        clearTank();
      } else if (e.key === '1') {
        loadPreset('young');
      } else if (e.key === '2') {
        loadPreset('single-slit');
      } else if (e.key === '3') {
        loadPreset('doppler-sub');
      } else if (e.key === '4') {
        loadPreset('doppler-super');
      } else if (e.key === '5') {
        loadPreset('cavity');
      }
    });

    // Resize responsivo
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
    const wrapper = document.getElementById('tank-wrapper');
    const container = document.querySelector('.tank-viewport-container');
    if (!container || !wrapper) return;

    const availableW = container.clientWidth - 32;
    const availableH = container.clientHeight - 32;
    const aspect = GRID_W / GRID_H;

    let displayW = availableW;
    let displayH = displayW / aspect;

    if (displayH > availableH) {
      displayH = availableH;
      displayW = displayH * aspect;
    }

    tankCanvas.style.width = `${Math.floor(displayW)}px`;
    tankCanvas.style.height = `${Math.floor(displayH)}px`;

    overlayCanvas.width = Math.floor(displayW);
    overlayCanvas.height = Math.floor(displayH);
  }

  /* ==========================================================================
     Loop Principal de Renderização (requestAnimationFrame a 60 FPS)
     ========================================================================== */
  let lastTime = performance.now();
  let frameCount = 0;
  let fpsTimer = 0;

  function mainLoop(now) {
    requestAnimationFrame(mainLoop);

    const dtMs = now - lastTime;
    lastTime = now;

    // Cálculo do FPS em tempo real
    frameCount++;
    fpsTimer += dtMs;
    if (fpsTimer >= 1000) {
      const fpsElem = document.getElementById('stat-fps');
      if (fpsElem) fpsElem.textContent = Math.round((frameCount * 1000) / fpsTimer);
      frameCount = 0;
      fpsTimer = 0;
    }

    // Executa subpassos FDTD para manter propagação temporal suave
    if (state.isRunning) {
      // 2 subpassos por quadro para excelente convergência dinâmica
      stepFDTD();
      stepFDTD();
    }

    renderTank();

    // Atualiza o gráfico de Young a cada 2 quadros para poupar ciclos
    if (frameCount % 2 === 0) {
      renderSensorGraph();
    }
  }

  /* ==========================================================================
     Inicialização do Laboratório
     ========================================================================== */
  function init() {
    buildLuts();
    initPML();
    setupInteractions();
    handleResize();
    loadPreset('young');
    requestAnimationFrame(mainLoop);
  }

  // Inicializa quando o DOM estiver pronto
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
