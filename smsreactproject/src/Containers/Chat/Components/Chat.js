/* eslint-disable react/prop-types */
import React, { useState, useRef } from "react";
import "../styles.scss";
import {
  MenuItem,
  Grow,
  Paper,
  Popper,
  MenuList,
} from "@material-ui/core";
import ClickAwayListener from "@material-ui/core/ClickAwayListener";
import KeyboardArrowDownIcon from "@material-ui/icons/KeyboardArrowDown";
import moment from "moment";
import Swal from "sweetalert2";
import { maxFileSize } from "Constants";
import { postRequest } from "Includes/api/apicall";
import { POST_URL } from "Includes/urls";
import { CircularProgress } from "@material-ui/core";
import { isMobile } from "Includes/functions";

function detectURL(message) {
  var urlRegex = /(((https?:\/\/)|(www\.))[^\s]+)/g;
  return message.replace(urlRegex, function (urlMatch) {
    return '<a href="' + urlMatch + '">' + urlMatch + "</a>";
  });
}

class InputMessage extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      isuploading: false,
    };
    this.handleSendMessage = this.handleSendMessage.bind(this);
  }
  handleSendMessage(event) {
    event.preventDefault();
    this.messageInput.value = this.messageInput.value.trim();
    if (this.messageInput.value.length > 0) {
      this.props.sendMessageLoading(
        this.ownerInput.value,
        this.messageInput.value,
        null
      );
      this.messageInput.value = "";
    }
  }

  handleAttachmentChange = async (event) => {
    if (event.target.files[0]) {
      if (event.target.files[0].size < maxFileSize["file"].size) {
        let post = new FormData();
        post.append("file", event.target.files[0]);
        const url = POST_URL.uploads.api;
        this.setState({ isuploading: true });
        const response = await postRequest(url, post, this.props);
        this.setState({ isuploading: false });
        if (response && response.status === 200) {
          this.props.sendMessageLoading(
            this.ownerInput.value,
            "",
            response.data.data
          );
        }
      } else {
        Swal.fire({
          type: "error",
          title: "Error",
          text: maxFileSize["file"].errorText,
        });
      }
    }
  };

  render() {
    const { isuploading } = this.state;
    const loadingClass = this.props.isLoading
      ? "chatApp__convButton--loading"
      : "";
    return (
      <form onSubmit={this.handleSendMessage} className="input-bar">
        <input
          type="hidden"
          ref={(owner) => (this.ownerInput = owner)}
          value={this.props.owner}
        />
        <input
          type="text"
          ref={(message) => (this.messageInput = message)}
          className={"chatApp__convInput"}
          placeholder="Text message"
          tabIndex="0"
        />
        {!isuploading && !this.props.isLoading ? (
          <>
            <label htmlFor="upload-pic">
              {/* <Button variant="raised" component='span' className='create-expenses-upload-receipts-button'>
                                                                {upload_name}<Box className='upload-icon'><i class="fa fa-upload" aria-hidden="true"></i></Box>
                                                            </Button> */}
              <i
                className="fa fa-paperclip chat-attachment-icon pointer"
                aria-hidden="true"
                onClick={this.upload}
              ></i>
            </label>

            <input
              type="file"
              id="upload-pic"
              className="display-none"
              onChange={(e) => this.handleAttachmentChange(e)}
              onClick={(e) => (e.target.value = null)}
            />
            {/* <label htmlFor='upload-pic'>
                  <i className="fa fa-paperclip diary-chat-attach" aria-hidden="true"></i>
                  </label>
                  <input type='file' id='upload-pic' className='display-none' onChange={(e) => handleChangeDoc(e, 'file')}
                    onClick={e => (e.target.value = null)} /> */}
            <div
              className={"chatApp__convButton " + loadingClass}
              onClick={this.handleSendMessage}
            >
              <i className={"material-icons"}>send</i>
            </div>
          </>
        ) : (
          <CircularProgress />
        )}
      </form>
    );
  }
}

