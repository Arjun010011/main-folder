import React from "react";
import Dialog from "@material-ui/core/Dialog";
import Grid from "@material-ui/core/Grid";
import DialogContent from "@material-ui/core/DialogContent";
import IconButton from "@material-ui/core/IconButton";
import CloseIcon from "@material-ui/icons/Close";
import { withStyles } from "@material-ui/core/styles";
import {
  Divider,
  CircularProgress,
  MenuItem,
  Checkbox,
  ListItemText,
  Tooltip,
} from "@material-ui/core";
import FormControl from "@material-ui/core/FormControl";
import RadioGroup from "@material-ui/core/RadioGroup";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import Radio from "@material-ui/core/Radio";
import Skeleton from "@material-ui/lab/Skeleton";
import Typography from "@material-ui/core/Typography";
import { Box, Button, TextField } from "@material-ui/core";
import { numberWithCommas } from "Includes/functions";
import { isFormDefinitionEnabled } from "Includes/CheckFormDefinition";
import { DropDownWithSearch } from "Components/DropDownWithSearch";
import AddCircleOutlineOutlinedIcon from "@material-ui/icons/AddCircleOutlineOutlined";
import DeleteOutlineIcon from "@material-ui/icons/DeleteOutline";
import { getRequest } from "Includes/api/apicall";
import { GET_URL, POST_URL } from "Includes/urls";
import { DropDownWithSearchAndAddApi } from "Components/DropDownWithSearchAndAddApi";

//Redux
import { createStructuredSelector } from "reselect";
import { connect } from "react-redux";
import { bindActionCreators } from "redux";
import { makeModeOfPaymentList } from "Components/CommonComponent/selectors";
import { setModeOfPaymentList } from "Components/CommonComponent/actions";

import {
  nameRegex,
  nameAndNumberRegex,
  numberRegex,
} from "Constants/regularExpression";
import { BUTTONCOLOR } from "../actions/constants";
import "./styles.scss";
import { withRouter } from "react-router-dom/cjs/react-router-dom.min";
const denominations = [10, 20, 50, 100, 200, 500, 2000];

const styles = (theme) => ({
  root: {
    padding: `${theme.spacing.unit * 6}px ${theme.spacing.unit * 3}px 0`,
  },
  closeButton: {
    position: "absolute",
    right: theme.spacing.unit / 2,
    top: theme.spacing.unit / 2,
    color: theme.palette.grey[500],
  },
  rightPartGrid: {
    background: "#f1f3ff",
  },
  amountDetails: {
    fontSize: "20px",
    display: "flex",
    margin: "10px 5px",
  },
  blueText: {
    color: "#4680FF",
  },
  paymentModeHead: {
    fontFamily: "Roboto",
    fontStyle: "normal",
    fontWeight: "500",
    fontSize: "20px",
    lineHeight: "20px",
    letterSpacing: "-0.05px",
    marginTop: "10px",
  },
  paymentInput: {
    margin: "10px 0",
  },
  payNow: {
    fontWeight: "bold",
    borderRadius: "30px",
    padding: "8px 25px",
    color: "white",
    margin: "auto",
    display: "block",
    background: BUTTONCOLOR,
    "&:hover": {
      background: BUTTONCOLOR,
    },
  },
});

const fieldDetails = [
  {
    label: "Reason Name",
    regex: nameAndNumberRegex,
    autoFocus: false,
    name: "name",
    md: 12,
    className: "w-100",
    required: true,
    id: "outlined-textarea",
    default: "",
    rows: null,
    type: "text",
    maxLength: 50,
    gridClassName: "margin-vertical-20",
  },
];

class PaymentModalNew extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      open: true,
      reasonList: [],
      bankList: [],
       savedBankList: [],
      selectedReason: "",
      fieldValues: {
        amountToPay: 0,
        payeeName: props.payeeName
        ? props.payeeName
        : props.amountDetails?.student
          ? props.amountDetails.student
          : "",
        payment_ref_num: "",
        paymentNote: "",
        isSelectSamePage: this.props.isSelectSamePage,
        selectedReason: "",
        selectedOption: "",
        remainingAmount: 0,
      },
      error: { payeeName: "", payment_ref_num: "" },
      mode_of_payment_list: [],
      errorText: "",
      is_mode_of_pay_multiple: isFormDefinitionEnabled(
        "fee_configurations",
        "is_mode_of_pay_multiple",
        1
      ),
      is_denomination_enabled: isFormDefinitionEnabled(
        "fee_configurations",
        "is_cash_denomination_enabled",
        1
      ),
      show_bank_name_in_payment_details: isFormDefinitionEnabled(
        "fee_configurations",
        "show_bank_name_in_payment_details",
        1
      ),
      loadingList: false,
      is_skip_enabled: false,
      isAmountEdited: false,
      loadingOptions: false,
    };
    this.paymentModesNew = [];
    this.data_new = [
      { name: "Cash", refRequired: false, alias: "Cash" },
      { name: "PhonePe", alias: "Phone Pe", refRequired: true },
      { name: "Gpay", alias: "Google Pay", refRequired: true },
      { name: "NetBanking", refRequired: true, alias: "Net Banking" },
      { name: "UPIPayments", refRequired: true, alias: "UPI Payments" },
      { name: "Cheque", refRequired: true, alias: "Cheque" },
      { name: "Online", refRequired: true, alias: "Online" },
      { name: "Debit", refRequired: true, alias: "Debit Card" },
      { name: "Credit", refRequired: true, alias: "Credit Card" },
      {
        name: "Loan",
        alias: "Loan",
        refRequired: true,
        mandatory_fields: ["from_bank", "to_bank", "transfer_date", "utr_no"],
      },
    ];
  }

  componentDidMount = () => {
    this.getModeOfPaymentList();
    this.getBankList();
    this.getSavedBankList();
    if (this.props.isReasonOnEdit) {
      this.getReasonList();
    }
    let { fieldValues, is_mode_of_pay_multiple } = this.state;
    if (this.props.hide_is_mode_of_pay_multiple) { //this is implemented for library when we dont want to accept multiple mode of payment
      is_mode_of_pay_multiple = false
    }
    let totalAmount = this.props.totalAdditionalPay
      ? this.props.totalAdditionalPay
      : this.props.amountDetails.amount;
    fieldValues["amountToPay"] = totalAmount;
    this.setState({
      totalAmount,
      fieldValues,
      is_mode_of_pay_multiple
    });
  };

  getReasonList = () => {
    const url = GET_URL.reason.api;
    const params = {
      is_active: true,
      reason_type: "library_issue_return_reason",
    };
    getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        this.setState({
          reasonList: response.data.data,
          loading: false,
        });
      }
    });
  };

