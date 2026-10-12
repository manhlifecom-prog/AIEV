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

export const socialPresets = [
 {id:'social-gauge',scene:0,name:'Đồng hồ tăng trưởng',description:'Kim chuyển động, vòng chia vạch và chữ nhấn'},
 {id:'social-iceberg',scene:1,name:'Tảng băng kiến thức',description:'Sơ đồ phân tầng, đường nối và thẻ chú thích'},
 {id:'social-receipt',scene:2,name:'Hóa đơn nội dung',description:'Giấy cuộn xuất hiện, từng ý hiện lần lượt'},
 {id:'social-phone',scene:3,name:'Điện thoại sáng tạo',description:'Khung điện thoại, timeline và sóng âm minh họa'},
 {id:'social-checklist',scene:4,name:'Checklist hành động',description:'Đồng hồ và các bước được đánh dấu'},
 {id:'social-callout',scene:5,name:'Chữ nổi kết nối',description:'Chữ gradient bật lên, icon hội thoại'},
] as const;
export const socialPreset=(id?:string)=>socialPresets.find(p=>p.id===id);
export const storyPresets = [
 {id:'story-quote',name:'Trích dẫn Ivory',layout:'quote',bg:'#F1EADC',ink:'#24382E',accent:'#597B51',heading:'Hiểu sâu bắt đầu từ một câu hỏi',points:['Chậm lại một nhịp','Hỏi đúng trọng tâm','Tự mình tìm lời giải'],description:'Khung trích dẫn lớn, chữ xanh trên nền giấy'},
 {id:'story-steps',name:'Ba bước Blueprint',layout:'steps',bg:'#10264D',ink:'#ECF5FF',accent:'#76D9FF',heading:'Biến ý tưởng thành hành động',points:['Xác định mục tiêu','Chọn một việc nhỏ','Thực hiện hôm nay'],description:'Sơ đồ ba bước nối nhau, icon xuất hiện theo nhịp'},
 {id:'story-compare',name:'So sánh Split',layout:'compare',bg:'#151C24',ink:'#F1F5F8',accent:'#B4ED9A',heading:'Cùng một việc, hai cách tiếp cận',points:['Làm thật nhiều','Chọn việc quan trọng','Chạy theo lịch','Giữ thời gian tập trung'],description:'Hai cột đối chiếu, thẻ màu và đường phân chia'},
 {id:'story-data',name:'Dữ liệu Dashboard',layout:'data',bg:'#082E32',ink:'#E7FFF5',accent:'#71E2B3',heading:'Để dữ liệu kể câu chuyện',points:['Quan sát','Đối chiếu','Rút ra bài học'],description:'Biểu đồ chuyển động và thẻ chỉ số; không tự bịa số liệu'},
 {id:'story-fact',name:'Góc nhìn Myth / Fact',layout:'fact',bg:'#F9EEE8',ink:'#422332',accent:'#BA3968',heading:'Thử nhìn theo một cách khác',points:['Học nhiều là nhớ lâu','Hiểu và ôn mới giúp nhớ'],description:'Thẻ hiểu lầm và góc nhìn mới, dấu X và dấu kiểm'},
 {id:'story-timeline',name:'Hành trình Timeline',layout:'timeline',bg:'#241C38',ink:'#F8F0FF',accent:'#C3A1FF',heading:'Mỗi bước nhỏ đều đáng kể',points:['Bắt đầu','Thực hành','Điều chỉnh','Tiến bộ'],description:'Đường thời gian vẽ dần, các mốc sáng lần lượt'},
 {id:'story-tips',name:'Mẹo nhanh Sticky',layout:'tips',bg:'#EEE8D4',ink:'#303B2B',accent:'#596B32',heading:'Một thay đổi nhỏ mỗi ngày',points:['Đặt một câu hỏi','Ghi một điều mới','Thử một cách khác'],description:'Giấy ghi chú xếp lớp, băng dính và nét bút'},
 {id:'story-coaching',name:'Lời mời Coaching',layout:'coaching',bg:'#201C1B',ink:'#FFF1DC',accent:'#E6BC77',heading:'Dành thời gian cho điều quan trọng',points:['Nhìn rõ vấn đề','Cùng tìm hướng đi','Bắt đầu cuộc trò chuyện'],description:'Vòng sáng chân dung, thẻ lợi ích và lời mời tinh tế'},
] as const;
export const storyPreset=(id?:string)=>storyPresets.find(p=>p.id===id);
export const textEffects = [
 ...storyPresets.map(p=>({id:p.id,name:p.name,kind:'story' as const,font:'strong' as const,accent:p.accent,ink:p.ink,description:p.description,sample:p.heading})),
 ...socialPresets.map(p=>({id:p.id,name:p.name,kind:'infographic' as const,font:'strong' as const,accent:'#FF91CC',ink:'#FFF2FA',description:p.description,sample:p.name})),
 {id:'social-infographic',name:'Social Magenta · Infographic',kind:'infographic',font:'strong',accent:'#FF91CC',ink:'#FFF2FA',description:'Chữ đậm, đồng hồ chuyển động và sơ đồ tảng băng',sample:'Biến ý tưởng thành giá trị'},
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
