import {useEffect,useState} from 'react';
import {Routes,Route,Navigate} from 'react-router-dom';
import Layout from './components/Layout';
import {initialProducts,defaultLocations,defaultCategories} from './data/mockData';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import ProductDetails from './pages/ProductDetails';
import AddProduct from './pages/AddProduct';
import Alerts from './pages/Alerts';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Storage from './pages/Storage';
import {Login,Signup} from './pages/Auth';
import {getProducts,getStorage,getLatestSensorReading,getAllRisk,getAlerts} from './api/client';

const get=(key,fallback)=>JSON.parse(localStorage.getItem(key)||'null')||fallback;

function riskPriority(risk, expiry){
  const level=risk?.risk_level;
  const days=risk?.days_remaining;
  if(level==='CRITICAL'||level==='HIGH') return 'High priority';
  if(level==='MODERATE') return 'Sell soon';
  if(days!=null&&days<=3) return 'Sell soon';
  if(expiry){
    const remaining=Math.ceil((new Date(expiry+'T00:00:00')-new Date())/(1000*60*60*24));
    if(remaining<=3) return 'Sell soon';
  }
  return 'Normal';
}

function mapBackendProduct(p, locationTemps={}, risks={}){
  const locationId=p.storage_location_id;
  const categoryId='cat-'+Math.max(0,['Dairy','Drinks','Frozen','Snacks','Bakery','Other'].indexOf(p.category));
  const risk=risks[p.product_code];
  return {id:p.product_code,productCode:p.product_code,name:p.name,category:p.category,categoryId,categoryPath:[p.category],quantity:p.quantity,expiry:p.expiry_date,location:p.storage_location,locationId,storageLocationId:locationId,priority:riskPriority(risk,p.expiry_date),temp:locationTemps[locationId] ?? null,history:[],maxTemperature:p.max_temperature,position_x:p.position_x,position_y:p.position_y,position_z:p.position_z,shelf:p.shelf,slot:p.slot,row:p.row,column:p.column,overallRisk:risk?.overall_risk,riskLevel:risk?.risk_level};
}

function mapBackendLocation(x){
  return {id:x.id,backendId:x.id,name:x.name,type:x.type,sensor:!!x.sensor,sensorEnabled:!!x.sensor_enabled,temperature:x.temperature,humidity:x.humidity,lastUpdated:x.last_updated,productCount:x.product_count,width:x.width,height:x.height,depth:x.depth};
}

function Protected({user,children}){return user?children:<Navigate to="/login" replace/>}

