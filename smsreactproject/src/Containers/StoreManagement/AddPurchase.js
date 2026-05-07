import React, { Component } from 'react'
import Swal from 'sweetalert2';
import { withRouter } from 'react-router-dom';
import {
    Paper, Box, Grid, Button, Table, TableContainer, TableHead, TableRow, TableCell, TableBody, TextField, Tooltip,
    FormControl, TextareaAutosize, FormHelperText, CircularProgress
} from '@material-ui/core';
import VisibilityOutlinedIcon from '@material-ui/icons/VisibilityOutlined';
import { Link } from 'react-router-dom';
import DeleteOutlineIcon from '@material-ui/icons/DeleteOutline';
import EditOutlinedIcon from '@material-ui/icons/EditOutlined';
import AddCircleOutlineIcon from '@material-ui/icons/AddCircleOutline';
import Snackbar from '@material-ui/core/Snackbar';
import DeleteIcon from '@material-ui/icons/Delete';

import { maxFileSize } from 'Constants'
import { supported_receipts, image_formats } from 'Containers/Expenses/Constants';
import AddStockItemStore from 'Containers/StoreManagement/Components/AddStockItemStore';
import { numberRegex, nameAndNumberWithSpecialCharacterRegex  } from 'Constants/regularExpression'
import loadingBar from 'images/loading.gif'
import { getRequest, postRequest, putRequest } from 'Includes/api/apicall';
import { GET_URL, POST_URL, PUT_URL } from 'Includes/urls'
import { Alert, isUserHasPermission, dateFormat } from 'Includes/functions';
import DynamicForm from 'Components/DynamicForm';
import './styles.scss';
import { Actions } from 'Constants/permissions';
import _ from 'lodash';
import { FormattedMessage } from 'react-intl';
import messages from './messages';
import commonMessages from 'Constants/messages';
import { minDate } from 'Constants';

const isEqual = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const addStockItem_global = [
    {
        label: <FormattedMessage {...commonMessages.date} />, regex: null, name: 'stock_date', md: 4, className: 'width-form-100 h-40px', required: true,
        id: 'outlined-textarea', default: '', rows: null, type: 'date', maxLength: 25, minDate: minDate, maxDate: new Date()
    },
    {
        label: <FormattedMessage {...messages.storeVendorName} />, regex: null, name: 'vendor', md: 4, className: 'width-form-100 h-40px', required: true,
        id: 'outlined-textarea', default: '', rows: null, type: 'dropDownWithSearch', maxLength: 25, hideClearIcon: true,
        view_name: 'name'
    },
    {
        label: <FormattedMessage {...messages.storeVoucherNum} />, regex: nameAndNumberWithSpecialCharacterRegex , name: 'voucher_num', md: 4, className: 'width-form-100 h-40px', required: false,
        id: 'outlined-textarea', default: '', rows: null, type: 'text', maxLength: 30,
    },
    {
        label: <FormattedMessage {...commonMessages.invoiceNumber} />, regex: nameAndNumberWithSpecialCharacterRegex , name: 'invoice_num', md: 4, className: 'width-form-100 h-40px', required: true,
        id: 'outlined-textarea', default: '', rows: null, type: 'text', maxLength: 30,
    },
    {
        label: <FormattedMessage {...commonMessages.invoiceDate} />, regex: null, name: 'invoice_date', md: 4, className: 'width-form-100 h-40px', required: true,
        id: 'outlined-textarea', default: '', rows: null, type: 'date', maxLength: 3, minDate: minDate, maxDate: new Date()
    },
]

class AddStockItems extends Component {

    constructor(props) {
        super(props)

        this.state = {
            stockItemFieldDetails: null,
            isEditForm: false,
            openError: '',
            alertData: '',
            stockItem: {},
            propertyList: [],
            fieldErrors: {},
            propertiesList: [],
            stockItemDetails: { upload_name: 'Upload Receipt', tax: 0, discount: 0 },
            propertyValueList: {},
            selectedItem: {},
            stockItemList: [{ item: '', category: '', sub_category: '', quantity: '', unit_price: '', amount: '' }],
            vendorsList: [],
            loading: true,
            itemIndex: '',
            enableUploadIcons: true
        }
    }

