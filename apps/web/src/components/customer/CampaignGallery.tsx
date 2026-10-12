"use client";
import {useState} from 'react';

const base='https://cloudflare-media-manager.manhlife-com.workers.dev/media/machine-transfer/';
const samples=[
 {id:'elon',group:'Ads',name:'Elon Musk · Bí mật giúp con ham học',src:base+'2026-09-23/tdc-ads-full-set/TDC-Video-01-Elon-Musk-CANDIDATE-v20.mp4',style:'Mở bằng câu chuyện, chữ nhấn theo lời nói, xen hình minh họa và kết bằng lời kêu gọi hành động.'},
 ...[1,2,3].map(n=>({id:'value-'+n,group:'Trao giá trị',name:'Trao giá trị · Video '+n,src:'/studio/templates/campaigns/value-'+n+'.mp4',style:'Dẫn dắt vấn đề, chia sẻ câu chuyện thực tế, nhấn từ khóa và chuyển sang giải pháp bằng chữ cùng cảnh minh họa.'})),
 ...[1,2,3].map(n=>({id:'coaching-'+n,group:'Kêu gọi coaching',name:'Đặt lịch coaching · Buổi '+n,src:base+'2026-09-19/tdc-zoom-ads-coaching-final-v2/TDC-Quang-Cao-Dat-Lich-Coaching-Buoi-'+n+'-FINAL-v2.mp4',style:'Chữ nhấn nỗi băn khoăn, làm rõ giải pháp coaching và chốt lời mời đặt lịch dễ đọc.'})),
];
export function CampaignGallery({select}:{select:(prompt:string)=>void}){
 const [id,setId]=useState('elon'),[group,setGroup]=useState('Tất cả'),[failed,setFailed]=useState(false);
 const sample=samples.find(s=>s.id===id)!;
 return <section className="campaign-library"><div className="motion-heading"><span>BỘ MẪU / ADS & CHIA SẺ</span><h3>Chữ dẫn dắt câu chuyện.</h3><p>Video ads, trao giá trị và kêu gọi coaching đã dựng. Xem cách đặt chữ, nhấn ý và phối cảnh trong từng mẫu.</p></div>
 <div className="campaign-filters">{['Tất cả','Ads','Trao giá trị','Kêu gọi coaching'].map(g=><button key={g} aria-pressed={group===g} onClick={()=>setGroup(g)}>{g}</button>)}</div>
 <div className="expert-feature"><video key={sample.id} controls playsInline preload="none" poster={'/studio/templates/campaigns/'+sample.id+'.jpg'} aria-label={'Video mẫu '+sample.name} src={sample.src} onError={()=>setFailed(true)}/><div><span>{sample.group}</span><h3>{sample.name}</h3><p>{sample.style}</p>{failed&&<p role="alert">Chưa tải được mẫu. Hãy thử lại hoặc chọn mẫu khác.</p>}<button className="studio-primary" onClick={()=>select(`Tôi chọn video tham khảo “${sample.name}”. Phong cách: ${sample.style} Hãy trao đổi với tôi để viết kịch bản và thiết kế chữ theo tinh thần mẫu, dùng video và lời nói của tôi. Không sao chép tên, lời chứng thực, kết quả hay hình nhân vật trong mẫu vào quảng cáo của tôi. Chốt các cảnh và nội dung chữ trước khi dựng.`)}>Dùng phong cách chữ này</button><p>Chọn mẫu để trao đổi kịch bản và cách thể hiện chữ. Bản dựng mới dùng tư liệu của bạn; không sao chép nguyên video mẫu.</p></div></div>
 <div className="campaign-cards">{samples.filter(s=>group==='Tất cả'||s.group===group).map(s=><button key={s.id} aria-pressed={id===s.id} onClick={()=>{setId(s.id);setFailed(false);}}><small>{s.group}</small><strong>{s.name}</strong><span>Xem video →</span></button>)}</div></section>;
}
