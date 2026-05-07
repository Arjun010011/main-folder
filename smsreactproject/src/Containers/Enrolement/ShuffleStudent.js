import React, { Component } from "react";
import {
  Box,
  Grid,
  Checkbox,
  Button,
  ListItemText,
  Paper,
} from "@material-ui/core";
import Snackbar from "@material-ui/core/Snackbar";
import { FormattedMessage } from "react-intl";
import Swal from "sweetalert2";
import _ from "lodash";

import { SUCCESS_MSG_PROPS } from "Constants";
import { Dropdown } from "Components/DropDown";
import {
  checkLocalAcademicYear,
  Alert,
  SetAcademicYear,
  getFullName,
} from "Includes/functions";
import { GET_URL, POST_URL } from "Includes/urls";
import { getRequest, postRequest } from "Includes/api/apicall";
import { getKeyValueInArray } from "Includes/functions";
import commonMessages from "Constants/messages";
import messages from "./messages";
import BlankPagewithIcon from "Components/BlankPageWithIcon";
import LoadingGif from "Components/LoadingGif";

const alias_names = JSON.parse(localStorage.getItem('alias_name')) ? JSON.parse(localStorage.getItem('alias_name')) : {}

class ShuffleStudent extends Component {
  state = {
    year: '',
    yearList: [],
    standardList: [],
    standard: '',
    section_left: '',
    section_left_data: {},
    section_right_data: {},
    section_right: '',
    leftStudentList: [],
    rightStudentList: [],
    left_search_name: "",
    right_search_name: "",
    selectedLeftStuIds: [],
    selectedRightStuIds: [],
    fieldError: {},
    isBlankPage: false,
    blankData: '',
    loading: true,
    sortConfigLeft: { key: 'name', direction: 'asc' },
    sortConfigRight: { key: 'name', direction: 'asc' },
  };

  componentDidMount() {
    this.getAcademicYear();
  }

  sortBy = (side, key) => {
    const listKey = side === 'left' ? 'leftStudentList' : 'rightStudentList';
    const configKey = side === 'left' ? 'sortConfigLeft' : 'sortConfigRight';
    let sortConfig = this.state[configKey];
    const list = [...this.state[listKey]];
  
    const direction =
      sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc';
  
    const compareFn = (a, b) => {
      if (a[key] < b[key]) return direction === 'asc' ? -1 : 1;
      if (a[key] > b[key]) return direction === 'asc' ? 1 : -1;
      return 0;
    };
  
    this.setState({
      [listKey]: list.sort(compareFn),
      [configKey]: { key, direction },
    });
  };

  getAcademicYear = () => {
    const params = {};
    getRequest(GET_URL.getacademicyear.api, params, this.props).then(
      (response) => {
        if (response && response.status === 200) {
          const yearList = response.data.data;
          const year = checkLocalAcademicYear(yearList);
          this.setState({
            yearList, year: year ? year : '',
            isBlankPage: year ? false : true,
            blankData: year ? '' : 'Select Year',
            loading: year ? true : false,
          }, () => {
            if (year) {
              this.getStandard();
            }
          });
        }
      }
    );
  };

  handleSearchChange = (e) => {
    const { value, name } = e.target;
    this.setState({ [name]: value });
  };

  onChange = (e) => {
    let value = e.target.value;
    const name = e.target.name;
    const { sectionList, section_right, section_left } = this.state;
    if (value !== 0) {
      if (name === "section_left" || name === "section_right") {
        let left_section_list = [];
        let right_section_list = [];
        if (name === "section_left") {
          left_section_list = [];
          right_section_list = [];
          // eslint-disable-next-line no-unused-vars
          for (const section of sectionList) {
            if (section.id !== value) {
              right_section_list.push(section);
            }
            if (section.id !== section_right) {
              left_section_list.push(section);
            }
          }
        }
        if (name === "section_right") {
          // eslint-disable-next-line no-unused-vars
          for (const section of sectionList) {
            if (section.id !== value) {
              left_section_list.push(section);
            }
            if (section.id !== section_left) {
              right_section_list.push(section);
            }
          }
        }
        this.setState({ left_section_list, right_section_list });
      }

      this.setState({ [name]: value, fieldError: {} }, () => {
        if (name === "year") {
          SetAcademicYear(value);
          this.getStandard();
        } else if (name === "standard") {
          this.setState({ isBlankPage: false, blankData: '' })
          this.getSections();
        } else if (["section_left", "section_right"].includes(name)) {
          this.getStudentList("section_left");
          this.getStudentList("section_right");
        }
      });
    }
  };

