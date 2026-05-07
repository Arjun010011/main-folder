import React, { Component } from "react";
import { withRouter } from "react-router-dom";
import {
  Grid,
  Button,
  Paper,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  TextField,
} from "@material-ui/core/";
import AllMUIDataTable from "Components/AllMUIDataTable";
import { getRequest, postRequest } from "Includes/api/apicall";
import { GET_URL, POST_URL, PUT_URL } from "Includes/urls";
import { DATATABLEROWSPERPAGEOPT } from "Constants";
import { updatePermissions, getPaginationProps } from "Includes/functions";
import { DEFAULT_PAGINATION_PROPS_ID_LIST } from "Constants";
import { Dropdown } from "Components/DropDown";

class RefundAmount extends Component {
  constructor() {
    super();
    this.permission = updatePermissions("refundamount", [
      "update",
      "delete",
      "add",
    ]);
    this.state = {
      refundRequestList: [],
      statusList: [],
      dialogOpen: false,
      selectedRowData: null,
      selectedRefundlist: "",
      tab: 1,
      online_payment: null,
      selectedStatus: "",
      comments: "",
      pagination: { ...DEFAULT_PAGINATION_PROPS_ID_LIST },
      columns: [
        {
          name: "id",
          label: "ID",
          options: {
            filter: false,
            sort: false,
            viewColumns: false,
            display: false,
          },
        },
        {
          name: "name_of_refund_requested_user",
          label: "Request Raised By",
          options: {
            filter: false,
            sort: true,
            display: true,
          },
        },
        {
          name: "mode_of_payment",
          label: "Mode Of Payment",
          options: {
            filter: false,
            sort: true,
            customBodyRender: (value, tableMeta) => {
                const payment_mode =tableMeta.tableData[tableMeta.rowIndex].online_payment_data?.mode_of_payment;
                return payment_mode;
            },
          },
        },        
        {
          name: "refund_request_amount",
          label: "Amount",
          options: {
            filter: false,
            sort: true,
          },
        },
        {
          name: "online_payment_done_user_name",
          label: "Payment Done By",
          options: {
            filter: false,
            sort: true,
          },
        },
        {
          name: "Actions",
          label: "Actions",
          options: {
            filter: false,
            sort: false,
            customBodyRender: (value, tableMeta) => {
              return (
                <Button
                  variant="contained"
                  color="primary"
                  size="small"
                  onClick={() =>
                    this.handleActionButtonClick(tableMeta.rowData)
                  }
                >
                  Refund
                </Button>
              );
            },
          },
        },
      ],
    };
  }

  async componentDidMount() {
    this.getRefundRequest();
    this.getStatusdropdown();
  }

  handleActionButtonClick = (rowData) => {
    this.setState({
      dialogOpen: true,
      selectedRowData: rowData,
    });
  };

  handleDialogClose = () => {
    this.setState({
      dialogOpen: false,
      selectedRowData: null,
      comments: "",
    });
  };

  handleRefund = () => {
    const {refundRequestList } = this.state;
    let onlinePaymentId;
    refundRequestList.forEach((request) => {
      onlinePaymentId = request.online_payment;
    });    
    console.log(onlinePaymentId,"onlinePaymentId")
    const refundPayload = {
      online_payment: onlinePaymentId,
    }; 
    const url = PUT_URL.refundrequest.api;
    postRequest(url, refundPayload, this.props)
      .then((response) => {
        if (response && response.status === 200) {
          this.handleDialogClose();
        }
      })
  };

  getRefundRequest = (paginationProps) => {
    const url = GET_URL.refundrequest.api;
    const { selectedStatus, pagination } = this.state;
    this.currentPagination = pagination;
    if (paginationProps && paginationProps !== "download") {
      this.currentPagination = { ...paginationProps };
    }
    let pagination_params = getPaginationProps(this.currentPagination);
    const params = { ...pagination_params};
    if (selectedStatus && selectedStatus !== 'all') {
      params["Status"] = selectedStatus;
    }
    getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        this.setState({
          refundRequestList: response.data.data,
          pagination: this.currentPagination
            ? this.currentPagination
            : this.state.pagination,
        });
      }
    });
  };

  getStatusdropdown = () => {
    const url = GET_URL.refundrequesttypes.api;
    const params = { is_active: true };
    getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        let temp = { id: "all", name: "All" };
        const statusdata = response.data.data.map((item) => ({
          id: item.status,
          name: item.status_name,
        }));
        this.setState({
          statusList: [temp, ...statusdata],
          loading: false,
          selectedStatus: "all",
        });
      }
    });
  };

  handleCategoryChange = (e) => {
    const selectedId = e.target.value;
    this.setState({ selectedStatus: selectedId },
      () => {
        this.getRefundRequest();
      });
  };

  options = {
    filterType: "dropdown",
    responsive: "scroll",
    filter: false,
    download: false,
    print: false,
    viewColumns: false,
    rowsPerPageOptions: [5, 10, 25, 50, 100],
    rowsPerPage: 10,
    selectableRows: "none",
  };

  render() {
    const {
      refundRequestList,
      statusList,
      selectedStatus,
      columns,
      dialogOpen,
      selectedRowData,
      comments,
      pagination,
    } = this.state;
    return (
      <Box>
        <Paper className="paper-background">
          <Grid container>
            <Grid item md={7} xs={12} sm={12}>
              <Box className="header-align heading">Refund Amount</Box>
            </Grid>
          </Grid>
          <div className="ml-10">
            <Dropdown
              customId="id"
              data={statusList}
              name="statusList"
              value={selectedStatus}
              onChange={this.handleCategoryChange}
              label={"Refund Status"}
              hideSelect={true}
              size="small"
              className="width-350px"
            />
          </div>
          <Grid container className="header-align">
            <AllMUIDataTable
              data={refundRequestList}
              columns={columns}
              pagination={pagination}
              options={this.options}
            />
          </Grid>
        </Paper>

        <Dialog
          open={dialogOpen}
          onClose={this.handleDialogClose}
          aria-labelledby="refund-dialog-title"
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle id="refund-dialog-title">Refund Requested for BillDesk</DialogTitle>
          <DialogContent>
            {selectedRowData && (
              <>
                <Typography>
                  Are you sure you want to process a refund for:
                </Typography>
                <Typography>
                  <b>Name:</b> {selectedRowData[1]}
                </Typography>
                <Typography>
                  <b>Amount:</b> {selectedRowData[3]}
                </Typography>
                <TextField
                  label="Comments"
                  value={comments}
                  onChange={(e) =>
                    this.setState({ comments: e.target.value })
                  }
                  fullWidth
                  margin="normal"
                />
              </>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={this.handleDialogClose} color="secondary">
              Cancel
            </Button>
            <Button onClick={this.handleRefund} color="primary" variant="contained">
              Confirm
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    );
  }
}

export default withRouter(RefundAmount);
