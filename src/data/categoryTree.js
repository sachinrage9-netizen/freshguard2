export const childrenOf=(categories,parentId)=>categories.filter(c=>(c.parentId||null)===(parentId||null));
export const descendants=(categories,id)=>{const direct=childrenOf(categories,id);return [id,...direct.flatMap(x=>descendants(categories,x.id))]};
export const pathFor=(categories,id)=>{const node=categories.find(c=>c.id===id);return node?[...pathFor(categories,node.parentId),node.name]:[]};
export const topFor=(categories,id)=>{let n=categories.find(c=>c.id===id);while(n?.parentId)n=categories.find(c=>c.id===n.parentId);return n?.id||''};