    componentDidMount = () => {
        this.getVendorsList()
        this.addItemStoreRef = React.createRef();
    }

    getVendorsList = () => {
        const url = GET_URL.vendor.api
        const params = { is_active: 1 }
        getRequest(url, params, this.props).then(response => {
            if (response && response.status === 200) {
                this.setState({
                    vendorsList: response.data.data,
                }, () => {
                    this.updateStockItemFieldDetails()
                })
            }
        })
    }

    updateStockItemFieldDetails = () => {
        let { stockItemDetails, vendorsList } = this.state
        let fieldDetail = _.cloneDeep(addStockItem_global)
        let value
        fieldDetail.forEach((field) => {
            value = field.default
            field.default = value
            if (field.name === 'vendor') {
                field.list = vendorsList
            }
            stockItemDetails[field['name']] = value
        })
        this.setState({
            stockItemDetails,
            stockItemFieldDetails: fieldDetail,
            loading: false
        })
    }

    updateStockItemDetails = (name, value) => {
        let { stockItemDetails, fieldErrors } = this.state
        stockItemDetails[name] = value
        fieldErrors[name] = ''
        this.setState({
            stockItemDetails,
        })
    }

    validateDuplicate = () => {
        let { fieldErrors, stockItemList, alertData } = this.state;
        let returnValue = true
        let returnItemDetails = []
        alertData = 'Clear Error(s)'
        for (let pIndex = 0; pIndex < stockItemList.length; pIndex++) {
            let temp = {}
            for (let cIndex = 0; cIndex < stockItemList.length; cIndex++) {
                if (stockItemList[pIndex].item === stockItemList[cIndex].item &&
                    pIndex !== cIndex && isEqual(stockItemList[pIndex].property_value, stockItemList[cIndex].property_value)) {
                    fieldErrors[`item${pIndex}`] = <FormattedMessage {...commonMessages.duplicateFoundLabel} />
                    returnValue = false
                    alertData = <FormattedMessage {...commonMessages.duplicateFoundLabel} />
                }
            }
            if (!stockItemList[pIndex].item) {
                fieldErrors[`item${pIndex}`] = <FormattedMessage {...commonMessages.enterValue} />
                returnValue = false
                alertData = 'Please Select Item'
            }
            if (!stockItemList[pIndex].quantity) {
                fieldErrors[`quantity${pIndex}`] = <FormattedMessage {...commonMessages.enterValue} />
                returnValue = false
            }
            else if (!numberRegex.value.test(stockItemList[pIndex].quantity)) {
                fieldErrors[`quantity${pIndex}`] = 'Invalid Number'
                returnValue = false
            }
            if (!stockItemList[pIndex].unit_price) {
                fieldErrors[`unit_price${pIndex}`] = <FormattedMessage {...commonMessages.enterValue} />
                returnValue = false
            }
            else if (!numberRegex.value.test(stockItemList[pIndex].unit_price)) {
                fieldErrors[`unit_price${pIndex}`] = 'Invalid Number'
                returnValue = false
            }
            temp['quantity'] = stockItemList[pIndex].quantity
            temp['unit_price'] = stockItemList[pIndex].unit_price
            // temp['sub_category'] = stockItemList[pIndex].sub_category
            // temp['category'] = stockItemList[pIndex].category
            // temp['property_value'] = stockItemList[pIndex].property_value
            temp['amount'] = this.getAmount(pIndex)
            temp['tax'] = stockItemList[pIndex].tax ? stockItemList[pIndex].tax : 0
            temp['stock'] = stockItemList[pIndex].id
            returnItemDetails.push(temp)
        }
        this.setState({
            fieldErrors,
            alertData,
            openError: returnValue === false ? true : false
        })
        if (returnValue) {
            returnValue = returnItemDetails
        }
        return returnValue
    }

