import React, { Component } from 'react'
import { withRouter } from 'react-router'
import { Paper, Box, Grid, Button, CircularProgress, Tooltip } from '@material-ui/core';
import classNames from 'classnames';
import AllMUIDataTable from 'Components/AllMUIDataTable';
import loadingBar from 'images/loading.gif'
import { getRequest, putRequest, deleteRequest } from 'Includes/api/apicall'
import { GET_URL, PUT_URL, DEL_URL } from 'Includes/urls'
import { Actions } from 'Constants/permissions';
import { isUserHasPermission, getPaginationProps } from 'Includes/functions';
import { multiOptions, DEFAULT_PAGINATION_PROPS_ID_LIST } from 'Constants';
import _ from 'lodash';
import moment from 'moment';

class ReturnItemList extends Component {
    constructor() {
        super()
        this.state = {
            pagination: { ...DEFAULT_PAGINATION_PROPS_ID_LIST },
            purchaseDetails: [],
            loading: false,
            tableLoading: false,
            purchaseData: [],
            purchaseDataList: [],
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
                    name: "created",
                    label: "Date",
                    options: {
                        filter: true,
                        sort: true,
                    }
                },
                {
                    name: "vendor_name",
                    label: "Vendor Name",
                    options: {
                        filter: true,
                        sort: true,
                    }
                },
                {
                    name: "invoice_num",
                    label: "Invoice Number",
                    options: {
                        filter: true,
                        sort: true,
                    }
                },
                {
                    name: "invoice_date",
                    label: "Invoice Date",
                    options: {
                        filter: true,
                        sort: true,
                    }
                },
            ],
        }
    }


    componentDidMount = () => {
        let options = { ...multiOptions }
        this.setState({
            options: options
        }, () => {
            this.getReturedItemsList()
        })
    }


    getReturedItemsList = (paginationProps) => {
        let { pagination } = this.state;
        let params
        this.currentPagination = _.cloneDeep(pagination);
        if (paginationProps) {
            this.currentPagination = { ...paginationProps };
        }
        let pagination_params = getPaginationProps(this.currentPagination);
        let url = GET_URL.purchasemasterreturn.api

        params = { is_active: 1, limit: pagination_params.limit, pageno: pagination_params.pageno };

        getRequest(url, params, this.props).then((response) => {
            if (response && response.status === 200) {
                let purchaseData = response.data.data;
                let purchaseDataList = purchaseData.data_list
                purchaseDataList.map((data) => {
                    data.created = moment(data.created).format("DD-MM-YYYY")
                    data.invoice_date = moment(data.invoice_date).format("DD-MM-YYYY")
                })
                this.setState({
                    purchaseData: purchaseData,
                    purchaseDataList: purchaseDataList,
                    loading: false,
                    tableLoading: false,
                    pagination: this.currentPagination
                        ? this.currentPagination
                        : this.state.pagination,
                })
            }
        });
    }

    returnItem = (returnId) => {
        let searchState = { returnId: returnId, type: "returned_view" }
        let searchParam = "?" + new URLSearchParams(searchState).toString()
        this.props.history.push({
            pathname: Actions.store_return_items.view.url,
            search: searchParam,
        })
    }

    render() {
        let { loading, purchaseDetails, columns, pagination, options, tableLoading, purchaseData,
            purchaseDataList, } = this.state
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
                    <Paper className={classNames('paper-background')}>
                        <Grid container>
                            <Grid item md={6} xs={12} className={classNames('header-align')}>
                                <Box className='heading'>
                                    Retured Item List
                                </Box>
                                <Box className='sub-heading'>
                                    Here we can see list of Returned Items
                                </Box>
                            </Grid>
                        </Grid>
                        <Grid container className={classNames('header-align')}>
                            <Grid item md={12}>
                                <Paper>
                                    <AllMUIDataTable
                                        data={purchaseDataList}
                                        title={tableLoading ? <CircularProgress className='white-text' /> : ''}
                                        columns={columns}
                                        options={options}
                                        onTableChange={this.getPurchaseItems}
                                        serverSide={true}
                                        pagination={pagination}
                                        count={purchaseData.count}
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

export default withRouter(ReturnItemList)
