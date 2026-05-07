// CreateQuestionFeedBackForm.jsx
import React, { Component } from "react";
import { withRouter } from "react-router-dom";
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Button,
  Box,
  Tooltip,
  Grid,
  Dialog,
  DialogContent,
  AppBar,
  Toolbar,
  IconButton,
  FormControlLabel,
  Checkbox,
  Snackbar,
} from "@material-ui/core";

import ExpandMoreIcon from "@material-ui/icons/ExpandMore";
import DeleteOutlineIcon from "@material-ui/icons/DeleteOutline";
import CloseIcon from "@material-ui/icons/Close";
import DragIndicatorIcon from "@material-ui/icons/DragIndicator";

import { getRequest } from "Includes/api/apicall";
import { GET_URL } from "Includes/urls";
import ReviewFeedBackFormPage from "./ReviewFeedBackFormPage";
import TabSetQuestionsFeedBackForm from "./TabSetQuestionsFeedBackForm";
import "../styles.scss";
import LoadingGif from "Components/LoadingGif";

import { withStyles } from "@material-ui/core/styles";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import ReviewSummaryCreateFeedBackForm from "Containers/FeedBackForm/components/ReviewSummaryCreateFeedBackForm";
import AfterFinalizedView from "./AfterFinalizedViewFeedBackForm";
import Alert from "@material-ui/lab/Alert";
import NoticeBoardFeedBackForm from "Containers/FeedBackForm/components/NoticeBoardFeedBackForm";

const grid = 12;

const reorder = (list, startIndex, endIndex) => {
  const result = Array.from(list);
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);
  return result;
};

const styles = (theme) => ({
  backdrop: {
    zIndex: theme.zIndex.drawer + 1,
    color: "#fff",
  },
});

const getItemStyle = (isDragging, draggableStyle) => ({
  userSelect: "none",
  padding: `15px`,
  margin: `0 0 ${grid}px 0`,
  boxShadow: `rgba(149, 157, 165, 0.2) 0px 8px 24px`,
  background: isDragging ? "#E1F0FF" : "white",
  ...draggableStyle,
});

const getListStyle = (isDraggingOver) => ({
  background: isDraggingOver ? "lightblue" : "#F0F5FE",
  padding: grid,
});

class CreateQuestionFeedBackForm extends Component {
  constructor(props) {
    super(props);
    this.state = {
      questionList: [{ question_details: { options: [] } }],
      expanded: "panel+-1",
      openReviewPage: false,
      loading: true,
      loadingReviewDetails: false,
      review_details: {},
      is_total_time: false,
      is_finalized: false,
      subject: "",
      section_list: [],
      subject_list: [],
      department_list:[],
      student_list:[],
      response_staff_list:[],
      isDraggable: true,
      isReceiversModalOpen: false,
      openSnackBar: false,
      alertData: "",
      selected_type: "department",
      selected_details: { updated_list: [], selected_student_ids: [] },
      isEditReceiver: false,
      // selectedQuestions is an ARRAY of selected indices (consistent shape)
      selectedQuestions: [],
    };
    this.onDragEnd = this.onDragEnd.bind(this);
    this.review = React.createRef();
    this.ReviewFeedBackFormPage = React.createRef();
    this.bulkRef = null;
  }

