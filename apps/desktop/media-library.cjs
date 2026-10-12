const fs = require('node:fs');
const path = require('node:path');
const {createHash, randomUUID} = require('node:crypto');
const {pipeline} = require('node:stream/promises');
const VIDEO = new Set(['.mp4','.mov','.m4v','.mkv','.webm','.avi','.mts','.m2ts']);
const folded = value => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').toLowerCase();
const inside = (root, file) => { const relative=path.relative(root,file); return relative!=='' && !relative.startsWith('..'+path.sep) && relative!=='..' && !path.isAbsolute(relative); };

// Paths never cross the native bridge. A grant is created only after an OS
// picker; each account has its own grants and opaque file identifiers.
class MediaLibrary {
  constructor(directory) {
    fs.mkdirSync(directory,{recursive:true});
    this.manifest=path.join(directory,'media-grants.json'); this.index=new Map();
    try {this.grants=JSON.parse(fs.readFileSync(this.manifest,'utf8'));} catch {this.grants={};}
  }
  persist() {
    const temporary=this.manifest+'.tmp';
    fs.writeFileSync(temporary,JSON.stringify(this.grants),{mode:0o600}); fs.renameSync(temporary,this.manifest);
  }
  async grant(owner, files, folder) {
    if(!owner || !Array.isArray(files) || !files.length)throw Error('Chưa chọn nguồn video');
    const additions=[];
    for(const file of files) {
      const canonical=await fs.promises.realpath(file), stat=await fs.promises.stat(canonical);
      if(folder ? !stat.isDirectory() : !stat.isFile() || !VIDEO.has(path.extname(canonical).toLowerCase()))throw Error('Nguồn không phải video hoặc thư mục video');
      additions.push({id:randomUUID(),path:canonical,folder:Boolean(folder),name:path.basename(canonical)});
    }
    const existing=this.grants[owner] || [];
    this.grants[owner]=[...existing,...additions.filter(a=>!existing.some(b=>b.path===a.path && b.folder===a.folder))];
    this.persist(); return this.scan(owner);
  }
  async revoke(owner) {delete this.grants[owner];this.index.delete(owner);this.persist();return this.scan(owner);}
  async scan(owner) {
    const entries=new Map(), roots=this.grants[owner] || [];
    let visited=0, truncated=false;const unavailable=[];
    const add=async(grant,file,relative)=>{
      if(entries.size>=2000){truncated=true;return;}
      try {
        const stat=await fs.promises.lstat(file);
        if(stat.isSymbolicLink() || !stat.isFile() || !VIDEO.has(path.extname(file).toLowerCase()) || stat.size<100)return;
        const actual=await fs.promises.realpath(file);
        if(actual!==file || (grant.folder && !inside(grant.path,actual)))return;
        const id=createHash('sha256').update(owner+'\0'+grant.id+'\0'+relative).digest('hex').slice(0,32);
        entries.set(id,{id,name:relative.split(path.sep).join('/'),bytes:stat.size,modified:stat.mtimeMs,file,grant,ino:stat.ino,dev:stat.dev});
      } catch { /* An unreadable file does not grant access to anything else. */ }
    };
    const walk=async(grant,directory)=>{
      if(++visited>10000 || entries.size>=2000){truncated=true;return;}
      const children=await fs.promises.readdir(directory,{withFileTypes:true});
      children.sort((a,b)=>a.name.localeCompare(b.name));
      for(const child of children) {
        if(child.isSymbolicLink() || child.name.startsWith('.') || ['$RECYCLE.BIN','node_modules'].includes(child.name))continue;
        const file=path.join(directory,child.name);
        if(child.isDirectory()) {try {await walk(grant,file);}catch { /* Skip denied subdirectories. */ }}
        else if(child.isFile())await add(grant,file,path.relative(grant.path,file));
        if(truncated)break;
      }
    };
    for(const grant of roots) {
      try {
        if(await fs.promises.realpath(grant.path)!==grant.path)throw Error('Nguồn đã đổi đường dẫn');
        if(grant.folder)await walk(grant,grant.path);else await add(grant,grant.path,path.basename(grant.path));
      } catch {unavailable.push(grant.name);}
    }
    this.index.set(owner,entries);
    return {grants:roots.map(g=>({id:g.id,name:g.name,folder:g.folder})),total:entries.size,truncated,unavailable,files:[...entries.values()].sort((a,b)=>b.modified-a.modified).slice(0,200).map(this.publicFile)};
  }
  publicFile(file) {return {id:file.id,name:file.name.replace(/[\x00-\x1f]/g,' ').slice(-500).trim(),bytes:file.bytes};}
  context(owner,message) {
    const entries=[...(this.index.get(owner)?.values() || [])];
    if(!entries.length)return null;
    const terms=folded(message).split(/[^a-z0-9]+/).filter(term=>term.length>2);
    const score=file=>terms.reduce((n,term)=>n+(folded(file.name).includes(term)?1:0),0);
    entries.sort((a,b)=>score(b)-score(a) || b.modified-a.modified);
    return {total:entries.length,files:entries.slice(0,200).map(this.publicFile)};
  }
  async copy(owner,id,destination) {
    const entry=this.index.get(owner)?.get(id);
    if(!entry)throw Error('Video không thuộc nguồn đã cấp quyền. Chọn lại thư mục hoặc làm mới danh sách.');
    const {file,grant}=entry;
    if(await fs.promises.realpath(grant.path)!==grant.path || await fs.promises.realpath(file)!==file || (grant.folder && !inside(grant.path,file)))throw Error('Đường dẫn nguồn đã thay đổi; hãy cấp quyền lại.');
    const before=await fs.promises.lstat(file);
    if(before.isSymbolicLink() || !before.isFile())throw Error('Nguồn không còn là video được cấp quyền');
    const handle=await fs.promises.open(file,fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0));
    try {
      const actual=await handle.stat();
      if(!actual.isFile() || actual.ino!==entry.ino || actual.dev!==entry.dev)throw Error('Video đã thay đổi; hãy làm mới nguồn trước khi dựng.');
      await pipeline(handle.createReadStream({autoClose:false}),fs.createWriteStream(destination,{flags:'wx'}));
    } finally {await handle.close();}
    return this.publicFile(entry);
  }
}
module.exports={MediaLibrary};
