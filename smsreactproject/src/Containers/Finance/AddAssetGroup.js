import React, { Component } from 'react'
import Swal from 'sweetalert2';
import { withRouter, Link } from 'react-router-dom';
import { Paper, Box, Grid, Button } from '@material-ui/core';
import VisibilityOutlinedIcon from '@material-ui/icons/VisibilityOutlined';

import DynamicForm from 'Components/DynamicForm';
import { nameWithQuoteRegex, numberRegex } from 'Constants/regularExpression'
import { getRequest, postRequest } from 'Includes/api/apicall';
import { GET_URL, POST_URL } from 'Includes/urls';
import { Actions } from 'Constants/permissions';
import { isUserHasPermission } from 'Includes/functions';
import loadingBar from 'images/loading.gif';

const depreciationMethodList = [
    { id: 'SLM', name: 'Straight Line Method' },
    { id: 'WDV', name: 'Written Down Value' },
    { id: 'MANUAL', name: 'Manual' },
    { id: 'NONE', name: 'No Depreciation' }
];

const groupTypeList = [
    { id: 'FIXED_ASSET', name: 'Fixed Asset' },
    { id: 'LIABILITY', name: 'Liability' }
];

const baseFieldDetails = [
    {
        label: 'Name', regex: nameWithQuoteRegex, name: 'name', md: 6, maxLength: 255, className: 'width-form-100',
        required: true, default: '', type: 'text', autoFocus: true
    },
    {
        label: 'Group Type', name: 'group_type', md: 6, className: 'width-form-100',
        required: true, default: { id: 'FIXED_ASSET', name: 'Fixed Asset' }, type: 'dropDownWithSearch', list: groupTypeList, hideClearIcon: true
    },
    {
        label: 'Code', regex: nameWithQuoteRegex, name: 'code', md: 6, maxLength: 50, className: 'width-form-100',
        required: false, default: '', type: 'text'
    },
    {
        label: 'Financial Year', name: 'financial_year', md: 6, className: 'width-form-100',
        required: false, default: null, type: 'dropDownWithSearch', list: [], hideClearIcon: false
    },
    {
        label: 'Parent Group', name: 'parent_group', md: 6, className: 'width-form-100',
        required: false, default: null, type: 'dropDownWithSearch', list: [], hideClearIcon: false
    },
    {
        label: 'Depreciation Method', name: 'depreciation_method', md: 6, className: 'width-form-100',
        required: true, default: { id: 'WDV', name: 'Written Down Value' }, type: 'dropDownWithSearch', list: depreciationMethodList, hideClearIcon: true
    },
    {
        label: 'Useful Life (Years)', regex: numberRegex, name: 'useful_life_years', md: 6, maxLength: 3, className: 'width-form-100',
        required: false, default: '', type: 'text'
    },
    {
        label: 'Depreciation Rate (%)', regex: { value: /^[0-9]*\.?[0-9]*$/, errorText: 'Invalid Rate' }, name: 'depreciation_rate', md: 6, maxLength: 6, className: 'width-form-100',
        required: true, default: '', type: 'text', helperText: 'Required for Written Down Value method'
    },
];


class AddAssetGroup extends Component {

    constructor(props) {
        super(props)

        this.state = {
            submitDisable: false,
            loading: true,
            formData: {},
            fieldDetails: null,
            assetGroupList: []
        }
        this.viewUrl = Actions.asset_groups.view.url
    }

    componentDidMount() {
        this.getAssetGroupList();
        this.getFinancialYearList();
    }

    getFinancialYearList = () => {
        const url = GET_URL.financialyear.api;
        const params = { is_active: true };
        getRequest(url, params, this.props).then(response => {
            if (response && response.status === 200) {
                const fyData = response.data.data.data_list || response.data.data || [];
                const fyList = fyData.map(fy => ({
                    id: fy.id,
                    name: fy.name || `${new Date(fy.start_date).getFullYear()}-${new Date(fy.end_date).getFullYear()}`
                }));
                this.setState({ financialYearList: fyList }, () => {
                    this.refreshFieldDetails();
                });
            }
        }).catch(() => { });
    }

