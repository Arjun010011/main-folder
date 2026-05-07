import React, { Component } from "react";
import {
  Paper,
  Box,
  Button,
  Grid,
  MenuItem,
  Checkbox,
  ListItemText,
  List,
  ListItem,
  ListItemIcon,
  ListItemSecondaryAction,
  Collapse,
  IconButton,
} from "@material-ui/core";
import ExpandLess from "@material-ui/icons/ExpandLess";
import ExpandMore from "@material-ui/icons/ExpandMore";
import VisibilityOutlinedIcon from "@material-ui/icons/VisibilityOutlined";
import MenuBookOutlinedIcon from "@material-ui/icons/MenuBookOutlined";
import { withRouter } from "react-router-dom";
import _ from "lodash";
import Snackbar from "@material-ui/core/Snackbar";
import Swal from "sweetalert2";

import loadingBar from "images/loading.gif";
import { Actions } from "Constants/permissions";
import { getRequest, postRequest, putRequest } from "Includes/api/apicall";
import { GET_URL, POST_URL, PUT_URL } from "Includes/urls";
import { nameWithQuoteRegex } from "Constants/regularExpression";
import {
  Alert,
  dateFormat,
  getUrlParam,
  validateDate,
  isUserHasPermission,
} from "Includes/functions";
import DynamicForm from "Components/DynamicForm";
import "./styles.scss";

const alias_names = JSON.parse(localStorage.getItem("alias_name"))
  ? JSON.parse(localStorage.getItem("alias_name"))
  : {};

const examDetails_global = [
  {
    label: "Exam Term",
    regex: null,
    name: "term",
    md: 6,
    className: "width-form-90",
    required: true,
    id: "outlined-textarea",
    default: "",
    rows: null,
    type: "dropDown",
    maxLength: 25,
    list: [],
    hideSelect: true,
  },
  {
    label: "Exam Type",
    regex: null,
    name: "exam_type",
    md: 6,
    className: "width-form-90",
    required: true,
    id: "outlined-textarea",
    default: "",
    rows: null,
    type: "dropDown",
    maxLength: 25,
    list: [],
    hideSelect: true,
  },
  {
    label: "Start Date",
    regex: null,
    name: "from_date",
    md: 6,
    className: "width-form-90",
    required: true,
    id: "outlined-textarea",
    default: "",
    rows: null,
    type: "date",
    maxLength: null,
    minDate: new Date(),
    maxDate: "",
  },
  {
    label: "Last Date",
    regex: null,
    name: "to_date",
    md: 6,
    className: "width-form-90",
    required: true,
    id: "outlined-textarea",
    default: "",
    rows: null,
    type: "date",
    maxLength: null,
    parentMinDate: "from_date",
  },
  {
    label: "Exam Description",
    regex: nameWithQuoteRegex,
    name: "description",
    md: 12,
    className: "width-form-95",
    required: false,
    id: "outlined-textarea",
    default: "",
    rows: null,
    type: "text",
    maxLength: 250,
  },
];

