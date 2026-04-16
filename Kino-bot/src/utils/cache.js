import NodeCache from 'node-cache';
// Default TTL (Time To Live): 120 seconds (2 mins)
const cache = new NodeCache({ stdTTL: 120, checkperiod: 60 });

export default cache;
