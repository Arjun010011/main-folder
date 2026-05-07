import React, { Component } from 'react'
import { Paper, Box, CircularProgress, Grid, TextField, Button, Icon, Checkbox, ListItemText } from '@material-ui/core';
import { Link, withRouter } from 'react-router-dom'
import Swal from 'sweetalert2';
import Accordion from '@material-ui/core/Accordion';
import AccordionSummary from '@material-ui/core/AccordionSummary';
import AccordionDetails from '@material-ui/core/AccordionDetails';
import Typography from '@material-ui/core/Typography';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';

import { isUserHasPermission } from 'Includes/functions'; 
import { Actions } from 'Constants/permissions';
import { Dropdown } from 'Components/DropDown';
import BlankPagewithIcon from 'Components/BlankPageWithIcon'
import { getAcademicYear, SetAcademicYear, getUrlParam, SetFinancialYear, getFinancialYear } from 'Includes/functions';
import { getRequest, postRequest, deleteRequest, putRequest } from 'Includes/api/apicall';
import { GET_URL, POST_URL, DEL_URL, PUT_URL } from 'Includes/urls';
import loadingBar from 'images/loading.gif'
import './styles.scss'
import messages from './messages';
import commonMessages from 'Constants/messages'
import { FormattedMessage } from 'react-intl';


class FormatGenerator extends Component {
    constructor() {
        super()
        this.state = {
            yearList: [],
            year: '',
            blank: true,
            pageLoading: true,
            loading: true,
            updateData: '',
            submitDisable: false,
            errors: { prefix: {}, postfix: {} },
            academic_year_list: [],
            financial_year_list: [],
            standardList: [],
            expandedStandards: [],
            academicYearEnabled: true,
            financialYearList: []
        }
    }

    async componentDidMount() { 
        let yearInformation = getUrlParam();
        if (isUserHasPermission('counter_format_setup', 'create')) {
            this.getYearList();
            this.getFinancialYearList();
            if (yearInformation && yearInformation.year) {
                this.setState({
                    year: yearInformation.year
                }, () => {
                    this.getFormatSetupCounter();
                })
            }
            else if (getAcademicYear()) {
                this.setState({
                    year: getAcademicYear()
                }, () => {
                    this.getFormatSetupCounter();
                })
            }
        }
        else {
            this.props.history.push('/dashboard')
        }
    }

    getFormatSetupCounter = () => {
        const { academicYearEnabled, year, financialYear } = this.state;
        if((!academicYearEnabled && financialYear) || (academicYearEnabled && year)){
        const url = GET_URL.counter.api
        let params = { is_active: true }
        if (academicYearEnabled) {
            params['academic_year'] = year
        }
        else {
            params['financial_year'] = financialYear
        }
        getRequest(url, params, this.props).then(response => {
            if (response && response.status === 200) {
                let resultData = []
                resultData = response.data.data
                this.setState({
                    academic_year_list: resultData.academic_year,
                    financial_year_list: resultData.financial_year,
                    standard_list: resultData.standard,
                }, () => {
                    this.setDefaultFormats()
                })
            }
        })
    }
    else{
        this.setState({
            blank:true,
            academic_year_list:[],
            financial_year_list:[],
            standard_list:[]
        })
    }
    }

    setDefaultFormats = () => {
        let { academic_year_list, standard_list, format, financial_year_list, academicYearEnabled } = this.state;

        academic_year_list.map((field) => {
            field.format = `${field.prefix}1${field.postfix}`;
            field.prefix_label = 'Prefix';
            field.postfix_label = 'Suffix';
        })

        standard_list.map((data) => {
            data['counter_detail'].map((field) => {
                field.format = `${field.prefix}001${field.postfix}`;
                field.prefix_label = 'Prefix';
                field.postfix_label = 'Suffix';
            })
        })

        financial_year_list.map((field) => {
            field.format = `${field.prefix}1${field.postfix}`;
            field.prefix_label = 'Prefix';
            field.postfix_label = 'Suffix';
        })
        this.setState({
            format,
            loading: false,
            pageLoading: false,
            blank: false,
            standard_list,
            academic_year_list,
            financial_year_list
        })
    }

