import { useState, useEffect, useRef } from "react";

// ─── API call vers Vercel Serverless Function ──────────────────────────────────
async function fetchArtist(query) {
  const url = `/api/spotify-artist?q=${encodeURIComponent(query.trim())}`;
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || data.hint || `Erreur ${res.status}`);
  return data;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
function getLevel(s) {
  if (s < 25) return { label: "Artiste Émergent",    color: "#6b7280", bg: "rgba(107,114,128,0.12)", tip: "Tu es en début de parcours. Concentre-toi sur des sorties régulières et une promotion ciblée pour faire monter ton score." };
  if (s < 50) return { label: "En Progression",      color: "#3b82f6", bg: "rgba(59,130,246,0.12)",  tip: "Tu gagnes en visibilité algorithmique. Booste tes streams récents pour franchir le cap des 50 !" };
  if (s < 75) return { label: "En Traction 🔥",      color: "#f59e0b", bg: "rgba(245,158,11,0.12)",  tip: "L'algorithme te recommande activement. Maintiens le momentum avec des campagnes régulières !" };
  return       { label: "Artiste Populaire ⭐",       color: "#1DB954", bg: "rgba(29,185,84,0.12)",   tip: "Tu es dans le top tier Spotify ! Excellent positionnement algorithmique." };
}

function fmt(n) {
  if (n >= 1e9) return (n/1e9).toFixed(1)+"Md";
  if (n >= 1e6) return (n/1e6).toFixed(1)+"M";
  if (n >= 1e3) return (n/1e3).toFixed(1)+"K";
  return n.toString();
}

// ─── Gauge ─────────────────────────────────────────────────────────────────────
function Gauge({ score }) {
  const [d, setD] = useState(0);
  useEffect(() => {
    setD(0); let v = 0; const step = score / 55;
    const t = setInterval(() => { v += step; if (v >= score) { setD(score); clearInterval(t); } else setD(Math.floor(v)); }, 16);
    return () => clearInterval(t);
  }, [score]);
  const R = 76, sw = 9, C = 2*Math.PI*R, prog = (d/100)*C;
  const arc = score<25?"#6b7280":score<50?"#3b82f6":score<75?"#f59e0b":"#1DB954";
  const lv = getLevel(score);
  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:10}}>
      <div style={{position:"relative",width:172,height:172}}>
        <svg width={172} height={172} style={{transform:"rotate(-90deg)"}}>
          <defs>
            <linearGradient id="ag" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={arc} stopOpacity="0.22"/><stop offset="100%" stopColor={arc}/>
            </linearGradient>
            <filter id="gl"><feGaussianBlur stdDeviation="3.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
          </defs>
          <circle cx={86} cy={86} r={R} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={sw}/>
          <circle cx={86} cy={86} r={R} fill="none" stroke="url(#ag)" strokeWidth={sw} strokeDasharray={C} strokeDashoffset={C-prog} strokeLinecap="round" filter="url(#gl)" style={{transition:"stroke-dashoffset 0.05s linear"}}/>
        </svg>
        <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
          <span style={{fontSize:46,fontWeight:900,color:arc,lineHeight:1,fontFamily:"'Bebas Neue','Impact',sans-serif",letterSpacing:-2}}>{d}</span>
          <span style={{fontSize:10,color:"rgba(255,255,255,0.28)",fontFamily:"monospace",letterSpacing:2}}>/100</span>
        </div>
      </div>
      <div style={{display:"flex",gap:6,alignItems:"flex-end"}}>
        {[0,25,50,75,100].map(v=>(
          <div key={v} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
            <div style={{width:3,height:d>=v?10:5,borderRadius:2,background:d>=v?arc:"rgba(255,255,255,0.07)",transition:"all 0.1s"}}/>
            <span style={{fontSize:8,color:"rgba(255,255,255,0.22)",fontFamily:"monospace"}}>{v}</span>
          </div>
        ))}
      </div>
      <div style={{padding:"5px 16px",borderRadius:20,background:lv.bg,border:`1px solid ${lv.color}38`,fontSize:11,fontWeight:700,color:lv.color,letterSpacing:0.3}}>{lv.label}</div>
    </div>
  );
}

