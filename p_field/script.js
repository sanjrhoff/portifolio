/**
 * ============================================================================
 * FIELDLORENTZ — MOTOR ELETROMAGNÉTICO & INTEGRADOR DE BORIS
 * Traçado contínuo de linhas de campo de Faraday (RK4) & Força de Lorentz
 * Zero dependências externas • Vanilla JavaScript ES6+
 * ============================================================================
 */

(function () {
  'use strict';

  /* ==========================================================================
     Constantes Físicas e Numéricas
     ========================================================================== */
  const KE = 4000.0;            // Constante eletrostática de Coulomb em escala gráfica
  const EPSILON_SQ = 144.0;     // Suavização do núcleo de carga (epsilon = 12 px) para evitar singularidades
  const SUB_STEPS = 8;          // Subpassos temporais por quadro para alta fidelidade
  const DT = 0.04;              // Passo de tempo base
  const MAX_TRAIL_LENGTH = 180; // Comprimento máximo do rastro da partícula

  /* ==========================================================================
     Estado da Simulação
     ========================================================================== */
  const state = {
    isRunning: true,
    time: 0,
    continuousStream: true,
    streamTimer: 0,
    currentTool: 'add-pos',      // 'add-pos' | 'add-neg' | 'select-move'
    chargeMagnitude: 5.0,
    seedsCount: 16,
    bField: 0.0,                 // Indução magnética B_z em Tesla (-3.0 a +3.0)
    selectedParticleType: 'electron', // 'electron' | 'proton' | 'alpha'
    particleSpeed: 1200,

    // Toggles de visualização
    showLines: true,
    showEquipotentials: true,
    showGridVectors: false,

    // Cargas eletrostáticas ativas
    charges: [],

    // Partículas em trânsito sob força de Lorentz
    particles: [],

    // Elementos de presets complexos (Ciclotron / Espectrômetro)
    cyclotron: {
      active: false,
      omegaC: 0,
      gapX: 0,
      gapWidth: 24,
      eFieldGap: 180.0
    },

    spectrometer: {
      active: false,
      splitX: 0,
      slitAperture: 18,
      eFieldSelector: 112.5,
      detectorHits: []
    },

    // Controle de interação por ponteiro
    isAiming: false,
    aimStart: { x: 0, y: 0 },
    aimCurrent: { x: 0, y: 0 },
    draggedCharge: null,
    dragOffset: { x: 0, y: 0 },

    activePreset: 'dipole'
  };

  /* ==========================================================================
     Elementos DOM e Contextos de Renderização
     ========================================================================== */
  const canvas = document.getElementById('chamber-canvas');
  const ctx = canvas.getContext('2d');
  const telemetryCanvas = document.getElementById('telemetry-canvas');
  const telemCtx = telemetryCanvas.getContext('2d');
  const aimHud = document.getElementById('aim-hud-info');

  // Histórico de telemetria para o gráfico
  const energyHistory = [];
  const MAX_HISTORY = 60;

  /* ==========================================================================
     Definições dos Tipos de Partículas
     ========================================================================== */
  const PARTICLE_SPECIES = {
    electron: {
      name: 'Elétron (e⁻)',
      q: -1.0,
      m: 1.0,
      radius: 3.5,
      color: '#06b6d4',
      trailGlow: 'rgba(6, 182, 212, 0.4)'
    },
    proton: {
      name: 'Próton (p⁺)',
      q: 1.0,
      m: 1.75,          // 1.75 u: raio calibrado para foco perfeito no detector dentro da tela
      radius: 5.5,
      color: '#fbbf24',
      trailGlow: 'rgba(251, 191, 36, 0.4)'
    },
    alpha: {
      name: 'Partícula Alfa (α²⁺)',
      q: 2.0,
      m: 3.5,
      radius: 6.5,
      color: '#ef4444',
      trailGlow: 'rgba(239, 68, 68, 0.4)'
    }
  };

  /* ==========================================================================
     Cálculo do Campo Elétrico e Potencial Coulombiano
     ========================================================================== */
  function getElectricFieldAt(x, y) {
    let Ex = 0;
    let Ey = 0;

    // 1. Contribuição de todas as cargas pontuais
    for (let c of state.charges) {
      const dx = x - c.x;
      const dy = y - c.y;
      const rSq = dx * dx + dy * dy + EPSILON_SQ;
      const dist = Math.sqrt(rSq);
      const factor = (KE * c.q) / (rSq * dist);
      Ex += factor * dx;
      Ey += factor * dy;
    }

    // 2. Campo elétrico alternado no gap do Ciclotron
    if (state.cyclotron.active) {
      const cyc = state.cyclotron;
      if (Math.abs(x - cyc.gapX) < cyc.gapWidth / 2) {
        // Campo alternado senoidal na frequência de ressonância
        const eOsc = cyc.eFieldGap * Math.cos(cyc.omegaC * state.time);
        Ex += eOsc;
      }
    }

    // 3. Campo elétrico cruzado no seletor de velocidades do Espectrômetro
    if (state.spectrometer.active) {
      const spec = state.spectrometer;
      // Região do seletor: x < splitX e no canal central
      if (x < spec.splitX && Math.abs(y - canvas.height / 2) < 55) {
        Ey += spec.eFieldSelector;
      }
    }

    return { Ex, Ey };
  }

  function getPotentialAt(x, y) {
    let V = 0;
    for (let c of state.charges) {
      const dx = x - c.x;
      const dy = y - c.y;
      const dist = Math.sqrt(dx * dx + dy * dy + EPSILON_SQ);
      V += (KE * c.q) / dist;
    }
    return V;
  }

  /* ==========================================================================
     Traçado de Linhas de Campo Contínuas de Faraday (Runge-Kutta 4 - RK4)
     ========================================================================== */
  function traceStreamline(startX, startY, sign = 1.0, maxSteps = 300, ds = 4.0) {
    const points = [{ x: startX, y: startY }];
    let cx = startX;
    let cy = startY;

    for (let step = 0; step < maxSteps; step++) {
      // RK4 para dx/ds = sign * E / |E|
      // k1
      const f1 = getElectricFieldAt(cx, cy);
      const mag1 = Math.hypot(f1.Ex, f1.Ey);
      if (mag1 < 1e-6) break;
      const k1x = (sign * f1.Ex) / mag1;
      const k1y = (sign * f1.Ey) / mag1;

      // k2
      const x2 = cx + 0.5 * ds * k1x;
      const y2 = cy + 0.5 * ds * k1y;
      const f2 = getElectricFieldAt(x2, y2);
      const mag2 = Math.hypot(f2.Ex, f2.Ey);
      if (mag2 < 1e-6) break;
      const k2x = (sign * f2.Ex) / mag2;
      const k2y = (sign * f2.Ey) / mag2;

      // k3
      const x3 = cx + 0.5 * ds * k2x;
      const y3 = cy + 0.5 * ds * k2y;
      const f3 = getElectricFieldAt(x3, y3);
      const mag3 = Math.hypot(f3.Ex, f3.Ey);
      if (mag3 < 1e-6) break;
      const k3x = (sign * f3.Ex) / mag3;
      const k3y = (sign * f3.Ey) / mag3;

      // k4
      const x4 = cx + ds * k3x;
      const y4 = cy + ds * k3y;
      const f4 = getElectricFieldAt(x4, y4);
      const mag4 = Math.hypot(f4.Ex, f4.Ey);
      if (mag4 < 1e-6) break;
      const k4x = (sign * f4.Ex) / mag4;
      const k4y = (sign * f4.Ey) / mag4;

      cx += (ds / 6.0) * (k1x + 2 * k2x + 2 * k3x + k4x);
      cy += (ds / 6.0) * (k1y + 2 * k2y + 2 * k3y + k4y);

      points.push({ x: cx, y: cy });

      // Verificação de parada: saiu do canvas ou atingiu carga de sinal oposto
      if (cx < -20 || cx > canvas.width + 20 || cy < -20 || cy > canvas.height + 20) {
        break;
      }

      // Parada ao se aproximar de cargas absorventes
      let reachedCharge = false;
      for (let c of state.charges) {
        if ((sign > 0 && c.q < 0) || (sign < 0 && c.q > 0)) {
          const dSq = (cx - c.x) * (cx - c.x) + (cy - c.y) * (cy - c.y);
          if (dSq < 16 * 16) {
            reachedCharge = true;
            break;
          }
        }
      }
      if (reachedCharge) break;
    }

    return points;
  }

  function getAllStreamlines() {
    const streamlines = [];
    if (!state.showLines) return streamlines;

    // Emite sementes ao redor de cada carga
    for (let c of state.charges) {
      const numSeeds = state.seedsCount;
      const radius = 18;
      const sign = c.q > 0 ? 1.0 : -1.0;

      // Emite predominantemente de cargas positivas para as negativas
      for (let i = 0; i < numSeeds; i++) {
        const theta = (2 * Math.PI * i) / numSeeds;
        const sx = c.x + radius * Math.cos(theta);
        const sy = c.y + radius * Math.sin(theta);
        const path = traceStreamline(sx, sy, sign);
        if (path.length > 2) {
          streamlines.push({ points: path, sign });
        }
      }
    }

    return streamlines;
  }

  /* ==========================================================================
     Dinâmica de Partículas: Integrador de Boris para Força de Lorentz
     ========================================================================== */
  function stepParticles(subDt) {
    const Bz = state.bField;

    for (let i = state.particles.length - 1; i >= 0; i--) {
      const p = state.particles[i];

      // 1. Meio passo elétrico: v^- = v^t + (q E / m) * (dt / 2)
      const field = getElectricFieldAt(p.x, p.y);
      const qOverM = p.q / p.m;
      const halfDt = subDt * 0.5;

      const vxMinus = p.vx + qOverM * field.Ex * halfDt;
      const vyMinus = p.vy + qOverM * field.Ey * halfDt;

      // 2. Rotação Magnética exata (sem ganho espúrio de energia)
      // t = (q B / m) * (dt / 2) * z_hat
      const tz = qOverM * Bz * halfDt;
      const tSq = tz * tz;

      // v' = v^- + v^- x t = (vxMinus + vyMinus * tz, vyMinus - vxMinus * tz)
      const vxPrime = vxMinus + vyMinus * tz;
      const vyPrime = vyMinus - vxMinus * tz;

      // s = 2t / (1 + t²)
      const sFactor = (2.0 * tz) / (1.0 + tSq);

      // v^+ = v^- + v' x s
      const vxPlus = vxMinus + vyPrime * sFactor;
      const vyPlus = vyMinus - vxPrime * sFactor;

      // 3. Segundo meio passo elétrico: v^{t+dt} = v^+ + (q E / m) * (dt / 2)
      p.vx = vxPlus + qOverM * field.Ex * halfDt;
      p.vy = vyPlus + qOverM * field.Ey * halfDt;

      // 4. Atualização de Posição: r^{t+dt} = r^t + v^{t+dt} * dt
      const prevX = p.x;
      const prevY = p.y;
      p.x += p.vx * subDt;
      p.y += p.vy * subDt;

      // Colisões e Absorções Físicas no Espectrômetro de Massa
      if (state.spectrometer.active) {
        const spec = state.spectrometer;
        const splitX = spec.splitX;
        const cy = canvas.height / 2;
        const slitHalf = spec.slitAperture || 18;

        // A. Colisão com o anteparo colimador vindo da esquerda (bloqueio do feixe)
        if (prevX < splitX && p.x >= splitX) {
          if (Math.abs(p.y - cy) > slitHalf) {
            // Não passou pelo orifício da fenda: absorve no anteparo
            state.particles.splice(i, 1);
            continue;
          }
        }

        // B. Colisão com a placa detectora fotográfica no retorno do semicírculo magnético
        if (prevX >= splitX && p.x <= splitX && p.vx < 0) {
          if (!spec.detectorHits) spec.detectorHits = [];
          spec.detectorHits.push({
            x: splitX,
            y: p.y,
            type: p.typeKey || (p.q < 0 ? 'electron' : 'proton'),
            color: p.color,
            time: performance.now()
          });
          if (spec.detectorHits.length > 40) spec.detectorHits.shift();

          // Absorve a partícula para registrar o pico espectral e não deixá-la girar em cima da fenda
          state.particles.splice(i, 1);
          continue;
        }

        // C. Colisão com as placas superior/inferior do capacitor do seletor
        if (p.x < splitX && (p.y < cy - 50 || p.y > cy + 50)) {
          state.particles.splice(i, 1);
          continue;
        }
      }

      // Atualiza rastro histórico
      p.trail.unshift({ x: p.x, y: p.y });
      if (p.trail.length > MAX_TRAIL_LENGTH) p.trail.pop();

      // Remove partículas que saem muito além dos limites da câmara
      const margin = 80;
      if (p.x < -margin || p.x > canvas.width + margin || p.y < -margin || p.y > canvas.height + margin) {
        state.particles.splice(i, 1);
      }
    }
  }

  /* ==========================================================================
     Injeção e Disparo de Partículas
     ========================================================================== */
  function spawnParticle(x, y, vx, vy, typeKey) {
    const spec = PARTICLE_SPECIES[typeKey] || PARTICLE_SPECIES.electron;
    state.particles.push({
      x,
      y,
      vx,
      vy,
      typeKey: typeKey || 'electron',
      q: spec.q,
      m: spec.m,
      radius: spec.radius,
      color: spec.color,
      trailGlow: spec.trailGlow,
      trail: [{ x, y }]
    });

    // Mantém limite máximo de segurança para fluidez a 60 FPS
    if (state.particles.length > 30) {
      state.particles.shift();
    }
  }

  function fireCentralBeam() {
    const type = state.selectedParticleType;
    const speed = state.particleSpeed * 0.05; // Escala gráfica para px/s
    const startX = 60;
    const startY = canvas.height / 2;
    spawnParticle(startX, startY, speed, 0, type);
  }

  /* ==========================================================================
     Emissão Contínua Automática (Feixe Contínuo para Verificação Imediata)
     ========================================================================== */
  let streamAlternator = 0;
  function handleContinuousEmission() {
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const speed = state.particleSpeed * 0.05;

    switch (state.activePreset) {
      case 'cyclotron':
        // A cada ~45 quadros (~0.75s), se tiver menos de 4 partículas, injeta no gap central
        if (state.streamTimer % 45 === 0 && state.particles.length < 4) {
          spawnParticle(cx - 5, cy, 32, 0, 'proton');
        }
        break;

      case 'faraday-cage':
        // A cada ~30 quadros (~0.5s), dispara sondas de teste:
        // Sonda central: passa por dentro da gaiola (comprova E = 0 e movimento reto por inércia)
        // Sondas periféricas: passam fora da gaiola (mostram a deflexão pelo campo elétrico externo)
        if (state.streamTimer % 30 === 0 && state.particles.length < 18) {
          streamAlternator++;
          const pType = (streamAlternator % 4 < 2) ? 'electron' : 'proton';
          const isCentral = (streamAlternator % 2 === 0);

          if (isCentral) {
            // Sonda central (atravessa o interior blindado em linha reta)
            spawnParticle(30, cy, 65, 0, pType);
          } else {
            // Sonda periférica (passa pelo lado de fora da gaiola para evidenciar o campo externo)
            const offY = (streamAlternator % 4 === 1) ? -165 : 165;
            spawnParticle(30, cy + offY, 45, 0, pType);
          }
        }
        break;

      case 'mass-spectrometer':
        // Injeta par elétron + próton com velocidade calibrada para o seletor v = E/B
        if (state.streamTimer % 45 === 0 && state.particles.length < 8) {
          spawnParticle(45, cy, 90, 0, 'electron');
          spawnParticle(45, cy, 90, 0, 'proton');
        }
        break;

      case 'exb-drift':
        // A cada ~40 quadros, injeta par para ver a deriva cicloidal
        if (state.streamTimer % 40 === 0 && state.particles.length < 6) {
          spawnParticle(cx - 100, cy, 0, 0, 'proton');
          spawnParticle(cx - 100, cy - 30, 0, 0, 'electron');
        }
        break;

      default:
        // Dipolo, Gaiola de Faraday ou montagem livre:
        // A cada ~28 quadros (~0.45s), dispara partícula alternando entre Elétron e Próton
        if (state.streamTimer % 28 === 0 && state.particles.length < 24) {
          const pType = (streamAlternator % 2 === 0) ? 'electron' : 'proton';
          streamAlternator++;
          // Emite da margem esquerda com ligeira oscilação vertical para cobrir diferentes linhas
          const startY = cy + Math.sin(state.time * 2.2) * 60;
          spawnParticle(30, startY, speed, 0, pType);
        }
        break;
    }
  }

  /* ==========================================================================
     Renderização Visual na Câmara
     ========================================================================== */
  function renderChamber() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Grid Direcional do Campo Magnético Transversal (B_z)
    renderMagneticGrid();

    // 2. Isolinhas de Potencial Equipotencial V(x,y) = const
    if (state.showEquipotentials && state.charges.length > 0) {
      renderEquipotentials();
    }

    // 3. Grid de Vetores de Campo E (se ativo)
    if (state.showGridVectors && state.charges.length > 0) {
      renderVectorGrid();
    }

    // 4. Linhas de Campo Contínuas de Faraday (RK4)
    if (state.showLines && state.charges.length > 0) {
      renderStreamlines();
    }

    // 5. Estruturas Especiais de Presets (Ciclotron / Espectrômetro)
    renderPresetStructures();

    // 6. Cargas Pontuais Eletrostáticas
    renderCharges();

    // 7. Partículas e Rastros de Lorentz
    renderParticles();

    // 8. Vetor de Mira Elástica Durante Drag
    if (state.isAiming) {
      renderAimVector();
    }
  }

  /* 1. Grade do Campo Magnético */
  function renderMagneticGrid() {
    const Bz = state.bField;
    if (Math.abs(Bz) < 0.05) return;

    ctx.save();
    const isEntering = Bz < 0; // Entrando: \otimes (violeta), Saindo: \odot (rosa)
    ctx.fillStyle = isEntering ? 'rgba(168, 85, 247, 0.18)' : 'rgba(236, 72, 153, 0.18)';
    ctx.font = '13px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const symbol = isEntering ? '⊗' : '⊙';
    const spacing = 45;

    for (let x = spacing / 2; x < canvas.width; x += spacing) {
      for (let y = spacing / 2; y < canvas.height; y += spacing) {
        ctx.fillText(symbol, x, y);
      }
    }
    ctx.restore();
  }

  /* 2. Isolinhas Equipotenciais */
  function renderEquipotentials() {
    ctx.save();
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.22)';
    ctx.lineWidth = 1.0;
    ctx.setLineDash([3, 4]);

    // Anéis concêntricos equipotenciais centrados nas cargas
    for (let c of state.charges) {
      const radii = [28, 48, 75, 110, 160, 220];
      for (let r of radii) {
        ctx.beginPath();
        ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    ctx.setLineDash([]);
    ctx.restore();
  }

  /* 3. Grid Vetorial Discreto */
  function renderVectorGrid() {
    ctx.save();
    const spacing = 36;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 1.0;

    for (let x = spacing / 2; x < canvas.width; x += spacing) {
      for (let y = spacing / 2; y < canvas.height; y += spacing) {
        const f = getElectricFieldAt(x, y);
        const mag = Math.hypot(f.Ex, f.Ey);
        if (mag < 0.05) continue;

        const maxLen = 14;
        const len = Math.min(maxLen, Math.max(4, Math.log10(mag + 1) * 6));
        const dirX = (f.Ex / mag) * len;
        const dirY = (f.Ey / mag) * len;

        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + dirX, y + dirY);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  /* 4. Linhas de Faraday RK4 */
  function renderStreamlines() {
    const lines = getAllStreamlines();
    ctx.save();
    ctx.lineWidth = 1.5;

    for (let line of lines) {
      const pts = line.points;
      if (pts.length < 2) continue;

      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) {
        ctx.lineTo(pts[i].x, pts[i].y);
      }

      // Gradiente suave de cor solar para ciano
      const grad = ctx.createLinearGradient(pts[0].x, pts[0].y, pts[pts.length - 1].x, pts[pts.length - 1].y);
      if (line.sign > 0) {
        grad.addColorStop(0, 'rgba(251, 191, 36, 0.75)');
        grad.addColorStop(1, 'rgba(6, 182, 212, 0.55)');
      } else {
        grad.addColorStop(0, 'rgba(6, 182, 212, 0.75)');
        grad.addColorStop(1, 'rgba(251, 191, 36, 0.55)');
      }

      ctx.strokeStyle = grad;
      ctx.stroke();

      // Seta indicativa de direção no meio do caminho
      if (pts.length > 20) {
        const midIdx = Math.floor(pts.length * 0.45);
        const p1 = pts[midIdx];
        const p2 = pts[midIdx + 1];
        const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);

        ctx.fillStyle = line.sign > 0 ? '#fbbf24' : '#06b6d4';
        ctx.beginPath();
        ctx.moveTo(p2.x, p2.y);
        ctx.lineTo(p2.x - 6 * Math.cos(angle - Math.PI / 6), p2.y - 6 * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(p2.x - 6 * Math.cos(angle + Math.PI / 6), p2.y - 6 * Math.sin(angle + Math.PI / 6));
        ctx.closePath();
        ctx.fill();
      }
    }
    ctx.restore();
  }

  /* 5. Estruturas Especiais de Presets */
  function renderPresetStructures() {
    // A. Ciclotron: Desenha os dois "Dees" semicirculares condutores
    if (state.cyclotron.active) {
      const cyc = state.cyclotron;
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const radius = Math.min(canvas.width, canvas.height) * 0.42;

      ctx.save();
      ctx.strokeStyle = 'rgba(139, 92, 246, 0.4)';
      ctx.lineWidth = 3;

      // Dee Esquerdo (Semicírculo)
      ctx.beginPath();
      ctx.arc(cx - cyc.gapWidth / 2, cy, radius, Math.PI / 2, (3 * Math.PI) / 2);
      ctx.closePath();
      ctx.stroke();

      // Dee Direito (Semicírculo)
      ctx.beginPath();
      ctx.arc(cx + cyc.gapWidth / 2, cy, radius, -Math.PI / 2, Math.PI / 2);
      ctx.closePath();
      ctx.stroke();

      // Gap Acelerador Central com indicador elétrico
      const eOsc = cyc.eFieldGap * Math.cos(cyc.omegaC * state.time);
      const gapAlpha = Math.min(1.0, Math.abs(eOsc) / cyc.eFieldGap);
      ctx.fillStyle = eOsc > 0 ? `rgba(6, 182, 212, ${0.15 * gapAlpha})` : `rgba(245, 158, 11, ${0.15 * gapAlpha})`;
      ctx.fillRect(cx - cyc.gapWidth / 2, cy - radius, cyc.gapWidth, radius * 2);

      // Labels informativas
      ctx.fillStyle = '#a1a1aa';
      ctx.font = '11px JetBrains Mono, monospace';
      ctx.fillText('Dee 1', cx - radius * 0.55, cy - radius * 0.85);
      ctx.fillText('Dee 2', cx + radius * 0.35, cy - radius * 0.85);
      ctx.fillText(`Gap E(t) = ${(eOsc).toFixed(0)} V/m`, cx - 45, cy + radius + 18);
      ctx.restore();
    }

    // B. Espectrômetro de Massa: Câmara de Seleção E x B e Placa Detectora Fotográfica
    if (state.spectrometer.active) {
      const spec = state.spectrometer;
      const splitX = spec.splitX;
      const cy = canvas.height / 2;
      const slitHalf = spec.slitAperture || 18;

      ctx.save();
      // 1. Anteparo Colimador Opaco (Barreira física que bloqueia feixe fora da fenda)
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(splitX, 0);
      ctx.lineTo(splitX, cy - slitHalf);
      ctx.moveTo(splitX, cy + slitHalf);
      ctx.lineTo(splitX, canvas.height);
      ctx.stroke();

      // Placa Detectora Fotográfica no verso da fenda (para absorver os semicírculos de retorno)
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
      ctx.lineWidth = 3;
      ctx.setLineDash([3, 4]);
      ctx.beginPath();
      ctx.moveTo(splitX + 3, 0);
      ctx.lineTo(splitX + 3, cy - slitHalf);
      ctx.moveTo(splitX + 3, cy + slitHalf);
      ctx.lineTo(splitX + 3, canvas.height);
      ctx.stroke();
      ctx.setLineDash([]);

      // 2. Placas do seletor E x B à esquerda
      ctx.fillStyle = 'rgba(245, 158, 11, 0.08)';
      ctx.fillRect(35, cy - 50, splitX - 50, 100);
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.3)';
      ctx.lineWidth = 1;
      ctx.strokeRect(35, cy - 50, splitX - 50, 100);

      // Labels informativas
      ctx.fillStyle = '#f59e0b';
      ctx.font = '10px JetBrains Mono, monospace';
      ctx.fillText('+ Placa Superior (+V)', 42, cy - 56);
      ctx.fillStyle = '#06b6d4';
      ctx.fillText('- Placa Inferior (-V)', 42, cy + 66);
      ctx.fillStyle = '#e4e4e7';
      ctx.fillText('Fenda Colimadora', splitX - 110, cy + 4);

      ctx.fillStyle = 'rgba(56, 189, 248, 0.9)';
      ctx.fillText('Placa Detectora (Filme)', splitX + 8, 54);

      // Posições teóricas dos picos de absorção espectral (diâmetro d = 2 * r_L = 2 * m * v / (q * B))
      const rLe = (1.0 * 90.0) / 1.25;      // r_L = 72 px (Elétron curva para baixo)
      const rLp = (1.75 * 90.0) / 1.25;     // r_L = 126 px (Próton curva para cima)
      const yTargetElectron = cy + 2 * rLe;  // cy + 144 px (Abaixo da fenda)
      const yTargetProton = cy - 2 * rLp;    // cy - 252 px (Acima da fenda)

      // Rótulos alinhados exatamente com o ponto físico de impacto de cada partícula
      ctx.font = '10px JetBrains Mono, monospace';

      // 1. Alvo e Rótulo do Próton (Para CIMA da fenda)
      ctx.fillStyle = 'rgba(251, 191, 36, 0.15)';
      ctx.fillRect(splitX, yTargetProton - 7, 10, 14);
      ctx.fillStyle = '#fbbf24';
      ctx.fillText(`◄ Pico Próton (p⁺) [d = ${(2 * rLp).toFixed(0)} px]`, splitX + 16, yTargetProton + 4);

      // 2. Alvo e Rótulo do Elétron (Para BAIXO da fenda)
      ctx.fillStyle = 'rgba(6, 182, 212, 0.15)';
      ctx.fillRect(splitX, yTargetElectron - 7, 10, 14);
      ctx.fillStyle = '#06b6d4';
      ctx.fillText(`◄ Pico Elétron (e⁻) [d = ${(2 * rLe).toFixed(0)} px]`, splitX + 16, yTargetElectron + 4);

      // 3. Renderiza marcas de detecção dos impactos acumulados
      if (spec.detectorHits && spec.detectorHits.length > 0) {
        for (let hit of spec.detectorHits) {
          const age = (performance.now() - hit.time) / 1000;
          const alpha = Math.max(0.25, 1.0 - age * 0.06);

          // Marca espectral (linha perpendicular ao anteparo)
          ctx.strokeStyle = hit.color;
          ctx.globalAlpha = alpha;
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(splitX, hit.y);
          ctx.lineTo(splitX + 14, hit.y);
          ctx.stroke();

          // Ponto de impacto no detector
          ctx.fillStyle = hit.color;
          ctx.beginPath();
          ctx.arc(splitX + 2, hit.y, 3.5, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1.0;
      }

      ctx.restore();
    }

    // C. Gaiola de Faraday: Destaque visual da Zona Blindada
    if (state.activePreset === 'faraday-cage') {
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const cageRadius = 130;

      ctx.save();
      // Disco suave indicando interior blindado
      const grad = ctx.createRadialGradient(cx, cy, 10, cx, cy, cageRadius - 15);
      grad.addColorStop(0, 'rgba(16, 185, 129, 0.08)');
      grad.addColorStop(0.85, 'rgba(16, 185, 129, 0.03)');
      grad.addColorStop(1, 'rgba(16, 185, 129, 0.0)');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, cageRadius - 15, 0, Math.PI * 2);
      ctx.fill();

      // Borda pontilhada da blindagem
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.35)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.arc(cx, cy, cageRadius - 18, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Badge didático no centro da gaiola
      ctx.fillStyle = 'rgba(14, 14, 18, 0.88)';
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.45)';
      ctx.lineWidth = 1;
      const boxW = 190;
      const boxH = 46;
      ctx.fillRect(cx - boxW / 2, cy - boxH / 2, boxW, boxH);
      ctx.strokeRect(cx - boxW / 2, cy - boxH / 2, boxW, boxH);

      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 11px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      ctx.fillText('🛡️ ZONA BLINDADA', cx, cy - 8);

      ctx.fillStyle = '#a1a1aa';
      ctx.font = '10px Inter, sans-serif';
      ctx.fillText('E ≈ 0 N/C • Força Nula (Inércia)', cx, cy + 12);

      ctx.restore();
    }
  }

  /* 6. Cargas Eletrostáticas */
  function renderCharges() {
    for (let c of state.charges) {
      const isPos = c.q > 0;
      const baseColor = isPos ? '#fbbf24' : '#06b6d4';
      const radius = 14;

      ctx.save();
      // Halo incandescente
      ctx.fillStyle = isPos ? 'rgba(251, 191, 36, 0.25)' : 'rgba(6, 182, 212, 0.25)';
      ctx.beginPath();
      ctx.arc(c.x, c.y, radius + 6, 0, Math.PI * 2);
      ctx.fill();

      // Círculo sólido
      ctx.fillStyle = baseColor;
      ctx.beginPath();
      ctx.arc(c.x, c.y, radius, 0, Math.PI * 2);
      ctx.fill();

      // Borda e símbolo
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.0;
      ctx.stroke();

      ctx.fillStyle = '#09090b';
      ctx.font = 'bold 14px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(isPos ? '+' : '−', c.x, c.y);

      // Label de carga
      ctx.fillStyle = '#fafafa';
      ctx.font = '10px JetBrains Mono, monospace';
      ctx.fillText(`${c.q > 0 ? '+' : ''}${c.q.toFixed(1)} μC`, c.x, c.y + radius + 12);
      ctx.restore();
    }
  }

  /* 7. Partículas e Rastros */
  function renderParticles() {
    ctx.save();

    for (let p of state.particles) {
      // Rastro fotográfico com decaimento alfa
      if (p.trail.length > 1) {
        ctx.beginPath();
        ctx.moveTo(p.trail[0].x, p.trail[0].y);
        for (let i = 1; i < p.trail.length; i++) {
          ctx.lineTo(p.trail[i].x, p.trail[i].y);
        }
        ctx.strokeStyle = p.trailGlow;
        ctx.lineWidth = 2.5;
        ctx.stroke();
      }

      // Corpo da partícula com brilho
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  /* 8. Vetor de Mira */
  function renderAimVector() {
    const { x: sx, y: sy } = state.aimStart;
    const { x: cx, y: cy } = state.aimCurrent;

    // Vetor disparado na direção oposta ao estilingue (ou direta)
    const vx = (cx - sx) * 8.0;
    const vy = (cy - sy) * 8.0;
    const speed = Math.hypot(vx, vy);
    const angle = Math.atan2(cy - sy, cx - sx);

    ctx.save();
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 2.0;
    ctx.setLineDash([4, 4]);

    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(cx, cy);
    ctx.stroke();

    // Seta na ponta
    ctx.setLineDash([]);
    ctx.fillStyle = '#06b6d4';
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Atualiza HUD flutuante
    if (aimHud) {
      aimHud.style.display = 'flex';
      const elV = document.getElementById('hud-aim-v');
      const elTheta = document.getElementById('hud-aim-theta');
      const elF = document.getElementById('hud-aim-f');
      if (elV) elV.textContent = `${Math.round(speed * 20)} km/s`;
      if (elTheta) elTheta.textContent = `${(angle * 180 / Math.PI).toFixed(1)}°`;
      if (elF) {
        const estF = Math.abs(state.bField) * speed * 0.1;
        elF.textContent = `${estF.toFixed(2)} pN`;
      }
    }
  }

  /* ==========================================================================
     Gráfico de Telemetria Lateral (Energia Cinética do Feixe)
     ========================================================================== */
  function renderTelemetry() {
    const w = telemetryCanvas.width;
    const h = telemetryCanvas.height;
    telemCtx.clearRect(0, 0, w, h);

    telemCtx.fillStyle = '#060608';
    telemCtx.fillRect(0, 0, w, h);

    // Linhas de grade
    telemCtx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    telemCtx.lineWidth = 1;
    for (let y = 0; y < h; y += 30) {
      telemCtx.beginPath();
      telemCtx.moveTo(0, y);
      telemCtx.lineTo(w, y);
      telemCtx.stroke();
    }

    // Calcula energia cinética total do feixe E_c = 0.5 * sum(m * v²)
    let totalKinetic = 0;
    for (let p of state.particles) {
      const vSq = p.vx * p.vx + p.vy * p.vy;
      totalKinetic += 0.5 * p.m * vSq;
    }

    energyHistory.push(totalKinetic);
    if (energyHistory.length > MAX_HISTORY) energyHistory.shift();

    const maxE = Math.max(10.0, ...energyHistory);

    // Traça curva
    telemCtx.save();
    telemCtx.strokeStyle = '#f59e0b';
    telemCtx.lineWidth = 2.0;
    telemCtx.beginPath();

    for (let i = 0; i < energyHistory.length; i++) {
      const x = (i / (MAX_HISTORY - 1)) * w;
      const y = h - (energyHistory[i] / maxE) * (h - 20) - 10;
      if (i === 0) telemCtx.moveTo(x, y);
      else telemCtx.lineTo(x, y);
    }
    telemCtx.stroke();
    telemCtx.restore();

    // Atualiza métricas
    const elKinetic = document.getElementById('metric-kinetic');
    if (elKinetic) elKinetic.textContent = `${(totalKinetic * 0.1).toFixed(2)} keV`;

    // Raio de Larmor teórico: r_L = m v / (|q| B)
    const elLarmor = document.getElementById('metric-larmor');
    const elFc = document.getElementById('metric-fcyclotron');
    const bAbs = Math.abs(state.bField);

    if (bAbs > 0.05 && state.particles.length > 0) {
      const p0 = state.particles[0];
      const v0 = Math.hypot(p0.vx, p0.vy);
      const rL = (p0.m * v0) / (Math.abs(p0.q) * bAbs);
      if (elLarmor) elLarmor.textContent = `~${rL.toFixed(1)} px`;

      // Frequência de ciclotron f_c = q B / (2pi m)
      const fc = (Math.abs(p0.q) * bAbs) / (2 * Math.PI * p0.m) * 10;
      if (elFc) elFc.textContent = `${fc.toFixed(2)} MHz`;
    } else {
      if (elLarmor) elLarmor.textContent = bAbs < 0.05 ? '∞ (B = 0)' : '—';
      if (elFc) elFc.textContent = bAbs < 0.05 ? '0.00 MHz' : '—';
    }

    // Balanço de carga
    let netCharge = 0;
    for (let c of state.charges) netCharge += c.q;
    const elChargeBal = document.getElementById('metric-charge-balance');
    if (elChargeBal) elChargeBal.textContent = `${netCharge >= 0 ? '+' : ''}${netCharge.toFixed(2)} μC`;

    // Telemetria no header
    const statCharges = document.getElementById('stat-charges');
    const statBz = document.getElementById('stat-bz');
    const statParticles = document.getElementById('stat-particles');

    if (statCharges) statCharges.textContent = state.charges.length;
    if (statBz) statBz.textContent = `${state.bField.toFixed(2)} T`;
    if (statParticles) statParticles.textContent = state.particles.length;
  }

  /* ==========================================================================
     Carregamento de Presets Clássicos
     ========================================================================== */
  function loadPreset(name) {
    state.activePreset = name;
    state.charges = [];
    state.particles = [];
    state.cyclotron.active = false;
    state.spectrometer.active = false;

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    const pTitle = document.getElementById('preset-info-title');
    const pDesc = document.getElementById('preset-info-desc');

    switch (name) {
      case 'dipole':
        state.bField = 0.0;
        state.charges.push({ x: cx - 140, y: cy, q: 5.0 });
        state.charges.push({ x: cx + 140, y: cy, q: -5.0 });
        if (pTitle) pTitle.textContent = 'Dipolo Eletrostático (+q, -q)';
        if (pDesc) pDesc.textContent = 'O mapa clássico de Faraday com duas cargas pontuais opostas. As linhas de campo elétrico emanam do polo positivo e convergem no polo negativo, cortando ortogonalmente as superfícies equipotenciais pontilhadas.';
        break;

      case 'faraday-cage':
        state.bField = 0.0;
        const numCage = 10;
        const cageRadius = 130;
        for (let i = 0; i < numCage; i++) {
          const theta = (2 * Math.PI * i) / numCage;
          state.charges.push({
            x: cx + cageRadius * Math.cos(theta),
            y: cy + cageRadius * Math.sin(theta),
            q: 2.0
          });
        }
        if (pTitle) pTitle.textContent = 'Gaiola de Faraday (Blindagem Eletrostática)';
        if (pDesc) pDesc.textContent = 'O Teorema de Gauss demonstra que a superposição dos campos de todas as cargas do anel se anula perfeitamente no interior (∑E = 0). As partículas que entram na zona blindada não sofrem força elétrica (F = q·E = 0) e viajam em linha reta por inércia! As partículas que passam por fora sofrem forte deflexão pelas cargas.';
        break;

      case 'cyclotron':
        state.bField = 1.30;
        state.cyclotron.active = true;
        state.cyclotron.gapX = cx;
        state.cyclotron.omegaC = 1.30 / 1.75; // omega_c = qB / m para proton (m = 1.75)
        state.currentTool = 'select-move';
        // Injeta próton no centro para iniciar espiral acelerada
        spawnParticle(cx - 5, cy, 30, 0, 'proton');
        if (pTitle) pTitle.textContent = 'Ciclotron Acelerador de Lawrence';
        if (pDesc) pDesc.textContent = 'Dois semicírculos condutores (Dees) com campo magnético constante Bz defletindo o próton em semicírculos, enquanto um gap elétrico alternado acelera a partícula a cada passagem. (Nota: não utiliza cargas pontuais livres).';
        break;

      case 'mass-spectrometer':
        state.bField = 1.25;
        state.spectrometer.active = true;
        state.spectrometer.splitX = cx - 40;
        state.spectrometer.slitAperture = 18;
        state.spectrometer.eFieldSelector = 90.0 * 1.25; // Condição de Bainbridge: E = v * B para passar reto na fenda
        state.spectrometer.detectorHits = [];
        state.currentTool = 'select-move';
        // Injeta duas partículas de massas distintas com mesma velocidade para observar separação
        spawnParticle(45, cy, 90, 0, 'electron');
        spawnParticle(45, cy, 90, 0, 'proton');
        if (pTitle) pTitle.textContent = 'Espectrômetro de Massa de Bainbridge';
        if (pDesc) pDesc.textContent = 'Estágio 1: Seletor de velocidades E ⊥ B. Estágio 2: Câmara com campo magnético puro (sem cargas elétricas livres, para não perturbar os semicírculos de massa r_L = mv/qB). Os picos espectrais são registrados na placa detectora!';
        break;

      case 'exb-drift':
        state.bField = 1.20;
        // Cria arranjo de placas superior positiva e inferior negativa
        for (let x = 80; x < canvas.width - 80; x += 60) {
          state.charges.push({ x, y: cy - 140, q: 3.0 });
          state.charges.push({ x, y: cy + 140, q: -3.0 });
        }
        spawnParticle(cx - 100, cy, 0, 0, 'proton');
        spawnParticle(cx - 100, cy - 30, 0, 0, 'electron');
        if (pTitle) pTitle.textContent = 'Deriva de Plasma E × B';
        if (pDesc) pDesc.textContent = 'Partículas carregadas em campos elétrico e magnético cruzados perpendiculares executam movimento cicloidal com velocidade de deriva guia v_d = (E × B) / B², fundamental na física de confinamento magnético em Tokamaks.';
        break;
    }

    syncControlsToState();
  }

  function syncControlsToState() {
    const sB = document.getElementById('slider-b-field');
    const vB = document.getElementById('val-b-field');
    if (sB && vB) {
      sB.value = state.bField;
      vB.textContent = `${state.bField.toFixed(2)} T`;
    }

    const sMag = document.getElementById('slider-charge-mag');
    const vMag = document.getElementById('val-charge-mag');
    if (sMag && vMag) {
      sMag.value = state.chargeMagnitude;
      vMag.textContent = `${state.chargeMagnitude.toFixed(1)} μC`;
    }

    const sSeeds = document.getElementById('slider-seeds-count');
    const vSeeds = document.getElementById('val-seeds-count');
    if (sSeeds && vSeeds) {
      sSeeds.value = state.seedsCount;
      vSeeds.textContent = state.seedsCount;
    }

    const sSpeed = document.getElementById('slider-particle-speed');
    const vSpeed = document.getElementById('val-particle-speed');
    if (sSpeed && vSpeed) {
      sSpeed.value = state.particleSpeed;
      vSpeed.textContent = `${state.particleSpeed} km/s`;
    }

    const toolBtns = document.querySelectorAll('.tool-btn');
    toolBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tool === state.currentTool);
    });

    updateMagneticIndicator();
  }

  function updateMagneticIndicator() {
    const Bz = state.bField;
    const bIcon = document.getElementById('b-icon');
    const bText = document.getElementById('b-text');
    const hudSym = document.getElementById('b-hud-symbol');
    const hudTxt = document.getElementById('b-hud-text');

    if (Math.abs(Bz) < 0.05) {
      if (bIcon) bIcon.textContent = '○';
      if (bText) bText.textContent = 'Campo B Desativado (B_z = 0)';
      if (hudSym) hudSym.textContent = '○';
      if (hudTxt) hudTxt.textContent = 'B_z = 0.00 T';
    } else if (Bz < 0) {
      if (bIcon) bIcon.textContent = '⊗';
      if (bText) bText.textContent = `Entrando no Plano (Bz = ${Bz.toFixed(2)} T)`;
      if (hudSym) hudSym.textContent = '⊗';
      if (hudTxt) hudTxt.textContent = `B_z = ${Bz.toFixed(2)} T`;
    } else {
      if (bIcon) bIcon.textContent = '⊙';
      if (bText) bText.textContent = `Saindo do Plano (Bz = +${Bz.toFixed(2)} T)`;
      if (hudSym) hudSym.textContent = '⊙';
      if (hudTxt) hudTxt.textContent = `B_z = +${Bz.toFixed(2)} T`;
    }
  }

  /* ==========================================================================
     Tratamento de Interações do Usuário (Mouse, Touch e Teclado)
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

  function findChargeNear(x, y, threshold = 22) {
    for (let i = state.charges.length - 1; i >= 0; i--) {
      const c = state.charges[i];
      if (Math.hypot(c.x - x, c.y - y) <= threshold) {
        return { charge: c, index: i };
      }
    }
    return null;
  }

  function setupInteractions() {
    // Canvas Mouse & Touch
    canvas.addEventListener('mousedown', (e) => {
      const coords = getCanvasCoords(e);
      const hit = findChargeNear(coords.x, coords.y);

      if (state.currentTool === 'select-move' || hit) {
        if (hit) {
          state.draggedCharge = hit.charge;
          state.dragOffset = { x: hit.charge.x - coords.x, y: hit.charge.y - coords.y };
          return;
        }
      }

      if (state.currentTool === 'add-pos') {
        state.charges.push({ x: coords.x, y: coords.y, q: state.chargeMagnitude });
        return;
      }

      if (state.currentTool === 'add-neg') {
        state.charges.push({ x: coords.x, y: coords.y, q: -state.chargeMagnitude });
        return;
      }

      // Se não atingiu carga, inicia vetor de mira para disparar partícula
      state.isAiming = true;
      state.aimStart = coords;
      state.aimCurrent = coords;
    });

    window.addEventListener('mousemove', (e) => {
      const coords = getCanvasCoords(e);

      if (state.draggedCharge) {
        state.draggedCharge.x = coords.x + state.dragOffset.x;
        state.draggedCharge.y = coords.y + state.dragOffset.y;
        return;
      }

      if (state.isAiming) {
        state.aimCurrent = coords;
      }
    });

    window.addEventListener('mouseup', () => {
      if (state.draggedCharge) {
        state.draggedCharge = null;
      }

      if (state.isAiming) {
        state.isAiming = false;
        if (aimHud) aimHud.style.display = 'none';

        const { x: sx, y: sy } = state.aimStart;
        const { x: cx, y: cy } = state.aimCurrent;
        const dist = Math.hypot(cx - sx, cy - sy);

        if (dist > 8) {
          const vx = (cx - sx) * 6.0;
          const vy = (cy - sy) * 6.0;
          spawnParticle(sx, sy, vx, vy, state.selectedParticleType);
        }
      }
    });

    // Touch events
    canvas.addEventListener('touchstart', (e) => {
      const coords = getCanvasCoords(e);
      const hit = findChargeNear(coords.x, coords.y);

      if (hit) {
        state.draggedCharge = hit.charge;
        state.dragOffset = { x: hit.charge.x - coords.x, y: hit.charge.y - coords.y };
      } else if (state.currentTool === 'add-pos') {
        state.charges.push({ x: coords.x, y: coords.y, q: state.chargeMagnitude });
      } else if (state.currentTool === 'add-neg') {
        state.charges.push({ x: coords.x, y: coords.y, q: -state.chargeMagnitude });
      } else {
        state.isAiming = true;
        state.aimStart = coords;
        state.aimCurrent = coords;
      }
      e.preventDefault();
    }, { passive: false });

    canvas.addEventListener('touchmove', (e) => {
      const coords = getCanvasCoords(e);
      if (state.draggedCharge) {
        state.draggedCharge.x = coords.x + state.dragOffset.x;
        state.draggedCharge.y = coords.y + state.dragOffset.y;
      } else if (state.isAiming) {
        state.aimCurrent = coords;
      }
      e.preventDefault();
    }, { passive: false });

    window.addEventListener('touchend', () => {
      if (state.draggedCharge) state.draggedCharge = null;
      if (state.isAiming) {
        state.isAiming = false;
        const { x: sx, y: sy } = state.aimStart;
        const { x: cx, y: cy } = state.aimCurrent;
        const dist = Math.hypot(cx - sx, cy - sy);
        if (dist > 8) {
          spawnParticle(sx, sy, (cx - sx) * 6.0, (cy - sy) * 6.0, state.selectedParticleType);
        }
      }
    });

    // Ferramentas
    const toolBtns = document.querySelectorAll('.tool-btn');
    toolBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        toolBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.currentTool = btn.dataset.tool;
      });
    });

    // Seleção de Partícula
    const particlePills = document.querySelectorAll('.pill-particle');
    particlePills.forEach(pill => {
      pill.addEventListener('click', () => {
        particlePills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        state.selectedParticleType = pill.dataset.particleType;
      });
    });

    // Sliders
    const sB = document.getElementById('slider-b-field');
    const vB = document.getElementById('val-b-field');
    if (sB && vB) {
      sB.addEventListener('input', (e) => {
        state.bField = parseFloat(e.target.value);
        vB.textContent = `${state.bField.toFixed(2)} T`;
        updateMagneticIndicator();
      });
    }

    const sMag = document.getElementById('slider-charge-mag');
    const vMag = document.getElementById('val-charge-mag');
    if (sMag && vMag) {
      sMag.addEventListener('input', (e) => {
        state.chargeMagnitude = parseFloat(e.target.value);
        vMag.textContent = `${state.chargeMagnitude.toFixed(1)} μC`;
      });
    }

    const sSeeds = document.getElementById('slider-seeds-count');
    const vSeeds = document.getElementById('val-seeds-count');
    if (sSeeds && vSeeds) {
      sSeeds.addEventListener('input', (e) => {
        state.seedsCount = parseInt(e.target.value, 10);
        vSeeds.textContent = state.seedsCount;
      });
    }

    const sSpeed = document.getElementById('slider-particle-speed');
    const vSpeed = document.getElementById('val-particle-speed');
    if (sSpeed && vSpeed) {
      sSpeed.addEventListener('input', (e) => {
        state.particleSpeed = parseInt(e.target.value, 10);
        vSpeed.textContent = `${state.particleSpeed} km/s`;
      });
    }

    // Botões de Campo B rápido
    document.getElementById('btn-b-neg')?.addEventListener('click', () => {
      state.bField = -1.5;
      syncControlsToState();
    });
    document.getElementById('btn-b-zero')?.addEventListener('click', () => {
      state.bField = 0.0;
      syncControlsToState();
    });
    document.getElementById('btn-b-pos')?.addEventListener('click', () => {
      state.bField = 1.5;
      syncControlsToState();
    });

    // Disparar Feixe Central
    document.getElementById('btn-fire-particle')?.addEventListener('click', fireCentralBeam);

    // Barra Rápida Superior da Câmara
    const btnContinuous = document.getElementById('btn-toggle-continuous');
    const txtStreamStatus = document.getElementById('txt-stream-status');
    btnContinuous?.addEventListener('click', () => {
      state.continuousStream = !state.continuousStream;
      if (state.continuousStream) {
        btnContinuous.classList.remove('off');
        btnContinuous.classList.add('active');
        if (txtStreamStatus) txtStreamStatus.textContent = 'LIGADO';
      } else {
        btnContinuous.classList.remove('active');
        btnContinuous.classList.add('off');
        if (txtStreamStatus) txtStreamStatus.textContent = 'DESLIGADO';
      }
    });

    document.getElementById('btn-quick-electron')?.addEventListener('click', () => {
      const speed = state.particleSpeed * 0.05;
      spawnParticle(40, canvas.height / 2, speed, 0, 'electron');
    });

    document.getElementById('btn-quick-proton')?.addEventListener('click', () => {
      const speed = state.particleSpeed * 0.05;
      spawnParticle(40, canvas.height / 2, speed, 0, 'proton');
    });

    const guideBox = document.getElementById('chamber-test-guide');
    document.getElementById('btn-guide-toggle')?.addEventListener('click', () => {
      if (!guideBox) return;
      guideBox.style.display = (guideBox.style.display === 'none') ? 'flex' : 'none';
    });

    document.getElementById('btn-close-guide')?.addEventListener('click', () => {
      if (guideBox) guideBox.style.display = 'none';
    });

    // Toggles no header
    const btnLines = document.getElementById('btn-toggle-lines');
    btnLines?.addEventListener('click', () => {
      state.showLines = !state.showLines;
      btnLines.classList.toggle('active', state.showLines);
    });

    const btnEquip = document.getElementById('btn-toggle-equipotentials');
    btnEquip?.addEventListener('click', () => {
      state.showEquipotentials = !state.showEquipotentials;
      btnEquip.classList.toggle('active', state.showEquipotentials);
    });

    const btnGrid = document.getElementById('btn-toggle-grid-vectors');
    btnGrid?.addEventListener('click', () => {
      state.showGridVectors = !state.showGridVectors;
      btnGrid.classList.toggle('active', state.showGridVectors);
    });

    // Play / Pause
    const btnPlay = document.getElementById('btn-toggle-play');
    const iconPlay = document.getElementById('icon-play');
    const simStatusText = document.getElementById('sim-status-text');
    const simBadge = document.getElementById('sim-status-badge');

    btnPlay?.addEventListener('click', () => {
      state.isRunning = !state.isRunning;
      if (state.isRunning) {
        iconPlay.className = 'fas fa-pause';
        if (simStatusText) simStatusText.textContent = 'Câmara Ativa';
        if (simBadge) simBadge.className = 'telemetry-status-badge live';
      } else {
        iconPlay.className = 'fas fa-play';
        if (simStatusText) simStatusText.textContent = 'Pausada';
        if (simBadge) simBadge.className = 'telemetry-status-badge';
      }
    });

    // Limpezas
    document.getElementById('btn-clear-particles')?.addEventListener('click', () => {
      state.particles = [];
      energyHistory.length = 0;
    });

    document.getElementById('btn-clear-all')?.addEventListener('click', () => {
      state.charges = [];
      state.particles = [];
      energyHistory.length = 0;
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
      } else if (e.key === 'l' || e.key === 'L') {
        btnLines?.click();
      } else if (e.key === 'v' || e.key === 'V') {
        btnEquip?.click();
      } else if (e.key === 'g' || e.key === 'G') {
        btnGrid?.click();
      } else if (e.key === '1') loadPreset('dipole');
      else if (e.key === '2') loadPreset('faraday-cage');
      else if (e.key === '3') loadPreset('cyclotron');
      else if (e.key === '4') loadPreset('mass-spectrometer');
      else if (e.key === '5') loadPreset('exb-drift');
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
    const container = document.querySelector('.chamber-viewport-container');
    if (!container) return;

    const w = container.clientWidth;
    const h = container.clientHeight;

    canvas.width = w;
    canvas.height = h;

    // Se as cargas estiverem muito fora após redimensionamento grande, re-centraliza
    if (state.charges.length === 2 && state.activePreset === 'dipole') {
      const cx = w / 2;
      const cy = h / 2;
      state.charges[0].x = cx - 140;
      state.charges[0].y = cy;
      state.charges[1].x = cx + 140;
      state.charges[1].y = cy;
    }
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

    if (state.isRunning) {
      state.time += DT;
      const subDt = DT / SUB_STEPS;
      for (let s = 0; s < SUB_STEPS; s++) {
        stepParticles(subDt);
      }

      // Emissão contínua automática se ativo
      if (state.continuousStream) {
        state.streamTimer++;
        handleContinuousEmission();
      }
    }

    renderChamber();

    frameCount++;
    if (frameCount % 3 === 0) {
      renderTelemetry();
    }
  }

  /* ==========================================================================
     Inicialização do Laboratório
     ========================================================================== */
  function init() {
    handleResize();
    setupInteractions();
    loadPreset('dipole');
    requestAnimationFrame(mainLoop);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
