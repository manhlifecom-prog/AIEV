import React from 'react';
import {Composition,registerRoot} from 'remotion';
import {MotionText} from '../../../apps/web/src/components/customer/remotion/MotionText';
import {textEffects} from '../../../apps/server/src/customer/text-effects';
import {loadFont} from '@remotion/fonts';
import {staticFile} from 'remotion';
import {captionFonts} from '../../../apps/server/src/customer/caption-styles';
for(const font of Object.values(captionFonts))loadFont({family:font.family,url:staticFile('studio/renderer/fonts/'+font.file),weight:String(font.weight),style:font.italic?'italic':'normal'});
// These are variants controlled by one shared template, not independent scenes.
const TextLibrary=()=> <>{textEffects.map(effect=><Composition key={effect.id} id={'AIEV-'+effect.id} component={MotionText} durationInFrames={165} fps={30} width={1080} height={760} defaultProps={{effect:effect.id,text:effect.sample}}/>)}</>;
registerRoot(TextLibrary);
