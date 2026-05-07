// TabSetQuestionsFeedBackForm.jsx
import React, { Component } from "react";
import {
  Grid,
  TextField,
  Box,
  Button,
  Tooltip,
  Snackbar,
} from "@material-ui/core";
import HighlightOffIcon from "@material-ui/icons/HighlightOff";
import VisibilityOutlinedIcon from "@material-ui/icons/VisibilityOutlined";
import { withRouter } from "react-router-dom";

import { Dropdown } from "Components/DropDown";
import QuestionType from "Containers/VideoTutorials/Components/QuestionType";
import { postRequest } from "Includes/api/apicall";
import { POST_URL } from "Includes/urls";
import SnackbarMui from "@material-ui/core/Snackbar";
import MuiAlert from "@material-ui/lab/Alert";
import { maxFileSize } from "Constants";
import { supported_images_types } from "Containers/VideoTutorials/Constants";
import commonMessages from "Constants/messages";
import { FormattedMessage } from "react-intl";
import { getKeyValueMap } from "Includes/functions";

const questionTypeList = [
  { id: 1, name: "Multiple Choice" },
  { id: 2, name: "Check Box" },
  { id: 3, name: "One word" },
  { id: 4, name: "Match the following" },
];

class TabSetQuestionsFeedBackForm extends Component {
  constructor(props) {
    super(props);

    this.state = {
      question_details: {
        showAnswer: "no",
        isMandatory: "no",
        questionType: 1,
        largeImagePreview: "",
        imageUploading: false,
        imagesPreview: [],
        question_name: props.question_name || "",
        description: "",
        withinTime: "",
        options: [],
        selectedRadio: "",
      },
      fieldErrors: {},
      openSnackBar: false,
      alertData: "",
    };
  }

  handleOnChange = (e) => {
    let { question_details, fieldErrors } = this.state;
    let { name, value } = e.target;
    delete fieldErrors[name];
    question_details[name] = value;
    this.setState({
      question_details,
      fieldErrors,
    });
  };

  validateCheckBoxValue = () => {
    const { question_details } = this.state;
    let returnValue = false;
    question_details.options.some((data) => {
      if (data.value) {
        returnValue = true;
        return true;
      }
      return false;
    });
    return returnValue;
  };

  // Return details. For bulk mode we do NOT require question_name
  getDetails = () => {
    let { question_details, fieldErrors } = this.state;
    const { qindex, isBulk } = this.props;
    let returnValue = false;
    let validate = true;
    // only validate title if not bulk
    if (!isBulk && !question_details.question_name) {
      fieldErrors["question_name"] = (
        <FormattedMessage {...commonMessages.fieldMandatoryError} />
      );
      validate = false;
    }
    if (
      (question_details.questionType === 1 ||
        question_details.questionType === 2) &&
      (!question_details.options || question_details.options.length < 2)
    ) {
      this.setState({
        openSnackBar: true,
        alertData: `(Question ${qindex}) - At least add 2 options`,
      });
      validate = false;
    } else if (question_details.questionType === 2) {
      let validateCheck = this.validateCheckBoxValue();
      if (!validateCheck) {
        this.setState({
          openSnackBar: true,
          alertData: `(Question ${qindex}) - select checkbox as an answer for the question`,
        });
        validate = false;
      }
    }
    if (validate) {
      let questionTypeName = getKeyValueMap(questionTypeList, "id", "name");
      question_details["questionTypeName"] =
        questionTypeName[question_details.questionType];
      returnValue = question_details;
    } else {
      this.setState({ fieldErrors });
    }
    return returnValue;
  };

  getStateValue = () => {
    const { question_details } = this.state;
    return question_details;
  };

  updateValuesBack = (details = {}) => {
    // Merge incoming details into existing question_details so the question_name is preserved
    this.setState(
      (prev) => ({
        question_details: {
          ...prev.question_details,
          ...details,
        },
      }),
      () => {
        // Also update QuestionType child (so options UI updates)
        try {
          if (this.refs && this.refs.questionType && typeof this.refs.questionType.updateStateValues === "function") {
            this.refs.questionType.updateStateValues(this.state.question_details);
          }
        } catch (err) {
          // eslint-disable-next-line no-console
          console.warn("updateValuesBack: failed to update QuestionType child", err);
        }
      }
    );
  };

  handleClose = () => {
    this.setState({
      openSnackBar: false,
    });
  };

