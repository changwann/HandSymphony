import { getEffectRGB } from './physics.js';

const offCanvas = document.createElement('canvas');
const offCtx = offCanvas.getContext('2d', {willReadFrequently:true});
const ASCII_CHARS = ' .\'`^",:;Il!i><~+_-?][}{1)(|/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$';

export function renderASCII(asciiCtx, video, W, H, smoothCx, smoothCy, smoothSpread) {
  if (video.readyState < 2) return;
  const cols = 110, rows = 55;
  offCanvas.width = cols; offCanvas.height = rows;
  offCtx.save(); offCtx.translate(cols, 0); offCtx.scale(-1, 1);
  offCtx.drawImage(video, 0, 0, cols, rows); offCtx.restore();
  const d = offCtx.getImageData(0, 0, cols, rows).data;
  const cw = W / cols, ch = H / rows;
  const fs = Math.max(7, Math.ceil(ch * 0.82));
  asciiCtx.font = `bold ${fs}px 'Share Tech Mono'`;
  asciiCtx.textBaseline = 'top';

  const maxDist = Math.max(W, H) * 0.7; 
  const cR_closed = 255, cG_closed = 150, cB_closed = 160; 
  const eR_closed = 255, eG_closed = 200, eB_closed = 200; 
  const cR_open = 140, cG_open = 190, cB_open = 255; 
  const eR_open = 200, eG_open = 220, eB_open = 255; 

  const cR = cR_closed * (1 - smoothSpread) + cR_open * smoothSpread;
  const cG = cG_closed * (1 - smoothSpread) + cG_open * smoothSpread;
  const cB = cB_closed * (1 - smoothSpread) + cB_open * smoothSpread;
  const eR = eR_closed * (1 - smoothSpread) + eR_open * smoothSpread;
  const eG = eG_closed * (1 - smoothSpread) + eG_open * smoothSpread;
  const eB = eB_closed * (1 - smoothSpread) + eB_open * smoothSpread;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const charX = col * cw;
      const charY = row * ch;
      const dx = charX - smoothCx, dy = charY - smoothCy;
      const dist = Math.sqrt(dx*dx + dy*dy);
      const distRatio = Math.pow(Math.min(1, dist / maxDist), 1.5); 
      const i = (row * cols + col) * 4;
      const r = d[i], g = d[i+1], b = d[i+2];
      const lum = 0.299*r + 0.587*g + 0.114*b;
      const sat = Math.max(r,g,b) === 0 ? 0 : (Math.max(r,g,b) - Math.min(r,g,b)) / Math.max(r,g,b);
      
      if (lum < 22 || (sat < 0.09 && lum < 40)) continue;
      const ci = Math.floor((lum / 255) * (ASCII_CHARS.length - 1));
      const ch_char = ASCII_CHARS[ci];
      if (ch_char === ' ') continue;

      const rColor = Math.floor(cR * (1 - distRatio) + eR * distRatio);
      const gColor = Math.floor(cG * (1 - distRatio) + eG * distRatio);
      const bColor = Math.floor(cB * (1 - distRatio) + eB * distRatio);

      asciiCtx.fillStyle = `rgba(${rColor}, ${gColor}, ${bColor}, ${0.5 + (lum/255)*0.5})`;
      asciiCtx.fillText(ch_char, charX, charY);
    }
  }
}

