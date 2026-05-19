import '../styles/layout.css';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { ResidentProfileGate } from './ResidentProfileGate';
export function Layout() {
    return (<div className="app-layout">
      <Sidebar />
      <div className="main-area">
        <Header />
        <main className="main-content">
          <ResidentProfileGate>
            <Outlet />
          </ResidentProfileGate>
        </main>
      </div>
    </div>);
}
