import React, { Component } from "react";
import {
  Paper,
  Box,
  Grid,
  Button,
  DialogContent,
  AppBar,
  Toolbar,
  Slide,
  IconButton,
  TableContainer,
  Table,
  TableHead,
  FormControlLabel,
  Switch,
  TableCell,
  TableRow,
  TableBody,
  DialogContentText,
  Tooltip,
  Dialog,
  Typography,
  DialogActions,
  CircularProgress,
} from "@material-ui/core";
import CloseIcon from "@material-ui/icons/Close";
import { withRouter } from "react-router-dom";
import { floatNumberWithTwoDecimalRegex } from "Constants/regularExpression";
import { cloneDeep } from "lodash";
import ExpandMoreIcon from "@material-ui/icons/ExpandMore";
import { dateFormat, Alert } from "Includes/functions";
import DeleteIcon from "@material-ui/icons/Delete";
import Snackbar from "@material-ui/core/Snackbar";
import { alphabet } from "Constants";
import DragIndicatorIcon from "@material-ui/icons/DragIndicator";

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});
// const alias_names = JSON.parse(localStorage.getItem('alias_name'))

class ScheduleMergeSubjects extends Component {
  constructor() {
    super();
    this.state = {
      openPopup: false,
      data_list: [],
      updateDisable: false,
      openSnackbar: false,
      alertData: "",
      isDragging: false,
      selectedIndices: [],
    };
  }

  componentDidMount = () => {
    const { standard_list } = this.props;
    let last_id = "";
    let selected_ids = [];
    let selected_sub_ids = {};
    let updated_standard_list = [];
    let standard_temp = {};
    let subject_list = {};
    let sel_standard_list = [];
    standard_list.map((data) => {
      last_id = "";
      selected_sub_ids[data.section_name] = [];
      standard_temp = {};
      subject_list = [];
      data["selected_subject_list"] = [];
      data["selected_subjects"] = [];
      data.subject_list.map((sub_data) => {
        sub_data.for_date = sub_data.fordate
          ? dateFormat(sub_data.fordate, "DD-MM-YYYY")
          : null;
        if (
          !sub_data.deleted &&
          (sub_data.next_subject_linking_id ||
            sub_data?.next_linking_id ||
            last_id == sub_data.id)
        ) {
          last_id =
            sub_data?.next_subject_linking_id ??
            sub_data?.next_linking_id ??
            "";
          sub_data["checkedMergeSubject"] = true;
          if (
            sub_data?.next_subject_linking_id &&
            !selected_ids.includes(sub_data.id)
          ) {
            selected_sub_ids[data.section_name].push(
              sub_data?.next_subject_linking_id
            );
          }
        }
        if (sub_data?.next_linking_id && !selected_ids.includes(sub_data.id)) {
          sel_standard_list.push(sub_data?.id);
          selected_ids.push(sub_data?.next_linking_id);
          subject_list.push(sub_data);
        }
      });
      standard_temp["id"] = data.id;
      standard_temp["section_name"] = data.section_name;
      standard_temp["standard"] = data.standard;
      standard_temp["standard_name"] = data.standard_name;
      standard_temp["grade_plan_data"] = data.grade_plan_data;
      standard_temp["subject_list"] = cloneDeep(subject_list);
      standard_temp["selected_subject_list"] = [];
      standard_temp["selected_subjects"] = [];
      updated_standard_list.push(standard_temp);
    });
    updated_standard_list.map((stdData) => {
      standard_list.map((data) => {
        if (stdData.id === data.id) {
          data.subject_list.map((sub_data) => {
            if (selected_ids.includes(sub_data?.id)) {
              sub_data["checkedMergeSubject"] = true;
              stdData.subject_list.push(sub_data);
            } else if (
              selected_sub_ids[data.section_name].includes(sub_data.subject)
            ) {
              sub_data["checkedMergeSubject"] = true;
              stdData.subject_list.push(sub_data);
            } else if (!sel_standard_list.includes(sub_data?.id) && sub_data) {
              stdData.subject_list.push(sub_data);
            }
          });
        }
      });
    });
    this.setState(
      {
        data_list: cloneDeep(updated_standard_list),
      },
      () => {
        updated_standard_list.map((data, stdIndex) => {
          this.handleMergeSubjects(stdIndex);
        });
        this.setState({
          openPopup: true,
        });
      }
    );
  };

  handleClosePopup = () => {
    this.setState(
      {
        openPopup: false,
        data_list: [],
      },
      () => {
        this.props.handleCloseDialog();
      }
    );
  };

