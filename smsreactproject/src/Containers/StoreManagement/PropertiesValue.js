import React, { Component } from 'react'
import { Paper, Grid, Button, CircularProgress } from '@material-ui/core';
import AddCircleOutlineOutlinedIcon from '@material-ui/icons/AddCircleOutlineOutlined';
import { withRouter } from 'react-router-dom';
import classNames from 'classnames';
import Snackbar from '@material-ui/core/Snackbar';
import MuiAlert from '@material-ui/lab/Alert';

import ActionColumn from 'Components/ActionColumnNew'
import AllMUIDataTable from 'Components/AllMUIDataTable';
import LoadingGif from 'Components/LoadingGif';
import { getRequest } from 'Includes/api/apicall';
import { GET_URL, PUT_URL, DEL_URL } from 'Includes/urls'
import { nameAndNumberRegex, nameRegex } from 'Constants/regularExpression'
import { Actions } from 'Constants/permissions';
import { isUserHasPermission, getKeyValueMap, updatePermissions } from 'Includes/functions';
import { Dropdown } from 'Components/DropDown';
import BlankPagewithIcon from "Components/BlankPageWithIcon/index";
import { options } from 'Constants';
import { getUrlParam } from 'Includes/functions';
import { FormattedMessage } from 'react-intl';
import messages from './messages';
import commonMessages from 'Constants/messages';

function Alert(props) {
    return <MuiAlert elevation={6} variant="filled" {...props} />;
}

const fieldDetails = [
    {
        label: <FormattedMessage {...messages.storePropertyValue} />,
        regex: nameAndNumberRegex,
        name: 'name', md: 12,
        className: 'width-100',
        required: true,
        id: 'outlined-textarea',
        default: '',
        rows: null,
        type: 'text',
        autoFocus: false,
    },
];

