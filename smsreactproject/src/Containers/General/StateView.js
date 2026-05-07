import React, { Component } from 'react'
import { Paper, Box, Grid, Button, CircularProgress } from '@material-ui/core';
import AddCircleOutlineOutlinedIcon from '@material-ui/icons/AddCircleOutlineOutlined';
import { withRouter } from 'react-router-dom';
import classNames from 'classnames';
import Snackbar from '@material-ui/core/Snackbar';
import MuiAlert from '@material-ui/lab/Alert';

import ActionColumn from 'Components/ActionColumnNew'
import AllMUIDataTable from 'Components/AllMUIDataTable';
import loadingBar from 'images/loading.gif'
import { getRequest } from 'Includes/api/apicall';
import { GET_URL, PUT_URL, DEL_URL } from 'Includes/urls'
import { nameAndNumberRegex, nameRegex } from 'Constants/regularExpression'
import { Actions } from 'Constants/permissions';
import { isUserHasPermission, getKeyValueMap } from 'Includes/functions';
import { options } from 'Constants';
import { Dropdown } from 'Components/DropDown';


const alias_names = JSON.parse(localStorage.getItem('alias_name')) ? JSON.parse(localStorage.getItem('alias_name')) : {}

function Alert(props) {
    return <MuiAlert elevation={6} variant="filled" {...props} />;
}

const fieldDetails = [
    {
        label: 'State Name', regex: nameRegex, name: 'name', md: 12, className: 'width-100', required: true,
        id: 'outlined-textarea', default: '', rows: null, type: 'text', maxLength: 30
    },
    {
        label: 'State Code', regex: nameAndNumberRegex, name: 'code', md: 12, className: 'width-100', required: true,
        id: 'outlined-textarea', default: '', rows: null, type: 'text', maxLength: 20
    },
]