export function renderEdge(asciiCtx, video, W, H, smoothSpread) {
  if (video.readyState < 2) return;
  const cols = 220, rows = 120;
  offCanvas.width = cols; offCanvas.height = rows;
  offCtx.save(); offCtx.translate(cols,0); offCtx.scale(-1,1);
  offCtx.drawImage(video, 0, 0, cols, rows); offCtx.restore();
  const src = offCtx.getImageData(0, 0, cols, rows).data;
  const cw = W/cols, ch = H/rows;
  const lum = (x,y) => { const i=(y*cols+x)*4; return 0.299*src[i]+0.587*src[i+1]+0.114*src[i+2]; };
  const cr=Math.floor(0*(1-smoothSpread)+201*smoothSpread), cg2=Math.floor(255*(1-smoothSpread)+168*smoothSpread), cb3=Math.floor(200*(1-smoothSpread)+76*smoothSpread);
  for (let y=1;y<rows-1;y++) for (let x=1;x<cols-1;x++) {
    const gx = -lum(x-1,y-1)+lum(x+1,y-1)-2*lum(x-1,y)+2*lum(x+1,y)-lum(x-1,y+1)+lum(x+1,y+1);
    const gy = -lum(x-1,y-1)-2*lum(x,y-1)-lum(x+1,y-1)+lum(x-1,y+1)+2*lum(x,y+1)+lum(x+1,y+1);
    const mag = Math.min(255, Math.sqrt(gx*gx+gy*gy));
    if (mag < 28) continue;
    asciiCtx.fillStyle = `rgba(${cr},${cg2},${cb3},${mag/255})`;
    asciiCtx.fillRect(x*cw, y*ch, cw+0.5, ch+0.5);
  }
}

export function renderThermal(asciiCtx, video, W, H) {
  if (video.readyState < 2) return;
  const cols = 240, rows = 135;
  offCanvas.width = cols; offCanvas.height = rows;
  offCtx.save(); offCtx.translate(cols,0); offCtx.scale(-1,1);
  offCtx.drawImage(video, 0, 0, cols, rows); offCtx.restore();
  const src = offCtx.getImageData(0, 0, cols, rows).data;
  const scaleX = W/cols, scaleY = H/rows;
  for (let y=0;y<rows;y++) for (let x=0;x<cols;x++) {
    const i=(y*cols+x)*4;
    const lum=(0.299*src[i]+0.587*src[i+1]+0.114*src[i+2])/255;
    if (lum < 0.07) continue;
    let r,g,b;
    if (lum<0.25)      {r=0;g=0;b=Math.floor(lum/0.25*255);}
    else if (lum<0.5)  {r=0;g=Math.floor((lum-0.25)/0.25*255);b=255-g;}
    else if (lum<0.75) {r=Math.floor((lum-0.5)/0.25*255);g=255;b=0;}
    else               {r=255;g=255-Math.floor((lum-0.75)/0.25*255);b=0;}
    asciiCtx.fillStyle=`rgb(${r},${g},${b})`;
    asciiCtx.fillRect(x*scaleX, y*scaleY, scaleX+0.5, scaleY+0.5);
  }
}

export function renderGlitch(asciiCtx, asciiCanvas, video, W, H, smoothSpread, smoothVel) {
  if (video.readyState < 2) return;
  asciiCtx.save(); asciiCtx.translate(W, 0); asciiCtx.scale(-1, 1);
  asciiCtx.drawImage(video, 0, 0, W, H); asciiCtx.restore();
  const slices = 6 + Math.floor(smoothVel * 10);
  for (let i = 0; i < slices; i++) {
    const y = Math.random() * H, h2 = 2 + Math.random() * 20;
    const shift = (Math.random() - 0.5) * 30 * (1 + smoothSpread);
    asciiCtx.save();
    asciiCtx.globalCompositeOperation = 'source-over';
    asciiCtx.globalAlpha = 0.7;
    asciiCtx.drawImage(asciiCanvas, 0, y, W, h2, shift, y, W, h2);
    asciiCtx.restore();
  }
  asciiCtx.fillStyle=`rgba(0,255,200,${0.04+smoothSpread*0.06})`; asciiCtx.fillRect(0,0,W,H);
  asciiCtx.save(); asciiCtx.globalCompositeOperation='screen'; asciiCtx.globalAlpha=0.15+smoothVel*0.1;
  asciiCtx.translate(W,0); asciiCtx.scale(-1,1);
  asciiCtx.drawImage(video, 4+smoothSpread*8, 0, W, H);
  asciiCtx.restore();
}

