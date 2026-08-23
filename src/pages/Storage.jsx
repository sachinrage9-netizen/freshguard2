import {useState} from 'react';
import {Plus,Pencil,Trash2,Box, Thermometer, Ruler, Wifi} from 'lucide-react';
import {createStorage,updateStorage,deleteStorage} from '../api/client';

export default function Storage({locations,setLocations,products}){
  const [adding,setAdding]=useState(false);
  const [message,setMessage]=useState('');
  const [busy,setBusy]=useState(false);

  const productCount=id=>products.filter(p=>String(p.locationId||p.storageLocationId)===String(id)).length;

  const submit=async e=>{
    e.preventDefault();
    const fd=new FormData(e.target);
    const payload={
      name:String(fd.get('name')||'').trim(),
      type:fd.get('type'),
      sensor_enabled:fd.get('sensor_enabled')==='on',
      width:fd.get('width')||null,
      height:fd.get('height')||null,
      depth:fd.get('depth')||null,
    };
    if(!payload.name)return;
    setBusy(true);setMessage('');
    try{
      const created=await createStorage(payload);
      setLocations(x=>[...x,created]);
      setAdding(false);
      setMessage(`${created.name||payload.name} was added successfully.`);
    }catch(err){setMessage(err.message||'Unable to create storage location.');}
    finally{setBusy(false);}
  };

  const edit=async item=>{
    const name=window.prompt('Storage name',item.name);
    if(!name||name.trim()===item.name)return;
    try{
      const updated=await updateStorage(item.id,{name:name.trim()});
      setLocations(x=>x.map(v=>v.id===item.id?updated:v));
      setMessage('Storage location updated.');
    }catch(err){setMessage(err.message||'Unable to update storage location.');}
  };

  const remove=async item=>{
    if(productCount(item.id)){setMessage(`${item.name} contains products. Move them before deleting.`);return;}
    if(!window.confirm(`Delete ${item.name}?`))return;
    try{
      await deleteStorage(item.id);
      setLocations(x=>x.filter(v=>v.id!==item.id));
      setMessage('Storage location deleted.');
    }catch(err){setMessage(err.message||'Unable to delete storage location.');}
  };

  return <div className="page settings">
    <section className="setting-section">
      <div className="section-heading">
        <div><p className="eyebrow">STORAGE MANAGEMENT</p><h2>Storage Locations</h2><p>Manage the refrigerators, freezers and shelves monitored by FreshGuard.</p></div>
        <button type="button" className="primary" onClick={()=>setAdding(true)}><Plus size={17}/> Add Storage</button>
      </div>
      {message&&<div className="success">{message}</div>}
    </section>

    <section className="setting-section">
      {locations.length===0?<div className="empty-state"><Box size={28}/><h3>No storage locations yet</h3><p>Add your first storage location to start monitoring temperature and inventory placement.</p><button className="primary" onClick={()=>setAdding(true)}><Plus size={16}/> Add Storage</button></div>:<div className="manage-grid storage-grid">
        {locations.map(item=><article key={item.id}>
          <div>
            <strong>{item.name}</strong>
            <small><Box size={13}/> {item.type||'Storage'} · {productCount(item.id)} products</small>
            <small><Thermometer size={13}/> {item.temperature!=null?`${item.temperature}°C`:'No recent temperature'} · {item.sensor||item.sensorEnabled?'Sensor connected':'Sensor not enabled'}</small>
            {(item.width||item.height||item.depth)&&<small><Ruler size={13}/> {item.width??'—'} × {item.height??'—'} × {item.depth??'—'}</small>}
          </div>
          <span><button aria-label={`Edit ${item.name}`} onClick={()=>edit(item)}><Pencil size={16}/></button><button aria-label={`Delete ${item.name}`} onClick={()=>remove(item)}><Trash2 size={16}/></button></span>
        </article>)}
      </div>}
    </section>

    <section className="setting-section">
      <p className="eyebrow">MONITORING</p><h2>Storage is the source of truth</h2>
      <p>Products, sensor readings and risk assessments are linked to these backend storage locations. Adding a location here makes it available to the rest of the FreshGuard monitoring flow.</p>
      <div className="module-list"><span><Wifi size={15}/> Live sensor status</span><span><Thermometer size={15}/> Temperature monitoring</span><span><Box size={15}/> Product placement</span></div>
    </section>

    {adding&&<div className="modal-backdrop"><form className="modal" onSubmit={submit}>
      <h2>Add storage location</h2>
      <label>Name<input name="name" placeholder="e.g. Main Refrigerator" required autoFocus/></label>
      <label>Type<select name="type"><option>Refrigerator</option><option>Freezer</option><option>Shelf</option><option>Other</option></select></label>
      <label><input type="checkbox" name="sensor_enabled" defaultChecked/> Sensor enabled</label>
      <div className="form-grid"><label>Width<input name="width" type="number" min="0" step="any" placeholder="cm"/></label><label>Height<input name="height" type="number" min="0" step="any" placeholder="cm"/></label><label>Depth<input name="depth" type="number" min="0" step="any" placeholder="cm"/></label></div>
      <div className="modal-actions"><button type="button" onClick={()=>setAdding(false)} disabled={busy}>Cancel</button><button className="primary" disabled={busy}>{busy?'Creating…':'Create Storage'}</button></div>
    </form></div>}
  </div>;
}
