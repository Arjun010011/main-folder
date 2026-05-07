import React, { Component } from 'react'
import {
    Box, Checkbox, Typography, CircularProgress, Grid, DialogActions, Button, Dialog,
    DialogContent, TextField, AppBar, Toolbar, IconButton, Tooltip
} from '@material-ui/core';
import CloseIcon from '@material-ui/icons/Close';
import { withRouter } from 'react-router-dom';
import Snackbar from '@material-ui/core/Snackbar';
import MuiAlert from '@material-ui/lab/Alert';
import PropTypes from 'prop-types';
import AllMUIDataTable from 'Components/AllMUIDataTable';
import InfoIcon from '@material-ui/icons/Info';
import DeleteOutlineIcon from '@material-ui/icons/DeleteOutline';

import loadingBar from 'images/loading.gif'
import { getRequest } from 'Includes/api/apicall';
import { GET_URL } from 'Includes/urls'
import { Actions } from 'Constants/permissions';
import { getFullName, getPaginationProps, getPropertyValues } from 'Includes/functions';
import { FormattedMessage } from 'react-intl';
import commonMessages from 'Constants/messages'
import { Dropdown } from 'Components/DropDown';
import BlankPagewithIcon from 'Components/BlankPageWithIcon';
import { DEFAULT_PAGINATION_PROPS } from 'Constants';
import { numberRegex } from 'Constants/regularExpression'

const muitable = ['group', 'student', 'staff']
const alias_names = JSON.parse(localStorage.getItem('alias_name')) ? JSON.parse(localStorage.getItem('alias_name')) : {}

function Alert(props) {
    return <MuiAlert elevation={6} variant="filled" {...props} />;
}

function TabPanel(props) {
    const { children, value, index, ...other } = props;

    return (
        <Typography
            component="div"
            role="tabpanel"
            hidden={value !== index}
            id={`simple-tabpanel-${index}`}
            aria-labelledby={`simple-tab-${index}`}
            {...other}
        >
            <Box p={3}>{children}</Box>
        </Typography>
    );
}

TabPanel.propTypes = {
    children: PropTypes.node,
    index: PropTypes.any.isRequired,
    value: PropTypes.any.isRequired,
};

