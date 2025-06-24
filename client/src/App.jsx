import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Header from "./components/Header/Header";
import Home from "./Pages/Home/Home";
import Success from "./Pages/Success/Success";
import ErrorPage from "./Pages/ErrorPage/ErrorPage";
// App
const App = () => {
  return (
    <Router>
      <div className="container">
        <Header />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/success" element={<Success />} />
          <Route path="/error" element={<ErrorPage />} />
        </Routes>
      </div>
    </Router>
  );
};

export default App;
