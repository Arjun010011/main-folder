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
import Typography from "@material-ui/core/Typography";
import FormControl from "@material-ui/core/FormControl";
import RadioGroup from "@material-ui/core/RadioGroup";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import Radio from "@material-ui/core/Radio";
import { Box, Button, TextField } from "@material-ui/core";
import { numberWithCommas } from "Includes/functions";
import { isFormDefinitionEnabled } from "Includes/CheckFormDefinition";

import {
  nameRegex,
  nameAndNumberRegex,
  numberRegex,
} from "Constants/regularExpression";
import { BUTTONCOLOR } from "../actions/constants";

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

class AlertDialog extends React.Component {
  constructor(props) {
    let paymentValue =
      isFormDefinitionEnabled(
        "fee_configurations",
        "is_payment_mode_auto_select",
        "Cash"
      ) === true
        ? "Cash"
        : "";
    super(props);
    this.state = {
      open: true,
      fieldValues: {
        paymentValue: props.additionalModeOfPay
          ? props.additionalModeOfPay
          : paymentValue,
        amountToPay: 0,
        payeeName: props.amountDetails?.student ?? "",
        refNo: "",
        paymentNote: "",
        isSelectSamePage: this.props.isSelectSamePage,
      },
      error: { payeeName: "", refNo: "" },
    };
    this.paymentModes = {
      Cash: { name: "Cash", refRequired: false, alias: "" },
      NetBanking: { name: "Net banking", refRequired: true, alias: "" },
      UPIPayments: { name: "Upi Payments", refRequired: true, alias: "" },
      Cheque: { name: "Cheque", refRequired: true, alias: "" },
      Online: { name: "Online", refRequired: true, alias: "" },
      Debit: { name: "Debit Card", refRequired: true, alias: "" },
      Credit: { name: "Credit Card", refRequired: true, alias: "" },
    };
  }

  componentDidMount = () => {
    let { fieldValues } = this.state;
    let totalAmount = this.props.totalAdditionalPay
      ? this.props.totalAdditionalPay
      : this.props.amountDetails.amount;
    fieldValues["amountToPay"] = totalAmount;
    this.setState({
      totalAmount,
      fieldValues,
    });
  };

  handleClose = () => {
    this.props.closeFeePaymentModal();
  };

  onChangeFeeDetails = (e, field) => {
    const { value } = e.target;
    let { error } = this.state;
    let { amountDetails, isAmountCanEdit } = this.props;
    if (field === "amountToPay" && isAmountCanEdit) {
      if (!numberRegex.value.test(value)) {
        return;
      } else if (amountDetails.amount < value) {
        error["amountToPay"] = `Should not exceed ${amountDetails.amount}`;
        this.setState({ error });
        return;
      }
    }
    let fieldValues = { ...this.state.fieldValues };
    fieldValues[field] = value;
    if (field === "payeeName" && !nameRegex.value.test(value)) {
      error["payeeName"] = nameRegex.errorText;
    } else if (field === "paymentNote") {
      error["paymentNote"] = nameRegex.errorText;
    } else if (field === "refNo" && !nameAndNumberRegex.value.test(value)) {
      error["refNo"] = nameRegex.errorText;
    }
    delete error[field];
    this.setState({ fieldValues, error });
  };

  handleChange = (event) => {
    let { error } = this.state;
    const { value } = event.target;
    let fieldValues = { ...this.state.fieldValues };
    fieldValues["paymentValue"] = value;
    delete error["paymentValue"];
    this.setState({ fieldValues, error });
  };
  validateFieldValues = () => {
    let { error } = this.state;
    let { totalAdditionalPay } = this.props;
    if (!this.state.fieldValues.paymentValue && !totalAdditionalPay) {
      error["paymentValue"] = "Please Select Payment Mode";
      this.setState({ error });
      return false;
    }
    if (
      this.paymentModes[this.state.fieldValues.paymentValue].refRequired &&
      this.state.fieldValues.refNo === ""
    ) {
      error["refNo"] = "Please Enter Ref Number";
      this.setState({ error });
      return false;
    }
    if (this.state.fieldValues.payeeName === "") {
      error["payeeName"] = "Please Enter Payee Name";
      this.setState({ error });
      return false;
    }
    return true;
  };

  payFees = () => {
    const testFieldValues = this.validateFieldValues();
    if (testFieldValues) {
      this.props.payFees(this.state.fieldValues);
    }
  };

  onChangeSamePage = () => {
    let { fieldValues } = this.state;
    fieldValues["isSelectSamePage"] = !fieldValues["isSelectSamePage"];
    this.setState({
      fieldValues,
    });
  };

