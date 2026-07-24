import { ExternalLink } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white mt-auto py-4 px-6">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-slate-500">
        <p className="font-medium text-slate-700">LeadFlow CRM</p>
        <a
          href="https://digitalheroesco.com"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-slate-500 hover:text-blue-600 transition-colors"
        >
          Built for Digital Heroes Training Task
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </footer>
  );
}
