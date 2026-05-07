import React, { Component } from 'react'
import { Paper, Box, Grid, Button, CircularProgress, Dialog, DialogActions, DialogContent, 
    DialogTitle } from '@material-ui/core';
import { Link } from 'react-router-dom';
import AddCircleOutlineOutlinedIcon from '@material-ui/icons/AddCircleOutlineOutlined';
import { withRouter } from 'react-router-dom';
import loadingBar from 'images/loading.gif';
import { Actions } from 'Constants/permissions';
import AllMUIDataTable from 'Components/AllMUIDataTable';
import { GET_URL } from 'Includes/urls';
import { isUserHasPermission, getPaginationProps, getFullName,dateFormat, numberWithCommas} from 'Includes/functions';
import { DEFAULT_PAGINATION_PROPS_ID_LIST } from 'Constants';
import { getRequest } from 'Includes/api/apicall';
import { Dropdown } from 'Components/DropDown';
import { FormattedMessage } from 'react-intl';
import messages from './messages';
import commonMessages from 'Constants/messages';
import { Tooltip } from '@material-ui/core';
import VisibilityIcon from "@material-ui/icons/Visibility";


const userTypes = [
    {
        id: "all",
        name: "All"
    },
    {
        id: "student",
        name: "Student"
    },
    {
        id: "staff",
        name: "Staff"
    },
]

const thStyle = {
    border: '1px solid #ccc',
    padding: '8px',
    backgroundColor: '#f5f5f5',
    textAlign: 'left'
  };
  
  const tdStyle = {
    border: '1px solid #ccc',
    padding: '8px'
  };

