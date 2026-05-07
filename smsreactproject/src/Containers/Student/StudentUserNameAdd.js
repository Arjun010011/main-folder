import React, { Component } from "react";
import Swal from "sweetalert2";
import { withRouter } from "react-router-dom";
import {
  Paper,
  Box,
  Grid,
  Button,
  TextField,
  MenuItem,
  Checkbox,
} from "@material-ui/core";
import {phoneRegex, emailRegex} from "Constants/regularExpression";
import VisibilityOutlinedIcon from "@material-ui/icons/VisibilityOutlined";
import Snackbar from "@material-ui/core/Snackbar";
import { Dropdown } from "Components/DropDown";
import loadingBar from "images/loading.gif";
import { getRequest, postRequest } from "Includes/api/apicall";
import { GET_URL, POST_URL } from "Includes/urls";
import {
  dateFormat,
  getUrlParam,
  Alert,
  isUserHasPermission,
  getFullName,
  getPaginationProps,
} from "Includes/functions";
import { Actions } from "Constants/permissions";
import {
  DEFAULT_PAGINATION_PROPS_USERNAME_LIST,
  IMPORT_CONFIGURATION_STUDENT_LIST,
  IMPORT_ADMISSION_CONFIGURATION_STUDENT_LIST,
} from "Constants";
import AddInputUserField from "Containers/Student/Components/AddInputUserField";
import commonMessages from "Constants/messages";
import { FormattedMessage } from "react-intl";

const alias_names = JSON.parse(localStorage.getItem("alias_name"))
  ? JSON.parse(localStorage.getItem("alias_name"))
  : {};

