import {useMemo,useState} from 'react';
import {Search,ArrowDownUp,Edit3} from 'lucide-react';
import {Link} from 'react-router-dom';
import {ProductCard} from '../components/UI';

export default function Inventory({products,categories}){
  const [query,setQuery]=useState('');
  const [category,setCategory]=useState('All');
  const [sort,setSort]=useState('expiry');
  const rows=useMemo(()=>products.filter(p=>(category==='All'||p.categoryId===category)&&p.name.toLowerCase().includes(query.toLowerCase())).sort((a,b)=>sort==='expiry'?a.expiry.localeCompare(b.expiry):(a.priority==='High priority'?-1:a.priority==='Sell soon'&&b.priority==='Normal'?-1:1)),[products,query,category,sort]);
  return <div className="page"><div className="toolbar"><label className="search"><Search size={19}/><input aria-label="Search products" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search products"/></label><button className="sort" onClick={()=>setSort(sort==='expiry'?'priority':'expiry')}><ArrowDownUp size={17}/> Sort: {sort==='expiry'?'Expiry':'Priority'}</button></div><div className="filters"><button onClick={()=>setCategory('All')} className={category==='All'?'active':''}>All</button>{categories.map(x=><button key={x.id} onClick={()=>setCategory(x.id)} className={category===x.id?'active':''}>{x.name}</button>)}</div><p className="result-count">{rows.length} products</p><div className="inventory-list">{rows.map(p=><div key={p.id} style={{position:'relative'}}><ProductCard product={p}/><Link aria-label={`Edit ${p.name}`} title="Edit product" to={`/product/${encodeURIComponent(p.productCode||p.id)}/edit`} style={{position:'absolute',right:14,bottom:14,display:'inline-flex',alignItems:'center',gap:6,padding:'7px 10px',border:'1px solid #d8e3dc',borderRadius:8,background:'#fff',color:'#2d6049',fontSize:12,textDecoration:'none'}}><Edit3 size={14}/> Edit</Link></div>)}</div></div>;
}
