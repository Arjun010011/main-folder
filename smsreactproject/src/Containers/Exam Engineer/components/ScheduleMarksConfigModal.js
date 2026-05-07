import React, { Component } from "react";
import {
  TableContainer,
  Table,
  TableHead,
  TableCell,
  TableRow,
  TableBody,
  Grid,
  Button,
  DialogContent,
  DialogContentText,
  Tooltip,
  Dialog,
  TextField,
  DialogActions,
  CircularProgress,
  FormControlLabel,
  Switch,
} from "@material-ui/core";
import { withRouter } from "react-router-dom";
import AddCircleOutlineOutlinedIcon from "@material-ui/icons/AddCircleOutlineOutlined";
import MultipleSelectDropdown from "Components/MultipleSelectDropdown";
import { floatNumberWithTwoDecimalRegex } from "Constants/regularExpression";
import { getRequest } from "Includes/api/apicall";
import { GET_URL } from "Includes/urls";
import isObject from "lodash/isObject";
import DeleteOutlineIcon from "@material-ui/icons/DeleteOutline";
import { cloneDeep } from "lodash";
import InfoIcon from "@material-ui/icons/Info";
import { numberWithCommasWithoutSymbol } from "Includes/functions";
import { Dropdown } from "Components/DropDown";
import { DropDownWithSearch } from "Components/DropDownWithSearch";

const alias_names = JSON.parse(localStorage.getItem("alias_name"))
  ? JSON.parse(localStorage.getItem("alias_name"))
  : {};

class ScheduleMarksConfigModal extends Component {
  constructor() {
    super();
    this.state = {
      openPopup: false,
      selectedCumulativeList: [],
      selectedCumulative: [],
      updateDisable: true,
      loadingTypes: true,
      isGradeWise: false,
      selectedGrade: {},
      marks_config: {
        deletable_cumulative_mapping: [],
        written_min_marks: "",
        written_max_marks: "",
        total_max_marks: 0,
        total_min_marks: 0,
      },
      cumulativeList: [],
      fieldErrors: {},
      errorText: "",
      grade_list: [],
    };
  }

  componentDidMount = () => {
    let grade_list = [];
    this.props.gradePlanList.map((gradeData) => {
      if (gradeData.grade_type === 2) {
        grade_list.push(gradeData);
      }
    });

    this.setState({
      openPopup: true,
      grade_list,
    });
    this.getCumulativeTypeList();
  };

  getCumulativeNames = (data_list, name, list) => {
    let return_data = [];
    let return_ids = [];
    data_list.map((data) => {
      if (isObject(data)) {
        return_data.push(data[name]);
      } else if (name === "id") {
        return_data.push(data);
      } else if (name === "name") {
        return_ids.push(data);
      }
    });
    if (name === "name" && return_data.length === 0 && data_list.length > 0) {
      if (return_data.length === 0 && data_list.length > 0) {
        list.map((data) => {
          if (return_ids.includes(data.id)) {
            return_data.push(data?.["alias"] ?? data["name"]);
          }
        });
      }
    }
    return return_data;
  };

