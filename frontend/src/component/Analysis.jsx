/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from "react";
import { Log } from "../../../shared/middleware/logger";
import "./Analysis.css";

const Analytics = ({ token }) => {
  const [allUrls, setAllUrls] = useState([]);
  const [selectedCode, setSelectedCode] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

  const fetchAllUrls = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${BASE_URL}/shorturls`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const errData = await res.json();
        setError(errData.message || "Error fetching all URLs");
        await Log(
          "frontend",
          "error",
          "Analytics",
          `Error fetching all URLs: ${errData.message}`,
          token
        );
        return;
      }

      const result = await res.json();
      setAllUrls(result);
      await Log(
        "frontend",
        "info",
        "Analytics",
        `Fetched all URLs successfully.`,
        token
      );
    } catch (err) {
      setError("Network error while fetching all URLs");
      await Log(
        "frontend",
        "error",
        "Analytics",
        `Network error fetching all URLs: ${err.message}`,
        token
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchStatsForCode = async (codeToFetch) => {
    if (!codeToFetch) return;

    setLoading(true);
    setError(null);
    setData(null);

    try {
      const res = await fetch(`${BASE_URL}/shorturls/${codeToFetch}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const errData = await res.json();
        setError(errData.message || "Error fetching statistics");
        await Log(
          "frontend",
          "error",
          "Analytics",
          `Error fetching stats for ${codeToFetch}: ${errData.message}`,
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
        `Fetched stats for ${codeToFetch} successfully.`,
        token
      );
    } catch (err) {
      setError("Network error while fetching statistics");
      await Log(
        "frontend",
        "error",
        "Analytics",
        `Network error fetching stats for ${codeToFetch}: ${err.message}`,
        token
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllUrls();
  }, [token]);

  useEffect(() => {
    if (selectedCode) {
      fetchStatsForCode(selectedCode);
    }
  }, [selectedCode, token]);

  return (
    <div className="analytics">
      <h2>URL Analytics & Statistics</h2>

      <div className="analytics-controls">
        <input
          type="text"
          placeholder="Enter shortcode (e.g., abcde1)"
          value={selectedCode}
          onChange={(e) => setSelectedCode(e.target.value)}
          className="input-field"
        />
        <button
          onClick={() => fetchStatsForCode(selectedCode)}
          disabled={!selectedCode || loading}
        >
          Get Stats
        </button>
        <button
          onClick={fetchAllUrls}
          className="refresh-btn"
          disabled={loading}
        >
          {loading ? "Refreshing..." : "Refresh All URLs"}
        </button>
      </div>

      {error && <p className="error">{error}</p>}
      {loading && <p className="loading-message">Loading data...</p>}

      {!loading && allUrls.length > 0 && !data && (
        <div className="all-urls-list">
          <h3>Your Shortened URLs:</h3>
          <ul>
            {allUrls.map((url) => (
              <li
                key={url.shortcode}
                onClick={() => setSelectedCode(url.shortcode)}
                className={
                  url.shortcode === selectedCode
                    ? "selected-url-item"
                    : "url-item"
                }
              >
                <strong>Shortcode:</strong> {url.shortcode} <br />
                <strong>Original:</strong> {url.originalURL} <br />
                <strong>Total Clicks:</strong> {url.totalClicks} <br />
                <small>
                  Created: {new Date(url.createdAt).toLocaleString()} | Expires:{" "}
                  {new Date(url.expiresAt).toLocaleString()}
                </small>
              </li>
            ))}
          </ul>
        </div>
      )}

      {data && (
        <div className="analytics-result">
          <h3>
            Statistics for:{" "}
            <a href={data.shortURL} target="_blank" rel="noopener noreferrer">
              {data.shortURL}
            </a>
          </h3>
          <p>
            <strong>Original URL:</strong> {data.originalURL}
          </p>
          <p>
            <strong>Total Clicks:</strong> {data.totalClicks}
          </p>
          <p>
            <strong>Created At:</strong>{" "}
            {new Date(data.metadata.createdAt).toLocaleString()}
          </p>
          <p>
            <strong>Expires At:</strong>{" "}
            {new Date(data.metadata.expiresAt).toLocaleString()}
          </p>
          <p>
            <strong>Remaining Validity:</strong>{" "}
            {data.metadata.remainingValidityMinutes > 0
              ? `${data.metadata.remainingValidityMinutes} minutes`
              : "Expired"}
          </p>

          <h4>Detailed Click Data:</h4>
          {data.clickStats && data.clickStats.length > 0 ? (
            <ul className="click-stats-list">
              {data.clickStats.map((c, i) => (
                <li key={i} className="click-item">
                  <span>
                    <strong>Time:</strong> {c.timestamp}
                  </span>
                  <span>
                    <strong>IP:</strong> {c.ip || "N/A"}
                  </span>
                  <span>
                    <strong>Referrer:</strong> {c.referrer || "Direct / N/A"}
                  </span>
                  <span>
                    <strong>Location:</strong> {c.geo.city}, {c.geo.country}
                  </span>
                  <details>
                    <summary>User Agent</summary>
                    <p className="user-agent-detail">{c.userAgent || "N/A"}</p>
                  </details>
                </li>
              ))}
            </ul>
          ) : (
            <p>No click data available yet for this URL.</p>
          )}
          <button onClick={() => setData(null)} className="back-to-list-btn">
            Back to All URLs
          </button>
        </div>
      )}

      {!loading && allUrls.length === 0 && !error && !data && (
        <p className="no-data-message">
          No shortened URLs available. Start by shortening some in the Shortener
          tab!
        </p>
      )}
    </div>
  );
};

export default Analytics;
