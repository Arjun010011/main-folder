import React, { Component } from "react";
import {
  Paper,
  Box,
  Grid,
  Checkbox,
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
import { GET_URL, POST_URL } from "Includes/urls";
import { DropDownWithSearchAndAddApi } from "Components/DropDownWithSearchAndAddApi";
import DeleteOutlineIcon from "@material-ui/icons/DeleteOutline";
import { getRequest } from "Includes/api/apicall";

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});
// const alias_names = JSON.parse(localStorage.getItem('alias_name'))

class FinalResultConfigMergeTests extends Component {
  constructor() {
    super();
    this.state = {
      openPopup: false,
      updateDisable: false,
      openSnackbar: false,
      alertData: "",
      mergeNameList: [],
      selectedMergeName: "",
      examsList: [],
      fieldError: {},
      data_list: [],
      isAllChecked: false,
      selectedExamSet: [],
      fieldDetails: [
        {
          label: "Merge Name",
          regex: null,
          autoFocus: true,
          name: "name",
          md: 12,
          className: "w-100",
          required: true,
          id: "outlined-textarea",
          default: "",
          rows: null,
          type: "text",
          maxLength: 50,
          gridClassName: "margin-vertical-20",
        },
      ],
    };
  }

  handleClosePopup = () => {
    this.setState({
      openPopup: false,
      data_list: [],
    });
  };

  handleCloseSnackBar = () => {
    this.setState({
      openSnackbar: false,
    });
  };

  handleOpen = () => {
    let tempList = this.props?.examList ?? [];
    tempList.map((data) => {
      data.is_checked = false;
    });
    const url = GET_URL.resultconfigurationmergename.api;
    const param = {};
    getRequest(url, param, this.prop).then((response) => {
      if (response && response.status === 200) {
        this.setState({
          mergeNameList: response.data.data,
        });
      }
      this.setState({
        openPopup: true,
        examsList: tempList,
      });
    });
  };

  handleDropDown = (e, newValue) => {
    if (newValue) {
      this.setState({
        selectedMergeName: newValue,
      });
    }
  };

  updateType = (field) => {
    // setReasonLoading(() => true);
    // let temp_list = [...reasonList];
    // temp_list.push(field);
    // setReasonList(() => temp_list);
    // setReasonLoading(() => false);
    return true;
  };

  updatePostFormat = (newData) => {
    // newData.name = newData.name;
    // newData.reason_type = reasonType["adjustment"];
    let payload = [
      {
        name: newData.name,
      },
    ];
    return payload;
  };

  handleAllChecked = () => {
    let { examsList } = this.state;
    let examTempList = cloneDeep(examsList);
    examTempList.map((data) => {
      data.is_checked = !this.state.isAllChecked;
    });
    this.setState({
      examsList: cloneDeep(examTempList),
      isAllChecked: !this.state.isAllChecked,
    });
  };

  handleCheckTest = (index) => {
    let examTempList = [...this.state.examsList];
    examTempList[index]["is_checked"] = !examTempList[index]["is_checked"];
    let selectAll = true;
    examTempList.map((data) => {
      if (!data.is_checked) {
        selectAll = false;
      }
    });
    this.setState({
      examsList: [...examTempList],
      isAllChecked: selectAll,
    });
  };

  handleCreateMergeTest = () => {
    const { examsList, selectedMergeName } = this.state;
    let tempExamList = [...examsList];
    if (!selectedMergeName) {
      this.setState({
        openSnackbar: true,
        alertData: "Enter merge name",
      });
      return;
    }
    let selectedExam = [];
    examsList.forEach((data) => {
      if (data.is_checked) {
        selectedExam.push(data);
      }
    });
    if (selectedExam.length === 0) {
      this.setState({
        openSnackbar: true,
        alertData: "Select atleast one test",
      });
      return;
    }
    let temp_list = [...this.state.selectedExamSet];
    let temp = {
      mergeName: selectedMergeName.name,
      mergeId: selectedMergeName.id,
      examList: selectedExam,
    };
    temp_list.push(temp);
    tempExamList.map((data) => {
      data.is_checked = false;
    });
    this.setState({
      selectedExamSet: [...temp_list],
      examsList: [...tempExamList],
      isAllChecked: false,
      selectedMergeName: [],
    });
  };

