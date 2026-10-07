"use client";
import { useState } from 'react';
import { captionStyles, captionFonts } from '../../../../server/src/customer/caption-styles';

export function CaptionGallery({select}:{select:(prompt:string)=>void}) {
  const [sample,setSample]=useState('Biến khoảnh khắc thành câu chuyện'),[filter,setFilter]=useState('Tất cả'),[animate,setAnimate]=useState(false);
  return <section className="caption-gallery">
    <p>18 mẫu chữ được phối phông, độ đậm và khoảng cách riêng: hiện đại, thanh lịch, mềm mại hoặc nổi bật. Xem trước và áp dụng trực tiếp khi dựng bằng web. App đã cài cần bản cập nhật tương thích để xuất cùng kiểu.</p>
    <label className="caption-sample-label">Thử câu của bạn<input value={sample} maxLength={90} onChange={e=>setSample(e.target.value)} placeholder="Nhập câu tiếng Việt…"/></label>
    <div className="template-filters">{['Tất cả','Chữ viền','Có nền'].map(value=><button type="button" key={value} aria-pressed={filter===value} onClick={()=>setFilter(value)}>{value}</button>)}<button type="button" aria-pressed={animate} onClick={()=>setAnimate(!animate)}>{animate?'Dừng hiệu ứng':'Xem hiệu ứng'}</button></div>
    <div className="caption-grid">{captionStyles.filter(style=>filter==='Tất cả'||(filter==='Có nền'?style.box:!style.box)).map(style=>{const font=captionFonts[style.font];return <article className="caption-card" key={style.id}>
      <div className="caption-sample-stage"><span className={'caption-sample-text '+(animate&&style.effect==='fade'?'caption-sample-fade':'')} style={{color:style.fg,background:style.box?style.bg:'transparent',fontFamily:'"'+font.family+'", sans-serif',fontWeight:font.weight,fontStyle:font.italic?'italic':'normal',fontSize:20*style.scale,letterSpacing:style.tracking+'em',WebkitTextStroke:style.box?'0':'.024em '+style.bg,paintOrder:'stroke fill',textShadow:style.box?'none':'.018em .018em 0 '+style.bg,padding:style.box?'.16em .25em':'0'}}>{sample.trim()||'Biến khoảnh khắc thành câu chuyện'}</span></div>
      <h3>{style.name}</h3><p>{font.label} · {style.box?'Nền màu':'Viền mảnh'} · {style.effect==='fade'?'Hiện / ẩn nhẹ':'Hiện ngay'}</p>
      <button type="button" className="studio-secondary" onClick={()=>select(`Tôi chọn mẫu phụ đề “${style.name}”. Hãy giữ kiểu này khi dựng video trên web: ${style.box?'nền màu':'chữ viền'}, ${style.effect==='fade'?'hiện và ẩn nhẹ':'hiện ngay'}. Phụ đề bám lời nói trong video, không tự bịa hoặc dùng câu minh họa. Trước tiên trao đổi kịch bản với tôi; chỉ dựng khi tôi yêu cầu.`)}>Chọn kiểu này</button>
    </article>;})}</div>
  </section>;
}
