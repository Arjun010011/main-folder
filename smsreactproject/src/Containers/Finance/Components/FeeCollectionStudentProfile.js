import React from "react";
import {
  numberWithCommas,
  numberWithCommasWithoutSymbol,
} from "Includes/functions";
import { Box, Button, Tooltip, Avatar, IconButton } from "@material-ui/core";
import InfoOutlinedIcon from "@material-ui/icons/InfoOutlined";
import { FormattedMessage } from "react-intl";
import messages from "../messages";
import commonMessages from "Constants/messages";

export default function FeeCollectionStudentProfilefrom(props) {
  const { studentData, feeSummary } = props;

  const showConcessionCalculation = () => {
    return (
      <table>
        <tr>
          <td>
            <FormattedMessage {...commonMessages.totalAmount} />
          </td>
          <td>{numberWithCommasWithoutSymbol(feeSummary.total_amount)}</td>
        </tr>
        {feeSummary.total_concession_amount > 0 && (
          <tr>
            <td>
              <FormattedMessage {...messages.concessionAmount} />
            </td>
            <td>
              -
              {numberWithCommasWithoutSymbol(
                feeSummary.total_concession_amount
              )}
            </td>
          </tr>
        )}
        {feeSummary.total_adjusted_amount > 0 && (
          <tr>
            <td>
              <FormattedMessage {...messages.adjustedAmount} />
            </td>
            <td>
              -{numberWithCommasWithoutSymbol(feeSummary.total_adjusted_amount)}
            </td>
          </tr>
        )}
        <tr>
          <td>
            <hr />
            <FormattedMessage {...messages.totalPayable} />
          </td>
          <td>
            <hr />
            <div className="text-align-right">
              {numberWithCommasWithoutSymbol(feeSummary.amount)}
            </div>
          </td>
        </tr>
      </table>
    );
  };

  return (
    <div className="student-profile-card">
      <div className="fee-collection-profile">
        <div>
          {studentData.profile_pic_details ? (
            <Avatar
              variant="square"
              alt="Profile Pic"
              src={studentData.profile_pic_details.file}
              className="fee-collection-avatar"
            ></Avatar>
          ) : (
            <Avatar
              variant="square"
              alt="Profile Pic"
              className="fee-collection-avatar"
            >
              {studentData.name.charAt(0)}
            </Avatar>
          )}
        </div>
        <div>
          <div className="student-name-summary">
            {studentData.first_name} {studentData.middle_name}{" "}
            {studentData.last_name}
          </div>
          <div>
            {`${studentData.year_name} - ${studentData.standard} - ${
              studentData?.is_new_student ? "New Student" : "Old Student"
            }`}
          </div>
        </div>
      </div>
      <div className="display-flex align-items-center justify-content-space-around flex-grow-1 flex-wrap">
        <div>
          <div className="total-fees-summary margin-right-20 position-relative">
            <FormattedMessage {...messages.viewFeeTermTotalAmount} />:
            {(feeSummary.total_concession_amount > 0 ||
              feeSummary.total_adjusted_amount > 0) && (
              <Tooltip
                title={showConcessionCalculation()}
                enterDelay={400}
                enterNextDelay={400}
                placement="top-start"
                arrow
              >
                <InfoOutlinedIcon
                  style={{
                    position: "absolute",
                    top: "0px",
                    cursor: "pointer",
                  }}
                />
              </Tooltip>
            )}
          </div>
          <div>{numberWithCommas(feeSummary.total_amount, 0)}</div>
        </div>
        {(feeSummary.total_concession_amount > 0 ||
          feeSummary.total_adjusted_amount > 0) && (
          <div>
            <div className="pending-fees-summary">Discount Amount:</div>
            <div>
              {numberWithCommas(
                feeSummary.total_adjusted_amount +
                  feeSummary.total_concession_amount,
                0
              )}
            </div>
          </div>
        )}
        {parseFloat(feeSummary.total_fine_amount) > 0 && (
          <div>
            <div className="pending-fees-summary">Fine Amount:</div>
            <div>{numberWithCommas(feeSummary.total_fine_amount, 0)}</div>
          </div>
        )}
        <div>
          <div className="pending-fees-summary">
            <FormattedMessage {...messages.paidAmount} />:
          </div>
          <div>{numberWithCommas(feeSummary.total_paid_amount, 0)}</div>
        </div>
        <div>
          <div className="pending-fees-summary">
            <FormattedMessage {...messages.pendingAmount} />:
          </div>
          <div>{numberWithCommas(feeSummary.total_pending_amount, 0)}</div>
        </div>
      </div>
    </div>
  );
}
