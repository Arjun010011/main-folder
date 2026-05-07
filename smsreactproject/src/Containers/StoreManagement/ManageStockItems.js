import React, { Component } from 'react'
import { Paper, Box, Grid, Button, CircularProgress } from '@material-ui/core';
import { Link } from 'react-router-dom';
import AddCircleOutlineOutlinedIcon from '@material-ui/icons/AddCircleOutlineOutlined';
import { withRouter } from 'react-router-dom';
import loadingBar from 'images/loading.gif';
import { Actions } from 'Constants/permissions';
import AllMUIDataTable from 'Components/AllMUIDataTable';
import { GET_URL,  DEL_URL } from "Includes/urls";
import { isUserHasPermission, getPaginationProps, updatePermissions, numberWithCommas , getFormatMessage, dateFormat} from 'Includes/functions';
import { DEFAULT_PAGINATION_PROPS_ID_LIST } from 'Constants';
import { getRequest, deleteRequest } from 'Includes/api/apicall';
import { Dropdown } from 'Components/DropDown';
import { FormattedMessage } from 'react-intl';
import messages from './messages';
import { Tooltip } from '@material-ui/core';
import StudentListActions from 'Includes/StudentListActions'
import commonMessages from 'Constants/messages';
import Swal from 'sweetalert2'

const fieldDetails = [
    {
        label: <FormattedMessage {...messages.storeItemName} />,
        regex: null,
        name: 'name', md: 12,
        className: 'width-100',
        required: true,
        id: 'outlined-textarea',
        default: '',
        rows: null,
        type: 'text',
        autoFocus: true,
    },
    {
        label: <FormattedMessage {...messages.storeItemCode} />,
        regex: null,
        name: 'code',
        md: 12,
        className: 'width-100',
        required: true,
        id: 'outlined-textarea',
        default: '',
        rows: null,
        type: 'text'
    },

];

