// Age from a "YYYY-MM-DD" birth date. Parsed as local date parts: new Date("YYYY-MM-DD")
// is UTC midnight and shows the previous day west of Greenwich.
export function petAge(birthDate, isEstimate = false, today = new Date()) {
  const [y, m, d] = birthDate.split("-").map(Number);
  let months = (today.getFullYear() - y) * 12 + (today.getMonth() + 1 - m);
  if (today.getDate() < d) months -= 1;
  if (months < 1) return isEstimate ? "About a month" : "Under a month";

  const years = Math.floor(months / 12);
  const rest = months % 12;
  const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;
  if (isEstimate) return years ? `About ${plural(years, "yr")}` : `About ${plural(rest, "mo")}`;
  if (!years) return plural(rest, "mo");
  return rest ? `${plural(years, "yr")} ${plural(rest, "mo")}` : plural(years, "yr");
}
