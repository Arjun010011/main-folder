import React, { Component } from "react";
import Swal from "sweetalert2";
import { Link, withRouter } from "react-router-dom";

import {
  Grid,
  Paper,
  Box,
  Button,
  TextField,
  FormControlLabel,
  Switch,
} from "@material-ui/core";
import "./styles.scss";
import { Actions } from "Constants/permissions";
import classNames from "classnames";
import { getUrlParam, Alert } from "Includes/functions";
import VisibilityOutlinedIcon from "@material-ui/icons/VisibilityOutlined";
import AddCircleIcon from "@material-ui/icons/AddCircle";
import CancelIcon from "@material-ui/icons/Cancel";
import Snackbar from "@material-ui/core/Snackbar";
import loadingBar from "images/loading.gif";
import _ from "lodash";
import { GRADE_TYPES } from "Constants";

import { POST_URL, GET_URL } from "Includes/urls";
import { postRequest, getRequest } from "Includes/api/apicall";
import { floatNumberWithTwoDecimalRegex } from "Constants/regularExpression";
import messages from "./messages";
import commonMessages from "Constants/messages";
import { FormattedMessage } from "react-intl";
import { Dropdown } from "Components/DropDown";

class GradePlanAdd extends Component {
  constructor(props) {
    super(props);

    this.state = {
      submitDisable: false,
      fieldDetails: [{ from_range: 0, to_range: 100, name: "" }],
      year: "",
      yearName: "",
      errorDetails: {},
      loading: true,
      snackbar: false,
      alertData: "",
      deletable_grade_ids: [],
      is_edit: false,
      edit_id: "",
      grade_type: 0,
    };
  }

  componentDidMount() {
    if (this.props.location.pathname === Actions.exam_grade_plan.update.url) {
      let { id } = getUrlParam();
      this.getGradePlan(id);
    } else {
      this.setState({
        loading: false,
      });
    }
  }