class PropertiesValue extends Component {
    constructor() {
        super();
        this.permission = updatePermissions('store_inventory_properties_values', ['update', 'delete']);
        this.state = {
            propertyList: [],
            selectedProperty: '',
            propertyValueList: [],
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
                    name: "name",
                    label: <FormattedMessage {...messages.storePropertyValue} />,
                    options: {
                        filter: true,
                        sort: true,
                    },
                },
                {
                    name: 'Actions',
                    label: <FormattedMessage {...commonMessages.actions} />,
                    options: {
                        display: this.permission.length > 0,
                        filter: false,
                        sort: false,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return (<div>
                                <ActionColumn
                                    id={tableMeta.rowData[0]}
                                    fieldValues={[tableMeta.rowData[1]]}
                                    label={<FormattedMessage {...messages.editStorePropertyValue} />}
                                    fieldDetails={fieldDetails}
                                    updateUrl={PUT_URL.propertyvalue.api}
                                    updatePostFormat={this.updatePostFormat}
                                    updateType={this.updateType}
                                    deleteUrl={DEL_URL.propertyvalue.api}
                                    deleteType={this.deleteType}
                                    baseClassName='action-basic-detail-width'
                                    enabledActions={this.permission}
                                />
                            </div>
                            );
                        }
                    }
                }

            ]
        }
    }

    componentDidMount = () => {
        let { propertyId } = getUrlParam()
        const propertyList = this.getPropertyList();
        this.setState({
            options: options,
            propertyList: propertyList,
        }, () => {
            if (propertyId) {
                this.getPropertyValueList(propertyId)
            }
        })
    }

    getPropertyList = () => {
        const url = GET_URL.properties.api
        const params = { is_active: 1 }
        getRequest(url, params, this.props).then(response => {
            if (response && response.status === 200) {
                this.setState({
                    propertyList: response.data.data,
                })
                if (this.props.location.state) {
                    let selectedProperty = this.props.location.state.propertyId
                    this.setState({
                        selectedProperty: selectedProperty,
                    })
                    this.getPropertyValueList(selectedProperty);
                }
                else {
                    this.setState({
                        loading: false
                    })
                }
            }
        })
    }

    getPropertyValueList = (id) => {
        const g_url = GET_URL.propertyvalue.api
        const params = { is_active: 1, properties: id }
        getRequest(g_url, params, this.props).then(response => {
            if (response && response.status === 200) {
                this.setState({
                    propertyValueList: response.data.data,
                    tableUpdating: false,
                    loading: false,
                    selectedProperty: id
                })
            }
        })
    }

    updatePostFormat = (newData) => {
        let payload = {
            name: newData.name,
        }
        return payload
    }

    updateType = (newData, id) => {
        let propertyValue = this.state.propertyValueList;
        for (const data of propertyValue) {
            if (data.id === id) {
                data.name = newData.name;
                break;
            }
        }
        this.setState({
            propertyValueList: [...propertyValue],
        })
        return true
    }

    deleteType = async (id) => {
        let propertyValue = this.state.propertyValueList
        let index = propertyValue.findIndex(data => data.id === id)
        propertyValue.splice(index, 1);
        this.setState({
            propertyValueList: [...propertyValue]
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
                this.getPropertyValueList(value);
            })
        }
    }

    handleAddPropertyValueButton = () => {
        let { selectedProperty, error, propertyList } = this.state;
        if (selectedProperty) {
            let properties = getKeyValueMap(propertyList, 'id', 'name')
            let propertyName = properties[selectedProperty]
            let searchState = { propertyName: propertyName, selectedProperty: selectedProperty }
            let searchParam = "?" + new URLSearchParams(searchState).toString()
            this.props.history.push({
                pathname: Actions.store_inventory_properties_values.create.url,
                search: searchParam,
            })
        }
        else {
            error.propertyType = <FormattedMessage {...messages.storePropertyValueAlertMessage} />
            this.setState({
                open: true,
                alertData: error.propertyType,
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
        const { loading, propertyList, selectedProperty, propertyValueList, columns, options, tableUpdating, open, error, alertData } = this.state
        if (loading) {
            return <LoadingGif />
        } else {
            return (
                <div>
                    <Paper className={classNames('paper-background')}>
                        <Grid container>
                            <Grid item md={6} xs={12} className={classNames('header-align')}>
                                <div className='heading'>
                                    <FormattedMessage {...messages.storePropertyValue} />
                                </div>
                                <div className='sub-heading'>
                                    <FormattedMessage {...messages.addPropertyValueSubHeading} />
                                </div>
                            </Grid>
                            <Grid item md={6} xs={12} >
                                <div className={classNames('header-align', 'end-flex-prop')}>
                                    {isUserHasPermission('store_inventory_properties_values', 'create') && <Button
                                        variant="contained"
                                        onClick={this.handleAddPropertyValueButton}
                                        className='editbutton-view'
                                    ><AddCircleOutlineOutlinedIcon className='visibility-icon' /> {Actions.store_inventory_properties_values.create.label}</Button>}
                                </div>
                            </Grid>
                        </Grid>
                        <Grid item md={3} xs={12} className='margin-top-20'>
                            <Dropdown
                                data={propertyList}
                                name='selectedProperty'
                                style='width-100'
                                value={selectedProperty}
                                onChange={this.onChange}
                                label={<FormattedMessage {...messages.storePropertyTypeSelectCategory} />}
                                error={error.propertyType}
                                hideSelect={true}
                            />
                        </Grid>
                        {selectedProperty &&
                            <Grid container className={classNames('header-align')}>
                                <Grid item md={6} xs={12}>
                                    <AllMUIDataTable
                                        key={propertyValueList}
                                        title={tableUpdating ? <CircularProgress className='white-text' /> : ''}
                                        data={propertyValueList}
                                        columns={columns}
                                        options={options}
                                    />
                                </Grid>
                            </Grid>
                        }
                        {!selectedProperty &&
                            <BlankPagewithIcon data={<FormattedMessage {...messages.PropertyValueBlankScreenView} />} />
                        }
                        <Snackbar anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} open={open} autoHideDuration={2000} onClose={this.handleClose}>
                            <Alert onClose={this.handleClose} severity="error">
                                {alertData}
                            </Alert>
                        </Snackbar>
                    </Paper>
                </div>
            )
        }
    }
}
export default withRouter(PropertiesValue)