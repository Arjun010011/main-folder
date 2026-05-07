import React, { Component } from "react";
import { Grid, Box, Paper, Divider } from "@material-ui/core";

import MultipleAddTextFields from "Components/MultipleAddTextFields";
import Snackbar from "@material-ui/core/Snackbar";
import MuiAlert from "@material-ui/lab/Alert";
import { minDate } from "Constants";
import { nameRegex, emailRegex } from "Constants/regularExpression";
import "./styles.scss";
import { cloneDeep } from "lodash";

function Alert(props) {
  return <MuiAlert elevation={6} variant="filled" {...props} />;
}

const nomineeDetails_global = [
  {
    label: "Name",
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
    label: "DOB",
    regex: null,
    name: "dob",
    md: 6,
    className: "width-form-100",
    required: false,
    id: "outlined-textarea",
    default: "",
    rows: null,
    type: "date",
    maxLength: null,
    minDate: minDate,
    maxDate: new Date(),
    allowDuplicates: true,
  },
  {
    label: "Relationship",
    regex: null,
    name: "relationship_name",
    md: 6,
    className: "width-form-100",
    required: false,
    id: "outlined-textarea",
    default: "",
    rows: null,
    type: "drop_down",
    maxLength: 25,
    allowDuplicates: true,
    list: [
      { id: "Father", name: "Father" },
      { id: "Mother", name: "Mother" },
      { id: "Son", name: "Son" },
      { id: "Daughter", name: "Daughter" },
      { id: "Spouse", name: "Spouse" },
      { id: "Friend", name: "Friend" },
      { id: "Brother", name: "Brother" },
      { id: "Sister", name: "Sister" },
    ],
    labelBackGroundClassName: "background-white",
  },
  {
    label: "Mobile No.",
    regex: null,
    name: "mobile_num",
    md: 6,
    className: "width-form-100 margin-top-15",
    required: false,
    id: "outlined-textarea",
    default: "",
    rows: null,
    type: "phone_number",
    maxLength: 15,
    allowDuplicates: true,
  },
  {
    label: "Email",
    regex: emailRegex,
    name: "email",
    md: 6,
    className: "width-form-100",
    required: false,
    id: "outlined-textarea",
    default: "",
    rows: null,
    type: "text",
    maxLength: 50,
    helperText: "Enter a proper Email to get Mails",
    allowDuplicates: true,
  },
  {
    label: "Address",
    regex: null,
    name: "address",
    md: 12,
    className: "width-form-100",
    required: false,
    id: "outlined-textarea",
    default: "",
    rows: null,
    type: "text",
    maxLength: 100,
    allowDuplicates: true,
  },
];

class StaffNomineeDetails extends Component {
  constructor(props) {
    super(props);
    this.state = {
      fieldErrors: {},
      staffNomineeDetails: null,
      staff: { nominee: null },
      open: false,
      alertData: "",
      loading: true,
      nomineeValue: null,
    };
  }

  async componentDidMount() {
    this.getStaffInformation();
  }

  getStaffInformation = () => {
    if (this.props.isEditForm) {
      this.updateNominee(this.props.staffDetail.nominee_detail);
    } else {
      this.updateNominee();
    }
  };

  updateNomineeValue = (nomineeValues) => {
    let { staff } = this.state;
    staff["nominee"] = nomineeValues;
    this.setState({
      staff,
    });
    this.props.handlePrompt(true);
  };

  updateNominee = (preSchoolInf) => {
    let { staff } = this.state;
    let nominee;
    if (preSchoolInf) {
      nominee = preSchoolInf ? preSchoolInf : "";
    } else {
      nominee = [];
    }
    staff["nominee"] = nominee;
    this.setState({
      nomineeValue: nominee,
      staff,
    });
  };

  updateParentDeletedId = (deleted_ids) => {
    this.setState({
      nominee_deletable_ids: deleted_ids,
    });
  };

  validate = () => {
    let { staff, fieldErrors, nominee_deletable_ids } = this.state;

    let nomineeTest = true;
    let showError = "";

    nomineeTest = this.refs.nominee.validateFields();
    if (nomineeTest) {
      staff["nominee_deletable_ids"] = nominee_deletable_ids;
      return staff;
    } else {
      if (!nomineeTest) {
        showError = showError + " Nominee Details";
      }

      this.setState({
        open: true,
        alertData: `Please Clear ${showError}  Errors`,
        fieldErrors,
      });
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
    const { open, alertData, nomineeValue } = this.state;
    const { form_details, loadingForm } = this.props;
    return (
      <Paper>
        <Grid container className="padding-15">
          <Grid item md={3} xs={12} sm={12}>
            <Box className="header-align">
              <Box className="form-left-heading">
                {form_details.nominee_details.label}
              </Box>
            </Box>
          </Grid>
          <Grid item md={8} xs={12} sm={12}>
            {nomineeValue && (
              <MultipleAddTextFields
                fieldDefaultValue={nomineeValue}
                fieldDetails={cloneDeep(form_details.nominee_details.list)}
                updateParent={this.updateNomineeValue}
                updateParentDeletedId={this.updateParentDeletedId}
                loading={loadingForm}
                ref={"nominee"}
                NotAlignCenter={true}
                idFormat={"nominee_2022_08_11_2_pm_"}
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

export default StaffNomineeDetails;