    handleAddProperty = () => {
        let { fieldErrors, stockItemList } = this.state;
        let validate = this.validateDuplicate()
        if (validate) {
            let temp = { item: '', category: '', sub_category: '', quantity: '', unit_price: '', amount: '' }
            stockItemList.push(temp)
            this.setState({
                stockItemList,
                fieldErrors
            })
        }
    }

    handleDeleteProperty = (index) => {
        let { fieldErrors, stockItemList } = this.state;
        stockItemList.splice(index, 1)
        fieldErrors = {}
        this.setState({
            stockItemList,
            fieldErrors
        })
    }


    selectedItem = (selectedItem) => {
        let { stockItemList, itemIndex } = this.state;
        stockItemList[itemIndex]['id'] = selectedItem.id
        stockItemList[itemIndex]['category'] = selectedItem.category
        stockItemList[itemIndex]['category_name'] = selectedItem.category_name
        stockItemList[itemIndex]['item'] = selectedItem.item
        stockItemList[itemIndex]['item_code'] = selectedItem.item_code
        stockItemList[itemIndex]['item_name'] = selectedItem.item_name
        stockItemList[itemIndex]['property_value'] = selectedItem.property_value
        stockItemList[itemIndex]['property_values'] = selectedItem.property_values
        stockItemList[itemIndex]['sub_category'] = selectedItem.sub_category
        stockItemList[itemIndex]['sub_category_name'] = selectedItem.sub_category_name
        this.setState({
            stockItemList,
            fieldErrors: {}
        })
    }

    openItemList = (itemIndex) => {
        this.setState({
            itemIndex
        }, () => {
            this.addItemStoreRef.current.openModal();
        })
    }

    validationAndPostData = () => {
        let { stockItemDetails, stockItemFieldDetails, fieldErrors } = this.state;
        let validateValue = true
        let returnValue = true
        let postData = {}
        stockItemFieldDetails.map((field) => {
            let value = stockItemDetails[field.name];
            let name = field.name;
            if (field.required && !Boolean(value)) {
                fieldErrors[name] = <FormattedMessage {...commonMessages.fieldMandatoryError} />
                validateValue = false
            }
            else if (field.dependentParent && stockItemDetails[field.dependentParent] && !Boolean(value)) {
                fieldErrors[name] = <FormattedMessage {...commonMessages.fieldMandatoryError} />
                validateValue = false
            }
            else if (field.regex && !field.regex.value.test(value) && Boolean(value)) {
                fieldErrors[name] = field.regex.errorText;
                validateValue = false
            }
        })
        let duplicateValue = this.validateDuplicate()
        if (!validateValue) {
            this.refs.stock_item.updateErrors(fieldErrors)
        }
        if (!duplicateValue || !validateValue) {
            returnValue = false
        }
        else {
            postData['vendor'] = stockItemDetails['vendor'].id
            postData['voucher_num'] = stockItemDetails['voucher_num']
            postData['invoice_num'] = stockItemDetails['invoice_num']
            postData['invoice_date'] = dateFormat(stockItemDetails['invoice_date'], 'YYYY-MM-DD')
            postData['stock_date'] = dateFormat(stockItemDetails['stock_date'], 'YYYY-MM-DD')
            postData['comment'] = stockItemDetails['comment']
            postData['attachment'] = stockItemDetails['receipt']
            postData['amount'] = this.getTotalAmount()
            postData['tax'] = stockItemDetails['tax']
            postData['discount'] = stockItemDetails['discount']
            postData['total_amount'] = this.getGrandTotal()
            postData['purchase_stock'] = duplicateValue
            returnValue = postData
        }
        this.setState({
            fieldErrors,
        })
        return returnValue
    }

    submit = () => {
        let postData = this.validationAndPostData()
        if (postData) {
            this.setState({ submitDisable: true })
            let url = POST_URL.purchasemaster.api
            postRequest(url, postData, this.props)
                .then((response) => {
                    if (response && response.status === 200) {
                        Swal.fire({
                            position: 'top-end',
                            type: 'success',
                            title: response.data.Reason,
                            showConfirmButton: false,
                            timer: 1500
                        })
                        this.props.history.push(Actions.store_purchase_items.view.url)
                    }
                    this.setState({ submitDisable: false })
                });
        }
    }

