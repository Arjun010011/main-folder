import React, { Component } from "react";
import Swal from "sweetalert2";
import { withRouter } from "react-router-dom";
import {
  Paper,
  Box,
  Grid,
  Button,
  Tooltip,
  TextField,
  FormControl,
  FormHelperText,
  CircularProgress,
} from "@material-ui/core";
import VisibilityOutlinedIcon from "@material-ui/icons/VisibilityOutlined";
import Snackbar from "@material-ui/core/Snackbar";
import InfoIcon from "@material-ui/icons/Info";

import BlankPagewithIcon from "Components/BlankPageWithIcon";
import loadingBar from "images/loading.gif";
import { amountRegexWithDecimals } from "Constants/regularExpression";
import { getRequest, postRequest } from "Includes/api/apicall";
import { GET_URL, POST_URL } from "Includes/urls";
import {
  getUrlParam,
  Alert,
  isUserHasPermission,
  getFullName,
} from "Includes/functions";
import "./styles.scss";
import { Actions } from "Constants/permissions";
import { Camera } from "@material-ui/icons";
import CameraPopup from "Components/CameraPopup";

const alias_names = JSON.parse(localStorage.getItem("alias_name"))
  ? JSON.parse(localStorage.getItem("alias_name"))
  : {};

class StudentRfidAdd extends Component {
  constructor(props) {
    super(props);

    this.state = {
      transaction: { comment: "", type: "Distribute" },
      fieldErrors: {},
      loading: true,
      isEnable: {},
      upload_name: "Upload Receipt",
      openError: false,
      alertData: "Clear the errors",
      expenseDetails: {},
      isEdit: false,
      submitDisable: false,
      pageLoading: false,
      isBlankPage: false,
      bankInformation: {},
      staffList: [],
      finalStudentList: [],
      lowBalanceStudentList: [],
      currentIndex: 0,
      tableUpdating: false,
      profile_pic_dialog: false,
    };
    this.selectStudentRef = React.createRef();
  }

  componentDidMount = () => {
    let {
      selectedStandard,
      selectedSection,
      selectedYear,
      yearName,
      standardName,
      sectionName,
    } = getUrlParam();
    this.setState(
      {
        selectedStandard,
        selectedSection,
        selectedYear,
        yearName,
        standardName,
        sectionName,
        loading: false,
      },
      () => {
        this.getStudentList();
      }
    );
  };

