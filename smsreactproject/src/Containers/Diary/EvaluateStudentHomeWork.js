/* eslint-disable react/display-name */
import React, { Component } from "react";
import {
  Box,
  Dialog,
  Typography,
  AppBar,
  Toolbar,
  IconButton,
  Divider,
  Slide,
  Chip,
  Button,
  DialogContent,
  DialogContentText,
  DialogActions,
  Snackbar,
  TextField,
} from "@material-ui/core";
import AssignmentOutlinedIcon from "@material-ui/icons/AssignmentOutlined";
import ErrorOutlineIcon from "@material-ui/icons/ErrorOutline";
import { makeStyles } from "@material-ui/core/styles";
import CloseIcon from "@material-ui/icons/Close";
import { withRouter } from "react-router-dom";
import PropTypes from "prop-types";
import Swal from "sweetalert2";
import moment from "moment";

import DiaryChat from "./Components/DiaryChat";
import StudentHomeWork from "./StudentHomeWork";
import { GET_URL, POST_URL } from "Includes/urls";
import { getRequest, postRequest } from "Includes/api/apicall";
import { Alert, isTeacher, getUrlParam } from "Includes/functions";
import { Actions } from 'Constants/permissions';

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const alias_names = JSON.parse(localStorage.getItem('alias_name')) ? JSON.parse(localStorage.getItem('alias_name')) : {}


const useStyles = makeStyles((theme) => ({
  root: {
    width: "100%",
    display: "flex",
    justifyContent: "center",
    flexWrap: "wrap",
    "& > *": {
      margin: theme.spacing(0.5),
    },
  },
  studentlist: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: theme.palette.background.paper,
  },
  heading: {
    fontSize: theme.typography.pxToRem(15),
    flexBasis: "33.33%",
    flexShrink: 0,
  },
  secondaryHeading: {
    fontSize: theme.typography.pxToRem(15),
    color: theme.palette.text.secondary,
  },
  appBar: {
    position: "relative",
  },
  title: {
    marginLeft: theme.spacing(2),
    flex: 1,
  },
  tabs: {
    borderRight: `1px solid ${theme.palette.divider}`,
  },
  scroll: {
    flexGrow: 1,
    backgroundColor: theme.palette.background.paper,
    display: "flex",
    height: 224,
  },
}));

let user = localStorage.getItem("user") != 'undefined' ? JSON.parse(localStorage.getItem("user")) : '';
let userId = user ? user.id : null;

class EvaluateStudentHomeWork extends Component {
  constructor(props) {
    super(props)

    this.state = {
      isUserTeacher: false,
      homework: true,
      homeworkdata: {},
      standardList: [],
      sectionList: [],
      standard: 0,
      notSubmitted: 0,
      completed: 0,
      studentList: [],
      submissions: [],
      studentIdDataMapping: {},
      documents: { data_list: [], count: 0, next: null },
      chatList: [],
      studentListSelections: [],
      activeStudent: 0,
      activeStudentHomeWorkId: 0,
      activeType: "Not Completed",
      completedTab: false,
      userMapping: {},
      openAcceptModal: false,
      points: "",
      acceptDescription: "",
      status: [
        {
          type: "Not Completed",
          color: "primary",
          status: true,
        },
        {
          type: "Submitted",
          color: "default",
          status: false,
        },
        {
          type: "Resubmit",
          color: "default",
          status: false,
        },
        {
          type: "Completed",
          color: "default",
          status: false,
        },
      ],
      completed_status: [
        {
          type: "Completed",
          color: "primary",
          status: true,
        },
      ]
    };
    this.setTime = {}
  }

  setIntervalTime = () => {
    const { activeStudent, activeStudentHomeWorkId } = this.state;
    this.setTime[activeStudent] = setInterval(() => {
      this.getDiaryDocuments(activeStudent, activeStudentHomeWorkId);
    }, 5000);
  }



