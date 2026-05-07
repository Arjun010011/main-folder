import React, { useEffect, useState } from "react";
import { getRequest } from "Includes/api/apicall";
import { GET_URL } from "Includes/urls";
import { getAcademicYear } from "Includes/functions";
import "./ChatbotAcademicYearControls.scss";

/**
 * Load active academic years and keep a chat-local selection (defaults from app header).
 * @param {boolean} shouldLoad — when true, sync from header and refetch list (e.g. floating chat is open).
 */
export function useChatbotAcademicYearPanel(shouldLoad) {
  const [options, setOptions] = useState([]);
  const [yearId, setYearId] = useState(() => getAcademicYear() || "");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!shouldLoad) return;
    const header = getAcademicYear() || "";
    setLoading(true);
    getRequest(GET_URL.getacademicyear.api, { is_active: true }, {})
      .then((res) => {
        let list = [];
        if (res && res.status === 200) {
          const raw = res.data && res.data.data !== undefined ? res.data.data : res.data;
          list = Array.isArray(raw) ? raw : [];
        }
        setOptions(list);
        const ids = list.map((x) => String(x.id));
        if (header && ids.includes(String(header))) {
          setYearId(String(header));
        } else if (list.length) {
          setYearId(String(list[0].id));
        } else if (header) {
          setYearId(String(header));
        } else {
          setYearId("");
        }
      })
      .catch(() => {
        setOptions([]);
        setYearId(header || "");
      })
      .finally(() => setLoading(false));
  }, [shouldLoad]);

  const effectiveYear = (yearId && String(yearId)) || getAcademicYear() || "";

  return { options, yearId, setYearId, effectiveYear, loading };
}

export function ChatbotAcademicYearBar({ options, value, onChange, loading, disabled }) {
  return (
    <div className="chatbot-ay-bar" aria-busy={loading}>
      <label className="chatbot-ay-label" htmlFor="chatbot-academic-year-select">
        Academic year for answers
      </label>
      {loading && !options.length ? (
        <span className="chatbot-ay-loading">Loading years…</span>
      ) : options.length ? (
        <select
          id="chatbot-academic-year-select"
          className="chatbot-ay-select"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
        >
          {options.map((y) => (
            <option key={y.id} value={String(y.id)}>
              {y.name || `Year ${y.id}`}
            </option>
          ))}
        </select>
      ) : (
        <span className="chatbot-ay-fallback">
          {value ? `Using year #${value}` : "Choose an academic year in the app header, then reopen the assistant."}
        </span>
      )}
      <p className="chatbot-ay-hint">
        Pick another year here to ask about that session without changing the whole app header.
        To switch data everywhere, use the <strong>Academic year</strong> control in the top bar.
      </p>
    </div>
  );
}
