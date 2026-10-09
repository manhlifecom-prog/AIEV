const fs=require('node:fs');
const {Readable}=require('node:stream');
const {randomBytes}=require('node:crypto');
const {ORIGIN}=require('./policy.cjs');

// Only short-lived, account-bound capabilities expose known generated MP4s.
function createPreviewHandler({account,resolve,now=Date.now}) {
  const grants=new Map();
  return {
    async issue(id) {
      const user=await account(),media=await resolve(id,user.id);
      const token=randomBytes(24).toString('hex');
      for(const [key,value] of grants)if(value.expires<now())grants.delete(key);
      if(grants.size>=128)grants.delete(grants.keys().next().value);
      grants.set(token,{id,file:media.file,owner:user.id,expires:now()+8*60*60*1000});
      return {url:`aiev-media://video/${token}`,preview:media.preview,story:media.story};
    },
    async handle(request) {
      const url=new URL(request.url),grant=grants.get(url.pathname.slice(1));
      if(url.hostname!=='video'||url.search||!grant||grant.expires<now()||!['GET','HEAD'].includes(request.method))return new Response(null,{status:403});
      if(request.headers.get('Origin') && request.headers.get('Origin')!==ORIGIN)return new Response(null,{status:403});
      try {
        if((await account()).id!==grant.owner)return new Response(null,{status:403});
        await resolve(grant.id,grant.owner);const size=fs.statSync(grant.file).size;
        const headers={'Content-Type':'video/mp4','Accept-Ranges':'bytes','Cache-Control':'no-store','Access-Control-Allow-Origin':ORIGIN};
        const range=request.headers.get('Range');let start=0,end=size-1,status=200;
        if(range) {
          const match=/^bytes=(\d*)-(\d*)$/.exec(range);
          if(!match || (!match[1]&&!match[2]))return new Response(null,{status:416,headers:{...headers,'Content-Range':`bytes */${size}`}});
          start=match[1]?Number(match[1]):Math.max(0,size-Number(match[2]));end=match[1]&&match[2]?Math.min(size-1,Number(match[2])):size-1;
          if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||start>end||start>=size)return new Response(null,{status:416,headers:{...headers,'Content-Range':`bytes */${size}`}});
          status=206;headers['Content-Range']=`bytes ${start}-${end}/${size}`;
        }
        headers['Content-Length']=String(end-start+1);
        return new Response(request.method==='HEAD'?null:Readable.toWeb(fs.createReadStream(grant.file,{start,end})),{status,headers});
      } catch {return new Response(null,{status:404});}
    }
  };
}
module.exports={createPreviewHandler};
