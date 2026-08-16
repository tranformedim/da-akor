import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Event, Contestant, VotePackage, PaymentMethod } from '@/lib/types';
import { PAYMENT_METHOD_LABELS, formatGHS } from '@/lib/utils';
import { X, CheckCircle2, Loader2, Smartphone, Banknote, ArrowRight, ArrowLeft } from 'lucide-react';

interface CheckoutModalProps {
  event: Event;
  contestant: Contestant;
  packages: VotePackage[];
  onClose: () => void;
  onSuccess: () => void;
}

type Step = 'package' | 'details' | 'payment' | 'processing' | 'success';

export function CheckoutModal({ event, contestant, packages, onClose, onSuccess }: CheckoutModalProps) {
  const [step, setStep] = useState<Step>('package');
  const [selectedPackage, setSelectedPackage] = useState<VotePackage | null>(null);
  const [voterName, setVoterName] = useState('');
  const [voterPhone, setVoterPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('mtn_momo');
  const [momoNumber, setMomoNumber] = useState('');
  const [error, setError] = useState('');
  const [transactionRef, setTransactionRef] = useState('');

  const totalVotes = selectedPackage ? selectedPackage.votes + selectedPackage.bonus_votes : 0;

  const handleSelectPackage = (pkg: VotePackage) => {
    setSelectedPackage(pkg);
    setStep('details');
  };

  const handleDetailsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!voterName.trim() || !voterPhone.trim()) {
      setError('Please fill in all fields');
      return;
    }
    setError('');
    setMomoNumber(voterPhone);
    setStep('payment');
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPackage) return;
    if (paymentMethod !== 'physical_cash' && !momoNumber.trim()) {
      setError('Please enter your mobile money number');
      return;
    }
    setError('');
    setStep('processing');

    const ref = `DAK-${Date.now().toString().slice(-6)}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;

    const { error: insertError } = await supabase.from('transactions').insert({
      event_id: event.id,
      contestant_id: contestant.id,
      vote_package_id: selectedPackage.id,
      voter_name: voterName.trim(),
      voter_phone: voterPhone.trim(),
      payment_method: paymentMethod,
      payment_status: 'pending',
      amount: selectedPackage.price_ghs,
      votes_purchased: totalVotes,
      momo_reference: paymentMethod !== 'physical_cash' ? ref : null,
      momo_number: paymentMethod !== 'physical_cash' ? momoNumber.trim() : null,
    });

    if (insertError) {
      setError(insertError.message);
      setStep('payment');
      return;
    }

    setTransactionRef(ref);
    setTimeout(() => setStep('success'), 1500);
  };

  const paymentMethods: { value: PaymentMethod; label: string; icon: typeof Smartphone }[] = [
    { value: 'mtn_momo', label: 'MTN MoMo', icon: Smartphone },
    { value: 'telecel_cash', label: 'Telecel Cash', icon: Smartphone },
    { value: 'atmoney', label: 'ATMoney', icon: Smartphone },
    { value: 'physical_cash', label: 'Physical Cash', icon: Banknote },
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
          {step !== 'processing' && step !== 'success' && (
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

          {/* Step: Package Selection */}
          {step === 'package' && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600 mb-4">Choose a vote package:</p>
              {packages.map((pkg) => {
              const pkgTotal = pkg.votes + pkg.bonus_votes;
              return (
                <button
                  key={pkg.id}
                  onClick={() => handleSelectPackage(pkg)}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all hover:shadow-md group ${
                    pkg.is_popular
                      ? 'border-gold-400 bg-gold-50'
                      : 'border-gray-200 hover:border-gold-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
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
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-display text-lg font-bold text-gray-900">{formatGHS(pkg.price_ghs)}</span>
                      <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-gold-500 group-hover:translate-x-1 transition-all" />
                    </div>
                  </div>
                </button>
              );
              })}
            </div>
          )}

          {/* Step: Voter Details */}
          {step === 'details' && (
            <form onSubmit={handleDetailsSubmit} className="space-y-4">
              <div className="bg-gold-50 rounded-xl p-4 border border-gold-100">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Package</span>
                  <span className="font-bold text-gray-900">{selectedPackage?.name}</span>
                </div>
                <div className="flex items-center justify-between text-sm mt-1">
                  <span className="text-gray-600">Votes</span>
                  <span className="font-bold text-forest-600">{totalVotes} votes</span>
                </div>
                <div className="flex items-center justify-between text-sm mt-1">
                  <span className="text-gray-600">Price</span>
                  <span className="font-bold text-gray-900">{formatGHS(selectedPackage?.price_ghs ?? 0)}</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Your Name</label>
                <input
                  type="text"
                  value={voterName}
                  onChange={(e) => setVoterName(e.target.value)}
                  placeholder="Enter your full name"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-gold-400 focus:ring-2 focus:ring-gold-100 outline-none transition-all"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone Number</label>
                <input
                  type="tel"
                  value={voterPhone}
                  onChange={(e) => setVoterPhone(e.target.value)}
                  placeholder="e.g. 0241234567"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-gold-400 focus:ring-2 focus:ring-gold-100 outline-none transition-all"
                  required
                />
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

          {/* Step: Payment */}
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

              {paymentMethod !== 'physical_cash' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    {PAYMENT_METHOD_LABELS[paymentMethod]} Number
                  </label>
                  <input
                    type="tel"
                    value={momoNumber}
                    onChange={(e) => setMomoNumber(e.target.value)}
                    placeholder="e.g. 0241234567"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-gold-400 focus:ring-2 focus:ring-gold-100 outline-none transition-all"
                  />
                  <p className="text-xs text-gray-400 mt-1.5">
                    You will receive a prompt on this number to approve the payment.
                  </p>
                </div>
              )}

              {paymentMethod === 'physical_cash' && (
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                  <p className="text-sm text-blue-800">
                    Pay {formatGHS(selectedPackage?.price_ghs ?? 0)} at any designated voting center or to an authorized
                    agent. Your votes will be applied once payment is confirmed by an administrator.
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
                  <span className="font-display text-lg font-bold text-gray-900">
                    {formatGHS(selectedPackage?.price_ghs ?? 0)}
                  </span>
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
                  {paymentMethod === 'physical_cash' ? 'Submit Request' : `Pay ${formatGHS(selectedPackage?.price_ghs ?? 0)}`}
                </button>
              </div>
            </form>
          )}

          {/* Step: Processing */}
          {step === 'processing' && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-12 w-12 text-gold-500 animate-spin mb-4" />
              <h3 className="font-display text-lg font-bold text-gray-900">Processing your payment…</h3>
              <p className="text-sm text-gray-500 mt-1">
                {paymentMethod === 'physical_cash'
                  ? 'Registering your cash payment request…'
                  : `Sending prompt to ${momoNumber}…`}
              </p>
            </div>
          )}

          {/* Step: Success */}
          {step === 'success' && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-16 h-16 bg-forest-100 rounded-full flex items-center justify-center mb-4 animate-count-up">
                <CheckCircle2 className="h-8 w-8 text-forest-600" />
              </div>
              <h3 className="font-display text-xl font-bold text-gray-900">Vote Submitted!</h3>
              <p className="text-sm text-gray-500 mt-2 max-w-sm">
                Your payment of {formatGHS(selectedPackage?.price_ghs ?? 0)} for{' '}
                <span className="font-medium text-gray-700">{totalVotes} votes</span> for{' '}
                <span className="font-medium text-gray-700">{contestant.name}</span> has been received.
              </p>
              {paymentMethod !== 'physical_cash' && (
                <div className="mt-4 px-4 py-2 bg-gray-100 rounded-lg">
                  <p className="text-xs text-gray-500">Reference</p>
                  <p className="font-mono text-sm font-bold text-gray-900">{transactionRef}</p>
                </div>
              )}
              <p className="text-xs text-gray-400 mt-4">
                Votes will appear once an admin confirms the payment.
              </p>
              <button
                onClick={() => {
                  onSuccess();
                  onClose();
                }}
                className="mt-6 px-6 py-2.5 rounded-xl bg-gold-500 text-white font-semibold hover:bg-gold-600 transition-colors"
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
