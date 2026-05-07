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
  Paper,
} from "@material-ui/core";
import ExpandMoreIcon from "@material-ui/icons/ExpandMore";
import DeleteOutlineIcon from "@material-ui/icons/DeleteOutline";

import { Actions } from "Constants/permissions";
import { getRequest } from "Includes/api/apicall";
import { GET_URL } from "Includes/urls";
import ReviewQuizPage from "./ReviewQuizPage";
import TabSetQuestions from "Containers/VideoTutorials/Components/TabSetQuestions";
import "./../styles.scss";
import LoadingGif from "Components/LoadingGif";

import { makeStyles } from "@material-ui/core/styles";
import { withStyles } from "@material-ui/core/styles";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import DragIndicatorIcon from "@material-ui/icons/DragIndicator";
import ReviewSummaryCreateQuiz from "Containers/Quiz/components/ReviewSummaryCreateQuiz";
import AfterFinalizedView from "./AfterFinalizedView";

const grid = 12;

const useStyles = makeStyles({
  option: {
    fontSize: 15,
    "& > span": {
      marginRight: 10,
      fontSize: 18,
    },
  },
});

const lang_seq = {
  1: "First Lang",
  2: "Second Lang",
  3: "Third Lang",
};

const reorder = (list, startIndex, endIndex) => {
  const result = Array.from(list);
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);

  return result;
};

const getItems = (count) =>
  Array.from({ length: count }, (v, k) => k).map((k) => ({
    key: `item-${k}`,
    content: `item ${k}`,
  }));

const styles = (theme) => ({
  backdrop: {
    zIndex: theme.zIndex.drawer + 1,
    color: "#fff",
  },
});

const getItemStyle = (isDragging, draggableStyle) => ({
  // some basic styles to make the questionList look a bit nicer
  userSelect: "none",
  padding: `15px`,
  paddingBotton: `0px`,
  margin: `0 0 ${grid}px 0`,
  boxShadow: `rgba(149, 157, 165, 0.2) 0px 8px 24px`,
  // boxShadow: `0 1px 1px rgba(0,0,0,0.11),
  // 0 2px 2px rgba(0,0,0,0.11),
  // 0 4px 4px rgba(0,0,0,0.11),
  // 0 8px 8px rgba(0,0,0,0.11),
  // 0 16px 16px rgba(0,0,0,0.11),
  // 0 32px 32px rgba(0,0,0,0.11`,

  // change background colour if dragging
  background: isDragging ? "#E1F0FF" : "white",

  // styles we need to apply on draggables
  ...draggableStyle,
});

const getListStyle = (isDraggingOver) => ({
  background: isDraggingOver ? "lightblue" : "#F0F5FE",
  padding: grid,
});

class CreateQuestionQuiz extends Component {
  constructor(props) {
    super(props);
    this.state = {
      questionList: [{ question_details: { options: [] } }],
      expanded: "panel+-1",
      openReviewPage: false,
      loading: true,
      section_list: [],
      subject_list: [],
      isDraggable: true,
      loadingReviewDetails: false,
      review_details: {},
      is_total_time: false,
      is_finalized: false,
    };
    this.onDragEnd = this.onDragEnd.bind(this);
    this.review = React.createRef();
    this.ReviewQuizPage = React.createRef();
  }

  handleCreateQuestion = () => {
    let { questionList } = this.state;
    questionList.push({ question_details: { options: [] } });
    this.setState({
      questionList,
      expanded: `panel+${questionList.length - 1}`,
    });
  };

  handlePanelChange = (panel) => (event, isExpanded) => {
    let temp = isExpanded ? panel : false;
    this.setState({
      expanded: temp,
    });
  };

  componentDidMount = () => {
    const { quizDetails, isEdit } = this.props;
    this.setState(
      {
        quizDetails,
        is_finalized:
          quizDetails["access"] &&
          (quizDetails.is_finalized || !quizDetails.access["update"]),
        isEdit,
      },
      () => {
        if (
          quizDetails["access"] &&
          (quizDetails.is_finalized || !quizDetails.access["update"])
        ) {
          this.setState({
            loading: false,
          });
        } else {
          this.getRequestAll();
        }
      }
    );
  };

