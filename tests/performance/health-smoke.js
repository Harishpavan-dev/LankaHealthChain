// k6: SAFE LOCAL SMOKE ONLY, never point at a third-party hostname.
import http from 'k6/http';
import {check,sleep} from 'k6';
export const options={vus:2,duration:'15s',thresholds:{http_req_failed:['rate<0.05']}};
export default function(){
 const response=http.get('http://127.0.0.1:3000/api/v1/health',{timeout:'5s'});
 check(response,{'healthy demo API':r=>r.status===200});
 sleep(1);
}
