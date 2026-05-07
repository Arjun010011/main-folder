import React, { Component } from "react";
import Grid from "@material-ui/core/Grid";
import { Paper, Box, Button } from "@material-ui/core";
import Typography from "@material-ui/core/Typography";
import FormLabel from "@material-ui/core/FormLabel";
import MenuItem from "@material-ui/core/MenuItem";
import ListItemText from "@material-ui/core/ListItemText";
import Checkbox from "@material-ui/core/Checkbox";

import post from "../../../Components/actions/API_request/Post";

class TransferList extends Component {
  state = {
    leftCount: this.props.leftStudentList.strength,
    rightCount: this.props.rightStudentList.strength,
    studentListLeft: [
      {
        id: 5,
        name: "nikhil ",
        current_reg_num: "",
        dob: "2019-11-02",
        standard_section: 1,
        student: 2,
      },
      {
        id: 7,
        name: "Nagendra ",
        current_reg_num: "",
        dob: "2019-11-01",
        standard_section: 1,
        student: 1,
      },
    ],
    studentListRight: [
      {
        id: 5,
        name: "nikhil  ",
        current_reg_num: "",
        dob: "2019-11-02",
        standard_section: 1,
        student: 2,
      },
      {
        id: 7,
        name: "Nagendra  ",
        current_reg_num: "",
        dob: "2019-11-01",
        standard_section: 1,
        student: 1,
      },
      {
        id: 12,
        name: "Nagendra N Nag",
        current_reg_num: "1MS14CS411",
        dob: "1995-11-17",
        standard_section: 1,
        student: 5,
      },
    ],
    leftStudent: [],
    rightStudent: [],
    leftStudentListSelected: [],

    //this data will be send to backend
  };

  static getDerivedStateFromProps(props, state) {
    if (
      props.leftStudentList.strength !== state.leftCount ||
      props.rightStudentList.strength !== state.rightCount
    ) {
      return {
        leftCount: props.leftStudentList.strength,
        studentListLeft: props.leftStudentList.enrollments || [],
        rightCount: props.rightStudentList.strength,
        studentListRight: props.rightStudentList.enrollments || [],
      };
    }
    return null;
  }

  selectfunctionLeft = (index, id) => {
    let { studentListLeft, leftStudent } = this.state;
    let checkleftStudentPresent = leftStudent.indexOf(id);
    if (checkleftStudentPresent === -1) {
      this.setState({
        leftStudent: this.state.leftStudent.concat(studentListLeft[index].id),
      });
    } else {
      leftStudent.splice(checkleftStudentPresent, 1);
      this.setState({
        leftStudent,
      });
    }
  };

  selectfunctionRight = (index, id) => {
    let { studentListRight, rightStudent } = this.state;
    let checkleftStudentPresent = rightStudent.indexOf(id);
    if (checkleftStudentPresent === -1) {
      this.setState({
        rightStudent: this.state.rightStudent.concat(
          studentListRight[index].id
        ),
      });
    } else {
      rightStudent.splice(checkleftStudentPresent, 1);
      this.setState({
        rightStudent,
      });
    }
  };

  addleftStudents = () => {
    let { studentListLeft, leftStudent } = this.state;

    let filterData = studentListLeft.filter((data) => {
      let test = leftStudent.indexOf(data.id);
      if (test > -1) {
        return data;
      }
    });
    if (filterData.length === 0) {
      alert("Please select leftStudents");
    } else {
      let removeSelectedleftStudents = studentListLeft.filter((data) => {
        let test = leftStudent.indexOf(data.id);
        if (test === -1) {
          return data;
        }
      });

      ///kjasfkajsf

      //first add that selected to right payload

      // rightStudentPayload: this.state.rightStudentPayload.concat(filterData),

      this.setState({
        studentListRight: this.state.studentListRight.concat(filterData),
        studentListLeft: removeSelectedleftStudents,

        rightStudent: [],
      });
    }
  };

  addRightStudents = () => {
    let { studentListRight, rightStudent } = this.state;

    let filterData = studentListRight.filter((data) => {
      let test = rightStudent.indexOf(data.id);
      if (test > -1) {
        return data;
      }
    });
    if (filterData.length === 0) {
      alert("Please select rightstudents");
    } else {
      let removeSelectedleftStudents = studentListRight.filter((data) => {
        let test = rightStudent.indexOf(data.id);
        if (test === -1) {
          return data;
        }
      });
      this.setState({
        studentListLeft: this.state.studentListLeft.concat(filterData),
        studentListRight: removeSelectedleftStudents,

        leftStudent: [],
      });
    }
  };

  postData = async () => {
    let { studentListLeft, studentListRight } = this.state;
    let payload = [
      {
        standard_section: studentListLeft[0].standard_section,
        enrollments: studentListLeft,
      },
      {
        standard_section: studentListRight[0].standard_section,
        enrollments: studentListRight,
      },
    ];
    post("classes/shuffledstudents", payload);
  };

  render() {
    const { studentListLeft, rightStudent, leftStudent, studentListRight } =
      this.state;
    return (
      <>
        <Paper>
          <Box p={8}>
            <Box mt={8}>
              <Grid container>
                <Grid item md={5}>
                  <Box textAlign="center" border={1}>
                    <Typography variant="h5" gutterBottom>
                      Add leftStudents
                    </Typography>
                    {studentListLeft.map(({ id, name }, index) => {
                      return (
                        <MenuItem
                          key={index}
                          value={name}
                          onClick={() => this.selectfunctionLeft(index, id)}
                        >
                          <Checkbox checked={leftStudent.indexOf(id) > -1} />

                          <Box ml={2}>
                            <ListItemText primary={name} />
                          </Box>
                        </MenuItem>
                      );
                    })}

                    {studentListLeft.length === 0 && (
                      <FormLabel>No leftStudents left</FormLabel>
                    )}
                  </Box>
                </Grid>
                <Grid item md={2}>
                  <Box textAlign="center">
                    <Button
                      variant="outlined"
                      size="medium"
                      color="primary"
                      onClick={this.addleftStudents}
                    >
                      Add leftStudents
                    </Button>
                    <Button
                      variant="outlined"
                      size="medium"
                      color="primary"
                      onClick={this.addRightStudents}
                    >
                      Add rightStudents
                    </Button>
                  </Box>
                </Grid>
                <Grid item md={5}>
                  <Box textAlign="center">
                    <Box textAlign="center" border={1}>
                      <Typography variant="h5" gutterBottom>
                        Selected leftStudents
                      </Typography>
                      {studentListRight.map(({ id, name }, index) => {
                        return (
                          <MenuItem
                            key={index}
                            value={name}
                            onClick={() => this.selectfunctionRight(index, id)}
                          >
                            <Checkbox checked={rightStudent.indexOf(id) > -1} />

                            <Box ml={2}>
                              <ListItemText primary={name} />
                            </Box>
                          </MenuItem>
                        );
                      })}

                      {studentListLeft.length === 0 && (
                        <FormLabel>No leftStudents left</FormLabel>
                      )}
                    </Box>
                  </Box>
                </Grid>

                <Button
                  onClick={this.postData}
                  variant="outlined"
                  size="medium"
                  color="primary"
                >
                  Save Data
                </Button>
              </Grid>
            </Box>
          </Box>
        </Paper>
      </>
    );
  }
}

export default TransferList;
