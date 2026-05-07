import React, { Component } from 'react'
import Swal from 'sweetalert2';
import { withRouter } from 'react-router-dom';

import MultipleAdd from 'Components/MultipleAdd'
import { nameWithQuoteRegex } from 'Constants/regularExpression'
import { postRequest, getRequest } from 'Includes/api/apicall';
import { POST_URL, GET_URL } from 'Includes/urls';
import { Actions } from 'Constants/permissions';

const header = 'Recoverable Asset Category'



const BALANCE_SHEET_CLASSIFICATION_OPTIONS = [
    { id: 'LIABILITY', name: 'Liability' },
    { id: 'FIXED_ASSET', name: 'Fixed Asset' },
]

class AddRecoverableAssetCategory extends Component {

    constructor(props) {
        super(props)

        this.state = {
            submitDisable: false,
            fieldDetails: [],
            loading: true,
            nextDisplayOrder: 1,
        }
        this.viewUrl = Actions.recoverable_asset_categories.view.url
    }

    componentDidMount = () => {
        this.fetchExistingAndBuild()
        this.getFinancialYearList()
    }

    getFinancialYearList = () => {
        const url = GET_URL.financialyear.api;
        const params = { is_active: true };
        getRequest(url, params, this.props).then(response => {
            if (response && response.status === 200) {
                const fyData = response.data.data.data_list || response.data.data || [];
                const fyList = fyData.map(fy => ({
                    id: fy.id,
                    name: `${new Date(fy.start_date).getFullYear()}-${new Date(fy.end_date).getFullYear()}`
                }));
                this.setState({ financialYearList: fyList }, () => {
                    if (this.state.fieldDetails.length > 0) {
                        // Rebuild to apply both list and URL default
                        this.buildFieldDetails(this.state.nextDisplayOrder);
                    }
                });
            }
        }).catch(() => { });
    }

    updateFieldDetailsList = (name, list) => {
        const fieldDetails = this.state.fieldDetails.map(field => {
            if (field.name === name) return { ...field, list };
            return field;
        });
        this.setState({ fieldDetails });
    }

    fetchExistingAndBuild = async () => {
        let nextDisplayOrder = 1;
        try {
            const response = await getRequest(GET_URL.recoverableAssetCategory.api, {}, this.props);
            if (response && response.status === 200) {
                const categories = response.data.data || response.data.data_list || response.data || [];
                const orders = Array.isArray(categories)
                    ? categories.map(c => parseInt(c.display_order) || 0)
                    : [];
                if (orders.length > 0) {
                    nextDisplayOrder = Math.max(...orders) + 1;
                }
            }
        } catch (e) {
            console.error('Error fetching categories for display order', e);
        }
        this.setState({ nextDisplayOrder }, () => {
            this.buildFieldDetails(nextDisplayOrder);
        });
    }

    buildFieldDetails = (nextOrder) => {
        const orderDefault = String(nextOrder || this.state.nextDisplayOrder);
        // Read FY from URL query params (passed by list page)
        const urlParams = new URLSearchParams(this.props.location?.search || '');
        const fyFromUrl = urlParams.get('financial_year');
        let fyDefault = null;
        if (fyFromUrl && this.state.financialYearList) {
            fyDefault = this.state.financialYearList.find(fy => String(fy.id) === fyFromUrl) || null;
        }
        this.setState({
            fieldDetails: [
                {
                    label: 'Code', regex: nameWithQuoteRegex, name: 'code', md: 4, maxLength: '50', className: 'width-95-mt-30px', required: true,
                    id: 'outlined-textarea', default: '', rows: null, type: 'text', autoFocus: true
                },
                {
                    label: 'Name', regex: nameWithQuoteRegex, name: 'name', md: 4, maxLength: '255', className: 'width-95-mt-30px', required: true,
                    id: 'outlined-textarea', default: '', rows: null, type: 'text', autoFocus: false
                },
                {
                    label: 'Financial Year', name: 'financial_year', md: 4, className: 'width-95-mt-30px', required: true,
                    id: 'outlined-select', default: fyDefault, type: 'dropDownWithSearch', autoFocus: false,
                    list: this.state.financialYearList || []
                },
                {
                    label: 'Balance Sheet Classification', regex: '', name: 'balance_sheet_classification', md: 6, className: 'width-95-mt-30px', required: true,
                    id: 'outlined-select', default: BALANCE_SHEET_CLASSIFICATION_OPTIONS[0], type: 'dropDownWithSearch', autoFocus: false,
                    list: BALANCE_SHEET_CLASSIFICATION_OPTIONS
                },
                {
                    label: 'Display Order', regex: { value: /^[0-9]*$/, errorText: 'Must be a number' }, name: 'display_order', md: 6, maxLength: '5', className: 'width-95-mt-30px', required: false,
                    id: 'outlined-textarea', default: orderDefault, rows: null, type: 'text', autoFocus: false, isDuplicateAllow: true
                },
            ],
            loading: false
        })
    }

