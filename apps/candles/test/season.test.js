import { test } from "node:test";
import assert from "node:assert/strict";
import { easter, adventStart, seasonOf } from "../public/js/season.js";
import { byzantineSeasonOf } from "../public/js/season.js";

const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

test("Easter on known dates", () => {
  assert.equal(ymd(easter(2024)), "2024-03-31");
  assert.equal(ymd(easter(2025)), "2025-04-20");
  assert.equal(ymd(easter(2026)), "2026-04-05");
  assert.equal(ymd(easter(2027)), "2027-03-28");
  assert.equal(ymd(easter(2038)), "2038-04-25");
});

test("Advent starts on the fourth Sunday before Christmas", () => {
  assert.equal(ymd(adventStart(2025)), "2025-11-30");
  assert.equal(ymd(adventStart(2026)), "2026-11-29");
  assert.equal(ymd(adventStart(2027)), "2027-11-28");
  for (let y = 2020; y < 2060; y++) { const a = adventStart(y); assert.equal(a.getDay(), 0); assert.ok(a.getMonth() === 10 ? a.getDate() >= 27 : a.getDate() <= 3); }
});

test("the season and its color on real days", () => {
  const on = (s) => { const [y, m, d] = s.split("-").map(Number); return seasonOf(new Date(y, m - 1, d)); };
  assert.equal(on("2026-11-20").id, "ordinary");
  assert.equal(on("2026-11-20").color, "green");
  assert.equal(on("2026-11-29").id, "advent");
  assert.equal(on("2026-12-13").color, "rose"); // Gaudete Sunday
  assert.equal(on("2026-12-25").color, "gold");
  assert.equal(on("2027-01-05").id, "christmas");
  assert.equal(on("2027-01-11").id, "ordinary"); // after the Baptism of the Lord (Jan 10, 2027)
  assert.equal(on("2027-02-10").id, "lent");    // Ash Wednesday 2027
  assert.equal(on("2027-03-07").color, "rose"); // Laetare Sunday
  assert.equal(on("2027-03-21").color, "red");  // Palm Sunday
  assert.equal(on("2027-03-25").color, "white"); // Holy Thursday
  assert.equal(on("2027-03-26").color, "red");  // Good Friday
  assert.equal(on("2027-03-28").color, "gold"); // Easter
  assert.equal(on("2027-04-10").id, "easter");
  assert.equal(on("2027-05-16").id, "pentecost");
  assert.equal(on("2027-05-17").id, "ordinary");
  for (let t = Date.UTC(2026, 0, 1); t < Date.UTC(2030, 0, 1); t += 86400000) {
    const s = seasonOf(new Date(t));
    assert.ok(s.hex && s.say && s.name, JSON.stringify(s));
  }
});

test("the Byzantine phelonion's color: no rose; gold most of the year", () => {
  const c = (y, m, d) => byzantineSeasonOf(new Date(y, m - 1, d)).color;
  assert.equal(c(2026, 7, 12), "gold");
  assert.equal(c(2026, 11, 21), "blue");    // the Entrance of the Theotokos
  assert.equal(c(2026, 12, 25), "white");
  assert.equal(c(2027, 1, 6), "white");     // Theophany
  assert.equal(c(2026, 3, 8), "violet");    // the Great Fast
  assert.equal(c(2026, 4, 3), "black");     // Holy Friday (Easter 2026: April 5)
  assert.equal(c(2026, 4, 5), "red");       // Pascha
  assert.equal(c(2026, 5, 24), "green");    // Pentecost
  for (let i = 0; i < 366; i++) assert.notEqual(byzantineSeasonOf(new Date(2026, 0, 1 + i)).color, "rose");
});
