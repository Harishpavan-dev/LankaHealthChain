/** Exercise actual PostgreSQL owner isolation. Requires four live demo DBs.
 * Do not call with real healthcare infrastructure or print connection URLs.
 */
import 'dotenv/config';
import { Client } from 'pg';
const specs=[
  ['core','DATABASE_URL','lankahealthchain_core'],
  ['northern','HOSPITAL_NORTHERN_DATABASE_URL','hospital_northern'],
  ['jaffna','HOSPITAL_JAFFNA_DATABASE_URL','hospital_jaffna'],
  ['venus','HOSPITAL_VENUS_DATABASE_URL','hospital_venus'],
] as const;
async function canConnect(connectionString:string):Promise<boolean>{
  const client=new Client({connectionString,connectionTimeoutMillis:4000});
  try{await client.connect();await client.query('SELECT 1');return true;}
  catch{return false;}
  finally{await client.end().catch(()=>{});}
}
async function main(){
  const urls=specs.map(([name,key,database])=>{
    const value=process.env[key];
    if(!value)throw new Error(`Missing ${key} (never print connection credentials)`);
    const url=new URL(value);
    if(url.pathname.slice(1)!==database)throw new Error(`Unexpected database name for ${name}`);
    return url;
  });
  for(let i=0;i<specs.length;i++){
    if(!await canConnect(urls[i].toString()))throw new Error(`Owner cannot connect to ${specs[i][0]} database`);
    console.log(`PASS: ${specs[i][0]} database owner can connect to its own database`);
    for(let j=0;j<specs.length;j++){
      if(j===i)continue;
      const other=new URL(urls[i].toString());
      other.pathname=urls[j].pathname;
      if(await canConnect(other.toString()))throw new Error(`ISOLATION FAILURE: ${specs[i][0]} role can connect to ${specs[j][0]} database`);
    }
    console.log(`PASS: ${specs[i][0]} database owner denied access to other three databases`);
  }
  console.log('PASS: 4 owner connections and 12 prohibited cross-database connections verified');
}
main().catch(e=>{console.error('DB isolation check failed:',e.message);process.exitCode=1;});