  updateDetails = () => {
    let { questionList } = this.state;
    let { quizDetails } = this.props;
    questionList = [];
    quizDetails.question_form.map((data, index) => {
      data["questionName"] = data.question;
      questionList.push(data);
    });
    this.setState(
      {
        loading: false,
        questionList,
        // expanded: false
      },
      () => {
        questionList.map((data, index) => {
          this["question" + index].updateEditDetails(data);
        });
        this.ReviewQuizPage.current.updateReviewDetails(quizDetails);
      }
    );
  };

  handleReviewAndSubmit = () => {
    let { questionList, expanded } = this.state;
    let validate = true;
    questionList.map((data, index) => {
      data["question_details"] = this["question" + index].getDetails();
      if (!data["question_details"]) {
        validate = false;
        expanded = `panel+${index}`;
      }
    });
    this.setState({
      questionList,
      expanded,
    });
    let review_details = this.ReviewQuizPage.current.getDetails();
    if (validate && review_details) {
      this.setState({
        openReviewPage: true,
        review_details,
      });
    }
  };

  getRequestAll = async () => {
    const { year, current_standard, isEdit, quizDetails } = this.props;
    const params = { academic_year: year, standard: current_standard };
    const subject_params = {
      academic_year: year,
      standard: current_standard,
      for_admission: 1,
    };
    try {
      const res = await Promise.all([
        getRequest(GET_URL.getsection.api, params, this.props),
        getRequest(GET_URL.getAssignSubject.api, subject_params, this.props),
      ]);
      this.updateSectionList(res[0]);
      this.updateSubjectList(res[1]);
      this.setState(
        {
          loadingReviewDetails: false,
        },
        () => {
          if (isEdit) {
            this.updateDetails();
          } else {
            this.setState({ loading: false });
          }
        }
      );
    } catch {
      throw Error("Promise failed");
    }
  };

  updateSectionList = (response) => {
    if (response && response.status === 200) {
      response.data.data.map((data) => {
        data.label = data.name;
        data.value = data.id;
      });
      this.setState({
        section_list: response.data.data,
      });
    }
  };

  updateSubjectList = (response) => {
    if (response && response.status === 200) {
      response.data.data.map((data) => {
        if (data.subject_is_language) {
          data["subject_name"] =
            data["subject_name"] + " " + lang_seq[data.subject_sequence];
        }
      });
      this.setState({
        subject_list: response.data.data,
      });
    }
  };

  handleCloseReview = () => {
    this.setState({
      openReviewPage: false,
    });
  };

  callGetPage = () => {
    const { current_standard, year } = this.props;
    let sectionInformation = {
      current_standard: current_standard,
      year: year,
    };
    let searchParam = "?" + new URLSearchParams(sectionInformation).toString();
    this.props.history.push({
      pathname: Actions.set_quiz.view.url,
      search: searchParam,
    });
  };

  onDragEnd(result) {
    let { questionList, validate, expanded } = this.state;
    if (!result.destination) {
      return;
    }
    questionList.map((data, index) => {
      data["question_details"] = this["question" + index].getStateValue();
      if (!data["question_details"]) {
        validate = false;
        expanded = `panel+${index}`;
      }
    });
    let questionListTemp1 = [...questionList];
    this.setState(
      {
        questionList: [],
      },
      () => {
        const questionListTemp = reorder(
          questionListTemp1,
          result.source.index,
          result.destination.index
        );
        this.setState(
          {
            questionList: questionListTemp,
          },
          () => {
            questionListTemp.map((data, index) => {
              this["question" + index].updateValuesBack(data.question_details);
              this["question" + index].updateStateValues(data.question_details);
            });
          }
        );
      }
    );
  }

  deleteQuestion = (index) => {
    let { questionList } = this.state;
    questionList.map((data, index) => {
      data["question_details"] = this["question" + index].getStateValue();
    });
    let questionListTemp1 = [...questionList];
    this.setState(
      {
        questionList: [],
      },
      () => {
        questionListTemp1.splice(index, 1);
        this.setState(
          {
            questionList: questionListTemp1,
          },
          () => {
            questionListTemp1.map((data, index) => {
              this["question" + index].updateValuesBack(data.question_details);
              this["question" + index].updateStateValues(data.question_details);
            });
          }
        );
      }
    );
  };

  updateQuestionName = (value, index) => {
    let { questionList } = this.state;
    questionList[index]["questionName"] = value;
    this.setState({
      questionList,
    });
  };

  updateIsTotalTime = (value) => {
    this.setState({
      is_total_time: value === "yes" ? true : false,
    });
  };

