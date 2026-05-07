import React, { Component, createRef } from "react";
import { withRouter } from "react-router-dom";
import Swal from "sweetalert2";
import {
  Box,
  Grid,
  Paper,
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Typography,
} from "@material-ui/core";
import PropTypes from "prop-types";
import AssignmentOutlinedIcon from "@material-ui/icons/AssignmentOutlined";
import ExpandMoreIcon from "@material-ui/icons/ExpandMore";
import moment from "moment";

import EvaluateHomeWork from "Containers/Diary/EvaluateHomeWork";
import CreateHomeWorkModal from "./Components/CreateHomeWorkModal";
import HomeWorkListAction from "./Components/HomeWorkListAction";
import {
  getUrlParam,
  isMobile,
  isUserHasPermission,
  updatePermissions,
} from "Includes/functions";
import { deleteRequest, getRequest } from "Includes/api/apicall";
import { DEL_URL, GET_URL } from "Includes/urls";
import { Actions } from "Constants/permissions";
import "./styles.scss";

let user =
  localStorage.getItem("user") != "undefined"
    ? JSON.parse(localStorage.getItem("user"))
    : "";
const homeworklist = ["Today", "Tomorrow", "This Week"];
const isMobileScreen = isMobile();

class ManageHomeWork extends Component {
  constructor(props) {
    super(props);
    this.state = {
      standard: 0,
      section: 0,
      StandardSectionList: [],
      expanded: false,
      innerExpanded: false,
      homework: false,
      student: false,
      title: "",
      description: "",
      points: "",
      duedate: "",
      homeworklistbydate: [],
      today: [],
      tomorrow: [],
      thisweek: [],
      options: [],
      getHomeWork: [],
      isEdit: false,
      evaluate: "",
      currentTab: "",
      standardList: [],
      hasEvaluatePermission: false,
    };
    this.createEditHomeWorkRef = createRef();
  }

  componentDidMount() {
    this.getParamValues();
    const academicYearId = user.other_details.academic_year.id;
    const options = updatePermissions("diary_managehomework", [
      "update",
      "delete",
    ]);
    const hasEvaluatePermission = isUserHasPermission(
      "diary_evaluatestudentshomework",
      "create"
    );

    this.setState(
      { options, hasEvaluatePermission, year: academicYearId },
      () => {
        this.getStandard();
        this.gettodayhomework();
      }
    );
  }

  getParamValues = () => {
    let { expanded, evaluate } = getUrlParam();
    let currentTab = evaluate === true ? "Evaluation" : "HomeWorkList";
    this.setState({ expanded, evaluate, currentTab });
  };

  getStandard = () => {
    let { standard } = this.state;
    const params = { academic_year: this.state.year, is_active: true };
    getRequest(GET_URL.getstandardandsection.api, params, this.props).then(
      (response) => {
        if (response && response.status === 200) {
          const standardList = response.data.data;
          let stdSelected = 0;
          const section = 0;
          standardList.forEach((data) => {
            if (data.id === standard) {
              stdSelected = standard;
            }
          });
          this.setState({
            standardList,
            section,
            standard: stdSelected,
          });
        }
      }
    );
  };

  gettodayhomework = () => {
    let { currentTab, homeworklistbydate } = this.state;
    if (currentTab !== "HomeWorkList") {
      currentTab = "HomeWorkList";
    }
    const url = GET_URL.diary.api;
    let params = { week_data: 1 };
    getRequest(url, params).then((response) => {
      if (response && response.status === 200) {
        let homeworkdata = response.data.data;
        homeworklistbydate.push(homeworkdata);
        const { today, tomorrow, week } = homeworkdata;
        this.setState({
          currentTab,
          today,
          tomorrow,
          thisweek: week,
          homeworklistbydate: homeworklistbydate,
        });
      }
    });
  };

  changeTab = (name) => {
    this.setState({
      currentTab: name,
      expanded: "",
    });
  };

