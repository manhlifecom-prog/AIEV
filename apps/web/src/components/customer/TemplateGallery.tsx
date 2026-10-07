"use client";
import {CaptionGallery} from './CaptionGallery';
import { useEffect, useState, type CSSProperties } from 'react';
import { Play, Pause, Captions, Type, Scissors } from 'lucide-react';

export const videoTemplates = [
  {id:'product',name:'Sản phẩm nổi bật',category:'Bán hàng',ratio:'9:16',seconds:30,color:'#d9ff64',headline:'Điều gì làm nên khác biệt?',beats:['Vấn đề của khách','Cận cảnh sản phẩm','Lợi ích + lời mời'],brief:'Video giới thiệu sản phẩm 30 giây, dọc 9:16. Mở bằng vấn đề của khách, chọn cận cảnh sản phẩm và lợi ích có trong nguồn, kết thúc bằng lời mời hành động. Nhịp gọn, tiêu đề ngắn; không tự bịa công dụng.'},
  {id:'vlog',name:'Một ngày của bạn',category:'Đời sống',ratio:'9:16',seconds:60,color:'#ffce96',headline:'Một ngày đáng nhớ',beats:['Khoảnh khắc nổi bật','Hành trình trong ngày','Cảm xúc cuối ngày'],brief:'Daily vlog 60 giây, dọc 9:16. Mở bằng khoảnh khắc cuốn hút, nối các cảnh thành câu chuyện tự nhiên, giữ âm thanh và lời thoại quan trọng, kết thúc có cảm xúc.'},
  {id:'review',name:'Review chân thật',category:'Bán hàng',ratio:'9:16',seconds:60,color:'#bda8ff',headline:'Có đáng để thử?',beats:['Câu hỏi mở đầu','Trải nghiệm thực tế','Kết luận rõ ràng'],brief:'Video review 60 giây, dọc 9:16. Mở bằng câu hỏi có đáng thử, trình bày trải nghiệm và ưu nhược điểm được xác nhận, kết luận rõ ràng. Giữ lời thoại gốc, thêm phụ đề nếu có lời nói; không bịa trải nghiệm.'},
  {id:'tutorial',name:'Hướng dẫn từng bước',category:'Kiến thức',ratio:'16:9',seconds:90,color:'#79d9e8',headline:'Làm được ngay hôm nay',beats:['Kết quả cuối cùng','Các bước thực hiện','Nhắc lại điểm chính'],brief:'Video hướng dẫn 90 giây, ngang 16:9. Cho thấy kết quả trước, sắp xếp các bước dễ hiểu, giữ đủ thời gian xem thao tác, tiêu đề từng bước ngắn và phụ đề lời thoại gốc.'},
  {id:'property',name:'Khám phá không gian',category:'Bán hàng',ratio:'9:16',seconds:45,color:'#a8d5bc',headline:'Không gian dành cho bạn',beats:['Góc toàn cảnh','Chi tiết nổi bật','Lời mời khám phá'],brief:'Video bất động sản hoặc không gian 45 giây, dọc 9:16. Mở bằng góc toàn đẹp, đi qua các khu vực theo trình tự hợp lý, nhấn chi tiết nổi bật, kết thúc lời mời liên hệ. Không bịa giá, diện tích hay địa chỉ.'},
  {id:'story',name:'Kể một câu chuyện',category:'Đời sống',ratio:'9:16',seconds:60,color:'#ffaabf',headline:'Và rồi mọi thứ thay đổi…',beats:['Tình huống mở đầu','Bước ngoặt','Điều đọng lại'],brief:'Video kể chuyện 60 giây, dọc 9:16. Có mở đầu, diễn biến và kết thúc; chọn cảnh phù hợp nội dung đã thống nhất, giữ lời thoại quan trọng, điều chỉnh nhịp để người xem theo dõi dễ dàng.'},
] as const;

