// Voice features exactly as Kintsugi's DAM expects (port of featex.py + Whisper log-mel).
// Input: mono Float32Array at 16 kHz. Output: {data: Float32Array(chunks*80*3000), chunks}.
const VMT_SR = 16000, CHUNK = 480000, NFFT = 400, HOP = 160, NB = 201, NMEL = 80, NFR = 3000;
function b64f32(b64){ const s = (typeof atob === 'function') ? atob(b64) : Buffer.from(b64,'base64').toString('binary');
  const u = new Uint8Array(s.length); for (let i=0;i<s.length;i++) u[i]=s.charCodeAt(i); return new Float32Array(u.buffer); }
let _tabs = null;
function featTables(){
  if (_tabs) return _tabs;
  const mel = b64f32(MEL_B64);            // row-major [201][80]
  const le = b64f32(LOGMEL_ENERGIES_B64); // [80]
  const win = new Float32Array(NFFT); for (let n=0;n<NFFT;n++) win[n]=0.5-0.5*Math.cos(2*Math.PI*n/NFFT);
  const cos = new Float32Array(NB*NFFT), sin = new Float32Array(NB*NFFT);
  for (let k=0;k<NB;k++) for (let n=0;n<NFFT;n++){ const a=2*Math.PI*k*n/NFFT; cos[k*NFFT+n]=Math.cos(a); sin[k*NFFT+n]=Math.sin(a); }
  // compact mel filter rows (most weights are zero)
  const melT = []; for (let m=0;m<NMEL;m++){ const idx=[], w=[]; for (let k=0;k<NB;k++){ const v=mel[k*NMEL+m]; if (v!==0){ idx.push(k); w.push(v);} } melT.push({idx, w:Float32Array.from(w)}); }
  return (_tabs = {le, win, cos, sin, melT});
}
function chunkFeatures(x, out, off, T){ // x: Float32Array(480000) normalized chunk; writes 80x3000 at out[off]
  const {win, cos, sin, melT, le} = T;
  // zero-mean unit-variance over the chunk
  let mean=0; for (let i=0;i<CHUNK;i++) mean+=x[i]; mean/=CHUNK;
  let v=0; for (let i=0;i<CHUNK;i++){ const d=x[i]-mean; v+=d*d; } v/=CHUNK;
  const sc = 1/Math.sqrt(v+1e-7);
  const P = 200, padded = new Float32Array(CHUNK+2*P);
  for (let i=0;i<CHUNK;i++) padded[P+i]=(x[i]-mean)*sc;
  for (let i=1;i<=P;i++){ padded[P-i]=padded[P+i]; padded[P+CHUNK-1+i]=padded[P+CHUNK-1-i]; } // reflect
  const fr = new Float32Array(NFFT), pw = new Float64Array(NB);
  let mx = -Infinity;
  for (let t=0;t<NFR;t++){
    const s=t*HOP; for (let n=0;n<NFFT;n++) fr[n]=padded[s+n]*win[n];
    for (let k=0;k<NB;k++){ let re=0, im=0; const b=k*NFFT; for (let n=0;n<NFFT;n++){ re+=fr[n]*cos[b+n]; im+=fr[n]*sin[b+n]; } pw[k]=re*re+im*im; }
    for (let m=0;m<NMEL;m++){ const {idx,w}=melT[m]; let e=0; for (let j=0;j<idx.length;j++) e+=w[j]*pw[idx[j]];
      const lv=Math.log10(Math.max(e,1e-10)); out[off+m*NFR+t]=lv; if (lv>mx) mx=lv; }
  }
  for (let m=0;m<NMEL;m++){ let sum=0; const b=off+m*NFR;
    for (let t=0;t<NFR;t++){ let lv=out[b+t]; if (lv<mx-8) lv=mx-8; lv=(lv+4)/4; out[b+t]=lv; sum+=lv; }
    const shift = le[m]-sum/NFR; for (let t=0;t<NFR;t++) out[b+t]+=shift; }
}
function computeFeatures(audio16k, onChunk){
  const T = featTables();
  let mean=0; for (let i=0;i<audio16k.length;i++) mean+=audio16k[i]; mean/=audio16k.length;
  let pk=0; for (let i=0;i<audio16k.length;i++){ const a=Math.abs(audio16k[i]-mean); if (a>pk) pk=a; }
  const chunks = Math.max(1, Math.ceil(audio16k.length/CHUNK));
  const a = new Float32Array(chunks*CHUNK); for (let i=0;i<audio16k.length;i++) a[i]=(audio16k[i]-mean)/(pk||1);
  const data = new Float32Array(chunks*NMEL*NFR);
  for (let c=0;c<chunks;c++){ chunkFeatures(a.subarray(c*CHUNK,(c+1)*CHUNK), data, c*NMEL*NFR, T); if (onChunk) onChunk(c+1, chunks); }
  return {data, chunks};
}
if (typeof module !== 'undefined') module.exports = {computeFeatures, setTables(m){ global.MEL_B64=m.MEL_B64; global.LOGMEL_ENERGIES_B64=m.LOGMEL_ENERGIES_B64; }};
