import { useState } from 'react';
import { createLead } from '@/lib/leads';
import { Zap, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';

const SOURCES = [
  { value: 'web_form', label: 'Website' },
  { value: 'referral', label: 'Referral' },
  { value: 'cold_outreach', label: 'Cold Outreach' },
  { value: 'social', label: 'Social Media' },
  { value: 'other', label: 'Other' },
];

export default function CaptureFormPage() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [source, setSource] = useState('web_form');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await createLead({
        first_name: firstName,
        last_name: lastName,
        email,
        phone: phone || undefined,
        company: company || undefined,
        source: source as 'web_form' | 'referral' | 'cold_outreach' | 'social' | 'other',
        status: 'new',
        priority: 'medium',
        message: message || undefined,
      });
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex flex-col">
      {/* Header */}
      <header className="px-6 py-5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-white font-bold text-xl">
            <div className="w-9 h-9 bg-blue-500 rounded-xl flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            LeadFlow
          </div>
          <a href="/login" className="text-sm text-blue-300 hover:text-white transition-colors">
            Team Login →
          </a>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-2xl">
          {submitted ? (
            <div className="bg-white rounded-3xl p-12 text-center shadow-2xl">
              <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10 text-emerald-500" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-3">We're on it!</h2>
              <p className="text-slate-500 text-lg max-w-md mx-auto">
                Thanks for reaching out. A member of our sales team will be in touch with you shortly.
              </p>
              <button
                onClick={() => {
                  setSubmitted(false);
                  setFirstName(''); setLastName(''); setEmail('');
                  setPhone(''); setCompany(''); setMessage('');
                }}
                className="mt-8 px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl transition-colors text-sm"
              >
                Submit another inquiry
              </button>
            </div>
          ) : (
            <>
              <div className="text-center mb-8">
                <div className="inline-block px-4 py-1.5 bg-blue-500/20 border border-blue-400/30 rounded-full text-blue-300 text-sm font-medium mb-4">
                  Get in touch
                </div>
                <h1 className="text-4xl font-bold text-white mb-3 leading-tight">
                  Ready to grow your business?
                </h1>
                <p className="text-slate-400 text-lg">
                  Fill in the form and our sales team will reach out within 24 hours.
                </p>
              </div>

              <div className="bg-white rounded-3xl shadow-2xl p-8">
                {error && (
                  <div className="flex items-center gap-2.5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl mb-6 text-sm text-rose-700">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">First Name *</label>
                      <input
                        type="text" required value={firstName} onChange={e => setFirstName(e.target.value)}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Jane"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Last Name *</label>
                      <input
                        type="text" required value={lastName} onChange={e => setLastName(e.target.value)}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Smith"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Email Address *</label>
                    <input
                      type="email" required value={email} onChange={e => setEmail(e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="jane@company.com"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Phone</label>
                      <input
                        type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="+1 (555) 000-0000"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Company</label>
                      <input
                        type="text" value={company} onChange={e => setCompany(e.target.value)}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Acme Corp"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">How did you hear about us?</label>
                    <select
                      value={source} onChange={e => setSource(e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                    >
                      {SOURCES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Message</label>
                    <textarea
                      value={message} onChange={e => setMessage(e.target.value)} rows={4}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      placeholder="Tell us about your needs…"
                    />
                  </div>

                  <button
                    type="submit" disabled={loading}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold rounded-xl transition-colors shadow-sm text-base"
                  >
                    {loading ? 'Submitting…' : 'Get in Touch →'}
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      </div>

      <footer className="py-6 px-6 border-t border-white/10">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-slate-500">
          <p className="text-slate-400">© 2025 LeadFlow CRM</p>
          <a
            href="https://digitalheroesco.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-slate-500 hover:text-blue-400 transition-colors"
          >
            Built for Digital Heroes Training Task
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </footer>
    </div>
  );
}
