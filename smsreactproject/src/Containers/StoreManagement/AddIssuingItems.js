import React, { Component } from 'react'
import { withRouter } from 'react-router-dom';
import { Paper, Box, Grid, Button, TextField,  CircularProgress, } from '@material-ui/core';
import DeleteIcon from '@material-ui/icons/Delete';
import Snackbar from '@material-ui/core/Snackbar';
import { DropDownWithSearch } from 'Components/DropDownWithSearch';
import loadingBar from 'images/loading.gif'
import { getRequest, postRequest } from 'Includes/api/apicall';
import { GET_URL, PUT_URL, POST_URL } from 'Includes/urls'
import { getUrlParam, getKeyValueMap, dateFormat, validateDate, Alert, isUserHasPermission } from 'Includes/functions';
import './styles.scss'
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemSecondaryAction from '@material-ui/core/ListItemSecondaryAction';
import ListItemText from '@material-ui/core/ListItemText';
import Dialog from '@material-ui/core/Dialog';
import IconButton from '@material-ui/core/IconButton';
import DialogContent from '@material-ui/core/DialogContent';
import DialogTitle from '@material-ui/core/DialogTitle';


class AddIssuingItems extends Component {
    constructor(props) {
        super(props)

        this.state = {
            selectedPropertiesList: [],
            addedItemList: [],
            addPropertiesButton: true,
            propertiesList: [],
            isPropertyAdded: false,
            selectedProperty: '',
            selectedPropertyValue: '',
            selectedPropertyValuesList: [],
            categoryList: [],
            selectedCategory: '',
            subCategoryList: [],
            selectedSubCategory: '',
            itemList: [],
            selectedItem: '',
            setPropertyValues: false,
            quantity: '',
            unitPrice: '',
            quantityAlert: '',
            alertData: '',
            open: false,
            setToZero: false,
            subCategorySetted: false,
            submitDisable: false,
            fieldErrors: {},
            helperText: {},
            loading: false,
            maximumAmount: '',
            enableUploadIcons: true,
            isEnable: {},
            alertData: 'Please clear the errors',
            submitDisable: false,
            pageLoading: false,
            isBlankPage: true,
            minquantityalert: 'No',
            dialog: true,
            isEdit: false,
            editedItem: []
        }
    }

    componentDidMount() {
        let { itemList, editItem, edit } = this.props
        let { editedItem, addedItemList, isEdit } = this.state
        if (edit === true) {
            editedItem = this.props.editItem
            addedItemList = this.props.itemList
            this.setState({
                editedItem,
                addedItemList,
                isEdit: true
            }, () => {
                this.setAllFeildValues()
            })
        }
        else {
            this.setState({
                addedItemList: itemList,
            }, () => {
                this.getCategoryList()
                this.getSubCategory()
                this.getItemList()
                this.getPropertiesList()
                this.getPropertyValueList()
            })
        }
    }

    setAllFeildValues = () => {
        this.getItemList()
        this.getCategoryList()
        this.getSubCategory()
        this.getPropertiesList()
        this.getPropertyValueList()
        this.setItemValue()
    }

    setItemValue = () => {
        let { editedItem,  quantity, unitPrice, amount, } = this.state
        editedItem.map((item) => {
            quantity = item.quantity
            unitPrice = item.unitPrice
            amount = item.amount
        })
        this.setState({
            quantity,
            unitPrice,
            amount
        })
    }


    getCategoryList = () => {
        const f_url = GET_URL.storecategory.api
        const params = { is_active: 1 }
        getRequest(f_url, params, this.props).then(response => {
            if (response && response.status === 200) {
                this.setState({
                    categoryList: response.data.data,
                    loading: false
                }, () => {
                    let { isEdit, editedItem, selectedCategory, categoryList } = this.state
                    if (isEdit) {
                        editedItem.map((data) => {
                            categoryList.map((item) => {
                                if (data.selectedCategory === item.name) {
                                    selectedCategory = item
                                    this.setState({
                                        selectedCategory
                                    })
                                }

                            })
                        })
                    }
                })
            }
        })
    }

