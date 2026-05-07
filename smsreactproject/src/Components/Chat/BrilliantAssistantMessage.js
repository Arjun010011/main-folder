import React from "react";
import PropTypes from "prop-types";
import "./BrilliantAssistantMessage.scss";

/**
 * Renders assistant text with simple **bold** / line breaks and optional structured UI (exam picker).
 */
function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function assistantTextToHtml(text) {
  if (!text) return "";
  let h = escapeHtml(text);
  h = h.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  h = h.replace(/\n/g, "<br />");
  return h;
}

const BrilliantAssistantMessage = ({
  text,
  structured,
  resumeQuery,
  disabled,
  onSelectExam,
}) => {
  const showExamPick =
    structured &&
    structured.type === "exam_choice" &&
    Array.isArray(structured.options) &&
    structured.options.length > 0;

  return (
    <div className="brilliant-assistant-message">
      <div
        className="brilliant-assistant-message__text"
        dangerouslySetInnerHTML={{ __html: assistantTextToHtml(text) }}
      />
      {showExamPick && (
        <div className="brilliant-assistant-message__exam-picks" role="group" aria-label="Choose exam">
          {structured.options.map((opt) => (
            <button
              key={opt.exam_id}
              type="button"
              className="brilliant-assistant-message__exam-chip"
              disabled={disabled}
              onClick={() =>
                onSelectExam({
                  examId: opt.exam_id,
                  resumeQuery: resumeQuery || structured.followup_context?.original_query || "",
                })
              }
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

BrilliantAssistantMessage.propTypes = {
  text: PropTypes.string,
  structured: PropTypes.object,
  resumeQuery: PropTypes.string,
  disabled: PropTypes.bool,
  onSelectExam: PropTypes.func.isRequired,
};

BrilliantAssistantMessage.defaultProps = {
  text: "",
  structured: null,
  resumeQuery: "",
  disabled: false,
};

export default BrilliantAssistantMessage;
