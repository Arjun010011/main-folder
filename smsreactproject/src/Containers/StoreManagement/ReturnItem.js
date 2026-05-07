import React, { Component } from 'react'
import { withRouter } from 'react-router'
import Swal from 'sweetalert2';
import { Paper, Box, Grid, Button, TextField, FormControl, FormHelperText, CircularProgress } from '@material-ui/core';
import VisibilityOutlinedIcon from '@material-ui/icons/VisibilityOutlined';
import { Link } from 'react-router-dom';
import Snackbar from '@material-ui/core/Snackbar';
import { DropDownWithSearch } from 'Components/DropDownWithSearch';
import loadingBar from 'images/loading.gif'
import { getRequest, postRequest } from 'Includes/api/apicall';
import { GET_URL, PUT_URL, POST_URL } from 'Includes/urls'
import { Actions } from 'Constants/permissions';
import './styles.scss'
import { MuiPickersUtilsProvider, KeyboardDatePicker, } from '@material-ui/pickers';
import DateFnsUtils from '@date-io/date-fns';
import moment from 'moment';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Input from '@material-ui/core/Input';
import { Alert, getUrlParam } from 'Includes/functions';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogTitle from '@material-ui/core/DialogTitle';

class ReturnItem extends Component {
    constructor(props) {
        super(props)

        this.state = {
            returnItemInfo: [],
            itemList: [],
            quantity: '',
            unitPrice: '',
            amount: '',
            returned_quantity: '',
            returnQuantity: '',
            selectedDate: '',
            vendorList: [],
            selectedVendor: '',
            invoicenumber: '',
            invoicedate: '',
            vouchernumber: '',
            returnItemList: [],
            enableAddItem: false,
            addedItems: [],
            alertData: '',
            open: false,
            submitDisable: false,
            fieldError: {},
            helperText: {},
            helperText: {},
            loading: false,
            enableUploadIcons: true,
            isEnable: {},
            alertData: 'Please clear the errors',
            submitDisable: false,
            pageLoading: false,
            isBlankPage: true,
            tableUpdating: false,
            addMoreItems: false,
            isItemDiscarded: false,
            tax: '',
            discount: '',
            totalAmount: '',
            grandTotal: '',
            isEdit: false,
            edit: false,
            dialog: false,
            editItem: [],
            type: '',
            columns: [
                {
                    name: "id",
                    label: "id",
                    options: {
                        filter: true,
                        sort: true,
                        display: false
                    }
                },
                {
                    name: "Serial Number",
                    label: "Sl NO",
                    options: {
                        filter: false,
                        sort: false,
                        search: false,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return (
                                tableMeta.rowIndex + 1
                            )
                        }
                    }
                },
                {
                    name: "selectedItem",
                    label: "Item",
                    options: {
                        filter: true,
                        sort: true,
                    }
                },
                {
                    name: "selectedCategory",
                    label: "Category",
                    options: {
                        filter: true,
                        sort: true,
                        display: true
                    }
                },
                {
                    name: "selectedSubCategory",
                    label: "SubCategory",
                    options: {
                        filter: true,
                        sort: true,
                        display: true
                    }
                },
                {
                    name: "quantity",
                    label: "Quantity",
                    options: {
                        filter: true,
                        sort: true,
                        display: true
                    }
                },
                {
                    name: "unitPrice",
                    label: "UnitPrice",
                    options: {
                        filter: true,
                        sort: true,
                        display: true
                    }
                },
                {
                    name: "amount",
                    label: "Amount",
                    options: {
                        filter: true,
                        sort: true,
                        display: true
                    }
                },
                // {
                //     name: 'Actions',
                //     label: 'Actions',
                //     options: {
                //         display: this.updatePermissions('display'),
                //         filter: true,
                //         sort: true,
                //         customBodyRender: (value, tableMeta, updateValue) => {
                //             return (<div>
                //                 {
                //                     <ActionColumn
                //                         id={tableMeta.rowData[0]}
                //                         fieldValues={this.fieldValues(tableMeta.rowData[2], tableMeta.rowData[3])}
                //                         label='Please Update Category Type Details'
                //                         fieldDetails={fieldDetails}
                //                         updateUrl={PUT_URL.storecategory.api}
                //                         updatePostFormat={this.updatePostFormat}
                //                         updateType={this.updateType}
                //                         deleteUrl={DEL_URL.storecategory.api}
                //                         deleteType={this.deleteType}
                //                         baseClassName='action-basic-detail-width'
                //                         enabledActions={this.state.enabledActions}
                //                     />
                //                 }
                //             </div>
                //             );
                //         }
                //     }
                // }

            ],
        }

    }

    componentDidMount() {
        let { returnId, type } = getUrlParam()
        this.setState({
            returnId: returnId,
            type: type
        }, () => {
            this.getvendorList()
            this.getReturnItemDetails(returnId)
        })
    }

    getvendorList = () => {
        const url = GET_URL.vendor.api
        const params = { is_active: 1 }
        getRequest(url, params, this.props).then(response => {
            if (response && response.status === 200) {
                this.setState({
                    vendorList: response.data.data,
                    loading: false
                })

            }
        })
    }

    getReturnItemDetails = (returnId) => {
        let { returnItemInfo } = this.state
        let url = GET_URL.purchasemaster.api + returnId + '/'
        getRequest(url, {}, this.props).then(response => {
            if (response && response === 200) {
                returnItemInfo = response.data.data
            }
            this.setState({
                returnItemInfo: returnItemInfo
            }, () => {
                this.setAllFeildValues(response.data.data)
            })
        })
    }

    setAllFeildValues = (returnItemInfo) => {
        let { selectedDate, selectedVendor, invoicenumber, invoicedate, vouchernumber, itemList, quantity, unitPrice, amount, vendorList, returned_quantity, totalAmount, tax, discount } = this.state
        selectedDate = moment(returnItemInfo.created).format("DD-MM-YYYY")
        vendorList.map((data) => {
            if (data.id === returnItemInfo.vendor) {
                selectedVendor = data
            }
        })

        invoicenumber = returnItemInfo.invoice_num
        invoicedate = moment(returnItemInfo.stock_date).format("DD-MM-YYYY")
        vouchernumber = returnItemInfo.voucher_num
        returned_quantity = returnItemInfo.returned_quantity ? returnItemInfo.returned_quantity : ''
        returnItemInfo.purchase_master.map((data) => {
            let info = {}
            info = data.stock_details
            info["returnId"] = data.id
            info["quantity"] = data.quantity
            info["unitPrice"] = data.unit_price
            info["amount"] = data.amount
            info["returned_quantity"] = data.returned_quantity ? data.returned_quantity : ''
            itemList.push(info)
        })
        totalAmount = returnItemInfo.total_amount
        tax = returnItemInfo.tax
        discount = returnItemInfo.discount
        this.setState({
            returnItemInfo: returnItemInfo,
            selectedDate: selectedDate,
            selectedVendor: selectedVendor,
            invoicenumber: invoicenumber,
            invoicedate: invoicedate,
            vouchernumber: vouchernumber,
            itemList: itemList,
            quantity: quantity,
            unitPrice: unitPrice,
            amount: amount,
            returned_quantity: returned_quantity,
            totalAmount,
            tax,
            discount
        })
    }

    handleChange = (e, id) => {
        let value = e.target.value
        value = value === '' ? value : parseInt(value)
        let { itemList } = this.state
        itemList.map((data) => {
            if (data.id === id) {
                data['returnQuantity'] = value === 0 ? 0 : value === '' ? '' : value
                let remainingQuantity = data.quantity - (data.returned_quantity ? data.returned_quantity : 0)
                if (value > remainingQuantity) {
                    data['error'] = `can not be greater than ${remainingQuantity}`
                }
                else {
                    data['error'] = ''
                }
            }
        })
        this.setState({
            itemList
        })
    }

    returnItem = () => {
        let { itemList, alertData, returnItemList } = this.state
        let isReturn = false
        let errors = false
        itemList.map((data) => {
            if (data.returnQuantity > 0 && !data.error) {
                isReturn = true
            }
            if (data.error) {
                errors = true
            }
        })
        if (isReturn === false) {
            alertData = errors === true ? 'Please Clear Error' : 'Please Enter Return Quantity'
            this.setState({
                open: true,
                alertData
            })
        }
        else {
            itemList.map((data) => {
                if (data.returnQuantity > 0) {
                    returnItemList.push(data)
                }
            })
            this.setState({
                dialog: true,
                returnItemList
            })
        }
    }

    handleClose = () => {
        this.setState({
            open: false
        })
    }

    handleCloseDialog = () => {
        this.setState({
            dialog: false,
            returnItemList: []
        })
    }

    backToPage = () => {
        this.props.history.push({
            pathname: Actions.store_purchase_items.view.url,
        })
    }

    return = () => {
        let { itemList } = this.state
        let returned = []
        itemList.map((data) => {
            if (data.returnQuantity > 0) {
                let return_info = {}
                return_info = {
                    "id": data.returnId,
                    "quantity": data.returnQuantity,
                    "description": ""
                }
                returned.push(return_info)
            }
        })
        let url = POST_URL.purchasemasterreturn.api
        let post_data = {
            "returned": returned
        }
        postRequest(url, post_data, this.props)
            .then((response) => {
                if (response && response.status === 200) {
                    Swal.fire({
                        position: 'top-end',
                        type: 'success',
                        title: 'Your Data has been saved',
                        showConfirmButton: false,
                        timer: 1500
                    })
                    this.props.history.push(Actions.store_purchase_items.view.url)
                }
                this.setState({ dialog: false })
            });
    }


    render() {
        let { loading, enableUploadIcons, open, alertData, submitDisable, pageLoading, currentdate, selectedDate, fieldError, helperText,
            vendorList, selectedVendor, invoicenumber, invoicedate, vouchernumber, enableAddItem, itemList, addMoreItems,
            type, dialog, returnItemList, totalAmount, tax, discount } = this.state
        if (loading) {
            return (
                <Box display='flex'>
                    <img src={loadingBar} className='loading' alt='loading' />
                </Box>
            )
        }
        else {
            return (
                <div>

                    <Grid container>
                        <Grid item md={8} xs={12} className='header-align'>
                            <Box className='heading'>
                                Purchase View
                            </Box>
                        </Grid>
                        <Grid item md={4} xs={12} >
                            <Box className='header-align end-flex-prop'>
                                {/* {isUserHasPermission('store_purchase_items', 'view') && */}
                                <Button
                                    variant="contained"
                                    component={Link} to={type === 'return' ? Actions.store_purchase_items.view.url : type === 'view' ? Actions.store_purchase_items.view.url : Actions.store_return_items_list.view.url}
                                    className='editbutton-view'
                                ><VisibilityOutlinedIcon className='visibility-icon' /> {type === 'return' ? Actions.store_purchase_items.view.label : type === 'view' ? Actions.store_purchase_items.view.label : Actions.store_return_items_list.view.label}</Button>
                                {/* } */}
                            </Box>
                        </Grid>
                    </Grid>
                    {pageLoading &&
                        <Box className='loading'>
                            <CircularProgress />
                        </Box>
                    }
                    {!pageLoading &&
                        <Box>
                            <Grid container spacing={2}>
                                <Grid item md={12} xs={12}>
                                    <Paper className='paper-plain-background header-align p-t-20px p-b-20px m-t-20px m-b-20px'>
                                        <Grid container spacing={2} >
                                            <Grid item md={5} xs={12}>
                                                <MuiPickersUtilsProvider utils={DateFnsUtils}>
                                                    <KeyboardDatePicker
                                                        className='width-100'
                                                        autoOk
                                                        variant='inline'
                                                        inputVariant="outlined"
                                                        label='Select Date'
                                                        name='selectedDate'
                                                        InputLabelProps={{ shrink: selectedDate ? true : false }}
                                                        format="dd-MM-yyyy"
                                                        value={selectedDate ? selectedDate : ''}
                                                        inputValue={selectedDate}
                                                        required={true}
                                                        disabled={true}
                                                        KeyboardButtonProps={{
                                                            'aria-label': 'change date',
                                                        }}
                                                        helperText={(!fieldError['selectedDate']) ? '' : fieldError['selectedDate']}
                                                        error={fieldError['selectedDate'] ? true : false}
                                                    />
                                                </MuiPickersUtilsProvider>
                                            </Grid>
                                            <Grid item md={5} xs={12}>
                                                <DropDownWithSearch
                                                    id="combo-box-demo"
                                                    options={vendorList}
                                                    value={selectedVendor}
                                                    name='Selected Vendor'
                                                    label='Select Vendor'
                                                    optionValue='name'
                                                    className='width-100'
                                                    defaultValue={selectedVendor}
                                                    disabled={true}
                                                    helperText={selectedVendor ? `` : fieldError['selectedVendor']}
                                                    error={fieldError['selectedVendor']}
                                                />
                                            </Grid>
                                        </Grid>
                                        <Grid container spacing={2} >
                                            <Grid item md={5} xs={12}>
                                                <TextField
                                                    label='Invoice Number'
                                                    name='invoicenumber'
                                                    value={invoicenumber}
                                                    className='width-100'
                                                    fullWidth={true}
                                                    variant="outlined"
                                                    required={true}
                                                    disabled={true}
                                                    helperText={fieldError['invoicenumber'] === '' ? helperText['invoicenumber'] : fieldError['invoicenumber']}
                                                    error={fieldError['invoicenumber']}
                                                />
                                            </Grid>
                                            <Grid item md={5} xs={12} className='margin-top-15'>
                                                <MuiPickersUtilsProvider utils={DateFnsUtils}>
                                                    <KeyboardDatePicker
                                                        autoOk
                                                        variant='inline'
                                                        inputVariant='outlined'
                                                        label='Select Invoice Date'
                                                        fullWidth
                                                        name='invoicedate'
                                                        format='dd-MM-yyyy'
                                                        value={invoicedate}
                                                        inputValue={invoicedate}
                                                        defaultValue={invoicedate}
                                                        InputLabelProps={{ shrink: invoicedate ? true : false }}
                                                        disabled={true}
                                                        required={true}
                                                        KeyboardButtonProps={{
                                                            'aria-label': 'change date',
                                                        }}
                                                        helperText={(!fieldError['invoicedate']) ? '' : fieldError['invoicedate']}
                                                        error={fieldError['invoicedate'] ? true : false}
                                                    />
                                                </MuiPickersUtilsProvider>
                                            </Grid>
                                        </Grid>
                                        <Grid container spacing={2} >
                                            <Grid item md={5} xs={12}>
                                                <TextField
                                                    label='Voucher Number'
                                                    name='vouchernumber'
                                                    value={vouchernumber}
                                                    className='width-100'
                                                    fullWidth={true}
                                                    variant="outlined"
                                                    required={false}
                                                    disabled={true}
                                                    helperText={fieldError['vouchernumber'] === '' ? helperText['vouchernumber'] : fieldError['vouchernumber']}
                                                    error={fieldError['vouchernumber']}

                                                />
                                            </Grid>
                                        </Grid>
                                        {itemList &&
                                            <Grid className='padding-top-25'>
                                                <TableContainer component={Paper}>
                                                    <Table aria-label="simple table">
                                                        <TableHead className='table-header-color'>
                                                            <TableRow>
                                                                <TableCell>Item</TableCell>
                                                                <TableCell >Category</TableCell>
                                                                <TableCell >SubCategory</TableCell>
                                                                <TableCell >Quantity</TableCell>
                                                                <TableCell >UnitPrice</TableCell>
                                                                <TableCell >Amount</TableCell>
                                                                <TableCell >Returned Quantity</TableCell>
                                                                {type === 'return' &&
                                                                    <TableCell >Return Quantity</TableCell>
                                                                }
                                                            </TableRow>
                                                        </TableHead>
                                                        <TableBody>
                                                            {itemList.map((row) => (
                                                                <TableRow key={row.name}>
                                                                    <TableCell >{row.item_name}</TableCell>
                                                                    <TableCell >{row.category_name}</TableCell>
                                                                    <TableCell >{row.sub_category_name}</TableCell>
                                                                    <TableCell >{row.quantity}</TableCell>
                                                                    <TableCell >{row.unitPrice}</TableCell>
                                                                    <TableCell >{row.amount}</TableCell>
                                                                    <TableCell align="center">
                                                                        {row.returned_quantity ? row.returned_quantity : '-'}
                                                                    </TableCell>
                                                                    {type === 'return' &&
                                                                        <TableCell align="center" className='error-width'>
                                                                            <FormControl >
                                                                                <Input
                                                                                    id="standard-adornment-amount"
                                                                                    value={row.returnQuantity ? row.returnQuantity : ''}
                                                                                    onChange={(e) => this.handleChange(e, row.id)}
                                                                                    autoComplete="off"
                                                                                />
                                                                                {row.error &&
                                                                                    <FormHelperText className='error-color'>{row.error ? row.error : ''}</FormHelperText>
                                                                                }
                                                                            </FormControl>
                                                                        </TableCell>
                                                                    }

                                                                </TableRow>
                                                            ))}
                                                        </TableBody>
                                                    </Table>
                                                </TableContainer>
                                            </Grid>
                                        }
                                        {itemList.length != 0 && type === 'return' &&
                                            <Grid container spacing={2} className='return-Button'>
                                                <Button variant="contained" color="primary"
                                                    disabled={submitDisable ? submitDisable : !enableUploadIcons}
                                                    onClick={() => this.returnItem()}
                                                >
                                                    Return Item &nbsp;{' '}
                                                </Button>

                                                <Button variant="outlined" className='margin-left-20' color="Secondary" onClick={() => this.backToPage()}>
                                                    Cancel
                                                </Button>
                                            </Grid>
                                        }

                                        {itemList.length != 0 && type === "view" &&
                                            <Grid md={5} xs={12} className='padding-top-25'>
                                                <TableContainer component={Paper}>
                                                    <Table aria-label="simple table">
                                                        <TableHead >
                                                            <TableRow>
                                                                <TableCell>Total Amount</TableCell>
                                                                <TableCell >{totalAmount}</TableCell>
                                                            </TableRow>
                                                            <TableRow>
                                                                <TableCell >Tax</TableCell>
                                                                <TableCell >{tax}</TableCell>
                                                            </TableRow>
                                                            <TableRow>
                                                                <TableCell >Discount</TableCell>
                                                                <TableCell >{discount}</TableCell>
                                                            </TableRow>
                                                            <TableRow>
                                                                <TableCell className='grand-total'>Grand Total</TableCell>
                                                                <TableCell className='grand-total'>{totalAmount}</TableCell>
                                                            </TableRow>
                                                        </TableHead>
                                                    </Table>
                                                </TableContainer>
                                            </Grid>
                                        }
                                    </Paper>
                                </Grid>
                            </Grid>
                            <Dialog
                                open={dialog}
                                onClose={this.handleCloseDialog}
                                aria-labelledby="draggable-dialog-title"
                            >
                                <DialogTitle style={{ cursor: 'move' }} id="draggable-dialog-title">
                                    Returning Items
                                </DialogTitle>
                                <DialogContent>
                                    <Grid >
                                        <TableContainer component={Paper}>
                                            <Table aria-label="simple table">
                                                <TableHead className='table-header-color'>
                                                    <TableRow>
                                                        <TableCell>Item</TableCell>
                                                        <TableCell >Category</TableCell>
                                                        <TableCell >SubCategory</TableCell>
                                                        <TableCell >Return Quantity</TableCell>
                                                    </TableRow>
                                                </TableHead>
                                                <TableBody>
                                                    {returnItemList.map((row) => (
                                                        <TableRow key={row.name}>
                                                            <TableCell >{row.item_name}</TableCell>
                                                            <TableCell >{row.category_name}</TableCell>
                                                            <TableCell >{row.sub_category_name}</TableCell>
                                                            <TableCell align="center">{row.returnQuantity}</TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </TableContainer>
                                    </Grid>
                                </DialogContent>
                                <DialogActions>
                                    <Button autoFocus onClick={this.handleCloseDialog} color="primary">
                                        Cancel
                                    </Button>
                                    <Button onClick={this.return} color="primary">
                                        Return
                                    </Button>
                                </DialogActions>
                            </Dialog>
                        </Box>
                    }

                    <Snackbar anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} open={open} autoHideDuration={2000} onClose={this.handleClose}>
                        <Alert onClose={this.handleClose} severity="error">
                            {alertData}
                        </Alert>
                    </Snackbar>
                </div>
            )
        }
    }
}

export default withRouter(ReturnItem)
