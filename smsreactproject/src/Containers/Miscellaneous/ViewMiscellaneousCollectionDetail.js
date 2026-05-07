import React, { Component } from "react";
import { withRouter } from "react-router-dom";
import { Paper, Grid, Box, Button } from "@material-ui/core";
import classNames from "classnames";
import VisibilityOutlinedIcon from "@material-ui/icons/VisibilityOutlined";
import { Link } from "react-router-dom";
import GetAppRoundedIcon from "@material-ui/icons/GetAppRounded";

import LoadingGif from "Components/LoadingGif";
import { getRequest } from "Includes/api/apicall";
import { GET_URL } from "Includes/urls";
import { dateFormat, getFullName } from "Includes/functions";
import { Actions } from "Constants/permissions";
import InvoiceSelection from "Containers/Invoices/FinancePaymentInvoiceSelection";

import AppBar from "@material-ui/core/AppBar";
import Toolbar from "@material-ui/core/Toolbar";
import IconButton from "@material-ui/core/IconButton";
import Typography from "@material-ui/core/Typography";
import CloseIcon from "@material-ui/icons/Close";
import Dialog from "@material-ui/core/Dialog";
import "./styles.scss";
import Slide from "@material-ui/core/Slide";
import Table from "@material-ui/core/Table";
import TableBody from "@material-ui/core/TableBody";
import TableCell from "@material-ui/core/TableCell";
import TableContainer from "@material-ui/core/TableContainer";
import TableHead from "@material-ui/core/TableHead";
import TableRow from "@material-ui/core/TableRow";
import { numberWithCommas } from "Includes/functions";
import { FormattedMessage } from "react-intl";
import messages from "./messages";
import commonMessages from "Constants/messages";

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

class ViewMiscellaneousCollectionDetail extends Component {
  constructor(props) {
    super(props);

    this.state = {
      misc_details: [],
      loading: true,
      miscId: "",
      open: false,
    };
  }

  componentDidMount = () => {
    this.getMiscDetails();
  };

  getMiscDetails = () => {
    if (this.props.location.state) {
      const id = this.props.location.state.detail;
      const url = GET_URL.misc.api + id + "/";
      getRequest(url, {}, this.props).then((response) => {
        if (response && response.status === 200) {
          this.setState(
            {
              miscDetails: response.data.data,
              pageLoading: false,
              miscId: id,
              showInvoicePopUp: false,
            },
            () => {
              this.updateMiscView();
            }
          );
        }
      });
    } else {
      this.props.history.push(Actions.miscellaneous_collection.view.url);
    }
  };

  updateMiscView = () => {
    let { miscDetails } = this.state;
    let misc = miscDetails;
    let paymentDetails = miscDetails["payment_details"];
    let totalAmount = miscDetails["total_amount"];
    let misc_details = [
      { label: "Date", value: dateFormat(misc["date"], "DD-MM-YYYY") },
      {
        label: <FormattedMessage {...commonMessages.receiptNumber} />,
        value: misc["receipt_num"],
      },
      {
        label: <FormattedMessage {...commonMessages.comments} />,
        value: misc["particulars"],
      },
    ];
    if (misc["student_first_name"]) {
      misc_details.push(
        {
          label: <FormattedMessage {...commonMessages.studentName} />,
          value: getFullName(
            misc["student_first_name"],
            misc["student_middle_name"],
            misc["student_last_name"]
          ),
        },
        {
          label: <FormattedMessage {...commonMessages.standard} />,
          value: misc["standard_name"],
        },
        {
          label: <FormattedMessage {...commonMessages.regNum} />,
          value: misc["current_reg_num"],
        }
      );
    } else {
      misc_details.push({
        label: <FormattedMessage {...messages.guestName} />,
        value: misc["guest_name"],
      });
    }
    this.setState({
      misc_details,
      paymentDetails,
      totalAmount,
      loading: false,
    });
  };

