import {useEffect,useMemo,useState} from 'react';

function clamp(value,min,max){return Math.max(min,Math.min(max,value));}

export default function Storage3D({storage,product,products=[]}){
  const width=Number(storage?.width)||600;
  const height=Number(storage?.height)||400;
  const depth=Number(storage?.depth)||400;
  const items=products.length?products:(product?[product]:[]);
  const type=String(storage?.type||'Storage').toLowerCase();
  const isFreezer=type.includes('freezer');
  const isFridge=type.includes('refrigerator')||type.includes('chiller');
  const [doorOpen,setDoorOpen]=useState(false);
  const [pulse,setPulse]=useState(false);

  useEffect(()=>{
    if(!doorOpen)return;
    const timer=setTimeout(()=>setDoorOpen(false),3500);
    return()=>clearTimeout(timer);
  },[doorOpen]);

  const positions=useMemo(()=>items.map((item,index)=>({
    item,
    x:item?.position_x==null?width*(0.18+(index%4)*0.21):Number(item.position_x),
    y:item?.position_y==null?height*(0.18+(Math.floor(index/4)%3)*0.30):Number(item.position_y),
    z:item?.position_z==null?depth*(0.15+(index%5)*0.16):Number(item.position_z)
  })),[items,width,height,depth]);

  const applianceLabel=isFridge?'Refrigerator':isFreezer?'Freezer':type.includes('shelf')?'Shelf':storage?.type||'Storage';
  const accent=isFreezer?'#4f7ca3':isFridge?'#217a58':'#9a6a3a';
  const target=isFreezer?'−18°C target':isFridge?'2–5°C target':'Ambient storage';
  const triggerDemo=()=>{setPulse(true);setDoorOpen(true);setTimeout(()=>setPulse(false),1800)};

  return <section style={{background:'#fff',border:'1px solid #e1e9e4',padding:24,borderRadius:15}}>
    <p className="eyebrow">3D STORAGE MAP</p>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:12,flexWrap:'wrap'}}>
      <div><h2 style={{fontSize:21,marginBottom:4}}>{storage?.name||'Storage'} — {applianceLabel}</h2><p style={{margin:0,color:'#718078',fontSize:13}}>{target} · click the appliance or button to open the door</p></div>
      <button type="button" className="primary" onClick={triggerDemo}>Open door animation</button>
    </div>

    <div style={{height:390,marginTop:18,display:'grid',placeItems:'center',perspective:1100,overflow:'hidden',background:'linear-gradient(135deg,#f8fbf9,#edf5f0)',borderRadius:14,border:'1px solid #e2ebe5',position:'relative'}}>
      <div style={{position:'relative',width:'min(72%,460px)',height:270,transformStyle:'preserve-3d',transform:'rotateX(8deg) rotateY(-28deg)',cursor:'pointer'}} onClick={triggerDemo} role="button" tabIndex={0} onKeyDown={e=>{if(e.key==='Enter')triggerDemo()}}>
        <div style={{position:'absolute',inset:0,borderRadius:14,background:isFreezer?'linear-gradient(145deg,#dbe9f3,#9fb9cb)':isFridge?'linear-gradient(145deg,#edf7f1,#a7c8b6)':'linear-gradient(145deg,#eadcca,#b89970)',boxShadow:'20px 24px 0 rgba(37,65,52,.14)',border:'2px solid rgba(40,70,55,.25)',transformStyle:'preserve-3d'}}>
          <div style={{position:'absolute',left:18,right:18,top:18,bottom:18,borderRadius:10,border:'1px solid rgba(40,70,55,.25)',background:'rgba(255,255,255,.25)',overflow:'hidden'}}>
            {[0,1,2].map(level=><div key={level} style={{position:'absolute',left:8,right:8,top:`${18+level*29}%`,height:4,background:'rgba(60,85,70,.38)',boxShadow:'0 2px 0 rgba(255,255,255,.5)'}}/>)}
            {positions.map(({item,x:rawX,y:rawY,z:rawZ},index)=>{const x=clamp(rawX/width*100,7,93);const y=clamp(100-rawY/height*100,9,91);const z=clamp(rawZ/depth*100,0,100);return <span key={item?.id||item?.productCode||index} title={item?.name||`Product ${index+1}`} style={{position:'absolute',left:`${x}%`,top:`${y}%`,width:42,height:28,borderRadius:5,background:'#f7d58a',border:'2px solid #fff',boxShadow:'0 3px 8px #173d3050',transform:`translate(-50%,-50%) translateZ(${18+z*.35}px)`,zIndex:5,display:'grid',placeItems:'center',fontSize:8,fontWeight:800,color:'#684b19',overflow:'hidden'}}>{String(item?.name||'ITEM').slice(0,9)}</span>})}
          </div>
          <div style={{position:'absolute',right:-8,top:78,width:6,height:95,borderRadius:6,background:'#51665b'}}/>
        </div>
        <div style={{position:'absolute',left:0,top:0,width:'100%',height:'100%',borderRadius:14,background:isFreezer?'#c9ddea':isFridge?'#dceee4':'#ddc5a5',border:'2px solid rgba(40,70,55,.3)',transformOrigin:'left center',transform:`translateZ(18px) rotateY(${doorOpen?-78:0}deg)`,transition:'transform .8s cubic-bezier(.2,.8,.2,1)',backfaceVisibility:'hidden',boxShadow:doorOpen?'none':'8px 8px 14px rgba(30,50,40,.18)',zIndex:8}}>
          <div style={{position:'absolute',left:14,right:14,top:14,bottom:14,borderRadius:10,border:'2px solid rgba(40,70,55,.18)',background:'rgba(255,255,255,.18)'}}/>
          <div style={{position:'absolute',right:18,top:'45%',width:7,height:58,borderRadius:6,background:'#51665b'}}/>
          <div style={{position:'absolute',left:18,top:18,fontSize:10,fontWeight:800,letterSpacing:1,color:accent}}>{applianceLabel.toUpperCase()}</div>
        </div>
        {pulse&&<div style={{position:'absolute',inset:-12,border:`3px solid ${accent}`,borderRadius:18,animation:'storagePulse 1.8s ease-out',pointerEvents:'none'}}/>}
      </div>
      <div style={{position:'absolute',bottom:15,left:18,right:18,display:'flex',justifyContent:'space-between',fontSize:12,color:'#718078'}}><span><strong>Type:</strong> {storage?.type||'Storage'}</span><span><strong>Dimensions:</strong> {storage?.width??'—'} × {storage?.height??'—'} × {storage?.depth??'—'}</span></div>
    </div>

    <div style={{display:'flex',gap:10,flexWrap:'wrap',marginTop:14,fontSize:12,color:'#6f8178'}}>
      <span style={{padding:'6px 9px',background:'#f3f7f4',borderRadius:8}}>Product labels appear inside the appliance</span>
      <span style={{padding:'6px 9px',background:'#f3f7f4',borderRadius:8}}>Door opens with animation</span>
      {items.length===0&&<span style={{padding:'6px 9px',background:'#fff7e8',borderRadius:8}}>No products mapped yet — appliance is still shown.</span>}
    </div>
    <style>{`@keyframes storagePulse{0%{opacity:.9;transform:scale(.98)}100%{opacity:0;transform:scale(1.04)}}`}</style>
  </section>;
}