    handleClose = () => {
        this.setState({
            openError: false
        })
    }

    getGrandTotal = () => {
        let { stockItemDetails } = this.state
        let tax = stockItemDetails['tax'] ? stockItemDetails['tax'] : 0
        let discount = stockItemDetails['discount'] ? stockItemDetails['discount'] : 0
        let total = ''
        if (parseInt(tax) >= 0 && parseInt(discount) >= 0) {
            total = this.getTotalAmount()
            total = parseInt(parseInt(total) + parseInt(tax)) - parseInt(discount)
        }
        return total
    }


    onChangeFieldValue = (e, index) => {
        let { stockItemList, fieldErrors } = this.state;
        let { name, value } = e.target;
        stockItemList[index][name] = value
        if (!numberRegex.value.test(value)) {
            fieldErrors[`${name}${index}`] = 'Invalid Number'
        }
        else {
            fieldErrors[`${name}${index}`] = ''
        }
        this.setState({
            stockItemList,
            fieldErrors
        })

    }

    getAmount = (index) => {
        const { stockItemList } = this.state;
        let total = ''
        if (stockItemList[index].quantity && stockItemList[index].unit_price && parseInt(stockItemList[index].quantity) > 0 &&
            parseInt(stockItemList[index].unit_price) > 0) {
            total = parseInt(stockItemList[index].quantity) * parseInt(stockItemList[index].unit_price)
        }

        return total
    }

    getTotalAmount = () => {
        const { stockItemList } = this.state;
        let total = 0
        for (let index = 0; index < stockItemList.length; index++) {
            if (parseInt(this.getAmount(index))) {
                total = parseInt(this.getAmount(index)) + parseInt(total)
            }
        }
        return total
    }

    handleChange(event, acceptFileType) {
        let { stockItemDetails, enableUploadIcons } = this.state
        this.setState({ enableUploadIcons: false })
        let fileName = event.target.files[0]['name']
        let file_extension = `${fileName.slice((Math.max(0, fileName.lastIndexOf(".")) || Infinity) + 1)}`;
        let is_supported_types = true
        is_supported_types = supported_receipts.type.includes(file_extension.toLowerCase())
        if (event.target.files[0] && is_supported_types) {
            if (event.target.files[0].size < maxFileSize[acceptFileType].size) {
                let post = new FormData();
                post.append('file', event.target.files[0])
                if (stockItemDetails['receipt']) {
                    const url = PUT_URL.uploads.api + stockItemDetails['receipt'] + '/'
                    putRequest(url, post, this.props).then(response => {
                        if (response && response.status === 200) {
                            stockItemDetails['receipt'] = response.data.data.id
                            stockItemDetails['receipt_preview'] = response.data.data.file
                            stockItemDetails['receipt_extension'] = file_extension.toLowerCase()
                            stockItemDetails['receipt_name'] = fileName
                            this.setState({
                                stockItemDetails,
                                upload_name: 'Change Receipt'
                            })
                        }
                    })
                }
                else {
                    const url = POST_URL.uploads.api
                    postRequest(url, post, this.props).then(response => {
                        if (response && response.status === 200) {
                            stockItemDetails['receipt'] = response.data.data.id
                            stockItemDetails['receipt_preview'] = response.data.data.file
                            stockItemDetails['receipt_extension'] = file_extension.toLowerCase()
                            stockItemDetails['receipt_name'] = fileName
                            this.setState({
                                stockItemDetails,
                                upload_name: 'Change Receipt'
                            })
                        }

                    })
                }

            }
            else {
                this.setState({
                    openError: true,
                    alertData: 'Please Upload Below 3 MB Pic'
                })
            }
        }
        else if (!is_supported_types) {
            this.setState({
                openError: true,
                alertData: supported_receipts.error
            })
        }
        enableUploadIcons = true
        this.setState({
            enableUploadIcons
        })
    }

