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
  Tooltip,
  CircularProgress,
  Checkbox,
} from "@material-ui/core";
import CheckCircleOutlinedIcon from "@material-ui/icons/CheckCircleOutlined";

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
  DEFAULT_PAGINATION_PROPS_FIRST_NAME_LIST,
  IMPORT_CONFIGURATION_STUDENT_LIST,
  IMPORT_ADMISSION_CONFIGURATION_STUDENT_LIST,
} from "Constants";
import AddInputUserField from "Containers/Student/Components/AddInputUserField";
import commonMessages from "Constants/messages";
import { FormattedMessage } from "react-intl";
import { updateFormFields } from "Containers/Admin/FormDefinition/functions";
import { Forms } from "Constants/FormDefinition";
import { cloneDeep } from "lodash";
import HighlightOffIcon from "@material-ui/icons/HighlightOff";
import { maxFileSize, image_formats } from "Constants";
// Redux
import { createStructuredSelector } from "reselect";
import { connect } from "react-redux";
import { bindActionCreators } from "redux";
import { makeAdmissionFormList } from "Components/CommonComponent/selectors";
import { setAdmissionFormList } from "Components/CommonComponent/actions";
import { Camera } from "@material-ui/icons";
import CameraPopup from "Components/CameraPopup";
import BulkAddress from "./Components/BulkAddress";
import { pinCodeRegex } from "Constants/regularExpression";

const alias_names = JSON.parse(localStorage.getItem("alias_name"))
  ? JSON.parse(localStorage.getItem("alias_name"))
  : {};

