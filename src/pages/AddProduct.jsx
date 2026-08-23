import {useState} from 'react';
import {useNavigate,Link} from 'react-router-dom';
import {childrenOf,pathFor} from '../data/categoryTree';
import {createProduct} from '../api/client';

export default function AddProduct({setProducts,locations,categories}){
  const nav=useNavigate();
  const tops=childrenOf(categories,null);
  const [form,setForm]=useState({name:'',categoryId:tops[0]?.id||'',quantity:'',expiry:'',locationId:locations[0]?.id??'',batch:'',notes:''});
  const [notice,setNotice]=useState('');
  const [error,setError]=useState('');
  const update=e=>setForm({...form,[e.target.name]:e.target.value});

  async function submit(e){
    e.preventDefault(); setError('');
    const location=locations.find(x=>String(x.id)===String(form.locationId));
    const category=categories.find(x=>x.id===form.categoryId);
    if(!location){setError('Select a valid storage location.');return;}
    const productCode=`FG-${Date.now()}`;
    const maxTemperature=location.type==='Freezer'?-18:5;
    try{
      const result=await createProduct({
        product_code:productCode,name:form.name.trim(),category:category?.name||'Other',
        quantity:Number(form.quantity),expiry_date:form.expiry,storage_location_id:Number(location.id),
        max_temperature:maxTemperature
      });
      const p=result.product;
      setProducts(x=>[...x,{id:p.product_code,productCode:p.product_code,name:p.name,category:p.category,categoryId:category?.id||'cat-0',categoryPath:pathFor(categories,form.categoryId),quantity:p.quantity,expiry:p.expiry_date,location:p.storage_location,locationId:p.storage_location_id,storageLocationId:p.storage_location_id,priority:'Normal',temp:location.temperature??null,history:[]}]);
      setNotice(`${form.name} added to inventory.`);
      setTimeout(()=>nav('/inventory'),700);
    }catch(err){setError(err.message||'Unable to create product.');}
  }

  if(!locations.length||!categories.length)return <div className="page form-page"><p className="intro">Create at least one storage location and category before adding products.</p><Link className="primary" to="/settings">Go to Settings</Link></div>;
  return <div className="page form-page"><p className="intro">Choose the most specific category path for this item.</p>{notice&&<div className="success">✓ {notice}</div>}{error&&<div className="success">{error}</div>}<form onSubmit={submit}><label>Product name<input required name="name" value={form.name} onChange={update} placeholder="e.g. Mango Ice Cream"/></label><label>Category path<select name="categoryId" value={form.categoryId} onChange={update}>{categories.map(x=><option key={x.id} value={x.id}>{pathFor(categories,x.id).join(' / ')}</option>)}</select></label><p className="path-preview">Selected: {pathFor(categories,form.categoryId).join(' / ')}</p><label>Quantity<input required min="1" type="number" name="quantity" value={form.quantity} onChange={update} placeholder="0"/></label><label>Expiry date<input required type="date" name="expiry" value={form.expiry} onChange={update}/></label><label>Storage location<select name="locationId" value={form.locationId} onChange={update}>{locations.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label><label>Batch number (optional)<input name="batch" value={form.batch} onChange={update}/></label><label>Notes (optional)<input name="notes" value={form.notes} onChange={update}/></label><button className="primary" type="submit">Add Product</button></form></div>;
}
