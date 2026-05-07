import React, { Component } from "react";
import { withRouter } from "react-router-dom";
import { Paper, Grid, Button, Tooltip } from "@material-ui/core";
import Box from "@material-ui/core/Box";
import classNames from "classnames";
import VisibilityOutlinedIcon from "@material-ui/icons/VisibilityOutlined";
import { Link } from "react-router-dom";
import HighlightOffIcon from "@material-ui/icons/HighlightOff";
import EditTwoToneIcon from "@material-ui/icons/EditTwoTone";

import loadingBar from "images/loading.gif";
import { getRequest } from "Includes/api/apicall";
import { GET_URL } from "Includes/urls";
import { dateFormat, isUserHasPermission } from "Includes/functions";
import { Actions } from "Constants/permissions";
import { image_formats } from "Containers/Expenses/Constants";
import GetAppRoundedIcon from "@material-ui/icons/GetAppRounded";

class ViewExpenseIndividual extends Component {
  constructor(props) {
    super(props);

    this.state = {
      expense_details: [],
      largeImagePreview: "",
      loading: true,
      expenseId: "",
    };
  }

  componentDidMount = () => {
    this.getExpenseDetails();
  };

  getExpenseDetails = () => {
    if (this.props.location.state) {
      const id = this.props.location.state.detail;
      const url = GET_URL.expense.api + id + "/";
      getRequest(url, {}, this.props).then((response) => {
        if (response && response.status === 200) {
          this.setState(
            {
              expensesDetails: response.data.data,
              pageLoading: false,
              expenseId: id,
            },
            () => {
              this.updateExpenseView();
            }
          );
        }
      });
    } else {
      this.props.history.push(Actions.expenses_create.view.url);
    }
  };

  updateExpenseView = () => {
    let { expensesDetails } = this.state;
    let expenses = expensesDetails;
    
    // Handle expense_type - it might be an object or a string
    let expenseTypeName = expenses["expense_type_name"];
    if (!expenseTypeName && expenses["expense_type"]) {
      if (typeof expenses["expense_type"] === "object") {
        expenseTypeName = expenses["expense_type"]["expense_type_name"] || expenses["expense_type"]["name"] || "";
      } else {
        expenseTypeName = expenses["expense_type"];
      }
    }
    
    let expense_details = [
      { label: "Expense Name", value: expenseTypeName || "" },
      {
        label: "Applied Date",
        value: dateFormat(expenses["date"], "DD-MM-YYYY"),
      },
      { label: "Payee Name", value: expenses["payee_name"] },
      { label: "Amount", value: expenses["amount"] },
      { label: "Tax", value: expenses["tax_amount"] },
      { label: "Total Amount With Tax", value: expenses["total_amount"] },
      { label: "GST Number", value: expenses["gst_number"] },
      { label: "Ref Number", value: expenses["ref_number"] },
    ];
    
    // Handle mode_of_payment - it might be an object or a string
    let modeOfPayment = expenses["mode_of_payment"];
    if (modeOfPayment && typeof modeOfPayment === "object") {
      modeOfPayment = modeOfPayment["id"] || modeOfPayment["name"] || "";
    }
    expense_details.push({ label: "Mode of Payment", value: modeOfPayment || "" });
    expense_details.push({ label: "Purchased Receipt Num", value: expenses["purchased_receipt_num"] });
    
    // Add cheque clearance date only if mode of payment is Cheque
    const modeOfPaymentValue = typeof expenses["mode_of_payment"] === "object" 
      ? (expenses["mode_of_payment"]["id"] || expenses["mode_of_payment"]["name"])
      : expenses["mode_of_payment"];
    if (modeOfPaymentValue === "Cheque") {
      expense_details.push({
        label: "Cheque Clearance Date",
        value: expenses["cheque_clearance_date"]
          ? dateFormat(expenses["cheque_clearance_date"], "DD-MM-YYYY")
          : "Not set",
      });
    }
    expense_details.push({
        label: "Attached Document",
        value: expenses["attachment_details"] && "Receipt",
        image:
          expenses["attachment_details"] &&
          expenses["attachment_details"]["file"],
    });
    expense_details.push({ label: "Comment", value: expenses["comment"], grid: 12 });
    if (expenseTypeName == "Transport") {
      let token_details = [];
      let vehicle_details = [];
      if (expenses.token_details) {
        token_details = [
          { label: "Token Number", value: expenses.token_details.token_num },
          { label: "Number of Liter", value: expenses.token_details.liter },
        ];
      }
      vehicle_details = [
        { label: "Vehicle Number", value: expenses.other_details.vehicle_num },
        { label: "Vehicle Name", value: expenses.other_details.name },
      ];
      expense_details = [
        ...token_details,
        ...vehicle_details,
        ...expense_details,
      ];
    }
    this.setState({
      expense_details,
      loading: false,
    });
  };

