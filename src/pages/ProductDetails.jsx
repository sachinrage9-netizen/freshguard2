import {useEffect,useState} from 'react'; import {useParams,Link} from 'react-router-dom'; import {ArrowLeft,Thermometer,MapPin,CalendarDays,Package} from 'lucide-react'; import {Badge} from '../components/UI'; import {getProductRisk,getSensorReadings} from '../api/client'; import {backendProductCode,resolveBackendLocation} from '../api/mappings';
export default function ProductDetails({products}){
  const {id}=useParams();
  const p=products.find(x=>x.id===id);

  // Live risk assessment from the backend risk engine (GET /api/risk/<product_code>),
  // for products with a known backend product_code (see api/mappings.js).
  const [risk,setRisk]=useState(null);
  const [riskStatus,setRiskStatus]=useState('idle'); // idle | unmapped | loading | ready | error

  // Real sensor readings for this product's storage location, when available.
  // null means "no backend data" -> fall back to the product's mock history array.
  const [historyReadings,setHistoryReadings]=useState(null);

  useEffect(()=>{
    if(!p)return;
    const code=backendProductCode(p);
    if(!code){setRiskStatus('unmapped');setRisk(null);return}
    let cancelled=false;
    setRiskStatus('loading');
    getProductRisk(code)
      .then(data=>{if(!cancelled){setRisk(data);setRiskStatus('ready')}})
      .catch(()=>{if(!cancelled)setRiskStatus('error')});
    return()=>{cancelled=true}
  },[p&&p.id]);

  useEffect(()=>{
    if(!p)return;
    const backendLocation=resolveBackendLocation(p.location);
    if(!backendLocation){setHistoryReadings(null);return}
    let cancelled=false;
    getSensorReadings({location:backendLocation})
      .then(data=>{
        if(cancelled)return;
        // API returns newest-first; take the most recent 7 and put them back
        // in chronological order for the chart.
        const forLocation=data.slice(0,7).reverse();
        setHistoryReadings(forLocation.length?forLocation:null);
      })
      .catch(()=>{if(!cancelled)setHistoryReadings(null)});
    return()=>{cancelled=true}
  },[p&&p.id]);

  if(!p)return <div className="page">Product not found.</div>;

  const historyValues=historyReadings?historyReadings.map(r=>r.temperature):p.history;
  const currentTemp=p.temp==null?null:p.temp;

  return <div className="page details"><Link className="back" to="/inventory"><ArrowLeft size={17}/> Back to inventory</Link><div className="detail-head"><div><p className="eyebrow">{p.category}</p><h2>{p.name}</h2><Badge>{p.priority}</Badge></div><div className="detail-emoji">{p.category==='Frozen'?'❄️':'🥛'}</div></div><div className="detail-grid"><article><Package/><span>Quantity</span><strong>{p.quantity} units</strong></article><article><CalendarDays/><span>Expiry date</span><strong>{new Date(p.expiry+'T00:00:00').toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}</strong></article><article><MapPin/><span>Storage location</span><strong>{p.location}</strong></article><article><Thermometer/><span>Current temperature</span><strong>{currentTemp==null?'—':`${currentTemp}°C`}</strong></article></div><section className="history"><p className="eyebrow">STORAGE HISTORY</p><h2>Temperature over the last week</h2><div className="bars">{historyValues.map((v,i)=><div key={i}><span style={{height:`${Math.max(20,Math.min(100,(v+20)*3))}%`}} className={v>5?'hot':''}></span><small>{i===historyValues.length-1?'Today':' '}</small></div>)}</div><div className="history-note"><strong>Aug 18 · Temperature warning during power outage</strong><p>Conditions were outside the recommended range for 3 hours.</p></div></section><section className="risk-box"><p className="eyebrow">RISK ASSESSMENT</p>{riskStatus==='ready'&&risk?<><h2>{risk.risk_level} RISK</h2><p>Overall risk score: {risk.overall_risk}/100 · Expiry: {risk.days_remaining} days remaining · Temperature risk: {risk.temperature_risk}/100</p>{risk.average_temperature!=null&&<p>Avg temp: {risk.average_temperature.toFixed(1)}°C · Max temp: {risk.max_temperature}°C · Time above threshold: {risk.excursion_duration_minutes} min</p>}<div><strong>Recommendation:</strong> {risk.recommendation}</div></>:<><h2>{p.priority==='Normal'?'STORAGE NORMAL':'EXPIRY APPROACHING'}</h2><p>{p.priority==='Normal'?'Current storage conditions are within the recommended range.':'Storage conditions were outside the recommended range during the last power outage.'}</p>{riskStatus==='error'&&<p><small>Live risk data unavailable — showing local estimate.</small></p>}<div><strong>Recommendation:</strong> {p.priority==='Normal'?'Continue normal stock rotation.':'Prioritize this batch for sale.'}</div></>}</section></div>}