  componentDidMount = () => {
    const { quizDetails, isEdit } = this.props;
    let { selected_type, selected_details, questionList} = this.state;
    this.setState(
      {
        quizDetails,
        is_finalized:
          quizDetails?.access &&
          (quizDetails.is_finalized || !quizDetails.access.update),
        isEdit,
      },
      () => {
        if (this.state.is_finalized) {
          this.setState({ loading: false });
        } else {
          this.getRequestAll();
        }
      }
    );
    console.log(isEdit,'edit')
    if(isEdit){
        console.log('Hiiiiiii')
        console.log(quizDetails, 'details')
        if (quizDetails?.question_form?.length > 0) {
          questionList = quizDetails.question_form.map(item => ({
            ...item,
            questionName: item.question,  // 👈 renamed
          }));
        }
        if (quizDetails?.branch_ids?.length > 0) {
          selected_type = 'department';
          selected_details.updated_list = [
            ...selected_details.updated_list,
            ...quizDetails.branch_ids.map(item => ({
              ...item,
              id: item.branch  // 👈 add branch = id
            }))
          ];
        }
      
        if (quizDetails?.standard_section_ids?.length > 0) {
          selected_type = 'section';
          selected_details.updated_list = [
            ...selected_details.updated_list,
            ...quizDetails.standard_section_ids.map(item => ({
              ...item,
              section: item.id
            }))
          ];
        }
      
        if (quizDetails?.student_ids?.length > 0) {
          selected_type = 'student';
          selected_details.updated_list = [
            ...selected_details.updated_list,
            ...quizDetails.student_ids.map(item => ({
              ...item,
              student: item.id
            }))
          ];
        }
      
        if (quizDetails?.response_staff_ids?.length > 0) {
          selected_type = 'staff';
          selected_details.updated_list = [
            ...selected_details.updated_list,
            ...quizDetails.response_staff_ids.map(item => ({
              ...item,
              staff: item.id
            }))
          ];
        }
      }
      this.setState(
        {
          selected_type,
          selected_details,
          questionList
        });

        console.log(selected_type,'type')
        console.log(selected_details,'detailsss')

  };

  getRequestAll = async () => {
    const { year, current_standard } = this.props;
    const params = { academic_year: year, standard: current_standard };
    const subject_params = {
      academic_year: year,
      standard: current_standard,
      for_admission: 1,
    };

    try {
      const [secRes, stdRes] = await Promise.all([
        getRequest(GET_URL.getsection.api, params, this.props),
        getRequest(
          GET_URL.getstandardandsection.api,
          subject_params,
          this.props
        ),
      ]);

      this.updateSectionList(secRes);
      this.updateStandardSectiontList(stdRes);
      this.setState({ loading: false, loadingReviewDetails: false });
    } catch (e) {
      this.setState({ loading: false, loadingReviewDetails: false });
    }
  };

  updateSectionList = (response) => {
    if (response && response.status === 200) {
      response.data.data.forEach((d) => {
        d.label = d.name;
        d.value = d.id;
      });
      this.setState({ section_list: response.data.data });
    }
  };

  updateStandardSectiontList = (response) => {
    if (response && response.status === 200) {
      this.setState({ standardList: response.data.data });
    }
  };

  handleCreateQuestion = () => {
    let { questionList } = this.state;
    questionList.push({ question_details: { options: [] } });
    this.setState({
      questionList,
      expanded: `panel+${questionList.length - 1}`,
    });
  };

  handlePanelChange = (panel) => (event, isExpanded) => {
    this.setState({ expanded: isExpanded ? panel : false });
  };

  handleReviewAndSubmit = () => {
    let { questionList, expanded, review_details, isEdit, quizDetails } = this.state;
    let validate = true;
  
    // build new questionList safely
    const updatedQuestions = questionList.map((data, index) => {
      const details = this["question" + index]?.getDetails?.();
      if (!details) {
        validate = false;
        expanded = `panel+${index}`;
      }
      return {
        ...data,
        question_details: details,
      };
    });
  
    this.setState({ questionList: updatedQuestions, expanded });
  
    try {
      if (
        this.ReviewFeedBackFormPage &&
        this.ReviewFeedBackFormPage.current &&
        typeof this.ReviewFeedBackFormPage.current.getDetails === "function"
      ) {
        const detailsFromChild = this.ReviewFeedBackFormPage.current.getDetails();
  
        if (detailsFromChild) {
          review_details = { ...detailsFromChild }; // copy
  
          if (isEdit) {
            console.log("jiiiiiiiii");
            review_details = {
              ...review_details,
              feedback_form_title: quizDetails.feedback_form_title,
              start_date: quizDetails.start_date,
              end_date: quizDetails.end_date,
            };
          }
  
          this.setState({ review_details });
        }
      }
    } catch (err) {
      console.warn("Failed to get review details from summary component", err);
    }
  
    if (!validate) {
      this.setState({
        openSnackBar: true,
        alertData: "Please fix question errors before review.",
      });
      return;
    }
  
    console.log(review_details, "review");
  
    if (!review_details) {
      this.setState({
        openSnackBar: true,
        alertData:
          "Please fill feedback form configuration (title/sections/receivers/dates) before review.",
      });
      return;
    }
  
    this.setState({ openReviewPage: true, review_details });
  };