  getGradePlan = (id) => {
    const { fieldDetails } = this.state;
    const url = GET_URL.studentgrade.api + id + "/";
    const params = { is_active: true };
    getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        this.setState({
          gradePlanList: response.data.data.grade_plan_data,
          plan_name: response.data.data.name,
          is_default: response.data.data.is_default,
          // grade_type===0: !response.data.data.is_percentage,
          loading: false,
          tableUpdating: false,
          fieldDetails:
            response.data.data.grade_plan_data.length > 0
              ? response.data.data.grade_plan_data
              : fieldDetails,
          is_edit: true,
          edit_id: id,
          grade_type: response.data.data.grade_type
        });
      }
    });
  };

  handleChange = (e, index) => {
    let { fieldDetails, errorDetails } = this.state;
    const { name, value } = e.target;
    fieldDetails[index][name] = value;
    delete errorDetails[`${name}${index}`];
    this.setState(
      {
        fieldDetails,
        errorDetails,
      },
      () => {
        if (name === "name") {
          this.validateDuplicateName();
        }
      }
    );
  };

  handleChangePlan = (e) => {
    let { errorDetails } = this.state;
    let { name, value } = e.target;
    delete errorDetails[name];
    this.setState({
      [name]: value,
      errorDetails,
    });
  };

  validateDuplicateName = () => {
    let { fieldDetails, errorDetails } = this.state;
    let return_value = true;
    fieldDetails.map((field, index) => {
      fieldDetails.map((cField, cIndex) => {
        if (field.name === cField.name && index !== cIndex) {
          errorDetails[`name${cIndex}`] = (
            <FormattedMessage {...commonMessages.duplicateFoundLabel} />
          );
          return_value = false;
        }
      });
      if (return_value) delete errorDetails[`name${index}`];
    });
    this.setState({
      errorDetails,
    });
    return return_value;
  };

  validate = (param1, param2) => {
    let {
      fieldDetails,
      errorDetails,
      alertData,
      snackbar,
      plan_name,
      deletable_grade_ids,
      is_default,
      is_edit,
      edit_id,
      grade_type,
    } = this.state;
    let return_value = true;
    let fully_handled = false;
    let post_data = [];
    let post_data_temp = {};
    return_value = this.validateDuplicateName();
    fieldDetails.map((field, index) => {
      if (param1 === "add") {
        if (!field.to_range && grade_type != 2) {
          errorDetails[`to_range${index}`] = (
            <FormattedMessage {...commonMessages.fieldMandatoryError} />
          );
          return_value = false;
        }
        if (!field.name) {
          errorDetails[`name${index}`] = (
            <FormattedMessage {...commonMessages.fieldMandatoryError} />
          );
          return_value = false;
        }
        if (
          grade_type == 1 &&
          field.to_range &&
          parseFloat(field.to_range) === 100 &&
          grade_type != 2
        ) {
          if (param2 !== "submit") {
            alertData = (
              <FormattedMessage {...messages.fieldToRangeEqualToError} />
            );
            return_value = false;
            snackbar = true;
          } else {
            fully_handled = true;
          }
        }
      }
      if (
        grade_type != 2 &&
        field.to_range &&
        index !== 0 &&
        parseFloat(field.to_range) <=
          parseFloat(fieldDetails[index - 1].to_range) + 1
      ) {
        errorDetails[`to_range${index}`] = `should be greater than ${
          parseFloat(fieldDetails[index - 1].to_range) + 1
        }`;
        return_value = false;
      }
      if (
        grade_type != 2 &&
        field.to_range &&
        !floatNumberWithTwoDecimalRegex.value.test(field.to_range)
      ) {
        errorDetails[`to_range${index}`] =
          floatNumberWithTwoDecimalRegex.errorText;
      }
      if (
        grade_type == 1 &&
        field.to_range &&
        parseFloat(field.to_range) > 100
      ) {
        errorDetails[`to_range${index}`] = (
          <FormattedMessage {...messages.fieldToRangeGreaterThanError} />
        );
        return_value = false;
      }
      if (param2 === "submit") {
        if (!plan_name) {
          errorDetails["plan_name"] = (
            <FormattedMessage {...commonMessages.fieldMandatoryError} />
          );
          return_value = false;
        }
        post_data_temp = {};
        post_data_temp["from_range"] =
          grade_type !== 2
            ? index === 0
              ? 0
              : parseFloat(fieldDetails[index - 1].to_range) + 0.1
            : null;
        post_data_temp["to_range"] =
          grade_type != 2 ? parseFloat(field.to_range) : null;
        post_data_temp["name"] = field.name;
        post_data_temp["is_fail_grade"] = !!field.is_fail_grade;
        if (is_edit) post_data_temp["id"] = field.id;
        post_data.push(post_data_temp);
      }
    });
    const failGradeCount = fieldDetails.filter((f) => f.is_fail_grade).length;
    if (failGradeCount > 1) {
      alertData = "Only one grade can be marked as 'Fail'";
      snackbar = true;
      return_value = false;
    }
    if (
      grade_type == 1 &&
      !fully_handled &&
      return_value &&
      param2 === "submit"
    ) {
      alertData = "Fully (0 To 100%) Not Planned";
      return_value = false;
      snackbar = true;
    }
    if (param2 === "submit" && return_value) {
      return_value = {
        range_list: post_data,
        plan_name: plan_name,
        // is_default: is_default,
        grade_type: parseInt(grade_type),
        deletable_grade_ids: deletable_grade_ids,
      };
      if (is_edit) {
        return_value["id"] = parseFloat(edit_id);
      }
    }
    this.setState({
      errorDetails,
      snackbar,
      alertData,
    });
    return return_value;
  };

  addNew = () => {
    let { fieldDetails, errorDetails } = this.state;
    let validate = this.validate("add");
    if (validate) {
      let defaultData = {
        from_range:
          parseFloat(fieldDetails[fieldDetails.length - 1].to_range) + 0.1,
        to_range: "",
        name: "",
      };
      fieldDetails.push(defaultData);
      this.setState({
        fieldDetails,
        errorDetails,
      });
    }
  };

  removeField = (e, index) => {
    let { fieldDetails, is_edit, deletable_grade_ids } = this.state;
    if (is_edit) {
      deletable_grade_ids.push(fieldDetails[index]["id"]);
    }
    fieldDetails.splice(index, 1);
    fieldDetails.map((data, findex) => {
      data["from_range"] =
        findex === 0 ? 0 : parseFloat(fieldDetails[findex - 1].to_range) + 0.1;
    });
    this.setState({
      fieldDetails,
      deletable_grade_ids,
    });
  };

  submit = () => {
    let post_data = this.validate("add", "submit");
    if (post_data) {
      this.setState({
        submitDisable: true,
      });
      const url = POST_URL.studentgrade.api;
      postRequest(url, post_data).then((response) => {
        if (response && response.status === 200) {
          Swal.fire({
            position: "top-end",
            type: "success",
            title: response.data.Reason,
            showConfirmButton: false,
            timer: 1500,
          });
          this.props.history.push(Actions.exam_grade_plan.view.url);
        }
        this.setState({ submitDisable: false });
      });
    }
  };

  handleClose = () => {
    this.setState({
      snackbar: false,
    });
  };

  ViewPage = () => {
    let searchState = { plan_id: this.state.plan_id };
    let searchParam = "?" + new URLSearchParams(searchState).toString();
    this.props.history.push({
      pathname: Actions.transport_price.view.url,
      search: searchParam,
    });
  };

  handleFailGradeChange = (e, index) => {
    let { fieldDetails, errorDetails } = this.state;
    const { checked } = e.target;
  
    // Uncheck all others if this one is checked
    if (checked) {
      fieldDetails = fieldDetails.map((field, i) => ({
        ...field,
        is_fail_grade: i === index,
      }));
    } else {
      fieldDetails[index].is_fail_grade = false;
    }
  
    delete errorDetails[`is_fail_grade${index}`];
    this.setState({ fieldDetails, errorDetails });
  };
  

  render() {
    const {
      submitDisable,
      grade_type,
      fieldDetails,
      errorDetails,
      plan_name,
      loading,
      snackbar,
      alertData,
    } = this.state;
    if (loading) {
      return (
        <Box display="flex">
          <img src={loadingBar} className="loading" alt="loading" />
        </Box>
      );
    } else {
      return (
        <Paper className={classNames("paper-background")}>
          <Box className="alert-warning-box" style={{ backgroundColor: '#fff3cd', padding: '10px', marginTop: '15px', marginBottom: '15px', border: '1px solid #ffeeba', borderRadius: '5px' }}>
            <strong>Note:</strong> Fail Grade will only be considered for total grading. If any subject is failed, the assigned Fail Grade will be shown.
          </Box>
          <Box>
            <Grid container>
              <Grid
                item
                md={6}
                xs={12}
                sm={12}
                className={classNames("header-align")}
              >
                <Box className="heading">
                  {Actions.exam_grade_plan.create.label}
                </Box>
                <Box className="sub-heading"></Box>
              </Grid>
              <Grid item md={6} xs={12}>
                <Box className={classNames("header-align", "end-flex-prop")}>
                  <Button
                    variant="contained"
                    component={Link}
                    to={Actions.exam_grade_plan.view.url}
                    className="editbutton-view"
                  >
                    <VisibilityOutlinedIcon className="visibility-icon" />
                    {Actions.exam_grade_plan.view.label}
                  </Button>
                </Box>
              </Grid>
            </Grid>
            <Grid container spacing={2}>
              <Grid
                item
                md={8}
                xs={12}
                sm={12}
                className={classNames("header-align")}
              >
                <Box className="add-vehicle-price-form mt-30 ">
                  <div className="display-flex justify-content-space-between">
                    <TextField
                      label="Plan Name"
                      autoComplete="off"
                      name="plan_name"
                      type="text"
                      value={plan_name}
                      onChange={this.handleChangePlan}
                      className="width-300px ml-20"
                      variant="outlined"
                      helperText={
                        errorDetails[`plan_name`] && errorDetails[`plan_name`]
                      }
                      error={
                        errorDetails[`plan_name`] && errorDetails[`plan_name`]
                      }
                      size="small"
                    />
                    <div>
                      <Dropdown
                        data={GRADE_TYPES}
                        size="small"
                        hideSelect
                        label="Grade Type"
                        name="grade_type"
                        value={grade_type}
                        onChange={this.handleChangePlan}
                      />
                    </div>
                  </div>
                  <div className="mt-20">
                    <div className="text-blue fs-18 ml-15">Range</div>
                    {fieldDetails.map((field, index) => {
                      return (
                        <Box display="flex" flexWrap="wrap">
                          {grade_type != 2 && (
                            <>
                              <TextField
                                label={
                                  grade_type == 0
                                    ? "From Marks"
                                    : "From Range (%)"
                                }
                                autoComplete="off"
                                name="from_range"
                                disabled
                                type="number"
                                value={
                                  index === 0 ? 0 : parseFloat(field.from_range)
                                }
                                className="transport-text-field-km fixed-input-text-box"
                                variant="outlined"
                                size="small"
                              />
                              <TextField
                                label={
                                  grade_type == 0 ? "To Marks" : "To Range (%)"
                                }
                                autoComplete="off"
                                name="to_range"
                                type="text"
                                value={field.to_range}
                                className="transport-text-field-km fixed-input-text-box"
                                onBlur={this.validate}
                                // onInput={(e) => {
                                //     e.target.value = Math.max(0, parseFloat(e.target.value)).toString().slice(0, 3)
                                // }}
                                variant="outlined"
                                helperText={
                                  errorDetails[`to_range${index}`] &&
                                  errorDetails[`to_range${index}`]
                                }
                                error={
                                  errorDetails[`to_range${index}`] &&
                                  errorDetails[`to_range${index}`]
                                }
                                onChange={(e) => this.handleChange(e, index)}
                                size="small"
                              />
                            </>
                          )}
                          <TextField
                            label="Grade Name"
                            autoComplete="off"
                            name="name"
                            type="text"
                            value={field.name}
                            className="transport-text-field-km fixed-input-text-box"
                            onBlur={this.validate}
                            variant="outlined"
                            inputProps={{ maxLength: 10 }}
                            helperText={
                              errorDetails[`name${index}`] &&
                              errorDetails[`name${index}`]
                            }
                            error={
                              errorDetails[`name${index}`] &&
                              errorDetails[`name${index}`]
                            }
                            onChange={(e) => this.handleChange(e, index)}
                            size="small"
                          />
                            <FormControlLabel
                              control={
                              <Switch
                                color="secondary"
                                name="is_fail_grade"
                                checked={field.is_fail_grade || false}
                                onChange={(e) => this.handleFailGradeChange(e, index)}
                              />
                            }
                            style={{marginLeft: '5px'}}
                            label="Is Fail Grade"
                          />
                          {fieldDetails.length - 1 != index && (
                            <Box onClick={(e) => this.removeField(e, index)}>
                              <CancelIcon
                                className="pointer"
                                style={{ color: "red" }}
                              />
                            </Box>
                          )}
                          {fieldDetails.length - 1 === index && (
                            <Box
                              w="100"
                              className={
                                errorDetails[`to_range${index}`] ||
                                errorDetails[`name${index}`]
                                  ? "add-new-km-button p-b-20px"
                                  : "add-new-km-button"
                              }
                            >
                              <AddCircleIcon
                                color="primary"
                                onClick={this.addNew}
                                className="pointer"
                              />
                            </Box>
                          )}
                        </Box>
                      );
                    })}
                  </div>
                  <Box className="end-flex-prop  width-100">
                    <Button
                      variant="contained"
                      color="primary"
                      className="submit"
                      disabled={this.state.submitDisable}
                      onClick={() => this.submit()}
                    >
                      Submit &nbsp;{" "}
                    </Button>
                  </Box>
                </Box>
              </Grid>
              <Grid
                item
                md={4}
                xs={12}
                sm={12}
                className={classNames("header-align")}
              >
                <Paper className="header-align -expenses-right-part-paper">
                  <Box className="create-expenses-info-outer-box ">
                    <Box className="create-expenses-outer-box-label-value p-t-20px">
                      {grade_type != 2 && (
                        <Box className="grade-label-from-to">
                          <FormattedMessage {...messages.fromToRangeMarks} />
                        </Box>
                      )}
                      <Box className="grade-label-name">
                        <FormattedMessage {...messages.gradeName} />{" "}
                      </Box>
                      <Box className="grade-label-name">
                        Is Failed Grade
                      </Box>
                    </Box>
                    {fieldDetails.map((field, index) => {
                      return (
                        <Box className="create-expenses-outer-box-label-value">
                          {grade_type != 2 && (
                            <Box className="create-expenses-label">{`${
                              index === 0 ? 0 : parseFloat(field.from_range)
                            } - ${field.to_range} ${
                              grade_type == 0 ? "" : "%"
                            }`}</Box>
                          )}
                          <Box className="create-expenses-value">
                            {field.name}
                          </Box>
                          <Box className="create-expenses-value">
                              {field.is_fail_grade ? "Yes" : "No"}
                          </Box>
                        </Box>
                      );
                    })}
                  </Box>
                </Paper>
              </Grid>
            </Grid>
            <Snackbar
              anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
              open={snackbar}
              autoHideDuration={4000}
              onClose={this.handleClose}
            >
              <Alert onClose={this.handleClose} severity="error">
                {alertData}
              </Alert>
            </Snackbar>
          </Box>
        </Paper>
      );
    }
  }
}

export default withRouter(GradePlanAdd);
