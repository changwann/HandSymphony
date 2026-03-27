let handLandmarks = null;

export function getLandmarks() {
  return handLandmarks;
}

export function clearLandmarks() {
  handLandmarks = null;
}

function loadScript(src){
  return new Promise((res,rej)=>{
    if(document.querySelector(`script[src="${src}"]`)){res();return;}
    const s=document.createElement('script');s.src=src;s.crossOrigin='anonymous';
    s.onload=res;s.onerror=()=>rej(new Error('Script load failed: '+src));
    document.head.appendChild(s);
  });
}

export async function setupHands(video){
  await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4/hands.js');
  const hands=new Hands({locateFile:f=>`https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4/${f}`});
  hands.setOptions({maxNumHands:1,modelComplexity:1,minDetectionConfidence:0.7,minTrackingConfidence:0.6});
  hands.onResults(r=>{
    handLandmarks = (r.multiHandLandmarks&&r.multiHandLandmarks.length>0) ? r.multiHandLandmarks[0] : null;
  });
  async function sendFrame(){
    if(video.readyState>=2){try{await hands.send({image:video});}catch(e){}}
    requestAnimationFrame(sendFrame);
  }
  sendFrame();
}

export function getSpread(lm) {
  const tips = [4,8,12,16,20].map(i=>lm[i]);
  let tot=0,cnt=0;
  for(let a=0;a<tips.length;a++) for(let b=a+1;b<tips.length;b++){
    const dx=tips[a].x-tips[b].x,dy=tips[a].y-tips[b].y;
    tot+=Math.sqrt(dx*dx+dy*dy);cnt++;
  }
  return Math.min(1,(tot/cnt)/0.35);
}

export function checkVSign(lm) {
  if(!lm) return false;
  if(lm[0].y < lm[9].y) return false;
  const indexUp  = lm[8].y < lm[6].y;
  const middleUp = lm[12].y < lm[10].y;
  const ringDown = lm[16].y > lm[14].y;
  const pinkyDown= lm[20].y > lm[18].y;
  const isSeparated = Math.abs(lm[8].x - lm[12].x) > 0.03;
  return indexUp && middleUp && ringDown && pinkyDown && isSeparated;
}

export function checkThumbsUp(lm) {
  if(!lm) return false;
  const thumbUp = lm[4].y < lm[3].y && lm[4].y < (lm[5].y - 0.05);
  const indexFolded = lm[8].y > lm[5].y;
  const middleFolded = lm[12].y > lm[9].y;
  const ringFolded = lm[16].y > lm[13].y;
  const pinkyFolded = lm[20].y > lm[17].y;
  return thumbUp && indexFolded && middleFolded && ringFolded && pinkyFolded;
}