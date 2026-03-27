import { Particle, PhysicsParticle } from './physics.js';
import { renderASCII, renderEdge, renderThermal, renderGlitch, renderNormal, drawSkeleton, drawAura } from './visuals.js';
import { initSynth, modulateSynth, modulatePlayer, updateProgress, loadAudioFiles, togglePause, switchToSynth, setVolume, isSynthMode, setGestureStates, playNextTrack, playPrevTrack, seekTrack } from './audio.js';
import { setupHands, getLandmarks, clearLandmarks, getSpread, checkVSign, checkThumbsUp } from './hands.js';

const $cursor = document.getElementById('cursor');
document.addEventListener('mousemove', e => { $cursor.style.left = e.clientX + 'px'; $cursor.style.top = e.clientY + 'px'; });

const video = document.getElementById('video');
const bgCanvas = document.getElementById('bgCanvas');
const asciiCanvas = document.getElementById('asciiCanvas');
const effectCanvas = document.getElementById('effectCanvas');
const bgCtx = bgCanvas.getContext('2d');
const asciiCtx = asciiCanvas.getContext('2d');
const eCtx = effectCanvas.getContext('2d');

function resize() {
  const W = window.innerWidth, H = window.innerHeight;
  bgCanvas.width = asciiCanvas.width = effectCanvas.width = W;
  bgCanvas.height = asciiCanvas.height = effectCanvas.height = H;
}
window.addEventListener('resize', resize); resize();

let filterMode = 'ascii';
document.querySelectorAll('.fBtn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.fBtn').forEach(b => b.classList.remove('on'));
    btn.classList.add('on'); filterMode = btn.dataset.filter;
  });
});

let smoothCx = window.innerWidth / 2, smoothCy = window.innerHeight / 2;
let prevCx = smoothCx, prevCy = smoothCy;
let velocity = 0, smoothSpread = 0, smoothVel = 0;
let handScale = 50; 
let vSignActive = false, thumbsUpActive = false; 
let frameCount = 0;
let prevCenter = null;

const victoryImg = new Image(); victoryImg.src = 'victory-hand.png'; 
const diamondImg = new Image(); diamondImg.src = 'diamond.png'; 
const physParticles = [];
const particles = [];

function renderLoop() {
  frameCount++;
  const W = effectCanvas.width, H = effectCanvas.height;
  
  bgCtx.fillStyle='#000508'; bgCtx.fillRect(0,0,W,H);
  eCtx.clearRect(0, 0, W, H); asciiCtx.clearRect(0,0,W,H);

  if      (filterMode==='ascii')   renderASCII(asciiCtx, video, W, H, smoothCx, smoothCy, smoothSpread);
  else if (filterMode==='edge')    renderEdge(asciiCtx, video, W, H, smoothSpread);
  else if (filterMode==='thermal') renderThermal(asciiCtx, video, W, H);
  else if (filterMode==='glitch')  renderGlitch(asciiCtx, asciiCanvas, video, W, H, smoothSpread, smoothVel);
  else                             renderNormal(asciiCtx, video, W, H);

  let panVal = 0; 
  const lm = getLandmarks();

  if(lm){
    const cx_n = lm.reduce((s,p)=>s+p.x,0)/lm.length;
    const cy_n = lm.reduce((s,p)=>s+p.y,0)/lm.length;
    const cx = (1-cx_n)*W, cy = cy_n*H;
    
    smoothCx = smoothCx * 0.85 + cx * 0.15;
    smoothCy = smoothCy * 0.85 + cy * 0.15;
    
    const hvx = cx - prevCx, hvy = cy - prevCy;
    prevCx = cx; prevCy = cy;
    
    handScale = Math.sqrt(Math.pow((lm[0].x - lm[9].x)*W, 2) + Math.pow((lm[0].y - lm[9].y)*H, 2));
    panVal = (cx_n - 0.5) * -2; 
    
    if(prevCenter){ velocity = Math.sqrt(Math.pow(cx_n-prevCenter.x,2)+Math.pow(cy_n-prevCenter.y,2))*15; }
    prevCenter = {x:cx_n, y:cy_n};
    
    const sp = getSpread(lm);
    smoothSpread = smoothSpread*.85 + sp*.15;
    smoothVel = smoothVel*.80 + velocity*.20;
    
    const isV = checkVSign(lm);
    if (isV) { vSignActive = true; thumbsUpActive = false; } 
    else { vSignActive = false; thumbsUpActive = checkThumbsUp(lm); }

    setGestureStates(vSignActive, thumbsUpActive);

    if (vSignActive && Math.random() < 0.066) physParticles.push(new PhysicsParticle(W, H, handScale, victoryImg, 'v'));
    if (thumbsUpActive && Math.random() < 0.066) physParticles.push(new PhysicsParticle(W, H, handScale, diamondImg, 'd'));

    for(let i=0; i<physParticles.length; i++) {
      let p1 = physParticles[i];
      for(let j=i+1; j<physParticles.length; j++) {
        let p2 = physParticles[j];
        let dx = p2.x - p1.x, dy = p2.y - p1.y, dist = Math.sqrt(dx*dx + dy*dy);
        let minDist = (p1.size + p2.size) * 0.45; 
        if (dist > 0 && dist < minDist) {
          let overlap = minDist - dist, nx = dx / dist, ny = dy / dist;
          p1.x -= nx * overlap * 0.5; p1.y -= ny * overlap * 0.5;
          p2.x += nx * overlap * 0.5; p2.y += ny * overlap * 0.5;
          p1.vx *= 0.9; p1.vy *= 0.9; p2.vx *= 0.9; p2.vy *= 0.9;
        }
      }
    }

    const sweepRadius = handScale * 1.5; 
    for(let i=0; i<physParticles.length; i++) {
      let p = physParticles[i];
      let dist = Math.sqrt((p.x - cx)**2 + (p.y - cy)**2);
      if (dist < sweepRadius) {
        p.vx += hvx * 0.4; p.vy += hvy * 0.4 - 2; p.vrot += (Math.random() - 0.5) * 0.1; p.onFloor = false; 
      }
    }
    
    drawAura(eCtx, cx, cy, smoothSpread, smoothVel);
    drawSkeleton(eCtx, lm, W, H, smoothSpread);
    
    const cnt=Math.floor(smoothVel*22*smoothSpread);
    for(let i=0;i<cnt;i++) particles.push(new Particle(cx, cy, smoothSpread));
    
    if(isSynthMode()) modulateSynth(smoothSpread, smoothVel, panVal); 
    else modulatePlayer(smoothSpread, smoothVel, panVal); 
    
    document.getElementById('v-spread').textContent=String(Math.round(smoothSpread*100)).padStart(3,'0')+'%';
    document.getElementById('v-vel').textContent=smoothVel.toFixed(3);
    document.getElementById('m-spread').classList.add('active');
    document.getElementById('m-vel').classList.add('active');
    if (isSynthMode()) document.getElementById('m-note').classList.add('active');
    else document.getElementById('m-note').classList.remove('active');
    document.getElementById('statusMsg').style.opacity='0';
  } else {
    document.getElementById('statusMsg').style.opacity='1';
    vSignActive = false; thumbsUpActive = false;
    setGestureStates(false, false);
    prevCenter = null; smoothVel = 0; clearLandmarks();
    ['m-spread','m-vel','m-note'].forEach(id=>document.getElementById(id).classList.remove('active'));
  }

  for(let i=particles.length-1;i>=0;i--){ particles[i].update(); particles[i].draw(eCtx); if(particles[i].life<=0) particles.splice(i,1); }
  for(let i=physParticles.length-1;i>=0;i--){ physParticles[i].update(H, W); physParticles[i].draw(eCtx); if(physParticles[i].life<=0) physParticles.splice(i,1); }

  if(frameCount%15===0) updateProgress();
  requestAnimationFrame(renderLoop);
}

