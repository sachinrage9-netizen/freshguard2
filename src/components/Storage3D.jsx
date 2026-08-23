import {useMemo} from 'react';

function clamp(value,min,max){return Math.max(min,Math.min(max,value));}

export default function Storage3D({storage,product,products=[]}){
  const width=Number(storage?.width)||600;
  const height=Number(storage?.height)||400;
  const depth=Number(storage?.depth)||400;
  const items=products.length?products:(product?[product]:[]);
  const positions=useMemo(()=>items.map((item,index)=>({item,x:item?.position_x==null?width*(0.2+(index%4)*0.2):Number(item.position_x),y:item?.position_y==null?height*(0.25+(Math.floor(index/4)%3)*0.25):Number(item.position_y),z:item?.position_z==null?depth*(0.2+(index%5)*0.15):Number(item.position_z)})),[items,width,height,depth]);
  const face={position:'absolute',display:'block',border:'1px solid #b9d6c5',background:'#eaf5eecc',backfaceVisibility:'hidden'};

  return <section style={{background:'#fff',border:'1px solid #e6ece7',padding:24,borderRadius:15}}>
    <p className="eyebrow">3D STORAGE MAP</p><h2 style={{fontSize:21}}>{storage?.name||'Storage'} — 3D view</h2>
    <div style={{height:300,marginTop:18,display:'grid',placeItems:'center',perspective:900,overflow:'hidden',background:'#f6f9f6',borderRadius:12}} aria-label={`3D storage view of ${storage?.name||'storage'}`}>
      <div style={{position:'relative',width:'min(72%,420px)',height:190,transformStyle:'preserve-3d',transform:'rotateX(58deg) rotateZ(-32deg)',border:'1px solid #8eb9a0',background:'#eef8f1',boxShadow:'18px 18px 0 #dcebe2'}}>
        <span style={{...face,inset:0,transform:'translateZ(18px)'}} /><span style={{...face,width:'100%',height:18,left:0,top:0,transform:'rotateX(90deg)',transformOrigin:'top',background:'#dceee3'}} /><span style={{...face,width:18,height:'100%',right:0,top:0,transform:'rotateY(90deg)',transformOrigin:'right',background:'#d8e9df'}} />
        {positions.map(({item,x:rawX,y:rawY,z:rawZ},index)=>{const x=clamp(rawX/width*100,5,95);const y=clamp(100-rawY/height*100,5,95);const z=clamp(rawZ/depth*100,0,100);return <span key={item?.id||item?.productCode||index} title={item?.name||`Product ${index+1}`} style={{position:'absolute',left:`${x}%`,top:`${y}%`,width:18,height:18,borderRadius:'50%',background:'#217a58',border:'3px solid #fff',boxShadow:'0 2px 7px #173d3055',transform:`translate(-50%,-50%) translateZ(${18+z*0.5}px)`,zIndex:5}} />;})}
      </div>
    </div>
    <div style={{display:'flex',gap:12,flexWrap:'wrap',marginTop:14,fontSize:12,color:'#6f8178'}}><span><strong>Storage:</strong> {storage?.name||'—'}</span><span><strong>Type:</strong> {storage?.type||'—'}</span><span><strong>Dimensions:</strong> {storage?.width??'—'} × {storage?.height??'—'} × {storage?.depth??'—'}</span><span><strong>Products mapped:</strong> {items.length}</span></div>
  </section>;
}
