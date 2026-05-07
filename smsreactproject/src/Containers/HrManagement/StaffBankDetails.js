import React, { Component } from "react";
import classNames from "classnames";
import { Grid, Box, Paper, Divider } from "@material-ui/core";
import _ from "lodash";

import DynamicForm from "Components/DynamicForm";
import Snackbar from "@material-ui/core/Snackbar";
import MuiAlert from "@material-ui/lab/Alert";
import { validateMobileNumber } from "Includes/functions";
import {
  nameRegex,
  bankAccountNumberRegex,
  nameAndNumberRegex,
  bankIfscRegex,
  panNumberRegex,
  pfNumberRegex,
  nameWithQuoteRegex,
} from "Constants/regularExpression";
import "./styles.scss";

function Alert(props) {
  return <MuiAlert elevation={6} variant="filled" {...props} />;
}

const bankDetails_global = [
  {
    label: "Account Name",
    regex: nameRegex,
    name: "name",
    md: 12,
    className: "width-form-100",
    required: false,
    id: "outlined-textarea",
    default: "",
    rows: null,
    type: "text",
    maxLength: 100,
  },
  {
    label: "Bank Name",
    regex: nameWithQuoteRegex,
    name: "bank_name",
    md: 6,
    className: "width-form-100",
    required: false,
    id: "outlined-textarea",
    default: "",
    rows: null,
    type: "text",
    maxLength: 100,
  },
  {
    label: "Branch Name",
    regex: nameAndNumberRegex,
    name: "branch_name",
    md: 6,
    className: "width-form-100",
    required: false,
    id: "outlined-textarea",
    default: "",
    rows: null,
    type: "text",
    maxLength: 100,
  },
  {
    label: "Account No.",
    regex: bankAccountNumberRegex,
    name: "account_num",
    md: 6,
    className: "width-form-100",
    required: false,
    id: "outlined-textarea",
    default: "",
    rows: null,
    type: "text",
    maxLength: 18,
  },
  {
    label: "IFSC Code",
    regex: bankIfscRegex,
    name: "ifsc",
    md: 6,
    className: "width-form-100",
    required: false,
    id: "outlined-textarea",
    default: "",
    rows: null,
    type: "text",
    maxLength: 15,
    convertUpperCase: true,
  },
  {
    label: "Mobile No.",
    regex: null,
    name: "mobile_num",
    md: 6,
    className: "width-form-100",
    required: false,
    id: "outlined-textarea",
    default: "",
    rows: null,
    type: "phone_number",
  },
  {
    label: "PAN No.",
    regex: panNumberRegex,
    name: "pan_num",
    md: 6,
    className: "width-form-100",
    required: false,
    id: "outlined-textarea",
    default: "",
    rows: null,
    type: "text",
    maxLength: 10,
  },
  {
    label: "PF No.",
    regex: pfNumberRegex,
    name: "pf_num",
    md: 6,
    className: "width-form-100",
    required: false,
    id: "outlined-textarea",
    default: "",
    rows: null,
    type: "text",
    maxLength: 23,
  },
  {
    label: "UAN Number",
    regex: null,
    name: "uan_num",
    md: 6,
    className: "width-form-100",
    required: false,
    id: "outlined-textarea",
    default: "",
    rows: null,
    type: "text",
    maxLength: 23,
  },
  {
    label: "ESI No.",
    regex: null,
    name: "esi_num",
    md: 6,
    className: "width-form-100",
    required: false,
    id: "outlined-textarea",
    default: "",
    rows: null,
    type: "text",
    maxLength: 23,
  },
];

class StaffBankDetails extends Component {
  constructor(props) {
    super(props);
    this.state = {
      fieldErrors: {},
      staffPreJobDetails: null,
      bankDetails: null,
      staff: { bank: {} },
      open: false,
      alertData: "",
      loading: true,
    };
  }

  async componentDidMount() {
    this.getStaffInformation();
  }

  getStaffInformation = () => {
    if (this.props.isEditForm) {
      this.updateBankDetails(this.props.staffDetail.accounts[0]);
    } else {
      this.updateBankDetails();
    }
  };

