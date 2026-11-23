/**
 * ============================================================================
 * RAYLENS LAB — MOTOR DE TRAÇADO DE RAIOS & ÓTICA GEOMÉTRICA 2D
 * Simulação determinística de física ótica com renderização Canvas 2D
 * Zero dependências externas • Vanilla JavaScript ES6+
 * ============================================================================
 */

(function () {
  'use strict';

  /* ==========================================================================
     Constantes Matemáticas & Físicas
     ========================================================================== */
  const EPSILON = 1e-4;
  const MAX_DEPTH = 12;
  const DEG2RAD = Math.PI / 180;
  const RAD2DEG = 180 / Math.PI;

  // Cauchy dispersion constant B (em nm²) para vidro ótico
  const CAUCHY_B = 6000;

  /* ==========================================================================
     Utilitários Vetoriais 2D
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

    cross(v) {
      return this.x * v.y - this.y * v.x;
    }

    lengthSq() {
      return this.x * this.x + this.y * this.y;
    }

    length() {
      return Math.sqrt(this.lengthSq());
    }

    normalize() {
      const len = this.length();
      if (len > 1e-9) {
        return new Vec2(this.x / len, this.y / len);
      }
      return new Vec2(1, 0);
    }

    rotate(angleRad) {
      const cos = Math.cos(angleRad);
      const sin = Math.sin(angleRad);
      return new Vec2(
        this.x * cos - this.y * sin,
        this.x * sin + this.y * cos
      );
    }

    distTo(v) {
      return Math.hypot(this.x - v.x, this.y - v.y);
    }
  }

  /* ==========================================================================
     Conversor Físico de Comprimento de Onda (λ nm) para RGB
     Aproximação fidedigna do espectro eletromagnético visível (380 a 750 nm)
     ========================================================================== */
  function wavelengthToRGB(wavelength, alpha = 1.0) {
    let r = 0, g = 0, b = 0;
    const wl = Math.max(380, Math.min(750, wavelength));

    if (wl >= 380 && wl < 440) {
      r = -(wl - 440) / (440 - 380);
      g = 0.0;
      b = 1.0;
    } else if (wl >= 440 && wl < 490) {
      r = 0.0;
      g = (wl - 440) / (490 - 440);
      b = 1.0;
    } else if (wl >= 490 && wl < 510) {
      r = 0.0;
      g = 1.0;
      b = -(wl - 510) / (510 - 490);
    } else if (wl >= 510 && wl < 580) {
      r = (wl - 510) / (580 - 510);
      g = 1.0;
      b = 0.0;
    } else if (wl >= 580 && wl < 645) {
      r = 1.0;
      g = -(wl - 645) / (645 - 580);
      b = 0.0;
    } else if (wl >= 645 && wl <= 750) {
      r = 1.0;
      g = 0.0;
      b = 0.0;
    }

    // Fator de atenuação nas extremidades da visão humana (380-420 nm e 645-750 nm)
    let factor = 1.0;
    if (wl >= 380 && wl < 420) {
      factor = 0.3 + 0.7 * (wl - 380) / (420 - 380);
    } else if (wl >= 645 && wl <= 750) {
      factor = 0.3 + 0.7 * (750 - wl) / (750 - 645);
    }

    const R = Math.round(r * factor * 255);
    const G = Math.round(g * factor * 255);
    const B = Math.round(b * factor * 255);

    return {
      r: R,
      g: G,
      b: B,
      hex: `#${((1 << 24) + (R << 16) + (G << 8) + B).toString(16).slice(1)}`,
      rgba: (a = alpha) => `rgba(${R}, ${G}, ${B}, ${a})`
    };
  }

  // Lista dos 7 comprimentos de onda para decomposição da Luz Branca
  const WHITE_LIGHT_SPECTRUM = [
    405, // Violeta
    445, // Azul
    488, // Ciano
    532, // Verde
    589, // Amarelo
    635, // Laranja
    680  // Vermelho
  ];

  /* ==========================================================================
     Geometria: Interseção Raio-Segmento e Raio-Arco Circular
     ========================================================================== */
  function intersectRaySegment(rayOrigin, rayDir, p1, p2) {
    const vSeg = p2.sub(p1);
    const denom = rayDir.cross(vSeg);

    if (Math.abs(denom) < 1e-8) {
      return null; // Paralelos
    }

    const delta = p1.sub(rayOrigin);
    const t = delta.cross(vSeg) / denom;
    const u = delta.cross(rayDir) / denom;

    if (t > EPSILON && u >= 0 && u <= 1) {
      const hitPoint = rayOrigin.add(rayDir.scale(t));
      // Normal geométrica do segmento (perpendicular)
      const segLen = vSeg.length();
      const n0 = new Vec2(-vSeg.y / segLen, vSeg.x / segLen);
      // Garante normal apontando contra a direção incidente do raio
      const normal = (rayDir.dot(n0) > 0) ? n0.scale(-1) : n0;

      return {
        distance: t,
        point: hitPoint,
        normal: normal,
        u: u
      };
    }
    return null;
  }

  function intersectRayArc(rayOrigin, rayDir, center, radius, startAngle, endAngle, isConcave = false) {
    // Equação quadrática para interseção com círculo: |P + t*d - C|^2 = R^2
    const m = rayOrigin.sub(center);
    const b = m.dot(rayDir);
    const c = m.lengthSq() - radius * radius;
    const disc = b * b - c;

    if (disc < 0) return null;

    const sqrtDisc = Math.sqrt(disc);
    const t1 = -b - sqrtDisc;
    const t2 = -b + sqrtDisc;

    const candidates = [t1, t2].filter(t => t > EPSILON).sort((x, y) => x - y);

    for (const t of candidates) {
      const hitPoint = rayOrigin.add(rayDir.scale(t));
      const radVec = hitPoint.sub(center);
      let angle = Math.atan2(radVec.y, radVec.x);
      if (angle < 0) angle += Math.PI * 2;

      let normStart = startAngle % (Math.PI * 2);
      if (normStart < 0) normStart += Math.PI * 2;
      let normEnd = endAngle % (Math.PI * 2);
      if (normEnd < 0) normEnd += Math.PI * 2;

      let inArc = false;
      if (normStart <= normEnd) {
        inArc = angle >= normStart && angle <= normEnd;
      } else {
        inArc = angle >= normStart || angle <= normEnd;
      }

      if (inArc) {
        let normal = radVec.normalize();
        if (isConcave) {
          normal = normal.scale(-1);
        }
        if (rayDir.dot(normal) > 0) {
          normal = normal.scale(-1);
        }

        return {
          distance: t,
          point: hitPoint,
          normal: normal
        };
      }
    }
    return null;
  }

  /* ==========================================================================
     Classes dos Elementos Óticos da Bancada
     ========================================================================== */
  let nextElementId = 1;

  class OpticalElement {
    constructor(type, x, y, rotation = 0) {
      this.id = nextElementId++;
      this.type = type;
      this.x = x;
      this.y = y;
      this.rotation = rotation; // em radianos
      this.name = 'Elemento';
      this.category = 'generic';
    }

    getPosition() {
      return new Vec2(this.x, this.y);
    }

    setPosition(x, y) {
      this.x = x;
      this.y = y;
    }

    setRotation(rad) {
      this.rotation = (rad % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
    }

    // Alça de rotação (Gizmo knob) posicionada a 40px no eixo polar
    getRotationHandlePos() {
      const dist = 42;
      const angle = this.rotation - Math.PI / 2;
      return new Vec2(
        this.x + Math.cos(angle) * dist,
        this.y + Math.sin(angle) * dist
      );
    }

    // Checagem se um ponto (mouse) está próximo da alça de rotação
    isOverRotationHandle(mx, my) {
      const handle = this.getRotationHandlePos();
      return Math.hypot(mx - handle.x, my - handle.y) <= 12;
    }

    // Desenho do Gizmo de Seleção e Rotação
    drawGizmo(ctx) {
      const handle = this.getRotationHandlePos();

      ctx.save();
      // Linha guia até a alça
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(handle.x, handle.y);
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.7)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 3]);
      ctx.stroke();

      // Alça circular
      ctx.beginPath();
      ctx.arc(handle.x, handle.y, 7, 0, Math.PI * 2);
      ctx.fillStyle = '#06b6d4';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.setLineDash([]);
      ctx.stroke();
      ctx.restore();
    }
  }

  /* --- Fontes Emissoras --- */

  class LaserEmitter extends OpticalElement {
    constructor(x, y, rotation = 0) {
      super('emitter-laser', x, y, rotation);
      this.name = 'Laser Pontual';
      this.category = 'emitter';
      this.wavelength = 532; // Verde clássico Nd:YAG
      this.isWhiteLight = false;
      this.beamIntensity = 1.0;
    }

    containsPoint(px, py) {
      return Math.hypot(px - this.x, py - this.y) <= 20;
    }

    getInitialRays() {
      const dir = new Vec2(Math.cos(this.rotation), Math.sin(this.rotation));
      const origin = new Vec2(this.x, this.y);

      if (this.isWhiteLight) {
        return WHITE_LIGHT_SPECTRUM.map(wl => ({
          origin: origin.clone(),
          dir: dir.clone(),
          wavelength: wl,
          intensity: 0.9,
          currentMedium: 1.0,
          depth: 0,
          parentId: null
        }));
      }

      return [{
        origin: origin,
        dir: dir,
        wavelength: this.wavelength,
        intensity: this.beamIntensity,
        currentMedium: 1.0,
        depth: 0,
        parentId: null
      }];
    }

    draw(ctx, isSelected) {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rotation);

      // Corpo do canhão laser
      ctx.fillStyle = '#18181b';
      ctx.strokeStyle = isSelected ? '#06b6d4' : '#3f3f46';
      ctx.lineWidth = isSelected ? 2 : 1;

      // Retângulo do laser
      ctx.beginPath();
      ctx.roundRect(-24, -10, 36, 20, 4);
      ctx.fill();
      ctx.stroke();

      // Bocal emissor
      ctx.beginPath();
      ctx.rect(12, -6, 6, 12);
      const color = this.isWhiteLight ? '#ffffff' : wavelengthToRGB(this.wavelength).hex;
      ctx.fillStyle = color;
      ctx.fill();
      ctx.stroke();

      // Indicador luminoso traseiro
      ctx.beginPath();
      ctx.arc(-16, 0, 3, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();

      ctx.restore();

      if (isSelected) this.drawGizmo(ctx);
    }
  }

  class CollimatedEmitter extends OpticalElement {
    constructor(x, y, rotation = 0) {
      super('emitter-collimated', x, y, rotation);
      this.name = 'Feixe Colimado';
      this.category = 'emitter';
      this.width = 100;
      this.rayCount = 13;
      this.wavelength = 488; // Ciano
      this.isWhiteLight = false;
    }

    containsPoint(px, py) {
      const p = new Vec2(px - this.x, py - this.y).rotate(-this.rotation);
      return Math.abs(p.x) <= 15 && Math.abs(p.y) <= this.width / 2 + 10;
    }

    getInitialRays() {
      const dir = new Vec2(Math.cos(this.rotation), Math.sin(this.rotation));
      const perp = dir.rotate(Math.PI / 2);
      const rays = [];
      const step = this.width / (this.rayCount - 1);
      const startOffset = -this.width / 2;

      for (let i = 0; i < this.rayCount; i++) {
        const offset = startOffset + i * step;
        const origin = new Vec2(this.x, this.y).add(perp.scale(offset));

        if (this.isWhiteLight) {
          WHITE_LIGHT_SPECTRUM.forEach(wl => {
            rays.push({
              origin: origin.clone(),
              dir: dir.clone(),
              wavelength: wl,
              intensity: 0.8,
              currentMedium: 1.0,
              depth: 0,
              parentId: null
            });
          });
        } else {
          rays.push({
            origin: origin,
            dir: dir.clone(),
            wavelength: this.wavelength,
            intensity: 1.0,
            currentMedium: 1.0,
            depth: 0,
            parentId: null
          });
        }
      }
      return rays;
    }

    draw(ctx, isSelected) {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rotation);

      // Barra do colimador
      ctx.fillStyle = '#18181b';
      ctx.strokeStyle = isSelected ? '#06b6d4' : '#3f3f46';
      ctx.lineWidth = isSelected ? 2 : 1;

      ctx.beginPath();
      ctx.roundRect(-10, -this.width / 2 - 6, 16, this.width + 12, 4);
      ctx.fill();
      ctx.stroke();

      // Face de saída com fendas
      const color = this.isWhiteLight ? '#ffffff' : wavelengthToRGB(this.wavelength).hex;
      ctx.fillStyle = color;
      const step = this.width / (this.rayCount - 1);
      for (let i = 0; i < this.rayCount; i++) {
        const yPos = -this.width / 2 + i * step;
        ctx.beginPath();
        ctx.arc(6, yPos, 2, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();

      if (isSelected) this.drawGizmo(ctx);
    }
  }

  class RadialEmitter extends OpticalElement {
    constructor(x, y, rotation = 0) {
      super('emitter-radial', x, y, rotation);
      this.name = 'Fonte Radial 360°';
      this.category = 'emitter';
      this.rayCount = 24;
      this.wavelength = 589; // Amarelo Sódio
    }

    containsPoint(px, py) {
      return Math.hypot(px - this.x, py - this.y) <= 18;
    }

    getInitialRays() {
      const rays = [];
      const origin = new Vec2(this.x, this.y);
      const angleStep = (Math.PI * 2) / this.rayCount;

      for (let i = 0; i < this.rayCount; i++) {
        const ang = this.rotation + i * angleStep;
        rays.push({
          origin: origin.clone(),
          dir: new Vec2(Math.cos(ang), Math.sin(ang)),
          wavelength: this.wavelength,
          intensity: 0.8,
          currentMedium: 1.0,
          depth: 0,
          parentId: null
        });
      }
      return rays;
    }

    draw(ctx, isSelected) {
      ctx.save();
      ctx.translate(this.x, this.y);

      // Bulbo emissor esférico
      ctx.beginPath();
      ctx.arc(0, 0, 12, 0, Math.PI * 2);
      ctx.fillStyle = '#1c1917';
      ctx.strokeStyle = isSelected ? '#06b6d4' : '#44403c';
      ctx.lineWidth = isSelected ? 2 : 1;
      ctx.fill();
      ctx.stroke();

      // Núcleo luminoso
      const color = wavelengthToRGB(this.wavelength).hex;
      ctx.beginPath();
      ctx.arc(0, 0, 6, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 8;
      ctx.fill();

      ctx.restore();

      if (isSelected) this.drawGizmo(ctx);
    }
  }

  /* --- Espelhos Reflexivos --- */

  class PlaneMirror extends OpticalElement {
    constructor(x, y, rotation = 0) {
      super('mirror-plane', x, y, rotation);
      this.name = 'Espelho Plano';
      this.category = 'mirror';
      this.length = 130;
    }

    containsPoint(px, py) {
      const p = new Vec2(px - this.x, py - this.y).rotate(-this.rotation);
      return Math.abs(p.x) <= 12 && Math.abs(p.y) <= this.length / 2 + 6;
    }

    getSegments() {
      const half = this.length / 2;
      const p1 = new Vec2(0, -half).rotate(this.rotation).add(new Vec2(this.x, this.y));
      const p2 = new Vec2(0, half).rotate(this.rotation).add(new Vec2(this.x, this.y));
      return [{
        type: 'mirror-segment',
        p1: p1,
        p2: p2,
        element: this
      }];
    }

    draw(ctx, isSelected) {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rotation);

      const half = this.length / 2;

      // Face reflexiva prateada (linha frontal)
      ctx.beginPath();
      ctx.moveTo(0, -half);
      ctx.lineTo(0, half);
      ctx.strokeStyle = isSelected ? '#06b6d4' : '#e4e4e7';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Hachuras na face traseira do espelho (indicando lado não reflexivo)
      ctx.strokeStyle = '#71717a';
      ctx.lineWidth = 1;
      for (let y = -half + 4; y <= half; y += 8) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(-6, y + 4);
        ctx.stroke();
      }

      ctx.restore();

      if (isSelected) this.drawGizmo(ctx);
    }
  }

  class CurvedMirror extends OpticalElement {
    constructor(x, y, rotation = 0) {
      super('mirror-curved', x, y, rotation);
      this.name = 'Espelho Côncavo';
      this.category = 'mirror';
      this.radius = 180;
      this.apertureAngle = 55 * DEG2RAD; // Abertura angular do espelho
      this.isConcave = true;
    }

    containsPoint(px, py) {
      const p = new Vec2(px - this.x, py - this.y).rotate(-this.rotation);
      return Math.hypot(p.x, p.y) <= 40;
    }

    getSurfaces() {
      // Centro do círculo do espelho
      // Para espelho côncavo voltado para a esquerda, centro está em +radius no eixo local X
      const centerLocal = new Vec2(this.radius, 0);
      const centerGlobal = centerLocal.rotate(this.rotation).add(new Vec2(this.x, this.y));

      const midAngle = this.rotation + Math.PI; // Voltado para a esquerda
      const startAngle = midAngle - this.apertureAngle / 2;
      const endAngle = midAngle + this.apertureAngle / 2;

      return [{
        type: 'mirror-arc',
        center: centerGlobal,
        radius: this.radius,
        startAngle: startAngle,
        endAngle: endAngle,
        isConcave: this.isConcave,
        element: this
      }];
    }

    draw(ctx, isSelected) {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rotation);

      const cx = this.radius;
      const cy = 0;
      const start = Math.PI - this.apertureAngle / 2;
      const end = Math.PI + this.apertureAngle / 2;

      // Arco reflexivo
      ctx.beginPath();
      ctx.arc(cx, cy, this.radius, start, end, false);
      ctx.strokeStyle = isSelected ? '#06b6d4' : '#e4e4e7';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Hachuras do lado traseiro (externo)
      ctx.strokeStyle = '#71717a';
      ctx.lineWidth = 1;
      const steps = 14;
      const dTheta = this.apertureAngle / steps;
      for (let i = 0; i <= steps; i++) {
        const theta = start + i * dTheta;
        const x1 = cx + Math.cos(theta) * this.radius;
        const y1 = cy + Math.sin(theta) * this.radius;
        const x2 = cx + Math.cos(theta) * (this.radius - 8);
        const y2 = cy + Math.sin(theta) * (this.radius - 8) + 3;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }

      ctx.restore();

      if (isSelected) this.drawGizmo(ctx);
    }
  }

  /* --- Refratores (Dioptros, Lentes e Prismas) --- */

  class GlassBlock extends OpticalElement {
    constructor(x, y, rotation = 0) {
      super('refractor-block', x, y, rotation);
      this.name = 'Bloco de Vidro';
      this.category = 'refractor';
      this.width = 140;
      this.height = 80;
      this.refractiveIndex = 1.52; // Vidro Crown
    }

    containsPoint(px, py) {
      const p = new Vec2(px - this.x, py - this.y).rotate(-this.rotation);
      return Math.abs(p.x) <= this.width / 2 && Math.abs(p.y) <= this.height / 2;
    }

    getIndexAt(wavelength) {
      // Dispersão de Cauchy
      return this.refractiveIndex + (CAUCHY_B / (wavelength * wavelength));
    }

    getSegments() {
      const hw = this.width / 2;
      const hh = this.height / 2;
      const corners = [
        new Vec2(-hw, -hh),
        new Vec2(hw, -hh),
        new Vec2(hw, hh),
        new Vec2(-hw, hh)
      ].map(c => c.rotate(this.rotation).add(new Vec2(this.x, this.y)));

      return [
        { type: 'refractor-segment', p1: corners[0], p2: corners[1], element: this },
        { type: 'refractor-segment', p1: corners[1], p2: corners[2], element: this },
        { type: 'refractor-segment', p1: corners[2], p2: corners[3], element: this },
        { type: 'refractor-segment', p1: corners[3], p2: corners[0], element: this }
      ];
    }

    draw(ctx, isSelected) {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rotation);

      const hw = this.width / 2;
      const hh = this.height / 2;

      // Corpo de vidro com preenchimento semitransparente vítreo
      ctx.beginPath();
      ctx.rect(-hw, -hh, this.width, this.height);
      const grad = ctx.createLinearGradient(-hw, -hh, hw, hh);
      grad.addColorStop(0, 'rgba(6, 182, 212, 0.12)');
      grad.addColorStop(1, 'rgba(30, 41, 59, 0.22)');
      ctx.fillStyle = grad;
      ctx.fill();

      ctx.strokeStyle = isSelected ? '#06b6d4' : 'rgba(56, 189, 248, 0.4)';
      ctx.lineWidth = isSelected ? 2 : 1.5;
      ctx.stroke();

      // Label do índice n
      ctx.font = '10px JetBrains Mono';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.textAlign = 'center';
      ctx.fillText(`n = ${this.refractiveIndex.toFixed(3)}`, 0, 4);

      ctx.restore();

      if (isSelected) this.drawGizmo(ctx);
    }
  }

  class TriangularPrism extends OpticalElement {
    constructor(x, y, rotation = 0) {
      super('refractor-prism', x, y, rotation);
      this.name = 'Prisma Triangular';
      this.category = 'refractor';
      this.side = 130;
      this.refractiveIndex = 1.66; // Flint pesado para excelente dispersão
      this.enableDispersion = true;
    }

    containsPoint(px, py) {
      // Teste de ponto dentro do triângulo equilátero local
      const p = new Vec2(px - this.x, py - this.y).rotate(-this.rotation);
      const h = (Math.sqrt(3) / 2) * this.side;
      const y0 = -h / 3;
      const y1 = (2 * h) / 3;
      if (p.y < y0 || p.y > y1) return false;
      const halfW = (this.side / 2) * (1 - (p.y - y0) / h);
      return Math.abs(p.x) <= halfW + 4;
    }

    getIndexAt(wavelength) {
      if (!this.enableDispersion) return this.refractiveIndex;
      // Dispersão com coeficiente Cauchy acentuado para efeito visual espetacular
      return this.refractiveIndex + (10000 / (wavelength * wavelength));
    }

    getSegments() {
      const h = (Math.sqrt(3) / 2) * this.side;
      // Vértices do triângulo (vértice no topo, base horizontal)
      const vTop = new Vec2(0, -2 * h / 3);
      const vRight = new Vec2(this.side / 2, h / 3);
      const vLeft = new Vec2(-this.side / 2, h / 3);

      const pts = [vTop, vRight, vLeft].map(v =>
        v.rotate(this.rotation).add(new Vec2(this.x, this.y))
      );

      return [
        { type: 'refractor-segment', p1: pts[0], p2: pts[1], element: this },
        { type: 'refractor-segment', p1: pts[1], p2: pts[2], element: this },
        { type: 'refractor-segment', p1: pts[2], p2: pts[0], element: this }
      ];
    }

    draw(ctx, isSelected) {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rotation);

      const h = (Math.sqrt(3) / 2) * this.side;
      const vTop = { x: 0, y: -2 * h / 3 };
      const vRight = { x: this.side / 2, y: h / 3 };
      const vLeft = { x: -this.side / 2, y: h / 3 };

      ctx.beginPath();
      ctx.moveTo(vTop.x, vTop.y);
      ctx.lineTo(vRight.x, vRight.y);
      ctx.lineTo(vLeft.x, vLeft.y);
      ctx.closePath();

      const grad = ctx.createLinearGradient(0, vTop.y, 0, vRight.y);
      grad.addColorStop(0, 'rgba(139, 92, 246, 0.15)');
      grad.addColorStop(1, 'rgba(6, 182, 212, 0.1)');
      ctx.fillStyle = grad;
      ctx.fill();

      ctx.strokeStyle = isSelected ? '#06b6d4' : 'rgba(167, 139, 250, 0.45)';
      ctx.lineWidth = isSelected ? 2 : 1.5;
      ctx.stroke();

      ctx.font = '10px JetBrains Mono';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.textAlign = 'center';
      ctx.fillText(`n = ${this.refractiveIndex.toFixed(3)}`, 0, h / 6);

      ctx.restore();

      if (isSelected) this.drawGizmo(ctx);
    }
  }

  class BiconvexLens extends OpticalElement {
    constructor(x, y, rotation = 0) {
      super('refractor-lens-convex', x, y, rotation);
      this.name = 'Lente Biconvexa';
      this.category = 'refractor';
      this.height = 140;       // Abertura vertical
      this.thickness = 32;     // Espessura central
      this.refractiveIndex = 1.52; // Vidro Crown
      this.radius = 180;       // Raio de curvatura das faces esféricas
    }

    containsPoint(px, py) {
      const p = new Vec2(px - this.x, py - this.y).rotate(-this.rotation);
      return Math.abs(p.x) <= this.thickness / 2 + 8 && Math.abs(p.y) <= this.height / 2;
    }

    getIndexAt(wavelength) {
      return this.refractiveIndex + (CAUCHY_B / (wavelength * wavelength));
    }

    getSurfaces() {
      // Modelo de lente convergente com duas calotas esféricas
      // Centro da face esquerda fica no eixo +X local, arco voltado para -X
      // Centro da face direita fica no eixo -X local, arco voltado para +X
      const halfH = this.height / 2;
      const r = Math.max(halfH + 10, this.radius);

      // Distância do centro do círculo até o eixo vertical
      const d = Math.sqrt(Math.max(1, r * r - halfH * halfH));
      const arcHalfAngle = Math.asin(halfH / r);

      const centerRightGlobal = new Vec2(d - this.thickness / 4, 0).rotate(this.rotation).add(new Vec2(this.x, this.y));
      const centerLeftGlobal = new Vec2(-d + this.thickness / 4, 0).rotate(this.rotation).add(new Vec2(this.x, this.y));

      const angleRight = this.rotation + Math.PI;
      const angleLeft = this.rotation;

      return [
        {
          type: 'refractor-arc',
          center: centerRightGlobal,
          radius: r,
          startAngle: angleRight - arcHalfAngle,
          endAngle: angleRight + arcHalfAngle,
          isConcave: false,
          element: this
        },
        {
          type: 'refractor-arc',
          center: centerLeftGlobal,
          radius: r,
          startAngle: angleLeft - arcHalfAngle,
          endAngle: angleLeft + arcHalfAngle,
          isConcave: false,
          element: this
        }
      ];
    }

    draw(ctx, isSelected) {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rotation);

      const halfH = this.height / 2;
      const r = Math.max(halfH + 10, this.radius);
      const d = Math.sqrt(Math.max(1, r * r - halfH * halfH));
      const arcHalfAngle = Math.asin(halfH / r);

      ctx.beginPath();
      // Arco da face esquerda
      ctx.arc(d - this.thickness / 4, 0, r, Math.PI - arcHalfAngle, Math.PI + arcHalfAngle, false);
      // Arco da face direita
      ctx.arc(-d + this.thickness / 4, 0, r, -arcHalfAngle, arcHalfAngle, false);
      ctx.closePath();

      const grad = ctx.createRadialGradient(0, 0, 5, 0, 0, halfH);
      grad.addColorStop(0, 'rgba(6, 182, 212, 0.22)');
      grad.addColorStop(1, 'rgba(30, 41, 59, 0.12)');
      ctx.fillStyle = grad;
      ctx.fill();

      ctx.strokeStyle = isSelected ? '#06b6d4' : 'rgba(56, 189, 248, 0.5)';
      ctx.lineWidth = isSelected ? 2 : 1.5;
      ctx.stroke();

      // Distância focal aproximada (Fórmula dos Fabricantes de Lentes: 1/f = (n - 1)(2/R))
      const f = r / (2 * (this.refractiveIndex - 1));
      ctx.font = '9px JetBrains Mono';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.textAlign = 'center';
      ctx.fillText(`f ≈ ${Math.round(f)}px`, 0, -halfH + 14);

      ctx.restore();

      if (isSelected) this.drawGizmo(ctx);
    }
  }

  class BiconcaveLens extends OpticalElement {
    constructor(x, y, rotation = 0) {
      super('refractor-lens-concave', x, y, rotation);
      this.name = 'Lente Bicôncava';
      this.category = 'refractor';
      this.height = 140;
      this.edgeThickness = 40;
      this.centerThickness = 12;
      this.refractiveIndex = 1.52;
      this.radius = 160;
    }

    containsPoint(px, py) {
      const p = new Vec2(px - this.x, py - this.y).rotate(-this.rotation);
      return Math.abs(p.x) <= this.edgeThickness / 2 && Math.abs(p.y) <= this.height / 2;
    }

    getIndexAt(wavelength) {
      return this.refractiveIndex + (CAUCHY_B / (wavelength * wavelength));
    }

    getSurfaces() {
      const halfH = this.height / 2;
      const r = Math.max(halfH + 10, this.radius);
      const d = Math.sqrt(Math.max(1, r * r - halfH * halfH));
      const arcHalfAngle = Math.asin(halfH / r);

      const centerLeftGlobal = new Vec2(-d - this.centerThickness / 2, 0).rotate(this.rotation).add(new Vec2(this.x, this.y));
      const centerRightGlobal = new Vec2(d + this.centerThickness / 2, 0).rotate(this.rotation).add(new Vec2(this.x, this.y));

      return [
        {
          type: 'refractor-arc',
          center: centerLeftGlobal,
          radius: r,
          startAngle: this.rotation - arcHalfAngle,
          endAngle: this.rotation + arcHalfAngle,
          isConcave: true,
          element: this
        },
        {
          type: 'refractor-arc',
          center: centerRightGlobal,
          radius: r,
          startAngle: this.rotation + Math.PI - arcHalfAngle,
          endAngle: this.rotation + Math.PI + arcHalfAngle,
          isConcave: true,
          element: this
        }
      ];
    }

    draw(ctx, isSelected) {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rotation);

      const halfH = this.height / 2;
      const r = Math.max(halfH + 10, this.radius);
      const d = Math.sqrt(Math.max(1, r * r - halfH * halfH));
      const arcHalfAngle = Math.asin(halfH / r);
      const halfEdge = this.edgeThickness / 2;

      ctx.beginPath();
      // Top cap
      ctx.moveTo(-halfEdge, -halfH);
      ctx.lineTo(halfEdge, -halfH);
      // Arco côncavo direito
      ctx.arc(d + this.centerThickness / 2, 0, r, Math.PI - arcHalfAngle, Math.PI + arcHalfAngle, false);
      // Bottom cap
      ctx.lineTo(-halfEdge, halfH);
      // Arco côncavo esquerdo
      ctx.arc(-d - this.centerThickness / 2, 0, r, arcHalfAngle, -arcHalfAngle, true);
      ctx.closePath();

      ctx.fillStyle = 'rgba(6, 182, 212, 0.12)';
      ctx.fill();

      ctx.strokeStyle = isSelected ? '#06b6d4' : 'rgba(56, 189, 248, 0.45)';
      ctx.lineWidth = isSelected ? 2 : 1.5;
      ctx.stroke();

      ctx.restore();

      if (isSelected) this.drawGizmo(ctx);
    }
  }

  /* ==========================================================================
     Motor Principal de Ray Tracing (Recursivo Vetorial)
     ========================================================================== */
  class RayTracingEngine {
    constructor() {
      this.elements = [];
      this.tracedPaths = [];
      this.totalRaysTraced = 0;
      this.totalTIRCount = 0;
      this.normalsToRender = [];
    }

    addElement(elem) {
      this.elements.push(elem);
    }

    removeElement(elem) {
      this.elements = this.elements.filter(e => e !== elem);
    }

    clear() {
      this.elements = [];
    }

    // Coleta todas as superfícies de teste da bancada
    gatherSurfaces() {
      const segments = [];
      const arcs = [];

      for (const elem of this.elements) {
        if (elem.getSegments) {
          segments.push(...elem.getSegments());
        }
        if (elem.getSurfaces) {
          arcs.push(...elem.getSurfaces());
        }
      }
      return { segments, arcs };
    }

    // Traça todos os raios partindo dos emissores ativos
    traceAll(boundsWidth, boundsHeight) {
      this.tracedPaths = [];
      this.totalRaysTraced = 0;
      this.totalTIRCount = 0;
      this.normalsToRender = [];

      const { segments, arcs } = this.gatherSurfaces();
      const initialRays = [];

      // Coleta raios iniciais de todos os emissores
      for (const elem of this.elements) {
        if (elem.category === 'emitter' && elem.getInitialRays) {
          initialRays.push(...elem.getInitialRays());
        }
      }

      // Processa a fila de raios recursivamente
      const rayQueue = [...initialRays];

      while (rayQueue.length > 0) {
        const ray = rayQueue.shift();
        this.totalRaysTraced++;

        if (ray.depth >= MAX_DEPTH || ray.intensity < 0.03) {
          continue;
        }

        let closestHit = null;
        let minDistance = Infinity;

        // Testa interseção com segmentos (espelhos e dioptros planos)
        for (const seg of segments) {
          // Evita auto-interseção imediata no mesmo segmento
          if (ray.lastSurface === seg) continue;

          const hit = intersectRaySegment(ray.origin, ray.dir, seg.p1, seg.p2);
          if (hit && hit.distance < minDistance) {
            minDistance = hit.distance;
            closestHit = {
              point: hit.point,
              normal: hit.normal,
              surface: seg,
              element: seg.element
            };
          }
        }

        // Testa interseção com arcos circulares (espelhos esféricos e lentes)
        for (const arc of arcs) {
          if (ray.lastSurface === arc) continue;

          const hit = intersectRayArc(
            ray.origin,
            ray.dir,
            arc.center,
            arc.radius,
            arc.startAngle,
            arc.endAngle,
            arc.isConcave
          );

          if (hit && hit.distance < minDistance) {
            minDistance = hit.distance;
            closestHit = {
              point: hit.point,
              normal: hit.normal,
              surface: arc,
              element: arc.element
            };
          }
        }

        if (closestHit) {
          // Registra segmento de luz visível até o ponto de impacto
          this.tracedPaths.push({
            p1: ray.origin,
            p2: closestHit.point,
            wavelength: ray.wavelength,
            intensity: ray.intensity,
            hitSpark: true
          });

          // Registra vetor normal para desenho de auxílio
          this.normalsToRender.push({
            point: closestHit.point,
            normal: closestHit.normal
          });

          const elem = closestHit.element;
          const hitPoint = closestHit.point;
          const normal = closestHit.normal;

          // CASO A: Espelho (Reflexão Pura)
          if (elem.category === 'mirror') {
            // r̂ = d̂ - 2(d̂ · n̂)n̂
            const dDotN = ray.dir.dot(normal);
            const reflDir = ray.dir.sub(normal.scale(2 * dDotN)).normalize();

            rayQueue.push({
              origin: hitPoint.add(reflDir.scale(EPSILON * 4)),
              dir: reflDir,
              wavelength: ray.wavelength,
              intensity: ray.intensity * 0.98,
              currentMedium: ray.currentMedium,
              depth: ray.depth + 1,
              lastSurface: closestHit.surface
            });
          }
          // CASO B: Refrator (Lei de Snell-Descartes & TIR)
          else if (elem.category === 'refractor') {
            const materialIndex = elem.getIndexAt ? elem.getIndexAt(ray.wavelength) : elem.refractiveIndex;

            // Determina se o raio está entrando no material ou saindo para o ar (1.0)
            const entering = Math.abs(ray.currentMedium - 1.0) < 1e-4;
            const n1 = entering ? 1.0 : materialIndex;
            const n2 = entering ? materialIndex : 1.0;

            const cosTheta1 = -ray.dir.dot(normal);
            const r = n1 / n2;
            const sin2Theta2 = r * r * (1.0 - cosTheta1 * cosTheta1);

            // Detecção de Reflexão Interna Total (TIR)
            if (sin2Theta2 > 1.0) {
              this.totalTIRCount++;
              // Ocorre reflexão total interna
              const reflDir = ray.dir.sub(normal.scale(2 * ray.dir.dot(normal))).normalize();

              rayQueue.push({
                origin: hitPoint.add(reflDir.scale(EPSILON * 4)),
                dir: reflDir,
                wavelength: ray.wavelength,
                intensity: ray.intensity,
                currentMedium: ray.currentMedium,
                depth: ray.depth + 1,
                lastSurface: closestHit.surface
              });
            } else {
              // Refração de Snell: t̂ = r*d̂ + (r*cosθ1 - sqrt(1 - sin²θ2))*n̂
              const cosTheta2 = Math.sqrt(1.0 - sin2Theta2);
              const refrDir = ray.dir.scale(r).add(normal.scale(r * cosTheta1 - cosTheta2)).normalize();

              // Aproximação de Fresnel (Schlick) para intensidade transmitida vs refletida
              const r0 = Math.pow((n1 - n2) / (n1 + n2), 2);
              const fresnelR = r0 + (1 - r0) * Math.pow(1 - cosTheta1, 5);

              // Raio refratado primário
              rayQueue.push({
                origin: hitPoint.add(refrDir.scale(EPSILON * 4)),
                dir: refrDir,
                wavelength: ray.wavelength,
                intensity: ray.intensity * (1.0 - fresnelR),
                currentMedium: n2,
                depth: ray.depth + 1,
                lastSurface: closestHit.surface
              });

              // Raio refletido de Fresnel secundário (apenas se tiver intensidade perceptível)
              if (fresnelR > 0.08 && ray.depth < 3) {
                const reflDir = ray.dir.sub(normal.scale(2 * ray.dir.dot(normal))).normalize();
                rayQueue.push({
                  origin: hitPoint.add(reflDir.scale(EPSILON * 4)),
                  dir: reflDir,
                  wavelength: ray.wavelength,
                  intensity: ray.intensity * fresnelR,
                  currentMedium: ray.currentMedium,
                  depth: ray.depth + 1,
                  lastSurface: closestHit.surface
                });
              }
            }
          }
        } else {
          // Raio não intercepta nada: estende até a borda da janela
          const farPoint = ray.origin.add(ray.dir.scale(Math.max(boundsWidth, boundsHeight) * 2));
          this.tracedPaths.push({
            p1: ray.origin,
            p2: farPoint,
            wavelength: ray.wavelength,
            intensity: ray.intensity,
            hitSpark: false
          });
        }
      }
    }
  }

  /* ==========================================================================
     Aplicação & Gerenciador de Bancada
     ========================================================================== */
  class OpticsApp {
    constructor() {
      this.canvas = document.getElementById('optics-canvas');
      this.ctx = this.canvas.getContext('2d');
      this.viewport = document.getElementById('canvas-viewport');

      this.engine = new RayTracingEngine();
      this.selectedElement = null;

      // Flags de Configuração & Visualização
      this.showGrid = true;
      this.showNormals = false;
      this.snapAngle = false;
      this.isPaused = false;

      // Estado de Interação com o Mouse
      this.isDraggingElement = false;
      this.isRotatingElement = false;
      this.dragOffset = new Vec2();
      this.lastMousePos = new Vec2();

      // Telemetria & FPS Counter
      this.fps = 60;
      this.frameCount = 0;
      this.lastFpsUpdate = performance.now();

      this.initElements();
      this.initEvents();
      this.setupCanvasSize();
      this.loadPreset('prism'); // Inicia com o preset didático do Prisma de Newton
      this.startLoop();
    }

    // Inicializa elementos da UI
    initElements() {
      // Header Telemetry
      this.statRays = document.getElementById('stat-rays');
      this.statTir = document.getElementById('stat-tir');
      this.statFps = document.getElementById('stat-fps');
      this.simStatusBadge = document.getElementById('sim-status-badge');
      this.simStatusText = document.getElementById('sim-status-text');

      // Toggles & Presets
      this.btnPresetsToggle = document.getElementById('btn-presets-toggle');
      this.presetsDropdown = document.getElementById('presets-dropdown-menu');
      this.btnToggleGrid = document.getElementById('btn-toggle-grid');
      this.btnToggleNormals = document.getElementById('btn-toggle-normals');
      this.btnToggleSnap = document.getElementById('btn-toggle-snap');
      this.btnTogglePause = document.getElementById('btn-toggle-pause');
      this.iconPause = document.getElementById('icon-pause');
      this.btnClearBench = document.getElementById('btn-clear-bench');

      // Inspetor
      this.inspectorEmpty = document.getElementById('inspector-empty');
      this.inspectorContent = document.getElementById('inspector-content');
      this.inspectorTitle = document.getElementById('inspector-title');
      this.inspectorType = document.getElementById('inspector-type');
      this.inspectorIcon = document.getElementById('inspector-icon');
      this.propXVal = document.getElementById('prop-x-val');
      this.propYVal = document.getElementById('prop-y-val');
      this.propRotation = document.getElementById('prop-rotation');
      this.propRotationVal = document.getElementById('prop-rotation-val');

      // Grupos Específicos do Inspetor
      this.groupRefraction = document.getElementById('group-refraction');
      this.propRefraction = document.getElementById('prop-refraction');
      this.propRefractionVal = document.getElementById('prop-refraction-val');
      this.materialPills = document.getElementById('material-pills');

      this.groupDispersion = document.getElementById('group-dispersion');
      this.propDispersionToggle = document.getElementById('prop-dispersion-toggle');

      this.groupWavelength = document.getElementById('group-wavelength');
      this.propWavelength = document.getElementById('prop-wavelength');
      this.propWavelengthVal = document.getElementById('prop-wavelength-val');
      this.propWlSwatch = document.getElementById('prop-wl-swatch');
      this.propWhiteLightToggle = document.getElementById('prop-white-light-toggle');

      this.groupRayDensity = document.getElementById('group-ray-density');
      this.propRayCount = document.getElementById('prop-ray-count');
      this.propRayCountVal = document.getElementById('prop-ray-count-val');

      this.groupCurvature = document.getElementById('group-curvature');
      this.propCurvatureRadius = document.getElementById('prop-curvature-radius');
      this.propCurvatureVal = document.getElementById('prop-curvature-val');

      this.btnDuplicateElement = document.getElementById('btn-duplicate-element');
      this.btnDeleteElement = document.getElementById('btn-delete-element');
      this.btnCloseInspector = document.getElementById('btn-close-inspector');

      // Modal & Toast
      this.shortcutsModal = document.getElementById('shortcuts-modal');
      this.btnToggleShortcuts = document.getElementById('btn-toggle-shortcuts');
      this.btnCloseModal = document.getElementById('btn-close-modal');
      this.toastContainer = document.getElementById('toast-container');
    }

    // Configura tamanho do Canvas com Retina DPI
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

    // Vinculação de Eventos DOM e Interações
    initEvents() {
      window.addEventListener('resize', () => {
        this.setupCanvasSize();
      });

      // Canvas Mouse & Touch Events
      this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
      window.addEventListener('mousemove', (e) => this.onMouseMove(e));
      window.addEventListener('mouseup', () => this.onMouseUp());

      // Toolbar de Instrumentos Óticos
      document.querySelectorAll('.tool-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const toolType = btn.getAttribute('data-tool');
          this.addNewElement(toolType);
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

      // Toggles do Topo
      this.btnToggleGrid.addEventListener('click', () => {
        this.showGrid = !this.showGrid;
        this.btnToggleGrid.setAttribute('aria-pressed', this.showGrid);
        this.btnToggleGrid.classList.toggle('active', this.showGrid);
        this.showToast(`Grade Milimétrica: ${this.showGrid ? 'Ativada' : 'Desativada'}`);
      });

      this.btnToggleNormals.addEventListener('click', () => {
        this.showNormals = !this.showNormals;
        this.btnToggleNormals.setAttribute('aria-pressed', this.showNormals);
        this.btnToggleNormals.classList.toggle('active', this.showNormals);
        this.showToast(`Vetores Normais: ${this.showNormals ? 'Exibidos' : 'Ocultos'}`);
      });

      this.btnToggleSnap.addEventListener('click', () => {
        this.snapAngle = !this.snapAngle;
        this.btnToggleSnap.setAttribute('aria-pressed', this.snapAngle);
        this.btnToggleSnap.classList.toggle('active', this.snapAngle);
        this.showToast(`Snap de Ângulo (15°): ${this.snapAngle ? 'Ativado' : 'Desativado'}`);
      });

      this.btnTogglePause.addEventListener('click', () => {
        this.togglePause();
      });

      this.btnClearBench.addEventListener('click', () => {
        if (confirm('Deseja limpar todos os elementos da bancada ótica?')) {
          this.engine.clear();
          this.selectElement(null);
          this.showToast('Bancada Ótica Limpa');
        }
      });

      // Inspetor Controls
      this.propRotation.addEventListener('input', (e) => {
        if (!this.selectedElement) return;
        const deg = parseFloat(e.target.value);
        this.selectedElement.setRotation(deg * DEG2RAD);
        this.propRotationVal.textContent = `${deg.toFixed(1)}°`;
      });

      this.propRefraction.addEventListener('input', (e) => {
        if (!this.selectedElement) return;
        const n = parseFloat(e.target.value);
        this.selectedElement.refractiveIndex = n;
        this.propRefractionVal.textContent = n.toFixed(3);
        this.updateMaterialPillsHighlight(n);
      });

      this.materialPills.querySelectorAll('.mat-pill').forEach(pill => {
        pill.addEventListener('click', () => {
          if (!this.selectedElement) return;
          const n = parseFloat(pill.getAttribute('data-n'));
          this.selectedElement.refractiveIndex = n;
          this.propRefraction.value = n;
          this.propRefractionVal.textContent = n.toFixed(3);
          this.updateMaterialPillsHighlight(n);
        });
      });

      this.propDispersionToggle.addEventListener('change', (e) => {
        if (!this.selectedElement) return;
        this.selectedElement.enableDispersion = e.target.checked;
      });

      this.propWavelength.addEventListener('input', (e) => {
        if (!this.selectedElement) return;
        const wl = parseInt(e.target.value, 10);
        this.selectedElement.wavelength = wl;
        this.propWavelengthVal.textContent = `${wl} nm`;
        const rgb = wavelengthToRGB(wl);
        this.propWlSwatch.style.background = rgb.hex;
      });

      this.propWhiteLightToggle.addEventListener('change', (e) => {
        if (!this.selectedElement) return;
        this.selectedElement.isWhiteLight = e.target.checked;
      });

      this.propRayCount.addEventListener('input', (e) => {
        if (!this.selectedElement) return;
        const count = parseInt(e.target.value, 10);
        this.selectedElement.rayCount = count;
        this.propRayCountVal.textContent = count;
      });

      this.propCurvatureRadius.addEventListener('input', (e) => {
        if (!this.selectedElement) return;
        const r = parseInt(e.target.value, 10);
        this.selectedElement.radius = r;
        this.propCurvatureVal.textContent = `${r} px`;
      });

      this.btnDuplicateElement.addEventListener('click', () => {
        this.duplicateSelectedElement();
      });

      this.btnDeleteElement.addEventListener('click', () => {
        this.deleteSelectedElement();
      });

      this.btnCloseInspector.addEventListener('click', () => {
        this.selectElement(null);
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
        // Evita disparar se estiver digitando em input
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

        switch (e.key) {
          case ' ':
            e.preventDefault();
            this.togglePause();
            break;
          case 'g':
          case 'G':
            this.btnToggleGrid.click();
            break;
          case 'n':
          case 'N':
            this.btnToggleNormals.click();
            break;
          case 'Delete':
          case 'Backspace':
            if (this.selectedElement) {
              e.preventDefault();
              this.deleteSelectedElement();
            }
            break;
          case 'r':
          case 'R':
            this.resetLaserPosition();
            break;
          case '1':
            this.loadPreset('prism');
            break;
          case '2':
            this.loadPreset('lens');
            break;
          case '3':
            this.loadPreset('fiber');
            break;
          case '4':
            this.loadPreset('telescope');
            break;
          case 'Escape':
            this.shortcutsModal.style.display = 'none';
            this.selectElement(null);
            break;
        }
      });
    }

    // Toggle de Pausa
    togglePause() {
      this.isPaused = !this.isPaused;
      this.btnTogglePause.setAttribute('aria-pressed', this.isPaused);
      this.btnTogglePause.classList.toggle('active', this.isPaused);

      if (this.isPaused) {
        this.iconPause.className = 'fas fa-play';
        this.simStatusBadge.className = 'telemetry-status-badge paused';
        this.simStatusText.textContent = 'Traçado Congelado';
        this.showToast('Simulação Pausada');
      } else {
        this.iconPause.className = 'fas fa-pause';
        this.simStatusBadge.className = 'telemetry-status-badge live';
        this.simStatusText.textContent = 'Bancada Ativa';
        this.showToast('Simulação Retomada');
      }
    }

    // Obtém coordenadas do mouse relativas ao canvas
    getCanvasMousePos(e) {
      const rect = this.canvas.getBoundingClientRect();
      return new Vec2(
        e.clientX - rect.left,
        e.clientY - rect.top
      );
    }

    // Handler de MouseDown
    onMouseDown(e) {
      const mouse = this.getCanvasMousePos(e);
      this.lastMousePos = mouse;

      // 1. Testa se clicou na alça de rotação do elemento já selecionado
      if (this.selectedElement && this.selectedElement.isOverRotationHandle(mouse.x, mouse.y)) {
        this.isRotatingElement = true;
        this.canvas.style.cursor = 'crosshair';
        return;
      }

      // 2. Testa se clicou em algum elemento da bancada (ordem inversa: do topo para base)
      let clickedElement = null;
      for (let i = this.engine.elements.length - 1; i >= 0; i--) {
        const elem = this.engine.elements[i];
        if (elem.containsPoint && elem.containsPoint(mouse.x, mouse.y)) {
          clickedElement = elem;
          break;
        }
      }

      if (clickedElement) {
        this.selectElement(clickedElement);
        this.isDraggingElement = true;
        this.dragOffset = new Vec2(mouse.x - clickedElement.x, mouse.y - clickedElement.y);
        this.canvas.style.cursor = 'grabbing';
      } else {
        this.selectElement(null);
      }
    }

    // Handler de MouseMove
    onMouseMove(e) {
      const mouse = this.getCanvasMousePos(e);

      if (this.isRotatingElement && this.selectedElement) {
        // Cálculo do novo ângulo de rotação
        const dx = mouse.x - this.selectedElement.x;
        const dy = mouse.y - this.selectedElement.y;
        let angle = Math.atan2(dy, dx) + Math.PI / 2;

        // Snapping a cada 15° (se Shift pressionado ou Snap ativado)
        if (e.shiftKey || this.snapAngle) {
          const snapStep = 15 * DEG2RAD;
          angle = Math.round(angle / snapStep) * snapStep;
        }

        this.selectedElement.setRotation(angle);
        this.updateInspectorValues();
        return;
      }

      if (this.isDraggingElement && this.selectedElement) {
        this.selectedElement.setPosition(
          mouse.x - this.dragOffset.x,
          mouse.y - this.dragOffset.y
        );
        this.updateInspectorValues();
        return;
      }

      // Atualização dinâmica do cursor
      if (this.selectedElement && this.selectedElement.isOverRotationHandle(mouse.x, mouse.y)) {
        this.canvas.style.cursor = 'pointer';
      } else {
        let hoverElement = false;
        for (const elem of this.engine.elements) {
          if (elem.containsPoint && elem.containsPoint(mouse.x, mouse.y)) {
            hoverElement = true;
            break;
          }
        }
        this.canvas.style.cursor = hoverElement ? 'grab' : 'crosshair';
      }
    }

    // Handler de MouseUp
    onMouseUp() {
      this.isDraggingElement = false;
      this.isRotatingElement = false;
    }

    // Seleção de Elemento e sincronização do Inspetor
    selectElement(elem) {
      this.selectedElement = elem;

      if (!elem) {
        this.inspectorEmpty.style.display = 'flex';
        this.inspectorContent.style.display = 'none';
        return;
      }

      this.inspectorEmpty.style.display = 'none';
      this.inspectorContent.style.display = 'block';

      this.inspectorTitle.textContent = elem.name;
      this.inspectorType.textContent = elem.category.toUpperCase();

      // Oculta todos os grupos condicionais
      this.groupRefraction.style.display = 'none';
      this.groupDispersion.style.display = 'none';
      this.groupWavelength.style.display = 'none';
      this.groupRayDensity.style.display = 'none';
      this.groupCurvature.style.display = 'none';

      // Ícone do Inspetor
      if (elem.category === 'emitter') {
        this.inspectorIcon.innerHTML = '<i class="fas fa-bolt"></i>';
        this.groupWavelength.style.display = 'block';

        if (elem.type === 'emitter-collimated' || elem.type === 'emitter-radial') {
          this.groupRayDensity.style.display = 'block';
        }
      } else if (elem.category === 'mirror') {
        this.inspectorIcon.innerHTML = '<i class="fas fa-slash"></i>';
        if (elem.type === 'mirror-curved') {
          this.groupCurvature.style.display = 'block';
        }
      } else if (elem.category === 'refractor') {
        this.inspectorIcon.innerHTML = '<i class="fas fa-cube"></i>';
        this.groupRefraction.style.display = 'block';

        if (elem.type === 'refractor-prism') {
          this.groupDispersion.style.display = 'block';
        }
        if (elem.type.includes('lens')) {
          this.groupCurvature.style.display = 'block';
        }
      }

      this.updateInspectorValues();
    }

    // Atualiza os valores do painel Inspetor
    updateInspectorValues() {
      if (!this.selectedElement) return;

      const elem = this.selectedElement;
      this.propXVal.textContent = Math.round(elem.x);
      this.propYVal.textContent = Math.round(elem.y);

      const deg = Math.round((elem.rotation * RAD2DEG) % 360);
      const positiveDeg = deg < 0 ? deg + 360 : deg;
      this.propRotation.value = positiveDeg;
      this.propRotationVal.textContent = `${positiveDeg}°`;

      if (elem.refractiveIndex !== undefined) {
        this.propRefraction.value = elem.refractiveIndex;
        this.propRefractionVal.textContent = elem.refractiveIndex.toFixed(3);
        this.updateMaterialPillsHighlight(elem.refractiveIndex);
      }

      if (elem.enableDispersion !== undefined) {
        this.propDispersionToggle.checked = elem.enableDispersion;
      }

      if (elem.wavelength !== undefined) {
        this.propWavelength.value = elem.wavelength;
        this.propWavelengthVal.textContent = `${elem.wavelength} nm`;
        const rgb = wavelengthToRGB(elem.wavelength);
        this.propWlSwatch.style.background = rgb.hex;
      }

      if (elem.isWhiteLight !== undefined) {
        this.propWhiteLightToggle.checked = elem.isWhiteLight;
      }

      if (elem.rayCount !== undefined) {
        this.propRayCount.value = elem.rayCount;
        this.propRayCountVal.textContent = elem.rayCount;
      }

      if (elem.radius !== undefined) {
        this.propCurvatureRadius.value = elem.radius;
        this.propCurvatureVal.textContent = `${elem.radius} px`;
      }
    }

    updateMaterialPillsHighlight(currentN) {
      this.materialPills.querySelectorAll('.mat-pill').forEach(pill => {
        const pillN = parseFloat(pill.getAttribute('data-n'));
        const isActive = Math.abs(pillN - currentN) < 0.01;
        pill.classList.toggle('active', isActive);
      });
    }

    // Adiciona novo elemento no centro da bancada
    addNewElement(toolType) {
      const cx = this.width / 2;
      const cy = this.height / 2;
      let newElem = null;

      switch (toolType) {
        case 'emitter-laser':
          newElem = new LaserEmitter(cx - 160, cy, 0);
          break;
        case 'emitter-collimated':
          newElem = new CollimatedEmitter(cx - 160, cy, 0);
          break;
        case 'emitter-radial':
          newElem = new RadialEmitter(cx - 140, cy, 0);
          break;
        case 'mirror-plane':
          newElem = new PlaneMirror(cx, cy, 45 * DEG2RAD);
          break;
        case 'mirror-curved':
          newElem = new CurvedMirror(cx + 80, cy, 0);
          break;
        case 'refractor-block':
          newElem = new GlassBlock(cx, cy, 0);
          break;
        case 'refractor-lens-convex':
          newElem = new BiconvexLens(cx, cy, 0);
          break;
        case 'refractor-lens-concave':
          newElem = new BiconcaveLens(cx, cy, 0);
          break;
        case 'refractor-prism':
          newElem = new TriangularPrism(cx, cy, 0);
          break;
      }

      if (newElem) {
        this.engine.addElement(newElem);
        this.selectElement(newElem);
        this.showToast(`Adicionado: ${newElem.name}`);
      }
    }

    // Duplica elemento selecionado
    duplicateSelectedElement() {
      if (!this.selectedElement) return;
      const orig = this.selectedElement;
      this.addNewElement(orig.type);
      if (this.selectedElement) {
        this.selectedElement.setPosition(orig.x + 30, orig.y + 30);
        this.selectedElement.setRotation(orig.rotation);
        if (orig.refractiveIndex !== undefined) this.selectedElement.refractiveIndex = orig.refractiveIndex;
        if (orig.wavelength !== undefined) this.selectedElement.wavelength = orig.wavelength;
        if (orig.isWhiteLight !== undefined) this.selectedElement.isWhiteLight = orig.isWhiteLight;
        if (orig.radius !== undefined) this.selectedElement.radius = orig.radius;
        this.updateInspectorValues();
        this.showToast('Elemento duplicado');
      }
    }

    // Remove elemento selecionado
    deleteSelectedElement() {
      if (!this.selectedElement) return;
      const name = this.selectedElement.name;
      this.engine.removeElement(this.selectedElement);
      this.selectElement(null);
      this.showToast(`Removido: ${name}`);
    }

    // Reseta posição da fonte para alinhamento padrão
    resetLaserPosition() {
      const emitter = this.engine.elements.find(e => e.category === 'emitter');
      if (emitter) {
        emitter.setPosition(120, this.height / 2);
        emitter.setRotation(0);
        this.selectElement(emitter);
        this.showToast('Emissor Centralizado');
      }
    }

    // Exibe Toast de Notificação
    showToast(msg) {
      const toast = document.createElement('div');
      toast.className = 'toast';
      toast.innerHTML = `<i class="fas fa-info-circle text-cyan"></i> <span>${msg}</span>`;
      this.toastContainer.appendChild(toast);

      setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
      }, 2400);
    }

    /* ========================================================================
       Presets Didáticos de Física Ótica Clássica
       ======================================================================== */
    loadPreset(presetName) {
      this.engine.clear();
      this.selectElement(null);

      const cx = this.width / 2;
      const cy = this.height / 2;

      switch (presetName) {
        case 'prism': {
          // Preset 1: Prisma de Newton com Dispersão Espectral de Luz Branca
          const laser = new LaserEmitter(cx - 240, cy - 30, 20 * DEG2RAD);
          laser.isWhiteLight = true;

          const prism = new TriangularPrism(cx, cy, 0);
          prism.refractiveIndex = 1.66; // Flint pesado
          prism.enableDispersion = true;

          this.engine.addElement(laser);
          this.engine.addElement(prism);
          this.selectElement(prism);
          this.showToast('Preset: Prisma de Newton (Dispersão Espectral)');
          break;
        }

        case 'lens': {
          // Preset 2: Foco em Lente Biconvexa
          const beam = new CollimatedEmitter(cx - 280, cy, 0);
          beam.rayCount = 15;
          beam.width = 110;
          beam.wavelength = 488; // Ciano

          const lens = new BiconvexLens(cx - 40, cy, 0);
          lens.refractiveIndex = 1.52;
          lens.radius = 170;

          this.engine.addElement(beam);
          this.engine.addElement(lens);
          this.selectElement(lens);
          this.showToast('Preset: Foco em Lente Biconvexa');
          break;
        }

        case 'fiber': {
          // Preset 3: Fibra Ótica & Reflexão Interna Total (TIR)
          const laser = new LaserEmitter(cx - 320, cy - 18, 12 * DEG2RAD);
          laser.wavelength = 650; // Laser Vermelho Telecom

          // Duto de fibra ótica (bloco alongado de vidro denso)
          const fiber = new GlassBlock(cx + 20, cy, 0);
          fiber.width = 460;
          fiber.height = 70;
          fiber.refractiveIndex = 1.62; // Alto índice para fácil confinamento TIR

          this.engine.addElement(laser);
          this.engine.addElement(fiber);
          this.selectElement(laser);
          this.showToast('Preset: Fibra Ótica & Reflexão Total (TIR)');
          break;
        }

        case 'telescope': {
          // Preset 4: Telescópio Newtoniano com Espelho Côncavo e Plano Secundário
          const beam = new CollimatedEmitter(cx - 300, cy - 20, 0);
          beam.rayCount = 11;
          beam.width = 100;
          beam.wavelength = 532; // Verde

          // Espelho primário côncavo no fundo
          const concaveMirror = new CurvedMirror(cx + 180, cy - 20, 0);
          concaveMirror.radius = 280;

          // Espelho plano secundário a 45° refletindo para o topo
          const flatMirror = new PlaneMirror(cx - 20, cy - 20, -45 * DEG2RAD);
          flatMirror.length = 50;

          this.engine.addElement(beam);
          this.engine.addElement(concaveMirror);
          this.engine.addElement(flatMirror);
          this.selectElement(concaveMirror);
          this.showToast('Preset: Telescópio de Newton');
          break;
        }
      }
    }

    /* ========================================================================
       Renderização Gráfica & Game Loop
       ======================================================================== */
    render() {
      // 1. Limpeza do Canvas
      this.ctx.clearRect(0, 0, this.width, this.height);

      // 2. Grade Milimétrica de Precisão
      if (this.showGrid) {
        this.drawMillimetricGrid();
      }

      // 3. Execução do Ray Tracing (se não estiver pausado)
      if (!this.isPaused) {
        this.engine.traceAll(this.width, this.height);
      }

      // 4. Renderização dos Elementos Óticos da Bancada
      for (const elem of this.engine.elements) {
        elem.draw(this.ctx, elem === this.selectedElement);
      }

      // 5. Renderização dos Raios de Luz com Modo Aditivo Lighter
      this.drawLightPaths();

      // 6. Vetores Normais n̂ (se ativados)
      if (this.showNormals) {
        this.drawNormals();
      }

      // 7. Atualização dos Contadores de Telemetria no Header
      this.statRays.textContent = this.engine.totalRaysTraced;
      this.statTir.textContent = this.engine.totalTIRCount;
    }

    // Grade milimétrica técnica Dark Zinc
    drawMillimetricGrid() {
      const stepMinor = 20;
      const stepMajor = 100;

      this.ctx.save();
      this.ctx.lineWidth = 0.5;

      // Linhas finas a cada 20px
      this.ctx.beginPath();
      this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
      for (let x = 0; x <= this.width; x += stepMinor) {
        this.ctx.moveTo(x, 0);
        this.ctx.lineTo(x, this.height);
      }
      for (let y = 0; y <= this.height; y += stepMinor) {
        this.ctx.moveTo(0, y);
        this.ctx.lineTo(this.width, y);
      }
      this.ctx.stroke();

      // Linhas principais a cada 100px com cruzamentos
      this.ctx.beginPath();
      this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      for (let x = 0; x <= this.width; x += stepMajor) {
        this.ctx.moveTo(x, 0);
        this.ctx.lineTo(x, this.height);
      }
      for (let y = 0; y <= this.height; y += stepMajor) {
        this.ctx.moveTo(0, y);
        this.ctx.lineTo(this.width, y);
      }
      this.ctx.stroke();

      // Cruzamentos milimétricos nas interseções principais
      this.ctx.strokeStyle = 'rgba(6, 182, 212, 0.25)';
      this.ctx.lineWidth = 1;
      const crossSize = 4;
      for (let x = stepMajor; x < this.width; x += stepMajor) {
        for (let y = stepMajor; y < this.height; y += stepMajor) {
          this.ctx.beginPath();
          this.ctx.moveTo(x - crossSize, y);
          this.ctx.lineTo(x + crossSize, y);
          this.ctx.moveTo(x, y - crossSize);
          this.ctx.lineTo(x, y + crossSize);
          this.ctx.stroke();
        }
      }
      this.ctx.restore();
    }

    // Renderização dos Caminhos de Luz com Efeito Incandescente
    drawLightPaths() {
      this.ctx.save();
      // O modo aditivo soma intensidades onde múltiplos feixes se cruzam (focos e cáusticas)
      this.ctx.globalCompositeOperation = 'lighter';

      for (const path of this.engine.tracedPaths) {
        const rgb = wavelengthToRGB(path.wavelength);

        // Passagem 1: Glow suave disperso
        this.ctx.beginPath();
        this.ctx.moveTo(path.p1.x, path.p1.y);
        this.ctx.lineTo(path.p2.x, path.p2.y);
        this.ctx.strokeStyle = rgb.rgba(0.28 * path.intensity);
        this.ctx.lineWidth = 5;
        this.ctx.shadowColor = rgb.hex;
        this.ctx.shadowBlur = 10;
        this.ctx.stroke();

        // Passagem 2: Núcleo fino brilhante
        this.ctx.beginPath();
        this.ctx.moveTo(path.p1.x, path.p1.y);
        this.ctx.lineTo(path.p2.x, path.p2.y);
        this.ctx.strokeStyle = rgb.rgba(0.95 * path.intensity);
        this.ctx.lineWidth = 1.6;
        this.ctx.shadowBlur = 0;
        this.ctx.stroke();

        // Ponto de faísca/incandescência no ponto de impacto
        if (path.hitSpark) {
          this.ctx.beginPath();
          this.ctx.arc(path.p2.x, path.p2.y, 2.5, 0, Math.PI * 2);
          this.ctx.fillStyle = '#ffffff';
          this.ctx.fill();
        }
      }
      this.ctx.restore();
    }

    // Desenha vetores normais nos pontos de incidência
    drawNormals() {
      this.ctx.save();
      this.ctx.strokeStyle = 'rgba(245, 158, 11, 0.7)';
      this.ctx.lineWidth = 1;
      this.ctx.setLineDash([3, 3]);

      for (const item of this.engine.normalsToRender) {
        const p1 = item.point;
        const p2 = item.point.add(item.normal.scale(24));

        this.ctx.beginPath();
        this.ctx.moveTo(p1.x, p1.y);
        this.ctx.lineTo(p2.x, p2.y);
        this.ctx.stroke();

        // Cabeça da seta do vetor
        this.ctx.beginPath();
        this.ctx.arc(p2.x, p2.y, 2, 0, Math.PI * 2);
        this.ctx.fillStyle = '#f59e0b';
        this.ctx.fill();
      }
      this.ctx.restore();
    }

    // Medição contínua de FPS
    updateFps() {
      this.frameCount++;
      const now = performance.now();
      const elapsed = now - this.lastFpsUpdate;

      if (elapsed >= 500) {
        this.fps = Math.round((this.frameCount * 1000) / elapsed);
        this.statFps.textContent = this.fps;
        this.frameCount = 0;
        this.lastFpsUpdate = now;
      }
    }

    // Game loop principal a 60 FPS
    startLoop() {
      const loop = () => {
        this.render();
        this.updateFps();
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    }
  }

  // Inicialização no carregamento da página
  window.addEventListener('DOMContentLoaded', () => {
    window.rayLensApp = new OpticsApp();
  });
})();
