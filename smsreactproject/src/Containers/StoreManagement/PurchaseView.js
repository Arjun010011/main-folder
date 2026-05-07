import React, { Component } from 'react'
import { Paper, Box, Grid, Button, CircularProgress } from '@material-ui/core';
import { Link } from 'react-router-dom';
import AddCircleOutlineOutlinedIcon from '@material-ui/icons/AddCircleOutlineOutlined';
import { withRouter } from 'react-router-dom';
import loadingBar from 'images/loading.gif';
import { Actions } from 'Constants/permissions';
import AllMUIDataTable from 'Components/AllMUIDataTable';
import { GET_URL } from 'Includes/urls';
import { isUserHasPermission, getPaginationProps, dateFormat } from 'Includes/functions';
import { DEFAULT_PAGINATION_PROPS_ID_LIST } from 'Constants';
import { getRequest } from 'Includes/api/apicall';
import { FormattedMessage } from 'react-intl';
import messages from './messages';
import commonMessages from 'Constants/messages';

class ManageStockItems extends Component {
    constructor() {
        super()
        this.state = {
            categoryList: [],
            subCategoryList: [],
            selectedCategory: 'all',
            selectedSubCategory: 'all',
            pagination: { ...DEFAULT_PAGINATION_PROPS_ID_LIST },
            purchaseList: [],
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
                    label: '',
                    options: {
                        filter: false,
                        sort: false,
                        display: false,
                    }
                },
                {
                    name: "created",
                    label: <FormattedMessage {...messages.storePurchaseDate} />,
                    options: {
                        filter: true,
                        sort: true,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return (
                                dateFormat(value, 'DD-MM-YYYY')
                            )
                        }
                    }
                },
                {
                    name: "vendor_name",
                    label: <FormattedMessage {...messages.storeVendorName} />,
                    options: {
                        filter: true,
                        sort: true,
                    }
                },
                {
                    name: "invoice_num",
                    label: <FormattedMessage {...commonMessages.invoiceNumber} />,
                    options: {
                        filter: true,
                        sort: true,
                    }
                },
                {
                    name: "invoice_date",
                    label: <FormattedMessage {...commonMessages.invoiceDate} />,
                    options: {
                        filter: true,
                        sort: true,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return (
                                dateFormat(value, 'DD-MM-YYYY')
                            )
                        }
                    }
                },
                {
                    name: "total_amount",
                    label: <FormattedMessage {...commonMessages.totalAmount} />,
                    options: {
                        filter: true,
                        sort: true,
                    }
                },
                {
                    name: "id",
                    label: ' ',
                    options: {
                        filter: false,
                        sort: false,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return (
                                <Box className='flex-justify-space-around'>
                                    <Button className='add-modify-button'
                                        onClick={e => this.returnItem(value, "view")}                                    >
                                        <FormattedMessage {...commonMessages.view} />
                                    </Button>
                                    {isUserHasPermission('store_return_items', 'create') &&
                                        <Button className='add-modify-button'
                                            onClick={e => this.returnItem(value, "return")}                                    >
                                            <FormattedMessage {...commonMessages.return} />
                                        </Button>
                                    }
                                </Box>
                            );
                        }
                    }
                },
            ]
        }
    }

    componentDidMount() {
        this.getPurchaseList()
    }

    returnItem = (returnId, type) => {
        let searchState = { returnId: returnId, type: type }
        let searchParam = "?" + new URLSearchParams(searchState).toString()
        this.props.history.push({
            pathname: Actions.store_return_items.create.url,
            search: searchParam,
        })
    }

    getPurchaseList = (paginationProps) => {
        let { pagination } = this.state
        this.currentPagination = pagination;
        if (paginationProps) {
            this.currentPagination = { ...paginationProps };
        }
        let pagination_params = getPaginationProps(this.currentPagination);
        let params = { ...pagination_params, is_active: true }
        const url = GET_URL.purchasemaster.api
        getRequest(url, params, this.props).then(response => {
            if (response && response.status === 200) {
                this.setState({
                    purchaseList: response.data.data,
                    tableUpdating: false,
                    loading: false,
                    pagination: this.currentPagination
                        ? this.currentPagination
                        : this.state.pagination,
                })
            }
        })
    }

    render() {
        let { purchaseList, loading, tableUpdating, columns, categoryList, selectedCategory, error, subCategoryList,
            pagination } = this.state
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
                                    <FormattedMessage {...messages.storePurchaseViewHeader} />
                                </Box>
                            </Grid>
                            <Grid item md={4} xs={12} >
                                {isUserHasPermission('store_purchase_items', 'create') && <Box className='header-align end-flex-prop'>
                                    <Button
                                        variant="contained"
                                        component={Link} to={Actions.store_purchase_items.create.url}
                                        className='editbutton-view'
                                    ><AddCircleOutlineOutlinedIcon className='visibility-icon' />{Actions.store_purchase_items.create.label}</Button>
                                </Box>
                                }
                            </Grid>
                        </Grid>
                        <Grid container className='header-align'>
                            <Grid item md={10} xs={12}>
                                <Paper>
                                    <AllMUIDataTable
                                        title={tableUpdating ? <CircularProgress className='white-text' /> : ''}
                                        key={purchaseList.data_list}
                                        data={purchaseList.data_list}
                                        columns={columns}
                                        options={options}
                                        onTableChange={this.getPurchaseList}
                                        serverSide={true}
                                        pagination={pagination}
                                        count={purchaseList.count}
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
