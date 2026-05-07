import React, { Component } from 'react';
import { Link, withRouter } from 'react-router-dom';
import AddCircleOutlineIcon from '@material-ui/icons/AddCircleOutline';
import { Grid, Paper, Box, Button, CircularProgress } from '@material-ui/core';
import Swal from 'sweetalert2'
import AllMUIDataTable from 'Components/AllMUIDataTable';
import AddCircleOutlineOutlinedIcon from '@material-ui/icons/AddCircleOutlineOutlined';
import { cloneDeep } from 'lodash';
import { Dropdown } from 'Components/DropDown';


import { Actions } from 'Constants/permissions';
import { isUserHasPermission, getFormatMessage, getKeyValueMap, getUrlParam } from 'Includes/functions';
import { GET_URL, DEL_URL, PUT_URL } from 'Includes/urls';
import { getRequest, deleteRequest, putRequest } from 'Includes/api/apicall';
import StudentListActions from 'Includes/StudentListActions';
import loadingBar from 'images/loading.gif'
import classNames from 'classnames';
import { FormattedMessage } from 'react-intl';
import commonMessages from 'Constants/messages';
import './styles.scss';
import { Forms } from 'Constants/FormDefinition';
import BlankPagewithIcon from 'Components/BlankPageWithIcon';

class ViewCustomForm extends Component {
    constructor(props) {
        super(props);
        this.state = {
            loading: false,
            selected_form: '',
            fieldError: {},
            custom_form_list: [],
            tableUpdating: false,

        };
        this.columns = [
            {
                name: "id",
                label: "id",
                options: {
                    filter: false,
                    sort: false,
                    viewColumns: false,
                    display: false,
                    download: false
                }
            },
            {
                name: "form_name",
                label: 'Form Name',
                options: {
                    filter: true,
                    sort: true,
                }
            },
            {
                name: "active",
                label: 'Active Form',
                options: {
                    filter: true,
                    sort: false,
                }
            },
            {
                name: "is_active",
                label: "id",
                options: {
                    filter: false,
                    sort: false,
                    viewColumns: false,
                    display: false,
                    download: false
                }
            },
            {
                name: "Actions",
                label: <FormattedMessage {...commonMessages.actions} />,
                options: {
                    filter: false,
                    sort: false,
                    download: false,
                    customBodyRender: (value, tableMeta, updateValue) => {
                        return (<div>
                            <StudentListActions
                                id={tableMeta.rowData[0]}
                                index={tableMeta.rowIndex}
                                deleteStudent={this.deleteCustomForm}
                                editURL={Actions.custom_form.update.url}
                                editExtraParams={{ id: tableMeta.rowData[0], form_name: this.state.selected_form }}
                                enabledActions={this.getActionsMenu(tableMeta.rowData[3])}
                                handleActive={this.handleActive}
                            />
                        </div>
                        );
                    }
                }
            }
        ]
    }

    handleActive = (id, index, activeValue) => {
        let active_name = activeValue === 'active' ? 'Active' : 'In Active'
        Swal.fire({
            title: "Are you sure?",
            text: `You want to ${active_name}!`,
            showCancelButton: true,
            confirmButtonColor: "#3085d6",
            cancelButtonColor: "#d33",
            confirmButtonText: active_name,
        }).then(async (result) => {
            if (result.value) {
                let post_data = {
                    is_active: activeValue === 'active' ? true : false
                }
                const url = PUT_URL.customform.api + id + '/'
                putRequest(url, post_data, this.props).then(response => {
                    if (response && response.status === 200) {
                        Swal.fire({
                            position: 'top-end',
                            type: 'success',
                            title: response.data.Reason,
                            showConfirmButton: false,
                            timer: 1500
                        })
                        this.getCustomFormList()
                    }
                })
            }
        });
    }

    getActionsMenu = (is_active) => {
        let return_data = ['edit', 'delete']
        if (is_active) {
            return_data.push('inactive')
        }
        else {
            return_data.push('active')
        }
        return return_data
    }

    handleEditPage = (name, label) => {
        let formInformation = {
            form_name: name,
            form_label: label,
        }
        let searchParam = "?" + new URLSearchParams(formInformation).toString()
        this.props.history.push({
            pathname: Actions.custom_form.create.url,
            search: searchParam,
        });
    }

    componentDidMount() {
        let { form_name } = getUrlParam();
        let { selected_form } = this.state;
        let form_details_temp = cloneDeep(Forms)
        let form_details = []
        form_details_temp.map((data) => {
            form_details.push({ id: data.page_details.form_name, name: data.page_details.form_label })
        })
        if (form_name) {
            selected_form = form_name
        }
        this.setState({
            form_details,
            selected_form
        }, () => {
            if (form_name) {
                this.getCustomFormList()
            }
        })
    }

    deleteCustomForm = (id, index) => {
        let url = `${DEL_URL.customform.api}${id}/`
        let { custom_form_list } = this.state;
        deleteRequest(url, {}, this.props).then((response) => {
            if (response && response.status === 200) {
                custom_form_list.splice(index, 1)
                this.setState({
                    custom_form_list: [...custom_form_list]
                })
                Swal.fire({
                    position: 'top-end',
                    type: 'success',
                    title: response.data.Reason,
                    showConfirmButton: false,
                    timer: 1500
                })
            }
        });
    }

