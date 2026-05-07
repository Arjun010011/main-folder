/* eslint-disable react/jsx-key */
import React, { useEffect } from "react";
import { makeStyles } from "@material-ui/core/styles";
import Accordion from "@material-ui/core/Accordion";
import AccordionSummary from "@material-ui/core/AccordionSummary";
import ExpandMoreIcon from "@material-ui/icons/ExpandMore";
import { Box, Grid, Divider, Tooltip, IconButton } from "@material-ui/core";
import Checkbox from "@material-ui/core/Checkbox";
import TextField from "@material-ui/core/TextField";
import NumberFormat from "react-number-format";
import _ from "lodash";
import CheckCircleOutlinedIcon from "@material-ui/icons/CheckCircleOutlined";
import WarningIcon from "@material-ui/icons/Warning";
import {
  numberWithCommas,
  numberWithCommasWithoutSymbol,
  isUserHasPermission,
} from "Includes/functions";
import { Actions } from "Constants/permissions";
import InfoIcon from "@material-ui/icons/Info";
import PaymentIcon from "@material-ui/icons/Payment";
import { FormattedMessage } from "react-intl";
import messages from "./../messages";
import commonMessages from "Constants/messages";
import { Dropdown } from "Components/DropDown";
import ToggleButton from "@material-ui/lab/ToggleButton";
import ToggleButtonGroup from "@material-ui/lab/ToggleButtonGroup";

const fee_config = JSON.parse(localStorage.getItem("fee_configurations"))
  ? JSON.parse(localStorage.getItem("fee_configurations"))
  : {};
const isEnabledSequence = fee_config?.["hide_fee_term_sequence"]
  ? fee_config?.["hide_fee_term_sequence"] == 1
    ? false
    : true
  : true;

const useStyles = makeStyles({
  expanded: {
    "&$expanded": {
      margin: "0px 0",
      height: "0px",
      backgroundColor: "#f8f8ff",
      borderBottom: "1px solid rgba(0,0,0,.125)",
    },
    minHeight: "60px",
  },
  root: {
    boxShadow: "0px 0px 4px rgba(0, 0, 0, 0.15)",
    marginBottom: "20px",
  },
});
function NumberFormatCustom(props) {
  const { inputRef, onChange, ...other } = props;

  return (
    <NumberFormat
      {...other}
      thousandsGroupStyle="lakh"
      thousandSeparator={true}
      getInputRef={inputRef}
      onValueChange={(values) => {
        onChange({
          target: {
            name: props.name,
            value: values.value,
          },
        });
      }}
      isNumericString
      prefix="₹ "
    />
  );
}

