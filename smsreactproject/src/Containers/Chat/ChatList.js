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

import Chat from "./Components/Chat";
import UserChat from "./Components/UserChat";
import { GET_URL, POST_URL } from "Includes/urls";
import { getRequest, postRequest } from "Includes/api/apicall";
import { Alert, isTeacher, getUrlParam } from "Includes/functions";
import { Actions } from 'Constants/permissions';
import './styles.scss';

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
  chatList: {
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

class ChatList extends Component {
  constructor(props) {
    super(props)

    this.state = {
      isUserTeacher: false,
      chat: true,
      chatList: [],
      activeChatList: [],
      studentIdDataMapping: {},
      chatListSelections: [],
      activeConversationId: 0,
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
    // const { activeConversationId, activeConversationIdchatId } = this.state;
    // this.setTime[activeConversationId] = setInterval(() => {
    //   this.getChatDetail(activeConversationId, activeConversationIdchatId);
    // }, 5000);
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
    this.setState({
      dateRangeDropdown,
      dateRangeValue,
      id,
      activeType,
      completedTab
    }, () => {
      this.getchatid();
    })
  }


  classes = () => {
    useStyles();
  };

  handleClose = () => {
    const { dateRangeValue, dateRangeDropdown, completedTab, activeConversationId } = this.state
    let sectionInformation = {
      'dateRangeValueStart': dateRangeValue.start,
      'dateRangeValueEnd': dateRangeValue.end,
      'dateRangeDropdownParam': dateRangeDropdown,
    }
    let searchParam = "?" + new URLSearchParams(sectionInformation).toString()
    let url = Actions.diary_managechat_evaluate_list.view.url
    if (completedTab) {
      url = Actions.diary_managechat_completed_list.view.url
    }
    this.props.history.push({
      pathname: url,
      search: searchParam,
    });
    clearInterval(this.setTime[activeConversationId]);
  };

  getChatDetail = (conversation_id) => {
    const params = { is_active: true,  page: 1, limit: 10}; //nikhil hardcoded
    let url = GET_URL.conversation.api + '/' + conversation_id +'/'
      getRequest(url, params, this.props).then(
          (response) => {
              if (response && response.status === 200) {
                  this.setState({
                    activeChatList: response.data.data
                  })
              }
          }
      );
  };

  componentWillUnmount() {
    const { activeConversationId } = this.state;
    clearInterval(this.setTime[activeConversationId]);
  }

  getchatid = () => {
    let url = `${POST_URL.mychat.api}`;
    let post_data = {
      "page": 1 //nikhil hardcoded
    }
    postRequest(url, post_data, this.props).then((response) => {
      if (response && response.status === 200) {
        const chatList = response.data.chat_data;
        this.setState(
          {
            openAcceptModal: false,
            chatList,
          },
        );
      }
    });
  };


  updateCurrentChat = (chat) => {
    let { activeConversationId } = this.state;
    if (activeConversationId !== chat.conversation) {
      clearInterval(this.setTime[activeConversationId]);
      delete this.setTime[activeConversationId]
      this.getChatDetail(chat.conversation);
      this.setState({
        activeConversationId: chat.conversation
      })
    }
  };

  uploadRemarks = (newDoc, teacherReviewData = null) => {
    if (!teacherReviewData && !newDoc.comment.trim() && !newDoc.document) {
      return;
    }
    const { id } = this.state;
    const { activeConversationId, activeConversationIdchatId } = this.state;
    const payload = {
      diary: id,
      student: activeConversationId,
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
      payload.student_detail.student = activeConversationId;
    }
    let url = POST_URL.message.api;
    postRequest(url, payload, this.props).then((response) => {
      if (response && response.status === 200) {
        if (teacherReviewData) {
          this.getchatid();
        }
        this.getChatDetail(activeConversationId);
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


  render() {
    let {
      chat,
      chatList,
      studentIdDataMapping,
      activeConversationId,
      alertData,
      snackbar,
      isUserTeacher,
      activeChatList
    } = this.state;

    return (
      <Dialog
        fullScreen
        open={chat}
        onClose={() => this.handleClose("chat")}
        TransitionComponent={Transition}
      >
        <AppBar className={this.classes.appBar}>
          <Toolbar className="app-bar-color">
            <IconButton
              edge="start"
              color="inherit"
              onClick={() => this.handleClose("chat")}
              aria-label="close"
            >
              <CloseIcon />
            </IconButton>
            <Typography variant="h6" className={this.classes.title}>
              My Personal Chat
            </Typography>
          </Toolbar>
        </AppBar>
        <Box className="evaluate-content full-height">
          <Box className="evaluate-page-width">
            <Box className="mt-50 p-10 pb-20">
              <Box className="" style={{ fontSize: "17px" }}>
                <Box className="heading"></Box>
                <Box className="mt-20 flex-justify-space-between">
                </Box>
                <Box className="mt-10 flex-justify-space-between">
                </Box>
                <Box className="text-info marign-top-text text-left">
                </Box>
              </Box>
            </Box>
            <Box className="marign-left-10">
              <UserChat
                ref={this.studentSelectRef}
                chatList={chatList}
                studentIdDataMapping={studentIdDataMapping}
                updateCurrentChat={this.updateCurrentChat}
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
            {activeConversationId !== 0 && (
              <Chat
                isUserTeacher={isUserTeacher}
                data={activeChatList}
                uploadRemarks={this.uploadRemarks}
                deleteDocument={this.deleteDocument}
                updateRemarks={this.updateRemarks}
                users={[{ name: userId, avatar: null }]}
              />
            )}
          </Box>
        </Box>

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

ChatList.propTypes = {
  id: PropTypes.number.isRequired,
  evaluatechat: PropTypes.func.isRequired,
  chat: PropTypes.object.isRequired,
};

export default withRouter(ChatList);
