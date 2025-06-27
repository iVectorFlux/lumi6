import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { QueryProvider } from './providers/QueryProvider.tsx'
import './index.css'

createRoot(document.getElementById("root")!).render(
  <QueryProvider>
    <App />
  </QueryProvider>
);