    getSubCategory = (category) => {
        const f_url = GET_URL.subcategory.api
        const params = { is_active: 1, category: category }
        getRequest(f_url, params, this.props).then(response => {
            if (response && response.status === 200) {
                this.setState({
                    subCategoryList: response.data.data,
                    loading: false,
                }, () => {
                    let { isEdit, editedItem, selectedSubCategory, subCategoryList } = this.state
                    if (isEdit) {
                        editedItem.map((data) => {
                            subCategoryList.map((item) => {
                                if (data.selectedSubCategory === item.name) {
                                    selectedSubCategory = item
                                    this.setState({
                                        selectedSubCategory
                                    })
                                }

                            })
                        })
                    }
                })
            }
        })
    }

    getItemList = () => {
        const f_url = GET_URL.item.api
        const params = { is_active: 1 }
        getRequest(f_url, params, this.props).then(response => {
            if (response && response.status === 200) {
                this.setState({
                    itemList: response.data.data,
                    loading: false
                }, () => {
                    let { isEdit, editedItem, selectedItem, itemList } = this.state
                    if (isEdit) {
                        editedItem.map((data) => {
                            itemList.map((item) => {
                                if (data.selectedItem === item.name) {
                                    selectedItem = item
                                    this.setState({
                                        selectedItem
                                    })
                                }

                            })
                        })
                    }
                })
            }
        })
    }

    getPropertiesList = () => {
        const f_url = GET_URL.properties.api
        const params = { is_active: 1 }
        getRequest(f_url, params, this.props).then(response => {
            if (response && response.status === 200) {
                let propertyList = response.data.data
                let fliteredProperties = []
                let { selectedPropertiesList, alertData } = this.state

                if (selectedPropertiesList.length != 0) {

                    propertyList.map((data) => {
                        let isPropertiesExists = false
                        selectedPropertiesList.map((list) => {
                            if (data.id === list.propertyId) {
                                isPropertiesExists = true
                            }
                        })
                        if (!isPropertiesExists) {
                            fliteredProperties.push(data)
                        }
                    })
                    if (fliteredProperties.length === 0) {
                        alertData = 'No More Properties are available'
                        this.setState({
                            open: true,
                            alertData,
                            propertiesList: fliteredProperties,
                            loading: false,
                            setPropertyValues: false
                        })
                    }
                    else {
                        this.setState({
                            propertiesList: fliteredProperties,
                            loading: false,
                            setPropertyValues: true
                        })
                    }
                }
                else {
                    this.setState({
                        propertiesList: response.data.data,
                        loading: false,
                    })
                }
            }
        })
    }

    getPropertyValueList = (id, name) => {
        const g_url = GET_URL.propertyvalue.api
        const params = { is_active: 1, properties: id }
        getRequest(g_url, params, this.props).then(response => {
            if (response && response.status === 200) {
                this.setState({
                    propertyValueList: response.data.data,
                    tableUpdating: false,
                    loading: false,
                })
            }
        })
    }

    handleDropDownWithSearchChange = (e, newValue, name) => {
        if (newValue) {
            let { fieldErrors } = this.state
            if (fieldErrors[name]) {
                fieldErrors[name] = ''
            }
            this.setState({
                [name]: newValue,
                fieldErrors
            }, () => {
                if (name === 'selectedCategory') {
                    let { selectedCategory, subCategorySetted } = this.state

                    if (subCategorySetted != true) {
                        this.getSubCategory(selectedCategory.id)
                    }
                    else {
                        let { setToZero } = this.state
                        setToZero = setToZero === true ? false : true
                        this.setState({
                            setToZero,
                            subCategorySetted: false
                        }, () => {
                            this.getSubCategory(selectedCategory.id)
                        })
                    }
                }
                else if (name === 'selectedSubCategory') {
                    let { subCategorySetted } = this.state
                    this.setState({
                        subCategorySetted: true,
                    },() => {
                        this.getItems()
                    })

                }
                else if (name === 'selectedProperty') {
                    let { selectedProperty } = this.state
                    this.getPropertyValueList(selectedProperty.id, 'selectedProperty')
                }
            })
        }
        else {
            if (name === "selectedProperty") {
                this.setState({
                    selectedPropertyValue: '',
                    selectedProperty: '',
                })
            }
            else if (name === "selectedCategory") {
                this.setState({
                    selectedCategory: '',
                    selectedSubCategory: '',
                })
            }
            else {
                this.setState({
                    [name]: ''
                })
            }

        }
    }

