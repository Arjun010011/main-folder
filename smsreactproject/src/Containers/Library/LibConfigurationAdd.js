import React, { Component } from "react";
import {
  Paper,
  Box,
  Button,
  Grid,
  MenuItem,
  Checkbox,
  ListItemText,
} from "@material-ui/core";
import VisibilityOutlinedIcon from "@material-ui/icons/VisibilityOutlined";
import MenuBookOutlinedIcon from "@material-ui/icons/MenuBookOutlined";
import { Link } from "react-router-dom";
import { withRouter } from "react-router-dom";
import _ from "lodash";
import Snackbar from "@material-ui/core/Snackbar";
import Swal from "sweetalert2";

import loadingBar from "images/loading.gif";
import { Actions } from "Constants/permissions";
import { getRequest, postRequest } from "Includes/api/apicall";
import { GET_URL, POST_URL } from "Includes/urls";
import {
  Alert,
  getUrlParam,
  validateDate,
  isUserHasPermission,
} from "Includes/functions";
import DynamicForm from "Components/DynamicForm";
import "./styles.scss";
import { FormattedMessage } from "react-intl";
import messages from "./messages";

const alias_names = JSON.parse(localStorage.getItem("alias_name"))
  ? JSON.parse(localStorage.getItem("alias_name"))
  : {};

const examDetails_global = [
  {
    label: <FormattedMessage {...messages.returnWithinDays} />,
    regex: null,
    name: "return_within_days",
    md: 6,
    className: "width-form-90",
    required: true,
    id: "outlined-textarea",
    default: "",
    rows: null,
    type: "number",
    maxLength: 250,
  },
  {
    label: <FormattedMessage {...messages.numberOfBooksPerUser} />,
    regex: null,
    name: "number_of_books_per_user",
    md: 6,
    className: "width-form-90",
    required: true,
    id: "outlined-textarea",
    default: "",
    rows: null,
    type: "number",
    maxLength: 250,
  },
  {
    label: <FormattedMessage {...messages.fineAmount} />,
    regex: null,
    name: "fine_amount",
    md: 6,
    className: "width-form-90",
    required: true,
    id: "outlined-textarea",
    default: "",
    rows: null,
    type: "number",
    maxLength: 250,
  },
  {
    label: <FormattedMessage {...messages.fineFreqInMin} />,
    regex: null,
    name: "fine_frequency_in_minutes",
    md: 6,
    className: "width-form-90",
    required: true,
    id: "outlined-textarea",
    default: "",
    rows: null,
    type: "number",
    maxLength: 250,
  },
  {
    label: <FormattedMessage {...messages.maxFineAmount} />,
    regex: null,
    name: "max_fine_amount",
    md: 6,
    className: "width-form-90",
    required: true,
    id: "outlined-textarea",
    default: "",
    rows: null,
    type: "number",
    maxLength: 250,
  },
  {
    label: <FormattedMessage {...messages.isDefault} />,
    regex: null,
    name: "is_default",
    md: 6,
    list: [
      { id: true, name: "True" },
      { id: false, name: "False" },
    ],
    className: "width-form-90",
    required: true,
    id: "outlined-textarea",
    default: false,
    rows: null,
    type: "dropDown",
    maxLength: 250,
  },
];

class LibConfigurationAdd extends Component {
  constructor(props) {
    super(props);

    this.state = {
      yearName: "",
      selectedYear: "",
      exam: { is_section: true, is_multiple_schedule: false },
      examDetails: null,
      isEditForm: false,
      loading: true,
      standardList: [],
      checkAll: false,
      fieldErrors: {},
      openError: false,
      alertData: "",
      libId: "",
      header: "Create",
    };
  }

