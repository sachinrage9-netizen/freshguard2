import {Link} from 'react-router-dom';
import {StorageCard,ProductCard} from '../components/UI';
import {TriangleAlert,Plus,Package,ArrowRight,Droplets,Power,Trash2,BarChart3} from 'lucide-react';

export default function Dashboard({products,sensor,sensorStatus,locations,user,dashboard,alerts=[]}){
  const type=user.businessType||'Kirana';
  const noun=dashboard.label||({Restaurant:'Ingredients',Dairy:'Dairy products'}[type]||'Products');
  const urgent=products.filter(p=>p.priority!=='Normal').slice(0,2);
  const show=m=>dashboard.modules.includes(m);
  const warning=alerts.find(a=>a.group==='High priority'&&(a.status||'open')!=='resolved');
  const powerOn=sensor.powerStatus!=='OFF';
  const humidity=sensor.humidity!=null?Number(sensor.humidity).toFixed(1):'—';
  const wasteEstimate=Math.max(0,Math.round(products.filter(p=>p.priority!=='Normal').reduce((sum,p)=>sum+Number(p.quantity||0),0)*0.12));
  return <div className={'page dashboard '+type.toLowerCase()}>
    {show('storage')&&<section><div className="section-heading"><div><p className="eyebrow">{type==='Dairy'?'PRIORITY STORAGE STATUS':'LIVE STORAGE STATUS'}</p><h2>{type==='Restaurant'?'Ingredient storage':'Everything at a glance'}</h2></div><span className="sensor-pill"><i/> {sensorStatus==='error'?'Sensor Unavailable':'Live Sensor'}</span></div><div className="storage-grid">{locations.filter(x=>x.sensorEnabled||x.sensor).map(x=>{const temp=x.temperature==null?'—':`${x.temperature}°C`;const hum=x.humidity==null?'':` · ${Number(x.humidity).toFixed(1)}% humidity`;return <StorageCard key={x.id} title={x.name} value={temp} detail={`${x.productCount??products.filter(p=>String(p.locationId)===String(x.id)).length} ${noun.toLowerCase()} · ${x.sensor?'Sensor connected':'No recent sensor reading'}${hum}`}/>})}</div>{sensor.humidity!=null&&<div className="live-environment">Live environment: <strong>{Number(sensor.temperature).toFixed(1)}°C</strong> · <strong>{Number(sensor.humidity).toFixed(1)}% humidity</strong></div>}</section>}
    {show('attention')&&<section><div className="section-heading"><div><p className="eyebrow">NEEDS ATTENTION</p><h2>{type==='Restaurant'?'Use these ingredients first':'Sell these first'}</h2></div><Link className="text-link" to="/inventory">View {noun.toLowerCase()} <ArrowRight size={16}/></Link></div><div className="priority-grid">{urgent.map(p=><ProductCard key={p.id} product={p}/>)}</div>{!urgent.length&&<div className="empty-module">No products currently need attention.</div>}</section>}
    {show('warning')&&<section className="warning-banner"><div className="warning-symbol"><TriangleAlert/></div><div><p className="eyebrow">STORAGE CONDITION WARNING</p><h2>{warning?warning.title:'No active storage warning'}</h2><p>{warning?warning.body:'Live storage conditions are currently within the backend-reported state.'}</p><Link to="/alerts">View alerts <ArrowRight size={16}/></Link></div></section>}
    {show('inventory')&&<section className="dashboard-module-grid"><div className="dashboard-module"><Package/><div><p className="eyebrow">INVENTORY</p><h2>{products.length} items tracked</h2><p>{products.reduce((s,p)=>s+Number(p.quantity||0),0)} total units across {locations.length} storage locations.</p></div><Link to="/inventory">Open inventory <ArrowRight size={16}/></Link></div></section>}
    {(show('humidity')||show('power'))&&<section className="dashboard-module-grid two-up">
      {show('humidity')&&<div className="dashboard-module"><Droplets/><div><p className="eyebrow">HUMIDITY</p><h2>{humidity}{humidity!=='—'&&'%'}</h2><p>Latest reading from the connected storage sensor.</p></div></div>}
      {show('power')&&<div className={'dashboard-module '+(!powerOn?'module-danger':'')}><Power/><div><p className="eyebrow">POWER</p><h2>{powerOn?'Power online':'Power outage'}</h2><p>{powerOn?'Storage monitoring is receiving power.':`Outage timer: ${sensor.outageDuration||'active'}`}</p></div></div>}
    </section>}
    {(show('waste')||show('reports'))&&<section className="dashboard-module-grid two-up">
      {show('waste')&&<div className="dashboard-module"><Trash2/><div><p className="eyebrow">WASTE PREVENTION</p><h2>{wasteEstimate} units at risk</h2><p>Estimate based on products currently flagged for attention.</p></div></div>}
      {show('reports')&&<div className="dashboard-module"><BarChart3/><div><p className="eyebrow">REPORTS</p><h2>Track performance</h2><p>Review temperature trends, expiry savings and storage health.</p></div><Link to="/reports">Open reports <ArrowRight size={16}/></Link></div>}
    </section>}
    <section><p className="eyebrow">QUICK ACTIONS</p><div className="quick-actions"><Link to="/add"><Plus/>Add {type==='Restaurant'?'Ingredient':'Product'}</Link><Link to="/inventory"><Package/>View {noun}</Link><Link to="/alerts"><TriangleAlert/>View Alerts</Link></div></section>
  </div>
}