getBankList = () => {
  const url = GET_URL.templatemappingfilterdatasfinance.api;
  const params = {
    module: "bank_certificate",
    is_active: true,
  };

  getRequest(url, params, this.props)
    .then((response) => {
      let data = [];
      if (
        response &&
        response.status === 200 &&
        response.data &&
        response.data.data &&
        Array.isArray(response.data.data.bank_names)
      ) {
        data = response.data.data.bank_names.map((item) => ({
          name: item.name,  // backend identifier (e.g. state_bank_of_india)
          label: item.label || item.name, // user display text (e.g. State Bank of India)
        }));
      }
      this.setState({ bankList: data });
    })
    .catch((err) => {
      this.setState({ bankList: [] });
    });
};



  getModeOfPaymentList = () => {
    let { mode_of_payment_list } = this.state;
    let storedModeOfPaymentList = this.props.getModeOfPayments;
    if (!storedModeOfPaymentList) {
      this.setState({ loadingList: true });
      const params = { allowed_app_types: "staff_web" };
      getRequest(GET_URL.modeofpayment.api, params, this.props).then(
        (response) => {
          if (response && response.status === 200) {
            this.paymentModesNew = response.data.data;
            this.props.setModeOfPaymentList(this.paymentModesNew);
            let totalAmount = this.props.totalAdditionalPay
              ? this.props.totalAdditionalPay
              : this.props.amountDetails.amount;
            let cash_value = {};
            if (
              isFormDefinitionEnabled(
                "fee_configurations",
                "is_payment_mode_auto_select",
                "Cash"
              )
            ) {
              this.paymentModesNew.map((data) => {
                if (data.name === "Cash") {
                  cash_value = data;
                }
              });
            }
            mode_of_payment_list.push({
              paymentValue: cash_value,
              amount: totalAmount,
              payment_ref_num: "",
            });
          }
          this.setState({ loadingList: false });
        }
      );
    } else {
      this.paymentModesNew = storedModeOfPaymentList;
      let totalAmount = this.props.totalAdditionalPay
        ? this.props.totalAdditionalPay
        : this.props.amountDetails.amount;
      let cash_value = {};
      if (
        isFormDefinitionEnabled(
          "fee_configurations",
          "is_payment_mode_auto_select",
          "Cash"
        )
      ) {
        this.paymentModesNew.map((data) => {
          if (data.name === "Cash") {
            cash_value = data;
          }
        });
      }
      mode_of_payment_list.push({
        paymentValue: cash_value,
        amount: totalAmount,
        payment_ref_num: "",
      });
    }
    this.setState({
      mode_of_payment_list,
    });
  };

  handleClose = () => {
    this.props.closeFeePaymentModal();
  };

  onChangeFeeDetails = (e, field) => {
    const { value } = e.target;
    let { error, isAmountEdited } = this.state;
    let { amountDetails, isAmountCanEdit } = this.props;
    let fieldValues = { ...this.state.fieldValues };
    if (field === "amountToPay" && isAmountCanEdit) {
      if (!numberRegex.value.test(value)) {
        return;
      } else if (amountDetails.amount < value) {
        error["amountToPay"] = `Should not exceed ${amountDetails.amount}`;
        this.setState({ error });
        return;
      }
      fieldValues["remainingAmount"] = amountDetails.amount - parseFloat(value);
      if (amountDetails.amount != value) {
        if (fieldValues["selectedOption"] == "") {
          fieldValues["selectedOption"] = "skip"
        }
        isAmountEdited = true;
      } else {
        isAmountEdited = false;
        fieldValues["selectedOption"] = "";
      }
    }
    fieldValues[field] = value;
    if (field === "payeeName" && !nameRegex.value.test(value)) {
      error["payeeName"] = nameRegex.errorText;
    } else if (field === "paymentNote") {
      error["paymentNote"] = nameRegex.errorText;
    } else if (
      field === "payment_ref_num" &&
      !nameAndNumberRegex.value.test(value)
    ) {
      error["payment_ref_num"] = nameRegex.errorText;
    }
    delete error[field];
    this.setState({ fieldValues, error, isAmountEdited });
  };

  // handleChange = (event) => {
  //   let { error } = this.state;
  //   const { value } = event.target;
  //   let fieldValues = { ...this.state.fieldValues };
  //   fieldValues["paymentValue"] = value;
  //   delete error["paymentValue"];
  //   this.setState({ fieldValues, error });
  // };

  validateFieldValues = (status) => {
      let { error, mode_of_payment_list, isAmountEdited, fieldValues } = this.state;
      let errorTextTemp = "";
      let { amountDetails, isReasonOnEdit, isReasonOnSkip } = this.props;
      let validation = true;
      let mode_of_pay_temp = {};
      let total_temp_amount = 0;

      mode_of_payment_list.map((data, index) => {
        // === Amount Validation ===
        if (!data.amount) {
          validation = false;
          error[`amount${index}`] = "Mandatory";
        }

        // === Payment Mode Validation ===
        if (!data.paymentValue) {
          validation = false;
          error[`paymentValue${index}`] = "Select Payment Mode";
        } else if (
          data.paymentValue?.mandatory_fields?.includes("payment_ref_num") &&
          !data.payment_ref_num
        ) {
          validation = false;
          error[`payment_ref_num${index}`] = "Enter Ref No.";
        }

        // === Duplicate Payment Prevention ===
        if (
          data.paymentValue &&
          Object.keys(mode_of_pay_temp).includes(data?.paymentValue?.name)
        ) {
          validation = false;
          error[`paymentValue${index}`] = "Duplicate Payment";
        } else if (data.paymentValue) {
          mode_of_pay_temp[data.paymentValue.name] = index;
        }

        if (data.amount) {
          total_temp_amount += parseFloat(data.amount);
        }

        // === Cash Denomination Validation ===
        if (
          this.state.is_denomination_enabled &&
          data.paymentValue?.name === "Cash" &&
          !data.is_denomination_skipped &&
          parseFloat(data.amount) !== parseFloat(data.denomination_total || 0)
        ) {
          const denominationTotal = parseFloat(data.denomination_total || 0);
          const enteredAmount = parseFloat(data.amount || 0);
          if (enteredAmount !== denominationTotal) {
            validation = false;
            error[`denomination_list${index}`] = `Denominations total ₹${denominationTotal} does not match entered cash ₹${enteredAmount}`;
          } else {
            delete error[`denomination_list${index}`];
          }
        }

        // === Loan Validation ===
        if (data.paymentValue?.name === "Loan") {
          if (!data.from_bank) {
            validation = false;
            error[`from_bank${index}`] = "Select From Bank";
          }
          if (!data.to_bank) {
            validation = false;
            error[`to_bank${index}`] = "Select To Bank";
          }
          if (!data.transfer_date) {
            validation = false;
            error[`transfer_date${index}`] = "Enter Transfer Date";
          }
          if (!data.utr_no) {
            validation = false;
            error[`utr_no${index}`] = "Enter UTR No.";
          }
        }
      });

      // === Loan must have all fields filled before submission ===
      const hasLoanPayment = mode_of_payment_list.some(
        (d) => d.paymentValue?.name === "Loan"
      );

      if (hasLoanPayment) {
        const loan = mode_of_payment_list.find((d) => d.paymentValue?.name === "Loan");
        if (
          !loan.from_bank ||
          !loan.to_bank ||
          !loan.transfer_date ||
          !loan.utr_no
        ) {
          validation = false;
          error["loanError"] = "Please fill all Loan details before submitting.";
        }
      }

      // === Edit/Skip Reason Validations ===
      if (isReasonOnEdit && isAmountEdited && !fieldValues.selectedReason) {
        validation = false;
        error[`selectedReason`] = "Select Reason";
      }
      if (status === "skip" && !fieldValues.selectedReason && isReasonOnSkip) {
        validation = false;
        error[`selectedReason`] = "Select Reason";
      }

      // === Final Check ===
      if (!validation) {
        this.setState({ error });
        return false;
      }

      if (
        validation &&
        parseFloat(total_temp_amount) !== parseFloat(amountDetails.amount)
      ) {
        errorTextTemp = `Difference Amount is ${
          parseFloat(amountDetails.amount) - parseFloat(total_temp_amount)
        }`;
        this.setState({
          errorText: errorTextTemp,
        });
        return false;
      }

      if (this.state.fieldValues.payeeName === "") {
        error["payeeName"] = "Please Enter Payee Name";
        this.setState({ error });
        return false;
      }

      return true;
    };