class AddExam extends Component {
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
      examID: "",
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
      if (this.props.location.pathname === Actions.exams.update.url) {
        this.updateExamDetails(id);
      } else {
        this.updateExamInf();
      }
    });
  }

  getReturnViewUrl = () => {
    const { selectedYear } = this.state;
    const { returnToSchedule } = getUrlParam();
    if (String(returnToSchedule) === "1") {
      const params = new URLSearchParams();
      if (selectedYear) params.set("selectedYear", selectedYear);
      return `${Actions.schedule_exam.view.url}?${params.toString()}`;
    }
    return Actions.exams.view.url;
  };

  navigateToReturnView = () => {
    this.props.history.push(this.getReturnViewUrl());
  };

  updateExamDetails = (id) => {
    let { standardList, checkAll } = this.state;
    const url = GET_URL.exam.api + id + "/";
    getRequest(url, {}, this.props).then((response) => {
      if (response && response.status === 200) {
        let standard_sections =
          response.data.data.standard_section_ids.split(",");
        standardList.some((standard) => {
          standard.sections.some((section) => {
            standard_sections.some((secondary) => {
              if (section.standard_section == secondary) {
                section.checked = true;
                standard.checked = true;
                standard.expanded = true;
              }
            });
          });
        });
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
          examID: id,
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
      if (field.name === "from_date" || field.name === "to_date") {
        field.maxDate = toDate;
        field.minDate = fromDate;
      } else if (field.name === "exam_type") {
        field.list = examTypeList;
      } else if (field.name === "term") {
        field.list = examTermList;
      }
      if (examInf) {
        value = examInf[field["name"]];
      } else {
        value = field.default;
      }
      field.default = value;
      exam[field["name"]] = value;
    });
    // if (examInf) {
    //     exam['is_section'] = examInf.is_standard_section
    // }
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
    let { examDetails, standardList, fieldErrors, openError, alertData, exam } =
      this.state;
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

    let sectionIsPresent = false;
    let standardIsPresent = false;
    if (exam["is_section"]) {
      standardList.map((data, index) => {
        if (data.checked && index !== 0) {
          data.sections.map((section) => {
            if (section.checked) {
              sectionIsPresent = true;
              post_standards.push(section.standard_section);
            }
          });
        }
      });
      standardIsPresent = true;
    } else {
      standardList.map((data, index) => {
        if (data.checked && index !== 0) {
          standardIsPresent = true;
          post_standards.push(data.id);
        }
      });
      sectionIsPresent = true;
    }

    if (!standardIsPresent) {
      validate = false;
      openError = true;
      alertData = "Select at least one standard";
    }
    if (!sectionIsPresent) {
      validate = false;
      openError = true;
      alertData = "Select at least one section";
    }

    this.setState({
      fieldErrors,
      openError,
      alertData,
      post_standards,
      submitDisable: true,
    });
    let return_value = validate;
    if (validate) {
      return_value = post_standards.join();
    }
    return return_value;
  };

  postFormat = (post_standards) => {
    let { exam, selectedYear } = this.state;
    let post_data = {
      description: exam.description,
      from_date: dateFormat(exam.from_date, "YYYY-MM-DD"),
      to_date: dateFormat(exam.to_date, "YYYY-MM-DD"),
      standard_ids: post_standards,
      exam_type: exam.exam_type,
      term: exam.term,
      academic_year: selectedYear,
      is_standard_section: 0,
    };

    if (exam["is_section"]) {
      delete post_data["standard_ids"];
      post_data["is_standard_section"] = 1;
      post_data["standard_section_ids"] = post_standards;
    }

    return post_data;
  };

  submit = () => {
    let { isEditForm, examID } = this.state;
    let validate = this.validation();
    if (validate) {
      let post_data = this.postFormat(validate);
      if (isEditForm) {
        let url = PUT_URL.exam.api + examID + "/";
        putRequest(url, post_data, this.props).then((response) => {
          if (response && response.status === 200) {
            Swal.fire({
              position: "top-end",
              type: "success",
              title: "Your Data has been updated",
              showConfirmButton: false,
              timer: 1500,
            });
            this.navigateToReturnView();
          }
          this.setState({ submitDisable: false });
        });
      } else {
        let url = POST_URL.exam.api;
        postRequest(url, post_data, this.props).then((response) => {
          if (response && response.status === 200) {
            Swal.fire({
              position: "top-end",
              type: "success",
              title: "Your Data has been saved",
              showConfirmButton: false,
              timer: 1500,
            });
            this.navigateToReturnView();
          }
          this.setState({ submitDisable: false });
        });
      }
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
      exam,
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
                  {header} Exam for year - {yearName}
                </Box>
              </Grid>
              <Grid item md={4} xs={12}>
                <Box className="header-align end-flex-prop">
                  {isUserHasPermission("exam", "view") && (
                    <Button
                      variant="contained"
                      onClick={this.navigateToReturnView}
                      className="editbutton-view"
                    >
                      <VisibilityOutlinedIcon className="visibility-icon" />{" "}
                      {Actions.exams.view.label}
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
                  {/* <Box className='margin-top-20'>
                                        <FormControlLabel
                                            control={<Switch checked={exam['is_section']}
                                                name='is_section'
                                                value={exam['is_section']}
                                                color="primary"
                                                onChange={this.handleSearchChange} />}
                                            label='Is section wise'
                                        />
                                    </Box> */}
                  <Box className="add-exam-standard-list-outer-box">
                    {exam["is_section"] && (
                      <List component="nav">
                        {standardList.map((standard, parentIndex) => (
                          <div key={parentIndex}>
                            <ListItem dense>
                              <ListItemIcon className="exam-list-item-icon">
                                <Checkbox
                                  disableRipple
                                  edge="start"
                                  checked={standard.checked}
                                  defaultChecked={standard.checked}
                                  onClick={() =>
                                    this.handleCheckClick(parentIndex)
                                  }
                                />
                              </ListItemIcon>
                              <ListItemIcon>
                                <Button
                                  disableFocusRipple
                                  disableRipple
                                  variant="outlined"
                                  size="small"
                                >
                                  {standard.name.toUpperCase()}
                                </Button>
                              </ListItemIcon>
                              <ListItemSecondaryAction>
                                {standard.id !== 0 && (
                                  <IconButton
                                    onClick={() =>
                                      this.handleExpandClick(parentIndex)
                                    }
                                  >
                                    {standard.expanded ? (
                                      <ExpandLess />
                                    ) : (
                                      <ExpandMore />
                                    )}
                                  </IconButton>
                                )}
                              </ListItemSecondaryAction>
                            </ListItem>
                            <Collapse
                              unmountOnExit
                              in={standard.expanded || false}
                              timeout="auto"
                            >
                              <List disablePadding component="div">
                                {standard.sections.map(
                                  (section, childIndex) => (
                                    <ListItem
                                      key={section.id}
                                      dense
                                      className="exam-list-tem-left-padding"
                                    >
                                      <ListItemIcon className="exam-list-item-icon">
                                        <Checkbox
                                          checked={section.checked}
                                          defaultChecked={section.checked}
                                          onClick={() =>
                                            this.handleCheckClick(
                                              parentIndex,
                                              childIndex
                                            )
                                          }
                                        />
                                      </ListItemIcon>
                                      <ListItemText primary={section.name} />
                                    </ListItem>
                                  )
                                )}
                              </List>
                            </Collapse>
                          </div>
                        ))}
                      </List>
                    )}

                    {!exam["is_section"] &&
                      standardList.map((standard, index) => {
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

export default withRouter(AddExam);
