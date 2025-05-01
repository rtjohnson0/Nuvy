import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/navbar';
import Home from './pages/home';
import Projects from './pages/projects';
// import Docs from './pages/Docs';
import Deployments from './pages/deployments';

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/"            element={<Home />} />
        <Route path="/projects"    element={<Projects />} />
        {/* <Route path="/docs"        element={<Docs />} /> */}
        <Route path="/deployments" element={<Deployments />} />
      </Routes>
    </BrowserRouter>
  );
}
