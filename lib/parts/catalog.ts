export const PARTS_BY_LOCATION: Record<string, string[]> = {
  Drivetrain: [
    "Chain",
    "Chainring",
    "Cassette",
    "Freewheel",
    "Crankset",
    "Crank Arm",
    "Bottom Bracket",
    "Rear Derailleur",
    "Front Derailleur",
    "Jockey Wheels",
    "Shift Cable",
    "Shift Housing",
    "Pulley Bolt",
    "Master Link"
  ],
  Brakes: [
    "Brake Pads",
    "Brake Rotor",
    "Brake Lever",
    "Brake Caliper",
    "Brake Cable",
    "Brake Housing",
    "Hydraulic Hose",
    "Bleed Kit Consumables"
  ],
  Wheels: [
    "Rim",
    "Spokes",
    "Nipples",
    "Hub",
    "Hub Bearings",
    "Freehub Body",
    "Axle",
    "Rim Tape",
    "Skewer",
    "Thru Axle"
  ],
  Tires: [
    "Tire",
    "Tube",
    "Tubeless Valve",
    "Tubeless Sealant",
    "Tubeless Repair Plug",
    "Tire Insert"
  ],
  Cockpit: [
    "Handlebar",
    "Stem",
    "Headset",
    "Headset Bearings",
    "Grips",
    "Bar Tape",
    "Spacer",
    "Top Cap",
    "Top Cap Bolt"
  ],
  Frame: [
    "Derailleur Hanger",
    "Bottle Cage",
    "Frame Protector",
    "Cable Guide",
    "Seat Clamp",
    "Frame Bearing Kit"
  ],
  Suspension: [
    "Fork Service Kit",
    "Shock Service Kit",
    "Fork Seal Kit",
    "Shock Bushing",
    "Suspension Oil",
    "Suspension Air Can Seal"
  ],
  ContactPoints: [
    "Saddle",
    "Seatpost",
    "Dropper Post Cartridge",
    "Pedals",
    "Cleats"
  ],
  EBike: [
    "Battery",
    "Battery Mount",
    "Display Unit",
    "Speed Sensor",
    "Motor Cover",
    "Motor Mount Bolt"
  ],
  Accessories: [
    "Kickstand",
    "Bell",
    "Light Set",
    "Mudguard",
    "Rack",
    "Computer Mount",
    "Chain Lube",
    "Degreaser"
  ]
};

export const COMMON_PART_BRANDS = [
  "Shimano",
  "SRAM",
  "Campagnolo",
  "MicroSHIFT",
  "KMC",
  "SunRace",
  "DT Swiss",
  "Maxxis",
  "Schwalbe",
  "Continental",
  "WTB",
  "Fox",
  "RockShox",
  "Race Face",
  "Hope",
  "TRP",
  "Magura",
  "Tektro",
  "FSA",
  "Cane Creek"
];

export const PART_LOCATIONS = Object.keys(PARTS_BY_LOCATION);
