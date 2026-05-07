/* eslint-disable react/display-name */
import React, { Component } from "react";
import {
  Paper,
  Box,
  Grid,
  Button,
  makeStyles,
  Typography,
  AppBar,
  Toolbar,
  Dialog,
  Slide,
  TextField,
  Divider,
  IconButton,
  Checkbox,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  DialogTitle,
  DialogActions,
} from "@material-ui/core";
import {
  PersonOutlined,
  AssignmentOutlined,
  EditTwoTone,
} from "@material-ui/icons";
import SubjectIcon from "@material-ui/icons/Subject";
import CloseIcon from "@material-ui/icons/Close";
import { withRouter } from "react-router-dom";
import PropTypes from "prop-types";
import moment from "moment";

import { TEACHER_ID, image_formats } from "Constants";
import AllMUIDataTable from "Components/AllMUIDataTable";
import { Actions } from "Constants/permissions";
import { getRequest } from "Includes/api/apicall";
import { getUrlParam, getFullName } from "Includes/functions";
import { GET_URL } from "Includes/urls";
import loadingBar from "images/loading.gif";
import "./styles.scss";

const useStyles = makeStyles((theme) => ({
  appBar: {
    position: "relative",
  },
  title: {
    marginLeft: theme.spacing(2),
    flex: 1,
  },
  studentlist: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: theme.palette.background.paper,
  },
}));

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

class ViewHomeWork extends Component {
  state = {
    standardList: [],
    sectionList: [],
    homework: true,
    student: false,
    alternateTeacher: false,
    loading: true,
    getHomeWork: {
      due_date: "",
      title: "",
      description: "",
      points: "",
      marks: "",
      document_details: [],
      subject: "",
    },
    teacherList: [],
    alternateTeacherList: [],
    selectedStudents: [],
    activeImgData: { document_details: {}, comment: "" },
    openImageDetailsPopupStatus: false,
  };
  columns = [
    {
      name: "name",
      label: "Student Name",
      options: {
        filter: false,
        sort: false,
        search: false,
        customBodyRender: (value, tableMeta) => {
          return (
            <div className="mui-table-custom-value-left-align">
              {tableMeta.rowData[3]} {tableMeta.rowData[4]}{" "}
              {tableMeta.rowData[5]}
            </div>
          );
        },
      },
    },
    {
      name: "section_name",
      label: "Section",
      options: {
        filter: false,
        sort: true,
        display: this.state.sectionList.length !== 1,
      },
    },
    {
      name: "status",
      label: "Status",
      options: {
        filter: false,
        sort: true,
      },
    },
    {
      name: "first_name",
      label: "First Name",
      options: {
        filter: false,
        sort: false,
        display: false,
      },
    },
    {
      name: "middle_name",
      label: "Middle Name",
      options: {
        filter: false,
        sort: false,
        display: false,
      },
    },
    {
      name: "last_name",
      label: "Last Name",
      options: {
        filter: false,
        sort: false,
        display: false,
      },
    },
  ];
  options = {
    filterType: "dropdown",
    responsive: "scroll",
    filter: false,
    download: false,
    print: false,
    viewColumns: false,
    rowsPerPageOptions: [10],
    rowsPerPage: 10,
    selectableRows: "none",
  };

  componentDidMount() {
    this.getURLParams();
  }

  isImage = (fileName) => {
    let splittedDilePath = fileName.split(".");
    const extension = splittedDilePath[splittedDilePath.length - 1];
    return image_formats.type.includes(extension.toLowerCase());
  };

  getURLParams = () => {
    let { dateRangeDropdownParam, dateRangeValueStart, dateRangeValueEnd, id } = getUrlParam()
    let url = `${GET_URL.diary.api}${id}/`;
    getRequest(url, { from_diary: 1 }).then((response) => {
      if (response && response.status === 200) {
        const getHomeWork = response.data.data;
        getHomeWork.document_details = getHomeWork.document_details.filter(
          (doc) => {
            if (doc?.document_details?.file) {
              doc.document_details.isImage = this.isImage(
                doc.document_details.file
              );
              return true;
            }
            return false
          }
        );
        this.setState({ getHomeWork, dateRangeDropdownParam, dateRangeValueStart, dateRangeValueEnd }, () => {
          this.getFieldValues();
          this.getStaffList();
        });
      }
    });
  };