    handleSearchChange = (e, index) => {
        let { academic_year_list, financial_year_list, errors, academicYearEnabled } = this.state;
        let { name, value } = e.target;
        if (academicYearEnabled) {
            academic_year_list[index][name] = value;
            delete errors['prefix'][index]
            delete errors['postfix'][index]
            academic_year_list[index]['format'] = `${academic_year_list[index]['prefix']}1${academic_year_list[index]['postfix']}`
        }
        else {
            financial_year_list[index][name] = value;
            delete errors['prefix'][index]
            delete errors['postfix'][index]
            financial_year_list[index]['format'] = `${financial_year_list[index]['prefix']}1${financial_year_list[index]['postfix']}`
        }
        this.setState({
            academic_year_list,
            financial_year_list,
            errors
        })
    }


    handleStandardSearchChange = (e, pIndex, cIndex) => {
        let { standard_list, errors } = this.state;
        let { name, value } = e.target;
        standard_list[pIndex]['counter_detail'][cIndex][name] = value;
        delete errors['prefix'][`${pIndex}${cIndex}`]
        delete errors['postfix'][`${pIndex}${cIndex}`]
        standard_list[pIndex]['counter_detail'][cIndex]['format'] = `${standard_list[pIndex]['counter_detail'][cIndex]['prefix']}001${standard_list[pIndex]['counter_detail'][cIndex]['postfix']}`
        this.setState({
            standard_list,
            errors
        })
    }


    getYearList = () => {
        const url = GET_URL.getacademicyear.api
        getRequest(url, {}, this.props).then(response => {
            if (response && response.status === 200) {
                this.setState({
                    yearList: response.data.data,
                    pageLoading: false,
                    loading: false,
                })
            }
        })
    }

    getFinancialYearList = () => {
        const url = GET_URL.getfinancialyear.api
        getRequest(url, {}, this.props).then(response => {
            if (response && response.status === 200) {
                this.setState({
                    financialYearList: response.data.data,
                    pageLoading: false,
                    loading: false,
                    financialYear: getFinancialYear() ? getFinancialYear() : ''
                })
            }
        })
    }

    onChange = async (e) => {
        const { academicYearEnabled } = this.state;
        let name = e.target.name;
        let value = e.target.value;
        if (value !== 0) {
            this.setState({
                [name]: value,
                loading: true,
            }, () => {
                if (academicYearEnabled) {
                    SetAcademicYear(value)
                }
                else {
                    SetFinancialYear(value)
                }
                this.getFormatSetupCounter()
            })
        }
    }

    validate = () => {
        let { academic_year_list, errors, standard_list, expandedStandards, academicYearEnabled, financial_year_list } = this.state;
        let returnValue = true
        let returnData = []

        if (academicYearEnabled) {
            academic_year_list.map((field, index) => {
                if (!field.prefix && !field.postfix) {
                    errors['prefix'][index] = 'Please Enter Either PreFix or PostFix'
                    errors['postfix'][index] = 'Please Enter Either PreFix or PostFix'
                    returnValue = false
                }
                else {
                    delete field.format
                    delete field.format_label
                    delete field.prefix_label
                    delete field.postfix_label
                }
                if(parseInt(field['value'])<2){
                    returnData.push(field)
                }
            })

            standard_list.map((parent, pIndex) => {
                parent['counter_detail'].map((field, cIndex) => {
                    if (!field.prefix && !field.postfix) {
                        expandedStandards.push(pIndex)
                        errors['prefix'][`${pIndex}${cIndex}`] = 'Please Enter Either PreFix or PostFix'
                        errors['postfix'][`${pIndex}${cIndex}`] = 'Please Enter Either PreFix or PostFix'
                        returnValue = false
                    }
                    else {
                        delete field.format
                        delete field.format_label
                        delete field.prefix_label
                        delete field.postfix_label
                    }
                    returnData.push(field)
                })
            })
        }
        else {
            financial_year_list.map((field, index) => {
                if (!field.prefix && !field.postfix) {
                    errors['prefix'][index] = 'Please Enter Either PreFix or PostFix'
                    errors['postfix'][index] = 'Please Enter Either PreFix or PostFix'
                    returnValue = false
                }
                else {
                    delete field.format
                    delete field.format_label
                    delete field.prefix_label
                    delete field.postfix_label
                }
                if(parseInt(field['value'])<2){
                    returnData.push(field)
                }
            })

        }


        this.setState({
            errors,
            expandedStandards
        })
        if (!returnValue) {
            return returnValue
        }
        else {
            this.setState({
                loading: true,
            })
            return returnData
        }
    }


