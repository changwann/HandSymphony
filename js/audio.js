let audioCtx = null;
let gainNode = null, filterNode = null, tremoloGain = null;
let trOsc = null, pannerNode = null;
let reverbWetNode = null, reverbDryNode = null; 
let currentSource = null, currentBuffer = null;
let startTime = 0, pauseOffset = 0;
let isPaused = false;
let playlist = []; 
let playlistIdx = 0;

let synthMode = true;
let isSynthPaused = false; 
let synthAudioCtx = null;
let masterGain = null, synthFilter = null, synthTremDepth = null, synthPanner = null; 
let synthOscs = [];
let chordIdx = 0, arpIdx2 = 0, arpTimer = null;

let globalVolume = 0.9;
let vSignActive = false;
let thumbsUpActive = false;

const CHORDS = [
  {name:'D maj',notes:['D3','F#3','A3','D4']},
  {name:'A maj',notes:['A2','E3','A3','C#4']},
  {name:'B min',notes:['B2','D3','F#3','B3']},
  {name:'F# min',notes:['F#2','C#3','F#3','A3']},
  {name:'G maj',notes:['G2','B2','D3','G3']}
];

function noteToHz(n){
  const notes={'C':0,'C#':1,'D':2,'D#':3,'E':4,'F':5,'F#':6,'G':7,'G#':8,'A':9,'A#':10,'B':11};
  const m=n.match(/^([A-G]#?)(\d)$/);if(!m)return 440;
  return 440*Math.pow(2,(notes[m[1]]+(parseInt(m[2])+1)*12-57)/12);
}

export const isSynthMode = () => synthMode;

export function setVolume(vol) {
  globalVolume = vol;
  if (audioCtx && gainNode && !synthMode) {
    gainNode.gain.setTargetAtTime(globalVolume, audioCtx.currentTime, 0.05);
  }
  if (synthAudioCtx && masterGain && synthMode) {
    masterGain.gain.setTargetAtTime(0.15 * globalVolume, synthAudioCtx.currentTime, 0.05);
  }
}

export function setGestureStates(isV, isThumbsUp) {
  vSignActive = isV;
  thumbsUpActive = isThumbsUp;
}

export async function initSynth() {
  if (synthAudioCtx) return;
  synthAudioCtx = new (window.AudioContext||window.webkitAudioContext)();
  masterGain = synthAudioCtx.createGain(); masterGain.gain.value = 0.35;
  synthFilter = synthAudioCtx.createBiquadFilter(); synthFilter.type='lowpass'; synthFilter.frequency.value=1800;
  
  const tremOsc = synthAudioCtx.createOscillator(); tremOsc.frequency.value=4;
  synthTremDepth = synthAudioCtx.createGain(); synthTremDepth.gain.value=0;
  tremOsc.connect(synthTremDepth); tremOsc.start();

  const conv = synthAudioCtx.createConvolver();
  const len = synthAudioCtx.sampleRate*2;
  const buf = synthAudioCtx.createBuffer(2,len,synthAudioCtx.sampleRate);
  for(let c=0;c<2;c++){const d=buf.getChannelData(c);for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/len,2);}
  conv.buffer=buf;
  
  synthPanner = synthAudioCtx.createStereoPanner();
  synthFilter.connect(conv); conv.connect(masterGain); 
  masterGain.connect(synthPanner); synthPanner.connect(synthAudioCtx.destination);

  const voices=[ {type:'sine',gain:0.18,detune:0}, {type:'triangle',gain:0.12,detune:5}, {type:'sine',gain:0.09,detune:-3} ];
  synthOscs=voices.map(v=>{
    const osc=synthAudioCtx.createOscillator(); osc.type=v.type; osc.detune.value=v.detune;
    const envGain=synthAudioCtx.createGain(); envGain.gain.value=0;
    const volGain=synthAudioCtx.createGain(); volGain.gain.value=v.gain;
    synthTremDepth.connect(volGain.gain);
    osc.connect(envGain); envGain.connect(volGain); volGain.connect(synthFilter);
    osc.start(); return {osc,envGain,volGain};
  });
  startArp();
}

function startArp(){
  clearTimeout(arpTimer);
  function tick(){
    if(!synthMode || !synthAudioCtx) { arpTimer=setTimeout(tick,600); return; }
    if(isSynthPaused) { arpTimer=setTimeout(tick,200); return; } 

    const chord=CHORDS[chordIdx%CHORDS.length];
    const hz=noteToHz(chord.notes[arpIdx2%chord.notes.length]);
    const now=synthAudioCtx.currentTime, osc=synthOscs[0]; 
    if(!osc){ arpTimer=setTimeout(tick,600); return; }

    const pitchShift = thumbsUpActive ? 2.0 : 1.0;
    osc.osc.frequency.setTargetAtTime(hz * pitchShift, now, 0.02);
    
    osc.envGain.gain.cancelScheduledValues(now); osc.envGain.gain.setValueAtTime(0,now);
    osc.envGain.gain.linearRampToValueAtTime(1,now+0.4); osc.envGain.gain.setTargetAtTime(0,now+0.5,0.4);
    
    arpIdx2++; 
    if(arpIdx2%4===0){ chordIdx++; document.getElementById('v-note').textContent=CHORDS[chordIdx%CHORDS.length].name; }
    arpTimer=setTimeout(tick,600);
  }
  tick();
}

export function modulateSynth(sp, vel, pan){
  if(!synthAudioCtx || !synthMode) return;
  const now = synthAudioCtx.currentTime;
  synthFilter.frequency.setTargetAtTime(300+sp*5000, now, 0.1);
  synthTremDepth.gain.setTargetAtTime(Math.min(0.4, vel*0.3), now, 0.1);
  masterGain.gain.setTargetAtTime((0.15+vel*0.25) * globalVolume, now, 0.1);
  if(synthPanner) synthPanner.pan.setTargetAtTime(pan, now, 0.15);
  
  const pitchShift = thumbsUpActive ? 2.0 : 1.0;
  synthOscs.forEach((s,i)=>{
    if(i===0)return;
    s.osc.frequency.setTargetAtTime(noteToHz(CHORDS[chordIdx%CHORDS.length].notes[Math.min(i,CHORDS[chordIdx%CHORDS.length].notes.length-1)])*(i===2?2:1)*pitchShift, now, 0.2);
    s.volGain.gain.setTargetAtTime(sp>0.2 ? s.volGain.gain.value : 0.001, now, 0.15);
    if(sp>0.2) s.envGain.gain.setTargetAtTime(sp, now, 0.15);
    else s.envGain.gain.setTargetAtTime(0, now, 0.3);
  });
}

export async function initPlayerCtx(){
  if(audioCtx) return;
  audioCtx = new (window.AudioContext||window.webkitAudioContext)();
  gainNode = audioCtx.createGain(); gainNode.gain.value=0.9;
  filterNode = audioCtx.createBiquadFilter(); filterNode.type='lowpass'; filterNode.frequency.value=18000;
  pannerNode = audioCtx.createStereoPanner();
  trOsc = audioCtx.createOscillator(); trOsc.frequency.value=5;
  tremoloGain = audioCtx.createGain(); tremoloGain.gain.value=0;
  trOsc.connect(tremoloGain); trOsc.start();
  
  const conv=audioCtx.createConvolver(), len=audioCtx.sampleRate*2.5;
  const rbuf=audioCtx.createBuffer(2,len,audioCtx.sampleRate);
  for(let c=0;c<2;c++){const d=rbuf.getChannelData(c);for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/len,2.5);}
  conv.buffer=rbuf;
  
  reverbDryNode = audioCtx.createGain(); reverbDryNode.gain.value=0.7;
  reverbWetNode = audioCtx.createGain(); reverbWetNode.gain.value=0.3;
  filterNode.connect(pannerNode); pannerNode.connect(reverbDryNode); pannerNode.connect(conv); conv.connect(reverbWetNode);
  reverbDryNode.connect(gainNode); reverbWetNode.connect(gainNode);
  tremoloGain.connect(gainNode.gain); gainNode.connect(audioCtx.destination);
}