  getFieldValues = () => {
    let { getHomeWork } = this.state;
    let { alternateTeacherList, standardList, sectionList } = this.state;
    getHomeWork.due_date = new Date(getHomeWork.due_date);
    let standard = getHomeWork.standard_details;
    standard.forEach((data) => {
      let standard_data = {
        id: data.id,
        name: data.standard_name,
      };
      let section_data = {
        name: data.section_name,
        id: data.standard_section,
      };
      standardList.push(standard_data);
      sectionList.push(section_data);
    });
    let selectedStudents = getHomeWork.student_details;
    selectedStudents.forEach((data) => {
      data.section_name =
        data.standard_details && data.standard_details.section_name
          ? data.standard_details.section_name
          : "";
      data.name = getFullName(data.first_name, data.last_name);
    });
    let staffdata = getHomeWork.staff_details;
    staffdata.forEach((data) => {
      let staff_data = {
        name: `${data.first_name} ${data.last_name}`,
        staff: data.staff,
        view: data.view,
        update: data.update,
        evaluate: data.evaluate,
      };
      alternateTeacherList.push(staff_data);
    });
    this.setState({
      standardList,
      sectionList,
      alternateTeacherList,
      selectedStudents,
    });
  };

  getStaffList = () => {
    const url = GET_URL.staff.api;
    const params = { is_active: true, group: TEACHER_ID };
    getRequest(url, params).then((response) => {
      if (response && response.status === 200) {
        let staffList = response.data.data;
        let { alternateTeacherList } = this.state;
        let alternativeteacherdata = [];
        staffList.forEach((data) => {
          data.view = false;
          data.update = false;
          data.evaluate = false;
          alternateTeacherList.forEach((staffdata) => {
            if (data.id === staffdata.staff) {
              data.view = staffdata.view;
              data.update = staffdata.update;
              data.evaluate = staffdata.evaluate;
              alternativeteacherdata.push(data);
            }
          });
        });
        this.setState({
          staffList: response.data.data,
          teacherList: alternativeteacherdata,
          loading: false
        });
      }
    });
  };

  classes = () => {
    useStyles();
  };

  openImageDetailsPopup = (imageData) => {
    this.setState({
      openImageDetailsPopupStatus: true,
      activeImgData: imageData,
    });
  };

  handleDialogStatus = (type, status) => {
    const { selectedStudents } = this.state;
    if (type === "homework" && status) {
      this.setDefalutValues();
    } else if (type === "student") {
      if (selectedStudents.length === 0) {
        return;
      }
    }
    this.setState({ [type]: status });
  };

  handleClose = () => {
    const { dateRangeValueStart, dateRangeValueEnd, dateRangeDropdownParam } = this.state
    let sectionInformation = {
      'dateRangeValueStart': dateRangeValueStart,
      'dateRangeValueEnd': dateRangeValueEnd,
      'dateRangeDropdownParam': dateRangeDropdownParam,
    }
    let searchParam = "?" + new URLSearchParams(sectionInformation).toString()
    this.props.history.push({
      pathname: Actions.abacus_managehomework.view.url,
      search: searchParam,
    });
  };

