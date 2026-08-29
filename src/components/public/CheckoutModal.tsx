import { useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import type { Event, Contestant, VotePackage, PaymentMethod } from '@/lib/types';
import { PAYMENT_METHOD_LABELS, formatGHS } from '@/lib/utils';
import {
  X,
  CheckCircle2,
  Loader2,
  Smartphone,
  Banknote,
  ArrowRight,
  ArrowLeft,
  Plus,
  Minus,
  Trash2,
  Copy,
  AlertTriangle,
  Phone,
  User,
  ShoppingCart,
} from 'lucide-react';

interface CheckoutModalProps {
  event: Event;
  contestant: Contestant;
  packages: VotePackage[];
  onClose: () => void;
  onSuccess: () => void;
}

type Step = 'package' | 'details' | 'payment' | 'processing' | 'instructions';

interface CartItem {
  pkg: VotePackage;
  quantity: number;
}

const MOMO_NUMBER = '0532750350';
const MOMO_ACCOUNT_NAME = 'Joy Selasi Sogbey';

function generateReferenceCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return `VOTE-${code}`;
}

export function CheckoutModal({ event, contestant, packages, onClose, onSuccess }: CheckoutModalProps) {
  const [step, setStep] = useState<Step>('package');
  const [cart, setCart] = useState<Record<string, CartItem>>({});
  const [voterName, setVoterName] = useState('');
  const [voterPhone, setVoterPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('mtn_momo');
  const [error, setError] = useState('');
  const [referenceCode, setReferenceCode] = useState('');
  const [copied, setCopied] = useState(false);

  const cartItems = useMemo(() => Object.values(cart), [cart]);
  const totalVotes = cartItems.reduce((sum, item) => sum + (item.pkg.votes + item.pkg.bonus_votes) * item.quantity, 0);
  const totalAmount = cartItems.reduce((sum, item) => sum + item.pkg.price_ghs * item.quantity, 0);

  const addToCart = (pkg: VotePackage) => {
    setCart((prev) => {
      const existing = prev[pkg.id];
      return { ...prev, [pkg.id]: { pkg, quantity: (existing?.quantity ?? 0) + 1 } };
    });
  };

  const decrementFromCart = (pkgId: string) => {
    setCart((prev) => {
      const existing = prev[pkgId];
      if (!existing) return prev;
      if (existing.quantity <= 1) {
        const next = { ...prev };
        delete next[pkgId];
        return next;
      }
      return { ...prev, [pkgId]: { ...existing, quantity: existing.quantity - 1 } };
    });
  };

  const removeFromCart = (pkgId: string) => {
    setCart((prev) => {
      const next = { ...prev };
      delete next[pkgId];
      return next;
    });
  };

  const handleProceedToDetails = () => {
    if (cartItems.length === 0) {
      setError('Add at least one vote package to continue');
      return;
    }
    setError('');
    setStep('details');
  };

  const handleDetailsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!voterName.trim() || !voterPhone.trim()) {
      setError('Please fill in all fields');
      return;
    }
    setError('');
    setStep('payment');
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cartItems.length === 0) return;
    setError('');
    setStep('processing');

    const ref = generateReferenceCode();

    // Create one transaction per cart item, all sharing the same reference code
    const inserts = cartItems.map((item) => ({
      event_id: event.id,
      contestant_id: contestant.id,
      vote_package_id: item.pkg.id,
      voter_name: voterName.trim(),
      voter_phone: voterPhone.trim(),
      payment_method: paymentMethod,
      payment_status: 'pending' as const,
      amount: item.pkg.price_ghs * item.quantity,
      votes_purchased: (item.pkg.votes + item.pkg.bonus_votes) * item.quantity,
      reference_code: ref,
      momo_reference: ref,
      momo_number: paymentMethod !== 'physical_cash' ? voterPhone.trim() : null,
    }));

    const { error: insertError } = await supabase.from('transactions').insert(inserts);

    if (insertError) {
      setError(insertError.message);
      setStep('payment');
      return;
    }

    setReferenceCode(ref);
    setTimeout(() => setStep('instructions'), 1000);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(referenceCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const paymentMethods: { value: PaymentMethod; label: string; icon: typeof Smartphone }[] = [
    { value: 'mtn_momo', label: 'MTN MoMo', icon: Smartphone },
    { value: 'telecel_cash', label: 'Telecel Cash', icon: Smartphone },
    { value: 'atmoney', label: 'ATMoney', icon: Smartphone },
    { value: 'physical_cash', label: 'Cash', icon: Banknote },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl animate-slide-up scrollbar-thin">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="font-display text-xl font-bold text-gray-900">Vote for {contestant.name}</h2>
            <p className="text-sm text-gray-500">{event.name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6">
          {/* Step indicator */}
          {step !== 'processing' && step !== 'instructions' && (
            <div className="flex items-center gap-2 mb-6">
              {['package', 'details', 'payment'].map((s, i) => {
                const stepNum = i + 1;
                const isActive = step === s;
                const isPast = ['package', 'details', 'payment'].indexOf(step) > i;
                return (
                  <div key={s} className="flex items-center gap-2">
                    <div
                      className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold transition-all ${
                        isActive
                          ? 'bg-gold-500 text-white scale-110'
                          : isPast
                          ? 'bg-forest-500 text-white'
                          : 'bg-gray-200 text-gray-400'
                      }`}
                    >
                      {isPast ? <CheckCircle2 className="h-4 w-4" /> : stepNum}
                    </div>
                    {i < 2 && <div className={`w-8 h-0.5 ${isPast ? 'bg-forest-500' : 'bg-gray-200'}`} />}
                  </div>
                );
              })}
            </div>
          )}

          {/* Step: Package Selection — Cart-based */}
          {step === 'package' && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600 mb-4">
                Add vote bundles to your cart. You can mix and match multiple bundles.
              </p>
              {packages.map((pkg) => {
                const pkgTotal = pkg.votes + pkg.bonus_votes;
                const inCart = cart[pkg.id]?.quantity ?? 0;
                return (
                  <div
                    key={pkg.id}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      pkg.is_popular
                        ? 'border-gold-400 bg-gold-50'
                        : 'border-gray-200'
                    } ${inCart > 0 ? 'ring-2 ring-gold-300' : ''}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-900">{pkg.name}</span>
                          {pkg.is_popular && (
                            <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-gold-500 text-white rounded-full">
                              Popular
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 mt-0.5">
                          {pkg.votes} votes{pkg.bonus_votes > 0 && ` + ${pkg.bonus_votes} bonus`} = {pkgTotal} total
                        </p>
                        <p className="font-display text-lg font-bold text-gray-900 mt-1">{formatGHS(pkg.price_ghs)}</p>
                      </div>
                      {inCart === 0 ? (
                        <button
                          onClick={() => addToCart(pkg)}
                          className="flex-shrink-0 px-3 py-2 rounded-lg bg-gold-500 text-white font-semibold text-sm hover:bg-gold-600 transition-colors flex items-center gap-1.5"
                        >
                          <Plus className="h-4 w-4" /> Add
                        </button>
                      ) : (
                        <div className="flex-shrink-0 flex items-center gap-2">
                          <button
                            onClick={() => decrementFromCart(pkg.id)}
                            className="w-8 h-8 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="font-bold text-gray-900 w-6 text-center">{inCart}</span>
                          <button
                            onClick={() => addToCart(pkg)}
                            className="w-8 h-8 rounded-lg bg-gold-500 text-white hover:bg-gold-600 transition-colors flex items-center justify-center"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Cart Summary */}
              {cartItems.length > 0 && (
                <div className="mt-4 bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-2">
                  <div className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-1">
                    <ShoppingCart className="h-4 w-4" /> Your Cart
                  </div>
                  {cartItems.map((item) => (
                    <div key={item.pkg.id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-gray-600 truncate">
                          {item.quantity}x {item.pkg.name}
                        </span>
                        <button
                          onClick={() => removeFromCart(item.pkg.id)}
                          className="text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <span className="font-medium text-gray-900 flex-shrink-0">
                        {formatGHS(item.pkg.price_ghs * item.quantity)}
                      </span>
                    </div>
                  ))}
                  <div className="border-t border-gray-200 pt-2 mt-2 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-500">Total Votes</p>
                      <p className="font-bold text-forest-600">{totalVotes} votes</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Total Amount</p>
                      <p className="font-display text-lg font-bold text-gray-900">{formatGHS(totalAmount)}</p>
                    </div>
                  </div>
                </div>
              )}

              {error && <p className="text-sm text-red-600">{error}</p>}

              <button
                onClick={handleProceedToDetails}
                disabled={cartItems.length === 0}
                className="w-full px-4 py-2.5 rounded-xl bg-gold-500 text-white font-semibold hover:bg-gold-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Continue <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Step: Voter Details */}
          {step === 'details' && (
            <form onSubmit={handleDetailsSubmit} className="space-y-4">
              <div className="bg-gold-50 rounded-xl p-4 border border-gold-100">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Total Votes</span>
                  <span className="font-bold text-forest-600">{totalVotes} votes</span>
                </div>
                <div className="flex items-center justify-between text-sm mt-1">
                  <span className="text-gray-600">Total Amount</span>
                  <span className="font-bold text-gray-900">{formatGHS(totalAmount)}</span>
                </div>
                <div className="flex items-center justify-between text-sm mt-1">
                  <span className="text-gray-600">Bundles</span>
                  <span className="font-medium text-gray-700">
                    {cartItems.map((i) => `${i.quantity}x ${i.pkg.name}`).join(', ')}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Your Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={voterName}
                    onChange={(e) => setVoterName(e.target.value)}
                    placeholder="Enter your full name"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 focus:border-gold-400 focus:ring-2 focus:ring-gold-100 outline-none transition-all"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="tel"
                    value={voterPhone}
                    onChange={(e) => setVoterPhone(e.target.value)}
                    placeholder="e.g. 0241234567"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 focus:border-gold-400 focus:ring-2 focus:ring-gold-100 outline-none transition-all"
                    required
                  />
                </div>
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep('package')}
                  className="px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors flex items-center gap-2"
                >
                  <ArrowLeft className="h-4 w-4" /> Back
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 rounded-xl bg-gold-500 text-white font-semibold hover:bg-gold-600 transition-colors flex items-center justify-center gap-2"
                >
                  Continue <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </form>
          )}

          {/* Step: Payment Method */}
          {step === 'payment' && (
            <form onSubmit={handlePaymentSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
                <div className="grid grid-cols-2 gap-2">
                  {paymentMethods.map((m) => {
                    const Icon = m.icon;
                    return (
                      <button
                        key={m.value}
                        type="button"
                        onClick={() => setPaymentMethod(m.value)}
                        className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all text-sm font-medium ${
                          paymentMethod === m.value
                            ? 'border-gold-400 bg-gold-50 text-gray-900'
                            : 'border-gray-200 text-gray-600 hover:border-gray-300'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        {m.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {paymentMethod !== 'physical_cash' ? (
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                  <p className="text-sm text-blue-800">
                    You will send {formatGHS(totalAmount)} via {PAYMENT_METHOD_LABELS[paymentMethod]} to the number
                    shown on the next screen. Your votes will be applied once an admin confirms your payment.
                  </p>
                </div>
              ) : (
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                  <p className="text-sm text-blue-800">
                    Pay {formatGHS(totalAmount)} in cash to Sir Selasi or Sir David. Your votes will be applied once
                    your payment is confirmed.
                  </p>
                </div>
              )}

              <div className="bg-gray-50 rounded-xl p-4 space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Contestant</span>
                  <span className="font-medium text-gray-900">{contestant.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total Votes</span>
                  <span className="font-bold text-forest-600">{totalVotes}</span>
                </div>
                <div className="flex justify-between text-sm border-t border-gray-200 pt-1.5 mt-1.5">
                  <span className="font-medium text-gray-700">Total Amount</span>
                  <span className="font-display text-lg font-bold text-gray-900">{formatGHS(totalAmount)}</span>
                </div>
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep('details')}
                  className="px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors flex items-center gap-2"
                >
                  <ArrowLeft className="h-4 w-4" /> Back
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 rounded-xl bg-forest-600 text-white font-semibold hover:bg-forest-700 transition-colors"
                >
                  Get Payment Instructions
                </button>
              </div>
            </form>
          )}

          {/* Step: Processing */}
          {step === 'processing' && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-12 w-12 text-gold-500 animate-spin mb-4" />
              <h3 className="font-display text-lg font-bold text-gray-900">Generating your reference code…</h3>
              <p className="text-sm text-gray-500 mt-1">Preparing your payment instructions.</p>
            </div>
          )}

          {/* Step: Payment Instructions */}
          {step === 'instructions' && (
            <div className="space-y-5">
              {/* Success header */}
              <div className="flex flex-col items-center text-center pt-2">
                <div className="w-14 h-14 bg-forest-100 rounded-full flex items-center justify-center mb-3">
                  <CheckCircle2 className="h-7 w-7 text-forest-600" />
                </div>
                <h3 className="font-display text-xl font-bold text-gray-900">Payment Instructions</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Your vote request for <span className="font-medium text-gray-700">{contestant.name}</span> ({totalVotes} votes —{' '}
                  {formatGHS(totalAmount)}) has been registered. Complete your payment to activate your votes.
                </p>
              </div>

              {/* Reference Code — prominent */}
              <div className="bg-gold-50 border-2 border-gold-300 rounded-xl p-5 text-center">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Your Reference Code</p>
                <div className="flex items-center justify-center gap-3 mt-2">
                  <p className="font-mono text-2xl font-extrabold text-gray-900 tracking-wider">{referenceCode}</p>
                  <button
                    onClick={handleCopyCode}
                    className="p-2 rounded-lg bg-white border border-gold-200 hover:bg-gold-100 transition-colors"
                    aria-label="Copy reference code"
                  >
                    <Copy className="h-4 w-4 text-gray-700" />
                  </button>
                </div>
                {copied && <p className="text-xs text-forest-600 mt-1.5">Copied to clipboard!</p>}
              </div>

              {/* Warning */}
              <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm font-bold text-red-800">
                    You must use your reference code as the MoMo reference message, or write it down for Cash payments,
                    otherwise your votes cannot be verified.
                  </p>
                </div>
              </div>

              {/* Payment Instructions */}
              <div className="bg-gray-50 rounded-xl p-5 space-y-4">
                {paymentMethod !== 'physical_cash' ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
                      <Smartphone className="h-4 w-4 text-gold-500" />
                      {PAYMENT_METHOD_LABELS[paymentMethod]} Payment
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Send exactly</span>
                        <span className="font-bold text-gray-900">{formatGHS(totalAmount)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">MoMo Number</span>
                        <span className="font-bold text-gray-900">{MOMO_NUMBER}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Account Name</span>
                        <span className="font-bold text-gray-900">{MOMO_ACCOUNT_NAME}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Reference / Message</span>
                        <span className="font-mono font-bold text-gold-700">{referenceCode}</span>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 bg-white rounded-lg p-3 border border-gray-100">
                      Dial your {PAYMENT_METHOD_LABELS[paymentMethod]} USSD code or use the app to send {formatGHS(totalAmount)} to{' '}
                      {MOMO_NUMBER} ({MOMO_ACCOUNT_NAME}). Use <span className="font-mono font-bold">{referenceCode}</span> as
                      the reference message.
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
                      <Banknote className="h-4 w-4 text-gold-500" />
                      Cash Payment
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Pay exactly</span>
                        <span className="font-bold text-gray-900">{formatGHS(totalAmount)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Pay to</span>
                        <span className="font-bold text-gray-900">Sir Selasi or Sir David</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Write down this code</span>
                        <span className="font-mono font-bold text-gold-700">{referenceCode}</span>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 bg-white rounded-lg p-3 border border-gray-100">
                      Hand {formatGHS(totalAmount)} to Sir Selasi or Sir David. Write down{' '}
                      <span className="font-mono font-bold">{referenceCode}</span> and give it to them so they can verify
                      your payment.
                    </div>
                  </div>
                )}
              </div>

              <p className="text-xs text-center text-gray-400">
                Votes will appear once an admin confirms your payment using your reference code.
              </p>

              <button
                onClick={() => {
                  onSuccess();
                  onClose();
                }}
                className="w-full px-6 py-2.5 rounded-xl bg-gold-500 text-white font-semibold hover:bg-gold-600 transition-colors"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
