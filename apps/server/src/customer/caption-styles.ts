export const captionFonts = {
  modern: {family:'Be Vietnam Pro',file:'BeVietnamPro-Regular.ttf',weight:400,italic:false,label:'Hiện đại'},
  strong: {family:'Be Vietnam Pro',file:'BeVietnamPro-Bold.ttf',weight:700,italic:false,label:'Đậm gọn'},
  display: {family:'Barlow Condensed',file:'BarlowCondensed-Bold.ttf',weight:700,italic:false,label:'Chữ cao'},
  editorial: {family:'Judson',file:'Judson-Regular.ttf',weight:400,italic:false,label:'Thanh lịch'},
  poetic: {family:'Judson',file:'Judson-Italic.ttf',weight:400,italic:true,label:'Mềm mại'},
} as const;
// Shared, allowlisted values: the preview and ASS renderer use the same palette.
export const captionStyles = [
  {font:'editorial',scale:1.18,tracking:0.02,id:'classic',name:'Trắng điện ảnh',fg:'#FFFFFF',bg:'#111111',box:false,bold:true,effect:'cut'},
  {font:'display',scale:1.25,tracking:0.015,id:'yellow',name:'Vàng nổi bật',fg:'#FFE452',bg:'#151515',box:false,bold:true,effect:'fade'},
  {font:'strong',scale:1,tracking:0.005,id:'lime',name:'Lime năng động',fg:'#D9FF64',bg:'#101710',box:false,bold:true,effect:'cut'},
  {font:'modern',scale:1,tracking:0.025,id:'cyan',name:'Xanh công nghệ',fg:'#7DEBFF',bg:'#0B1728',box:false,bold:true,effect:'fade'},
  {font:'poetic',scale:1.22,tracking:0.01,id:'pink',name:'Hồng ngọt ngào',fg:'#FFB8D9',bg:'#281427',box:false,bold:true,effect:'fade'},
  {font:'poetic',scale:1.22,tracking:0.02,id:'lavender',name:'Tím mộng mơ',fg:'#D8C3FF',bg:'#20162E',box:false,bold:false,effect:'fade'},
  {font:'display',scale:1.25,tracking:0.015,id:'orange',name:'Cam nhiệt huyết',fg:'#FFB36A',bg:'#25150D',box:false,bold:true,effect:'cut'},
  {font:'modern',scale:1,tracking:0.015,id:'mint',name:'Mint nhẹ nhàng',fg:'#A6F0CA',bg:'#10231F',box:false,bold:false,effect:'fade'},
  {font:'strong',scale:1,tracking:0,id:'darkbox',name:'Nền đen rõ nét',fg:'#FFFFFF',bg:'#101010',box:true,bold:true,effect:'cut'},
  {font:'editorial',scale:1.18,tracking:0.015,id:'navybox',name:'Xanh đêm',fg:'#FFFFFF',bg:'#152846',box:true,bold:true,effect:'fade'},
  {font:'display',scale:1.25,tracking:0.02,id:'yellowbox',name:'Nhãn vàng',fg:'#151515',bg:'#FFE452',box:true,bold:true,effect:'cut'},
  {font:'modern',scale:1,tracking:0.005,id:'whitebox',name:'Tối giản sáng',fg:'#181818',bg:'#F5F5F0',box:true,bold:false,effect:'fade'},
  {font:'poetic',scale:1.22,tracking:0.005,id:'pinkbox',name:'Kẹo hồng',fg:'#3D1530',bg:'#FFC5DE',box:true,bold:true,effect:'fade'},
  {font:'display',scale:1.25,tracking:0.02,id:'purplebox',name:'Tím sáng tạo',fg:'#FFFFFF',bg:'#6331A1',box:true,bold:true,effect:'cut'},
  {font:'editorial',scale:1.18,tracking:0.015,id:'greenbox',name:'Xanh thiên nhiên',fg:'#FFFFFF',bg:'#19553C',box:true,bold:true,effect:'fade'},
  {font:'strong',scale:1,tracking:0.005,id:'redbox',name:'Đỏ thông điệp',fg:'#FFFFFF',bg:'#AF263A',box:true,bold:true,effect:'cut'},
  {font:'poetic',scale:1.22,tracking:0.02,id:'cream',name:'Kem cổ điển',fg:'#FFF1CE',bg:'#37271B',box:false,bold:false,effect:'fade'},
  {font:'modern',scale:1,tracking:0.01,id:'icebox',name:'Băng xanh',fg:'#102536',bg:'#BEEFFF',box:true,bold:true,effect:'fade'},
] as const;
export type CaptionStyleId = typeof captionStyles[number]['id'];
export function captionStyle(id?: string) {return captionStyles.find(s=>s.id===id) || captionStyles[0];}
export function selectedCaptionStyle(text:string):CaptionStyleId|undefined {
  const matches=[...text.matchAll(/\[caption-style:([a-z]+)\]|mẫu phụ đề “([^”]+)”/gi)];
  return matches.reverse().map(m=>captionStyles.find(s=>s.id===m[1]||s.name===m[2])?.id).find(Boolean);
}
function assColor(hex:string) {return '&H00'+hex.slice(5,7)+hex.slice(3,5)+hex.slice(1,3);}
export function styleCaptionDocument(document:string,id?:CaptionStyleId) {
  if(!id)return document;
  const style=captionStyle(id),font=captionFonts[style.font];
  return document.split('\n').map(line=>{
    if(line.startsWith('Style: Title,')){const fields=line.split(',');fields[1]=captionFonts.strong.family;fields[16]=String(Number(fields[2])*.025);fields[17]='0';return fields.join(',');}
    if(line.startsWith('Style: Caption,')) {
      const fields=line.split(',');const size=Number(fields[2])*style.scale;fields[1]=font.family;fields[2]=String(size);fields[8]=font.italic?'-1':'0';fields[13]=String(size*style.tracking);fields[3]=assColor(style.fg);fields[5]=assColor(style.bg);fields[6]=assColor(style.bg);fields[7]=font.weight===700?'-1':'0';fields[15]=style.box?'3':'1';fields[16]=String(size*(style.box?.16:.024));fields[17]=style.box?'0':String(size*.018);return fields.join(',');
    }
    if(style.effect==='fade' && line.startsWith('Dialogue:') && line.includes(',Caption,,'))return line.replace(',,0,0,0,,',',,0,0,0,,{\\fad(120,80)}');
    return line;
  }).join('\n');
}