const addressDetailsGlobal = [
  {
    label: <FormattedMessage {...commonMessages.address} />,
    regex: null,
    name: "address",
    md: 8,
    className: "width-600px",
    required: false,
    id: "outlined-textarea",
    default: "",
    rows: null,
    type: "text",
    maxLength: 100,
    view_className: "text-transform-none",
  },
  {
    label: <FormattedMessage {...commonMessages.pincode} />,
    regex: pinCodeRegex,
    name: "pincode",
    md: 4,
    className: "width-form-90",
    required: false,
    id: "outlined-textarea",
    default: "",
    rows: null,
    type: "text",
    maxLength: 6,
  },
  {
    label: <FormattedMessage {...commonMessages.country} />,
    regex: null,
    name: "country",
    md: 4,
    className: "width-form-90",
    required: false,
    id: "outlined-textarea",
    default: null,
    rows: null,
    type: "DropDownWithSearch",
    view_name: "country_name",
  },
  {
    label: <FormattedMessage {...commonMessages.state} />,
    regex: null,
    name: "state",
    md: 4,
    className: "width-form-90",
    parentRequired: "country",
    id: "outlined-textarea",
    default: null,
    rows: null,
    type: "DropDownWithSearch",
    required: false,
    view_name: "state_name",
  },
  {
    label: <FormattedMessage {...commonMessages.district} />,
    regex: null,
    name: "district",
    md: 4,
    className: "width-form-90",
    parentRequired: "state",
    id: "outlined-textarea",
    default: null,
    rows: null,
    type: "DropDownWithSearch",
    required: false,
    view_name: "district_name",
  },
  {
    label: <FormattedMessage {...commonMessages.city} />,
    regex: null,
    name: "city",
    md: 4,
    className: "width-form-90",
    parentRequired: "district",
    id: "outlined-textarea",
    default: null,
    rows: null,
    type: "DropDownWithSearch",
    required: false,
    view_name: "city_name",
  },
];

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
      tableUpdating: false,
      importCongiguration: "",
      pagination: { ...DEFAULT_PAGINATION_PROPS_FIRST_NAME_LIST },
      showPassword: false,
      selectAll: false,
      form_name: "student_bulk_update",
      forms: cloneDeep(Forms),
      enableUploadIcons: {},
      student_status: {},
      currentAddressDetails: cloneDeep(addressDetailsGlobal),
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
        this.getStudentList();
      }
    );
  };

  getFormDetails = () => {
    const { form_name } = this.state;
    let storedAdmissionFormList = this.props.getAdmissionFormList;
    if (!storedAdmissionFormList) {
      const url = GET_URL.formdefinition.api;
      const params = { form_name: form_name };
      getRequest(url, params, this.props).then((response) => {
        if (response && response.status === 200) {
          this.updateFields(response.data.data);
          this.props.setAdmissionFormList(response.data.data);
        }
      });
    } else {
      this.updateFields(storedAdmissionFormList);
    }
  };

  updateFields = (backendFieldsValue) => {
    let { form_details, forms, form_name } = this.state;
    let updated_form_details;
    if (backendFieldsValue.length !== 0) {
      updated_form_details = updateFormFields(
        forms,
        backendFieldsValue,
        form_name,
        "update_label"
      );
      updated_form_details.map((data) => {
        if (data["page_details"]["form_name"] === form_name) {
          form_details = data["page_details"]["sub_sections"];
        }
      });
    } else {
      forms.map((data) => {
        if (data["page_details"]["form_name"] === form_name) {
          form_details = data["page_details"]["sub_sections"];
        }
      });
    }
    this.setState({
      form_details,
    });
    this.getStudentList();
  };

  getStudentList = (paginationProps) => {
    let { pagination, selectedYear, selectedStandard } = this.state;
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
          data["father_name"] = data?.student_parent?.parent?.father_name;
          data["mother_name"] = data?.student_parent?.parent?.mother_name;
          data["f_mobile_num"] = data?.student_parent?.parent?.f_mobile_num;
          data["m_mobile_num"] = data?.student_parent?.parent?.m_mobile_num;
        });
        const studentListTemp = {
          user_list: [
            {
              user_id: 806,
              student: 802,
              admission_form_id: 694,
              admission_num: "adm691",
              admission_date: "2023-06-05",
              student_data: {
                id: 221,
                profile_pic: 1,
                dob: "2024-01-01",
              },
              student_details: {
                blood_group: "O+",
                id: 221,
              },
              student_parent: {
                id: 221,
                father_name: "kumarswamy",
                f_mobile_num: "f_mobile_num",
                f_profile_pic: 3,
                f_email: "amertican@gmail.com",
                mother_name: "asdfasf",
                m_profile_pic: 4,
              },
            },
            {
              user_id: 807,
              student: 803,
              admission_form_id: 695,
              admission_num: "adm692",
              admission_date: "2023-06-05",
              student_data: {
                id: 222,
                profile_pic: 2,
                dob: "2024-01-01",
              },
              student_details: {
                blood_group: "O+",
                id: 222,
              },
              student_parent: {
                id: 222,
                father_name: "kumarswamy",
                f_mobile_num: "f_mobile_num",
                f_profile_pic: 3,
                f_email: "amertican@gmail.com",
                mother_name: "asdfasf",
                m_profile_pic: 4,
              },
            },
            {
              user_id: 808,
              student: 804,
              admission_form_id: 695,
              admission_num: "adm692",
              admission_date: "2023-06-05",
              student_data: {
                id: 222,
                profile_pic: 2,
                dob: "2024-01-01",
              },
              student_details: {
                blood_group: "O+",
                id: 222,
              },
              student_parent: {
                id: 222,
                father_name: "kumarswamy",
                f_mobile_num: "f_mobile_num",
                f_profile_pic: 3,
                f_email: "amertican@gmail.com",
                mother_name: "asdfasf",
                m_profile_pic: 4,
              },
            },
          ],
        };
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
    let { fieldErrors, finalStudentList } = this.state;
    fieldErrors = {};
    let alertData = "";
    let return_result = [];
    let temp_details = {};
    finalStudentList.map((student, pIndex) => {
      if (student.modified) {
        temp_details = {
          user_id: student.user_id,
          student: student.id,
          admission_form_id: student["admission_form_id"],
          admission_date: student["admission_date"],
          student_data: {
            id: null,
            profile_pic: student?.student_pic?.id,
            dob: student?.dob ? dateFormat(student.dob, "YYYY-MM-DD") : null,
          },
          student_details: {
            id: null,
            blood_group: student?.blood_group,
          },
          student_parent: {
            id: null,
            father_name: student.father_name,
            f_mobile_num: student.f_mobile_num,
            f_profile_pic: student?.father_pic?.file,
            f_email: student?.father_email,
            mother_name: student?.mother_name,
            m_profile_pic: student?.mother_pic?.id,
          },
        };
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

  submit = (index) => {
    let validate = this.validation();
    let { student_status } = this.state;
    if (validate) {
      if (index != undefined) {
        if (!student_status[index]) {
          student_status[index] = { loading: true, success: false };
        } else {
          student_status[index]["loading"] = true;
          student_status[index]["success"] = false;
        }
      }
      this.setState(
        {
          submitDisable: true,
          student_status: cloneDeep(student_status),
        },
        () => {
          let url = POST_URL.updateuserdata.api;
          postRequest(url, validate, this.props).then((response) => {
            if (response && response.status === 200) {
            }
            if (index != undefined) {
              student_status[index]["loading"] = false;
              student_status[index]["success"] = true;
              this.setState({
                student_status,
              });
            }
          });
        }
      );
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
      pathname: Actions.student_bulk_update.view.url,
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
        this.submit(index);
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
        this.submit(index);
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
          if (isUserHasPermission("student_bulk_update", "create")) {
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
              if (isUserHasPermission("student_bulk_update", "create")) {
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
    if (
      finalStudentList[index]?.[name]?.trim() !== value.trim() ||
      !finalStudentList[index]?.[name]
    ) {
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
          this.submit(index);
        }
      );
    }
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

  handleChangeProfile = (event, index, name) => {
    let { finalStudentList } = this.state;
    if (event.target.files[0]) {
      let fileName = event.target.files[0]["name"];
      let file_extension = `${fileName.slice(
        (Math.max(0, fileName.lastIndexOf(".")) || Infinity) + 1
      )}`;
      let is_supported_types = true;
      is_supported_types = image_formats.type.includes(
        file_extension.toLowerCase()
      );
      if (
        event.target.files[0].size < maxFileSize.img.size &&
        is_supported_types
      ) {
        let post = new FormData();
        post.append("file", event.target.files[0]);
        const url = POST_URL.uploads.api;
        postRequest(url, post, this.props).then((response) => {
          if (response && response.status === 200) {
            finalStudentList[index][name] = {
              name: fileName,
              id: response.data.data.id,
              file: response.data.data.file,
            };
            finalStudentList[index]["modified"] = true;
            this.setState(
              {
                finalStudentList: cloneDeep(finalStudentList),
              },
              () => {
                this.submit(index);
              }
            );
          }
        });
      }
    }
  };

  handleLargePic = (index, name) => {
    const { finalStudentList } = this.state;
    this.setState({
      largeImagePreview: finalStudentList[index][name]["file"],
    });
  };

  handleRemovePic = (index, name) => {
    let { finalStudentList } = this.state;
    delete finalStudentList[index][name];
    this.setState({
      finalStudentList,
    });
  };

  handleCloseLargeImage = () => {
    this.setState({
      largeImagePreview: "",
    });
  };

  updateCurrentAddress = (addressInf) => {
    let fieldDetail = cloneDeep(addressDetailsGlobal);
    let value;
    fieldDetail.forEach((field) => {
      if (addressInf) {
        value = addressInf[field["name"]];
        // student.currentAddress = addressInf;
      } else {
        value = field.default;
        // student.currentAddress[field["name"]] = value;
      }
      field.default = value;
    });
    this.setState({
      // student,
      currentAddressDetails: fieldDetail,
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
      enableUploadIcons,
      largeImagePreview,
      student_status,
      currentAddressDetails,
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
          {largeImagePreview && (
            <Box className="set-question-large-image-preview-box">
              <img
                src={largeImagePreview}
                alt="Image Preview"
                className="set-question-large-image-preview"
              />
              <Tooltip title="Close Image" placement="top-start">
                <Box
                  className="set-question-large-image-remove-icon-box"
                  onClick={this.handleCloseLargeImage}
                >
                  <HighlightOffIcon className="set-question-large-image-remove-icon" />
                </Box>
              </Tooltip>
            </Box>
          )}
          <Paper className="paper-background m-b-60px">
            <Grid container>
              <Grid item md={8} xs={12} className="header-align">
                <Box className="heading">
                  {Actions.student_bulk_update.update.label}
                </Box>
              </Grid>
              <Grid item md={4} xs={12}>
                <Box className="header-align end-flex-prop">
                  {isUserHasPermission("student_bulk_update", "view") && (
                    <Button
                      variant="contained"
                      onClick={this.handleViewButton}
                      className="editbutton-view"
                    >
                      <VisibilityOutlinedIcon className="visibility-icon" />{" "}
                      {Actions.student_bulk_update.view.label}
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
            <Paper className="p-10 student-rfid-add pt-10">
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
                <div style={{ width: "100%", overflow: "auto" }}>
                  <table
                    className="selectable-row-table mt-20"
                    style={{ width: "max-content" }}
                  >
                    <thead className="table-select-hostel-thead">
                      {/* <th className={`selectable-table-head`}>
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
                      </th> */}
                      <th className={``}></th>
                      <th className={`selectable-table-head`}>Student Name</th>
                      <th className={`selectable-table-head`}> DOB </th>
                      <th className={`selectable-table-head`}>Mobile Number</th>
                      <th className={`selectable-table-head`}> Father Name </th>
                      <th className={`selectable-table-head`}>Father Number</th>
                      <th className={`selectable-table-head`}> Mother Name </th>
                      <th className={`selectable-table-head`}>Mother Number</th>
                      <th className={`selectable-table-head`}>
                        Student Profile
                      </th>
                      <th className={`selectable-table-head`}>
                        Father Profile
                      </th>
                      <th className={`selectable-table-head`}>
                        Mother Profile
                      </th>
                      <th className={`selectable-table-head`}>
                        Address Line 1
                      </th>
                      <th className={`selectable-table-head`}>Pincode</th>
                      <th className={`selectable-table-head`}>Country</th>
                      <th className={`selectable-table-head`}>State</th>
                      <th className={`selectable-table-head`}>District</th>
                      <th className={`selectable-table-head`}>City</th>
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
                            <td className={"textAlign pl-15 "}>
                              {student_status[index]?.["loading"] ? (
                                <div>
                                  <CircularProgress className="height-width-25px" />
                                </div>
                              ) : student_status[index]?.["success"] ? (
                                <div>
                                  <CheckCircleOutlinedIcon className="height-width-25px text-green" />
                                </div>
                              ) : (
                                <div className="height-width-25px"></div>
                              )}
                            </td>
                            <td
                              className={
                                student_status[index]?.["loading"]
                                  ? "textAlign pl-15 opacity-0-5 pointer-event-none"
                                  : "textAlign pl-15 "
                              }
                            >
                              {student.full_name}
                            </td>
                            <td
                              className={
                                student_status[index]?.["loading"]
                                  ? "textAlign pl-15 opacity-0-5 pointer-event-none"
                                  : "textAlign pl-15 "
                              }
                            >
                              <AddInputUserField
                                name="dob"
                                type="date"
                                fieldValue={student.dob}
                                currentIndex={currentIndex}
                                index={index}
                                onBlurDateFieldValue={this.onBlurDateFieldValue}
                                fieldError={fieldErrors[`dob_${index}`]}
                              />
                            </td>
                            <td
                              className={
                                student_status[index]?.["loading"]
                                  ? "textAlign pl-15 opacity-0-5 pointer-event-none"
                                  : "textAlign pl-15 "
                              }
                            >
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
                            <td
                              className={
                                student_status[index]?.["loading"]
                                  ? "textAlign pl-15 opacity-0-5 pointer-event-none"
                                  : "textAlign pl-15 "
                              }
                            >
                              <AddInputUserField
                                name="father_name"
                                type="text"
                                fieldValue={student.father_name}
                                currentIndex={currentIndex}
                                index={index}
                                onBlurFieldValue={this.onBlurFieldValue}
                                fieldError={fieldErrors[`father_name_${index}`]}
                              />
                            </td>
                            <td
                              className={
                                student_status[index]?.["loading"]
                                  ? "textAlign pl-15 opacity-0-5 pointer-event-none"
                                  : "textAlign pl-15 "
                              }
                            >
                              <AddInputUserField
                                name="f_mobile_num"
                                type="text"
                                fieldValue={student.f_mobile_num}
                                currentIndex={currentIndex}
                                index={index}
                                onBlurFieldValue={this.onBlurFieldValue}
                                fieldError={
                                  fieldErrors[`f_mobile_num_${index}`]
                                }
                              />
                            </td>
                            <td
                              className={
                                student_status[index]?.["loading"]
                                  ? "textAlign pl-15 opacity-0-5 pointer-event-none"
                                  : "textAlign pl-15 "
                              }
                            >
                              <AddInputUserField
                                name="mother_name"
                                type="text"
                                fieldValue={student.mother_name}
                                currentIndex={currentIndex}
                                index={index}
                                onBlurFieldValue={this.onBlurFieldValue}
                                fieldError={fieldErrors[`mother_name_${index}`]}
                              />
                            </td>
                            <td
                              className={
                                student_status[index]?.["loading"]
                                  ? "textAlign pl-15 opacity-0-5 pointer-event-none"
                                  : "textAlign pl-15 "
                              }
                            >
                              <AddInputUserField
                                name="mother_mobile"
                                type="text"
                                fieldValue={student.mother_mobile}
                                currentIndex={currentIndex}
                                index={index}
                                onBlurFieldValue={this.onBlurFieldValue}
                                fieldError={
                                  fieldErrors[`mother_mobile_${index}`]
                                }
                              />
                            </td>
                            <td
                              className={
                                student_status[index]?.["loading"]
                                  ? "textAlign pl-15 opacity-0-5 pointer-event-none"
                                  : "textAlign pl-15 "
                              }
                            >
                              {!student?.student_pic?.file && (
                                <label htmlFor={`student_pic${index}`}>
                                  <Camera onClick={this.handleCamera} />
                                </label>
                              )}
                              <input
                                type="file"
                                id={`student_pic${index}`}
                                className="display-none"
                                onChange={(e) =>
                                  this.handleChangeProfile(
                                    e,
                                    index,
                                    "student_pic"
                                  )
                                }
                                onClick={(e) => (e.target.value = null)}
                              />
                              {student?.student_pic?.file && (
                                <div className="d-flex">
                                  <div>
                                    <img
                                      src={student.student_pic.file}
                                      className="height-width-25px pointer"
                                      onClick={() =>
                                        this.handleLargePic(
                                          index,
                                          "student_pic"
                                        )
                                      }
                                    />
                                  </div>
                                  <div className="ml-15">
                                    <HighlightOffIcon
                                      className="text-red"
                                      onClick={() =>
                                        this.handleRemovePic(
                                          index,
                                          "student_pic"
                                        )
                                      }
                                    />
                                  </div>
                                </div>
                              )}
                            </td>
                            <td
                              className={
                                student_status[index]?.["loading"]
                                  ? "textAlign pl-15 opacity-0-5 pointer-event-none"
                                  : "textAlign pl-15 "
                              }
                            >
                              {!student?.father_pic?.file && (
                                <label htmlFor={`father_pic${index}`}>
                                  <Camera onClick={this.handleCamera} />
                                </label>
                              )}
                              <input
                                type="file"
                                id={`father_pic${index}`}
                                className="display-none"
                                onChange={(e) =>
                                  this.handleChangeProfile(
                                    e,
                                    index,
                                    "father_pic"
                                  )
                                }
                                onClick={(e) => (e.target.value = null)}
                              />
                              {student?.father_pic?.file && (
                                <div className="d-flex">
                                  <div>
                                    <img
                                      src={student.father_pic.file}
                                      className="height-width-25px pointer"
                                      onClick={() =>
                                        this.handleLargePic(index, "father_pic")
                                      }
                                    />
                                  </div>
                                  <div className="ml-15">
                                    <HighlightOffIcon
                                      className="text-red"
                                      onClick={() =>
                                        this.handleRemovePic(
                                          index,
                                          "father_pic"
                                        )
                                      }
                                    />
                                  </div>
                                </div>
                              )}
                              {enableUploadIcons["fatherLoading"] && (
                                <Box className="upload-profile-loading">
                                  <CircularProgress />
                                </Box>
                              )}
                            </td>
                            <td
                              className={
                                student_status[index]?.["loading"]
                                  ? "textAlign pl-15 opacity-0-5 pointer-event-none"
                                  : "textAlign pl-15 "
                              }
                            >
                              {!student?.mother_pic?.file && (
                                <label htmlFor={`mother_pic${index}`}>
                                  <Camera onClick={this.handleCamera} />
                                </label>
                              )}
                              <input
                                type="file"
                                id={`mother_pic${index}`}
                                className="display-none"
                                onChange={(e) =>
                                  this.handleChangeProfile(
                                    e,
                                    index,
                                    "mother_pic"
                                  )
                                }
                                onClick={(e) => (e.target.value = null)}
                              />
                              {student?.mother_pic?.file && (
                                <div className="d-flex">
                                  <div>
                                    <img
                                      src={student.mother_pic.file}
                                      className="height-width-25px pointer"
                                      onClick={() =>
                                        this.handleLargePic(index, "mother_pic")
                                      }
                                    />
                                  </div>
                                  <div className="ml-15">
                                    <HighlightOffIcon
                                      className="text-red"
                                      onClick={() =>
                                        this.handleRemovePic(
                                          index,
                                          "mother_pic"
                                        )
                                      }
                                    />
                                  </div>
                                </div>
                              )}
                              {enableUploadIcons["fatherLoading"] && (
                                <Box className="upload-profile-loading">
                                  <CircularProgress />
                                </Box>
                              )}
                            </td>
                            {
                              <BulkAddress
                                addressDetails={currentAddressDetails}
                                student_status={student_status}
                                updateParentAddress={this.updateCurrentAddress}
                              />
                            }
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
                </div>
              )}
            </Paper>
          </Paper>
          {/* <Box className="submt-button-float-bottom">
            <Button
              variant="contained"
              color="primary"
              className="submit"
              disabled={submitDisable}
              onClick={() => this.submit()}
            >
              submit
            </Button>
          </Box> */}
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

const mapStateToProps = createStructuredSelector({
  getAdmissionFormList: makeAdmissionFormList(),
});
function mapDispatchToProps(dispatch) {
  return bindActionCreators({ setAdmissionFormList }, dispatch);
}
export default withRouter(
  connect(mapStateToProps, mapDispatchToProps)(StudentUserNameAdd)
);
