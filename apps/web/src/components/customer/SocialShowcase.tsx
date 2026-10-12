"use client";
import {useState} from 'react';
import {Player,Thumbnail} from '@remotion/player';
import {socialPresets} from '../../../../server/src/customer/text-effects';
import {SocialInfographic} from './remotion/SocialInfographic';
export function SocialShowcase({select}:{select:(prompt:string)=>void}){
 const [selected,setSelected]=useState<string>('social-gauge');
 const preset=socialPresets.find(p=>p.id===selected);
 const choose=(id:string,name:string)=>select(`Tôi chọn mẫu ${name} [text-effect:${id}]. Dựng dọc 9:16, dùng video và phụ đề lời nói thật của tôi. Đồ họa chỉ minh họa, không tự tạo số liệu hay kết quả. Hãy cùng tôi chốt tiêu đề và kịch bản.`);
 return <section className="campaign-library"><div className="motion-heading"><span>6 MẪU INFOGRAPHIC · CHỌN RIÊNG TỪNG KIỂU</span><h3>Chọn cách kể câu chuyện.</h3><p>Mỗi mẫu có bố cục riêng và áp dụng trực tiếp khi dựng. Bấm ảnh để xem chuyển động, hoặc bấm Dùng mẫu.</p></div>
 <div style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:12,marginBottom:24}}>{socialPresets.map(p=><article key={p.id} style={{border:`1px solid ${selected===p.id?'#d9ff64':'#343944'}`,borderRadius:14,padding:10,background:'#161923',minWidth:0}}>
 <button type="button" aria-label={'Xem mẫu '+p.name} aria-pressed={selected===p.id} onClick={()=>setSelected(p.id)} style={{display:'block',width:'100%',padding:0,border:0,borderRadius:9,overflow:'hidden',cursor:'pointer',background:'#190716'}}><Thumbnail component={SocialInfographic} inputProps={{demo:true,sceneOverride:p.scene}} compositionWidth={1080} compositionHeight={1920} durationInFrames={180} fps={30} frameToDisplay={100} style={{width:'100%'}}/></button>
 <h4 style={{fontSize:15,margin:'12px 0 6px'}}>{p.name}</h4><p style={{fontSize:12,lineHeight:1.5,minHeight:36,margin:'0 0 12px',color:'#aeb8c8'}}>{p.description}</p><button type="button" className="studio-primary" style={{width:'100%'}} onClick={()=>choose(p.id,p.name)}>Dùng mẫu {p.name}</button>
 </article>)}</div>
 <div className="motion-heading"><h3>Xem chuyển động: {preset?.name||'Phối hợp cả 6 cảnh'}</h3></div>
 <Player key={selected} component={SocialInfographic} inputProps={{demo:true,sceneOverride:preset?.scene}} compositionWidth={1080} compositionHeight={1920} durationInFrames={preset?180:1080} fps={30} controls loop initialFrame={55} style={{width:'100%',maxWidth:360,margin:'0 auto',borderRadius:18,overflow:'hidden'}}/>
 <div style={{display:'flex',gap:10,flexWrap:'wrap',margin:'14px 0'}}><button type="button" className="studio-primary" onClick={()=>choose(selected,preset?.name||'Social Magenta tổng hợp')}>Dùng mẫu đang xem</button><button type="button" onClick={()=>setSelected('social-infographic')}>Xem bản phối hợp 6 cảnh</button></div>
 <p>Tham khảo phong cách <a href="https://www.facebook.com/reel/1973331456674324" target="_blank" rel="noreferrer">Khánh Hùng Academy</a>. Bản dựng sử dụng tư liệu và nội dung của bạn.</p>
 </section>;
}
