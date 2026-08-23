import {useMemo} from 'react';

function clamp(value,min,max){return Math.max(min,Math.min(max,value));}

export default function Storage3D({storage,product}){
  const width=Number(storage?.width)||600;
  const height=Number(storage?.height)||400;
  const depth=Number(storage?.depth)||400;
  const position=useMemo(()=>({
    x:product?.position_x==null?width/2:Number(product.position_x),
    y:product?.position_y==null?height/2:Number(product.position_y),
    z:product?.position_z==null?depth/2:Number(product.position_z),
  }),[product,width,height,depth]);
  const x=clamp(position.x/width*100,5,95);
  const y=clamp(100-position.y/height*100,5,95);
  const z=clamp(position.z/depth*100,0,100);
  const face={position:'absolute',display:'block',border:'1px solid #b9d6c5',background:'#eaf5eecc',backfaceVisibility:'hidden'};

  return <section style={{background:'#fff',border:'1px solid #e6ece7',padding:24,borderRadius:15}}>
    <p className="eyebrow">STORAGE POSITION</p>
    <h2 style={{fontSize:21}}>3D storage view</h2>
    <div style={{height:260,marginTop:18,display:'grid',placeItems:'center',perspective:900,overflow:'hidden',background:'#f6f9f6',borderRadius:12}} aria-label={`3D position of ${product?.name||'product'} in ${storage?.name||'storage'}`}>
      <div style={{position:'relative',width:'min(72%,420px)',height:170,transformStyle:'preserve-3d',transform:'rotateX(58deg) rotateZ(-32deg)',border:'1px solid #8eb9a0',background:'#eef8f1',boxShadow:'18px 18px 0 #dcebe2'}}>
        <span style={{...face,inset:0,transform:'translateZ(18px)'}} />
        <span style={{...face,width:'100%',height:18,left:0,top:0,transform:'rotateX(90deg)',transformOrigin:'top',background:'#dceee3'}} />
        <span style={{...face,width:18,height:'100%',right:0,top:0,transform:'rotateY(90deg)',transformOrigin:'right',background:'#d8e9df'}} />
        <span title={product?.name||'Product'} style={{position:'absolute',left:`${x}%`,top:`${y}%`,width:18,height:18,borderRadius:'50%',background:'#217a58',border:'3px solid #fff',boxShadow:'0 2px 7px #173d3055',transform:`translate(-50%,-50%) translateZ(${18+z*0.5}px)`,zIndex:5}} />
      </div>
    </div>
    <div style={{display:'flex',gap:12,flexWrap:'wrap',marginTop:14,fontSize:12,color:'#6f8178'}}>
      <span><strong>Storage:</strong> {storage?.name||'—'}</span>
      <span><strong>Dimensions:</strong> {storage?.width??'—'} × {storage?.height??'—'} × {storage?.depth??'—'}</span>
      <span><strong>Position:</strong> {product?.position_x??'—'}, {product?.position_y??'—'}, {product?.position_z??'—'}</span>
      {(product?.shelf||product?.slot||product?.row||product?.column)&&<span><strong>Slot:</strong> {[product.shelf&&`Shelf ${product.shelf}`,product.slot&&`Slot ${product.slot}`,product.row&&`Row ${product.row}`,product.column&&`Column ${product.column}`].filter(Boolean).join(' · ')}</span>}
    </div>
  </section>;
}
