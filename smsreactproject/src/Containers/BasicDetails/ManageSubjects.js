import React, { Component } from "react";
import { Paper, Box, Grid, Button } from "@material-ui/core";
import Swal from "sweetalert2";
import VisibilityOutlinedIcon from "@material-ui/icons/VisibilityOutlined";
import { Link } from "react-router-dom";
import classNames from "classnames";
import { withRouter } from "react-router-dom";
import Snackbar from "@material-ui/core/Snackbar";
import MuiAlert from "@material-ui/lab/Alert";

import MultipleAddTextFields from "Components/MultipleAddTextFields";
import loadingBar from "images/loading.gif";
import { getRequest, postRequest } from "Includes/api/apicall";
import { GET_URL, POST_URL } from "Includes/urls";
import {
  nameWithQuoteRegex,
  nameAndNumberAndHyphenRegex,
  nameRegex,
} from "Constants/regularExpression";
import { Actions } from "Constants/permissions";
import { isUserHasPermission, getSettingValue } from "Includes/functions";
import { FormattedMessage } from "react-intl";
import messages from "./messages";
import commonMessages from "Constants/messages";
import MultipleSelectDropdown from "Components/MultipleSelectDropdown";

function Alert(props) {
  return <MuiAlert elevation={6} variant="filled" {...props} />;
}

const number_of_language = parseInt(getSettingValue("number_of_language"));

const subjectDetails_global = [
  {
    label: "Part Type",
    regex: null,
    name: "subject_part_type",
    md: 4,
    className: "width-form-95",
    required: true,
    allowDuplicates: true,
    id: "outlined-textarea",
    default: "",
    rows: null,
    type: "drop_down",
    maxLength: 25,
    gridClassName: "margin-vertical-20",
    list: [],
  },
  {
    label: "Name",
    regex: nameWithQuoteRegex,
    autoFocus: false,
    name: "name",
    md: 8,
    className: "width-form-95",
    required: true,
    id: "outlined-textarea",
    default: "",
    rows: null,
    type: "text",
    maxLength: 250,
    gridClassName: "margin-vertical-20",
  },
  {
    label: "Code",
    regex: nameAndNumberAndHyphenRegex,
    autoFocus: false,
    name: "subject_code",
    md: 4,
    className: "width-form-95",
    required: false,
    id: "outlined-textarea",
    default: "",
    rows: null,
    type: "text",
    maxLength: 30,
    gridClassName: "margin-vertical-20",
  },
  {
    label: <FormattedMessage {...commonMessages.isLanguage} />,
    regex: null,
    autoFocus: false,
    name: "is_language",
    md: 12,
    className: "",
    required: false,
    allowDuplicates: true,
    id: "outlined-textarea",
    default: "",
    rows: null,
    type: "checkbox",
    maxLength: 20,
    gridClassName: "margin-vertical-20",
  },
];

class ManageSubjects extends Component {
  constructor() {
    super();
    this.state = {
      subjects: [],
      loading: true,
      open: false,
      alertData: "",
      selectedCountry: "",
      subjectDetails: [],
      branch_list: [],
      selected_branch: [],
      fieldError: {},
    };
  }

  componentDidMount = () => {
    let branch_list =
      localStorage.getItem("branches") &&
      localStorage.getItem("branches") !== "undefined"
        ? JSON.parse(localStorage.getItem("branches"))
        : [];
    this.getPartTypeList();
    branch_list.map((data) => {
      data["label"] = data["name"];
      data["value"] = data["id"];
    });
    this.setState({
      branch_list,
    });
  };