    getItems = () => {
        let {selectedSubCategory, itemList} = this.state
        const g_url = GET_URL.stock.api
        let params = {is_active: 1, sub_category: selectedSubCategory.id}
        getRequest(g_url, params, this.props).then(response => {
            if(response && response.status === 200){
                let stockItems = response.data.data
                itemList = []
                stockItems.map((data)=>{
                    let item = {}
                     item = {
                        "id": data.item,
                        "name": data.item_name
                    }
                    itemList.push(item)
                })
            }
            this.setState({
                itemList: itemList
            })
        })
    }

    addProperties = () => {
        let { addPropertiesButton, alertData, selectedItem, selectedCategory, selectedSubCategory, selectedPropertiesList } = this.state
        if (selectedItem === '' || selectedCategory === '' || selectedSubCategory === '') {
            alertData = 'Please Select Item , Category and SubCategory Values'
            this.setState({
                open: true,
                alertData,
            })
        }
        else if (selectedPropertiesList.length === 0) {
            addPropertiesButton = false
            this.setState({
                setPropertyValues: true,
                addPropertiesButton
            })
        }

        else {
            this.getPropertiesList()
        }
    }

    addProperty = () => {
        let { selectedPropertyValue, selectedProperty, selectedPropertiesList, alertData, isPropertyAdded, addPropertiesButton } = this.state
        if (selectedProperty != '' && selectedPropertyValue != '') {
            let addedProperties
            addedProperties = {
                "propertyId": selectedProperty.id,
                "propertyName": selectedProperty.name,
                "propertyValueId": selectedPropertyValue.id,
                "propertyValue": selectedPropertyValue.name
            }
            selectedPropertiesList.push(addedProperties)
            this.setState({
                selectedPropertiesList,
                addPropertiesButton: true,
                setPropertyValues: false,
                selectedProperty: '',
                selectedPropertyValue: ''
            })
        }
        else {
            alertData = 'Please Select Property and Property Value'
            this.setState({
                open: true,
                alertData,
            })
        }

    }

    deleteProperties = () => {
        let { addPropertiesButton, selectedPropertyValuesList, setPropertyValues } = this.state
        if (selectedPropertyValuesList.length === 0) {
            addPropertiesButton = true
            setPropertyValues = false
        }
        this.setState({
            setPropertyValues,
            addPropertiesButton
        })
    }

    removeProperty = (id) => {
        let { selectedPropertiesList } = this.state
        selectedPropertiesList.map((data, index) => {
            if (data.propertyId === id) {
                selectedPropertiesList.splice(index, 1)
            }
        })
        this.setState({
            selectedPropertiesList
        })
    }

    handleChange = (e) => {
        let value = e.target.value
        this.setState({ minquantityalert: value })
    }

    handleClose = () => {
        this.setState({
            open: false
        })
    }

    handlequantityChange = (e) => {
        let { fieldErrors } = this.state
        let value = e.target.value
        let name = e.target.name
        if (fieldErrors[name]) {
            fieldErrors[name] = ''
        }
        this.setState({
            quantity: value,
            fieldErrors
        }, () => {
            this.getAmount()
        })
    }

    handleUnitPriceChange = (e) => {
        let { fieldErrors } = this.state
        let value = e.target.value
        let name = e.target.name
        if (fieldErrors[name]) {
            fieldErrors[name] = ''
        }
        this.setState({
            unitPrice: value,
            fieldErrors
        }, () => {
            this.getAmount()
        })
    }

    handleMinAlertChange = (e) => {
        let { fieldErrors } = this.state
        let value = e.target.value
        let name = e.target.name
        if (fieldErrors[name]) {
            fieldErrors[name] = ''
        }
        this.setState({
            quantityAlert: value,
            fieldErrors
        })
    }


