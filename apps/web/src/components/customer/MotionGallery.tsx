"use client";
import {useEffect,useState} from 'react';
import {Player} from '@remotion/player';
import {MotionText} from './remotion/MotionText';
import {textEffects,type TextEffectId} from '../../../../server/src/customer/text-effects';
export function MotionGallery({select}:{select:(prompt:string)=>void}){
 const [effect,setEffect]=useState<TextEffectId>('word-highlight'),[text,setText]=useState('Ý tưởng nhỏ tạo nên khác biệt'),[ready,setReady]=useState(false),[error,setError]=useState('');const selected=textEffects.find(x=>x.id===effect)!;
 useEffect(()=>{let mounted=true;Promise.all(['700 40px "Be Vietnam Pro"','400 40px "Be Vietnam Pro"','700 40px "Barlow Condensed"','400 40px "Judson"','italic 400 40px "Judson"'].map(font=>document.fonts.load(font))).then(()=>{if(mounted)setReady(true);}).catch(()=>{if(mounted)setError('Chưa tải được phông chữ. Hãy tải lại trang.');});return()=>{mounted=false;};},[]);
 return <section className="motion-gallery"><div className="motion-heading"><span>REMOTION · TEXT EFFECTS</span><h3>Chữ cũng biết kể chuyện.</h3><p>Chọn hiệu ứng, thử câu của bạn và bấm phát. Cùng một hiệu ứng được dùng cho bản xem trước và video xuất trên web.</p></div>
 <div className="motion-preview">{ready?<Player key={effect+text} component={MotionText} inputProps={{effect,text:text.trim()||selected.sample}} initialFrame={30} durationInFrames={165} fps={30} compositionWidth={1080} compositionHeight={760} controls loop style={{width:'100%'}} errorFallback={({error})=><p role="alert">Chưa phát được mẫu: {error.message}</p>}/>:<p role="status">{error||'Đang chuẩn bị phông chữ…'}</p>}</div>
 <label className="caption-sample-label">Nội dung xem thử<input maxLength={90} value={text} onChange={e=>setText(e.target.value)}/></label>
 <div className="motion-current"><div><strong>{selected.name}</strong><p>{selected.description}</p></div><button type="button" className="studio-primary" onClick={()=>select(`Tôi chọn hiệu ứng chữ Remotion “${selected.name}” [text-effect:${selected.id}]. Dùng hiệu ứng này khi dựng trên web; phụ đề phải bám lời nói thật, không dùng nội dung minh họa. Nếu tôi cần tiêu đề, trao đổi nội dung với tôi rồi mới dựng.`)}>Dùng hiệu ứng này</button></div>
 <div className="motion-presets">{textEffects.map((item,i)=><button key={item.id} type="button" aria-pressed={effect===item.id} onClick={()=>{setEffect(item.id);setText(item.sample);}}><span style={{color:item.accent}}>{String(i+1).padStart(2,'0')}</span><strong>{item.name}</strong><small>{item.description}</small></button>)}</div><p className="motion-footnote">Phụ đề chạy theo mốc lời nói. Trình duyệt cần hỗ trợ xuất video WebCodecs. App cũ cần bản cập nhật tương thích. <a href="https://www.remotion.dev/elements/text/" target="_blank" rel="noreferrer">Remotion Elements</a></p></section>;
}

