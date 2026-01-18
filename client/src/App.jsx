// client/src/App.jsx
import React from "react";
import { Routes, Route } from "react-router-dom";
import Header from "./components/Header.jsx";
import ProductsPage from "./pages/ProductsPage/ProductsPage.jsx";
import ProductDetailsPage from "./pages/ProductDetailsPage/ProductDetailsPage.jsx";
import Footer from "./components/Footer/Footer.jsx";
import HomePage from "./pages/HomePage/HomePage.jsx";

const App = () => {
  return (
    <>
      <Header />

      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/products/:id" element={<ProductDetailsPage />} />
      </Routes>

      <Footer />
    </>
  );
};

export default App;