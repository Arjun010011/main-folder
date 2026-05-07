import React, { Component } from "react";
import {
    Paper,
    Button,
    Box,
    Grid,
    MenuItem,
    ListItemText,List,
    // ListItem,ListItemIcon,ListItemSecondaryAction,IconButton,ExpandLess,ExpandMore,Collapse,
    Checkbox,
    Tooltip,
} from "@material-ui/core";
import MenuBookOutlinedIcon from "@material-ui/icons/MenuBookOutlined";
import ScheduleTwoToneIcon from "@material-ui/icons/ScheduleTwoTone";
import KeyboardArrowUpRoundedIcon from "@material-ui/icons/KeyboardArrowUpRounded";
import KeyboardArrowDownRoundedIcon from "@material-ui/icons/KeyboardArrowDownRounded";
import Swal from "sweetalert2";
import HighlightOffTwoToneIcon from "@material-ui/icons/HighlightOffTwoTone";

import { getRequest, postRequest } from "Includes/api/apicall";
import { GET_URL, POST_URL } from "Includes/urls";
import loadingBar from "images/loading.gif";
import Snackbar from "@material-ui/core/Snackbar";
import { Actions } from "Constants/permissions";
import { withRouter } from "react-router-dom";
import { getUrlParam, Alert } from "Includes/functions";

class HrSubjectStandardSectionAddModify extends Component {
    state = {
        selectedYear: 0,
        staff_id: 0,
        subjectList: [],
        standardList: [],
        selectedStaff: "",
        loading: true,
        max_hour: "",
        time: { hour: "00", minute: "00" },
        selectedYearName: "",
        staffDetails: {},
        alertData: "",
        open: false,
        errors: {},
        submitDisable: false,
        languageList: { first: [], second: [], third: [] },
    };
    async componentDidMount() {
        let { year, id, yearName } = getUrlParam();
        let { time, languageList, subjectList, standardList } = this.state;
        const urlnew = GET_URL.assignsubject.api;
        const paramsnew = {
            academic_year: year, staff: id
        };
        getRequest(urlnew, paramsnew, this.props).then((response) => {
            if (response && response.status === 200) {
                response.data.data.map((field) => {
                    // field["enable"] = false;
                    standardList.push(field);
                });
                this.setState({
                    languageList,
                    subjectList,
                    standardList,
                    loading: false,
                    selectedYearName: yearName,
                    selectedYear: year,
                    staffDetails: response.data.data,
                    staff_id: id,
                });
            }
        });
        const url = GET_URL.getstaffsubject.api;
        const params = { academic_year: year, staff: id };
        getRequest(url, params, this.props).then((response) => {
            if (response && response.status === 200) {
                if (response.data.data.id) {
                    let timeSplit = [];
                    timeSplit = response.data.data.max_hour.split(":");
                    time["hour"] = timeSplit[0];
                    time["minute"] = timeSplit[1];
                    response.data.data.assigned_subjects.map((field) => {
                        field["enable"] = true;
                        subjectList.push(field);
                    });
                }
                response.data.data.unassigned_subject.map((field) => {
                    field["enable"] = false;
                    subjectList.push(field);
                });
                this.setState({
                    languageList,
                    subjectList,
                    loading: false,
                    selectedYearName: yearName,
                    selectedYear: year,
                    staffDetails: response.data.data,
                    staff_id: id,
                });
            }
        });
    }

    validate = (errors, time) => {
        let { subjectList } = this.state;
        let isHavingSubject = false;
        let returnValue = [];
        subjectList.map((field) => {
            if (field.enable) {
                isHavingSubject = true;
                if (field.subject_id) {
                    returnValue.push(field.subject_id);
                } else {
                    returnValue.push(field.id);
                }
            }
        });
        let alertData;
        if (!isHavingSubject) {
            alertData = "Please uncheck or click on add subject to the staff";
            returnValue = false;
            this.setState({
                open: true,
                alertData: alertData,
            });
        }
        if (parseInt(time["hour"]) === 0 && parseInt(time["minute"]) === 0) {
            if (!isHavingSubject) {
                returnValue = false;
                errors["AssignHours"] = "assign";
                alertData = "Please Assign Hour To Staff and select atleast one staff";
            } else {
                returnValue = false;
                errors["AssignHours"] = "assign";
                alertData = "Please Assign Hour To Staff";
            }
            this.setState({
                open: true,
                alertData: alertData,
            });
        } else if (parseInt(time["hour"]) === 0 && parseInt(time["minute"]) > 0) {
            let alertData;
            if (!isHavingSubject) {
                returnValue = false;
                errors["AssignHours"] = "assign";
                alertData =
                    "Please Maintain atleast one Hour To Staff and select atleast one Subject";
            } else {
                returnValue = false;
                errors["AssignHours"] = "assign";
                alertData = "Please Maintain At least One hour";
            }
            this.setState({
                open: true,
                alertData: alertData,
            });
        } else if (!isHavingSubject) {
            returnValue = false;
            errors["AssignHours"] = "assign";
            this.setState({
                open: true,
                alertData: "Please Maintain select atleast one Subject",
            });
        }
        return returnValue;
    };

