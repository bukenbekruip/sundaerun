// Province references for explicitly named South African cities/circuits.
// No coordinates or precise addresses are inferred; unmatched locations stay unassigned.
export const provinces = {
  EC: "Eastern Cape",
  FS: "Free State",
  GP: "Gauteng",
  KZN: "KwaZulu-Natal",
  LP: "Limpopo",
  MP: "Mpumalanga",
  NW: "North West",
  NC: "Northern Cape",
  WC: "Western Cape",
};
const places = [
  [
    "GP",
    /\b(pretoria|centurion|zwartkops|kyalami|johannesburg|midrand|benoni|brakpan|kempton park|mahem|sandton)\b/i,
  ],
  [
    "WC",
    /\b(cape town|killarney|knysna|brenton.on.sea|parow|stellenbosch|paarl|durbanville|franschhoek)\b/i,
  ],
  [
    "KZN",
    /\b(durban|dezzi|port shepstone|pietermaritzburg|idube|ballito|richards bay)\b/i,
  ],
  ["EC", /\b(gqeberha|port elizabeth|aldo scribante|east london|qeberha)\b/i],
  ["FS", /\b(welkom|phakisa|bloemfontein|clarens)\b/i],
  ["MP", /\b(nelspruit|mbombela|red star raceway|delmas|hazyview|sabie)\b/i],
  ["NW", /\b(rustenburg|potchefstroom|phokeng|sun city|zeerust)\b/i],
  ["LP", /\b(polokwane|modimolle|bela.bela|tzaneen)\b/i],
  ["NC", /\b(kimberley|upington|kathu)\b/i],
];
export function provinceFor(region, location = "") {
  if (provinces[region?.toUpperCase()]) return provinces[region.toUpperCase()];
  const full = Object.values(provinces).find(
    (value) => value.toLowerCase() === region?.toLowerCase(),
  );
  if (full) return full;
  return (
    provinces[places.find(([, pattern]) => pattern.test(location))?.[0]] ||
    region ||
    ""
  );
}
export function isForeignLocation(text) {
  return /\b(namibia|lesotho|eswatini|swaziland|botswana|mozambique|zimbabwe|kenya|zambia|ghana|nigeria)\b/i.test(
    text,
  );
}
