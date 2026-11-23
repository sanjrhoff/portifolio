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
     Constantes Físico-Relativísticas
     ========================================================================== */
  const C_SIM = 14.1421356;    // Velocidade da luz na simulação (unidades/s)
  const C_SIM_SQ = 200.0;      // c_sim² para cálculo de Schwarzschild r_s = 2GM / c²

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
     Partícula de Acreção e Debris de Espaguetificação (TDE)
     ========================================================================== */
  class AccretionDebris {
    constructor(x, y, vx, vy, color, options = {}) {
      this.x = x;
      this.y = y;
      this.vx = vx;
      this.vy = vy;
      this.color = color || '#fbbf24';
      this.mass = options.mass || 0.08;
      this.size = options.size || (Math.random() * 2.2 + 1.2);
      this.life = options.life || (options.isPermanent ? 999999 : Math.floor(Math.random() * 550 + 400));
      this.maxLife = this.life;
      this.isPermanent = options.isPermanent || false;
      this.trail = [];
      this.maxTrail = 6;
      this.trailCounter = 0;
    }

    update(dt, blackHoles, G) {
      // Atração gravitacional dos buracos negros com amortecimento viscoso
      for (let i = 0; i < blackHoles.length; i++) {
        const bh = blackHoles[i];
        const dx = bh.x - this.x;
        const dy = bh.y - this.y;
        const distSq = dx * dx + dy * dy + 25; // Softening mínimo
        const dist = Math.sqrt(distSq);
        const force = (G * bh.mass) / (distSq * dist);
        this.vx += dx * force * dt;
        this.vy += dy * force * dt;
      }

      // Viscosidade hidrodinâmica do disco (decaimento tangencial lento)
      const visc = this.isPermanent ? 0.99992 : 0.9997;
      this.vx *= visc;
      this.vy *= visc;

      this.x += this.vx * dt;
      this.y += this.vy * dt;

      if (!this.isPermanent) {
        this.life -= dt;
      }

      // Amostragem de rastro térmico
      this.trailCounter++;
      if (this.trailCounter % 2 === 0) {
        this.trail.push({ x: this.x, y: this.y });
        if (this.trail.length > this.maxTrail) {
          this.trail.shift();
        }
      }
    }

    draw(ctx, nearestBh, rs, rph) {
      const alpha = this.isPermanent ? 0.92 : Math.max(0, Math.min(1, this.life / 60));
      if (alpha <= 0.01) return;

      let distToBh = 1000;
      let dopplerFactor = 1.0;

      if (nearestBh) {
        const dx = this.x - nearestBh.x;
        const dy = this.y - nearestBh.y;
        distToBh = Math.hypot(dx, dy);

        // Beaming Relativístico (Efeito Doppler):
        // Partículas que se movem no sentido de aproximação recebem boost (1.6x), o oposto atenuado
        dopplerFactor = this.vx < 0 ? 1.55 : 0.48;
      }

      // Gradiente Térmico de Corpo Negro proporcional à distância radial:
      let thermalColor = '#fbbf24';
      if (distToBh < rph + 18) {
        thermalColor = '#ffffff'; // Plasma térmico ultra-quente (>10^7 K)
      } else if (distToBh < rph + 55) {
        thermalColor = '#fef08a'; // Amarelo incandescente
      } else if (distToBh < rph + 110) {
        thermalColor = '#fbbf24'; // Ouro solar
      } else if (distToBh < rph + 180) {
        thermalColor = '#f97316'; // Âmbar
      } else {
        thermalColor = '#dc2626'; // Carmesim escuro / gás frio
      }

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';

      // Rastro térmico
      if (this.trail.length > 1) {
        ctx.beginPath();
        ctx.moveTo(this.trail[0].x, this.trail[0].y);
        for (let i = 1; i < this.trail.length; i++) {
          ctx.lineTo(this.trail[i].x, this.trail[i].y);
        }
        ctx.strokeStyle = thermalColor;
        ctx.globalAlpha = Math.min(1.0, alpha * 0.45 * dopplerFactor);
        ctx.lineWidth = Math.max(0.8, this.size * 0.7);
        ctx.stroke();
      }

      // Ponto de plasma com glow térmico
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fillStyle = thermalColor;
      ctx.globalAlpha = Math.min(1.0, alpha * dopplerFactor);
      ctx.shadowColor = thermalColor;
      ctx.shadowBlur = 7;
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
      this.type = options.type || (this.mass >= 3000 ? 'black-hole' : (this.mass >= 500 ? 'star' : 'planet'));
      this.isBlackHole = (this.type === 'black-hole');
      this.isStar = options.isStar || (this.mass >= 500 && !this.isBlackHole);

      // Parâmetros Relativísticos de Schwarzschild
      if (this.isBlackHole) {
        this.rs = options.rs || (2 * 1.0 * this.mass) / C_SIM_SQ;
        this.rph = 1.5 * this.rs;
        this.radius = options.radius || Math.max(12, this.rs);
        this.color = '#000000';
        this.pulseTime = Math.random() * 10;
        this.absorptionFlash = 0;
      } else {
        this.radius = options.radius || this.calculateRadius(this.mass);
        this.color = options.color || this.determineColor(this.mass);
        this.rs = 0;
        this.rph = 0;
        this.deformation = 1.0;
        this.deformationAngle = 0;
      }

      // Buffer circular de rastro orbital pré-alocado (sem memory leak)
      this.maxTrail = options.maxTrail || 200;
      this.trailX = new Float32Array(this.maxTrail);
      this.trailY = new Float32Array(this.maxTrail);
      this.trailCount = 0;
      this.trailHead = 0;
      this.trailStep = 0;
    }

    calculateRadius(mass) {
      if (this.isBlackHole) {
        return Math.max(12, (2 * 1.0 * mass) / C_SIM_SQ);
      }
      // R ∝ M^(1/3) com limites visuais
      const r = Math.cbrt(mass) * 1.8;
      return Math.max(3.5, Math.min(36, r));
    }

    recalcSchwarzschild(G) {
      if (this.isBlackHole) {
        this.rs = (2 * G * this.mass) / C_SIM_SQ;
        this.rph = 1.5 * this.rs;
        this.radius = Math.max(12, this.rs);
      }
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

      // RENDERIZAÇÃO RELATIVÍSTICA DE BURACO NEGRO (Gargantua / Singularidade)
      if (this.isBlackHole) {
        // 1. Lente Gravitacional Falsa: Círculo translúcido com distorção óptica ao redor do horizonte
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.rs * 3.4, 0, Math.PI * 2);
        const lensGrad = ctx.createRadialGradient(
          this.x, this.y, this.rs * 0.95,
          this.x, this.y, this.rs * 3.4
        );
        lensGrad.addColorStop(0, 'rgba(0, 0, 0, 0.98)');
        lensGrad.addColorStop(0.28, 'rgba(12, 10, 24, 0.45)');
        lensGrad.addColorStop(0.65, 'rgba(6, 182, 212, 0.08)');
        lensGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = lensGrad;
        ctx.fill();

        // 2. Esfera de Fótons (r_ph = 1.5 r_s): Anel luminescente fino com pulso senoidal
        this.pulseTime = (this.pulseTime || 0) + 0.05;
        const photonAlpha = 0.65 + 0.20 * Math.sin(3.5 * this.pulseTime);

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.rph, 0, Math.PI * 2);
        ctx.strokeStyle = '#67e8f9';
        ctx.lineWidth = 1.6;
        ctx.globalAlpha = photonAlpha;
        ctx.shadowColor = '#06b6d4';
        ctx.shadowBlur = 18;
        ctx.stroke();

        // Halo secundário ciano-violeta
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.rph * 1.03, 0, Math.PI * 2);
        ctx.strokeStyle = '#a855f7';
        ctx.lineWidth = 1.0;
        ctx.globalAlpha = photonAlpha * 0.55;
        ctx.shadowColor = '#8b5cf6';
        ctx.shadowBlur = 12;
        ctx.stroke();
        ctx.restore();

        // Flash de absorção de matéria no horizonte de eventos
        if (this.absorptionFlash > 0) {
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          ctx.beginPath();
          ctx.arc(this.x, this.y, this.rs + this.absorptionFlash * 8, 0, Math.PI * 2);
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2.4;
          ctx.globalAlpha = Math.min(1.0, this.absorptionFlash);
          ctx.shadowColor = '#38bdf8';
          ctx.shadowBlur = 24;
          ctx.stroke();
          ctx.restore();
          this.absorptionFlash -= 0.035;
        }

        // 3. Horizonte de Eventos (r_s): Círculo preto absoluto puro (#000000)
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.rs, 0, Math.PI * 2);
        ctx.fillStyle = '#000000';
        ctx.globalAlpha = 1.0;
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.fill();

        // Borda nítida de corte
        ctx.strokeStyle = 'rgba(103, 232, 249, 0.45)';
        ctx.lineWidth = 1.0;
        ctx.stroke();

        ctx.restore();
        return;
      }

      // CORPOS NORMAIS (Estrelas, Planetas, Asteroides)
      // Se sofrer distorção elipsoidal por maré relativística próxima ao Limite de Roche:
      if (this.deformation && this.deformation > 1.05) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.deformationAngle);

        const a = this.radius * this.deformation;
        const b = this.radius / Math.sqrt(this.deformation);

        ctx.beginPath();
        ctx.ellipse(0, 0, a, b, 0, 0, Math.PI * 2);

        const tidalGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, a);
        tidalGrad.addColorStop(0, '#ffffff');
        tidalGrad.addColorStop(0.3, this.color);
        tidalGrad.addColorStop(0.75, '#f59e0b');
        tidalGrad.addColorStop(1, '#ef4444');
        ctx.fillStyle = tidalGrad;
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 14;
        ctx.fill();

        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 1.6;
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        return;
      }

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
      this.accretionDebris = [];
      this.G = 1.0;
      this.softening = 15.0; // Plummer softening ε
      this.totalCollisions = 0;
      this.initialEnergy = 0;
      this.currentEnergy = 0;
      this.deltaEnergyPercent = 0;
      this.barycenter = new Vec2();
      this.activeBlackHole = null;
    }

    addBody(body) {
      if (body.isBlackHole) {
        body.recalcSchwarzschild(this.G);
      }
      this.bodies.push(body);
      this.recalculateInitialEnergy();
    }

    clear() {
      this.bodies = [];
      this.particles = [];
      this.accretionDebris = [];
      this.totalCollisions = 0;
      this.initialEnergy = 0;
      this.currentEnergy = 0;
      this.deltaEnergyPercent = 0;
      this.activeBlackHole = null;
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
      if (n === 0 && this.accretionDebris.length === 0) return;

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

      // 2. Interações Relativísticas de Schwarzschild & Limite de Roche
      this.updateRelativisticPhysics(dt);

      // 3. Detecção de Colisão Inelástica Clássica e Fusão de Massas
      this.handleCollisions();

      // 4. Recalcula acelerações nas novas posições a(t + dt)
      this.computeAccelerations();

      // 5. Passo de Velocidade: v(t + dt) = v(t) + 0.5*[a(t) + a(t + dt)]*dt
      const currentN = this.bodies.length;
      for (let i = 0; i < currentN; i++) {
        const b = this.bodies[i];
        const prevAx = (i < n) ? oldAx[i] : b.ax;
        const prevAy = (i < n) ? oldAy[i] : b.ay;

        b.vx += 0.5 * (prevAx + b.ax) * dt;
        b.vy += 0.5 * (prevAy + b.ay) * dt;
      }

      // 6. Atualização de Telemetria (Energia e Baricentro)
      this.updateTelemetry();

      // 7. Atualização de partículas visuais
      this.updateParticles();
    }

    // Módulo Relativístico de Buracos Negros: Schwarzschild, Fótons, Roche e Acreção
    updateRelativisticPhysics(dt) {
      // Identifica singularidades ativas
      const blackHoles = [];
      for (let i = 0; i < this.bodies.length; i++) {
        const b = this.bodies[i];
        if (b.isBlackHole) {
          b.recalcSchwarzschild(this.G);
          blackHoles.push(b);
        }
      }

      if (blackHoles.length > 0) {
        const bodiesToRemove = new Set();

        for (let i = 0; i < this.bodies.length; i++) {
          const body = this.bodies[i];
          if (body.isBlackHole) continue;

          for (let j = 0; j < blackHoles.length; j++) {
            const bh = blackHoles[j];
            const dx = body.x - bh.x;
            const dy = body.y - bh.y;
            const dist = Math.hypot(dx, dy);

            // A. Absorção direta no Horizonte de Eventos (r <= r_s)
            if (dist <= bh.rs) {
              this.absorbBodyInBlackHole(bh, body);
              bodiesToRemove.add(i);
              break;
            }

            // B. Limite de Roche: d_Roche = R * (2 * M_BH / m)^(1/3)
            const rocheLimit = body.radius * Math.cbrt((2 * bh.mass) / Math.max(0.1, body.mass));

            // Espaguetificação / Tidal Disruption Event (TDE)
            if (dist <= rocheLimit) {
              this.spawnTdeDebris(body, bh, dist);
              bodiesToRemove.add(i);
              break;
            }

            // Distorção Elipsoidal Preliminar
            if (dist <= rocheLimit * 1.5) {
              const factor = (rocheLimit * 1.5 - dist) / (rocheLimit * 0.5);
              body.deformation = 1.0 + 1.2 * (factor * factor);
              body.deformationAngle = Math.atan2(bh.y - body.y, bh.x - body.x);
            } else {
              body.deformation = 1.0;
            }
          }
        }

        if (bodiesToRemove.size > 0) {
          this.bodies = this.bodies.filter((_, idx) => !bodiesToRemove.has(idx));
        }
      }

      // Atualização dos debris de acreção e absorção no horizonte de eventos
      const maxDebris = 360;
      for (let i = this.accretionDebris.length - 1; i >= 0; i--) {
        const debris = this.accretionDebris[i];
        debris.update(dt, blackHoles, this.G);

        let absorbed = false;
        for (let j = 0; j < blackHoles.length; j++) {
          const bh = blackHoles[j];
          const distToBh = Math.hypot(debris.x - bh.x, debris.y - bh.y);

          // Consumido pela singularidade no horizonte de eventos
          if (distToBh <= bh.rs) {
            bh.mass += debris.mass;
            bh.recalcSchwarzschild(this.G);
            bh.absorptionFlash = Math.max(bh.absorptionFlash, 0.45);
            absorbed = true;
            break;
          }
        }

        if (absorbed || debris.life <= 0) {
          this.accretionDebris.splice(i, 1);
        }
      }

      // Limita quantidade máxima para garantir 60 FPS contínuo
      if (this.accretionDebris.length > maxDebris) {
        this.accretionDebris.splice(0, this.accretionDebris.length - maxDebris);
      }
    }

    absorbBodyInBlackHole(bh, body) {
      this.totalCollisions++;
      const totalMass = bh.mass + body.mass;

      // Conservação estrita de Momento Linear
      bh.vx = (bh.mass * bh.vx + body.mass * body.vx) / totalMass;
      bh.vy = (bh.mass * bh.vy + body.mass * body.vy) / totalMass;

      // Centro de massa
      bh.x = (bh.mass * bh.x + body.mass * body.x) / totalMass;
      bh.y = (bh.mass * bh.y + body.mass * body.y) / totalMass;
      bh.mass = totalMass;
      bh.recalcSchwarzschild(this.G);
      bh.absorptionFlash = 1.0;

      // Flash e ejeção pontual
      this.spawnCollisionExplosion(bh.x, bh.y, '#67e8f9');

      if (window.orbitNApp && window.orbitNApp.showToast) {
        window.orbitNApp.showToast(`Singularidade absorveu ${body.name} (M = ${Math.round(body.mass)})! Novo Rs: ${bh.rs.toFixed(1)} px`);
      }
    }

    spawnTdeDebris(body, bh, dist) {
      this.totalCollisions++;
      const debrisCount = Math.min(110, Math.max(55, Math.round(body.mass * 2.8) + 40));
      const radAngle = Math.atan2(body.y - bh.y, body.x - bh.x);
      const tangAngle = radAngle + Math.PI / 2;

      // Velocidade diferencial de maré
      const tideSpd = Math.sqrt((2 * this.G * bh.mass * body.radius) / (dist * dist + 10));

      for (let i = 0; i < debrisCount; i++) {
        // Dispersão ao longo do filamento de espaguete
        const offsetR = (Math.random() - 0.5) * body.radius * 2.8;
        const offsetT = (Math.random() - 0.5) * body.radius * 0.7;

        const px = body.x + Math.cos(radAngle) * offsetR + Math.cos(tangAngle) * offsetT;
        const py = body.y + Math.sin(radAngle) * offsetR + Math.sin(tangAngle) * offsetT;

        // Dispersão de velocidade tangencial e radial de maré
        const vTide = (offsetR / (body.radius * 1.5)) * tideSpd * 1.25;
        const vStoch = (Math.random() - 0.5) * 0.75;

        const pvx = body.vx + Math.cos(radAngle) * (vTide * 0.45) + Math.cos(tangAngle) * (vTide + vStoch);
        const pvy = body.vy + Math.sin(radAngle) * (vTide * 0.45) + Math.sin(tangAngle) * (vTide + vStoch);

        this.accretionDebris.push(new AccretionDebris(
          px, py, pvx, pvy, body.color, {
            mass: body.mass / debrisCount,
            size: Math.random() * 2.0 + 1.2,
            life: Math.floor(Math.random() * 600 + 450)
          }
        ));
      }

      this.spawnCollisionExplosion(body.x, body.y, body.color);

      if (window.orbitNApp && window.orbitNApp.showToast) {
        window.orbitNApp.showToast(`Espaguetificação (TDE) de ${body.name}: Rompimento no Limite de Roche!`);
      }
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
        this.activeBlackHole = null;
        return;
      }

      // Baricentro: R_cm = sum(m_i * r_i) / sum(m_i)
      let totalMass = 0;
      let sumX = 0;
      let sumY = 0;

      this.activeBlackHole = null;
      for (let i = 0; i < n; i++) {
        const b = this.bodies[i];
        totalMass += b.mass;
        sumX += b.mass * b.x;
        sumY += b.mass * b.y;
        if (b.isBlackHole && !this.activeBlackHole) {
          this.activeBlackHole = b;
        }
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
      this.telemetrySchwarzschildVal = document.getElementById('telemetry-schwarzschild-val');
      this.telemetryDebrisCount = document.getElementById('telemetry-debris-count');

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
          case '6':
            this.loadPreset('blackhole_accretion');
            break;
          case '7':
            this.loadPreset('blackhole_tde');
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

      // Determina tipo e raio aproximado com base na massa
      if (m >= 3000) {
        this.nextBodyType = 'black-hole';
        this.nextBodyRadius = Math.max(14, (2 * 1.0 * m) / C_SIM_SQ);
      } else if (m >= 500) {
        this.nextBodyType = 'star';
        this.nextBodyRadius = 18;
      } else if (m >= 40) {
        this.nextBodyType = 'gas-giant';
        this.nextBodyRadius = 10;
      } else if (m >= 8) {
        this.nextBodyType = 'terrestrial';
        this.nextBodyRadius = 6;
      } else {
        this.nextBodyType = 'asteroid';
        this.nextBodyRadius = 4;
      }

      this.celestialPills.forEach(p => {
        const pType = p.getAttribute('data-type');
        p.classList.toggle('active', pType === this.nextBodyType);
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

        // Injeta novo corpo celeste no simulador (com suporte a Buraco Negro)
        const isBH = (this.nextBodyType === 'black-hole') || (this.nextBodyMass >= 3000);
        const newBody = new CelestialBody({
          name: isBH ? `Singularidade #${this.engine.bodies.length + 1}` : undefined,
          x: this.aimOrigin.x,
          y: this.aimOrigin.y,
          vx: vx,
          vy: vy,
          mass: this.nextBodyMass,
          radius: this.nextBodyRadius,
          type: this.nextBodyType,
          isStar: this.nextBodyType === 'star',
          maxTrail: parseInt(this.inputTrailLength.value, 10)
        });

        this.engine.addBody(newBody);
        this.showToast(`${isBH ? 'Buraco Negro Injetado' : 'Corpo Injetado'}: M = ${this.nextBodyMass}`);
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

        case 'blackhole_accretion': {
          // Preset 6: Buraco Negro Supermassivo & Disco de Acreção (Gargantua)
          this.camera.zoom = 0.92;
          const bhMass = 4000;

          const gargantua = new CelestialBody({
            name: 'Gargantua (Singularidade)',
            x: 0,
            y: 0,
            vx: 0,
            vy: 0,
            mass: bhMass,
            type: 'black-hole'
          });
          this.engine.addBody(gargantua);

          // Disco de Acreção: 160 partículas keplerianas em alta velocidade relativística
          const debrisCount = 160;
          const innerR = gargantua.rph + 18;  // ~78 px
          const outerR = gargantua.rph + 160; // ~220 px

          for (let i = 0; i < debrisCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const radius = innerR + Math.pow(Math.random(), 0.72) * (outerR - innerR);
            const vOrb = Math.sqrt((this.engine.G * bhMass) / radius) * (1.0 + (Math.random() - 0.5) * 0.03);

            const px = Math.cos(angle) * radius;
            const py = Math.sin(angle) * radius;
            const pvx = -Math.sin(angle) * vOrb;
            const pvy = Math.cos(angle) * vOrb;

            this.engine.accretionDebris.push(new AccretionDebris(
              px, py, pvx, pvy, '#fbbf24', {
                mass: 0.04,
                size: Math.random() * 2.2 + 1.2,
                isPermanent: true
              }
            ));
          }

          // Planetas em órbitas relativísticas estáveis externas (Teorema de Birkhoff)
          const dMiller = 295;
          const vMiller = Math.sqrt((this.engine.G * bhMass) / dMiller);
          const miller = new CelestialBody({
            name: 'Planeta Miller',
            x: 0,
            y: -dMiller,
            vx: vMiller,
            vy: 0,
            mass: 8,
            radius: 5.5,
            color: '#38bdf8'
          });

          const dMann = 430;
          const vMann = Math.sqrt((this.engine.G * bhMass) / dMann);
          const mann = new CelestialBody({
            name: 'Planeta Mann',
            x: 0,
            y: -dMann,
            vx: vMann,
            vy: 0,
            mass: 14,
            radius: 6.5,
            color: '#34d399'
          });

          this.engine.addBody(miller);
          this.engine.addBody(mann);
          this.showToast('Preset: Buraco Negro & Disco de Acreção (Gargantua)');
          break;
        }

        case 'blackhole_tde': {
          // Preset 7: Espaguetificação Estelar (Tidal Disruption Event - TDE)
          this.camera.zoom = 1.05;
          const bhMass = 4000;

          const bh = new CelestialBody({
            name: 'Singularidade Central',
            x: 0,
            y: 0,
            vx: 0,
            vy: 0,
            mass: bhMass,
            type: 'black-hole'
          });
          this.engine.addBody(bh);

          // Estrela Solar em trajetória altamente excêntrica rasante
          // Periastro propositalmente abaixo do Limite de Roche (d_Roche ≈ 96 px)
          const star = new CelestialBody({
            name: 'Estrela Gigante',
            x: -440,
            y: -150,
            vx: 3.55,
            vy: 1.15,
            mass: 25,
            radius: 14,
            color: '#fbbf24',
            isStar: true
          });
          this.engine.addBody(star);

          this.showToast('Preset: Espaguetificação Estelar (TDE) — Observe o Rompimento de Roche!');
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

      // 4.5. Debris de Acreção e Filamentos de Espaguetificação (TDE)
      const activeBh = this.engine.activeBlackHole;
      const rs = activeBh ? activeBh.rs : 30;
      const rph = activeBh ? activeBh.rph : 45;
      for (let i = 0; i < this.engine.accretionDebris.length; i++) {
        this.engine.accretionDebris[i].draw(this.ctx, activeBh, rs, rph);
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

      // Leitura Relativística de Schwarzschild e Esfera de Fótons
      if (this.telemetrySchwarzschildVal) {
        if (this.engine.activeBlackHole) {
          const bh = this.engine.activeBlackHole;
          this.telemetrySchwarzschildVal.textContent = `Rs: ${bh.rs.toFixed(1)} px | Rph: ${bh.rph.toFixed(1)} px`;
        } else {
          this.telemetrySchwarzschildVal.textContent = 'Inativo (Espaço Newtoniano)';
        }
      }

      // Contagem de partículas de Acreção / TDE
      if (this.telemetryDebrisCount) {
        const count = this.engine.accretionDebris.length;
        this.telemetryDebrisCount.textContent = `${count} partícula${count !== 1 ? 's' : ''}`;
      }
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