  getStudentList = () => {
    let { selectedYear, selectedStandard, selectedSection } = this.state;
    const url = GET_URL.getenrolledstudents.api;
    let params = {
      academic_year: selectedYear,
      is_active: true,
      standard: selectedStandard,
      section: selectedSection,
    };
    getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        response.data.data.map((data) => {
          data["full_name"] = getFullName(
            data["student_first_name"],
            data["student_middle_name"],
            data["student_last_name"]
          );
        });
        this.setState({
          finalStudentList: response.data.data,
          allFinalStudentList: response.data.data,
          loading: false,
        });
      }
    });
  };

  validateAmount = () => {
    let { fieldErrors, transaction, bankInformation } = this.state;
    let error = false;
    if (
      parseFloat(bankInformation.balance) < parseFloat(transaction.amount) &&
      transaction.type === "Distribute"
    ) {
      error = true;
      fieldErrors["amount"] = `Enter below amount ${bankInformation.balance}`;
    }
    if (parseFloat(transaction.amount) === 0) {
      error = true;
      fieldErrors["amount"] = "Amount should be grater than 0";
    }
    this.setState({
      fieldErrors,
      error,
    });
  };

  validation = () => {
    let returnValue = true;
    let { fieldErrors, finalStudentList } = this.state;
    fieldErrors = {};
    let duplicate_rfid = [];
    let return_result = [];
    finalStudentList.map((parent, pIndex) => {
      finalStudentList.map((child, cIndex) => {
        if (
          parent["rfid"] &&
          child["rfid"] &&
          parent["rfid"] == child["rfid"] &&
          pIndex !== cIndex
        ) {
          if (
            duplicate_rfid.includes(child["rfid"]) &&
            !fieldErrors[`rfid_${pIndex}`]
          ) {
            fieldErrors[
              `rfid_${pIndex}`
            ] = `Duplicate Found ${child.full_name}`;
            returnValue = false;
          }
        }
      });
      duplicate_rfid.push(parent["rfid"]);
      return_result.push({ student: parent.student, rfid: parent["rfid"] });
    });
    if (returnValue) {
      returnValue = { rfid_datas: return_result };
    }
    this.setState({
      fieldErrors,
      openError: !returnValue,
      alertData: !returnValue ? "Clear duplicate error(s)" : "",
    });
    return returnValue;
  };

  submit = () => {
    let validate = this.validation();
    if (validate) {
      this.setState({ submitDisable: true });
      let url = POST_URL.studentrfidregister.api;
      postRequest(url, validate, this.props).then((response) => {
        if (response && response.status === 200) {
          Swal.fire({
            position: "top-end",
            type: "success",
            title: "Your Data has been saved",
            showConfirmButton: false,
            timer: 1500,
          });
          this.handleViewButton();
        }
        this.setState({ submitDisable: false });
      });
    }
  };

  handleClose = () => {
    this.setState({
      openError: false,
      alertImageData: "",
    });
  };

  handleFilter = (e) => {
    let { name, value, filterList } = e.target;
    let { allFinalStudentList, finalStudentList } = this.state;
    if (value !== "") {
      let lowerCasedFilter = value.toLowerCase().replace(/\s+/g, "");
      filterList = allFinalStudentList.filter((item) => {
        return Object.keys(item).some(
          (key) =>
            typeof item[key] === "string" &&
            item[key]
              .toLowerCase()
              .replace(/\s+/g, "")
              .includes(lowerCasedFilter)
        );
      });
      finalStudentList = filterList;
    } else {
      finalStudentList = [...allFinalStudentList];
      filterList = [];
    }
    this.setState({
      [name]: value,
      filterList,
      finalStudentList,
    });
  };

  handleValidation = () => {
    this.setState({
      neededSort: true,
    });
  };

  handleViewButton = () => {
    const { selectedYear, selectedStandard, selectedSection } = this.state;

    let searchState = { selectedYear, selectedStandard, selectedSection };

    let searchParam = "?" + new URLSearchParams(searchState).toString();
    this.props.history.push({
      pathname: Actions.student_rfid_list.view.url,
      search: searchParam,
    });
  };

  handleChange = (e, index) => {
    let { name, value } = e.target;
    let { finalStudentList, fieldErrors, tableUpdating } = this.state;
    finalStudentList[index][name] = value ? parseInt(value, 10) : value;
    finalStudentList[index]["modified"] = true;
    delete fieldErrors[`${name}_${index}`];
    this.setState(
      {
        finalStudentList,
        fieldErrors,
        tableUpdating,
      },
      () => {
        this.validation();
      }
    );
  };

  handleKeyDown = (e, index) => {
    if (e.key === "Enter") {
      this.setState({ tableUpdating: true }, () => {
        this.setState({
          currentIndex: index + 1,
          tableUpdating: false,
        });
      });
    }
  };

  handleCamera = () => {
    this.setState({
      profile_pic_dialog: !this.state.profile_pic_dialog,
    });
  };

  render() {
    const {
      loading,
      yearName,
      standardName,
      sectionName,
      openError,
      alertData,
      searchStudent,
      finalStudentList,
      fieldErrors,
      currentIndex,
      tableUpdating,
      submitDisable,
      profile_pic_dialog,
    } = this.state;
    if (loading) {
      return (
        <Box display="flex">
          <img src={loadingBar} className="loading" alt="loading" />
        </Box>
      );
    } else {
      return (
        <div>
          <Paper className="paper-background">
            <Grid container>
              <Grid item md={8} xs={12} className="header-align">
                <Box className="heading">Student RFID List</Box>
              </Grid>
              <Grid item md={4} xs={12}>
                <Box className="header-align end-flex-prop">
                  {isUserHasPermission("sections", "view") && (
                    <Button
                      variant="contained"
                      onClick={this.handleViewButton}
                      className="editbutton-view"
                    >
                      <VisibilityOutlinedIcon className="visibility-icon" />{" "}
                      {Actions.student_rfid_list.view.label}
                    </Button>
                  )}
                </Box>
              </Grid>
            </Grid>
            <Box className="md-down-justify-start md-up-justify-start mb-y-20">
              <Box className="year-std-box mr-40">
                <Box className="academic-std-head"> Academic Year</Box>
                <Box className=" exam-mark-add-heading-bg">{yearName}</Box>
                <Box className="exam-mark-heading-box">{`${alias_names["standard"]}`}</Box>
                <Box className=" exam-mark-add-heading-bg">{standardName}</Box>
                <Box className="exam-mark-heading-box"> Section</Box>
                <Box className=" exam-mark-add-heading-bg">{sectionName}</Box>
              </Box>
            </Box>
            <Grid container>
              <Grid item md={12} xs={12}>
                <Paper className="paper-plain-background student-rfid-add pt-10">
                  <TextField
                    id="outlined-name"
                    value={searchStudent}
                    placeholder=""
                    label="Search Student"
                    name="searchStudent"
                    onChange={(e) => {
                      this.handleFilter(e);
                    }}
                  />
                  {!tableUpdating && (
                    <table width="100%" className="selectable-row-table mt-20">
                      <thead className="table-select-hostel-thead">
                        <th className={`selectable-table-head`}>
                          Student Name
                        </th>
                        <th className={`selectable-table-head`}>
                          Register No.
                        </th>
                        <th className={`selectable-table-head`}> RFID No. </th>
                        <th className={`selectable-table-head`}>
                          Profile Pic
                        </th>
                        <th className={`selectable-table-head`}>
                          Barcode Generator
                        </th>
                      </thead>
                      <tbody className="selectable-row-table-body">
                        {finalStudentList.map((student, index) => {
                          return (
                            <tr
                              key={index}
                              className={
                                student.is_low_balance
                                  ? "selectable-row-table-row text-red"
                                  : "selectable-row-table-row"
                              }
                            >
                              <td
                                className={
                                  student.is_low_balance
                                    ? "textAlign"
                                    : "textAlign pl-15 "
                                }
                              >
                                {student.full_name}
                              </td>
                              <td className={"textAlign pl-15 "}>
                                {student.current_reg_num}
                              </td>
                              <td className={"textAlign pl-15 "}>
                                <TextField
                                  id="number"
                                  label=""
                                  type="text"
                                  autoComplete="off"
                                  name="rfid"
                                  value={student.rfid}
                                  autoFocus={
                                    currentIndex === index ? true : false
                                  }
                                  onChange={(e) => this.handleChange(e, index)}
                                  onKeyDown={(e) =>
                                    this.handleKeyDown(e, index)
                                  }
                                  InputLabelProps={{
                                    shrink: true,
                                  }}
                                  InputProps={{
                                    max: 16,
                                    min: 0,
                                    endAdornment: fieldErrors[
                                      `rfid_${index}`
                                    ] ? (
                                      <Tooltip
                                        title={fieldErrors[`rfid_${index}`]}
                                        enterDelay={400}
                                        enterNextDelay={400}
                                        placement="top-start"
                                        classes={{
                                          tooltip: "tooltip-show-data",
                                        }}
                                      >
                                        <InfoIcon className="time-table-info-icon cursor-pointer" />
                                      </Tooltip>
                                    ) : (
                                      ""
                                    ),
                                  }}
                                  error={
                                    fieldErrors[`rfid_${index}`] &&
                                    (fieldErrors[`rfid_${index}`]
                                      ? true
                                      : false)
                                  }
                                />
                              </td>
                              <td className={"textAlign pl-15 "}>
                                <Camera onClick={this.handleCamera} />
                              </td>
                              <td className={"textAlign pl-15 "}>
                                {student.current_reg_num}
                              </td>
                            </tr>
                          );
                        })}
                        {finalStudentList.length === 0 && (
                          <tr className="text-center font-weight-bold">
                            No Data Found
                          </tr>
                        )}
                      </tbody>
                    </table>
                  )}
                </Paper>
              </Grid>
            </Grid>
          </Paper>
          {profile_pic_dialog && (
            <CameraPopup handleCloseCamera={this.handleCamera} />
          )}
          <Box className="submt-button-float-bottom">
            <Button
              variant="contained"
              color="primary"
              className="submit"
              disabled={submitDisable}
              onClick={this.submit}
            >
              submit
            </Button>
          </Box>
          <Snackbar
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            open={openError}
            autoHideDuration={2000}
            onClose={this.handleClose}
          >
            <Alert onClose={this.handleClose} severity="error">
              {alertData}
            </Alert>
          </Snackbar>
        </div>
      );
    }
  }
}

export default withRouter(StudentRfidAdd);