    inputValidation = () => {
        let testResult = true
        let { setPropertyValues, selectedPropertiesList, minquantityalert, quantityAlert, fieldErrors, selectedItem, selectedCategory, selectedSubCategory, selectedProperty, selectedPropertyValue, openingStock, quantity } = this.state
        if (selectedItem === '' || selectedCategory === '' || selectedSubCategory === '' || quantity === '' || openingStock === '') {
            if (selectedItem === '') {
                fieldErrors["selectedItem"] = "Please Select Item"
            }
            if (selectedCategory === '') {
                fieldErrors["selectedCategory"] = "Please Select Category"
            }
            if (selectedSubCategory === '') {
                fieldErrors["selectedSubCategory"] = "Please Select SubCategory"
            }
            if (quantity === '') {
                fieldErrors["quantity"] = "Please Select Quantity"
            }
            if (openingStock === '') {
                fieldErrors["openingStock"] = "Please Select openingStock"
            }
            testResult = false
        }
        else if (minquantityalert === 'Yes') {
            if (quantityAlert === '') {
                fieldErrors["quantityAlert"] = "Please Select Minimum Quantity Alert Value "
                testResult = false
            }
        }
        else if (setPropertyValues === true || selectedProperty != '' || selectedPropertyValue != '') {
            if (selectedPropertiesList.length === 0 && setPropertyValues === true) {
                if (selectedProperty === '') {
                    fieldErrors["selectedProperty"] = "Please Select  Property"
                    testResult = false
                }
                else if (selectedPropertyValue === '') {
                    fieldErrors["selectedPropertyValue"] = "Please Select  Property Value"
                    testResult = false
                }

            }
        }
        else {
            testResult = true
        }
        return testResult
    }

    AddItem = () => {
        let { addedItemList, selectedPropertiesList, selectedSubCategory, alertData, selectedProperty, selectedPropertyValue, openingStock, quantityAlert, selectedItem } = this.state
        let isValidationSuccess = this.inputValidation()
        let isDuplicatedItem = false
        if (addedItemList.length != 0) {
            isDuplicatedItem = this.checkForDuplicateItems()
        }
        if (isDuplicatedItem === true) {
            alertData = 'Selected Item is already Added'
            this.setState({
                open: true,
                alertData,
            })
        }
        if (isValidationSuccess && !isDuplicatedItem) {
            this.getAllValue()
        }
        if (selectedProperty != '' || selectedPropertyValue != '') {
            if (selectedPropertiesList.length === 0) {
                alertData = 'Please Add Properties'
                this.setState({
                    open: true,
                    alertData,
                })
            }
        }
    }

    checkForDuplicateItems = () => {
        let { isEdit, editedItem, addedItemList, selectedItem, selectedCategory, selectedSubCategory, } = this.state
        let duplicate = false
        addedItemList.map((data) => {
            if ((data.selectedItem === selectedItem.name) && (data.selectedCategory === selectedCategory.name) && (data.selectedSubCategory === selectedSubCategory.name)) {
                if (isEdit) {
                    editedItem.map((item) => {
                        if (item.id === data.id) {
                            duplicate = false
                        }
                        else {
                            duplicate = true
                        }
                    })
                }
                else {
                    duplicate = true
                }
            }
        })
        if (duplicate === true) {
            return duplicate
        }
        else {
            return duplicate
        }

    }

    getAllValue = () => {
        let { selectedItem, selectedCategory, selectedSubCategory, selectedPropertiesList, quantity, unitPrice, amount, isEdit } = this.state
        let data = {
            "selectedItem": selectedItem.name,
            "selectedItemId": selectedItem.id,
            "selectedCategory": selectedCategory.name,
            "selectedCategoryId": selectedCategory.id,
            "selectedSubCategory": selectedSubCategory.name,
            "selectedSubCategoryId": selectedSubCategory.id,
            "selectedPropertiesList": selectedPropertiesList,
            "quantity": quantity,
            "unitPrice": unitPrice,
            "amount": amount
        }
        if (isEdit) {
            let { editedItem } = this.state
            editedItem.map((item) => {
                data["id"] = item.id
            })
        }
        this.setState({
            dialog: false
        }, () => {
            if (isEdit) {
                this.props.getAddedItemsList(data, "update")
            }
            else {
                this.props.getAddedItemsList(data, "add")
            }
        })
    }



    handleDialogClose = () => {
        let { dialog, isEdit } = this.state
        dialog = false
        this.setState({
            dialog
        }, () => {
            if (isEdit === true) {
                this.props.getAddedItemsList("editdiscarded")
            }
            else {
                this.props.getAddedItemsList("discarded")
            }
        })
    }

    getAmount = () => {
        let { quantity, unitPrice, amount } = this.state
        if (quantity && unitPrice) {
            amount = (quantity * unitPrice)
            this.setState({
                amount
            })
        }
    }


