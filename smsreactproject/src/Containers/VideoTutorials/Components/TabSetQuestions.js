import React, { Component } from "react";
import {
  Grid,
  CircularProgress,
  TextField,
  Box,
  Button,
  Tooltip,
  FormControlLabel,
  Divider,
  Switch,
  Avatar,
} from "@material-ui/core";
import VisibilityOutlinedIcon from "@material-ui/icons/VisibilityOutlined";
import HighlightOffIcon from "@material-ui/icons/HighlightOff";
import { withRouter } from "react-router-dom";

import { questionTypeList } from "Containers/Quiz/constants";
import { Dropdown } from "Components/DropDown";
import QuestionType from "Containers/VideoTutorials/Components/QuestionType";
import { postRequest, putRequest } from "Includes/api/apicall";
import { PUT_URL, POST_URL } from "Includes/urls";
import Snackbar from "@material-ui/core/Snackbar";
import { maxFileSize } from "Constants";
import { supported_images_types } from "Containers/VideoTutorials/Constants";
import commonMessages from "Constants/messages";
import { FormattedMessage } from "react-intl";
import { getKeyValueMap, Alert } from "Includes/functions";

class TabSetQuestions extends Component {
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
        question_name: "",
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

  handleImageChange = (event, acceptFileType) => {
    let { question_details } = this.state;
    let fileName = event.target.files[0]["name"];
    let file_extension = `${fileName.slice(
      (Math.max(0, fileName.lastIndexOf(".")) || Infinity) + 1
    )}`;
    let is_supported_image_type = true;
    is_supported_image_type = supported_images_types.image_type.includes(
      file_extension.toLowerCase()
    );
    if (event.target.files[0] && is_supported_image_type) {
      if (event.target.files[0].size < maxFileSize[acceptFileType].size) {
        let post = new FormData();
        post.append("file", event.target.files[0]);
        let request = postRequest;
        let url = POST_URL.uploads.api;
        this.setState({ imageUploading: true });
        request(url, post, this.props).then((response) => {
          if (response && response.status === 200) {
            let uploadedId = response.data.data.id;
            let imagePreview = response.data.data.file;
            let imageName = fileName;
            let temp = {
              file_extension: file_extension,
              uploadedId: uploadedId,
              url: imagePreview,
              imageName: imageName,
            };
            question_details.imagesPreview.push(temp);
            this.setState({
              question_details,
            });
          }
          this.setState({
            imageUploading: false,
          });
        });
      } else {
        this.setState({
          openSnackbar: true,
          alertData: maxFileSize.errorText,
        });
      }
    } else if (!is_supported_image_type) {
      this.setState({
        alertData: supported_images_types.error,
        openSnackbar: true,
      });
    }
  };

  validateCheckBoxValue = () => {
    const { question_details } = this.state;
    let returnValue = false;
    question_details.options.some((data) => {
      if (data.value) {
        returnValue = true;
      }
    });
    return returnValue;
  };

  getDetails = () => {
    let { question_details, fieldErrors, openSnackbar, alertData } = this.state;
    const { qindex } = this.props;
    let returnValue = false;
    let validate = true;
    if (!question_details.question_name) {
      fieldErrors["question_name"] = (
        <FormattedMessage {...commonMessages.fieldMandatoryError} />
      );
      validate = false;
    }
    if (
      (question_details.questionType === 1 ||
        question_details.questionType === 2) &&
      question_details.options.length < 2
    ) {
      openSnackbar = true;
      alertData = `(Question ${qindex + 1}) - Atleast add 2 options`;
      validate = false;
    } else if (
      question_details.questionType === 1 &&
      !question_details.selectedRadio
    ) {
      openSnackbar = true;
      alertData = `(Question ${
        qindex + 1
      }) - select radio button as an answer for the question`;
      validate = false;
    } else if (question_details.questionType === 2) {
      let validateCheck = this.validateCheckBoxValue();
      if (!validateCheck) {
        openSnackbar = true;
        alertData = `(Question ${
          qindex + 1
        }) -  select checkbox as an answer for the question`;
        validate = false;
      }
    }
    if (
      question_details.questionType === 3 &&
      question_details.options.length === 0
    ) {
      openSnackbar = true;
      alertData = `(Question ${qindex + 1}) - Enter Answer`;
      this.refs.questionType.updateErrorDetails(alertData);
      validate = false;
    }
    if (
      question_details.questionType === 4 &&
      (question_details.correctOptions
        ? question_details.correctOptions.length < 2
        : true)
    ) {
      openSnackbar = true;
      alertData = `(Question ${qindex + 1}) - Atleast add 2 options`;
      validate = false;
    }
    if (validate) {
      let questionTypeName = getKeyValueMap(questionTypeList, "id", "name");
      question_details["questionTypeName"] =
        questionTypeName[question_details.questionType];
      returnValue = question_details;
    }
    this.setState({
      alertData,
      openSnackbar,
    });
    return returnValue;
  };

