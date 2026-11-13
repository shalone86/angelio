// "How it works" cards, one per level, read aloud before the first question.

import { GROUPS, LETTERS, keyword } from "./reading.js";
import { snd } from "./letter-sounds.js";
import { PATTERNS, chunks, focusIndexes, wordOf } from "./phonics.js";

const letterRow = (group) => `<div class="lesson-letters">${group.map((l) => `
  <span class="lesson-letter lesson-focus"><span class="abc">${l}</span><span class="pic" aria-hidden="true">${keyword(l)[1]}</span></span>`).join("")}</div>`;
const lettersVoice = (group) => `${group.map((l) => `${l} says ${snd(LETTERS[l].sound)}, like ${keyword(l)[0]}.`).join(" ")} Say the sounds with me!`;

export const LESSONS = {
  "p-letters-1": { emoji: "🌱", title: "Letters make sounds", rule: "Every letter makes a sound. Listen, and say it too!", exampleHtml: letterRow(GROUPS[0]), voice: `Every letter makes a sound. ${lettersVoice(GROUPS[0])}` },
  "p-letters-2": { emoji: "🌿", title: "More letters", rule: "Here are six more letters and their sounds.", exampleHtml: letterRow(GROUPS[1]), voice: `Here are more letters! ${lettersVoice(GROUPS[1])} c and k make the same sound!` },
  "p-letters-3": { emoji: "🌳", title: "Even more letters", rule: "Seven more letters. You're learning so many!", exampleHtml: letterRow(GROUPS[2]), voice: `Seven more letters! ${lettersVoice(GROUPS[2])}` },
  "p-first-sounds": {
    emoji: "👂", title: "The first sound", rule: "Say a word slowly. The <b>first sound</b> tells you its first letter.",
    exampleHtml: `<div class="lesson-pair"><span class="lesson-focus pic big">🐶</span><span class="lesson-focus"><b>d</b>og</span><span class="lesson-focus abc">d</span></div>`,
    voice: "Say a word slowly, and listen to the very first sound. Dog. Duh, dog. Dog starts with duh, the letter d!",
  },
  "p-rhymes": {
    emoji: "🎵", title: "Rhyming words", rule: "Words that <b>rhyme</b> sound the same at the end: c<b>at</b>, h<b>at</b>.",
    exampleHtml: `<div class="lesson-pair"><span class="lesson-focus"><span class="pic big">🐱</span><br>c<b>at</b></span><span class="lesson-focus"><span class="pic big">🎩</span><br>h<b>at</b></span></div>`,
    voice: "Words that rhyme sound the same at the end. Cat, hat. They both end with at! Cat and dog don't rhyme.",
  },
  "p-beats": {
    emoji: "🥁", title: "Clap the beats", rule: "Words have <b>beats</b>. Clap, or tap the drum, once for each beat.",
    exampleHtml: `<div class="lesson-pair"><span class="lesson-focus pic big">🍌</span><span class="lesson-focus">ba</span><span class="lesson-focus">na</span><span class="lesson-focus">na</span></div>`,
    voice: "Words have beats. Let's clap banana. Ba. Na. Na. Three beats! Tap the drum once for each beat, then press done.",
  },
  "k-big-little": {
    emoji: "🔠", title: "Big and little letters", rule: "Every letter has a <b>big</b> shape and a <b>little</b> shape. They make the same sound.",
    exampleHtml: `<div class="lesson-pair"><span class="lesson-focus abc">A a</span><span class="lesson-focus abc">B b</span><span class="lesson-focus abc">D d</span></div>`,
    voice: "Every letter has a big shape and a little shape. Big A, little a. Big B, little b. They make the same sound. Big letters start names and sentences!",
  },
  "k-blend": {
    emoji: "🧩", title: "Blend the sounds", rule: "Tap each letter to hear its sound. Then press <b>Blend</b> and slide the sounds together into a word!",
    exampleHtml: `<div class="lesson-pair"><span class="lesson-focus abc">c</span><span class="lesson-focus abc">a</span><span class="lesson-focus abc">t</span><span class="lesson-focus">→ <span class="pic big">🐱</span></span></div>`,
    voice: "Tap each letter to hear its sound. Kuh. Ah. Tuh. Now slide them together, faster and faster: kuh-ah-tuh, cat! Then find the picture.",
  },
  "k-build": {
    emoji: "🏗️", title: "Build a word", rule: "Listen to each sound in the word, and put a letter in a box for each sound.",
    exampleHtml: `<div class="lesson-pair"><span class="lesson-focus pic big">☀️</span><span class="lesson-focus abc">s</span><span class="lesson-focus abc">u</span><span class="lesson-focus abc">n</span></div>`,
    voice: "Listen to each sound in a word. Sun. Sss. Uh. Nnn. One letter for each sound: s, u, n. Tap the letters to fill the boxes!",
  },
};

// Phonics levels: how to say the pattern, three example words in chunks, then "let's practice".
for (const p of PATTERNS.filter((x) => x.grade >= 3)) {
  const ex = p.pictures.slice(0, 3);
  const word = ([spec, emoji]) => {
    const ch = chunks(spec, p.syllables), f = new Set(focusIndexes(p, ch));
    return `<span class="lesson-word lesson-focus"><span class="pic" aria-hidden="true">${emoji}</span><span class="chunked">${ch.map((c, i) => `<span class="chunk${f.has(i) ? " focus" : ""}${c.silent ? " silent" : ""}">${c.t}</span>`).join(p.syllables ? '<span class="dot">·</span>' : "")}</span></span>`;
  };
  LESSONS[p.id] = {
    emoji: p.emoji, title: p.title, rule: p.teach,
    exampleHtml: `<div class="lesson-words">${ex.map(word).join("")}</div>`,
    voice: `${p.say} Let's practice: ${ex.map(([s]) => wordOf(s)).join(", ")}!`,
  };
}