payFees = (status) => {
    const { mode_of_payment_list } = this.state;
    const testFieldValues = this.validateFieldValues(status);
    if (testFieldValues) {
      if (mode_of_payment_list.length === 1) {
        let updated_fields = this.state.fieldValues;
        updated_fields["refNo"] = mode_of_payment_list[0]["payment_ref_num"];
        updated_fields["paymentValue"] =
          mode_of_payment_list[0]["paymentValue"]?.["name"];
        updated_fields["note"] = mode_of_payment_list[0]["note"] || "";
        updated_fields["amount"] = mode_of_payment_list[0]["amount"] || 0;
        if (mode_of_payment_list[0]["bank_details"] && mode_of_payment_list[0]["bank_details"]["bank_detail_id"]) {
          updated_fields["bank_detail_id"] = mode_of_payment_list[0]["bank_details"]["bank_detail_id"];
        }
      }
      if (status === "skip") {
        this.props.payFeesWithSkip(this.state.fieldValues);
      } else {
        this.props.payFees(this.state.fieldValues, mode_of_payment_list);
      }

  }
};



  onChangeSamePage = () => {
    let { fieldValues } = this.state;
    fieldValues["isSelectSamePage"] = !fieldValues["isSelectSamePage"];
    this.setState({
      fieldValues,
    });
  };

  handleDropDownSearch = (newValue, index) => {
    let { mode_of_payment_list, error } = this.state;
    mode_of_payment_list[index]["paymentValue"] = newValue;
    delete error[`paymentValue${index}`];
    this.setState({
      mode_of_payment_list,
      error,
    });
  };

  handleSelectDenomination = (index, denomination, quantity) => {
    let { mode_of_payment_list, error } = this.state;
  
    if (!mode_of_payment_list[index]["denomination_list"]) {
      mode_of_payment_list[index]["denomination_list"] = {};
    }
  
    // Set the quantity (converted to int or 0)
    const qty = parseInt(quantity) || 0;
    mode_of_payment_list[index]["denomination_list"][denomination] = qty;
  
    // Calculate total denomination value
    const totalValue = Object.entries(mode_of_payment_list[index]["denomination_list"])
      .reduce((sum, [denom, qty]) => sum + parseInt(denom) * parseInt(qty), 0);
  
    // Update total in object
    mode_of_payment_list[index]["denomination_total"] = totalValue;
  
    this.setState({
      mode_of_payment_list,
      error,
    });
  };

  updateTotalValue = (e, index) => {
    const { name, value } = e.target;
    if (
      name === "payment_ref_num" &&
      value &&
      !nameAndNumberRegex.value.test(value)
    ) {
      return;
    }
    let { mode_of_payment_list, error } = this.state;
    mode_of_payment_list[index][name] = value;
    delete error[`${name}${index}`];
    this.setState({
      mode_of_payment_list,
      error,
      errorText: "",
    });
  };

  handleAddPayment = () => {
    let { mode_of_payment_list } = this.state;
    mode_of_payment_list.push({
      paymentValue: null,
      amount: 0,
      payment_ref_num: "",
    });
    this.setState({
      mode_of_payment_list,
    });
  };

  deleteField = (index) => {
    let { mode_of_payment_list } = this.state;
    mode_of_payment_list.splice(index, 1);
    this.setState({
      mode_of_payment_list,
    });
  };

  handleDropDownSearchChange = (e, newValue) => {
    let { fieldValues, error } = this.state;
    delete error["selectedReason"];
    fieldValues["selectedReason"] = newValue;
    this.setState({
      fieldValues: { ...fieldValues },
      error: { ...error },
    });
  };

  handleSearchChange = () => {
    this.setState({
      is_skip_enabled: !this.state.is_skip_enabled,
    });
  };

  updatePostFormat = (newData) => {
    newData.name = newData.name;
    newData.reason_type = "library_issue_return_reason";
    let payload = {
      reason: [newData],
    };
    return payload;
  };

  updateType = (field) => {
    this.setState({ loadingOptions: true });
    let { reasonList } = this.state;
    reasonList.push(field);
    this.setState({ reasonList }, () => {
      this.setState({ loadingOptions: false });
    });
    return true;
  };

  handleOptionChange = (event) => {
    const selectedOption = event.target.value;
    this.setState((prevState) => ({
      fieldValues: {
        ...prevState.fieldValues,
        selectedOption,
      },
    }))
  };
  getSavedBankList = () => {
  const url = GET_URL.bankdetail.api;
  const params = { is_active: true };

  getRequest(url, params, this.props)
    .then((response) => {
      if (response && response.status === 200) {
        const data = response.data.data.map((item) => ({
          name: item.id,
          label: item.display_name || item.bank_name,
        }));

        this.setState({ savedBankList: data });
      }
    })
    .catch(() => {
      this.setState({ savedBankList: [] });
    });
};


  render() {
    const {
      classes,
      amountDetails,
      totalAdditionalPay,
      isIssueBookItem,
      isRenewBookItem,
      isAmountCanEdit,
      isReasonOnEdit,
      isSkipRequired,
      isReasonOnSkip,
      isFineCarryforward,
    } = this.props;
    const {
      selectedReason,
      reasonList,
      fieldValues,
      error,
      totalAmount,
      mode_of_payment_list,
      errorText,
      is_mode_of_pay_multiple,
      loadingList,
      is_skip_enabled,
      loadingOptions,
      isAmountEdited,
    } = this.state;
    return (
      <Dialog
        open={true}
        onClose={() => this.handleClose()}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
        className="payment-modal"
        fullWidth={true}
      >
        <Grid container className="payment-grid">
          <Grid item xs={7} md={7} className={is_skip_enabled && "opacity-0-5"}>
            <DialogContent>
              <Box pt={2} pb={2}>
                <Typography
                  style={{
                    color: "black",
                    fontSize: "26px",
                    margin: "20px 0",
                  }}
                  className={classes.paymentModeHead}
                >
                  Payment
                </Typography>
                <Divider />
                <Box className={classes.amountDetails}>
                  <Box width="40%">Amount To Pay:</Box>
                  {isAmountCanEdit && (
                    <div>
                      <TextField
                        label=""
                        size="small"
                        variant="standard"
                        InputLabelProps={{ shrink: true }}
                        value={fieldValues.amountToPay}
                        inputProps={{ maxLength: 8 }}
                        className="width-150px"
                        onChange={(e) =>
                          this.onChangeFeeDetails(e, "amountToPay")
                        }
                        helperText={
                          Boolean(error["amountToPay"]) &&
                          (error["amountToPay"] === ""
                            ? ""
                            : error["amountToPay"])
                        }
                        error={
                          Boolean(error["amountToPay"]) &&
                          (error["amountToPay"] === "" ? false : true)
                        }
                      />
                    </div>
                  )}
                  {(!loadingOptions && isReasonOnEdit && isAmountEdited) ? (
                    <div className="ml-20" style={{ width: "225px" }}>
                      <DropDownWithSearchAndAddApi
                        options={reasonList}
                        value={fieldValues.selectedReason}
                        onChange={(e, newValue) =>
                          this.handleDropDownSearchChange(e, newValue)
                        }
                        name="selectedReason"
                        optionValue="name"
                        label="Reason"
                        className="width-220-px"
                        error={error["selectedReason"]}
                        hideClearIcon={true}
                        size={"small"}
                        fieldDetails={fieldDetails}
                        postUrl={POST_URL.reason.api}
                        updatePostFormat={this.updatePostFormat}
                        updateType={this.updateType}
                      />
                    </div>
                  ):
                  <div className="ml-20" style={{ width: "300px" }}></div>
                }
                  {!isAmountCanEdit && (
                    <Box className={classes.blueText}>
                      Rs.
                      {numberWithCommas(
                        totalAdditionalPay
                          ? totalAdditionalPay
                          : amountDetails.amount
                      )}
                    </Box>
                  )}
                </Box>
                <Box>
                  {isAmountEdited && isFineCarryforward && (
                    <div className="mt-10">
                      <p style={{ color: "red", fontSize: "14px" }}>
                        Would you like to carry forward or skip {fieldValues.remainingAmount} rs?
                      </p>

                      <FormControl component="fieldset">
                        <RadioGroup
                          name="paymentOption"
                          value={fieldValues.selectedOption}
                          onChange={this.handleOptionChange}
                        >
                          <FormControlLabel
                            value="carryForward"
                            control={<Radio color="primary" />}
                            label={`Carry Forward (${fieldValues.remainingAmount} rs) pending amount will be ${fieldValues.remainingAmount} rs`}
                          />
                          <FormControlLabel
                            value="skip"
                            control={<Radio color="primary" />}
                            label={`Skip Fine of (${fieldValues.remainingAmount} rs) pending amount will become 0 rs`}
                          />
                        </RadioGroup>
                      </FormControl>
                    </div>
                  )}
                </Box>
                <div style={{ marginTop: "40px" }}>
                  {mode_of_payment_list.map((data, index) => {
                    return (
                      <Box
                        className={classes.amountDetails}
                        style={{ marginTop: "20px" }}
                      >
                        <Box className="red-text" style={{ width: "40px" }}>
                          {mode_of_payment_list.length > 1 && (
                            <Button
                              color="secondary"
                              className="min-max-w-0"
                              onClick={() => this.deleteField(index)}
                            >
                              <DeleteOutlineIcon className="add-icon-stock-item" />
                            </Button>

                            // <HighlightOffIcon
                            //   className="cross-btn-nominee end-flex-prop close-icon-multiple-add-text-fields"
                            //   onClick={() => this.deleteField(index)}
                            // />
                          )}
                        </Box>
                        <Box className="width-100-px">
                          {is_mode_of_pay_multiple ? (
                            <TextField
                              autoComplete="off"
                              variant="outlined"
                              label="Amount"
                              id={`rupees_id`}
                              value={data.amount}
                              onChange={(e) => this.updateTotalValue(e, index)}
                              name="amount"
                              InputProps={{
                                borderBottom: "none",
                              }}
                              inputProps={{
                                maxLength: 9,
                                width: "100%",
                                style: { textAlign: "end", fontWeight: "bold" },
                              }}
                              error={
                                Boolean(error[`amount${index}`]) ? true : false
                              }
                              helperText={
                                Boolean(error[`amount${index}`]) ? (
                                  <Box>{error[`amount${index}`]}</Box>
                                ) : (
                                  ""
                                )
                              }
                              style={{ width: "100%" }}
                              size="small"
                            />
                          ) : (
                            <Box className={classes.blueText}>
                              Rs. {numberWithCommas(data.amount)}
                            </Box>
                          )}
                        </Box>
                        <Box
                          style={{ marginRight: "20px" }}
                          className="text-blue text-bold align-self-center ml-15"
                        >
                          {loadingList ? (
                            <Skeleton
                              variant="rect"
                              className="drop-down-skeleton m-t-10px"
                            ></Skeleton>
                          ) : (
                            <DropDownWithSearch
                              options={this.paymentModesNew}
                              optionValue="label"
                              name={"mode_of_payment"}
                              value={data.paymentValue}
                              onChange={(e, newValue) => this.handleDropDownSearch(newValue, index)}
                              label="Mode Of Payment"
                              hideClearIcon
                              size="small"
                              sx={{
                                minWidth: 160,
                                maxWidth: 200,
                                "& .MuiInputBase-root": { height: 38, fontSize: 13 },
                                "& .MuiInputLabel-root": { fontSize: 13 },
                              }}
                              error={error[`paymentValue${index}`] && error[`paymentValue${index}`]}
                            />)}

                            {this.state.show_bank_name_in_payment_details && data.paymentValue?.name !== "Cash" && (
                            <Box mt={1}>
                             <DropDownWithSearch
                                options={this.state.savedBankList}
                                optionValue="label"
                                name="saved_bank"
                                value={
                                  this.state.savedBankList.find((b) => b.name === data.bank_details?.bank_detail_id) || null
                                }
                                onChange={(e, newValue) => {
                                  let { mode_of_payment_list } = this.state;

                                  mode_of_payment_list[index].bank_details = {
                                    bank_detail_id: newValue ? newValue.name : null,
                                  };

                                  this.setState({ mode_of_payment_list });
                                }}
                                label="Paid in Bank"
                                size="small"
                                hideClearIcon={false}
                                sx={{
                                  minWidth: 160,
                                  maxWidth: 200,
                                }}
                              />
                            </Box>
                            )}


                            {data.paymentValue?.name === "Loan" && (
                            <Box
                              mt={1.5}
                              p={2}
                              sx={{
                                display: "grid",
                                gridTemplateColumns: "repeat(2, 1fr)",
                                gap: "14px",
                                backgroundColor: "#f9f9ff",
                                borderRadius: "10px",
                                border: "1px solid #e0e0e0",
                                width: "100%",
                              }}
                            >
                              {/* FROM BANK */}
                              <DropDownWithSearch
                                options={this.state.bankList}
                                optionValue="label"
                                name="from_bank"
                                value={
                                  this.state.bankList.find((b) => b.name === data.from_bank) || null
                                }
                                onChange={(e, newValue) => {
                                  const val = newValue ? newValue.name : "";
                                  let { mode_of_payment_list } = this.state;
                                  mode_of_payment_list[index]["from_bank"] = val;
                                  this.setState({ mode_of_payment_list });
                                }}
                                label="From Bank"
                                size="small"
                                hideClearIcon={false}
                                error={
                                Boolean(error[`from_bank${index}`])
                                  ? true
                                  : false
                              }
                              helperText={
                                Boolean(error[`from_bank${index}`]) ? (
                                  <Box>{error[`from_bank${index}`]}</Box>
                                ) : (
                                  ""
                                )
                              }
                              required={data.paymentValue?.mandatory_fields?.includes(
                                "from_bank"
                              )}
                              />

                              {/* TO BANK */}
                              <DropDownWithSearch
                                options={this.state.bankList}
                                optionValue="label"
                                name="to_bank"
                                value={
                                  this.state.bankList.find((b) => b.name === data.to_bank) || null
                                }
                                onChange={(e, newValue) => {
                                  const val = newValue ? newValue.name : "";
                                  let { mode_of_payment_list } = this.state;
                                  mode_of_payment_list[index]["to_bank"] = val;
                                  this.setState({ mode_of_payment_list });
                                }}
                                label="To Bank"
                                size="small"
                                hideClearIcon={false}
                                 error={
                                Boolean(error[`to_bank${index}`])
                                  ? true
                                  : false
                              }
                              helperText={
                                Boolean(error[`to_bank${index}`]) ? (
                                  <Box>{error[`to_bank${index}`]}</Box>
                                ) : (
                                  ""
                                )
                              }
                              required={data.paymentValue?.mandatory_fields?.includes(
                                "to_bank"
                              )}
                              />

                              {/* TRANSFER DATE */}
                              <TextField
                                label="Transfer Date"
                                type="date"
                                variant="outlined"
                                size="small"
                                name="transfer_date"
                                value={data.transfer_date || ""}
                                onChange={(e) => this.updateTotalValue(e, index)}
                                InputLabelProps={{ shrink: true }}
                              error={
                                Boolean(error[`transfer_date${index}`])
                                  ? true
                                  : false
                              }
                              helperText={
                                Boolean(error[`transfer_date${index}`]) ? (
                                  <Box>{error[`transfer_date${index}`]}</Box>
                                ) : (
                                  ""
                                )
                              }
                              required={data.paymentValue?.mandatory_fields?.includes(
                                "transfer_date"
                              )}
                              />

                              {/* UTR NO */}
                              <TextField
                                label="UTR No."
                                variant="outlined"
                                size="small"
                                name="utr_no"
                                value={data.utr_no || ""}
                                onChange={(e) => this.updateTotalValue(e, index)}
                                inputProps={{ maxLength: 30 }}
                                
                              error={
                                Boolean(error[`utr_no${index}`])
                                  ? true
                                  : false
                              }
                              helperText={
                                Boolean(error[`utr_no${index}`]) ? (
                                  <Box>{error[`utr_no${index}`]}</Box>
                                ) : (
                                  ""
                                )
                              }
                              required={data.paymentValue?.mandatory_fields?.includes(
                                "utr_no"
                              )}
                              />
                            </Box>
                          )}
                            {this.state.is_denomination_enabled && data.paymentValue?.name === 'Cash' && (
                              <div style={{ flexBasis: '100%' }}>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', marginTop: '10px' }}>
                                  {denominations
                                    .filter((d) => parseFloat(data.amount || 0) >= d)
                                    .map((amount) => (
                                      <div key={amount} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                        <label style={{ fontWeight: 'bold' }}>₹{amount}</label>
                                        <input
                                          type="number"
                                          min="0"
                                          style={{
                                            width: '60px',
                                            padding: '5px',
                                            textAlign: 'center',
                                            borderRadius: '6px',
                                            border: '1px solid #ccc',
                                          }}
                                          value={data.denomination_list?.[amount] || ''}
                                          onChange={(e) => this.handleSelectDenomination(index, amount, e.target.value)}
                                          disabled={data.is_denomination_skipped}
                                        />
                                      </div>
                                    ))}
                                </div>

                                {/* SKIP OPTION */}
                                <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center' }}>
                                  <input
                                    type="checkbox"
                                    checked={!!data.is_denomination_skipped}
                                    onChange={(e) => {
                                      const { mode_of_payment_list } = this.state;
                                      const skip = e.target.checked;

                                      mode_of_payment_list[index]["is_denomination_skipped"] = skip;

                                      if (skip) {
                                        mode_of_payment_list[index]["denomination_list"] = {};
                                        mode_of_payment_list[index]["denomination_total"] = 0;
                                      }

                                      this.setState({ mode_of_payment_list });
                                    }}
                                  />
                                  <label style={{ marginLeft: '8px' }}>Skip Denomination Entry</label>
                                </div>

                                {/* Error */}
                                {!data.is_denomination_skipped && error[`denomination_list${index}`] && (
                                  <div style={{ color: 'red', fontSize: '12px' }}>
                                    {error[`denomination_list${index}`]}
                                  </div>
                                )}
                              </div>
                            )}
                        </Box>
                       
                     


                        {data.paymentValue?.display_fields?.includes(
                          "payment_ref_num"
                        ) && (
                          <Box
                            className="width-250-px"
                            style={{ paddingLeft: "15px" }}
                          >
                            <TextField
                              autoComplete="off"
                              id={`rupees_id`}
                              variant="outlined"
                              label="Ref No."
                              value={data.payment_ref_num}
                              onChange={(e) => this.updateTotalValue(e, index)}
                              name="payment_ref_num"
                              InputProps={{
                                borderBottom: "none",
                              }}
                              inputProps={{
                                maxLength: 25,
                                width: "100%",
                                style: { textAlign: "end" },
                              }}
                              error={
                                Boolean(error[`payment_ref_num${index}`])
                                  ? true
                                  : false
                              }
                              helperText={
                                Boolean(error[`payment_ref_num${index}`]) ? (
                                  <Box>{error[`payment_ref_num${index}`]}</Box>
                                ) : (
                                  ""
                                )
                              }
                              required={data.paymentValue?.mandatory_fields?.includes(
                                "payment_ref_num"
                              )}
                              size="small"
                              style={{ width: "100%" }}
                            />
                          </Box>
                        )}
                      </Box>
                    );
                  })}
                </div>
                {is_mode_of_pay_multiple && (
                  <div>
                    <Tooltip
                      title="Add More Payment"
                      enterDelay={500}
                      enterNextDelay={400}
                      placement="top-start"
                      classes={{ tooltip: "tooltip-show-data" }}
                    >
                      <Button
                        className="min-width-button-label"
                        onClick={this.handleAddPayment}
                      >
                        <AddCircleOutlineOutlinedIcon className="add-icon-payment" />
                      </Button>
                    </Tooltip>
                  </div>
                )}
                <div className="text-red fs-18 text-bold text-align-center">
                  {errorText}
                </div>
                <div className="mt-40">
                  <TextField
                    className={"w-webkit-fill-available"}
                    variant="outlined"
                    label="Payee Note"
                    InputLabelProps={{ shrink: true }}
                    minRows={5}
                    maxRows={7}
                    multiline
                    autoFocus
                    value={fieldValues.paymentNote}
                    inputProps={{ maxLength: 200 }}
                    onChange={(e) => this.onChangeFeeDetails(e, "paymentNote")}
                    helperText={
                      Boolean(error["paymentNote"]) &&
                      (error["paymentNote"] === "" ? "" : error["paymentNote"])
                    }
                    error={
                      Boolean(error["paymentNote"]) &&
                      (error["paymentNote"] === "" ? false : true)
                    }
                  />
                </div>
              </Box>
            </DialogContent>
          </Grid>
          <Grid item xs={5} md={5} className={classes.rightPartGrid}>
            <DialogContent>
              <Box pt={6} pb={6} plr={4} pl={4}>
                <Typography
                  style={{
                    color: "black",
                    fontSize: "26px",
                    margin: "20px 0",
                  }}
                  className={classes.paymentModeHead}
                >
                  Payment Details
                </Typography>

                <TextField
                  className={classes.paymentInput}
                  label="Payee Name"
                  value={fieldValues.payeeName}
                  inputProps={{ maxLength: "100" }}
                  onChange={(e) => this.onChangeFeeDetails(e, "payeeName")}
                  helperText={
                    Boolean(error["payeeName"]) &&
                    (error["payeeName"] === "" ? "" : error["payeeName"])
                  }
                  error={
                    Boolean(error["payeeName"]) &&
                    (error["payeeName"] === "" ? false : true)
                  }
                />
                {fieldValues.paymentValue?.refRequired && (
                  <TextField
                    className={classes.paymentInput}
                    label="Ref No"
                    value={fieldValues.payment_ref_num}
                    onChange={(e) =>
                      this.onChangeFeeDetails(e, "payment_ref_num")
                    }
                    inputProps={{ maxLength: "30" }}
                    helperText={
                      error["payment_ref_num"] &&
                      (error["payment_ref_num"] === ""
                        ? ""
                        : error["payment_ref_num"])
                    }
                    error={
                      error["payment_ref_num"] &&
                      (error["payment_ref_num"] === "" ? false : true)
                    }
                  />
                )}
              </Box>
            </DialogContent>
            {isSkipRequired && !isAmountEdited && (
              <div className="d-flex">
                <div>
                  <Checkbox
                    onChange={this.handleSearchChange}
                    color="secondary"
                    name={"is_skip_enabled"}
                    checked={is_skip_enabled}
                    inputProps={{
                      "aria-label": "secondary checkbox",
                    }}
                  />
                  {!isAmountEdited && (
                    <span className="fs-20 text-red">{"Skip fine"}</span>)}
                </div>
                <div className="ml-20">
                  {!loadingOptions && isReasonOnSkip && is_skip_enabled && (
                    <DropDownWithSearchAndAddApi
                      options={reasonList}
                      value={fieldValues.selectedReason}
                      onChange={(e, newValue) =>
                        this.handleDropDownSearchChange(e, newValue)
                      }
                      name="selectedReason"
                      optionValue="name"
                      label="Reason"
                      className="width-250-px"
                      error={error["selectedReason"]}
                      hideClearIcon={true}
                      size={"small"}
                      fieldDetails={fieldDetails}
                      postUrl={POST_URL.reason.api}
                      updatePostFormat={this.updatePostFormat}
                      updateType={this.updateType}
                    />
                  )}
                </div>
              </div>
            )}
            {this.props.payDisabled && (
              <Box display="flex" justifyContent="center">
                <CircularProgress />
              </Box>
            )}
            {!this.props.payDisabled && !is_skip_enabled && (
              <Button
                onClick={() => this.payFees()}
                color="primary"
                className={classes.payNow}
                disabled={
                  isIssueBookItem
                    ? !fieldValues.amountToPay && totalAmount !== 0
                      ? true
                      : false
                    : isRenewBookItem
                      ? !fieldValues.amountToPay && totalAmount !== 0
                        ? true
                        : false
                      : false
                }
              >
                Pay Now
              </Button>
            )}
            {is_skip_enabled && isIssueBookItem ? (
              <div className="text-align-center margin-top-30">
                <Button
                  className="not-collecting-fine-button"
                  onClick={() => this.payFees("skip")}
                >
                  SKIP AND RETURN
                </Button>
                <div className="text-red text-bold mt-10">
                  ( Note: Skip fine collecting and return the book )
                </div>
              </div>
            ) : null}
            {is_skip_enabled && isRenewBookItem ? (
              <div className="text-align-center margin-top-30">
                <Button
                  className="not-collecting-fine-button"
                  onClick={() => this.payFees("skip")}
                >
                  SKIP AND RENEW
                </Button>
                <div className="text-red text-bold mt-10">
                  ( Note: Skip fine collecting and renew the book )
                </div>
              </div>
            ) : null}
            {this.props.isSamePageShow && (
              <MenuItem
                value={fieldValues["isSelectSamePage"]}
                onClick={() => this.onChangeSamePage()}
                className="padding-0 mt-30 flex-justify-center-flex-prop"
              >
                <Checkbox
                  color="secondary"
                  checked={fieldValues["isSelectSamePage"]}
                />
                <Box className="text-capitalize">
                  <ListItemText primary={"Should stay in same student page"} />
                </Box>
              </MenuItem>
            )}
          </Grid>
        </Grid>
        <IconButton
          aria-label="Close"
          className={classes.closeButton}
          onClick={() => this.handleClose()}
        >
          <CloseIcon />
        </IconButton>
      </Dialog>
    );
  }
}

const mapStateToProps = createStructuredSelector({
  getModeOfPayments: makeModeOfPaymentList(),
});

function mapDispatchToProps(dispatch) {
  return bindActionCreators({ setModeOfPaymentList }, dispatch);
}

export default withStyles(styles)(
  connect(mapStateToProps, mapDispatchToProps)(PaymentModalNew)
);

// export default withStyles(styles)(PaymentModalNew);