    submit = async () => {
        let { time, errors, selectedYear, staff_id, staffDetails } = this.state;
        errors = {};
        let validateValue = this.validate(errors, time);
        if (validateValue) {
            this.setState({ submitDisable: true });
            if (time["hour"].length === 1) {
                time["hour"] = "0" + time["hour"];
            }
            if (time["minute"].length === 1) {
                time["minute"] = "0" + time["minute"];
            }
            let postData;
            if (staffDetails.id) {
                postData = {
                    id: staffDetails.id,
                    max_hour: time["hour"] + `:` + time["minute"],
                    academic_year: selectedYear,
                    subject: validateValue,
                    staff: staffDetails.staff,
                };
            } else {
                postData = {
                    max_hour: time["hour"] + `:` + time["minute"],
                    academic_year: selectedYear,
                    subject: validateValue,
                    staff: staff_id,
                };
            }

            let url = POST_URL.staffsubject.api;
            url = url + `?academic_year=${selectedYear}/staff=${staff_id}`;
            postRequest(url, postData, this.props).then((response) => {
                if (response && response.status === 200) {
                    this.setState({ submitDisable: false });
                    Swal.fire({
                        position: "top-end",
                        type: "success",
                        title: response.data.Reason,
                        showConfirmButton: false,
                        timer: 1500,
                    });
                    this.props.history.push(Actions.assign_subject.view.url);
                } else {
                    this.setState({ submitDisable: false });
                }
            });
        } else {
            this.setState({ errors });
        }
    };

    onChangeTime = (e) => {
        let { name, value } = e.target;
        let { errors } = this.state;
        let timeNew = { ...this.state.time };
        timeNew[name] = timeNew[name] + "";
        if (name === "hour" && value <= 50) {
            timeNew[name] = value;
        }
        if (name === "minute" && value <= 59) {
            timeNew[name] = value;
        }
        if (this.checkOnlyNumber(value) || value === "") {
            delete errors["AssignHours"];
            this.setState({
                time: timeNew,
                errors: errors,
                open: false,
            });
        }
    };

    checkOnlyNumber(number) {
        return number.match(/^[0-9,\b][0-9,\b]*$/);
    }
    UpArrowIncrement = (e, name) => {
        let timeNew = { ...this.state.time };
        let { errors } = this.state;
        timeNew[name]++;
        if (timeNew["minute"] === 60) {
            timeNew["hour"]++;
            timeNew["hour"] = timeNew["hour"] + "";
            if (timeNew["hour"].length === 1) {
                timeNew["hour"] = "0" + timeNew["hour"];
            }
            timeNew["minute"] = "00";
        }
        if (
            timeNew[name] >= 0 &&
            timeNew["hour"] <= 50 &&
            timeNew["minute"] <= 59
        ) {
            timeNew[name] = timeNew[name] + "";
            if (timeNew[name].length === 1) {
                timeNew[name] = "0" + timeNew[name];
            }
            delete errors["AssignHours"];

            this.setState({
                time: timeNew,
                errors: errors,
                open: false,
            });
        }
    };