const sampleLines: Record<string,string[]> = {
  product:['Bạn cần một lựa chọn tốt hơn?','Nhìn gần để thấy sự khác biệt','Khám phá sản phẩm dành cho bạn'],
  vlog:['Một buổi sáng thật nhẹ nhàng','Đi qua những điều nhỏ xinh','Và giữ lại một ngày đáng nhớ'],
  review:['Món này có thật sự đáng thử?','Đây là điều mình thích nhất','Còn bạn, bạn nghĩ sao?'],
  tutorial:['Cùng làm theo từng bước nhé','Chậm lại ở phần quan trọng này','Bạn đã sẵn sàng tự làm rồi'],
  property:['Mở cửa một không gian mới','Ánh sáng len vào từng góc nhỏ','Một nơi để bắt đầu câu chuyện'],
  story:['Mọi chuyện bắt đầu từ hôm ấy','Một khoảnh khắc làm thay đổi tất cả','Và đây là điều mình giữ lại'],
};
type Template = typeof videoTemplates[number];
function TemplatePreview({item}:{item:Template}) {
  const [playing,setPlaying]=useState(false),[frame,setFrame]=useState(0);
  useEffect(()=>{if(!playing)return;const timer=window.setInterval(()=>setFrame(value=>(value+1)%90),100);return()=>window.clearInterval(timer);},[playing]);
  const scene=Math.floor(frame/30),line=sampleLines[item.id][scene];
  return <div className={'template-preview '+(item.ratio==='16:9'?'is-landscape':'')} style={{'--template-accent':item.color} as CSSProperties}>
    <div className={'template-stage scene-'+scene} aria-label={'Minh họa '+item.name}>
      <svg className="template-scenery" viewBox="0 0 360 640" aria-hidden="true" preserveAspectRatio="xMidYMid slice">
        <rect width="360" height="640" fill={['#17252d','#283334','#202130'][scene]}/><circle cx={290-scene*70} cy="165" r="125" fill={item.color} opacity=".16"/>
        <path d="M0 470 L170 290 L360 410 V640 H0Z" fill={item.color} opacity=".18"/><path d="M0 520 L240 350 L360 480 V640 H0Z" fill={item.color} opacity=".25"/>
        {item.id==='property'?<g fill="none" stroke={item.color} strokeWidth="5"><path d="M70 400V210L180 140L290 210V400Z"/><path d="M145 400V280H215V400M100 225H135V265H100ZM230 225H265V265H230Z"/></g>:item.id==='product'||item.id==='review'?<g><rect x="116" y="230" width="128" height="174" rx="20" fill={item.color}/><rect x="142" y="202" width="76" height="32" rx="8" fill="#ecf3f0"/><rect x="135" y="285" width="90" height="64" rx="8" fill="#20252d"/><path d="M167 316L178 327L199 302" fill="none" stroke={item.color} strokeWidth="6"/></g>:<g fill="none" stroke={item.color} strokeWidth="5"><rect x="76" y="224" width="208" height="142" rx="16"/><path d="M165 258L211 295L165 333Z" fill={item.color}/><path d="M115 400H245M145 423H215"/></g>}
        <path d="M24 80V45H59M301 45H336V80M24 530V565H59M301 565H336V530" stroke="white" opacity=".35" fill="none" strokeWidth="2"/>
      </svg>
      <span className="template-demo-label">MINH HỌA · {item.ratio}</span>
      <div className="template-on-video-title">{scene===0?item.headline:item.beats[scene]}</div>
      <div className="template-on-video-sub" key={scene}>{line}</div>
      <span className="template-scene-tag">CẢNH {scene+1}/3 · {scene===1?'CẬN CẢNH':scene===2?'KẾT THÚC':'MỞ ĐẦU'}</span>
    </div>
    <div className="template-player"><button type="button" aria-label={(playing?'Tạm dừng mẫu ':'Xem mẫu ')+item.name} onClick={()=>setPlaying(!playing)}>{playing?<Pause size={16}/>:<Play size={16}/>} {playing?'Tạm dừng':'Xem mẫu'}</button><span>{(frame/10).toFixed(1)} / 9 giây</span></div>
    <div className="template-progress" role="progressbar" aria-label="Tiến độ minh họa" aria-valuemin={0} aria-valuemax={90} aria-valuenow={frame}><i style={{width:(frame/90*100)+'%'}}/></div>
    <div className="template-effects"><span><Captions size={13}/>Phụ đề</span><span><Type size={13}/>Tiêu đề</span><span><Scissors size={13}/>Cắt cảnh</span></div>
  </div>;
}

export function TemplateGallery({select}:{select:(prompt:string)=>void}) {
  const [category,setCategory]=useState('Tất cả');
  const [tab,setTab]=useState<'video'|'sub'>('sub');
  return <section className="studio-templates" aria-label="Thư viện mẫu video">
    <div className="template-filters" aria-label="Loại mẫu"><button type="button" aria-pressed={tab==='sub'} onClick={()=>setTab('sub')}>Mẫu phụ đề · 18</button><button type="button" aria-pressed={tab==='video'} onClick={()=>setTab('video')}>Mẫu video · 6</button></div>
    {tab==='sub'?<CaptionGallery select={select}/>:<>
    <p>Bấm Xem mẫu để xem phụ đề, chữ tiêu đề và nhịp cắt 3 cảnh. Hình và lời thoại là minh họa; video thật dùng nguồn của bạn.</p>
    <div className="template-filters" aria-label="Lọc mẫu">{['Tất cả','Bán hàng','Đời sống','Kiến thức'].map(item=><button key={item} type="button" aria-pressed={category===item} onClick={()=>setCategory(item)}>{item}</button>)}</div>
    <div className="template-grid">{videoTemplates.filter(item=>category==='Tất cả'||item.category===category).map(item=><article key={item.id} className="template-card">
      <TemplatePreview item={item}/>
      <h3>{item.name}</h3><p>{item.category} · Có thể tùy chỉnh</p>
      <button type="button" className="studio-primary" onClick={()=>select(`Tôi chọn mẫu “${item.name}”. ${item.brief} Hiển thị tiêu đề mở đầu ngắn, phụ đề tiếng Việt nếu lời thoại gốc là tiếng Việt (giữ nguyên ngôn ngữ nếu khác), cắt cảnh từ toàn đến cận và kết thúc theo bố cục mẫu. Phụ đề phải bám lời nói thật, không dùng câu minh họa trong mẫu. Trước tiên hãy cùng tôi lên kịch bản; chưa bắt đầu dựng. Nếu chưa rõ sản phẩm hoặc chủ đề, hỏi tôi một câu cần thiết.`)}>Dùng mẫu này</button>
    </article>)}</div></>}
  </section>;
}
