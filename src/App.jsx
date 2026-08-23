import {useEffect,useState} from 'react';
import {Routes,Route,Navigate} from 'react-router-dom';
import Layout from './components/Layout';
import {initialProducts,alerts,defaultLocations,defaultCategories} from './data/mockData';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import ProductDetails from './pages/ProductDetails';
import AddProduct from './pages/AddProduct';
import Alerts from './pages/Alerts';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import {Login,Signup} from './pages/Auth';
import {getProducts,getStorageLocations,getLatestSensorReading} from './api/client';
import {backendProductCode,resolveBackendLocation,normalizeLocationId} from './api/mappings';

const get=(key,fallback)=>JSON.parse(localStorage.getItem(key)||'null')||fallback;

function mapBackendProduct(p){
  const locationId=normalizeLocationId(p.storage_location);
  const categoryId='cat-'+Math.max(0,['Dairy','Drinks','Frozen','Snacks','Bakery','Other'].indexOf(p.category));
  return {
    id:p.product_code,
    productCode:p.product_code,
    name:p.name,
    category:p.category,
    categoryId,
    categoryPath:[p.category],
    quantity:p.quantity,
    expiry:p.expiry_date,
    location:p.storage_location,
    locationId,
    priority:'Normal',
    temp:null,
    history:[],
    maxTemperature:p.max_temperature,
  };
}

function mapBackendLocation(x){
  return {
    id:normalizeLocationId(x.name),
    backendId:x.id,
    name:x.name,
    type:x.type,
    sensor:x.sensor,
    temperature:x.temperature,
    humidity:x.humidity,
    lastUpdated:x.last_updated,
  };
}

function Protected({user,children}){return user?children:<Navigate to="/login" replace/>}

export default function App(){
  const [user,setUser]=useState(()=>get('freshguard-session',null));
  const [products,setProducts]=useState(()=>get('freshguard-products',initialProducts).map(p=>({...p,locationId:p.locationId||(p.location==='Freezer'?'freezer':'fridge-1'),categoryId:p.categoryId||'cat-'+Math.max(0,['Dairy','Drinks','Frozen','Snacks','Bakery','Other'].indexOf(p.category))})));
  const [locations,setLocations]=useState(()=>get('freshguard-locations',defaultLocations));
  const [categories,setCategories]=useState(()=>get('freshguard-categories',defaultCategories).map(c=>({...c,parentId:c.parentId||null,createdAt:c.createdAt||new Date().toISOString()})));
  const [dashboard,setDashboard]=useState(()=>get('freshguard-dashboard',{modules:['storage','attention','warning','inventory'],label:''}));
  const [sensor,setSensor]=useState({temperature:4.2,humidity:68,powerStatus:'ON',outageDuration:'2h 14m',lastUpdated:'just now'});
  const [backendConnected,setBackendConnected]=useState(false);

  useEffect(()=>localStorage.setItem('freshguard-products',JSON.stringify(products)),[products]);
  useEffect(()=>localStorage.setItem('freshguard-locations',JSON.stringify(locations)),[locations]);
  useEffect(()=>localStorage.setItem('freshguard-categories',JSON.stringify(categories)),[categories]);
  useEffect(()=>localStorage.setItem('freshguard-dashboard',JSON.stringify(dashboard)),[dashboard]);

  // Polls products/storage/sensor from the backend. The backend is treated
  // as the source of truth for anything it knows about:
  //  - backend locations replace their equivalent mock location (matched via
  //    resolveBackendLocation) instead of being added alongside it, which is
  //    what caused the duplicate "Refrigerator 1" / "Refrigerator-01" cards.
  //    Mock locations with no backend equivalent (Freezer, Shelf 1) are left
  //    in place so those cards don't disappear.
  //  - backend products replace their equivalent local product (matched via
  //    backendProductCode) instead of being added alongside it. Local-only
  //    demo products (no backend product_code) are left untouched so they
  //    don't silently vanish.
  // If any request fails, existing state (mock on first load, or last known
  // good backend data on a later transient failure) is left as-is.
  useEffect(()=>{
    let cancelled=false;
    async function poll(){
      try{
        const [backendProducts,backendLocations,latest]=await Promise.all([
          getProducts(),
          getStorageLocations(),
          getLatestSensorReading('Refrigerator-01'),
        ]);
        if(cancelled)return;

        setLocations(prev=>{
          const mapped=backendLocations.map(mapBackendLocation);
          const mappedNames=new Set(mapped.map(x=>x.name));
          const localOnly=prev.filter(x=>!mappedNames.has(resolveBackendLocation(x.name)));
          return [...mapped,...localOnly];
        });

        setProducts(prev=>{
          const mappedBackend=backendProducts.map(mapBackendProduct);
          const backendCodes=new Set(mappedBackend.map(p=>p.productCode));
          const localOnly=prev.filter(p=>{
            const code=backendProductCode(p);
            return !(code&&backendCodes.has(code));
          });
          return [...mappedBackend,...localOnly];
        });

        if(latest&&!latest.error){
          setSensor(s=>({...s,temperature:latest.temperature,humidity:latest.humidity,lastUpdated:latest.timestamp}));
        }

        setBackendConnected(true);
      }catch(err){
        if(!cancelled)setBackendConnected(false);
      }
    }
    poll();
    const id=setInterval(poll,5000);
    return()=>{cancelled=true;clearInterval(id)};
  },[]);

  const login=u=>{localStorage.setItem('freshguard-session',JSON.stringify(u));setUser(u)};
  // sensorStatus is kept alongside backendConnected for Dashboard's existing
  // "Live Sensor" / "Sensor Unavailable" pill, unchanged since Phase 1.
  const props={products,setProducts,sensor,sensorStatus:backendConnected?'ready':'error',locations,categories,dashboard,user,backendConnected};

  return <Routes>
    <Route path="/login" element={user?<Navigate to="/"/>:<Login onLogin={login}/>}/>
    <Route path="/signup" element={user?<Navigate to="/"/>:<Signup onLogin={login}/>}/>
    <Route path="/*" element={<Protected user={user}><Layout user={user} backendConnected={backendConnected}><Routes>
      <Route path="/" element={<Dashboard {...props}/>}/>
      <Route path="/inventory" element={<Inventory {...props}/>}/>
      <Route path="/product/:id" element={<ProductDetails {...props}/>}/>
      <Route path="/add" element={<AddProduct {...props}/>}/>
      <Route path="/alerts" element={<Alerts alerts={alerts}/>}/>
      <Route path="/reports" element={<Reports sensor={sensor}/>}/>
      <Route path="/settings" element={<Settings {...props} user={user} setUser={setUser} setLocations={setLocations} setCategories={setCategories} dashboard={dashboard} setDashboard={setDashboard}/>}/>
    </Routes></Layout></Protected>}/>
  </Routes>
}
