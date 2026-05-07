import React, { Component } from 'react'
import { Paper, Box, Grid, Button, CircularProgress, Tooltip } from '@material-ui/core';
import Swal from 'sweetalert2'
import AddCircleOutlineOutlinedIcon from '@material-ui/icons/AddCircleOutlineOutlined';
import { withRouter } from 'react-router-dom';
import classNames from 'classnames';
import InfoIcon from "@material-ui/icons/Info";

import StudentListActions from 'Includes/StudentListActions'
import AllMUIDataTable from 'Components/AllMUIDataTable';
import loadingBar from 'images/loading.gif'
import { getRequest, deleteRequest } from 'Includes/api/apicall';
import { GET_URL, DEL_URL } from 'Includes/urls'
import { Actions } from 'Constants/permissions';
import { isUserHasPermission } from 'Includes/functions';
import { options } from 'Constants';

const alias_names = JSON.parse(localStorage.getItem('alias_name')) ? JSON.parse(localStorage.getItem('alias_name')) : {}

class SchoolAddressView extends Component {
    constructor() {
        super()
        this.state = {
            hostelBuildingList: [],
            loading: true,
            selectedToDelete: [],
            tableUpdating: false,
            yearList: [],
            year: '',
            pageLoading: false,
            isBlankPage: true,
            error: {},
            selectedExpenses: null,
            dateRangeValue: {},
            minDate: '',
            maxDate: '',
            enableDateRange: false,
            expensesTypeList: [],
            columns: [
                {
                    name: "id",
                    label: "id",
                    options: {
                        filter: false,
                        sort: false,
                        display: false,
                        viewColumns: false,
                    }
                },
                {
                    name: "default",
                    label: "default",
                    options: {
                        filter: false,
                        sort: false,
                        display: false,
                        viewColumns: false,
                    }
                },
                {
                    name: "standard_names", 
                    label: `${alias_names['standard']}`,
                    options: {
                        filter: true,
                        sort: true,
                    }
                },
                {
                    name: "name",
                    label: "Address",
                    options: {
                        filter: false,
                        sort: true,
                    }
                },
                {
                    name: "address",
                    label: "Address details",
                    options: {
                        filter: true,
                        sort: true,
                    }
                },
                {
                    name: 'Actions',
                    label: 'Action',
                    options: {
                        display: this.updatePermissions('display'),
                        filter: false,
                        sort: false,
                        viewColumns: false,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return (<div>
                                {tableMeta.rowData[1] ?
                                    <Tooltip
                                        title="Cant Edit/Delete default primary address"
                                        placement="top-start"
                                        arrow
                                    >
                                        <InfoIcon />
                                    </Tooltip>
                                    :
                                    <StudentListActions
                                        id={tableMeta.rowData[0]}
                                        index={tableMeta.rowIndex}
                                        deleteStudent={this.deleteExpense}
                                        editURL={Actions.school_address.update.url}
                                        viewURL={Actions.address_individual.view.url}
                                        enabledActions={this.state.enabledActions}
                                    />
                                }
                            </div>

                            );
                        }
                    }
                }

            ]
        }
    }


    updatePermissions = (name) => {
        let test = true
        const hasViewPermission = isUserHasPermission('address_individual', 'view')
        const hasEditPermission = isUserHasPermission('school_address', 'update')
        const hasDeletePermission = isUserHasPermission('school_address', 'delete')
        let enabledActions = [];
        if (hasViewPermission) {
            enabledActions.push('view')
        }
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
        this.getSchoolAddressList()
        this.updatePermissions('actions');
        this.setState({
            options: { ...options }
        })
    }

    updateDateRange = (year) => {
        let { yearList, minDate, maxDate } = this.state;
        yearList.map((data) => {
            if (data.id == year) {
                minDate = data.start_date
                maxDate = data.end_date
            }
        })
        this.setState({
            minDate,
            maxDate,
            enableDateRange: true
        })
    }


    getSchoolAddressList = () => {
        const url = GET_URL.instituteaddress.api
        const params = { is_active: true }
        getRequest(url, params, this.props).then(response => {
            if (response && response.status === 200) {
                let standard_names = []
                response.data.data.map((data) => {
                    standard_names = []
                    if (data.map_address_data && data.map_address_data) {
                        data['name'] = data.map_address_data.address_one_map
                        data['address'] = this.getFormattedAddress(data.map_address_data)
                        data.standard_data.map((std) => {
                            standard_names.push(std.name)
                        })
                        data['standard_names'] = standard_names.join(` ,`)
                    }
                    if(data.default){
                        data['standard_names']=
                        <div className='text-blue'>
                            Default Address
                        </div>
                    }
                })
                this.setState({
                    hostelBuildingList: response.data.data,
                    loading: false
                })
            }
        })
    }

    getFormattedAddress = (map_address) => {
        let return_result = ''
        return_result = map_address.address_two_map + "  " +
            map_address.city_map + ',' + " " + map_address.district_map + ',' + " " + map_address.state_map + ',' + " " +
            map_address.country_map + ',' + " " + map_address.pincode_map
        return return_result
    }

    deleteExpense = async (id, index) => {
        this.setState({ tableUpdating: true })
        let { hostelBuildingList, columns } = this.state
        const del_url = DEL_URL.instituteaddress.api
        const url = del_url + id + '/';
        deleteRequest(url, {}, this.props).then(response => {
            if (response && response.status === 200) {
                hostelBuildingList.splice(index, 1)
                this.setState({
                    hostelBuildingList,
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

    handleAddExpensesButton = () => {
        this.props.history.push({
            pathname: Actions.school_address.create.url,
        });
    }


    render() {
        const { loading, columns, options, tableUpdating, expensesList, selectedExpenses, minDate, maxDate, enableDateRange, hostelBuildingList } = this.state
        const { isComponent } = this.props;
        let classNamePaper = (isComponent) ? '' : 'paper-background';
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
                    <Paper className={classNamePaper}>
                        <Grid container>
                            <Grid item md={6} xs={12} className={classNames('header-align')}>
                                <Box className='heading'>
                                    {Actions.school_address.view.label}
                                </Box>
                            </Grid>

                            <Grid item md={6} xs={12} >
                                <Box className={classNames('header-align', 'end-flex-prop')}>
                                    {isUserHasPermission('school_address', 'create') && <Button
                                        variant="contained"
                                        onClick={this.handleAddExpensesButton}
                                        className='editbutton-view'
                                    ><AddCircleOutlineOutlinedIcon className='visibility-icon' /> {Actions.school_address.create.label}</Button>
                                    }
                                </Box>

                            </Grid>
                        </Grid>
                        <Grid container className={classNames('header-align')}>
                            <Grid item md={12}>
                                <Paper>
                                    <AllMUIDataTable
                                        key={hostelBuildingList}
                                        title={tableUpdating ? <CircularProgress className='white-text' /> : ''}
                                        data={hostelBuildingList}
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
export default withRouter(SchoolAddressView)




