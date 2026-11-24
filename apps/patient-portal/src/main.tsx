import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import '@lhc/web/styles';
createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
