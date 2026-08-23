import {useEffect,useState} from 'react';
import {LineChart,Line,ResponsiveContainer,CartesianGrid,XAxis,Tooltip,BarChart,Bar} from 'recharts';
import {getSensorReadings} from '../api/client';

export default function Reports({locations=[]}){
  const [temp,setTemp]=useState([]);
  useEffect(()=>{
    let cancelled=false;
    const since=new Date(Date.now()-24*60*60*1000).toISOString().replace('T',' ').slice(0,19);
    Promise.all(locations.filter(x=>x.id!=null).map(x=>getSensorReadings({storage_location_id:x.id,since}).catch(()=>[])))
      .then(results=>{if(cancelled)return;const rows=results.flat().sort((a,b)=>String(a.timestamp).localeCompare(String(b.timestamp)));const sample=rows.slice(-12);setTemp(sample.map((r,i)=>({time:i===sample.length-1?'Now':new Date(String(r.timestamp).replace(' ','T')).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'}),t:r.temperature})))})
      .catch(()=>{});
    return()=>{cancelled=true};
  },[locations]);
  const saved=[];
  return <div className="page reports"><div className="metric-grid">{[['Estimated Loss Prevented','Demo','saved'],['Products Sold Before Expiry','Demo','blue'],['Food Waste Prevented','Demo','green'],['Power Outages','N/A','orange'],['Storage Health',temp.length?'Live':'N/A','health']].map(([label,value,kind])=><article key={label} className={kind}><p>{label}</p><h2>{value}</h2><small>{kind==='health'?(temp.length?'Based on recent sensor data':'No sensor data'):'Demo estimate — not live backend data'}</small></article>)}</div><div className="chart-grid"><section><p className="eyebrow">TEMPERATURE</p><h2>Last 24 hours</h2><div className="chart">{temp.length?<ResponsiveContainer><LineChart data={temp}><CartesianGrid vertical={false} stroke="#edf1ee"/><XAxis dataKey="time"/><Tooltip/><Line type="monotone" dataKey="t" stroke="#217a58" strokeWidth={3} dot={false}/></LineChart></ResponsiveContainer>:<p>No sensor readings available for the last 24 hours.</p>}</div></section><section><p className="eyebrow">EXPIRY SAVED</p><h2>Products sold in time</h2><div className="chart">{saved.length?<ResponsiveContainer><BarChart data={saved}><CartesianGrid vertical={false} stroke="#edf1ee"/><XAxis dataKey="name"/><Tooltip/><Bar dataKey="value" fill="#dd8b38" radius={[5,5,0,0]}/></BarChart></ResponsiveContainer>:<p>Demo estimate only — no backend sales history is available.</p>}</div></section></div><section className="report-note"><strong>Small changes, less waste.</strong><p>Sales, waste, and power-outage metrics remain clearly labeled estimates until those backend data sources exist.</p></section></div>
}
