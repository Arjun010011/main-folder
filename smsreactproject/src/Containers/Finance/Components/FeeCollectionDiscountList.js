import React from "react";
import { Box, TextField, FormControlLabel, Switch } from "@material-ui/core";
import { numberWithCommas } from "Includes/functions";
import Snackbar from "@material-ui/core/Snackbar";
import { Alert } from "Includes/functions";
import DeleteOutlineIcon from "@material-ui/icons/DeleteOutline";
import {
  MuiPickersUtilsProvider,
  KeyboardDatePicker,
} from "@material-ui/pickers";
import DateFnsUtils from "@date-io/date-fns";
import { minDate, maxDate } from "Constants";
import { isFormDefinitionEnabled } from "Includes/CheckFormDefinition";
import commonMessages from "Constants/messages";
import { FormattedMessage } from "react-intl";
import {
  validateDate,
  isUserHasPermission,
  setManualReceiptEnabled,
  getManualReceiptEnabled,
} from "Includes/functions";
import { numberRegex } from "Constants/regularExpression";

export default function FeeCollectionDiscount(props) {
  const [body, setBody] = React.useState([]);
  const [fieldError, setFieldError] = React.useState({});
  const [alertData, setAlertData] = React.useState("");
  const [snackbar, setSnackbar] = React.useState(false);
  const [totalAmountPaid, setTotalAmountPaid] = React.useState(0);
  const [total_amount, set_total_amount] = React.useState("");
  const [totalAmountConcession, setTotalAmountConcession] = React.useState(0);
  const [receipt_details, set_reciept_details] = React.useState({
    receipt_date: new Date(),
    is_enabled: false,
  });

  const [enable_manual_receipt_num] = React.useState(
    isFormDefinitionEnabled(
      "fee_configurations",
      "enable_manual_receipt_num",
      1
    )
  );

  const [isAdditionalChargePlan, setIsAdditionalChargePlan] =
    React.useState(false);

  const handleCloseSnackBar = () => {
    setSnackbar(false);
  };

  const updateTotalValue = (e) => {
    let { value } = e.target;
    if (!numberRegex.value.test(value)) {
      return;
    }
    const { fee_group_plan, selectedGroup, is_fee_group_enabled, feeSummary } =
      props;
    let total_amount = feeSummary.total_pending_amount;
    if (is_fee_group_enabled) {
      total_amount =
        fee_group_plan[selectedGroup?.["fee_group"]]?.["group_pending"];
    }
    if (parseFloat(total_amount) < value) {
      setSnackbar(() => true);
      setAlertData(() => `Maximum Amount is ${total_amount}`);
      return;
    }
    set_total_amount(() => value);
    props.updateToParentFeePlan(value);
  };

  const handleManualChange = (e) => {
    let { value, name } = e.target;
    let receipt_details_temp = { ...receipt_details };
    receipt_details_temp[name] = value == "false";
    set_reciept_details({ ...receipt_details_temp });
    props.updateReceiptToParent(receipt_details_temp);
    setManualReceiptEnabled(receipt_details_temp[name]);
  };

  React.useEffect(() => {
    let tempList = props.discountList;
    let totalAmountTemp = parseFloat(props.totalAmountPaid);
    setBody(tempList);
    setTotalAmountConcession(props?.totalConcession ?? 0);
    if (
      props.totalAdditionalPay > 0 &&
      props.totalAmountPaid !== props.totalAdditionalPay
    ) {
      totalAmountTemp = props.totalAdditionalPay;
      setIsAdditionalChargePlan(true);
    } else {
      setIsAdditionalChargePlan(false);
    }
    setTotalAmountPaid(totalAmountTemp);
    set_total_amount(() => props.totalAmountPaid);
  }, [
    props.discountList,
    props.totalAmountPaid,
    props.selectedGroup,
    props.totalAdditionalPay,
    props.totalConcession,
  ]);

  React.useEffect(() => {
    if (
      (getManualReceiptEnabled() === "true" &&
        enable_manual_receipt_num &&
        isUserHasPermission("manual_receipt", "create")) ||
      isUserHasPermission("manual_receipt_date", "create")
    ) {
      let receipt_details_temp = { ...receipt_details };
      receipt_details_temp["is_enabled"] = true;
      set_reciept_details({ ...receipt_details_temp });
      props.updateReceiptToParent(receipt_details_temp);
    }
  }, []);

  let totalAmountConcessionTemp = totalAmountConcession;

  const getManualReceipt = () => {
    return (
      enable_manual_receipt_num &&
      receipt_details["is_enabled"] &&
      isUserHasPermission("manual_receipt", "create")
    );
  };

  const getManualReceiptDate = () => {
    return isUserHasPermission("manual_receipt_date", "create");
  };

  const handleReceiptNumber = (e) => {
    let fieldErrorTemp = { ...fieldError };
    delete fieldErrorTemp["receipt_date"];
    let { value, name } = e.target;
    let receipt_details_temp = { ...receipt_details };
    receipt_details_temp[name] = value;
    set_reciept_details({ ...receipt_details_temp });
    setFieldError({ ...fieldErrorTemp });
    props.updateReceiptToParent(receipt_details_temp);
  };

  const onChangeDate = (e) => {
    let fieldErrorTemp = { ...fieldError };
    delete fieldErrorTemp["receipt_date"];
    let receipt_details_temp = { ...receipt_details };
    receipt_details_temp["receipt_date"] = e;
    set_reciept_details({ ...receipt_details_temp });
    setFieldError({ ...fieldErrorTemp });
    props.updateReceiptToParent(receipt_details_temp);
  };

  const onBlurValidation = () => {
    let fieldErrorTemp = { ...fieldError };
    delete fieldErrorTemp["receipt_date"];
    if (receipt_details["receipt_date"] === null) {
      fieldErrorTemp["receipt_date"] = (
        <FormattedMessage {...commonMessages.fieldMandatoryError} />
      );
    } else {
      fieldErrorTemp["receipt_date"] = validateDate(
        receipt_details["receipt_date"],
        minDate,
        new Date()
      );
    }
    setFieldError({ ...fieldErrorTemp });
    if (!fieldErrorTemp["receipt_date"]) {
      props.updateReceiptToParent(receipt_details);
    }
  };

  return (
    <div>
      {body.length > 0 && (
        <table className="w-100">
          <thead>
            <tr className="thead-adjustment">
              <th>Disount </th>
              <th className="text-align-right">Amount</th>
              <th className="text-align-center">Action </th>
            </tr>
          </thead>
          <tbody>
            {!!body &&
              body.map((data, index) => {
                totalAmountConcessionTemp =
                  totalAmountConcessionTemp + parseFloat(data["amount"]);

                return (
                  <tr className="tbody-adjustment">
                    <td>{data?.["reason_id"]?.["name"] ?? data?.["name"]}</td>
                    <td className="text-align-right">{`${numberWithCommas(
                      data["amount"]
                    )}`}</td>
                    <td className="text-align-center">
                      <DeleteOutlineIcon
                        onClick={() => props.handleDeleteDiscount(index)}
                        className="text-red height-width-25px pointer"
                      />
                    </td>
                  </tr>
                );
              })}
            <tr className="tbody-adjustment row-text-bold">
              <td>Total</td>
              <td className="text-align-right">
                {numberWithCommas(totalAmountConcessionTemp)}
              </td>
              <td></td>
            </tr>
          </tbody>
        </table>
      )}
      {props.is_enabled_submit && (
        <>
          {enable_manual_receipt_num &&
            isUserHasPermission("manual_receipt", "create") && (
              <div className="text-align-end">
                <FormControlLabel
                  control={
                    <Switch
                      checked={receipt_details["is_enabled"]}
                      id={"receipt_is_enabled"}
                      name={"is_enabled"}
                      value={receipt_details["is_enabled"]}
                      color="primary"
                      onChange={(e) => handleManualChange(e)}
                    />
                  }
                  label={"Manual Receipt"}
                />
              </div>
            )}
          <table className="width-100">
            <thead>
              <tr className="thead-adjustment">
                <th>{`${
                  props.selectedGroup?.["fee_group_name"] ?? ""
                } Summary`}</th>
                <th className="text-align-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr className="tbody-adjustment row-text-bold">
                <td>Total Amount</td>
                <td className="text-align-right">
                  <TextField
                    autoComplete="off"
                    id={`rupees_id`}
                    value={total_amount}
                    onChange={(e) => updateTotalValue(e)}
                    name="amount_paid"
                    InputProps={{
                      borderBottom: "none",
                    }}
                    type="amount"
                    inputProps={{
                      maxLength: 9,
                      width: "100%",
                      style: { textAlign: "right", fontWeight: "bold" },
                    }}
                    error={
                      Boolean(fieldError["amount_paid_error"]) ? true : false
                    }
                    helperText={
                      Boolean(fieldError["amount_paid_error"]) ? (
                        <Box>{fieldError["amount_paid_error"]}</Box>
                      ) : (
                        ""
                      )
                    }
                    style={{ width: "100%" }}
                  />
                </td>
              </tr>
              {isAdditionalChargePlan && (
                <tr className="tbody-adjustment row-text-bold">
                  <td>Total Additional Amount</td>
                  <td className="text-align-right">
                    {numberWithCommas(totalAmountPaid - total_amount)}
                  </td>
                </tr>
              )}
              <tr className="tbody-adjustment row-text-bold">
                <td>Total Discount</td>
                <td className="text-align-right">{`(-) ${numberWithCommas(
                  totalAmountConcessionTemp
                )}`}</td>
              </tr>
              <tr className="tbody-adjustment row-text-bold">
                <td>Total Payable</td>
                <td className="text-align-right">
                  {numberWithCommas(
                    totalAmountPaid - totalAmountConcessionTemp
                  )}
                </td>
              </tr>
              {getManualReceipt() && (
                <tr className="tbody-adjustment row-text-bold">
                  <td>Receipt Number</td>
                  <td className="text-align-right">
                    <TextField
                      autoComplete="off"
                      id={`rupees_id`}
                      value={receipt_details["receipt_num"]}
                      onChange={(e) => handleReceiptNumber(e)}
                      name="receipt_num"
                      InputProps={{
                        borderBottom: "none",
                      }}
                      inputProps={{
                        maxLength: 25,
                        width: "100%",
                        style: { textAlign: "right", fontWeight: "bold" },
                      }}
                      error={Boolean(fieldError["receipt_num"]) ? true : false}
                      helperText={
                        Boolean(fieldError["receipt_num"]) ? (
                          <Box>{fieldError["receipt_num"]}</Box>
                        ) : (
                          ""
                        )
                      }
                      style={{ width: "100%" }}
                    />
                  </td>
                </tr>
              )}
              {getManualReceiptDate() && (
                <tr className="tbody-adjustment row-text-bold">
                  <td>Receipt Date</td>
                  <td className="text-align-right">
                    <MuiPickersUtilsProvider utils={DateFnsUtils}>
                      <KeyboardDatePicker
                      autoOk
                        variant="inline"
                        autoComplete="off"
                        inputVariant="standard"
                        fullWidth
                        name="receipt_date"
                        minDate={minDate}
                        maxDate={new Date()}
                        onBlur={(e) => onBlurValidation(e)}
                        format="dd-MM-yyyy"
                        value={receipt_details.receipt_date}
                        onChange={(e) => onChangeDate(e)}
                        KeyboardButtonProps={{
                          "aria-label": "change date",
                        }}
                        helperText={
                          !fieldError["receipt_date"]
                            ? "Format DD-MM-YYYY"
                            : fieldError["receipt_date"]
                        }
                        error={
                          fieldError["receipt_date"] &&
                          (fieldError["receipt_date"] ? true : false)
                        }
                        inputProps={{
                          width: "100%",
                          style: { textAlign: "right", fontWeight: "bold" },
                        }}
                        FormHelperTextProps={{
                          style: { textAlign: "right", fontWeight: "bold" },
                        }}
                      />
                    </MuiPickersUtilsProvider>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </>
      )}
      <Snackbar
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        open={snackbar}
        autoHideDuration={10000}
        onClose={handleCloseSnackBar}
      >
        <Alert onClose={handleCloseSnackBar} severity="error">
          {alertData}
        </Alert>
      </Snackbar>
    </div>
  );
}