class ItemIssueView extends Component {
    constructor() {
        super()
        this.state = {
            categoryList: [],
            subCategoryList: [],
            selectedCategory: 'all',
            selectedSubCategory: 'all',
            selectedUser: 'all',
            pagination: { ...DEFAULT_PAGINATION_PROPS_ID_LIST },
            stockList: [],
            isSubCategory: false,
            error: '',
            loading: true,
            closeMenu: true,
            tableUpdating: false,
            errorContent: '',
            enabledActions: [],
            printLoading: {},
            selectedItemDetails: [],
            openModal: false,
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
                    name: "for_date",
                    label: 'Transaction Date',
                    options: {
                        filter: true,
                        sort: true,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return (
                                dateFormat(value,'DD-MM-YYYY')
                            )
                        }
                    }
                },
                {
                    name: "order_num",
                    label: 'Order Number',
                    options: {
                        filter: true,
                        sort: true,
                    }
                },
                {
                    name: "user_data",
                    label: 'User Type',
                    options: {
                        filter: true,
                        sort: true,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return (
                                <>
                                    {value?.staff ?
                                        <Box>Staff</Box>
                                    : value?.student ?
                                        <Box>Student</Box>
                                    : <Box>Guest</Box>
                                    }
                                </>
                            )
                        }
                    }
                },
                {
                    name: "user_data",
                    label: 'User Detail',
                    options: {
                        filter: true,
                        sort: true,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return (
                                <>
                                    {value?.staff ?
                                        <Box>{getFullName(value.staff['first_name'], value.staff['middle_name'], value.staff['last_name'])}</Box>
                                        :
                                        value?.student ?
                                        <Box>{`${getFullName(value.student['first_name'], value.student['middle_name'], value.student['last_name'])} - [ ${value?.student?.current_standard_name} ]`}</Box>
                                        :
                                        <Box>{tableMeta.rowData[6]}</Box>
                                    }
                                </>
                            )
                        }
                    }
                },
                {
                    name: "total_amount_inc_gst",
                    label: 'Amount',
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
                    name: "guest_name",
                    label: 'Guest Name',
                    options: {
                        filter: true,
                        sort: true,
                        display: false,
                    }
                },
                {
                    name: "item_sold_details_item_sold",
                    label: 'Item Sold Details',
                    options: {
                        filter: true,
                        sort: true,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            let totalQuantitySold = 0;
                            let totalUniqueStocks = [];
                            value.map((soldDetails)=>{
                                totalQuantitySold += soldDetails.quantity
                                if( !totalUniqueStocks.includes(soldDetails.stock)){
                                    totalUniqueStocks.push(soldDetails.stock)
                                }
                            })
                            return <>
                                {totalQuantitySold}
                                    <VisibilityIcon
                                        style={{ cursor: 'pointer', marginTop: '4px', marginLeft: '4px', color: 'seagreen' }}
                                        onClick={() => this.openItemDetails(value)}
                                    />
                                    <Tooltip
                                        title={"Print Reciept"}
                                        enterDelay={400}
                                        enterNextDelay={400}
                                        placement="top-start"
                                        classes={{ tooltip: "tooltip-show-data" }}
                                    >
                                        <>
                                        {(
                                            <Button
                                            className="apply-leave-button height-width-25px"
                                            onClick={() =>
                                                this.printReciept(tableMeta.rowData[0])
                                            }
                                            >
                                            Print
                                            </Button>
                                        )}
                                        </>
                                    </Tooltip>
                            </>
                        }
                    }
                },
            ]
        }
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

    printReciept = (id) => {
        let get_url = GET_URL.itemsold.api + id + "/";
        let prop = {};
        prop.responseType = "blob";
        getRequest(get_url, {'print_receipt':1}, prop).then((response) => {
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
    }

    openItemDetails = (valueList) => {
        this.setState({
            selectedItemDetails: valueList,
            openModal:true
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
                else if (name === 'selectedSubCategory' || name === 'selectedUser') {
                    this.getStockList()
                }
            })
        }
    }

    getStockList = (paginationProps) => {
        let { selectedSubCategory, selectedCategory, pagination, selectedUser } = this.state
        this.currentPagination = pagination;
        if (paginationProps) {
            this.currentPagination = { ...paginationProps };
        }
        let pagination_params = getPaginationProps(this.currentPagination);
        const url = GET_URL.itemsold.api
        let params = { ...pagination_params, is_active: true }
        if (selectedSubCategory !== 'all') {
            params['sub_category'] = selectedSubCategory
        }
        if (selectedUser !== 'all') {
            params['user'] = selectedUser
        }
        if (selectedCategory !== 'all' && selectedSubCategory === 'all') {
            params['category'] = selectedCategory
        }
        getRequest(url, params, this.props).then(response => {
            if (response && response.status === 200) {
                response.data.data.data_list.map((data) => {
                    data['category_name'] = data.stock_details?.['category_name']
                    data['item_name'] = data.stock_details?.['item_name']
                    data['property_values'] = data.stock_details?.['property_values']
                    data['sub_category_name'] = data.stock_details?.['sub_category_name']

                })
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

    setOpenModal = (status) =>{
        this.setState({
            openModal: status
        })
    } 

    render() {
        let { isSubCategory, stockList, loading, tableUpdating, columns, categoryList, selectedCategory, error, subCategoryList,
            selectedSubCategory, pagination, selectedUser } = this.state
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
                                    {Actions.store_issue_items.view.label}
                                </Box>
                            </Grid>
                            <Grid item md={4} xs={12} >
                                {isUserHasPermission('store_issue_items', 'create') && <Box className='header-align end-flex-prop'>
                                    <Button
                                        variant="contained"
                                        component={Link} to={Actions.store_issue_items.create.url}
                                        className='editbutton-view'
                                    ><AddCircleOutlineOutlinedIcon className='visibility-icon' />{Actions.store_issue_items.create.label}</Button>
                                </Box>
                                }
                            </Grid>
                        </Grid>
                        <Grid container spacing={3}>
                            <Grid item md={3} xs={12} className='margin-top-20'>
                                <Dropdown
                                    data={userTypes}
                                    name='selectedUser'
                                    style='width-100'
                                    value={selectedUser}
                                    onChange={this.onChange}
                                    label={'User Type'}
                                    error={error.selectedUser}
                                    hideSelect={true}
                                />
                            </Grid>
                            {/* <Grid item md={3} xs={12} className='margin-top-20'>
                                <Dropdown
                                    data={categoryList}
                                    name='selectedCategory'
                                    style='width-100'
                                    value={selectedCategory}
                                    onChange={this.onChange}
                                    label={<FormattedMessage {...messages.storeCategorySelectCategory} />}
                                    error={error.selectedCategory}
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
                                        error={error.selectedSubCategory}
                                        hideSelect={true}
                                    />
                                </Grid>
                            } */}
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
                    <Dialog open={this.state.openModal} onClose={() => this.setOpenModal(false)} maxWidth="md" fullWidth>
                        <DialogTitle>Item Sold Details</DialogTitle>
                        <DialogContent>
                            {this.state.selectedItemDetails.length > 0 ? (
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                <tr>
                                    <th style={thStyle}>#</th>
                                    <th style={thStyle}>Item Name</th>
                                    <th style={thStyle}>Quantity</th>
                                    <th style={thStyle}>Unit Price</th>
                                    <th style={thStyle}>Available Stock After Order</th>
                                    <th style={thStyle}>Created Date</th>
                                </tr>
                                </thead>
                                <tbody>
                                {this.state.selectedItemDetails.map((detail, index) => (
                                    <tr key={detail.id}>
                                    <td style={tdStyle}>{index + 1}</td>
                                    <td style={tdStyle}>{detail.item_name}</td>
                                    <td style={tdStyle}>{detail.quantity}</td>
                                    <td style={tdStyle}>{detail.unit_price}</td>
                                    <td style={tdStyle}>{detail.available_stock_after_order}</td>
                                    <td style={tdStyle}>{dateFormat(detail.created, 'DD-MM-YYYY hh:mm A')}</td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                            ) : (
                            <p>No details available.</p>
                            )}
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={() => this.setOpenModal(false)} color="primary" variant="contained">
                            Close
                            </Button>
                        </DialogActions>
                    </Dialog>

                </Box>
            )
        }
    }
}

export default withRouter(ItemIssueView)
