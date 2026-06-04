import React, {useEffect, useMemo, useRef, useState} from 'react';
import { createRoot } from 'react-dom/client';
import { Upload, Play, Pause, RotateCcw, Eye, Cloud, Waves, Shapes, UserRound, Footprints, HeartPulse, Sparkles, Gauge, Maximize2, Minimize2 } from 'lucide-react';
import './styles.css';

function clamp(n, min=0, max=1){ return Math.max(min, Math.min(max, n)); }
function hsl(h,s,l,a=1){ return `hsla(${h}, ${s}%, ${l}%, ${a})`; }
function lerp(a,b,t){ return a + (b-a)*t; }
function pct(n){ return Math.round(clamp(n)*100); }
function angleLerp(a,b,t){ const d=((b-a+540)%360)-180; return (a+d*t+360)%360; }
function fmtTime(sec){ return `${Math.floor(sec/60)}:${String(Math.floor(sec%60)).padStart(2,'0')}`; }

const COLOURS = [
  {name:'Red', hue:356}, {name:'Orange', hue:28}, {name:'Gold', hue:48},
  {name:'Yellow', hue:56}, {name:'Green', hue:145}, {name:'Blue', hue:210},
  {name:'Purple', hue:272}, {name:'Black', hue:280}, {name:'Silver', hue:220}
];

function colourName(hue, light, sat){
  if(light < 16 && sat < 52) return 'Black';
  if(light > 62 && sat < 45) return 'Silver';
  if(hue < 14 || hue > 342) return 'Red';
  if(hue < 40) return 'Orange';
  if(hue < 53) return 'Gold';
  if(hue < 70) return 'Yellow';
  if(hue < 170) return 'Green';
  if(hue < 235) return 'Blue';
  if(hue < 318) return 'Purple';
  return 'Red';
}

function pickColour({bass, lowMid, mid, high, energy, centroid, flux}){
  const warmth = clamp(lowMid*0.42 + mid*0.28 + energy*0.30);
  const darkness = clamp(bass*0.54 + lowMid*0.20 + (1-high)*0.26);
  const shimmer = clamp(high*0.70 + centroid*0.30);
  const grooveGlow = clamp(mid*0.35 + lowMid*0.25 + flux*0.4);

  let hue = 260, sat = 66, light = 32;
  if (energy < 0.045) { hue = 256; sat = 30; light = 13; }
  else if (darkness > 0.76 && high < 0.32) { hue = 285; sat = 70; light = 23; }
  else if (bass > 0.58 && flux > 0.26 && mid > 0.30) { hue = 50 + mid*10; sat = 86; light = 45 + energy*12; }
  else if (warmth > 0.52 && energy > 0.16) { hue = 25 + mid*12; sat = 88; light = 40 + energy*14; }
  else if (shimmer > 0.56 && energy > 0.14) { hue = 48 + high*10; sat = 80; light = 47 + shimmer*10; }
  else if (high > 0.43 && energy < 0.30) { hue = 210; sat = 62; light = 39; }
  else if (grooveGlow > 0.42) { hue = 54; sat = 82; light = 44 + energy*10; }

  return {hue, sat, light, dominant: colourName(hue, light, sat), warmth, darkness, shimmer};
}

function classifyAura({energy,bass,lowMid,mid,high,centroid,onset,flow,flux, bpmHint=90}){
  const groove = clamp((bass*0.34 + lowMid*0.24 + flux*0.42) * (0.75 + energy));
  const dream = clamp(high*0.34 + centroid*0.26 + (1-onset)*0.20 + (1-energy)*0.20);
  const threat = clamp(bass*0.44 + (1-high)*0.25 + onset*0.17 + (1-flow)*0.14);
  const lift = clamp(mid*0.26 + high*0.22 + energy*0.36 + flow*0.16);
  const forward = clamp(flow*0.45 + lowMid*0.20 + energy*0.20 + (1-onset)*0.15);
  const melodic = clamp((mid*0.38 + high*0.28 + (1-flux)*0.22 + energy*0.12) * (0.8 + flow*0.35));

  let behaviour='Drift', shape='Cloud', personality='Dreamer', creature='Mist Animal', feel='Reflective', breathe='Slow Tide', certainty=0.58;

  // Melody-driven sections need different language than rhythm-driven grooves.
  if(melodic > 0.55 && groove < 0.55 && energy > 0.12){
    behaviour='Ascend'; shape='Wing'; personality='Guide'; creature='Sky Lantern'; feel='Yearning'; breathe='Slow Lift'; certainty=0.70 + melodic*0.17;
  }
  else if(groove > 0.52 && energy > 0.12){
    behaviour='Groove'; shape='Serpent'; personality='Dancer'; creature='Groove Serpent'; feel='Playful'; breathe='Heartbeat'; certainty=0.78 + groove*0.13;
  }
  else if(forward > 0.50 && energy > 0.13){
    behaviour='Wave'; shape='Wave'; personality='Explorer'; creature='Ocean Runner'; feel='Adventurous'; breathe='Forward Surge'; certainty=0.75 + forward*0.16;
  }
  else if(dream > 0.58 && energy < 0.36){
    behaviour='Dream Swirl'; shape='Spiral'; personality='Stoner'; creature='Purple Lantern'; feel='Dreamlike'; breathe='Meditation'; certainty=0.74 + dream*0.13;
  }
  else if(threat > 0.66 && energy < 0.40){
    behaviour='Watcher'; shape='Eye'; personality='Watcher'; creature='Corridor Eye'; feel='Uneasy'; breathe='Holding Breath'; certainty=0.74 + threat*0.14;
  }
  else if(lift > 0.52 && onset > 0.25){
    behaviour='Pulse'; shape='Flame'; personality='Rebel'; creature='Heartbeat Engine'; feel='Defiant'; breathe='Storm'; certainty=0.68 + lift*0.13;
  }
  else if(energy < 0.10 && high > 0.25){
    behaviour='Float'; shape='Cloud'; personality='Wanderer'; creature='Silver Cloud'; feel='Nostalgic'; breathe='Drift'; certainty=0.62;
  }

  // Breathe adjustment from tempo/flux feel.
  if(bpmHint > 125 && groove > 0.35) breathe = 'Quick Steps';
  else if(bpmHint < 82 && (dream > 0.35 || melodic > 0.38)) breathe = 'Slow Tide';

  return {behaviour, shape, personality, creature, feel, breathe, certainty: clamp(certainty), groove, dream, threat, lift, forward, melodic};
}