  getStandard = () => {
    const { standard } = this.state;
    const params = { academic_year: this.state.year, is_active: true };

    getRequest(GET_URL.getstandardandsection.api, params, this.props).then(
      (response) => {
        if (response && response.status === 200) {
          const standardList = response.data.data;
          const sectionList = [];
          const left_section_list = [];
          const right_section_list = [];
          let stdSelected = '';
          if (standard) {
            // eslint-disable-next-line no-unused-vars
            for (const std of standardList) {
              if (std.id === standard) {
                stdSelected = standard;
                break;
              }
            }
          }
          this.setState(
            {
              standardList,
              standard: stdSelected,
              isBlankPage: stdSelected ? false : true,
              blankData: stdSelected ? '' : `Select ${alias_names['standard']}`, 
              sectionList,
              left_section_list,
              right_section_list,
              section_left: '',
              section_right: '',
              loading: stdSelected ? true : false
            },
            () => this.getSections()
          );
        }
      }
    );
  };

  getSections = () => {
    const { standard, standardList } = this.state;
    if (standard !== 0) {
      const response = getKeyValueInArray(
        standardList,
        "id",
        standard,
        "sections"
      );
      const right_section_list = response;
      const left_section_list = response;
      const sectionList = response;
      this.setState({
        sectionList,
        left_section_list,
        right_section_list,
        section_left: '',
        section_right: '',
        leftStudentList: [],
        rightStudentList: [],
        loading: false
      });
    }
  };

  getStudentList = (section) => {
    const {
      year,
      standard,
      section_left,
      section_right,
      right_section_list,
      left_section_list,
    } = this.state;
    let params = { academic_year: year, standard };

    let url = GET_URL.shuffledstudents.api;
    if (year && standard && section_left && section === "section_left") {
      params["section"] = section_left;
      getRequest(url, params, this.props).then((response) => {
        if (response && response.status === 200) {
          const leftStudentList = response.data.data.enrollments;
          let previous_left_student_ids = [];
          let section_left_data = {};
          // eslint-disable-next-line no-unused-vars
          for (const sec of left_section_list) {
            if (sec.id === section_left) {
              section_left_data = sec;
              break;
            }
          }
          leftStudentList.forEach((element) => {
            element.name = getFullName(element.student_first_name, element.student_middle_name, element.student_last_name)
            element.shifted = false;
            element.selected = false;
            previous_left_student_ids.push(element.student);
          });

          this.setState({
            leftStudentList,
            section_left_data,
            previous_left_student_ids,
          });
        }
      });
    }
    if (year && standard && section_right && section === "section_right") {
      params["section"] = section_right;
      getRequest(url, params, this.props).then((response) => {
        if (response && response.status === 200) {
          const rightStudentList = response.data.data.enrollments;
          let previous_right_student_ids = [];
          let section_right_data = {};
          // eslint-disable-next-line no-unused-vars
          for (const sec of right_section_list) {
            if (sec.id === section_right) {
              section_right_data = sec;
              break;
            }
          }
          rightStudentList.forEach((element) => {
            element.name = getFullName(element.student_first_name, element.student_middle_name, element.student_last_name)
            element.shifted = false;
            element.selected = false;
            previous_right_student_ids.push(element.student);
          });
          this.setState({
            rightStudentList,
            section_right_data,
            previous_right_student_ids,
          });
        }
      });
    }
  };