  getPartTypeList = () => {
    let { subjectDetails } = this.state;
    if (number_of_language == 0) {
      subjectDetails.push(subjectDetails_global[0]);
      subjectDetails.push(subjectDetails_global[1]);
      subjectDetails.push(subjectDetails_global[2]);
    } else {
      subjectDetails = subjectDetails_global;
    }
    const url = GET_URL.subjectparttype.api;
    const params = { is_active: true };
    getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        subjectDetails[0]["list"] = response.data.data;
        this.setState({
          subjectDetails,
          loading: false,
        });
      }
    });
  };

  updateSubjectsValue = (stateValue) => {
    let { subjects } = this.state;
    subjects = stateValue;
    this.setState({
      subjects,
    });
  };

  validate = () => {
    let stateTest = true;
    let branchTest = true;
    let { subjects, fieldError, branch_list } = this.state;
    stateTest = this.refs.state.validateFields();
    if (branch_list.length > 0) {
      branchTest = this.getBranchData();
    }
    if (stateTest && branchTest) {
      subjects.map((data) => {
        data["branches"] = branch_list.length > 0 ? branchTest : [];
        data["is_language"] = data["is_language"] === true ? true : false;
      });

      let post_data = {
        subjects: subjects,
      };
      this.setState({ submitDisable: true });
      let url = POST_URL.subject.api;
      postRequest(url, post_data, this.props).then((response) => {
        if (response && response.status === 200) {
          Swal.fire({
            position: "top-end",
            type: "success",
            title: response.data.Reason,
            showConfirmButton: false,
            timer: 1500,
          });
          this.props.history.push(Actions.subjects.view.url);
        }
        this.setState({ submitDisable: false });
      });
    } else if (!branchTest) {
      fieldError["branch"] = "Select branch";
      this.setState({
        fieldError,
      });
    }
  };

  getBranchData = () => {
    let { selected_branch } = this.state;
    let branchTest = [];
    if (selected_branch.length > 0) {
      selected_branch.map((data) => {
        branchTest.push(data["id"]);
      });
    } else {
      branchTest = false;
    }
    return branchTest;
  };

  handleClose = () => {
    this.setState({
      open: false,
    });
  };

  handleStateViewButton = () => {
    this.props.history.push(Actions.subjects.view.url);
  };

  onChangeBranch = (e) => {
    this.setState({
      selected_branch: e,
      fieldError: {},
    });
  };

  render() {
    const {
      loading,
      open,
      subjectDetails,
      submitDisable,
      branch_list,
      selected_branch,
      fieldError,
    } = this.state;
    if (loading) {
      return (
        <Box display="flex">
          <img src={loadingBar} className="loading" alt="loading" />
        </Box>
      );
    } else {
      return (
        <Box>
          <Paper className={classNames("paper-background")}>
            <Grid container>
              <Grid item md={6} xs={12} className={classNames("header-align")}>
                <Box className="heading">
                  <FormattedMessage {...commonMessages.subjects} />
                </Box>
              </Grid>
              <Grid item md={6} xs={12}>
                <Box className={classNames("header-align", "end-flex-prop")}>
                  {isUserHasPermission("subjects", "view") && (
                    <Button
                      variant="contained"
                      onClick={this.handleStateViewButton}
                      className="editbutton-view"
                    >
                      <VisibilityOutlinedIcon className="visibility-icon" />{" "}
                      {Actions.subjects.view.label}
                    </Button>
                  )}
                </Box>
              </Grid>
            </Grid>
            {branch_list.length > 0 && (
              <MultipleSelectDropdown
                data_list={branch_list}
                selected_list={selected_branch}
                error={fieldError["branch"] && fieldError["branch"]}
                label={"Select course"}
                onChange={(e) => this.onChangeBranch(e)}
              />
            )}
            <Grid container className={classNames("header-align")}>
              <Grid item md={10} xs={12}>
                <MultipleAddTextFields
                  fieldDefaultValue={[]}
                  fieldDetails={subjectDetails}
                  updateParent={this.updateSubjectsValue}
                  isEmptyNotAllowed={true}
                  ref={"state"}
                  NotAlignCenter={true}
                  idFormat={"subjects_2022_08_11_2_pm_"}
                />
                <Box className="submt-button-float-bottom" mt={3}>
                  <Button
                    variant="contained"
                    color="primary"
                    className="submit"
                    disabled={submitDisable}
                    onClick={this.validate}
                  >
                    <FormattedMessage {...commonMessages.submit} />
                  </Button>
                </Box>
              </Grid>
            </Grid>
            <Snackbar
              anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
              open={open}
              autoHideDuration={2000}
              onClose={this.handleClose}
            >
              <Alert onClose={this.handleClose} severity="error">
                <FormattedMessage {...commonMessages.clearAllErrors} />
              </Alert>
            </Snackbar>
          </Paper>
        </Box>
      );
    }
  }
}
export default withRouter(ManageSubjects);
