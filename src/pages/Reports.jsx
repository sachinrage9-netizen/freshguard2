import {useEffect,useMemo,useState} from 'react';
import {LineChart,Line,ResponsiveContainer,CartesianGrid,XAxis,YAxis,Tooltip,BarChart,Bar} from 'recharts';
import {getSensorReadings} from '../api/client';

function daysUntil(date){
  if(!date)return 999;
  return Math.ceil((new Date(`${date}T00:00:00`)-new Date())/(1000*60*60*24));
}

const unitValue={Dairy:80,Drinks:50,Frozen:150,Snacks:45,Bakery:60,Other:70};

export default function Reports({locations=[],products=[],sensor={}}){
  const [readings,setReadings]=useState([]);
  const [outages,setOutages]=useState(()=>Number(localStorage.getItem('freshguard-power-outages')||0));

  useEffect(()=>{
    let cancelled=false;
    const since=new Date(Date.now()-24*60*60*1000).toISOString().replace('T',' ').slice(0,19);
    Promise.all(locations.filter(x=>x.id!=null).map(x=>getSensorReadings({storage_location_id:x.id,since,limit:100}).catch(()=>[])))
      .then(results=>{if(cancelled)return;setReadings(results.flat().sort((a,b)=>String(a.timestamp).localeCompare(String(b.timestamp))));})
      .catch(()=>{});
    const sync=()=>setOutages(Number(localStorage.getItem('freshguard-power-outages')||0));
    window.addEventListener('storage',sync);
    const timer=setInterval(sync,1500);
    return()=>{cancelled=true;window.removeEventListener('storage',sync);clearInterval(timer)};
  },[locations]);

  const chartData=useMemo(()=>readings.slice(-12).map((r,i)=>({
    time:i===Math.min(11,readings.length-1)?'Now':new Date(String(r.timestamp).replace(' ','T')).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'}),
    temperature:Number(r.temperature),
    humidity:Number(r.humidity)
  })),[readings]);

  const currentTemperature=sensor.temperature!=null?Number(sensor.temperature):(chartData.at(-1)?.temperature??null);
  const currentHumidity=sensor.humidity!=null?Number(sensor.humidity):(chartData.at(-1)?.humidity??null);
  const totalUnits=products.reduce((sum,p)=>sum+(Number(p.quantity)||0),0);
  const nearExpiryUnits=products.reduce((sum,p)=>sum+(daysUntil(p.expiry)<=7?Number(p.quantity)||0:0),0);
  const riskUnits=products.reduce((sum,p)=>sum+(p.priority&&p.priority!=='Normal'?Number(p.quantity)||0:0),0);
  const protectedUnits=Math.max(0,Math.round(totalUnits*0.68-riskUnits*0.08));
  const wastePrevented=Math.max(0,Math.round(totalUnits*0.18+nearExpiryUnits*0.25));
  const estimatedLoss=Math.max(0,Math.round(products.reduce((sum,p)=>sum+(Number(p.quantity)||0)*(unitValue[p.category]||70),0)*0.16));
  const temperatureExcursion=readings.some(r=>Number(r.temperature)>8 || Number(r.temperature)<-10);
  const simulatedOutages=Math.max(outages,temperatureExcursion?1:0);
  const storageHealth=currentTemperature==null?'Waiting':((currentTemperature>=2&&currentTemperature<=5)?'Good':'Attention');
  const saved=products.slice(0,6).map(p=>({name:String(p.name||'Product').slice(0,12),value:Math.max(0,Math.round((Number(p.quantity)||0)*0.68))})).filter(x=>x.value>0);

  return <div className="page reports">
    <div className="metric-grid">
      <article className="saved"><p>Estimated Loss Prevented</p><h2>₹{estimatedLoss.toLocaleString('en-IN')}</h2><small>Simulated from current inventory value and monitored conditions</small></article>
      <article className="blue"><p>Products Sold Before Expiry</p><h2>{protectedUnits}</h2><small>Simulated demo projection from {totalUnits} tracked units</small></article>
      <article className="green"><p>Food Waste Prevented</p><h2>{wastePrevented} units</h2><small>Simulated estimate based on inventory and expiry risk</small></article>
      <article className="orange"><p>Power Outages</p><h2>{simulatedOutages}</h2><small>{outages?'Recorded from the FreshGuard demo control':'Detected/simulated temperature excursion'}</small></article>
      <article className="health"><p>Storage Health</p><h2>{storageHealth}</h2><small>{currentTemperature==null?'Waiting for sensor data':`Temperature ${currentTemperature.toFixed(1)}°C · ${riskUnits} units need attention`}</small></article>
      <article className="humidity"><p>Current Humidity</p><h2>{currentHumidity==null?'—':`${currentHumidity.toFixed(1)}%`}</h2><small>Live simulated sensor reading</small></article>
    </div>

    <div className="chart-grid">
      <section><p className="eyebrow">TEMPERATURE</p><h2>Last 24 hours</h2><div className="chart">{chartData.length?<ResponsiveContainer><LineChart data={chartData}><CartesianGrid vertical={false} stroke="#edf1ee"/><XAxis dataKey="time"/><YAxis/><Tooltip/><Line type="monotone" dataKey="temperature" name="Temperature °C" stroke="#217a58" strokeWidth={3} dot={false}/></LineChart></ResponsiveContainer>:<p>No sensor readings available for the last 24 hours.</p>}</div></section>
      <section><p className="eyebrow">EXPIRY SAVED</p><h2>Products sold in time</h2><div className="chart">{saved.length?<ResponsiveContainer><BarChart data={saved}><CartesianGrid vertical={false} stroke="#edf1ee"/><XAxis dataKey="name"/><YAxis/><Tooltip/><Bar dataKey="value" name="Projected units" fill="#dd8b38" radius={[5,5,0,0]}/></BarChart></ResponsiveContainer>:<p>Add products to generate the simulated expiry-saving projection.</p>}</div></section>
    </div>

    <section className="report-note"><div><strong>Humidity monitoring is live.</strong><p>FreshGuard receives temperature and humidity readings from the running sensor simulator. The report cards above derive demo metrics from the current inventory and sensor state rather than using fixed placeholder numbers.</p></div>{chartData.length>0&&<div style={{marginTop:14,fontSize:13,color:'#64766d'}}><strong>Latest environment:</strong> {currentTemperature?.toFixed(1)}°C · {currentHumidity?.toFixed(1)}% humidity</div>}</section>
  </div>;
}
