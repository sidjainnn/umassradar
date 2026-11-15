/** Places around UMass and Amherst for the map. Coordinates are from OpenStreetMap. */

export type PlaceKind = "class" | "study" | "food" | "fun" | "outdoors" | "living" | "help";

export type Place = {
  id: string;
  emoji: string;
  name: string;
  kind: PlaceKind;
  blurb: string;
  at: [number, number];
  /** patterns that match room strings in a class schedule, e.g. "HAS 20" or "Hasbrouck 134" */
  codes?: RegExp;
};

export const KINDS: { id: PlaceKind; label: string; emoji: string }[] = [
  { id: "class", label: "Classes", emoji: "🏫" },
  { id: "study", label: "Study spots", emoji: "📚" },
  { id: "food", label: "Food", emoji: "🍕" },
  { id: "fun", label: "Fun", emoji: "🎉" },
  { id: "outdoors", label: "Outdoors", emoji: "🌲" },
  { id: "living", label: "Res halls", emoji: "🛏️" },
  { id: "help", label: "Help", emoji: "🩺" },
];

export const PLACES: Place[] = [
  // classes
  { id: "hasbrouck", emoji: "🧲", name: "Hasbrouck Laboratory", kind: "class", blurb: "Physics, plus some of the biggest lecture halls on campus.", at: [42.39179, -72.52589], codes: /\b(has|hasbrouck)\b/i },
  { id: "ilc", emoji: "🧪", name: "Integrative Learning Center", kind: "class", blurb: "Big modern classrooms with a café and lots of seating between classes.", at: [42.39104, -72.5259], codes: /\b(ilc|integrative)\b/i },
  { id: "cs", emoji: "💻", name: "Computer Science Building", kind: "class", blurb: "Home of CICS. Lounges and labs where CS students camp out.", at: [42.39516, -72.53111], codes: /\b(cs|csw|cmpsci|computer science|cmplab\w*)\b/i },
  { id: "lgrt", emoji: "🔬", name: "Lederle Graduate Research Tower", kind: "class", blurb: "Math, stats and science offices up high. Great view from the top floors.", at: [42.39392, -72.52766], codes: /\b(lgrt|lederle)\b/i },
  { id: "morrill", emoji: "🧬", name: "Morrill Science Center", kind: "class", blurb: "Biology and geosciences, a maze of connected wings.", at: [42.39155, -72.52525], codes: /\b(mor\w*|morrill)\b/i },
  { id: "goessmann", emoji: "⚗️", name: "Goessmann Laboratory", kind: "class", blurb: "Chemical engineering and chemistry labs.", at: [42.39313, -72.52803], codes: /\b(goe\w*|goessmann)\b/i },
  { id: "bartlett", emoji: "✍️", name: "Bartlett Hall", kind: "class", blurb: "English and writing classes, right by the library.", at: [42.388, -72.52885], codes: /\b(bart\w*|bartlett)\b/i },
  { id: "herter", emoji: "🏺", name: "Herter Hall", kind: "class", blurb: "History, languages and classics.", at: [42.38724, -72.52717], codes: /\b(her\w*|herter)\b/i },
  { id: "isenberg", emoji: "📈", name: "Isenberg School of Management", kind: "class", blurb: "Business classes, with a big atrium to study in.", at: [42.38682, -72.52486], codes: /\b(isb|isom|isenberg|som)\b/i },
  { id: "thompson", emoji: "🗳️", name: "Thompson Hall", kind: "class", blurb: "Economics, political science and sociology.", at: [42.39005, -72.52995], codes: /\b(tho\w*|thompson)\b/i },
  { id: "marcus", emoji: "🔌", name: "Marcus Hall", kind: "class", blurb: "Electrical and computer engineering.", at: [42.39395, -72.52857], codes: /\b(mrcs|marcus)\b/i },
  { id: "holdsworth", emoji: "🌱", name: "Holdsworth Hall", kind: "class", blurb: "Environmental conservation and natural resources.", at: [42.39289, -72.5309], codes: /\b(hld\w*|holdsworth)\b/i },
  { id: "machmer", emoji: "🗺️", name: "Machmer Hall", kind: "class", blurb: "Anthropology, geography and plenty of gen eds.", at: [42.39056, -72.52875], codes: /\b(mch\w*|machmer)\b/i },
  { id: "tobin", emoji: "🧠", name: "Tobin Hall", kind: "class", blurb: "Psychology and brain sciences.", at: [42.3875, -72.52956], codes: /\b(tob\w*|tobin)\b/i },
  { id: "lsl", emoji: "🦠", name: "Life Science Laboratories", kind: "class", blurb: "Research labs for life sciences.", at: [42.39209, -72.52382], codes: /\b(lsl|life sci\w*)\b/i },
  // study
  { id: "dubois", emoji: "📚", name: "W.E.B. Du Bois Library", kind: "study", blurb: "One of the tallest libraries in the world. The Learning Commons is on the lower level; upper floors get quieter as you go up.", at: [42.38974, -72.52817] },
  { id: "campuscenter", emoji: "🏢", name: "Campus Center", kind: "study", blurb: "Meeting rooms, lounges and the Blue Wall food court.", at: [42.3918, -72.52702] },
  { id: "union", emoji: "🏛️", name: "Student Union", kind: "fun", blurb: "Student government, RSO offices and the Cape Cod Lounge.", at: [42.39087, -72.5276] },
  // food
  { id: "worcester", emoji: "🍳", name: "Worcester Dining Commons", kind: "food", blurb: "Northeast's dining hall, close to the science buildings.", at: [42.39328, -72.52509] },
  { id: "franklin", emoji: "🥗", name: "Franklin Dining Commons", kind: "food", blurb: "Central's dining hall, a short walk from Orchard Hill.", at: [42.38927, -72.52253] },
  { id: "berkshire", emoji: "🍜", name: "Berkshire Dining Commons", kind: "food", blurb: "Southwest's dining hall with rotating stations from around the world.", at: [42.38195, -72.53] },
  { id: "hampshire", emoji: "🌮", name: "Hampshire Dining Commons", kind: "food", blurb: "Southwest's other dining hall, focused on local and sustainable food.", at: [42.3838, -72.53051] },
  { id: "antonios", emoji: "🍕", name: "Antonio's Pizza", kind: "food", blurb: "A downtown Amherst classic with very creative slices.", at: [42.37621, -72.51968] },
  { id: "atkins", emoji: "🍩", name: "Atkins Farms Country Market", kind: "food", blurb: "Cider donuts, apples and seasonal treats in South Amherst. Worth the bus ride in the fall.", at: [42.31926, -72.52898] },
  // fun
  { id: "mullins", emoji: "🏒", name: "Mullins Center", kind: "fun", blurb: "UMass hockey and basketball, plus big concerts.", at: [42.38952, -72.53345] },
  { id: "mcguirk", emoji: "🏈", name: "McGuirk Alumni Stadium", kind: "fun", blurb: "Home of UMass football.", at: [42.37726, -72.53602] },
  { id: "fac", emoji: "🎭", name: "Fine Arts Center", kind: "fun", blurb: "Concerts, dance and theater, often with student tickets.", at: [42.38791, -72.52404] },
  { id: "rec", emoji: "🏋️", name: "Recreation Center", kind: "fun", blurb: "Gym, climbing wall, courts and group fitness classes.", at: [42.38883, -72.53168] },
  { id: "pond", emoji: "🦆", name: "Campus Pond", kind: "outdoors", blurb: "The heart of campus. Ducks, benches and the best view of the Old Chapel.", at: [42.38947, -72.52653] },
  { id: "oldchapel", emoji: "⛪", name: "Old Chapel", kind: "fun", blurb: "The campus icon, renovated and used for events.", at: [42.38903, -72.52798] },
  { id: "durfee", emoji: "🌺", name: "Durfee Conservatory", kind: "outdoors", blurb: "A free greenhouse full of tropical plants. Warm on a January day.", at: [42.39066, -72.52254] },
  { id: "common", emoji: "🌳", name: "Amherst Town Common", kind: "fun", blurb: "Downtown's green, with the farmers market and town events.", at: [42.37448, -72.5199] },
  { id: "cinema", emoji: "🎬", name: "Amherst Cinema", kind: "fun", blurb: "An indie movie theater downtown.", at: [42.37523, -72.52058] },
  { id: "jones", emoji: "📖", name: "Jones Library", kind: "study", blurb: "Amherst's public library, a cozy change from campus.", at: [42.37624, -72.52089] },
  { id: "dickinson", emoji: "🪶", name: "Emily Dickinson Museum", kind: "fun", blurb: "The poet's house and garden, right on Main Street.", at: [42.3762, -72.51473] },
  { id: "beneski", emoji: "🦖", name: "Beneski Museum of Natural History", kind: "fun", blurb: "Dinosaur tracks and skeletons at Amherst College. Free.", at: [42.3721, -72.51415] },
  { id: "amherstcollege", emoji: "🎓", name: "Amherst College", kind: "fun", blurb: "A Five College neighbor. You can take classes here too.", at: [42.37038, -72.51607] },
  { id: "carle", emoji: "🐛", name: "Eric Carle Museum", kind: "fun", blurb: "Picture book art from The Very Hungry Caterpillar's creator.", at: [42.32106, -72.53297] },
  // outdoors
  { id: "puffers", emoji: "🏊", name: "Puffer's Pond", kind: "outdoors", blurb: "The local swimming hole in North Amherst. Busy on the first warm days.", at: [42.41622, -72.52029] },
  { id: "notch", emoji: "⛰️", name: "The Notch (Mount Holyoke Range)", kind: "outdoors", blurb: "Trailheads into the Holyoke Range. Great fall foliage hikes.", at: [42.3044, -72.5285] },
  { id: "railtrail", emoji: "🚲", name: "Norwottuck Rail Trail", kind: "outdoors", blurb: "A flat paved trail to Hadley and Northampton for biking and running.", at: [42.35527, -72.50344] },
  { id: "amethyst", emoji: "🍂", name: "Amethyst Brook", kind: "outdoors", blurb: "Easy wooded trails along a brook in East Amherst.", at: [42.37794, -72.4842] },
  // living
  { id: "southwest", emoji: "🏙️", name: "Southwest Residential Area", kind: "living", blurb: "The towers. The biggest and busiest res area.", at: [42.38282, -72.53003] },
  { id: "orchard", emoji: "🍎", name: "Orchard Hill", kind: "living", blurb: "Up the hill, quiet, with the Bowl for sledding.", at: [42.39192, -72.51928] },
  { id: "northeast", emoji: "🧭", name: "Northeast Residential Area", kind: "living", blurb: "Close to the science buildings and the CS building.", at: [42.39469, -72.52512] },
  { id: "honors", emoji: "🏅", name: "Commonwealth Honors College", kind: "living", blurb: "Honors housing with its own café and classrooms.", at: [42.38773, -72.53058] },
  // help
  { id: "uhs", emoji: "🩺", name: "University Health Services", kind: "help", blurb: "Medical care and the pharmacy for students.", at: [42.39044, -72.5216] },
  { id: "haigis", emoji: "🚌", name: "Haigis Mall bus stop", kind: "help", blurb: "Main PVTA stop on campus for buses to Amherst, Hadley and Northampton.", at: [42.38641, -72.52581] },
];

/** The building a schedule room string is in, like "HAS 134" or "Hasbrouck 20". */
export function placeForRoom(room: string | null | undefined): Place | undefined {
  if (!room) return undefined;
  return PLACES.find((p) => p.codes?.test(room));
}