  updateBankDetails = (staffInf) => {
    let { staff } = this.state;
    const { form_details } = this.props;
    let fieldDetail = _.cloneDeep(form_details.bank_details.list);
    let value;
    fieldDetail.forEach((field) => {
      if (staffInf) {
        value = staffInf[field["name"]]
          ? staffInf[field["name"]]
          : field.default;
      } else {
        value = field.default;
      }
      field.default = value;
      staff["bank"][field["name"]] = value;
    });
    this.setState({
      staff,
      bankDetails: fieldDetail,
    });
  };

  updateStaff = (name, value) => {
    let { staff, bankDetails } = this.state;
    bankDetails.some((field) => {
      if (field.name === name) {
        field.default = value;
      }
    });
    staff["bank"][name] = value;
    this.setState({
      bankDetails,
      staff,
    });
    this.props.handlePrompt(true);
  };

  validate = () => {
    let { staff, bankDetails, fieldErrors } = this.state;

    fieldErrors = { permanent: {} };
    this.refs.bank.updateErrors(fieldErrors);
    let bankTest = true;
    let showError = "";
    let bankrequired = false;

    bankDetails.map((data) => {
      if (data.default !== "") {
        bankrequired = true;
      }
    });
    if (!bankrequired) {
      staff["bank"] = {};
      return staff;
    }
    bankDetails.forEach((field) => {
      let value = field.default;
      let name = field.name;
      if (bankrequired) {
        if (
          field.name === "name" ||
          field.name === "bank_name" ||
          field.name === "branch_name" ||
          field.name === "account_num"
        ) {
          field.required = true;
        }
      } else {
        field.required = false;
      }
      if (field.required && (value === "" || value === null || value === 0)) {
        fieldErrors[name] = `${field.label} is Mandatory`;
        bankTest = false;
      } else if (field.type === "phone_number") {
        let returnValue = validateMobileNumber(field, value);
        if (!returnValue.test) {
          fieldErrors[name] = returnValue.error;
          bankTest = false;
        } else {
          value = returnValue.value;
        }
      } else if (
        field.regex &&
        !field.regex.value.test(value) &&
        value !== ""
      ) {
        fieldErrors[name] = field.regex.errorText;
        bankTest = false;
      }
    });

    if (bankTest) {
      return staff;
    } else {
      if (!bankTest) {
        showError = showError + " Staff Details";
      }
      this.setState({
        open: true,
        alertData: `Please Clear ${showError}  Errors`,
        fieldErrors,
      });
      this.refs.bank.updateErrors(fieldErrors);
      return false;
    }
  };

  handleClose = () => {
    this.setState({
      open: false,
    });
  };

  scroll = () => {
    window.scrollTo(0, 0);
  };

  render() {
    const { open, alertData, bankDetails } = this.state;
    const { isEditForm } = this.props;
    return (
      <Paper>
        <Grid container className="padding-15">
          <Grid item md={3} xs={12} sm={12}>
            <Box className="form-left-heading header-align">
              Account details
            </Box>
            <Box
              className={classNames("form-inner-border", "hide-vl-on-900")}
            ></Box>
          </Grid>
          <Grid item md={8} xs={12} sm={12} className="bank-details-grid">
            {bankDetails && (
              <DynamicForm
                fieldDetails={bankDetails}
                updateParent={this.updateStaff}
                isEditForm={isEditForm}
                ref={"bank"}
                idFormat={"staff_bank_2022_08_11_01_23_pm_"}
              />
            )}
            <Grid item xs={12}>
              <Box mt={3} mb={3}>
                <Divider />
              </Box>
            </Grid>
          </Grid>
        </Grid>
        <Snackbar
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          open={open}
          autoHideDuration={2000}
          onClose={this.handleClose}
        >
          <Alert onClose={this.handleClose} severity="error">
            {alertData}
          </Alert>
        </Snackbar>
      </Paper>
    );
  }
}

export default StaffBankDetails;