  updateValues = (options) => {
    let { question_details } = this.state;
    question_details["options"] = "";
    if (question_details.questionType === 1) {
      question_details["selectedRadio"] = options.selectedRadio;
      question_details["options"] = options.options;
    } else if (question_details.questionType === 4) {
      question_details["correctOptions"] = options["correctOptions"];
      question_details["shuffledOptions"] = options["shuffledOptions"];
    } else {
      question_details["options"] = options;
    }
    this.setState({
      question_details,
    });
  };

  updateEditDetails = (getDetails) => {
    let { question_details } = this.state;
    question_details["id"] = getDetails["id"];
    question_details["question_name"] = getDetails["question"];
    question_details["description"] = getDetails["description"];
    question_details["questionType"] = getDetails["question_type"];
    question_details["isMandatory"] = getDetails["required"] ? "yes" : "no";
    question_details["showAnswer"] = getDetails["show_answer_after_submit"]
      ? "yes"
      : "no";
    question_details["points"] = getDetails["score"];
    question_details["withinTime"] = getDetails["time_limit_to_answer"];
    question_details["imagesPreview"] = [];
    (getDetails["documents"] || []).map((data) => {
      data["url"] = data["file"];
      data["uploadedId"] = data["id"];
      question_details["imagesPreview"].push(data);
    });
    this.setState(
      {
        question_details,
      },
      () => {
        if (this.refs.questionType && this.refs.questionType.updateChoices) {
          this.refs.questionType.updateChoices(getDetails);
        }
      }
    );
  };

  updateStateValues = (question_details) => {
    if (this.refs.questionType && this.refs.questionType.updateStateValues) {
      this.refs.questionType.updateStateValues(question_details);
    }
  };

  onBlurName = () => {
    const { question_details } = this.state;
    const { qindex } = this.props;
    if (this.props.updateQuestionName) {
      this.props.updateQuestionName(question_details["question_name"], qindex);
    }
  };

  handleNote = (qType) => {
    let returnValue = "";
    if (qType === 1 || qType === 2) {
      returnValue = "Select answer for the question";
    } else if (qType === 3) {
      returnValue = "Write an answer for the question";
    } else if (qType === 4) {
      returnValue = "Match the correct answers for the question";
    }
    return `Note : ${returnValue}`;
  };

  render() {
    let {
      fieldErrors,
      question_details,
      largeImagePreview,
      imageUploading,
      openSnackBar,
      alertData,
    } = this.state;
    const { is_total_time, qindex, isBulk,isEdit } = this.props;
    return (
      <div>
        <Grid>
          {/* Show question title only when not bulk */}
          {!isBulk && (
            <Grid item xs={12} md={12}>
              <TextField
                id="question_name"
                label="Question"
                required={true}
                name="question_name"
                value={question_details.question_name}
                multiline={true}
                inputProps={{ maxLength: 100 }}
                fullWidth
                variant="outlined"
                onChange={(e) => this.handleOnChange(e)}
                style={{ width: "90vw", maxWidth: 1200 }}
                onBlur={this.onBlurName}
                error={fieldErrors["question_name"] && fieldErrors["question_name"]}
                helperText={fieldErrors["question_name"] && fieldErrors["question_name"]}
              />
            </Grid>
          )}

          {/* Question Type - show always (bulk needs this) */}
          {(isBulk || isEdit) && (
          <Grid item lg={4} md={3} xs={12}>
            {question_details.questionType && (
              <Dropdown
                data={questionTypeList}
                name="questionType"
                value={question_details.questionType}
                onChange={this.handleOnChange}
                label="Question Type"
                fullWidth
                hideSelect
                required
                error={fieldErrors["questionType"] && fieldErrors["questionType"]}
                helperText={fieldErrors["questionType"] && fieldErrors["questionType"]}
              />
            )}
            <Box className="staff-list-assigned-shift">
              {this.handleNote(question_details.questionType)}
            </Box>
          </Grid>)}

          {/* QuestionType component contains options UI */}
          {(isBulk || isEdit) && (
          <Grid item md={12} xs={12}>
            <QuestionType
              questionType={question_details.questionType}
              updateValues={this.updateValues}
              ref={"questionType"}
              qindex={qindex}
            />
          </Grid>
        )}
        </Grid>

        <Snackbar
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          open={openSnackBar}
          autoHideDuration={2000}
          onClose={this.handleClose}
        >
          <MuiAlert onClose={this.handleClose} severity="error">
            {alertData}
          </MuiAlert>
        </Snackbar>
      </div>
    );
  }
}

export default TabSetQuestionsFeedBackForm;
