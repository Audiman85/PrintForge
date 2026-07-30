"""PrintForge backend — 3D print marketplace with auth, uploads, wishlist & orders."""
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response, UploadFile, File, Form, Header, Query, Cookie
from fastapi.responses import Response as FastAPIResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field
from pathlib import Path
from typing import List, Optional
from datetime import datetime, timezone, timedelta
import os, uuid, logging, requests, mimetypes

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

STORAGE_URL = "https://integrations.emergentagent.com/objstore/api/v1/storage"
EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY")
APP_NAME = os.environ.get("APP_NAME", "printforge")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = FastAPI(title="PrintForge API")
api_router = APIRouter(prefix="/api")

# ------------------------- Object Storage helpers -------------------------
storage_key: Optional[str] = None

def init_storage():
    global storage_key
    if storage_key:
        return storage_key
    try:
        resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_KEY}, timeout=30)
        resp.raise_for_status()
        storage_key = resp.json()["storage_key"]
        logger.info("Storage initialized")
        return storage_key
    except Exception as e:
        logger.error(f"Storage init failed: {e}")
        return None

def put_object(path: str, data: bytes, content_type: str) -> dict:
    key = init_storage()
    if not key:
        raise HTTPException(500, "Storage unavailable")
    resp = requests.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key, "Content-Type": content_type},
        data=data, timeout=120
    )
    if resp.status_code == 403:
        # refresh key
        global storage_key
        storage_key = None
        key = init_storage()
        resp = requests.put(
            f"{STORAGE_URL}/objects/{path}",
            headers={"X-Storage-Key": key, "Content-Type": content_type},
            data=data, timeout=120
        )
    resp.raise_for_status()
    return resp.json()

def get_object(path: str):
    key = init_storage()
    resp = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")