  getStateValue = () => {
    const { question_details } = this.state;
    return question_details;
  };

  updateValuesBack = (details) => {
    this.setState({
      question_details: details,
    });
  };

  handleLargePreview = (image) => {
    this.setState({
      largeImagePreview: image,
    });
  };

  handleCloseLargeImage = () => {
    this.setState({
      largeImagePreview: "",
    });
  };

  deleteUploadedImage = (index) => {
    let { question_details } = this.state;
    question_details.imagesPreview.splice(index, 1);
    this.setState({
      question_details,
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

  handleClose = () => {
    this.setState({
      openSnackbar: false,
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
    question_details["imagesPreview"]=[]
    getDetails["documents"].map((data)=>{
      data["url"]=data["file"]
      data["uploadedId"]=data["id"]
      question_details["imagesPreview"].push(data)
    })
    this.setState(
      {
        question_details,
      },
      () => {
        this.refs.questionType.updateChoices(getDetails);
      }
    );
  };

  updateStateValues = (question_details) => {
    this.refs.questionType.updateStateValues(question_details);
  };

  onBlurName = () => {
    const { question_details } = this.state;
    const { qindex } = this.props;
    this.props.updateQuestionName(question_details["question_name"], qindex);
  };

  handleNote = (qType) => {
    let returnValue = "";
    if (qType === 1 || qType === 2) {
      returnValue = "Select answer for the question";
    } else if (qType === 3) {
      returnValue = "Write an answer for the question";
    } else if (qType === 4) {
      returnValue = "Match the correct answeres for the question";
    }
    return `Note : ${returnValue}`;
  };

  render() {
    let {
      fieldErrors,
      question_details,
      largeImagePreview,
      imageUploading,
      openSnackbar,
      alertData,
    } = this.state;
    const { is_total_time, qindex } = this.props;
    return (
      <div>
        {largeImagePreview && (
          <Box className="set-question-large-image-preview-box">
            <img
              src={largeImagePreview}
              alt="Image Preview"
              className="set-question-large-image-preview"
            />
            <Tooltip title="Close Image" placement="top-start">
              <Box
                className="set-question-large-image-remove-icon-box"
                onClick={this.handleCloseLargeImage}
              >
                <HighlightOffIcon className="set-question-large-image-remove-icon" />
              </Box>
            </Tooltip>
          </Box>
        )}
        <Grid container spacing={2}>
          <Grid item md={8} xs={12}>
            <TextField
              id="question_name"
              label="Question"
              required={true}
              name="question_name"
              value={question_details.question_name}
              multiline={true}
              className=""
              inputProps={{ maxLength: 100 }}
              fullWidth
              variant="outlined"
              onChange={(e) => this.handleOnChange(e)}
              onBlur={this.onBlurName}
              error={
                fieldErrors["question_name"] && fieldErrors["question_name"]
              }
              helperText={
                fieldErrors["question_name"] && fieldErrors["question_name"]
              }
            />
          </Grid>
          <Grid item md={2} xs={12}>
            <TextField
              id="points"
              label="Points"
              name="points"
              value={question_details.points}
              className=""
              inputProps={{ maxLength: 4 }}
              fullWidth
              onChange={(e) => this.handleOnChange(e)}
              error={fieldErrors["points"] && fieldErrors["points"]}
              helperText={fieldErrors["points"] && fieldErrors["points"]}
            />
          </Grid>
          <Grid item md={2} xs={12}>
            {!is_total_time && (
              <TextField
                id="withinTime"
                label="Time Limits"
                placeholder="seconds"
                name="withinTime"
                value={question_details.withinTime}
                className=""
                inputProps={{ maxLength: 4 }}
                fullWidth
                onChange={(e) => this.handleOnChange(e)}
                error={fieldErrors["withinTime"] && fieldErrors["withinTime"]}
                helperText={
                  fieldErrors["withinTime"] && fieldErrors["withinTime"]
                }
              />
            )}
          </Grid>
          <Grid item lg={8} md={9} xs={12}>
            <TextField
              id="Description"
              label="Description"
              name="description"
              value={question_details.description}
              multiline={true}
              className=""
              inputProps={{ maxLength: 200 }}
              fullWidth
              variant="outlined"
              onChange={(e) => this.handleOnChange(e)}
            />
          </Grid>
          <Grid item md={2} xs={12} className="set-question-align-text-center">
            <FormControlLabel
              control={
                <Switch
                  checked={
                    question_details.isMandatory === "yes" ? true : false
                  }
                  name="isMandatory"
                  value={question_details.isMandatory === "yes" ? "no" : "yes"}
                  color="primary"
                  onChange={(e) => this.handleOnChange(e)}
                />
              }
              label="Mandatory"
            />
          </Grid>
          <Grid item md={2} xs={12} className="set-question-align-text-center">
            <Tooltip
              title={"Show answer immediatly  after student submit"}
              enterDelay={400}
              enterNextDelay={400}
              placement="top-start"
              classes={{ tooltip: "tooltip-show-data" }}
            >
              <FormControlLabel
                control={
                  <Switch
                    checked={
                      question_details.showAnswer === "yes" ? true : false
                    }
                    name="showAnswer"
                    value={question_details.showAnswer === "yes" ? "no" : "yes"}
                    color="primary"
                    onChange={(e) => this.handleOnChange(e)}
                  />
                }
                label="Show Answer"
              />
            </Tooltip>
          </Grid>
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
                error={
                  fieldErrors["questionType"] && fieldErrors["questionType"]
                }
                helperText={
                  fieldErrors["questionType"] && fieldErrors["questionType"]
                }
              />
            )}
            <Box className="staff-list-assigned-shift">
              {this.handleNote(question_details.questionType)}
            </Box>
          </Grid>
          <Grid item md={8} xs={12}>
            <Box className="set-question-uploaded-images-outer-box">
              <label
                htmlFor={`${qindex}upload-pic`}
                className={imageUploading ? "upload-icon-uploading" : ""}
              >
                <Button
                  variant="raised"
                  component="span"
                  disabled={imageUploading}
                  className="set-question-upload-images-button"
                >
                  Upload Images
                  <Box className="upload-icon">
                    <i className="fa fa-upload" aria-hidden="true"></i>
                  </Box>
                </Button>
                <Box
                  className={
                    imageUploading
                      ? "image-uploading-circular-icon"
                      : "display-none"
                  }
                >
                  <CircularProgress className="set-question-upload-image-loading" />{" "}
                </Box>
              </label>
              <input
                disabled={imageUploading}
                type="file"
                id={`${qindex}upload-pic`}
                className="display-none"
                onChange={(e) => this.handleImageChange(e, "img")}
                onClick={(e) => (e.target.value = null)}
              />
              <Box className="set-question-image-list-box">
                {question_details.imagesPreview &&
                  question_details.imagesPreview.map((temp, index) => {
                    return (
                      <Box className="set-question-image-preview-outer-box">
                        <Tooltip title="Preview Image" placement="top-start">
                          <img
                            src={temp.url}
                            alt="image"
                            className="set-question-uploaded-image"
                          />
                        </Tooltip>
                        <Box
                          onClick={() => this.handleLargePreview(temp.url)}
                          className="set-question-image-preview-icon"
                        >
                          <VisibilityOutlinedIcon />{" "}
                        </Box>
                        <Box
                          className="set-question-delete-image-input"
                          onClick={() => this.deleteUploadedImage(index)}
                        >
                          <HighlightOffIcon />
                        </Box>
                      </Box>
                    );
                  })}
              </Box>
            </Box>
          </Grid>

          <Grid item md={12} xs={12}>
            <QuestionType
              questionType={question_details.questionType}
              updateValues={this.updateValues}
              ref={"questionType"}
              qindex={qindex}
            />
          </Grid>
          <Snackbar
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            open={openSnackbar}
            autoHideDuration={2000}
            onClose={this.handleClose}
          >
            <Alert onClose={this.handleClose} severity="error">
              {alertData}
            </Alert>
          </Snackbar>
        </Grid>
      </div>
    );
  }
}

export default TabSetQuestions;