  seclectStudent(studentPart, data, action) {
    let studentList = [...this.state[studentPart]];
    let otherStudentList = [...this.state.leftStudentList];
    let selectedLeftStuIds = [...this.state.selectedLeftStuIds];
    let selectedRightStuIds = [...this.state.selectedRightStuIds];
    let otherPart = "leftStudentList";
    let { fieldError, section_right, section_left } = this.state;
    let errorMessage = ''
    if (
      !section_right
    ) {
      fieldError['section_right'] = <FormattedMessage {...commonMessages.fieldMandatoryError} />
      errorMessage = <FormattedMessage {...commonMessages.clearAllErrors} />;
    }
    if (
      !section_left
    ) {
      fieldError['section_left'] = <FormattedMessage {...commonMessages.fieldMandatoryError} />
      errorMessage = <FormattedMessage {...commonMessages.clearAllErrors} />;
    }
    if (errorMessage) {
      this.setState({
        alertData: errorMessage,
        snackbar: true,
        severity: "error",
      });
      return;
    }
    if (studentPart === "leftStudentList") {
      otherStudentList = [...this.state.rightStudentList];
      otherPart = "rightStudentList";
      selectedRightStuIds = [];
    } else {
      selectedLeftStuIds = [];
    }
    if (action === "select") {
      studentList.forEach((student) => {
        if (student.id === data.id) {
          student.selected = !student.selected;
        }
        if (student.selected) {
          if (studentPart === "leftStudentList") {
            selectedRightStuIds.push(student.id);
          } else {
            selectedLeftStuIds.push(student.id);
          }
        }
      });
    }
    let studentListNew = studentList;
    if (action === "shift") {
      let errorMessage = this.validatePostData();

      for (let stu = studentList.length - 1; stu >= 0; stu--) {
        if (studentListNew[stu].selected) {
          let studentData = { ...studentListNew[stu] };
          studentData.selected = !studentData.selected;
          studentData.shifted = !studentData.shifted;
          otherStudentList.push(studentData);
          studentListNew.splice(stu, 1);
        }
      }
      const otherStudentListIds = [];
      const studentListIds = [];
      otherStudentList.forEach((stu) => {
        if (stu.selected) {
          otherStudentListIds.push(stu.id);
        }
      });
      studentListNew.forEach((stu) => {
        if (stu.selected) {
          studentListIds.push(stu.id);
        }
      });
      if (studentPart === "leftStudentList") {
        selectedRightStuIds = [...otherStudentListIds];
        selectedLeftStuIds = [...studentListIds];
      } else {
        selectedRightStuIds = [...studentListIds];
        selectedLeftStuIds = [...otherStudentListIds];
      }
      if (
        !errorMessage &&
        studentListNew.length === this.state[studentPart].length
      ) {
        errorMessage = <FormattedMessage {...commonMessages.studentErr} />;
      }

      if (errorMessage !== null) {
        this.setState({
          alertData: errorMessage,
          snackbar: true,
          severity: "error",
        });
        return;
      }
      this.setState({
        [studentPart]: studentListNew,
        [otherPart]: otherStudentList,
        selectedRightStuIds,
        selectedLeftStuIds,
        right_search_name: "",
        left_search_name: "",
      });
    } else {
      this.setState({
        [studentPart]: studentList,
        selectedRightStuIds,
        selectedLeftStuIds,
      });
    }
  }
  validatePostData = () => {
    let { section_right, section_left, year, standard } = this.state;
    var errorMessage = null;
    if (year === 0) {
      errorMessage = <FormattedMessage {...commonMessages.noStdErr} />;
    } else if (standard === 0) {
      errorMessage = <FormattedMessage {...commonMessages.noSecErr} />;
    } else if (section_right === 0) {
      errorMessage = <FormattedMessage {...messages.norightErr} />;
    } else if (section_left === 0) {
      errorMessage = <FormattedMessage {...messages.noleftErr} />;
    }
    return errorMessage;
  };

