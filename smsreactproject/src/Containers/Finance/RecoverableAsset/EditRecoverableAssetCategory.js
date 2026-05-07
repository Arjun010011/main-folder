import React, { Component } from 'react';
import { withRouter, Link } from 'react-router-dom';
import { Grid, Paper, Box, Button, CircularProgress } from '@material-ui/core';
import Swal from 'sweetalert2';
import VisibilityOutlinedIcon from '@material-ui/icons/VisibilityOutlined';
import classNames from 'classnames';

import DynamicForm from 'Components/DynamicForm';
import loadingBar from 'images/loading.gif';
import { nameWithQuoteRegex } from 'Constants/regularExpression';
import { putRequest, getRequest } from 'Includes/api/apicall';
import { PUT_URL, GET_URL } from 'Includes/urls';
import { Actions } from 'Constants/permissions';
import { isObjectValuesEmpty, getUrlParam } from 'Includes/functions';

const header = 'Edit Recoverable Asset Category';



const BALANCE_SHEET_CLASSIFICATION_OPTIONS = [
    { id: 'LIABILITY', name: 'Liability' },
    { id: 'FIXED_ASSET', name: 'Fixed Asset' },
];

class EditRecoverableAssetCategory extends Component {

    constructor(props) {
        super(props);

        this.state = {
            submitDisable: false,
            loading: true,
            isSystem: false,
            categoryId: getUrlParam(this.props.location.search).id,
            payloadData: {},
            fieldErrors: {},
            fieldDetails: [
                {
                    label: 'Code', regex: nameWithQuoteRegex, name: 'code', md: 6, maxLength: '50', className: 'width-95-mt-30px', required: true,
                    id: 'outlined-textarea', default: '', rows: null, type: 'text', autoFocus: true
                },
                {
                    label: 'Name', regex: nameWithQuoteRegex, name: 'name', md: 6, maxLength: '255', className: 'width-95-mt-30px', required: true,
                    id: 'outlined-textarea', default: '', rows: null, type: 'text', autoFocus: false
                },
                {
                    label: 'Description', regex: nameWithQuoteRegex, name: 'description', md: 12, maxLength: '500', className: 'width-95-mt-30px', required: false,
                    id: 'outlined-textarea', default: '', rows: 2, type: 'text', autoFocus: false, isDuplicateAllow: true
                },
                {
                    label: 'Balance Sheet Classification', regex: '', name: 'balance_sheet_classification', md: 6, className: 'width-95-mt-30px', required: true,
                    id: 'outlined-select', default: BALANCE_SHEET_CLASSIFICATION_OPTIONS[0], type: 'dropDownWithSearch', autoFocus: false,
                    list: BALANCE_SHEET_CLASSIFICATION_OPTIONS
                },
                {
                    label: 'Display Order', regex: { value: /^[0-9]*$/, errorText: 'Must be a number' }, name: 'display_order', md: 6, maxLength: '5', className: 'width-95-mt-30px', required: false,
                    id: 'outlined-textarea', default: '0', rows: null, type: 'text', autoFocus: false, isDuplicateAllow: true
                },
            ],
        };
        this.viewUrl = Actions.recoverable_asset_categories.view.url;
    }

    componentDidMount = () => {
        this.loadCategoryData();
    }

    loadCategoryData = async () => {
        const { categoryId, fieldDetails } = this.state;

        try {
            const response = await getRequest(`${GET_URL.recoverableAssetCategory.api}${categoryId}/`, {}, this.props);
            if (!response || response.status !== 200) {
                Swal.fire('Error', 'Failed to load category data', 'error');
                this.props.history.push(this.viewUrl);
                return;
            }

            const categoryData = response.data.data || response.data;

            // Build payload from fetched data
            const payloadData = {
                code: categoryData.code || '',
                name: categoryData.name || '',
                description: categoryData.description || '',
                balance_sheet_classification: categoryData.balance_sheet_classification
                    ? BALANCE_SHEET_CLASSIFICATION_OPTIONS.find(o => o.id === categoryData.balance_sheet_classification) || BALANCE_SHEET_CLASSIFICATION_OPTIONS[0]
                    : BALANCE_SHEET_CLASSIFICATION_OPTIONS[0],
                display_order: categoryData.display_order != null ? String(categoryData.display_order) : '0',
            };

            // Set field defaults to pre-fill the form
            fieldDetails.forEach(field => {
                if (payloadData.hasOwnProperty(field.name)) {
                    field.default = payloadData[field.name];
                }
            });

            this.setState({
                fieldDetails,
                payloadData,
                loading: false,
            });
        } catch (e) {
            console.error('Error loading category data', e);
            Swal.fire('Error', 'Failed to load category data', 'error');
            this.setState({ loading: false });
        }
    }