const MessageList = ({ messages, owner }) => {
  const windowHeight = window.innerHeight;
  // const messages = messages.slice(0).reverse();
  return (
    <div
      className="chatApp__convTimeline"
      style={{ height: !isMobile() ? `${windowHeight - 280}px` : "auto" }}
    >
      {messages && messages.map((messageItem, index) => {
        if (messageItem?.document_details?.file) {
          return (
            <MessageDocumentItem
              key={index}
              owner={owner}
              sender={messageItem.sender}
              documentDetails={messageItem.document_details}
              message={messageItem.message}
              user={
                messageItem.user_details && messageItem.user_details.first_name
              }
              created={messageItem.created}
              showDate={
                index === messages.length - 1 ||
                (index < messages.length - 2 &&
                  moment(messages[index + 1].created).format(
                    "DD-MM-YYYY"
                  ) !== moment(messageItem.created).format("DD-MM-YYYY"))
              }
            />
          );
        }
        if (messageItem.message) {
          return (
            <MessageItem
              key={index}
              owner={owner}
              sender={messageItem.sender}
              message={messageItem.message}
              user={
                messageItem.user_details && messageItem.user_details.first_name
              }
              created={messageItem.created}
              showDate={
                index === messages.length - 1 ||
                (index < messages.length - 2 &&
                  moment(messages[index + 1].created).format(
                    "DD-MM-YYYY"
                  ) !== moment(messageItem.created).format("DD-MM-YYYY"))
              }
            />
          );
        }
        return null;
      })}
    </div>
  );
};

const MessageUpdateDropdown = () => {
  const [isMenuOpen, setisMenuOpen] = useState(false);
  const [anchorEl, setanchorEl] = useState(null);
  const anchorRef = useRef("");
  const handleMenuClose = (e, action) => {
    let anchorElTemp = null;
    let isMenuOpenTemp = !isMenuOpen;
    if (action === "close") {
      isMenuOpenTemp = false;
    }
    if (isMenuOpenTemp) {
      anchorElTemp = e.currentTarget;
    }
    setisMenuOpen(isMenuOpenTemp);
    setanchorEl(anchorElTemp)
  }

  const deleteDiaryDoc = () => {

  }

  const updateDiaryDoc = () => {

  }

  const id = isMenuOpen ? 'simple-popper' : undefined;
  return (<>
    <KeyboardArrowDownIcon
      className="pointer"
      ref={anchorRef}
      onClick={(e) => handleMenuClose(e, "check")}
    />
    <Popper
      open={isMenuOpen}
      anchorEl={anchorEl}
      role={undefined}
      transition
      disablePortal
      id={id}
    >
      {({ TransitionProps, placement }) => (
        <Grow
          {...TransitionProps}
          style={{
            transformOrigin: placement === "bottom" ? "center top" : "center bottom",
            zIndex: 1
          }}
        >
          <Paper>
            <ClickAwayListener onClickAway={(e) => handleMenuClose(e, "close")}>
              <MenuList
                autoFocusItem={isMenuOpen}
                id="menu-list-grow"
              >
                <MenuItem onClick={() => updateDiaryDoc()}>
                  Edit
                </MenuItem>
                <MenuItem onClick={() => deleteDiaryDoc(true)}>
                  Delete
                </MenuItem>
              </MenuList>
            </ClickAwayListener>
          </Paper>
        </Grow>)}
    </Popper></>)
}

const MessageItem = (props) => {
  const { owner, sender, message, user, created, showDate } = props;
  const selfUser = owner === sender;

  return (
    <>
      <div
        className={
          selfUser
            ? "chatApp__convMessageItem chatApp__convMessageItem--right clearfix"
            : "chatApp__convMessageItem chatApp__convMessageItem--left clearfix"
        }
      >
        {/* <MessageUpdateDropdown {...props} /> */}
        <div className="chatApp__convMessageValue">
          <div>
            {!selfUser ? <div className="chat-user">{user}</div> : null}
            <div className="chat-message-text">{message}</div>
            <div className="chat-time">{moment(created).format("hh:mm A")}</div>
          </div>
        </div>
      </div>
      {showDate && (
        <div className="flex-justify-center">
          <div className="chat-date">
            {moment(created).format("DD MMM YYYY")}
          </div>
        </div>
      )}
    </>
  );
};

