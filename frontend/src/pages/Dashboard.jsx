import { useEffect, useState } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import ProductCard from "@/components/ProductCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Heart, Package, FileBox, Upload, ArrowUpRight, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Dashboard() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") || "overview";

  const [wishlist, setWishlist] = useState([]);
  const [orders, setOrders] = useState([]);
  const [designs, setDesigns] = useState([]);

  useEffect(() => {
    if (!loading && !user) navigate("/");
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const [w, o, d] = await Promise.all([
          api.get("/wishlist"),
          api.get("/orders"),
          api.get("/designs", { params: { mine: true } }),
        ]);
        setWishlist(w.data); setOrders(o.data); setDesigns(d.data);
      } catch {}
    })();
  }, [user]);

  if (!user) return null;

  return (
    <div className="max-w-7xl mx-auto px-6 py-14">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
        <div>
          <div className="scanline w-12 mb-3"/>
          <h1 className="font-display font-semibold text-forge-text text-4xl">Welcome back, {user.name?.split(" ")[0]}</h1>
          <p className="text-forge-muted mt-2">Your maker workbench — wishlist, uploaded designs, and print orders in one place.</p>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-4 mb-10" data-testid="dashboard-stats">
        <StatCard icon={Heart} label="Wishlist" value={wishlist.length} color="text-forge-primary"/>
        <StatCard icon={Package} label="Print Orders" value={orders.length} color="text-forge-tech"/>
        <StatCard icon={FileBox} label="My Designs" value={designs.length} color="text-forge-primary"/>
      </div>

      <Tabs value={tab} onValueChange={(v)=>setParams({tab:v})}>
        <TabsList className="bg-forge-surface border border-forge-border p-1">
          <TabsTrigger value="overview" data-testid="tab-overview" className="data-[state=active]:bg-forge-primary data-[state=active]:text-forge-bg">Overview</TabsTrigger>
          <TabsTrigger value="wishlist" data-testid="tab-wishlist" className="data-[state=active]:bg-forge-primary data-[state=active]:text-forge-bg">Wishlist</TabsTrigger>
          <TabsTrigger value="orders" data-testid="tab-orders" className="data-[state=active]:bg-forge-primary data-[state=active]:text-forge-bg">Orders</TabsTrigger>
          <TabsTrigger value="designs" data-testid="tab-designs" className="data-[state=active]:bg-forge-primary data-[state=active]:text-forge-bg">My Designs</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-8">
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="card-forge p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-xl text-forge-text">Latest Wishlist</h3>
                <Link to="?tab=wishlist" className="font-mono text-xs uppercase text-forge-tech link-underline">See all →</Link>
              </div>
              {wishlist.length === 0 ? (
                <EmptyState msg="Save designs you love from the marketplace." cta="Browse marketplace" to="/"/>
              ) : (
                <ul className="space-y-3">
                  {wishlist.slice(0,3).map(p=>(
                    <li key={p.product_id}><MiniProductRow product={p}/></li>
                  ))}
                </ul>
              )}
            </div>
            <div className="card-forge p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-xl text-forge-text">Recent Orders</h3>
                <Link to="?tab=orders" className="font-mono text-xs uppercase text-forge-tech link-underline">See all →</Link>
              </div>
              {orders.length === 0 ? (
                <EmptyState msg="Send us a file and we'll print & ship it." cta="Send file" to="/print"/>
              ) : (
                <ul className="space-y-3">
                  {orders.slice(0,3).map(o=><li key={o.order_id}><OrderRow order={o}/></li>)}
                </ul>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="wishlist" className="mt-8">
          {wishlist.length === 0 ? (
            <EmptyState msg="Your wishlist is empty." cta="Browse marketplace" to="/"/>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {wishlist.map(p=><ProductCard key={p.product_id} product={p} inWishlist onWishlistChange={(id,on)=>{ if(!on) setWishlist(prev=>prev.filter(x=>x.product_id!==id)); }}/>)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="orders" className="mt-8">
          {orders.length === 0 ? (
            <EmptyState msg="No print orders yet." cta="Send a file to print" to="/print"/>
          ) : (
            <div className="space-y-3">{orders.map(o=><OrderRow key={o.order_id} order={o} full/>)}</div>
          )}
        </TabsContent>

        <TabsContent value="designs" className="mt-8">
          <div className="flex justify-between items-center mb-4">
            <p className="text-forge-muted text-sm font-mono">{designs.length} design(s) uploaded</p>
            <Link to="/community"><Button className="btn-forge rounded-full px-5"><Upload className="w-4 h-4 mr-2"/> Upload new</Button></Link>
          </div>
          {designs.length === 0 ? (
            <EmptyState msg="Share your first design with the community." cta="Go to community" to="/community"/>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {designs.map(d=>(
                <div key={d.design_id} className="card-forge p-4" data-testid={`my-design-${d.design_id}`}>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h4 className="font-display text-forge-text">{d.title}</h4>
                    {d.is_public ? <span className="chip chip-tech">PUBLIC</span> : <span className="chip">PRIVATE</span>}
                  </div>
                  <p className="text-xs text-forge-muted font-mono truncate">{d.original_filename}</p>
                  <div className="flex gap-4 mt-3 text-xs text-forge-muted font-mono">
                    <span className="flex items-center gap-1"><Heart className="w-3 h-3"/> {d.likes || 0}</span>
                    <span>{(d.file_size/1024/1024).toFixed(1)} MB</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({ icon:Icon, label, value, color }) {
  return (
    <div className="card-forge p-6 flex items-center justify-between">
      <div>
        <div className="font-mono text-[10px] uppercase tracking-widest text-forge-muted">{label}</div>
        <div className="font-display text-3xl text-forge-text mt-1">{value}</div>
      </div>
      <Icon className={`w-8 h-8 ${color}`}/>
    </div>
  );
}

function MiniProductRow({ product }) {
  return (
    <Link to={`/product/${product.product_id}`} className="flex items-center gap-3 p-2 rounded-lg hover:bg-forge-elevated transition group">
      <img src={product.image_url} alt={product.title} className="w-12 h-12 rounded object-cover"/>
      <div className="flex-1 min-w-0">
        <p className="text-forge-text text-sm truncate group-hover:text-forge-primary">{product.title}</p>
        <p className="text-xs text-forge-muted font-mono">${product.price} · {product.material}</p>
      </div>
      <ArrowUpRight className="w-4 h-4 text-forge-muted group-hover:text-forge-primary"/>
    </Link>
  );
}

function OrderRow({ order, full }) {
  const date = new Date(order.created_at).toLocaleDateString();
  return (
    <div className={`${full ? "card-forge p-5" : "p-3 rounded-lg hover:bg-forge-elevated"} flex items-center justify-between gap-4`}>
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded bg-forge-elevated flex items-center justify-center"><FileBox className="w-5 h-5 text-forge-primary"/></div>
        <div className="min-w-0">
          <p className="font-mono text-forge-primary text-sm">{order.order_id}</p>
          <p className="text-xs text-forge-muted truncate">{order.original_filename || "Catalog item"} · {order.material} · {order.color} · Qty {order.quantity}</p>
        </div>
      </div>
      <div className="text-right shrink-0">
        <span className="chip chip-tech uppercase">{order.status}</span>
        <p className="text-xs text-forge-muted font-mono mt-1 flex items-center gap-1"><Clock className="w-3 h-3"/>{date}</p>
      </div>
    </div>
  );
}

function EmptyState({ msg, cta, to }) {
  return (
    <div className="text-center py-12 border border-dashed border-forge-border rounded-xl">
      <p className="text-forge-muted mb-4">{msg}</p>
      <Link to={to}><Button className="btn-forge rounded-full px-5">{cta}</Button></Link>
    </div>
  );
}
