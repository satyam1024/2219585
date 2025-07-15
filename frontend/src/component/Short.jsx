/* eslint-disable no-unused-vars */
import React, { useState } from "react";
import { Log } from "../../../shared/middleware/logger";
import "./Short.css";
const Short = ({ token }) => {
  const [urls, setUrls] = useState([""]);
  const [results, setResults] = useState([]);
  const [error, setError] = useState(null);

  const handleChange = (index, value) => {
    const newUrls = [...urls];
    newUrls[index] = value;
    setUrls(newUrls);
  };

  const handleAddUrl = () => {
    if (urls.length < 5) {
      setUrls([...urls, ""]);
    }
  };

  const handleSubmit = async () => {
    setError(null);
    setResults([]);

    const payloads = urls.map((url) => ({
      longURL: url,
    }));

    const responseData = [];

    for (let data of payloads) {
      try {
        const res = await fetch("http://localhost:5000/shorten", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(data),
        });

        if (!res.ok) {
          const errData = await res.json();
          setError(errData.message || "Error shortening URL");
          await Log(
            "frontend",
            "error",
            "Shortener",
            `Error shortening ${data.longURL}: ${errData.message}`,
            token
          );
          continue;
        }

        const result = await res.json();
        responseData.push(result);
        await Log(
          "frontend",
          "success",
          "Shortener",
          `Shortened ${data.longURL}`,
          token
        );
      } catch (err) {
        setError("Network error while shortening URLs");
        await Log(
          "frontend",
          "error",
          "Shortener",
          `Network error for ${data.longURL}`,
          token
        );
      }
    }

    setResults(responseData);
  };

  return (
    <div className="shortener">
      <h2>Shorten URLs</h2>
      {urls.map((url, i) => (
        <input
          key={i}
          type="text"
          placeholder={`URL ${i + 1}`}
          className="input-field"
          value={url}
          onChange={(e) => handleChange(i, e.target.value)}
        />
      ))}

      <button
        onClick={handleAddUrl}
        disabled={urls.length >= 5}
        className="btn"
      >
        + Add More
      </button>

      <button onClick={handleSubmit} className="btn btn-primary">
        Shorten
      </button>

      {error && <p className="error">{error}</p>}

      {results.length > 0 && (
        <div className="results">
          {results.map((r, i) => (
            <div key={i} className="result-item">
              <p>
                Short URL:{" "}
                <a href={r.shortURL} target="_blank" rel="noopener noreferrer">
                  {r.shortURL}
                </a>
              </p>
              <p>Expires: {new Date(r.expiresAt).toLocaleString()}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Short;
