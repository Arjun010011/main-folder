import React, { Component } from "react";
import Swal from "sweetalert2";
import { withRouter } from "react-router-dom";
import {
  Paper,
  Box,
  Grid,
  Button,
  TextareaAutosize,
  MenuItem,
  FormControlLabel,
  TextField,
  FormControl,
  FormHelperText,
  CircularProgress,
  Tooltip,
  Typography,
} from "@material-ui/core";
import VisibilityOutlinedIcon from "@material-ui/icons/VisibilityOutlined";
import { Link } from "react-router-dom";
import { printPDF } from "Includes/functions";
import {
  MuiPickersUtilsProvider,
  KeyboardDatePicker,
} from "@material-ui/pickers";
import DateFnsUtils from "@date-io/date-fns";
import HighlightOffIcon from "@material-ui/icons/HighlightOff";
import DeleteIcon from "@material-ui/icons/Delete";
import ListItemText from "@material-ui/core/ListItemText";
import PersonAddSharpIcon from "@material-ui/icons/PersonAddSharp";
import EditTwoToneIcon from "@material-ui/icons/EditTwoTone";
import Snackbar from "@material-ui/core/Snackbar";
import moment from "moment";
import commonMessages from "Constants/messages";
import { FormattedMessage } from "react-intl";
import SelectStudent from "Containers/Miscellaneous/SelectStudent";
import PaymentModal from "Components/PaymentModalNew";
import Checkbox from "@material-ui/core/Checkbox";
import { cloneDeep } from "lodash";

import AddTokenExpense from "Containers/Expenses/Components/AddTokenExpense";
import BlankPagewithIcon from "Components/BlankPageWithIcon";
import { DropDownWithSearch } from "Components/DropDownWithSearch";
import loadingBar from "images/loading.gif";
import { maxFileSize } from "Constants";
import {
  supported_receipts,
  image_formats,
} from "Containers/Expenses/Constants";
import { Dropdown } from "Components/DropDown";
import { Divider } from "@material-ui/core";
import {
  gstinNumberRegex,
  amountRegexWithDecimals,
} from "Constants/regularExpression";
import {
  getRequest,
  putRequest,
  postRequest,
  deleteRequest,
} from "Includes/api/apicall";
import { GET_URL, PUT_URL, POST_URL, DEL_URL } from "Includes/urls";
import {
  getUrlParam,
  getKeyValueMap,
  dateFormat,
  validateDate,
  Alert,
  isUserHasPermission,
  NumberFormatCustom,
  numberWithCommas,
} from "Includes/functions";
import "./styles.scss";
import { Actions } from "Constants/permissions";
import Skeleton from "@material-ui/lab/Skeleton";
import { isFormDefinitionEnabled } from "Includes/CheckFormDefinition";
import { getFormDefiniationNames } from "Containers/Admin/FormDefinition/functions";

class CollectionMiscellaneousAmountNew extends Component {
  constructor(props) {
    super(props);

    this.state = {
      submitDisable: false,
      expenses: {
        receipt_preview: "",
        selectedExpenses: null,
        is_token: false,
      },
      fieldErrors: {},
      miscTypeList: [],
      helperText: {},
      imagesPreview: [],
      imageUploading: false,
      largeImagePreview: "",
      loading: true,
      maximumAmount: "",
      enableUploadIcons: true,
      isEnable: {},
      upload_name: "Upload Receipt",
      openError: false,
      alertData: "Please clear the errors",
      expenseDetails: {},
      isEdit: false,
      submitDisable: false,
      pageLoading: false,
      isBlankPage: true,
      loadingVehicles: false,
      collectingBy: [
        { id: 1, name: "Student" },
        { id: 2, name: "Guest" },
        { id: 3, name: "Staff" },
      ],
      collectedby: 1,
      studentName: "",
      regNumber: "",
      miscellaneous: { is_student_delete: false, date: new Date() },
      isStudent: false,
      student_details: {},
      isStudyCertificateIssued: false,
      standardList: [],
      isTCType: false,
      loadingStandard: false,
      isOpenPaymentModal: false,
      paymentDetails: {},
      guestStandardList: [],
      staffList: [],
      selectedStaff: null,
    };
  }

