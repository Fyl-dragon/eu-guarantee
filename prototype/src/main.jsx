import React from 'react'
import { createRoot } from 'react-dom/client'
import { AppProvider } from '@shopify/polaris'
import zhCN from '@shopify/polaris/locales/zh-CN.json'
import '@shopify/polaris/build/esm/styles.css'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <AppProvider i18n={zhCN}>
    <App />
  </AppProvider>
)
