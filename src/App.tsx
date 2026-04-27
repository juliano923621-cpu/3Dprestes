/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, 
  Package, 
  Users, 
  Calculator, 
  Plus, 
  Search, 
  Filter,
  CheckCircle2,
  Clock,
  Printer,
  ChevronRight,
  TrendingUp,
  Settings,
  MoreVertical,
  LogOut,
  X,
  CreditCard,
  Layers,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from './lib/supabase';
import { Auth } from './components/Auth';

// --- Types ---

type OrderStatus = 'quoted' | 'queued' | 'printing' | 'finished' | 'delivered' | 'cancelled';

interface Material {
  id: string;
  name: string; // e.g., PLA, PETG, TPU
  color: string;
  pricePerKg: number;
}

interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
}

interface Order {
  id: string;
  clientId: string;
  pieceName: string;
  materialId: string;
  weightGrams: number;
  printTimeHours: number;
  status: OrderStatus;
  price: number;
  createdAt: string;
  deliveryDate?: string;
}

// --- Constants ---

const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; icon: any }> = {
  quoted: { label: 'Orçado', color: 'border-blue-200 text-blue-600 bg-blue-50', icon: Clock },
  queued: { label: 'Na Fila', color: 'border-amber-200 text-amber-600 bg-amber-50', icon: LayoutDashboard },
  printing: { label: 'Imprimindo', color: 'border-blue-200 text-blue-600 bg-blue-50', icon: Printer },
  finished: { label: 'Concluído', color: 'border-emerald-200 text-emerald-600 bg-emerald-50', icon: CheckCircle2 },
  delivered: { label: 'Entregue', color: 'border-slate-200 text-slate-500 bg-slate-50', icon: CheckCircle2 },
  cancelled: { label: 'Cancelado', color: 'border-red-200 text-red-600 bg-red-50', icon: X },
};

const MATERIALS_INITIAL: Material[] = [
  { id: '1', name: 'PLA Basic', color: 'White', pricePerKg: 120 },
  { id: '2', name: 'PETG Strong', color: 'Black', pricePerKg: 140 },
  { id: '3', name: 'TPU Flexible', color: 'Red', pricePerKg: 220 },
];

const CLIENTS_INITIAL: Client[] = [
  { id: '1', name: 'Juliano Silva', email: 'juliano@example.com', phone: '(11) 99999-0000' },
  { id: '2', name: 'Oficina Tech', email: 'contato@oficinatech.com', phone: '(11) 3333-3333' },
];

const ORDERS_INITIAL: Order[] = [
  { id: 'ORD-001', clientId: '1', pieceName: 'Suporte Headset', materialId: '1', weightGrams: 45, printTimeHours: 3.5, status: 'printing', price: 45.0, createdAt: new Date().toISOString() },
  { id: 'ORD-002', clientId: '2', pieceName: 'Engrenagem V2', materialId: '2', weightGrams: 12, printTimeHours: 1.2, status: 'quoted', price: 25.0, createdAt: new Date().toISOString() },
];

// --- Components ---

