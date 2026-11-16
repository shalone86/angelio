// The videos: lessons (watch, then a short quiz) and songs (watch and sing along).
// Videos and pictures are still served from the Ghost kids site for this draft; they can move to
// Cloudflare storage later. Every quiz answer says where it comes from.

const GHOST = "https://kids.methodiusmedia.com/content";

export const LESSONS = [
  {
    id: "sign-of-the-cross",
    title: "The Sign of the Cross",
    emoji: "✝️",
    about: "Why Byzantine Catholics go from the right shoulder to the left, and what the three fingers mean.",
    video: `${GHOST}/media/2026/10/lesson-10.mp4`,
    poster: `${GHOST}/images/2026/10/image-1793191089545--1-.png`,
    quiz: [
      {
        q: "Why do we make the Sign of the Cross?",
        choices: ["To remember the Trinity", "To say goodbye", "To be nice to others"],
        answer: 0,
        hint: "Think of Father, Son and Holy Spirit.",
        why: "When we make the Sign of the Cross, we say who God is: Father, Son and Holy Spirit.",
        source: "Christ – Our Pascha 626",
      },
      {
        q: "Which shoulder do Byzantine Catholics touch first?",
        choices: ["The right", "The left", "Neither"],
        answer: 0,
        hint: "Forehead, chest, then … which side?",
        why: "Byzantine Catholics go from the right shoulder to the left.",
        source: "Christ – Our Pascha 626",
      },
      {
        q: "Three fingers joined stand for the Holy …",
        choices: ["Trinity", "Angels", "Church"],
        answer: 0,
        hint: "Three fingers, three Persons in one God.",
        why: "Joining the first three fingers is a sign of our faith in the Holy Trinity.",
        source: "Christ – Our Pascha 626",
      },
      {
        q: "Every lawful way of praying in the Church is equally good. True or false?",
        choices: ["True", "False"],
        answer: 0,
        hint: "Roman Catholics go left to right. Is that wrong?",
        why: "True! All the Church's lawful rites are of equal right and dignity.",
        source: "Catechism 1203",
      },
    ],
    transcript: [
      "Did you know Byzantine Catholics make the sign of the cross from right to left? Which shoulder do you touch first? They also use their hand to teach themselves about the Trinity. Want to know more? Well, look no further. I'm your host Shalone Cason, and let's begin in the name of the Father and of the Son and of the Holy Spirit.",
      "## A prayer with your whole body",
      "The Byzantine catechism says what the Sign of the Cross is: “the Christian professes faith in the Most Holy Trinity” (Christ – Our Pascha 626).",
      "When we make the Sign of the Cross, we say who God is: Father, Son and Holy Spirit. It is a prayer we say with our words and with our hands.",
      "## Right shoulder first",
      "The catechism tells us where the hand goes: “from the forehead to the breast and from the right shoulder to the left” (Christ – Our Pascha 626).",
      "Byzantine Catholics touch their forehead, then their chest, then the right shoulder, then the left. We trace the cross of Jesus, who died and rose for us!",
      "## Three fingers",
      "“Joining the first three fingers of our hand is a sign of our profession of faith in the Holy Trinity” (Christ – Our Pascha 626).",
      "Three fingers together are for the Trinity. The last two fingers bend down to the palm, for Jesus: he is God and also truly human.",
      "## Different, but equal",
      "Roman Catholics go left to right. The Church says every lawful way of praying is “of equal right and dignity” (Catechism 1203).",
      "Roman Catholics touch the left shoulder first. Neither way is wrong. It is the same cross and the same God, and the Church loves both ways.",
      "And that was the sign of the cross, in the Byzantine Rite, in a nutshell. It is a prayer that uses your whole body. You touch your right shoulder first and use three fingers to represent the Trinity. Thanks for learning with us. I've been your host, Shalone, and until next time, stay holy, my friends.",
    ],
    credit: "Written, drawn and narrated by Shalone Cason. Sources: Christ – Our Pascha 626; Catechism of the Catholic Church 1203.",
  },
];

export const SONGS = [
  {
    id: "holy-communion",
    title: "The Holy Communion Song",
    emoji: "🍞",
    about: "A Byzantine Catholic song about the first Holy Communion.",
    video: `${GHOST}/files/2026/05/the-holy-communion-song0001-3745.mp4`,
    poster: `${GHOST}/images/2026/05/Untitled-1.png`,
    credit: "Music, vocals and lyrics: Shalone Cason",
    // Each verse is a list of lines; "chorus" is sung between them.
    chorus: [
      "The priest says this is my body, this is my blood,",
      "When it's time for communion.",
      "And Jesus said, “This is my body. This is my blood,”",
      "And that's holy communion.",
    ],
    verses: [
      [
        "The last supper was the first Holy Communion.",
        "At Liturgy, we celebrate Holy Communion.",
        "Jesus said remember Him in Holy Communion.",
        "Jesus takes bread and wine and makes Holy Communion.",
      ],
      [
        "Every child of God should take their first Holy Communion.",
        "Go to Liturgy and celebrate Holy Communion.",
        "If you want to honor Christ, partake in Holy Communion.",
        "If you want eternal life, you will receive Holy Communion.",
      ],
    ],
  },
];

export const lessonById = (id) => LESSONS.find((l) => l.id === id);
export const songById = (id) => SONGS.find((s) => s.id === id);