class ManageStockItems extends Component {
    constructor() {
        super()
        this.permission = updatePermissions('store_inventory_item', ['update', 'delete']);
        this.state = {
            categoryList: [],
            subCategoryList: [],
            selectedCategory: 'all',
            selectedSubCategory: 'all',
            pagination: { ...DEFAULT_PAGINATION_PROPS_ID_LIST },
            stockList: [],
            isSubCategory: false,
            error: '',
            loading: true,
            closeMenu: true,
            tableUpdating: false,
            errorContent: '',
            enabledActions: [],
            columns: [
                {
                    name: "id",
                    label: "id",
                    options: {
                        filter: true,
                        sort: true,
                        viewColumns: false,
                        display: false,
                    },
                },
                {
                    name: "category_name",
                    label: <FormattedMessage {...messages.storeCategorySelectCategory} />,
                    options: {
                        filter: true,
                        sort: true,
                    }
                },
                {
                    name: "sub_category_name",
                    label: <FormattedMessage {...messages.storeSubCategorySelectCategory} />,
                    options: {
                        filter: true,
                        sort: true,
                    }
                },
                {
                    name: "item_name",
                    label: 'Item',
                    options: {
                        filter: true,
                        sort: true,
                    }
                },
                {
                    name: "property_values",
                    label: <FormattedMessage {...messages.storePropertyValues} />,
                    options: {
                        filter: true,
                        sort: true,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return (
                                <Tooltip title={value.map((data, index) => {
                                    return (
                                        <Box>
                                            {`${data.properties_name} - ${data.name}`}
                                        </Box>
                                    )
                                })} enterDelay={400}
                                    enterNextDelay={400} placement='top-start'
                                    classes={{ tooltip: 'tooltip-show-data' }}>
                                    <Box className='stock-property-value'>
                                        {value &&
                                            value.map((data, index) => {
                                                return (
                                                    <Box>
                                                        {(value.length < 3 || (value.length > 2 && index !== 1)) &&
                                                            `${data.properties_name} - ${data.name}`}
                                                        {value.length > 2 && index === 1 &&
                                                            `${data.properties_name} - ${data.name} ....`
                                                        }
                                                    </Box>
                                                )
                                            })
                                        }
                                    </Box>
                                </Tooltip>
                            )
                        }
                    }
                },
                {
                    name: "opening_stock",
                    label: <FormattedMessage {...messages.storeOpeningStock} />,
                    options: {
                        filter: true,
                        sort: true,
                    }
                },
                {
                    name: "available_stock",
                    label: <FormattedMessage {...messages.storeAvailableStock} />,
                    options: {
                        filter: true,
                        sort: true,
                    }
                },
                {
                    name: "current_selling_price",
                    label: <FormattedMessage {...messages.storeCurrentSellingPrice} />,
                    options: {
                        filter: true,
                        sort: true,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return (
                                numberWithCommas(value)
                            )
                        }
                    }
                },
                {
                    name: "Actions",
                    label: <FormattedMessage {...commonMessages.actions} />,
                    options: {
                        display: this.permission.length > 0,
                        download: false,
                        filter: false,
                        sort: false,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return (<div>
                                <StudentListActions
                                    id={tableMeta.rowData[0]}
                                    index={tableMeta.rowIndex} 
                                    deleteStudent={this.deleteStockItem}
                                    editURL={Actions.store_stock_items.update.url}
                                    viewURL={Actions.store_stock_items.view.url}
                                    enabledActions={this.permission}
                                />
                            </div>
                            );
                        },
                    }
                }
            ]
        }
    }

    deleteStockItem = (id, index) => {
        this.setState({ tableUpdating: true })
        let { stockList, columns } = this.state
        const del_url = DEL_URL.stock.api
        const url = del_url + id + '/';
        deleteRequest(url, {}, this.props).then(response => {
            if (response && response.status === 200) {
                stockList.data_list.splice(index, 1)
                this.setState({
                    stockList,
                    columns: [...columns]
                })
                Swal.fire({
                    position: 'top-end',
                    type: 'success',
                    title: response.data.Reason,
                    showConfirmButton: false,
                    timer: 1500
                })
            }
        })
        this.setState({ tableUpdating: false })
    }

    componentDidMount() {
        this.getCategoryList()
        this.getStockList()
    }

    getCategoryList = () => {
        const uel = GET_URL.storecategory.api
        const params = { is_active: 1 }
        getRequest(uel, params, this.props).then(response => {
            if (response && response.status === 200) {
                let { categoryList } = this.state
                categoryList = response.data.data
                categoryList.unshift({ id: 'all', name: "All" })
                this.setState({
                    categoryList: categoryList,
                    loading: false,
                })
            }
        })
    }

    getSubCategoryList = (id) => {
        const g_url = GET_URL.subcategory.api
        const params = { is_active: 1, category: id }
        getRequest(g_url, params, this.props).then(response => {
            if (response && response.status === 200) {
                response.data.data.unshift({ id: 'all', name: "All" })
                this.setState({
                    subCategoryList: response.data.data.length > 1 ? response.data.data : [],
                    tableUpdating: false,
                    loading: false,
                    isSubCategory: response.data.data.length > 1 ? true : false,
                    selectedSubCategory: response.data.data.length > 1 ? 'all' : '',
                })
            }
        })
    }

    onChange = async (e) => {
        let { value, name, error } = e.target;
        if (value !== 0) {
            error = {}
            this.setState({
                [name]: value,
                error,
                tableUpdating: name === 'selectedSubCategory'
            }, () => {
                if (name === 'selectedCategory') {
                    if (value !== "all") {
                        this.getSubCategoryList(value)
                    }
                    this.getStockList()
                }
                else if (name === 'selectedSubCategory') {
                    this.getStockList()
                }
            })
        }
    }

    getStockList = (paginationProps) => {
        let { selectedSubCategory, selectedCategory, pagination, isSubCategory } = this.state
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
                this.setState({
                    stockList: response.data.data,
                    tableUpdating: false,
                    loading: false,
                    isSubCategory: selectedCategory === 'all' ? false : true,
                    pagination: this.currentPagination
                        ? this.currentPagination
                        : this.state.pagination,
                })
            }
        })
    }

    render() {
        let { isSubCategory, stockList, loading, tableUpdating, columns, categoryList, selectedCategory, error, subCategoryList,
            selectedSubCategory, pagination } = this.state
        const options = {
            selectableRows: "none",
            filterType: "dropdown",
            responsive: "simple",
            filter: false,
            download: true,
            print: false,
            viewColumns: false,
            rowsPerPageOptions: [5, 10, 25, 50, 100],
            onDownload: (buildHead, buildBody, columns, data) => {
                columns.forEach(column_name => {
                    column_name.label = getFormatMessage(column_name.label)
                })
                return "\uFEFF" + buildHead(columns) + buildBody(data);
            },
            downloadOptions: {
                filename: `Store_Items_${dateFormat(new Date(),'DD-MM-YYYY hh:mm A')}.csv`,
                filterOptions: {
                    useDisplayedColumnsOnly: true,
                    useDisplayedRowsOnly: true,
                },
            },
        };
        if (loading) {
            return (
                <Box display='flex'>
                    <img src={loadingBar} className='loading' alt='loading' />
                </Box>
            )
        }
        else {
            return (
                <Box>
                    <Paper className='paper-background'>
                        <Grid container>
                            <Grid item md={8} xs={12} className='header-align'>
                                <Box className='heading'>
                                    <FormattedMessage {...messages.storeViewStockItemHeading} />
                                </Box>
                            </Grid>
                            <Grid item md={4} xs={12} >
                                {isUserHasPermission('store_stock_items', 'create') && <Box className='header-align end-flex-prop'>
                                    <Button
                                        variant="contained"
                                        component={Link} to={Actions.store_stock_items.create.url}
                                        className='editbutton-view'
                                    ><AddCircleOutlineOutlinedIcon className='visibility-icon' />{Actions.store_stock_items.create.label}</Button>
                                </Box>
                                }
                            </Grid>
                        </Grid>
                        <Grid container>
                            <Grid item md={3} xs={12} className='margin-top-20'>
                                <Dropdown
                                    data={categoryList}
                                    name='selectedCategory'
                                    style='width-100'
                                    value={selectedCategory}
                                    onChange={this.onChange}
                                    label={<FormattedMessage {...messages.storeCategorySelectCategory} />}
                                    error={error.Category}
                                    hideSelect={true}
                                />
                            </Grid>
                            {isSubCategory &&
                                <Grid item md={3} xs={12} className='margin-top-20 padding-left-25'>
                                    <Dropdown
                                        data={subCategoryList}
                                        name='selectedSubCategory'
                                        style='width-100'
                                        value={selectedSubCategory}
                                        onChange={this.onChange}
                                        label={<FormattedMessage {...messages.storeSubCategorySelectCategory} />}
                                        error={error.subCategory}
                                        hideSelect={true}
                                    />
                                </Grid>
                            }
                        </Grid>
                        <Grid container className='header-align'>
                            <Grid item md={12} xs={12}>
                                <Paper>
                                    <AllMUIDataTable
                                        title={tableUpdating ? <CircularProgress className='white-text' /> : ''}
                                        key={stockList.data_list}
                                        data={stockList.data_list}
                                        columns={columns}
                                        options={options}
                                        onTableChange={this.getStockList}
                                        serverSide={true}
                                        pagination={pagination}
                                        count={stockList.count}
                                    />
                                </Paper>
                            </Grid>
                        </Grid>
                    </Paper>
                </Box>
            )
        }
    }
}

export default withRouter(ManageStockItems)