  onDragEnd(result) {
    let { questionList } = this.state;
    if (!result.destination) return;
    const questionListTemp1 = [...questionList];
    this.setState({ questionList: [] }, () => {
      const questionListTemp = reorder(
        questionListTemp1,
        result.source.index,
        result.destination.index
      );
      this.setState({ questionList: questionListTemp });
    });
  }

  deleteQuestion = (index) => {
    let { questionList, selectedQuestions } = this.state;
    const questionListTemp1 = [...questionList];
    questionListTemp1.splice(index, 1);

    // remove index from selectedQuestions and shift indices greater than index
    const newSelected = selectedQuestions
      .filter((i) => i !== index)
      .map((i) => (i > index ? i - 1 : i));

    this.setState({ questionList: questionListTemp1, selectedQuestions: newSelected });
  };

  updateQuestionName = (value, index) => {
    let { questionList } = this.state;
    questionList[index]["questionName"] = value;
    this.setState({ questionList });
  };

  handleOpenReceiversModal = () => {
    this.setState({ isReceiversModalOpen: true });
  };

  handleCloseReceiversModal = () => {
    this.setState({ isReceiversModalOpen: false });
  };

  extractIds = (sel) => {
    if (!sel) return [];
    if (Array.isArray(sel)) {
      if (sel.length === 0) return [];
      if (typeof sel[0] === "number" || typeof sel[0] === "string") {
        return sel.map((v) => {
          const n = Number(v);
          return Number.isNaN(n) ? v : n;
        });
      }
      return sel
        .map((o) => o?.id ?? o?._id ?? o?.value ?? o?.key)
        .filter((v) => v !== undefined && v !== null)
        .map((v) => {
          const n = Number(v);
          return Number.isNaN(n) ? v : n;
        });
    }
    if (typeof sel === "object") {
      if (Array.isArray(sel.updated_list)) {
        return sel.updated_list
          .map((o) => o?.id ?? o?._id ?? o?.value ?? o?.key)
          .filter((v) => v !== undefined && v !== null)
          .map((v) => {
            const n = Number(v);
            return Number.isNaN(n) ? v : n;
          });
      }
      if (Array.isArray(sel.selected_student_ids)) {
        return sel.selected_student_ids.map((v) => {
          const n = Number(v);
          return Number.isNaN(n) ? v : n;
        });
      }
      if (Array.isArray(sel.selected_staff_ids)) {
        return sel.selected_staff_ids.map((v) => {
          const n = Number(v);
          return Number.isNaN(n) ? v : n;
        });
      }
      if (Array.isArray(sel.section_ids)) {
        return sel.section_ids.map((v) => {
          const n = Number(v);
          return Number.isNaN(n) ? v : n;
        });
      }
      if (sel.id || sel._id) {
        const val = sel.id ?? sel._id;
        const n = Number(val);
        return Number.isNaN(n) ? [val] : [n];
      }
    }
    return [];
  };

