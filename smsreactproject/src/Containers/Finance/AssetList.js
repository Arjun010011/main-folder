import React, { Component } from 'react'
import { Paper, Box, Grid, Button, CircularProgress, Chip, TextField, MenuItem } from '@material-ui/core';
import AddCircleOutlineOutlinedIcon from '@material-ui/icons/AddCircleOutlineOutlined';
import { Link } from 'react-router-dom';
import classNames from 'classnames';

import ActionColumn from 'Components/ActionColumnNew'
import AllMUIDataTable from 'Components/AllMUIDataTable';
import loadingBar from 'images/loading.gif'
import { getRequest, postRequest } from 'Includes/api/apicall';
import { GET_URL, PUT_URL, DEL_URL } from 'Includes/urls'
import { nameWithQuoteRegex, amountRegexWithDecimals } from 'Constants/regularExpression'
import { Actions } from 'Constants/permissions';
import { isUserHasPermission, numberWithCommas, dateFormat, getPaginationProps } from 'Includes/functions';
import { multiOptions, DEFAULT_PAGINATION_PROPS_ID_LIST } from 'Constants';
import AssetDisposalModal from './Components/AssetDisposalModal';
import AssetAdditionModal from './Components/AssetAdditionModal';
import AssetAdditionsHistory from './Components/AssetAdditionsHistory';

const fieldDetails = [
    {
        label: 'Asset Code', regex: nameWithQuoteRegex, name: 'asset_code', md: 6, maxLength: '50', className: 'width-95-mt-30px', required: true,
        id: 'outlined-textarea', default: '', rows: null, type: 'text', autoFocus: true
    },
    {
        label: 'Asset Name', regex: nameWithQuoteRegex, name: 'asset_name', md: 6, maxLength: '255', className: 'width-95-mt-30px', required: true,
        id: 'outlined-textarea', default: '', rows: null, type: 'text', autoFocus: false, isDuplicateAllow: true
    },
    {
        label: 'Original Cost', regex: amountRegexWithDecimals, name: 'original_cost', md: 6, maxLength: '15', className: 'width-95-mt-30px', required: true,
        id: 'outlined-textarea', default: '', rows: null, type: 'amount', autoFocus: false, isDuplicateAllow: true
    },
    {
        label: 'Put to Use Date', name: 'put_to_use_date', md: 6, className: 'width-95-mt-30px', required: true,
        id: 'outlined-textarea', default: '', type: 'date', autoFocus: false,
        helperText: 'Defaults to Purchase Date if left empty'
    },
    {
        label: 'Location', regex: nameWithQuoteRegex, name: 'location', md: 6, maxLength: '255', className: 'width-95-mt-30px', required: false,
        id: 'outlined-textarea', default: '', rows: null, type: 'text', autoFocus: false, isDuplicateAllow: true
    },
]

