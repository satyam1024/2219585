/* eslint-disable no-unused-vars */
import React, { useState } from "react";
import { Log } from "../api/logger";
import "./Analysis.css";
const Analytics = ({ token }) => {
  const [code, setCode] = useState("");
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const handleFetch = async () => {
    setError(null);
    setData(null);

    try {
      const res = await fetch(`http://localhost:5000/shorturls/${code}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const errData = await res.json();
        setError(errData.message || "Error fetching data");
        await Log(
          "frontend",
          "error",
          "Analytics",
          `Error fetching stats for ${code}: ${errData.message}`,
          token
        );
        return;
      }

      const result = await res.json();
      setData(result);
      await Log(
        "frontend",
        "info",
        "Analytics",
        `Fetched stats for ${code}`,
        token
      );
    } catch (err) {
      setError("Network error");
      await Log(
        "frontend",
        "error",
        "Analytics",
        `Network error fetching stats for ${code}`,
        token
      );
    }
  };

  return (
    <div className="analytics">
      <h2>Analytics</h2>
      <input
        type="text"
        placeholder="Enter shortcode"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        className="input-field"
      />
      <button onClick={handleFetch}>Get Stats</button>

      {error && <p className="error">{error}</p>}

      {data && (
        <div className="result">
          <p>
            <strong>Original URL:</strong> {data.originalURL}
          </p>
          <p>
            <strong>Total Clicks:</strong> {data.clicks}
          </p>
          <p>
            <strong>Expiry:</strong> {data.metadata.expiresAt}
          </p>
          <p>
            <strong>Clicks:</strong>
          </p>
          <ul>
            {data.clickStats.map((c, i) => (
              <li key={i}>
                {c.timestamp} - {c.referrer || "N/A"} -{" "}
                {c.geo?.country || "N/A"}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default Analytics;