    submit() {
        let post_format = this.validate();
        if (post_format) {
            this.setState({ submitDisable: true })
            const url = POST_URL.counter.api
            postRequest(url, post_format, this.props).then(response => {
                if (response && response.status === 200) {
                    this.setState({ submitDisable: false })
                    Swal.fire({
                        position: 'top-end',
                        type: 'success',
                        title: response.data.Reason,
                        showConfirmButton: false,
                        timer: 1500
                    })
                    this.getFormatSetupCounter()
                    this.props.history.push( Actions.academic_year.view.url)
                }
                else {
                    this.setState({ submitDisable: false, loading: false })
                }

            })
        }
    }

    textFieldValue = (field, index) => {
        let { errors } = this.state;
        return (
            <Box className='details-outer-box'>
                <Box display='flex' className='heading-label-box'>
                    <Box>{field.alias_name}</Box>
                </Box>
                <Grid container spacing={2} className='format-padding-left'>
                    <Grid item md={3} xs={12}>
                        <TextField
                            label={field.prefix_label}
                            name='prefix'
                            type='text'
                            value={field.prefix}
                            disabled={parseInt(field.value) > 1 ? true : false}
                            className='width-form-100'
                            inputProps={{ maxLength: '15' }}
                            fullWidth={true}
                            variant="outlined"
                            helperText={parseInt(field.value) > 1 ? `Already generated cannot modify` : (!errors['prefix'][index]) ? '' : errors['prefix'][index]}
                            InputLabelProps={{ shrink: field.prefix ? true : false }}
                            error={errors['prefix'][index]}
                            onChange={(e) => this.handleSearchChange(e, index)}
                        />
                    </Grid>
                    <Grid item md={1} xs={12} className='counter-box'>
                        <Box>
                            <Box>Counter</Box>
                            1
                        </Box>
                    </Grid>
                    <Grid item md={3} xs={12}>
                        <TextField
                            label={field.postfix_label}
                            name='postfix'
                            type='text'
                            value={field.postfix}
                            className='width-form-100'
                            disabled={parseInt(field.value) > 1 ? true : false}
                            inputProps={{ maxLength: '15' }}
                            fullWidth={true}
                            variant="outlined"
                            helperText={parseInt(field.value) > 1 ? `Already generated cannot modify` : (!errors['postfix'][index]) ? '' : errors['postfix'][index]}
                            InputLabelProps={{ shrink: field.postfix ? true : false }}
                            error={errors['postfix'][index]}
                            onChange={(e) => this.handleSearchChange(e, index)}
                        />
                    </Grid>
                    <Grid item md={3} className={parseInt(field.value) > 1 ? 'align-self-center p-b-20px' : 'align-self-center'}>
                        <Box className='format-value-box'>
                            {field.format &&
                                <Box>{field.format}</Box>
                            }
                        </Box>
                    </Grid>
                    <Grid item md={2} xs={12} className={parseInt(field.value) > 1 ? 'counter-box align-self-center p-b-20px counter-format-current-value' : 'counter-box align-self-center counter-format-current-value'}>
                        <Box>
                            {parseInt(field.value)}
                        </Box>
                    </Grid>
                </Grid>
            </Box>
        )
    }

