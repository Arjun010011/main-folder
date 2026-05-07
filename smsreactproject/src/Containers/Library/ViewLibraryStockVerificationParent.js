import React, { useState, useEffect } from "react";
import { Paper, Box, Grid, Button } from "@material-ui/core";
import AddCircleOutlineOutlinedIcon from "@material-ui/icons/AddCircleOutlineOutlined";
import { Link } from "react-router-dom";

import ActionColumn from "Components/ActionColumnNew";
import AllMUIDataTable from "Components/AllMUIDataTable";
import LoadingGif from "Components/LoadingGif";
import { getRequest } from "Includes/api/apicall";
import { GET_URL, PUT_URL, DEL_URL } from "Includes/urls";
import { nameAndNumberRegex } from "Constants/regularExpression";
import { Actions } from "Constants/permissions";
import { isUserHasPermission, updatePermissions } from "Includes/functions";
import { options } from "Constants";
import { FormattedMessage } from "react-intl";
import messages from "./messages";
import commonMessages from "Constants/messages";

const fieldDetails = [
    {
        label: 'Name', 
        regex: null,
        name: 'name', 
        md: 12,
        className: 'width-100',
        required: true,
        id: 'outlined-textarea',
        default: '',
        rows: null,
        type: 'text',
        autoFocus: true,
    },
    {
        label: 'Created', 
        regex: null,
        name: 'created',
        md: 12,
        className: 'width-100',
        required: true,
        id: 'outlined-textarea',
        default: '',
        rows: null,
        type: 'date_time'
    },
];

const LibraryStockVerificationParent = () => {
    const permission = updatePermissions("library_stock_verification_parent", ["update", "delete"]);
    const [loading, setLoading] = useState(true);
    const [stockVerificationParentList, setStockVerificationParentList] = useState([]);

    const columns = [
        { name: "id", label: "id", options: { filter: true, sort: true, viewColumns: false, display: false } },
        { name: "name", label: 'Name', options: { filter: true, sort: true } },
        { name: "created", label: 'Created On', options: { filter: true, sort: true } },
        { name: "created_by_user_name", label: 'Created By', options: { filter: true, sort: true } },
        {
            name: "Actions",
            label: <FormattedMessage {...commonMessages.actions} />,
            options: {
                display: permission.length > 0,
                filter: false,
                sort: false,
                customBodyRender: (value, tableMeta) => (
                    <ActionColumn
                        id={tableMeta.rowData[0]}
                        fieldValues={[tableMeta.rowData[1], tableMeta.rowData[2]]}
                        label="edit"
                        fieldDetails={fieldDetails}
                        baseClassName='action-basic-detail-width'
                        updateUrl={PUT_URL.librarystockverificationparent.api}
                        updatePostFormat={updatePostFormat}
                        updateType={updateType}
                        deleteUrl={DEL_URL.librarystockverificationparent.api}
                        deleteType={deleteType}
                        enabledActions={permission}
                    />
                ),
            },
        },
    ];

    const getLibraryStockVerificationParentList = async () => {
        const response = await getRequest(GET_URL.librarystockverificationparent.api, { is_active: 1 });
        if (response && response.status === 200) {
            setStockVerificationParentList(response.data.data);
        }
        setLoading(false)
    };

    useEffect(() => {
        getLibraryStockVerificationParentList();
    }, []);


    const deleteType = (id) => {
        setStockVerificationParentList(stockVerificationParentList.filter(item => item.id !== id));
    };

    const updatePostFormat = (newData) => ({ name: newData.name, code: newData.code });

    const updateType = (newData, id) => {
        setStockVerificationParentList(prevList => prevList.map(item => 
            item.id === id ? { ...item, name: newData.name, code: newData.code } : item
        ));
        return true;
    };

    if (loading) return <LoadingGif />;

    return (
        <div>
            <Paper className="paper-background">
                <Grid container>
                    <Grid item md={7} xs={12} sm={12}>
                        <div className="header-align heading">
                            Name
                        </div>
                    </Grid>
                    <Grid item md={5} xs={12} sm={12}>
                        <div className="end-flex-prop header-align">
                            {isUserHasPermission("library_stock_verification_parent", "create") && (
                                <Button
                                    variant="contained"
                                    component={Link}
                                    to={Actions.library_stock_verification_parent.create.url}
                                    className="editbutton-view"
                                >
                                    <AddCircleOutlineOutlinedIcon className="visibility-icon" />
                                    {Actions.library_stock_verification_parent.create.label}
                                </Button>
                            )}
                        </div>
                    </Grid>
                </Grid>
                <Grid container className="header-align">
                    <Grid item md={8} xs={12}>
                        <AllMUIDataTable
                            data={stockVerificationParentList}
                            columns={columns}
                            options={options}
                        />
                    </Grid>
                </Grid>
            </Paper>
        </div>
    );
};

export default LibraryStockVerificationParent;
