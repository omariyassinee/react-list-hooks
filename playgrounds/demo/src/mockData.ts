import type { ProductItem, LargeDatasetItem } from "./types";

export const CATEGORIES = [
  "All",
  "Gadgets",
  "Audio",
  "Workstation",
  "Wearables",
] as const;
export const ALL_TAGS = [
  "AI",
  "Wireless",
  "RGB",
  "Ergonomic",
  "Pro",
  "Ultra",
  "Portable",
  "Titanium",
] as const;

export const STATUS_PRIORITY_ORDER: Record<string, number> = {
  "In Stock": 1,
  "Low Stock": 2,
  "Pre-order": 3,
};

export const INITIAL_PRODUCTS: ProductItem[] = Array.from(
  { length: 45 },
  (_, i) => {
    const categories: ProductItem["category"][] = [
      "Gadgets",
      "Audio",
      "Workstation",
      "Wearables",
    ];
    const category = categories[i % categories.length];
    const names = {
      Gadgets: [
        "CyberDeck Pro",
        "HoloLens Mini",
        "Quantum Key",
        "Neural Node",
        "Flux Capacitor",
        "Nano Drone",
        "Pocket Terminal",
        "MagCharge Dock",
        "Smart Prism",
        "Laser Stylus",
      ],
      Audio: [
        "Acoustic Pulse Headphones",
        "Bass Cannon Speaker",
        "Sonic Pods Ultra",
        "Studio Monitor X",
        "Noise Cancellation Earbuds",
        "Wireless Mic V2",
        "HiFi DAC Transmitter",
        "Spatial Audio Bar",
        "Vocal Isolator",
        "Sound Wave Pod",
      ],
      Workstation: [
        "ErgoDesk Dual Arm",
        'OLED Curved Display 49"',
        "Mechanical RGB Board",
        "Precision Laser Mouse",
        "Thunderbolt Hub 12-in-1",
        "Vertical Dock Station",
        "Smart Desk Mat",
        "KVM Matrix Switch",
        "4K Streaming Cam",
        "Biometric Scanner",
      ],
      Wearables: [
        "Titanium Smart Ring",
        "Chrono Watch Ultra",
        "BioFeedback Band",
        "AR Glasses Light",
        "Haptics Glove",
        "Sleep Monitor Strap",
        "Hydration Sensor",
        "Pulse Tracker V4",
        "Smart Jacket Clip",
        "Fitness Pod",
      ],
    };
    const categoryNames = names[category];
    const baseName = categoryNames[i % categoryNames.length];
    const itemNumber = (i % 12) + 1;
    const name = `${baseName} #${itemNumber}`;

    const tagPool = [
      ALL_TAGS[i % ALL_TAGS.length],
      ALL_TAGS[(i + 2) % ALL_TAGS.length],
      ALL_TAGS[(i + 4) % ALL_TAGS.length],
    ];
    const tags = Array.from(new Set(tagPool)).slice(0, (i % 3) + 1);

    let status: ProductItem["status"] =
      i % 5 === 0 ? "Low Stock" : i % 7 === 0 ? "Pre-order" : "In Stock";
    if (i === 10) status = null;
    if (i === 22) status = undefined;

    const rating =
      i === 15 || i === 30 ? NaN : Number((3.5 + (i % 15) * 0.1).toFixed(1));
    const createdAt = new Date(Date.now() - i * 86400000 * 1.3);

    return {
      id: i + 1,
      name,
      category,
      price: Math.floor(29 + ((i * 37) % 470)),
      status,
      rating,
      createdAt,
      tags,
    };
  },
);

export const DEPARTMENTS: LargeDatasetItem["department"][] = [
  "Engineering",
  "Marketing",
  "Sales",
  "Product",
  "Legal",
  "Support",
];

const FIRST_NAMES = [
  "Alex",
  "Jordan",
  "Taylor",
  "Morgan",
  "Casey",
  "Sam",
  "Chris",
  "Pat",
  "Elena",
  "Lucas",
  "Aria",
  "Marcus",
  "Maya",
  "Liam",
  "Chloe",
  "Ethan",
  "Sophia",
  "Noah",
  "Zoe",
  "Oliver",
];

const LAST_NAMES = [
  "Smith",
  "Johnson",
  "Williams",
  "Brown",
  "Jones",
  "Garcia",
  "Miller",
  "Davis",
  "Rodriguez",
  "Martinez",
  "Hernandez",
  "Lopez",
  "Gonzalez",
  "Wilson",
  "Anderson",
  "Thomas",
  "Taylor",
  "Moore",
  "Jackson",
  "Martin",
];

export function generateLargeDataset(
  count: number = 100_000,
): LargeDatasetItem[] {
  const items: LargeDatasetItem[] = new Array(count);
  const now = Date.now();

  for (let i = 0; i < count; i++) {
    const firstName = FIRST_NAMES[i % FIRST_NAMES.length];
    const lastName = LAST_NAMES[(i * 7) % LAST_NAMES.length];
    const department = DEPARTMENTS[i % DEPARTMENTS.length];
    const salary = 42000 + ((i * 137) % 118000);
    const rating = Number((2.5 + ((i * 11) % 25) * 0.1).toFixed(1));
    const isActive = i % 4 !== 0;
    const createdAt = new Date(now - (i % 730) * 86400000);

    items[i] = {
      id: i + 1,
      name: `${firstName} ${lastName} #${i + 1}`,
      department,
      salary,
      rating,
      isActive,
      createdAt,
    };
  }

  return items;
}
