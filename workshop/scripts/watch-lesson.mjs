// A workshop lesson (lesson.yml, read by loadLesson) as a Watch & Sing lesson: its quiz in Watch & Sing's kinds and
// its words with their sources. Pure (tested): scripts/send-to-angelio.mjs sends the result.
//   choice → choice · truefalse → choice (True / False) · blank → word tiles (the right word and the `wrong:` ones)
const clean = (t) => String(t ?? '').trim().replace(/\s+/g, ' ');
const slug = (t) => clean(t).toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);

export function watchQuiz(q, where) {
  const why = clean(q.why), text = clean(q.question);
  if (!text || !why) throw new Error(`Quiz in "${where}" needs a question and a why`);
  if ((q.type ?? 'choice') === 'choice') {
    if (!(Number.isInteger(q.answer) && q.answer >= 0 && q.answer < (q.options?.length ?? 0))) throw new Error(`Quiz in "${where}": answer must be the number (from 0) of one of the options`);
    return {type: 'choice', q: text, choices: q.options.map(clean), answer: q.answer, why};
  }
  if (q.type === 'truefalse') {
    if (typeof q.answer !== 'boolean') throw new Error(`Quiz in "${where}": a true/false answer must be true or false`);
    return {type: 'choice', q: text, choices: ['True', 'False'], answer: q.answer ? 0 : 1, why};
  }
  if (q.type === 'blank') {
    const right = clean(q.accept?.[0]);
    const wrong = (q.wrong ?? []).map(clean).filter((w) => w && w.toLowerCase() !== right.toLowerCase());
    if (!/_{2,}/.test(text) || !right) throw new Error(`Quiz in "${where}": a fill-in needs ____ in the question and the right word (accept)`);
    if (!wrong.length) throw new Error(`Quiz in "${where}": a fill-in needs one or two wrong words (wrong:) for the word tiles`);
    // the tiles in a steady order (by the words), so the right one isn't always first
    const words = [right, ...wrong].sort((a, b) => (a.length * 7 + a.charCodeAt(0)) % 5 - (b.length * 7 + b.charCodeAt(0)) % 5 || a.localeCompare(b));
    return {type: 'blank', q: text.replace(/_{2,}/, '____'), words, answer: right, why};
  }
  throw new Error(`Quiz in "${where}": unknown kind "${q.type}" (use choice, truefalse or blank)`);
}

/** {lesson, course, segments, points} from loadLesson → a Watch & Sing lesson (id, title, quiz, transcript, sources). */
export function watchLesson(info, {video, poster} = {}) {
  const {lesson, segments, points} = info;
  const id = lesson.watch_id || lesson.replaces || slug(lesson.title);
  const sources = Object.fromEntries((lesson.sources ?? []).map((s) => [s.id, s]));
  const transcript = [];
  for (const s of segments) {
    if (s.kind !== 'point') { if (s.text) transcript.push(s.text); continue; }
    if (s.heading) transcript.push(s.heading);
    if (s.quote.lead) transcript.push(s.quote.lead);
    if (s.quote.text) transcript.push(`“${s.quote.text}” (${s.quote.cite || sources[s.quote.source]?.label || ''})`.replace(' ()', ''));
    if (s.explanation) transcript.push(s.explanation);
  }
  const quiz = points.flatMap((p) => p.quiz.map((q) => watchQuiz(q, p.heading || p.name)));
  const links = [...new Map(points.filter((p) => p.quote.source && sources[p.quote.source]?.url).map((p) => [sources[p.quote.source].url, {label: p.quote.cite || sources[p.quote.source].label, url: sources[p.quote.source].url}])).values()];
  return {id, title: clean(lesson.title), ...(video ? {video} : {}), ...(poster ? {poster} : {}),
    ...(lesson.summary ? {about: clean(lesson.summary)} : {}), quiz, transcript, ...(links.length ? {sources: links} : {}), date: new Date().toISOString().slice(0, 10)};
}
