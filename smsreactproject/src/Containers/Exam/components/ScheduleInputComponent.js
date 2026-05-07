import React, { Component } from "react";
import { Box, Button, TableCell, Tooltip, TextField } from "@material-ui/core";
import AddCircleOutlineIcon from "@material-ui/icons/AddCircleOutline";
import {
  MuiPickersUtilsProvider,
  KeyboardDatePicker,
} from "@material-ui/pickers";
import DateFnsUtils from "@date-io/date-fns";
import { validateDate, getSettingValue } from "Includes/functions";
import { floatNumberWithTwoDecimalRegex } from "Constants/regularExpression";
import EditIcon from "@material-ui/icons/Edit";
import ScheduleMarksConfigModal from "./ScheduleMarksConfigModal";
import { cloneDeep } from "lodash";

const number_of_language =
  parseInt(getSettingValue("number_of_language")) > 1 ? true : false;
const exam_config = JSON.parse(localStorage.getItem("exam_configurations"))
  ? JSON.parse(localStorage.getItem("exam_configurations"))
  : {};
const is_cumulative = exam_config["cumulative_type"] == 1 ? true : false;
// const is_cumulative = false;

class ScheduleInputComponent extends Component {
  constructor(props) {
    super(props);
    this.state = {
      standard_list: null,
      field_error: {},
      helper_text: {},
      isMarkConfig: false,
      marksConfig: { isEdit: false },
      loading: false,
    };
  }

  componentDidMount = () => {
    this.setDefaultValues();
  };

  componentWillReceiveProps = (nextProps) => {
    this.setDefaultValues();
  };

  setDefaultValues = () => {
    this.setState(
      {
        loading: true,
        standard_list: null,
      },
      () => {
        let { standardList, fieldError, helperText } = this.props;
        this.setState({
          standard_list: cloneDeep(standardList),
          field_error: fieldError,
          helper_text: helperText,
          loading: false,
        });
      }
    );
  };

  handleDateChange = (e, stIndex, subIndex, name) => {
    let { standard_list, field_error } = this.state;
    let { start_date, end_date } = this.props;
    let value = e;
    let error;
    if (value !== null) error = validateDate(value, start_date, end_date);
    if (error !== "") {
      field_error[`${name}${stIndex}${subIndex}`] = error;
    } else {
      field_error[`${name}${stIndex}${subIndex}`] = "";
    }
    standard_list[stIndex]["subject_list"][subIndex][name] = value;
    this.setState({
      standard_list,
      field_error,
    });
  };

  handleCheckChange = () => {
    let { standard_list } = this.state;
    const { stIndex, subIndex } = this.props;
    standard_list[stIndex]["subject_list"][subIndex]["checked"] =
      !standard_list[stIndex]["subject_list"][subIndex]["checked"];
    this.setState(
      {
        standard_list,
      },
      () => {
        this.updateParentValue();
      }
    );
  };

  handleChange = (e, stIndex, subIndex, max_number) => {
    let { standard_list, field_error, helper_text } = this.state;
    let { name, value } = e.target;
    if (name === "start_time" || name === "end_time") {
      if (value) {
        value = value + ":" + "00";
      }
    }
    if (name === "max_marks") {
      standard_list[stIndex]["subject_list"][subIndex]["min_marks"] = "";
    }
    if (name !== "schedule_sequence") {
      field_error[`${name}${stIndex}${subIndex}`] = "";
      helper_text[`${name}${stIndex}${subIndex}`] = "";
    }
    standard_list[stIndex]["subject_list"][subIndex][name] = value;
    if (
      (!floatNumberWithTwoDecimalRegex.value.test(value) ||
        parseInt(value) < 0 ||
        parseInt(value) > parseInt(max_number)) &&
      (name === "min_marks" || name === "max_marks")
    ) {
      if (!floatNumberWithTwoDecimalRegex.value.test(value)) {
        field_error[`${name}${stIndex}${subIndex}`] = "Invalid Marks";
      } else {
        field_error[`${name}${stIndex}${subIndex}`] = `Max ${max_number} Mark`;
      }
    }
    if (name === "max_marks" && parseInt(value) < parseInt("1")) {
      field_error[`${name}${stIndex}${subIndex}`] = `Min 1 Mark`;
    }
    this.setState({
      standard_list,
      field_error,
      helper_text,
    });
  };

  updateParentValue = () => {
    const { standard_list, field_error, helper_text } = this.state;
    const { stIndex, subIndex } = this.props;
    this.props.updateParent(
      standard_list,
      stIndex,
      subIndex,
      field_error,
      helper_text
    );
  };