  handleApply = () => {
    let { data_list, alertData } = this.state;
    let merge_subjects = true;
    let new_data_list = cloneDeep(data_list);
    new_data_list.map((data) => {
      data.subject_list.map((subSel) => {
        delete subSel.checkedMergeSubject;
        delete subSel.next_linking_id;
        delete subSel.next_subject_linking_id;
      });
      Object.keys(data["selected_subject_list"]).map((sub) => {
        if (data["selected_subject_list"][sub].length < 2) {
          merge_subjects = false;
          alertData = `Select 2 subjects atleast for same date with ${data["selected_subject_list"][sub][0]["subject_name"]} in ${data.standard_name} - ${data.section_name}`;
        } else {
          // data.subject_list.map((subSel) => {
          //     delete subSel.next_linking_id
          //     delete subSel.next_subject_linking_id
          // })
          data["selected_subject_list"][sub].map((sub_data, sIndex) => {
            if (data["selected_subject_list"][sub].length !== sIndex + 1) {
              sub_data["next_subject_linking_id"] =
                data["selected_subject_list"][sub][sIndex + 1]["subject"];
              if (data["selected_subject_list"][sub][sIndex + 1]["id"]) {
                sub_data["next_linking_id"] =
                  data["selected_subject_list"][sub][sIndex + 1]["id"];
              }
              sub_data.checkedMergeSubject = true;
            }
          });
        }
      });
    });
    new_data_list.map((std) => {
      Object.keys(std["selected_subject_list"]).map((selected) => {
        std["selected_subject_list"][selected].map((selSub) => {
          std.subject_list.map((data) => {
            // if (!data.next_subject_linking_id) {
            //     data['next_linking_id'] = null
            //     data['next_subject_linking_id'] = null
            // }
            if (
              data.subject === selSub.subject &&
              selSub.next_subject_linking_id
            ) {
              data["next_linking_id"] = selSub.next_linking_id;
              data["next_subject_linking_id"] = selSub.next_subject_linking_id;
              data.checkedMergeSubject = true;
            }
          });
        });
      });
      // delete std['selected_subject_list']
      // delete std['selected_subjects']
    });
    if (merge_subjects) {
      this.props.updateMergeSubjects(new_data_list);
    } else {
      this.setState({
        openSnackbar: true,
        alertData,
      });
    }
  };

  handleChangeSelected = (stdIndex, subIndex) => {
    let { data_list } = this.state;
    data_list[stdIndex]["subject_list"][subIndex]["checkedMergeSubject"] =
      !data_list[stdIndex]["subject_list"][subIndex]["checkedMergeSubject"];
    data_list[stdIndex]["selected_subjects"] = [];
    data_list[stdIndex]["subject_list"].map((data) => {
      if (data["checkedMergeSubject"]) {
        data_list[stdIndex]["selected_subjects"].push(data);
      }
    });
    this.setState({
      data_list,
    });
  };

  handleMergeSubjects = (stdIndex) => {
    let { data_list } = this.state;
    let selected_subject_list = {};
    data_list[stdIndex]["selected_subjects"] = [];
    data_list[stdIndex].selected_subject_list = {};
    data_list[stdIndex].subject_list.map((sub) => {
      delete sub.refId;
      delete sub.refBaseId;
      delete sub.next_subject_linking_id;
      if (sub.checkedMergeSubject) {
        data_list[stdIndex]["selected_subjects"].push(sub);
        if (!selected_subject_list[sub.for_date]) {
          selected_subject_list[sub.for_date] = [];
        }
        sub.refId = this.getRefId(selected_subject_list, sub.for_date);
        sub.refBaseId = this.getRefId(
          selected_subject_list,
          sub.for_date,
          true
        );
        delete sub.deleted;
        selected_subject_list[sub.for_date].push(sub);
      }
    });
    data_list[stdIndex].selected_subject_list = { ...selected_subject_list };
    this.setState({
      data_list,
    });
  };

  getRefId = (selected_subject_list, for_date, isBase) => {
    let return_data = "";
    if (!for_date) {
      for_date = "null";
    }
    Object.keys(selected_subject_list).map((data, index) => {
      if (!data) {
        data = "null";
      }
      if (isBase && data === for_date) {
        return_data = index + 1;
      } else if (data === for_date) {
        return_data = `${index + 1}${
          alphabet[selected_subject_list[data].length]
        }`;
      }
    });
    return return_data;
  };

