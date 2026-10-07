"use client";
import { useState } from 'react';
import { captionStyles } from '../../../../server/src/customer/caption-styles';

export function CaptionGallery({select}:{select:(prompt:string)=>void}) {
  const [sample,setSample]=useState('Biến khoảnh khắc thành câu chuyện'),[filter,setFilter]=useState('Tất cả'),[animate,setAnimate]=useState(false);
  return <section className="caption-gallery">
    <p>18 kiểu phụ đề có xem trước. Áp dụng màu chữ, viền, nền và hiệu ứng xuất hiện khi dựng bằng web. App đã cài cần bản cập nhật tương thích để xuất cùng kiểu.</p>
    <label className="caption-sample-label">Thử câu của bạn<input value={sample} maxLength={90} onChange={e=>setSample(e.target.value)} placeholder="Nhập câu tiếng Việt…"/></label>
    <div className="template-filters">{['Tất cả','Chữ viền','Có nền'].map(value=><button type="button" key={value} aria-pressed={filter===value} onClick={()=>setFilter(value)}>{value}</button>)}<button type="button" aria-pressed={animate} onClick={()=>setAnimate(!animate)}>{animate?'Dừng hiệu ứng':'Xem hiệu ứng'}</button></div>
    <div className="caption-grid">{captionStyles.filter(style=>filter==='Tất cả'||(filter==='Có nền'?style.box:!style.box)).map(style=><article className="caption-card" key={style.id}>
      <div className="caption-sample-stage"><span className={'caption-sample-text '+(animate&&style.effect==='fade'?'caption-sample-fade':'')} style={{color:style.fg,background:style.box?style.bg:'transparent',fontWeight:style.bold?800:500,textShadow:style.box?'none':`-1px -1px 0 ${style.bg},1px -1px 0 ${style.bg},-1px 1px 0 ${style.bg},1px 1px 0 ${style.bg},0 2px 4px #000`}}>{sample.trim()||'Biến khoảnh khắc thành câu chuyện'}</span></div>
      <h3>{style.name}</h3><p>{style.box?'Nền màu':'Chữ viền'} · {style.effect==='fade'?'Hiện / ẩn nhẹ':'Hiện ngay'}</p>
      <button type="button" className="studio-secondary" onClick={()=>select(`Tôi chọn mẫu phụ đề “${style.name}”. Hãy giữ kiểu này khi dựng video trên web: ${style.box?'nền màu':'chữ viền'}, ${style.effect==='fade'?'hiện và ẩn nhẹ':'hiện ngay'}. Phụ đề bám lời nói trong video, không tự bịa hoặc dùng câu minh họa. Trước tiên trao đổi kịch bản với tôi; chỉ dựng khi tôi yêu cầu.`)}>Chọn kiểu này</button>
    </article>)}</div>
  </section>;
}