    getAssetGroupList = () => {
        const url = GET_URL.assetGroups.api;
        const params = { is_active: true, limit: 100, pageno: 1 };
        getRequest(url, params, this.props).then(response => {
            if (response && response.status === 200) {
                const groups = response.data.data.data_list || response.data.data || [];
                const assetGroupList = groups.map(g => ({ id: g.id, name: g.name }));
                this.updateFieldDetails(assetGroupList);
            } else {
                this.updateFieldDetails([]);
            }
        }).catch(() => {
            this.updateFieldDetails([]);
        });
    }

    updateFieldDetails = (assetGroupList) => {
        this.setState({ assetGroupList }, () => {
            this.refreshFieldDetails();
        });
    }

    refreshFieldDetails = () => {
        const { assetGroupList = [], financialYearList = [] } = this.state;
        const fieldDetails = baseFieldDetails.map(field => {
            if (field.name === 'parent_group') {
                return { ...field, list: assetGroupList };
            }
            if (field.name === 'financial_year') {
                return { ...field, list: financialYearList };
            }
            return { ...field };
        });

        const formData = {};
        fieldDetails.forEach(field => {
            formData[field.name] = field.default;
        });

        this.setState({
            fieldDetails,
            formData,
            loading: false
        });
    }

    updateParent = (name, value) => {
        const updates = { [name]: value };

        // Handle depreciation_method changes
        if (name === 'depreciation_method') {
            const methodId = value?.id || value;

            if (methodId === 'NONE') {
                // NONE: Clear depreciation-related fields
                updates.depreciation_rate = '';
                updates.useful_life_years = '';
            } else if (methodId === 'SLM') {
                // SLM: Set default useful_life_years, clear rate
                updates.depreciation_rate = '';
                if (!this.state.formData.useful_life_years) {
                    updates.useful_life_years = '10';
                }
            } else if (methodId === 'WDV') {
                // WDV: Ensure rate field is enabled
                if (!this.state.formData.depreciation_rate) {
                    updates.depreciation_rate = '';
                }
            }

            // Update field details based on new method
            this.updateFieldDetailsForMethod(methodId);
        }

        this.setState(prevState => ({
            formData: {
                ...prevState.formData,
                ...updates
            }
        }));
    }

    updateFieldDetailsForMethod = (methodId) => {
        const { assetGroupList, fieldDetails } = this.state;

        const newFieldDetails = baseFieldDetails.map(field => {
            if (field.name === 'parent_group') {
                return { ...field, list: assetGroupList };
            }
            if (field.name === 'useful_life_years') {
                // SLM: required and visible, WDV/NONE: optional/hidden
                return {
                    ...field,
                    required: methodId === 'SLM',
                    disabled: methodId === 'NONE',
                    helperText: methodId === 'SLM' ? 'Required for Straight Line Method' : ''
                };
            }
            if (field.name === 'depreciation_rate') {
                // WDV: required, SLM/NONE: hidden
                return {
                    ...field,
                    required: methodId === 'WDV',
                    disabled: methodId !== 'WDV',
                    helperText: methodId === 'WDV' ? 'Required for Written Down Value method' : ''
                };
            }
            return { ...field };
        });

        this.setState({ fieldDetails: newFieldDetails });
    }