    render() {
        const { loading, submitDisable, stockItemFieldDetails, stockItemList, fieldErrors, isEditForm, openError, alertData, stockItemDetails,
            enableUploadIcons, propertyValueList } = this.state
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
                    <Paper className='paper-background'>
                        <Grid container>
                            <Grid item md={8} xs={12} className='header-align'>
                                <Box className='heading'>
                                    <FormattedMessage {...messages.addPurchaseHeading} />
                                </Box>
                            </Grid>
                            <Grid item md={4} xs={12} >
                                <Box className='header-align end-flex-prop'>
                                    {isUserHasPermission('store_purchase_items', 'view') &&
                                        <Button
                                            variant="contained"
                                            component={Link} to={Actions.store_purchase_items.view.url}
                                            className='editbutton-view'
                                        ><VisibilityOutlinedIcon className='visibility-icon' /> {Actions.store_purchase_items.view.label}</Button>
                                    }
                                </Box>
                            </Grid>
                        </Grid>
                        <AddStockItemStore
                            ref={this.addItemStoreRef}
                            selectedItem={this.selectedItem}
                        />
                        <Paper className='paper-plain-background header-align m-t-20px m-b-20px p-t-20px p-b-20px'>
                            {stockItemFieldDetails &&
                                <DynamicForm
                                    fieldDetails={stockItemFieldDetails}
                                    updateParent={this.updateStockItemDetails}
                                    isEditForm={isEditForm}
                                    loading={loading}
                                    ref={'stock_item'}
                                    containerSpacing={3}
                                    idFormat={'store_purchase_2022_08_11_01_23_pm_'}
                                />
                            }
                            <Grid container className='m-t-20px'>
                                <Grid item md={6} xs={12}>
                                    <FormControl
                                        fullWidth
                                        error={fieldErrors['comment'] && (fieldErrors['comment'] ? true : false)}
                                    >
                                        <Box className='apply-leave-label-names margin-top-20'>Comment</Box>
                                        <TextareaAutosize aria-label="minimum height"
                                            className='apply-leave-text-area-auto-size-reason'
                                            value={stockItemDetails['comment']}
                                            maxLength={'1000'}
                                            name={'comment'}
                                            onChange={(e) => this.updateStockItemDetails(e.target.name, e.target.value)}
                                        />
                                        {fieldErrors['comment'] &&
                                            <FormHelperText>{fieldErrors['comment']}</FormHelperText>
                                        }
                                    </FormControl>
                                </Grid>

                            </Grid>
                        </Paper>
                        <TableContainer component={Paper} className='header-align'>
                            <Table aria-label="simple table">
                                <TableHead className='table-header-color'>
                                    <TableRow>
                                        <TableCell>Stock Item</TableCell>
                                        <TableCell >Category</TableCell>
                                        <TableCell >Sub Category</TableCell>
                                        <TableCell >Property Value</TableCell>
                                        <TableCell >Quantity</TableCell>
                                        <TableCell >UnitPrice</TableCell>
                                        <TableCell >Amount</TableCell>
                                        <TableCell ></TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {stockItemList.map((row, index) => (
                                        <TableRow>
                                            <TableCell>
                                                {!row.item &&
                                                    <Button className='form-next-pre-button' onClick={() => this.openItemList(index)}> Select Item </Button>
                                                }
                                                {row.item &&
                                                    <Box className='flex-justify-space-between'>
                                                        <Box className={fieldErrors[`item${index}`] ? 'red-text' : ''}>
                                                            {row.item_name}
                                                        </Box>
                                                        <Box className='pr-10-px pointer'>
                                                            <Tooltip title={'Change Item'} enterDelay={400}
                                                                enterNextDelay={400} placement='top-start'
                                                                classes={{ tooltip: 'tooltip-show-data' }}>
                                                                <EditOutlinedIcon onClick={() => this.openItemList(index)} />
                                                            </Tooltip>
                                                        </Box>
                                                    </Box>
                                                }
                                            </TableCell>
                                            <TableCell >{row.category_name}</TableCell>
                                            <TableCell >{row.sub_category_name}</TableCell>
                                            <TableCell >
                                                <Tooltip title={row.property_values && row.property_values.map((data, index) => {
                                                    return (
                                                        <Box>
                                                            {`${data.properties_name} - ${data.name}`}
                                                        </Box>
                                                    )
                                                })} enterDelay={400}
                                                    enterNextDelay={400} placement='top-start'
                                                    classes={{ tooltip: 'tooltip-show-data' }}>
                                                    <Box className='stock-property-value'>
                                                        {row.property_values &&
                                                            row.property_values.map((data, index) => {
                                                                return (
                                                                    <Box>
                                                                        {(row.property_values.length < 3 || (row.property_values.length > 2 && index !== 1)) &&
                                                                            `${data.properties_name} - ${data.name}`}
                                                                        {row.property_values.length > 2 && index === 1 &&
                                                                            `${data.properties_name} - ${data.name} ....`
                                                                        }
                                                                    </Box>
                                                                )
                                                            })
                                                        }
                                                    </Box>
                                                </Tooltip>
                                            </TableCell>
                                            <TableCell >
                                                <TextField
                                                    id="outlined-name"
                                                    label=''
                                                    fullWidth
                                                    value={row.quantity}
                                                    name={'quantity'}
                                                    onChange={(e) => this.onChangeFieldValue(e, index)}
                                                    autoComplete="off"
                                                    helperText={fieldErrors[`quantity${index}`] !== "" && fieldErrors[`quantity${index}`]}
                                                    error={fieldErrors[`quantity${index}`] === "" || !fieldErrors[`quantity${index}`] ? false : true}
                                                    inputProps={{ maxLength: 5 }}
                                                    className="width-100-px padding-0"
                                                />
                                            </TableCell>
                                            <TableCell >
                                                <TextField
                                                    id="outlined-name"
                                                    label={''}
                                                    fullWidth
                                                    value={row.unit_price}
                                                    name={'unit_price'}
                                                    onChange={(e) => this.onChangeFieldValue(e, index)}
                                                    autoComplete="off"
                                                    helperText={fieldErrors[`unit_price${index}`] !== "" && fieldErrors[`unit_price${index}`]}
                                                    error={fieldErrors[`unit_price${index}`] === "" || !fieldErrors[`unit_price${index}`] ? false : true}
                                                    inputProps={{ maxLength: 5 }}
                                                    className="width-100-px padding-0"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Box className='purchase-amount'>
                                                    {this.getAmount(index)}
                                                </Box>
                                            </TableCell>
                                            <TableCell >
                                                <Box className='display-flex'>
                                                    <Box>
                                                        {stockItemList.length > 1 &&
                                                            <Button color="secondary" className='min-max-w-0'>
                                                                <DeleteOutlineIcon onClick={() => this.handleDeleteProperty(index)} className='add-icon-stock-item' />
                                                            </Button>
                                                        }
                                                    </Box>
                                                    <Box>
                                                        {stockItemList.length === index + 1 &&
                                                            <Button color="primary" className='min-max-w-0'>
                                                                <Tooltip title={'Add Another Item'} enterDelay={400}
                                                                    enterNextDelay={400} placement='top-start'
                                                                    classes={{ tooltip: 'tooltip-show-data' }}>
                                                                    <AddCircleOutlineIcon onClick={() => this.handleAddProperty()} className='add-icon-stock-item' />
                                                                </Tooltip>
                                                            </Button>
                                                        }
                                                    </Box>
                                                </Box>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                        <Grid container spacing={4}>
                            <Grid item md={6}>
                                <TableContainer component={Paper} className='header-align'>
                                    <Table aria-label="simple table">
                                        <TableHead >
                                            <TableRow>
                                                <TableCell>Total Amount</TableCell>
                                                <TableCell >
                                                    <Box className='purchase-amount'>
                                                        {this.getTotalAmount()}
                                                    </Box>
                                                </TableCell>
                                            </TableRow>
                                            <TableRow>
                                                <TableCell >Tax</TableCell>
                                                <TableCell className='amount-table-width'>
                                                    <TextField
                                                        id="outlined-name"
                                                        label=''
                                                        fullWidth
                                                        value={stockItemDetails.tax}
                                                        name={'tax'}
                                                        onChange={(e) => this.updateStockItemDetails(e.target.name, e.target.value)}
                                                        autoComplete="off"
                                                        helperText={fieldErrors[`tax`] !== "" && fieldErrors[`tax`]}
                                                        error={fieldErrors[`tax`] === "" || !fieldErrors[`tax`] ? false : true}
                                                        inputProps={{ maxLength: 5 }}
                                                        className="width-100-px padding-0"
                                                    />
                                                </TableCell>
                                            </TableRow>
                                            <TableRow>
                                                <TableCell >Discount</TableCell>
                                                <TableCell className='amount-table-width'>
                                                    <TextField
                                                        id="outlined-name"
                                                        label=''
                                                        fullWidth
                                                        value={stockItemDetails.discount}
                                                        name={'discount'}
                                                        onChange={(e) => this.updateStockItemDetails(e.target.name, e.target.value)}
                                                        autoComplete="off"
                                                        helperText={fieldErrors[`discount`] !== "" && fieldErrors[`discount`]}
                                                        error={fieldErrors[`discount`] === "" || !fieldErrors[`discount`] ? false : true}
                                                        inputProps={{ maxLength: 5 }}
                                                        className="width-100-px padding-0"
                                                    />
                                                </TableCell>
                                            </TableRow>
                                            <TableRow>
                                                <TableCell className='grand-total'>Grand Total</TableCell>
                                                <TableCell className='grand-total'>
                                                    <Box className='purchase-grand-amount'>
                                                        {this.getGrandTotal()}
                                                    </Box>
                                                </TableCell>
                                            </TableRow>
                                        </TableHead>
                                    </Table>
                                </TableContainer>
                            </Grid>
                            <Grid item md={6} xs={12}>
                                <Box className='text-center'>
                                    <Box className='header-align'>
                                        {enableUploadIcons &&
                                            <label htmlFor='upload-pic'>
                                                <Button variant="raised" component='span' className='create-expenses-upload-receipts-button'>
                                                    {stockItemDetails.upload_name}<Box className='upload-icon'><i class="fa fa-upload" aria-hidden="true"></i></Box>
                                                </Button>
                                            </label>
                                        }
                                    </Box>
                                    <input type='file' id='upload-pic' className='display-none' onChange={(e) => this.handleChange(e, 'img')}
                                        onClick={e => (e.target.value = null)} />

                                    {(stockItemDetails.receipt_preview !== '' && enableUploadIcons && stockItemDetails.receipt) &&
                                        <Box className='flex-justify-space-around header-align'>
                                            <Box>{stockItemDetails.receipt_name}</Box>
                                            <Box><VisibilityOutlinedIcon onClick={this.handleViewImage} className='create-expenses-image-view' /></Box>
                                            <Box><DeleteIcon onClick={this.handleDeleteImage} className='create-expenses-image-delete' /></Box>
                                        </Box>
                                    }
                                    {!enableUploadIcons &&
                                        <Box className='upload-profile-loading'>
                                            <CircularProgress />
                                        </Box>
                                    }
                                </Box>
                            </Grid>
                        </Grid>
                        <Box display='flex' marginLeft='auto' justifyContent='flex-end' className='header-align'>
                            <Button variant="contained" color="primary"
                                className='submit'
                                disabled={submitDisable}
                                onClick={this.submit}>
                                <FormattedMessage {...commonMessages.submit} />
                            </Button>
                        </Box>
                    </Paper>
                    <Snackbar anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} open={openError} autoHideDuration={2000} onClose={this.handleClose}>
                        <Alert onClose={this.handleClose} severity="error">
                            {alertData}
                        </Alert>
                    </Snackbar>
                </div>
            )
        }
    }
}


export default withRouter(AddStockItems)