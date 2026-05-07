/* eslint-disable react/display-name */
import React, {
    useState,
    useRef,
    useImperativeHandle,
    forwardRef,
  } from "react";
  import PropTypes from "prop-types";
  import { makeStyles } from "@material-ui/core/styles";
  import {
    Tabs,
    Typography,
    Box,
    ListItemAvatar,
    Avatar,
    Button,
    Divider,
  } from "@material-ui/core";
  import { isMobile } from "Includes/functions";
  import '../styles.scss'
  import GroupIcon from "@material-ui/icons/Group"; // For Material-UI v4

  function TabPanel(props) {
    const { children, value, index, ...other } = props;
  
    return (
      <div
        role="tabpanel"
        hidden={value !== index}
        id={`vertical-tabpanel-${index}`}
        aria-labelledby={`vertical-tab-${index}`}
        {...other}
      >
        {value === index && (
          <Box p={10}>
            <Typography>{children}</Typography>
          </Box>
        )}
      </div>
    );
  }
  
  TabPanel.propTypes = {
    children: PropTypes.node,
    index: PropTypes.any.isRequired,
    value: PropTypes.any.isRequired,
  };
  
  function myScroll() {
    // if (window.innerWidth > 980) {
    //   var elemt = document.getElementById("demo");
    //   var y = elemt.scrollTop;
    //   document.getElementById("demo").innerHTML = "Vertically: " + y + "px";
    // }
  }
  
  const useStyles = makeStyles((theme) => ({
    root: {
      flexGrow: 1,
      backgroundColor: theme.palette.background.paper,
      display: "flex",
      "@media (min-width:980px)": {
        height: 400,
      },
    },
    tabs: {
      borderRight: `1px solid ${theme.palette.divider}`,
      marginTop: "20px",
      width: '100%'
    },
  }));
  
  const UserChat = forwardRef((props, ref) => {
    const { chatList, studentIdDataMapping, updateCurrentChat } = props;
    const classes = useStyles();
    const [value, setValue] = useState(0);
    const tabRef = useRef(null);
  
    useImperativeHandle(ref, () => ({
      setStudentValue(id, index) {
        if (isMobile()) {
          setValue(id);
        } else {
          setValue(index);
        }
      },
    }));
  
    const handleChange = (event, value) => {
      setValue(event);
      updateCurrentChat(value);
    };

    const returnChatProfile = (rowData) => {
      let last_message_data = {}
      last_message_data['data'] = rowData?.last_message?.data ? rowData.last_message.data : ""
      if( rowData?.last_message?.from_user_data?.student){
        last_message_data['name'] = rowData.last_message.from_user_data.student.name
      }else if( rowData?.last_message?.from_user_data?.staff){
        last_message_data['name'] = rowData.last_message.from_user_data.staff.full_name
      }else{
        last_message_data['name'] = rowData?.last_message?.from_user_data ? rowData.last_message.from_user_data.username : ""
      }
      if( rowData['conversation_type'] == 2){ //Group
        return <>
                <ListItemAvatar>
                  <Avatar
                    alt={rowData.conversation_name}
                    src={
                      rowData.document_details
                        ? rowData.document_details.file
                        : <GroupIcon />
                    }
                  />
                </ListItemAvatar>
                <Box className="chat-container">
                  <Box className="chat-heading">{rowData.conversation_name}</Box>
                  <Box className="chat-sub-heading">{last_message_data.name} : {last_message_data.data}</Box>
                </Box> 
              </>
      }else if(rowData['conversation_type'] == 1){
        let name = null
        let profile_pic_details = null
        if(rowData['user_details']['student']){
          name = rowData['user_details']['student']['name']
          profile_pic_details = rowData['user_details']['student']['profile_pic_details']
        }else if(rowData['user_details']['staff']){
          name = rowData['user_details']['staff']['full_name']
          profile_pic_details = rowData['user_details']['staff']['profile_pic_details']
        }
        return <>
                  <ListItemAvatar>
                  <Avatar
                    alt={name}
                    src={profile_pic_details}
                  />
                </ListItemAvatar>
                <Box className="chat-container">
                  <Box className="chat-heading">{name}</Box>
                  <Box className="chat-sub-heading">{last_message_data.data}</Box>
                </Box>
              </>
      }else{
          return <> 
                  <ListItemAvatar>
                    <Avatar
                      alt="Super Admin"
                      src="S"
                    />
                </ListItemAvatar>
                <Box className="chat-container">
                  <Box className="chat-heading">Super Admin</Box>
                  <Box className="chat-sub-heading">{last_message_data.data}</Box>
                </Box>
          </>
      }
      
    }

    return (
      <>
        <Box className="">
          <Box
            id="demo"
            ref={tabRef}
            onScroll={myScroll}
          >
              {chatList.map((data, index) => {
                return (
                  <>
                    <Button
                      className={value === index ? "selected-student student-hm-ev" : "student-hm-ev"}
                      key={`stu-${index}`}
                      onClick={() => handleChange(index, data)}
                    >
                      {returnChatProfile(data)}
                    </Button>
                    <Divider style={{paddingLeft: "20px"}}/>
                  </>
                );
              })}
          </Box>
        </Box>
      </>
    );
  });
  
  UserChat.propTypes = {
    chatList: PropTypes.array.isRequired,
    updateCurrentChat: PropTypes.func.isRequired,
    studentIdDataMapping: PropTypes.object.isRequired,
  };
  export default UserChat;
  