    standardTextFieldValue = (field, pIndex, cIndex) => {
        let { errors } = this.state;
        return (
            <Box className='details-outer-box'>
                <Box display='flex' className='heading-label-box'>
                    <Box>{field.alias_name}</Box>
                </Box>
                <Grid container spacing={2} className='format-padding-left'>
                    <Grid item md={3} xs={12}>
                        <TextField
                            label={field.prefix_label}
                            name='prefix'
                            type='text'
                            value={field.prefix}
                            className='width-form-100'
                            inputProps={{ maxLength: '15' }}
                            disabled={parseInt(field.value) > 1 ? true : false}
                            fullWidth={true}
                            variant="outlined"
                            helperText={parseInt(field.value) > 1 ? `Already generated cannot modify` : (!errors['prefix'][`${pIndex}${cIndex}`]) ? '' : errors['prefix'][`${pIndex}${cIndex}`]}
                            InputLabelProps={{ shrink: field.prefix ? true : false }}
                            error={errors['prefix'][`${pIndex}${cIndex}`]}
                            onChange={(e) => this.handleStandardSearchChange(e, pIndex, cIndex)}
                        />
                    </Grid>
                    <Grid item md={1} xs={12} className='counter-box'>
                        <Box>
                            <Box>Counter</Box>
                            001
                        </Box>
                    </Grid>
                    <Grid item md={3} xs={12}>
                        <TextField
                            label={field.postfix_label}
                            name='postfix'
                            type='text'
                            value={field.postfix}
                            className='width-form-100'
                            disabled={parseInt(field.value) > 1 ? true : false}
                            inputProps={{ maxLength: '15' }}
                            fullWidth={true}
                            variant="outlined"
                            helperText={(!errors['postfix'][`${pIndex}${cIndex}`]) ? '' : errors['postfix'][`${pIndex}${cIndex}`]}
                            InputLabelProps={{ shrink: field.postfix ? true : false }}
                            error={errors['postfix'][`${pIndex}${cIndex}`]}
                            onChange={(e) => this.handleStandardSearchChange(e, pIndex, cIndex)}
                        />
                    </Grid>
                    <Grid item md={3} className={parseInt(field.value) > 1 ? 'align-self-center p-b-20px' : 'align-self-center'}>
                        <Box className='format-value-box'>
                            {field.format &&
                                <Box>{field.format}</Box>
                            }
                        </Box>
                    </Grid>
                    <Grid item md={2} xs={12} className={parseInt(field.value) > 1 ? 'counter-box align-self-center p-b-20px counter-format-current-value' : 'counter-box align-self-center counter-format-current-value'}>
                        <Box>
                            {parseInt(field.value)}
                        </Box>
                    </Grid>
                </Grid>
            </Box>
        )
    }

    handleChangeCollapse = (index) => {
        let { expandedStandards } = this.state;
        if (expandedStandards.includes(index)) {
            expandedStandards.map((data, cIndex) => {
                if (data == index) {
                    expandedStandards.splice(cIndex, 1)
                }
            })
        }
        else {
            expandedStandards.push(index)
        }
        this.setState({
            expandedStandards
        })
    }

    onChangeHandleView = () => {
        this.setState({
            academicYearEnabled: !this.state.academicYearEnabled
        }, () => {
            this.getFormatSetupCounter()
        })
    }