  handleDelete = (stdIndex, selected, subIndex, subjectData) => {
    let { data_list } = this.state;
    let temp_list = cloneDeep(data_list);
    temp_list[stdIndex].selected_subject_list[selected].splice(subIndex, 1);
    if (temp_list[stdIndex].selected_subject_list[selected].length === 0) {
      delete temp_list[stdIndex].selected_subject_list[selected];
    }
    temp_list[stdIndex].subject_list.map((data) => {
      if (data.next_subject_linking_id === subjectData.subject) {
        data.next_linking_id = null;
        data.next_subject_linking_id = null;
        data.deleted = true;
      }
      if (data.subject === subjectData.subject) {
        delete data.refBaseId;
        delete data.refId;
        data.checkedMergeSubject = false;
        data.deleted = true;
      }
    });
    this.setState({
      data_list: cloneDeep(temp_list),
    });
  };

  handleCloseSnackBar = () => {
    this.setState({
      openSnackbar: false,
    });
  };

  handleDragStart = (event, index) => {
    let fromBox = JSON.stringify({ index: index });
    event.dataTransfer.setData("dragContent", fromBox);
    this.setState({ isDragging: true });
  };

  handleDragOver = (event) => {
    event.preventDefault(); // Necessary. Allows us to drop.
    return false;
  };

  handleDrop = (event, index, stdIndex) => {
    event.preventDefault();
    let fromBox = JSON.parse(event.dataTransfer.getData("dragContent"));
    this.swapBColumns(fromBox.index, index, stdIndex);
    return false;
  };

  onselectSectionB = (index) => {
    let { isMobileScreen, selectedIndices } = this.state;
    if (isMobileScreen && selectedIndices.includes(index)) {
      const ind = selectedIndices.indexOf(index);
      selectedIndices.splice(ind, 1);

      this.setState({ selectedIndices });
    } else if (isMobileScreen && selectedIndices.length < 2) {
      selectedIndices.push(index);
      this.setState({ selectedIndices });
    } else if (isMobileScreen && selectedIndices.length === 2) {
      selectedIndices[1] = index;
      this.setState({ selectedIndices });
    }
  };

  swapBColumns = (from_index, to_index, stdIndex) => {
    let { data_list } = this.state;
    let temp_list = [...data_list];
    let temp = temp_list[stdIndex]["subject_list"][from_index];
    temp_list[stdIndex]["subject_list"][from_index] =
      temp_list[stdIndex]["subject_list"][to_index];
    temp_list[stdIndex]["subject_list"][to_index] = temp;
    // let swap_id = temp_list[stdIndex]['selected_subject_list'][selected][from_index]['id']
    // delete temp_list[stdIndex]['selected_subject_list'][selected][from_index].next_subject_linking_id
    // temp_list[stdIndex]['selected_subject_list'][selected][to_index].next_subject_linking_id = swap_id

    // [data_list[stdIndex]['selected_subject_list'][selected][to_index], data_list[stdIndex]['selected_subject_list'][selected][from_index]['refId']] = [data_list[stdIndex]['selected_subject_list'][selected][from_index], data_list[stdIndex]['selected_subject_list'][selected][to_index]];
    this.setState({
      data_list: [...temp_list],
    });
  };