// UI Event Listeners
const dropOverlay=document.getElementById('dropOverlay');
document.addEventListener('dragover',e=>{e.preventDefault();dropOverlay.classList.add('show');});
document.addEventListener('dragleave',e=>{if(e.target===document.documentElement)dropOverlay.classList.remove('show');});
document.addEventListener('drop',e=>{
  e.preventDefault(); dropOverlay.classList.remove('show');
  const files=[...e.dataTransfer.files].filter(f=>f.type.startsWith('audio/'));
  if(files.length) loadAudioFiles(files);
});
document.getElementById('fileInput').addEventListener('change',e=>{
  const files=[...e.target.files].filter(f=>f.type.startsWith('audio/'));
  if(files.length) loadAudioFiles(files); e.target.value='';
});

document.getElementById('volBar').addEventListener('input', e => setVolume(parseFloat(e.target.value)));
document.getElementById('progressBar').addEventListener('input', e => seekTrack(parseFloat(e.target.value)));
document.getElementById('pauseBtn').addEventListener('click', togglePause);
document.getElementById('prevBtn').addEventListener('click', playPrevTrack);
document.getElementById('nextBtn').addEventListener('click', playNextTrack);
document.getElementById('synthBtn').addEventListener('click', switchToSynth);

document.getElementById('startBtn').addEventListener('click', async()=>{
  const btn=document.getElementById('startBtn');
  const errDiv=document.getElementById('errMsg');
  btn.disabled=true;btn.textContent='[ REQUESTING CAMERA... ]';errDiv.style.display='none';

  let stream;
  try{
    stream=await navigator.mediaDevices.getUserMedia({ video:{width:{ideal:1280},height:{ideal:720},facingMode:'user'},audio:false });
  }catch(err){
    btn.disabled=false;btn.textContent='[ INITIALIZE ]';errDiv.style.display='block'; return;
  }
  video.srcObject=stream; try{await video.play();}catch(e){}
  try{btn.textContent='[ LOADING SYNTH... ]'; await initSynth();}catch(e){}
  try{
    btn.textContent='[ LOADING AI MODEL... ]';
    await setupHands(video);
  }catch(e){
    errDiv.style.display='block'; errDiv.innerHTML='⚠ 손 인식 모델 로드 실패';
    btn.disabled=false;btn.textContent='[ INITIALIZE ]'; return;
  }

  renderLoop();
  document.getElementById('musicBar').classList.add('show');
  document.getElementById('filterBar').classList.add('show');
  document.getElementById('overlay').classList.add('hidden');
  setTimeout(()=>document.getElementById('overlay').style.display='none',1200);
});