  async componentDidMount() {
    let { id, selectedYear, yearName, fromDate, toDate } = getUrlParam();
    this.setState({
      yearName,
      selectedYear: selectedYear,
      fromDate,
      toDate,
    });
    Promise.all([
      this.getExamTypeList(),
      this.getTermList(),
      this.getStandardList(selectedYear),
    ]).then(() => {
      if (
        this.props.location.pathname ===
        Actions.library_configuration.update.url
      ) {
        this.updateExamDetails(id);
      } else {
        this.updateExamInf();
      }
    });
  }

  updateExamDetails = (id) => {
    let { standardList, checkAll } = this.state;
    const url = GET_URL.libraryconfiguration.api + id + "/";
    getRequest(url, {}, this.props).then((response) => {
      if (response && response.status === 200) {
        let standard_sections =
          response.data?.data?.standard_library_config_library_config ?? [];
        if (standard_sections.length > 0) {
          standardList.some((standard) => {
            standard_sections.some((secondary) => {
              if (standard.id == secondary.standard) {
                standard.checked = true;
                standard.backend_id = secondary.id;
              }
            });
          });
        }
        checkAll = true;
        let tempList = [...standardList];
        tempList.splice(0, 1);
        tempList.map((data) => {
          if (!data.checked) {
            checkAll = false;
          }
        });
        standardList[0]["checked"] = checkAll;
        this.updateExamInf(response.data.data);
        this.setState({
          updatedDetails: response.data.data,
          standardList,
          checkAll,
          isEditForm: true,
          libId: id,
          header: "Update",
        });
      }
    });
  };

  getStandardList = async (selectedYear) => {
    const url = GET_URL.getstandardandsection.api;
    const param = { is_active: true, academic_year: selectedYear };
    await getRequest(url, param, this.props).then((response) => {
      if (response && response.status === 200) {
        response.data.data.map((data) => {
          data.checked = false;
          data.checked = false;
          data.sections.map((section) => {
            section.checked = false;
          });
        });
        let temp = {
          id: 0,
          name: "All",
          checked: false,
          expanded: false,
          sections: [],
        };
        response.data.data.unshift(temp);
        this.setState({
          standardList: response.data.data,
        });
      }
    });
    return true;
  };