  render() {
    const { openPopup, data_list, updateDisable, openSnackbar, alertData } =
      this.state;
    return (
      <Dialog
        fullScreen
        open={openPopup}
        onClose={this.handleClosePopup}
        TransitionComponent={Transition}
      >
        <AppBar>
          <Toolbar>
            <IconButton
              edge="start"
              color="inherit"
              onClick={this.handleClosePopup}
              aria-label="close"
            >
              <CloseIcon />
            </IconButton>
            <Typography variant="h6">
              Merge the subjects for same date
            </Typography>
          </Toolbar>
        </AppBar>
        <DialogContent className="mt-30">
          <div className="text-red mt-30">
            Note : Only the subjects which has same date can merge and showcase
            in hallticket
          </div>
          {data_list.map((standard, stdIndex) => {
            return (
              <div className="mt-20" key={stdIndex}>
                <Box className="sub-heading">
                  {`${standard.standard_name} - ${standard.section_name}`}
                </Box>
                <Grid container spacing={2}>
                  <Grid item md={6} xs={4}>
                    <TableContainer className="table-cont-merge-subject mt-20">
                      <Table
                        size="small"
                        aria-label="simple table"
                        className=""
                      >
                        <TableHead>
                          <TableRow className="">
                            <TableCell className=""> Drag and Drop</TableCell>
                            <TableCell className=""> Select</TableCell>
                            <TableCell className=""> Subject Name </TableCell>
                            <TableCell className=""> For Date </TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {standard.subject_list.map((subject, subIndex) => {
                            return (
                              <TableRow key={subIndex}>
                                <TableCell className="">
                                  <span
                                    className="merge-subject-drag-icon cursor-grabbing"
                                    draggable="true"
                                    onDragStart={(e) =>
                                      this.handleDragStart(e, subIndex)
                                    }
                                    onDragOver={(e) =>
                                      this.handleDragOver(e, subIndex)
                                    }
                                    onDrop={(e) =>
                                      this.handleDrop(e, subIndex, stdIndex)
                                    }
                                    onClick={() =>
                                      this.onselectSectionB(subIndex)
                                    }
                                  >
                                    <span>
                                      <DragIndicatorIcon />
                                    </span>
                                  </span>
                                </TableCell>
                                <TableCell className="">
                                  <input
                                    type="checkbox"
                                    className="pointer checkbox-style"
                                    onChange={() =>
                                      this.handleChangeSelected(
                                        stdIndex,
                                        subIndex
                                      )
                                    }
                                    name={"checkedMergeSubject"}
                                    value={
                                      subject?.checkedMergeSubject ?? false
                                    }
                                    checked={
                                      subject?.checkedMergeSubject ?? false
                                    }
                                  ></input>
                                </TableCell>
                                <TableCell className="">
                                  {" "}
                                  {subject.subject_name}{" "}
                                </TableCell>
                                <TableCell className="">
                                  {" "}
                                  {subject.for_date}{" "}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Grid>
                  <Grid item md={2} xs={2}>
                    <div className="text-align-center mt-20">
                      <Tooltip
                        title={"Select two or more subjects to merge"}
                        enterDelay={400}
                        enterNextDelay={400}
                        placement="top-start"
                        classes={{ tooltip: "tooltip-show-data" }}
                      >
                        <Button
                          className={
                            standard.selected_subjects.length > 1
                              ? "custom-button"
                              : "custom-button disabled-button"
                          }
                          onClick={
                            standard.selected_subjects.length > 1
                              ? () => this.handleMergeSubjects(stdIndex)
                              : ""
                          }
                        >
                          Merge Subjects
                        </Button>
                      </Tooltip>
                    </div>
                  </Grid>

                  <Grid item md={4} xs={4}>
                    {Object.keys(standard.selected_subject_list).map(
                      (selected) => {
                        return (
                          <TableContainer className="table-cont-merge-subject mt-20">
                            <Table
                              size="small"
                              aria-label="simple table"
                              className=""
                            >
                              <TableHead>
                                <TableRow className="">
                                  <TableCell className=""> Ref id</TableCell>
                                  <TableCell className="">
                                    Subject Name
                                  </TableCell>
                                  <TableCell className=""> For Date </TableCell>
                                  <TableCell className=""> Delete </TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {standard.selected_subject_list[selected].map(
                                  (subject, subIndex) => {
                                    return (
                                      <TableRow key={subIndex}>
                                        <TableCell className="">
                                          {subject.refId}
                                        </TableCell>
                                        <TableCell className="">
                                          {subject.subject_name}
                                        </TableCell>
                                        <TableCell className="">
                                          {subject.for_date}
                                        </TableCell>
                                        <TableCell className="">
                                          <DeleteIcon
                                            className="text-red pointer"
                                            onClick={() =>
                                              this.handleDelete(
                                                stdIndex,
                                                selected,
                                                subIndex,
                                                subject
                                              )
                                            }
                                          />
                                        </TableCell>
                                      </TableRow>
                                    );
                                  }
                                )}
                              </TableBody>
                            </Table>
                          </TableContainer>
                        );
                      }
                    )}
                  </Grid>
                </Grid>
              </div>
            );
          })}
        </DialogContent>
        <DialogActions>
          <Button
            disabled={updateDisable}
            className={"submit"}
            onClick={this.handleApply}
            color="primary"
          >
            Submit
          </Button>
        </DialogActions>
        <Snackbar
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          open={openSnackbar}
          autoHideDuration={2000}
          onClose={(e) => this.handleCloseSnackBar(e)}
        >
          <Alert
            onClose={(e) => this.handleCloseSnackBar(e)}
            severity={"error"}
          >
            {alertData}
          </Alert>
        </Snackbar>
      </Dialog>
    );
  }
}

export default withRouter(ScheduleMergeSubjects);
