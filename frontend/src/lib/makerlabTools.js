// Shared MakerLab tool catalog — mirrored on Tools page + surfaced inline in /search.
export const MAKERLAB_BASE = "https://makerworld.com/en/makerlab";

export const MAKERLAB_TOOLS = [
  { id: "make-my-sign",     name: "Make My Sign",       desc: "Personalised signs & nameplates.",             tags: ["signs","nameplate","badge","text"] },
  { id: "make-my-vase",     name: "Make My Vase",       desc: "Parametric vases with textures.",              tags: ["vase","decor","parametric"] },
  { id: "pixel-puzzle",     name: "Pixel Puzzle Maker", desc: "Photo → interlocking 3D pixel puzzle.",        tags: ["puzzle","photo","gift"] },
  { id: "image-to-3d",      name: "Image → 3D Model",   desc: "Image → printable 3D relief.",                  tags: ["image","relief","convert","ai"] },
  { id: "image-to-keychain",name: "Image → Keychain",   desc: "Photo keychain generator.",                    tags: ["keychain","photo","gift"] },
  { id: "make-my-statue",   name: "Make My Statue",     desc: "Face-photo to 3D bust.",                        tags: ["portrait","bust","statue","ai"] },
  { id: "relief-sculpture", name: "3D → Relief",        desc: "3D model → wall-mount relief carving.",         tags: ["relief","wall art"] },
  { id: "ai-scanner",       name: "AI Scanner",         desc: "Scan a real object with your phone.",           tags: ["scan","photogrammetry","ai"] },
  { id: "lithophane",       name: "Lithophane Maker",   desc: "Photo → backlit lithophane.",                   tags: ["lithophane","light","photo"] },
  { id: "photobox",         name: "Photo Box",          desc: "Multi-side lithophane box.",                    tags: ["box","lithophane","light"] },
  { id: "stamp-maker",      name: "Stamp Maker",        desc: "Text/logo → rubber-stamp die.",                 tags: ["stamp","logo","text"] },
  { id: "coin-maker",       name: "Coin Maker",         desc: "Two-sided coin generator.",                     tags: ["coin","medal"] },
  { id: "cookie-cutter",    name: "Cookie Cutter",      desc: "Shape → food-safe cookie cutter.",              tags: ["cookie","kitchen"] },
  { id: "custom-badge",     name: "Custom Badge",       desc: "Round or shield badges + lanyard slot.",        tags: ["badge","event"] },
  { id: "colour-swatch",    name: "Colour Swatch",      desc: "Physical filament colour picker.",              tags: ["swatch","reference"] },
  { id: "ruler-maker",      name: "Ruler / Calipers",   desc: "Metric or imperial rulers, cases, squares.",    tags: ["ruler","measure"] },
];

export function toolHref(id) { return `${MAKERLAB_BASE}/${id}`; }