  getCumulativeTypeList = () => {
    const { marks_details = {} } = this.props;
    let { marks_config, isGradeWise, selectedGrade } = this.state;
    let selectedCumulativeList = [];
    let cumulativeList = [];
    let allCumulativeList = [];
    const url = GET_URL.cumulativetype.api;
    const params = { is_active: true };
    getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        response.data.data.map((data) => {
          data["name"] = data?.["alias"] ?? data["name"];
        });
        let selectedIds = [];
        if (
          marks_details.cumulative_mapping &&
          marks_details.cumulative_mapping.length > 0
        ) {
          marks_details.cumulative_mapping.map((data) => {
            data["name"] = this.getCumulativeNames(
              data.cumulative_type,
              "name",
              response.data.data
            );
            selectedIds = [
              ...selectedIds,
              ...this.getCumulativeNames(data.cumulative_type, "id"),
            ];
            data.cumulative_type = this.getCumulativeNames(
              data.cumulative_type,
              "id"
            );
          });
          selectedCumulativeList = cloneDeep(marks_details.cumulative_mapping);
        }
        if (marks_details.max_marks) {
          marks_config.written_max_marks = marks_details.max_marks;
          marks_config.written_min_marks = marks_details.min_marks;
        }
        if (marks_details?.marks_details?.selectedGrade?.id) {
          isGradeWise = true;
          selectedGrade = marks_details.marks_details.selectedGrade;
        }
        cumulativeList = cloneDeep(response.data.data);
        allCumulativeList = cloneDeep(response.data.data);
        this.setState(
          {
            cumulativeList,
            allCumulativeList,
            selectedCumulativeList,
            marks_config,
            loadingTypes: false,
            isGradeWise,
            selectedGrade,
          },
          () => {
            this.updateCumulativeDropDown(selectedIds);
            this.updateTotalMarks();
          }
        );
      }
    });
  };

  handleClosePopup = () => {
    this.setState(
      {
        openPopup: false,
        selectedCumulativeList: [],
        selectedCumulative: [],
        updateDisable: true,
        marks_config: {
          deletable_cumulative_mapping: [],
          written_min_marks: "",
          written_max_marks: "",
          total_max_marks: 0,
          total_min_marks: 0,
        },
        cumulativeList: [],
        fieldErrors: {},
      },
      () => {
        this.props.handleCloseDialog();
      }
    );
  };

  handleSearchChange = (e) => {
    let { fieldErrors } = this.state;
    delete fieldErrors["selectedCumulative"];
    this.setState({
      selectedCumulative: e,
      fieldErrors,
      errorText: "",
    });
  };

  handleClickAdd = () => {
    let { selectedCumulative, selectedCumulativeList } = this.state;
    if (selectedCumulative.length > 0) {
      let temp = {};
      let selectedIds = [];
      temp["cumulative_type"] = [];
      temp["name"] = [];
      temp["max_marks"] = "";
      temp["min_marks"] = "";
      selectedCumulative.forEach((data) => {
        temp["cumulative_type"].push(data.id);
        temp["name"].push(data.name);
        selectedIds.push(data.id);
      });
      selectedCumulativeList.push(temp);
      this.updateCumulativeDropDown(selectedIds);
      this.setState({
        selectedCumulativeList,
        selectedCumulative: [],
      });
    }
  };

  updateCumulativeDropDown = (selectedIds, isDelete) => {
    const { allCumulativeList, cumulativeList } = this.state;
    let availableList = [];
    if (isDelete) {
      allCumulativeList.forEach((data) => {
        if (!selectedIds.includes(data.id)) {
          availableList.push(data);
        }
      });
    } else {
      cumulativeList.forEach((data) => {
        if (!selectedIds.includes(data.id)) {
          availableList.push(data);
        }
      });
    }
    this.setState({
      cumulativeList: [...availableList],
    });
  };

  handleCumulativeChange = (e, index) => {
    let { selectedCumulativeList, fieldErrors } = this.state;
    let { name, value } = e.target;
    delete fieldErrors[`${name}_${index}`];
    selectedCumulativeList[index][name] = value;
    this.setState({
      fieldErrors,
      selectedCumulativeList,
      updateDisable: false,
    });
  };

  handleUpdateParentCumulative = (e, index, max_number) => {
    let { selectedCumulativeList, fieldErrors } = this.state;
    let { name, value } = e.target;
    delete fieldErrors[`${name}_${index}`];
    if (
      (!floatNumberWithTwoDecimalRegex.value.test(value) ||
        parseFloat(value) < 0 ||
        parseFloat(value) > parseFloat(max_number)) &&
      (name === "min_marks" || name === "max_marks")
    ) {
      if (!floatNumberWithTwoDecimalRegex.value.test(value)) {
        fieldErrors[`${name}_${index}`] = "Invalid Marks";
      } else if (floatNumberWithTwoDecimalRegex.value.test(max_number)) {
        fieldErrors[`${name}_${index}`] = `Max ${max_number} Marks`;
      }
    }
    if (
      name === "max_marks" &&
      selectedCumulativeList[index]["min_marks"] &&
      (!floatNumberWithTwoDecimalRegex.value.test(value) ||
        parseFloat(value) < 0 ||
        parseFloat(selectedCumulativeList[index]["min_marks"]) >
          parseFloat(value))
    ) {
      fieldErrors[
        `min_marks_${index}`
      ] = `Max ${selectedCumulativeList[index]["max_marks"]} Marks`;
    }
    if (name === "max_marks" && parseFloat(value) < parseFloat("1")) {
      fieldErrors[`${name}_${index}`] = `Min 1 Marks`;
    }
    if (!fieldErrors[`${name}_${index}`]) {
      selectedCumulativeList[index][name] = value;
    }
    this.setState(
      {
        fieldErrors,
        selectedCumulativeList,
        updateDisable: false,
      },
      () => {
        this.updateTotalMarks();
        this.updateValidations();
      }
    );
  };

  handleWrittenChange = (e) => {
    let { marks_config, fieldErrors } = this.state;
    let { name, value } = e.target;
    delete fieldErrors[name];
    marks_config[name] = value;
    this.setState({
      fieldErrors: { ...fieldErrors },
      marks_config,
      updateDisable: false,
    });
  };

  updateParentValue = (e, max_number) => {
    let { marks_config, fieldErrors } = this.state;
    let { name, value } = e.target;
    if (
      name === "written_max_marks" &&
      marks_config["written_min_marks"] &&
      (!floatNumberWithTwoDecimalRegex.value.test(value) ||
        parseFloat(value) < 0 ||
        parseFloat(marks_config["written_min_marks"]) > parseFloat(value))
    ) {
      if (
        floatNumberWithTwoDecimalRegex.value.test(
          marks_config["written_max_marks"]
        )
      ) {
        fieldErrors[
          `written_min_marks`
        ] = `Max ${marks_config["written_max_marks"]} Marks`;
      }
    }
    if (
      !floatNumberWithTwoDecimalRegex.value.test(value) ||
      parseFloat(value) < 0 ||
      (parseFloat(value) > parseFloat(max_number) &&
        (name === "written_min_marks" || name === "written_max_marks"))
    ) {
      if (!floatNumberWithTwoDecimalRegex.value.test(value)) {
        fieldErrors[name] = "Invalid Marks";
      } else {
        fieldErrors[name] = `Max ${max_number} Marks`;
      }
    }
    if (name === "written_max_marks" && parseFloat(value) < parseFloat("1")) {
      fieldErrors[name] = `Min 1 Marks`;
    }
    this.setState(
      {
        fieldErrors: { ...fieldErrors },
        marks_config,
        updateDisable: false,
      },
      () => {
        this.updateTotalMarks();
        this.updateValidations();
      }
    );
  };

  updateTotalMarks = () => {
    let { selectedCumulativeList, marks_config } = this.state;
    marks_config["total_min_marks"] = 0;
    marks_config["total_max_marks"] = 0;
    if (
      floatNumberWithTwoDecimalRegex.value.test(marks_config.written_max_marks)
    ) {
      marks_config.total_max_marks =
        parseFloat(marks_config.written_max_marks) +
        marks_config.total_max_marks;
    }
    if (
      floatNumberWithTwoDecimalRegex.value.test(marks_config.written_min_marks)
    ) {
      marks_config.total_min_marks =
        parseFloat(marks_config.written_min_marks) +
        marks_config.total_min_marks;
    }
    selectedCumulativeList.map((data) => {
      if (floatNumberWithTwoDecimalRegex.value.test(data.max_marks)) {
        marks_config.total_max_marks =
          parseFloat(data.max_marks) + marks_config.total_max_marks;
      }
      if (floatNumberWithTwoDecimalRegex.value.test(data.min_marks)) {
        marks_config.total_min_marks =
          (data.min_marks ? parseFloat(data.min_marks) : 0) +
          marks_config.total_min_marks;
      }
    });
    this.setState({
      marks_config,
    });
  };

  updateValidations = (isPost) => {
    let { selectedCumulativeList, marks_config, fieldErrors } = this.state;
    let writtenValidate = true;
    let cumValidate = true;
    if (
      !floatNumberWithTwoDecimalRegex.value.test(marks_config.written_max_marks) &&
      isPost 
    ) {
      fieldErrors["written_max_marks"] = "Enter Mark";
      writtenValidate = false;
    } else if (
      floatNumberWithTwoDecimalRegex.value.test(marks_config.written_max_marks) &&
      parseFloat(marks_config.written_max_marks) > 200
    ) {
      fieldErrors["written_max_marks"] = "Max 200 Marks";
      writtenValidate = false;
    }
    if (
      !floatNumberWithTwoDecimalRegex.value.test(marks_config.written_min_marks) &&
      isPost
    ) {
      fieldErrors["written_min_marks"] = "Enter Marks";
      writtenValidate = false;
    } else if (
      floatNumberWithTwoDecimalRegex.value.test(marks_config.written_min_marks) &&
      parseFloat(marks_config.written_min_marks) >
        parseFloat(marks_config.written_max_marks)
    ) {
      fieldErrors[
        "written_min_marks"
      ] = `Max ${marks_config.written_max_marks} Marks`;
      writtenValidate = false;
    }
    if (writtenValidate && selectedCumulativeList.length === 0) {
      cumValidate = false;
    }
    selectedCumulativeList.map((data, index) => {
      if (!Number.isInteger(parseFloat(data.max_marks)) && isPost) {
        fieldErrors[`max_marks_${index}`] = "Invalid Marks";
        cumValidate = false;
      } else if (
        Number.isInteger(parseFloat(data.max_marks)) &&
        parseFloat(data.max_marks) > 200
      ) {
        fieldErrors[`max_marks_${index}`] = "Max 200 Marks";
        cumValidate = false;
      }
      if (!Number.isInteger(parseFloat(data.min_marks)) && isPost) {
        fieldErrors[`min_marks_${index}`] = "Invalid Marks";
        cumValidate = false;
      } else if (
        Number.isInteger(parseFloat(data.max_marks)) &&
        parseFloat(data.min_marks) > parseFloat(data.max_marks)
      ) {
        fieldErrors[`min_marks_${index}`] = `Max ${data.max_marks} Marks`;
        cumValidate = false;
      }
    });
    this.setState({
      marks_config,
      fieldErrors,
    });
    return cumValidate || writtenValidate;
  };

  handleApply = () => {
    let {
      marks_config,
      selectedCumulativeList,
      fieldErrors,
      selectedGrade,
      isGradeWise,
    } = this.state;
    if (isGradeWise) {
      marks_config.selectedGrade = selectedGrade;
      if (selectedGrade) {
        this.props.updateMarksCumulative(marks_config, null, true);
      } else {
        fieldErrors["selectedGrade"] = `Select Grade`;
        this.setState({ fieldErrors });
      }
    } else {
      let return_data = this.updateValidations(true);
      if (return_data) {
        marks_config.written_max_marks = parseFloat(
          marks_config.written_max_marks
        );
        marks_config.written_min_marks = parseFloat(
          marks_config.written_min_marks
        );
        this.props.updateMarksCumulative(marks_config, selectedCumulativeList);
      }
    }
  };

  handleDeleteCumulative = (index) => {
    let { selectedCumulativeList, marks_config, fieldErrors } = this.state;
    if (selectedCumulativeList[index].id) {
      marks_config.deletable_cumulative_mapping.push(
        selectedCumulativeList[index].id
      );
    }
    selectedCumulativeList.splice(index, 1);
    delete fieldErrors[`max_marks_${index}`];
    delete fieldErrors[`min_marks_${index}`];
    let selectedIds = [];
    selectedCumulativeList.forEach((data) => {
      selectedIds = [
        ...selectedIds,
        ...this.getCumulativeNames(data.cumulative_type, "id"),
      ];
    });
    this.updateCumulativeDropDown(selectedIds, "delete");
    this.setState(
      {
        selectedCumulativeList,
        marks_config,
        updateDisable: false,
        fieldErrors,
      },
      () => {
        this.updateValidations();
        this.updateTotalMarks();
      }
    );
  };

  handleGradeChange = () => {
    this.setState({
      isGradeWise: !this.state.isGradeWise,
    });
  };

  handleDropDownSearchChange = (e, newValue) => {
    this.setState({
      selectedGrade: newValue,
      updateDisable: newValue ? false : true,
    });
  };

  render() {
    const {
      openPopup,
      cumulativeList,
      selectedCumulative,
      selectedCumulativeList,
      fieldErrors,
      marks_config,
      updateDisable,
      loadingTypes,
      errorText,
      isGradeWise,
      selectedGrade,
      grade_list,
    } = this.state;
    const { isMultiple, is_cumulative, gradePlanList } = this.props;
    return (
      <Dialog
        open={openPopup}
        className="action-marks-modal-width"
        // onClose={this.handleClosePopup}
        aria-labelledby="form-dialog-title"
      >
        <DialogContent>
          <DialogContentText className="d-flex flex-justify-space-between">
            <div>{`Enter The Marks Details`}</div>
            <div>
              <FormControlLabel
                control={
                  <Switch
                    checked={isGradeWise}
                    name={"isGradeWise"}
                    value={isGradeWise}
                    color="primary"
                    onChange={(e) => this.handleGradeChange(!isGradeWise)}
                  />
                }
                label={"Is Grade"}
              />
            </div>
          </DialogContentText>
          {isGradeWise ? (
            <div>
              <DropDownWithSearch
                options={grade_list}
                label="Grade Plan"
                size="small"
                value={selectedGrade}
                onChange={this.handleDropDownSearchChange}
                error={fieldErrors["selectedGrade"]}
              />
              <div style={{ height: "200px", overflow: "auto" }}>
                <TableContainer className="header-align">
                  <Table
                    size="small"
                    aria-label="simple table"
                    className="width-100-perc"
                  >
                    <TableHead>
                      <TableRow className="">
                        <TableCell className="selectable-table-head">
                          Name
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody className="selectable-row-table-body">
                      {selectedGrade?.grade_plan_data &&
                        selectedGrade.grade_plan_data.map(
                          (component, compIndex) => {
                            return (
                              <TableRow className="selectable-row-table-row">
                                <TableCell
                                  className="mark-add-table-cell"
                                  component="th"
                                  scope="row"
                                >
                                  {component.name}
                                </TableCell>
                              </TableRow>
                            );
                          }
                        )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </div>
            </div>
          ) : (
            <div>
              {loadingTypes ? (
                <div className="loading">
                  <CircularProgress />
                </div>
              ) : (
                <div>
                  <Grid container className="text-bold mt-20">
                    <Grid item md={4} xs={4}></Grid>
                    <Grid item md={4} xs={4}>
                      Max Marks
                    </Grid>
                    <Grid item md={3} xs={3}>
                      Min Marks
                    </Grid>
                  </Grid>
                  <Grid container className="align-items-center">
                    <Grid item md={4} xs={4}>
                      {alias_names["written"]}
                    </Grid>
                    <Grid item md={4} xs={4}>
                      <TextField
                        id="number"
                        label=""
                        type="text"
                        name="written_max_marks"
                        autoComplete="off"
                        value={marks_config.written_max_marks}
                        className="schedule-exam-marks-text"
                        onChange={(e) => this.handleWrittenChange(e, 200)}
                        onBlur={this.updateParentValue}
                        defaultValue=""
                        InputLabelProps={{
                          shrink: true,
                        }}
                        // inputProps={{
                        //     max: 200,
                        //     min: 0,
                        //     maxLength: '4'
                        // }}
                        InputProps={{
                          endAdornment: fieldErrors[`written_max_marks`] ? (
                            <Tooltip
                              title={fieldErrors[`written_max_marks`]}
                              enterDelay={400}
                              enterNextDelay={400}
                              placement="top-start"
                              classes={{ tooltip: "tooltip-show-data" }}
                            >
                              <InfoIcon className="time-table-info-icon cursor-pointer" />
                            </Tooltip>
                          ) : (
                            ""
                          ),
                        }}
                        // helperText={fieldErrors[`written_max_marks`] && fieldErrors[`written_max_marks`]}
                        error={
                          fieldErrors[`written_max_marks`] &&
                          fieldErrors[`written_max_marks`]
                        }
                      />
                    </Grid>
                    <Grid item md={3} xs={3}>
                      <TextField
                        id="number"
                        label=""
                        type="text"
                        name="written_min_marks"
                        autoComplete="off"
                        value={marks_config.written_min_marks}
                        className="schedule-exam-marks-text"
                        onChange={(e) =>
                          this.handleWrittenChange(
                            e,
                            marks_config.written_max_marks
                          )
                        }
                        onBlur={this.updateParentValue}
                        defaultValue=""
                        disabled={!marks_config.written_max_marks}
                        InputLabelProps={{
                          shrink: true,
                        }}
                        InputProps={{
                          max: marks_config.written_max_marks,
                          min: 0,
                          maxLength: 4,
                          endAdornment: fieldErrors[`written_min_marks`] ? (
                            <Tooltip
                              title={fieldErrors[`written_min_marks`]}
                              enterDelay={400}
                              enterNextDelay={400}
                              placement="top-start"
                              classes={{ tooltip: "tooltip-show-data" }}
                            >
                              <InfoIcon className="time-table-info-icon cursor-pointer" />
                            </Tooltip>
                          ) : (
                            ""
                          ),
                        }}
                        // helperText={fieldErrors[`written_min_marks`] && fieldErrors[`written_min_marks`]}
                        error={
                          fieldErrors[`written_min_marks`] &&
                          fieldErrors[`written_min_marks`]
                        }
                      />
                    </Grid>
                  </Grid>
                </div>
              )}
              {selectedCumulativeList.length > 0 && is_cumulative && (
                <Grid container className="text-bold mt-20">
                  <Grid item md={4} xs={4}>
                    {`${alias_names["cumulative"]} Type`}
                  </Grid>
                  <Grid item md={4} xs={4}></Grid>
                  <Grid item md={3} xs={3}></Grid>
                </Grid>
              )}
              {is_cumulative &&
                selectedCumulativeList.map((data, index) => {
                  return (
                    <Grid
                      container
                      key={index}
                      className="align-items-center mt-10"
                    >
                      <Grid item md={4} xs={4}>
                        <div>{data.name.join(", ")}</div>
                      </Grid>
                      <Grid item md={4} xs={4}>
                        <TextField
                          id="number"
                          label={
                            selectedCumulativeList.length > 0 ? "" : "Max Marks"
                          }
                          type="text"
                          name="max_marks"
                          autoComplete="off"
                          value={data.max_marks}
                          className="schedule-exam-marks-text"
                          onChange={(e) =>
                            this.handleCumulativeChange(e, index)
                          }
                          onBlur={(e) =>
                            this.handleUpdateParentCumulative(e, index, 200)
                          }
                          defaultValue=""
                          InputLabelProps={{
                            shrink: true,
                          }}
                          // inputProps={{
                          //     max: 200,
                          //     min: 0,
                          //     maxLength: '4'
                          // }}
                          InputProps={{
                            max: 200,
                            min: 0,
                            maxLength: 4,
                            endAdornment: fieldErrors[`max_marks_${index}`] ? (
                              <Tooltip
                                title={fieldErrors[`max_marks_${index}`]}
                                enterDelay={400}
                                enterNextDelay={400}
                                placement="top-start"
                                classes={{ tooltip: "tooltip-show-data" }}
                              >
                                <InfoIcon className="time-table-info-icon cursor-pointer" />
                              </Tooltip>
                            ) : (
                              ""
                            ),
                          }}
                          // helperText={fieldErrors[`max_marks_${index}`] && fieldErrors[`max_marks_${index}`]}
                          error={
                            fieldErrors[`max_marks_${index}`] &&
                            fieldErrors[`max_marks_${index}`]
                          }
                        />
                      </Grid>
                      <Grid item md={3} xs={3}>
                        <TextField
                          id="number"
                          label={
                            selectedCumulativeList.length > 0 ? "" : "Min Marks"
                          }
                          type="text"
                          name="min_marks"
                          autoComplete="off"
                          value={data.min_marks}
                          className="schedule-exam-marks-text"
                          onChange={(e) =>
                            this.handleCumulativeChange(e, index)
                          }
                          onBlur={(e) =>
                            this.handleUpdateParentCumulative(
                              e,
                              index,
                              data.max_marks
                            )
                          }
                          defaultValue=""
                          disabled={!data.max_marks}
                          InputLabelProps={{
                            shrink: true,
                          }}
                          InputProps={{
                            max: data.max_marks,
                            min: 0,
                            maxLength: 4,
                            endAdornment: fieldErrors[`min_marks_${index}`] ? (
                              <Tooltip
                                title={fieldErrors[`min_marks_${index}`]}
                                enterDelay={400}
                                enterNextDelay={400}
                                placement="top-start"
                                classes={{ tooltip: "tooltip-show-data" }}
                              >
                                <InfoIcon className="time-table-info-icon cursor-pointer" />
                              </Tooltip>
                            ) : (
                              ""
                            ),
                          }}
                          // helperText={fieldErrors[`min_marks_${index}`] && fieldErrors[`min_marks_${index}`]}
                          error={
                            fieldErrors[`min_marks_${index}`] &&
                            fieldErrors[`min_marks_${index}`]
                          }
                        />
                      </Grid>
                      <Grid item md={1} xs={1}>
                        <Tooltip
                          title={`Delete ${alias_names["cumulative"]}`}
                          enterDelay={400}
                          enterNextDelay={400}
                          placement="top-start"
                          classes={{ tooltip: "tooltip-show-data" }}
                        >
                          <DeleteOutlineIcon
                            className="text-red pointer"
                            onClick={() => this.handleDeleteCumulative(index)}
                          />
                        </Tooltip>
                      </Grid>
                    </Grid>
                  );
                })}
              {is_cumulative && (
                <Grid container className="align-items-center mt-10 text-bold">
                  <Grid item md={4} xs={4}>
                    <div>Total</div>
                  </Grid>
                  <Grid item md={4} xs={4}>
                    <div>
                      {numberWithCommasWithoutSymbol(
                        marks_config.total_max_marks
                      )}
                    </div>
                  </Grid>
                  <Grid item md={3} xs={3}>
                    <div>
                      {numberWithCommasWithoutSymbol(
                        marks_config.total_min_marks
                      )}
                    </div>
                  </Grid>
                </Grid>
              )}
              {is_cumulative && (
                <Grid container className="align-items-center">
                  <Grid item md={6} xs={6}>
                    <MultipleSelectDropdown
                      data_list={cumulativeList}
                      selected_list={selectedCumulative}
                      error={
                        fieldErrors["selectedCumulative"] &&
                        fieldErrors["selectedCumulative"]
                      }
                      label={`${alias_names["cumulative"]} Type`}
                      onChange={(e) => this.handleSearchChange(e)}
                      className={"width-100"}
                      size="small"
                    />
                  </Grid>
                  <Grid item md={2} xs={2} className="mt-20">
                    <Tooltip
                      title={`Add ${alias_names["cumulative"]}`}
                      placement="top-start"
                    >
                      <AddCircleOutlineOutlinedIcon
                        onClick={this.handleClickAdd}
                        className="set-question-add-icon"
                      />
                    </Tooltip>
                  </Grid>
                </Grid>
              )}
              {isMultiple && (
                <div className="text-red mt-30">
                  Note : Exisiting selected data will be erased and replaced
                  with new value
                </div>
              )}
            </div>
          )}
        </DialogContent>
        <DialogActions>
          {errorText && <div className="text-red">{errorText}</div>}
          <Button onClick={this.handleClosePopup} color="secondary">
            Close
          </Button>
          <Button
            disabled={Object.keys(fieldErrors).length > 0 ? true : false}
            onClick={this.handleApply}
            color="primary"
          >
            Submit
          </Button>
        </DialogActions>
      </Dialog>
    );
  }
}

export default withRouter(ScheduleMarksConfigModal);
