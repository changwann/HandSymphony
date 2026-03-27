export function getEffectRGB(sp) {
  const r = Math.floor(255 + (20 - 255) * sp);
  const g = Math.floor(20 + (120 - 20) * sp);
  const b = Math.floor(60 + (255 - 60) * sp);
  return {r, g, b};
}

let scoreV = 0;
let scoreD = 0;

export class PhysicsParticle {
  constructor(W, H, currentHandScale, imgObj, type) {
    this.img = imgObj;
    this.type = type; 
    this.x = Math.random() * W;
    this.y = -50 - Math.random() * 50; 
    this.vy = 2 + Math.random() * 3; 
    this.vx = (Math.random() - 0.5) * 2;
    this.size = Math.max(10, currentHandScale * 0.3 + Math.random() * (currentHandScale * 0.15)); 
    this.rot = Math.random() * Math.PI * 2;
    this.vrot = (Math.random() - 0.5) * 0.015; 
    this.life = 1;
    this.onFloor = false; 
    this.floorOffset = Math.random() * (this.size * 0.5); 
    this.hasEntered = false;
  }
  
  update(H, W) {
    this.x += this.vx; 
    this.y += this.vy;
    this.rot += this.vrot;
    
    if (!this.onFloor) this.vy += 0.2; 

    const floorY = H - (this.size / 2) - this.floorOffset;
    if (this.y > floorY) {
      this.y = floorY;
      this.vy = 0;
      this.vx *= 0.7; 
      this.vrot *= 0.5; 
      this.onFloor = true;
    }

    if (!this.hasEntered && this.y > 0) this.hasEntered = true;

    if (this.x < -100 || this.x > W + 100 || this.y < -100) {
      if (this.hasEntered && this.life > 0) {
        if (this.type === 'v') {
          scoreV++;
          document.getElementById('vScore').textContent = scoreV;
        } else if (this.type === 'd') {
          scoreD++;
          document.getElementById('dScore').textContent = scoreD;
        }
      }
      this.life = 0; 
    }
  }
  
  draw(ctx) {
    if (!this.img.complete || this.img.naturalHeight === 0) return;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.drawImage(this.img, -this.size/2, -this.size/2, this.size, this.size);
    ctx.restore();
  }
}

export class Particle {
  constructor(x, y, sp){
    this.x = x; this.y = y; this.sp = sp; 
    const c = getEffectRGB(sp);
    this.r = c.r; this.g = c.g; this.b = c.b;
    this.size = 1.5 + Math.random() * 5 * sp;
    this.vx = (Math.random() - .5) * 5 * sp;
    this.vy = (Math.random() - .5) * 5 * sp - 0.8;
    this.life = 1; this.decay = 0.013 + Math.random() * 0.013;
  }
  update(){ this.x += this.vx; this.y += this.vy; this.vy -= 0.02; this.life -= this.decay; }
  draw(ctx){
    ctx.save();
    // ✅ 투명도를 95% (0.95)로 상향하여 선명하게 고정
    ctx.globalAlpha = Math.max(0, this.life * 0.95);
    const g = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size * 3);
    g.addColorStop(0, `rgba(${this.r}, ${this.g}, ${this.b}, 1)`);
    g.addColorStop(1, `rgba(${this.r}, ${this.g}, ${this.b}, 0)`);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(this.x, this.y, this.size * 3, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
}