  getExamTypeList = async () => {
    const url = GET_URL.examtypes.api;
    const params = { is_active: true };
    await getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        this.setState({
          examTypeList: response.data.data,
        });
      }
    });
    return true;
  };

  getTermList = async () => {
    const url = GET_URL.examterms.api;
    const params = { is_active: true };
    await getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        this.setState({
          examTermList: response.data.data,
        });
      }
    });
    return true;
  };

  updateExamInf = (examInf) => {
    let { exam, toDate, fromDate, examTypeList, examTermList } = this.state;
    let fieldDetail = _.cloneDeep(examDetails_global);
    let value;
    fieldDetail.forEach((field) => {
      if (examInf) {
        value = examInf[field["name"]];
      } else {
        value = field.default;
      }
      field.default = value;
      exam[field["name"]] = value;
    });
    this.setState({
      exam,
      examDetails: fieldDetail,
      loading: false,
    });
  };

  updateExam = (name, value) => {
    let { exam, examDetails } = this.state;
    examDetails.some((field) => {
      if (field.name === name) {
        field.default = value;
      }
    });
    exam[name] = value;
    this.setState({
      examDetails,
      exam,
    });
  };

  onChangeStandard = (index) => {
    let { standardList, checkAll } = this.state;
    standardList.map((data, sIndex) => {
      if (index === 0) {
        data.checked = !checkAll;
      } else if (sIndex === index) {
        data["checked"] = !data["checked"];
      }
    });
    this.setState(
      {
        standardList,
        checkAll: !checkAll,
      },
      () => {
        checkAll = true;
        let tempList = [...standardList];
        tempList.splice(0, 1);
        tempList.map((data) => {
          if (!data.checked) {
            checkAll = false;
          }
        });
        standardList[0]["checked"] = checkAll;
        this.setState({
          checkAll,
          standardList,
        });
      }
    );
  };

  getSelectedStandardCount = () => {
    let { standardList } = this.state;
    let tempList = [...standardList];
    tempList.splice(0, 1);
    let count = tempList.filter((x, i) => {
      return x.checked;
    }).length;
    return <Box className="add-exam-total-box">Total : {count}</Box>;
  };

  validation = () => {
    let {
      examDetails,
      standardList,
      fieldErrors,
      openError,
      alertData,
      exam,
      isEditForm,
    } = this.state;
    fieldErrors = {};
    let validate = true;
    let post_standards = [];
    examDetails.forEach((field) => {
      let value = field.default;
      let name = field.name;
      if (field.required && (value === "" || value === null || value === 0)) {
        fieldErrors[name] = `${field.label} is Mandatory`;
        validate = false;
      }
      if (field.type === "date") {
        field.minDate = field.parentMinDate
          ? exam[field.parentMinDate]
          : field.minDate;
        let error = validateDate(field.default, field.minDate, field.maxDate);
        if (error !== "") {
          fieldErrors[name] = error;
          validate = false;
        }
      } else if (
        field.regex &&
        !field.regex.value.test(value) &&
        value !== ""
      ) {
        fieldErrors[name] = field.regex.errorText;
        validate = false;
      }
    });

    if (!validate) {
      this.refs.exam.updateErrors(fieldErrors);
      openError = true;
      alertData = "Clear Errors";
    }
    let temp = {};
    standardList.map((data, index) => {
      if (data.checked && index !== 0) {
        temp = { standard: data.id };
        if (isEditForm && data.backend_id) {
          temp["id"] = data.backend_id;
        }
        post_standards.push(temp);
      }
    });

    this.setState({
      fieldErrors,
      openError,
      alertData,
      post_standards,
      submitDisable: true,
    });
    let return_value = validate;
    if (validate) {
      return_value = post_standards;
    }
    return return_value;
  };

  postFormat = (post_standards) => {
    let { exam, selectedYear, isEditForm, libId } = this.state;
    let post_data = {
      configuration_data: [
        {
          return_within_days: exam.return_within_days,
          number_of_books_per_user: exam.number_of_books_per_user,
          fine_amount: exam.fine_amount,
          fine_frequency_in_minutes: exam.fine_frequency_in_minutes,
          max_fine_amount: exam.max_fine_amount,
          standards: post_standards,
          academic_year: selectedYear,
          is_default: exam.is_default,
        },
      ],
      deletable_ids: [],
    };
    if (isEditForm) {
      post_data["configuration_data"][0]["id"] = parseInt(libId);
    }
    return post_data;
  };

  submit = () => {
    let validate = this.validation();
    if (validate) {
      let post_data = this.postFormat(validate);
      let url = POST_URL.libraryconfiguration.api;
      postRequest(url, post_data, this.props).then((response) => {
        if (response && response.status === 200) {
          Swal.fire({
            position: "top-end",
            type: "success",
            title: "Your Data has been saved",
            showConfirmButton: false,
            timer: 1500,
          });
          this.props.history.push(Actions.library_configuration.view.url);
        }
        this.setState({ submitDisable: false });
      });
    } else {
      this.setState({
        submitDisable: false,
      });
    }
  };

  handleClose = () => {
    this.setState({
      openError: false,
    });
  };

  handleSearchChange = (e) => {
    let { name } = e.target;
    let { exam, standardList } = this.state;
    exam[name] = !exam[name];

    standardList.map((standard) => {
      standard.checked = false;
      standard.sections.map((section) => {
        section.checked = false;
      });
      standard.expanded = false;
    });

    this.setState({
      exam,
      standardList,
    });
  };

  handleExpandClick = (index) => {
    let { standardList } = this.state;
    standardList[index]["expanded"] = !standardList[index]["expanded"];
    this.setState({
      standardList,
    });
  };

  handleCheckClick = (parentIndex, childIndex) => {
    let { standardList } = this.state;
    if (parentIndex === 0) {
      standardList[parentIndex]["checked"] =
        !standardList[parentIndex]["checked"];
      standardList.map((standard) => {
        standard.checked = standardList[parentIndex]["checked"];
        standard.sections.map((section) => {
          section.checked = standardList[parentIndex]["checked"];
        });
        standard.expanded = standardList[parentIndex]["checked"];
      });
    } else {
      if (childIndex !== undefined) {
        let is_section_checked = false;
        standardList[parentIndex]["sections"][childIndex]["checked"] =
          !standardList[parentIndex]["sections"][childIndex]["checked"];
        standardList[parentIndex]["sections"].map((section) => {
          if (section.checked) {
            is_section_checked = true;
          }
        });
        if (is_section_checked) {
          standardList[parentIndex]["checked"] = true;
        } else {
          standardList[parentIndex]["checked"] = false;
          standardList[0]["checked"] = false;
          standardList[parentIndex]["expanded"] = false;
        }
      } else {
        standardList[parentIndex]["checked"] =
          !standardList[parentIndex]["checked"];
        standardList[parentIndex]["sections"].map((section) => {
          section["checked"] = standardList[parentIndex]["checked"];
        });
        if (standardList[parentIndex]["checked"]) {
          standardList[parentIndex]["expanded"] = true;
        } else {
          standardList[parentIndex]["expanded"] = false;
          standardList[0]["checked"] = false;
        }
      }
    }

    this.setState({
      standardList,
    });
  };

  render() {
    let {
      yearName,
      examDetails,
      isEditForm,
      loading,
      standardList,
      openError,
      alertData,
      header,
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
                <Box className="heading">
                  {header} Configuration for the year - {yearName}
                </Box>
              </Grid>
              <Grid item md={4} xs={12}>
                <Box className="header-align end-flex-prop">
                  {isUserHasPermission("library_configuration", "view") && (
                    <Button
                      variant="contained"
                      component={Link}
                      to={Actions.library_configuration.view.url}
                      className="editbutton-view"
                    >
                      <VisibilityOutlinedIcon className="visibility-icon" />{" "}
                      {Actions.library_configuration.view.label}
                    </Button>
                  )}
                </Box>
              </Grid>
            </Grid>

            <Paper className="add-exam-background">
              <Grid container>
                <Grid item lg={7} md={8} xs={12} sm={12}>
                  {examDetails && (
                    <DynamicForm
                      fieldDetails={examDetails}
                      updateParent={this.updateExam}
                      isEditForm={isEditForm}
                      loading={loading}
                      ref={"exam"}
                      idFormat={"exam_2022_08_11_01_23_pm_"}
                    />
                  )}
                </Grid>
                <Grid item lg={5} md={4} xs={12}>
                  <Box className="display-flex">
                    <Box className="add-exam-standard-list-label">
                      {`${alias_names["standard"]} List`}
                      <MenuBookOutlinedIcon />
                    </Box>
                    <Box className="add-exam-total-box">
                      {this.getSelectedStandardCount()}
                    </Box>
                  </Box>
                  <Box className="add-exam-standard-list-outer-box">
                    {standardList.map((standard, index) => {
                      return (
                        <Box className="">
                          <MenuItem
                            className="padding-0"
                            key={index}
                            value={standard.name}
                            onClick={() => this.onChangeStandard(index)}
                          >
                            <Checkbox
                              color="primary"
                              checked={standard["checked"]}
                            />
                            <Box className="text-capitalize">
                              <ListItemText primary={standard.name} />
                            </Box>
                          </MenuItem>
                        </Box>
                      );
                    })}
                  </Box>
                </Grid>
              </Grid>
            </Paper>

            <Grid item md={12}>
              <Box className="submt-button-float-bottom">
                <Button
                  variant="contained"
                  color="primary"
                  className="submit"
                  disabled={this.state.submitDisable}
                  onClick={this.submit}
                >
                  Submit &nbsp;{" "}
                </Button>
              </Box>
            </Grid>
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

export default withRouter(LibConfigurationAdd);
