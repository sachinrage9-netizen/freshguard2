import {useMemo} from 'react';

function clamp(value, min, max){return Math.max(min, Math.min(max, value));}

export default function Storage3D({storage,product}){
  const width=Number(storage?.width)||600;
  const height=Number(storage?.height)||400;
  const depth=Number(storage?.depth)||400;
  const position=useMemo(()=>({
    x:product?.position_x==null?width/2:Number(product.position_x),
    y:product?.position_y==null?height/2:Number(product.position_y),
    z:product?.position_z==null?depth/2:Number(product.position_z),
  }),[product,width,height,depth]);
  const x=clamp((position.x/width)*100,5,95);
  const y=clamp(100-(position.y/height)*100,5,95);
  const z=clamp((position.z/depth)*100,0,100);

  return <section className="storage-3d-section">
    <p className="eyebrow">STORAGE POSITION</p>
    <h2>3D storage view</h2>
    <div className="storage-3d" aria-label={`3D position of ${product?.name||'product'} in ${storage?.name||'storage'}`}>
      <div className="storage-3d-box" style={{'--depth':`${30+z*0.18}%`}}>
        <span className="storage-3d-face storage-3d-front" />
        <span className="storage-3d-face storage-3d-top" />
        <span className="storage-3d-face storage-3d-side" />
        <span className="storage-3d-product" style={{left:`${x}%`,top:`${y}%`,transform:`translateZ(${z*0.45}px)`}} title={product?.name||'Product'} />
      </div>
    </div>
    <div className="storage-3d-meta">
      <span><strong>Storage:</strong> {storage?.name||'—'}</span>
      <span><strong>Dimensions:</strong> {storage?.width??'—'} × {storage?.height??'—'} × {storage?.depth??'—'}</span>
      <span><strong>Position:</strong> {product?.position_x??'—'}, {product?.position_y??'—'}, {product?.position_z??'—'}</span>
      {(product?.shelf||product?.slot||product?.row||product?.column)&&<span><strong>Slot:</strong> {[product.shelf&&`Shelf ${product.shelf}`,product.slot&&`Slot ${product.slot}`,product.row&&`Row ${product.row}`,product.column&&`Column ${product.column}`].filter(Boolean).join(' · ')}</span>}
    </div>
  </section>;
}