  componentDidMount = () => {
    let { year, yearName, fromDate, toDate } = getUrlParam();
    if (year && yearName && fromDate && toDate) {
      var SpecialTo = moment(toDate, "YYYY/MM/DD");
      if (moment() > SpecialTo) {
        toDate = new Date();
      }
      this.setState({
        year: year,
        yearName: yearName,
        fromDate: fromDate,
        toDate: toDate,
      });
      this.getmiscTypeList(year);
      this.getStandardList();
      this.getStaffList();
      getFormDefiniationNames("misc_configuration", true);
    } else {
      this.props.history.push(Actions.miscellaneous_collection.view.url);
    }
  };

  getStaffList = () => {
    const url = GET_URL.staff.api;
    const params = { is_active: true };

    getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        const staffList = (response.data.data || [])
          .filter((staff) => staff && staff.id && staff.full_name) // ✅ filter invalid entries
          .map((staff) => ({
            id: staff.id,
            name: staff.full_name
          }));

        this.setState({ staffList });
      }
    });
  };

  getStandardList = () => {
    const url = GET_URL.standard.api;
    const params = { is_active: true, miscellaneous_standard: 1 };
    getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        this.setState({
          guestStandardList: response.data.data,
        });
      }
    });
  };

  getmiscTypeList = (year) => {
    let url = GET_URL.miscplan.api;
    let params = { is_active: true, academic_year: year };
    getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        this.setState({
          miscTypeList: response.data.data,
          loading: false,
        });
      }
    });
  };

  handleSearchChange = (e) => {
    let { miscellaneous, fieldErrors } = this.state;
    let { name, value } = e.target;
    miscellaneous[name] = value;
    delete fieldErrors[name];
    if (name == 'amount') {
      if (miscellaneous['tax']) {
        miscellaneous['total_amount'] = parseFloat(miscellaneous['tax']) + parseFloat(value)
      }
      else {
        miscellaneous['total_amount'] = parseFloat(miscellaneous['amount']);
      }
    }
    if (name == 'tax') {
      if (miscellaneous['amount']) {
        miscellaneous['total_amount'] = parseFloat(miscellaneous['tax']) + parseFloat(miscellaneous['amount'])
      }
      else {
        miscellaneous['total_amount'] = parseFloat(miscellaneous['tax'])
      }
    }
    this.setState({
      miscellaneous,
      fieldErrors,
    });
  };

  handleDropDownSearchChange = (e, newValue) => {
    let { miscellaneous, fieldErrors, isEnable, isTCType, studentID } =
      this.state;
    isEnable["selectedMisc"] = true;
    delete fieldErrors["selectedMisc"];
    miscellaneous["selectedMisc"] = newValue;
    miscellaneous.amount = newValue.amount;
    miscellaneous.total_amount = newValue.amount;
    miscellaneous["tcStandard"] = "";
    this.setState(
      {
        miscellaneous,
        fieldErrors,
        isEnable,
        isBlankPage: false,
        isTCType: newValue["misc_code_name"] === "tc" ? true : false,
        isStudyCertificateIssued: false, // Reset when misc type changes
      },
      () => {
        if (isTCType && studentID) {
          this.getStandard();
        }
      }
    );
  };

  handleDropDownStandard = (name, newValue) => {
    let { miscellaneous, fieldErrors } = this.state;
    delete fieldErrors[name];
    miscellaneous[name] = newValue;
    this.setState({
      miscellaneous,
      fieldErrors,
    });
  };

  handleDropDownChange = (e, newValue, name) => {
    let { expenses, fieldErrors } = this.state;
    delete fieldErrors[name];
    expenses[name] = newValue;
    this.setState({
      expenses,
      fieldErrors,
    });
  };

  handleCloseLargeImage = () => {
    this.setState({
      largeImagePreview: "",
    });
  };

  validation = () => {
    let { collectedby, fromDate, miscellaneous, studentID, isTCType, selectedStaff } =
      this.state;
    let returnValue = true;
    let alertData = "";
    let fieldErrors = {};
    let openError = false;
    if (collectedby === 1 && !studentID) {
      alertData = "Select Student";
      returnValue = false;
    } else if (collectedby === 2 && !miscellaneous.guestName) {
      alertData = alertData ? "Clear Errors" : "Enter Guest Name";
      fieldErrors["guestName"] = "This field is mandatory";
      returnValue = false;
    } else if (collectedby === 3 && !selectedStaff) {
      alertData = "Select Staff";
      fieldErrors["selectedStaff"] = "This field is mandatory";
      returnValue = false;
    }
    if (isTCType && collectedby === 1 && !miscellaneous.tcStandard) {
      alertData = alertData ? "Clear Errors" : "Select TC Standard";
      fieldErrors["tcStandard"] = "This field is mandatory";
      returnValue = false;
    }
    if (collectedby === 2 && !miscellaneous.guestStandard && !isFormDefinitionEnabled('misc_configuration', 'guest_standard_non_mandatory', 1)) {
      alertData = alertData ? "Clear Errors" : "Select Standard";
      fieldErrors["guestStandard"] = "This field is mandatory";
      returnValue = false;
    }
    if (!miscellaneous.amount) {
      alertData = alertData ? "Clear Errors" : "Enter Guest Name";
      fieldErrors["amount"] = "This field is mandatory";
      returnValue = false;
    }
    if (!miscellaneous.date) {
      alertData = alertData ? "Clear Errors" : "Select Date";
      fieldErrors["date"] = (
        <FormattedMessage {...commonMessages.fieldMandatoryError} />
      );
      returnValue = false;
    } else if (miscellaneous.date) {
      // let error = validateDate(
      //   miscellaneous.date,
      //   fromDate,
      //   new Date()
      // );
      // if (error !== "") {
      //   fieldErrors["date"] = error;
      //   alertData = alertData ? "Clear Errors" : error;
      //   returnValue = false;
      // }
    }
    if (!returnValue) {
      openError = true;
    }
    this.setState({
      fieldErrors,
      openError,
      alertData,
    });
    return returnValue;
  };

  handleSubmitButton = () => {
    const { studentName, miscellaneous, collectedby } = this.state;
    let validate = this.validation();
    if (validate) {
      let paymentDetails = {
        student: collectedby === 1 ? studentName : miscellaneous.guestName,
        amount: miscellaneous?.total_amount,
      };
      this.setState({
        isOpenPaymentModal: true,
        paymentDetails,
      });
    }
  };

  submit = (payDetails) => {
    let {
      miscellaneous,
      collectedby,
      studentID,
      year,
      isTCType,
      studentName,
      studentStandard,
      selectedStaff
    } = this.state;
    this.setState({ submitDisable: true });
    let postData = {
      academic_year: year,
      misc_types: [
        {
          misc: miscellaneous.selectedMisc["id"],
          amount: miscellaneous["total_amount"],
          misc_type: miscellaneous.selectedMisc["misc_type_name"],
        },
      ],
      particulars: miscellaneous.comment,
      total_amount: miscellaneous["total_amount"],
      amount: miscellaneous['amount'],
      tax: miscellaneous['tax'],
      date: dateFormat(miscellaneous["date"], "YYYY-MM-DD"),
    };
    if (collectedby === 1) {
      postData["student"] = studentID;
      if (isTCType) {
        postData["is_student_delete"] = miscellaneous.is_student_delete;
        postData["standard"] = miscellaneous.tcStandard.standard;
      } else {
        postData["standard"] = studentStandard;
      }
    } else if (collectedby === 2) {
      postData["is_student_delete"] = false;
      postData["guest_name"] = miscellaneous.guestName;
      postData["standard"] = miscellaneous.guestStandard ? miscellaneous.guestStandard.id : null;
    } else if (collectedby === 3) {
      postData["is_student_delete"] = false;
      postData["staff"] = selectedStaff.id;
    }
    else {
      this.setState({
        openError: true,
        alertData: "student/staff/guest should be selected"
      });
      return false
    }
    postData.mode_of_payment = payDetails.paymentValue;
    postData.ref_number = payDetails.refNo;
    if (payDetails.bank_detail_id) {
      postData.bank_detail_id = payDetails.bank_detail_id;
    }
    postData.payment_note = payDetails.paymentNote;
    let name =
      collectedby === 1
        ? studentName
        : collectedby === 2
          ? miscellaneous.guestName
          : selectedStaff.name;
    postRequest(POST_URL.misc.api, postData, this.props).then((response) => {
      if (response && response.status === 200) {
        Swal.fire({
          position: "top-end",
          type: "success",
          title: "Your Data has been saved",
          showConfirmButton: false,
          timer: 1500,
        });
        let props = { ...this.props };
        props.title = `Fees collected for ${name}`;
        props.url = GET_URL.miscfeereciept.api + response.data.data.id + "/";
        printPDF(props);
        this.props.history.push(Actions.miscellaneous_collection.view.url);
      }
      this.setState({ submitDisable: false });
    });
  };

  handleClose = () => {
    this.setState({
      openError: false,
      alertImageData: "",
    });
  };

  onChangeCollectBy = (e) => {
    let { collectedby, miscellaneous, fieldErrors } = this.state;
    collectedby = e.target.value;
    miscellaneous.guestName = "";
    delete fieldErrors["guestName"];
    this.setState({
      collectedby,
      miscellaneous,
      studentName: "",
      regNumber: "",
      studentID: 0,
      fieldErrors,
      student_details: {},
      isStudyCertificateIssued: false,
    });
  };

  selectStudent = () => {
    let tempValue = true
    this.setState({
      isStudent: cloneDeep(tempValue),
    });
  };

  getStudentDetails = (student_details) => {
    const { isTCType } = this.state;
    this.setState(
      {
        studentName: student_details["studentName"],
        regNumber: student_details["regNumber"],
        isStudent: false,
        studentID: student_details["studentID"],
        studentStandard: student_details["studentStandard"],
        student_details,
        isStudyCertificateIssued: student_details["is_study_certificate_issued"] || false,
      },
      () => {
        if (isTCType) {
          this.getStandard();
        }
      }
    );
  };

  getStandard = () => {
    let { studentID, miscellaneous } = this.state;
    let standardList = [];
    this.setState({ loadingStandard: true });
    let url = GET_URL.getmystandard.api;
    let params = { is_active: true, tc_standards: 1, student: studentID };
    getRequest(url, params).then((response) => {
      if (response && response.status === 200) {
        standardList = response.data.data;
        miscellaneous.tcStandard = "";
        this.setState({
          standardList,
          miscellaneous,
          loadingStandard: false,
        });
      }
      this.setState({
        standardList,
        loadingStandard: false,
      });
    });
  };

  closeFeePaymentModal = () => {
    this.setState({
      isOpenPaymentModal: false,
    });
  };

  closeSelectStudent = () => {
    this.setState({
      isStudent: false,
    });
  };

  handleCheckChange = () => {
    let { miscellaneous } = this.state;
    miscellaneous["is_student_delete"] = !miscellaneous["is_student_delete"];
    this.setState({
      miscellaneous,
    });
  };

  handleDateSearchChange = (e) => {
    let { miscellaneous, fromDate, toDate, fieldErrors, helperText } =
      this.state;
    miscellaneous["date"] = e;
    delete fieldErrors["date"];
    helperText["date"] = "";
    fromDate = dateFormat(fromDate, "YYYY-MM-DD");
    toDate = dateFormat(new Date(), "YYYY-MM-DD");
    // let error = validateDate(e, fromDate, toDate);
    // if (error === "Invalid Date") helperText["date"] = error;
    // else if (error !== "") fieldErrors["date"] = error;
    this.setState({
      miscellaneous,
      fieldErrors,
    });
  };

  render() {
    const {
      yearName,
      loading,
      expenses,
      fieldErrors,
      miscTypeList,
      helperText,
      enableUploadIcons,
      vehicles,
      largeImagePreview,
      is_token_present,
      loadingVehicles,
      fromDate,
      toDate,
      isEnable,
      upload_name,
      openError,
      alertData,
      submitDisable,
      pageLoading,
      isBlankPage,
      collectingBy,
      student_details,
      collectedby,
      studentName,
      regNumber,
      miscellaneous,
      isStudent,
      standardList,
      isTCType,
      loadingStandard,
      isOpenPaymentModal,
      paymentDetails,
      guestStandardList,
      staffList,
      isStudyCertificateIssued,
      selectedStaff
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
                <Box className="heading">Create Miscellaneous</Box>
              </Grid>
              <Grid item md={4} xs={12}>
                <Box className="header-align end-flex-prop">
                  {isUserHasPermission("miscellaneous_collection", "view") && (
                    <Button
                      variant="contained"
                      component={Link}
                      to={Actions.miscellaneous_collection.view.url}
                      className="editbutton-view"
                    >
                      <VisibilityOutlinedIcon className="visibility-icon" />{" "}
                      {Actions.miscellaneous_collection.view.label}
                    </Button>
                  )}
                </Box>
              </Grid>
            </Grid>
            <Box className="md-down-justify-start md-up-justify-start mb-y-20">
              <Box className="year-std-box mr-40">
                <Box className="academic-std-head">
                  {" "}
                  <FormattedMessage {...commonMessages.academicYear} />
                </Box>
                <Box className=" exam-mark-add-heading-bg">{yearName}</Box>
              </Box>
            </Box>
            <Grid container>
              <Grid item md={3} xs={12}>
                <DropDownWithSearch
                  options={miscTypeList}
                  value={miscellaneous.selectedMisc}
                  onChange={(e, newValue) =>
                    this.handleDropDownSearchChange(e, newValue)
                  }
                  name="selectedMisc"
                  label="Miscellaneous Type"
                  optionValue="misc_type_name"
                  className="width-100"
                  helperText={
                    fieldErrors["selectedMisc"] && fieldErrors["selectedMisc"]
                  }
                  error={
                    fieldErrors["selectedMisc"] && fieldErrors["selectedMisc"]
                  }
                  hideClearIcon={true}
                />
              </Grid>
            </Grid>
            {isBlankPage && !pageLoading && (
              <Grid item md={12} className="header-align">
                <BlankPagewithIcon data="Select Miscellaneous Type" />
              </Grid>
            )}
            {pageLoading ||
              (loadingVehicles && (
                <Box className="loading">
                  <CircularProgress />
                </Box>
              ))}
            {!pageLoading && !isBlankPage && !loadingVehicles && (
              <Grid container spacing={2}>
                <Grid item md={8} xs={12}>
                  <Paper className="paper-plain-background header-align p-t-20px p-b-20px">
                    <Grid container spacing={2} className="header-align">
                      <Grid item md={6} xs={12}>
                        <Dropdown
                          data={collectingBy}
                          name="collectedby"
                          value={collectedby}
                          hideSelect={true}
                          required={true}
                          onChange={(e) => this.onChangeCollectBy(e)}
                          label="Collecting From"
                        />
                      </Grid>
                      {collectedby === 1 && (
                        <Grid item md={6} xs={12}>
                          <label>
                            {" "}
                            <FormattedMessage
                              {...commonMessages.selectStudent}
                            />
                            <Box className="student-select-icon">
                              <ListItemText
                                primary={
                                  Boolean(studentName)
                                    ? regNumber
                                      ? `${studentName} (${regNumber})`
                                      : studentName
                                    : ""
                                }
                              />
                              <Button onClick={() => this.selectStudent()}>
                                {studentName ? (
                                  <EditTwoToneIcon className="expense-individual-edit-icon" />
                                ) : (
                                  <PersonAddSharpIcon />
                                )}
                              </Button>
                            </Box>
                            <Divider />
                            {studentName && isStudyCertificateIssued && miscellaneous.selectedMisc && miscellaneous.selectedMisc.misc_code_name === 'sc' && (
                              <Box
                                style={{
                                  marginTop: "8px",
                                  padding: "8px 12px",
                                  backgroundColor: "#fff3cd",
                                  border: "1px solid #ffc107",
                                  borderRadius: "4px",
                                }}
                              >
                                <Typography
                                  style={{
                                    fontSize: "12px",
                                    color: "#856404",
                                    fontWeight: 500,
                                  }}
                                >
                                  Study certificate already issued
                                </Typography>
                              </Box>
                            )}
                          </label>
                        </Grid>
                      )}
                      {collectedby === 2 && (
                        <Grid item md={6} xs={12}>
                          <TextField
                            label={"Guest Name"}
                            required={true}
                            name="guestName"
                            value={miscellaneous.guestName}
                            inputProps={{ maxLength: "100" }}
                            className="width-form-90"
                            fullWidth={true}
                            variant="outlined"
                            helperText={
                              fieldErrors["guestName"] === ""
                                ? helperText["guestName"]
                                : fieldErrors["guestName"]
                            }
                            error={fieldErrors["guestName"]}
                            onChange={(e) => this.handleSearchChange(e)}
                          />
                        </Grid>
                      )}
                      {collectedby === 3 && (
                        <Grid item md={6} xs={12}>
                          <DropDownWithSearch
                            options={staffList}
                            value={selectedStaff}
                            onChange={(e, newValue) => this.setState({ selectedStaff: newValue })}
                            name="selectedStaff"
                            label="Staff"
                            optionValue="name" // change if API returns staff_name
                            className="width-90-per-mt-1"
                            helperText={fieldErrors["selectedStaff"] && fieldErrors["selectedStaff"]}
                            error={fieldErrors["selectedStaff"]}
                            hideClearIcon={true}
                          />
                        </Grid>
                      )}
                      {isTCType && collectedby === 1 && (
                        <>
                          {loadingStandard ? (
                            <div>
                              <Skeleton
                                variant="rect"
                                className="drop-down-skeleton m-t-10px"
                              ></Skeleton>
                              <div>...Loading Reason List</div>
                            </div>
                          ) : (
                            <Grid item md={6} xs={12}>
                              <DropDownWithSearch
                                options={standardList}
                                value={miscellaneous.tcStandard}
                                onChange={(e, newValue) =>
                                  this.handleDropDownStandard(
                                    "tcStandard",
                                    newValue
                                  )
                                }
                                name="tcStandard"
                                label="TC Standard"
                                optionValue="standard_name"
                                disabled={
                                  collectedby === 1
                                    ? studentName
                                      ? false
                                      : true
                                    : false
                                }
                                className="width-90-per-mt-1"
                                helperText={
                                  collectedby === 1 && !studentName
                                    ? "Select Student To Display Standards"
                                    : fieldErrors["tcStandard"] &&
                                    fieldErrors["tcStandard"]
                                }
                                error={
                                  fieldErrors["tcStandard"] &&
                                  fieldErrors["tcStandard"]
                                }
                                hideClearIcon={true}
                              />
                            </Grid>
                          )}
                          <Grid
                            item
                            md={6}
                            xs={12}
                            className="align-self-center"
                          >
                            <MenuItem
                              value={miscellaneous.is_student_delete}
                              onClick={() => this.handleCheckChange()}
                            >
                              <Checkbox
                                color="secondary"
                                checked={miscellaneous.is_student_delete}
                              />
                              <Box className="text-capitalize">
                                <ListItemText
                                  className="text-red"
                                  primary={"Delete the Student Also"}
                                />
                              </Box>
                            </MenuItem>
                            {/* <Box>
                                                            <Checkbox
                                                                onChange={(e) =>
                                                                    this.handleCheckChange()
                                                                }
                                                                color="primary"
                                                                name={'is_student_delete'}
                                                                checked={miscellaneous.is_student_delete}
                                                                inputProps={{
                                                                    "aria-label": "primary checkbox",
                                                                }}
                                                            />
                                                            <span>{'Delete the student also'}</span>
                                                        </Box> */}
                          </Grid>
                        </>
                      )}
                      {collectedby === 2 && (
                        <Grid item md={6} xs={12}>
                          <DropDownWithSearch
                            options={guestStandardList}
                            value={miscellaneous.guestStandard}
                            onChange={(e, newValue) =>
                              this.handleDropDownStandard(
                                "guestStandard",
                                newValue
                              )
                            }
                            name="guestStandard"
                            label="Standard"
                            required={!isFormDefinitionEnabled('misc_configuration', 'guest_standard_non_mandatory', 1)}
                            optionValue="name"
                            className="width-90-per-mt-1"
                            helperText={
                              fieldErrors["guestStandard"] &&
                              fieldErrors["guestStandard"]
                            }
                            error={
                              fieldErrors["guestStandard"] &&
                              fieldErrors["guestStandard"]
                            }
                            hideClearIcon={true}
                          />
                        </Grid>
                      )}
                      <Grid item md={6} xs={12}>
                        <TextField
                          label={"Amount"}
                          required={true}
                          name="amount"
                          value={miscellaneous.amount}
                          inputProps={{ maxLength: "20" }}
                          fullWidth={true}
                          variant="outlined"
                          className="width-90-per-mt-1"
                          helperText={
                            fieldErrors["amount"] === ""
                              ? helperText["amount"]
                              : fieldErrors["amount"]
                          }
                          error={fieldErrors["amount"]}
                          onChange={(e) => this.handleSearchChange(e)}
                        />
                      </Grid>
                      <Grid item md={6} xs={12}>
                        <TextField
                          label={"TAX"}
                          required={true}
                          name="tax"
                          value={miscellaneous.tax}
                          inputProps={{ maxLength: "20" }}
                          fullWidth={true}
                          variant="outlined"
                          className="width-90-per-mt-1"
                          helperText={
                            fieldErrors["tax"] === ""
                              ? helperText["tax"]
                              : fieldErrors["tax"]
                          }
                          error={fieldErrors["tax"]}
                          onChange={(e) => this.handleSearchChange(e)}
                        />
                      </Grid>
                      <Grid item md={6} xs={12}>
                        <MuiPickersUtilsProvider utils={DateFnsUtils}>
                          <KeyboardDatePicker
                            className="width-90-per-mt-1"
                            autoOk
                            variant="inline"
                            inputVariant="outlined"
                            label="Date"
                            maxDate={new Date()}
                            name="date"
                            // InputLabelProps={{ shrink: expenses.date ? true : false }}
                            format="dd-MM-yyyy"
                            value={
                              miscellaneous.date
                                ? miscellaneous.date
                                : null
                            }
                            required={true}
                            onChange={(e) => this.handleDateSearchChange(e)}
                            KeyboardButtonProps={{
                              "aria-label": "change date",
                            }}
                            helperText={
                              fieldErrors["date"] === ""
                                ? helperText["date"]
                                : fieldErrors["date"]
                            }
                            error={
                              fieldErrors["date"] &&
                              (fieldErrors["date"] === ""
                                ? false
                                : true)
                            }
                          />
                        </MuiPickersUtilsProvider>
                      </Grid>
                      <Grid item md={6} xs={12}>
                        <Box>
                          <Box className="create-expenses-outer-box-label-value">
                            <Box className="create-expenses-total-value">
                              {numberWithCommas(miscellaneous?.total_amount, 0)}
                            </Box>
                          </Box>
                        </Box>
                      </Grid>
                    </Grid>
                    <Grid container>
                      <Grid item md={12}>
                        <FormControl
                          fullWidth
                          error={
                            fieldErrors.comment &&
                            (fieldErrors.comment ? true : false)
                          }
                        >
                          <Box className="create-expenses-comment header-align">
                            Comment
                          </Box>
                          <TextareaAutosize
                            aria-label="minimum height"
                            className="create-expenses-comment-auto-size"
                            value={expenses.comment}
                            name="comment"
                            maxLength={200}
                            onChange={(e) => this.handleSearchChange(e)}
                            required
                          />
                          {fieldErrors.comment && (
                            <FormHelperText>
                              {fieldErrors.comment}
                            </FormHelperText>
                          )}
                        </FormControl>
                      </Grid>
                    </Grid>
                  </Paper>
                </Grid>

                <Grid item md={4} xs={12}>
                  <Paper className="header-align create-expenses-right-part-paper">
                    <Box className="create-expenses-info-outer-box">
                      <Box className="create-expenses-outer-box-label-value">
                        <Box className="create-expenses-label">
                          Miscellaneous Type
                        </Box>
                        <Box className="create-expenses-value text-bold">
                          {miscellaneous?.selectedMisc?.misc_type_name}
                        </Box>
                      </Box>
                      {collectedby === 1 ? (
                        <>
                          <Box className="create-expenses-outer-box-label-value">
                            <Box className="create-expenses-label">
                              Student Name :
                            </Box>
                            <Box className="create-expenses-value text-bold">
                              {studentName}
                            </Box>
                          </Box>
                          <Box className="create-expenses-outer-box-label-value">
                            <Box className="create-expenses-label">
                              Standard (Section) Name :
                            </Box>
                            <Box className="create-expenses-value text-bold">
                              {student_details.standard_name}
                            </Box>
                          </Box>
                        </>
                      ) : (
                        <Box className="create-expenses-outer-box-label-value">
                          <Box className="create-expenses-label">
                            Guest Name
                          </Box>
                          <Box className="create-expenses-value text-bold">
                            {miscellaneous.guestName}
                          </Box>
                        </Box>
                      )}
                      <Box>
                        <Divider variant="middle" />
                        <Box className="create-expenses-outer-box-label-value">
                          <Box className="create-expenses-total-label">
                            Total
                          </Box>
                          <Box className="create-expenses-total-value">
                            {numberWithCommas(miscellaneous?.total_amount, 0)}
                          </Box>
                        </Box>
                      </Box>
                    </Box>
                  </Paper>
                </Grid>
              </Grid>
            )}
            {isStudent && collectedby === 1 && (
              <SelectStudent
                year={this.state.year}
                getStudentDetails={this.getStudentDetails}
                closeSelectStudent={this.closeSelectStudent}
                selectedMisc={this.state.miscellaneous.selectedMisc}
              />
            )}
            {isOpenPaymentModal && (
              <PaymentModal
                payDisabled={submitDisable}
                amountDetails={paymentDetails}
                closeFeePaymentModal={() => this.closeFeePaymentModal()}
                payFees={this.submit}
                isTaxHide={true}
              />
            )}
            {!isBlankPage && (
              <Box className="submt-button-float-bottom" mt={3}>
                <Button
                  className="submit"
                  variant="contained"
                  style={{ float: "right" }}
                  onClick={this.handleSubmitButton}
                  disabled={submitDisable}
                >
                  Submit
                </Button>
              </Box>
            )}
          </Paper>
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

export default withRouter(CollectionMiscellaneousAmountNew);