  handleOpenMarksConfigModal = (stIndex, subIndex) => {
    let { marksConfig } = this.state;
    marksConfig["stIndex"] = stIndex;
    marksConfig["subIndex"] = subIndex;
    marksConfig["status"] = true;
    this.setState({
      marksConfig,
    });
  };

  handleCloseMarksConfigModal = () => {
    let { marksConfig } = this.state;
    marksConfig["status"] = false;
    this.setState({
      marksConfig,
    });
  };

  updateMarksCumulative = (marks_details, cumulative_details, isGradeOnly) => {
    let { standard_list, marksConfig } = this.state;
    if (isGradeOnly) {
      standard_list[marksConfig.stIndex]["subject_list"][marksConfig.subIndex][
        "marks_details"
      ] = marks_details;
      marksConfig["status"] = false;
    } else {
      standard_list[marksConfig.stIndex]["subject_list"][marksConfig.subIndex][
        "marks_details"
      ] = marks_details;
      standard_list[marksConfig.stIndex]["subject_list"][marksConfig.subIndex][
        "cumulative_mapping"
      ] = cumulative_details;
      standard_list[marksConfig.stIndex]["subject_list"][marksConfig.subIndex][
        "deletable_cumulative_mapping"
      ] = marks_details.deletable_cumulative_mapping;
      standard_list[marksConfig.stIndex]["subject_list"][marksConfig.subIndex][
        "total_max_marks"
      ] = marks_details.total_max_marks;
      standard_list[marksConfig.stIndex]["subject_list"][marksConfig.subIndex][
        "total_min_marks"
      ] = marks_details.total_min_marks;
      standard_list[marksConfig.stIndex]["subject_list"][marksConfig.subIndex][
        "max_marks"
      ] = marks_details.written_max_marks;
      standard_list[marksConfig.stIndex]["subject_list"][marksConfig.subIndex][
        "min_marks"
      ] = marks_details.written_min_marks;
      marksConfig["status"] = false;
    }
    this.setState(
      {
        marksConfig,
      },
      () => {
        this.updateParentValue();
      }
    );
  };

