import React, { Component } from 'react'
import { Paper, Box, Grid, Button, CircularProgress, TextField, MenuItem } from '@material-ui/core';
import Swal from 'sweetalert2'
import AddCircleOutlineOutlinedIcon from '@material-ui/icons/AddCircleOutlineOutlined';
import { Link } from 'react-router-dom';
import classNames from 'classnames';

import ActionColumn from 'Components/ActionColumnNew'
import AllMUIDataTable from 'Components/AllMUIDataTable';
import loadingBar from 'images/loading.gif'
import { getRequest } from 'Includes/api/apicall';
import { GET_URL, PUT_URL, DEL_URL } from 'Includes/urls'
import { nameWithQuoteRegex, numberRegex } from 'Constants/regularExpression'
import { Actions } from 'Constants/permissions';
import { isUserHasPermission } from 'Includes/functions';
import { options } from 'Constants';

const fieldDetails = [
    {
        label: 'Name', regex: nameWithQuoteRegex, name: 'name', md: 6, maxLength: '255', className: 'width-95-mt-30px', required: true,
        id: 'outlined-textarea', default: '', rows: null, type: 'text', autoFocus: true, isDuplicateAllow: true
    },
    {
        label: 'Code', regex: nameWithQuoteRegex, name: 'code', md: 6, maxLength: '50', className: 'width-95-mt-30px', required: false,
        id: 'outlined-textarea', default: '', rows: null, type: 'text', autoFocus: false
    },
    {
        label: 'Depreciation Method', name: 'depreciation_method', md: 6, className: 'width-95-mt-30px', required: true,
        id: 'outlined-select', default: 'WDV', type: 'dropDown', autoFocus: false, isDuplicateAllow: true,
        list: [{ id: 'SLM', name: 'Straight Line Method' }, { id: 'WDV', name: 'Written Down Value' }, { id: 'MANUAL', name: 'Manual' }, { id: 'NONE', name: 'No Depreciation' }]
    },
    {
        label: 'Useful Life (Years)', regex: numberRegex, name: 'useful_life_years', md: 6, maxLength: '3', className: 'width-95-mt-30px', required: false,
        id: 'outlined-textarea', default: '', rows: null, type: 'text', autoFocus: false, isDuplicateAllow: true
    },
    {
        label: 'Depreciation Rate (%)', regex: /^[0-9]*\.?[0-9]*$/, name: 'depreciation_rate', md: 6, maxLength: '6', className: 'width-95-mt-30px', required: true,
        id: 'outlined-textarea', default: '', rows: null, type: 'text', autoFocus: false, isDuplicateAllow: true
    },
]