  handleChange = (panel, id) => (event, isExpanded) => {
    let {
      expanded,
      standardList,
      StandardSectionList,
      innerExpanded,
      isInnerExpanded,
    } = this.state;
    expanded = isExpanded ? panel : false;
    innerExpanded = isInnerExpanded ? panel : false;
    for (const data of standardList) {
      if (data.id === id) {
        StandardSectionList = data.sections;
        break;
      }
    }
    this.setState({
      expanded: expanded,
      innerExpanded: innerExpanded,
      StandardSectionList: StandardSectionList,
    });
  };

  deleteHomeWork = async (id, index, type) => {
    let { today, tomorrow, thisweek } = this.state;
    let datatype;
    if (type === "today") {
      datatype = today;
    } else if (type === "tomorrow") {
      datatype = tomorrow;
    } else if (type === "thisweek") {
      datatype = thisweek;
    }
    const url = DEL_URL.diary.api + id + "/";
    deleteRequest(url, {}, this.props).then((response) => {
      if (response && response.status === 200) {
        // eslint-disable-next-line no-unused-vars
        for (const index in datatype) {
          const data = datatype[index];
          if (data.id === id) {
            datatype.splice(index, 1);
            break;
          }
        }
        this.setState({
          [type]: datatype,
        });
        Swal.fire({
          position: "top-end",
          type: "success",
          title: response.data.Reason,
          showConfirmButton: false,
          timer: 1500,
        });
      }
    });
  };

  viewHomeWork = (id) => {
    let searchState = { id: id, expanded: this.state.expanded };
    let searchParam = "?" + new URLSearchParams(searchState).toString();
    this.props.history.push({
      pathname: Actions.diary_viewhomework.view.url,
      search: searchParam,
    });
  };

  editHomeWork = (id) => {
    let url = `${GET_URL.diary.api}${id}/`;
    let { getHomeWork } = this.state;
    getRequest(url, { from_diary: 1 }).then((response) => {
      if (response && response.status === 200) {
        getHomeWork = response.data.data;
        const data = {
          id: id,
          title: getHomeWork.title,
          description: getHomeWork.description,
          points: getHomeWork.marks,
          duedate: moment(getHomeWork.due_date).format("YYYY-MM-DD"),
          selected_standard: getHomeWork?.standard_details[0].standard,
          selected_sections: getHomeWork.standard_details.map((data) => {
            return {
              name: data.section_name,
              id: data.section,
              standard_section: data.standard_section,
            };
          }),
          selected_subject: getHomeWork.subject,
        };
        const studentIds = getHomeWork.student_details.map(
          (data) => data.student
        );
        const staffData = {};
        // eslint-disable-next-line no-unused-vars
        for (const data of getHomeWork.staff_details) {
          staffData[data.staff] = {
            view: data.view,
            update: data.update,
            evaluate: data.evaluate,
          };
        }
        this.createEditHomeWorkRef.current.updateEditData(
          data,
          studentIds,
          staffData,
          getHomeWork
        );
      }
    });
  };

