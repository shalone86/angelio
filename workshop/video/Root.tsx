import {Composition} from 'remotion';
import {KidsThumb, type KidsThumbProps} from './KidsThumb';
import {Lesson} from './Lesson';
import {MusicVideo, songFrames, type SongProps} from './MusicVideo';
import {FPS} from './theme';
import type {LessonProps} from './types';

const placeholder: LessonProps = {
  courseTitle: 'Course',
  number: 1,
  title: 'Run npm run prepare-lesson first',
  headings: [],
  segments: [
    {kind: 'intro', index: 0, text: '', scenes: [{type: 'title'}], audio: null, durationInFrames: 90, audioOffsetInFrames: 0},
  ],
};

export const Root: React.FC = () => (
  <>
  <Composition
    id="Lesson"
    component={Lesson}
    fps={FPS}
    width={1920}
    height={1080}
    defaultProps={placeholder}
    calculateMetadata={({props}) => ({
      durationInFrames: props.segments.reduce((sum, s) => sum + s.durationInFrames, 0),
    })}
  />
  {/* A music video (npm run song -- <name>) */}
  <Composition id="MusicVideo" component={MusicVideo} fps={FPS} width={1920} height={1080} durationInFrames={30}
    defaultProps={{song: {title: 'Song', slides: []}, audio: null, duration: 10, parts: {}, arts: {}} satisfies SongProps}
    calculateMetadata={({props}) => ({durationInFrames: songFrames(props, FPS)})} />
  {/* The video's thumbnail (its poster in Watch & Sing; scripts/kids-thumb.mjs) */}
  <Composition id="KidsThumb" component={KidsThumb} fps={30} width={1280} height={720} durationInFrames={1}
    defaultProps={{lead: 'What is', title: 'the Byzantine Rite?'} satisfies KidsThumbProps} />
  </>
);
