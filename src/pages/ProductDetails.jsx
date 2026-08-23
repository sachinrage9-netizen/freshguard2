import {useEffect,useState} from 'react';
import {useParams,Link} from 'react-router-dom';
import {ArrowLeft,Thermometer,MapPin,CalendarDays,Package} from 'lucide-react';
import {Badge} from '../components/UI';
import {getProductRisk,getSensorReadings} from '../api/client';

export default function ProductDetails({products}){
  const {id}=useParams();
  const p=products.find(x=>x.id===id);
  const [risk,setRisk]=useState(null);
  const [riskStatus,setRiskStatus]=useState('idle');
  const [historyReadings,setHistoryReadings]=useState(null);

  useEffect(()=>{
    if(!p)return;
    let cancelled=false; setRiskStatus('loading');
    getProductRisk(p.productCode||p.id).then(data=>{if(!cancelled){setRisk(data);setRiskStatus('ready')}}).catch(()=>{if(!cancelled){setRisk(null);setRiskStatus('error')}});
    return()=>{cancelled=true};
  },[p&&p.id]);

  useEffect(()=>{
    if(!p||p.locationId==null){setHistoryReadings(null);return}
    let cancelled=false;
    getSensorReadings({storage_location_id:p.locationId,since:new Date(Date.now()-24*60*60*1000).toISOString().replace('T',' ').slice(0,19)})
      .then(data=>{if(!cancelled)setHistoryReadings(Array.isArray(data)&&data.length?data.slice(0,24).reverse():null)})
      .catch(()=>{if(!cancelled)setHistoryReadings(null)});
    return()=>{cancelled=true};
  },[p&&p.id,p&&p.locationId]);

  if(!p)return <div className="page">Product not found.</div>;
  const historyValues=historyReadings?historyReadings.map(r=>r.temperature):p.history||[];
  const currentTemp=p.temp==null?null:p.temp;
  return <div className="page details"><Link className="back" to="/inventory"><ArrowLeft size={17}/> Back to inventory</Link><div className="detail-head"><div><p className="eyebrow">{p.category}</p><h2>{p.name}</h2><Badge>{p.priority}</Badge></div><div className="detail-emoji">{p.category==='Frozen'?'❄️':'🥛'}</div></div><div className="detail-grid"><article><Package/><span>Quantity</span><strong>{p.quantity} units</strong></article><article><CalendarDays/><span>Expiry date</span><strong>{new Date(p.expiry+'T00:00:00').toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}</strong></article><article><MapPin/><span>Storage location</span><strong>{p.location}</strong></article><article><Thermometer/><span>Current temperature</span><strong>{currentTemp==null?'—':`${currentTemp}°C`}</strong></article></div><section className="history"><p className="eyebrow">STORAGE HISTORY</p><h2>Temperature over the last 24 hours</h2><div className="bars">{historyValues.map((v,i)=><div key={i}><span style={{height:`${Math.max(20,Math.min(100,(v+20)*3))}%`}} className={v>p.maxTemperature?'hot':''}></span><small>{i===historyValues.length-1?'Now':' '}</small></div>)}</div><div className="history-note"><strong>{historyReadings?'Live sensor history':'No recent backend readings'}</strong><p>{historyReadings?'Showing readings from this product’s storage location.':'Showing local fallback history only.'}</p></div></section><section className="risk-box"><p className="eyebrow">RISK ASSESSMENT</p>{riskStatus==='ready'&&risk?<><h2>{risk.risk_level} RISK</h2><p>Overall risk score: {risk.overall_risk}/100 · Expiry: {risk.days_remaining} days remaining · Temperature risk: {risk.temperature_risk}/100</p>{risk.average_temperature!=null&&<p>Avg temp: {risk.average_temperature.toFixed(1)}°C · Max temp: {risk.max_temperature}°C · Time above threshold: {risk.excursion_duration_minutes} min</p>}<div><strong>Recommendation:</strong> {risk.recommendation}</div></>:<><h2>{p.priority==='Normal'?'STORAGE NORMAL':'EXPIRY APPROACHING'}</h2><p>{riskStatus==='error'?'Live risk data unavailable — showing the last known UI state.':'Loading live risk assessment…'}</p></>}</section></div>;
}