class FeePlanAddStoreItems extends Component {
    constructor() {
        super()
        this.state = {
            loading: true,
            open: false,
            typeList: [],
            selectedCategory: 'all',
            selectedSubCategory: 'all',
            standardList: [],
            isYearApiCalled: false,
            isBlankPage: false,
            blankDataMessage: '',
            selected_year: '',
            selected_standard: '',
            is_api_called: false,
            sectionList: {},
            isEdit: false,
            alertData: '',
            selected_items: [],
            all_selected_items: [],
            selected_student_ids: [],
            tableLoading: false,
            subCategoryList: [],
            searchStudent: '',
            fieldErrors: {},
            isAllChecked: false,
            pagination: { ...DEFAULT_PAGINATION_PROPS },
            columns: [
                {
                    name: "id",
                    label: "id",
                    options: {
                        filter: false,
                        sort: false,
                        display: false
                    }
                },
                {
                    name: "checked",
                    label: 'Select',
                    options: {
                        filter: false,
                        sort: false,
                        empty: true,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return (
                                <Checkbox
                                    edge="end"
                                    checked={value}
                                    defaultChecked={value}
                                    onChange={() => this.handleTableClick(tableMeta.rowIndex)}
                                    className={'padding-0'}
                                />
                            );
                        },
                    }
                },
                {
                    name: "item_name",
                    label: "Item Name",
                    options: {
                        filter: false,
                        sort: true,
                        search: true,
                    }
                },
                {
                    name: "category_name",
                    label: "Category [Sub Category]",
                    options: {
                        filter: false,
                        sort: true,
                        search: true,
                    }
                },
                {
                    name: "property_values",
                    label: "Property Values",
                    options: {
                        filter: false,
                        sort: true,
                        search: true,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return (
                                <div>
                                    {value && getPropertyValues(value)}
                                </div>
                            )
                        }
                    },

                },
                {
                    name: "current_selling_price",
                    label: "Current Selling Price",
                    options: {
                        filter: false,
                        sort: true,
                        search: true,
                    }
                },

            ]

        }
    }

    componentDidMount = () => {
        if (this.props.isEdit) {
            const { selected_details } = this.props;
            let selected_student_ids = []
            this.props.selected_details.forEach(element => {
                selected_student_ids.push(element.id)
            });
            this.setState({
                selected_items: selected_details,
                selected_student_ids,
                isEdit: this.props.isEdit
            }, () => {
                this.getCategoryList()
            })
        }
        else {
            this.getCategoryList()
        }
    }

    handleTableClick = (index) => {
        let { data_list , tableLoading} = this.state;
        this.setState({
            tableLoading: true
        },()=>{
            let data_list_temp = { ...data_list }
            data_list_temp.data_list[index]['checked'] = !data_list_temp.data_list[index]['checked']
            this.setState({
                data_list: { ...data_list_temp },
                columns:[...this.state.columns],
                tableLoading: false
            })
        })
    }

    getCategoryList = () => {
        getRequest(GET_URL.storecategory.api, { is_active: 1 }, this.props).then((response) => {
            if (response && response.status === 200) {
                let typeList = response.data.data
                typeList.unshift({ id: 'all', name: 'All' })
                this.setState({ typeList, is_api_called: true }, () => {
                    this.getItemList()
                });
            }
        });
    }

    getItemList = (paginationProps) => {
        let { selectedSubCategory, selectedCategory, pagination } = this.state
        this.currentPagination = pagination;
        if (paginationProps) {
            this.currentPagination = { ...paginationProps };
        }
        let pagination_params = getPaginationProps(this.currentPagination);
        const url = GET_URL.stock.api
        let params = { ...pagination_params, is_active: true }
        if (selectedSubCategory !== 'all') {
            params['sub_category'] = selectedSubCategory
        }
        if (selectedCategory !== 'all' && selectedSubCategory === 'all') {
            params['category'] = selectedCategory
        }
        getRequest(url, params, this.props).then(response => {
            if (response && response.status === 200) {
                response.data.data.data_list.map((data) => {
                    if (data['sub_category_name']) {
                        data['category_name'] = `${data['category_name']} [${data['sub_category_name']}]`
                    }
                    data['checked'] = false
                })
                this.setState({
                    data_list: response.data.data,
                    tableUpdating: false,
                    loading: false,
                    pagination: { ...this.currentPagination },
                })
            }
        })
    }

    handleClose = () => {
        this.setState({
            open: false
        })
    }

    onChange = (e) => {
        let { name, value } = e.target;
        if (value) {
            this.setState({
                [name]: value,
                data_list: [],
                tableUpdating: true
            }, () => {
                if (name === 'selectedCategory' && value !== 'all') {
                    this.getSubCategoryList(value)
                }
                this.getItemList()
            })
        }
    }

    getSubCategoryList = (id) => {
        const g_url = GET_URL.subcategory.api
        const params = { is_active: 1, category: id }
        getRequest(g_url, params, this.props).then(response => {
            if (response && response.status === 200) {
                response.data.data.unshift({ id: 'all', name: "All" })
                this.setState({
                    subCategoryList: response.data.data,
                    tableUpdating: false,
                    loading: false,
                    selectedSubCategory: 'all',
                })
            }
        })
    }


    handleSubmit = () => {
        let { selected_items, alertData, fieldErrors } = this.state;
        let validate = true
        if (selected_items.length === 0) {
            validate = false
            alertData = 'Select atleast one item'
        }
        selected_items.map((data, index) => {
            if (!data.unit_price) {
                fieldErrors[`unit_price${index}`] = <FormattedMessage {...commonMessages.enterValue} />
                validate = false
            }
            else if (!numberRegex.value.test(data.quantity)) {
                fieldErrors[`quantity${index}`] = <FormattedMessage {...commonMessages.fieldMandatoryError} />
                validate = false
            }
            else if (!numberRegex.value.test(data.unit_price)) {
                fieldErrors[`unit_price${index}`] = 'Invalid Number'
                validate = false
            }
        })
        if (!validate) {
            this.setState({
                open: true,
                alertData
            })
        }
        else {
            this.props.updateParent(selected_items)
        }
    }

    handleAddStudents = () => {
        const { data_list, selected_items, all_selected_items, selected_student_ids } = this.state;
        data_list.data_list.map((data) => {
            if (data.checked && !selected_student_ids.includes(data['id'])) {
                data['unit_price'] = data.current_selling_price
                data['quantity'] = 1
                selected_items.push(data)
                all_selected_items.push(data)
                selected_student_ids.push(data['id'])
            }
        })
        this.setState({
            selected_items,
            all_selected_items,
            selected_student_ids,
            isAllChecked: false
        })
    }

    handleFilter = (e) => {
        let { name, value, filterList } = e.target;
        let { all_selected_items, selected_items } = this.state;
        if (value !== '') {
            let lowerCasedFilter = value.toLowerCase().replace(/\s+/g, "");
            filterList = all_selected_items.filter(item => {
                return Object.keys(item).some(key =>
                    typeof (item[key]) === "string" && item[key].toLowerCase().replace(/\s+/g, "").includes(lowerCasedFilter)
                );
            });
            selected_items = filterList
        }
        else {
            selected_items = [...all_selected_items]
            filterList = []
        }
        this.setState({
            [name]: value,
            filterList,
            selected_items
        })
    }

    handleDeleteStudent = (index) => {
        let { selected_items, selected_student_ids } = this.state;
        selected_items.splice(index, 1)
        selected_student_ids.splice(index, 1)
        this.setState({
            selected_items,
            selected_student_ids
        })
    }

    updateStockItemDetails = (index, name, value) => {
        let { selected_items, fieldErrors } = this.state;
        selected_items[index][name] = value
        delete fieldErrors[`${name}${index}`]
        this.setState({
            selected_items,
            fieldErrors
        })
    }

    render() {
        const { loading, open, selected_type, typeList, isBlankPage, subCategoryList,
            selectedCategory, selectedSubCategory, data_list, tableUpdating, blankDataMessage, columns, standardList,
            alertData, selected_items, pagination, fieldErrors, tableLoading } = this.state;
        const options = {
            selectableRows: "none",
            filterType: "dropdown",
            responsive: "simple",
            filter: false,
            download: false,
            print: false,
            viewColumns: false,
            rowsPerPageOptions: [5, 10, 25, 50, 100],
        };
        return (
            <Dialog open={true}
                fullScreen
                onClose={this.props.handleOpenStore} aria-labelledby='form-dialog-title'>
                <AppBar style={{ width: '100%', right: 'auto' }}>
                    <Toolbar>
                        <IconButton edge="start" color="inherit" onClick={this.props.handleOpenStore} aria-label="close">
                            <CloseIcon />
                        </IconButton>
                        <Typography variant="h6">
                            Select Items
                        </Typography>
                    </Toolbar>
                </AppBar>
                <DialogContent>
                    {loading &&
                        <Box display='flex ' className='loading'>
                            <CircularProgress />
                        </Box>
                    }
                    {!loading &&
                        <div className='margin-top-70'>
                            <Grid container className='mt-20' spacing={3}>
                                <Grid item md={3} xs={12}>
                                    <Dropdown
                                        data={typeList}
                                        name='selectedCategory'
                                        value={selectedCategory}
                                        onChange={this.onChange}
                                        label='Select Categegory'
                                        hideSelect={true}
                                    />
                                </Grid>
                                {selectedCategory !== 'all' &&
                                    <Grid item md={3} xs={12}>
                                        <Dropdown
                                            data={subCategoryList}
                                            name='selectedSubCategory'
                                            value={selectedSubCategory}
                                            onChange={this.onChange}
                                            label='Select Sub Category'
                                            hideSelect={true}
                                        />
                                    </Grid>
                                }
                            </Grid>
                            <Grid container className='mt-20' spacing={2}>
                                {isBlankPage ?
                                    <Grid item md={12} xs={12}>
                                        <BlankPagewithIcon data={blankDataMessage} />
                                    </Grid>
                                    :
                                    <>
                                        <Grid item md={6} xs={12}>
                                            {!tableLoading &&
                                                <AllMUIDataTable
                                                key={data_list?.data_list}
                                                title={tableUpdating ? <CircularProgress className='white-text' /> : ''}
                                                data={data_list?.data_list}
                                                columns={columns}
                                                options={options}
                                                onTableChange={this.getItemList}
                                                serverSide={true}
                                                pagination={pagination}
                                                count={data_list?.count}
                                                />
                                            }
                                        </Grid>
                                        <>
                                            <Grid item md={2} xs={12}>
                                                <Button variant='contained'
                                                    color='primary' className='custom-button'
                                                    onClick={this.handleAddStudents}>
                                                    Add Items
                                                </Button>
                                            </Grid>
                                            <Grid item md={4} xs={12} className='height-65vh'>
                                                <table width="100%" className="selectable-row-table">
                                                    <thead className='table-select-hostel-thead'>
                                                        <th className={`selectable-table-head`}> Item Name  </th>
                                                        <th className={`selectable-table-head`}> Quantity  </th>
                                                        <th className={`selectable-table-head`}> Total Price</th>
                                                        <th className={`selectable-table-head`}> Action </th>
                                                    </thead>
                                                    <tbody className="selectable-row-table-body">
                                                        {selected_items.map((student, index) => {
                                                            return (
                                                                <tr key={index} className={"selectable-row-table-row"}>
                                                                    <td className={'textAlign pl-15 '}>
                                                                        {student.item_name}
                                                                    </td>
                                                                    <td className={'textAlign pl-15 '}>
                                                                        <TextField
                                                                            id="outlined-name"
                                                                            label=''
                                                                            fullWidth
                                                                            value={student.quantity}
                                                                            name={'quantity'}
                                                                            onChange={(e) => this.updateStockItemDetails(index, e.target.name, e.target.value)}
                                                                            autoComplete="off"
                                                                            // helperText={fieldErrors[`quantity${index}`] && fieldErrors[`quantity${index}`]}
                                                                            error={fieldErrors[`quantity${index}`] === "" || !fieldErrors[`quantity${index}`] ? false : true}
                                                                            InputProps={{
                                                                                min: 0,
                                                                                maxLength: 4,
                                                                                endAdornment: (
                                                                                    fieldErrors[`quantity${index}`] ?
                                                                                        <Tooltip title={fieldErrors[`quantity${index}`]}
                                                                                            enterDelay={400}
                                                                                            enterNextDelay={400} placement='top-start'
                                                                                            classes={{ tooltip: 'tooltip-show-data' }}>
                                                                                            <InfoIcon className='time-table-info-icon cursor-pointer' />
                                                                                        </Tooltip>
                                                                                        : ''
                                                                                )
                                                                            }}
                                                                            className="width-100-px padding-0"
                                                                        />
                                                                    </td>
                                                                    <td className={'textAlign pl-15 '}>
                                                                        <TextField
                                                                            id="outlined-name"
                                                                            label=''
                                                                            fullWidth
                                                                            value={student.unit_price}
                                                                            name={'unit_price'}
                                                                            onChange={(e) => this.updateStockItemDetails(index, e.target.name, e.target.value)}
                                                                            autoComplete="off"
                                                                            // helperText={fieldErrors[`unit_price${index}`] && fieldErrors[`unit_price${index}`]}
                                                                            error={fieldErrors[`unit_price${index}`] === "" || !fieldErrors[`unit_price${index}`] ? false : true}
                                                                            InputProps={{
                                                                                min: 0,
                                                                                maxLength: 4,
                                                                                endAdornment: (
                                                                                    fieldErrors[`unit_price${index}`] ?
                                                                                        <Tooltip title={fieldErrors[`unit_price${index}`]}
                                                                                            enterDelay={400}
                                                                                            enterNextDelay={400} placement='top-start'
                                                                                            classes={{ tooltip: 'tooltip-show-data' }}>
                                                                                            <InfoIcon className='time-table-info-icon cursor-pointer' />
                                                                                        </Tooltip>
                                                                                        : ''
                                                                                )
                                                                            }}
                                                                            className="width-100-px padding-0"
                                                                        />
                                                                    </td>
                                                                    <td className={'textAlign pl-15 '}>
                                                                        <DeleteOutlineIcon onClick={() => this.handleDeleteStudent(index)}
                                                                            className='text-red cursor-pointer' />
                                                                    </td>
                                                                </tr>
                                                            )
                                                        })
                                                        }
                                                        {selected_items.length === 0 && (
                                                            <tr className="text-center font-weight-bold">
                                                                No Data Found
                                                            </tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            </Grid>
                                        </>
                                    </>
                                }
                            </Grid>
                            <DialogActions>
                                {(selected_type !== 'student' || (selected_type === 'student' && selected_items.length > 0)) &&
                                    <Box className="submt-button-float-bottom" mt={3}>
                                        <Button variant='contained'
                                            color='primary' className='submit'
                                            onClick={this.handleSubmit}>
                                            Select
                                        </Button>
                                    </Box>
                                }
                            </DialogActions>
                            <Snackbar anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} open={open} autoHideDuration={2000} onClose={this.handleClose}>
                                <Alert onClose={this.handleClose} severity="error">
                                    {alertData}
                                </Alert>
                            </Snackbar>
                        </div>
                    }
                </DialogContent>
            </Dialog>
        )
    }
}
export default withRouter(FeePlanAddStoreItems)