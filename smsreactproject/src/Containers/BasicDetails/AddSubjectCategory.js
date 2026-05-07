import React, { Component } from "react";
import { Paper, Box, Grid, Button } from "@material-ui/core";
import Swal from "sweetalert2";
import VisibilityOutlinedIcon from "@material-ui/icons/VisibilityOutlined";
import classNames from "classnames";
import { withRouter } from "react-router-dom";
import Snackbar from "@material-ui/core/Snackbar";
import MuiAlert from "@material-ui/lab/Alert";

import MultipleAddTextFields from "Components/MultipleAddTextFields";
import loadingBar from "images/loading.gif";
import { postRequest } from "Includes/api/apicall";
import { POST_URL } from "Includes/urls";
import { nameWithQuoteRegex, nameAndNumberAndHyphenRegex } from "Constants/regularExpression";
import { Actions } from "Constants/permissions";
import { isUserHasPermission } from "Includes/functions";
import { FormattedMessage } from "react-intl";
import commonMessages from "Constants/messages";

function Alert(props) {
  return <MuiAlert elevation={6} variant="filled" {...props} />;
}

const subejctCategoryDetails = [
  {
    label: "Subject Category Name",
    regex: nameWithQuoteRegex,
    autoFocus: true,
    name: "name",
    md: 8,
    className: "width-form-95",
    required: true,
    id: "dept_name",
    default: "",
    rows: null,
    type: "text",
    maxLength: 250,
    gridClassName: "margin-vertical-20",
  },
  {
    label: "subject Category Code",
    regex: nameAndNumberAndHyphenRegex,
    autoFocus: false,
    name: "code",
    md: 4,
    className: "width-form-95",
    required: true,
    id: "dept_code",
    default: "",
    rows: null,
    type: "text",
    maxLength: 30,
    gridClassName: "margin-vertical-20",
  },
];

class AddSubjectCategory extends Component {
  state = {
    subejctCategoryRows: [],
    subejctCategoryDetails: subejctCategoryDetails,
    loading: false,
    open: false,
    submitDisable: false,
  };

  updateDepartmentValue = (rows) => {
    this.setState({ subejctCategoryRows: rows });
  };

  handleStateViewButton = () => {
    this.props.history.push(Actions.subejct_category.view.url);
  };

  handleClose = () => this.setState({ open: false });

  validate = () => {
  const ok = this.refs.state.validateFields();
  if (!ok) return;
  const payload = (this.state.subejctCategoryRows || []).map(({ name, code }) => ({
    name,
    code,
  }));
  const url = POST_URL.subjectcategory.api;
  this.setState({ submitDisable: true });

  postRequest(url, payload, this.props).then((response) => {
    if (response && response.status === 200) {
      Swal.fire({
        position: "top-end",
        type: "success",
        title: response.data?.Reason || "Subject Category created",
        showConfirmButton: false,
        timer: 1500,
      });
      this.props.history.push(Actions.subejct_category.view.url);
    }
    this.setState({ submitDisable: false });
  });
};


  render() {
    const { loading, open, submitDisable, subejctCategoryDetails } = this.state;

    if (loading) {
      return (
        <Box display="flex">
          <img src={loadingBar} className="loading" alt="loading" />
        </Box>
      );
    }

    return (
      <Box>
        <Paper className={classNames("paper-background")}>
          <Grid container>
            <Grid item md={6} xs={12} className={classNames("header-align")}>
              <Box className="heading">
                Subejct Category
              </Box>
            </Grid>
            <Grid item md={6} xs={12}>
              <Box className={classNames("header-align", "end-flex-prop")}>
                {isUserHasPermission("subejct_category", "view") && (
                  <Button
                    variant="contained"
                    onClick={this.handleStateViewButton}
                    className="editbutton-view"
                  >
                    <VisibilityOutlinedIcon className="visibility-icon" />
                    {Actions.subejct_category.view.label}
                  </Button>
                )}
              </Box>
            </Grid>
          </Grid>

          <Grid container className={classNames("header-align")}>
            <Grid item md={10} xs={12}>
              <MultipleAddTextFields
                fieldDefaultValue={[]}
                fieldDetails={subejctCategoryDetails}
                updateParent={this.updateDepartmentValue}
                isEmptyNotAllowed={true}
                ref={"state"}
                NotAlignCenter={true}
                idFormat={"subejct_category_add_"}
              />

              <Box className="submt-button-float-bottom" mt={3}>
                <Button
                  variant="contained"
                  color="primary"
                  className="submit"
                  disabled={submitDisable}
                  onClick={this.validate}
                >
                  <FormattedMessage {...commonMessages.submit} />
                </Button>
              </Box>
            </Grid>
          </Grid>

          <Snackbar
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            open={open}
            autoHideDuration={2000}
            onClose={this.handleClose}
          >
            <Alert onClose={this.handleClose} severity="error">
              <FormattedMessage {...commonMessages.clearAllErrors} />
            </Alert>
          </Snackbar>
        </Paper>
      </Box>
    );
  }
}

export default withRouter(AddSubjectCategory);