function StatusBadge({ status }: { status: OrderStatus }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.quoted;
  const Icon = config.icon;
  return (
    <span className={`status-badge flex items-center gap-1 ${config.color}`}>
      <Icon size={10} />
      {config.label}
    </span>
  );
}

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'orders' | 'clients' | 'calculator' | 'settings'>('dashboard');
  const [settings, setSettings] = useState({
    materialPricePerKg: 120,
    machinePricePerHour: 5,
    multipliers: {
      low: 1.5,
      medium: 2,
      high: 2.5
    }
  });
  const [orders, setOrders] = useState<Order[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;
    async function loadData() {
      try {
        const [
          { data: clientsData },
          { data: ordersData },
          { data: settingsData }
        ] = await Promise.all([
          supabase.from('clients').select('*'),
          supabase.from('orders').select('*').order('created_at', { ascending: false }),
          supabase.from('settings').select('*').single()
        ]);

        if (clientsData) {
          setClients(clientsData.map((c: any) => ({
            id: c.id,
            name: c.name,
            email: c.email || '',
            phone: c.phone || ''
          })));
        }
        
        if (ordersData) {
          setOrders(ordersData.map((o: any) => ({
            id: o.id,
            clientId: o.client_id,
            pieceName: o.piece_name,
            materialId: o.material_id,
            weightGrams: o.weight_grams,
            printTimeHours: o.print_time_hours,
            status: o.status,
            price: o.price,
            createdAt: o.created_at
          })));
        }

        if (settingsData) {
          setSettings({
            materialPricePerKg: settingsData.material_price_per_kg,
            machinePricePerHour: settingsData.machine_price_per_hour,
            multipliers: {
              low: settingsData.multiplier_low,
              medium: settingsData.multiplier_medium,
              high: settingsData.multiplier_high
            }
          });
        }
      } catch (error) {
        console.error("Error loading Supabase data:", error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [session]);

  const [materials] = useState<Material[]>(MATERIALS_INITIAL);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [newClient, setNewClient] = useState({ name: '', email: '', phone: '' });
  const [newOrder, setNewOrder] = useState({
    clientId: '',
    pieceName: '',
    materialId: '1',
    weightGrams: 0,
    printTimeHours: 0,
    price: 0,
    status: 'quoted' as OrderStatus
  });

  const handleCreateClient = async () => {
    if (!newClient.name) return;
    
    if (editingClientId) {
      const { data, error } = await supabase
        .from('clients')
        .update({
          name: newClient.name,
          email: newClient.email,
          phone: newClient.phone
        })
        .eq('id', editingClientId)
        .select();
      
      if (!error && data) {
        setClients(clients.map(c => c.id === editingClientId ? {
          id: data[0].id,
          name: data[0].name,
          email: data[0].email || '',
          phone: data[0].phone || ''
        } : c));
      }
      setEditingClientId(null);
    } else {
      const { data, error } = await supabase
        .from('clients')
        .insert([{
          user_id: session.user.id,
          name: newClient.name,
          email: newClient.email,
          phone: newClient.phone
        }])
        .select();
      
      if (!error && data) {
        setClients([...clients, {
          id: data[0].id,
          name: data[0].name,
          email: data[0].email || '',
          phone: data[0].phone || ''
        }]);
      }
    }
    setNewClient({ name: '', email: '', phone: '' });
    setIsClientModalOpen(false);
  };

  const handleCreateOrder = async () => {
    if (!newOrder.pieceName || !newOrder.clientId) return;
    
    const dbPayload = {
      user_id: session.user.id,
      client_id: newOrder.clientId,
      piece_name: newOrder.pieceName,
      material_id: newOrder.materialId,
      weight_grams: newOrder.weightGrams,
      print_time_hours: newOrder.printTimeHours,
      price: newOrder.price,
      status: newOrder.status
    };

    if (editingOrderId) {
      const { data, error } = await supabase
        .from('orders')
        .update(dbPayload)
        .eq('id', editingOrderId)
        .select();
      
      if (!error && data) {
        setOrders(orders.map(o => o.id === editingOrderId ? {
          id: data[0].id,
          clientId: data[0].client_id,
          pieceName: data[0].piece_name,
          materialId: data[0].material_id,
          weightGrams: data[0].weight_grams,
          printTimeHours: data[0].print_time_hours,
          status: data[0].status,
          price: data[0].price,
          createdAt: data[0].created_at
        } : o));
      }
      setEditingOrderId(null);
    } else {
      const newId = `ORD-${Math.floor(1000 + Math.random() * 9000)}`;
      const { data, error } = await supabase
        .from('orders')
        .insert([{ id: newId, ...dbPayload }])
        .select();
      
      if (!error && data) {
        setOrders([{
          id: data[0].id,
          clientId: data[0].client_id,
          pieceName: data[0].piece_name,
          materialId: data[0].material_id,
          weightGrams: data[0].weight_grams,
          printTimeHours: data[0].print_time_hours,
          status: data[0].status,
          price: data[0].price,
          createdAt: data[0].created_at
        }, ...orders]);
      }
    }
    setNewOrder({
      clientId: '',
      pieceName: '',
      materialId: '1',
      weightGrams: 0,
      printTimeHours: 0,
      price: 0,
      status: 'quoted'
    });
    setIsOrderModalOpen(false);
  };

  const handleDeleteOrder = async (id: string) => {
    const { error } = await supabase.from('orders').delete().eq('id', id);
    if (!error) {
      setOrders(orders.filter(o => o.id !== id));
    }
  };

  const handleDeleteClient = async (id: string) => {
    const { error } = await supabase.from('clients').delete().eq('id', id);
    if (!error) {
      setOrders(orders.filter(o => o.clientId !== id));
      setClients(clients.filter(c => c.id !== id));
    }
  };

  const openEditOrder = (order: Order) => {
    setNewOrder({
      clientId: order.clientId,
      pieceName: order.pieceName,
      materialId: order.materialId,
      weightGrams: order.weightGrams,
      printTimeHours: order.printTimeHours,
      price: order.price,
      status: order.status
    });
    setEditingOrderId(order.id);
    setIsOrderModalOpen(true);
  };

  const openEditClient = (client: Client) => {
    setNewClient({
      name: client.name,
      email: client.email,
      phone: client.phone
    });
    setEditingClientId(client.id);
    setIsClientModalOpen(true);
  };

  const updateOrderStatus = async (id: string, status: OrderStatus) => {
    const { error } = await supabase.from('orders').update({ status }).eq('id', id);
    if (!error) {
      setOrders(orders.map(o => o.id === id ? { ...o, status } : o));
    }
  };

  useEffect(() => {
    async function syncSettings() {
      if (loading || !session) return;
      await supabase.from('settings').upsert({
        user_id: session.user.id,
        material_price_per_kg: settings.materialPricePerKg,
        machine_price_per_hour: settings.machinePricePerHour,
        multiplier_low: settings.multipliers.low,
        multiplier_medium: settings.multipliers.medium,
        multiplier_high: settings.multipliers.high
      });
    }
    syncSettings();
  }, [settings, loading, session]);

  // --- Calculator Logic ---
  const [calcWeight, setCalcWeight] = useState(100);
  const [calcHours, setCalcHours] = useState(4);
  const [calcComplexity, setCalcComplexity] = useState<'BAIXO' | 'MÉDIO' | 'ALTO'>('BAIXO');

  const calculatedPrice = useMemo(() => {
    const materialCost = (calcWeight / 1000) * settings.materialPricePerKg;
    const powerAndWear = calcHours * settings.machinePricePerHour;
    const complexityMultiplier = calcComplexity === 'BAIXO' 
      ? settings.multipliers.low 
      : calcComplexity === 'MÉDIO' 
        ? settings.multipliers.medium 
        : settings.multipliers.high;
    return (materialCost + powerAndWear) * complexityMultiplier;
  }, [calcWeight, calcHours, calcComplexity, settings]);
  const orderStats = useMemo(() => {
    return orders.reduce((acc, order) => {
      acc[order.clientId] = (acc[order.clientId] || 0) + order.price;
      return acc;
    }, {} as Record<string, number>);
  }, [orders]);

  const stats = useMemo(() => {
    const active = orders.filter(o => ['queued', 'printing'].includes(o.status)).length;
    const totalSales = orders.filter(o => o.status !== 'cancelled').reduce((acc, curr) => acc + curr.price, 0);
    const pendingQuotes = orders.filter(o => o.status === 'quoted').length;
    return { active, totalSales, pendingQuotes };
  }, [orders]);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'orders', label: 'Pedidos', icon: Package },
    { id: 'clients', label: 'Clientes', icon: Users },
    { id: 'calculator', label: 'Calculadora', icon: Calculator },
    { id: 'settings', label: 'Configurações', icon: Settings },
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setOrders([]);
    setClients([]);
  };

  if (!session) {
    return <Auth onSession={() => {}} />;
  }

  return (
    <div className="flex h-screen bg-brand-bg overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-brand-sidebar flex flex-col border-r border-brand-border z-20">
        <div className="p-6 flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded bg-brand-primary flex items-center justify-center">
            <Layers className="text-white" size={18} />
          </div>
          <h1 className="font-bold text-white text-lg tracking-tight">Nexus CRM</h1>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all group ${
                activeTab === item.id 
                  ? 'bg-brand-primary/20 text-blue-400 border border-brand-primary/30' 
                  : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              <item.icon size={18} />
              <span className="font-medium text-sm">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-6 border-t border-slate-800 space-y-6">
          <div className="p-4 bg-slate-800 rounded-lg border border-slate-700">
            <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-2">Status Impressoras</p>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-slate-200">Ender 3 S1</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-200">Prusa MK4</span>
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            </div>
          </div>
          
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-white transition-colors"
          >
            <LogOut size={14} />
            Sair do Sistema
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative custom-scrollbar flex flex-col bg-slate-50">
        <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-brand-border px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1 max-w-lg">
            <div className="relative w-full group">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-primary transition-colors" />
              <input 
                type="text" 
                placeholder="Pesquisar orçamentos ou peças..." 
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsOrderModalOpen(true)}
              className="bg-brand-primary text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-sm hover:bg-brand-primary/90 transition-all active:scale-95"
            >
              + Novo Orçamento
            </button>
            <div className="w-8 h-8 rounded-full bg-slate-200 border border-slate-300"></div>
          </div>
        </header>

        <div className="p-8 flex-1 max-w-7xl w-full mx-auto">
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && (
              <motion.div 
                key="dashboard"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {[
                    { label: 'Faturamento Mensal', val: `R$ ${stats.totalSales.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: CreditCard, trend: '+12%', trendColor: 'text-emerald-600' },
                    { label: 'Peças em Impressão', val: stats.active, icon: Printer, trend: 'Capacidade: 82%', trendColor: 'text-slate-400' },
                    { label: 'Orçamentos Pendentes', val: stats.pendingQuotes.toString().padStart(2, '0'), icon: Calculator, trend: 'Urgente', trendColor: 'text-orange-500' },
                    { label: 'Tempo Médio Entrega', val: '3.2 dias', icon: Clock, trend: 'Variação 0.4', trendColor: 'text-slate-400' },
                  ].map((stat, i) => (
                    <div key={i} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                      <p className="text-sm text-slate-500 mb-1">{stat.label}</p>
                      <div className="flex items-baseline gap-2">
                        <h3 className="text-2xl font-bold text-slate-900">{stat.val}</h3>
                        <span className={`text-xs font-bold ${stat.trendColor}`}>{stat.trend}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Recent Activity */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col">
                    <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                      <h4 className="font-bold text-slate-800">Fila de Produção Ativa</h4>
                      <span className="text-xs text-brand-primary font-semibold cursor-pointer py-1 px-2 hover:bg-blue-50 rounded transition-colors">Ver todos</span>
                    </div>
                    <div className="p-4 overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead>
                          <tr className="text-slate-400 border-b border-slate-50">
                            <th className="pb-3 font-medium">Peça / Projeto</th>
                            <th className="pb-3 font-medium">Material</th>
                            <th className="pb-3 font-medium">Status</th>
                            <th className="pb-3 font-medium text-right">Preço</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {orders.slice(0, 5).map((order) => (
                            <tr key={order.id} className="hover:bg-slate-50 transition-colors group cursor-pointer">
                              <td className="py-3 font-medium text-slate-700">{order.pieceName}</td>
                              <td className="py-3 text-slate-500">{materials.find(m => m.id === order.materialId)?.name}</td>
                              <td className="py-3">
                                <select 
                                  value={order.status}
                                  onChange={(e) => updateOrderStatus(order.id, e.target.value as OrderStatus)}
                                  className={`text-[10px] font-bold rounded px-2 py-0.5 border transition-all cursor-pointer outline-none appearance-none ${(STATUS_CONFIG[order.status] || STATUS_CONFIG.quoted).color}`}
                                >
                                  {Object.entries(STATUS_CONFIG).map(([key, value]) => (
                                    <option key={key} value={key} className="bg-white text-slate-800">
                                      {value.label.toUpperCase()}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td className="py-3 text-right font-semibold text-slate-700">R$ {order.price.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  
                  {/* Secondary Panels */}
                  <div className="lg:col-span-4 flex flex-col gap-6">
                    {/* Inventory */}
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                      <h4 className="font-bold text-slate-800 mb-4">Estoque de Filamentos</h4>
                      <div className="space-y-4">
                        {[
                          { name: 'PLA Premium (Branco)', qty: '4.2 kg', val: 84, color: 'bg-brand-primary' },
                          { name: 'ABS Resistente (Preto)', qty: '0.4 kg', val: 10, color: 'bg-orange-500', urgent: true },
                          { name: 'PETG Transparente', qty: '1.5 kg', val: 30, color: 'bg-blue-400' },
                        ].map((item, i) => (
                          <div key={i}>
                            <div className="flex justify-between text-xs mb-1.3">
                              <span className="font-medium text-slate-700">{item.name}</span>
                              <span className={item.urgent ? 'text-orange-600 font-bold' : 'text-slate-500'}>{item.qty}</span>
                            </div>
                            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                              <div className={`${item.color} h-full transition-all duration-500`} style={{ width: `${item.val}%` }}></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Recent Sales List */}
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex-1">
                      <h4 className="font-bold text-slate-800 mb-4">Últimas Vendas</h4>
                      <div className="space-y-4">
                        {clients.slice(0, 3).map((client, i) => (
                          <div key={i} className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-xs font-bold text-slate-600 border border-slate-200">
                              {client.name.split(' ').map(n => n[0]).join('')}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-slate-800">{client.name}</p>
                              <p className="text-xs text-slate-500">R$ {(orderStats[client.id] || 0).toFixed(2)} • Ativo</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'orders' && (
              <motion.div 
                key="orders"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-4">
                    <h3 className="text-xl font-bold text-white tracking-tight">Gerenciamento de Pedidos</h3>
                    <div className="flex items-center gap-2 bg-brand-card border border-brand-border rounded px-2 py-1">
                      <Filter size={12} className="text-gray-500" />
                      <select className="bg-transparent border-none text-[10px] font-mono text-gray-400 focus:outline-none uppercase">
                        <option>Todos os Status</option>
                        <option>Orçados</option>
                        <option>Em Produção</option>
                        <option>Finalizados</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="bg-brand-card border border-brand-border rounded-xl overflow-hidden shadow-2xl">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-white/2 border-b border-brand-border text-[10px] font-mono text-gray-500 uppercase">
                        <th className="p-4 font-medium tracking-tighter">ID</th>
                        <th className="p-4 font-medium tracking-tighter">DATA</th>
                        <th className="p-4 font-medium tracking-tighter">CLIENTE</th>
                        <th className="p-4 font-medium tracking-tighter">ESPECIFICAÇÕES</th>
                        <th className="p-4 font-medium tracking-tighter">PREÇO</th>
                        <th className="p-4 font-medium tracking-tighter">STATUS</th>
                        <th className="p-4 text-right">AÇÕES</th>
                      </tr>
                    </thead>
                    <tbody className="text-xs">
                      {orders.map((order) => (
                        <tr key={order.id} className="border-b border-brand-border/30 hover:bg-white/5 transition-colors">
                          <td className="p-4 font-mono text-gray-400 tracking-tighter">{order.id}</td>
                          <td className="p-4 text-gray-500">{new Date(order.createdAt).toLocaleDateString()}</td>
                          <td className="p-4">
                            <div className="font-medium text-white">{clients.find(c => c.id === order.clientId)?.name}</div>
                            <div className="text-[10px] text-gray-500 font-mono italic">Prioridade Normal</div>
                          </td>
                          <td className="p-4">
                            <div className="text-white mb-0.5">{order.pieceName}</div>
                            <div className="flex items-center gap-2 text-[10px] text-gray-400 font-mono">
                              <span className="flex items-center gap-1"><Layers size={10} /> {order.weightGrams}g</span>
                              <span className="flex items-center gap-1 border-l border-brand-border pl-2"><Clock size={10} /> {order.printTimeHours}h</span>
                            </div>
                          </td>
                          <td className="p-4 font-mono font-bold text-gray-300">R$ {order.price.toFixed(2)}</td>
                          <td className="p-4">
                            <select 
                              value={order.status}
                              onChange={(e) => updateOrderStatus(order.id, e.target.value as OrderStatus)}
                              className={`text-[10px] font-bold rounded px-2 py-1 border transition-all cursor-pointer outline-none appearance-none ${(STATUS_CONFIG[order.status] || STATUS_CONFIG.quoted).color}`}
                            >
                              {Object.entries(STATUS_CONFIG).map(([key, value]) => (
                                <option key={key} value={key} className="bg-white text-slate-800">
                                  {value.label.toUpperCase()}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button 
                                onClick={() => openEditOrder(order)}
                                className="p-1.5 hover:bg-blue-50 rounded-md transition-colors text-slate-400 hover:text-brand-primary"
                              >
                                <Settings size={14} />
                              </button>
                              <button 
                                onClick={() => handleDeleteOrder(order.id)}
                                className="p-1.5 hover:bg-red-50 rounded-md transition-colors text-slate-400 hover:text-red-500"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}
            
            {activeTab === 'clients' && (
              <motion.div 
                key="clients"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              >
                {clients.map((client) => (
                  <div key={client.id} className="bg-white border border-slate-200 p-5 rounded-xl space-y-4 hover:border-brand-primary transition-all group shadow-sm">
                    <div className="flex items-start justify-between">
                      <div className="w-12 h-12 rounded-lg bg-slate-50 flex items-center justify-center text-xl font-bold text-slate-700 border border-slate-200 cursor-default group-hover:bg-blue-50 group-hover:text-brand-primary transition-colors">
                        {client.name.charAt(0)}
                      </div>
                      <div className="flex gap-1">
                        <button 
                          onClick={() => openEditClient(client)}
                          className="p-1.5 hover:bg-blue-50 rounded-md transition-colors text-slate-400 hover:text-brand-primary"
                        >
                          <Settings size={14} />
                        </button>
                        <button 
                          onClick={() => handleDeleteClient(client.id)}
                          className="p-1.5 hover:bg-red-50 rounded-md transition-colors text-slate-400 hover:text-red-500"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 group-hover:text-brand-primary transition-colors">{client.name}</h4>
                      <p className="text-[12px] text-slate-500 mt-0.5">{client.email}</p>
                    </div>
                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider">
                      <span className="text-slate-400">Pedidos: <span className="text-slate-700">{(orders.filter(o => o.clientId === client.id).length)}</span></span>
                      <span className="text-slate-400">Total: <span className="text-brand-primary">R$ {orders.filter(o => o.clientId === client.id).reduce((a, b) => a + b.price, 0).toFixed(2)}</span></span>
                    </div>
                  </div>
                ))}
                
                <button 
                  onClick={() => setIsClientModalOpen(true)}
                  className="bg-white/50 border border-dashed border-slate-300 rounded-xl p-5 flex flex-col items-center justify-center gap-3 text-slate-400 hover:text-brand-primary hover:border-brand-primary/50 hover:bg-blue-50/30 transition-all group min-h-[160px]"
                >
                  <div className="p-3 rounded-full bg-slate-100 group-hover:bg-brand-primary/10 transition-colors">
                    <Plus size={24} />
                  </div>
                  <span className="text-xs uppercase tracking-widest font-bold">Adicionar Cliente</span>
                </button>
              </motion.div>
            )}

            {activeTab === 'calculator' && (
              <motion.div 
                key="calculator"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="max-w-2xl mx-auto bg-brand-card border border-brand-border rounded-2xl overflow-hidden shadow-2xl"
              >
                <div className="p-8 border-b border-brand-border bg-white/2">
                  <div className="flex items-center gap-3 mb-2">
                    <Calculator size={24} className="text-brand-primary" />
                    <h3 className="text-xl font-bold text-white uppercase tracking-tight">Calculadora de Custos</h3>
                  </div>
                  <p className="text-xs text-gray-500 font-mono tracking-tight lowercase">Estime custos de material e tempo para precificação precisa.</p>
                </div>
                
                <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Peso da Peça (g)</label>
                      <div className="relative">
                        <input 
                          type="number" 
                          value={calcWeight}
                          onChange={(e) => setCalcWeight(parseFloat(e.target.value) || 0)}
                          className="w-full bg-brand-bg border border-brand-border rounded-lg p-3 text-sm text-brand-primary font-mono focus:outline-none focus:border-brand-primary outline-none transition-all" 
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 font-mono text-xs uppercase">GRAMAS</span>
                      </div>
                    </div>
                    
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Tempo de Impressão (h)</label>
                      <div className="relative">
                        <input 
                          type="number" 
                          value={calcHours}
                          onChange={(e) => setCalcHours(parseFloat(e.target.value) || 0)}
                          className="w-full bg-brand-bg border border-brand-border rounded-lg p-3 text-sm text-brand-primary font-mono focus:outline-none focus:border-brand-primary outline-none transition-all" 
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 font-mono text-xs uppercase">HORAS</span>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Complexidade / Risco</label>
                      <div className="grid grid-cols-3 gap-2">
                        {(['BAIXO', 'MÉDIO', 'ALTO'] as const).map((level) => (
                          <button 
                            key={level} 
                            onClick={() => setCalcComplexity(level)}
                            className={`py-2 text-[10px] font-mono border rounded-md transition-all ${calcComplexity === level ? 'border-brand-primary bg-brand-primary/10 text-brand-primary' : 'border-brand-border text-gray-500 hover:border-white/20'}`}
                          >
                            {level}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="bg-brand-bg border border-brand-border rounded-xl p-6 flex flex-col justify-between">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center text-[10px] font-mono text-gray-500">
                        <span>Custo Estimado Mat.</span>
                        <span className="text-white">R$ {((calcWeight / 1000) * settings.materialPricePerKg).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center text-[10px] font-mono text-gray-500">
                        <span>Custo Op. (Energia/Maq)</span>
                        <span className="text-white">R$ {(calcHours * settings.machinePricePerHour).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center text-[10px] font-mono text-gray-500">
                        <span>Multiplicador Risco</span>
                        <span className="text-white">x{calcComplexity === 'BAIXO' ? settings.multipliers.low : calcComplexity === 'MÉDIO' ? settings.multipliers.medium : settings.multipliers.high}</span>
                      </div>
                    </div>

                    <div className="pt-6 border-t border-brand-border text-center space-y-2">
                      <p className="text-[10px] font-mono text-gray-400 tracking-widest uppercase">Preço Final Sugerido</p>
                      <p className="text-4xl font-bold text-brand-primary tracking-tighter">R$ {calculatedPrice.toFixed(2)}</p>
                      <button 
                        onClick={() => {
                          setNewOrder({
                            ...newOrder,
                            weightGrams: calcWeight,
                            printTimeHours: calcHours,
                            price: calculatedPrice
                          });
                          setIsOrderModalOpen(true);
                        }}
                        className="w-full bg-brand-primary text-white font-bold text-xs py-3 rounded-lg mt-4 shadow-xl shadow-brand-primary/10 active:scale-95 transition-all outline-none"
                      >
                        CRIAR PEDIDO COM ESTE VALOR
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'settings' && (
              <motion.div 
                key="settings"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="max-w-2xl mx-auto space-y-8"
              >
                <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-8">
                  <div className="flex items-center gap-3 border-b border-slate-100 pb-6">
                    <div className="p-2 bg-blue-50 rounded-lg text-brand-primary">
                      <Settings size={20} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-800">Parâmetros de Precificação</h3>
                      <p className="text-sm text-slate-500">Configure os valores base que alimentam a calculadora de orçamentos.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Custos Operacionais</h4>
                      <div className="space-y-4">
                        <div className="space-y-1.5">
                          <label className="text-sm font-medium text-slate-700">Preço do Filamento (R$/kg)</label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">R$</span>
                            <input 
                              type="number" 
                              value={settings.materialPricePerKg}
                              onChange={(e) => setSettings({ ...settings, materialPricePerKg: parseFloat(e.target.value) || 0 })}
                              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm transition-all focus:ring-2 focus:ring-brand-primary/20 outline-none"
                            />
                          </div>
                          <p className="text-[10px] text-slate-400">Ex: R$ 120,00 para um rolo standard de 1kg.</p>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-sm font-medium text-slate-700">Hora Máquina (R$/h)</label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">R$</span>
                            <input 
                              type="number" 
                              value={settings.machinePricePerHour}
                              onChange={(e) => setSettings({ ...settings, machinePricePerHour: parseFloat(e.target.value) || 0 })}
                              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm transition-all focus:ring-2 focus:ring-brand-primary/20 outline-none"
                            />
                          </div>
                          <p className="text-[10px] text-slate-400">Inclui energia, depreciação e manutenção básica.</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Multiplicadores de Risco</h4>
                      <div className="space-y-4">
                        <div className="space-y-1.5">
                          <label className="text-sm font-medium text-slate-700">Risco Baixo (Fator)</label>
                          <input 
                            type="number" 
                            step="0.1"
                            value={settings.multipliers.low}
                            onChange={(e) => setSettings({ ...settings, multipliers: { ...settings.multipliers, low: parseFloat(e.target.value) || 0 }})}
                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm transition-all focus:ring-2 focus:ring-brand-primary/20 outline-none"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-sm font-medium text-slate-700">Risco Médio (Fator)</label>
                          <input 
                            type="number" 
                            step="0.1"
                            value={settings.multipliers.medium}
                            onChange={(e) => setSettings({ ...settings, multipliers: { ...settings.multipliers, medium: parseFloat(e.target.value) || 0 }})}
                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm transition-all focus:ring-2 focus:ring-brand-primary/20 outline-none"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-sm font-medium text-slate-700">Risco Alto (Fator)</label>
                          <input 
                            type="number" 
                            step="0.1"
                            value={settings.multipliers.high}
                            onChange={(e) => setSettings({ ...settings, multipliers: { ...settings.multipliers, high: parseFloat(e.target.value) || 0 }})}
                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm transition-all focus:ring-2 focus:ring-brand-primary/20 outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-slate-50 flex items-center gap-2 text-slate-400 italic">
                    <Clock size={14} />
                    <span className="text-xs">Alterações são aplicadas instantaneamente a novos cálculos.</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Basic "New Order" Modal Mockup */}
      <AnimatePresence>
        {isOrderModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOrderModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-xl bg-white border border-slate-200 rounded-2xl shadow-2xl p-8 space-y-6"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-800 uppercase tracking-tight">
                  {editingOrderId ? 'Editar Pedido' : 'Novo Registro de Pedido'}
                </h2>
                <button onClick={() => {
                  setIsOrderModalOpen(false);
                  setEditingOrderId(null);
                  setNewOrder({
                    clientId: '',
                    pieceName: '',
                    materialId: '1',
                    weightGrams: 0,
                    printTimeHours: 0,
                    price: 0
                  });
                }} className="text-slate-400 hover:text-slate-600 transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Cliente Responsável</label>
                  <select 
                    value={newOrder.clientId}
                    onChange={(e) => setNewOrder({ ...newOrder, clientId: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm text-slate-700 focus:ring-2 focus:ring-brand-primary/20 focus:outline-none transition-all"
                  >
                    <option value="">Selecione um cliente</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="col-span-2 space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Nome da Peça / Projeto</label>
                  <input 
                    type="text" 
                    value={newOrder.pieceName}
                    onChange={(e) => setNewOrder({ ...newOrder, pieceName: e.target.value })}
                    placeholder="Ex: Engrenagem V2" 
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm text-slate-700 focus:ring-2 focus:ring-brand-primary/20 focus:outline-none transition-all" 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Material</label>
                  <select 
                    value={newOrder.materialId}
                    onChange={(e) => setNewOrder({ ...newOrder, materialId: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm text-slate-700 focus:ring-2 focus:ring-brand-primary/20 focus:outline-none transition-all"
                  >
                    {materials.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Preço Final (R$)</label>
                  <input 
                    type="number" 
                    value={newOrder.price || ''}
                    onChange={(e) => setNewOrder({ ...newOrder, price: parseFloat(e.target.value) || 0 })}
                    placeholder="85.00" 
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm text-slate-700 focus:ring-2 focus:ring-brand-primary/20 focus:outline-none transition-all" 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Peso (g)</label>
                  <input 
                    type="number" 
                    value={newOrder.weightGrams || ''}
                    onChange={(e) => setNewOrder({ ...newOrder, weightGrams: parseFloat(e.target.value) || 0 })}
                    placeholder="100" 
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm text-slate-700 focus:ring-2 focus:ring-brand-primary/20 focus:outline-none transition-all" 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tempo (h)</label>
                  <input 
                    type="number" 
                    value={newOrder.printTimeHours || ''}
                    onChange={(e) => setNewOrder({ ...newOrder, printTimeHours: parseFloat(e.target.value) || 0 })}
                    placeholder="4.5" 
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm text-slate-700 focus:ring-2 focus:ring-brand-primary/20 focus:outline-none transition-all" 
                  />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Status</label>
                  <select 
                    value={newOrder.status}
                    onChange={(e) => setNewOrder({ ...newOrder, status: e.target.value as OrderStatus })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm text-slate-700 focus:ring-2 focus:ring-brand-primary/20 focus:outline-none transition-all"
                  >
                    {Object.entries(STATUS_CONFIG).map(([key, value]) => (
                      <option key={key} value={key}>{value.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100 flex gap-3">
                <button 
                  onClick={() => setIsOrderModalOpen(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs py-3 rounded-lg transition-all"
                >
                  CANCELAR
                </button>
                <button 
                  onClick={handleCreateOrder}
                  disabled={!newOrder.pieceName || !newOrder.clientId}
                  className="flex-1 bg-brand-primary text-white font-bold text-xs py-3 rounded-lg shadow-lg shadow-blue-600/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  SALVAR PEDIDO
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {isClientModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsClientModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-2xl p-8 space-y-6"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-800 uppercase tracking-tight">
                  {editingClientId ? 'Editar Cliente' : 'Novo Cliente'}
                </h2>
                <button onClick={() => {
                  setIsClientModalOpen(false);
                  setEditingClientId(null);
                  setNewClient({ name: '', email: '', phone: '' });
                }} className="text-slate-400 hover:text-slate-600 transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Nome Completo</label>
                  <input 
                    type="text" 
                    value={newClient.name}
                    onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                    placeholder="Ex: João Silva" 
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm text-slate-700 focus:ring-2 focus:ring-brand-primary/20 focus:outline-none transition-all" 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">E-mail</label>
                  <input 
                    type="email" 
                    value={newClient.email}
                    onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                    placeholder="joao@exemplo.com" 
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm text-slate-700 focus:ring-2 focus:ring-brand-primary/20 focus:outline-none transition-all" 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Telefone</label>
                  <input 
                    type="text" 
                    value={newClient.phone}
                    onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                    placeholder="(00) 00000-0000" 
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm text-slate-700 focus:ring-2 focus:ring-brand-primary/20 focus:outline-none transition-all" 
                  />
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100 flex gap-3">
                <button 
                  onClick={() => setIsClientModalOpen(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs py-3 rounded-lg transition-all"
                >
                  CANCELAR
                </button>
                <button 
                  onClick={handleCreateClient}
                  disabled={!newClient.name}
                  className="flex-1 bg-brand-primary text-white font-bold text-xs py-3 rounded-lg shadow-lg shadow-blue-600/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  CADASTRAR
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