  componentDidMount() {
    let { dateRangeDropdown, dateRangeValue, activeType, completedTab } = this.state
    this.studentSelectRef = React.createRef();
    this.setState({ isUserTeacher: isTeacher() });
    let { dateRangeDropdownParam, dateRangeValueStart, dateRangeValueEnd, id } = getUrlParam()
    if (dateRangeDropdownParam && dateRangeValueStart && dateRangeValueEnd && id) {
      dateRangeDropdown = dateRangeDropdownParam
      dateRangeValue = { start: dateRangeValueStart, end: dateRangeValueEnd }
    }
    if (!id) {
      let sectionInformation = {
        'dateRangeValueStart': dateRangeValueStart,
        'dateRangeValueEnd': dateRangeValueEnd,
        'dateRangeDropdownParam': dateRangeDropdownParam,
      }
      let searchParam = "?" + new URLSearchParams(sectionInformation).toString()
      this.props.history.push({
        pathname: Actions.diary_managehomework_evaluate_list.view.url,
        search: searchParam,
      });
    }
    else {
      if (Actions.diary_managehomework_completed_student.view.url === this.props.location.pathname) {
        activeType = 'Completed'
        completedTab = true
      }
      this.setState({
        dateRangeDropdown,
        dateRangeValue,
        id,
        activeType,
        completedTab
      }, () => {
        this.gethomeworkid();
      })
    }
  }


  classes = () => {
    useStyles();
  };

  handleClose = () => {
    const { dateRangeValue, dateRangeDropdown, completedTab, activeStudent } = this.state
    let sectionInformation = {
      'dateRangeValueStart': dateRangeValue.start,
      'dateRangeValueEnd': dateRangeValue.end,
      'dateRangeDropdownParam': dateRangeDropdown,
    }
    let searchParam = "?" + new URLSearchParams(sectionInformation).toString()
    let url = Actions.diary_managehomework_evaluate_list.view.url
    if (completedTab) {
      url = Actions.diary_managehomework_completed_list.view.url
    }
    this.props.history.push({
      pathname: url,
      search: searchParam,
    });
    clearInterval(this.setTime[activeStudent]);
  };

