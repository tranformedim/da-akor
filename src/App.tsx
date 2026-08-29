import { useState, useEffect } from 'react';
import { PublicSite } from '@/components/public/PublicSite';
import { AdminApp } from '@/components/admin/AdminApp';

function App() {
  const [route, setRoute] = useState(window.location.pathname);

  useEffect(() => {
    const onPop = () => setRoute(window.location.pathname);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const navigate = (path: string) => {
    window.history.pushState({}, '', path);
    setRoute(path);
  };

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest('a');
      if (!anchor) return;
      const href = anchor.getAttribute('href');
      if (!href) return;
      if (href.startsWith('/admin')) {
        e.preventDefault();
        navigate('/admin');
      } else if (href === '/' || href.startsWith('/#')) {
        e.preventDefault();
        navigate('/');
        if (href.startsWith('/#')) {
          setTimeout(() => {
            const id = href.slice(2);
            document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
          }, 100);
        }
      }
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  if (route.startsWith('/admin')) {
    return <AdminApp />;
  }
  return <PublicSite />;
}

export default App;
