/**
 * ============================================================================
 * ORBITN — MOTOR GRAVITACIONAL DE N-CORPOS & DINÂMICA ORBITAL
 * Integração simplética Velocity Verlet O(Δt²) com conservação de energia
 * Zero dependências externas • Vanilla JavaScript ES6+
 * ============================================================================
 */

(function () {
  'use strict';

  /* ==========================================================================
     Classes Matemáticas & Vetoriais
     ========================================================================== */
  class Vec2 {
    constructor(x = 0, y = 0) {
      this.x = x;
      this.y = y;
    }

    set(x, y) {
      this.x = x;
      this.y = y;
      return this;
    }

    clone() {
      return new Vec2(this.x, this.y);
    }

    add(v) {
      return new Vec2(this.x + v.x, this.y + v.y);
    }

    sub(v) {
      return new Vec2(this.x - v.x, this.y - v.y);
    }

    scale(s) {
      return new Vec2(this.x * s, this.y * s);
    }

    dot(v) {
      return this.x * v.x + this.y * v.y;
    }

    lengthSq() {
      return this.x * this.x + this.y * this.y;
    }

    length() {
      return Math.sqrt(this.lengthSq());
    }

    normalize() {
      const len = this.length();
      return len > 1e-9 ? new Vec2(this.x / len, this.y / len) : new Vec2();
    }
  }

  /* ==========================================================================
     Partícula de Poeira / Explosão de Colisão Estelar
     ========================================================================== */
  class SparkParticle {
    constructor(x, y, vx, vy, color, maxLife = 35) {
      this.x = x;
      this.y = y;
      this.vx = vx;
      this.vy = vy;
      this.color = color;
      this.life = maxLife;
      this.maxLife = maxLife;
      this.size = Math.random() * 2.5 + 1.2;
    }

    update() {
      this.x += this.vx;
      this.y += this.vy;
      this.vx *= 0.94;
      this.vy *= 0.94;
      this.life--;
    }

    draw(ctx) {
      const alpha = Math.max(0, this.life / this.maxLife);
      ctx.save();
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size * alpha, 0, Math.PI * 2);
      ctx.fillStyle = this.color;
      ctx.globalAlpha = alpha;
      ctx.shadowColor = this.color;
      ctx.shadowBlur = 6;
      ctx.fill();
      ctx.restore();
    }
  }

  /* ==========================================================================
     Modelo de Corpo Celeste
     ========================================================================== */
  let nextBodyId = 1;

  class CelestialBody {
    constructor(options = {}) {
      this.id = nextBodyId++;
      this.name = options.name || `Corpo #${this.id}`;
      this.x = options.x || 0;
      this.y = options.y || 0;
      this.vx = options.vx || 0;
      this.vy = options.vy || 0;
      this.ax = 0;
      this.ay = 0;
      this.mass = options.mass || 10;
      this.radius = options.radius || this.calculateRadius(this.mass);
      this.color = options.color || this.determineColor(this.mass);
      this.isStar = options.isStar || (this.mass >= 500);

      // Buffer circular de rastro orbital pré-alocado (sem memory leak)
      this.maxTrail = options.maxTrail || 200;
      this.trailX = new Float32Array(this.maxTrail);
      this.trailY = new Float32Array(this.maxTrail);
      this.trailCount = 0;
      this.trailHead = 0;
      this.trailStep = 0;
    }

    calculateRadius(mass) {
      // R ∝ M^(1/3) com limites visuais
      const r = Math.cbrt(mass) * 1.8;
      return Math.max(3.5, Math.min(36, r));
    }

    determineColor(mass) {
      if (mass >= 1000) return '#fbbf24'; // Estrela amarela / Sol
      if (mass >= 300) return '#f43f5e';  // Anã vermelha
      if (mass >= 40) return '#818cf8';   // Gigante gasoso
      if (mass >= 8) return '#34d399';    // Planeta terrestre
      return '#a1a1aa';                   // Asteroide / Satélite
    }

    pushTrail() {
      // Grava rastro a cada 2 frames para economizar memória e manter suavidade
      this.trailStep++;
      if (this.trailStep % 2 !== 0) return;

      this.trailX[this.trailHead] = this.x;
      this.trailY[this.trailHead] = this.y;
      this.trailHead = (this.trailHead + 1) % this.maxTrail;
      if (this.trailCount < this.maxTrail) {
        this.trailCount++;
      }
    }

    drawTrail(ctx) {
      if (this.trailCount < 2) return;

      ctx.save();
      ctx.lineWidth = 1.4;

      for (let i = 0; i < this.trailCount - 1; i++) {
        // Índice do ponto mais antigo até o mais novo
        const idx1 = (this.trailHead - this.trailCount + i + this.maxTrail) % this.maxTrail;
        const idx2 = (idx1 + 1) % this.maxTrail;

        const x1 = this.trailX[idx1];
        const y1 = this.trailY[idx1];
        const x2 = this.trailX[idx2];
        const y2 = this.trailY[idx2];

        // Gradiente decrescente de opacidade (fade out)
        const alpha = (i / this.trailCount) * 0.7;

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = this.color;
        ctx.globalAlpha = alpha;
        ctx.stroke();
      }
      ctx.restore();
    }

    draw(ctx) {
      ctx.save();

      // Se for estrela: corona e brilho estelar
      if (this.isStar) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * 2.8, 0, Math.PI * 2);
        const corona = ctx.createRadialGradient(this.x, this.y, this.radius * 0.5, this.x, this.y, this.radius * 2.8);
        corona.addColorStop(0, 'rgba(251, 191, 36, 0.45)');
        corona.addColorStop(0.5, 'rgba(245, 158, 11, 0.15)');
        corona.addColorStop(1, 'rgba(251, 191, 36, 0)');
        ctx.fillStyle = corona;
        ctx.fill();
      }

      // Disco do corpo celeste com iluminação 3D
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);

      const grad = ctx.createRadialGradient(
        this.x - this.radius * 0.35,
        this.y - this.radius * 0.35,
        this.radius * 0.1,
        this.x,
        this.y,
        this.radius
      );
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.3, this.color);
      grad.addColorStop(1, '#09090b');
      ctx.fillStyle = grad;
      ctx.fill();

      // Borda sutil
      ctx.strokeStyle = this.isStar ? '#fef08a' : 'rgba(255, 255, 255, 0.25)';
      ctx.lineWidth = this.isStar ? 1.5 : 0.8;
      ctx.stroke();

      ctx.restore();
    }
  }

  /* ==========================================================================
     Integrador Numérico Velocity Verlet & Motor de N-Corpos
     ========================================================================== */
  class GravityEngine {
    constructor() {
      this.bodies = [];
      this.particles = [];
      this.G = 1.0;
      this.softening = 15.0; // Plummer softening ε
      this.totalCollisions = 0;
      this.initialEnergy = 0;
      this.currentEnergy = 0;
      this.deltaEnergyPercent = 0;
      this.barycenter = new Vec2();
    }

    addBody(body) {
      this.bodies.push(body);
      this.recalculateInitialEnergy();
    }

    clear() {
      this.bodies = [];
      this.particles = [];
      this.totalCollisions = 0;
      this.initialEnergy = 0;
      this.currentEnergy = 0;
      this.deltaEnergyPercent = 0;
    }

    // Calcula acelerações gravitacionais instantâneas com Plummer Softening
    computeAccelerations() {
      const n = this.bodies.length;
      const epsSq = this.softening * this.softening;

      // Zera acelerações
      for (let i = 0; i < n; i++) {
        this.bodies[i].ax = 0;
        this.bodies[i].ay = 0;
      }

      // Interações par-a-par (3ª Lei de Newton: Fij = -Fji)
      for (let i = 0; i < n; i++) {
        const bi = this.bodies[i];
        for (let j = i + 1; j < n; j++) {
          const bj = this.bodies[j];
          const dx = bj.x - bi.x;
          const dy = bj.y - bi.y;
          const distSq = dx * dx + dy * dy + epsSq;
          const dist = Math.sqrt(distSq);
          const forceFactor = (this.G) / (distSq * dist);

          const ax_i = dx * forceFactor * bj.mass;
          const ay_i = dy * forceFactor * bj.mass;
          const ax_j = -dx * forceFactor * bi.mass;
          const ay_j = -dy * forceFactor * bi.mass;

          bi.ax += ax_i;
          bi.ay += ay_i;
          bj.ax += ax_j;
          bj.ay += ay_j;
        }
      }
    }

    // Algoritmo Simplético Velocity Verlet de 2ª Ordem
    integrate(dt) {
      const n = this.bodies.length;
      if (n === 0) return;

      // 1. Passo de Posição: x(t + dt) = x(t) + v(t)*dt + 0.5*a(t)*dt²
      for (let i = 0; i < n; i++) {
        const b = this.bodies[i];
        b.x += b.vx * dt + 0.5 * b.ax * dt * dt;
        b.y += b.vy * dt + 0.5 * b.ay * dt * dt;
        b.pushTrail();
      }

      // Armazena acelerações antigas a(t)
      const oldAx = new Float32Array(n);
      const oldAy = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        oldAx[i] = this.bodies[i].ax;
        oldAy[i] = this.bodies[i].ay;
      }

      // 2. Detecção de Colisão Inelástica e Fusão de Massas
      this.handleCollisions();

      // 3. Recalcula acelerações nas novas posições a(t + dt)
      this.computeAccelerations();

      // 4. Passo de Velocidade: v(t + dt) = v(t) + 0.5*[a(t) + a(t + dt)]*dt
      const currentN = this.bodies.length;
      for (let i = 0; i < currentN; i++) {
        const b = this.bodies[i];
        const prevAx = (i < n) ? oldAx[i] : b.ax;
        const prevAy = (i < n) ? oldAy[i] : b.ay;

        b.vx += 0.5 * (prevAx + b.ax) * dt;
        b.vy += 0.5 * (prevAy + b.ay) * dt;
      }

      // 5. Atualização de Telemetria (Energia e Baricentro)
      this.updateTelemetry();

      // 6. Atualização de partículas visuais
      this.updateParticles();
    }

    // Fusão Inelástica com Conservação Estrita de Momento Linear
    handleCollisions() {
      const mergedIndices = new Set();
      const n = this.bodies.length;

      for (let i = 0; i < n; i++) {
        if (mergedIndices.has(i)) continue;
        const bi = this.bodies[i];

        for (let j = i + 1; j < n; j++) {
          if (mergedIndices.has(j)) continue;
          const bj = this.bodies[j];

          const dx = bj.x - bi.x;
          const dy = bj.y - bi.y;
          const dist = Math.hypot(dx, dy);

          // Teste de sobreposição de superfícies
          if (dist < (bi.radius + bj.radius) * 0.85) {
            this.totalCollisions++;

            // Define corpo dominante (maior massa absorve o menor)
            const dominant = (bi.mass >= bj.mass) ? bi : bj;
            const absorbed = (dominant === bi) ? bj : bi;
            const absorbedIndex = (dominant === bi) ? j : i;

            // Conservação de Momento: v_novo = (m1*v1 + m2*v2) / (m1 + m2)
            const totalMass = dominant.mass + absorbed.mass;
            dominant.vx = (dominant.mass * dominant.vx + absorbed.mass * absorbed.vx) / totalMass;
            dominant.vy = (dominant.mass * dominant.vy + absorbed.mass * absorbed.vy) / totalMass;

            // Centro de massa da fusão
            dominant.x = (dominant.mass * dominant.x + absorbed.mass * absorbed.x) / totalMass;
            dominant.y = (dominant.mass * dominant.y + absorbed.mass * absorbed.y) / totalMass;

            // Conservação de volume: R_novo = cbrt(R1³ + R2³)
            dominant.mass = totalMass;
            dominant.radius = dominant.calculateRadius(totalMass);
            dominant.isStar = dominant.mass >= 500;
            dominant.color = dominant.determineColor(totalMass);

            // Emissão de fagulhas de impacto
            this.spawnCollisionExplosion(dominant.x, dominant.y, dominant.color);

            mergedIndices.add(absorbedIndex);
          }
        }
      }

      if (mergedIndices.size > 0) {
        this.bodies = this.bodies.filter((_, idx) => !mergedIndices.has(idx));
      }
    }

    spawnCollisionExplosion(x, y, color) {
      const count = 16;
      for (let i = 0; i < count; i++) {
        const ang = Math.random() * Math.PI * 2;
        const spd = Math.random() * 4.5 + 1.0;
        this.particles.push(new SparkParticle(
          x,
          y,
          Math.cos(ang) * spd,
          Math.sin(ang) * spd,
          color,
          Math.floor(Math.random() * 20 + 20)
        ));
      }
    }

    updateParticles() {
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.update();
        if (p.life <= 0) {
          this.particles.splice(i, 1);
        }
      }
    }

    // Diagnóstico de Conservação de Energia Mecânica (E = K + U)
    calculateTotalEnergy() {
      let K = 0; // Energia Cinética
      let U = 0; // Energia Potencial Gravitacional
      const n = this.bodies.length;
      const epsSq = this.softening * this.softening;

      for (let i = 0; i < n; i++) {
        const bi = this.bodies[i];
        K += 0.5 * bi.mass * (bi.vx * bi.vx + bi.vy * bi.vy);

        for (let j = i + 1; j < n; j++) {
          const bj = this.bodies[j];
          const dx = bj.x - bi.x;
          const dy = bj.y - bi.y;
          const dist = Math.sqrt(dx * dx + dy * dy + epsSq);
          U -= (this.G * bi.mass * bj.mass) / dist;
        }
      }

      return K + U;
    }

    recalculateInitialEnergy() {
      this.computeAccelerations();
      this.initialEnergy = this.calculateTotalEnergy();
      this.currentEnergy = this.initialEnergy;
      this.deltaEnergyPercent = 0;
    }

    updateTelemetry() {
      const n = this.bodies.length;
      if (n === 0) {
        this.barycenter.set(0, 0);
        this.currentEnergy = 0;
        this.deltaEnergyPercent = 0;
        return;
      }

      // Baricentro: R_cm = sum(m_i * r_i) / sum(m_i)
      let totalMass = 0;
      let sumX = 0;
      let sumY = 0;

      for (let i = 0; i < n; i++) {
        const b = this.bodies[i];
        totalMass += b.mass;
        sumX += b.mass * b.x;
        sumY += b.mass * b.y;
      }

      if (totalMass > 0) {
        this.barycenter.set(sumX / totalMass, sumY / totalMass);
      }

      // Energia Mecânica e Desvio Percentual
      this.currentEnergy = this.calculateTotalEnergy();
      if (Math.abs(this.initialEnergy) > 1e-5) {
        this.deltaEnergyPercent = ((this.currentEnergy - this.initialEnergy) / Math.abs(this.initialEnergy)) * 100;
      }
    }
  }

  /* ==========================================================================
     Aplicação & Interface do Observatório Orbital
     ========================================================================== */
  class GravityApp {
    constructor() {
      this.canvas = document.getElementById('gravity-canvas');
      this.ctx = this.canvas.getContext('2d');
      this.viewport = document.getElementById('space-viewport');

      this.engine = new GravityEngine();

      // Câmera Orbital (Pan & Zoom)
      this.camera = {
        x: 0,
        y: 0,
        zoom: 1.0,
        isPanning: false,
        lastMouseX: 0,
        lastMouseY: 0
      };

      // Estado Temporal
      this.isPlaying = true;
      this.timeSpeed = 1.0;
      this.baseDt = 0.5;

      // Configuração de Visualização
      this.showTrails = true;
      this.showBarycenter = true;

      // Injeção Celeste Interativa
      this.isAiming = false;
      this.aimOrigin = new Vec2();
      this.aimCurrent = new Vec2();
      this.nextBodyMass = 10;
      this.nextBodyRadius = 6;
      this.nextBodyType = 'terrestrial';

      // Estrelas de fundo estáticas
      this.bgStars = this.generateBackgroundStars(160);

      // FPS Counter
      this.fps = 60;
      this.frameCount = 0;
      this.lastFpsUpdate = performance.now();

      this.initElements();
      this.initEvents();
      this.setupCanvasSize();
      this.loadPreset('solar'); // Inicia com o Sistema Solar Interno
      this.startLoop();
    }

    // Inicializa referências DOM
    initElements() {
      // Header & Controles de Tempo
      this.btnTogglePlay = document.getElementById('btn-toggle-play');
      this.iconPlayPause = document.getElementById('icon-play-pause');
      this.btnStep = document.getElementById('btn-step');
      this.speedPills = document.querySelectorAll('.speed-pill');
      this.btnPresetsToggle = document.getElementById('btn-presets-toggle');
      this.presetsDropdown = document.getElementById('presets-dropdown-menu');
      this.btnToggleTrails = document.getElementById('btn-toggle-trails');
      this.btnToggleBarycenter = document.getElementById('btn-toggle-barycenter');
      this.btnCenterCamera = document.getElementById('btn-center-camera');
      this.btnClearSpace = document.getElementById('btn-clear-space');

      // Telemetria HUD
      this.hudFps = document.getElementById('hud-fps');
      this.telemetryBodiesCount = document.getElementById('telemetry-bodies-count');
      this.telemetryCollisionsCount = document.getElementById('telemetry-collisions-count');
      this.telemetryEnergyVal = document.getElementById('telemetry-energy-val');
      this.telemetryDeltaEnergy = document.getElementById('telemetry-delta-energy');
      this.telemetryBarycenterVal = document.getElementById('telemetry-barycenter-val');

      // Aim HUD
      this.launchAimHud = document.getElementById('launch-aim-hud');
      this.launchAimV = document.getElementById('launch-aim-v');
      this.launchAimAngle = document.getElementById('launch-aim-angle');

      // Painel de Parâmetros
      this.inputNextMass = document.getElementById('input-next-mass');
      this.valNextMass = document.getElementById('val-next-mass');
      this.celestialPills = document.querySelectorAll('.celestial-pill');
      this.inputGravityG = document.getElementById('input-gravity-g');
      this.valGravityG = document.getElementById('val-gravity-g');
      this.inputSofteningEps = document.getElementById('input-softening-eps');
      this.valSofteningEps = document.getElementById('val-softening-eps');
      this.inputTrailLength = document.getElementById('input-trail-length');
      this.valTrailLength = document.getElementById('val-trail-length');
      this.btnResetPreset = document.getElementById('btn-reset-preset');

      // Modal & Toast
      this.shortcutsModal = document.getElementById('shortcuts-modal');
      this.btnToggleShortcuts = document.getElementById('btn-toggle-shortcuts');
      this.btnCloseModal = document.getElementById('btn-close-modal');
      this.toastContainer = document.getElementById('toast-container');
    }

    // Configura tamanho do canvas com suporte Retina DPI
    setupCanvasSize() {
      const rect = this.viewport.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;

      this.width = rect.width;
      this.height = rect.height;

      this.canvas.width = this.width * dpr;
      this.canvas.height = this.height * dpr;

      this.ctx.resetTransform();
      this.ctx.scale(dpr, dpr);
    }

    // Gera semente fixa de estrelas no vácuo
    generateBackgroundStars(count) {
      const stars = [];
      for (let i = 0; i < count; i++) {
        stars.push({
          x: (Math.random() - 0.5) * 3000,
          y: (Math.random() - 0.5) * 3000,
          radius: Math.random() * 1.2 + 0.4,
          alpha: Math.random() * 0.45 + 0.15
        });
      }
      return stars;
    }

    // Transformações de coordenadas Mundo <-> Tela
    screenToWorld(sx, sy) {
      const cx = this.width / 2;
      const cy = this.height / 2;
      return new Vec2(
        (sx - cx) / this.camera.zoom - this.camera.x,
        (sy - cy) / this.camera.zoom - this.camera.y
      );
    }

    worldToScreen(wx, wy) {
      const cx = this.width / 2;
      const cy = this.height / 2;
      return new Vec2(
        (wx + this.camera.x) * this.camera.zoom + cx,
        (wy + this.camera.y) * this.camera.zoom + cy
      );
    }

    // Vinculação de eventos
    initEvents() {
      window.addEventListener('resize', () => this.setupCanvasSize());

      // Mouse & Pointer no Canvas
      this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
      window.addEventListener('mousemove', (e) => this.onMouseMove(e));
      window.addEventListener('mouseup', (e) => this.onMouseUp(e));
      this.canvas.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });
      this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

      // Controles Temporais
      this.btnTogglePlay.addEventListener('click', () => this.togglePlay());
      this.btnStep.addEventListener('click', () => this.stepForward());

      this.speedPills.forEach(pill => {
        pill.addEventListener('click', () => {
          this.speedPills.forEach(p => p.classList.remove('active'));
          pill.classList.add('active');
          this.timeSpeed = parseFloat(pill.getAttribute('data-speed'));
          this.showToast(`Velocidade: ${this.timeSpeed}×`);
        });
      });

      // Presets Dropdown
      this.btnPresetsToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        this.btnPresetsToggle.parentElement.classList.toggle('open');
      });

      window.addEventListener('click', () => {
        this.btnPresetsToggle.parentElement.classList.remove('open');
      });

      document.querySelectorAll('#presets-dropdown-menu .dropdown-item').forEach(item => {
        item.addEventListener('click', () => {
          const presetName = item.getAttribute('data-preset');
          this.loadPreset(presetName);
          this.btnPresetsToggle.parentElement.classList.remove('open');
        });
      });

      // Botões do Topo
      this.btnToggleTrails.addEventListener('click', () => {
        this.showTrails = !this.showTrails;
        this.btnToggleTrails.setAttribute('aria-pressed', this.showTrails);
        this.btnToggleTrails.classList.toggle('active', this.showTrails);
        this.showToast(`Rastros Orbitais: ${this.showTrails ? 'Ativos' : 'Ocultos'}`);
      });

      this.btnToggleBarycenter.addEventListener('click', () => {
        this.showBarycenter = !this.showBarycenter;
        this.btnToggleBarycenter.setAttribute('aria-pressed', this.showBarycenter);
        this.btnToggleBarycenter.classList.toggle('active', this.showBarycenter);
        this.showToast(`Baricentro: ${this.showBarycenter ? 'Visível' : 'Oculto'}`);
      });

      this.btnCenterCamera.addEventListener('click', () => {
        this.centerCameraOnBarycenter();
      });

      this.btnClearSpace.addEventListener('click', () => {
        if (confirm('Deseja remover todos os corpos celestes ativos?')) {
          this.engine.clear();
          this.showToast('Espaço Cósmico Limpo');
        }
      });

      // Painel de Parâmetros
      this.inputNextMass.addEventListener('input', (e) => {
        const m = parseFloat(e.target.value);
        this.setNextMass(m);
      });

      this.celestialPills.forEach(pill => {
        pill.addEventListener('click', () => {
          this.celestialPills.forEach(p => p.classList.remove('active'));
          pill.classList.add('active');
          const m = parseFloat(pill.getAttribute('data-mass'));
          const r = parseFloat(pill.getAttribute('data-radius'));
          const t = pill.getAttribute('data-type');
          this.nextBodyMass = m;
          this.nextBodyRadius = r;
          this.nextBodyType = t;
          this.inputNextMass.value = m;
          this.valNextMass.textContent = m;
        });
      });

      this.inputGravityG.addEventListener('input', (e) => {
        const g = parseFloat(e.target.value);
        this.engine.G = g;
        this.valGravityG.textContent = g.toFixed(2);
      });

      this.inputSofteningEps.addEventListener('input', (e) => {
        const eps = parseFloat(e.target.value);
        this.engine.softening = eps;
        this.valSofteningEps.textContent = `${eps} px`;
      });

      this.inputTrailLength.addEventListener('input', (e) => {
        const len = parseInt(e.target.value, 10);
        this.valTrailLength.textContent = `${len} pts`;
        this.engine.bodies.forEach(b => {
          b.maxTrail = len;
        });
      });

      this.btnResetPreset.addEventListener('click', () => {
        if (this.currentPreset) {
          this.loadPreset(this.currentPreset);
          this.showToast('Preset Orbitando Reiniciado');
        }
      });

      // Modal de Atalhos
      this.btnToggleShortcuts.addEventListener('click', () => {
        this.shortcutsModal.style.display = 'flex';
      });

      this.btnCloseModal.addEventListener('click', () => {
        this.shortcutsModal.style.display = 'none';
      });

      window.addEventListener('click', (e) => {
        if (e.target === this.shortcutsModal) {
          this.shortcutsModal.style.display = 'none';
        }
      });

      // Atalhos de Teclado
      window.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT') return;

        switch (e.key) {
          case ' ':
            e.preventDefault();
            this.togglePlay();
            break;
          case 's':
          case 'S':
            this.stepForward();
            break;
          case 't':
          case 'T':
            this.btnToggleTrails.click();
            break;
          case 'c':
          case 'C':
            this.btnClearSpace.click();
            break;
          case 'r':
          case 'R':
            this.btnResetPreset.click();
            break;
          case '1':
            this.loadPreset('solar');
            break;
          case '2':
            this.loadPreset('three-body');
            break;
          case '3':
            this.loadPreset('figure-eight');
            break;
          case '4':
            this.loadPreset('galaxy-collision');
            break;
          case '5':
            this.loadPreset('binary-star');
            break;
          case 'Escape':
            this.shortcutsModal.style.display = 'none';
            break;
        }
      });
    }

    setNextMass(m) {
      this.nextBodyMass = m;
      this.valNextMass.textContent = m;
      this.celestialPills.forEach(p => {
        const pMass = parseFloat(p.getAttribute('data-mass'));
        p.classList.toggle('active', Math.abs(pMass - m) < 0.1);
      });
    }

    togglePlay() {
      this.isPlaying = !this.isPlaying;
      this.btnTogglePlay.setAttribute('aria-pressed', !this.isPlaying);
      this.iconPlayPause.className = this.isPlaying ? 'fas fa-pause' : 'fas fa-play';
      this.showToast(this.isPlaying ? 'Simulação Ativa' : 'Simulação Pausada');
    }

    stepForward() {
      if (!this.isPlaying) {
        this.engine.integrate(this.baseDt * this.timeSpeed);
        this.showToast('Passo Unitário Δt');
      }
    }

    centerCameraOnBarycenter() {
      this.camera.x = -this.engine.barycenter.x;
      this.camera.y = -this.engine.barycenter.y;
      this.camera.zoom = 1.0;
      this.showToast('Câmera Centralizada no Baricentro');
    }

    // Handlers de Mouse & Lançamento de Corpos
    onMouseDown(e) {
      const rect = this.canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;

      // Botão Direito ou Botão do Meio: Pan da Câmera
      if (e.button === 1 || e.button === 2) {
        this.camera.isPanning = true;
        this.camera.lastMouseX = sx;
        this.camera.lastMouseY = sy;
        this.canvas.style.cursor = 'grab';
        return;
      }

      // Botão Esquerdo: Início de Lançamento Gravitacional
      if (e.button === 0) {
        const worldPos = this.screenToWorld(sx, sy);
        this.isAiming = true;
        this.aimOrigin = worldPos;
        this.aimCurrent = worldPos.clone();
        this.launchAimHud.style.display = 'flex';
        this.updateAimHud(sx, sy);
      }
    }

    onMouseMove(e) {
      const rect = this.canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;

      if (this.camera.isPanning) {
        const dx = (sx - this.camera.lastMouseX) / this.camera.zoom;
        const dy = (sy - this.camera.lastMouseY) / this.camera.zoom;
        this.camera.x += dx;
        this.camera.y += dy;
        this.camera.lastMouseX = sx;
        this.camera.lastMouseY = sy;
        return;
      }

      if (this.isAiming) {
        this.aimCurrent = this.screenToWorld(sx, sy);
        this.updateAimHud(sx, sy);
      }
    }

    onMouseUp(e) {
      if (this.camera.isPanning) {
        this.camera.isPanning = false;
        this.canvas.style.cursor = 'crosshair';
      }

      if (this.isAiming) {
        this.isAiming = false;
        this.launchAimHud.style.display = 'none';

        // Vetor de velocidade: vetor oposto ao arraste (efeito estilingue) ou direto
        // Usamos vetor de estilingue: puxar para trás lança para frente
        const dragVector = this.aimOrigin.sub(this.aimCurrent);
        const velocityScale = 0.05; // Escala conveniente de velocidade
        const vx = dragVector.x * velocityScale;
        const vy = dragVector.y * velocityScale;

        // Injeta novo corpo celeste no simulador
        const newBody = new CelestialBody({
          x: this.aimOrigin.x,
          y: this.aimOrigin.y,
          vx: vx,
          vy: vy,
          mass: this.nextBodyMass,
          radius: this.nextBodyRadius,
          maxTrail: parseInt(this.inputTrailLength.value, 10)
        });

        this.engine.addBody(newBody);
        this.showToast(`Corpo Injetado: M = ${this.nextBodyMass}`);
      }
    }

    onWheel(e) {
      e.preventDefault();
      const rect = this.canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // Posição no mundo antes do zoom
      const worldBefore = this.screenToWorld(mouseX, mouseY);

      // Fator de escala exponencial suave
      const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
      const newZoom = Math.max(0.12, Math.min(6.0, this.camera.zoom * zoomFactor));

      this.camera.zoom = newZoom;

      // Ajusta pan para manter o cursor no mesmo ponto do mundo
      const worldAfter = this.screenToWorld(mouseX, mouseY);
      this.camera.x += (worldAfter.x - worldBefore.x);
      this.camera.y += (worldAfter.y - worldBefore.y);
    }

    updateAimHud(sx, sy) {
      const dragVector = this.aimOrigin.sub(this.aimCurrent);
      const v = dragVector.length() * 0.05;
      let angle = Math.atan2(dragVector.y, dragVector.x) * (180 / Math.PI);
      if (angle < 0) angle += 360;

      this.launchAimV.textContent = `v: ${v.toFixed(2)} km/s`;
      this.launchAimAngle.textContent = `θ: ${Math.round(angle)}°`;

      this.launchAimHud.style.left = `${sx + 16}px`;
      this.launchAimHud.style.top = `${sy + 16}px`;
    }

    showToast(msg) {
      const toast = document.createElement('div');
      toast.className = 'toast';
      toast.innerHTML = `<i class="fas fa-satellite text-solar"></i> <span>${msg}</span>`;
      this.toastContainer.appendChild(toast);

      setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
      }, 2400);
    }

    /* ========================================================================
       Presets da Mecânica Celeste Clássica & Caótica
       ======================================================================== */
    loadPreset(presetName) {
      this.currentPreset = presetName;
      this.engine.clear();

      this.camera.x = 0;
      this.camera.y = 0;
      this.camera.zoom = 1.0;

      switch (presetName) {
        case 'solar': {
          // Preset 1: Sistema Solar Interno com Sol, Mercúrio, Terra+Lua e Marte
          this.camera.zoom = 1.1;

          // Sol massivo
          const sun = new CelestialBody({
            name: 'Sol',
            x: 0,
            y: 0,
            vx: 0,
            vy: 0,
            mass: 12000,
            radius: 20,
            color: '#fbbf24',
            isStar: true
          });

          // Mercúrio
          const dMerc = 80;
          const vMerc = Math.sqrt((this.engine.G * sun.mass) / dMerc);
          const mercury = new CelestialBody({
            name: 'Mercúrio',
            x: 0,
            y: -dMerc,
            vx: vMerc,
            vy: 0,
            mass: 3,
            radius: 3.5,
            color: '#a1a1aa'
          });

          // Terra
          const dEarth = 175;
          const vEarth = Math.sqrt((this.engine.G * sun.mass) / dEarth);
          const earth = new CelestialBody({
            name: 'Terra',
            x: 0,
            y: -dEarth,
            vx: vEarth,
            vy: 0,
            mass: 14,
            radius: 6.5,
            color: '#34d399'
          });

          // Lua (orbitando a Terra)
          const dMoon = 16;
          const vMoonRel = Math.sqrt((this.engine.G * earth.mass) / dMoon);
          const moon = new CelestialBody({
            name: 'Lua',
            x: 0,
            y: -dEarth - dMoon,
            vx: vEarth + vMoonRel,
            vy: 0,
            mass: 0.6,
            radius: 2.5,
            color: '#e4e4e7'
          });

          // Marte
          const dMars = 265;
          const vMars = Math.sqrt((this.engine.G * sun.mass) / dMars);
          const mars = new CelestialBody({
            name: 'Marte',
            x: 0,
            y: -dMars,
            vx: vMars,
            vy: 0,
            mass: 7,
            radius: 4.8,
            color: '#f87171'
          });

          this.engine.addBody(sun);
          this.engine.addBody(mercury);
          this.engine.addBody(earth);
          this.engine.addBody(moon);
          this.engine.addBody(mars);
          this.showToast('Preset: Sistema Solar Interno');
          break;
        }

        case 'three-body': {
          // Preset 2: O Problema dos Três Corpos Caótico
          this.camera.zoom = 1.0;
          const L = 180;
          const m = 800;

          const p1 = new CelestialBody({
            name: 'Corpo Alfa',
            x: 0,
            y: -L / Math.sqrt(3),
            vx: -1.2,
            vy: 0.4,
            mass: m,
            color: '#38bdf8'
          });

          const p2 = new CelestialBody({
            name: 'Corpo Beta',
            x: -L / 2,
            y: L / (2 * Math.sqrt(3)),
            vx: 0.8,
            vy: -1.1,
            mass: m,
            color: '#fbbf24'
          });

          const p3 = new CelestialBody({
            name: 'Corpo Gama',
            x: L / 2,
            y: L / (2 * Math.sqrt(3)),
            vx: 0.4,
            vy: 0.7,
            mass: m,
            color: '#f43f5e'
          });

          this.engine.addBody(p1);
          this.engine.addBody(p2);
          this.engine.addBody(p3);
          this.showToast('Preset: Três Corpos Caótico');
          break;
        }

        case 'figure-eight': {
          // Preset 3: Coreografia Estável da Figura em 8 (Solução de Moore-Chenciner)
          this.camera.zoom = 1.4;
          const scale = 180;
          const m = 1000;

          // Parâmetros matemáticos canônicos da solução em 8
          const x1 = 0.97000436 * scale;
          const y1 = -0.24308753 * scale;
          const vx1 = 0.46620531 * (scale / 100) * 1.34;
          const vy1 = 0.43236573 * (scale / 100) * 1.34;

          const b1 = new CelestialBody({
            name: 'Coreografia 1',
            x: -x1,
            y: -y1,
            vx: vx1,
            vy: vy1,
            mass: m,
            color: '#34d399'
          });

          const b2 = new CelestialBody({
            name: 'Coreografia 2',
            x: x1,
            y: y1,
            vx: vx1,
            vy: vy1,
            mass: m,
            color: '#38bdf8'
          });

          const b3 = new CelestialBody({
            name: 'Coreografia 3',
            x: 0,
            y: 0,
            vx: -2 * vx1,
            vy: -2 * vy1,
            mass: m,
            color: '#fbbf24'
          });

          this.engine.addBody(b1);
          this.engine.addBody(b2);
          this.engine.addBody(b3);
          this.showToast('Preset: Figura de Oito (Moore-Chenciner)');
          break;
        }

        case 'galaxy-collision': {
          // Preset 4: Colisão de Duas Galáxias (Interação Gravitacional de Maré)
          this.camera.zoom = 0.85;

          const coreMassA = 4000;
          const coreA = new CelestialBody({
            name: 'Núcleo Galáctico A',
            x: -240,
            y: -80,
            vx: 0.9,
            vy: 0.35,
            mass: coreMassA,
            radius: 14,
            color: '#38bdf8',
            isStar: true
          });

          const coreMassB = 3500;
          const coreB = new CelestialBody({
            name: 'Núcleo Galáctico B',
            x: 240,
            y: 80,
            vx: -0.9,
            vy: -0.35,
            mass: coreMassB,
            radius: 13,
            color: '#f59e0b',
            isStar: true
          });

          this.engine.addBody(coreA);
          this.engine.addBody(coreB);

          // Disco estelar da Galáxia A
          for (let r = 35; r <= 130; r += 16) {
            const starsInRing = Math.round(r / 6);
            for (let i = 0; i < starsInRing; i++) {
              const ang = (i / starsInRing) * Math.PI * 2;
              const vOrb = Math.sqrt((this.engine.G * coreMassA) / r);
              this.engine.addBody(new CelestialBody({
                x: coreA.x + Math.cos(ang) * r,
                y: coreA.y + Math.sin(ang) * r,
                vx: coreA.vx - Math.sin(ang) * vOrb,
                vy: coreA.vy + Math.cos(ang) * vOrb,
                mass: 0.8,
                radius: 2.2,
                color: '#bae6fd'
              }));
            }
          }

          // Disco estelar da Galáxia B
          for (let r = 35; r <= 120; r += 16) {
            const starsInRing = Math.round(r / 6);
            for (let i = 0; i < starsInRing; i++) {
              const ang = (i / starsInRing) * Math.PI * 2;
              const vOrb = Math.sqrt((this.engine.G * coreMassB) / r);
              this.engine.addBody(new CelestialBody({
                x: coreB.x + Math.cos(ang) * r,
                y: coreB.y + Math.sin(ang) * r,
                vx: coreB.vx - Math.sin(ang) * vOrb,
                vy: coreB.vy + Math.cos(ang) * vOrb,
                mass: 0.8,
                radius: 2.2,
                color: '#fed7aa'
              }));
            }
          }

          this.showToast('Preset: Colisão Galáctica');
          break;
        }

        case 'binary-star': {
          // Preset 5: Sistema Estelar Binário com Planeta Circumbinário ("Tatooine")
          this.camera.zoom = 1.0;
          const starMass = 3200;
          const sep = 55;
          const vOrbStar = Math.sqrt((this.engine.G * starMass) / (4 * sep));

          const star1 = new CelestialBody({
            name: 'Estrela Alfa',
            x: -sep,
            y: 0,
            vx: 0,
            vy: vOrbStar,
            mass: starMass,
            radius: 12,
            color: '#fbbf24',
            isStar: true
          });

          const star2 = new CelestialBody({
            name: 'Estrela Beta',
            x: sep,
            y: 0,
            vx: 0,
            vy: -vOrbStar,
            mass: starMass,
            radius: 12,
            color: '#f43f5e',
            isStar: true
          });

          // Planeta circumbinário externo
          const dPlan = 230;
          const vOrbPlan = Math.sqrt((this.engine.G * (starMass * 2)) / dPlan);
          const planet = new CelestialBody({
            name: 'Tatooine',
            x: 0,
            y: -dPlan,
            vx: vOrbPlan,
            vy: 0,
            mass: 5,
            radius: 5,
            color: '#34d399'
          });

          this.engine.addBody(star1);
          this.engine.addBody(star2);
          this.engine.addBody(planet);
          this.showToast('Preset: Estrela Binária & Planeta Circumbinário');
          break;
        }
      }
    }

    /* ========================================================================
       Renderização Gráfica & Game Loop
       ======================================================================== */
    render() {
      // 1. Limpa tela
      this.ctx.clearRect(0, 0, this.width, this.height);

      // 2. Campo Estático de Estrelas de Fundo (Paralaxe Cósmico)
      this.drawBackgroundStars();

      // 3. Integração Física (se não estiver pausado)
      if (this.isPlaying) {
        this.engine.integrate(this.baseDt * this.timeSpeed);
      }

      // Aplica Matriz de Visualização da Câmera
      this.ctx.save();
      const cx = this.width / 2;
      const cy = this.height / 2;
      this.ctx.translate(cx, cy);
      this.ctx.scale(this.camera.zoom, this.camera.zoom);
      this.ctx.translate(this.camera.x, this.camera.y);

      // 4. Rastros Orbitais
      if (this.showTrails) {
        for (const body of this.engine.bodies) {
          body.drawTrail(this.ctx);
        }
      }

      // 5. Corpos Celestes
      for (const body of this.engine.bodies) {
        body.draw(this.ctx);
      }

      // 6. Fagulhas de Colisão
      for (const p of this.engine.particles) {
        p.draw(this.ctx);
      }

      // 7. Marcador de Baricentro (Centro de Massa)
      if (this.showBarycenter && this.engine.bodies.length > 0) {
        this.drawBarycenterMarker();
      }

      // 8. Vetor de Mira Interativo (durante drag de lançamento)
      if (this.isAiming) {
        this.drawAimVector();
      }

      this.ctx.restore();

      // 9. Atualiza Telemetria no HUD
      this.updateHUD();
    }

    drawBackgroundStars() {
      this.ctx.save();
      const cx = this.width / 2;
      const cy = this.height / 2;

      for (const star of this.bgStars) {
        // Efeito sutil de paralaxe com movimento de câmera
        const sx = ((star.x + this.camera.x * 0.15 * this.camera.zoom) % this.width + this.width) % this.width;
        const sy = ((star.y + this.camera.y * 0.15 * this.camera.zoom) % this.height + this.height) % this.height;

        this.ctx.beginPath();
        this.ctx.arc(sx, sy, star.radius, 0, Math.PI * 2);
        this.ctx.fillStyle = '#ffffff';
        this.ctx.globalAlpha = star.alpha;
        this.ctx.fill();
      }
      this.ctx.restore();
    }

    drawBarycenterMarker() {
      const bx = this.engine.barycenter.x;
      const by = this.engine.barycenter.y;
      const size = 10 / this.camera.zoom;

      this.ctx.save();
      this.ctx.strokeStyle = '#f59e0b';
      this.ctx.lineWidth = 1.2 / this.camera.zoom;
      this.ctx.setLineDash([3 / this.camera.zoom, 3 / this.camera.zoom]);

      // Cruz do centro de massa
      this.ctx.beginPath();
      this.ctx.moveTo(bx - size, by);
      this.ctx.lineTo(bx + size, by);
      this.ctx.moveTo(bx, by - size);
      this.ctx.lineTo(bx, by + size);
      this.ctx.stroke();

      // Círculo central
      this.ctx.beginPath();
      this.ctx.arc(bx, by, 3 / this.camera.zoom, 0, Math.PI * 2);
      this.ctx.fillStyle = '#f59e0b';
      this.ctx.fill();

      this.ctx.restore();
    }

    drawAimVector() {
      const p1 = this.aimOrigin;
      const p2 = this.aimCurrent;
      const drag = p1.sub(p2);
      const targetPoint = p1.add(drag); // Vetor apontando na direção do disparo

      this.ctx.save();

      // Linha elástica de mira
      this.ctx.beginPath();
      this.ctx.moveTo(p1.x, p1.y);
      this.ctx.lineTo(p2.x, p2.y);
      this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      this.ctx.lineWidth = 1.5 / this.camera.zoom;
      this.ctx.setLineDash([4 / this.camera.zoom, 4 / this.camera.zoom]);
      this.ctx.stroke();

      // Vetor de lançamento projetado
      this.ctx.beginPath();
      this.ctx.moveTo(p1.x, p1.y);
      this.ctx.lineTo(targetPoint.x, targetPoint.y);
      this.ctx.strokeStyle = '#22d3ee';
      this.ctx.lineWidth = 2.0 / this.camera.zoom;
      this.ctx.setLineDash([]);
      this.ctx.stroke();

      // Anel no corpo a ser lançado
      this.ctx.beginPath();
      this.ctx.arc(p1.x, p1.y, this.nextBodyRadius, 0, Math.PI * 2);
      this.ctx.fillStyle = '#22d3ee';
      this.ctx.shadowColor = '#22d3ee';
      this.ctx.shadowBlur = 10;
      this.ctx.fill();

      this.ctx.restore();
    }

    updateHUD() {
      this.telemetryBodiesCount.textContent = this.engine.bodies.length;
      this.telemetryCollisionsCount.textContent = this.engine.totalCollisions;

      // Energia Total formatada
      const E = this.engine.currentEnergy;
      this.telemetryEnergyVal.textContent = `${E.toExponential(3)} J`;

      // Conservação de Energia ΔE/E₀
      const delta = this.engine.deltaEnergyPercent;
      const deltaAbs = Math.abs(delta);
      this.telemetryDeltaEnergy.textContent = `${delta >= 0 ? '+' : ''}${delta.toFixed(3)}%`;

      if (deltaAbs < 0.05) {
        this.telemetryDeltaEnergy.className = 'conservation-badge good';
      } else {
        this.telemetryDeltaEnergy.className = 'conservation-badge warn';
      }

      // Baricentro
      const bx = Math.round(this.engine.barycenter.x);
      const by = Math.round(this.engine.barycenter.y);
      this.telemetryBarycenterVal.textContent = `(${bx}, ${by})`;
    }

    updateFps() {
      this.frameCount++;
      const now = performance.now();
      const elapsed = now - this.lastFpsUpdate;

      if (elapsed >= 500) {
        this.fps = Math.round((this.frameCount * 1000) / elapsed);
        this.hudFps.textContent = `${this.fps}.0 FPS`;
        this.frameCount = 0;
        this.lastFpsUpdate = now;
      }
    }

    startLoop() {
      const loop = () => {
        this.render();
        this.updateFps();
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    }
  }

  // Inicialização
  window.addEventListener('DOMContentLoaded', () => {
    window.orbitNApp = new GravityApp();
  });
})();
