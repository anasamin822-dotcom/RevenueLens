/**
 * SecureRegent — Ambient Particle System & Hero Banner Particle Burst
 * Inspired by particles.casberry.in, tailored for light frosted-glass aesthetics.
 * Vanilla JS, hardware-efficient, zero external dependencies.
 */

(function (global) {
  'use strict';

  // --- Palette: Soft theme-aligned tints for Light and Dark modes ---
  const LIGHT_PALETTE = [
    { r: 99, g: 102, b: 241, a: 0.32 },  // Soft Indigo
    { r: 139, g: 92, b: 246, a: 0.32 }, // Soft Violet
    { r: 6, g: 182, b: 212, a: 0.28 },  // Soft Cyan
    { r: 168, g: 85, b: 247, a: 0.28 }  // Lavender
  ];

  const DARK_PALETTE = [
    { r: 129, g: 140, b: 248, a: 0.45 }, // Neon Indigo
    { r: 192, g: 132, b: 252, a: 0.45 }, // Neon Purple
    { r: 56, g: 189, b: 248, a: 0.40 },  // Neon Sky
    { r: 236, g: 72, b: 153, a: 0.38 }   // Neon Pink
  ];

  function getTheme() {
    return (document.documentElement && document.documentElement.getAttribute('data-theme') === 'dark') ? 'dark' : 'light';
  }

  function getActivePalette(theme) {
    return (theme || getTheme()) === 'dark' ? DARK_PALETTE : LIGHT_PALETTE;
  }

  // Helper: check reduced motion
  function isReducedMotion() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  // Helper: check fine pointer
  function isFinePointer() {
    return window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  }

  // ==========================================================================
  // PART 1: Full-Page Connected Ambient Particle Network
  // ==========================================================================
  class AmbientParticleNetwork {
    constructor(canvasId) {
      this.canvas = document.getElementById(canvasId);
      if (!this.canvas) return;
      this.ctx = this.canvas.getContext('2d');
      this.particles = [];
      this.width = 0;
      this.height = 0;
      this.dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      this.animId = null;
      this.isRunning = false;

      this.theme = getTheme();
      this.lineColor = this.theme === 'dark' ? '129, 140, 248' : '99, 102, 241';

      this.mouse = {
        x: -9999,
        y: -9999,
        radius: 135
      };

      this.init();
    }

    init() {
      this.resize();
      this.createParticles();
      this.bindEvents();

      if (isReducedMotion()) {
        this.renderStaticFrame();
      } else {
        this.start();
      }
    }

    getTargetCount() {
      const w = window.innerWidth;
      if (w < 640) return 26;
      if (w < 1024) return 48;
      return 80;
    }

    createParticles() {
      const count = this.getTargetCount();
      const palette = getActivePalette(this.theme);
      this.particles = [];
      for (let i = 0; i < count; i++) {
        const color = palette[Math.floor(Math.random() * palette.length)];
        this.particles.push({
          x: Math.random() * this.width,
          y: Math.random() * this.height,
          vx: (Math.random() - 0.5) * 0.45,
          vy: (Math.random() - 0.5) * 0.45,
          baseRadius: 1.2 + Math.random() * 1.4,
          radius: 1.2 + Math.random() * 1.4,
          color: color,
          pulseSpeed: 0.02 + Math.random() * 0.02,
          pulseAngle: Math.random() * Math.PI * 2
        });
      }
    }

    resize() {
      this.width = window.innerWidth;
      this.height = window.innerHeight;
      this.dpr = Math.min(window.devicePixelRatio || 1, 1.5);

      this.canvas.width = Math.floor(this.width * this.dpr);
      this.canvas.height = Math.floor(this.height * this.dpr);
      this.canvas.style.width = `${this.width}px`;
      this.canvas.style.height = `${this.height}px`;

      this.ctx.scale(this.dpr, this.dpr);
    }

    bindEvents() {
      window.addEventListener('resize', () => {
        this.resize();
        if (isReducedMotion()) {
          this.renderStaticFrame();
        } else {
          // Adjust particle count gracefully on resize
          const target = this.getTargetCount();
          while (this.particles.length < target) {
            const color = PALETTE[Math.floor(Math.random() * PALETTE.length)];
            this.particles.push({
              x: Math.random() * this.width,
              y: Math.random() * this.height,
              vx: (Math.random() - 0.5) * 0.45,
              vy: (Math.random() - 0.5) * 0.45,
              baseRadius: 1.2 + Math.random() * 1.4,
              radius: 1.2 + Math.random() * 1.4,
              color: color,
              pulseSpeed: 0.02 + Math.random() * 0.02,
              pulseAngle: Math.random() * Math.PI * 2
            });
          }
          if (this.particles.length > target) {
            this.particles.length = target;
          }
        }
      });

      // Pointer tracking: repel on desktop, gentle drift on touch
      if (isFinePointer()) {
        window.addEventListener('mousemove', e => {
          this.mouse.x = e.clientX;
          this.mouse.y = e.clientY;
        }, { passive: true });

        window.addEventListener('mouseleave', () => {
          this.mouse.x = -9999;
          this.mouse.y = -9999;
        });
      }

      // Page visibility performance governor
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          this.stop();
        } else if (!isReducedMotion()) {
          this.start();
        }
      });
    }

    renderStaticFrame() {
      this.ctx.clearRect(0, 0, this.width, this.height);
      for (let i = 0; i < this.particles.length; i++) {
        const p = this.particles[i];
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, p.baseRadius, 0, Math.PI * 2);
        this.ctx.fillStyle = `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, 0.22)`;
        this.ctx.fill();
      }
    }

    update() {
      const connectDist = this.width < 768 ? 95 : 125;
      const connectDistSq = connectDist * connectDist;
      const mouseRadiusSq = this.mouse.radius * this.mouse.radius;

      for (let i = 0; i < this.particles.length; i++) {
        const p = this.particles[i];

        // Cursor interaction: gentle repulsion with damping
        if (this.mouse.x > 0) {
          const dx = p.x - this.mouse.x;
          const dy = p.y - this.mouse.y;
          const distSq = dx * dx + dy * dy;

          if (distSq < mouseRadiusSq && distSq > 0) {
            const dist = Math.sqrt(distSq);
            const force = (1 - dist / this.mouse.radius) * 1.2;
            p.x += (dx / dist) * force * 1.8;
            p.y += (dy / dist) * force * 1.8;
          }
        }

        // Natural movement
        p.x += p.vx;
        p.y += p.vy;

        // Subtle pulse
        p.pulseAngle += p.pulseSpeed;
        p.radius = p.baseRadius + Math.sin(p.pulseAngle) * 0.35;

        // Soft screen edge rebound
        if (p.x < 0) { p.x = 0; p.vx *= -1; }
        else if (p.x > this.width) { p.x = this.width; p.vx *= -1; }
        if (p.y < 0) { p.y = 0; p.vy *= -1; }
        else if (p.y > this.height) { p.y = this.height; p.vy *= -1; }
      }
    }

    draw() {
      this.ctx.clearRect(0, 0, this.width, this.height);
      const len = this.particles.length;
      const connectDist = this.width < 768 ? 95 : 125;

      // Draw connecting lines
      for (let i = 0; i < len; i++) {
        const p1 = this.particles[i];
        for (let j = i + 1; j < len; j++) {
          const p2 = this.particles[j];
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < connectDist) {
            const alpha = (1 - dist / connectDist) * 0.22;
            this.ctx.beginPath();
            this.ctx.moveTo(p1.x, p1.y);
            this.ctx.lineTo(p2.x, p2.y);
            this.ctx.strokeStyle = `rgba(${this.lineColor}, ${alpha})`;
            this.ctx.lineWidth = 0.85;
            this.ctx.stroke();
          }
        }
      }

      // Draw particle points
      for (let i = 0; i < len; i++) {
        const p = this.particles[i];
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        this.ctx.fillStyle = `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${p.color.a})`;
        this.ctx.shadowBlur = 4;
        this.ctx.shadowColor = `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, 0.25)`;
        this.ctx.fill();
      }

      // Reset shadow for next tick
      this.ctx.shadowBlur = 0;
    }

    setTheme(theme) {
      this.theme = theme;
      this.lineColor = theme === 'dark' ? '129, 140, 248' : '99, 102, 241';
      const palette = getActivePalette(theme);
      this.particles.forEach(p => {
        p.color = palette[Math.floor(Math.random() * palette.length)];
      });
      if (isReducedMotion()) {
        this.renderStaticFrame();
      }
    }

    step() {
      if (!this.isRunning) return;
      this.update();
      this.draw();
      this.animId = requestAnimationFrame(() => this.step());
    }

    start() {
      if (this.isRunning) return;
      this.isRunning = true;
      this.step();
    }

    stop() {
      this.isRunning = false;
      if (this.animId) {
        cancelAnimationFrame(this.animId);
        this.animId = null;
      }
    }
  }

  // ==========================================================================
  // PART 2: Denser, Playful Hero Banner Micro-Particle Burst
  // ==========================================================================
  class HeroBannerBurst {
    constructor(cardId, canvasId) {
      this.card = document.getElementById(cardId);
      this.canvas = document.getElementById(canvasId);
      if (!this.card || !this.canvas) return;

      this.ctx = this.canvas.getContext('2d');
      this.particles = [];
      this.width = 0;
      this.height = 0;
      this.dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      this.animId = null;
      this.isRunning = false;
      this.mouse = { x: -999, y: -999, isHover: false };
      this.theme = getTheme();
      this.lineColor = this.theme === 'dark' ? '192, 132, 252' : '139, 92, 246';

      this.init();
    }

    init() {
      this.resize();
      this.createBurstParticles();
      this.bindEvents();

      if (!isReducedMotion()) {
        this.start();
      }
    }

    resize() {
      const rect = this.card.getBoundingClientRect();
      this.width = Math.max(rect.width, 280);
      this.height = Math.max(rect.height, 160);
      this.dpr = Math.min(window.devicePixelRatio || 1, 1.5);

      this.canvas.width = Math.floor(this.width * this.dpr);
      this.canvas.height = Math.floor(this.height * this.dpr);
      this.canvas.style.width = `${this.width}px`;
      this.canvas.style.height = `${this.height}px`;

      this.ctx.scale(this.dpr, this.dpr);
    }

    createBurstParticles() {
      const count = window.innerWidth < 768 ? 16 : 28;
      const palette = getActivePalette(this.theme);
      this.particles = [];
      for (let i = 0; i < count; i++) {
        const color = palette[i % palette.length];
        this.particles.push({
          x: Math.random() * this.width,
          y: Math.random() * this.height,
          vx: (Math.random() - 0.5) * 0.75,
          vy: (Math.random() - 0.5) * 0.75,
          radius: 1.0 + Math.random() * 1.8,
          alpha: 0.18 + Math.random() * 0.22,
          color: color,
          burstEnergy: 0
        });
      }
    }

    bindEvents() {
      window.addEventListener('resize', () => this.resize(), { passive: true });

      // Trigger playful micro-burst on hover or pointer movement over hero
      this.card.addEventListener('mouseenter', e => {
        if (isReducedMotion()) return;
        this.mouse.isHover = true;
        this.burstAt(e.clientX, e.clientY, 8);
      });

      this.card.addEventListener('mousemove', e => {
        if (!isFinePointer() || isReducedMotion()) return;
        const rect = this.card.getBoundingClientRect();
        this.mouse.x = e.clientX - rect.left;
        this.mouse.y = e.clientY - rect.top;
      }, { passive: true });

      this.card.addEventListener('mouseleave', () => {
        this.mouse.isHover = false;
        this.mouse.x = -999;
        this.mouse.y = -999;
      });

      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          this.stop();
        } else if (!isReducedMotion()) {
          this.start();
        }
      });
    }

    burstAt(clientX, clientY, count = 6) {
      const rect = this.card.getBoundingClientRect();
      const originX = clientX - rect.left;
      const originY = clientY - rect.top;
      const palette = getActivePalette(this.theme);

      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1.0 + Math.random() * 2.2;
        const color = palette[Math.floor(Math.random() * palette.length)];

        this.particles.push({
          x: originX,
          y: originY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          radius: 1.0 + Math.random() * 1.5,
          alpha: 0.4,
          color: color,
          burstEnergy: 1.0
        });
      }

      // Cap burst particle list to prevent accumulation
      if (this.particles.length > 45) {
        this.particles.splice(0, this.particles.length - 45);
      }
    }

    update() {
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];

        // Cursor attraction / playful swirl inside hero
        if (this.mouse.isHover && this.mouse.x > 0) {
          const dx = this.mouse.x - p.x;
          const dy = this.mouse.y - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 110 && dist > 10) {
            p.vx += (dx / dist) * 0.04;
            p.vy += (dy / dist) * 0.04;
          }
        }

        // Apply burst friction
        if (p.burstEnergy > 0) {
          p.burstEnergy -= 0.02;
          p.vx *= 0.96;
          p.vy *= 0.96;
          p.alpha = Math.max(0.12, p.burstEnergy * 0.4);
        }

        p.x += p.vx;
        p.y += p.vy;

        // Bounce inside card perimeter
        if (p.x < 4) { p.x = 4; p.vx *= -0.8; }
        else if (p.x > this.width - 4) { p.x = this.width - 4; p.vx *= -0.8; }
        if (p.y < 4) { p.y = 4; p.vy *= -0.8; }
        else if (p.y > this.height - 4) { p.y = this.height - 4; p.vy *= -0.8; }
      }
    }

    draw() {
      this.ctx.clearRect(0, 0, this.width, this.height);
      const len = this.particles.length;

      // Connecting filaments inside hero
      for (let i = 0; i < len; i++) {
        const p1 = this.particles[i];
        for (let j = i + 1; j < len; j++) {
          const p2 = this.particles[j];
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 75) {
            const alpha = (1 - dist / 75) * 0.22;
            this.ctx.beginPath();
            this.ctx.moveTo(p1.x, p1.y);
            this.ctx.lineTo(p2.x, p2.y);
            this.ctx.strokeStyle = `rgba(${this.lineColor}, ${alpha})`;
            this.ctx.lineWidth = 0.7;
            this.ctx.stroke();
          }
        }
      }

      // Draw particle points
      for (let i = 0; i < len; i++) {
        const p = this.particles[i];
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        this.ctx.fillStyle = `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${p.alpha})`;
        this.ctx.fill();
      }
    }

    setTheme(theme) {
      this.theme = theme;
      this.lineColor = theme === 'dark' ? '192, 132, 252' : '139, 92, 246';
      const palette = getActivePalette(theme);
      this.particles.forEach(p => {
        p.color = palette[Math.floor(Math.random() * palette.length)];
      });
    }

    step() {
      if (!this.isRunning) return;
      this.update();
      this.draw();
      this.animId = requestAnimationFrame(() => this.step());
    }

    start() {
      if (this.isRunning) return;
      this.isRunning = true;
      this.step();
    }

    stop() {
      this.isRunning = false;
      if (this.animId) {
        cancelAnimationFrame(this.animId);
        this.animId = null;
      }
    }
  }

  // --- Bootstrap Particles on Ready ---
  function initParticles() {
    // 1. Ambient Background Network
    const ambient = new AmbientParticleNetwork('particle-canvas');
    global.ambientParticles = ambient;

    // 2. Localized Hero Burst
    const heroBurst = new HeroBannerBurst('hero-funnel-card', 'hero-burst-canvas');
    global.heroParticles = heroBurst;
  }

  function setParticleTheme(theme) {
    if (global.ambientParticles && typeof global.ambientParticles.setTheme === 'function') {
      global.ambientParticles.setTheme(theme);
    }
    if (global.heroParticles && typeof global.heroParticles.setTheme === 'function') {
      global.heroParticles.setTheme(theme);
    }
  }

  global.setParticleTheme = setParticleTheme;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initParticles);
  } else {
    initParticles();
  }

})(window);