export function renderNormal(asciiCtx, video, W, H) {
  if (video.readyState < 2) return;
  asciiCtx.save(); asciiCtx.translate(W,0); asciiCtx.scale(-1,1);
  asciiCtx.drawImage(video, 0, 0, W, H); asciiCtx.restore();
  asciiCtx.fillStyle='rgba(0,255,200,0.05)'; asciiCtx.fillRect(0,0,W,H);
}

export function drawSkeleton(eCtx, lm, W, H, sp){
  const CONN=[[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],
    [0,9],[9,10],[10,11],[11,12],[0,13],[13,14],[14,15],[15,16],
    [0,17],[17,18],[18,19],[19,20],[5,9],[9,13],[13,17]];
  const toS=p=>({x:(1-p.x)*W,y:p.y*H});
  const c = getEffectRGB(sp); 
  
  eCtx.save();
  CONN.forEach(([a,b])=>{
    const pa=toS(lm[a]),pb=toS(lm[b]);
    const g=eCtx.createLinearGradient(pa.x,pa.y,pb.x,pb.y);
    // ✅ 투명도 0.95 고정 및 기본 알파값 대폭 상승 (더 진하게)
    g.addColorStop(0,`rgba(${c.r}, ${c.g}, ${c.b}, ${(.7+sp*.3) * 0.95})`);
    g.addColorStop(1,`rgba(${c.r}, ${c.g}, ${c.b}, ${(.4+sp*.4) * 0.95})`);
    eCtx.strokeStyle=g;eCtx.lineWidth=1+sp*2.5;
    eCtx.shadowColor=`rgba(${c.r}, ${c.g}, ${c.b}, ${(.9+sp*.1) * 0.95})`;eCtx.shadowBlur=8+sp*22;
    eCtx.beginPath();eCtx.moveTo(pa.x,pa.y);eCtx.lineTo(pb.x,pb.y);eCtx.stroke();
  });
  [0,4,8,12,16,20].forEach(i=>{
    const p=toS(lm[i]);
    eCtx.beginPath();eCtx.arc(p.x,p.y,3+sp*5,0,Math.PI*2);
    // ✅ 관절점 완전 선명하게
    eCtx.fillStyle=`rgba(${c.r}, ${c.g}, ${c.b}, ${1.0 * 0.95})`;
    eCtx.shadowColor=`rgba(${c.r}, ${c.g}, ${c.b}, 0.95)`;eCtx.shadowBlur=18+sp*28;eCtx.fill();
  });
  eCtx.restore();
}

export function drawAura(eCtx, cx, cy, sp, vel){
  const r = 100 + sp * 350 + vel * 120;
  const c = getEffectRGB(sp);
  eCtx.save();
  const g=eCtx.createRadialGradient(cx,cy,r*.1,cx,cy,r);
  // ✅ 아우라 투명도 0.95 및 밀도 상향
  g.addColorStop(0,`rgba(${c.r}, ${c.g}, ${c.b}, ${(.5 + sp*.4) * 0.95})`);
  g.addColorStop(.4,`rgba(${c.r}, ${c.g}, ${c.b}, ${(.2 + sp*.3) * 0.95})`);
  g.addColorStop(1,`rgba(${c.r}, ${c.g}, ${c.b}, 0)`);
  eCtx.fillStyle=g;eCtx.beginPath();eCtx.arc(cx,cy,r,0,Math.PI*2);eCtx.fill();
  for(let i=0;i<Math.floor(sp*8);i++){
    eCtx.strokeStyle=`rgba(${c.r}, ${c.g}, ${c.b}, ${(.6-i*.05) * 0.95})`;
    eCtx.lineWidth=2;eCtx.shadowBlur=0;
    eCtx.beginPath();eCtx.arc(cx,cy,r*(.2+i*.15),0,Math.PI*2);eCtx.stroke();
  }
  eCtx.restore();
}