function buildJourney(timeline){
  const analysed = timeline.filter(Boolean);
  if(!analysed.length) return [];
  const chunks = [];
  let current = null;
  analysed.forEach((item, idx) => {
    const key = `${item.dominant}|${item.personality}|${item.shape}`;
    if(!current || current.key !== key){
      current = {...item, key, start:idx, count:1, maxEnergy:item.energy};
      chunks.push(current);
    } else {
      current.count += 1;
      current.maxEnergy = Math.max(current.maxEnergy, item.energy);
    }
  });
  return chunks.slice(-8);
}

function dominantFromTimeline(timeline, field){
  const counts = {};
  timeline.filter(Boolean).forEach(t=>{ counts[t[field]] = (counts[t[field]]||0) + 1; });
  const sorted = Object.entries(counts).sort((a,b)=>b[1]-a[1]);
  return sorted[0]?.[0] || 'Listening';
}

function App(){
  const canvasRef = useRef(null);
  const fileRef = useRef(null);
  const audioRef = useRef(null);
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const leftAnalyserRef = useRef(null);
  const rightAnalyserRef = useRef(null);
  const rafRef = useRef(null);
  const dataRef = useRef(null);
  const leftDataRef = useRef(null);
  const rightDataRef = useRef(null);
  const stageRef = useRef(null);
  const timeRef = useRef({energy:0, smoothEnergy:0, flow:0.5, flux:0, idx:-1, lastSignature:'', hue:28, sat:82, light:42, bpmHint:90, heartHue:28, heartSize:0.22, reveal:0});
  const wakeRef = useRef([]);
  const performanceRef = useRef(Math.random()*10000);
  const particlesRef = useRef([]);
  const lastDataRef = useRef(null);

  const [fileName, setFileName] = useState('Drop an MP3/WAV to reveal its Aura');
  const [isPlaying, setIsPlaying] = useState(false);
  const [stats, setStats] = useState({energy:0,bass:0,lowMid:0,mid:0,high:0,hue:28,dominant:'Orange', behaviour:'Drift', shape:'Cloud', personality:'Dreamer', creature:'Mist Animal', feel:'Reflective', breathe:'Slow Tide', certainty:0});
  const [timeline, setTimeline] = useState([]);
  const [shift, setShift] = useState(null);
  const [analysisReady, setAnalysisReady] = useState(false);
  const [creatureDNA, setCreatureDNA] = useState(null);
  const [reveal, setReveal] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const analysisRef = useRef([]);

  const journey = useMemo(()=>buildJourney(timeline), [timeline]);
  const summary = useMemo(()=>({
    colour: dominantFromTimeline(timeline, 'dominant'),
    personality: dominantFromTimeline(timeline, 'personality'),
    shape: dominantFromTimeline(timeline, 'shape'),
    behaviour: dominantFromTimeline(timeline, 'behaviour'),
    feel: dominantFromTimeline(timeline, 'feel'),
    breathe: dominantFromTimeline(timeline, 'breathe'),
    creature: dominantFromTimeline(timeline, 'creature')
  }), [timeline]);

  useEffect(()=>{
    const onFs = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFs);
    return ()=>{ cancelAnimationFrame(rafRef.current); document.removeEventListener('fullscreenchange', onFs); };
  },[]);

  const setupAudio = async () => {
    const audio = audioRef.current;
    if(!audioCtxRef.current){
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.90;
      const leftAnalyser = ctx.createAnalyser();
      const rightAnalyser = ctx.createAnalyser();
      leftAnalyser.fftSize = rightAnalyser.fftSize = 1024;
      leftAnalyser.smoothingTimeConstant = rightAnalyser.smoothingTimeConstant = 0.82;
      const splitter = ctx.createChannelSplitter(2);
      const source = ctx.createMediaElementSource(audio);
      source.connect(analyser);
      source.connect(splitter);
      splitter.connect(leftAnalyser, 0);
      splitter.connect(rightAnalyser, 1);
      analyser.connect(ctx.destination);
      audioCtxRef.current = ctx;
      analyserRef.current = analyser;
      leftAnalyserRef.current = leftAnalyser;
      rightAnalyserRef.current = rightAnalyser;
      dataRef.current = new Uint8Array(analyser.frequencyBinCount);
      leftDataRef.current = new Uint8Array(leftAnalyser.frequencyBinCount);
      rightDataRef.current = new Uint8Array(rightAnalyser.frequencyBinCount);
      lastDataRef.current = new Uint8Array(analyser.frequencyBinCount);
    }
    if(audioCtxRef.current.state === 'suspended') await audioCtxRef.current.resume();
  };

  const analyseWholeFile = async (file) => {
    try{
      const buf = await file.arrayBuffer();
      const ctx = new (window.OfflineAudioContext || window.webkitOfflineAudioContext)(1, 1, 44100);
      const audioBuffer = await ctx.decodeAudioData(buf.slice(0));
      const channel = audioBuffer.getChannelData(0);
      const bins = 120;
      const frameSize = Math.max(2048, Math.floor(channel.length / bins));
      const sr = audioBuffer.sampleRate;
      const results = [];
      let prevRms = 0;
      let onsetHits = 0;
      for(let b=0;b<bins;b++){
        const start = Math.floor(b * channel.length / bins);
        const end = Math.min(channel.length, start + frameSize);
        let sum=0, zc=0, last=channel[start]||0;
        let peak=0;
        for(let i=start;i<end;i++){
          const v = channel[i] || 0;
          sum += v*v; peak = Math.max(peak, Math.abs(v));
          if((v>=0)!=(last>=0)) zc++; last=v;
        }
        const rms = Math.sqrt(sum / Math.max(1,end-start));
        const onset = clamp((rms - prevRms) * 8);
        if(onset > 0.18) onsetHits++;
        prevRms = rms;
        // Cheap but useful colour proxies for offline look-ahead.
        const energy = clamp(rms * 4.2);
        const centroid = clamp((zc / Math.max(1,end-start)) * 16);
        const bass = clamp((1-centroid)*energy*0.65 + peak*0.15);
        const lowMid = clamp(energy * (0.55 + (1-centroid)*0.25));
        const mid = clamp(energy * (0.55 + centroid*0.35));
        const high = clamp(energy * centroid*1.2);
        const flux = onset;
        const flow = clamp(0.45 + energy*0.25 - onset*0.12);
        const col = pickColour({bass, lowMid, mid, high, energy, centroid, flux});
        const aura = classifyAura({energy,bass,lowMid,mid,high,centroid,onset,flow,flux,bpmHint:90});
        results.push({h:col.hue,s:col.sat,l:col.light,energy,dominant:col.dominant, ...aura});
      }
      const duration = audioBuffer.duration || 1;
      const bpmHint = Math.round(clamp((onsetHits / duration) * 60 * 2, 55, 165));
      const final = results.map(r=>{
        const aura = classifyAura({...r, centroid:0.4, onset:0.05, flow:0.5, flux:0.1, bpmHint});
        return {...r, ...aura};
      });
      analysisRef.current = final;
      timeRef.current.bpmHint = bpmHint;
      setTimeline(final);
      const dna = {
        creature: dominantFromTimeline(final, 'creature'),
        feel: dominantFromTimeline(final, 'feel'),
        breathe: dominantFromTimeline(final, 'breathe'),
        shape: dominantFromTimeline(final, 'shape'),
        personality: dominantFromTimeline(final, 'personality'),
        colour: dominantFromTimeline(final, 'dominant'),
        bpmHint
      };
      setCreatureDNA(dna);
      setAnalysisReady(true);
    }catch(err){
      console.warn('Aura look-ahead analysis failed', err);
      setAnalysisReady(false);
    }
  };

  const onFile = (file) => {
    if(!file) return;
    const url = URL.createObjectURL(file);
    audioRef.current.src = url;
    setFileName(file.name);
    setTimeline([]); setShift(null); setIsPlaying(false); setAnalysisReady(false);
    analysisRef.current = [];
    analyseWholeFile(file);
    particlesRef.current = []; wakeRef.current = []; performanceRef.current = Math.random()*10000; setReveal(0); setCreatureDNA(null);
    timeRef.current = {energy:0, smoothEnergy:0, flow:0.5, flux:0, idx:-1, lastSignature:'', hue:28, sat:82, light:42, bpmHint:90, heartHue:28, heartSize:0.22, reveal:0, lastPulse:0, lastChordHue:28, lastCentroid:0, lastDanceEvent:''};
  };

  const handleDrop = (e) => { e.preventDefault(); onFile(e.dataTransfer.files?.[0]); };

  const togglePlay = async () => {
    if(!audioRef.current.src) return;
    await setupAudio();
    if(audioRef.current.paused){ await audioRef.current.play(); setIsPlaying(true); draw(); }
    else { audioRef.current.pause(); setIsPlaying(false); }
  };

  useEffect(()=>{
    const onKey = (e) => {
      const tag = (e.target?.tagName || '').toLowerCase();
      if(tag === 'input' || tag === 'textarea' || tag === 'select' || e.metaKey || e.ctrlKey || e.altKey) return;
      if(!audioRef.current?.src) return;
      e.preventDefault();
      togglePlay();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const seekToBin = async (i) => {
    const audio = audioRef.current;
    if(!audio?.src || !isFinite(audio.duration)) return;
    await setupAudio();
    audio.currentTime = (i/120) * audio.duration;
    if(audio.paused){ await audio.play(); setIsPlaying(true); }
    draw();
  };

  const toggleFullscreen = async () => {
    const el = stageRef.current;
    if(!el) return;
    try{
      if(!document.fullscreenElement) await el.requestFullscreen();
      else await document.exitFullscreen();
    }catch(e){ console.warn('Fullscreen failed', e); }
  };


  const freezeFrame = () => {
    const audio = audioRef.current;
    if(!audio?.src) return;
    audio.pause();
    setIsPlaying(false);
    // Draw one final frame so the creature stays alive-looking instead of snapping away.
    try { draw(); } catch(e) { console.warn('Freeze frame draw failed', e); }
  };

  const saveScreenshot = () => {
    const canvas = canvasRef.current;
    if(!canvas) return;
    const a = document.createElement('a');
    const safeName = (fileName || 'aura').replace(/\.[^/.]+$/, '').replace(/[^a-z0-9-_]+/gi, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'aura';
    a.download = `${safeName}-aura.png`;
    a.href = canvas.toDataURL('image/png');
    a.click();
  };

  const reset = () => {
    audioRef.current.pause(); audioRef.current.currentTime = 0; setIsPlaying(false); setTimeline([]); setShift(null);
    particlesRef.current = []; wakeRef.current = []; performanceRef.current = Math.random()*10000; setReveal(0); setCreatureDNA(null);
    timeRef.current = {energy:0, smoothEnergy:0, flow:0.5, flux:0, idx:-1, lastSignature:'', hue:28, sat:82, light:42, bpmHint:90, heartHue:28, heartSize:0.22, reveal:0, lastPulse:0, lastChordHue:28, lastCentroid:0, lastDanceEvent:''};
  };

  const band = (data,a,b)=>{
    const nyquist = audioCtxRef.current.sampleRate/2;
    const start = Math.floor(a/nyquist*data.length), end = Math.max(start+1, Math.floor(b/nyquist*data.length));
    let sum=0; for(let i=start;i<end;i++) sum += data[i];
    return sum/((end-start)*255);
  };

  const calcFlux = (data) => {
    const last = lastDataRef.current;
    if(!last) return 0;
    let sum = 0;
    for(let i=0;i<data.length;i+=8){ sum += Math.max(0, data[i]-last[i]); last[i] = data[i]; }
    return clamp(sum / 3600);
  };

  const draw = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    if(canvas.width !== Math.round(rect.width*dpr) || canvas.height !== Math.round(rect.height*dpr)){
      canvas.width = Math.round(rect.width*dpr); canvas.height = Math.round(rect.height*dpr); ctx.setTransform(dpr,0,0,dpr,0,0);
    }
    const w = rect.width, h = rect.height;
    const analyser = analyserRef.current, data = dataRef.current;
    analyser.getByteFrequencyData(data);

    const bass = band(data,20,120), lowMid = band(data,120,450), mid = band(data,450,2500), high = band(data,2500,12000);
    const rawEnergy = clamp((bass+lowMid+mid+high)/4 * 1.18);
    const leftData = leftDataRef.current, rightData = rightDataRef.current;
    let pan = 0, stereoSpread = 0;
    if(leftAnalyserRef.current && rightAnalyserRef.current && leftData && rightData){
      leftAnalyserRef.current.getByteFrequencyData(leftData);
      rightAnalyserRef.current.getByteFrequencyData(rightData);
      const lBass = band(leftData,20,160), lMid = band(leftData,160,5200), lHigh = band(leftData,5200,12000);
      const rBass = band(rightData,20,160), rMid = band(rightData,160,5200), rHigh = band(rightData,5200,12000);
      const lEnergy = (lBass+lMid+lHigh)/3;
      const rEnergy = (rBass+rMid+rHigh)/3;
      pan = clamp((rEnergy-lEnergy)/(rEnergy+lEnergy+0.0001), -1, 1);
      stereoSpread = clamp(Math.abs(pan)*0.72 + Math.abs(lHigh-rHigh)*0.55 + Math.abs(lMid-rMid)*0.30);
    }
    const prev = timeRef.current.energy || 0;
    const onset = clamp((rawEnergy - prev) * 7.2);
    const smoothEnergy = lerp(timeRef.current.smoothEnergy || 0, rawEnergy, 0.075);
    const centroid = clamp(mid*0.38 + high*0.82);
    const flux = lerp(timeRef.current.flux || 0, calcFlux(data), 0.10);
    const flow = clamp(lerp(timeRef.current.flow ?? 0.5, lowMid*0.38 + mid*0.30 + (1-onset)*0.20 + flux*0.12, 0.045));
    timeRef.current = {...timeRef.current, energy:rawEnergy, smoothEnergy, flow, flux};

    const rawCol = pickColour({bass, lowMid, mid, high, energy:smoothEnergy, centroid, flux});
    const rawAura = classifyAura({energy:smoothEnergy,bass,lowMid,mid,high,centroid,onset,flow,flux,bpmHint:timeRef.current.bpmHint});

    const t = audioRef.current.currentTime || 0;
    const dur = audioRef.current.duration || 1;
    const idx = Math.floor((t/dur)*120);
    const ahead = analysisRef.current[Math.min(119, idx + Math.max(2, Math.round((timeRef.current.bpmHint < 90 ? 8 : timeRef.current.bpmHint > 125 ? 3 : 5))))];
    const target = ahead || {h:rawCol.hue,s:rawCol.sat,l:rawCol.light,dominant:rawCol.dominant,...rawAura};
    const memory = timeRef.current.bpmHint < 90 ? 0.018 : timeRef.current.bpmHint > 125 ? 0.060 : 0.036;
    const hue = angleLerp(timeRef.current.hue ?? rawCol.hue, target.h ?? rawCol.hue, memory);
    const sat = lerp(timeRef.current.sat ?? rawCol.sat, target.s ?? rawCol.sat, memory);
    const light = lerp(timeRef.current.light ?? rawCol.light, target.l ?? rawCol.light, memory);
    timeRef.current.hue = hue; timeRef.current.sat = sat; timeRef.current.light = light;
    const col = {hue, sat, light, dominant: colourName(hue, light, sat)};
    const aura = {...rawAura, ...(target || {})};
    const heartRate = timeRef.current.bpmHint / 60;
    const heartHue = angleLerp(timeRef.current.heartHue ?? col.hue, rawCol.hue, timeRef.current.bpmHint < 90 ? 0.035 : timeRef.current.bpmHint > 125 ? 0.095 : 0.060);
    const targetHeartSize = clamp(0.18 + smoothEnergy*0.58 + rawAura.lift*0.18 + rawAura.melodic*0.10, 0.16, 0.82);
    const heartSize = lerp(timeRef.current.heartSize ?? 0.22, targetHeartSize, timeRef.current.bpmHint < 90 ? 0.025 : timeRef.current.bpmHint > 125 ? 0.070 : 0.045);
    timeRef.current.heartHue = heartHue;
    timeRef.current.heartSize = heartSize;
    const playbackProgress = clamp((audioRef.current.currentTime || 0) / (audioRef.current.duration || 1));
    const revealAmount = clamp(0.06 + playbackProgress*0.94);
    timeRef.current.reveal = lerp(timeRef.current.reveal || 0, revealAmount, 0.04);
    setReveal(timeRef.current.reveal);
    const heartbeat = clamp(smoothEnergy*0.58 + flux*0.24 + bass*0.22 + (1-Math.abs(pan))*0.08);
    const reaction = timeRef.current.lastDanceEvent || (heartbeat > 0.72 ? 'Dancing' : heartbeat > 0.44 ? 'Moving' : 'Breathing');
    const currentStats = {energy:smoothEnergy,bass,lowMid,mid,high,hue:col.hue,heartHue,heartSize,dominant:col.dominant,pan,stereoSpread,heartbeat,reaction,...aura};
    setStats(currentStats);

    const signature = `${col.dominant}|${aura.personality}|${aura.shape}`;
    if(timeRef.current.lastSignature && timeRef.current.lastSignature !== signature && smoothEnergy > 0.08){
      setShift({from:timeRef.current.lastSignature.split('|')[1], to:aura.personality, at:audioRef.current.currentTime || 0});
    }
    timeRef.current.lastSignature = signature;

    if(timeRef.current.idx !== idx){
      timeRef.current.idx = idx;
      setTimeline(prev => {
        const next = [...prev];
        next[idx] = {h:col.hue, s:col.sat, l:col.light, energy:smoothEnergy, dominant:col.dominant, behaviour:aura.behaviour, shape:aura.shape, personality:aura.personality, creature:aura.creature, feel:aura.feel, breathe:aura.breathe};
        return next;
      });
      wakeRef.current.push({type:'breath', h:heartHue, s:col.sat, l:col.light, age:0, life:1, pan:pan*0.35, r:40 + heartSize*110, spin:Math.random()*Math.PI*2, power:0.20 + smoothEnergy*0.22});
      if(wakeRef.current.length > 24) wakeRef.current.shift();
    }

    const now = performance.now()/1000;

    // v1.2 musical event detection: the creature keeps grooving, but arrangement moments leave visible marks.
    // Synths = purple/red scars, vocals/BK = left/right soul blooms, snare = sharp scars, chord lifts = whole-body shockwaves.
    const chordDrift = Math.abs(((rawCol.hue - (timeRef.current.lastChordHue ?? rawCol.hue) + 540) % 360) - 180);
    const centroidDrift = Math.abs(centroid - (timeRef.current.lastCentroid ?? centroid));
    const chordish = smoothEnergy > 0.16 && (chordDrift > 28 || centroidDrift > 0.16) && onset > 0.035;
    const pulseGap = now - (timeRef.current.lastPulse || 0);
    const pulseThreshold = 0.075 + Math.max(0, smoothEnergy-0.18)*0.09;
    const hasPulse = (onset > pulseThreshold || flux > 0.16 || chordish) && pulseGap > 0.09;

    const addMemory = (eventType, opts={}) => {
      const baseHue = opts.h ?? rawCol.hue;
      const copies = opts.copies ?? 5;
      for(let k=0;k<copies;k++){
        wakeRef.current.push({
          type:eventType,
          h:baseHue + (opts.hSpread ? (Math.random()-0.5)*opts.hSpread : 0),
          s:opts.s ?? 96,
          l:opts.l ?? 58,
          age:0,
          life:1,
          decay:opts.decay ?? 6.5,
          pan:clamp((opts.pan ?? pan) + (Math.random()-0.5)*(opts.panJitter ?? 0.14), -1, 1),
          spin:Math.random()*Math.PI*2,
          drift:0.55 + Math.random()*1.15,
          lane:Math.random(),
          power:clamp((opts.power ?? 0.45) + onset*1.25 + flux*0.85 + smoothEnergy*0.25 + stereoSpread*0.28),
          shape:aura.shape
        });
      }
    };

    if(hasPulse){
      timeRef.current.lastPulse = now;
      const highish = high > bass*0.62 && high > 0.095;
      const midish = mid > bass*0.58 && mid > 0.105;
      const snareish = onset > 0.115 && flux > 0.105 && high > 0.085 && mid > 0.105 && bass < 0.62;
      const vocalish = mid > 0.17 && lowMid > 0.11 && high < 0.62 && !snareish;
      const synthish = (highish || (midish && flux > 0.125)) && !snareish && !chordish;
      const grooveish = bass > 0.25 && bass > mid*0.70;

      if(chordish){
        addMemory('chord-shockwave', {h: rawCol.hue + 18, s:98, l:62, decay:7.8, copies:10, hSpread:34, pan:0, panJitter:1.45, power:0.55});
        timeRef.current.lastDanceEvent = 'Chord shockwave';
      } else if(snareish){
        addMemory('snare-scar', {h: 348 + Math.random()*30, s:98, l:60, decay:5.6, copies:9, hSpread:18, power:0.56});
        timeRef.current.lastDanceEvent = 'Snare scar';
      } else if(synthish){
        // Make synth stabs confident: magenta/purple/red scars that linger.
        addMemory('synth-scar', {h: high > mid ? 286 + Math.random()*26 : 330 + Math.random()*26, s:99, l:59, decay:7.2, copies:10, hSpread:28, power:0.62});
        timeRef.current.lastDanceEvent = 'Synth scar';
      } else if(vocalish){
        // Stereo/BK vocal bloom: if the vocal is wide, make both sides answer each other.
        if(stereoSpread > 0.16){
          addMemory('vocal-bloom', {h: 42 + Math.random()*24, s:88, l:72, decay:8.8, copies:4, pan:-0.72, panJitter:0.20, power:0.42});
          addMemory('vocal-bloom', {h: 52 + Math.random()*24, s:88, l:74, decay:8.8, copies:4, pan:0.72, panJitter:0.20, power:0.42});
        } else {
          addMemory('vocal-bloom', {h: 44 + Math.random()*22, s:84, l:72, decay:8.4, copies:6, power:0.42});
        }
        timeRef.current.lastDanceEvent = 'Vocal bloom';
      } else if(grooveish){
        addMemory('groove-pocket', {h:260, s:55, l:18, decay:6.4, copies:4, power:0.44});
        timeRef.current.lastDanceEvent = 'Groove pocket';
      } else {
        addMemory('pulse', {h: rawCol.hue, s:92, l:58, decay:5.8, copies:4, power:0.35});
        timeRef.current.lastDanceEvent = 'Pulse';
      }
      if(wakeRef.current.length > 140) wakeRef.current.splice(0, wakeRef.current.length-140);
    }
    timeRef.current.lastChordHue = angleLerp(timeRef.current.lastChordHue ?? rawCol.hue, rawCol.hue, 0.035);
    timeRef.current.lastCentroid = lerp(timeRef.current.lastCentroid ?? centroid, centroid, 0.05);

    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = 'rgba(3,4,12,0.125)';
    ctx.fillRect(0,0,w,h);
    ctx.globalCompositeOperation = 'lighter';

    const seed = performanceRef.current;
    const speed = 0.10 + smoothEnergy*0.20 + flux*0.12;
    const heartPulse = 0.86 + Math.sin(now * heartRate * Math.PI*2) * (0.035 + smoothEnergy*0.055);

    const drawBlob = (x,y,r,hue,alpha=0.18, light=42, satOverride=col.sat) => {
      // Canvas gradients throw if any value is NaN/Infinity/negative.
      // Guard the creature so one odd audio frame doesn't kill the animal.
      if(!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(r)) return;
      const safeR = Math.max(1, Math.abs(r));
      const safeHue = Number.isFinite(hue) ? hue : col.hue;
      const safeSat = Number.isFinite(satOverride) ? satOverride : col.sat;
      const safeLight = Number.isFinite(light) ? light : col.light;
      const safeAlpha = Math.max(0, Math.min(1, Number.isFinite(alpha) ? alpha : 0.05));
      const grd = ctx.createRadialGradient(x,y,0,x,y,safeR);
      grd.addColorStop(0, hsl(safeHue, safeSat, safeLight, safeAlpha));
      grd.addColorStop(0.42, hsl(safeHue+12, safeSat, Math.max(18, safeLight-10), safeAlpha*0.36));
      grd.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(x,y,safeR,0,Math.PI*2);
      ctx.fill();
    };

    const creaturePoint = (p, scale=1) => {
      const phase = now*(0.14 + speed*0.52) + seed*0.01;
      if(aura.shape === 'Serpent'){
        const snap = onset*0.28 + flux*0.18;
        const x = w*(0.03 + p*0.94);
        const y = h*(0.53 + Math.sin(phase*2.35 + p*7.9)*0.155*scale + Math.sin(phase*1.10 + p*3.4)*0.052 + Math.sin(now*heartRate*6.28 + p*18)*snap);
        return [x,y];
      }
      if(aura.shape === 'Wave'){
        const lift = onset*0.18 + rawAura.lift*0.06;
        const x = w*(0.035 + p*0.93);
        const y = h*(0.54 + Math.sin(phase*1.45 + p*6.2)*0.175*scale + Math.sin(phase*0.56 + p*2.6)*0.065 - lift*Math.sin(p*Math.PI));
        return [x,y];
      }
      if(aura.shape === 'Spiral'){
        const a = phase*0.75 + p*Math.PI*2.4;
        const rr = Math.min(w,h)*(0.06 + p*0.28*scale);
        return [w/2 + Math.cos(a)*rr*1.18, h/2 + Math.sin(a*0.92)*rr*0.86];
      }
      if(aura.shape === 'Eye'){
        const a = phase*0.20 + p*Math.PI*2;
        return [w/2 + Math.cos(a)*w*(0.12+smoothEnergy*0.08), h/2 + Math.sin(a)*h*(0.055+smoothEnergy*0.045)];
      }
      if(aura.shape === 'Flame'){
        const a = phase*1.8 + p*4.0;
        return [w*(0.5 + Math.sin(a)*0.20*(1-p)), h*(0.80 - p*0.68 + Math.cos(a)*0.04)];
      }
      // Cloud / mist default: fills more of the screen, drifting like smoke.
      const a = phase*0.55 + p*Math.PI*2.0;
      const breathing = 1 + Math.sin(now*heartRate*Math.PI*2 + p*5.5)*0.045 + onset*0.10;
      const rr = Math.min(w,h)*(0.075 + 0.17*Math.sin(p*Math.PI) + smoothEnergy*0.060) * breathing;
      // More creature silhouette, less fog blanket.
      return [w/2 + Math.cos(a)*rr*1.58 + Math.sin(a*0.41)*w*0.070, h/2 + Math.sin(a*0.88)*rr*0.98 + Math.cos(a*0.23)*h*0.034];
    };

    // Memory wake: coloured scars/blooms remember what hit the creature a few seconds ago.
    // Centre-ish = recent. Outer/smokier = 5-10 seconds ago. Pan controls left/right arrival.
    wakeRef.current = wakeRef.current.map(wk => {
      const age = (wk.age||0)+1/60;
      const decay = wk.decay || 9.8;
      return {...wk, age, life: Math.max(0, 1-age/decay)};
    }).filter(wk => wk.life > 0.015);
    wakeRef.current.forEach((wk, i) => {
      const p = clamp((wk.age||0)/(wk.decay || 8.8));
      const pan01 = clamp(((wk.pan ?? 0)+1)/2);
      const sourceX = w*(0.14 + pan01*0.72);
      const sourceY = h*(0.45 + Math.sin(wk.spin)*0.18);
      const a = wk.spin + now*0.055*wk.drift + seed*0.003;
      const out = p*p;
      const x = lerp(sourceX, w/2 + Math.cos(a)*w*0.62, out) + Math.sin(a*2.0+i)*w*0.025*out;
      const y = lerp(sourceY, h/2 + Math.sin(a*0.78)*h*0.46, out) + Math.cos(a*1.5+i)*h*0.025*out;
      const base = wk.type === 'synth-scar' ? 150 : wk.type === 'vocal-bloom' ? 120 : wk.type === 'groove-pocket' ? 190 : 105;
      const r = (base + 310*out + smoothEnergy*70) * (0.45 + (wk.power||0.35)*0.72);
      if(wk.type === 'groove-pocket'){
        // Dark groove pockets: bass creates gravity rather than light.
        ctx.globalCompositeOperation = 'source-over';
        const grd = ctx.createRadialGradient(x,y,0,x,y,Math.max(1,r));
        grd.addColorStop(0, `rgba(0,0,0,${0.30*wk.life*wk.power})`);
        grd.addColorStop(0.55, `rgba(0,0,0,${0.14*wk.life*wk.power})`);
        grd.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grd; ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill();
        ctx.globalCompositeOperation = 'lighter';
      } else if(wk.type === 'chord-shockwave'){
        // Chord changes: the whole animal briefly busts a move, then the colour sinks into memory.
        for(let j=0;j<7;j++){
          const shockA = a + j*0.90 + Math.sin(now*0.20+i)*0.35;
          const sx = x + Math.cos(shockA)*r*(0.12 + j*0.045);
          const sy = y + Math.sin(shockA*0.72)*r*(0.10 + j*0.035);
          drawBlob(sx, sy, r*(0.35+j*0.075), wk.h + j*7, 0.090*wk.life*wk.power*(1-p*0.18), 44+smoothEnergy*24, wk.s);
        }
      } else if(wk.type === 'snare-scar'){
        // Snare scars: sharp red/pink shock marks that visibly arrive, then dissolve outward.
        for(let j=0;j<5;j++){
          const scarA = a + j*1.22 + Math.sin(now*0.55+i)*0.45;
          const sx = x + Math.cos(scarA)*r*(0.18 + j*0.035);
          const sy = y + Math.sin(scarA*0.70)*r*(0.12 + j*0.025);
          drawBlob(sx, sy, r*(0.18+j*0.050), wk.h + j*5, 0.115*wk.life*wk.power*(1-p*0.20), 42+smoothEnergy*18, wk.s);
        }
      } else if(wk.type === 'synth-scar'){
        // Visible scar: a saturated wound/vein that travels out and becomes smoke.
        for(let j=0;j<5;j++){
          const scarA = a + j*1.42 + Math.sin(now*0.3+i)*0.3;
          const sx = x + Math.cos(scarA)*r*0.28;
          const sy = y + Math.sin(scarA*0.82)*r*0.18;
          drawBlob(sx, sy, r*(0.34+j*0.075), wk.h + j*8, 0.165*wk.life*wk.power*(1-p*0.18), 34+smoothEnergy*22, wk.s);
        }
      } else {
        // Vocal/other blooms: soft soul density, not a hard white dot.
        drawBlob(x, y, r*0.55, wk.h, 0.060*wk.life*wk.power, wk.l || 56, wk.s);
        drawBlob(x, y, r*0.22, 52, 0.042*wk.life*wk.power, 76, 30);
      }
      // Outer smoke after-image. This is the memory of the event dissolving into the animal.
      for(let j=0;j<3;j++){
        const aa = a + j*2.21 + Math.sin(now*0.12+i)*0.4;
        drawBlob(x + Math.cos(aa)*r*(0.50+out*0.35), y + Math.sin(aa)*r*(0.36+out*0.25), r*(0.20+j*0.055), wk.h + j*10, 0.017*wk.life*(wk.power||0.35), 26+smoothEnergy*14, wk.s);
      }
    });

    // Main creature body. It should own the screen. The soul is inside it, not a ball on top of it.
    const points = [];
    const steps = aura.shape === 'Serpent' ? 34 : aura.shape === 'Wave' ? 30 : aura.shape === 'Cloud' ? 26 : 24;
    for(let i=0;i<steps;i++) points.push(creaturePoint(i/(steps-1 || 1), 1));

    points.forEach(([x,y], i) => {
      const p = i/(steps-1 || 1);
      const localPulse = 1 + Math.sin(now*heartRate*Math.PI*2 + p*4.8)*0.035;
      const baseR = (aura.shape === 'Serpent' || aura.shape === 'Wave') ? 82 : 92;
      const r = (baseR + smoothEnergy*138 + Math.sin(now*0.65+p*8)*20 + onset*42) * localPulse;
      // More defined animal body: dense inner glow with a softer smoky edge.
      drawBlob(x,y,r*1.12,(col.hue+p*24)%360,0.055+smoothEnergy*0.072,30+smoothEnergy*17);
      drawBlob(x,y,r*0.62,(col.hue+p*18)%360,0.105+smoothEnergy*0.105,42+smoothEnergy*22);
      // Smoke-like broken outline: faint fragments drift off the creature boundary.
      if(i % 2 === 0){
        const edgeA = now*0.11 + p*7.1 + seed*0.002;
        const ex = x + Math.cos(edgeA)*r*(0.42 + 0.18*Math.sin(now+p));
        const ey = y + Math.sin(edgeA*0.9)*r*(0.35 + 0.15*Math.cos(now*0.7+p));
        drawBlob(ex,ey,r*0.36,(col.hue+p*30+18)%360,0.030+smoothEnergy*0.035,26+smoothEnergy*16);
      }
    });

    // Soul glow: faint white/gold traces inside the animal. No fixed centre object.
    ctx.globalCompositeOperation = 'lighter';
    const soulCount = 4;
    for(let i=0;i<soulCount;i++){
      const pp = (0.20 + i*0.19 + Math.sin(now*0.05 + seed + i)*0.05) % 1;
      const [sx,sy] = creaturePoint(pp, 0.8);
      const soulR = Math.min(w,h) * (0.025 + heartSize*0.026) * heartPulse * (0.72 + i*0.07);
      const soulHue = angleLerp(heartHue, col.hue, i/soulCount*0.35);
      drawBlob(sx, sy, soulR*2.1, soulHue, 0.050 + smoothEnergy*0.040, 68, 34);
      drawBlob(sx, sy, soulR*0.68, 54, 0.060 + smoothEnergy*0.045, 80, 26);
    }

    // Very soft current-emotion shimmer through the creature, no circles/rings.
    if(onset > 0.08 || flux > 0.18){
      const [px,py] = creaturePoint(0.45 + Math.sin(now*0.2)*0.08, 1);
      drawBlob(px, py, Math.min(w,h)*(0.18+smoothEnergy*0.22), rawCol.hue, 0.045 + onset*0.10, 42+smoothEnergy*20, rawCol.sat);
    }

    if(!audioRef.current.paused) rafRef.current = requestAnimationFrame(draw);
  };

  return <div className="app" onDragOver={e=>e.preventDefault()} onDrop={handleDrop}>
    <audio ref={audioRef} onEnded={()=>setIsPlaying(false)} />
    <header>
      <div><h1>Eleria Aura</h1><p>Drop a song. Press play. Watch the creature react, remember, and dance in stereo.</p></div>
      <div className="badge">MOS Aura module v1.2.2</div>
    </header>
    <main>
      <section className="left">
        <div className="drop" onClick={()=>fileRef.current.click()}>
          <Upload size={32}/><strong>{fileName}</strong><span>MP3, WAV, M4A if your browser supports it</span>
          <input ref={fileRef} type="file" accept="audio/*" hidden onChange={e=>onFile(e.target.files?.[0])}/>
        </div>
        <div className="controls">
          <button onClick={togglePlay}>{isPlaying ? <Pause/> : <Play/>}{isPlaying?'Pause':'Play'}</button>
          <button className="ghost" onClick={toggleFullscreen}>{isFullscreen ? <Minimize2/> : <Maximize2/>}{isFullscreen?'Exit':'Full Screen'}</button>
          <button className="ghost" onClick={reset}><RotateCcw/>Reset</button>
        </div>

        <div className="readout hero-card">
          <h2>Current Aura</h2>
          <div className="feel-name"><Sparkles size={18}/><span>Feel</span><b>{stats.feel}</b></div>
          <div className="aura-name" style={{color:`hsl(${stats.hue}, 88%, 64%)`}}>{stats.dominant}</div>
          <div className="identity-grid">
            <div><Waves size={16}/><span>Behaviour</span><b>{stats.behaviour}</b></div>
            <div><Shapes size={16}/><span>Shape</span><b>{stats.shape}</b></div>
            <div><UserRound size={16}/><span>Personality</span><b>{stats.personality}</b></div>
            <div><HeartPulse size={16}/><span>Breathe</span><b>{stats.breathe}</b></div>
            <div><Footprints size={16}/><span>Reaction</span><b>{stats.reaction || 'Breathing'}</b></div>
            <div><Gauge size={16}/><span>Heartbeat</span><b>{pct(stats.heartbeat || stats.energy)}%</b></div>
            <div><Gauge size={16}/><span>Reveal</span><b>{pct(reveal)}%</b></div>
            <div className="wide"><Eye size={16}/><span>Creature</span><b>{creatureDNA?.creature || stats.creature}</b></div>
          </div>
          <div className="confidence"><i><em style={{width:`${pct(stats.certainty)}%`}}/></i><small>{pct(stats.certainty)}% confidence</small></div>
        </div>

        <div className="summary-card">
          <h2>Creature DNA</h2>
          <div className="summary-row"><span>Creature</span><b>{creatureDNA?.creature || summary.creature}</b></div>
          <div className="summary-row"><span>DNA Colour</span><b>{creatureDNA?.colour || summary.colour}</b></div>
          <div className="summary-row"><span>DNA Breathe</span><b>{creatureDNA?.breathe || summary.breathe}</b></div>
          <div className="summary-row"><span>Playback</span><b>Unique</b></div>
        </div>

        <div className="summary-card">
          <h2>Song So Far</h2>
          <div className="summary-row"><span>Feel</span><b>{summary.feel}</b></div>
          <div className="summary-row"><span>Colour</span><b>{summary.colour}</b></div>
          <div className="summary-row"><span>Breathe</span><b>{summary.breathe}</b></div>
          <div className="summary-row"><span>Behaviour</span><b>{summary.behaviour}</b></div>
          <div className="summary-row"><span>Shape</span><b>{summary.shape}</b></div>
          <div className="summary-row"><span>Personality</span><b>{summary.personality}</b></div>
        </div>

        <div className="shift-card">
          <Footprints size={18}/>
          {shift ? <div><b>Aura shift detected</b><span>{fmtTime(shift.at)} · {shift.from} → {shift.to}</span></div> : <div><b>Listening for shifts</b><span>Verse, chorus, and instrumental changes should alter the creature.</span></div>}
        </div>
      </section>

      <section ref={stageRef} className="stage">
        <canvas ref={canvasRef}/>
        <div className="overlay"><strong>{creatureDNA?.creature || stats.creature}</strong><span>{stats.feel} · Heart {stats.dominant} · {stats.shape} · {stats.breathe}</span><i>Reveal {pct(reveal)}%</i></div>
        <div className="question"><Cloud size={18}/> Press any key to play/pause. The Aura remembers. The creature is revealed.</div>
      </section>
    </main>

    <footer>
      <div className="timeline">
        {Array.from({length:120}).map((_,i)=>{
          const c = timeline[i];
          const current = audioRef.current?.duration ? Math.floor(((audioRef.current.currentTime||0)/(audioRef.current.duration||1))*120) : -1;
          return <button key={i} className={`bar ${current===i?'active':''}`} onClick={()=>seekToBin(i)} title={c?`${fmtTime(((audioRef.current?.duration||0)/120)*i)} · ${c.feel || ''} · ${c.dominant} · ${c.shape} · ${c.personality}`:'not analysed yet'} style={{background:c?`hsl(${c.h}, ${c.s}%, ${Math.max(10,c.l)}%)`:'rgba(255,255,255,0.055)', height: c? `${14+c.energy*42}px`:'14px'}} />
        })}
      </div>
      <div className="journey">
        {journey.length ? journey.map((j,i)=><div key={`${j.key}-${i}`} className="journey-pill" style={{borderColor:`hsl(${j.h}, ${j.s}%, 48%)`, background:`linear-gradient(135deg, hsla(${j.h}, ${j.s}%, 32%, .45), rgba(255,255,255,.045))`}}><b>{j.dominant}</b><span>{j.feel || j.shape} · {j.shape} · {j.personality}</span></div>) : <p>Play a song and Aura will reveal its creature: heart, wake, breathe, and final form.</p>}
      </div>
    </footer>
  </div>
}

createRoot(document.getElementById('root')).render(<App/>);