  printReciept = () => {
    let { miscId } = this.state;
    let get_url = GET_URL.miscfeereciept.api + miscId + "/";
    let prop = {};
    prop.responseType = "blob";
    getRequest(get_url, {}, prop).then((response) => {
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

  handleClose = () => {
    this.setState({
      open: false,
    });
  };

  render() {
    let {
      misc_details,
      miscDetails,
      paymentDetails,
      totalAmount,
      loading,
      loadComponent,
      showInvoicePopUp,
      open,
    } = this.state;
    if (loading) {
      return <LoadingGif />;
    } else {
      return (
        <Paper className="paper-background">
          <Grid container>
            <Grid item md={8} xs={12} className="header-align">
              <Box className="heading">
                <FormattedMessage {...messages.miscellaneousCollection} />
              </Box>
            </Grid>
            <Grid item md={4} xs={12}>
              <Box className="header-align end-flex-prop">
                <Button
                  variant="contained"
                  component={Link}
                  to={Actions.miscellaneous_collection.view.url}
                  className="editbutton-view"
                >
                  <VisibilityOutlinedIcon className="visibility-icon" />
                  {Actions.miscellaneous_collection.view.label}
                </Button>
              </Box>
            </Grid>
          </Grid>
          <Paper className="header-align expense-individual-paper-background">
            <Grid container className="profileDetail">
              {misc_details.map((data, index) => {
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
                        </Box>
                      </Grid>
                    </Grid>
                  </Grid>
                );
              })}
              {paymentDetails.length > 0 && (
                <>
                  <Grid container>
                    <Grid item md={8} xs={12}>
                      <br />
                      <br />
                      <TableContainer>
                        <Table className="" aria-label="Invoice table">
                          <TableHead>
                            <TableRow style={{ backgroundColor: "#CADFF0" }}>
                              <TableCell>
                                <FormattedMessage
                                  {...messages.miscellaneousType}
                                />
                              </TableCell>
                              <TableCell>Mode Of Payment</TableCell>
                              <TableCell align="right">
                                <FormattedMessage {...commonMessages.amount} />
                              </TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {paymentDetails.map((misc, index) => (
                              <TableRow
                                key={index + "misc"}
                                style={
                                  index % 2
                                    ? { background: "#F5F5F5" }
                                    : { background: "white" }
                                }
                              >
                                <TableCell component="th" scope="row">
                                  {misc["misc_type_name"]}
                                </TableCell>
                                <TableCell component="th" scope="row">
                                  {miscDetails["mode_of_payment"]}
                                </TableCell>
                                <TableCell
                                  component="th"
                                  scope="row"
                                  align="right"
                                >
                                  {numberWithCommas(misc["amount"])}
                                </TableCell>
                              </TableRow>
                            ))}
                            <TableRow>
                              <TableCell component="th" scope="row">
                                <b>
                                  <FormattedMessage {...commonMessages.total} />
                                </b>
                              </TableCell>
                              <TableCell component="th" scope="row"></TableCell>
                              <TableCell
                                component="th"
                                scope="row"
                                align="right"
                              >
                                <b>{numberWithCommas(totalAmount)}</b>
                              </TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Grid>
                  </Grid>
                </>
              )}
            </Grid>
            <Box className="expense-individual-view-edit">
              <Button
                variant="contained"
                color="secondary"
                className="submit print"
                onClick={this.printReciept}
              >
                <GetAppRoundedIcon />
                Print
              </Button>
            </Box>
            {showInvoicePopUp && (
              <Dialog
                fullScreen
                open={open}
                onClose={() => this.handleClose("close")}
                TransitionComponent={Transition}
              >
                <AppBar style={{ position: "relative" }}>
                  <Toolbar>
                    <IconButton
                      edge="start"
                      color="inherit"
                      onClick={() => this.handleClose("close")}
                      aria-label="close"
                    >
                      <CloseIcon />
                    </IconButton>
                    <Typography variant="h6">
                      <FormattedMessage {...commonMessages.invoice} />
                    </Typography>
                  </Toolbar>
                </AppBar>
                <Box>{loadComponent}</Box>
              </Dialog>
            )}
          </Paper>
        </Paper>
      );
    }
  }
}

export default withRouter(ViewMiscellaneousCollectionDetail);
