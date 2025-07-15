import React from "react";
import Shortener from "./component/Short";
import Analytics from "./component/Analysis";
import "./App.css";

const App = () => {
  const [tab, setTab] = React.useState(0);
  const token = import.meta.env.VITE_AUTH_TOKEN;

  return (
    <div className="container">
      <div className="tabs">
        <button className={tab === 0 ? "active" : ""} onClick={() => setTab(0)}>
          Shortener
        </button>
        <button className={tab === 1 ? "active" : ""} onClick={() => setTab(1)}>
          Analytics
        </button>
      </div>
      <div className="tab-content">
        {tab === 0 ? <Shortener token={token} /> : <Analytics token={token} />}
      </div>
    </div>
  );
};

export default App;