  render() {
    const {
      questionList,
      expanded,
      openReviewPage,
      loading,
      section_list,
      subject_list,
      loadingReviewDetails,
      review_details,
      is_total_time,
      is_finalized,
    } = this.state;
    const {
      current_standard,
      year,
      end_date,
      isEdit,
      quizDetails,
      standard_name,
    } = this.props;
    if (loading) {
      return <LoadingGif />;
    } else {
      return (
        <Box className="m-b-20px">
          {is_finalized ? (
            <AfterFinalizedView
              quizDetails={quizDetails}
              standard_name={standard_name}
            />
          ) : (
            <Box className="p-b-20px">
              <Box display="flex" className="p-5px">
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
                      {"Quiz Configuration"}
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <ReviewSummaryCreateQuiz
                      section_list={section_list}
                      subject_list={subject_list}
                      current_standard={current_standard}
                      year={year}
                      maxDate={end_date}
                      isEdit={isEdit}
                      quizDetails={quizDetails}
                      ref={this.ReviewQuizPage}
                      updateIsTotalTime={this.updateIsTotalTime}
                    />
                  </AccordionDetails>
                </Accordion>
              </Box>
              <Box className="fs-18 form-left-heading m-t-20px p-l-20px">
                {"Question List"}
              </Box>
              {questionList.length > 0 && (
                <DragDropContext
                  onDragEnd={this.onDragEnd}
                  className="margin-top-20"
                >
                  <Droppable droppableId="droppable">
                    {(provided, snapshot) => (
                      <div
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        style={getListStyle(snapshot.isDraggingOver)}
                        className="p-5px"
                      >
                        {questionList.map((item, index) => (
                          <Draggable
                            key={"key_" + index}
                            draggableId={"item" + index}
                            index={index}
                            isDragDisabled={expanded === `panel+${index}`}
                          >
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                style={getItemStyle(
                                  snapshot.isDragging,
                                  provided.draggableProps.style
                                )}
                                className="position-relative padding-0"
                              >
                                {/* <Box position='absolute' style={{ left: '-5px', color: '#c3bfbf', top: 0, cursor: 'grabbing' }}><DragIndicatorIcon /></Box> */}
                                <Box
                                  display="flex"
                                  className="p-5px"
                                  key={index}
                                >
                                  {questionList.length > 1 &&
                                    expanded !== `panel+${index}` && (
                                      <Box className="cursor-grabbing">
                                        <Button
                                          color="primary"
                                          className="min-max-w-0 padding-0"
                                        >
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
                                      <Typography className="">
                                        {item.questionName
                                          ? item.questionName
                                          : "Untitled Question"}
                                      </Typography>
                                    </AccordionSummary>
                                    <AccordionDetails>
                                      <TabSetQuestions
                                        updateQuestionName={
                                          this.updateQuestionName
                                        }
                                        is_total_time={is_total_time}
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
                                        className="min-max-w-0"
                                        onClick={() =>
                                          this.deleteQuestion(index)
                                        }
                                      >
                                        <DeleteOutlineIcon className="add-icon-stock-item" />
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
              <Tooltip
                title="Add another question"
                enterDelay={500}
                enterNextDelay={400}
                placement="top-start"
                classes={{ tooltip: "tooltip-show-data" }}
              >
                <Box className="m-b-40px">
                  <Button
                    className="form-next-pre-button"
                    onClick={() => this.handleCreateQuestion()}
                  >
                    {" "}
                    Add Another Question
                  </Button>
                </Box>
              </Tooltip>
              <Box className="submt-button-float-bottom" mt={3}>
                <Button
                  className="submit"
                  onClick={() => this.handleReviewAndSubmit()}
                >
                  {" "}
                  Review
                </Button>
              </Box>
              <ReviewQuizPage
                handleClose={this.handleCloseReview}
                openReviewPage={openReviewPage}
                loadingReviewDetails={loadingReviewDetails}
                questionList={questionList}
                section_list={section_list}
                subject_list={subject_list}
                current_standard={current_standard}
                year={year}
                maxDate={end_date}
                callGetPage={this.callGetPage}
                ref={this.review}
                review_details={review_details}
                standard_name={standard_name}
              />
            </Box>
          )}
        </Box>
      );
    }
  }
}
export default withRouter(withStyles(styles)(CreateQuestionQuiz));