  submit = () => {
    let errorMessage = this.validatePostData();
    let {
      leftStudentList,
      rightStudentList,
      section_right_data,
      section_left_data,
      previous_left_student_ids,
      section_right,
      fieldError
    } = this.state;
  
    let left_student_ids = [];
    let right_student_ids = [];
    let left_students = [];
    let right_students = [];
  
    leftStudentList.forEach((left_student) => {
      left_student.selected = false;
      left_students.push(left_student.student);
      left_student_ids.push({
        student: left_student.student,
        id: left_student.id,
      });
    });
    rightStudentList.forEach((right_student) => {
      right_student.selected = false;
      right_students.push(right_student.student);
      right_student_ids.push({
        student: right_student.student,
        id: right_student.id,
      });
    });
  
    let left_students_sorted = left_students.sort();
  
    if (!section_right) {
      fieldError['section_right'] = <FormattedMessage {...commonMessages.fieldMandatoryError} />
      errorMessage = <FormattedMessage {...commonMessages.clearAllErrors} />
    }
    if (!errorMessage &&
        right_student_ids.length + left_student_ids.length === 0
    ) {
      errorMessage = <FormattedMessage {...messages.noStuShuffleErr} />;
    } else if (!errorMessage &&
        _.isEqual(left_students_sorted, previous_left_student_ids)
    ) {
      errorMessage = <FormattedMessage {...messages.noCgngShuffleErr} />;
    }
  
    if (errorMessage) {
      this.setState({
        alertData: errorMessage,
        snackbar: true,
        severity: "error",
        fieldError
      });
      return;
    }
  
    const right_section_data = {
      standard_section: section_right_data.standard_section,
      enrollments: right_student_ids,
    };
    const left_section_data = {
      standard_section: section_left_data.standard_section,
      enrollments: left_student_ids,
    };
    const payload = [left_section_data, right_section_data];
  
    // 🔹 Step 1: Preview call with ?preview=true
    const previewUrl = `${POST_URL.shuffledstudents.api}?preview=true`;
  
    postRequest(previewUrl, payload, this.props).then((response) => {
      if (response && response.status === 200) {
        const previewData = response.data || {};
        const students = previewData.students || [];
    
        // Find students who have skipped marks (non-movable)
        const nonMovable = students.filter(s => s.skipped_marks && s.skipped_marks.length > 0);
    
        //  If no non-movable marks → directly submit (no SweetAlert)
        if (nonMovable.length === 0) {
          Swal.fire({
            title: "Processing Shuffle",
            text: " All students are movable. Shuffling data...",
            icon: "success",
            showConfirmButton: false,
            timer: 1200
          });
    
          postRequest(POST_URL.shuffledstudents.api, payload, this.props)
            .then((finalResp) => {
              if (finalResp && finalResp.status === 200) {
                Swal.fire({
                  ...SUCCESS_MSG_PROPS,
                  title: finalResp.data.Reason || "Data Shuffled Successfully!",
                });
              }
            });
          return;
        }
    
        //  If there are non-movable students → show preview
        let htmlPreview = `
          <div style='text-align:left; max-height:400px; overflow-y:auto;'>
            <h3 style='color:#d33;'> Non-Movable Students</h3>
            ${nonMovable.map(stu => `
              <div style='margin-bottom:15px;'>
                <b>${stu.student_name}</b>
                (From Sec ${stu.from_section_name} → To Sec ${stu.to_section_name})
                <ul style='margin-left:15px; color:#444;'>
                  ${stu.skipped_marks.map(m => `
                    <li>${m.exam_name} — ${m.subject_name}
                      <span style='color:#888;'>(${m.reason})</span>
                    </li>`).join("")}
                </ul>
              </div>
            `).join("")}
          </div>
        `;
    
        Swal.fire({
          title: "Preview Shuffle",
          html: htmlPreview,
          width: "80%",
          showCancelButton: true,
          confirmButtonText: "Confirm Shuffle",
          cancelButtonText: "Cancel",
          allowOutsideClick: false,
          allowEscapeKey: false,
        }).then((result) => {
          if (result.isConfirmed) {
            postRequest(POST_URL.shuffledstudents.api, payload, this.props)
              .then((finalResp) => {
                if (finalResp && finalResp.status === 200) {
                  Swal.fire({
                    ...SUCCESS_MSG_PROPS,
                    title: finalResp.data.Reason || "Data Shuffled Successfully!",
                  });
                }
              });
          }
        });
      }
    });
    
      
  };
  

  handleClose = () => {
    this.setState({ snackbar: false });
  };

