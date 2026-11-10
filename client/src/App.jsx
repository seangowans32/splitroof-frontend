import MainRouter from './MainRouter.jsx';
import EffectsManager from './components/EffectsManager.jsx';

function App() {
  return (
    <EffectsManager>
      <MainRouter />
    </EffectsManager>
  )
}

export default App