import { useEffect, useState } from 'react';
import {
  Search, Plus, AlertTriangle, Package, Filter,
  X, TrendingDown, TrendingUp, ChevronDown, Edit3
} from 'lucide-react';
import { toast } from 'sonner';
import {
  adjustProductStock,
  createProduct as createProductRecord,
  getProducts,
  updateProduct as updateProductRecord,
  type UiProduct,
} from '../lib/supabaseData';
import { useBranchStore } from '../store/useBranchStore';

const categoryColors: Record<string, { color: string; bg: string }> = {
  Styling: { color: '#2563EB', bg: 'rgba(37,99,235,0.1)' },
  'Beard Care': { color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' },
  'Hair Care': { color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  Shave: { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  Treatment: { color: '#ec4899', bg: 'rgba(236,72,153,0.1)' },
};

export function InventoryPage() {
  const activeBranchId = useBranchStore(state => state.activeBranchId);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: '', price: '', stock: '', category: 'Styling', supplier: '' });
  const [editProduct, setEditProduct] = useState<UiProduct | null>(null);
  const [products, setProducts] = useState<UiProduct[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const categories = ['All', 'Styling', 'Beard Care', 'Hair Care', 'Shave', 'Treatment'];

  const loadProducts = async () => {
    setIsLoading(true);
    try {
      const rows = await getProducts(activeBranchId);
      setProducts(rows);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load products';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadProducts();
  }, [activeBranchId]);

  const lowStockItems = products.filter(p => p.stock <= p.reorderLevel);

  const filtered = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase());
    const matchCat = categoryFilter === 'All' || p.category === categoryFilter;
    const matchLow = !showLowStockOnly || p.stock <= p.reorderLevel;
    return matchSearch && matchCat && matchLow;
  });

  const openCreateModal = () => {
    setEditProduct(null);
    setNewProduct({ name: '', price: '', stock: '', category: 'Styling', supplier: '' });
    setShowAddModal(true);
  };

  const openEditModal = (product: UiProduct) => {
    setEditProduct(product);
    setNewProduct({
      name: product.name,
      price: String(product.price),
      stock: String(product.stock),
      category: product.category,
      supplier: product.supplier || '',
    });
    setShowAddModal(true);
  };

  const handleSaveProduct = async () => {
    if (!newProduct.name.trim()) {
      toast.error('Product name is required');
      return;
    }

    if (!newProduct.price || Number(newProduct.price) < 0) {
      toast.error('Valid price is required');
      return;
    }

    if (!newProduct.stock || Number(newProduct.stock) < 0) {
      toast.error('Valid stock quantity is required');
      return;
    }

    try {
      if (editProduct) {
        await updateProductRecord(editProduct.id, {
          name: newProduct.name.trim(),
          price: Number(newProduct.price),
          stock: Number(newProduct.stock),
          category: newProduct.category,
          supplier: newProduct.supplier,
        });
        toast.success('Product updated');
      } else {
        await createProductRecord({
          name: newProduct.name.trim(),
          price: newProduct.price,
          stock: newProduct.stock,
          category: newProduct.category,
          supplier: newProduct.supplier,
          branchId: activeBranchId,
        });
        toast.success('Product added to inventory');
      }

      setShowAddModal(false);
      setEditProduct(null);
      setNewProduct({ name: '', price: '', stock: '', category: 'Styling', supplier: '' });
      await loadProducts();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save product';
      toast.error(message);
    }
  };

  const getStockStatus = (stock: number, reorderLevel: number) => {
    if (stock === 0) return { label: 'Out of Stock', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' };
    if (stock <= 5) return { label: 'Critical', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' };
    if (stock <= reorderLevel) return { label: 'Low Stock', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' };
    return { label: 'In Stock', color: '#10b981', bg: 'rgba(16,185,129,0.1)' };
  };

  return (
    <div className="p-4 lg:p-6 space-y-5 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white text-xl" style={{ fontWeight: 700 }}>Inventory</h1>
          <p className="text-[#6b7280] text-sm mt-0.5">{products.length} products · {lowStockItems.length} need restocking</p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#2563EB] hover:bg-[#1d4ed8] text-white rounded-xl text-sm transition-all"
          style={{ fontWeight: 600 }}
        >
          <Plus size={16} /> Add Product
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Products', value: products.length.toString(), sub: 'In catalog', color: '#2563EB' },
          { label: 'Low Stock', value: lowStockItems.length.toString(), sub: 'Need reorder', color: '#f59e0b' },
          { label: 'Total Value', value: `$${products.reduce((s, p) => s + p.price * p.stock, 0).toLocaleString()}`, sub: 'Stock value', color: '#10b981' },
          { label: 'Out of Stock', value: `${products.filter(product => product.stock === 0).length}`, sub: 'Items', color: '#ef4444' },
        ].map(stat => (
          <div key={stat.label} className="p-4 rounded-2xl" style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="text-xl mb-0.5" style={{ color: stat.color, fontWeight: 700 }}>{stat.value}</div>
            <div className="text-white text-xs" style={{ fontWeight: 500 }}>{stat.label}</div>
            <div className="text-[#4b5563] text-xs mt-0.5">{stat.sub}</div>
          </div>
        ))}
      </div>

      {/* Low Stock Alert Banner */}
      {lowStockItems.length > 0 && (
        <div className="flex items-start gap-3 p-4 rounded-2xl" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
          <AlertTriangle size={18} className="text-[#f59e0b] flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="text-[#f59e0b] text-sm mb-1" style={{ fontWeight: 600 }}>Low Stock Alert</div>
            <div className="flex flex-wrap gap-2">
              {lowStockItems.map(p => (
                <span key={p.id} className="text-xs px-2.5 py-1 rounded-lg" style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}>
                  {p.name} ({p.stock} left)
                </span>
              ))}
            </div>
          </div>
          <button
            onClick={async () => {
              for (const item of lowStockItems) {
                await adjustProductStock(item.id, Math.max(item.reorderLevel, 5));
              }
              toast.success('Reorder list sent to supplier');
              await loadProducts();
            }}
            className="flex-shrink-0 px-3 py-1.5 rounded-xl text-xs text-[#f59e0b] transition-all"
            style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', fontWeight: 600 }}
          >
            Reorder All
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4b5563]" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search products or SKU..."
            className="w-full bg-[#1a1a1a] border border-white/[0.06] rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-[#4b5563] focus:border-[#2563EB]/50 transition-all"
          />
        </div>
        <div className="flex items-center gap-1 p-1 rounded-xl flex-shrink-0" style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.06)' }}>
          {categories.slice(0, 4).map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className="px-3 py-1.5 rounded-lg text-xs transition-all"
              style={{ background: categoryFilter === cat ? '#2563EB' : 'transparent', color: categoryFilter === cat ? '#fff' : '#6b7280', fontWeight: categoryFilter === cat ? 600 : 400 }}
            >
              {cat}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowLowStockOnly(!showLowStockOnly)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs transition-all flex-shrink-0"
          style={{
            background: showLowStockOnly ? 'rgba(245,158,11,0.1)' : 'rgba(255,255,255,0.04)',
            border: showLowStockOnly ? '1px solid rgba(245,158,11,0.3)' : '1px solid rgba(255,255,255,0.06)',
            color: showLowStockOnly ? '#f59e0b' : '#6b7280',
            fontWeight: showLowStockOnly ? 600 : 400,
          }}
        >
          <AlertTriangle size={13} /> Low Stock Only
        </button>
      </div>

      {/* Product Grid */}
      {isLoading && (
        <div className="text-center text-[#6b7280] text-sm py-8">Loading inventory...</div>
      )}
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
        {filtered.map(product => {
          const catConfig = categoryColors[product.category] || { color: '#9ca3af', bg: 'rgba(156,163,175,0.1)' };
          const stockStatus = getStockStatus(product.stock, product.reorderLevel);
          const stockPct = Math.min(100, (product.stock / 80) * 100);

          return (
            <div
              key={product.id}
              className="p-4 rounded-2xl hover:bg-[#1f1f1f] transition-all"
              style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.05)' }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: catConfig.bg }}>
                    <Package size={18} style={{ color: catConfig.color }} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-white text-sm truncate" style={{ fontWeight: 600 }}>{product.name}</div>
                    <div className="text-[#4b5563] text-xs">{product.sku}</div>
                  </div>
                </div>
                <button
                  onClick={() => openEditModal(product)}
                  className="text-[#4b5563] hover:text-white transition-colors flex-shrink-0"
                >
                  <Edit3 size={14} />
                </button>
              </div>

              <div className="flex items-center justify-between mb-2">
                <span className="text-xs px-2.5 py-1 rounded-lg" style={{ background: catConfig.bg, color: catConfig.color, fontWeight: 600 }}>
                  {product.category}
                </span>
                <span className="text-white text-base" style={{ fontWeight: 700 }}>${product.price}</span>
              </div>

              {/* Stock bar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#6b7280]">Stock level</span>
                  <span style={{ color: stockStatus.color, fontWeight: 600 }}>{product.stock} units</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${stockPct}%`,
                      background: product.stock <= 5 ? '#ef4444' : product.stock <= product.reorderLevel ? '#f59e0b' : '#10b981',
                    }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: stockStatus.color, fontWeight: 600, background: stockStatus.bg, padding: '2px 8px', borderRadius: '6px' }}>
                    {stockStatus.label}
                  </span>
                  <span className="text-xs text-[#4b5563]">Reorder at {product.reorderLevel}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                <button
                  onClick={async () => {
                    await adjustProductStock(product.id, Math.max(product.reorderLevel, 5));
                    toast.success(`Reorder placed for ${product.name}`);
                    await loadProducts();
                  }}
                  className="flex-1 py-2 rounded-xl text-xs transition-all"
                  style={{ background: 'rgba(37,99,235,0.08)', color: '#2563EB', border: '1px solid rgba(37,99,235,0.2)', fontWeight: 600 }}
                >
                  Reorder
                </button>
                <button
                  onClick={() => openEditModal(product)}
                  className="flex-1 py-2 rounded-xl text-xs text-[#9ca3af] hover:text-white transition-all"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  Adjust Stock
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAddModal(false)} />
          <div className="relative w-full max-w-md rounded-2xl z-10 overflow-hidden" style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="flex items-center justify-between p-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <h3 className="text-white text-base" style={{ fontWeight: 700 }}>{editProduct ? 'Edit Product' : 'Add New Product'}</h3>
              <button onClick={() => setShowAddModal(false)} className="text-[#6b7280] hover:text-white"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              {[
                { label: 'PRODUCT NAME', field: 'name', placeholder: 'Premium Pomade', type: 'text' },
                { label: 'PRICE', field: 'price', placeholder: '24.99', type: 'number' },
                { label: 'INITIAL STOCK', field: 'stock', placeholder: '50', type: 'number' },
                { label: 'SUPPLIER', field: 'supplier', placeholder: 'BarberCo Supplies', type: 'text' },
              ].map(({ label, field, placeholder, type }) => (
                <div key={field}>
                  <label className="text-xs text-[#9ca3af] mb-2 block" style={{ letterSpacing: '0.05em' }}>{label}</label>
                  <input
                    type={type}
                    value={newProduct[field as keyof typeof newProduct]}
                    onChange={e => setNewProduct({ ...newProduct, [field]: e.target.value })}
                    placeholder={placeholder}
                    className="w-full bg-[#111111] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-[#3f3f46] focus:border-[#2563EB]/50 transition-all"
                  />
                </div>
              ))}
              <div>
                <label className="text-xs text-[#9ca3af] mb-2 block" style={{ letterSpacing: '0.05em' }}>CATEGORY</label>
                <select
                  value={newProduct.category}
                  onChange={e => setNewProduct({ ...newProduct, category: e.target.value })}
                  className="w-full bg-[#111111] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white focus:border-[#2563EB]/50 transition-all"
                >
                  {['Styling', 'Beard Care', 'Hair Care', 'Shave', 'Treatment'].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <button
                onClick={handleSaveProduct}
                className="w-full py-3.5 bg-[#2563EB] hover:bg-[#1d4ed8] text-white rounded-xl text-sm transition-all"
                style={{ fontWeight: 600 }}
              >
                {editProduct ? 'Update Product' : 'Add Product'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