export async function loadAudioFiles(files){
  await initPlayerCtx();
  const newTracks=[];
  for(const file of files){
    try{
      const ab=await file.arrayBuffer();
      newTracks.push({name:file.name.replace(/\.[^.]+$/,''), buffer:await audioCtx.decodeAudioData(ab)});
    }catch(e){}
  }
  if(!newTracks.length)return;
  if(currentSource){ currentSource.onended = null; try{currentSource.stop();}catch(e){} }
  playlist = [...newTracks];
  synthMode=false; 
  if(synthAudioCtx && synthAudioCtx.state === 'running') synthAudioCtx.suspend(); 
  playTrack(0);
}

function playTrack(idx){
  if(!playlist.length||!audioCtx)return;
  if(currentSource){try{currentSource.stop();}catch(e){}}
  if(audioCtx.state === 'suspended') audioCtx.resume();
  currentSource=null; pauseOffset=0; isPaused=false;
  
  playlistIdx = idx < 0 ? playlist.length - 1 : (idx >= playlist.length ? 0 : idx);
  currentBuffer=playlist[playlistIdx].buffer;
  _startFrom(0);
  document.getElementById('trackName').textContent=`[${playlistIdx+1}/${playlist.length}] ${playlist[playlistIdx].name}`;
  document.getElementById('pauseBtn').textContent='⏸';
}

