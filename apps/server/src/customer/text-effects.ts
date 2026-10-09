export const expertPresets=[
 {id:'expert-note',name:'Sổ tay chuyên gia',layout:'note',bg:'#F2EBDD',ink:'#243B32',accent:'#426F58',font:'editorial',speaker:'vinh',heading:'Suy luận ngược',subtitle:'Bắt đầu từ điều cần chứng minh',points:['Điều cần chứng minh','Các yếu tố cần có','Tiếp tục suy luận']},
 {id:'expert-quote',name:'Trích dẫn điện ảnh',layout:'quote',bg:'#172132',ink:'#F7F0E1',accent:'#D9BD82',font:'poetic',speaker:'vinh',heading:'Sơ đồ tư duy ngược',subtitle:'Một cách tiếp cận bài toán hình',points:['Đặt câu hỏi','Tìm điều kiện','Kết nối lập luận']},
 {id:'expert-map',name:'Sơ đồ kiến thức',layout:'map',bg:'#0B282B',ink:'#E2F8EB',accent:'#9FEDD8',font:'strong',speaker:'vinh',heading:'Từ đích đến cách giải',subtitle:'Nhìn bài toán theo từng mắt xích',points:['Cần chứng minh gì?','Cần những yếu tố nào?','Suy luận ngược']},
 {id:'expert-paper',name:'Bài học tinh gọn',layout:'note',bg:'#F6F1E7',ink:'#352D38',accent:'#976548',font:'editorial',speaker:'thanh',heading:'Học để hiểu sâu',subtitle:'Phương pháp Feynman',points:['Hiểu bản chất','Diễn đạt được','Vận dụng được']},
 {id:'expert-spotlight',name:'Điểm nhấn diễn giả',layout:'quote',bg:'#281A2D',ink:'#FFF1E7',accent:'#F0BCA4',font:'poetic',speaker:'thanh',heading:'Giảng lại cho người khác',subtitle:'Từ học thuộc đến hiểu bản chất',points:['Giảng lại','Người nghe hiểu','Nắm kiến thức sâu']},
 {id:'expert-path',name:'Lộ trình học hiểu',layout:'map',bg:'#112747',ink:'#F0F6FF',accent:'#A8CFFF',font:'strong',speaker:'thanh',heading:'Hiểu • Diễn đạt • Vận dụng',subtitle:'Ba điểm nhấn trong lời chia sẻ',points:['Hiểu bản chất','Diễn đạt được','Vận dụng được']},
] as const;
export type ExpertPresetId=typeof expertPresets[number]['id'];
export const expertPreset=(id?:string)=>expertPresets.find(p=>p.id===id);

export const textEffects = [
 ...expertPresets.map(p=>({id:p.id,name:p.name,kind:'expert' as const,font:p.font,accent:p.accent,ink:p.ink,description:p.subtitle,sample:p.heading})),
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
