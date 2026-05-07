import React, { Component } from 'react'
import { Paper, Box, Grid, Button, CircularProgress, Tooltip } from '@material-ui/core';
import Swal from 'sweetalert2'
import AddCircleOutlineOutlinedIcon from '@material-ui/icons/AddCircleOutlineOutlined';
import { withRouter } from 'react-router-dom';
import classNames from 'classnames';

import StudentListActions from 'Includes/StudentListActions'
import AllMUIDataTable from 'Components/AllMUIDataTable';
import loadingBar from 'images/loading.gif'
import { getRequest,  deleteRequest } from 'Includes/api/apicall';
import { GET_URL,  DEL_URL } from 'Includes/urls'
import { Actions } from 'Constants/permissions';
import { isUserHasPermission} from 'Includes/functions';
import { options } from 'Constants';

class NotificationTemplateList extends Component {
    constructor() {
        super()
        this.state = {
            templateList: [],
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
                    label: "Title",
                    options: {
                        filter: false,
                        sort: true,
                    }
                },
                {
                    name: "notification_medium_name",
                    label: "Notification Medium",
                    options: {
                        filter: true,
                        sort: true,
                    }
                },
                {
                    name: "language_name",
                    label: "Language",
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
                                    deleteStudent={this.deleteTemplate}
                                    editURL={Actions.notification_template.update.url}
                                    viewURL={Actions.notification_template_individual.view.url}
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
        const hasViewPermission = isUserHasPermission('notification_template_individual', 'view')
        const hasEditPermission = isUserHasPermission('notification_template', 'update')
        const hasDeletePermission = isUserHasPermission('notification_template', 'delete')
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
        this.getTemplateList()
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


    getTemplateList = () => {
        const url = GET_URL.notificationtemplate.api
        const params = { is_active: true}
        getRequest(url, params, this.props).then(response => {
            if (response && response.status === 200) {
                this.setState({
                    templateList: response.data.data,
                    loading: false
                })
            }
        })
    }

    deleteTemplate = async (id, index) => {
        this.setState({ tableUpdating: true })
        let { templateList, columns } = this.state
        const del_url = DEL_URL.notificationtemplate.api;
        const url = del_url + id + '/';
        deleteRequest(url, {}, this.props).then(response => {
            if (response && response.status === 200) {
                templateList.splice(index, 1)
                this.setState({
                    templateList,
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
            pathname: Actions.notification_template.create.url,
        });
    }


    render() {
        const { loading, columns, options, tableUpdating, expensesList, selectedExpenses, minDate, maxDate, enableDateRange, templateList } = this.state
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
                                {Actions.notification_template.view.label}
                                </Box>
                            </Grid>

                            <Grid item md={6} xs={12} >
                                <Box className={classNames('header-align', 'end-flex-prop')}>
                                    {isUserHasPermission('notification_template', 'create') && <Button
                                        variant="contained"
                                        onClick={this.handleAddExpensesButton}
                                        className='editbutton-view'
                                    ><AddCircleOutlineOutlinedIcon className='visibility-icon' /> {Actions.notification_template.create.label}</Button>
                                    }
                                </Box>

                            </Grid>
                        </Grid>
                        <Grid container className={classNames('header-align')}>
                            <Grid item md={12}>
                                <Paper>
                                    <AllMUIDataTable
                                        key={templateList}
                                        title={tableUpdating ? <CircularProgress className='white-text' /> : ''}
                                        data={templateList}
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
export default withRouter(NotificationTemplateList)




