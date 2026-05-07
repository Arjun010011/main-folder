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
import { isUserHasPermission, updatePermissions, getPaginationProps } from "Includes/functions";
import { DEFAULT_PAGINATION_PROPS_ID_LIST } from 'Constants';
import { FormattedMessage } from 'react-intl';
import messages from './messages';
import commonMessages from 'Constants/messages';

const fieldDetails = [
    {
        label: <FormattedMessage {...messages.storeItemName} />,
        regex: null,
        name: 'name', md: 12,
        className: 'width-100',
        required: true,
        id: 'outlined-textarea',
        default: '',
        rows: null,
        type: 'text',
        autoFocus: true,
    },
    {
        label: <FormattedMessage {...messages.storeItemCode} />,
        regex: null,
        name: 'code',
        md: 12,
        className: 'width-100',
        required: true,
        id: 'outlined-textarea',
        default: '',
        rows: null,
        type: 'text'
    },

];


class ItemView extends Component {
    constructor() {
        super();
        this.permission = updatePermissions('store_inventory_item', ['update', 'delete']);
        this.state = {
            loading: true,
            itemList: [],
            pagination: { ...DEFAULT_PAGINATION_PROPS_ID_LIST },
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
                    label: <FormattedMessage {...messages.storeItemName} />,
                    options: {
                        filter: true,
                        sort: true,
                    },
                },
                {
                    name: "code",
                    label: <FormattedMessage {...messages.storeItemCode} />,
                    options: {
                        filter: true,
                        sort: true,
                        display: true
                    }
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
                                    fieldValues={[tableMeta.rowData[1], tableMeta.rowData[2]]}
                                    label={<FormattedMessage {...messages.editStoreItem} />}
                                    fieldDetails={fieldDetails}
                                    baseClassName='action-basic-detail-width'
                                    updateUrl={PUT_URL.item.api}
                                    updatePostFormat={this.updatePostFormat}
                                    updateType={this.updateType}
                                    deleteUrl={DEL_URL.item.api}
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
        this.getItemList();
    }

    getItemList = (paginationProps) => {
        let { pagination } = this.state;
        this.currentPagination = pagination;
        if (paginationProps) {
            this.currentPagination = { ...paginationProps };
        }
        let pagination_params = getPaginationProps(this.currentPagination);
        let params = { ...pagination_params, is_active: true }
        const url = GET_URL.item.api
        getRequest(url, params, this.props).then(response => {
            if (response && response.status === 200) {
                this.setState({
                    itemList: response.data.data,
                    loading: false,
                    pagination: this.currentPagination
                        ? this.currentPagination
                        : this.state.pagination,
                })
            }
        })
    }

    deleteType = async (id) => {
        let { itemList } = this.state;
        let item = itemList.data_list
        let index = item.findIndex(data => data.id === id)
        item.splice(index, 1);
        itemList.data_list = [...item]
        this.setState({
            itemList
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
        let { itemList } = this.state;
        let item = itemList.data_list;
        for (const data of item) {
            if (data.id === id) {
                data.name = newData.name;
                data.code = newData.code
                break;
            }
        }
        itemList.data_list = [...item]
        this.setState({
            itemList
        })
        return true
    }


    render() {
        let { loading, itemList, columns, pagination } = this.state;
        const options = {
            selectableRows: "none",
            filterType: "dropdown",
            responsive: "simple",
            filter: false,
            download: false,
            print: false,
            viewColumns: false,
            rowsPerPageOptions: [5, 10, 25, 50, 100],
        };
        if (loading) {
            return <LoadingGif />
        } else {
            return (
                <div>
                    <Paper className={"paper-background"}>
                        <Grid container>
                            <Grid item md={7} xs={12} sm={12}>
                                <div className="header-align heading"><FormattedMessage {...messages.storeViewItemHeading} /></div>
                                <div className='sub-heading'>
                                    <FormattedMessage {...messages.addItemSubHeading} />
                                </div>
                            </Grid>
                            <Grid item md={5} xs={12} sm={12}>
                                <div className="end-flex-prop header-align">
                                    {isUserHasPermission("store_inventory_item", "create") && (
                                        <Button
                                            variant="contained"
                                            component={Link}
                                            to={Actions.store_inventory_item.create.url}
                                            className="editbutton-view"
                                        >
                                            <AddCircleOutlineOutlinedIcon className="visibility-icon" />{" "}
                                            {Actions.store_inventory_item.create.label}
                                        </Button>
                                    )}
                                </div>
                            </Grid>
                        </Grid>
                        <Grid container className="header-align">
                            <Grid item md={8} xs={12}>
                                <AllMUIDataTable
                                    key={itemList.data_list}
                                    data={itemList.data_list}
                                    columns={columns}
                                    options={options}
                                    onTableChange={this.getItemList}
                                    serverSide={true}
                                    pagination={pagination}
                                    count={itemList.count}
                                />
                            </Grid>
                        </Grid>
                    </Paper>
                </div>
            );
        }
    }
}

export default withRouter(ItemView)