    handleKeyFunction = (e, name) => {
        let timeNew = { ...this.state.time };
        let { errors } = this.state;

        if (e.key === "ArrowUp") {
            timeNew[name]++;
            timeNew[name] = timeNew[name] + "";
            if (timeNew[name].length === 1) {
                timeNew[name] = "0" + timeNew[name];
            }
        }
        if (e.key === "ArrowDown") {
            timeNew[name]--;
            if (timeNew["minute"] === -1 && parseInt(timeNew["hour"]) > 0) {
                timeNew["hour"]--;
                timeNew["hour"] = timeNew["hour"] + "";
                if (timeNew["hour"].length === 1) {
                    timeNew["hour"] = "0" + timeNew["hour"];
                }
                timeNew["minute"] = "59";
            } else {
                timeNew[name] = timeNew[name] + "";
                if (timeNew[name].length === 1) {
                    timeNew[name] = "0" + timeNew[name];
                }
            }
        }
        if (timeNew["minute"] === "60") {
            timeNew["hour"]++;
            timeNew["hour"] = timeNew["hour"] + "";
            if (timeNew["hour"].length === 1) {
                timeNew["hour"] = "0" + timeNew["hour"];
            }
            timeNew["minute"] = "00";
        }

        if (
            timeNew[name] >= 0 &&
            timeNew["hour"] <= 50 &&
            timeNew["minute"] <= 59
        ) {
            delete errors["AssignHours"];

            this.setState({
                time: timeNew,
                errors: errors,
                open: false,
            });
        }
    };
    DownArrowDecrement = (e, name) => {
        let timeNew = { ...this.state.time };
        let { errors } = this.state;
        if (timeNew["minute"] === -1 && parseInt(timeNew["hour"]) > 0) {
            timeNew["hour"]--;
            timeNew["hour"] = timeNew["hour"] + "";
            if (timeNew["hour"].length === 1) {
                timeNew["hour"] = "0" + timeNew["hour"];
            }
            timeNew["minute"] = "59";
        }
        timeNew[name]--;
        if (timeNew[name] >= 0) {
            timeNew[name] = timeNew[name] + "";
            if (timeNew[name].length === 1) {
                timeNew[name] = "0" + timeNew[name];
            }
            delete errors["AssignHours"];
            this.setState({
                time: timeNew,
                errors: errors,
                open: false,
            });
        }
    };

    handleClose = () => {
        this.setState({
            open: false,
        });
    };

    handleSubjectList = (index) => {
        let { subjectList } = this.state;
        subjectList[index]["enable"] = !subjectList[index]["enable"];
        this.setState({
            subjectList,
        });
    };