export function playNextTrack() { if(!synthMode && playlist.length > 0) playTrack(playlistIdx+1); }
export function playPrevTrack() { if(!synthMode && playlist.length > 0) playTrack(playlistIdx-1); }

function _startFrom(offset){
  if(currentSource){ currentSource.onended = null; try{currentSource.stop();}catch(e){} }
  const src=audioCtx.createBufferSource();
  src.buffer=currentBuffer; src.connect(filterNode);
  src.playbackRate.value = thumbsUpActive ? 2.0 : 1.0;
  src.start(0,offset); startTime=audioCtx.currentTime-offset; currentSource=src; 
  src.onended=()=> { if(!isPaused && playlist.length > 0) setTimeout(()=>playTrack(playlistIdx+1),300); };
}

export function seekTrack(fraction) {
  if(!currentBuffer || synthMode) return;
  const offset = fraction * currentBuffer.duration;
  pauseOffset = offset; 
  _startFrom(offset);
}

export function togglePause(){
  if(synthMode){
    isSynthPaused = !isSynthPaused;
    document.getElementById('pauseBtn').textContent = isSynthPaused ? '▶' : '⏸';
    if(synthAudioCtx) { isSynthPaused ? synthAudioCtx.suspend() : synthAudioCtx.resume(); }
    return;
  }
  if(!currentBuffer) return;
  if(!isPaused){
    if(audioCtx) audioCtx.suspend(); 
    isPaused=true; document.getElementById('pauseBtn').textContent='▶';
  } else {
    if(audioCtx) audioCtx.resume();
    isPaused=false; document.getElementById('pauseBtn').textContent='⏸';
  }
}

export function switchToSynth(){
  if(currentSource){try{currentSource.stop();}catch(e){}}
  if(audioCtx && audioCtx.state === 'running') audioCtx.suspend(); 
  synthMode=true; isSynthPaused=false;
  if(synthAudioCtx && synthAudioCtx.state === 'suspended') synthAudioCtx.resume();
  document.getElementById('trackName').textContent='SYNTH MODE';
  document.getElementById('pauseBtn').textContent='⏸';
}

export function modulatePlayer(sp, vel, pan){
  if(!audioCtx||synthMode)return;
  const now=audioCtx.currentTime;
  
  if (vSignActive) {
    filterNode.frequency.setTargetAtTime(200, now, 0.1);
    reverbWetNode.gain.setTargetAtTime(1.0, now, 0.1); reverbDryNode.gain.setTargetAtTime(0.0, now, 0.1);
  } else {
    filterNode.frequency.setTargetAtTime(100 + Math.pow(sp, 1.5) * 20000, now, 0.15);
    reverbWetNode.gain.setTargetAtTime(0.3, now, 0.15); reverbDryNode.gain.setTargetAtTime(0.7, now, 0.15);
  }
  if (currentSource) currentSource.playbackRate.setTargetAtTime(thumbsUpActive ? 2.0 : 1.0, now, 0.1);
  gainNode.gain.setTargetAtTime(globalVolume, now, 0.15); tremoloGain.gain.setTargetAtTime(0, now, 0.15);
  if(pannerNode) pannerNode.pan.setTargetAtTime(pan, now, 0.15);
}

export function updateProgress(){
  if(!audioCtx||synthMode||!currentBuffer||isPaused)return;
  const elapsed=audioCtx.currentTime-startTime, dur=currentBuffer.duration;
  document.getElementById('progressBar').value = Math.min(1, elapsed/dur);
  const s=Math.floor(elapsed%60), m=Math.floor(elapsed/60), ds=Math.floor(dur%60), dm=Math.floor(dur/60);
  document.getElementById('timeDisp').textContent=`${m}:${String(s).padStart(2,'0')} / ${dm}:${String(ds).padStart(2,'0')}`;
}