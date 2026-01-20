import { ReactNode, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Package } from 'lucide-react';
import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/clerk-react';
import { Toaster } from 'sonner';
import { UploadedImagesProvider } from '@/contexts/UploadedImagesContext';
import { useApiClient } from '@/hooks/useApiClient';

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  useApiClient();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isActive = (path: string) => {
    return location.pathname.startsWith(path);
  };

  const menuItems = [
    { path: '/dashboard/orders', label: 'Pedidos', icon: Package, adminOnly: true },
  ];

  const showBackButton = location.pathname !== '/dashboard/orders' && location.pathname.startsWith('/dashboard/orders');
  const handleBack = () => {
    navigate('/dashboard/orders');
  };

  return (
    <UploadedImagesProvider>
      <div className="min-h-screen bg-background flex">
        {/* Sidebar */}
        <aside className={`hidden md:flex flex-col w-64 border-r bg-white sticky top-0 h-screen transition-transform ${sidebarOpen ? 'translate-x-0' : ''
          }`}>
          <div className="p-4 border-b flex-shrink-0">
            <h2 className="text-xl font-bold text-primary">Dashboard</h2>
          </div>
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            <p className='text-xs font-medium text-muted-foreground'>Administración</p>
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-2 rounded-md text-sm font-medium transition-colors ${isActive(item.path)
                    ? 'bg-primary/10 text-primary'
                    : 'text-foreground/70 hover:bg-accent/10 hover:text-primary'
                    }`}
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <header className="sticky top-0 z-10 border-b bg-white flex-shrink-0">
            <div className="px-4 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="md:hidden p-2 rounded-md hover:bg-gray-100"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
                {showBackButton && (
                  <button
                    onClick={handleBack}
                    className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Volver
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <SignedOut>
                  <SignInButton mode="modal">
                    <button className="text-sm font-medium text-gray-600 hover:text-gray-900">
                      Iniciar Sesión
                    </button>
                  </SignInButton>
                </SignedOut>
                <SignedIn>
                  <UserButton afterSignOutUrl="/product/calendar" />
                </SignedIn>
              </div>
            </div>
          </header>

          {/* Page Content */}
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>

        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
        <aside
          className={`fixed top-0 left-0 h-full w-64 bg-white border-r z-50 transform transition-transform md:hidden ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
        >
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="text-xl font-bold text-primary">Dashboard</h2>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-2 rounded-md hover:bg-accent/10"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <nav className="p-4 space-y-2">
            <p className='text-xs font-medium text-muted-foreground'>Administración</p>
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-2 rounded-md text-sm font-medium transition-colors ${isActive(item.path)
                    ? 'bg-primary/10 text-primary'
                    : 'text-foreground/70 hover:bg-accent/10 hover:text-primary'
                    }`}
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>
      </div>
      <Toaster position="bottom-right" richColors />
    </UploadedImagesProvider>
  );
}
