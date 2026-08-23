import {useMemo} from 'react';

function clamp(value,min,max){return Math.max(min,Math.min(max,value));}

export default function Storage3D({storage,product,products=[]}){
  const width=Number(storage?.width)||600;
  const height=Number(storage?.height)||400;
  const depth=Number(storage?.depth)||400;
  const items=products.length?products:(product?[product]:[]);

  const positions=useMemo(()=>items.map((item,index)=>({
    item,
    x:item?.position_x==null?width*(0.18+(index%4)*0.21):Number(item.position_x),
    y:item?.position_y==null?height*(0.18+(Math.floor(index/4)%3)*0.30):Number(item.position_y),
    z:item?.position_z==null?depth*(0.15+(index%5)*0.16):Number(item.position_z)
  })),[items,width,height,depth]);

  const face={position:'absolute',display:'block',border:'1px solid #a8cbb7',backfaceVisibility:'hidden'};

  return <section style={{background:'#fff',border:'1px solid #e1e9e4',padding:24,borderRadius:15}}>
    <p className="eyebrow">3D STORAGE MAP</p>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',gap:12,flexWrap:'wrap'}}>
      <div><h2 style={{fontSize:21,marginBottom:4}}>{storage?.name||'Storage'} — 3D view</h2><p style={{margin:0,color:'#718078',fontSize:13}}>Interactive isometric view of the storage volume and mapped products.</p></div>
      <span style={{fontSize:12,fontWeight:700,color:'#217a58',background:'#eaf5ee',padding:'7px 10px',borderRadius:999}}>{items.length} product{items.length===1?'':'s'} mapped</span>
    </div>

    <div style={{height:390,marginTop:18,display:'grid',placeItems:'center',perspective:1100,overflow:'hidden',background:'linear-gradient(135deg,#f8fbf9,#edf5f0)',borderRadius:14,border:'1px solid #e2ebe5',position:'relative'}}>
      <div style={{position:'absolute',left:18,top:16,fontSize:11,color:'#789086',fontWeight:700,letterSpacing:'.08em'}}>WIDTH × HEIGHT × DEPTH</div>
      <div style={{position:'relative',width:'min(72%,460px)',height:240,transformStyle:'preserve-3d',transform:'rotateX(58deg) rotateZ(-32deg)',background:'#edf8f1',border:'2px solid #6ea98a',boxShadow:'28px 28px 0 #d9e9df, 0 0 0 10px #ffffff55',borderRadius:4}}>
        <span style={{...face,inset:0,background:'linear-gradient(145deg,#f5fbf7cc,#dff0e6cc)',transform:'translateZ(22px)'}} />
        <span style={{...face,width:'100%',height:22,left:0,top:0,transform:'rotateX(90deg)',transformOrigin:'top',background:'#d2e8dc'}} />
        <span style={{...face,width:22,height:'100%',right:0,top:0,transform:'rotateY(90deg)',transformOrigin:'right',background:'#c9e1d4'}} />
        {[25,50,75].map(v=><span key={`shelf-${v}`} style={{position:'absolute',left:'4%',right:'4%',top:`${v}%`,height:3,background:'#7eaf95',transform:'translateZ(25px)',boxShadow:'0 2px 0 #bdd8c8'}} />)}
        {positions.map(({item,x:rawX,y:rawY,z:rawZ},index)=>{
          const x=clamp(rawX/width*100,7,93);
          const y=clamp(100-rawY/height*100,7,93);
          const z=clamp(rawZ/depth*100,0,100);
          return <span key={item?.id||item?.productCode||index} title={item?.name||`Product ${index+1}`} style={{position:'absolute',left:`${x}%`,top:`${y}%`,width:24,height:24,borderRadius:6,background:'#217a58',border:'3px solid #fff',boxShadow:'0 3px 9px #173d3055',transform:`translate(-50%,-50%) translateZ(${28+z*0.55}px)`,zIndex:10}} />;
        })}
      </div>
      <div style={{position:'absolute',bottom:15,left:18,right:18,display:'flex',justifyContent:'space-between',fontSize:12,color:'#718078'}}>
        <span><strong>Type:</strong> {storage?.type||'Storage'}</span>
        <span><strong>Dimensions:</strong> {storage?.width??'—'} × {storage?.height??'—'} × {storage?.depth??'—'}</span>
      </div>
    </div>

    <div style={{display:'flex',gap:10,flexWrap:'wrap',marginTop:14,fontSize:12,color:'#6f8178'}}>
      <span style={{padding:'6px 9px',background:'#f3f7f4',borderRadius:8}}>● Green markers = products</span>
      <span style={{padding:'6px 9px',background:'#f3f7f4',borderRadius:8}}>▰ Shelves shown at 25%, 50%, 75%</span>
      {items.length===0&&<span style={{padding:'6px 9px',background:'#fff7e8',borderRadius:8}}>No products mapped yet — storage volume is still shown.</span>}
    </div>
  </section>;
}
