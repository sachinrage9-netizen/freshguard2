export const initialProducts=[
 {id:'milk',name:'Milk',category:'Dairy',quantity:24,expiry:'2026-08-22',location:'Refrigerator 1',priority:'High priority',temp:4.2,history:[4.1,4.2,4.3,6.8,8.2,5.4,4.2]},
 {id:'curd',name:'Curd',category:'Dairy',quantity:18,expiry:'2026-08-23',location:'Refrigerator 1',priority:'Sell soon',temp:4.2,history:[4,4.1,4.5,6.1,7.2,5,4.2]},
 {id:'butter',name:'Butter',category:'Dairy',quantity:32,expiry:'2026-09-15',location:'Refrigerator 1',priority:'Normal',temp:4.2,history:[4.2,4.3,4.2,4.5,4.4,4.1,4.2]},
 {id:'ice-cream',name:'Ice Cream',category:'Frozen',quantity:20,expiry:'2026-09-03',location:'Freezer',priority:'Normal',temp:-18,history:[-18,-18,-17.9,-18,-17.8,-18,-18]},
 {id:'lassi',name:'Lassi',category:'Drinks',quantity:10,expiry:'2026-08-25',location:'Refrigerator 1',priority:'Sell soon',temp:4.2,history:[4,4.2,4.4,5.5,6.1,4.6,4.2]}
];
export const alerts=[
 {id:1,group:'High priority',title:'Storage temperature warning',body:'Refrigerator temperature was high during the recent power outage. 12 products may require priority sale.',time:'2h ago',product:'milk'},
 {id:2,group:'High priority',title:'Milk needs attention',body:'Milk expires tomorrow. Prioritize this batch for sale.',time:'20m ago',product:'milk'},
 {id:3,group:'Expiring soon',title:'Curd expires soon',body:'Curd expires in 2 days. Consider placing it at the front.',time:'1h ago',product:'curd'},
 {id:4,group:'Resolved',title:'Power restored',body:'Storage temperature returned to its normal range.',time:'2h 14m ago',product:'butter'}
];
export const defaultLocations=[
 {id:'fridge-1',name:'Refrigerator 1',type:'Refrigerator',sensor:true,temperature:4.2},
 {id:'freezer',name:'Freezer',type:'Freezer',sensor:true,temperature:-18},
 {id:'shelf-1',name:'Shelf 1',type:'Shelf',sensor:false,temperature:null}
];
export const defaultCategories=['Dairy','Drinks','Frozen','Snacks','Bakery','Other'].map((name,i)=>({id:'cat-'+i,name,parentId:null,createdAt:'2026-08-20'}));
