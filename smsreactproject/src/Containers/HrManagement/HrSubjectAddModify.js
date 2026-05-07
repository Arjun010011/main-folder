import React, { Component } from "react";
import {
  Paper,
  Button,
  Box,
  Grid,
  MenuItem,
  ListItemText,
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
import { withRouter } from  "react-router-dom";
import { getUrlParam, Alert,SetStandard,checkLocalStandard } from "Includes/functions";
import { Dropdown } from "Components/DropDown";
import { FormattedMessage } from "react-intl";
import commonMessages from "Constants/messages";
import Skeleton from "@material-ui/lab/Skeleton";
import { isFormDefinitionEnabled } from "Includes/CheckFormDefinition";

class HrSubjectAddModify extends Component {
  state = {
    selectedYear: 0,
    staff_id: 0,
    subjectList: [],
    standardList: [],
    standard: "",
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
    sectionList: [],
    section: "",
    allSubjectList: [], // master list
    subjectList: [],
    standardSectionSubjectList:{},
    languageList: { first: [], second: [], third: [] },
    allSectionList: [],
    is_staff_standard_section_subject_mapping_enabled:isFormDefinitionEnabled(
        "staff_subject_mapping_configuration",
        "is_staff_standard_section_subject_mapping_enabled",
        1
      )
  };
  async componentDidMount() {
    let { year, id, yearName } = getUrlParam();
    let { time, languageList, allSubjectList,section } = this.state;
  
    this.setState({ selectedYear: year });
  
    const url = GET_URL.getstaffsubject.api;
    const params = { academic_year: year, staff: id };
  
    this.getStandardsList(year);
    this.getAllSections(year);
  
    getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        let data = response.data.data || {};
        let subjectList = [];
        let standardSectionSubjectList = data.standard_section_subject || {};
    
        // Optional: handle max_hour split safely
        if (data.id && data.max_hour) {
          const timeSplit = data.max_hour.split(":");
          time["hour"] = timeSplit[0];
          time["minute"] = timeSplit[1];
        }
    
        if (Array.isArray(data.assigned_subjects)) {
          data.assigned_subjects.forEach((field) => {
            field.enable = true;
            field.standard_section_id = field.standard_section_id || null;
            subjectList.push(field);
          });
        } else {
          console.info("No assigned_subjects found — skipping");
        }
    
        if (Array.isArray(data.unassigned_subject)) {
          data.unassigned_subject.forEach((field) => {
            field.enable = false;
            field.standard_section_id = field.standard_section_id || null;
            subjectList.push(field);
          });
        } else {
          console.info("No unassigned_subject found — skipping");
        }
    
        subjectList = subjectList.map((s) => {
          if (
            standardSectionSubjectList[s.standard_section_id] &&
            standardSectionSubjectList[s.standard_section_id].includes(s.id)
          ) {
            return { ...s, enable: true };
          }
          return s;
        });

        let updatedAll = [
          ...allSubjectList.filter(s => s.standard_section_id !== section),
          ...subjectList,
        ];
    
        this.setState({
          subjectList,
          allSubjectList:updatedAll,
          standardSectionSubjectList,
          staffDetails: data,
          loading: false,
          selectedYearName: yearName
        });
      }
    });
  }

  onChange = (e) => {
    // handle both native event and direct value from custom Dropdown
    const name = e.target ? e.target.name : e.name || "section";
    const value = e.target ? e.target.value : e.value || e;
  
    if (value !== 0 && value !== "") {
      this.setState({ [name]: value }, () => {
        if (name === "standard") {
          SetStandard(value);
          this.setState({
            sectionList: [],
          });
          this.getSectionList();
        } else if (name === "section") {
          // make sure section is saved in state before calling API
          this.getSubject();
        }
      });
    }
  };

  getSubject = () => {
    let { year, id, yearName } = getUrlParam();
    let { time, languageList, allSubjectList } = this.state;
    const { section } = this.state;
  
    const url = GET_URL.getstaffsubject.api;
    const params = { academic_year: year, staff: id, standard_section_id: section };
  
    getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        let subjectList = [];
  
        if (response.data.data.id) {
          let timeSplit = response.data.data.max_hour.split(":");
          time["hour"] = timeSplit[0];
          time["minute"] = timeSplit[1];
  
          response.data.data.assigned_subjects.forEach((field) => {
            field["enable"] = true;
            field["standard_section_id"] = section;
            subjectList.push(field);
          });
        }
  
        response.data.data.unassigned_subject.forEach((field) => {
          field["enable"] = false;
          field["standard_section_id"] = section;
          subjectList.push(field);
        });
  
        // merge into allSubjectList (avoid duplicates by id+section)
        let updatedAll = [
          ...allSubjectList.filter(s => s.standard_section_id !== section),
          ...subjectList,
        ];

        this.setState({
          languageList,
          subjectList,     // only this section
          allSubjectList: updatedAll, // master
          loading: false,
          selectedYear: year,
          staffDetails: response.data.data,
          staff_id: id,
        });
      }
    });
  };

  getAllSections = (year) => {
    const url = GET_URL.getsection.api;
    const params = {
      academic_year: year,
      is_active: true,
    };
    getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        this.setState({
          allSectionList: response.data.data,
        });
      }
    });
  };

  getSectionList = () => {
    const { selectedYear, standard } = this.state;
    const url = GET_URL.getsection.api;
    const params = {
      academic_year: selectedYear,
      is_active: true,
      standard: standard,
    };
    getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        let sectionList = response.data.data;
        this.setState({
          sectionList,
        });
      }
    });
  };

  getStandardsList = (year) => {
      const params = { academic_year: year };
      getRequest(GET_URL.getstandard.api, params, this.props).then((response) => {
        if (response && response.status === 200) {
          const standardList = response.data.data;
          const standard = checkLocalStandard(standardList);
          let loading = false;
          if (standard) {
            loading = true;
          }
          this.setState(
            {
              standardList,
              standard: standard ? standard : "",
              sectionList:[],
            },
            () => {
              if (standard) {
                this.getSectionList();
              }
            }
          );
        }
      });
    };

    validate = (errors, time) => {
      let { allSubjectList, standardSectionSubjectList } = this.state;
      let returnValue = true;
    
      const hasAnyEnabledSubject = allSubjectList.some((s) => s.enable);
    
      if (!hasAnyEnabledSubject) {
        this.setState({
          open: true,
          alertData: "Please select at least one subject",
        });
        return false;
      }
    
      const hour = parseInt(time.hour || "0");
      const minute = parseInt(time.minute || "0");
    
      if (hour === 0 && minute === 0) {
        this.setState({
          open: true,
          alertData: "Please assign hours to the staff",
        });
        return false;
      }
    
      if (hour === 0 && minute > 0) {
        this.setState({
          open: true,
          alertData: "Please maintain at least one full hour",
        });
        return false;
      }
    
      if (Object.keys(standardSectionSubjectList || {}).length > 0) {
        const hasSectionSubjects = Object.values(standardSectionSubjectList).some(
          (subjects) => subjects.length > 0
        );
        if (!hasSectionSubjects) {
          this.setState({
            open: true,
            alertData: "Please select at least one subject for the chosen section",
          });
          return false;
        }
      }
    
      return returnValue;
    };

  submit = async () => {
    let { time, errors, selectedYear, staff_id, staffDetails, standardSectionSubjectList, is_staff_standard_section_subject_mapping_enabled} = this.state;
    errors = {};
    let validateValue = this.validate(errors, time);
    if (validateValue) {
      this.setState({ submitDisable: true });
  
      time.hour = time.hour.toString().padStart(2, "0");
      time.minute = time.minute.toString().padStart(2, "0");
  
      let normalizedStandardSection = {};
      Object.entries(standardSectionSubjectList || {}).forEach(([key, value]) => {
        if (key && value.length > 0) {
          normalizedStandardSection[String(key)] = value.map((v) => Number(v));
        }
      });
  
      const enabledSubjectIds = Array.from(
        new Set(
          Object.values(normalizedStandardSection).flat().map((id) => Number(id))
        )
      );

      const hasSections = Object.keys(normalizedStandardSection).length > 0;
      let postData = {
        id: staffDetails.id || undefined,
        max_hour: `${time.hour}:${time.minute}`,
        academic_year: selectedYear,
        subject: this.state.allSubjectList.filter((s) => s.enable).map((s) => s.subject_id),
        staff: staffDetails.staff || staff_id,
      };
  
      if (hasSections && is_staff_standard_section_subject_mapping_enabled) {
        postData.standard_section = normalizedStandardSection;
      }
      let url = POST_URL.staffsubject.api;
      url = `${url}?academic_year=${selectedYear}/staff=${staff_id}`;
      postRequest(url, postData, this.props).then((response) => {
        this.setState({ submitDisable: false });
        if (response && response.status === 200) {
          Swal.fire({
            position: "top-end",
            icon: "success",
            title: response.data.Reason,
            showConfirmButton: false,
            timer: 1500,
          });
          this.props.history.push(Actions.assign_subject.view.url);
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
    let { subjectList, allSubjectList, section, standardSectionSubjectList } = this.state;
    const subject = subjectList[index];
    subject.enable = !subject.enable;
    // clone map
    let updatedMap = { ...standardSectionSubjectList };
  
    if (section && section !== "") {
      if (!updatedMap[section]) updatedMap[section] = [];
      if (subject.enable) {
        if (!updatedMap[section].includes(subject.id)) {
          updatedMap[section].push(subject.id);
        }
      } else {
        updatedMap[section] = updatedMap[section].filter((id) => id !== subject.id);
        if (updatedMap[section].length === 0) delete updatedMap[section];
      }
    }
  
    let updatedAll = [...allSubjectList];
    const idx = updatedAll.findIndex(
      (s) =>
        s.id === subject.id &&
        (s.standard_section_id === section || !section || section === "")
    );
  
    if (idx !== -1) {
      updatedAll[idx] = { ...updatedAll[idx], enable: subject.enable };
    } else {
      updatedAll.push({ ...subject, standard_section_id: section || null });
    }
  
    this.setState({
      subjectList: [...subjectList],
      allSubjectList: updatedAll,
      standardSectionSubjectList: updatedMap,
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
      standard,
      standardList,
      section,
      sectionList,
      is_staff_standard_section_subject_mapping_enabled
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
                  Assign Subjects and Hours for Teacher
                </Box>
                <Box className="sub-heading">
                  Assign the Subjects and hours for the teacher{" "}
                  {staffDetails.staff_name} of Academic year {selectedYearName}
                </Box>
              </Grid>
            </Grid>
            <Grid
              container
              spacing={4}
              className="flex-justify-center-flex-prop"
            >
              <Grid item md={4} xs={12}>
                <Box className="hr-assign-subject-academicyear margin-top-10">
                  Academic year : {selectedYearName}
                </Box>
              </Grid>
              <Grid item md={6} xs={12}>
                <Box className="hr-assign-subject-academicyear margin-top-10">
                  Teacher : {staffDetails.staff_name}
                </Box>
              </Grid>
            </Grid>
            <Grid container className="flex-justify-center-flex-prop">
              <Grid item md={5} xs={12} className="header-align">
                <Paper className="unassigned-subject-paper ">
                  <Box className="hr-assign-subject-name">
                    UnAssigned Subjects
                    <MenuBookOutlinedIcon />
                  </Box>
                  {is_staff_standard_section_subject_mapping_enabled && (
                  <>
                  <Box className="header-align mb-10 margin-right-10">
                      <Dropdown
                        data={standardList}
                        name="standard"
                        value={standard}
                        onChange={this.onChange}
                        label={<FormattedMessage {...commonMessages.standard} />}
                        hideSelect={true}
                      />
                  </Box>
                  <Box className="header-align mb-10 margin-right-10">
                      <Dropdown
                        customId="standard_section"
                        data={sectionList}
                        name="section"
                        value={section}
                        onChange={this.onChange}
                        label={<FormattedMessage {...commonMessages.section} />}
                      />
                  </Box>
                  </>
                  )}
                  <Box className="unassigned-subject-list">
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
                  </Box>
                </Paper>
              </Grid>
              <Grid
                item
                md={5}
                xs={12}
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
                  {subjectList.filter((s) => s.enable).length === 0 ? (
                    <Box className="text-muted">No subjects assigned</Box>
                  ) : (
                    subjectList
                      .filter((s) => s.enable)
                      .map((data, index) => (
                        <Box key={index} display="flex" alignItems="center" mb={1}>
                          <Tooltip title="Assigned Subject">
                            <Box className="assigned-selected-subject">
                              {data.subject_alias || data.subject || data.name}
                            </Box>
                          </Tooltip>
                          <Box
                            className="delete-selected-subject"
                            onClick={() => this.handleSubjectList(index)}
                          >
                            <HighlightOffTwoToneIcon />
                          </Box>
                        </Box>
                      ))
                  )}
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
export default withRouter(HrSubjectAddModify);