import React from 'react';
import {Composition,registerRoot} from 'remotion';
import {MotionText} from '../../../apps/web/src/components/customer/remotion/MotionText';
import {ExpertVideo} from '../../../apps/web/src/components/customer/remotion/ExpertVideo';
import {expertPresets} from '../../../apps/server/src/customer/text-effects';
import {EditorialVideo} from '../../../apps/web/src/components/customer/remotion/EditorialVideo';
import {textEffects} from '../../../apps/server/src/customer/text-effects';
import {loadFont} from '@remotion/fonts';
import {staticFile} from 'remotion';
import {captionFonts} from '../../../apps/server/src/customer/caption-styles';
for(const font of Object.values(captionFonts))loadFont({family:font.family,url:staticFile('studio/renderer/fonts/'+font.file),weight:String(font.weight),style:font.italic?'italic':'normal'});
// These are variants controlled by one shared template, not independent scenes.
const TextLibrary=()=> <>{expertPresets.map(p=><Composition key={p.id} id={p.id} component={ExpertVideo} durationInFrames={p.speaker==='vinh'?285:430} fps={30} width={1080} height={1920} defaultProps={{preset:p.id,src:staticFile('studio/templates/experts/'+p.speaker+'-source.mp4'),demo:true}}/>)}<Composition id="Coffee-Editorial" component={EditorialVideo} durationInFrames={240} fps={30} width={1080} height={1920} defaultProps={{src:staticFile('studio/templates/coffee-source.mp4'),demo:true}}/>{textEffects.map(effect=><Composition key={effect.id} id={'AIEV-'+effect.id} component={MotionText} durationInFrames={165} fps={30} width={1080} height={760} defaultProps={{effect:effect.id,text:effect.sample}}/>)}</>;
registerRoot(TextLibrary);