  handleUpdateNoticeBoard = (selected_details, selected_type) => {
    let {department_list,student_list,section_list,response_staff_list} = this.state;
    const ids = this.extractIds(selected_details);
    if (selected_type === "department") {
      console.log(department_list,'department_listttt')
      department_list = ids;
      section_list = [];
      student_list = [];
      console.log(department_list,'department_listttt')
    } else if (selected_type === "section") {
      section_list = ids;
      department_list =[];
      student_list = [];
    } else if (selected_type === "student") {
      if (selected_details && Array.isArray(selected_details.selected_student_ids)) {
        student_list = this.extractIds(selected_details.selected_student_ids);
      } else {
        student_list = ids;
        department_list = [];
        section_list = [];
      }
    } else if (selected_type === "staff") {
      if (selected_details && Array.isArray(selected_details.selected_staff_ids)) {
        response_staff_list = this.extractIds(selected_details.selected_staff_ids);
      } else {
        response_staff_list = ids;
      }
    }
    this.setState({
      selected_details,
      selected_type,
      isReceiversModalOpen: false,
      isEditReceiver: selected_details["updated_list"].length > 0,
      department_list,
      section_list,
      student_list,
      response_staff_list
    });
  };

  toggleSelectQuestion = (index) => {
    this.setState((prev) => {
      const exists = prev.selectedQuestions.includes(index);
      if (exists) {
        return { selectedQuestions: prev.selectedQuestions.filter((i) => i !== index) };
      } else {
        return { selectedQuestions: [...prev.selectedQuestions, index] };
      }
    });
  };

  handleSelectAll = () => {
    this.setState((prev) => {
      const { questionList, selectedQuestions } = prev;
      if (selectedQuestions.length === questionList.length) {
        return { selectedQuestions: [] };
      } else {
        return { selectedQuestions: questionList.map((_, i) => i) };
      }
    });
  };

  applyBulkToSelected = () => {
    if (!this.bulkRef || typeof this.bulkRef.getDetails !== "function") {
      this.setState({ openSnackBar: true, alertData: "Bulk editor not ready" });
      return;
    }
  
    const bulkData = this.bulkRef.getDetails();
    if (!bulkData) {
      this.setState({ openSnackBar: true, alertData: "Please fill bulk settings (type/options)" });
      return;
    }
  
    const { selectedQuestions = [], questionList = [] } = this.state;
    if (!selectedQuestions || selectedQuestions.length === 0) {
      this.setState({ openSnackBar: true, alertData: "Select at least one question" });
      return;
    }
  
    selectedQuestions.forEach((idx) => {
      const ref = this["question" + idx];
      if (ref) {
        try {
          if (typeof ref.updateValuesBack === "function") {
            const patch = {};
            if (bulkData.questionType !== undefined) patch.questionType = bulkData.questionType;
            if (bulkData.options !== undefined) patch.options = bulkData.options;
            if (bulkData.selectedRadio !== undefined) patch.selectedRadio = bulkData.selectedRadio;
            if (bulkData.correctOptions !== undefined) patch.correctOptions = bulkData.correctOptions;
            if (bulkData.shuffledOptions !== undefined) patch.shuffledOptions = bulkData.shuffledOptions;
  
            ref.updateValuesBack(patch);
          }
          if (typeof ref.updateStateValues === "function") {
            ref.updateStateValues(bulkData);
          }
        } catch (err) {
          console.warn("applyBulkToSelected: child update failed for index", idx, err);
        }
      } else {
        console.warn("applyBulkToSelected: no child ref for index", idx);
      }
    });
    const updatedList = questionList.map((q, idx) => {
      const isSelected = Array.isArray(selectedQuestions)
        ? selectedQuestions.includes(idx)
        : !!selectedQuestions[idx];
  
      if (isSelected) {
        const prevQD = q.question_details || {};
        const newQD = {
          ...prevQD,
          ...(bulkData.questionType !== undefined ? { questionType: bulkData.questionType } : {}),
          ...(bulkData.options !== undefined ? { options: bulkData.options } : {}),
          ...(bulkData.selectedRadio !== undefined ? { selectedRadio: bulkData.selectedRadio } : {}),
          ...(bulkData.correctOptions !== undefined ? { correctOptions: bulkData.correctOptions } : {}),
          ...(bulkData.shuffledOptions !== undefined ? { shuffledOptions: bulkData.shuffledOptions } : {}),
        };
        return { ...q, question_details: newQD };
      }
      return q;
    });
  
    this.setState({ questionList: updatedList }, () => {
      this.setState({ openSnackBar: true, alertData: "Applied to selected questions" });
      setTimeout(() => this.setState({ openSnackBar: false, alertData: "" }), 1500);
    });
  };
  