    render() {
        let { addPropertiesButton, loading, categoryList, selectedCategory, subCategoryList, selectedSubCategory, itemList, selectedItem, setPropertyValues, propertyCount, fieldErrors, expensesTypeList, helperText, enableUploadIcons, imageUploading, largeImagePreview,
            minquantityalert, open, propertiesList, selectedProperty, propertyValueList, selectedPropertyValue, selectedPropertiesList, selectedPropertyValue2, propertyValueList2, openError, alertData,
            quantity, isEdit, submitDisable, pageLoading, setToZero, unitPrice, amount, dialog } = this.state
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
                    <Dialog
                        fullWidth={true}
                        maxWidth={'md'}
                        open={dialog}
                        onClose={this.handleDialogClose}
                        aria-labelledby="max-width-dialog-title"
                    >
                        <DialogTitle style={{ cursor: 'move' }} id="draggable-dialog-title">
                            Add Item
                        </DialogTitle>
                        <DialogContent>

                            {pageLoading &&
                                <Box className='loading'>
                                    <CircularProgress />
                                </Box>
                            }
                            {!pageLoading &&
                                <Box>
                                    <Grid item md={12} xs={12}>
                                        <Paper className='paper-plain-background'>
                                            <Grid container spacing={2} >
                                                <Grid item md={6} xs={12}>
                                                    <DropDownWithSearch
                                                        id="combo-box-demo"
                                                        options={categoryList}
                                                        value={selectedCategory}
                                                        onChange={(e, newValue) => this.handleDropDownWithSearchChange(e, newValue, 'selectedCategory')}
                                                        name='Selected Category'
                                                        label='Select Category'
                                                        optionValue='name'
                                                        className='width-100'
                                                        required={true}
                                                        helperText={selectedCategory ? `` : fieldErrors['selectedCategory']}
                                                        error={fieldErrors['selectedCategory']}
                                                    />
                                                </Grid>
                                                {selectedCategory &&
                                                    <Grid item md={6} xs={12}>
                                                        <DropDownWithSearch
                                                            key={setToZero}
                                                            id="combo-box-demo"
                                                            options={subCategoryList}
                                                            value={selectedSubCategory}
                                                            onChange={(e, newValue) => this.handleDropDownWithSearchChange(e, newValue, 'selectedSubCategory')}
                                                            name='selectedSubCategory'
                                                            label='Select Sub Category'
                                                            optionValue='name'
                                                            className='width-100'
                                                            required={true}
                                                            helperText={selectedSubCategory ? `` : fieldErrors['selectedSubCategory']}
                                                            error={fieldErrors['selectedSubCategory']}
                                                        />
                                                    </Grid>
                                                }
                                            </Grid>
                                            <Grid container spacing={2} >
                                                <Grid item md={6} xs={12}>
                                                    <DropDownWithSearch
                                                        id="combo-box-demo"
                                                        options={itemList}
                                                        value={selectedItem}
                                                        onChange={(e, newValue) => this.handleDropDownWithSearchChange(e, newValue, 'selectedItem')}
                                                        name='Select Item'
                                                        label='Select Item'
                                                        optionValue='name'
                                                        className='width-100'
                                                        required={true}
                                                        helperText={selectedItem ? `` : fieldErrors['selectedItem']}
                                                        error={fieldErrors['selectedItem']}
                                                    />
                                                </Grid>
                                            </Grid>
                                            {selectedPropertiesList.length > 0 &&
                                                <Grid container spacing={2} >
                                                    <Grid item xs={12} md={6}>
                                                        <div >
                                                            <List >
                                                                {selectedPropertiesList.map((data) => {
                                                                    return (
                                                                        <ListItem>
                                                                            <ListItemText
                                                                                primary={data.propertyName}
                                                                            />
                                                                            <ListItemText
                                                                                primary={data.propertyValue}
                                                                            />
                                                                            <ListItemSecondaryAction>
                                                                                <IconButton edge="end" aria-label="delete" color='secondary' onClick={() => this.removeProperty(data.propertyId)}>
                                                                                    <DeleteIcon />
                                                                                </IconButton>
                                                                            </ListItemSecondaryAction>
                                                                        </ListItem>
                                                                    )
                                                                })

                                                                }
                                                            </List>

                                                        </div>
                                                    </Grid>
                                                </Grid>
                                            }

                                            {setPropertyValues &&
                                                <Grid container spacing={2} >
                                                    <Grid item md={4} xs={12}>
                                                        <DropDownWithSearch
                                                            id="combo-box-demo"
                                                            options={propertiesList}
                                                            value={selectedProperty}
                                                            onChange={(e, newValue) => this.handleDropDownWithSearchChange(e, newValue, 'selectedProperty')}
                                                            name='selectedProperty'
                                                            label='Select Property'
                                                            optionValue='name'
                                                            className='width-100'
                                                            required={true}
                                                            helperText={selectedProperty ? `` : fieldErrors['selectedProperty']}
                                                            error={fieldErrors['selectedProperty']}
                                                        />
                                                    </Grid>
                                                    {selectedProperty &&
                                                        <Grid item md={4} xs={12}>
                                                            <DropDownWithSearch
                                                                id="combo-box-demo"
                                                                options={propertyValueList}
                                                                value={selectedPropertyValue}
                                                                onChange={(e, newValue) => this.handleDropDownWithSearchChange(e, newValue, 'selectedPropertyValue')}
                                                                name='selectedPropertyValue'
                                                                label='Select PropertyValue'
                                                                optionValue='name'
                                                                className='width-100'
                                                                required={true}
                                                                helperText={selectedPropertyValue ? `` : fieldErrors['selectedPropertyValue']}
                                                                error={fieldErrors['selectedPropertyValue']}
                                                            />
                                                        </Grid>
                                                    }
                                                    <Grid item md={2} xs={12} className='propertyvalue-padding'>
                                                        <Button variant="outlined" color="primary" onClick={() => this.addProperty()}>
                                                            Add
													            </Button>
                                                    </Grid>
                                                    <Grid item md={2} xs={12} className='padding-top-35'>
                                                        <Button variant="outlined" color="Secondary" onClick={() => this.deleteProperties()}>
                                                            Discard
													    </Button>
                                                    </Grid>
                                                </Grid>
                                            }

                                            {addPropertiesButton &&
                                                <Grid container spacing={2} >
                                                    <Grid item md={6} xs={12} className='padding-top-25'>
                                                        <Button variant="outlined" color="primary" onClick={() => this.addProperties()}>
                                                            Add Properties
													    </Button>
                                                    </Grid>
                                                </Grid>
                                            }

                                            <Grid container spacing={2} >
                                                <Grid item md={6} xs={12}>
                                                    <TextField
                                                        label='Quantity'
                                                        name='quantity'
                                                        value={quantity}
                                                        className='width-100'
                                                        inputProps={{ maxLength: '20' }}
                                                        fullWidth={true}
                                                        variant="outlined"
                                                        required={true}
                                                        helperText={fieldErrors['quantity'] === '' ? helperText['quantity'] : fieldErrors['quantity']}
                                                        error={fieldErrors['quantity']}
                                                        onChange={(e) => this.handlequantityChange(e)}
                                                    />
                                                </Grid>
                                                
                                            </Grid>
                                            <Grid item md={12} xs={12}>
                                                <Box display='flex' marginLeft='auto' justifyContent='flex-end' className='header-align'>
                                                    {isEdit &&
                                                        <Button variant="contained" color="primary"
                                                            disabled={submitDisable ? submitDisable : !enableUploadIcons}
                                                            onClick={() => this.AddItem()}
                                                        >
                                                            Update &nbsp;{' '}
                                                        </Button>
                                                    }
                                                    {!isEdit &&
                                                        <Button variant="contained" color="primary"
                                                            disabled={submitDisable ? submitDisable : !enableUploadIcons}
                                                            onClick={() => this.AddItem()}
                                                        >
                                                            Add Item &nbsp;{' '}
                                                        </Button>
                                                    }
                                                    <Button variant="outlined" className='margin-left-20' color="Secondary" onClick={() => this.handleDialogClose()}>
                                                        Discard
													</Button>
                                                </Box>
                                            </Grid>
                                        </Paper>
                                    </Grid>
                                </Box>
                            }
                        </DialogContent>
                    </Dialog>
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

export default withRouter(AddIssuingItems)
