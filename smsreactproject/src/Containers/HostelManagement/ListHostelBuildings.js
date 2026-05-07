import React, { Component } from 'react'
import { Paper, Box, Grid, Button, CircularProgress, Tooltip } from '@material-ui/core';
import Swal from 'sweetalert2'
import AddCircleOutlineOutlinedIcon from '@material-ui/icons/AddCircleOutlineOutlined';
import { withRouter } from 'react-router-dom';
import classNames from 'classnames';

import { DropDownWithSearch } from 'Components/DropDownWithSearch';
import { DateRange } from 'Components/DateRange';
import BlankPagewithIcon from 'Components/BlankPageWithIcon';
import { Dropdown } from 'Components/DropDown';
import StudentListActions from 'Includes/StudentListActions'
import AllMUIDataTable from 'Components/AllMUIDataTable';
import loadingBar from 'images/loading.gif'
import { getRequest, putRequest, deleteRequest } from 'Includes/api/apicall';
import { GET_URL, PUT_URL, DEL_URL } from 'Includes/urls'
import { nameAndNumberRegex } from 'Constants/regularExpression'
import { Actions } from 'Constants/permissions';
import { isUserHasPermission } from 'Includes/functions';
import { options } from 'Constants';
import { values } from 'react-intl/locale-data/hi';

class ListHostelBuildings extends Component {
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
                    name: "name",
                    label: "Building Name",
                    options: {
                        filter: false,
                        sort: true,
                    }
                },
                {
                    name: "building_for_name",
                    label: "Hostel Type",
                    options: {
                        filter: true,
                        sort: true,
                    }
                },
                {
                    name: "number_of_floors",
                    label: "No. Of Floors",
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
                                <StudentListActions
                                    id={tableMeta.rowData[0]}
                                    index={tableMeta.rowIndex}
                                    deleteStudent={this.deleteExpense}
                                    editURL={Actions.hostel.update.url}
                                    viewURL={Actions.hostel_individual.view.url}
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


    updatePermissions = (name) => {
        let test = true
        const hasViewPermission = isUserHasPermission('hostel_individual', 'view')
        const hasEditPermission = isUserHasPermission('hostel', 'update')
        const hasDeletePermission = isUserHasPermission('hostel', 'delete')
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
        this.getHostelBuildingList()
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


    getHostelBuildingList = () => {
        const url = GET_URL.buildingdata.api
        const params = { is_active: true ,building_type:'Hostel'}
        getRequest(url, params, this.props).then(response => {
            if (response && response.status === 200) {
                this.setState({
                    hostelBuildingList: response.data.data,
                    loading: false
                })
            }
        })
    }

    deleteExpense = async (id, index) => {
        this.setState({ tableUpdating: true })
        let { hostelBuildingList, columns } = this.state
        const del_url = DEL_URL.buildingdata.api
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
            pathname: Actions.hostel.create.url,
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
                                    Hostel Building
                                </Box>
                            </Grid>

                            <Grid item md={6} xs={12} >
                                <Box className={classNames('header-align', 'end-flex-prop')}>
                                    {isUserHasPermission('hostel', 'create') && <Button
                                        variant="contained"
                                        onClick={this.handleAddExpensesButton}
                                        className='editbutton-view'
                                    ><AddCircleOutlineOutlinedIcon className='visibility-icon' /> {Actions.hostel.create.label}</Button>
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
export default withRouter(ListHostelBuildings)




