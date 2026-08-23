import {AlertCard} from '../components/UI';
export default function Alerts({alerts}){return <div className="page alerts-page">{['High priority','Expiring soon','Resolved'].map(group=><section key={group}><p className="eyebrow">{group}</p><div className="alerts-list">{alerts.filter(a=>a.group===group).map(a=><AlertCard key={a.id} alert={a}/>)}</div></section>)}</div>}
