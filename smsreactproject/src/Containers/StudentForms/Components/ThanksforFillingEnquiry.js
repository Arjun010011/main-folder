import React from 'react';
import PropTypes from 'prop-types';
import "./../styles.scss";

const CheckCircleIcon = ({ size = 64, className = "" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
    <polyline points="22 4 12 14.01 9 11.01"></polyline>
  </svg>
);

const ArrowRightIcon = ({ size = 20, className = "" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <line x1="5" y1="12" x2="19" y2="12"></line>
    <polyline points="12 5 19 12 12 19"></polyline>
  </svg>
);

const ApplicationThankYou = ({
  applicantName,
  applicationID,
  customMessage,
  nextStepsMessage,
  actionButtonText,
  onActionButtonClick,
  icon,
}) => {
  const SuccessIcon = icon || <CheckCircleIcon className="success-icon" />;

  return (
    <div className="thankyou-container">
      <div className="thankyou-card">
        <div className="thankyou-icon">{SuccessIcon}</div>

        <h1 className="thankyou-heading">
          Thank You{applicantName ? `, ${applicantName}` : ''}!
        </h1>

        <p className="thankyou-subheading">
          Your application has been successfully submitted.
        </p>

        {applicationID && (
          <div className="thankyou-app-id">
            <p className="app-id-label">Application Reference ID:</p>
            <p className="app-id-value">{applicationID}</p>
          </div>
        )}

        {customMessage && (
          <p className="thankyou-message">{customMessage}</p>
        )}

        {nextStepsMessage && (
          <div className="thankyou-nextsteps">
            <h2 className="nextsteps-heading">What's Next?</h2>
            <p className="nextsteps-message">{nextStepsMessage}</p>
          </div>
        )}

        {actionButtonText && onActionButtonClick && (
          <button className="thankyou-button" onClick={onActionButtonClick}>
            {actionButtonText}
            <span className="arrow-icon"><ArrowRightIcon /></span>
          </button>
        )}

        <p className="thankyou-footer">
          We appreciate your time and effort. You'll hear from us soon.
        </p>
      </div>
      <p className="thankyou-credit">
        Powered by Good Vibes & React
      </p>
    </div>
  );
};

ApplicationThankYou.propTypes = {
  applicantName: PropTypes.string,
  applicationID: PropTypes.string,
  customMessage: PropTypes.string,
  nextStepsMessage: PropTypes.string,
  actionButtonText: PropTypes.string,
  onActionButtonClick: PropTypes.func,
  icon: PropTypes.node,
};

export default ApplicationThankYou;