  render() {
    let {
      isEdit,
      currentTab,
      expanded,
      today,
      tomorrow,
      thisweek,
      standardList,
      options,
      hasEvaluatePermission,
    } = this.state;
    return (
      <>
        <Paper className="paper-background leave-management-paper-background-color">
          {isMobileScreen ? (
            <Box className="button-align">
              <CreateHomeWorkModal
                ref={this.createEditHomeWorkRef}
                standardList={standardList}
                gettodayhomework={this.gettodayhomework}
                isEdit={isEdit}
              />
            </Box>
          ) : null}
          <Grid container className="flex-justify-center-flex-prop">
            <Box
              className={
                currentTab === "HomeWorkList"
                  ? "leave-management-selected-heading"
                  : "leave-management-heading"
              }
              onClick={() => this.changeTab("HomeWorkList")}
            >
              Home Work List
              {currentTab === "HomeWorkList" && (
                <Box className="leave-management-selected-heading-underline" />
              )}
            </Box>
            {hasEvaluatePermission ? (
              <Box
                className={
                  currentTab === "Evaluation"
                    ? "leave-management-selected-heading ml-20"
                    : "leave-management-heading ml-20"
                }
                onClick={() => this.changeTab("Evaluation")}
              >
                Evaluation
                {currentTab === "Evaluation" && (
                  <Box className="leave-management-selected-heading-underline" />
                )}
              </Box>
            ) : null}
            {/* <Box
              className={
                currentTab === "Completed"
                  ? "leave-management-selected-heading"
                  : "leave-management-heading"
              }
              onClick={() => this.changeTab("Completed")}
            >
              Completed
              {currentTab === "Completed" && (
                <Box className="leave-management-selected-heading-underline" />
              )}
            </Box> */}
            {!isMobileScreen ? (
              <Box className="button-align md-down-display-none">
                <CreateHomeWorkModal
                  ref={this.createEditHomeWorkRef}
                  standardList={standardList}
                  gettodayhomework={this.gettodayhomework}
                  isEdit={isEdit}
                />
              </Box>
            ) : null}
          </Grid>
          <hr style={{ marginTop: "-4px" }} />
          {currentTab === "HomeWorkList" && (
            <Paper className="paper-plain-background mt-20 pb-20">
              <Grid container className="pv-10">
                <Grid item md={9} xs={12}>
                  <Box className="heading">Home Work</Box>
                </Grid>
              </Grid>
              <Box>
                {homeworklist.map((data, index) => {
                  return (
                    <Accordion
                      expanded={expanded === `panel+${index}`}
                      onChange={this.handleChange(`panel+${index}`)}
                      key={`homework-${index}`}
                    >
                      <AccordionSummary
                        expandIcon={<ExpandMoreIcon />}
                        aria-controls="panel1bh-content"
                        id="panel1bh-header"
                      >
                        {data === "Today" && (
                          <Box className="homeworkcount">
                            <Typography className="homeworkcount">
                              {data}
                            </Typography>
                            <Typography>{today.length}</Typography>
                          </Box>
                        )}
                        {data === "Tomorrow" && (
                          <Box className="homeworkcount">
                            <Typography className="homeworkcount">
                              {data}
                            </Typography>
                            <Typography>{tomorrow.length}</Typography>
                          </Box>
                        )}
                        {data === "This Week" && (
                          <Box className="homeworkcount">
                            <Typography className="homeworkcount">
                              {data}
                            </Typography>
                            <Typography>{thisweek.length}</Typography>
                          </Box>
                        )}
                      </AccordionSummary>
                      {data === "Today" && (
                        <Box>
                          {today.map((data, index) => {
                            return (
                              <AccordionDetails
                                className="text-border accordin-hover"
                                key={`today-index-${index}`}
                              >
                                <Box className="text-content homework-actionsicon">
                                  <Box className="diary-circle-icon">
                                    <AssignmentOutlinedIcon className="diary-assignment-icon"></AssignmentOutlinedIcon>
                                  </Box>
                                  <Box className="marign-left-15 homework-actionsicon">
                                    <Box className="heading-text-content">
                                      {data.title}
                                    </Box>
                                    <Box className="sub-text-content">
                                      {data.subject_name}
                                    </Box>
                                    <Box className="sub-text-content marign-top-text">
                                      Due on{" "}
                                      {moment(data.due_date).format(
                                        "DD MMM YYYY"
                                      )}
                                    </Box>
                                  </Box>
                                  <Box>
                                    <HomeWorkListAction
                                      id={data.id}
                                      index={index}
                                      data={data}
                                      deleteHomeWork={() =>
                                        this.deleteHomeWork(
                                          data.id,
                                          index,
                                          "today"
                                        )
                                      }
                                      viewHomeWork={() =>
                                        this.viewHomeWork(data.id, index)
                                      }
                                      editHomeWork={() =>
                                        this.editHomeWork(data.id, index)
                                      }
                                      options={options}
                                    />
                                  </Box>
                                </Box>
                              </AccordionDetails>
                            );
                          })}
                          {today.length === 0 && (
                            <Box>
                              <AccordionDetails className="text-border accordin-hover emptyhomeworkheight ">
                                <Box className="text-content mt-20">
                                  <Box className="marign-left-15">
                                    No Home Work
                                  </Box>
                                </Box>
                              </AccordionDetails>
                            </Box>
                          )}
                        </Box>
                      )}
                      {data === "Tomorrow" && (
                        <Box>
                          {tomorrow.map((data, index) => {
                            return (
                              <AccordionDetails
                                className="text-border accordin-hover"
                                key={`tomorrow-homework-${index}`}
                              >
                                <Box className="text-content homework-actionsicon">
                                  <Box className="diary-circle-icon">
                                    <AssignmentOutlinedIcon className="diary-assignment-icon"></AssignmentOutlinedIcon>
                                  </Box>
                                  <Box className="marign-left-15 homework-actionsicon">
                                    <Box className="heading-text-content">
                                      {data.title}
                                    </Box>
                                    <Box className="sub-text-content">
                                      {data.subject_name}
                                    </Box>
                                    <Box className="sub-text-content marign-top-text">
                                      Due on{" "}
                                      {moment(data.due_date).format(
                                        "DD MMM YYYY"
                                      )}
                                    </Box>
                                  </Box>
                                  <Box>
                                    <HomeWorkListAction
                                      id={data.id}
                                      index={index}
                                      data={data}
                                      deleteHomeWork={() =>
                                        this.deleteHomeWork(
                                          data.id,
                                          index,
                                          "tomorrow"
                                        )
                                      }
                                      viewHomeWork={() =>
                                        this.viewHomeWork(data.id, index)
                                      }
                                      editHomeWork={() =>
                                        this.editHomeWork(data.id, index)
                                      }
                                      options={options}
                                    />
                                  </Box>
                                </Box>
                              </AccordionDetails>
                            );
                          })}
                          {tomorrow.length === 0 && (
                            <Box>
                              <AccordionDetails className="text-border accordin-hover emptyhomeworkheight ">
                                <Box className="text-content mt-20">
                                  <Box className="marign-left-15">
                                    No Home Work
                                  </Box>
                                </Box>
                              </AccordionDetails>
                            </Box>
                          )}
                        </Box>
                      )}
                      {data === "This Week" && (
                        <Box>
                          {thisweek.map((data, index) => {
                            return (
                              <AccordionDetails
                                className="text-border accordin-hover"
                                key={`week-homework-${index}`}
                              >
                                <Box className="text-content homework-actionsicon">
                                  <Box className="diary-circle-icon">
                                    <AssignmentOutlinedIcon className="diary-assignment-icon"></AssignmentOutlinedIcon>
                                  </Box>
                                  <Box className="marign-left-15 homework-actionsicon">
                                    <Box className="heading-text-content">
                                      {data.title}
                                    </Box>
                                    <Box className="sub-text-content">
                                      {data.subject_name}
                                    </Box>
                                    <Box className="sub-text-content marign-top-text">
                                      Due on{" "}
                                      {moment(data.due_date).format(
                                        "DD MMM YYYY"
                                      )}
                                    </Box>
                                  </Box>
                                  <Box>
                                    <HomeWorkListAction
                                      id={data.id}
                                      index={index}
                                      data={data}
                                      deleteHomeWork={() =>
                                        this.deleteHomeWork(
                                          data.id,
                                          index,
                                          "thisweek"
                                        )
                                      }
                                      viewHomeWork={() =>
                                        this.viewHomeWork(data.id, index)
                                      }
                                      editHomeWork={() =>
                                        this.editHomeWork(data.id, index)
                                      }
                                      options={options}
                                    />
                                  </Box>
                                </Box>
                              </AccordionDetails>
                            );
                          })}
                          {thisweek.length === 0 && (
                            <Box>
                              <AccordionDetails className="text-border accordin-hover emptyhomeworkheight ">
                                <Box className="text-content mt-20">
                                  <Box className="marign-left-15">
                                    No Home Work
                                  </Box>
                                </Box>
                              </AccordionDetails>
                            </Box>
                          )}
                        </Box>
                      )}
                    </Accordion>
                  );
                })}
              </Box>
            </Paper>
          )}
          {currentTab === "Evaluation" && <EvaluateHomeWork />}
        </Paper>
      </>
    );
  }
}

ManageHomeWork.propTypes = {
  history: PropTypes.array.isRequired,
};

export default withRouter(ManageHomeWork);
