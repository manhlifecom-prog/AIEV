export const textEffects = [
 {id:'coffee-editorial',name:'Editorial · Chữ & icon',kind:'editorial',font:'editorial',accent:'#D5E6A6',ink:'#F7EFDB',description:'Bố cục tạp chí, icon và thẻ hành trình',sample:'Chậm lại để tận hưởng'},
 {id:'word-highlight',name:'Karaoke Neon',kind:'highlight',font:'strong',accent:'#D9FF64',ink:'#FFFFFF',description:'Tô màu từng từ theo lời nói',sample:'Ý tưởng nhỏ tạo nên khác biệt'},
 {id:'popping-word',name:'Pop theo nhịp',kind:'pop',font:'strong',accent:'#FFCB6B',ink:'#FFFFFF',description:'Từng từ bật lên và trở về vị trí',sample:'Một khoảnh khắc thật đáng nhớ'},
 {id:'typewriter',name:'Máy chữ',kind:'type',font:'modern',accent:'#72E5D3',ink:'#FFFFFF',description:'Gõ từng ký tự với con trỏ sáng',sample:'Câu chuyện của bạn bắt đầu ở đây'},
 {id:'slide-up',name:'Reveal thanh lịch',kind:'rise',font:'editorial',accent:'#F3D8B3',ink:'#FFF6E8',description:'Chữ trượt lên mềm mại, lần lượt từng từ',sample:'Giữ lại những điều đẹp nhất'},
 {id:'text-marker',name:'Bút đánh dấu',kind:'marker',font:'strong',accent:'#D9FF64',ink:'#FFFFFF',description:'Vệt màu quét qua từ đang nói',sample:'Điểm khác biệt nằm ở chi tiết'},
 {id:'circle-marker',name:'Khoanh điểm nhấn',kind:'circle',font:'editorial',accent:'#FFBBA4',ink:'#FFF5EB',description:'Nét vẽ chạy quanh từ được nhấn mạnh',sample:'Điều đáng nhớ là cảm xúc'},
 {id:'cinematic',name:'Chữ điện ảnh',kind:'cinema',font:'poetic',accent:'#E9D4B2',ink:'#FFF5E5',description:'Chữ giãn nhẹ và hiện dần đầy cảm xúc',sample:'Những ngày mình còn bên nhau'},
 {id:'glitch',name:'Digital Glitch',kind:'glitch',font:'display',accent:'#7CEAFF',ink:'#FFFFFF',description:'Tách màu ngắn khi chữ xuất hiện',sample:'Sẵn sàng cho một khởi đầu mới'},
 {id:'pop-pink',name:'Pop Candy',kind:'pop',font:'strong',accent:'#FF98CB',ink:'#FFFFFF',description:'Chữ bật nhịp hồng nổi bật',sample:'Thêm một chút vui vào hôm nay'},
 {id:'marker-blue',name:'Blue Highlight',kind:'marker',font:'modern',accent:'#8FC2FF',ink:'#FFFFFF',description:'Nhãn xanh chạy theo lời thoại',sample:'Biến kiến thức thành hành động'},
 {id:'reveal-mint',name:'Mint Flow',kind:'rise',font:'modern',accent:'#9FF3CE',ink:'#DFFFF0',description:'Từng từ hiện lên gọn và nhẹ',sample:'Chậm lại để thấy mình đang sống'},
 {id:'karaoke-gold',name:'Karaoke Gold',kind:'highlight',font:'display',accent:'#FFC85A',ink:'#FFFFFF',description:'Nhịp phụ đề vàng cho video ngắn',sample:'Hôm nay là ngày để bắt đầu'},
] as const;
export type TextEffectId=typeof textEffects[number]['id'];
export const getTextEffect=(id?:string)=>textEffects.find(x=>x.id===id);
export function selectedTextEffect(text:string):TextEffectId|undefined {return [...text.matchAll(/\[text-effect:([a-z-]+)\]/g)].reverse().map(x=>getTextEffect(x[1])?.id).find(Boolean);}
