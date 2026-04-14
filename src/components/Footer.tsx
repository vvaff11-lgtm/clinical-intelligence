export default function Footer() {
  return (
    <footer className="w-full py-8 px-12 bg-surface-container-low border-t border-outline-variant/10 opacity-80 hover:opacity-100 transition-all duration-300">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center">
        <div className="text-xs font-sans uppercase tracking-widest text-outline mb-4 md:mb-0">
          © 2026 Clinical Intelligence Framework. AI-Powered Precision.
        </div>
        <div className="flex gap-8">
          <a href="#" className="text-xs font-sans uppercase tracking-widest text-outline hover:text-primary transition-colors">
            关于我们
          </a>
          <a href="#" className="text-xs font-sans uppercase tracking-widest text-outline hover:text-primary transition-colors">
            联系客服
          </a>
          <a href="#" className="text-xs font-sans uppercase tracking-widest text-outline hover:text-primary transition-colors">
            医疗免责声明
          </a>
        </div>
      </div>
    </footer>
  );
}
