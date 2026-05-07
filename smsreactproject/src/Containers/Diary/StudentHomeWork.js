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
} from "@material-ui/core";
import { getFullName, isMobile } from "Includes/functions";
import { Dropdown } from "Components/DropDown";

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

const StudentHomeWork = forwardRef((props, ref) => {
  const { studentList, studentIdDataMapping, updateCurrentStudent } = props;
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
    updateCurrentStudent(value);
  };

  return (
    <>
      <Box className="even-flex-prop mb-10 mt-30 md-up-display-none">
        <Dropdown
          data={studentList}
          name="name"
          value={value}
          required={true}
          hideSelect={true}
          onChange={(e) => {
            const student = studentIdDataMapping[e.target.value];
            handleChange(student.id, student);
          }}
          label="Students"
        />
      </Box>
      <Box className="md-down-display-none">
        <Box
          id="demo"
          ref={tabRef}
          onScroll={myScroll}
          className={classes.root}
        >
          <Tabs
            orientation="vertical"
            variant="scrollable"
            value={value}
            onChange={handleChange}
            aria-label="Vertical tabs example"
            className={classes.tabs}
            scrollButtons="off"

          >
            {studentList.map((data, index) => {
              const fullName = getFullName(
                data.first_name,
                data.middle_name,
                data.last_name
              );
              return (
                <Button
                className={value === index ? "selected-student student-hm-ev" : "student-hm-ev"}
                  key={`stu-${index}`}
                  onClick={() => handleChange(index, data)}
                >
                  <ListItemAvatar>
                    <Avatar
                      alt={data.first_name}
                      src={
                        data.profile_pic_details
                          ? data.profile_pic_details.file
                          : data.first_name
                      }
                    />
                  </ListItemAvatar>
                  <Box>
                    {fullName}
                  </Box>
                </Button>
              );
            })}
          </Tabs>
        </Box>
      </Box>
    </>
  );
});

StudentHomeWork.propTypes = {
  studentList: PropTypes.array.isRequired,
  updateCurrentStudent: PropTypes.func.isRequired,
  studentIdDataMapping: PropTypes.object.isRequired,
};
export default StudentHomeWork;