  getDiaryDocuments = (student, studentHomeWorkId) => {
    const { userMapping, documents } = this.state;
    const { id } = this.props;
    const params = {
      diary: id,
      student: student,
      from_diary: 0
    };
    const url = GET_URL.diarydocument.api;
    getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        let submissions = response.data.data;

        submissions.forEach((doc) => {
          doc.sender = doc.user;
          doc.senderAvatar = null;
          doc.message = doc.comment;
          doc.id = doc.user;
          doc.name = doc.user;
          userMapping[doc.id] = { name: doc.id, avatar: null };
          if (doc.isDocument) {
            doc.message = (
              <div style={{ height: "40px", opacity: 0.7 }}>{doc.comment}</div>
            );
          }
        });
        const chatList = [...documents.data_list, ...submissions];
        clearInterval(this.setTime[student]);
        this.setState({
          submissions,
          activeStudent: student,
          activeStudentHomeWorkId: studentHomeWorkId,
          userMapping,
          chatList
        }, () => {
          if (!this.setTime[student]) {
            this.setIntervalTime();
          }
        });
      }
    });
  };

  componentWillUnmount() {
    const { activeStudent } = this.state;
    clearInterval(this.setTime[activeStudent]);
  }

  gethomeworkid = () => {
    let { documents, userMapping, activeType, submissions, id } = this.state;
    let url = `${GET_URL.diary.api}${id}/`;
    getRequest(url, { from_diary: 1 }).then((response) => {
      if (response && response.status === 200) {
        const homeworkdata = response.data.data;
        const standardList = [];
        const sectionList = homeworkdata.standard_details.map((data) => {
          if (!standardList.includes(data.standard_name)) {
            standardList.push(data.standard_name);
          }
          return data;
        });
        let notSubmitted = 0;
        let completed = 0;
        homeworkdata.student_details.forEach((stu) => {
          if (stu.status === "Completed") {
            completed += 1;
          } else {
            notSubmitted += 1;
          }
        });
        if (notSubmitted === 0) {
          activeType = 'Completed'
        }
        const documentsTemp = { ...documents };
        documentsTemp.data_list = homeworkdata.document_details.map((doc) => {
          doc.sender = doc.user;
          doc.senderAvatar = null;
          doc.message = doc.comment;
          doc.id = doc.user;
          doc.name = doc.user;
          userMapping[doc.id] = { name: doc.id, avatar: null };
          return doc;
        });
        const chatList = [...documentsTemp.data_list, ...submissions];
        this.setState(
          {
            openAcceptModal: false,
            userMapping,
            chatList,
            sectionList,
            standardList,
            homeworkdata,
            notSubmitted,
            completed,
            documents: documentsTemp,
          },
          () => {
            this.handleClick(activeType, true);
          }
        );
      }
    });
  };

  handleClick = (type, allowSameType) => {
    let { status, homeworkdata, activeStudent, activeType } = this.state;
    if (!allowSameType && activeType === type) {
      return;
    }
    const activeStudentTemp = activeStudent;
    status.forEach((data) => {
      data.color = "default";
      data.status = false;
      if (data.type === type) {
        data.status = true;
        data.color = "primary";
      }
    });
    const studentIdDataMapping = {};
    const studentList = homeworkdata.student_details.filter((stu) => {
      stu.name = `${stu.first_name} ${stu.middle_name} ${stu.last_name}`;
      studentIdDataMapping[stu.id] = stu;
      return stu.status === type;
    });
    this.setState(
      {
        status,
        studentList,
        studentIdDataMapping,
        activeStudent: 0,
        activeType: type,
      },
      () => {
        if (studentList && studentList.length > 0) {
          this.studentSelectRef.current.setStudentValue(studentList[0].id, 0);
          if (activeStudentTemp !== studentList[0].student) {
            this.getDiaryDocuments(studentList[0].student, studentList[0].id);
          }
        }
      }
    );
  };

  updateCurrentStudent = (student) => {
    let { activeStudent } = this.state;
    if (activeStudent !== student.student) {
      clearInterval(this.setTime[activeStudent]);
      delete this.setTime[activeStudent]
      this.getDiaryDocuments(student.student, student.id);
    }
  };

  uploadRemarks = (newDoc, teacherReviewData = null) => {
    if (!teacherReviewData && !newDoc.comment.trim() && !newDoc.document) {
      return;
    }
    const { id } = this.state;
    const { activeStudent, activeStudentHomeWorkId } = this.state;
    const payload = {
      diary: id,
      student: activeStudent,
      document_detail: [
        {
          document: newDoc.document ? newDoc.document : null,
          comment: newDoc.comment.trim(),
        },
      ],
      student_detail: {},
    };
    if (teacherReviewData) {
      payload.student_detail = teacherReviewData;
      payload.student_detail.student = activeStudent;
    }
    let url = POST_URL.diarydocument.api;
    postRequest(url, payload, this.props).then((response) => {
      if (response && response.status === 200) {
        if (teacherReviewData) {
          this.gethomeworkid();
        }
        this.getDiaryDocuments(activeStudent, activeStudentHomeWorkId);
      }
    });
  };



  acceptStudentDiary = () => {
    const { points, acceptDescription } = this.state;
    const teacherReviewData = {
      status: "Completed",
      marks: points ? points : null,
    };
    this.uploadRemarks({ comment: acceptDescription }, teacherReviewData);
  };

  updateStatus = (status) => {
    if (status === "accept") {
      this.setState({
        openAcceptModal: true,
        acceptDescription: "",
        points: "",
      });
    } else {
      Swal.fire({
        title: "Are you sure?",
        text: "You want to reject!",
        showCancelButton: true,
        confirmButtonColor: "#3085d6",
        cancelButtonColor: "#d33",
        confirmButtonText: "Reject",
      }).then(async (result) => {
        if (result.value) {
          const teacherReviewData = {
            status: "Resubmit",
            marks: 0,
          };
          this.uploadRemarks({ comment: "" }, teacherReviewData);
        }
      });
    }
  };

  handleCloseSnackBar = () => {
    this.setState({
      snackbar: false,
    });
  };

  closeDiaryAcceptModal = () => this.setState({ openAcceptModal: false });

  deleteDocument = () => {//data, dataSource
    // const payload = {
    //   documentId:
    //     dataSource === 'from_diary_data'
    //       ? diaryData.document_details[index].id
    //       : documents[index].id,
    // }
    // let url = `${deleteUrls.diarydocument.api}${params.documentId}/`
    // deleteRequest(url, payload, this.props).then(response => {
    //   if (response && response.status === 200) {
    //     if (dataSource !== 'from_diary_data') {
    //     } else {
    //     }
    //   }
    // })
  }

  updateRemarks = () => {
    // const payload = {
    //   diary: diaryId,
    //   document:
    //     newDoc.document_details && newDoc.document_details.id
    //       ? newDoc.document_details.id
    //       : null,
    //   comment: newDoc.comment,
    //   documentId: newDoc.id,
    //   student: diaryData?.student_details?.id,
    // }
    // let url = `${putUrls.diarydocument.api}${params.documentId}/`

    // updateDiaryDocService(payload, props).then((response) => {
    //   if (response && response.status === 200) {
    //     messageBarRef.current.setCommentFromParent('')
    //     if (documentsUpdated) {
    //       setdocuments(() => documentsUpdated)
    //     }
    //   }
    // })
  }

  statusData = () => {
    const { homeworkdata, notSubmitted, completed } = this.state;
    return (
      <Box className="flex-justify-center text-center">
        <Box className="marign-left-15 evaluate-status">
          <Box>
            {homeworkdata.student_details &&
              homeworkdata.student_details.length}
          </Box>
          <Box className="evaluate-count sub-text-content"> Assigned </Box>
        </Box>
        <Box className="marign-left-15 evaluate-status evaluate-status-middle">
          <Box>{notSubmitted}</Box>
          <Box className="evaluate-count sub-text-content"> Incomplete </Box>
        </Box>
        <Box className="marign-left-15 evaluate-status">
          <Box>{completed}</Box>
          <Box className="evaluate-count sub-text-content"> reviewed </Box>
        </Box>
      </Box>
    );
  };

  render() {
    let {
      homework,
      status,
      standardList,
      homeworkdata,
      sectionList,
      studentList,
      studentIdDataMapping,
      activeStudent,
      activeType,
      openAcceptModal,
      points,
      acceptDescription,
      alertData,
      snackbar,
      isUserTeacher,
      chatList,
      activeStudentHomeWorkId,
      completed_status,
      completedTab
    } = this.state;

    return (
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
              onClick={() => this.handleClose("homework")}
              aria-label="close"
            >
              <CloseIcon />
            </IconButton>
            <Typography variant="h6" className={this.classes.title}>
              {" "}
              {completedTab ? 'Completed Home Work' : 'Evaluate Home Work'}
            </Typography>
          </Toolbar>
        </AppBar>
        <Box className="evaluate-content full-height">
          <Box className="evaluate-page-width">
            <Box className="mt-50 p-10 pb-20">
              <Box className="md-up-display-none" style={{ fontSize: "17px" }}>
                <Box className="heading">{homeworkdata.title}</Box>
                <Box className="mt-20 flex-justify-space-between">
                  <Box>Subject</Box>
                  <Box>{homeworkdata.subject_name}</Box>
                </Box>
                <Box className="mt-10 flex-justify-space-between">
                  <Box>Due Date</Box>
                  <Box>
                    {moment(homeworkdata.due_date).format("DD MMM YYYY")}
                  </Box>
                </Box>
                <Box className="mt-10 flex-justify-space-between">
                  <Box>Standard</Box>
                  <Box>
                    {standardList.map((data) => (
                      <span className="text-left text-capitalize" key={data}>
                        {data}
                      </span>
                    ))}
                  </Box>
                </Box>
                <Box className="flex-justify-space-between mt-10">
                  <Box className="section-diary-label">{`${alias_names['section']}(s) : `}</Box>
                  <Box className="ml-10 display-flex">
                    {sectionList.map((data, index) => (
                      <Box key={data.standard_section}>
                        {data.section_name}
                        {index !== sectionList.length - 1 ? ", " : ""}
                      </Box>
                    ))}
                  </Box>
                </Box>
                <Box className="text-info marign-top-text text-left">
                  {homeworkdata.description}
                </Box>
                {this.statusData()}
              </Box>
              <Box className="md-down-display-none">
                {standardList.map((data) => (
                  <Box className="heading text-left text-capitalize" key={data}>
                    {data}
                  </Box>
                ))}
                <Box className="display-flex mt-5" style={{ fontSize: "18px" }}>
                  <Box className="section-diary-label">{`${alias_names['section']}(s) : `}</Box>
                  <Box className="ml-10 display-flex">
                    {sectionList.map((data, index) => (
                      <Box key={data.standard_section}>
                        {data.section_name}
                        {index !== sectionList.length - 1 ? ",  " : " "}
                      </Box>
                    ))}
                  </Box>
                </Box>
              </Box>
            </Box>
            <Box className="marign-left-10">
              <Box className="diary-evaluate-status-chips-outer-body">
                <Box className="text-content flex-justify-space-between pl-5 max-width">
                  {!completedTab && status.map((data, index) => {
                    return (
                      <Box key={`status-${index}`} className="mr-5">
                        <Chip
                          style={{ borderRadius: 0 }}
                          label={data.type}
                          clickable
                          colorSecondary
                          onClick={() => this.handleClick(data.type, false)}
                          color={data.color}
                        />
                      </Box>
                    );
                  })}
                  {completedTab && completed_status.map((data, index) => {
                    return (
                      <Box key={`status-${index}`} className="mr-5">
                        <Chip
                          style={{ borderRadius: 0 }}
                          label={data.type}
                          clickable
                          colorSecondary
                          onClick={() => this.handleClick(data.type, false)}
                          color={data.color}
                        />
                      </Box>
                    );
                  })}
                </Box>
              </Box>
              <hr className="md-down-display-none" />
              <StudentHomeWork
                ref={this.studentSelectRef}
                studentList={studentList}
                studentIdDataMapping={studentIdDataMapping}
                updateCurrentStudent={this.updateCurrentStudent}
              />
            </Box>
          </Box>
          <Box>
            <Divider
              className="mr-10 dividerheight"
              orientation="vertical"
              flexItem
            />
          </Box>
          <Box className="full-width">
            <Box className="flex-justify-space-between md-down-display-none">
              <Box className="evaluate-hw-title">
                <Box className="diary-circle-icon">
                  <AssignmentOutlinedIcon className="diary-assignment-icon"></AssignmentOutlinedIcon>
                </Box>
                <Box className="marign-left-15 homework-actionsicon">
                  <Box className="heading-text-content marign-top-text">
                    {homeworkdata.title}({homeworkdata.subject_name}) Due on{" "}
                    {moment(homeworkdata.due_date).format("DD MMM YYYY")}
                  </Box>
                  <Box className="text-info marign-top-text text-left">
                    {homeworkdata.description}
                  </Box>
                </Box>
              </Box>
              <Box className="mr-20 mt-60">{this.statusData()}</Box>
            </Box>
            <Box className="mt-20 mb-10 md-up-justify-space-between md-down-justify-space-evenly">
              <Box className="md-down-display-none"></Box>
              {isUserTeacher &&
                activeStudent !== 0 &&
                activeType !== "Completed" &&
                (
                  <Box>
                    <Button
                      variant="contained"
                      color="secondary"
                      onClick={() => this.updateStatus("reject")}
                    >
                      Reject
                    </Button>
                    <Button
                      variant="contained"
                      color="primary"
                      className="accept-button"
                      onClick={() => this.updateStatus("accept")}
                    >
                      Accept
                    </Button>
                  </Box>
                )}
              {activeType === "Completed" && studentIdDataMapping[activeStudentHomeWorkId] ? <Box className="display-flex md-mr-30">
                <Box>Marks: </Box>
                <Box>{studentIdDataMapping[activeStudentHomeWorkId].marks}</Box>
              </Box> : null}
            </Box>
            <Divider className="mr-10" orientation="horizontal" />
            {activeStudent !== 0 && (
              <DiaryChat
                isUserTeacher={isUserTeacher}
                data={chatList}
                uploadRemarks={this.uploadRemarks}
                deleteDocument={this.deleteDocument}
                updateRemarks={this.updateRemarks}
                users={[{ name: userId, avatar: null }]}
              />
            )}
            {activeStudent === 0 && (
              <Box className="diary-blank-page">
                <ErrorOutlineIcon className="error-icon" />
                <Box
                  style={{
                    fontWeight: "500",
                    fontSize: "30px",
                    fontStyle: "Roboto",
                    display: "flex",
                    alignItems: "center",
                    lineHeight: "45px",
                  }}
                >
                  No Students Found
                </Box>
              </Box>
            )}
          </Box>
        </Box>
        <Dialog
          open={openAcceptModal}
          onClose={this.closeDiaryAcceptModal}
          className="action-basic-detail-width"
          aria-labelledby="form-dialog-title"
        >
          <DialogContent>
            <DialogContentText className="flex-justify-center-flex-prop">
              <Box className="text-center"> Please enter marks</Box>
              <TextField
                className="text-background mv-10"
                id="filled-multiline-static"
                label="Marks"
                InputProps={{ className: "textfield-background" }}
                defaultValue=""
                variant="filled"
                type="number"
                value={points}
                onChange={(e) => {
                  const { value } = e.target;
                  if (
                    value === "" ||
                    (value && !isNaN(value) && Number(value) > 0)
                  ) {
                    if (homeworkdata.marks < Number(value)) {
                      return;
                    }
                    this.setState({ points: value ? parseInt(value) : "" });
                  }
                }}
              />
              <TextField
                className="text-background"
                id="filled-multiline-static"
                label="Description"
                InputProps={{ className: "textfield-background" }}
                multiline
                rows={4}
                defaultValue=""
                variant="filled"
                name="description"
                value={acceptDescription}
                onChange={(e) =>
                  this.setState({ acceptDescription: e.target.value })
                }
              />
              <Box className="no-feature-label">
                Total Marks: {homeworkdata.marks}
              </Box>
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={this.closeDiaryAcceptModal} color="secondary">
              Cancel
            </Button>
            <Button
              texttransform="none"
              onClick={() => this.acceptStudentDiary()}
              color="primary"
            >
              update
            </Button>
          </DialogActions>
        </Dialog>

        <Snackbar
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          open={snackbar}
          autoHideDuration={10000}
          onClose={this.handleCloseSnackBar}
        >
          <Alert onClose={this.handleCloseSnackBar} severity="error">
            {alertData}
          </Alert>
        </Snackbar>
      </Dialog>
    );
  }
}

EvaluateStudentHomeWork.propTypes = {
  id: PropTypes.number.isRequired,
  evaluatehomework: PropTypes.func.isRequired,
  homework: PropTypes.object.isRequired,
};

export default withRouter(EvaluateStudentHomeWork);