    render() {
        const {
            time,
            loading,
            alertData,
            open,
            selectedYearName,
            staffDetails,
            subjectList,
        } = this.state;
        if (loading) {
            return (
                <Box display="flex">
                    <img src={loadingBar} className="loading" alt="loading" />
                </Box>
            );
        } else {
            return (
                <>
                    <Paper className="paper-background">
                        <Grid container>
                            <Grid item md={11} xs={12} className="header-align">
                                <Box className="heading">
                                    Assign Subjects and Hours for Staff
                                </Box>
                                <Box className="sub-heading">
                                    Assign the Subjects and hours for the staff{" "}
                                    {staffDetails.staff_name} of Academic year {selectedYearName}
                                </Box>
                            </Grid>
                        </Grid>
                        <Grid
                            container
                            spacing={4}
                            className="flex-justify-center-flex-prop"
                        >
                            <Grid item md={4} xs={15}>
                                <Box className="hr-assign-subject-academicyear margin-top-10">
                                    Academic year : {selectedYearName}
                                </Box>
                            </Grid>
                            <Grid item md={6} xs={15}>
                                <Box className="hr-assign-subject-academicyear margin-top-10">
                                    Teacher : {staffDetails.staff_name}
                                </Box>
                            </Grid>
                        </Grid>
                        {/* <Box className="add-exam-standard-list-outer-box">
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
                        </Box> */}
                        <Grid container className="flex-justify-center-flex-prop">
                            <Grid item md={5} xs={15} className="header-align">
                                <Paper className="unassigned-subject-paper ">
                                    <Box className="hr-assign-subject-name">
                                        UnAssigned Subjects
                                        <MenuBookOutlinedIcon />
                                    </Box>
                                    {/* <Dropdown
                                        data={subjectList}
                                        name='selectedSubject'
                                        style='width-100'
                                        value={selectedSubject}
                                        onChange={this.onChange}
                                        label='Select Subject'
                                    /> */}
                                    {/* <Box className="unassigned-subject-list">
                    {subjectList.map((data, index) => {
                      return (
                        <Box>
                          {
                            <MenuItem
                              key={index}
                              value={data.subject_alias}
                              onClick={() => this.handleSubjectList(index)}
                            >
                              <Checkbox color="primary" checked={data.enable} />
                              <Box className="text-capitalize">
                                <ListItemText primary={data.subject_alias} />
                              </Box>
                            </MenuItem>
                          }
                        </Box>
                      );
                    })}
                  </Box> */}
                                </Paper>
                            </Grid>
                            <Grid
                                item
                                md={5}
                                xs={15}
                                className="assigned-subject-bg header-align"
                            >
                                <Box className="assigned-subject-hour-name">
                                    <Box>Assigned Hours per week</Box>
                                    <ScheduleTwoToneIcon />
                                </Box>
                                <Box className="assigned-subject-hour-bg">
                                    <Box>
                                        <Box
                                            className="assigned-subject-up-down-arrow"
                                            onClick={(e) => this.UpArrowIncrement(e, "hour")}
                                        >
                                            <KeyboardArrowUpRoundedIcon />
                                        </Box>
                                        <Box
                                            className="assigned-subject-up-down-arrow"
                                            onClick={(e) => this.DownArrowDecrement(e, "hour")}
                                        >
                                            <KeyboardArrowDownRoundedIcon />
                                        </Box>
                                    </Box>
                                    <Box>
                                        <input
                                            className="assigned-subject-input-hour"
                                            maxLength="2"
                                            type="text"
                                            name="hour"
                                            value={time.hour}
                                            onChange={this.onChangeTime}
                                            onKeyDown={(e) => this.handleKeyFunction(e, "hour")}
                                        />

                                        <Box className="text-center">hours</Box>
                                    </Box>
                                    <Box>
                                        <input
                                            className="assigned-subject-input-colon"
                                            type="text"
                                            value=":"
                                            disabled={true}
                                        />
                                    </Box>
                                    <Box>
                                        <input
                                            className="assigned-subject-input-minute"
                                            maxLength="2"
                                            type="text"
                                            name="minute"
                                            value={time.minute}
                                            onChange={this.onChangeTime}
                                            onKeyDown={(e) => this.handleKeyFunction(e, "minute")}
                                        />
                                        <Box className="text-center">minutes</Box>
                                    </Box>
                                    <Box>
                                        <Box
                                            className="assigned-subject-up-down-arrow"
                                            onClick={(e) => this.UpArrowIncrement(e, "minute")}
                                        >
                                            <KeyboardArrowUpRoundedIcon />
                                        </Box>
                                        <Box
                                            className="assigned-subject-up-down-arrow"
                                            onClick={(e) => this.DownArrowDecrement(e, "minute")}
                                        >
                                            <KeyboardArrowDownRoundedIcon />
                                        </Box>
                                    </Box>
                                </Box>
                                <Box className="hr-assigned-selected-subject">
                                    Assigned and Selected Subjects
                                </Box>
                                <Box className="selected-subject-list">
                                    {subjectList.map((data, index) => {
                                        return (
                                            data.enable && (
                                                <Box key={index} display="flex">
                                                    <Tooltip
                                                        title="Existing Subject"
                                                        placement="top-start"
                                                    >
                                                        <Box className="assigned-selected-subject">
                                                            {data.subject_alias}
                                                        </Box>
                                                    </Tooltip>
                                                    <Box
                                                        className="delete-selected-subject"
                                                        onClick={() => this.handleSubjectList(index)}
                                                    >
                                                        <HighlightOffTwoToneIcon />
                                                    </Box>
                                                </Box>
                                            )
                                        );
                                    })}
                                </Box>
                                <Grid container>
                                    <Box className="hr-check-and-submit-assigned-selected-subject">
                                        Please Check the Selected subjects and Timings and click on
                                        Submit
                                    </Box>
                                </Grid>
                                <Box style={{ position: "absolute", bottom: "0", right: "0" }}>
                                    <Box textAlign="end" p={2}>
                                        <Button
                                            variant="contained"
                                            onClick={this.submit}
                                            className="submit"
                                            disabled={this.state.submitDisable}
                                        >
                                            Submit
                                        </Button>
                                    </Box>
                                </Box>
                            </Grid>
                        </Grid>
                    </Paper>
                    <Snackbar
                        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                        open={open}
                        autoHideDuration={2000}
                        onClose={this.handleClose}
                    >
                        <Alert onClose={this.handleClose} severity="error">
                            {alertData}
                        </Alert>
                    </Snackbar>
                </>
            );
        }
    }
}
export default withRouter(HrSubjectStandardSectionAddModify);