class StateView extends Component {
    constructor() {
        super()
        this.state = {
            countryList: [],
            selectedCountry: '',
            stateList: [],
            loading: true,
            selectedToDelete: [],
            tableUpdating: false,
            error: {},
            alertData: '',
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
                    name: "name",
                    label: "State Name",
                    options: {
                        filter: true,
                        sort: true,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return (<div className='mui-table-custom-value-left-align text-transform-none'>
                                {value}
                            </div>)

                        }
                    }
                },
                {
                    name: "code",
                    label: "code",
                    options: {
                        filter: true,
                        sort: true,
                        display: true,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return (<div className=' text-transform-none'>
                                {value}
                            </div>)

                        },
                    }
                },
                {
                    name: 'Actions',
                    label: 'Actions',
                    options: {
                        display: this.updatePermissions('display'),
                        filter: false,
                        sort: false,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return (<div>
                                <ActionColumn
                                    id={tableMeta.rowData[0]}
                                    fieldValues={this.fieldValues(tableMeta.rowData[2], tableMeta.rowData[3])}
                                    label='Please Update State Details'
                                    fieldDetails={fieldDetails}
                                    updateUrl={PUT_URL.state.api}
                                    updatePostFormat={this.updatePostFormat}
                                    updateType={this.updateType}
                                    deleteUrl={DEL_URL.state.api}
                                    deleteType={this.deleteType}
                                    baseClassName='action-basic-detail-width'
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


    fieldValues(name, code) {
        let fieldValues = [];
        fieldValues.push(name);
        fieldValues.push(code);
        return fieldValues
    }

    updatePostFormat = (newData) => {
        let payload = {
            name: newData.name,
            code: newData.code
        }
        return payload
    }

    updatePermissions = (name) => {
        let test = true
        const hasEditPermission = isUserHasPermission('manage_states', 'update')
        const hasDeletePermission = isUserHasPermission('manage_states', 'delete')
        let permissions = [];
        let enabledActions = []
        if (hasEditPermission) {
            enabledActions.push('edit')
            permissions.push('manage_states');
        }
        if (hasDeletePermission) {
            enabledActions.push('delete')
            permissions.push('manage_states');
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

    componentDidMount = () => {
        this.getcountryList()
        this.updatePermissions('actions');
        this.setState({
            options: options
        })
    }


    updateType = (newData, id) => {
        this.setState({ tableUpdating: true })
        let state = this.state.stateList
        state.map((data, index) => {
            if (data.id === id) {
                state[index].name = newData.name
                state[index].code = newData.code
            }
        })
        this.setState({
            stateList: [...state],
            tableUpdating: false,
            columns: this.state.columns
        })
        return true
    }


    getcountryList = () => {
        const url = GET_URL.country.api
        const params = { is_active: true }
        getRequest(url, params, this.props).then(response => {
            if (response && response.status === 200) {
                this.setState({
                    countryList: response.data.data,
                })
                if (this.props.location.state) {
                    let selectedCountry = this.props.location.state.selectedCountry
                    this.setState({
                        selectedCountry: selectedCountry,
                    })
                    this.getStateList(selectedCountry);
                }
                else {
                    this.setState({
                        loading: false
                    })
                }
            }
        })
    }

    deleteType = async (id) => {
        this.setState({ tableUpdating: true })
        let state = this.state.stateList
        state.map((data, index) => {
            if (data.id === id) {
                state.splice(index, 1)
            }
        })
        this.setState({
            stateList: state
        })
    }

    onChange = async (e) => {
        let { value, name, error } = e.target;
        if (value !== 0 && value !== [name]) {
            error = {}
            this.setState({
                [name]: value,
                error,
                tableUpdating: true
            }, () => {
                this.getStateList(value);
            })
        }
    }

    getStateList = (id) => {
        const g_url = GET_URL.getstatesforcountry.api
        const params = '?is_active=true'
        const url = g_url + id + '/' + params
        getRequest(url, {}, this.props).then(response => {
            if (response && response.status === 200) {
                this.setState({
                    stateList: response.data.data,
                    tableUpdating: false,
                    loading: false
                })
            }
        })
    }

    handleAddStateButton = () => {
        let { selectedCountry, error, alertData, countryList } = this.state;
        if (selectedCountry && selectedCountry !== 0) {

            let countryNames = getKeyValueMap(countryList, 'id', 'name')
            let countryName = countryNames[selectedCountry]

            this.props.history.push({
                pathname: Actions.manage_states.create.url,
                state: { countryName: countryName, selectedCountry: selectedCountry }
            })
        }
        else {
            alertData = 'Please select country'
            error.country = alertData
            this.setState({
                open: true,
                alertData,
                error
            })
        }

    }

    handleClose = () => {
        this.setState({
            open: false
        })
    }


    render() {
        const { loading, countryList, selectedCountry, stateList, columns, options, tableUpdating, open, error, alertData } = this.state
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
                            <Grid item md={5} xs={12} className={classNames('header-align')}>
                                <Box className='heading'>
                                    State Information
                                    </Box>
                                <Box className='sub-heading'>
                                    {`The State schedule of the ${alias_names['school']} is defined here over a period time.The academic year
                                    over 12 months of time.`}
                                    </Box>
                            </Grid>
                            <Grid item md={3} xs={12} className='margin-top-20'>
                                <Dropdown
                                    data={countryList}
                                    name='selectedCountry'
                                    style='width-100'
                                    value={selectedCountry}
                                    onChange={this.onChange}
                                    label='Select Country'
                                    error={error.country}
                                />
                            </Grid>
                            <Grid item md={3} xs={12} >
                                <Box className={classNames('header-align', 'end-flex-prop')}>
                                    {isUserHasPermission('manage_states', 'create') && <Button
                                        variant="contained"
                                        onClick={this.handleAddStateButton}
                                        className='editbutton-view'
                                    ><AddCircleOutlineOutlinedIcon className='visibility-icon' /> {Actions.manage_states.create.label}</Button>}
                                </Box>
                            </Grid>
                        </Grid>
                        <Grid container className={classNames('header-align')}>
                            <Grid item md={8}>
                                <Paper>
                                    <AllMUIDataTable
                                        key={stateList}
                                        title={tableUpdating ? <CircularProgress className='white-text' /> : ''}
                                        data={stateList}
                                        columns={columns}
                                        options={options}
                                    />
                                </Paper>
                            </Grid>
                        </Grid>
                        <Snackbar anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} open={open} autoHideDuration={2000} onClose={this.handleClose}>
                            <Alert onClose={this.handleClose} severity="error">
                                {alertData}
                            </Alert>
                        </Snackbar>
                    </Paper>
                </Box>
            )
        }
    }
}
export default withRouter(StateView)