  render() {
    const {
      questionList,
      expanded,
      openReviewPage,
      loading,
      section_list,
      department_list,
      student_list,
      response_staff_list,
      subject_list,
      loadingReviewDetails,
      review_details,
      is_total_time,
      is_finalized,
      subject,
      isReceiversModalOpen,
      openSnackBar,
      alertData,
      selectedQuestions,
    } = this.state;

    const { current_standard, year, end_date, isEdit, quizDetails, standard_name } =
      this.props;

    if (loading) return <LoadingGif />;

    return (
      <Box className="m-b-20px">
        {is_finalized ? (
          <AfterFinalizedView
            quizDetails={quizDetails}
            standard_name={standard_name}
          />
        ) : (
          <Box className="p-b-20px">
            <Box className="p-5px">
              <Accordion
                expanded={expanded === "panel+-1"}
                onChange={this.handlePanelChange(`panel+-1`)}
                className={expanded === "panel+-1" ? "padding-15" : ""}
              >
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon />}
                  aria-controls="panel1a-content"
                  id="panel1a-header"
                  className="accordin-summary padding-15px"
                >
                  <Box className="fs-18 form-left-heading">
                    {"Feed Back Form Configuration"}
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Grid>
                    <Grid>
                      <ReviewSummaryCreateFeedBackForm
                        section_list={section_list}
                        student_list={student_list}
                        department_list={department_list}
                        response_staff_list={response_staff_list}
                        subject_list={subject_list}
                        current_standard={current_standard}
                        year={year}
                        maxDate={end_date}
                        isEdit={isEdit}
                        feedbackFormDetails={quizDetails}
                        ref={this.ReviewFeedBackFormPage}
                        updateIsTotalTime={() => {}}
                      />
                    </Grid>
                  </Grid>
                </AccordionDetails>
              </Accordion>
            </Box>

            <Box>
              <Button
                variant="contained"
                color="primary"
                style={{ margin: "30px" }}
                onClick={this.handleOpenReceiversModal}
              >
                Select Receivers
              </Button>
            </Box>

            {/* Receivers Popup */}
            <Dialog
              open={isReceiversModalOpen}
              fullScreen
              onClose={this.handleCloseReceiversModal}
            >
              <AppBar>
                <Toolbar>
                  <IconButton
                    edge="start"
                    color="inherit"
                    onClick={this.handleCloseReceiversModal}
                  >
                    <CloseIcon />
                  </IconButton>
                  <Typography variant="h6">Select Receivers</Typography>
                </Toolbar>
              </AppBar>
              <DialogContent>
                <NoticeBoardFeedBackForm
                  updateParent={this.handleUpdateNoticeBoard}
                  isEdit={this.state.isEditReceiver || this.state.isEdit}
                  selected_type={this.state.selected_type}
                  selected_details={this.state.selected_details}
                  selected_year={year}
                  history={this.props.history}
                />
              </DialogContent>
            </Dialog>

            <Box className="fs-18 form-left-heading m-t-20px p-l-20px">
              {"Question List"}
            </Box>

            <Box mb={2} p={2} border={1} borderColor="grey.300" borderRadius={4}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={
                      selectedQuestions.length > 0 &&
                      selectedQuestions.length === questionList.length
                    }
                    indeterminate={
                      selectedQuestions.length > 0 &&
                      selectedQuestions.length < questionList.length
                    }
                    onChange={this.handleSelectAll}
                  />
                }
                label="Select All"
              />

              <Box mb={2} p={2} border="1px solid #ccc" borderRadius="8px">
                <Typography variant="h6">Bulk Apply</Typography>
                <TabSetQuestionsFeedBackForm
                  ref={(el) => (this.bulkRef = el)}
                  qindex={"bulk"}
                  isBulk={true}
                />
                <Button
                  variant="contained"
                  color="secondary"
                  onClick={this.applyBulkToSelected}
                  style={{ marginTop: "10px" }}
                >
                  Apply to Selected
                </Button>
              </Box>

              {questionList.length > 0 && (
                <DragDropContext onDragEnd={this.onDragEnd}>
                  <Droppable droppableId="droppable">
                    {(provided, snapshot) => (
                      <div
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        style={getListStyle(snapshot.isDraggingOver)}
                      >
                        {questionList.map((item, index) => (
                          <Draggable
                            key={"key_" + index}
                            draggableId={"item" + index}
                            index={index}
                            isDragDisabled={expanded === `panel+${index}`}
                          >
                            {(provided2, snapshot2) => (
                              <div
                                ref={provided2.innerRef}
                                {...provided2.draggableProps}
                                {...provided2.dragHandleProps}
                                style={getItemStyle(
                                  snapshot2.isDragging,
                                  provided2.draggableProps.style
                                )}
                              >
                                <Box key={index}>
                                  {questionList.length > 1 &&
                                    expanded !== `panel+${index}` && (
                                      <Box className="cursor-grabbing">
                                        <Button color="primary">
                                          <DragIndicatorIcon />
                                        </Button>
                                      </Box>
                                    )}
                                  <Accordion
                                    expanded={expanded === `panel+${index}`}
                                    onChange={this.handlePanelChange(
                                      `panel+${index}`
                                    )}
                                  >
                                    <AccordionSummary
                                      expandIcon={<ExpandMoreIcon />}
                                      aria-controls="panel1a-content"
                                      id="panel1a-header"
                                    >
                                      <Checkbox
                                        checked={selectedQuestions.includes(index)}
                                        onChange={() => this.toggleSelectQuestion(index)}
                                      />
                                      <Typography>
                                        {item.questionName ? item.questionName : "Untitled Question"}
                                      </Typography>
                                    </AccordionSummary>
                                    <AccordionDetails>
                                      <TabSetQuestionsFeedBackForm
                                        updateQuestionName={this.updateQuestionName}
                                        is_total_time={is_total_time}
                                        subject={subject}
                                        isEdit={isEdit}
                                        question_name={item.questionName}
                                        ref={(input) => {
                                          this["question" + index] = input;
                                        }}
                                        qindex={index}
                                      />
                                    </AccordionDetails>
                                  </Accordion>
                                  {(index !== 0 || questionList.length > 1) && (
                                    <Box>
                                      <Button
                                        color="secondary"
                                        onClick={() => this.deleteQuestion(index)}
                                      >
                                        <DeleteOutlineIcon />
                                      </Button>
                                    </Box>
                                  )}
                                </Box>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>
              )}
            </Box>

            <Tooltip title="Add another question" placement="top-start">
              <Box className="m-b-40px">
                <Button onClick={this.handleCreateQuestion}>
                  Add Another Question
                </Button>
              </Box>
            </Tooltip>

            <Box className="submt-button-float-bottom" mt={3}>
              <Button className="submit" onClick={this.handleReviewAndSubmit}>
                Review
              </Button>
            </Box>

            <ReviewFeedBackFormPage
              handleClose={() => this.setState({ openReviewPage: false })}
              openReviewPage={openReviewPage}
              loadingReviewDetails={loadingReviewDetails}
              questionList={questionList}
              subject_list={subject_list}
              current_standard={current_standard}
              section_list={section_list}
              student_list={student_list}
              department_list={department_list}
              response_staff_list={response_staff_list}
              year={year}
              maxDate={end_date}
              callGetPage={() => {}}
              ref={this.review}
              review_details={review_details}
              standard_name={standard_name}
            />

            <Snackbar
              anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
              open={openSnackBar}
              autoHideDuration={4000}
              onClose={() => this.setState({ openSnackBar: false })}
            >
              <Alert
                onClose={() => this.setState({ openSnackBar: false })}
                severity="error"
              >
                {alertData}
              </Alert>
            </Snackbar>
          </Box>
        )}
      </Box>
    );
  }
}

export default withRouter(withStyles(styles)(CreateQuestionFeedBackForm));
