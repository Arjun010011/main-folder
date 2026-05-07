// import React, { Component } from "react";
// import Swal from "sweetalert2";
// import { withRouter } from "react-router-dom";

// import MultipleAdd from "Components/MultipleAdd";
// import { nameWithQuoteAndWithoutZeroRegex } from "Constants/regularExpression";
// import { postRequest } from "Includes/api/apicall";
// import { POST_URL } from "Includes/urls";
// import "./styles.scss";
// import { Actions } from "Constants/permissions";

// const fieldDetails = [
//   {
//     label: "Expenses Name",
//     regex: nameWithQuoteAndWithoutZeroRegex,
//     autoFocus: true,
//     name: "name",
//     md: 8,
//     className: "width-100",
//     required: true,
//     id: "outlined-textarea",
//     default: "",
//     rows: null,
//     type: "text",
//     maxLength: 30,
//   },
// ];
// const header = "Expenses Type";
// const subheader =
//   "Here we add the list of available Expenses types in the Entire System.";

// class AddExpensesType extends Component {
//   constructor(props) {
//     super(props);

//     this.state = {
//       submitDisable: false,
//     };
//     this.viewUrl = Actions.expenses_type.view.url;
//   }

//   postMethod = (expense_type) => {
//     let { year } = this.state;
//     expense_type.map((data) => {
//       data["expense_for"] = 1;
//     });
//     let post_data = {
//       academic_year: year,
//       expense_type,
//     };
//     this.setState({ submitDisable: true });
//     let url = POST_URL.expensetype.api;
//     postRequest(url, post_data, this.props).then((response) => {
//       if (response && response.status === 200) {
//         Swal.fire({
//           position: "top-end",
//           type: "success",
//           title: "Your Data has been saved",
//           showConfirmButton: false,
//           timer: 1500,
//         });
//         this.props.history.push(Actions.expenses_type.view.url);
//       }
//       this.setState({ submitDisable: false });
//     });
//   };
//   render() {
//     const { submitDisable, note } = this.state;
//     return (
//       <div>
//         <MultipleAdd
//           fieldDetails={fieldDetails}
//           header={header}
//           subheader={subheader}
//           name="Expenses Type"
//           viewUrl={this.viewUrl}
//           submitDisable={submitDisable}
//           postMethod={this.postMethod}
//           note={note}
//           idFormat={"expense_type_2022_08_11_2_pm_"}
//         />
//       </div>
//     );
//   }
// }

// export default withRouter(AddExpensesType);

import React, { Component } from "react";
import { Paper, Box, Grid, Button, CircularProgress } from "@material-ui/core";
import Swal from "sweetalert2";
import VisibilityOutlinedIcon from "@material-ui/icons/VisibilityOutlined";
import { Link } from "react-router-dom";
import classNames from "classnames";
import { withRouter } from "react-router-dom";
import Snackbar from "@material-ui/core/Snackbar";
import MuiAlert from "@material-ui/lab/Alert";

import MultipleAddTextFields from "Components/MultipleAddTextFields";
import loadingBar from "images/loading.gif";
import { getRequest, postRequest } from "Includes/api/apicall";
import { GET_URL, POST_URL } from "Includes/urls";
import { nameWithQuoteAndWithoutZeroRegex } from "Constants/regularExpression";
import { Actions } from "Constants/permissions";
import {
  isUserHasPermission,
  getSettingValue,
  getUrlParam,
} from "Includes/functions";
import { FormattedMessage } from "react-intl";
import commonMessages from "Constants/messages";
import { DropDownWithSearch } from "Components/DropDownWithSearch";

function Alert(props) {
  return <MuiAlert elevation={6} variant="filled" {...props} />;
}

let is_category = false;

const number_of_language = parseInt(getSettingValue("number_of_language"));

const subjectDetails_global = [
  {
    label: "Expenses Name",
    regex: nameWithQuoteAndWithoutZeroRegex,
    autoFocus: true,
    name: "name",
    md: 8,
    className: "width-100-perc",
    required: true,
    id: "outlined-textarea",
    default: "",
    rows: null,
    type: "text",
    maxLength: 30,
  },
];

class AddExpensesType extends Component {
  constructor() {
    super();
    this.state = {
      expense_type: [],
      loading: true,
      open: false,
      alertData: "",
      selectedCountry: "",
      subjectDetails: [],
      category_list: [],
      selected_category: null,
      fieldError: {},
    };
  }