export default function FeeCollectionStudentProfilefrom(props) {
  const {
    feePlan,
    adjustmentEnabled,
    getAdjustmentTotalAmount,
    getAdjustmentPendingAmount,
    fee_group_plan,
    isAddPermission,
    sequenceNeedToPay,
    updateTermAmount,
    showPaidAmount,
    updateValue,
    updateAdjustmentValue,
    changeToggle,
    getPendingAmount,
    getLabel,
    handleExpand,
    expanded,
    sequenceMap,
    selectedGroup,
    updateToParentFeePlan,
  } = props;

  const classes = useStyles();

  const showAdjustmentAmount = (feetermData) => {
    return (
      <table>
        {feetermData.adjustment_list.map((data) => {
          return (
            <tr>
              <td>{`${numberWithCommasWithoutSymbol(data.amount)} - ${
                data.reason_id__name
              }`}</td>
            </tr>
          );
        })}
      </table>
    );
  };

  return (
    <div>
      {Object.keys(fee_group_plan).map((data, findex) => {
        if (
          selectedGroup?.fee_group === "all" ||
          selectedGroup?.fee_group == data
        ) {
          return (
            <div className={classes.root}>
              <Accordion
                key={findex}
                expanded={expanded[data]}
                onChange={() => handleExpand(data)}
              >
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon />}
                  aria-label="Expand"
                  aria-controls="additional-actions1-content"
                  id="additional-actions1-header"
                  className={classes.expanded}
                  style={adjustmentEnabled ? {} : {}}
                >
                  <div className="feecollection-feetype-heading align-items-center display-flex">
                    <div className="d-flex">
                      {fee_group_plan[data].group_pending !== 0 && (
                        <div>
                          <Checkbox
                            id={`${data.terms}_${findex}`}
                            onClick={(e) => e.stopPropagation()}
                            className="pt-0 pb-0 pl-0"
                            color="primary"
                            checked={fee_group_plan[data].is_checked}
                            value={fee_group_plan[data].is_checked}
                            inputProps={{ "aria-label": "secondary checkbox" }}
                            onChange={(e) =>
                              updateTermAmount(
                                "group",
                                data,
                                null,
                                fee_group_plan[data].is_checked
                              )
                            }
                          />
                        </div>
                      )}
                      <Box>{fee_group_plan[data].fee_group_name}</Box>
                    </div>
                    {/* <div className="ml-5">
                                        {
                                            `: ${numberWithCommas(fee_group_plan[data].group_total)}`
                                        }
                                    </div> */}
                    {/* { */}
                    {/* (data.reason) ? <span><WarningIcon style={{ color: '#f6c342' }} /></span> : '' */}
                    {/* } */}
                  </div>
                  <Box ml="auto" className="group-feetype-heading d-flex ">
                    {/* <div className="ml-5"> */}
                    {/* {`Total : ${numberWithCommas(fee_group_plan[data].group_total)}`} */}
                    {/* </div> */}
                    <div className="ml-50 text-align-center">
                      <div>Total</div>
                      <div>{`${numberWithCommas(
                        fee_group_plan[data].group_total
                      )}`}</div>
                    </div>
                    <div className="ml-50 text-align-center">
                      <div>Discount</div>
                      <div>{`${numberWithCommas(
                        fee_group_plan[data].total_discount
                      )}`}</div>
                    </div>
                    <div className="ml-50 text-green text-align-center">
                      <div>Paid</div>
                      <div>{`${numberWithCommas(
                        fee_group_plan[data].group_paid
                      )}`}</div>
                    </div>
                    <div className="ml-50 text-red text-align-center">
                      <div>Pending</div>
                      <div>{`${numberWithCommas(
                        fee_group_plan[data].group_pending
                      )}`}</div>
                    </div>

                    {/* <div className="ml-5 text-red">
                                        {
                                            `Pending : ${numberWithCommas(fee_group_plan[data].group_pending)}`
                                        }
                                    </div> */}
                  </Box>
                  <Divider />
                </AccordionSummary>
                <Grid className="d-flex flex-wrap">
                  {data["reason"] ? (
                    <Grid
                      item
                      xl={12}
                      className="margin-bottom-20 pb-5 margin-left-auto margin-right-auto"
                    >
                      <Box
                        display="flex"
                        className="warning-message padding-left-20 padding-right-20"
                        mb={2}
                        mt={2}
                      >
                        {data["reason"]}
                      </Box>
                    </Grid>
                  ) : (
                    <table className="quick-pay-table">
                      <thead>
                        <tr className="fs-14 quick-pay-thead font-weight-bold">
                          <td>
                            <FormattedMessage
                              {...messages.viewFeeTermFeeType}
                            />
                          </td>
                          <td className="text-align-right">
                            <FormattedMessage
                              {...messages.viewFeeTermTotalAmount}
                            />
                          </td>
                          <td className="text-align-right">Discount Amount</td>
                          <td className="text-align-right">
                            <FormattedMessage {...messages.paidAmount} />
                          </td>
                          {/* <td className='text-align-right'><FormattedMessage {...messages.concessionAmount} /></td>
                                                    <td className='text-align-right'><FormattedMessage {...messages.adjustedAmount} /></td> */}
                          <td className="text-align-right">
                            <FormattedMessage {...messages.totalPayable} />
                          </td>
                        </tr>
                      </thead>
                      <tbody>
                        {feePlan.map((feeData, findex) => {
                          return (
                            <>
                              {feeData.fee_group == data &&
                                feeData.standard_fee.map(
                                  (feetermData, index) => {
                                    let is_amount_checked =
                                      feetermData.is_checked;
                                    let selectedClassName = is_amount_checked
                                      ? "selected-checkbox rounded-box display-flex"
                                      : "rounded-box display-flex";
                                    let isAmountDisabled =
                                      isUserHasPermission(
                                        "fee_collection_editable",
                                        "create"
                                      ) &&
                                      is_amount_checked &&
                                      !adjustmentEnabled
                                        ? false
                                        : true;
                                    let isAdjustmentDisabled =
                                      adjustmentEnabled && is_amount_checked
                                        ? false
                                        : true;
                                    let isNotOpted = feetermData["is_disabled"];
                                    let isAdjustmentAmount = Boolean(
                                      feetermData["adjustment_amount"]
                                    )
                                      ? true
                                      : false;
                                    let hideCheckbox = false;
                                    let seq =
                                      sequenceMap?.[
                                        sequenceMap?.[feetermData.sequence]?.[
                                          "depends"
                                        ]
                                      ];
                                    let seq_term_name =
                                      feePlan[seq?.["fee_type"]]?.["name"];
                                    let seq_fee_type_name =
                                      feePlan[seq?.["fee_type"]]?.[
                                        "standard_fee"
                                      ][seq.term]?.["fee_type_name"];
                                    return (
                                      <tr>
                                        <td>
                                          <div className="d-flex">
                                            {fee_group_plan[data]
                                              .group_pending !== 0 && (
                                              <div>
                                                <Checkbox
                                                  id={`${feetermData.terms}_${findex}_${index}`}
                                                  className="pt-0 pb-0 pl-0 p-l-5px"
                                                  color="primary"
                                                  checked={is_amount_checked}
                                                  value={is_amount_checked}
                                                  disabled={
                                                    feetermData[
                                                      "pending_amount"
                                                    ] === 0
                                                  }
                                                  inputProps={{
                                                    "aria-label":
                                                      "secondary checkbox",
                                                  }}
                                                  onChange={(e) =>
                                                    updateTermAmount(
                                                      e,
                                                      findex,
                                                      index,
                                                      is_amount_checked
                                                    )
                                                  }
                                                />
                                              </div>
                                            )}
                                            <Box>
                                              {feeData.standard_fee.length > 1
                                                ? `${
                                                    feeData["fee_type_name"]
                                                  } (${
                                                    feetermData?.[
                                                      "term_alias"
                                                    ] ?? feetermData["terms"]
                                                  })`
                                                : feeData["fee_type_name"]}
                                            </Box>
                                          </div>
                                        </td>
                                        <td className="text-align-right">
                                          {feetermData.is_amount
                                            ? numberWithCommas(
                                                feetermData.total_amount
                                              )
                                            : numberWithCommas(
                                                feetermData.rate_amount
                                              )}
                                        </td>
                                        <td className="text-align-right pointer d-flex align-items-center justify-content-right">
                                          {numberWithCommas(
                                            feetermData.adjustment_amount
                                          )}
                                          {feetermData.adjustment_list &&
                                            feetermData.adjustment_list.length >
                                              0 && (
                                              <Tooltip
                                                title={showAdjustmentAmount(
                                                  feetermData
                                                )}
                                                enterDelay={400}
                                                enterNextDelay={400}
                                                placement="top-start"
                                                // className="text-info"
                                                arrow
                                                classes={{
                                                  tooltip:
                                                    "tooltip-show-data-discount",
                                                }}
                                              >
                                                <InfoIcon />
                                              </Tooltip>
                                            )}
                                        </td>
                                        <td className="text-align-right">
                                          <div className="term-paid-amount d-flex ">
                                            <div className="align-items-center display-flex pointer">
                                              {"total_fine_paid_amount" in
                                                feetermData &&
                                                feetermData[
                                                  "total_fine_paid_amount"
                                                ] > 0 && (
                                                  <Tooltip
                                                    title={showPaidAmount(
                                                      feetermData
                                                    )}
                                                    enterDelay={400}
                                                    enterNextDelay={400}
                                                    placement="top-start"
                                                    className="text-info"
                                                    arrow
                                                  >
                                                    <InfoIcon />
                                                  </Tooltip>
                                                )}
                                            </div>
                                            <div className="margin-left-auto">
                                              {numberWithCommas(
                                                feetermData.paid_amount
                                              )}
                                            </div>
                                          </div>
                                        </td>

                                        {/* <td className='text-align-right'>
                                                                            {feetermData?.is_addition ?
                                                                                numberWithCommas(feetermData.adjustment_amount)
                                                                                :
                                                                                numberWithCommas(-feetermData.adjustment_amount)
                                                                            }
                                                                        </td> */}
                                        <td className="text-align-right">
                                          {feetermData["pending_amount"] ? (
                                            <TextField
                                              id={`${findex}_${index}_rupees_id`}
                                              value={feetermData["amount_paid"]}
                                              onChange={(e) =>
                                                updateValue(e, findex, index)
                                              }
                                              name="amount_paid"
                                              disabled={isAmountDisabled}
                                              InputProps={{
                                                inputComponent:
                                                  NumberFormatCustom,
                                                borderBottom: "none",
                                              }}
                                              inputProps={{
                                                maxLength: 15,
                                                width: "100%",
                                                style: { textAlign: "right" },
                                              }}
                                              error={
                                                Boolean(
                                                  feetermData[
                                                    "amount_paid_error"
                                                  ]
                                                )
                                                  ? true
                                                  : false
                                              }
                                              helperText={
                                                Boolean(
                                                  feetermData[
                                                    "amount_paid_error"
                                                  ]
                                                ) ? (
                                                  <Box>
                                                    {
                                                      feetermData[
                                                        "amount_paid_error"
                                                      ]
                                                    }
                                                  </Box>
                                                ) : (
                                                  ""
                                                )
                                              }
                                              style={{ width: "100%" }}
                                            />
                                          ) : (
                                            <Box className="amount-paid-collected">
                                              Amount Paid
                                            </Box>
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  }
                                )}
                            </>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </Grid>
              </Accordion>
            </div>
          );
        }
      })}
    </div>
  );
}