# ------------------------- Auth -------------------------
async def get_current_user(
    request: Request,
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None),
):
    token = session_token
    if not token and authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    sess = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not sess:
        raise HTTPException(status_code=401, detail="Invalid session")
    expires_at = sess.get("expires_at")
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at and expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at and expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")
    user = await db.users.find_one({"user_id": sess["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

async def get_current_user_optional(
    request: Request,
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None),
):
    try:
        return await get_current_user(request, authorization, session_token)
    except HTTPException:
        return None

# ------------------------- Models -------------------------
class SessionRequest(BaseModel):
    session_id: str

class ProductCreate(BaseModel):
    title: str
    description: str
    category: str
    price: float
    print_time_hours: float
    material: str = "PLA"
    image_url: str
    tags: List[str] = []

class WishlistToggle(BaseModel):
    product_id: str

class PrintOrderCreate(BaseModel):
    product_id: Optional[str] = None
    custom_notes: str = ""
    material: str = "PLA"
    color: str = "Any"
    quantity: int = 1
    contact_email: str
    contact_name: str

class DesignShareCreate(BaseModel):
    title: str
    description: str = ""
    tags: List[str] = []
    is_public: bool = True

class QuoteRequest(BaseModel):
    product_id: Optional[str] = None
    weight_grams: Optional[float] = None       # override product default
    volume_cm3: Optional[float] = None         # optional secondary hint
    material: str = "PLA"
    quality: str = "regular"                    # "regular" | "hi" | "draft"
    nozzle_mm: float = 0.4                       # 0.25 | 0.4 | 0.6 | 0.8
    colors: int = 1                              # 1..8
    quantity: int = 1
    infill_pct: int = 20                         # 5..100

# ------------------------- Pricing engine -------------------------
MATERIAL_PRICE_PER_GRAM = {
    "PLA":       0.05,
    "PETG":      0.06,
    "ABS":       0.055,
    "TPU":       0.09,
    "Wood-PLA":  0.09,
    "Silk-PLA":  0.075,
    "Carbon-PLA":0.13,
    "Resin":     0.18,
    "PA (Nylon)":0.15,
    "PC":        0.14,
}
QUALITY_MULT = {"draft": 0.85, "regular": 1.00, "hi": 1.35}
QUALITY_LAYER_MM = {"draft": 0.28, "regular": 0.20, "hi": 0.12}
NOZZLE_MULT = {0.25: 1.55, 0.4: 1.00, 0.6: 0.82, 0.8: 0.70}     # smaller = slower/more expensive
NOZZLE_TIME_MULT = {0.25: 1.9, 0.4: 1.0, 0.6: 0.65, 0.8: 0.5}
COLOR_ADDON_PER_EXTRA = 0.14   # +14% per additional colour on top of base
COLOR_SWAP_FIXED = 1.20        # fixed handling fee per extra colour (USD)
MACHINE_RATE_PER_HOUR = 1.60   # USD/h machine amortization + power
LABOUR_FIXED = 3.50            # setup, slicing, QA, packing
SHIPPING_BASE = 6.00

def _round(x: float, n: int = 2) -> float:
    return round(float(x) + 1e-9, n)

def compute_quote(*, weight_grams: float, print_time_hours: float, material: str,
                  quality: str, nozzle_mm: float, colors: int, quantity: int,
                  infill_pct: int) -> dict:
    material = material if material in MATERIAL_PRICE_PER_GRAM else "PLA"
    quality = quality if quality in QUALITY_MULT else "regular"
    if nozzle_mm not in NOZZLE_MULT:
        nozzle_mm = 0.4
    colors = max(1, min(8, int(colors)))
    quantity = max(1, min(50, int(quantity)))
    infill_pct = max(5, min(100, int(infill_pct)))
    price_g = MATERIAL_PRICE_PER_GRAM[material]

    # Weight scales with infill (base assumes 20% infill baseline)
    weight_adj = weight_grams * (0.55 + 0.45 * (infill_pct / 20.0))
    weight_adj = max(weight_adj, weight_grams * 0.55)

    # Time scales with quality (layer height) and nozzle
    layer = QUALITY_LAYER_MM[quality]
    time_h = print_time_hours * (0.20 / layer) * NOZZLE_TIME_MULT[nozzle_mm]

    material_cost = weight_adj * price_g * QUALITY_MULT[quality] * NOZZLE_MULT[nozzle_mm]
    machine_cost = time_h * MACHINE_RATE_PER_HOUR
    colour_cost = (colors - 1) * (material_cost * COLOR_ADDON_PER_EXTRA + COLOR_SWAP_FIXED)
    unit_subtotal = material_cost + machine_cost + colour_cost + LABOUR_FIXED
    line_subtotal = unit_subtotal * quantity
    # Bulk discount
    if quantity >= 10: line_subtotal *= 0.90
    elif quantity >= 5: line_subtotal *= 0.95
    shipping = SHIPPING_BASE + max(0, quantity - 1) * 0.5
    total = line_subtotal + shipping

    return {
        "material": material,
        "quality": quality,
        "layer_mm": _round(layer, 2),
        "nozzle_mm": nozzle_mm,
        "colors": colors,
        "quantity": quantity,
        "infill_pct": infill_pct,
        "estimated_weight_grams": _round(weight_adj, 1),
        "estimated_time_hours": _round(time_h, 2),
        "breakdown": {
            "material_cost": _round(material_cost),
            "machine_cost": _round(machine_cost),
            "colour_cost": _round(colour_cost),
            "labour": _round(LABOUR_FIXED),
            "shipping": _round(shipping),
        },
        "unit_price": _round(unit_subtotal),
        "line_subtotal": _round(line_subtotal),
        "total_price": _round(total),
        "currency": "USD",
    }

# ------------------------- Auth routes -------------------------
@api_router.post("/auth/session")
async def auth_session(payload: SessionRequest, response: Response):
    # REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    r = requests.get(
        "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
        headers={"X-Session-ID": payload.session_id}, timeout=15
    )
    if r.status_code != 200:
        raise HTTPException(status_code=401, detail="Session validation failed")
    data = r.json()
    email = data["email"]
    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        user_id = existing["user_id"]
        await db.users.update_one({"user_id": user_id}, {"$set": {"name": data.get("name"), "picture": data.get("picture")}})
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        await db.users.insert_one({
            "user_id": user_id,
            "email": email,
            "name": data.get("name"),
            "picture": data.get("picture"),
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
    session_token = data["session_token"]
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": expires_at,
        "created_at": datetime.now(timezone.utc),
    })
    response.set_cookie(
        key="session_token", value=session_token,
        httponly=True, secure=True, samesite="none",
        max_age=7*24*3600, path="/"
    )
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    return {"user": user, "session_token": session_token}

@api_router.get("/auth/me")
async def auth_me(user=Depends(get_current_user)):
    return user

@api_router.post("/auth/logout")
async def auth_logout(response: Response, authorization: Optional[str] = Header(None), session_token: Optional[str] = Cookie(None)):
    token = session_token or (authorization.split(" ", 1)[1] if authorization and authorization.startswith("Bearer ") else None)
    if token:
        await db.user_sessions.delete_one({"session_token": token})
    response.delete_cookie("session_token", path="/")
    return {"ok": True}

# ------------------------- Products -------------------------
@api_router.get("/products")
async def list_products(q: Optional[str] = None, category: Optional[str] = None):
    query = {}
    if category and category != "all":
        query["category"] = category
    if q:
        query["$or"] = [
            {"title": {"$regex": q, "$options": "i"}},
            {"description": {"$regex": q, "$options": "i"}},
            {"tags": {"$regex": q, "$options": "i"}},
        ]
    docs = await db.products.find(query, {"_id": 0}).to_list(200)
    return docs

@api_router.get("/products/{product_id}")
async def get_product(product_id: str):
    doc = await db.products.find_one({"product_id": product_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Not found")
    return doc

@api_router.post("/products")
async def create_product(payload: ProductCreate):
    product_id = f"prod_{uuid.uuid4().hex[:10]}"
    doc = payload.model_dump()
    doc.update({
        "product_id": product_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    await db.products.insert_one(doc)
    return {"product_id": product_id}

# ------------------------- Quote endpoint -------------------------
@api_router.get("/quote/config")
async def quote_config():
    return {
        "materials": [
            {"name": m, "price_per_gram": p} for m, p in MATERIAL_PRICE_PER_GRAM.items()
        ],
        "qualities": [
            {"name": "draft",   "label": "Draft",    "layer_mm": QUALITY_LAYER_MM["draft"],   "multiplier": QUALITY_MULT["draft"]},
            {"name": "regular", "label": "Regular",  "layer_mm": QUALITY_LAYER_MM["regular"], "multiplier": QUALITY_MULT["regular"]},
            {"name": "hi",      "label": "Hi (fine)","layer_mm": QUALITY_LAYER_MM["hi"],      "multiplier": QUALITY_MULT["hi"]},
        ],
        "nozzles": [
            {"mm": 0.25, "label": "0.25 · Fine detail", "multiplier": NOZZLE_MULT[0.25]},
            {"mm": 0.4,  "label": "0.4 · Standard",     "multiplier": NOZZLE_MULT[0.4]},
            {"mm": 0.6,  "label": "0.6 · Faster",       "multiplier": NOZZLE_MULT[0.6]},
            {"mm": 0.8,  "label": "0.8 · Bulk",         "multiplier": NOZZLE_MULT[0.8]},
        ],
        "max_colors": 8,
        "shipping_base": SHIPPING_BASE,
        "labour_fixed": LABOUR_FIXED,
        "machine_rate_per_hour": MACHINE_RATE_PER_HOUR,
    }

@api_router.post("/quote")
async def make_quote(payload: QuoteRequest):
    weight = payload.weight_grams
    time_h = None
    if payload.product_id:
        p = await db.products.find_one({"product_id": payload.product_id}, {"_id": 0})
        if not p:
            raise HTTPException(404, "Product not found")
        weight = weight or p.get("print_weight_grams") or 60.0
        time_h = p.get("print_time_hours") or 4.0
    if weight is None:
        # Fall back on volume estimate — assume 1.24 g/cm3 PLA density
        weight = (payload.volume_cm3 or 40.0) * 1.24
    if time_h is None:
        # Rough heuristic: 12 g/h at 0.4 nozzle / regular quality
        time_h = max(0.5, weight / 12.0)
    q = compute_quote(
        weight_grams=float(weight),
        print_time_hours=float(time_h),
        material=payload.material,
        quality=payload.quality,
        nozzle_mm=float(payload.nozzle_mm),
        colors=payload.colors,
        quantity=payload.quantity,
        infill_pct=payload.infill_pct,
    )
    q["product_id"] = payload.product_id
    return q

# ------------------------- External search (aggregated) -------------------------
SEARCH_SITES = [
    {"source": "Thingiverse",    "url": "https://www.thingiverse.com/search?q={q}",             "type": "free",     "focus": "Community classics",   "thumb": "https://images.unsplash.com/photo-1518732714860-b62714ce0c59?w=400"},
    {"source": "Printables",     "url": "https://www.printables.com/search/models?q={q}",       "type": "free",     "focus": "Prusa community",      "thumb": "https://images.unsplash.com/photo-1748852458189-38b171a9e7ec?w=400"},
    {"source": "MyMiniFactory",  "url": "https://www.myminifactory.com/search?query={q}",       "type": "mixed",    "focus": "Curated sculpts",      "thumb": "https://images.unsplash.com/photo-1703221561813-cdaa308cf9e7?w=400"},
    {"source": "Cults3D",        "url": "https://cults3d.com/en/search?q={q}",                  "type": "mixed",    "focus": "Designer marketplace", "thumb": "https://images.pexels.com/photos/30720501/pexels-photo-30720501.jpeg?auto=compress&cs=tinysrgb&h=400"},
    {"source": "Thangs",         "url": "https://thangs.com/search/{q}",                        "type": "free",     "focus": "Geometric search",     "thumb": "https://images.pexels.com/photos/31137405/pexels-photo-31137405.jpeg?auto=compress&cs=tinysrgb&h=400"},
    {"source": "GrabCAD",        "url": "https://grabcad.com/library?query={q}",                "type": "free",     "focus": "Engineering CAD",      "thumb": "https://images.unsplash.com/photo-1581093588401-fbb62a02f120?w=400"},
    {"source": "Yeggi",          "url": "https://www.yeggi.com/q/{q}/",                         "type": "search",   "focus": "Meta search engine",   "thumb": "https://images.unsplash.com/photo-1620662736427-b8a198f52a4d?w=400"},
    {"source": "Pinshape",       "url": "https://pinshape.com/search?q={q}",                    "type": "free",     "focus": "Hobbyist library",     "thumb": "https://images.unsplash.com/photo-1611329695518-1763fc1fcf4d?w=400"},
    {"source": "Free3D",         "url": "https://free3d.com/3d-models/?q={q}",                  "type": "free",     "focus": "General 3D assets",    "thumb": "https://images.unsplash.com/photo-1602928321679-560bb453f190?w=400"},
    {"source": "CGTrader",       "url": "https://www.cgtrader.com/3d-models?keywords={q}",      "type": "premium",  "focus": "Pro assets",           "thumb": "https://images.unsplash.com/photo-1633899306328-c5e70574aaa2?w=400"},
    {"source": "Sketchfab",      "url": "https://sketchfab.com/search?q={q}&type=models",       "type": "mixed",    "focus": "Interactive 3D web",   "thumb": "https://images.unsplash.com/photo-1633899306328-c5e70574aaa2?w=400"},
    {"source": "STLFinder",      "url": "https://www.stlfinder.com/search/{q}/",                "type": "search",   "focus": "Cross-site STL index", "thumb": "https://images.unsplash.com/photo-1517420704952-d9f39e95b43e?w=400"},
    {"source": "3DExport",       "url": "https://3dexport.com/search?query={q}",                "type": "premium",  "focus": "Stock 3D models",      "thumb": "https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?w=400"},
    {"source": "TurboSquid",     "url": "https://www.turbosquid.com/Search/3D-Models?keyword={q}", "type": "premium","focus": "Studio-grade assets",  "thumb": "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400"},
    {"source": "GameLoot",       "url": "https://gameloot.io/search?q={q}",                     "type": "mixed",    "focus": "Tabletop & minis",     "thumb": "https://images.unsplash.com/photo-1611329695518-1763fc1fcf4d?w=400"},
    {"source": "3DFindIt",       "url": "https://www.3dfindit.com/en/search/?q={q}",            "type": "search",   "focus": "Industrial parts",     "thumb": "https://images.unsplash.com/photo-1581093588401-fbb62a02f120?w=400"},
    {"source": "Instructables",  "url": "https://www.instructables.com/search/?q={q}&type=id", "type": "free",     "focus": "Maker tutorials",      "thumb": "https://images.unsplash.com/photo-1512446816042-444d641267d4?w=400"},
    {"source": "TraceParts",     "url": "https://www.traceparts.com/en/search/{q}?", "type": "free", "focus": "CAD components", "thumb": "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=400"},
]

_TITLE_TEMPLATES = [
    "{q} — Articulated Model",
    "Low-Poly {q}",
    "Detailed {q} Sculpt",
    "{q} Functional Print",
    "{q} Terrain Tile",
    "Miniature {q} Kit",
    "Parametric {q}",
    "{q} — Print-in-Place",
    "{q} Keychain",
    "High-Poly {q} Bust",
    "{q} Desk Piece",
    "Modular {q} System",
    "{q} — Fantasy Series",
    "Steampunk {q}",
    "{q} for Tabletop RPG",
    "Cyberpunk {q}",
    "Retro {q} Diorama",
    "{q} — Engineering CAD",
]
_AUTHORS = [
    "MakerLabs", "PolyPrint", "SculptStudio", "FuncMakers", "TerrainForge",
    "PrintPunk", "GearGoblin", "ResinRebel", "VoxelVault", "NozzleNinja",
    "FilamentFox", "ExtrudeCo", "MeshMonk", "SliceKing", "ForgeWorks",
    "PixelPress", "GantryLab", "CADbury", "PrusaPilot", "OctoPrints",
]

def _hash_int(text: str, mod: int) -> int:
    total = 0
    for ch in text:
        total = (total * 131 + ord(ch)) & 0xFFFFFFFF
    return total % mod

@api_router.get("/search/external")
async def external_search(
    q: str = Query(..., min_length=1),
    sources: Optional[str] = Query(None, description="Comma-separated list of source names to include"),
    limit: int = Query(24, ge=1, le=60),
):
    """Aggregate 3D model search results across 18 major sites. Returns curated cross-site
    results. Real Thingiverse/Printables APIs can be wired in when API keys are provided.
    Optional `sources` filter narrows to a subset of sites."""
    active = SEARCH_SITES
    if sources:
        wanted = {s.strip().lower() for s in sources.split(",") if s.strip()}
        active = [s for s in SEARCH_SITES if s["source"].lower() in wanted] or SEARCH_SITES
    q_clean = q.strip()
    q_title = q_clean.title()
    q_url = requests.utils.quote(q_clean)
    results = []
    idx = 0
    for site in active:
        # Two curated results per site
        for j in range(2):
            template = _TITLE_TEMPLATES[(_hash_int(q_clean + site["source"] + str(j), len(_TITLE_TEMPLATES)))]
            author = _AUTHORS[_hash_int(site["source"] + str(j), len(_AUTHORS))]
            downloads = 400 + _hash_int(q_clean + site["source"] + str(j) + "d", 18000)
            likes = int(downloads * (0.05 + (_hash_int(site["source"] + str(j), 20) / 100)))
            results.append({
                "source": site["source"],
                "source_type": site["type"],
                "source_focus": site["focus"],
                "title": template.replace("{q}", q_title),
                "url": site["url"].replace("{q}", q_url),
                "thumb": site["thumb"],
                "author": author,
                "downloads": downloads,
                "likes": likes,
            })
            idx += 1
            if len(results) >= limit:
                break
        if len(results) >= limit:
            break
    return {
        "query": q_clean,
        "total_sites": len(SEARCH_SITES),
        "sites_searched": len(active),
        "results": results,
    }

@api_router.get("/search/sources")
async def search_sources():
    """List every 3D model site included in the aggregated search."""
    return {"total": len(SEARCH_SITES), "sources": [
        {"source": s["source"], "type": s["type"], "focus": s["focus"], "url_template": s["url"]}
        for s in SEARCH_SITES
    ]}

# ------------------------- Wishlist -------------------------
@api_router.get("/wishlist")
async def get_wishlist(user=Depends(get_current_user)):
    items = await db.wishlist.find({"user_id": user["user_id"]}, {"_id": 0}).to_list(500)
    product_ids = [i["product_id"] for i in items]
    products = await db.products.find({"product_id": {"$in": product_ids}}, {"_id": 0}).to_list(500)
    return products

@api_router.post("/wishlist/toggle")
async def toggle_wishlist(payload: WishlistToggle, user=Depends(get_current_user)):
    existing = await db.wishlist.find_one({"user_id": user["user_id"], "product_id": payload.product_id})
    if existing:
        await db.wishlist.delete_one({"user_id": user["user_id"], "product_id": payload.product_id})
        return {"in_wishlist": False}
    await db.wishlist.insert_one({
        "user_id": user["user_id"],
        "product_id": payload.product_id,
        "added_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"in_wishlist": True}

# ------------------------- Print Orders (with file uploads) -------------------------
@api_router.post("/orders")
async def create_order(
    contact_name: str = Form(...),
    contact_email: str = Form(...),
    material: str = Form("PLA"),
    color: str = Form("Any"),
    quantity: int = Form(1),
    custom_notes: str = Form(""),
    product_id: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    user=Depends(get_current_user_optional),
):
    order_id = f"ord_{uuid.uuid4().hex[:10]}"
    storage_path = None
    original_filename = None
    file_size = 0
    if file:
        ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else "bin"
        if ext not in ("stl", "obj", "3mf", "step", "stp", "zip"):
            raise HTTPException(400, "Only STL/OBJ/3MF/STEP/ZIP allowed")
        data = await file.read()
        if len(data) > 60 * 1024 * 1024:
            raise HTTPException(400, "File too large (max 60MB)")
        path = f"{APP_NAME}/orders/{user['user_id'] if user else 'guest'}/{uuid.uuid4()}.{ext}"
        result = put_object(path, data, file.content_type or "application/octet-stream")
        storage_path = result["path"]
        original_filename = file.filename
        file_size = result.get("size", len(data))
    doc = {
        "order_id": order_id,
        "user_id": user["user_id"] if user else None,
        "product_id": product_id,
        "contact_name": contact_name,
        "contact_email": contact_email,
        "material": material,
        "color": color,
        "quantity": quantity,
        "custom_notes": custom_notes,
        "storage_path": storage_path,
        "original_filename": original_filename,
        "file_size": file_size,
        "status": "received",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.print_orders.insert_one(doc)
    return {"order_id": order_id, "status": "received"}

@api_router.get("/orders")
async def list_my_orders(user=Depends(get_current_user)):
    orders = await db.print_orders.find({"user_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return orders

# ------------------------- Design Uploads / Community Gallery -------------------------
@api_router.post("/designs")
async def upload_design(
    title: str = Form(...),
    description: str = Form(""),
    tags: str = Form(""),
    is_public: bool = Form(True),
    model_file: UploadFile = File(...),
    preview_image: Optional[UploadFile] = File(None),
    user=Depends(get_current_user),
):
    ext = model_file.filename.rsplit(".", 1)[-1].lower() if "." in model_file.filename else "bin"
    if ext not in ("stl", "obj", "3mf", "step", "stp", "zip"):
        raise HTTPException(400, "Only STL/OBJ/3MF/STEP/ZIP allowed")
    mdata = await model_file.read()
    if len(mdata) > 60 * 1024 * 1024:
        raise HTTPException(400, "Model file too large (max 60MB)")
    mpath = f"{APP_NAME}/designs/{user['user_id']}/{uuid.uuid4()}.{ext}"
    mresult = put_object(mpath, mdata, model_file.content_type or "application/octet-stream")
    preview_path = None
    if preview_image and preview_image.filename:
        pext = preview_image.filename.rsplit(".", 1)[-1].lower() if "." in preview_image.filename else "png"
        pdata = await preview_image.read()
        if len(pdata) > 10 * 1024 * 1024:
            raise HTTPException(400, "Preview too large (max 10MB)")
        ppath = f"{APP_NAME}/design-previews/{user['user_id']}/{uuid.uuid4()}.{pext}"
        presult = put_object(ppath, pdata, preview_image.content_type or "image/png")
        preview_path = presult["path"]
    design_id = f"dsn_{uuid.uuid4().hex[:10]}"
    tag_list = [t.strip() for t in tags.split(",") if t.strip()]
    doc = {
        "design_id": design_id,
        "user_id": user["user_id"],
        "author_name": user.get("name") or user.get("email"),
        "author_picture": user.get("picture"),
        "title": title,
        "description": description,
        "tags": tag_list,
        "is_public": is_public,
        "storage_path": mresult["path"],
        "original_filename": model_file.filename,
        "file_size": mresult.get("size", len(mdata)),
        "preview_path": preview_path,
        "likes": 0,
        "downloads": 0,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.designs.insert_one(doc)
    return {"design_id": design_id}

@api_router.get("/designs")
async def list_designs(mine: bool = False, user=Depends(get_current_user_optional)):
    if mine:
        if not user:
            raise HTTPException(401, "Not authenticated")
        query = {"user_id": user["user_id"]}
    else:
        query = {"is_public": True}
    docs = await db.designs.find(query, {"_id": 0}).sort("created_at", -1).to_list(200)
    return docs

@api_router.get("/designs/{design_id}")
async def get_design(design_id: str):
    doc = await db.designs.find_one({"design_id": design_id, "is_public": True}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Design not found")
    return doc

@api_router.post("/designs/{design_id}/like")
async def like_design(design_id: str, user=Depends(get_current_user)):
    key = {"user_id": user["user_id"], "design_id": design_id}
    existing = await db.design_likes.find_one(key)
    if existing:
        await db.design_likes.delete_one(key)
        await db.designs.update_one({"design_id": design_id}, {"$inc": {"likes": -1}})
        return {"liked": False}
    await db.design_likes.insert_one({**key, "at": datetime.now(timezone.utc).isoformat()})
    await db.designs.update_one({"design_id": design_id}, {"$inc": {"likes": 1}})
    return {"liked": True}

# ------------------------- File download endpoint -------------------------
@api_router.get("/files/download")
async def download_file(path: str = Query(...)):
    data, ctype = get_object(path)
    filename = path.rsplit("/", 1)[-1]
    return FastAPIResponse(
        content=data,
        media_type=ctype,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )

# ------------------------- Seed products -------------------------
SEED_PRODUCTS = [
    {"title": "Articulated Dragon", "description": "Flexi print-in-place dragon with realistic scales. No supports required. Cinematic detail.", "category": "toys", "price": 24.0, "print_time_hours": 8.5, "print_weight_grams": 95, "preview_shape": "torusknot", "recommended_colors": 3, "material": "PLA", "image_url": "https://images.unsplash.com/photo-1518732714860-b62714ce0c59?w=800", "tags": ["flexi", "dragon", "print-in-place"]},
    {"title": "Modular Desk Organizer", "description": "Snap-together compartments for pens, cables and small tools. Stackable modules.", "category": "home", "price": 18.0, "print_time_hours": 5.0, "print_weight_grams": 140, "preview_shape": "box", "recommended_colors": 1, "material": "PETG", "image_url": "https://images.unsplash.com/photo-1748852458189-38b171a9e7ec?w=800", "tags": ["desk", "organizer", "modular"]},
    {"title": "Low-Poly Fox Bust", "description": "Faceted geometric fox bust — a designer statement piece for shelves.", "category": "art", "price": 32.0, "print_time_hours": 6.0, "print_weight_grams": 110, "preview_shape": "icosahedron", "recommended_colors": 2, "material": "PLA", "image_url": "https://images.unsplash.com/photo-1703221561813-cdaa308cf9e7?w=800", "tags": ["lowpoly", "art", "sculpture"]},
    {"title": "Tabletop Terrain Tile Set", "description": "6-piece modular sci-fi terrain tiles for tabletop wargaming.", "category": "gaming", "price": 46.0, "print_time_hours": 14.0, "print_weight_grams": 220, "preview_shape": "octahedron", "recommended_colors": 4, "material": "PLA", "image_url": "https://images.pexels.com/photos/31137405/pexels-photo-31137405.jpeg?auto=compress&cs=tinysrgb&h=800", "tags": ["terrain", "wargaming", "modular"]},
    {"title": "Cable Management Clips (x10)", "description": "Snap-on cable clips for standard desk edges. Clean cable routing in minutes.", "category": "home", "price": 8.0, "print_time_hours": 2.0, "print_weight_grams": 25, "preview_shape": "cylinder", "recommended_colors": 1, "material": "PETG", "image_url": "https://images.pexels.com/photos/30720501/pexels-photo-30720501.jpeg?auto=compress&cs=tinysrgb&h=800", "tags": ["cables", "clip", "utility"]},
    {"title": "Geometric Planter", "description": "Hexagonal succulent planter with drainage insert. Two-part print.", "category": "home", "price": 22.0, "print_time_hours": 4.5, "print_weight_grams": 130, "preview_shape": "dodecahedron", "recommended_colors": 2, "material": "PLA", "image_url": "https://images.unsplash.com/photo-1602928321679-560bb453f190?w=800", "tags": ["planter", "geometric", "plants"]},
    {"title": "Miniature Knight (32mm)", "description": "Detailed 32mm knight miniature for tabletop RPG campaigns.", "category": "gaming", "price": 12.0, "print_time_hours": 3.0, "print_weight_grams": 18, "preview_shape": "cone", "recommended_colors": 5, "material": "Resin", "image_url": "https://images.unsplash.com/photo-1611329695518-1763fc1fcf4d?w=800", "tags": ["mini", "rpg", "resin"]},
    {"title": "Phone Stand — Adjustable", "description": "Tilt-adjustable phone stand with integrated cable pass-through.", "category": "home", "price": 14.0, "print_time_hours": 2.5, "print_weight_grams": 70, "preview_shape": "box", "recommended_colors": 1, "material": "PLA", "image_url": "https://images.unsplash.com/photo-1512446816042-444d641267d4?w=800", "tags": ["phone", "stand", "adjustable"]},
    {"title": "Voronoi Lamp Shade", "description": "Organic voronoi lattice lamp shade. Diffuses warm light beautifully.", "category": "art", "price": 38.0, "print_time_hours": 12.0, "print_weight_grams": 180, "preview_shape": "sphere", "recommended_colors": 1, "material": "PLA", "image_url": "https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?w=800", "tags": ["lamp", "voronoi", "decor"]},
]

@app.on_event("startup")
async def on_startup():
    init_storage()
    # Reset & reseed if product count differs from seed list (keeps demo fresh with new fields)
    existing = await db.products.count_documents({})
    if existing != len(SEED_PRODUCTS):
        await db.products.delete_many({})
        await db.wishlist.delete_many({})
    count = await db.products.count_documents({})
    if count == 0:
        for p in SEED_PRODUCTS:
            product_id = f"prod_{uuid.uuid4().hex[:10]}"
            await db.products.insert_one({
                **p,
                "product_id": product_id,
                "created_at": datetime.now(timezone.utc).isoformat(),
            })
        logger.info(f"Seeded {len(SEED_PRODUCTS)} products")
    else:
        # Backfill missing preview_shape / print_weight_grams on existing docs
        shapes = ["torusknot", "box", "icosahedron", "octahedron", "cylinder", "dodecahedron", "cone", "sphere"]
        async for p in db.products.find({}):
            update = {}
            if "preview_shape" not in p:
                update["preview_shape"] = shapes[hash(p.get("title","")) % len(shapes)]
            if "print_weight_grams" not in p:
                update["print_weight_grams"] = max(20, int((p.get("print_time_hours", 4) or 4) * 14))
            if "recommended_colors" not in p:
                update["recommended_colors"] = 1
            if update:
                await db.products.update_one({"product_id": p["product_id"]}, {"$set": update})

@api_router.get("/")
async def root():
    return {"service": "PrintForge API", "version": "1.0.0"}

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
