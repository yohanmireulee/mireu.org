// Every word on the site. *asterisks* become italics.

export const HERO_DEK = `Five things you own, taken apart. Every one of them was built to be thrown away.`;

export const THESIS = `Disposability is designed. We pay for it twice: once at the register, and again in the mining and the waste the price tag leaves out.`;

export const ESSAY = [
  {
    label: 'A thousand hours',
    text: `In 1924 the world’s lightbulb makers met in Geneva and agreed their bulbs lasted too long. They capped them at a thousand hours and fined any factory that beat it. It took a cartel then. Today it takes a bead of glue, a screw head nobody sells a driver for, a chip soldered where a socket used to be, and a plastic tub *welded shut.*`,
  },
  {
    label: 'The rest of the bill',
    text: `In 2022 the world threw out 62 million tonnes of electronics, and less than a quarter of it was documented as recycled. The rest of the bill is paid where the metals come from: in the cobalt mines of the Congo, Amnesty International found children as young as seven at work. Every repair priced out of reach sends *another order back to the mine.*`,
  },
];

export const INDEX_NOTE = `Choose one. Scroll, swipe or press the arrow, and it comes apart one part at a time.`;

export const ITEMS = [
  {
    slug: 'iphone',
    name: 'iPhone',
    kicker: 'The phone',
    dek: 'A battery with a phone built around it.',
    model: 'models/iphone.glb',
    view: { pitch: 0.5, spin: 0.14, ex: 1.0, yaw: -0.5 },
    lede: `The most repaired gadget on earth, and Apple still decides who is allowed to repair it. Every layer below is a decision about whether you get in.`,
    facts: [['Parts', '23'], ['Internal screws', '12, in five lengths'], ['Battery service', '$129']],
    stations: [
      {
        parts: ['Pentalobe screws'],
        title: 'A lock disguised as a screw',
        excuse: `Precision, and a tidier charging port.`,
        cost: `Apple began fitting these five-lobed heads in 2011, when almost nobody sold a driver to fit them. They keep nothing out except *you.*`,
      },
      {
        parts: ['Internal screws'],
        title: 'Twelve screws, five lengths',
        excuse: `Each is the shortest that will hold.`,
        cost: `Swap two and the long one drills into the logic board. Technicians call it *long-screw damage.* A design this unforgiving assumes only the factory will ever open it.`,
      },
      {
        parts: ['Cover glass', 'OLED display'],
        title: 'One crack, whole screen',
        excuse: `Glass bonded to the panel makes one seamless surface.`,
        cost: `So a crack in glass thinner than a credit card means a new display module: $329 at Apple for the last generation. The panel underneath, the expensive and energy-hungry part, goes in the bin with it.`,
      },
      {
        parts: ['Battery', 'Battery tray', 'Battery adhesive'],
        title: 'The part guaranteed to die',
        excuse: `The battery now sits in a tray, screwed down instead of glued.`,
        cost: `The iPhone 17 Pro dropped the design that let repairers in through the back, so reaching the battery still means lifting the screen first, past yet another screw head, Torx Plus. Out of warranty, Apple charges *$129* for an iPhone 18 Pro battery.`,
      },
      {
        parts: ['TrueDepth camera'],
        title: 'Parts that report on you',
        excuse: `Pairing parts to the board stops thieves.`,
        cost: `It also means a genuine part from another iPhone can show up as *unknown* until Apple’s software signs off. Security is the story. The effect is that Apple decides which repairs count.`,
      },
      {
        parts: ['Logic board', 'A-series chip', 'NAND storage', 'Modem and radios'],
        title: 'Everything, soldered',
        excuse: `Two boards stacked together leave more room for the battery.`,
        cost: `Memory and storage are soldered on, so a phone bought with too little stays that way. Chips like these carry most of a phone’s manufacturing carbon, and every replacement phone means making them *all over again.*`,
      },
      {
        parts: ['MagSafe coil and magnets', 'Back glass and camera plateau'],
        title: 'Convenience that cooks the battery',
        excuse: `Snap it on, it charges.`,
        cost: `Wireless charging turns part of its energy into heat, and heat is what wears a battery out fastest. Apple’s own guidance warns that anything above 35°C can permanently cut capacity.`,
      },
      {
        parts: ['Aluminium unibody', 'Midframe and vapor chamber'],
        title: 'Thin wins every argument',
        excuse: `A thinner phone sells.`,
        cost: `Screws need bosses and gaskets need grooves; glue and solder need almost nothing. Nobody returns a phone for being half a millimetre too thick. Millions replace one because its battery couldn’t be swapped.`,
      },
    ],
    economics: {
      title: 'The arithmetic',
      bars: [['Battery service, iPhone 18 Pro', 129, 'fix'], ['Cracked screen, last generation', 329, 'fix'], ['A new Pro, roughly', 1100, 'new']],
      body: `A battery is about twelve percent of a new phone. Swapping it buys two more years and skips building a whole new device, which for a phone is most of the carbon it will ever account for. That gap is the whole case for designing it to open.`,
    },
  },
  {
    slug: 'macbook',
    name: 'MacBook Air',
    kicker: 'The laptop',
    dek: 'Thin enough to slide under a door. Sealed enough to stay there.',
    model: 'models/macbook.glb',
    view: { pitch: 0.42, spin: 0.12, ex: 1.0, yaw: -0.7 },
    lede: `Nothing inside can be upgraded after you buy it. When the battery, the storage or a single chip gives out, the whole machine becomes the repair.`,
    facts: [['Parts', '21'], ['Upgradeable after purchase', 'None'], ['Battery service', 'up to $199']],
    stations: [
      {
        parts: ['Pentalobe screws'],
        title: 'The same lock, again',
        excuse: `A clean underside.`,
        cost: `Ten screws with a head most people have never seen. It’s the cheapest lock there is, and it works on almost everyone.`,
      },
      {
        parts: ['Battery cells', 'Battery adhesive'],
        title: 'Glued-in fuel',
        excuse: `No battery frame means a thinner laptop.`,
        cost: `The cells are stuck down with adhesive strips, and Apple charges up to *$199* to replace them. A battery is supposed to be the easy part. Plenty of laptops are binned because nobody said so.`,
      },
      {
        parts: ['Soldered SSD'],
        title: 'Storage with an expiry date',
        excuse: `Soldered flash is fast and saves a connector.`,
        cost: `Flash memory wears out. With an M.2 slot, a worn drive is a twenty-minute, one-screw swap. Here it means a new logic board, and if the board dies, *your files die with it.*`,
      },
      {
        parts: ['M-series chip and memory'],
        title: 'Pick once, keep forever',
        excuse: `Memory in the chip package is quick.`,
        cost: `The memory you buy at checkout is the memory the computer dies with. Most of these machines won’t be retired for breaking. They’ll be retired for running out of room *they could never be given.*`,
      },
      {
        parts: ['Logic board', 'Heat spreader'],
        title: 'One board, one point of failure',
        excuse: `No fan, nothing to wear out.`,
        cost: `A dead power chip, a spilled coffee, a worn-out SSD: every one ends at this board, and this board is replaced, not repaired.`,
      },
      {
        parts: ['Display lid', 'Liquid Retina panel', 'Display glass and bezel', 'Display hinge', 'Display cable', 'FaceTime camera'],
        title: 'Screen, lid, hinge: sold together',
        excuse: `One assembly keeps the lid thin and seamless.`,
        cost: `A cracked panel or a frayed display cable means the whole lid. The cable is the fragile part, and you can only buy it attached to the *most expensive* one.`,
      },
      {
        parts: ['Port boards'],
        title: 'Proof it’s a choice',
        excuse: `The ports sit on their own small boards.`,
        cost: `Ports break when people trip over cables, so Apple made them cheap modules. It knows exactly how to make a part replaceable. It *chose* which ones.`,
      },
    ],
    economics: {
      title: 'The arithmetic',
      bars: [['Battery service', 199, 'fix'], ['A new MacBook Air, roughly', 1000, 'new']],
      body: `Laptops die of three things: batteries, storage and spills. Here the first costs a fifth of a new machine, the second has no repair at all, and the third takes the whole computer with it.`,
    },
  },
  {
    slug: 'washer',
    name: 'Front-load washer',
    kicker: 'The washing machine',
    dek: 'Built to spin a thousand times a minute for a decade. Built not to open.',
    model: 'models/washer.glb',
    view: { pitch: 0.3, spin: 0.12, ex: 1.0, yaw: -0.6 },
    lede: `The motor in this washer could run for decades. The bearings beside it can’t, and on many modern front-loaders they’re sealed inside a tub welded shut at the factory.`,
    facts: [['Parts', '29'], ['Tub halves', '2, welded into 1'], ['Bearing and seal kit', 'under $70']],
    stations: [
      {
        parts: ['Door bellow'],
        title: 'Replaceable, because it’s cheap',
        excuse: `The rubber seal is made to be swapped.`,
        cost: `Two clamps and an afternoon. Notice which parts get that treatment: the ones that cost almost nothing. *The expensive ones are next.*`,
      },
      {
        parts: ['Concrete counterweights'],
        title: 'Ballast for the landfill',
        excuse: `Concrete is cheap and heavy.`,
        cost: `It’s dead weight, shipped across oceans and almost never recovered. It tells you how little of this machine was ever meant to come back.`,
      },
      {
        parts: ['Outer tub (welded shut)'],
        title: 'The weld',
        excuse: `No gasket to leak, faster to build.`,
        cost: `Everything that wears is now sealed inside. The factory fix is a whole new tub with the bearings pressed in, and repair guides warn it can approach the price of a new machine. Washers used to be built to be split. This one was built to be *skipped.*`,
      },
      {
        parts: ['Bearings and seal'],
        title: 'A $65 part in a $500 box',
        excuse: `Two bearings carry the drum.`,
        cost: `The seal ages, water gets in, the bearings start to roar. A bearing-and-seal kit costs under $70. Welded into the tub, it can only be bought *as a whole new tub.*`,
      },
      {
        parts: ['Drum spider and shaft'],
        title: 'Corrosion you can’t see',
        excuse: `Aluminium is light and casts easily.`,
        cost: `It corrodes in hot, soapy water where it meets the steel shaft. Sealed inside, the first warning is the noise, and by then the tub is scrap.`,
      },
      {
        parts: ['Motor stator', 'Motor rotor'],
        title: 'The motor that outlives the machine',
        excuse: `Direct drive: no belt, no brushes.`,
        cost: `These motors are tough enough to carry long warranties. They go to landfill anyway, bolted to a tub nobody can open.`,
      },
      {
        parts: ['Main control board'],
        title: 'Discontinued',
        excuse: `One board is cheaper than five.`,
        cost: `When a model-specific board dies and goes out of production, a perfectly good washer is scrap. The share of big appliances replaced within five years because of a defect *more than doubled* between 2004 and 2012.`,
      },
    ],
    economics: {
      title: 'The arithmetic',
      bars: [['Bearing and seal kit', 65, 'fix'], ['Replacement tub assembly, approx.', 500, 'new']],
      body: `Bolted, a worn bearing costs $65 and a Saturday. Welded, it costs a tub assembly of several hundred dollars plus labour, so most people buy a new machine and send seventy-odd kilograms of steel, plastic and concrete off on a truck, good motor included.`,
    },
  },
  {
    slug: 'fridge',
    name: 'French-door refrigerator',
    kicker: 'The refrigerator',
    dek: 'A box of foam with a heart you can’t reach.',
    model: 'models/fridge.glb',
    view: { pitch: 0.24, spin: 0.12, ex: 1.0, yaw: -0.6 },
    lede: `A fridge runs every hour of every day for a decade or more, so it should be the easiest thing in the house to fix. This LG is built the other way round.`,
    facts: [['Parts', '25'], ['Sealed-system repair', '$600 to $1,400'], ['2020 settlement', 'about 1.5 million owners']],
    stations: [
      {
        parts: ['Polyurethane foam'],
        title: 'Glued into one box',
        excuse: `Foam insulates and stiffens the cabinet.`,
        cost: `It also buries the wiring and refrigerant lines for good. At the dump, US law doesn’t require anyone to recover the blowing agent inside, so it usually escapes during shredding.`,
      },
      {
        parts: ['Sealed-system tubing'],
        title: 'A loop with no door',
        excuse: `No fittings, no leaks.`,
        cost: `Any repair means a licensed technician cutting it open, brazing and recharging. Cost guides put that at $600 to $1,400, often more than half a new fridge. That’s exactly where people *stop fixing.*`,
      },
      {
        parts: ['Linear compressor'],
        title: 'Twenty-year claims',
        excuse: `Fewer moving parts, quieter, more efficient.`,
        cost: `LG advertises twenty-year durability. In 2020 it settled a class action covering about 1.5 million owners whose compressors allegedly failed and stopped cooling. New lawsuits make the same claim.`,
      },
      {
        parts: ['Evaporator and defrost heater'],
        title: 'Cold, hot, cold, leak',
        excuse: `Thin tubing moves heat well.`,
        cost: `Thousands of freeze-and-defrost cycles open pinhole leaks, and at least one lawsuit traces LG’s failures here. A hole in the evaporator is a hole in the sealed system. See above.`,
      },
      {
        parts: ['In-door ice maker'],
        title: 'The hardest way to make ice',
        excuse: `It frees up shelf space.`,
        cost: `A motor, a heater, a valve and an auger, riding in a door people slam. Repairs run $100 to $500, all to make *frozen tap water.*`,
      },
      {
        parts: ['Water filter'],
        title: 'Built to be bought',
        excuse: `It twists out in seconds.`,
        cost: `The easiest part to replace is the one you’re expected to buy every six months. Notice which part got the good design.`,
      },
      {
        parts: ['Left French door', 'Right French door', 'Glass shelves', 'Crisper drawers'],
        title: 'They know how',
        excuse: `Gaskets press in, shelves lift out.`,
        cost: `Everything you touch every day is designed for you to replace. The easy access stops *exactly* where the expensive parts begin.`,
      },
    ],
    economics: {
      title: 'The arithmetic',
      bars: [['Ice maker repair, mid-range', 300, 'fix'], ['Sealed-system repair, mid-range', 1000, 'fix'], ['A new French-door fridge, roughly', 2500, 'new']],
      body: `The failures that matter sit in the sealed system and cost close to half a new fridge. The old one is a block of steel welded to foam that can’t be cleanly recycled. The EPA estimates that properly retiring 1,000 old refrigerators avoids about 4,260 tonnes of CO₂-equivalent. Most are never retired properly.`,
    },
  },
  {
    slug: 'model-y',
    name: 'Tesla Model Y',
    kicker: 'The car',
    dek: 'The car is the battery is the floor.',
    model: 'models/model_y.glb',
    view: { pitch: 0.34, spin: 0.08, ex: 1.0, yaw: -0.8 },
    lede: `Two giant castings and a battery that doubles as the floor. Every one of those choices makes it cheaper to build and harder to fix, and the bill goes to insurers first and everyone’s premiums after.`,
    facts: [['Parts', '35'], ['Cells in this model', '864'], ['Parts one rear casting replaced', 'about 70']],
    stations: [
      {
        parts: ['Front megacasting', 'Rear megacasting'],
        title: 'Seventy parts, one pour',
        excuse: `One casting replaces about seventy stamped parts and hundreds of robots.`,
        cost: `In a crash, a stamped rail can be cut out and replaced. A casting is one enormous part, and repairers treat it warily. *Wary is expensive.*`,
      },
      {
        parts: ['Pack lid (the cabin floor)', 'Battery pack tray'],
        title: 'The battery is the floor',
        excuse: `Making the pack part of the body saves weight and cost.`,
        cost: `So the most expensive part of the car is also its structure. A pack replacement can run past $15,000, which turns a scraped underside into a write-off.`,
      },
      {
        parts: ['4680 cells'],
        title: 'Cells you can’t reach',
        excuse: `Bigger cells, fewer connections.`,
        cost: `Nickel and cobalt from specific mines, dug by specific people, and not one cell can be tested or swapped once the pack is sealed.`,
      },
      {
        parts: ['Structural foam'],
        title: 'Then they poured foam on it',
        excuse: `Foam locks the cells in and stiffens the car.`,
        cost: `Teardown engineer Sandy Munro called the pack’s repairability *zero.* Reuters found insurers writing off low-mileage EVs over minor battery damage. A car bought to cut emissions, scrapped for a scratch.`,
      },
      {
        parts: ['Glass roof and windows'],
        title: 'One piece of sky',
        excuse: `It makes the cabin feel huge.`,
        cost: `A branch or a hailstone means replacing the whole panel, one of the largest pieces of glass in any car.`,
      },
      {
        parts: ['Front left wheel and tyre', 'Front right wheel and tyre', 'Rear left wheel and tyre', 'Rear right wheel and tyre'],
        title: 'Heavier, so it sheds more',
        excuse: `Instant torque, and a battery that weighs as much as a piano.`,
        cost: `Weight and torque wear tyres faster, and the rubber doesn’t vanish. It turns into fine particles on roads and in rivers.`,
      },
      {
        parts: ['Heat pump and Octovalve'],
        title: 'Clever, and all in one',
        excuse: `One valve block runs the whole thermal system.`,
        cost: `Elegant systems tend to become single parts. When everything flows through one assembly, one failure is a *whole-system* repair.`,
      },
      {
        parts: ['Front drive unit', 'Rear drive unit'],
        title: 'The weak link was chosen',
        excuse: `The motors are built to last.`,
        cost: `They are, and that’s the point. Motors that could run for decades sit on a pack that a parking-lot kerb can disqualify.`,
      },
    ],
    economics: {
      title: 'The arithmetic',
      bars: [['Battery pack replacement, can exceed', 15000, 'fix'], ['A new Model Y, roughly', 45000, 'new']],
      body: `An electric car is still the cleaner car over its life, but only if it gets to live that life. Building the battery puts a carbon debt on day one that years of driving pay back. Write the car off at twenty thousand miles and the debt is never cleared.`,
    },
  },
];