export default function App(){
  const [user,setUser]=useState(()=>get('freshguard-session',null));
  const [products,setProducts]=useState(()=>get('freshguard-products',initialProducts).map(p=>({...p,locationId:p.locationId||p.storageLocationId||null,categoryId:p.categoryId||'cat-'+Math.max(0,['Dairy','Drinks','Frozen','Snacks','Bakery','Other'].indexOf(p.category))})));
  const [locations,setLocations]=useState(()=>get('freshguard-locations',defaultLocations));
  const [categories,setCategories]=useState(()=>get('freshguard-categories',defaultCategories).map(c=>({...c,parentId:c.parentId||null,createdAt:c.createdAt||new Date().toISOString()})));
  const [dashboard,setDashboard]=useState(()=>get('freshguard-dashboard',{modules:['storage','attention','warning','inventory'],label:''}));
  const [alerts,setAlerts]=useState(()=>get('freshguard-alerts',[]));
  const [sensor,setSensor]=useState({temperature:null,humidity:null,powerStatus:'ON',outageDuration:null,lastUpdated:null});
  const [backendConnected,setBackendConnected]=useState(false);

  useEffect(()=>localStorage.setItem('freshguard-products',JSON.stringify(products)),[products]);
  useEffect(()=>localStorage.setItem('freshguard-locations',JSON.stringify(locations)),[locations]);
  useEffect(()=>localStorage.setItem('freshguard-categories',JSON.stringify(categories)),[categories]);
  useEffect(()=>localStorage.setItem('freshguard-dashboard',JSON.stringify(dashboard)),[dashboard]);
  useEffect(()=>localStorage.setItem('freshguard-alerts',JSON.stringify(alerts)),[alerts]);

  useEffect(()=>{
    let cancelled=false;
    async function poll(){
      const [productsResult,storageResult,sensorResult,riskResult,alertsResult]=await Promise.allSettled([getProducts(),getStorage(),getLatestSensorReading(),getAllRisk(),getAlerts()]);
      if(cancelled)return;
      const backendProducts=productsResult.status==='fulfilled'?productsResult.value:null;
      const backendLocations=storageResult.status==='fulfilled'?storageResult.value:null;
      const latest=sensorResult.status==='fulfilled'?sensorResult.value:null;
      const risks=riskResult.status==='fulfilled'?riskResult.value:null;
      const backendAlerts=alertsResult.status==='fulfilled'?alertsResult.value:null;
      const anyCore=backendProducts||backendLocations||latest||risks||backendAlerts;
      if(anyCore)setBackendConnected(true); else if(productsResult.status==='rejected'&&storageResult.status==='rejected')setBackendConnected(false);

      const riskMap={};
      if(Array.isArray(risks))risks.forEach(r=>{if(r?.product_code)riskMap[r.product_code]=r});
      const locationTemps={};
      if(Array.isArray(backendLocations)){
        backendLocations.forEach(x=>{locationTemps[x.id]=x.temperature});
        setLocations(backendLocations.map(mapBackendLocation));
      }
      if(Array.isArray(backendProducts))setProducts(backendProducts.map(p=>mapBackendProduct(p,locationTemps,riskMap)));
      else if(Object.keys(riskMap).length)setProducts(prev=>prev.map(p=>{const risk=riskMap[p.productCode||p.id];return risk?{...p,priority:riskPriority(risk,p.expiry),overallRisk:risk.overall_risk,riskLevel:risk.risk_level}:p}));

      if(latest&&!latest.error)setSensor(s=>({...s,temperature:latest.temperature,humidity:latest.humidity,lastUpdated:latest.timestamp,location:latest.location,storageLocationId:latest.storage_location_id}));
      else if(Array.isArray(backendLocations)){const withTemp=backendLocations.find(x=>x.temperature!=null);if(withTemp)setSensor(s=>({...s,temperature:withTemp.temperature,humidity:withTemp.humidity,lastUpdated:withTemp.last_updated,storageLocationId:withTemp.id}));}

      if(Array.isArray(backendAlerts))setAlerts(backendAlerts.map(a=>({id:a.id,group:a.group,title:a.title,body:a.message,time:a.time||a.timestamp,product:a.product_code,productCode:a.product_code,severity:a.severity,storageLocationId:a.storage_location_id,status:a.status})));
    }
    poll();
    const id=setInterval(poll,5000);
    return()=>{cancelled=true;clearInterval(id)};
  },[]);

  const login=u=>{localStorage.setItem('freshguard-session',JSON.stringify(u));setUser(u)};
  const props={products,setProducts,sensor,sensorStatus:backendConnected?'ready':'error',locations,categories,dashboard,user,backendConnected,alerts};

  return <Routes>
    <Route path="/login" element={user?<Navigate to="/"/>:<Login onLogin={login}/>}/>
    <Route path="/signup" element={user?<Navigate to="/"/>:<Signup onLogin={login}/>}/>
    <Route path="/*" element={<Protected user={user}><Layout user={user} backendConnected={backendConnected}><Routes>
      <Route path="/" element={<Dashboard {...props}/>}/><Route path="/inventory" element={<Inventory {...props}/>}/><Route path="/storage" element={<Storage locations={locations} setLocations={setLocations} products={products}/>}/><Route path="/product/:id" element={<ProductDetails {...props}/>}/><Route path="/add" element={<AddProduct {...props}/>}/><Route path="/alerts" element={<Alerts alerts={alerts}/>}/><Route path="/reports" element={<Reports sensor={sensor} locations={locations}/>}/><Route path="/settings" element={<Settings {...props} user={user} setUser={setUser} setLocations={setLocations} setCategories={setCategories} dashboard={dashboard} setDashboard={setDashboard}/>} />
    </Routes></Layout></Protected>}/>
  </Routes>
}