  handleViewImage = (image) => {
    let file_extension = `${image.slice(
      (Math.max(0, image.lastIndexOf(".")) || Infinity) + 1
    )}`;
    if (image_formats.includes(file_extension)) {
      this.setState({
        largeImagePreview: image,
      });
    } else {
      window.open(image);
    }
  };

  handleCloseLargeImage = () => {
    this.setState({
      largeImagePreview: "",
    });
  };

  handleEdit = () => {
    let { expenseId } = this.state;
    this.props.history.push({
      pathname: Actions.expenses_create.update.url,
      state: { detail: expenseId },
    });
  };

  printReciept = () => {
    const id = this.props.location.state.detail;
    let get_url = GET_URL.expense.api + id + "/";
    let prop = {};
    prop.responseType = "blob";
    getRequest(get_url, { print_receipt: 1 }, prop).then((response) => {
      if (response && response.status === 200) {
        let Data = new Blob([response.data], { type: "application/pdf" });
        let fileURL = URL.createObjectURL(Data);
        // window.open(fileURL);
        const height = (window.screen.height * 75) / 100;
        const width = (window.screen.width * 75) / 100;
        const mywindow = window.open(
          fileURL,
          "PRINT",
          "height=" + height + ",width=" + width + ""
        );
        mywindow.print();
      }
    });
    // let invoiceComponent = <InvoiceSelection invoiceData={miscDetails} invoiceSelect={'misc_reciept'} />
    // this.setState({
    //     open: true,
    //     showInvoicePopUp: true,
    //     loadComponent: invoiceComponent,
    // })
  };

  render() {
    let { expense_details, largeImagePreview, loading } = this.state;
    if (loading) {
      return (
        <Box display="flex">
          <img src={loadingBar} className="loading" alt="loading" />
        </Box>
      );
    } else {
      return (
        <Paper className="paper-background">
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
          <Grid container>
            <Grid item md={8} xs={12} className="header-align">
              <Box className="heading">View Details Of Expense</Box>
            </Grid>
            <Grid item md={4} xs={12}>
              <Box className="header-align end-flex-prop">
                {isUserHasPermission("expenses_create", "view") && (
                  <Button
                    variant="contained"
                    component={Link}
                    to={Actions.expenses_create.view.url}
                    className="editbutton-view"
                  >
                    <VisibilityOutlinedIcon className="visibility-icon" />{" "}
                    {Actions.expenses_create.view.label}
                  </Button>
                )}
              </Box>
            </Grid>
          </Grid>
          <Paper className="header-align expense-individual-paper-background">
            <Button
              variant="contained"
              color="secondary"
              className="submit print"
              onClick={this.printReciept}
            >
              <GetAppRoundedIcon />
              Print
            </Button>
            <Grid container className="profileDetail">
              {expense_details.map((data, index) => {
                return (
                  <Grid key={index} item md={data.grid ? data.grid : 6} xs={12}>
                    <Grid container>
                      <Grid item md={12} xs={12}>
                        <Box
                          display="flex"
                          justifyContent="flex-start"
                          className="dataLabel break-word"
                        >
                          {data.label}
                        </Box>
                      </Grid>
                      <Grid item md={12} xs={12}>
                        {data.image && (
                          <Box
                            display="flex"
                            justifyContent="flex-start"
                            className={classNames(
                              data.className,
                              "view-expenses-data-value break-word"
                            )}
                          >
                            {!data.value && (
                              <Box style={{ width: "40px" }}>
                                <hr />
                              </Box>
                            )}
                            {data.value !== "" && data.value}
                            <Box
                              onClick={() => this.handleViewImage(data.image)}
                              className="view-expenses-image-view"
                            >
                              [View]
                            </Box>
                          </Box>
                        )}
                        {!data.image && (
                          <Box
                            display="flex"
                            justifyContent="flex-start"
                            className={classNames(
                              data.className,
                              "view-expenses-data-value break-word"
                            )}
                          >
                            {!data.value && parseInt(data.value) !== 0 && (
                              <Box style={{ width: "40px" }}>
                                <hr />
                              </Box>
                            )}
                            {data.value !== "" && data.value}
                          </Box>
                        )}
                      </Grid>
                    </Grid>
                  </Grid>
                );
              })}
            </Grid>
            {isUserHasPermission("expenses_create", "update") && (
              <Tooltip title="Edit" placement="top-start">
                <Box className="expense-individual-view-edit">
                  <EditTwoToneIcon
                    onClick={this.handleEdit}
                    className="expense-individual-edit-icon"
                  />
                </Box>
              </Tooltip>
            )}
          </Paper>
        </Paper>
      );
    }
  }
}

export default withRouter(ViewExpenseIndividual);