    updateParent = (name, value) => {
        let { payloadData } = this.state;
        payloadData[name] = value;
        this.setState({ payloadData });
    }

    validate = (payload) => {
        let fieldErrors = {};
        const { fieldDetails } = this.state;

        fieldDetails.forEach(field => {
            let value = payload[field.name];
            if (field.required && (value === '' || value === null || value === undefined)) {
                fieldErrors[field.name] = `${field.label} is required`;
            }
        });

        if (isObjectValuesEmpty(fieldErrors)) {
            return true;
        } else {
            this.refs.categoryForm.updateErrors(fieldErrors);
            this.setState({ fieldErrors });
            return false;
        }
    }

    submit = () => {
        this.setState({ submitDisable: true });
        const { payloadData, categoryId, isSystem } = this.state;

        // Ensure all fields have values from DynamicForm
        const { fieldDetails } = this.state;
        fieldDetails.forEach(field => {
            if (!(field.name in payloadData)) {
                payloadData[field.name] = field.default;
            }
        });

        if (this.validate(payloadData)) {
            const formattedPayload = {
                code: payloadData.code || '',
                name: payloadData.name || '',
                description: payloadData.description || null,
                balance_sheet_classification: payloadData.balance_sheet_classification?.id || payloadData.balance_sheet_classification || 'LIABILITY',
                display_order: parseInt(payloadData.display_order) || 0,
            };

            const url = `${PUT_URL.recoverableAssetCategory.api}${categoryId}/`;
            putRequest(url, formattedPayload, this.props)
                .then((response) => {
                    if (response && response.status === 200) {
                        Swal.fire({
                            position: 'top-end',
                            type: 'success',
                            title: 'Category has been updated',
                            showConfirmButton: false,
                            timer: 1500,
                        });
                        this.props.history.push(this.viewUrl);
                    } else {
                        this.setState({ submitDisable: false });
                    }
                })
                .catch(err => {
                    console.error('Error updating category', err);
                    this.setState({ submitDisable: false });
                });
        } else {
            this.setState({ submitDisable: false });
        }
    }

    render() {
        const { submitDisable, loading, fieldDetails, payloadData, isSystem } = this.state;

        if (loading) {
            return (
                <Box display='flex'>
                    <img src={loadingBar} className='loading' alt='loading' />
                </Box>
            );
        }

        return (
            <Paper className={classNames('paper-background')}>
                <Box>
                    <Grid container>
                        <Grid item md={6} xs={12} className={classNames('header-align')}>
                            <Box className='heading'>
                                {header}
                            </Box>
                            <Box className='sub-heading'>
                                {isSystem
                                    ? 'System category — code cannot be changed'
                                    : 'Modify the category details'}
                            </Box>
                        </Grid>
                        <Grid item md={6} xs={12}>
                            <Box className={classNames('header-align', 'end-flex-prop')}>
                                <Button
                                    variant="contained"
                                    component={Link}
                                    to={this.viewUrl}
                                    className='editbutton-view'
                                >
                                    <VisibilityOutlinedIcon className='visibility-icon' /> Back to List
                                </Button>
                            </Box>
                        </Grid>
                    </Grid>
                    <Grid container className='header-padding-top'>
                        <Grid item xl={6} lg={8} md={8} xs={12}>
                            <Grid container className='add-vehicle-form'>
                                <DynamicForm
                                    fieldDetails={fieldDetails}
                                    updateParent={this.updateParent}
                                    isEditForm={true}
                                    loading={loading}
                                    ref={'categoryForm'}
                                    idFormat={'recoverable_asset_category_edit_'}
                                    prefillValue={payloadData}
                                />

                                <Box className="button-group" style={{ width: '100%', marginTop: 20 }}>
                                    <Button
                                        variant="outlined"
                                        component={Link}
                                        to={this.viewUrl}
                                        style={{ float: 'left' }}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        className='submit'
                                        variant="contained"
                                        disabled={submitDisable}
                                        style={{ float: 'right' }}
                                        onClick={this.submit}
                                    >
                                        {submitDisable ? <CircularProgress size={24} /> : 'Update'}
                                    </Button>
                                </Box>
                            </Grid>
                        </Grid>
                    </Grid>
                </Box>
            </Paper>
        );
    }
}

export default withRouter(EditRecoverableAssetCategory);