  render() {
    const {
      classes,
      amountDetails,
      isTaxHide,
      totalAdditionalPay,
      additionalModeOfPay,
      isIssueBookItem,
      isAmountCanEdit,
    } = this.props;
    const { fieldValues, error, totalAmount } = this.state;
    return (
      <Dialog
        open={true}
        onClose={() => this.handleClose()}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
        maxWidth="md"
        fullWidth={true}
      >
        <Grid container>
          <Grid item xs={7} md={7}>
            <DialogContent>
              <Box pt={4} pb={6} pr={4} pl={4}>
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
                <Box className={classes.amountDetails}>
                  <Box width="40%">Amount</Box>
                  <Box>
                    Rs.
                    {numberWithCommas(
                      totalAdditionalPay
                        ? totalAdditionalPay
                        : amountDetails.amount
                    )}
                  </Box>
                </Box>
                {!isTaxHide && (
                  <Box className={classes.amountDetails}>
                    <Box width="40%">Tax</Box>
                    <Box>Rs. {0}</Box>
                  </Box>
                )}
                <Divider />
                <Box className={classes.amountDetails}>
                  <Box width="40%">Amount To Pay:</Box>
                  {isAmountCanEdit && (
                    <TextField
                      label=""
                      size="small"
                      variant="standard"
                      InputLabelProps={{ shrink: true }}
                      value={fieldValues.amountToPay}
                      inputProps={{ maxLength: 8 }}
                      className="width-200-px"
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
                  )}

                  {!isAmountCanEdit && (
                    <Box className={classes.blueText}>
                      Rs.{" "}
                      {numberWithCommas(
                        totalAdditionalPay
                          ? totalAdditionalPay
                          : amountDetails.amount
                      )}
                    </Box>
                  )}
                </Box>
                <Typography
                  className={classes.paymentModeHead}
                  style={{ color: "#1665D8", marginTop: "30px" }}
                >
                  Mode of Payment - {additionalModeOfPay}
                </Typography>
                <Box pt={2}>
                  {!totalAdditionalPay && (
                    <FormControl component="fieldset">
                      <RadioGroup
                        value={fieldValues.paymentValue}
                        onChange={this.handleChange}
                        row
                      >
                        {Object.keys(this.paymentModes).map((mode, index) => {
                          return (
                            <FormControlLabel
                              key={index}
                              value={mode}
                              control={<Radio color="primary" />}
                              label={this.paymentModes[mode].name}
                              labelPlacement="end"
                            />
                          );
                        })}
                      </RadioGroup>
                    </FormControl>
                  )}
                  <div className="text-red fs-18 text-bold">
                    {error["paymentValue"]}
                  </div>
                </Box>
                <div className="mt-20">
                  <TextField
                    className={"w-webkit-fill-available"}
                    variant="outlined"
                    label="Payee Note"
                    InputLabelProps={{ shrink: true }}
                    minRows={2}
                    maxRows={5}
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
                  {
                    this.paymentModes[this.state.fieldValues?.paymentValue]
                      ?.alias
                  }
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
                {this.paymentModes[fieldValues.paymentValue]?.refRequired && (
                  <TextField
                    className={classes.paymentInput}
                    label="Ref No"
                    value={fieldValues.refNo}
                    onChange={(e) => this.onChangeFeeDetails(e, "refNo")}
                    inputProps={{ maxLength: "30" }}
                    helperText={
                      error["refNo"] &&
                      (error["refNo"] === "" ? "" : error["refNo"])
                    }
                    error={
                      error["refNo"] && (error["refNo"] === "" ? false : true)
                    }
                  />
                )}
              </Box>
            </DialogContent>
            {this.props.payDisabled && (
              <Box display="flex" justifyContent="center">
                <CircularProgress />
              </Box>
            )}
            {!this.props.payDisabled && (
              <Button
                onClick={() => this.payFees()}
                color="primary"
                className={classes.payNow}
                disabled={
                  isIssueBookItem
                    ? !fieldValues.amountToPay && totalAmount !== 0
                      ? true
                      : false
                    : false
                }
              >
                Pay Now
              </Button>
            )}
            {isIssueBookItem && (
              <div className="text-align-center margin-top-30">
                <Button
                  className="not-collecting-fine-button"
                  onClick={(e) => this.handleReviewReturn()}
                >
                  SKIP AND RETURN
                </Button>
                <div className="text-red text-bold mt-10">
                  ( Note: Skip fine collecting and return the book )
                </div>
              </div>
            )}
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
export default withStyles(styles)(AlertDialog);