class AssetGroupList extends Component {
    constructor() {
        super()
        this.state = {
            dataList: [],
            loading: true,
            tableUpdating: false,
            financialYearOptions: [],
            selectedFy: '',
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
                    name: "name",
                    label: "Name",
                },
                {
                    name: "code",
                    label: "Code",
                },
                {
                    name: "parent_group_name",
                    label: "Parent Group",
                    options: {
                        customBodyRender: (value) => {
                            return value || '-'
                        }
                    }
                },
                {
                    name: "group_type",
                    label: "Type",
                    options: {
                        customBodyRender: (value) => {
                            const types = { 'FIXED_ASSET': 'Fixed Asset', 'LIABILITY': 'Liability' }
                            return types[value] || value || 'Fixed Asset'
                        }
                    }
                },
                {
                    name: "depreciation_method",
                    label: "Method",
                    options: {
                        customBodyRender: (value, tableMeta, updateValue) => {
                            const methods = { 'SLM': 'Straight Line', 'WDV': 'Written Down Value', 'MANUAL': 'Manual', 'NONE': 'None' }
                            return methods[value] || value
                        }
                    }
                },
                {
                    name: "useful_life_years",
                    label: "Useful Life (Yrs)",
                },
                {
                    name: "depreciation_rate",
                    label: "Rate (%)",
                },
                {
                    name: "is_depreciable",
                    label: "Depreciable",
                    options: {
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return value ? 'Yes' : 'No'
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
                            return (<div>
                                <ActionColumn
                                    id={tableMeta.rowData[0]}
                                    fieldValues={this.fieldValues(tableMeta.rowData[1], tableMeta.rowData[2], tableMeta.rowData[4], tableMeta.rowData[5], tableMeta.rowData[6])}
                                    label='Edit Asset Group'
                                    fieldDetails={fieldDetails}
                                    updateUrl={PUT_URL.assetGroups.api}
                                    updatePostFormat={this.updatePostFormat}
                                    updateType={this.updateType}
                                    deleteUrl={DEL_URL.assetGroups.api}
                                    deleteType={this.deleteType}
                                    baseClassName='action-view-bank-width'
                                    enabledActions={this.state.enabledActions}
                                />
                            </div>
                            );
                        }
                    }
                }
            ]
        }
    }

    fieldValues(name, code, depreciation_method, useful_life_years, depreciation_rate) {
        let fieldValues = [];
        fieldValues.push(name);
        fieldValues.push(code);
        fieldValues.push(depreciation_method);
        fieldValues.push(useful_life_years);
        fieldValues.push(depreciation_rate);
        return fieldValues
    }

    updatePermissions = (name) => {
        let test = true
        const hasEditPermission = isUserHasPermission('asset_groups', 'update')
        const hasDeletePermission = isUserHasPermission('asset_groups', 'delete')
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
        this.loadFinancialYears()
        this.updatePermissions('actions');
        options['rowsPerPageOptions'] = [5, 10, 15, 30, 50, 100]
        options['rowsPerPage'] = '10'
        this.setState({
            options: options
        })
    }

    loadFinancialYears = () => {
        getRequest(GET_URL.financialyear.api, { is_active: true }, this.props).then(res => {
            if (res && res.status === 200) {
                const fyData = res.data.data.data_list || res.data.data || []
                let selectedFy = ''
                if (fyData.length > 0) {
                    const activeFys = fyData.filter(fy => fy.is_active === true || fy.is_active === 'true')
                    selectedFy = activeFys.length > 0 ? activeFys[0].id : fyData[0].id
                }
                this.setState({ financialYearOptions: fyData, selectedFy }, () => {
                    this.getDataList()
                })
            } else {
                this.getDataList()
            }
        }).catch(() => this.getDataList())
    }

    updatePostFormat = (newData) => {
        let payload = {
            name: newData.name,
            code: newData.code || null,
            depreciation_method: newData.depreciation_method,
            useful_life_years: parseInt(newData.useful_life_years),
            depreciation_rate: newData.depreciation_rate ? parseFloat(newData.depreciation_rate) : null,
        }
        return payload
    }

    updateType = (newData, id) => {
        this.setState({ tableUpdating: true })
        let dataList = this.state.dataList
        dataList.map((data, index) => {
            if (data.id === id) {
                dataList[index].name = newData.name
                dataList[index].code = newData.code
                dataList[index].depreciation_method = newData.depreciation_method
                dataList[index].useful_life_years = parseInt(newData.useful_life_years)
                dataList[index].depreciation_rate = newData.depreciation_rate ? parseFloat(newData.depreciation_rate) : null
            }
        })
        this.setState({
            dataList: [...dataList],
            tableUpdating: false,
            columns: this.state.columns
        })
        return true
    }

    getDataList = () => {
        const url = GET_URL.assetGroups.api
        const params = { is_active: true, limit: 100, pageno: 1 }
        if (this.state.selectedFy) params.financial_year = this.state.selectedFy

        getRequest(url, params, this.props).then(response => {
            if (response && response.status === 200) {
                this.setState({
                    dataList: response.data.data.data_list || response.data.data,
                    loading: false
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
        const { loading, dataList, columns, options, tableUpdating } = this.state
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
                                    Asset Groups
                                </Box>
                            </Grid>
                            <Grid item md={6} xs={12} >
                                <Box display="flex" justifyContent="flex-end" p={2} style={{ gap: 16 }}>
                                    <Box width="200px">
                                        <TextField
                                            select fullWidth variant="outlined" size="small"
                                            label="Financial Year"
                                            value={this.state.selectedFy}
                                            onChange={e => this.setState({ selectedFy: e.target.value }, () => this.getDataList())}
                                        >
                                            <MenuItem value="">All</MenuItem>
                                            {this.state.financialYearOptions.map(fy => (
                                                <MenuItem key={fy.id} value={fy.id}>
                                                    {fy.name || `${fy.start_date} - ${fy.end_date}`}
                                                </MenuItem>
                                            ))}
                                        </TextField>
                                    </Box>
                                    {isUserHasPermission('asset_groups', 'create') && <Button
                                        variant="contained"
                                        component={Link} to={Actions.asset_groups.create.url}
                                        className='editbutton-view'
                                        style={{ height: '40px' }}
                                    ><AddCircleOutlineOutlinedIcon className='visibility-icon' style={{ marginRight: 5 }} /> Add Asset Group</Button>}
                                </Box>
                            </Grid>
                        </Grid>
                        <Grid container className={classNames('header-align')}>
                            <Grid item md={12} xs={12}>
                                <Paper>
                                    <AllMUIDataTable
                                        key={dataList}
                                        title={tableUpdating ? <CircularProgress className='white-text' /> : ''}
                                        data={dataList}
                                        columns={columns}
                                        options={options}
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

export default AssetGroupList
