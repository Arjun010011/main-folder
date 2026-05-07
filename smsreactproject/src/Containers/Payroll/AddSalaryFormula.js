import React, { Component } from 'react';
import { Box, Paper, Grid, Button } from '@material-ui/core';
import { withRouter } from 'react-router-dom';
import VisibilityOutlinedIcon from '@material-ui/icons/VisibilityOutlined';
import Snackbar from '@material-ui/core/Snackbar';
import MuiAlert from '@material-ui/lab/Alert';
import Swal from 'sweetalert2';
import classNames from 'classnames';
import './styles.scss';
import MultipleAddTextFields from 'Components/MultipleAddTextFields';
import { formulaNameRegex } from 'Constants/regularExpression';
import { POST_URL, GET_URL } from 'Includes/urls';
import { Actions } from 'Constants/permissions';
import { postRequest, getRequest } from 'Includes/api/apicall';
import commonMessages from 'Constants/messages';
import messages from './messages';
import { FormattedMessage } from 'react-intl';

function Alert(props) {
    return <MuiAlert elevation={6} variant="filled" {...props} />;
}

const getFieldDetails = (fyList = []) => [
    {
        label: 'Formula Name', regex: formulaNameRegex,
        autoFocus: true, name: 'name', md: 4, className: 'width-form-95', required: true,
        id: 'formula_name', default: '', rows: null, type: 'text', maxLength: '100',
        gridClassName: 'margin-vertical-20',
    },
    {
        label: 'Financial Year', regex: null,
        autoFocus: false, name: 'financial_year', md: 3, className: 'width-form-95', required: false,
        id: 'formula_fy', default: '', type: 'drop_down',
        list: [{ id: '', name: 'All / Global' }, ...fyList],
        gridClassName: 'margin-vertical-20', allowDuplicates: true,
    },
    {
        label: 'Description', regex: null,
        autoFocus: false, name: 'description', md: 3, className: 'width-form-95', required: false,
        id: 'formula_desc', default: '', rows: null, type: 'text', maxLength: '250',
        gridClassName: 'margin-vertical-20', allowDuplicates: true,
    },
    {
        label: 'Is Default', regex: null,
        autoFocus: false, name: 'is_default', md: 2, className: 'width-form-95', required: false,
        id: 'formula_default', default: false, type: 'drop_down',
        list: [{ id: true, name: 'Yes' }, { id: false, name: 'No' }],
        gridClassName: 'margin-vertical-20', allowDuplicates: true,
    },
];

class AddSalaryFormula extends Component {
    constructor() {
        super();
        this.state = {
            formulas: [],
            fyList: [],
            open: false,
            alertData: '',
            submitDisable: false,
        };
    }

    componentDidMount() {
        getRequest(GET_URL.financialyear.api, {}, this.props).then(response => {
            if (response && response.status === 200) {
                const data = response.data.data || response.data;
                const fyList = Array.isArray(data) ? data.map(fy => ({ id: fy.id, name: fy.name })) : [];
                this.setState({ fyList });
            }
        });
    }

    updateFormulas = (stateValue) => {
        this.setState({ formulas: stateValue });
    };

    validate = () => {
        let { formulas } = this.state;
        let isValid = this.refs.formulas.validateFields();

        if (formulas.length === 0) {
            this.setState({
                open: true,
                alertData: 'Add at least 1 formula',
            });
        } else if (isValid) {
            let post_data = formulas.map((f) => ({
                name: f.name,
                description: f.description || '',
                is_default: f.is_default || false,
                financial_year: f.financial_year || null,
                is_active: true,
            }));

            this.setState({ submitDisable: true });
            let url = POST_URL.salaryformula.api;

            // Send requests one at a time (backend expects isList=False)
            const sendAll = async () => {
                for (const item of post_data) {
                    const response = await postRequest(url, item);
                    if (!response || response.status !== 200) {
                        this.setState({ submitDisable: false });
                        return;
                    }
                }
                Swal.fire({
                    position: 'top-end',
                    icon: 'success',
                    title: 'Formulas created successfully',
                    showConfirmButton: false,
                    timer: 1500,
                });
                this.viewPage();
            };
            sendAll();
        }
    };

    viewPage = () => {
        this.props.history.push(Actions.payroll_formulalist.view.url);
    };

    handleClose = () => {
        this.setState({ open: false });
    };

    render() {
        const { open, submitDisable, alertData } = this.state;
        return (
            <Box>
                <Paper className={classNames('paper-background')}>
                    <Grid container>
                        <Grid item md={6} xs={12} className={classNames('header-align')}>
                            <Box className='heading'>
                                <FormattedMessage {...messages.salaryFormula} />
                            </Box>
                            <Box className='sub-heading'>
                                Add multiple salary formulas at once
                            </Box>
                        </Grid>
                        <Grid item md={6} xs={12}>
                            <Box className={classNames('header-align', 'end-flex-prop')}>
                                <Button
                                    variant='contained'
                                    onClick={() => this.viewPage()}
                                    className='editbutton-view'
                                >
                                    <VisibilityOutlinedIcon className='visibility-icon' />
                                    <FormattedMessage {...messages.salaryFormula} />
                                </Button>
                            </Box>
                        </Grid>
                    </Grid>

                    <Grid container className={classNames('header-align')}>
                        <Grid item md={10} xs={12}>
                            <MultipleAddTextFields
                                fieldDefaultValue={[]}
                                fieldDetails={getFieldDetails(this.state.fyList)}
                                updateParent={this.updateFormulas}
                                isEmptyNotAllowed={true}
                                ref={'formulas'}
                                NotAlignCenter={true}
                                idFormat={'salary_formula_add_'}
                            />

                            <Box className='submt-button-float-bottom' mt={3}>
                                <Button
                                    variant='contained'
                                    color='primary'
                                    className='submit'
                                    disabled={submitDisable}
                                    onClick={this.validate}
                                >
                                    <FormattedMessage {...commonMessages.submit} />
                                </Button>
                            </Box>
                        </Grid>
                    </Grid>

                    <Snackbar
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                        open={open}
                        autoHideDuration={2000}
                        onClose={this.handleClose}
                    >
                        <Alert onClose={this.handleClose} severity='error'>
                            {alertData}
                        </Alert>
                    </Snackbar>
                </Paper>
            </Box>
        );
    }
}

export default withRouter(AddSalaryFormula);