    updatePermissions = (name) => {
        let test = true
        const hasEditPermission = isUserHasPermission('custom_form', 'update')
        const hasDeletePermission = isUserHasPermission('custom_form', 'delete')
        let permissions = [];
        let enabledActions = []
        if (hasEditPermission) {
            enabledActions.push('edit')
            permissions.push('custom_form');
        }
        if (hasDeletePermission) {
            enabledActions.push('delete')
            permissions.push('custom_form');
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
                permissions,
                columns: this.state.columns
            })
        }
    }

    handleSearchChange = (e) => {
        let { name, value } = e.target;
        let { fieldError } = this.state;
        delete fieldError[name]
        this.setState({
            [name]: value,
            tableUpdating: true,
            fieldError
        }, () => {
            this.getCustomFormList()
        })
    }

    getActiveValue = (is_active) => {
        if (is_active) {
            return (
                <div className='text-green'>
                    Active
                </div>
            )
        }
        else {
            return (
                <div className='text-red'>
                    In Active
                </div>
            )
        }
    }

    getCustomFormList = () => {
        this.setState({ loading: true })
        const { selected_form } = this.state;
        const params = { form_for: selected_form }
        getRequest(GET_URL.customform.api, params, this.props).then((response) => {
            if (response && response.status === 200) {
                let custom_form_list = response.data.data;
                custom_form_list.map((data) => {
                    data['active'] = this.getActiveValue(data['is_active'])
                })
                let column_list = cloneDeep(this.columns)
                this.columns = [...column_list]
                this.setState({ custom_form_list })
            }
            this.setState({
                tableUpdating: false,
                loading: false
            })
        });
    }

    handleAddCustomForm = () => {
        let { selected_form, fieldError, alertData, form_details } = this.state;
        if (selected_form) {
            let form_name = getKeyValueMap(form_details, 'id', 'name')
            let formInformation = {
                form_name: selected_form,
                form_label: form_name[selected_form],
            }
            let searchParam = "?" + new URLSearchParams(formInformation).toString()
            this.props.history.push({
                pathname: Actions.custom_form.create.url,
                search: searchParam,
            });
        }
        else {
            alertData = 'Select Form'
            fieldError.selected_form = alertData
            this.setState({
                open: true,
                alertData,
                fieldError
            })
        }

    }

    render() {
        const { loading, form_details, selected_form, fieldError, custom_form_list, tableUpdating } = this.state;
        const options = {
            selectableRows: 'none',
            responsive: "scroll",
            viewColumns: false,
            filter: false,
            print: false,
            downloadOptions: {
                filename: "Customform.csv",
                filterOptions: {
                    useDisplayedColumnsOnly: true,
                    useDisplayedRowsOnly: true,
                },
            },
            onDownload: (buildHead, buildBody, columns, data) => {
                const bodyData = data.map((data_value) => {
                    return data_value;
                })
                const bodyColumn = columns.map((column_name) => {
                    column_name.label = getFormatMessage(column_name.label)
                    return column_name;
                })
                return "\uFEFF" + buildHead(bodyColumn) + buildBody(bodyData);
            }
        }
        if (loading) {

            return (
                <Box display='flex'>
                    <img src={loadingBar} className='loading' alt='loading' />
                </Box>
            )
        }
        else {

            return (
                <>
                    <Paper>
                        <Box className="paper-background">
                            <Grid container >
                                <Grid item md={6} xs={12} className={classNames('header-align')}>
                                    <Box className='heading'>
                                        Custom Form
                                    </Box>
                                </Grid>
                                <Grid item md={6} xs={12} >
                                    <Box className={classNames('header-align', 'end-flex-prop')}>
                                        {isUserHasPermission('custom_form', 'create') && <Button
                                            variant='contained'
                                            // component={Link} to={Actions.custom_form.create.url}
                                            onClick={this.handleAddCustomForm}
                                            className='editbutton-view'
                                        >
                                            <AddCircleOutlineOutlinedIcon className='visibility-icon' />
                                            {Actions.custom_form.create.label}</Button>}
                                    </Box>
                                </Grid>
                            </Grid>
                            <div className='mt-20'>
                                <Dropdown
                                    id='new_custom_form_classname'
                                    label='Form Name'
                                    name='selected_form'
                                    data={form_details}
                                    value={selected_form}
                                    hideSelect
                                    required
                                    className={'width-300px'}
                                    onChange={(e) => this.handleSearchChange(e)}
                                    helperText={fieldError['selected_form'] && fieldError['selected_form']}
                                    error={fieldError['selected_form'] && fieldError['selected_form']}
                                />
                            </div>
                            <Grid container>
                                {!selected_form ?
                                    <Grid item md={12} xs={12} sm={12} className='mt-20'>
                                        <BlankPagewithIcon data='Select form name' />
                                    </Grid>
                                    :
                                    <Grid item md={8} xs={12} sm={12}>
                                        <Paper className='mt-20'>
                                            <AllMUIDataTable
                                                key={custom_form_list}
                                                data={custom_form_list}
                                                columns={this.columns}
                                                options={options}
                                                title={tableUpdating ? <CircularProgress className='white-text' /> : ''}
                                            />
                                        </Paper>
                                    </Grid>
                                }
                            </Grid>
                        </Box>
                    </Paper>
                </>
            )
        }
    }
}

export default withRouter(ViewCustomForm) 