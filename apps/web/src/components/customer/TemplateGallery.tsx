"use client";
import { useState } from 'react';

export const videoTemplates = [
  {id:'product',name:'Sản phẩm nổi bật',category:'Bán hàng',ratio:'9:16',seconds:30,color:'#d9ff64',headline:'Điều gì làm nên khác biệt?',beats:['Vấn đề của khách','Cận cảnh sản phẩm','Lợi ích + lời mời'],brief:'Video giới thiệu sản phẩm 30 giây, dọc 9:16. Mở bằng vấn đề của khách, chọn cận cảnh sản phẩm và lợi ích có trong nguồn, kết thúc bằng lời mời hành động. Nhịp gọn, tiêu đề ngắn; không tự bịa công dụng.'},
  {id:'vlog',name:'Một ngày của bạn',category:'Đời sống',ratio:'9:16',seconds:60,color:'#ffce96',headline:'Một ngày đáng nhớ',beats:['Khoảnh khắc nổi bật','Hành trình trong ngày','Cảm xúc cuối ngày'],brief:'Daily vlog 60 giây, dọc 9:16. Mở bằng khoảnh khắc cuốn hút, nối các cảnh thành câu chuyện tự nhiên, giữ âm thanh và lời thoại quan trọng, kết thúc có cảm xúc.'},
  {id:'review',name:'Review chân thật',category:'Bán hàng',ratio:'9:16',seconds:60,color:'#bda8ff',headline:'Có đáng để thử?',beats:['Câu hỏi mở đầu','Trải nghiệm thực tế','Kết luận rõ ràng'],brief:'Video review 60 giây, dọc 9:16. Mở bằng câu hỏi có đáng thử, trình bày trải nghiệm và ưu nhược điểm được xác nhận, kết luận rõ ràng. Giữ lời thoại gốc, thêm phụ đề nếu có lời nói; không bịa trải nghiệm.'},
  {id:'tutorial',name:'Hướng dẫn từng bước',category:'Kiến thức',ratio:'16:9',seconds:90,color:'#79d9e8',headline:'Làm được ngay hôm nay',beats:['Kết quả cuối cùng','Các bước thực hiện','Nhắc lại điểm chính'],brief:'Video hướng dẫn 90 giây, ngang 16:9. Cho thấy kết quả trước, sắp xếp các bước dễ hiểu, giữ đủ thời gian xem thao tác, tiêu đề từng bước ngắn và phụ đề lời thoại gốc.'},
  {id:'property',name:'Khám phá không gian',category:'Bán hàng',ratio:'9:16',seconds:45,color:'#a8d5bc',headline:'Không gian dành cho bạn',beats:['Góc toàn cảnh','Chi tiết nổi bật','Lời mời khám phá'],brief:'Video bất động sản hoặc không gian 45 giây, dọc 9:16. Mở bằng góc toàn đẹp, đi qua các khu vực theo trình tự hợp lý, nhấn chi tiết nổi bật, kết thúc lời mời liên hệ. Không bịa giá, diện tích hay địa chỉ.'},
  {id:'story',name:'Kể một câu chuyện',category:'Đời sống',ratio:'9:16',seconds:60,color:'#ffaabf',headline:'Và rồi mọi thứ thay đổi…',beats:['Tình huống mở đầu','Bước ngoặt','Điều đọng lại'],brief:'Video kể chuyện 60 giây, dọc 9:16. Có mở đầu, diễn biến và kết thúc; chọn cảnh phù hợp nội dung đã thống nhất, giữ lời thoại quan trọng, điều chỉnh nhịp để người xem theo dõi dễ dàng.'},
] as const;

export function TemplateGallery({select}:{select:(prompt:string)=>void}) {
  const [category,setCategory]=useState('Tất cả');
  return <section className="studio-templates" aria-label="Thư viện mẫu video">
    <p>Chọn phong cách để bắt đầu. Đây là bố cục minh họa; video thật sẽ dùng nguồn của bạn.</p>
    <div className="template-filters" aria-label="Lọc mẫu">{['Tất cả','Bán hàng','Đời sống','Kiến thức'].map(item=><button key={item} type="button" aria-pressed={category===item} onClick={()=>setCategory(item)}>{item}</button>)}</div>
    <div className="template-grid">{videoTemplates.filter(item=>category==='Tất cả'||item.category===category).map(item=><article key={item.id} className="template-card">
      <div className="template-art" style={{background:`linear-gradient(145deg,${item.color}22,#12151d)`}}><small>{item.ratio} · {item.seconds} giây</small><strong style={{color:item.color}}>{item.headline}</strong><div className="template-beats">{item.beats.map((beat,index)=><span key={beat}><b style={{background:item.color}}>{index+1}</b>{beat}</span>)}</div></div>
      <h3>{item.name}</h3><p>{item.category} · Có thể tùy chỉnh</p>
      <button type="button" className="studio-primary" onClick={()=>select(`Tôi chọn mẫu “${item.name}”. ${item.brief} Trước tiên hãy cùng tôi lên kịch bản; chưa bắt đầu dựng. Nếu chưa rõ sản phẩm hoặc chủ đề, hỏi tôi một câu cần thiết.`)}>Dùng mẫu này</button>
    </article>)}</div>
  </section>;
}
