import React, { Component } from "react";
import { withRouter } from "react-router-dom";
import { Grid, Button, Paper, Box, TextField, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions, Typography, CircularProgress, } from "@material-ui/core/";
import AllMUIDataTable from "Components/AllMUIDataTable";
import InfoIcon from "@material-ui/icons/Info";
import ActionColumn from "Components/ActionColumnNew";
import { getRequest, postRequest } from "Includes/api/apicall";
import { GET_URL, PUT_URL, DEL_URL } from "Includes/urls";
import { DATATABLEROWSPERPAGEOPT } from "Constants";
import { updatePermissions, getPaginationProps } from "Includes/functions";
import { Dropdown } from "Components/DropDown";
import { DEFAULT_PAGINATION_PROPS_ID_LIST } from "Constants";
import index from "Components/PhoneNumber";
import ToggleButtonGroup from "@material-ui/lab/ToggleButtonGroup";
import ToggleButton from "@material-ui/lab/ToggleButton";
import id from "date-fns/esm/locale/id";

class RefundAmount extends Component {
    constructor() {
        super();
        this.permission = updatePermissions('refundamount', ['update', 'delete', 'add']);
        this.state = {
            OnlinePaymentList: [],
            statusList: [],
            dialogOpen: false,
            selectedRowData: null,
            selectedStatus: "",
            tab: 1,
            online_payment: null,
            comments: "",
            pagination: { ...DEFAULT_PAGINATION_PROPS_ID_LIST },
            columns: [
                {
                    name: "online_payment_done_user_name",
                    label: "Student Name",
                    options: {
                        filter: false,
                        sort: false,
                        viewColumns: false,
                        display: true,
                    },
                },
                {
                    name: "id",
                    label: "id",
                    options: {
                        filter: false,
                        sort: false,
                        viewColumns: false,
                        display: false,
                    },
                },
                {
                    name: "order_id",
                    label: "Order ID",
                    options: {
                        filter: false,
                        sort: true,
                        viewColumns: false,
                        display: true,
                    },
                },
                {
                    name: "total_online_payment_amount",
                    label: "Amount",
                    options: {
                        filter: false,
                        sort: true,
                        viewColumns: false,
                        display: true,
                    },
                },
                {
                    name: "payment_status",
                    label: "Payment Status",
                    options: {
                        filter: false,
                        sort: true,
                        viewColumns: false,
                        display: true,
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
                                <div className="d-flex flex-justify-center-flex-prop">
                                    <Button
                                        variant="contained"
                                        color="primary"
                                        size="small"
                                        onClick={() => this.printReciept(tableMeta.rowData[1])}
                                        className="mr-2"
                                        style={{ marginRight: "30px" }}
                                    >
                                        Print
                                    </Button>
                                    <Button
                                        variant="contained"
                                        color="primary"
                                        size="small"
                                        onClick={() => this.handleActionButtonClick(tableMeta.rowData)}
                                    >
                                        Refund
                                    </Button>
                                </div>
                            );
                        },
                    },
                }

            ],
        }
    }

    async componentDidMount() {
        this.getPaymentAmount();
        this.getStatusdropdown();
    }


    printReciept = (id) => {
        let { printLoading } = this.state;
        let printTemp = { ...printLoading };
        printTemp[id] = true;
        this.setState({ printLoading: { ...printTemp } });
        let get_url = GET_URL.feecollection.api + id + "/";
        let prop = {};
        prop.responseType = "blob";
        getRequest(get_url, {}, prop).then((response) => {
            let printTemp = { ...printLoading };
            delete printTemp[id];
            this.setState({ printLoading: printTemp });
            if (response && response.status === 200) {
                let Data = new Blob([response.data], { type: "application/pdf" });
                let fileURL = URL.createObjectURL(Data);
                const height = (window.screen.height * 90) / 100;
                const width = (window.screen.width * 80) / 100;
                const mywindow = window.open(
                    fileURL,
                    "PRINT",
                    "height=" + height + ",width=" + width + ""
                );
                mywindow.print();
                mywindow.onafterprint = mywindow.close;
            }
        });
    };

    handleActionButtonClick = (rowData) => {
        this.setState({
            dialogOpen: true,
            selectedRowData: rowData,
        });
    };

    getPaymentAmount = (paginationProps) => {
        const url = GET_URL['order-online-payment'].api;
        const { selectedStatus, pagination, } = this.state;
        this.currentPagination = pagination;
        if (paginationProps && paginationProps !== "download") {
            this.currentPagination = { ...paginationProps };
        }
        let pagination_params = getPaginationProps(this.currentPagination);
        const params = { ...pagination_params, is_active: true };
        if (selectedStatus && selectedStatus !== 'all') {
            params["Status"] = selectedStatus;
        }
        getRequest(url, params, this.props).then((response) => {
            if (response && response.status === 200) {
                this.setState({
                    OnlinePaymentList: response.data.data,
                    loading: false,
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


    handleDialogClose = () => {
        this.setState({
            dialogOpen: false,
            selectedRowData: null,
        });
    };

    handleCategoryChange = (e) => {
        const selectedId = e.target.value;
        this.setState({ selectedStatus: selectedId }, () => {
            this.getPaymentAmount();
        });
    };

    options = {
        filterType: "dropdown",
        responsive: "scroll",
        filter: false,
        download: false,
        print: false,
        viewColumns: false,
        // rowsPerPageOptions: DATATABLEROWSPERPAGEOPT,
        rowsPerPageOptions: [5, 10, 25, 50, 100],
        rowsPerPage: 10,
        selectableRows: "none",
    };

    handleRefund = () => {
        const { selectedRowData, comments } = this.state;
        const refundPayload = {
            online_payment: selectedRowData[1],
            comments: comments,
        };
        const url = PUT_URL.refundrequest.api;
        postRequest(url, refundPayload, this.props)
            .then((response) => {
                if (response && response.status === 200) {
                    this.handleDialogClose();
                }
            })
    };

    render() {
        const { loading,
            OnlinePaymentList,
            statusList,
            columns,
            loadingBar,
            dialogOpen,
            selectedRowData,
            selectedStatus,
            pagination
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
                    <Paper className={"paper-background"}>
                        <Grid container>
                            <Grid item md={7} xs={12} sm={12}>
                                <Box className="header-align heading">Online Payment List</Box>
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
                                data={OnlinePaymentList}
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
                        <DialogTitle id="refund-dialog-title">Refund Confirmation</DialogTitle>
                        <DialogContent>
                            {selectedRowData && (
                                <>
                                    <Typography>
                                        Are you sure you want to process a refund for:
                                    </Typography>
                                    <Typography>
                                        <b>Amount:</b> {selectedRowData[3]}
                                    </Typography>
                                    <TextField
                                        className={"w-webkit-fill-available"}
                                        variant="outlined"
                                        label="Comments"
                                        InputLabelProps={{ shrink: true }}
                                        minRows={2}
                                        maxRows={5}
                                        multiline
                                        autoFocus
                                        value={this.comments}
                                        inputProps={{ maxLength: 200 }}
                                        onChange={(e) => this.setState({ comments: e.target.value })}
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
}
export default withRouter(RefundAmount);