export const WORKS_CITED = [
  `Amnesty International. <em>“This Is What We Die For”: Human Rights Abuses in the Democratic Republic of the Congo Power the Global Trade in Cobalt.</em> Amnesty International, 2016.`,
  `“Apple Increased the Price of iPhone 18 Pro Battery Repairs.” <em>Tom’s Guide,</em> 2026.`,
  `Apple. “Batteries: Maximizing Performance.” <em>Apple,</em> www.apple.com/batteries/maximizing-performance. Accessed 25 Nov. 2026.`,
  `Apple. “MacBook Air (13-inch, M4, 2025) Battery.” <em>Apple Support,</em> support.apple.com/121944. Accessed 25 Nov. 2026.`,
  `Apple. <em>Product Environmental Report: iPhone 17 Pro.</em> Apple, Sept. 2025.`,
  `Baldé, Cornelis P., et al. <em>The Global E-waste Monitor 2024.</em> International Telecommunication Union and UNITAR, 2024.`,
  `Carey, Nick, et al. “Scratched EV Battery? Your Insurer May Have to Junk the Whole Car.” <em>Reuters,</em> 20 Mar. 2023.`,
  `“Front Load Washer Tub Bearing and Seal Kit.” <em>eBay,</em> listing 321306015693. Accessed 25 Nov. 2026.`,
  `Graham, Adam. “How Much Does It Cost to Repair a Refrigerator?” <em>Fixr,</em> 29 Aug. 2025.`,
  `“Here’s How Much a MacBook Neo Repair Will Cost You.” <em>9to5Mac,</em> 9 Mar. 2026.`,
  `“Here’s How Much iPhone Air Battery Replacements and Repairs Will Cost You.” <em>PhoneArena,</em> Sept. 2025.`,
  `iFixit. “iPhone 17 Pro Chip ID” and iPhone and MacBook Air repair guides. <em>iFixit,</em> www.ifixit.com. Accessed 25 Nov. 2026.`,
  `International Energy Agency. <em>Global EV Outlook 2024.</em> IEA, 2024.`,
  `“iPhone 17 Pro Teardown Reveals Apple’s New Approach to Thermal Management and Repairs.” <em>MacRumors,</em> 23 Sept. 2025.`,
  `Krajewski, Markus. “The Great Lightbulb Conspiracy.” <em>IEEE Spectrum,</em> 24 Sept. 2014.`,
  `“LG Fridge Compressors: Take Action Over Cooling Problems.” <em>ClassAction.org.</em> Accessed 25 Nov. 2026.`,
  `Noel, Sarah. “Refrigerator Repair Cost.” <em>HomeGuide,</em> 2025.`,
  `“Owners of Expensive Refrigerators Breaking Early in Their Lifespan File Lawsuits Claiming Fraud.” <em>NBC 5 Chicago.</em> Accessed 25 Nov. 2026.`,
  `Prakash, Siddharth, et al. <em>Einfluss der Nutzungsdauer von Produkten auf ihre Umweltwirkung: Schaffung einer Informationsgrundlage und Entwicklung von Strategien gegen „Obsoleszenz“.</em> Umweltbundesamt, 2016.`,
  `“Tesla Releases Video of Giga Press in Action Producing Giant Single-Piece Rear Body.” <em>Electrek,</em> 4 Feb. 2021.`,
  `U.S. Environmental Protection Agency. “Appliance Disposal” and “Responsible Appliance Disposal (RAD) Program.” <em>EPA.</em> Accessed 25 Nov. 2026.`,
  `“Washing Machine Bearing Replacement Cost: Repair or Replace?” <em>DG Floors.</em> Accessed 25 Nov. 2026.`,
];
