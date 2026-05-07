import React, { Component } from "react";
import { withRouter } from 'react-router-dom';
import { Paper, Box, Grid, Button } from "@material-ui/core";
import AddCircleOutlineOutlinedIcon from "@material-ui/icons/AddCircleOutlineOutlined";
import { Link } from "react-router-dom";

import ActionColumn from "Components/ActionColumnNew";
import AllMUIDataTable from "Components/AllMUIDataTable";
import LoadingGif from 'Components/LoadingGif';
import { getRequest } from "Includes/api/apicall";
import { GET_URL, PUT_URL, DEL_URL } from "Includes/urls";
import { nameAndNumberRegex } from "Constants/regularExpression";
import { Actions } from "Constants/permissions";
import { isUserHasPermission, updatePermissions } from "Includes/functions";
import { options } from 'Constants';
import { FormattedMessage } from 'react-intl';
import messages from './messages';
import commonMessages from 'Constants/messages';

const fieldDetails = [
    {
        label: <FormattedMessage {...messages.storeProperty} />,
        regex: nameAndNumberRegex,
        name: 'name', md: 12,
        className: 'width-100',
        required: true,
        id: 'outlined-textarea',
        default: '',
        rows: null,
        type: 'text',
        autoFocus: true,
    },
];


class PropertyView extends Component {
    constructor() {
        super();
        this.permission = updatePermissions('store_inventory_properties', ['update', 'delete']);
        this.state = {
            loading: true,
            propertiesList: [],
            columns: [
                {
                    name: "id",
                    label: "id",
                    options: {
                        filter: true,
                        sort: true,
                        viewColumns: false,
                        display: false,
                    },
                },
                {
                    name: "name",
                    label: <FormattedMessage {...messages.storeProperty} />,
                    options: {
                        filter: true,
                        sort: true,
                    },
                },
                {
                    name: "Actions",
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
                                    label={<FormattedMessage {...messages.editStoreProperty} />}
                                    fieldDetails={fieldDetails}
                                    baseClassName='action-basic-detail-width'
                                    updateUrl={PUT_URL.properties.api}
                                    updatePostFormat={this.updatePostFormat}
                                    updateType={this.updateType}
                                    deleteUrl={DEL_URL.properties.api}
                                    deleteType={this.deleteType}
                                    enabledActions={this.permission}
                                />
                            </div>
                            );
                        },
                    }
                }
            ]
        }
    }

    componentDidMount() {
        this.getPropertiesList();
    }

    getPropertiesList = () => {
        const f_url = GET_URL.properties.api
        const params = { is_active: 1 }
        getRequest(f_url, params, this.props).then(response => {
            if (response && response.status === 200) {
                this.setState({
                    propertiesList: response.data.data,
                    loading: false
                })
            }
        })
    }

    deleteType = async (id) => {
        let propertyType = this.state.propertiesList
        let index = propertyType.findIndex(data => data.id === id)
        propertyType.splice(index, 1);
        this.setState({
            propertiesList: [...propertyType]
        })
    }

    updatePostFormat = (newData) => {
        let payload = {
            name: newData.name,
            code: newData.code
        }
        return payload
    }

    updateType = (newData, id) => {
        let propertyType = this.state.propertiesList;
        for (const data of propertyType) {
            if (data.id === id) {
                data.name = newData.name;
                data.code = newData.code
                break;
            }
        }
        this.setState({
            propertiesList: [...propertyType],
        })
        return true
    }


    render() {
        let { loading, propertiesList, columns } = this.state;
        if (loading) {
            return <LoadingGif />
        } else {
            return (
                <div>
                    <Paper className={"paper-background"}>
                        <Grid container>
                            <Grid item md={7} xs={12} sm={12}>
                                <div className="header-align heading"><FormattedMessage {...messages.storeProperty} /></div>
                                <div className='sub-heading'>
                                    <FormattedMessage {...messages.addPropertySubHeading} />
                                </div>
                            </Grid>
                            <Grid item md={5} xs={12} sm={12}>
                                <div className="end-flex-prop header-align">
                                    {isUserHasPermission("store_inventory_properties", "create") && (
                                        <Button
                                            variant="contained"
                                            component={Link}
                                            to={Actions.store_inventory_properties.create.url}
                                            className="editbutton-view"
                                        >
                                            <AddCircleOutlineOutlinedIcon className="visibility-icon" />{" "}
                                            {Actions.store_inventory_properties.create.label}
                                        </Button>
                                    )}
                                </div>
                            </Grid>
                        </Grid>
                        <Grid container className="header-align">
                            <Grid item md={6} xs={12}>
                                <AllMUIDataTable
                                    data={propertiesList}
                                    columns={columns}
                                    options={options}
                                />
                            </Grid>
                        </Grid>
                    </Paper>
                </div>
            );
        }
    }
}

export default withRouter(PropertyView)
