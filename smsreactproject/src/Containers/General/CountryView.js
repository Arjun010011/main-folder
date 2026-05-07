import React, { Component } from 'react'
import { Paper, Box, Grid, Button, CircularProgress } from '@material-ui/core';
import Swal from 'sweetalert2'
import AddCircleOutlineOutlinedIcon from '@material-ui/icons/AddCircleOutlineOutlined';
import { Link } from 'react-router-dom';
import classNames from 'classnames';

import ActionColumn from 'Components/ActionColumnNew'
import AllMUIDataTable from 'Components/AllMUIDataTable';
import loadingBar from 'images/loading.gif'
import { getRequest, putRequest, deleteRequest } from 'Includes/api/apicall';
import { GET_URL, PUT_URL, DEL_URL } from 'Includes/urls'
import { nameAndNumberRegex, nameRegex } from 'Constants/regularExpression'
import { Actions } from 'Constants/permissions';
import { isUserHasPermission } from 'Includes/functions';
import { options } from 'Constants';


const alias_names = JSON.parse(localStorage.getItem('alias_name')) ? JSON.parse(localStorage.getItem('alias_name')) : {}

const fieldDetails = [
    {
        label: 'Country Name', regex: nameRegex, name: 'name', md: 12, className: 'width-100', required: true, id: 'outlined-textarea',
        default: '', rows: null, type: 'text', maxLength: 30
    },
    {
        label: 'Country Code', regex: nameAndNumberRegex, name: 'code', md: 12, className: 'width-100', required: true,
        id: 'outlined-textarea', default: '', rows: null, type: 'text', maxLength: 20
    },
]

class CountryView extends Component {
    constructor() {
        super()
        this.state = {
            countryList: [],
            loading: true,
            selectedToDelete: [],
            tableUpdating: false,
            columns: [
                {
                    name: "id",
                    label: "id",
                    options: {
                        filter: false,
                        sort: false,
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
                    label: "Country Name",
                    options: {
                        filter: false,
                        sort: true,
                        search: true,
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
                            return (<div className='text-transform-none'>
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
                        filter: true,
                        sort: true,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return (<div>
                                <ActionColumn
                                    id={tableMeta.rowData[0]}
                                    fieldValues={this.fieldValues(tableMeta.rowData[2], tableMeta.rowData[3])}
                                    label='Please Update Country Details'
                                    fieldDetails={fieldDetails}
                                    updateUrl={PUT_URL.country.api}
                                    updatePostFormat={this.updatePostFormat}
                                    updateType={this.updateType}
                                    deleteUrl={DEL_URL.country.api}
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
        const hasEditPermission = isUserHasPermission('manage_countries', 'update')
        const hasDeletePermission = isUserHasPermission('manage_countries', 'delete')
        let permissions = [];
        let enabledActions = []
        if (hasEditPermission) {
            enabledActions.push('edit')
            permissions.push('manage_countries');
        }
        if (hasDeletePermission) {
            enabledActions.push('delete')
            permissions.push('manage_countries');
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
        let country = this.state.countryList
        country.map((data, index) => {
            if (data.id === id) {
                country[index].name = newData.name
                country[index].code = newData.code
            }
        })
        this.setState({
            countryList: [...country],
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
                    loading: false
                })

            }
        })
    }

    deleteType = async (id) => {
        let country = this.state.countryList
        country.map((data, index) => {
            if (data.id === id) {
                country.splice(index, 1)
            }
        })
        this.setState({
            countryList: country
        })
    }

    render() {
        const { loading, countryList, columns, options, tableUpdating } = this.state
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
                                    Country Info
                                    </Box>
                                <Box className='sub-heading'>
                                    {`The Country schedule of the ${alias_names['school']} is defined here over a period time.The academic year
                                    over 12 months of time.`}
                                    </Box>
                            </Grid>
                            <Grid item md={6} xs={12} >
                                <Box className={classNames('header-align', 'end-flex-prop')}>
                                    {isUserHasPermission('manage_countries', 'create') && <Button
                                        variant="contained"
                                        component={Link} to={Actions.manage_countries.create.url}
                                        className='editbutton-view'
                                    ><AddCircleOutlineOutlinedIcon className='visibility-icon' /> {Actions.manage_countries.create.label}</Button>}
                                </Box>

                            </Grid>
                        </Grid>
                        <Grid container className={classNames('header-align')}>
                            <Grid item md={8}>
                                <Paper>
                                    <AllMUIDataTable
                                        key={countryList}
                                        title={tableUpdating ? <CircularProgress className='white-text' /> : ''}
                                        data={countryList}
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
export default CountryView