// ─── Track ─────────────────────────────────────────────────────────────────────
function Track({ track, index, delay }) {
  const [vis,setVis]=useState(false);
  useEffect(()=>{const t=setTimeout(()=>setVis(true),delay);return()=>clearTimeout(t);},[delay]);
  const col=track.popularity>=60?"#1DB954":track.popularity>=40?"#f59e0b":"#6b7280";
  const [playing,setPlaying]=useState(false);
  const audioRef=useRef(null);
  const togglePlay=()=>{
    if(!track.previewUrl)return;
    if(playing){ audioRef.current?.pause(); setPlaying(false); }
    else {
      if(!audioRef.current) audioRef.current=new Audio(track.previewUrl);
      audioRef.current.play(); setPlaying(true);
      audioRef.current.onended=()=>setPlaying(false);
    }
  };
  return (
    <div style={{display:"flex",alignItems:"center",gap:11,padding:"9px 13px",borderRadius:10,background:"rgba(255,255,255,0.022)",border:"1px solid rgba(255,255,255,0.05)",opacity:vis?1:0,transform:vis?"translateX(0)":"translateX(-18px)",transition:"all 0.38s ease"}}>
      {track.albumImage
        ? <img src={track.albumImage} alt="" style={{width:34,height:34,borderRadius:6,objectFit:"cover",flexShrink:0}}/>
        : <div style={{width:34,height:34,borderRadius:6,background:"rgba(255,255,255,0.06)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,flexShrink:0}}>🎵</div>
      }
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:12,fontWeight:600,color:"rgba(255,255,255,0.82)",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{track.name}</div>
        <div style={{marginTop:4,height:3,borderRadius:2,background:"rgba(255,255,255,0.05)",overflow:"hidden"}}>
          <div style={{width:`${track.popularity}%`,height:"100%",background:col,borderRadius:2,transition:"width 0.9s ease"}}/>
        </div>
      </div>
      <div style={{textAlign:"right",minWidth:52}}>
        <div style={{fontSize:13,fontWeight:800,color:col,fontFamily:"monospace"}}>{track.popularity}</div>
        <div style={{fontSize:9,color:"rgba(255,255,255,0.2)",fontFamily:"monospace"}}>{fmt(track.streams)}</div>
      </div>
      {track.previewUrl && (
        <button onClick={togglePlay} style={{background:playing?"rgba(29,185,84,0.3)":"rgba(29,185,84,0.12)",border:"1px solid rgba(29,185,84,0.3)",color:"#1DB954",width:26,height:26,borderRadius:"50%",cursor:"pointer",fontSize:10,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
          {playing?"■":"▶"}
        </button>
      )}
    </div>
  );
}

// ─── Offer Card ────────────────────────────────────────────────────────────────
function Card({ o }) {
  const [h,setH]=useState(false);
  return (
    <div onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}
      style={{position:"relative",padding:"17px 13px",borderRadius:13,background:o.hot?"linear-gradient(135deg,rgba(29,185,84,0.14),rgba(29,185,84,0.04))":"rgba(255,255,255,0.03)",border:`1px solid ${o.hot?"rgba(29,185,84,0.38)":"rgba(255,255,255,0.07)"}`,transform:h?"translateY(-4px)":"translateY(0)",boxShadow:h?"0 18px 35px rgba(0,0,0,0.45)":"none",transition:"all 0.25s",flex:1,minWidth:0,cursor:"pointer"}}>
      {o.hot&&<div style={{position:"absolute",top:-9,left:"50%",transform:"translateX(-50%)",background:"#1DB954",color:"#000",fontSize:7,fontWeight:900,padding:"3px 9px",borderRadius:9,letterSpacing:1.2,whiteSpace:"nowrap"}}>🔥 TENDANCE</div>}
      <div style={{fontSize:8,color:"rgba(255,255,255,0.32)",letterSpacing:1.8,marginBottom:3,fontFamily:"monospace",textTransform:"uppercase"}}>{o.label}</div>
      <div style={{fontSize:19,fontWeight:900,color:o.hot?"#1DB954":"rgba(255,255,255,0.88)",fontFamily:"'Bebas Neue','Impact',sans-serif",letterSpacing:1}}>{o.vol}</div>
      <div style={{fontSize:9,color:"rgba(255,255,255,0.22)",marginBottom:10}}>streams réels</div>
      <div style={{display:"flex",alignItems:"baseline",gap:5,marginBottom:12}}>
        <span style={{fontSize:22,fontWeight:900,color:o.hot?"#1DB954":"rgba(255,255,255,0.85)",fontFamily:"'Bebas Neue','Impact',sans-serif"}}>{o.price}</span>
        <span style={{fontSize:10,color:"rgba(255,255,255,0.2)",textDecoration:"line-through"}}>{o.old}</span>
      </div>
      <div style={{padding:"8px 0",borderRadius:8,textAlign:"center",background:o.hot?"#1DB954":"rgba(255,255,255,0.06)",color:o.hot?"#000":"rgba(255,255,255,0.55)",fontSize:10,fontWeight:700,letterSpacing:0.3}}>Booster →</div>
    </div>
  );
}

// ─── Loader ────────────────────────────────────────────────────────────────────
function Loader({ q }) {
  const steps=["Connexion API Spotify...",`Recherche de « ${q} »...`,"Récupération du score...","Analyse des top titres...","Calcul du positionnement..."];
  const [s,setS]=useState(0);
  useEffect(()=>{const t=setInterval(()=>setS(v=>Math.min(v+1,steps.length-1)),420);return()=>clearInterval(t);},[]);
  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:22,padding:"44px 20px"}}>
      <div style={{position:"relative",width:56,height:56}}>
        <div style={{position:"absolute",inset:0,borderRadius:"50%",border:"2px solid rgba(29,185,84,0.08)",borderTopColor:"#1DB954",animation:"spin 0.75s linear infinite"}}/>
        <div style={{position:"absolute",inset:8,borderRadius:"50%",border:"2px solid rgba(29,185,84,0.04)",borderBottomColor:"rgba(29,185,84,0.32)",animation:"spin 1.1s linear infinite reverse"}}/>
        <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>♪</div>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:7,width:"100%",maxWidth:256}}>
        {steps.map((st,i)=>(
          <div key={i} style={{display:"flex",alignItems:"center",gap:9,opacity:i<=s?1:0.15,transition:"opacity 0.3s"}}>
            <div style={{width:15,height:15,borderRadius:"50%",flexShrink:0,background:i<s?"#1DB954":i===s?"rgba(29,185,84,0.4)":"rgba(255,255,255,0.07)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,color:"#000",fontWeight:900,transition:"all 0.3s"}}>{i<s?"✓":""}</div>
            <span style={{fontSize:11,color:i<=s?"rgba(255,255,255,0.62)":"rgba(255,255,255,0.15)",fontFamily:"monospace"}}>{st}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const OFFERS=[
  {label:"DÉCOUVERTE",vol:"5 000", price:"49€",old:"69€", hot:false},
  {label:"PRO",        vol:"10 000",price:"69€",old:"89€", hot:true},
  {label:"SPÉCIALE",  vol:"50 000",price:"189€",old:"289€",hot:false},
  {label:"PREMIUM",   vol:"100 000",price:"349€",old:"429€",hot:false},
];

// ─── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [q,setQ]           = useState("");
  const [phase,setPhase]   = useState("home");
  const [artist,setArtist] = useState(null);
  const [error,setError]   = useState(null);
  const [focused,setFocused]= useState(false);
  const ref = useRef();

  const go = async () => {
    if (!q.trim()) return;
    setPhase("loading"); setError(null);
    try {
      const data = await fetchArtist(q.trim());
      setArtist(data); setPhase("result");
    } catch(err) {
      setError(err.message || "Une erreur est survenue");
      setPhase("error");
    }
  };

  const reset = () => { setPhase("home"); setArtist(null); setError(null); setQ(""); setTimeout(()=>ref.current?.focus(),80); };
  const lv = artist ? getLevel(artist.popularity) : null;

  return (
    <div style={{minHeight:"100vh",background:"#07090f",color:"white",fontFamily:"'DM Sans','Helvetica Neue',sans-serif",position:"relative",overflow:"hidden"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,600;9..40,700;9..40,800;9..40,900&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        @keyframes spin{to{transform:rotate(360deg);}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(18px);}to{opacity:1;transform:translateY(0);}}
        @keyframes pulse{0%,100%{opacity:1;}50%{opacity:0.42;}}
        @keyframes grid{from{transform:translateY(0);}to{transform:translateY(60px);}}
        @keyframes bob{0%,100%{transform:translateY(0);}50%{transform:translateY(-7px);}}
        input::placeholder{color:rgba(255,255,255,0.2);}
        input:focus{outline:none;}
        ::-webkit-scrollbar{width:3px;}
        ::-webkit-scrollbar-thumb{background:rgba(29,185,84,0.28);border-radius:2px;}
      `}</style>

      {/* Ambient */}
      <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:0}}>
        <div style={{position:"absolute",inset:0,backgroundImage:"linear-gradient(rgba(29,185,84,0.032) 1px,transparent 1px),linear-gradient(90deg,rgba(29,185,84,0.032) 1px,transparent 1px)",backgroundSize:"58px 58px",animation:"grid 12s linear infinite"}}/>
        <div style={{position:"absolute",top:"-22%",left:"3%",width:680,height:680,borderRadius:"50%",background:"radial-gradient(circle,rgba(29,185,84,0.05) 0%,transparent 68%)"}}/>
        <div style={{position:"absolute",bottom:"-12%",right:"2%",width:480,height:480,borderRadius:"50%",background:"radial-gradient(circle,rgba(59,130,246,0.038) 0%,transparent 68%)"}}/>
      </div>

      <div style={{position:"relative",zIndex:1,maxWidth:680,margin:"0 auto",padding:"0 18px 70px"}}>

        {/* Nav */}
        <div style={{padding:"20px 0 0",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <div style={{width:27,height:27,borderRadius:7,background:"linear-gradient(135deg,#1DB954,#17a349)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13}}>♪</div>
            <span style={{fontWeight:800,fontSize:11,letterSpacing:3,color:"rgba(255,255,255,0.6)",textTransform:"uppercase"}}>BLVG<span style={{color:"#1DB954"}}>·</span>SCORE</span>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <div style={{width:6,height:6,borderRadius:"50%",background:"#1DB954",animation:"pulse 2s ease infinite"}}/>
            <span style={{fontSize:9,color:"rgba(255,255,255,0.2)",fontFamily:"monospace",letterSpacing:1.5}}>SPOTIFY ANALYTICS</span>
          </div>
        </div>

        {/* Hero */}
        <div style={{textAlign:"center",padding:"42px 0 26px",animation:"fadeUp 0.5s ease"}}>
          <div style={{fontSize:9,letterSpacing:4.5,color:"#1DB954",textTransform:"uppercase",fontFamily:"monospace",marginBottom:10,animation:"pulse 2.2s ease infinite"}}>● GRATUIT · INSTANTANÉ · OFFICIEL</div>
          <h1 style={{fontSize:"clamp(28px,6.5vw,52px)",fontFamily:"'Bebas Neue','Impact',sans-serif",fontWeight:400,lineHeight:1.06,letterSpacing:2.5,marginBottom:10}}>
            SCORE DE POPULARITÉ<br/><span style={{color:"#1DB954"}}>SPOTIFY</span>
          </h1>
          <p style={{fontSize:13,color:"rgba(255,255,255,0.36)",maxWidth:390,margin:"0 auto",lineHeight:1.7}}>
            Découvre ton score 0–100 et analyse ton positionnement dans l'algorithme Spotify pour maximiser ta visibilité organique.
          </p>
        </div>

        {/* Search */}
        {phase!=="result" && (
          <div style={{animation:"fadeUp 0.5s ease 0.1s both"}}>
            <div style={{display:"flex",gap:6,background:"rgba(255,255,255,0.034)",border:`1px solid ${focused?"rgba(29,185,84,0.44)":"rgba(255,255,255,0.088)"}`,borderRadius:12,padding:"5px 5px 5px 14px",transition:"all 0.2s",boxShadow:focused?"0 0 0 3px rgba(29,185,84,0.07)":"none"}}>
              <span style={{display:"flex",alignItems:"center",color:"rgba(255,255,255,0.22)",fontSize:14,flexShrink:0}}>🔍</span>
              <input ref={ref} value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>e.key==="Enter"&&go()} onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)}
                placeholder="Nom d'artiste ou lien Spotify..." style={{flex:1,background:"transparent",border:"none",color:"white",fontSize:13,fontFamily:"'DM Sans',sans-serif",padding:"9px 0"}}/>
              <button onClick={go} style={{background:q.trim()?"#1DB954":"rgba(255,255,255,0.055)",color:q.trim()?"#000":"rgba(255,255,255,0.22)",border:"none",borderRadius:8,padding:"10px 17px",fontSize:11,fontWeight:800,cursor:q.trim()?"pointer":"default",letterSpacing:0.3,transition:"all 0.2s",whiteSpace:"nowrap"}}>Analyser →</button>
            </div>
            <div style={{display:"flex",gap:6,marginTop:9,flexWrap:"wrap",justifyContent:"center"}}>
              {["BLVG 1977","Drake","Aya Nakamura","Burna Boy","Davido"].map(n=>(
                <button key={n} onClick={()=>setQ(n)} style={{background:"rgba(255,255,255,0.028)",border:"1px solid rgba(255,255,255,0.068)",color:"rgba(255,255,255,0.33)",fontSize:9,padding:"4px 11px",borderRadius:20,cursor:"pointer",fontFamily:"monospace",letterSpacing:0.5}}>{n}</button>
              ))}
            </div>
          </div>
        )}

        {phase==="loading" && <Loader q={q}/>}

        {/* Error */}
        {phase==="error" && (
          <div style={{textAlign:"center",padding:"40px 20px",animation:"fadeUp 0.4s ease"}}>
            <div style={{fontSize:32,marginBottom:12}}>😕</div>
            <div style={{fontSize:14,fontWeight:700,color:"rgba(255,255,255,0.7)",marginBottom:6}}>Artiste introuvable</div>
            <div style={{fontSize:12,color:"rgba(255,255,255,0.35)",marginBottom:6,fontFamily:"monospace",background:"rgba(255,0,0,0.06)",border:"1px solid rgba(255,0,0,0.15)",padding:"10px 16px",borderRadius:8}}>{error}</div>
            <div style={{fontSize:11,color:"rgba(255,255,255,0.25)",marginBottom:20}}>Essaie le nom exact ou colle directement le lien Spotify</div>
            <button onClick={reset} style={{background:"#1DB954",color:"#000",border:"none",borderRadius:8,padding:"10px 20px",fontSize:12,fontWeight:800,cursor:"pointer"}}>← Réessayer</button>
          </div>
        )}

        {/* Result */}
        {phase==="result" && artist && (
          <div style={{animation:"fadeUp 0.45s ease"}}>

            {/* Artist card */}
            <div style={{background:"rgba(255,255,255,0.023)",border:"1px solid rgba(255,255,255,0.072)",borderRadius:17,padding:"22px 18px",marginBottom:12}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20,flexWrap:"wrap",gap:10}}>
                <div style={{display:"flex",alignItems:"center",gap:13}}>
                  {artist.image
                    ? <img src={artist.image} alt={artist.name} style={{width:52,height:52,borderRadius:14,objectFit:"cover",border:"1.5px solid rgba(29,185,84,0.25)",flexShrink:0}}/>
                    : <div style={{width:52,height:52,borderRadius:14,background:"linear-gradient(135deg,rgba(29,185,84,0.26),rgba(29,185,84,0.07))",border:"1.5px solid rgba(29,185,84,0.25)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0,animation:"bob 3.2s ease infinite"}}>🎵</div>
                  }
                  <div>
                    <div style={{fontSize:17,fontWeight:800,fontFamily:"'Bebas Neue','Impact',sans-serif",letterSpacing:1}}>{artist.name}</div>
                    <div style={{fontSize:10,color:"rgba(255,255,255,0.28)",fontFamily:"monospace"}}>{fmt(artist.followers)} followers · {artist.genres.slice(0,2).join(", ")||"—"}</div>
                    {artist.externalUrl&&<a href={artist.externalUrl} target="_blank" rel="noreferrer" style={{fontSize:9,color:"#1DB954",textDecoration:"none",fontFamily:"monospace"}}>↗ Voir sur Spotify</a>}
                  </div>
                </div>
                <button onClick={reset} style={{background:"rgba(255,255,255,0.038)",border:"1px solid rgba(255,255,255,0.085)",color:"rgba(255,255,255,0.32)",fontSize:9,padding:"6px 12px",borderRadius:7,cursor:"pointer",fontFamily:"monospace",letterSpacing:0.8}}>← NOUVELLE RECHERCHE</button>
              </div>

              <div style={{display:"flex",gap:20,alignItems:"center",flexWrap:"wrap",justifyContent:"center"}}>
                <Gauge score={artist.popularity}/>
                <div style={{flex:1,minWidth:188}}>
                  <div style={{fontSize:8,color:"rgba(255,255,255,0.26)",fontFamily:"monospace",letterSpacing:2,marginBottom:8,textTransform:"uppercase"}}>Analyse Algorithmique</div>
                  <div style={{padding:"11px 13px",borderRadius:10,background:lv.bg,border:`1px solid ${lv.color}26`,fontSize:11,color:"rgba(255,255,255,0.62)",lineHeight:1.65,marginBottom:10}}>{lv.tip}</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
                    {[
                      {l:"Discover Weekly",ok:artist.popularity>=25,v:artist.popularity>=25?"✓ Éligible":"✗ Trop bas"},
                      {l:"Release Radar",  ok:artist.popularity>=40,v:artist.popularity>=40?"✓ Actif":"✗ Limité"},
                      {l:"Radio Spotify",  ok:artist.popularity>=50,v:artist.popularity>=50?"✓ Fréquent":"✗ Rare"},
                      {l:"Top Playlists",  ok:artist.popularity>=70,v:artist.popularity>=70?"✓ Visible":"✗ Difficile"},
                    ].map(x=>(
                      <div key={x.l} style={{padding:"7px 10px",borderRadius:8,background:x.ok?"rgba(29,185,84,0.07)":"rgba(255,255,255,0.022)",border:`1px solid ${x.ok?"rgba(29,185,84,0.17)":"rgba(255,255,255,0.05)"}`}}>
                        <div style={{fontSize:8,color:"rgba(255,255,255,0.24)",fontFamily:"monospace",marginBottom:2}}>{x.l}</div>
                        <div style={{fontSize:10,fontWeight:700,color:x.ok?"#1DB954":"rgba(255,255,255,0.26)"}}>{x.v}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Top tracks */}
            <div style={{background:"rgba(255,255,255,0.016)",border:"1px solid rgba(255,255,255,0.052)",borderRadius:17,padding:"17px",marginBottom:12}}>
              <div style={{fontSize:8,color:"rgba(255,255,255,0.28)",fontFamily:"monospace",letterSpacing:2.5,marginBottom:12,textTransform:"uppercase"}}>▸ Top Titres par Popularité</div>
              <div style={{display:"flex",flexDirection:"column",gap:5}}>
                {artist.topTracks.length>0
                  ? artist.topTracks.map((t,i)=><Track key={i} track={t} index={i} delay={i*85+120}/>)
                  : <div style={{fontSize:11,color:"rgba(255,255,255,0.3)",textAlign:"center",padding:"16px 0",fontFamily:"monospace"}}>Aucun top track disponible pour cet artiste</div>
                }
              </div>
            </div>

            {/* Upsell */}
            <div style={{background:"linear-gradient(135deg,rgba(29,185,84,0.055),rgba(0,0,0,0))",border:"1px solid rgba(29,185,84,0.12)",borderRadius:17,padding:"20px 17px"}}>
              <div style={{textAlign:"center",marginBottom:16}}>
                <div style={{fontSize:8,color:"#1DB954",fontFamily:"monospace",letterSpacing:3.5,marginBottom:5,textTransform:"uppercase"}}>⚡ Boost ton score</div>
                <div style={{fontSize:17,fontWeight:800,fontFamily:"'Bebas Neue','Impact',sans-serif",letterSpacing:1.5}}>AUGMENTE TON SCORE AVEC DE VRAIS STREAMS</div>
                <div style={{fontSize:11,color:"rgba(255,255,255,0.28)",marginTop:3}}>Campagnes Spotify Ads · Streams réels ciblés · Résultats en 48h</div>
              </div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                {OFFERS.map((o,i)=><Card key={i} o={o}/>)}
              </div>
              <div style={{display:"flex",justifyContent:"center",gap:20,marginTop:14,flexWrap:"wrap"}}>
                {[["10K+","Artistes"],["48h","Résultats"],["100%","Réels"],["30j","Garantie"]].map(([v,l])=>(
                  <div key={l} style={{textAlign:"center"}}>
                    <div style={{fontSize:16,fontWeight:900,color:"#1DB954",fontFamily:"'Bebas Neue','Impact',sans-serif"}}>{v}</div>
                    <div style={{fontSize:8,color:"rgba(255,255,255,0.22)",fontFamily:"monospace"}}>{l}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Home cards */}
        {phase==="home" && (
          <div style={{marginTop:36,display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(145px,1fr))",gap:10,animation:"fadeUp 0.5s ease 0.18s both"}}>
            {[
              {icon:"📊",t:"Score 0–100",d:"L'indicateur clé de ta visibilité algorithmique Spotify"},
              {icon:"🎯",t:"Top Titres", d:"Popularité individuelle et streams de chaque morceau"},
              {icon:"⚡",t:"Instantané", d:"Résultats en quelques secondes, totalement gratuit"},
              {icon:"🚀",t:"Boost Dispo",d:"Campagnes Spotify Ads pour monter rapidement ton score"},
            ].map((c,i)=>(
              <div key={i} style={{padding:"15px",borderRadius:12,background:"rgba(255,255,255,0.019)",border:"1px solid rgba(255,255,255,0.052)",animation:`fadeUp 0.5s ease ${0.1+i*0.08}s both`}}>
                <div style={{fontSize:20,marginBottom:7}}>{c.icon}</div>
                <div style={{fontSize:11,fontWeight:700,color:"rgba(255,255,255,0.76)",marginBottom:4}}>{c.t}</div>
                <div style={{fontSize:10,color:"rgba(255,255,255,0.27)",lineHeight:1.55}}>{c.d}</div>
              </div>
            ))}
          </div>
        )}

        <div style={{marginTop:42,textAlign:"center",borderTop:"1px solid rgba(255,255,255,0.042)",paddingTop:18}}>
          <div style={{fontSize:9,color:"rgba(255,255,255,0.11)",fontFamily:"monospace",letterSpacing:2}}>BLVG 1977 · SCORE TOOL · © 2026</div>
        </div>
      </div>
    </div>
  );
}