  render() {
    const {
      handleEnable,
      subject,
      start_date,
      end_date,
      stIndex,
      subIndex,
      fieldError,
      helperText,
      is_multiple_schedule,
      getAliasLanguage,
    } = this.props;
    const { standard_list, marksConfig, loading } = this.state;
    const is_marks_entered =
      is_cumulative && standard_list
        ? standard_list[stIndex]?.["subject_list"][subIndex]?.[
            "marks_details"
          ]?.["selectedGrade"]?.["id"]
          ? true
          : standard_list[stIndex]?.["subject_list"][subIndex]?.[
              "total_max_marks"
            ] &&
            (standard_list[stIndex]["subject_list"][subIndex][
              "total_min_marks"
            ] ||
              (standard_list[stIndex]["subject_list"][subIndex][
                "total_max_marks"
              ] != 0 &&
                standard_list[stIndex]["subject_list"][subIndex][
                  "total_min_marks"
                ] == 0))
          ? true
          : false
        : false;
    return (
      <>
        <TableCell className="" component="th" scope="row">
          <div
            className="display-flex align-self-center pointer"
            onClick={() => this.handleCheckChange()}
          >
            <input
              type="checkbox"
              className="pointer"
              name={subject.checked}
              value={subject.checked}
              checked={subject.checked}
            ></input>
            {subject.is_language && number_of_language
              ? subject.refId
                ? `${subject.subject_name} ${getAliasLanguage(
                    subject.sequence
                  )} - (${subject.refId})`
                : `${subject.subject_name} ${getAliasLanguage(
                    subject.sequence
                  )}`
              : subject.refId
              ? `${subject.subject_name} - (${subject.refId})`
              : subject.subject_name}
          </div>
        </TableCell>
        {is_cumulative &&
        standard_list?.[stIndex]?.["subject_list"]?.[subIndex]?.[
          "marks_details"
        ]?.["selectedGrade"]?.["id"] ? (
          <TableCell className="" component="th" scope="row">
            <Box className="text-bold">
              Grade Plan -{" "}
              {
                standard_list?.[stIndex]?.["subject_list"]?.[subIndex]?.[
                  "marks_details"
                ]?.["selectedGrade"]?.["name"]
              }
            </Box>
          </TableCell>
        ) : (
          <TableCell className="" component="th" scope="row">
            {!!subject.isEnabled && !!standard_list && !is_cumulative && (
              <TextField
                id="number"
                label=""
                type="text"
                name="max_marks"
                autoComplete="off"
                value={
                  standard_list[stIndex]["subject_list"][subIndex]["max_marks"]
                }
                className="schedule-exam-marks-text"
                onChange={(e) => this.handleChange(e, stIndex, subIndex, 200)}
                onBlur={this.updateParentValue}
                defaultValue=""
                InputLabelProps={{
                  shrink: true,
                }}
                inputProps={{
                  max: 200,
                  min: 0,
                  maxLength: "4",
                }}
                helperText={
                  !fieldError[`max_marks${stIndex}${subIndex}`]
                    ? ""
                    : fieldError[`max_marks${stIndex}${subIndex}`]
                }
                error={
                  fieldError[`max_marks${stIndex}${subIndex}`] &&
                  (fieldError[`max_marks${stIndex}${subIndex}`] ? true : false)
                }
              />
            )}
            {!subject.isEnabled && (
              <Box className="schedule-exam-empty-box"></Box>
            )}
            {is_cumulative && standard_list && is_marks_entered && (
              <Box>
                {
                  standard_list[stIndex]["subject_list"][subIndex]?.[
                    "total_max_marks"
                  ]
                }
              </Box>
            )}
            {!is_marks_entered && is_cumulative && (
              <Button
                className={
                  subject.checked
                    ? "opacity-0-5 custom-button"
                    : "custom-button"
                }
                disabled={subject.checked}
                onClick={() =>
                  this.handleOpenMarksConfigModal(stIndex, subIndex)
                }
              >
                Enter Marks Detail
              </Button>
            )}
          </TableCell>
        )}
        <TableCell className="" component="th" scope="row">
          {subject.isEnabled && standard_list && !is_cumulative && (
            <TextField
              id="number"
              label=""
              type="text"
              name="min_marks"
              autoComplete="off"
              value={
                standard_list[stIndex]["subject_list"][subIndex]["min_marks"]
              }
              className="schedule-exam-marks-text"
              onChange={(e) =>
                this.handleChange(e, stIndex, subIndex, subject.max_marks)
              }
              onBlur={this.updateParentValue}
              defaultValue=""
              disabled={!subject.max_marks}
              InputLabelProps={{
                shrink: true,
              }}
              inputProps={{
                max: subject.max_marks,
                min: 0,
                maxLength: "4",
              }}
              helperText={
                !fieldError[`min_marks${stIndex}${subIndex}`]
                  ? ""
                  : fieldError[`min_marks${stIndex}${subIndex}`]
              }
              error={
                fieldError[`min_marks${stIndex}${subIndex}`] &&
                (fieldError[`min_marks${stIndex}${subIndex}`] ? true : false)
              }
            />
          )}
          {!subject.isEnabled && (
            <Box className="schedule-exam-empty-box"></Box>
          )}
          {!standard_list?.[stIndex]?.["subject_list"]?.[subIndex]?.[
            "marks_details"
          ]?.["selectedGrade"]?.["id"] &&
            is_cumulative &&
            standard_list &&
            is_marks_entered && (
              <Box>
                {
                  standard_list[stIndex]["subject_list"][subIndex]?.[
                    "total_min_marks"
                  ]
                }
              </Box>
            )}
        </TableCell>
        <TableCell className="" component="th" scope="row">
          {is_marks_entered && is_cumulative && (
            <Tooltip
              title={"Edit Marks Config"}
              enterDelay={400}
              enterNextDelay={400}
              placement="top-start"
              classes={{ tooltip: "tooltip-show-data" }}
            >
              <EditIcon
                className="pointer text-green"
                onClick={() =>
                  this.handleOpenMarksConfigModal(stIndex, subIndex)
                }
              />
            </Tooltip>
          )}
        </TableCell>
        <TableCell className="" component="th" scope="row">
          {subject.isEnabled && standard_list && (
            <MuiPickersUtilsProvider utils={DateFnsUtils}>
              <KeyboardDatePicker
                id="date-picker-inline"
                autoOk
                variant="inline"
                label=""
                className="schedule-exam-date"
                defaultValue={
                  standard_list[stIndex]["subject_list"][subIndex]["fordate"]
                }
                value={
                  standard_list[stIndex]["subject_list"][subIndex]["fordate"]
                }
                autoComplete="off"
                name="fordate"
                minDate={start_date}
                maxDate={end_date}
                format="dd-MM-yyyy"
                onChange={(e) =>
                  this.handleDateChange(e, stIndex, subIndex, "fordate")
                }
                onBlur={this.updateParentValue}
                onClose={this.updateParentValue}
                KeyboardButtonProps={{
                  "aria-label": "change date",
                }}
                helperText={
                  !fieldError[`fordate${stIndex}${subIndex}`]
                    ? ""
                    : fieldError[`fordate${stIndex}${subIndex}`]
                }
                error={
                  fieldError[`fordate${stIndex}${subIndex}`] &&
                  (fieldError[`fordate${stIndex}${subIndex}`] ? true : false)
                }
              />
            </MuiPickersUtilsProvider>
          )}
          {!subject.isEnabled && (
            <Button
              onClick={() => handleEnable(stIndex, subIndex)}
              className="schedule-exam-schedule-button"
              variant="contained"
              color="primary"
            >
              Schedule
            </Button>
          )}
        </TableCell>
        <TableCell className="" component="th" scope="row">
          {subject.isEnabled && standard_list && (
            <TextField
              id="time"
              label=""
              type="time"
              name="start_time"
              defaultValue={
                standard_list[stIndex]["subject_list"][subIndex]["start_time"]
              }
              value={
                standard_list[stIndex]["subject_list"][subIndex]["start_time"]
              }
              onChange={(e) => this.handleChange(e, stIndex, subIndex)}
              onBlur={this.updateParentValue}
              onClose={this.updateParentValue}
              InputLabelProps={{
                shrink: true,
              }}
              inputProps={{
                step: 300, // 5 min
              }}
              helperText={
                helperText[`start_time${stIndex}${subIndex}`]
                  ? helperText[`start_time${stIndex}${subIndex}`]
                  : ""
              }
              error={
                fieldError[`start_time${stIndex}${subIndex}`] &&
                (fieldError[`start_time${stIndex}${subIndex}`] ? true : false)
              }
            />
          )}
          {!subject.isEnabled && (
            <Box className="schedule-exam-empty-box"></Box>
          )}
        </TableCell>
        <TableCell className="" component="th" scope="row">
          {subject.isEnabled && standard_list && (
            <TextField
              id="time"
              label=""
              type="time"
              name="end_time"
              defaultValue={
                standard_list[stIndex]["subject_list"][subIndex]["end_time"]
              }
              value={
                standard_list[stIndex]["subject_list"][subIndex]["end_time"]
              }
              onChange={(e) => this.handleChange(e, stIndex, subIndex)}
              onBlur={this.updateParentValue}
              onClose={this.updateParentValue}
              InputLabelProps={{
                shrink: true,
              }}
              inputProps={{
                step: 300, // 5 min
              }}
              helperText={
                helperText[`end_time${stIndex}${subIndex}`]
                  ? helperText[`end_time${stIndex}${subIndex}`]
                  : ""
              }
              error={
                fieldError[`end_time${stIndex}${subIndex}`] &&
                (fieldError[`end_time${stIndex}${subIndex}`] ? true : false)
              }
            />
          )}
          {!subject.isEnabled && (
            <Box className="schedule-exam-empty-box"></Box>
          )}
        </TableCell>


        {subject.isEnabled && standard_list && (
        <TableCell>
            <TextField
              id="schedule_sequence"
              label=""
              type="number"
              name='schedule_sequence'
              autoComplete="off"
              value={
                standard_list[stIndex]["subject_list"][subIndex]["schedule_sequence"] || null
              }
              className="schedule-exam-marks-text"
              onChange={(e) => this.handleChange(e, stIndex, subIndex)}
              onBlur={this.updateParentValue}
              InputLabelProps={{
                shrink: true,
              }}
              inputProps={{
                min: 0,
                maxLength: "3",
              }}
              helperText={
                fieldError[`schedule_sequence${stIndex}${subIndex}`]
                  ? fieldError[`schedule_sequence${stIndex}${subIndex}`]
                  : ""
              }
              error={
                !!fieldError[`schedule_sequence${stIndex}${subIndex}`]
              }
            />
          </TableCell>
        )}

        <TableCell>
          {is_multiple_schedule && subject.isEnabled && (
            <Tooltip
              title={"Add Sub Schedule"}
              enterDelay={400}
              enterNextDelay={400}
              placement="top-start"
              classes={{ tooltip: "tooltip-show-data" }}
            >
              <AddCircleOutlineIcon
                className="text-blue pointer"
                onClick={() =>
                  this.props.handleAddAnotherSchedule(stIndex, subIndex)
                }
              />
            </Tooltip>
          )}
        </TableCell>
        {marksConfig.status && (
          <ScheduleMarksConfigModal
            handleCloseDialog={this.handleCloseMarksConfigModal}
            updateMarksCumulative={this.updateMarksCumulative}
            marks_details={standard_list[stIndex]["subject_list"][subIndex]}
            is_cumulative={true}
            gradePlanList={this.props.gradePlanList}
          />
        )}
      </>
    );
  }
}

export default ScheduleInputComponent;
