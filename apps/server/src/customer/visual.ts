import { CustomerError } from './store.js';
import type { VisualFrame } from './edit-quality.js';

export function validateVisualFrames(value: unknown, duration: number): VisualFrame[] {
  if (value === undefined) return []; // Older desktop clients remain compatible.
  if (!Array.isArray(value) || !value.length || value.length > 24) throw new CustomerError(400, 'Ảnh phân tích không hợp lệ');
  return value.map(frame => {
    if (!frame || !Number.isFinite(frame.time) || frame.time < 0 || frame.time >= duration || typeof frame.image !== 'string' || frame.image.length > 39000 || !/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(frame.image)) throw new CustomerError(400, 'Ảnh phân tích không hợp lệ');
    const bytes=Buffer.from(frame.image.slice(23),'base64');
    if(bytes.length<100 || bytes.length>28*1024 || bytes[0]!==255 || bytes[1]!==216 || bytes.at(-2)!==255 || bytes.at(-1)!==217) throw new CustomerError(400,'Ảnh phân tích phải là JPEG thu nhỏ');
    let found=false;
    for(let at=2;at+8<bytes.length;) {
      if(bytes[at]!==255) break;
      const marker=bytes[at+1],length=bytes.readUInt16BE(at+2);
      if(length<2 || at+length+2>bytes.length) break;
      if([192,193,194].includes(marker)) {
        const height=bytes.readUInt16BE(at+5),width=bytes.readUInt16BE(at+7);
        found=height>0&&width>0&&height<=512&&width<=512;break;
      }
      at+=length+2;
    }
    if(!found)throw new CustomerError(400,'Kích thước ảnh phân tích không hợp lệ');
    return {time:frame.time,image:frame.image};
  });
}
