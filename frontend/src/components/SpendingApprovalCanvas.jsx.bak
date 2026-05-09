import React, { useRef, useEffect } from 'react';

const SpendingApprovalCanvas = ({ className }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let w, h;
    let animId;
    let nodes = [];
    let transactions = [];
    let pulses = [];

    function resize() {
      const parent = canvas.parentElement;
      if (!parent) return;
      w = canvas.width = parent.offsetWidth;
      h = canvas.height = parent.offsetHeight;
      // Keep nodes in bounds after resize
      nodes.forEach(n => {
        n.x = Math.max(40, Math.min(w - 40, n.x));
        n.y = Math.max(40, Math.min(h - 40, n.y));
      });
    }

    class Account {
      constructor() {
        this.x = Math.random() * w;
        this.y = Math.random() * h * 0.85 + h * 0.05;
        this.vx = (Math.random() - 0.5) * 0.15;
        this.vy = (Math.random() - 0.5) * 0.15;
        this.balance = Math.floor(Math.random() * 5000) + 1000;
      }
      update() {
        this.x += this.vx;
        this.y += this.vy;
        if (this.x < 40 || this.x > w - 40) this.vx *= -1;
        if (this.y < 40 || this.y > h - 40) this.vy *= -1;
      }
      draw(ctx) {
        ctx.fillStyle = '#5a7a5f';
        ctx.globalAlpha = 0.55;
        ctx.font = 'bold 22px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('$', this.x, this.y);
        ctx.globalAlpha = 1;
      }
    }

    class Transaction {
      constructor(from, to) {
        this.from = from;
        this.to = to;
        this.x = from.x;
        this.y = from.y;
        this.progress = 0;
        const dist = Math.hypot(to.x - from.x, to.y - from.y);
        this.speed = (Math.random() * 1.5 + 1.0) / dist;
        this.amount = Math.floor(Math.random() * 900) + 50;
        this.approved = Math.random() > 0.3;
        this.active = true;
      }
      update() {
        this.progress += this.speed;
        this.x = this.from.x + (this.to.x - this.from.x) * this.progress;
        this.y = this.from.y + (this.to.y - this.from.y) * this.progress;
        if (this.progress >= 1) {
          this.active = false;
          pulses.push(new Pulse(this.to.x, this.to.y, this.approved));
        }
      }
      draw(ctx) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = this.approved ? '#5a8f5f' : '#c45a4a';
        ctx.globalAlpha = 0.8;
        ctx.fill();
        ctx.globalAlpha = 1;

        ctx.beginPath();
        ctx.moveTo(this.from.x, this.from.y);
        ctx.lineTo(this.x, this.y);
        ctx.strokeStyle = this.approved ? '#5a8f5f' : '#c45a4a';
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.25 * (1 - this.progress * 0.3);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }

    class Pulse {
      constructor(x, y, approved) {
        this.x = x;
        this.y = y;
        this.approved = approved;
        this.radius = 0;
        this.maxRadius = 18;
        this.age = 0;
        this.life = 40;
        this.active = true;
        this.label = approved ? `+$${Math.floor(Math.random()*800+100)}` : 'DENIED';
        this.labelY = y - 20;
      }
      update() {
        this.age++;
        this.radius = (this.age / this.life) * this.maxRadius;
        this.labelY -= 0.3;
        if (this.age >= this.life) this.active = false;
      }
      draw(ctx) {
        const alpha = 1 - (this.age / this.life);

        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.strokeStyle = this.approved ? '#5a8f5f' : '#c45a4a';
        ctx.lineWidth = 2;
        ctx.globalAlpha = alpha * 0.5;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(this.x, this.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = this.approved ? '#5a8f5f' : '#c45a4a';
        ctx.globalAlpha = alpha * 0.7;
        ctx.fill();
        ctx.globalAlpha = 1;

        ctx.fillStyle = this.approved ? '#5a8f5f' : '#c45a4a';
        ctx.globalAlpha = alpha;
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.approved ? '✓' : '✕', this.x, this.y);

        ctx.font = '600 11px sans-serif';
        ctx.fillStyle = this.approved ? '#3a6a3f' : '#8a3a2a';
        ctx.fillText(this.label, this.x, this.labelY);
        ctx.globalAlpha = 1;
      }
    }

    function initNodes() {
      nodes = [];
      for (let i = 0; i < 45; i++) {
        nodes.push(new Account());
      }
    }

    function drawConnections() {
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx*dx + dy*dy);
          if (dist < 180) {
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.strokeStyle = '#d4d8d4';
            ctx.lineWidth = 0.6;
            ctx.globalAlpha = 0.15 * (1 - dist/180);
            ctx.stroke();
            ctx.globalAlpha = 1;
          }
        }
      }
    }

    function animate() {
      ctx.fillStyle = '#fafaf8';
      ctx.fillRect(0, 0, w, h);

      drawConnections();

      nodes.forEach(n => {
        n.update();
        n.draw(ctx);
      });

      if (Math.random() < 0.12) {
        const a = nodes[Math.floor(Math.random() * nodes.length)];
        const b = nodes[Math.floor(Math.random() * nodes.length)];
        if (a !== b) {
          const dist = Math.hypot(a.x - b.x, a.y - b.y);
          if (dist < 250) transactions.push(new Transaction(a, b));
        }
      }

      for (let i = transactions.length - 1; i >= 0; i--) {
        transactions[i].update();
        transactions[i].draw(ctx);
        if (!transactions[i].active) transactions.splice(i, 1);
      }

      for (let i = pulses.length - 1; i >= 0; i--) {
        pulses[i].update();
        pulses[i].draw(ctx);
        if (!pulses[i].active) pulses.splice(i, 1);
      }

      animId = requestAnimationFrame(animate);
    }

    resize();
    initNodes();
    animate();

    window.addEventListener('resize', resize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      aria-hidden="true"
      style={{ display: 'block' }}
    />
  );
};

export default SpendingApprovalCanvas;
