import { bootstrap } from './bootstrap';

bootstrap()
  .then(() => import('../renderer/main'))
  .catch((e) => {
    document.getElementById('root')!.innerText = 'Could not start the demo: ' + String(e);
    console.error(e);
  });
