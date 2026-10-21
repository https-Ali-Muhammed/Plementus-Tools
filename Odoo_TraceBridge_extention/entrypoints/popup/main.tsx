import { createRoot } from 'react-dom/client';
import { RECORDING_STATUS } from './status';

function Popup() {
  return <main><h1>Odoo TraceBridge</h1><p role="status">{RECORDING_STATUS}</p></main>;
}

createRoot(document.getElementById('root')!).render(<Popup />);
