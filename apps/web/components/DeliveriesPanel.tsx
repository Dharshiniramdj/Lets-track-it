import React, { useState } from 'react';
import { UpcomingDelivery } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';
import { 
  Package, 
  Plus, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  Clock, 
  Truck, 
  X, 
  Search, 
  ExternalLink,
  RotateCcw
} from 'lucide-react';

interface Props {
  deliveries: UpcomingDelivery[];
  onAddDelivery: (delivery: Omit<UpcomingDelivery, 'id' | 'createdAt'>) => void;
  onUpdateDelivery: (id: string, updates: Partial<UpcomingDelivery>) => void;
  onDeleteDelivery: (id: string) => void;
  currencyPreference?: string;
  isConfidential?: boolean;
}

export const DeliveriesPanel: React.FC<Props> = ({
  deliveries,
  onAddDelivery,
  onUpdateDelivery,
  onDeleteDelivery,
  currencyPreference = 'INR',
  isConfidential = false
}) => {
  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'DELIVERED'>('ACTIVE');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [expectedDate, setExpectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [estimatedAmount, setEstimatedAmount] = useState('');
  const [carrier, setCarrier] = useState('Amazon');
  const [status, setStatus] = useState<UpcomingDelivery['status']>('ORDERED');
  const [notes, setNotes] = useState('');

  const openAddModal = () => {
    setEditingId(null);
    setName('');
    setOrderNumber('');
    setExpectedDate(new Date().toISOString().split('T')[0]);
    setEstimatedAmount('');
    setCarrier('Amazon');
    setStatus('ORDERED');
    setNotes('');
    setShowModal(true);
  };

  const openEditModal = (d: UpcomingDelivery) => {
    setEditingId(d.id);
    setName(d.name);
    setOrderNumber(d.orderNumber || '');
    setExpectedDate(d.expectedDate);
    setEstimatedAmount(d.estimatedAmount ? d.estimatedAmount.toString() : '');
    setCarrier(d.carrier || 'Amazon');
    setStatus(d.status);
    setNotes(d.notes || '');
    setShowModal(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const payload = {
      accountId: 'default',
      name: name.trim(),
      orderNumber: orderNumber.trim() || undefined,
      expectedDate,
      estimatedAmount: parseFloat(estimatedAmount) || 0,
      carrier: carrier.trim() || undefined,
      status,
      notes: notes.trim() || undefined
    };

    if (editingId) {
      onUpdateDelivery(editingId, payload);
    } else {
      onAddDelivery(payload);
    }
    setShowModal(false);
  };

  const filteredDeliveries = deliveries.filter(d => {
    const matchesFilter = 
      filter === 'ALL' ? true :
      filter === 'ACTIVE' ? (d.status !== 'DELIVERED' && d.status !== 'RETURNED') :
      d.status === 'DELIVERED';
    const matchesSearch = 
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      (d.carrier && d.carrier.toLowerCase().includes(search.toLowerCase())) ||
      (d.orderNumber && d.orderNumber.toLowerCase().includes(search.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  const activeCount = deliveries.filter(d => d.status !== 'DELIVERED' && d.status !== 'RETURNED').length;

  return (
    <div className="glass-card p-6 rounded-3xl border border-[#143652] space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-[#0297DE]/15 border border-[#0297DE]/30 flex items-center justify-center text-[#0297DE]">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-black text-[#FCFFFF] flex items-center gap-2">
              Upcoming Deliveries Box
              {activeCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-[#0297DE]/20 text-[#0297DE] border border-[#0297DE]/30 text-xs font-bold">
                  {activeCount} active
                </span>
              )}
            </h3>
            <p className="text-xs text-[#8397AB]">
              Order tracking kept strictly separate from financial bills
            </p>
          </div>
        </div>

        <button
          onClick={openAddModal}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#0297DE] to-[#0284C7] text-[#FCFFFF] text-xs font-bold flex items-center gap-1.5 shadow-md shadow-[#0297DE]/20 hover:scale-105 transition-all self-start sm:self-center"
        >
          <Plus className="w-4 h-4" />
          Track Delivery
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-1">
        <div className="flex bg-[#050E17] p-1 rounded-xl border border-[#143652] w-full sm:w-auto">
          <button
            onClick={() => setFilter('ACTIVE')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filter === 'ACTIVE'
                ? 'bg-[#0297DE] text-[#02070A] shadow-sm'
                : 'text-[#8397AB] hover:text-[#FCFFFF]'
            }`}
          >
            Active In-Transit
          </button>
          <button
            onClick={() => setFilter('DELIVERED')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filter === 'DELIVERED'
                ? 'bg-[#0297DE] text-[#02070A] shadow-sm'
                : 'text-[#8397AB] hover:text-[#FCFFFF]'
            }`}
          >
            Delivered
          </button>
          <button
            onClick={() => setFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filter === 'ALL'
                ? 'bg-[#0297DE] text-[#02070A] shadow-sm'
                : 'text-[#8397AB] hover:text-[#FCFFFF]'
            }`}
          >
            All
          </button>
        </div>

        <div className="relative w-full sm:w-60">
          <Search className="w-3.5 h-3.5 text-[#8397AB] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search delivery or order #..."
            className="w-full bg-[#050E17] border border-[#143652] rounded-xl pl-8 pr-3 py-1.5 text-xs text-[#FCFFFF] focus:outline-none focus:border-[#0297DE]"
          />
        </div>
      </div>

      {/* Deliveries List */}
      <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
        {filteredDeliveries.length === 0 ? (
          <div className="text-center py-8 rounded-2xl bg-[#050E17]/50 border border-dashed border-[#143652]">
            <Package className="w-8 h-8 text-[#8397AB] mx-auto mb-2 opacity-50" />
            <p className="text-xs font-bold text-[#FCFFFF]">No deliveries found</p>
            <p className="text-[11px] text-[#8397AB] mt-0.5">
              {filter === 'ACTIVE' ? 'You have no pending orders in transit.' : 'No delivery history recorded.'}
            </p>
          </div>
        ) : (
          filteredDeliveries.map(d => {
            const isDelivered = d.status === 'DELIVERED';
            const isReturned = d.status === 'RETURNED';

            return (
              <div
                key={d.id}
                className="p-3.5 rounded-2xl bg-[#050E17] border border-[#143652] hover:border-[#0297DE]/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                    isDelivered ? 'bg-[#0297DE]/15 text-[#0297DE]' : 
                    isReturned ? 'bg-[#FC734D]/15 text-[#FC734D]' : 
                    'bg-amber-400/15 text-amber-400'
                  }`}>
                    {isDelivered ? <CheckCircle2 className="w-5 h-5" /> : <Truck className="w-5 h-5" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-[#FCFFFF]">{d.name}</h4>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                        d.status === 'DELIVERED' ? 'bg-[#0297DE]/20 text-[#0297DE] border border-[#0297DE]/30' :
                        d.status === 'SHIPPED' ? 'bg-amber-400/20 text-amber-400 border border-amber-400/30' :
                        d.status === 'OUT_FOR_DELIVERY' ? 'bg-[#0297DE]/30 text-[#FCFFFF] border border-[#0297DE]' :
                        'bg-[#143652] text-[#8397AB]'
                      }`}>
                        {d.status.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <div className="text-xs text-[#8397AB] flex flex-wrap items-center gap-3 mt-1">
                      {d.carrier && <span className="font-semibold text-[#FCFFFF]/80">{d.carrier}</span>}
                      {d.orderNumber && <span>Ref: #{d.orderNumber}</span>}
                      <span>Expected: {formatDate(d.expectedDate)}</span>
                    </div>

                    {d.notes && (
                      <p className="text-[11px] text-[#8397AB]/80 mt-1 italic">
                        "{d.notes}"
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#143652]">
                  {d.estimatedAmount > 0 && (
                    <div className="text-right">
                      <span className="text-sm font-black text-[#FCFFFF]">
                        {formatCurrency(d.estimatedAmount, currencyPreference, isConfidential)}
                      </span>
                      <span className="block text-[10px] text-[#8397AB]">Est. Value</span>
                    </div>
                  )}

                  <div className="flex items-center gap-1.5">
                    {!isDelivered && (
                      <button
                        onClick={() => onUpdateDelivery(d.id, { status: 'DELIVERED' })}
                        title="Mark as Delivered"
                        className="p-1.5 rounded-lg bg-[#0297DE]/15 hover:bg-[#0297DE]/25 text-[#0297DE] transition-colors"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                    )}
                    {isDelivered && (
                      <button
                        onClick={() => onUpdateDelivery(d.id, { status: 'ORDERED' })}
                        title="Reopen Order"
                        className="p-1.5 rounded-lg bg-[#0D2235] hover:bg-[#143652] text-[#8397AB] transition-colors"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => openEditModal(d)}
                      title="Edit"
                      className="p-1.5 rounded-lg bg-[#0D2235] hover:bg-[#143652] text-[#8397AB] hover:text-[#FCFFFF] transition-colors"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDeleteDelivery(d.id)}
                      title="Delete"
                      className="p-1.5 rounded-lg bg-[#0D2235] hover:bg-[#FC734D]/20 text-[#8397AB] hover:text-[#FC734D] transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add / Edit Delivery Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#02070A]/85 backdrop-blur-md">
          <div className="w-full max-w-md bg-[#081622] border border-[#143652] rounded-3xl p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-[#143652] mb-4">
              <h3 className="text-base font-extrabold text-[#FCFFFF] flex items-center gap-2">
                <Package className="w-4 h-4 text-[#0297DE]" />
                {editingId ? 'Edit Delivery Entry' : 'Add Upcoming Delivery'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-[#8397AB] hover:text-[#FCFFFF]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold uppercase text-[#8397AB] mb-1">
                  Package / Item Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Ergonomic Office Chair"
                  required
                  className="w-full bg-[#050E17] border border-[#143652] rounded-xl px-3 py-2 text-xs text-[#FCFFFF] focus:outline-none focus:border-[#0297DE]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-[#8397AB] mb-1">
                    Carrier / Merchant
                  </label>
                  <input
                    type="text"
                    value={carrier}
                    onChange={e => setCarrier(e.target.value)}
                    placeholder="Amazon, Flipkart, Zepto..."
                    className="w-full bg-[#050E17] border border-[#143652] rounded-xl px-3 py-2 text-xs text-[#FCFFFF] focus:outline-none focus:border-[#0297DE]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-[#8397AB] mb-1">
                    Order / Tracking #
                  </label>
                  <input
                    type="text"
                    value={orderNumber}
                    onChange={e => setOrderNumber(e.target.value)}
                    placeholder="Optional reference"
                    className="w-full bg-[#050E17] border border-[#143652] rounded-xl px-3 py-2 text-xs text-[#FCFFFF] focus:outline-none focus:border-[#0297DE]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-[#8397AB] mb-1">
                    Expected Date
                  </label>
                  <input
                    type="date"
                    value={expectedDate}
                    onChange={e => setExpectedDate(e.target.value)}
                    required
                    className="w-full bg-[#050E17] border border-[#143652] rounded-xl px-3 py-2 text-xs text-[#FCFFFF] focus:outline-none focus:border-[#0297DE]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-[#8397AB] mb-1">
                    Est. Amount
                  </label>
                  <input
                    type="number"
                    value={estimatedAmount}
                    onChange={e => setEstimatedAmount(e.target.value)}
                    placeholder="Optional amount"
                    className="w-full bg-[#050E17] border border-[#143652] rounded-xl px-3 py-2 text-xs text-[#FCFFFF] focus:outline-none focus:border-[#0297DE]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-[#8397AB] mb-1">
                  Status
                </label>
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value as any)}
                  className="w-full bg-[#050E17] border border-[#143652] rounded-xl px-3 py-2 text-xs text-[#FCFFFF] focus:outline-none focus:border-[#0297DE]"
                >
                  <option value="ORDERED">Ordered</option>
                  <option value="SHIPPED">Shipped</option>
                  <option value="OUT_FOR_DELIVERY">Out for Delivery</option>
                  <option value="DELIVERED">Delivered</option>
                  <option value="RETURNED">Returned</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-[#8397AB] mb-1">
                  Personal Notes
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="e.g. Leave with building security if not home"
                  className="w-full bg-[#050E17] border border-[#143652] rounded-xl px-3 py-2 text-xs text-[#FCFFFF] focus:outline-none focus:border-[#0297DE]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl bg-[#0D2235] text-xs font-bold text-[#8397AB] hover:text-[#FCFFFF]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#0297DE] to-[#0284C7] text-xs font-black text-[#FCFFFF] shadow-md shadow-[#0297DE]/25"
                >
                  {editingId ? 'Update Delivery' : 'Save Delivery'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