  render() {
    let {
      loading,
      sectionList,
      standardList,
      teacherList,
      selectedStudents,
      student,
      homework,
      alternateTeacher,
      getHomeWork,
      activeImgData,
      openImageDetailsPopupStatus,
    } = this.state;
    return (
      <Grid container>
        <Box className="button-align">
          <Dialog
            fullScreen
            open={homework}
            onClose={() => this.handleClose("homework")}
            TransitionComponent={Transition}
          >
            <AppBar className={this.classes.appBar}>
              <Toolbar className="app-bar-color">
                <IconButton
                  edge="start"
                  color="inherit"
                  onClick={() => this.handleClose("clearAll")}
                  aria-label="close"
                >
                  <CloseIcon />
                </IconButton>
                <Typography variant="h6" className={this.classes.title}>
                  Home Work
                </Typography>
              </Toolbar>
            </AppBar>
            <Box className={!loading ? "display-none" : ""} display="flex">
              <img src={loadingBar} className="loading" alt="loading" />
            </Box>
            <Paper
              className={
                loading
                  ? "display-none"
                  : "full-height"
              }
            >
              <Box className="paper-background md-down-p-0">
                <Paper className="diary-paper-container margin-auto">
                  <Box className="homework-design mt-50 full-height">
                    <Box className="homework-right-part md-down-justify-space-evenly">
                      <Box className="viewhomework-design standardfeild">
                        <Box>
                          <Box className=" studentselect">Standards</Box>
                          <Box>
                            <Divider className="divwidth mb-10 mt-10" />
                          </Box>
                          <Box>
                            {standardList.map((data) => {
                              const labelId = `checkbox-list-secondary-label-${data.id}`;
                              return (
                                <ListItem
                                  className="Listpadding text-center"
                                  key={data.id}
                                  button
                                >
                                  <ListItemText
                                    id={labelId}
                                    primary={data.name}
                                  />
                                </ListItem>
                              );
                            })}
                          </Box>
                        </Box>
                        <Box>
                          <Box className="studentselect">Sections</Box>
                          <Box>
                            <Divider className="divwidth mb-10 mt-10" />
                          </Box>
                          <Box>
                            {sectionList.map((data) => {
                              const labelId = `checkbox-list-secondary-label-${data.id}`;
                              return (
                                <ListItem
                                  className="Listpadding text-center"
                                  key={data.id}
                                  button
                                >
                                  <ListItemText
                                    id={labelId}
                                    primary={data.name}
                                  />
                                </ListItem>
                              );
                            })}
                          </Box>
                        </Box>
                      </Box>
                      <Box className="viewhomework-design">
                        <Box className="mr-10">
                          <Box className="studentselect">Subject</Box>
                          <Box>
                            <Divider className="divwidth mb-10 mt-10" />
                          </Box>
                          <Box>
                            <ListItem className="Listpadding text-center">
                              <ListItemText
                                primary={getHomeWork.subject_name}
                              />
                            </ListItem>
                          </Box>
                        </Box>
                        <Box className="mr-10">
                          <Box className="studentselect">Due Date</Box>
                          <Box>
                            <Divider className="divwidth mb-10 mt-10" />
                          </Box>
                          <Box>
                            <ListItem className="Listpadding text-center">
                              <ListItemText
                                primary={moment(
                                  getHomeWork.due_date
                                ).format("DD-MM-YYYY")}
                              />
                            </ListItem>
                          </Box>
                        </Box>
                      </Box>
                      <Box className="margin-left-20 md-down-full-width">
                        <List>
                          <ListItem className="selectstudentpadding">
                            <ListItemText
                              className="studentselect"
                              primary={
                                selectedStudents.length !== 0
                                  ? `${selectedStudents.length} - Students`
                                  : "No Students selected"
                              }
                              onClick={() =>
                                this.handleDialogStatus("student", true)
                              }
                            />
                            <IconButton
                              color="primary"
                              aria-label="add to shopping cart"
                              onClick={() =>
                                this.handleDialogStatus("student", true)
                              }
                            >
                              <PersonOutlined />
                            </IconButton>
                            <Dialog
                              fullWidth={true}
                              maxWidth={"md"}
                              aria-labelledby="max-width-dialog-title"
                              open={student}
                              fullScreen={window.innerWidth < 980}
                            >
                              <AllMUIDataTable
                                key={selectedStudents}
                                title="Selected Students"
                                data={selectedStudents}
                                columns={this.columns}
                                options={this.options}
                              />
                              <DialogActions
                                className={
                                  window.innerWidth < 980
                                    ? "bottom-buttons"
                                    : ""
                                }
                              >
                                <Button
                                  autoFocus
                                  onClick={() =>
                                    this.handleDialogStatus(
                                      "student",
                                      false
                                    )
                                  }
                                  color="primary"
                                >
                                  Close
                                </Button>
                              </DialogActions>
                            </Dialog>
                          </ListItem>
                          <Divider />
                        </List>
                      </Box>
                      <Box className="margin-left-20 md-down-full-width">
                        <List>
                          <ListItem className="selectstudentpadding">
                            <ListItemText
                              className="studentselect"
                              primary={
                                teacherList.length !== 0
                                  ? `${teacherList.length} - Alternate Teacher(s)`
                                  : "No Alternate Teacher"
                              }
                              onClick={() =>
                                this.handleDialogStatus(
                                  "alternateTeacher",
                                  true
                                )
                              }
                            />
                            <IconButton
                              color="primary"
                              aria-label="add to shopping cart"
                              onClick={() =>
                                this.handleDialogStatus(
                                  "alternateTeacher",
                                  true
                                )
                              }
                            >
                              <PersonOutlined />
                            </IconButton>
                            <Dialog
                              maxWidth="sm"
                              aria-labelledby="max-width-dialog-title"
                              open={alternateTeacher}
                              fullScreen={window.innerWidth < 980}
                            >
                              <DialogTitle
                                id="max-width-dialog-title"
                                className="text-center"
                              >
                                Alternate Teacher(s)
                              </DialogTitle>
                              <Divider className="teacher-dialog-seperator" />
                              <table>
                                <thead>
                                  <tr className="altTeachersHeading">
                                    <td className="teacherNameWidth text-center text-bold">
                                      Teacher
                                    </td>
                                    <td className="editwidth text-bold text-center">
                                      View
                                    </td>
                                    <td className="editwidth text-bold text-center">
                                      update
                                    </td>
                                    <td className="editwidth text-bold text-center">
                                      evaluate
                                    </td>
                                  </tr>
                                </thead>
                                <tbody>
                                  {teacherList.map((data) => {
                                    const labelId = `checkbox-list-secondary-label-${data.id}`;
                                    return (
                                      <tr
                                        key={data.id}
                                        className="altTeachersHeading"
                                      >
                                        <td className="teacherNameWidth diary-teacher-name">
                                          <ListItemAvatar>
                                            <Avatar
                                              alt={data.full_name}
                                              src={
                                                data.profile_pic_details
                                                  ? data.profile_pic_details
                                                    .file
                                                  : data.full_name
                                              }
                                            />
                                          </ListItemAvatar>
                                          <ListItemText
                                            id={labelId}
                                            primary={data.full_name}
                                          />
                                        </td>
                                        <td className="editwidth">
                                          <Checkbox
                                            edge="end"
                                            className="margin-auto"
                                            disabled={true}
                                            checked={data.view}
                                            inputProps={{
                                              "aria-labelledby": labelId,
                                            }}
                                          />
                                        </td>
                                        <td className="editwidth">
                                          <Checkbox
                                            edge="end"
                                            className="margin-auto"
                                            disabled={true}
                                            checked={data.update}
                                            inputProps={{
                                              "aria-labelledby": labelId,
                                            }}
                                          />
                                        </td>
                                        <td className="text-center editwidth">
                                          <Box>
                                            <Checkbox
                                              edge="end"
                                              className="margin-auto"
                                              disabled={true}
                                              checked={data.evaluate}
                                              inputProps={{
                                                "aria-labelledby": labelId,
                                              }}
                                            />
                                          </Box>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                              <DialogActions
                                className={
                                  window.innerWidth < 980
                                    ? "bottom-buttons"
                                    : ""
                                }
                              >
                                <Button
                                  autoFocus
                                  onClick={() =>
                                    this.handleDialogStatus(
                                      "alternateTeacher",
                                      false
                                    )
                                  }
                                  color="primary"
                                >
                                  Close
                                </Button>
                              </DialogActions>
                            </Dialog>
                          </ListItem>
                          <Divider />
                        </List>
                      </Box>
                    </Box>
                  </Box>
                </Paper>
              </Box>
            </Paper>
            <Dialog
              maxWidth="lg"
              aria-labelledby="max-width-dialog-title"
              open={openImageDetailsPopupStatus}
              fullScreen={window.innerWidth < 980}
            >
              <Box className="p-20">
                {activeImgData.document_details.isImage ? (
                  <img
                    src={activeImgData.document_details.file}
                    alt={activeImgData.document_details.fileName}
                    className="border margin-auto"
                    style={{ maxWidth: 300 }}
                  />
                ) : (
                  <iframe
                    className="margin-auto"
                    src={activeImgData.document_details.file}
                  ></iframe>
                )}
              </Box>
              {activeImgData.comment ? (
                <Box className="margin-20">
                  <Box className="form-left-heading">Description</Box>
                  <Box>{activeImgData.comment}</Box>
                </Box>
              ) : null}
              <Divider className="teacher-dialog-seperator m-t-20px" />
              <DialogActions>
                <Button
                  autoFocus
                  onClick={() =>
                    this.setState({ openImageDetailsPopupStatus: false })
                  }
                  color="primary"
                >
                  close
                </Button>
              </DialogActions>
            </Dialog>
          </Dialog>
        </Box>
      </Grid>
    );
  }
}

ViewHomeWork.propTypes = {
  history: PropTypes.func.isRequired,
};

export default withRouter(ViewHomeWork);