    validateAndSubmit = () => {
        const { formData, fieldDetails } = this.state;
        let isValid = true;
        const fieldErrors = {};

        // Basic field validations
        fieldDetails.forEach(field => {
            const value = formData[field.name];
            if (field.required && (value === '' || value === null || value === undefined)) {
                fieldErrors[field.name] = 'This field is mandatory';
                isValid = false;
            } else if (field.regex && field.regex.value && value && !field.regex.value.test(value)) {
                fieldErrors[field.name] = field.regex.errorText || 'Invalid value';
                isValid = false;
            }
        });

        // Method-specific validations (matching backend rules)
        const method = formData.depreciation_method?.id || formData.depreciation_method;

        if (method === 'SLM') {
            const usefulLife = parseInt(formData.useful_life_years);
            if (!usefulLife || usefulLife <= 0) {
                fieldErrors.useful_life_years = 'Useful life is required for Straight Line Method';
                isValid = false;
            }
        } else if (method === 'WDV') {
            const rate = parseFloat(formData.depreciation_rate);
            if (!rate || rate <= 0) {
                fieldErrors.depreciation_rate = 'Depreciation rate is required for Written Down Value method';
                isValid = false;
            }
        }

        if (this.dynamicFormRef) {
            this.dynamicFormRef.updateErrors(fieldErrors);
        }

        if (isValid) {
            this.submit();
        }
    }

    submit = () => {
        const { formData } = this.state;
        this.setState({ submitDisable: true });

        const method = formData.depreciation_method?.id || formData.depreciation_method;

        const payload = {
            name: formData.name,
            code: formData.code || null,
            group_type: formData.group_type?.id || formData.group_type || 'FIXED_ASSET',
            financial_year: formData.financial_year?.id || null,
            parent_group: formData.parent_group?.id || null,
            depreciation_method: method,
            // SLM uses useful_life_years, WDV uses depreciation_rate, NONE uses neither
            useful_life_years: method === 'NONE' ? null : (parseInt(formData.useful_life_years) || null),
            depreciation_rate: method === 'WDV' && formData.depreciation_rate
                ? parseFloat(formData.depreciation_rate)
                : null
        };

        const url = POST_URL.assetGroups.api;
        postRequest(url, payload, this.props)
            .then((response) => {
                if (response && response.status === 200) {
                    Swal.fire({
                        position: 'top-end',
                        type: 'success',
                        title: 'Asset Group has been saved',
                        showConfirmButton: false,
                        timer: 1500
                    })
                    this.props.history.push(Actions.asset_groups.view.url)
                }
                this.setState({ submitDisable: false })
            });
    }

    render() {
        const { submitDisable, loading, fieldDetails } = this.state;

        if (loading) {
            return (
                <Box display='flex'>
                    <img src={loadingBar} className='loading' alt='loading' />
                </Box>
            );
        }

        return (
            <Paper className='paper-background'>
                <Grid container>
                    <Grid item md={8} xs={12} className='header-align'>
                        <Box className='heading'>Add Asset Group</Box>
                    </Grid>
                    <Grid item md={4} xs={12}>
                        <Box className='header-align end-flex-prop'>
                            {isUserHasPermission('asset_groups', 'view') &&
                                <Button
                                    variant="contained"
                                    component={Link}
                                    to={this.viewUrl}
                                    className='editbutton-view'
                                >
                                    <VisibilityOutlinedIcon className='visibility-icon' /> View Asset Groups
                                </Button>
                            }
                        </Box>
                    </Grid>
                </Grid>
                <Paper className='paper-plain-background header-align m-t-20px m-b-20px p-t-20px p-b-20px'>
                    {fieldDetails &&
                        <DynamicForm
                            fieldDetails={fieldDetails}
                            updateParent={this.updateParent}
                            loading={loading}
                            ref={ref => this.dynamicFormRef = ref}
                            containerSpacing={3}
                            idFormat={'asset_group_add_'}
                        />
                    }
                </Paper>
                <Box display='flex' marginLeft='auto' justifyContent='flex-end' className='header-align'>
                    <Button
                        variant="contained"
                        color="primary"
                        className='submit'
                        disabled={submitDisable}
                        onClick={this.validateAndSubmit}
                    >
                        Submit
                    </Button>
                </Box>
            </Paper>
        )
    }
}

export default withRouter(AddAssetGroup)