  componentDidMount = () => {
    let { subjectDetails, selected_category } = this.state;
    if (is_category) {
      this.getCategoryList();
    } else {
      subjectDetails = subjectDetails_global;
      this.setState({
        subjectDetails,
        loading: false,
      });
    }
  };

  getCategoryList = () => {
    let { subjectDetails, selected_category } = this.state;
    subjectDetails = subjectDetails_global;
    const url = GET_URL.expensecategory.api;
    const params = { is_active: true };
    getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        let { category, category_name } = getUrlParam();
        this.setState({
          category_list: response.data.data,
          subjectDetails,
          loading: false,
        });
      }
    });
  };

  updateexpense_typeValue = (stateValue) => {
    let { expense_type } = this.state;
    expense_type = stateValue;
    this.setState({
      expense_type,
    });
  };

  validate = () => {
    let stateTest = true;
    let branchTest = true;
    let { expense_type, fieldError, category_list, selected_category } =
      this.state;
    stateTest = this.refs.expense_type.validateFields();
    if (!selected_category && is_category) {
      fieldError["selected_category"] = "Select Category";
      this.setState({
        fieldError,
      });
      return;
    }
    if (stateTest && branchTest) {
      expense_type.map((data) => {
        if(is_category){
          data["category"] = selected_category["id"];
        }
        data["expense_for"] = 1;
      });

      let post_data = {
        expense_type: expense_type,
      };
      this.setState({ submitDisable: true });
      let url = POST_URL.expensetype.api;
      postRequest(url, post_data, this.props).then((response) => {
        if (response && response.status === 200) {
          Swal.fire({
            position: "top-end",
            type: "success",
            title: response.data.Reason,
            showConfirmButton: false,
            timer: 1500,
          });
          this.props.history.push(Actions.expenses_type.view.url);
        }
        this.setState({ submitDisable: false });
      });
    } else if (!branchTest) {
      fieldError["branch"] = "Select branch";
      this.setState({
        fieldError,
      });
    }
  };

  handleClose = () => {
    this.setState({
      open: false,
    });
  };

  handleStateViewButton = () => {
    this.props.history.push(Actions.expenses_type.view.url);
  };

  handleDropDown = (e) => {
    let { fieldError } = this.state;
    delete fieldError["selected_category"];
    this.setState({
      selected_category: e,
      fieldError,
    });
  };

  render() {
    const {
      loading,
      open,
      subjectDetails,
      submitDisable,
      category_list,
      selected_category,
      fieldError,
    } = this.state;
    if (loading) {
      return (
        <Box display="flex">
          <img src={loadingBar} className="loading" alt="loading" />
        </Box>
      );
    } else {
      return (
        <Box>
          <Paper className={classNames("paper-background")}>
            <Grid container>
              <Grid item md={6} xs={12} className={classNames("header-align")}>
                <Box className="heading">Expense Type</Box>
              </Grid>
              <Grid item md={6} xs={12}>
                <Box className={classNames("header-align", "end-flex-prop")}>
                  {isUserHasPermission("expenses_type", "view") && (
                    <Button
                      variant="contained"
                      onClick={this.handleStateViewButton}
                      className="editbutton-view"
                    >
                      <VisibilityOutlinedIcon className="visibility-icon" />{" "}
                      {Actions.expenses_type.view.label}
                    </Button>
                  )}
                </Box>
              </Grid>
            </Grid>
            {is_category && (
              <div className="mt-20 mb-20">
                <DropDownWithSearch
                  options={category_list}
                  name={"selected_category"}
                  value={selected_category}
                  onChange={(e, newValue) => this.handleDropDown(newValue)}
                  label={"Category"}
                  hideClearIcon={true}
                  className="width-300px"
                  size="small"
                  error={fieldError["selected_category"]}
                />
              </div>
            )}
            <Grid container className={classNames("header-align")}>
              <Grid item md={6} xs={12}>
                <MultipleAddTextFields
                  fieldDefaultValue={[]}
                  fieldDetails={subjectDetails}
                  updateParent={this.updateexpense_typeValue}
                  isEmptyNotAllowed={true}
                  ref={"expense_type"}
                  idFormat={"expense_type_2022_08_11_2_pm_"}
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
}
export default withRouter(AddExpensesType);
