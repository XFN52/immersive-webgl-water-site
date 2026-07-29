import { createRoot } from 'react-dom/client'
import './styles.css'
import App from './App'
import Fallback from './ui/Fallback'
import { canUseWebGL, quality } from './lib/state'

if (quality.reduced) document.documentElement.classList.add('reduced')
if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
  document.documentElement.classList.add('fine-pointer')
}

createRoot(document.getElementById('root')!).render(canUseWebGL() ? <App /> : <Fallback />)