    render() {
        const { year, yearList, academic_year_list, financial_year_list, financialYear, financialYearList, pageLoading, loading,
            standard_list, academicYearEnabled, expandedStandards } = this.state
        if (pageLoading) {
            return (
                <Box display='flex'>
                    <img src={loadingBar} className='loading' alt='loading' />
                </Box>
            )
        }
        else {
            return (
                <>
                    <Paper className='paper-background'>
                        <Grid container>
                            <Grid item md={6} xs={12} className='header-align'>
                                <Box className='heading'>
                                    <FormattedMessage {...messages.counterFormat} />
                                </Box>
                            </Grid>
                            <Grid item md={6} xs={12} className='margin-top-10 end-flex-prop '>
                                <Box className='counter-format-toggle-outer-div header-align'>
                                    <Button className={academicYearEnabled === true ? 'list-selected-toggle' : 'grid-selected-toggle'}
                                        onClick={(e) => this.onChangeHandleView()}
                                        disabled={this.state.academicYearEnabled === true}>
                                        <Box className={academicYearEnabled === true ? 'list-selected-toggle-text' : 'grid-selected-toggle-text'}>Academic Year</Box>

                                    </Button>
                                    <Button className={academicYearEnabled === false ? 'list-selected-toggle' : 'grid-selected-toggle'}
                                        onClick={(e) => this.onChangeHandleView()}
                                        disabled={this.state.academicYearEnabled === false}>
                                        <Box className={academicYearEnabled === false ? 'list-selected-toggle-text' : 'grid-selected-toggle-text'}>Financial Year</Box>
                                    </Button>
                                </Box>
                            </Grid>
                        </Grid>
                        {academicYearEnabled &&
                            <Box className='header-align'>
                                <Dropdown
                                    data={yearList}
                                    name='year'
                                    value={year}
                                    onChange={this.onChange}
                                    label={<FormattedMessage {...commonMessages.academicYear} />}
                                    hideSelect={true}
                                    fullWidth
                                />
                            </Box>
                        }
                        {!academicYearEnabled &&
                            <Box className='header-align'>
                                <Dropdown
                                    data={financialYearList}
                                    name='financialYear'
                                    value={financialYear}
                                    onChange={this.onChange}
                                    label={<FormattedMessage {...commonMessages.financialYear} />}
                                    hideSelect={true}
                                    fullWidth
                                />
                            </Box>
                        }

                        {loading &&
                            <Box display='flex'>
                                <CircularProgress className='loading' />
                            </Box>
                        }

                        {
                            (this.state.blank === true && !loading) &&
                            <div className='mt-10'>
                            <BlankPagewithIcon data="Change the year and expect the result" />
                            </div>
                        }

                        {
                            (this.state.blank === false && !loading) &&
                            <Box>
                                <Paper className='paper-counter-background'>
                                    <Grid container spacing={2}>
                                        <Grid item md={7} lg={7} xs={7}>
                                            {academicYearEnabled &&
                                                <Typography className='standard-vise-heading'><FormattedMessage {...commonMessages.academicYear} /></Typography>
                                            }
                                            {!academicYearEnabled &&
                                                <Typography className='standard-vise-heading'><FormattedMessage {...commonMessages.financialYear} /></Typography>
                                            }
                                        </Grid>
                                        <Grid item md={3} lg={3} xs={7}>
                                            <Typography className='standard-vise-heading text-center'>
                                                Expected Format
                                            </Typography>
                                        </Grid>
                                        <Grid item md={2} lg={2} xs={7}>
                                            <Typography className='standard-vise-heading text-center'>
                                                Current Counter
                                            </Typography>
                                        </Grid>
                                    </Grid>
                                    {academicYearEnabled && academic_year_list.map((field, index) => {
                                        return (
                                            this.textFieldValue(field, index)
                                        )
                                    })
                                    }
                                    {!academicYearEnabled && financial_year_list.map((field, index) => {
                                        return (
                                            this.textFieldValue(field, index)
                                        )
                                    })
                                    }
                                </Paper>
                                {standard_list.length !== 0 && academicYearEnabled &&
                                    <Box className='paper-counter-background'>
                                        <Typography className='standard-vise-heading'><FormattedMessage {...commonMessages.standard} /></Typography>
                                        {standard_list.map((standard, parentIndex) => {
                                            return (

                                                <Accordion className='accordion-outer-box'
                                                    expanded={expandedStandards.includes(parentIndex) ? true : false}
                                                    onChange={() => this.handleChangeCollapse(parentIndex)}
                                                >
                                                    <AccordionSummary
                                                        expandIcon={<ExpandMoreIcon />}

                                                        aria-controls="panel2a-content"
                                                        id="panel2a-header"
                                                    >
                                                        <Typography className='standard-label-counter'>{standard.standard_name}</Typography>
                                                    </AccordionSummary>
                                                    {standard.counter_detail.map((field, childIndex) => {
                                                        return <Box >
                                                            {this.standardTextFieldValue(field, parentIndex, childIndex)}
                                                        </Box>
                                                    })
                                                    }
                                                </Accordion>
                                            )
                                        })
                                        }
                                    </Box>
                                }
                                {
                                    (this.state.blank === false && !loading) &&
                                    <Box display='flex' marginLeft='auto' justifyContent='flex-end' className='header-align'>
                                        <Box ml={2}>
                                            <Button variant="contained" color="primary"
                                                className='submit'
                                                disabled={this.state.submitDisable}
                                                onClick={e => this.submit(e)}>
                                                Submit &nbsp;{' '}
                                            </Button>
                                        </Box>
                                    </Box>
                                }
                            </Box>

                        }
                    </Paper>
                </>
            )
        }
    }
}


export default withRouter(FormatGenerator);

