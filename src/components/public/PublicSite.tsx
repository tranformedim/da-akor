import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Event, Category, Contestant, VotePackage, Transaction, VoteBatch } from '@/lib/types';
import { Logo } from '@/components/Logo';
import { CheckoutModal } from '@/components/public/CheckoutModal';
import {
  ChevronDown,
  Search,
  Trophy,
  Vote as VoteIcon,
  ShieldCheck,
  Users,
  Calendar,
  MapPin,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Phone,
  Mail,
  Twitter,
  Instagram,
  Facebook,
  Menu,
  X,
} from 'lucide-react';
import { formatGHS, formatNumber, formatDate, PAYMENT_METHOD_LABELS, timeAgo } from '@/lib/utils';

export function PublicSite() {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [contestants, setContestants] = useState<Contestant[]>([]);
  const [packages, setPackages] = useState<VotePackage[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [checkoutContestant, setCheckoutContestant] = useState<Contestant | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [verifiedBatches, setVerifiedBatches] = useState<VoteBatch[]>([]);
  const [eventDropdownOpen, setEventDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data: eventsData } = await supabase.from('events').select('*').order('created_at');
    if (eventsData && eventsData.length > 0) {
      setEvents(eventsData);
      if (!selectedEvent) {
        setSelectedEvent(eventsData[0]);
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!selectedEvent) return;
    Promise.all([
      supabase.from('categories').select('*').eq('event_id', selectedEvent.id).order('name'),
      supabase
        .from('contestants')
        .select('*, category:categories(*)')
        .eq('event_id', selectedEvent.id)
        .eq('is_active', true)
        .order('vote_count', { ascending: false }),
      supabase.from('vote_packages').select('*').eq('event_id', selectedEvent.id).order('price_ghs'),
      supabase
        .from('transactions')
        .select('*, contestant:contestants(*), vote_package:vote_packages(*)')
        .eq('event_id', selectedEvent.id)
        .eq('payment_status', 'confirmed')
        .order('confirmed_at', { ascending: false })
        .limit(10),
      supabase
        .from('vote_batches')
        .select('*, contestant:contestants(*), transaction:transactions(*)')
        .eq('event_id', selectedEvent.id)
        .eq('status', 'applied')
        .order('applied_at', { ascending: false })
        .limit(10),
    ]).then(([cats, conts, pkgs, txns, batches]) => {
      setCategories(cats.data || []);
      setContestants(conts.data || []);
      setPackages(pkgs.data || []);
      setRecentTransactions(txns.data || []);
      setVerifiedBatches(batches.data || []);
      setActiveCategory('all');
      setSearchQuery('');
    });
  }, [selectedEvent]);

  const filteredContestants = contestants.filter((c) => {
    const matchesCategory = activeCategory === 'all' || c.category_id === activeCategory;
    const matchesSearch = !searchQuery || c.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const leaderboard = [...contestants].sort((a, b) => b.vote_count - a.vote_count).slice(0, 5);
  const totalEventVotes = contestants.reduce((sum, c) => sum + c.vote_count, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-gray-900/95 backdrop-blur-sm border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Logo />

            <nav className="hidden md:flex items-center gap-6">
              <a href="#contestants" className="text-sm text-gray-300 hover:text-white transition-colors">
                Contestants
              </a>
              <a href="#leaderboard" className="text-sm text-gray-300 hover:text-white transition-colors">
                Leaderboard
              </a>
              <a href="#packages" className="text-sm text-gray-300 hover:text-white transition-colors">
                Vote Packages
              </a>
              <a href="#transparency" className="text-sm text-gray-300 hover:text-white transition-colors">
                Transparency
              </a>
              <a
                href="/admin"
                className="text-sm text-gold-400 hover:text-gold-300 transition-colors font-medium"
              >
                Admin
              </a>
            </nav>

            <button
              className="md:hidden p-2 text-gray-300"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>

          {mobileMenuOpen && (
            <nav className="md:hidden py-3 border-t border-gray-800 flex flex-col gap-2 animate-slide-down">
              <a href="#contestants" onClick={() => setMobileMenuOpen(false)} className="text-sm text-gray-300 hover:text-white py-2">Contestants</a>
              <a href="#leaderboard" onClick={() => setMobileMenuOpen(false)} className="text-sm text-gray-300 hover:text-white py-2">Leaderboard</a>
              <a href="#packages" onClick={() => setMobileMenuOpen(false)} className="text-sm text-gray-300 hover:text-white py-2">Vote Packages</a>
              <a href="#transparency" onClick={() => setMobileMenuOpen(false)} className="text-sm text-gray-300 hover:text-white py-2">Transparency</a>
              <a href="/admin" className="text-sm text-gold-400 hover:text-gold-300 py-2 font-medium">Admin</a>
            </nav>
          )}
        </div>
      </header>

      {loading ? (
        <div className="flex items-center justify-center h-[60vh]">
          <div className="animate-pulse">
            <div className="w-12 h-12 border-4 border-gold-200 border-t-gold-500 rounded-full animate-spin mx-auto" />
            <p className="text-sm text-gray-500 mt-3 text-center">Loading events…</p>
          </div>
        </div>
      ) : (
        <>
          {/* Hero */}
          <section className="relative bg-gray-900 text-white overflow-hidden">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 left-1/4 w-72 h-72 bg-gold-500 rounded-full blur-3xl" />
              <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-kente-500 rounded-full blur-3xl" />
            </div>
            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
              <div className="text-center max-w-3xl mx-auto">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gold-500/10 border border-gold-500/30 rounded-full mb-6">
                  <Sparkles className="h-3.5 w-3.5 text-gold-400" />
                  <span className="text-xs font-medium text-gold-300">Ghana's Trusted Voting Platform</span>
                </div>
                <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-balance">
                  Vote for your favourite
                  <span className="block text-gold-400">talent & performers</span>
                </h1>
                <p className="mt-6 text-lg text-gray-300 max-w-2xl mx-auto">
                  Transparent, auditable voting for events across Ghana. Pay with MTN MoMo, Telecel Cash, ATMoney, or
                  cash — every vote is tracked and verified.
                </p>

                {/* Event Selector */}
                <div className="mt-8 relative inline-block">
                  <button
                    onClick={() => setEventDropdownOpen(!eventDropdownOpen)}
                    className="inline-flex items-center gap-3 px-5 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl hover:bg-white/15 transition-all"
                  >
                    <span className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gold-400" />
                      <span className="font-medium">{selectedEvent?.name}</span>
                      {selectedEvent?.city && (
                        <span className="text-sm text-gray-400 flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> {selectedEvent.city}
                        </span>
                      )}
                    </span>
                    <ChevronDown className={`h-4 w-4 transition-transform ${eventDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {eventDropdownOpen && (
                    <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 w-80 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-50 animate-slide-down">
                      {events.map((ev) => (
                        <button
                          key={ev.id}
                          onClick={() => {
                            setSelectedEvent(ev);
                            setEventDropdownOpen(false);
                          }}
                          className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0 ${
                            selectedEvent?.id === ev.id ? 'bg-gold-50' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-gray-900 text-sm">{ev.name}</p>
                              <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                                <MapPin className="h-3 w-3" /> {ev.venue}, {ev.city}
                              </p>
                            </div>
                            {selectedEvent?.id === ev.id && <CheckCircle2 className="h-4 w-4 text-gold-500" />}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm">
                  <div className="flex items-center gap-2 text-gray-300">
                    <Users className="h-4 w-4 text-gold-400" />
                    <span>{contestants.length} contestants</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-300">
                    <VoteIcon className="h-4 w-4 text-gold-400" />
                    <span>{formatNumber(totalEventVotes)} votes cast</span>
                  </div>

                </div>
              </div>
            </div>

            {/* Kente-inspired decorative strip */}
            <div className="h-1.5 flex">
              <div className="flex-1 bg-gold-500" />
              <div className="flex-1 bg-kente-500" />
              <div className="flex-1 bg-forest-500" />
              <div className="flex-1 bg-gold-600" />
              <div className="flex-1 bg-kente-600" />
            </div>
          </section>

          {/* Event Info Banner */}
          {selectedEvent?.description && (
            <section className="bg-white border-b border-gray-100">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <p className="text-gray-600 text-center max-w-3xl mx-auto">{selectedEvent.description}</p>
                <div className="flex flex-wrap items-center justify-center gap-4 mt-4 text-sm">
                  <span className="flex items-center gap-1.5 text-gray-500">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    {formatDate(selectedEvent.start_date)} — {formatDate(selectedEvent.end_date)}
                  </span>
                  <span className="flex items-center gap-1.5 text-gray-500">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    {selectedEvent.venue}, {selectedEvent.city}
                  </span>
                  {selectedEvent.is_sandbox && (
                    <span className="px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded-full">
                      Sandbox Mode
                    </span>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* Contestants */}
          <section id="contestants" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
              <div>
                <h2 className="font-display text-2xl sm:text-3xl font-bold text-gray-900">Contestants</h2>
                <p className="text-gray-500 mt-1">Browse and vote for your favourite performers</p>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search contestants…"
                  className="pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:border-gold-400 focus:ring-2 focus:ring-gold-100 outline-none transition-all w-full sm:w-64"
                />
              </div>
            </div>

            {/* Category Tabs */}
            <div className="flex flex-wrap gap-2 mb-8">
              <button
                onClick={() => setActiveCategory('all')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeCategory === 'all'
                    ? 'bg-gray-900 text-white'
                    : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                All Categories
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeCategory === cat.id
                      ? 'bg-gray-900 text-white'
                      : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            {/* Contestant Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredContestants.map((contestant, index) => (
                <ContestantCard
                  key={contestant.id}
                  contestant={contestant}
                  rank={contestants.indexOf(contestant) + 1}
                  onVote={() => setCheckoutContestant(contestant)}
                  delay={index * 50}
                />
              ))}
            </div>

            {filteredContestants.length === 0 && (
              <div className="text-center py-16">
                <p className="text-gray-400">No contestants found matching your search.</p>
              </div>
            )}
          </section>

          {/* Leaderboard */}
          <section id="leaderboard" className="bg-gray-900 text-white py-12 sm:py-16">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gold-500/10 border border-gold-500/30 rounded-full mb-4">
                  <Trophy className="h-3.5 w-3.5 text-gold-400" />
                  <span className="text-xs font-medium text-gold-300">Live Standings</span>
                </div>
                <h2 className="font-display text-2xl sm:text-3xl font-bold">Leaderboard</h2>
                <p className="text-gray-400 mt-1">Top 5 contestants by vote count</p>
              </div>

              <div className="space-y-3">
                {leaderboard.map((contestant, index) => {
                  const maxVotes = leaderboard[0]?.vote_count || 1;
                  const percentage = (contestant.vote_count / maxVotes) * 100;
                  const medals = ['text-gold-400', 'text-gray-300', 'text-kente-400', 'text-gray-500', 'text-gray-500'];
                  return (
                    <div
                      key={contestant.id}
                      className="flex items-center gap-4 p-4 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-all animate-slide-up"
                      style={{ animationDelay: `${index * 80}ms` }}
                    >
                      <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold text-lg ${medals[index]}`}>
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium truncate">{contestant.name}</span>
                          <span className="font-display font-bold text-gold-400">{formatNumber(contestant.vote_count)}</span>
                        </div>
                        <div className="mt-2 h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-gold-500 to-gold-400 rounded-full transition-all duration-700"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Vote Packages */}
          <section id="packages" className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
            <div className="text-center mb-8">
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-gray-900">Vote Packages</h2>
              <p className="text-gray-500 mt-1">Choose a package — more votes means more support</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {packages.map((pkg) => {
                const total = pkg.votes + pkg.bonus_votes;
                return (
                  <div
                    key={pkg.id}
                    className={`relative p-6 rounded-2xl border-2 transition-all hover:shadow-lg ${
                      pkg.is_popular ? 'border-gold-400 bg-gold-50 scale-105' : 'border-gray-200 bg-white'
                    }`}
                  >
                    {pkg.is_popular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gold-500 text-white text-xs font-bold rounded-full uppercase tracking-wide">
                        Most Popular
                      </div>
                    )}
                    <h3 className="font-display text-lg font-bold text-gray-900">{pkg.name}</h3>
                    <p className="font-display text-3xl font-extrabold text-gray-900 mt-2">{formatGHS(pkg.price_ghs)}</p>
                    <div className="mt-4 space-y-1.5">
                      <p className="text-sm text-gray-600 flex items-center gap-2">
                        <VoteIcon className="h-4 w-4 text-forest-500" /> {pkg.votes} votes
                      </p>
                      {pkg.bonus_votes > 0 && (
                        <p className="text-sm text-forest-600 flex items-center gap-2 font-medium">
                          <Sparkles className="h-4 w-4" /> + {pkg.bonus_votes} bonus votes
                        </p>
                      )}
                      <p className="text-sm font-medium text-gray-900 pt-1.5 border-t border-gray-100">
                        {total} total votes
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <p className="text-center text-sm text-gray-400 mt-6">
              Select a contestant above to start voting.
            </p>
          </section>

          {/* Transparency */}
          <section id="transparency" className="bg-white border-t border-gray-100 py-12 sm:py-16">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-10">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-forest-50 border border-forest-100 rounded-full mb-4">
                  <ShieldCheck className="h-3.5 w-3.5 text-forest-600" />
                  <span className="text-xs font-medium text-forest-700">Auditable & Transparent</span>
                </div>
                <h2 className="font-display text-2xl sm:text-3xl font-bold text-gray-900">Vote Transparency</h2>
                <p className="text-gray-500 mt-1 max-w-2xl mx-auto">
                  Every payment is matched to the votes it delivers. Track confirmed payments and verified vote batches
                  in real time.
                </p>
              </div>

              {/* Reconciled Payments — auto-scroll marquee */}
              <div className="mb-8">
                <h3 className="font-display text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-forest-500" />
                  Reconciled Payments
                </h3>
                {recentTransactions.length === 0 ? (
                  <p className="text-sm text-gray-400 py-4">No confirmed payments yet.</p>
                ) : (
                  <div className="overflow-hidden marquee-mask">
                    <div className="flex gap-3 w-max animate-marquee">
                      {[...recentTransactions, ...recentTransactions].map((txn, i) => (
                        <div
                          key={`${txn.id}-${i}`}
                          className="flex-shrink-0 w-56 p-4 bg-gray-50 rounded-xl border border-gray-100"
                        >
                          <p className="text-sm font-medium text-gray-900 truncate">{txn.voter_name}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {PAYMENT_METHOD_LABELS[txn.payment_method]} · {timeAgo(txn.confirmed_at)}
                          </p>
                          <p className="text-sm font-bold text-forest-600 mt-2">{txn.votes_purchased} votes</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Verified Vote Batches — auto-scroll marquee */}
              <div>
                <h3 className="font-display text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <VoteIcon className="h-5 w-5 text-gold-500" />
                  Verified Vote Batches
                </h3>
                {verifiedBatches.length === 0 ? (
                  <p className="text-sm text-gray-400 py-4">No verified batches yet.</p>
                ) : (
                  <div className="overflow-hidden marquee-mask">
                    <div className="flex gap-3 w-max animate-marquee">
                      {[...verifiedBatches, ...verifiedBatches].map((batch, i) => (
                        <div
                          key={`${batch.id}-${i}`}
                          className="flex-shrink-0 w-56 p-4 bg-gray-50 rounded-xl border border-gray-100"
                        >
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {batch.contestant?.name || 'Unknown contestant'}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">Applied {timeAgo(batch.applied_at)}</p>
                          <div className="flex items-center justify-between mt-2">
                            <p className="text-sm font-bold text-gold-600">+{batch.votes_count}</p>
                            <p className="text-xs text-forest-500 flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" /> Verified
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* CTA */}
          <section className="bg-gradient-to-br from-gray-900 to-gray-800 text-white py-16">
            <div className="max-w-3xl mx-auto px-4 text-center">
              <h2 className="font-display text-3xl font-bold">Ready to support your favourite?</h2>
              <p className="text-gray-300 mt-3">
                Every vote counts. Pick a contestant, choose a package, and pay with your preferred method.
              </p>
              <a
                href="#contestants"
                className="inline-flex items-center gap-2 mt-6 px-6 py-3 bg-gold-500 text-white font-semibold rounded-xl hover:bg-gold-600 transition-colors"
              >
                Browse Contestants <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </section>

          {/* Footer */}
          <footer className="bg-gray-900 text-gray-400 py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div>
                  <Logo />
                  <p className="text-sm mt-4 max-w-xs">
                    Transparent voting platform for events across Ghana. Every vote is tracked, verified, and auditable.
                  </p>
                </div>
                <div>
                  <h4 className="text-white font-medium mb-3">Contact</h4>
                  <div className="space-y-2 text-sm">
                    <p className="flex items-center gap-2"><Phone className="h-4 w-4" /> +233 24 123 4567</p>
                    <p className="flex items-center gap-2"><Mail className="h-4 w-4" /> hello@daako.gh</p>
                  </div>
                </div>
                <div>
                  <h4 className="text-white font-medium mb-3">Follow Us</h4>
                  <div className="flex gap-3">
                    {[Twitter, Instagram, Facebook].map((Icon, i) => (
                      <a
                        key={i}
                        href="#"
                        className="p-2.5 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
                      >
                        <Icon className="h-4 w-4" />
                      </a>
                    ))}
                  </div>
                </div>
              </div>
              <div className="mt-8 pt-8 border-t border-gray-800 text-sm text-center">
                <p>&copy; {new Date().getFullYear()} Da Akɔ. Built for transparent voting in Ghana.</p>
              </div>
            </div>
          </footer>
        </>
      )}

      {/* Checkout Modal */}
      {checkoutContestant && selectedEvent && packages.length > 0 && (
        <CheckoutModal
          event={selectedEvent}
          contestant={checkoutContestant}
          packages={packages}
          onClose={() => setCheckoutContestant(null)}
          onSuccess={() => {
            if (selectedEvent) {
              supabase
                .from('contestants')
                .select('*, category:categories(*)')
                .eq('event_id', selectedEvent.id)
                .eq('is_active', true)
                .order('vote_count', { ascending: false })
                .then(({ data }) => setContestants(data || []));
            }
          }}
        />
      )}
    </div>
  );
}

function ContestantCard({
  contestant,
  rank,
  onVote,
  delay,
}: {
  contestant: Contestant;
  rank: number;
  onVote: () => void;
  delay: number;
}) {
  return (
    <div
      className="group bg-white rounded-2xl overflow-hidden border border-gray-100 hover:shadow-xl transition-all duration-300 animate-slide-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="relative aspect-square overflow-hidden bg-gray-100">
        {contestant.photo_url ? (
          <img
            src={contestant.photo_url}
            alt={contestant.name}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-200 to-gray-300">
            <span className="text-4xl font-bold text-gray-400">{contestant.name.charAt(0)}</span>
          </div>
        )}
        {rank <= 3 && (
          <div className="absolute top-3 left-3 flex items-center gap-1 px-2 py-1 bg-white/90 backdrop-blur-sm rounded-lg text-xs font-bold">
            <Trophy className={`h-3 w-3 ${rank === 1 ? 'text-gold-500' : rank === 2 ? 'text-gray-400' : 'text-kente-400'}`} />
            #{rank}
          </div>
        )}
        <div className="absolute bottom-3 right-3 px-3 py-1.5 bg-gray-900/80 backdrop-blur-sm rounded-lg">
          <span className="text-sm font-bold text-white">{formatNumber(contestant.vote_count)}</span>
          <span className="text-xs text-gray-300 ml-1">votes</span>
        </div>
      </div>
      <div className="p-4">
        <div className="flex items-center gap-2 mb-1">
          {contestant.category && (
            <span className="px-2 py-0.5 text-[10px] font-medium bg-gold-50 text-gold-700 rounded-full">
              {contestant.category.name}
            </span>
          )}
        </div>
        <h3 className="font-display font-bold text-gray-900 text-lg">{contestant.name}</h3>
        {contestant.bio && (
          <p className="text-sm text-gray-500 mt-1 line-clamp-2">{contestant.bio}</p>
        )}
        <button
          onClick={onVote}
          className="w-full mt-4 px-4 py-2.5 bg-gold-500 text-white font-semibold rounded-xl hover:bg-gold-600 transition-all flex items-center justify-center gap-2 group/btn"
        >
          <VoteIcon className="h-4 w-4" />
          Vote Now
          <ArrowRight className="h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  );
}
