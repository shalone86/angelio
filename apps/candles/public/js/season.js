// The Church year from the date, worked out on the device (no server, no yearly upkeep): the season, its color
// (the priest's vestments, the altar cloth and the tabernacle veil follow it) and a line to say aloud.
// Western (Latin) calendar dates; the colors are close to the Byzantine ones too.
// Pure, tested in Node (test/season.test.js).

/** Easter Sunday (Gregorian), the "Anonymous Gregorian" computus. Returns a Date (local midnight). */
export function easter(year) {
  const a = year % 19, b = Math.floor(year / 100), c = year % 100, d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

const DAY = 86400000;
const at = (y, m, d) => new Date(y, m, d);
const plus = (date, days) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
const same = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const days = (a, b) => Math.round((b - a) / DAY);

/** The First Sunday of Advent: the fourth Sunday before Christmas (between November 27 and December 3). */
export function adventStart(year) {
  const xmas = at(year, 11, 25);
  return plus(xmas, -((xmas.getDay() || 7) + 21));
}

// The colors, as the game paints them.
export const COLORS = { violet: "#6b3fa0", rose: "#e58fb3", white: "#f4efe2", gold: "#e3b341", red: "#c8262f", green: "#2f8a4c" };

/**
 * What the Church is celebrating on this date: {id, name, color, hex, say}.
 *   id: advent | christmas | lent | holy-week | easter | pentecost | ordinary
 */
export function seasonOf(date = new Date()) {
  const d = at(date.getFullYear(), date.getMonth(), date.getDate());
  const y = d.getFullYear();
  const s = (id, name, color, say) => ({ id, name, color, hex: COLORS[color], say });
  // Christmas runs into January: Christmas Day through the Baptism of the Lord (the Sunday after January 6).
  const jan6 = at(y, 0, 6), baptism = plus(jan6, 7 - jan6.getDay());
  if (same(d, at(y, 11, 25))) return s("christmas", "Christmas", "gold", "It's Christmas! Jesus is born!");
  if (d >= at(y, 11, 25) || d <= baptism) return s("christmas", "Christmas", "white", "It's the Christmas season!");
  const adv = adventStart(y);
  if (d >= adv) {
    const gaudete = plus(adv, 14);
    return same(d, gaudete) ? s("advent", "Gaudete Sunday", "rose", "It's Gaudete Sunday. Rejoice, Jesus is almost here!")
      : s("advent", "Advent", "violet", "It's Advent. We're getting ready for Jesus!");
  }
  const e = easter(y), ash = plus(e, -46), palm = plus(e, -7), pentecost = plus(e, 49);
  if (same(d, e)) return s("easter", "Easter", "gold", "Christ is risen! Happy Easter!");
  if (d > e && d < pentecost) return s("easter", "Easter", "white", "It's Easter time. Jesus is risen!");
  if (same(d, pentecost)) return s("pentecost", "Pentecost", "red", "It's Pentecost. The Holy Spirit came!");
  if (same(d, palm) || same(d, plus(e, -2))) return s("holy-week", same(d, palm) ? "Palm Sunday" : "Good Friday", "red", same(d, palm) ? "It's Palm Sunday. Hosanna!" : "It's Good Friday. Jesus died for us.");
  if (same(d, plus(e, -3))) return s("holy-week", "Holy Thursday", "white", "It's Holy Thursday, the night of the Last Supper.");
  if (d > palm && d < e) return s("holy-week", "Holy Week", "violet", "It's Holy Week.");
  if (d >= ash && d < e) {
    const laetare = plus(e, -21);
    return same(d, laetare) ? s("lent", "Laetare Sunday", "rose", "It's Laetare Sunday. Rejoice, Easter is coming!")
      : s("lent", "Lent", "violet", "It's Lent. We pray and make little sacrifices.");
  }
  return s("ordinary", "Ordinary Time", "green", "It's Ordinary Time, the season of growing.");
}

export { days as _days };