  render() {
    const {
      year,
      yearList,
      standard,
      standardList,
      selectedLeftStuIds,
      selectedRightStuIds,
      section_left,
      section_right,
      leftStudentList,
      rightStudentList,
      left_section_list,
      right_section_list,
      alertData,
      snackbar,
      fieldError,
      isBlankPage,
      blankData,
      loading,
      sortConfigLeft,
      sortConfigRight
    } = this.state;
    if (loading) {
      return <LoadingGif />
    }
    else {
      return (
        <>
          <Paper className={"paper-background  "}>
            <Grid item md={12} xs={12} sm={12}>
              <Box className="header-align heading">
                <FormattedMessage {...messages.suffleStudentsHead} />
              </Box>
            </Grid>
            <Grid item md={12} xs={12} sm={12} className='mt-20'>
              <Box display="flex" flex="wrap" mb={3}>
                <Box className="enroll-dropdown-item">
                  <Dropdown
                    data={yearList}
                    name="year"
                    value={year}
                    onChange={(e) => this.onChange(e, "year")}
                    label={
                      <FormattedMessage {...commonMessages.academicYear} />
                    }
                    hideSelect={true}
                  />
                </Box>
                <Box className="enroll-dropdown-item">
                  <Dropdown
                    data={standardList}
                    name="standard"
                    value={standard}
                    onChange={(e) => this.onChange(e, "standard")}
                    label={<FormattedMessage {...commonMessages.standard} />}
                    hideSelect={true}
                  />
                </Box>
              </Box>
            </Grid>
            {/* <Grid item md={12} xs={12} sm={12}>
              <Grid container>
                <Grid item md={7} xs={12} sm={12}>
                </Grid>
                <Grid item md={5} xs={12} sm={12}>
                </Grid>
              </Grid>
            </Grid> */}
            {isBlankPage ?
              <div>
                <BlankPagewithIcon data={blankData} />
              </div>
              :
              <Grid container>
                <Grid item md={5} xs={12} sm={12}>
                  <Grid container className="assign-outer-body">
                    <Grid
                      item
                      xs={12}
                      sm={12}
                      md={12}
                      className="assign-subject-part assign-subject-outer-body"
                      minHeight="200px"
                    >
                      <Box mt={2} ml={2}>
                        <Dropdown
                          data={left_section_list}
                          name="section_left"
                          value={section_left}
                          onChange={(e) => this.onChange(e, "section_left")}
                          label={<FormattedMessage {...commonMessages.section} />}
                          hideSelect={true}
                          error={fieldError.section_left}
                          helperText={fieldError.section_left}
                        />
                      </Box>
                      {/* <Box display="flex" className="assign-header-bar">
                    <Box className="assign-col-head assign-subject-name" mt={3}>
                      <Box mr="10px"> {<FormattedMessage {...commonMessages.studentList} />} </Box>
                      <MenuBookOutlinedIcon />
                    </Box>
                    <Box mr={3} mt={1}>
                      <TextField
                        id="outlined-textarea"
                        label="Search"
                        name="left_search_name"
                        multiline
                        value={left_search_name}
                        onChange={this.handleSearchChange}
                      />
                    </Box>
                  </Box> */}
                      <Box mt={2} height="45vh">
                        <table width="100%" className="selectable-row-table">
                          <thead>
                            <th className="shuffle-selectable-table-head"></th>
                            <th
                              className="shuffle-selectable-table-head pointer"
                              onClick={() => this.sortBy('left', 'name')}
                            >
                              <FormattedMessage {...commonMessages.studentName} />
                              {sortConfigLeft.key === 'name' ? (sortConfigLeft.direction === 'asc' ? ' ↑' : ' ↓') : ''}
                            </th>
                            <th
                              className="shuffle-selectable-table-head pointer"
                              onClick={() => this.sortBy('left', 'current_reg_num')}
                            >
                              <FormattedMessage {...commonMessages.regNum} />
                              {sortConfigLeft.key === 'current_reg_num' ? (sortConfigLeft.direction === 'asc' ? ' ↑' : ' ↓') : ''}
                            </th>
                          </thead>
                          <tbody className="selectable-row-table-body">
                            {leftStudentList.map((data, index) => {
                              return (
                                <tr
                                  key={index}
                                  className="selectable-row-table-row"
                                >
                                  <td>
                                    <Box className="select-table-row">
                                      <Checkbox
                                        checked={data.selected}
                                        color="primary"
                                        onClick={() =>
                                          this.seclectStudent(
                                            "leftStudentList",
                                            data,
                                            "select"
                                          )
                                        }
                                      />
                                    </Box>
                                  </td>
                                  <td>
                                    <ListItemText
                                      primary={data.name}
                                      className={`assign-item-name `}
                                    />
                                  </td>
                                  <td>
                                    <ListItemText
                                      primary={data.current_reg_num}
                                      className={`assign-item-name `}
                                    />
                                  </td>
                                </tr>
                              );
                            })}
                            {leftStudentList.length === 0 && (
                              <tr className="text-center font-weight-bold">
                                <td colSpan={3}>No Data Found</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                        {/* {leftStudentList.map((data, index) => {
                      const shifted_class = data.shifted ? "red-text" : "";
                      const mark_shifted_stud = data.selected
                        ? `${shifted_class} selected-item`
                        : `${shifted_class} unselected-item`;
                      const name = data.name.toLowerCase();
                      if (
                        left_search_name === "" ||
                        (left_search_name !== "" &&
                          name.includes(left_search_name.toLowerCase()))
                      )
                        return (
                          <Box key={index} className={"assign-element-row"}>
                            {
                              <MenuItem
                                value={data.id}
                                onClick={() =>
                                  this.seclectStudent(
                                    "leftStudentList",
                                    data,
                                    "select"
                                  )
                                }
                              >
                                <Checkbox
                                  color="primary"
                                  checked={data.selected}
                                />
                                <Box
                                  ml={2}
                                  width="100%"
                                  className={`${mark_shifted_stud}`}
                                >
                                  <ListItemText
                                    primary={data.name}
                                    className={`assign-item-name ${mark_shifted_stud}`}
                                  />
                                  <Box
                                    className={`assign-menu-hr ${mark_shifted_stud}`}
                                  ></Box>
                                </Box>
                              </MenuItem>
                            }
                          </Box>
                        );
                    })}
                    {leftStudentList.length === 0 && section_left !== 0 && (
                      <Box>
                        <ListItemText
                          primary={"No Student Found"}
                          className="padding-20"
                        />
                      </Box>
                    )} */}
                      </Box>
                    </Grid>
                  </Grid>
                </Grid>
                <Grid item md={2} xs={12} sm={12}>
                  {/* <Box>
                {" "}
                <Button
                  variant="contained"
                  className="shuffle-add-students"
                  onClick={() =>
                    this.seclectStudent("leftStudentList", null, "shift")
                  }
                >
                  Add To Right{" "}
                </Button>
              </Box>
              <Box>
                {" "}
                <Button
                  variant="contained"
                  className="shuffle-add-students"
                  onClick={() =>
                    this.seclectStudent("rightStudentList", null, "shift")
                  }
                >
                  Add To Left
                </Button>
              </Box> */}
                  <ul className="selector-chooser">
                    <li>
                      <i
                        onClick={() =>
                          this.seclectStudent("rightStudentList", null, "shift")
                        }
                        className={`fa fa-arrow-circle-left selector-left ${selectedLeftStuIds.length > 0 && section_right
                          ? "active pointer"
                          : ""
                          }`}
                        aria-hidden="true"
                      ></i>
                    </li>
                    <li>
                      <i
                        onClick={() =>
                          this.seclectStudent("leftStudentList", null, "shift")
                        }
                        className={`fa fa-arrow-circle-right selector-right ${selectedRightStuIds.length > 0 && section_left
                          ? "active pointer"
                          : ""
                          }`}
                        aria-hidden="true"
                      ></i>
                    </li>
                  </ul>
                </Grid>
                <Grid item md={5} xs={12} sm={12}>
                  <Grid container className="assign-outer-body">
                    <Grid
                      item
                      xs={12}
                      sm={12}
                      md={12}
                      className="assign-subject-part assign-subject-outer-body"
                      minHeight="200px"
                    >
                      <Box mt={2} ml={2}>
                        <Dropdown
                          data={right_section_list}
                          name="section_right"
                          value={section_right}
                          onChange={(e) => this.onChange(e, "section_right")}
                          label={<FormattedMessage {...commonMessages.section} />}
                          hideSelect={true}
                          error={fieldError.section_right}
                          helperText={fieldError.section_right}
                        />
                      </Box>
                      {/* <Box display="flex" className="assign-header-bar">
                    <Box className="assign-col-head assign-subject-name" mt={3}>
                      <Box mr="10px"> Students </Box>
                      <MenuBookOutlinedIcon />
                    </Box>
                    <Box mr={3} mt={1}>
                      <TextField
                        id="outlined-textarea"
                        label="Search"
                        multiline
                        name="right_search_name"
                        value={right_search_name}
                        onChange={this.handleSearchChange}
                      />
                    </Box>
                  </Box> */}
                      <Box mt={2} height="45vh">
                        <table width="100%" className="selectable-row-table">
                          <thead>
                            <th className="shuffle-selectable-table-head"></th>
                            <th
                              className="shuffle-selectable-table-head pointer"
                              onClick={() => this.sortBy('right', 'name')}
                            >
                              <FormattedMessage {...commonMessages.studentName} />
                              {sortConfigRight.key === 'name' ? (sortConfigRight.direction === 'asc' ? ' ↑' : ' ↓') : ''}
                            </th>
                            <th
                              className="shuffle-selectable-table-head pointer"
                              onClick={() => this.sortBy('right', 'current_reg_num')}
                            >
                              <FormattedMessage {...commonMessages.regNum} />
                              {sortConfigRight.key === 'current_reg_num' ? (sortConfigRight.direction === 'asc' ? ' ↑' : ' ↓') : ''}
                            </th>
                          </thead>
                          <tbody className="selectable-row-table-body">
                            {rightStudentList.map((data, index) => {
                              return (
                                <tr
                                  key={index}
                                  className="selectable-row-table-row"
                                >
                                  <td>
                                    <Box className="select-table-row">
                                      <Checkbox
                                        checked={data.selected}
                                        color="primary"
                                        onClick={() =>
                                          this.seclectStudent(
                                            "rightStudentList",
                                            data,
                                            "select"
                                          )
                                        }
                                      />
                                    </Box>
                                  </td>
                                  <td>
                                    <ListItemText
                                      primary={data.name}
                                      className={`assign-item-name `}
                                    />
                                  </td>
                                  <td>
                                    <ListItemText
                                      primary={data.current_reg_num}
                                      className={`assign-item-name `}
                                    />
                                  </td>
                                </tr>
                              );
                            })}
                            {rightStudentList.length === 0 && (
                              <tr className="text-center font-weight-bold">
                                <td colSpan={3}>No Data Found</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                        {/* {rightStudentList.map((data, index) => {
                      const shifted_class = data.shifted ? "red-text" : "";
                      const mark_shifted_stud = data.selected
                        ? `${shifted_class} selected-item`
                        : `${shifted_class} unselected-item`;
                      const name = data.name.toLowerCase();
                      if (
                        right_search_name === "" ||
                        (right_search_name !== "" &&
                          name.includes(right_search_name.toLowerCase()))
                      )
                        return (
                          <Box key={index} className={"assign-element-row"}>
                            {
                              <MenuItem
                                value={data.id}
                                onClick={() =>
                                  this.seclectStudent(
                                    "rightStudentList",
                                    data,
                                    "select"
                                  )
                                }
                              >
                                <Checkbox
                                  color="primary"
                                  checked={data.selected}
                                />
                                <Box
                                  ml={2}
                                  width="100%"
                                  className={`${mark_shifted_stud}`}
                                >
                                  <ListItemText
                                    primary={data.name}
                                    className={`assign-item-name ${mark_shifted_stud}`}
                                  />
                                  <Box
                                    className={`assign-menu-hr ${mark_shifted_stud}`}
                                  ></Box>
                                </Box>
                              </MenuItem>
                            }
                          </Box>
                        );
                    })} */}
                      </Box>
                    </Grid>
                  </Grid>
                </Grid>
              </Grid>
            }
            <Box className="submt-button-float-bottom" mt={3}>
              <Button
                className="submit float-right"
                variant="contained"
                onClick={this.submit}
              >
                Submit
              </Button>
            </Box>
            <Snackbar
              anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
              open={snackbar}
              autoHideDuration={10000}
              onClose={this.handleClose}
            >
              <Alert onClose={this.handleClose} severity="error">
                {alertData}
              </Alert>
            </Snackbar>
          </Paper>
        </>
      );
    }
  }
}

export default ShuffleStudent;