const MessageDocumentItem = (props) => {
  const { owner, sender, documentDetails, user, created, showDate, message } =
    props;
  const selfUser = owner === sender;
  let fileName = documentDetails.file_name;
  if (fileName.length > 36) {
    fileName = `${fileName.substr(0, 33)}...`;
  }

  // const downloadFile = () => {
  //   const link = document.createElement("a");
  //   link.href = documentDetails.file;
  //   axios.get(documentDetails.file).then((res) => {
  //     fileDownload(res.data, documentDetails.file_name);
  //   });
  // };

  const openInNewWindow = () => {
    window.open(documentDetails.file, "_blank");
  };

  return (
    <>
      <div
        className={
          owner === sender
            ? "chatApp__convMessageItem chatApp__convMessageItem--right clearfix"
            : "chatApp__convMessageItem chatApp__convMessageItem--left clearfix"
        }
      >
        {/* <MessageUpdateDropdown {...props} /> */}
        <div
          className="chatApp__convMessageValue"
        // dangerouslySetInnerHTML={{ __html: rightMessageShow }}
        >
          <div className="chat-media">
            {!selfUser ? <div className="chat-user">{user}</div> : null}
            <div
              className="chat-message-text chat-media-con pointer"
              style={{
                backgroundColor: selfUser
                  ? "rgba(200, 219, 227, 0.92)"
                  : "#ebebeb",
              }}
              onClick={() => openInNewWindow()}
            >
              <i className="fa fa-file chat-doc" aria-hidden="true"></i>
              <span className="ml-10">{fileName}</span>
              {/* <i className="fa fa-arrow-circle-o-down chat-download-icon ml-10" aria-hidden="true" ></i> */}
            </div>
            <div className="mt-5">{message}</div>
            <div className="chat-time ">
              {moment(created).format("hh:mm A")}
            </div>
          </div>
        </div>
      </div>

      {showDate && (
        <div className="flex-justify-center">
          <div className="chat-date">
            {moment(created).format("DD MMM YYYY")}
          </div>
        </div>
      )}
    </>
  );
};

class ChatBox extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      isLoading: false,
    };
  }

  sendMessageLoading = (sender, message, documentDetails) => {
    this.setState({ isLoading: true });
    this.props.sendMessage(sender, message, documentDetails);
    setTimeout(() => {
      this.setState({ isLoading: false });
    }, 400);
  };

  render() {
    return (
      <div className={"chatApp__conv"}>
        <MessageList owner={this.props.owner} messages={this.props.messages} />
          <div className={"chatApp__convSendMessage clearfix"}>
            <InputMessage
              isLoading={this.state.isLoading}
              owner={this.props.owner}
              sendMessageLoading={this.sendMessageLoading}
            />
          </div>
      </div>
    );
  }
}

const Chat = (props) => {
  const { users, isUserTeacher, data } = props;
  const sendMessage = (sender, message, documentDetails) => {
    // let messageFormat = detectURL(message);
    // let newMessageItem = {
    //   id: this.state.messages.length + 1,
    //   sender: parseInt(sender),
    //   message: messageFormat,
    //   document_details: documentDetails,
    //   owner: parseInt(sender),
    //   created: String(new Date()),
    // };
    props.uploadRemarks({
      comment: message,
      document: documentDetails?.id,
      // newMessage: newMessageItem
    });
  };
  console.log(data, 'nikhil data')

  return <div className={"chatApp__room"}>
    {users.map((user, index) => {
      return (
        <ChatBox
          isUserTeacher={isUserTeacher}
          key={index}
          owner={user.name}
          sendMessage={sendMessage}
          messages={data}
        />
      );
    })}
  </div>;
}

export default Chat