class AssetList extends Component {
    constructor() {
        super()
        this.state = {
            dataList: [],
            loading: true,
            tableUpdating: false,
            pagination: { ...DEFAULT_PAGINATION_PROPS_ID_LIST },
            assetData: {},
            disposeModalOpen: false,
            addAmountModalOpen: false,
            selectedAsset: null,
            financial_year: '',
            financialYearOptions: [],
            expandedRowsIndex: [],
            columns: [
                {
                    name: "id",
                    label: "id",
                    options: {
                        filter: false,
                        sort: false,
                        viewColumns: false,
                        display: false
                    }
                },
                {
                    name: "asset_code",
                    label: "Asset Code",
                },
                {
                    name: "asset_name",
                    label: "Asset Name",
                },
                {
                    name: "asset_group_name",
                    label: "Group",
                },
                {
                    name: "purchase_date",
                    label: "Purchase Date",
                },
                {
                    name: "put_to_use_date",
                    label: "Put to Use Date",
                    options: {
                        customBodyRender: (value, tableMeta) => {
                            // Fallback to purchase date if null, similar to register
                            return value || tableMeta.rowData[4];
                        }
                    }
                },
                {
                    name: "original_cost",
                    label: "Original Cost",
                    options: {
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return numberWithCommas(value)
                        }
                    }
                },
                {
                    name: "current_cost",
                    label: "Current Cost",
                    options: {
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return numberWithCommas(value)
                        }
                    }
                },
                {
                    name: "location",
                    label: "Location",
                },
                {
                    name: "status",
                    label: "Status",
                    options: {
                        customBodyRender: (value, tableMeta, updateValue) => {
                            const colors = { 'ACTIVE': 'primary', 'INACTIVE': 'default', 'DISPOSED': 'secondary' }
                            return <Chip label={value} color={colors[value] || 'default'} size="small" />
                        }
                    }
                },
                {
                    name: 'Actions',
                    label: 'Action',
                    options: {
                        display: this.updatePermissions('display'),
                        filter: true,
                        sort: false,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            const assetId = tableMeta.rowData[0];
                            // Use dataList to get the raw asset object for reliable status check and data values
                            const asset = this.state.dataList.find(a => a.id === assetId);

                            if (!asset) return null;

                            const isDisposed = asset.status === 'DISPOSED';
                            const isLocked = asset.is_locked_for_active_fy;

                            return (<div style={{ display: 'flex', alignItems: 'center' }}>
                                {!isDisposed && !isLocked && (
                                    <Button
                                        size="small"
                                        variant="outlined"
                                        color="primary"
                                        onClick={() => this.openAddAmountModal(assetId)}
                                        style={{ marginRight: 8, textTransform: 'none', fontSize: '0.75rem' }}
                                    >
                                        Add Amount
                                    </Button>
                                )}
                                {!isDisposed && !isLocked && (
                                    <Button
                                        size="small"
                                        variant="outlined"
                                        color="secondary"
                                        onClick={() => this.openDisposeModal(assetId)}
                                        style={{ marginRight: 8, textTransform: 'none', fontSize: '0.75rem' }}
                                    >
                                        Dispose
                                    </Button>
                                )}
                                <ActionColumn
                                    id={assetId}
                                    fieldValues={this.fieldValues(
                                        asset.asset_code,
                                        asset.asset_name,
                                        asset.original_cost,
                                        asset.current_cost,
                                        asset.put_to_use_date,
                                        asset.location
                                    )}
                                    label='Edit Asset'
                                    fieldDetails={fieldDetails}
                                    updateUrl={PUT_URL.assetList.api}
                                    updatePostFormat={this.updatePostFormat}
                                    updateType={this.updateType}
                                    deleteUrl={DEL_URL.assetList.api}
                                    deleteType={this.deleteType}
                                    baseClassName='action-view-bank-width'
                                    enabledActions={isDisposed ? [] : this.state.enabledActions}
                                />
                            </div>
                            );
                        }
                    }
                }
            ]
        }
    }

    openDisposeModal = (assetId) => {
        const asset = this.state.dataList.find(a => a.id === assetId);
        if (asset) {
            this.setState({ disposeModalOpen: true, selectedAsset: asset });
        }
    }

    closeDisposeModal = () => {
        this.setState({ disposeModalOpen: false, selectedAsset: null });
    }

    onDisposalSuccess = (assetId) => {
        // Update the asset status in the list
        const dataList = this.state.dataList.map(asset => {
            if (asset.id === assetId) {
                return { ...asset, status: 'DISPOSED' };
            }
            return asset;
        });
        this.setState({ dataList });
    }

    openAddAmountModal = (assetId) => {
        const asset = this.state.dataList.find(a => a.id === assetId);
        if (asset) {
            this.setState({ addAmountModalOpen: true, selectedAsset: asset });
        }
    }

    closeAddAmountModal = () => {
        this.setState({ addAmountModalOpen: false, selectedAsset: null });
    }

    onAddAmountSuccess = (assetId) => {
        // Refresh the data list to reflect the new cost movement
        this.getDataList();
    }

    fieldValues(asset_code, asset_name, original_cost, current_cost, put_to_use_date, location) {
        let fieldValues = [];
        fieldValues.push(asset_code);
        fieldValues.push(asset_name);
        fieldValues.push(original_cost);
        fieldValues.push(current_cost);
        fieldValues.push(put_to_use_date);
        fieldValues.push(location);
        return fieldValues
    }

    updatePermissions = (name) => {
        let test = true
        const hasEditPermission = isUserHasPermission('assets', 'update')
        const hasDeletePermission = isUserHasPermission('assets', 'delete')
        let enabledActions = []
        if (hasEditPermission) {
            enabledActions.push('edit')
        }
        if (hasDeletePermission) {
            enabledActions.push('delete')
        }
        if (enabledActions.length === 0) {
            test = false;
        }
        if (name === 'display') {
            return test
        }
        else {
            this.setState({
                enabledActions: enabledActions,
                columns: this.state.columns
            })
        }
    }

    componentDidMount = () => {
        this.updatePermissions('actions');
        let options = {
            ...multiOptions,
            selectableRows: "none",
            expandableRows: true,
            expandableRowsHeader: false,
            rowsExpanded: this.state.expandedRowsIndex,
            onRowExpansionChange: (currentRowsExpanded, allRowsExpanded, rowsExpanded) => {
                let temprowsExpanded = allRowsExpanded.map(data => data.index);
                this.setState({ expandedRowsIndex: temprowsExpanded });
            },
            renderExpandableRow: (rowData, rowMeta) => {
                const asset = this.state.dataList[rowMeta.rowIndex];
                if (!asset) return null;
                return (
                    <AssetAdditionsHistory assetId={asset.id} />
                );
            }
        }
        this.setState({
            options: options,
        }, () => this.loadFinancialYears())
    }

    loadFinancialYears = () => {
        getRequest(GET_URL.financialyear.api, { is_active: true }, this.props)
            .then(res => {
                if (res?.status === 200) {
                    const options = res.data.data || []
                    const today = new Date()
                    const currentFy = options.find(fy => {
                        const start = new Date(fy.start_date)
                        const end = new Date(fy.end_date)
                        return today >= start && today <= end
                    })
                    const currentFyId = currentFy ? currentFy.id : (options[0]?.id || '')
                    this.setState(
                        { financialYearOptions: options, financial_year: currentFyId },
                        () => { if (currentFyId) this.getDataList() }
                    )
                } else {
                    this.getDataList()
                }
            })
            .catch(() => this.getDataList())
    }



    handleFyChange = (e) => {
        this.setState({ financial_year: e.target.value }, () => this.getDataList())
    }

    updatePostFormat = (newData, id) => {
        const originalAsset = this.state.dataList.find(a => a.id === id);

        let payload = {
            asset_code: newData.asset_code,
            asset_name: newData.asset_name,
            original_cost: parseFloat(newData.original_cost),
            location: newData.location || null,
            put_to_use_date: newData.put_to_use_date ? dateFormat(newData.put_to_use_date, "YYYY-MM-DD") : null,

            // Required fields not in the form
            asset_group: originalAsset ? originalAsset.asset_group : null,
            purchase_date: originalAsset ? originalAsset.purchase_date : null
        }
        return payload
    }

    updateType = (newData, id) => {
        this.setState({ tableUpdating: true })
        let dataList = this.state.dataList
        dataList.map((data, index) => {
            if (data.id === id) {
                dataList[index].asset_code = newData.asset_code
                dataList[index].asset_name = newData.asset_name
                dataList[index].original_cost = parseFloat(newData.original_cost)
                dataList[index].location = newData.location
                dataList[index].put_to_use_date = newData.put_to_use_date
            }
        })
        this.setState({
            dataList: [...dataList],
            tableUpdating: false,
            columns: this.state.columns
        })
        return true
    }

    getDataList = (paginationProps) => {
        const url = GET_URL.assetList.api
        let { pagination } = this.state
        this.currentPagination = pagination;
        if (paginationProps) {
            this.currentPagination = { ...paginationProps };
        }
        let pagination_params = getPaginationProps(this.currentPagination);
        const params = { is_active: true, ...pagination_params }
        if (this.state.financial_year) {
            params.financial_year = this.state.financial_year
        }
        getRequest(url, params, this.props).then(response => {
            if (response && response.status === 200) {
                const data = response.data.data
                this.setState({
                    assetData: data,
                    dataList: data.data_list || [],
                    loading: false,
                    tableUpdating: false,
                    pagination: this.currentPagination
                        ? this.currentPagination
                        : this.state.pagination,
                })
            }
        })
    }

    deleteType = async (id) => {
        let dataList = this.state.dataList
        dataList.map((data, index) => {
            if (data.id === id) {
                dataList.splice(index, 1)
            }
        })
        this.setState({
            dataList: dataList,
        })
    }

    render() {
        const { loading, dataList, columns, options, tableUpdating, disposeModalOpen, addAmountModalOpen, selectedAsset, assetData, pagination } = this.state
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
                            <Grid item md={4} xs={12} className={classNames('header-align')}>
                                <Box className='heading'>
                                    Fixed Assets
                                </Box>
                            </Grid>
                            <Grid item md={4} xs={12} style={{ padding: '10px 20px' }}>
                                <TextField
                                    fullWidth select label="Financial Year"
                                    value={this.state.financial_year}
                                    onChange={this.handleFyChange}
                                    variant="outlined"
                                    size="small"
                                >
                                    {this.state.financialYearOptions.map(fy => (
                                        <MenuItem key={fy.id} value={fy.id}>
                                            {fy.name || `${fy.start_date} - ${fy.end_date}`}
                                        </MenuItem>
                                    ))}
                                </TextField>
                            </Grid>
                            <Grid item md={4} xs={12} >
                                <Box className={classNames('header-align', 'end-flex-prop')}>
                                    <Button
                                        variant="contained"
                                        component={Link}
                                        to={Actions.depreciation?.view?.url || '/finance/depreciation'}
                                        style={{ marginRight: 10 }}
                                        color="primary"
                                    >
                                        Run Depreciation
                                    </Button>
                                    {isUserHasPermission('assets', 'create') && <Button
                                        variant="contained"
                                        component={Link} to={Actions.assets.create.url}
                                        className='editbutton-view'
                                    ><AddCircleOutlineOutlinedIcon className='visibility-icon' /> Add Asset</Button>}
                                </Box>

                            </Grid>
                        </Grid>
                        <Grid container className={classNames('header-align')}>
                            <Grid item md={12} xs={12}>
                                <Paper>
                                    <AllMUIDataTable
                                        key={dataList}
                                        title={tableUpdating ? <CircularProgress className='white-text' /> : 'Fixed Assets'}
                                        data={dataList}
                                        columns={columns}
                                        options={options}
                                        serverSide={true}
                                        pagination={pagination}
                                        onTableChange={this.getDataList}
                                        count={assetData.count || 0}
                                    />
                                </Paper>
                            </Grid>
                        </Grid>
                    </Paper>
                    <AssetDisposalModal
                        open={disposeModalOpen}
                        onClose={this.closeDisposeModal}
                        asset={selectedAsset}
                        onSuccess={this.onDisposalSuccess}
                    />
                    <AssetAdditionModal
                        open={addAmountModalOpen}
                        onClose={this.closeAddAmountModal}
                        asset={selectedAsset}
                        onSuccess={this.onAddAmountSuccess}
                    />
                </Box>
            )
        }
    }
}

export default AssetList