    onPrepareNewRow = (currentFieldValues) => {
        // Find the max display_order among current form rows
        let maxOrder = 0;
        currentFieldValues.forEach(row => {
            const order = parseInt(row.display_order) || 0;
            if (order > maxOrder) maxOrder = order;
        });
        return { display_order: String(maxOrder + 1) };
    }

    postMethod = (categories) => {
        this.setState({ submitDisable: true })
        // Fallback FY from URL query param
        const urlParams = new URLSearchParams(this.props.location?.search || '');
        const fyFromUrl = urlParams.get('financial_year');
        categories.map((data) => {
            data.balance_sheet_classification = data.balance_sheet_classification?.id || data.balance_sheet_classification || 'LIABILITY'
            // Extract FY ID from object, raw value, or fallback to URL param
            let fyVal = data.financial_year;
            if (fyVal && typeof fyVal === 'object') fyVal = fyVal.id;
            if (!fyVal && fyFromUrl) fyVal = parseInt(fyFromUrl);
            data.financial_year = fyVal || null;
            data.display_order = parseInt(data.display_order) || 0
            data.description = data.description || null
        })
        let payload = categories[0];
        let url = POST_URL.recoverableAssetCategory.api;
        postRequest(url, payload, this.props)
            .then((response) => {
                if (response && response.status === 200 && !response.data?.error) {
                    Swal.fire({
                        position: 'top-end',
                        type: 'success',
                        title: 'Category has been saved',
                        showConfirmButton: false,
                        timer: 1500
                    })
                    this.props.history.push(this.viewUrl)
                } else {
                    const msg = response?.data?.message || response?.data?.detail || 'Failed to save category.';
                    Swal.fire('Error', msg, 'error');
                }
                this.setState({ submitDisable: false })
            })
            .catch((err) => {
                const msg = err?.response?.data?.message || err?.response?.data?.detail || 'Failed to save category.';
                Swal.fire('Error', msg, 'error');
                this.setState({ submitDisable: false })
            });
    }

    render() {
        const { submitDisable, fieldDetails, loading } = this.state
        if (loading) {
            return <div>Loading...</div>
        }
        return (
            <div>
                <MultipleAdd
                    fieldDetails={fieldDetails}
                    header={header}
                    name='Category'
                    viewUrl={this.viewUrl}
                    submitDisable={submitDisable}
                    postMethod={this.postMethod}
                    headerGrid={{ xl: 6, lg: 8, md: 8, xs: 12 }}
                    buttonGrid={{ xl: 6, lg: 4, md: 4, xs: 12 }}
                    bodyGrid={{ xl: 6, lg: 8, md: 8, xs: 12 }}
                    idFormat={'recoverable_asset_category_add_'}
                    isSingle={true}
                    onPrepareNewRow={this.onPrepareNewRow}
                />
            </div>
        )
    }
}


export default withRouter(AddRecoverableAssetCategory)