class StudentUserNameAdd extends Component {
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
      groupList:[],
      selected_group:0,
      tableUpdating: false,
      importCongiguration: "",
      pagination: { ...DEFAULT_PAGINATION_PROPS_USERNAME_LIST },
      showPassword: false,
      selectAll: false,
      is_academic_newstudent:'',
      pathname: "student_username_list",
    };
    this.selectStudentRef = React.createRef();
  }

  componentDidMount = () => {
    let { standard, year, year_name, standard_name, is_academic_newstudent} = getUrlParam();
    let { pathname } = this.state;
    if (
      this.props.location.pathname === Actions.student_admission_list.create.url
    ) {
      pathname = "student_admission_list";
    }
    this.getGroupList();
    this.setState(
      {
        selectedStandard: standard,
        selectedYear: year,
        yearName: year_name,
        standardName: standard_name,
        pathname,
        is_academic_newstudent:is_academic_newstudent,
      },
      () => {
        this.getStudentList();
      }
    );
  };

  getGroupList = () => {
      let { groupList } = this.state;
      const params = { is_active: true };
      getRequest(GET_URL.getstudentgroups.api, params).then(
        (response) => {
          if (response && response.status === 200) {
            this.setState({
              groupList: response.data.data,
            });
          }
        }
      );
    };

  getStudentList = (paginationProps) => {
    let { pagination, selectedYear, selectedStandard,is_academic_newstudent } = this.state;
    this.setState({ tableUpdating: true });
    this.currentPagination = pagination;
    if (paginationProps) {
      this.currentPagination = { ...paginationProps };
    }
    let pagination_params = getPaginationProps(this.currentPagination);
    let params = {
      ...pagination_params,
      student_academic_year: selectedYear,
      is_active: true,
      admission_num: true,
      is_academic_newstudent:is_academic_newstudent
    };
    if (selectedStandard && selectedStandard !== "all") {
      let temp = {};
      temp["current_standard"] = selectedStandard;
      params = { ...params, ...temp };
    }
    params["admission_history"] = true;
    const url = GET_URL.student.api;
    getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        const studentList = response.data;
        studentList.data.student_list.map((data) => {
          data["full_name"] = getFullName(
            data["first_name"],
            data["middle_name"],
            data["last_name"]
          );
          data["checked"] = false;
        });
        this.setState({
          finalStudentList: studentList.data.student_list,
          allFinalStudentList: studentList.data.student_list,
          tableUpdating: false,
          pagination: this.currentPagination,
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
    let { fieldErrors, finalStudentList, pathname, selectedYear,selectedStandard } = this.state;
    fieldErrors = {};
    let alertData = "";
    let duplicate_rfid = [];
    let duplicate_adm = [];
    let return_result = [];
    let temp_details = {};
    finalStudentList.map((parent, pIndex) => {
      if (
        (parent.username && parent.checked) ||
        (parent.admission_num && parent.checked)
      ) {
        if (parent.mobile_num) {
          const isValidMobile = phoneRegex.value.test(parent.mobile_num);
          if (!isValidMobile) {
              fieldErrors[`mobile_num_${pIndex}`] = "Invalid mobile number, must start with +91 and be 10 digits.";
              returnValue = false;
              alertData = "Invalid mobile number";
          }
      }
      if (parent.email) {
        const isValidEmail = emailRegex.value.test(parent.email);
        if (!isValidEmail) {
            fieldErrors[`email_${pIndex}`] = "Invalid email format.";
            returnValue = false;
            alertData = "Invalid email format";
        }
    }
        finalStudentList.map((child, cIndex) => {
          if (
            parent["username"] &&
            child["username"] &&
            parent["username"] == child["username"] &&
            pIndex !== cIndex
          ) {
            if (
              duplicate_rfid.includes(child["username"]) &&
              !fieldErrors[`rfid_${pIndex}`]
            ) {
              fieldErrors[
                `username_${pIndex}`
              ] = `Duplicate Found ${child.full_name}`;
              returnValue = false;
              alertData = "Clear duplicate error(s)";
            }
          }
          if (
            pathname === "student_admission_list" &&
            parent["admission_num"] &&
            child["admission_num"] &&
            parent["admission_num"] == child["admission_num"] &&
            pIndex !== cIndex
          ) {
            if (
              duplicate_adm.includes(child["admission_num"]) &&
              !fieldErrors[`admission_num_${pIndex}`]
            ) {
              fieldErrors[
                `admission_num_${pIndex}`
              ] = `Duplicate Found ${child.full_name}`;
              returnValue = false;
              alertData = "Clear duplicate error(s)";
            }
          }
        });
        // if (parent["password"] && parent["password"].trim().length < 8) {
        //   fieldErrors[`password_${pIndex}`] = (
        //     <FormattedMessage {...commonMessages.passwordInvalidError} />
        //   );
        //   returnValue = false;
        //   alertData = "Clear duplicate error(s)";
        // }
        duplicate_rfid.push(parent["username"]);
        duplicate_adm.push(parent["admission_num"]);
        temp_details = {
          user_id: parent.user_id,
          student: parent.id,
          admission_form_id: parent["admission_form_id"],
        };
        if (pathname === "student_username_list") {
          temp_details["username"] = parent["username"];
          temp_details["password"] = parent["password"];
          temp_details["mobile_num"] = parent["mobile_num"];
          temp_details["email"] = parent["email"];
        } else {
          temp_details["admission_num"] = parent["admission_num"];
          temp_details["admission_date"] = parent["admission_date"]
            ? dateFormat(parent["admission_date"], "YYYY-MM-DD")
            : parent["admission_date"];
          temp_details["current_student_group_name"]=parent["current_student_group_id"];
          temp_details["academic_year"]=parseInt(selectedYear);
          temp_details["standard"]=parseInt(selectedStandard);
          
          }
          temp_details['student_name'] = parent['full_name'];
          return_result.push(temp_details);
        }
    });
    if (return_result.length === 0) {
      returnValue = false;
      alertData = "Select at least 1 student";
    }
    if (returnValue) {
      returnValue = { user_list: return_result };
    }
    this.setState({
      fieldErrors,
      openError: !returnValue,
      alertData: alertData,
    });
    return returnValue;
  };

  submit = () => {
    let validate = this.validation();
    if (validate) {
      this.setState({ submitDisable: true });
      let url = POST_URL.updateuserdata.api;
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
    const { selectedYear, selectedStandard, selectedSection, pathname } =
      this.state;

    let searchState = { selectedYear, selectedStandard, selectedSection };

    let searchParam = "?" + new URLSearchParams(searchState).toString();
    this.props.history.push({
      pathname: Actions[pathname].view.url,
      search: searchParam,
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
          if (isUserHasPermission("student_username_list", "create")) {
            finalTempList[rowIndex]["username"] = rowData["username"];
            finalTempList[rowIndex]["password"] = rowData["password"];
          }
          if (isUserHasPermission("student_admission_list", "create")) {
            finalTempList[rowIndex]["admission_num"] = rowData["admission_num"];
          }
        } else {
          finalTempList.map((finalData) => {
            if (
              rowData[importCongiguration] === finalData[importCongiguration]
            ) {
              if (isUserHasPermission("student_username_list", "create")) {
                finalData["username"] = rowData["username"];
                finalData["password"] = rowData["password"];
              }
              if (isUserHasPermission("student_admission_list", "create")) {
                finalData["admission_num"] = rowData["admission_num"];
              }
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
    const { importCongiguration, pathname } = this.state;
    var lines = csv.split("\n");
    var result = [];
    let isValue = false;
    var headers = lines[0].split(",");
    let importCongigurationR = importCongiguration + "\r";
    let mandatory_name =
      pathname === "student_username_list" ? "username" : "admission_num";
    if (
      !headers.includes(mandatory_name) &&
      !headers.includes(`${mandatory_name}\r`)
    ) {
      this.setState({
        openError: true,
        alertData: `${mandatory_name} column is not available in the CSV file,`,
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

  onBlurDateFieldValue = (value, name, index) => {
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
      yearName,
      standardName,
      showPassword,
      openError,
      alertData,
      searchStudent,
      finalStudentList,
      fieldErrors,
      currentIndex,
      tableUpdating,
      submitDisable,
      importCongiguration,
      selectAll,
      pathname,
      groupList,
      selected_group,
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
                <Box className="heading">{Actions[pathname].create.label}</Box>
              </Grid>
              <Grid item md={4} xs={12}>
                <Box className="header-align end-flex-prop">
                  {isUserHasPermission(pathname, "view") && (
                    <Button
                      variant="contained"
                      onClick={this.handleViewButton}
                      className="editbutton-view"
                    >
                      <VisibilityOutlinedIcon className="visibility-icon" />{" "}
                      {Actions[pathname].view.label}
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
              </Box>
            </Box>
            <Paper className="plain-paper-background pl-20 pt-20  ">
              <div>
                <div className="d-flex align-items-center">
                  <Dropdown
                    data={
                      pathname === "student_username_list"
                        ? IMPORT_CONFIGURATION_STUDENT_LIST
                        : IMPORT_ADMISSION_CONFIGURATION_STUDENT_LIST
                    }
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
              {pathname === "student_username_list" ? (
                <Box className="no-feature-label">
                  Note: Required column name(s) in csv file - <br />
                  1. username* <br />
                  2. password <br />
                  {importCongiguration !== "Direct"
                    ? importCongiguration
                      ? `3. ${importCongiguration}`
                      : ""
                    : ""}
                </Box>
              ) : (
                <Box className="no-feature-label">
                  Note: Required column name(s) in csv file - <br />
                  1. admission_num* <br />
                  {importCongiguration !== "Direct"
                    ? importCongiguration
                      ? `3. ${importCongiguration}`
                      : ""
                    : ""}
                </Box>
              )}
            </Paper>
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
                      <MenuItem
                        value={selectAll}
                        onClick={() => this.onChangeSelectAll()}
                        className="padding-0"
                      >
                        <Checkbox
                          className="padding-0"
                          color="secondary"
                          checked={selectAll}
                        />
                      </MenuItem>
                    </th>
                    <th className={`selectable-table-head`}> Student Name </th>
                    <th className={`selectable-table-head`}> DOB </th>
                    <th className={`selectable-table-head`}> Admission No. </th>
                    <th className={`selectable-table-head`}>
                      {" "}
                      Admission Date{" "}
                    </th>
                    <th className={`selectable-table-head`}> Student Group </th>
                    <th className={`selectable-table-head`}> Username </th>
                    {isUserHasPermission("student_username_list", "create") && (
                      <th className={`selectable-table-head`}> Password </th>
                    )}
                    <th className={`selectable-table-head`}> Mobile Number </th>
                    <th className={`selectable-table-head`}> Email  </th>
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
                                className="padding-0"
                                color="secondary"
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
                            {student.dob
                              ? dateFormat(student.dob, "DD-MM-YYYY")
                              : ""}
                          </td>
                          {pathname === "student_admission_list" &&
                          isUserHasPermission(
                            "student_admission_list",
                            "create"
                          ) ? (
                            <td className={"textAlign pl-15 "}>
                              <AddInputUserField
                                name="admission_num"
                                type="text"
                                fieldValue={student.admission_num}
                                currentIndex={currentIndex}
                                index={index}
                                onBlurFieldValue={this.onBlurFieldValue}
                                fieldError={
                                  fieldErrors[`admission_num_${index}`]
                                }
                              />
                            </td>
                          ) : (
                            <td className={"textAlign pl-15 "}>
                              {student.admission_num}
                            </td>
                          )}
                          {pathname === "student_admission_list" &&
                          isUserHasPermission(
                            "student_admission_list",
                            "create"
                          ) ? (
                            <td className={"textAlign pl-15 "}>
                              <AddInputUserField
                                name="admission_date"
                                type="date"
                                fieldValue={student.admission_date}
                                currentIndex={currentIndex}
                                index={index}
                                onBlurDateFieldValue={this.onBlurDateFieldValue}
                                fieldError={
                                  fieldErrors[`admission_date_${index}`]
                                }
                              />
                            </td>
                          ) : (
                            <td className={"textAlign pl-15 "}>
                              {student.admission_date}
                            </td>
                          )}
                          {pathname === "student_admission_list" &&
                            isUserHasPermission(
                              "student_admission_list",
                              "create"
                            ) ? (
                            <td className={"textAlign pl-15 "}>
                              <Dropdown
                              data={groupList}
                              name="current_student_group_id"
                              value={student.current_student_group_id}
                              currentIndex={currentIndex}
                              index={index}
                              onChange={(e) => this.onBlurFieldValue(e,index)}
                              fieldError={fieldErrors[`student_group_${index}`]}
                            />
                            </td>
                          ) : (
                            <td className={"textAlign pl-15 "}>
                              {student.current_student_group_id}
                            </td>
                          )}
                          {pathname === "student_username_list" &&
                          isUserHasPermission(
                            "student_username_list",
                            "create"
                          ) ? (
                            <td className={"textAlign pl-15 "}>
                              <AddInputUserField
                                name="username"
                                type="text"
                                fieldValue={student.username}
                                currentIndex={currentIndex}
                                index={index}
                                onBlurFieldValue={this.onBlurFieldValue}
                                fieldError={fieldErrors[`username_${index}`]}
                              />
                            </td>
                          ) : (
                            <td className={"textAlign pl-15 "}>
                              {student.username}
                            </td>
                          )}
                          {pathname === "student_username_list" &&
                            isUserHasPermission(
                              "student_username_list",
                              "create"
                            ) && (
                              <td className={"textAlign pl-15 "}>
                                <AddInputUserField
                                  name="password"
                                  type="password"
                                  fieldValue={student.password}
                                  currentIndex={currentIndex}
                                  index={index}
                                  onBlurFieldValue={this.onBlurFieldValue}
                                  fieldError={fieldErrors[`password_${index}`]}
                                  showPassword={showPassword}
                                  handleClickShowPassword={
                                    this.handleClickShowPassword
                                  }
                                />
                              </td>
                            )}
                          {pathname === "student_username_list" &&
                            isUserHasPermission(
                              "student_username_list",
                              "create"
                            ) ? (
                            <td className={"textAlign pl-15 "}>
                              <AddInputUserField
                                name="mobile_num"
                                type="text"
                                fieldValue={student.mobile_num}
                                currentIndex={currentIndex}
                                index={index}
                                onBlurFieldValue={this.onBlurFieldValue}
                                fieldError={fieldErrors[`mobile_num_${index}`]}
                              />
                            </td>
                          ) : (
                            <td className={"textAlign pl-15 "}>
                              {student.mobile_num}
                            </td>
                          )}
                          {pathname === "student_username_list" &&
                            isUserHasPermission(
                              "student_username_list",
                              "create"
                            ) ? (
                            <td className={"textAlign pl-15 "}>
                              <AddInputUserField
                                name="email"
                                type="text"
                                fieldValue={student.email}
                                currentIndex={currentIndex}
                                index={index}
                                onBlurFieldValue={this.onBlurFieldValue}
                                fieldError={fieldErrors[`email_${index}`]}
                              />
                            </td>
                          ) : (
                            <td className={"textAlign pl-15 "}>
                              {student.email}
                            </td>
                          )}
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

export default withRouter(StudentUserNameAdd);
