import React, { Component } from "react";
import Swal from "sweetalert2";
import { withRouter } from "react-router-dom";
import {
  Paper,
  Box,
  Grid,
  Button,
  MenuItem,
  Checkbox,
  TextField,
} from "@material-ui/core";
import VisibilityOutlinedIcon from "@material-ui/icons/VisibilityOutlined";
import Snackbar from "@material-ui/core/Snackbar";
import loadingBar from "images/loading.gif";
import { getRequest, postRequest } from "Includes/api/apicall";
import { GET_URL, POST_URL } from "Includes/urls";
import {
  getUrlParam,
  Alert,
  isUserHasPermission,
  getFullName,
  getPaginationProps,
} from "Includes/functions";
import { Actions } from "Constants/permissions";
import {
  DEFAULT_PAGINATION_PROPS_FIRST_NAME_LIST,
  IMPORT_CONFIGURATION_STAFF_LIST,
} from "Constants";
import AddInputUserField from "Containers/Student/Components/AddInputUserField";
import commonMessages from "Constants/messages";
import { FormattedMessage } from "react-intl";

const alias_names = JSON.parse(localStorage.getItem("alias_name"))
  ? JSON.parse(localStorage.getItem("alias_name"))
  : {};

class StaffBioMetricidAdd extends Component {
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
      importCongiguration: "",
      pagination: { ...DEFAULT_PAGINATION_PROPS_FIRST_NAME_LIST },
      showPassword: false,
      selectAll: false,
    };
    this.selectStudentRef = React.createRef();
  }

  componentDidMount = () => {
    let { standard, year, year_name, standard_name } = getUrlParam();
    this.setState(
      {
        selectedStandard: standard,
        selectedYear: year,
        yearName: year_name,
        standardName: standard_name,
      },
      () => {
        this.getStaffList();
      }
    );
  };

  getStaffList = () => {
    const url = GET_URL.machineusermapping.api;
    const params = {
      is_active: true,
      ordering: "first_name",
      show_only_staff: 1,
    };
    getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        response.data.data.map((data) => {
          data["checked"] = false;
        });
        this.setState({
          finalStudentList: response.data.data,
          allFinalStudentList: response.data.data,
          dataReady: true,
          loading: false,
          tableUpdating: false,
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

  validation = (isSubmit) => {
    let returnValue = true;
    let { fieldErrors, finalStudentList } = this.state;
    let alertData = "";
    fieldErrors = {};
    let duplicate_rfid = [];
    let return_result = [];
    finalStudentList.map((parent, pIndex) => {
      if (parent.machine_user_id && parent.checked) {
        finalStudentList.map((child, cIndex) => {
          if (
            parent["machine_user_id"] &&
            child["machine_user_id"] &&
            parent["machine_user_id"] == child["machine_user_id"] &&
            pIndex !== cIndex
          ) {
            if (
              duplicate_rfid.includes(child["machine_user_id"]) &&
              !fieldErrors[`machine_user_id_${pIndex}`]
            ) {
              fieldErrors[
                `machine_user_id_${pIndex}`
              ] = `Duplicate Found ${child.full_name}`;
              returnValue = false;
              alertData = "Clear duplicate error(s)";
            }
          }
        });
        if (parent["password"] && parent["password"].trim().length < 8) {
          fieldErrors[`password_${pIndex}`] = (
            <FormattedMessage {...commonMessages.passwordInvalidError} />
          );
          returnValue = false;
          alertData = "Clear duplicate error(s)";
        }
        duplicate_rfid.push(parent["machine_user_id"]);
        return_result.push({
          user_id: parent.user_id,
          machine_user_id: parent["machine_user_id"],
          first_name: parent?.["first_name"] ?? null,
          last_name: parent?.["last_name"] ?? null,
          machine_id: null,
        });
      }
    });
    if (return_result.length === 0 && isSubmit) {
      returnValue = false;
      alertData = "Select at least 1 student";
    }
    if (returnValue) {
      returnValue = return_result;
    }
    this.setState({
      fieldErrors,
      openError: !returnValue,
      alertData: alertData,
    });
    return returnValue;
  };

  submit = () => {
    let validate = this.validation(true);
    if (validate) {
      this.setState({ submitDisable: true });
      let url = POST_URL.machineusermapping.api;
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
    this.props.history.push({
      pathname: Actions.staff_bio_id.view.url,
    });
  };

  handleChange = (e, index) => {
    let { name, value } = e.target;
    let { finalStudentList, fieldErrors, tableUpdating } = this.state;
    finalStudentList[index][name] = value;
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

  handleImportCSV = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
      const { importCongiguration, finalStudentList } = this.state;
      const text = e.target.result;
      let rowDataTemp = this.convertCSVtoJSON(text);
      let finalTempList = [...finalStudentList];
      rowDataTemp.map((rowData, rowIndex) => {
        if (importCongiguration === "Direct") {
          finalTempList[rowIndex]["machine_user_id"] =
            rowData["machine_user_id"];
        } else {
          finalTempList.map((finalData) => {
            if (
              rowData[importCongiguration] === finalData[importCongiguration]
            ) {
              finalData["machine_user_id"] = rowData["machine_user_id"];
            }
          });
        }
      });
      this.setState({
        finalStudentList: finalTempList,
      });
    };
    reader.readAsText(file);
  };

  convertCSVtoJSON = (csv) => {
    const { importCongiguration } = this.state;
    var lines = csv.split("\n");
    var result = [];
    let isValue = false;
    var headers = lines[0].split(",");
    let importCongigurationR = importCongiguration + "\r";
    if (
      !headers.includes("machine_user_id") &&
      !headers.includes("machine_user_id\r")
    ) {
      this.setState({
        openError: true,
        alertData: "machine_user_id column is not available in the CSV file",
      });
      return [];
    } else if (
      importCongiguration !== "Direct" &&
      !headers.includes(importCongiguration) &&
      !headers.includes(importCongigurationR)
    ) {
      this.setState({
        openError: true,
        alertData: `${importCongiguration} column is not available in the CSV file`,
      });
      return [];
    }
    for (var i = 1; i < lines.length; i++) {
      var obj = {};
      var currentline = lines[i].split(",");
      isValue = false;
      for (var j = 0; j < headers.length; j++) {
        headers[j] = headers[j].replace("\r", "");
        if (currentline[j] !== "" && currentline[j] !== undefined) {
          currentline[j] = currentline[j].replace("\r", "");
          isValue = true;
        }
        obj[headers[j]] = currentline[j];
      }
      if (isValue) {
        result.push(obj);
      }
    }
    return result;
  };

  onChange = (e) => {
    const { name, value } = e.target;
    this.setState({
      [name]: value,
    });
  };

  handleClickShowPassword = () => {
    this.setState({
      showPassword: !this.state.showPassword,
    });
  };

  onBlurFieldValue = (e, index) => {
    let { name, value } = e.target;
    let { finalStudentList, fieldErrors, tableUpdating } = this.state;
    finalStudentList[index][name] = value;
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

  onChangeSelect = (index) => {
    let { finalStudentList } = this.state;
    finalStudentList[index]["checked"] = !finalStudentList[index]["checked"];
    let isAllSelected = true;
    finalStudentList.map((data) => {
      if (isAllSelected && !data["checked"]) {
        isAllSelected = false;
      }
    });
    this.setState({
      finalStudentList,
      selectAll: isAllSelected,
    });
  };

  onChangeSelectAll = () => {
    let { selectAll, finalStudentList } = this.state;
    selectAll = !selectAll;
    finalStudentList.map((data) => {
      data.checked = selectAll;
    });
    this.setState({
      finalStudentList,
      selectAll,
    });
  };

  render() {
    const {
      loading,
      showPassword,
      openError,
      alertData,
      searchStudent,
      finalStudentList,
      selectAll,
      fieldErrors,
      currentIndex,
      tableUpdating,
      submitDisable,
      importCongiguration,
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
                <Box className="heading">Staff Biometric Id's</Box>
              </Grid>
              <Grid item md={4} xs={12}>
                <Box className="header-align end-flex-prop">
                  {isUserHasPermission("staff_bio_id", "view") && (
                    <Button
                      variant="contained"
                      onClick={this.handleViewButton}
                      // component={Link} to={Actions.hostel_student_transaction_list.view.url}
                      className="editbutton-view"
                    >
                      <VisibilityOutlinedIcon className="visibility-icon" />{" "}
                      {Actions.staff_bio_id.view.label}
                    </Button>
                  )}
                </Box>
              </Grid>
            </Grid>
            {/* <Paper className="plain-paper-background pl-20 pt-20 pb-10 ">
              <div>
                <div className="d-flex align-items-center">
                  <Dropdown
                    data={IMPORT_CONFIGURATION_STAFF_LIST}
                    name="importCongiguration"
                    value={importCongiguration}
                    onChange={this.onChange}
                    label="Import Configuration"
                    error={fieldErrors.importCongiguration}
                    hideSelect={true}
                  />
                  {!importCongiguration ? (
                    <div className="staff-list-assigned-shift ml-20">
                      Select configuration to import
                    </div>
                  ) : (
                    <div className="ml-20">
                      <label htmlFor="upload-pic" className="">
                        <Button
                          variant="raised"
                          component="span"
                          className="custom-button profile-pic-button"
                        >
                          Import CSV
                        </Button>
                      </label>
                      <input
                        type="file"
                        id="upload-pic"
                        className="display-none"
                        onChange={(e) => this.handleImportCSV(e)}
                        onClick={(e) => (e.target.value = null)}
                      />
                    </div>
                  )}
                </div>
              </div>
              <Box className="no-feature-label">
                Note: Required column name(s) in csv file - <br />
                1. machine_user_id* <br />
                {importCongiguration !== "Direct"
                  ? importCongiguration
                    ? `2. ${importCongiguration}`
                    : ""
                  : ""}
              </Box>
            </Paper> */}
            <Paper className="paper-plain-background student-rfid-add pt-10 mt-20">
              <TextField
                id="outlined-name"
                value={searchStudent}
                placeholder=""
                label="Search Staff"
                name="searchStudent"
                onChange={(e) => {
                  this.handleFilter(e);
                }}
              />
              {!tableUpdating && (
                <table width="100%" className="selectable-row-table mt-20">
                  <thead className="table-select-hostel-thead">
                    <th className={`selectable-table-head`}>
                      <MenuItem
                        value={selectAll}
                        onClick={() => this.onChangeSelectAll()}
                        className="padding-0"
                      >
                        <Checkbox className="padding-0" checked={selectAll} />
                      </MenuItem>
                    </th>
                    <th className={`selectable-table-head`}> Staff Name </th>
                    <th className={`selectable-table-head`}> Mobile Num </th>
                    <th className={`selectable-table-head`}>
                      machine_user_id
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
                          <td className="pl-15">
                            <MenuItem
                              value={student.checked}
                              onClick={() => this.onChangeSelect(index)}
                              className="padding-0"
                            >
                              <Checkbox
                                color="secondary"
                                className="padding-0"
                                checked={student.checked}
                              />
                            </MenuItem>
                          </td>
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
                            {student.mobile_num}
                          </td>
                          {/* <td className={'textAlign pl-15 '}>
                                                        {student.admission_num}
                                                    </td> */}
                          <td className={"textAlign pl-15 "}>
                            <AddInputUserField
                              name="machine_user_id"
                              type="text"
                              fieldValue={student.machine_user_id}
                              currentIndex={currentIndex}
                              index={index}
                              onBlurFieldValue={this.onBlurFieldValue}
                              fieldError={
                                fieldErrors[`machine_user_id_${index}`]
                              }
                            />
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
          </Paper>
          <Box className="submt-button-float-bottom">
            <Button
              variant="contained"
              color="primary"
              className="submit"
              disabled={submitDisable}
              onClick={() => this.submit()}
            >
              submit
            </Button>
          </Box>
          <Snackbar
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            open={openError}
            autoHideDuration={10000}
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

export default withRouter(StaffBioMetricidAdd);