  handleDeleteSet = (index) => {
    let temp_list = [...this.state.selectedExamSet];
    temp_list.splice(index, 1);
    this.setState({
      selectedExamSet: [...temp_list],
    });
  };

  handleApply = () => {
    let { selectedExamSet } = this.state;
    if (selectedExamSet.length === 0) {
      this.setState({
        openSnackbar: true,
        alertData: "Select atleast one test",
      });
      return;
    }
    this.props.updateMergeExamSet(selectedExamSet);
    this.setState({
      openPopup: false,
    });
  };

  render() {
    const {
      openPopup,
      mergeNameList,
      updateDisable,
      openSnackbar,
      alertData,
      selectedMergeName,
      fieldError,
      fieldDetails,
      examsList,
      isAllChecked,
      selectedExamSet,
    } = this.state;
    return (
      <div>
        <Button className="custom-button" onClick={this.handleOpen}>
          Merge Test(s)
        </Button>
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
                Merge the tests for marks card
              </Typography>
            </Toolbar>
          </AppBar>
          <DialogContent className="mt-30">
            {/* <div className="text-red mt-30">
              Note : Only the tests which has same term can merge and
              showcase in markscard
            </div> */}
            <Grid container>
              <Grid item md={6}>
                <div className="width-350px mt-20">
                  <DropDownWithSearchAndAddApi
                    options={mergeNameList}
                    value={selectedMergeName}
                    onChange={(e, newValue) => this.handleDropDown(e, newValue)}
                    name="reason"
                    label="Merge Name *"
                    optionValue="name"
                    className="width-100"
                    size="small"
                    helperText={
                      fieldError.selectedMergeName &&
                      fieldError.selectedMergeName
                    }
                    error={
                      fieldError.selectedMergeName &&
                      fieldError.selectedMergeName
                    }
                    fieldDetails={fieldDetails}
                    postUrl={POST_URL.resultconfigurationmergename.api}
                    updatePostFormat={this.updatePostFormat}
                    updateType={this.updateType}
                    hideClearIcon
                  />
                </div>
                <div className="mt-20">
                  <div className="d-flex align-items-center">
                    <div>
                      <Checkbox
                        onChange={() => this.handleAllChecked()}
                        // value={isAllChecked}
                        checked={isAllChecked}
                        color="primary"
                        size="small"
                      />
                    </div>
                    <div className="text-bold">Select All</div>;
                  </div>
                  {examsList.map((exam, index) => {
                    return (
                      <div className="d-flex align-items-center">
                        <div>
                          <Checkbox
                            onChange={(e) => this.handleCheckTest(index)}
                            value={exam.is_checked}
                            checked={exam.is_checked}
                            color="primary"
                            size="small"
                          />
                        </div>
                        <div>{exam.exam_type__name}</div>;
                      </div>
                    );
                  })}
                </div>
                <div>
                  <Button
                    className="custom-button"
                    onClick={this.handleCreateMergeTest}
                  >
                    Merge Selected Tests
                  </Button>
                </div>
              </Grid>
              <Grid item md={3}>
                <div className="mt-20 fs-18 text-bold">Merge Set List</div>
                {selectedExamSet.map((data, setIndex) => {
                  return (
                    <TableContainer className="table-cont-merge-subject mt-20">
                      <Table size="small" aria-label="simple table">
                        <TableHead>
                          <TableRow>
                            <TableCell>
                              <div className="d-flex justify-content-space-between">
                                <div className="text-bold">
                                  Merge Name - {data.mergeName}
                                </div>
                                <div
                                  className="pointer"
                                  onClick={() => this.handleDeleteSet(setIndex)}
                                >
                                  <DeleteOutlineIcon className="text-red" />
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          <TableRow>
                            <TableCell className="text-bold">
                              Tests List
                            </TableCell>
                          </TableRow>
                          {data?.examList &&
                            data?.examList.map((exam, testIndex) => {
                              return (
                                <TableRow key={testIndex}>
                                  <TableCell className="">
                                    {`${testIndex + 1}) ${
                                      exam.exam_type__name
                                    }`}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  );
                })}
              </Grid>
            </Grid>
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
      </div>
    );
  }
}

export default withRouter(FinalResultConfigMergeTests);
