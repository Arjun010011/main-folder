import React, { Component } from 'react';
import LoadingGif from 'Components/LoadingGif';
import { withRouter } from 'react-router-dom';
import { Paper, Grid, Button } from '@material-ui/core';
import './styles.scss';
import ReactToPrint from 'react-to-print';
import GetAppRoundedIcon from '@material-ui/icons/GetAppRounded';
import { getUrlParam, dateFormat } from 'Includes/functions';
import { Actions } from 'Constants/permissions';
import VisibilityOutlinedIcon from '@material-ui/icons/VisibilityOutlined';
import StudentUpdateFields from 'Containers/Certificates/components/StudentUpdateFields';


class Certificate extends Component {
    render() {
        const fields = [
            {
                name: 'admission_num',
                value: 'ADM-2022-23/01',
                margin_top: '175px',
                margin_left: '330px',
                margin_bottom: '20px',
                flex_basis: '100%',
                width: '200px'
            },
            {
                name: 'full_name',
                value: 'Nithin J',
                margin_top: '90px',
                margin_left: '350px',
                margin_bottom: '20px',
                flex_basis: '100%',
            },
            {
                name: 'father_name',
                value: 'Father Name',
                margin_top: '10px',
                margin_left: '150px',
                margin_bottom: '20px',
                flex_basis: '100%',
            },
            {
                name: 'village',
                value: 'Jalahalli',
                margin_top: '10px',
                margin_left: '135px',
                margin_bottom: '20px',
            },
            {
                name: 'taluk',
                value: 'Bengaluru North',
                margin_top: '10px',
                margin_left: '270px',
                margin_bottom: '20px',
            },
            {
                name: 'district',
                value: 'Bengaluru',
                margin_top: '10px',
                margin_left: '60px',
                margin_bottom: '20px',
                flex_basis: '50%',
            },
            {
                name: 'school_1',
                value: 'ACHARYA SRI',
                margin_top: '10px',
                margin_left: '130px',
                margin_bottom: '20px',
            },
            {
                name: 'school_2',
                value: 'MAHAPRAGYA HIGH SCHOOL',
                margin_top: '10px',
                margin_left: '60px',
                margin_bottom: '20px',
                flex_basis: '35%',
            },
            {
                name: 'from_year',
                value: '2005',
                margin_top: '10px',
                margin_left: '100px',
                margin_bottom: '20px',
            },
            {
                name: 'to_year',
                value: '2023',
                margin_top: '10px',
                margin_left: '150px',
                margin_bottom: '20px',
            },
            {
                name: 'from_standard',
                value: 'Standard 1',
                margin_top: '10px',
                margin_left: '110px',
                margin_bottom: '20px',
                flex_basis: '50%',
            },
            {
                name: 'to_standard',
                value: 'Standard 7',
                margin_top: '10px',
                margin_left: '0px',
                margin_bottom: '20px',
            },
            {
                name: 'passed_standard',
                value: 'Standard 7',
                margin_top: '10px',
                margin_left: '110px',
                margin_bottom: '20px',
                flex_basis: '100%',
            },
            {
                name: 'dob',
                value: '12-05-2010',
                margin_top: '20px',
                margin_left: '250px',
                margin_bottom: '20px',
                flex_basis: '100%',
            },
            {
                name: 'record_date',
                value: '12-05-2016',
                margin_top: '10px',
                margin_left: '300px',
                margin_bottom: '20px',
                flex_basis: '100%',
            },
            {
                name: 'leaving_date',
                value: '12-05-2023',
                margin_top: '10px',
                margin_left: '250px',
                margin_bottom: '20px',
                flex_basis: '100%',
            },
            {
                name: 'study_issue_date',
                value: '21-05-2023',
                margin_top: '90px',
                margin_left: '125px',
                margin_bottom: '20px',
                flex_basis: '100%',
            },
            {
                name: 'place',
                value: 'Bengaluru',
                margin_top: '10px',
                margin_left: '125px',
                margin_bottom: '20px',
                flex_basis: '100%',
            },
        ]

        return (
            <Paper className='paper-background'>
                <Paper className='paper-background-study-certificate'>
                    <div className='d-flex flex-wrap' style={{ width: '100%' }}>
                        {fields.map((data) => {
                            return <div style={{
                                marginTop: data.margin_top,
                                marginLeft: data.margin_left,
                                marginBottom: data.margin_bottom,
                                flexBasis: data.flex_basis,
                                width: data.width
                            }}>
                                {data.value}
                            </div>
                        })
                        }
                    </div>
                </Paper>
            </Paper>
        )
    }
}

class StudyCertificateSadguru extends React.Component {

    constructor(props) {
        super(props);
        this.state = {
            certificate_data: {},
            certificate_data_copy: {},
            loading: true,
            currentDate: dateFormat(new Date(), 'DD-MM-YYYY'),
            isOpenDialog: false
        }
    }

    componentDidMount() {
        this.getstudycertificate();
    }

    getstudycertificate = () => {
        const { invoiceData } = this.props;
        this.setState({
            certificate_data: invoiceData,
            certificate_data_copy: invoiceData,
            loading: false
        })
    }


    viewPage = () => {
        let { standard, section } = getUrlParam();
        let searchState = { standard: standard, section: section };
        let searchParam = "?" + new URLSearchParams(searchState).toString();
        this.props.history.push({
            pathname: Actions.study_certificate_list.view.url,
            search: searchParam,
        });
    }

    handleClickFields = () => {
        this.setState({
            isOpenDialog: true
        })
    }

    closeInParent = () => {
        this.setState({
            isOpenDialog: false
        })
    }

    saveUpdatedData = (updatedData) => {
        this.setState({
            certificate_data: { ...updatedData }
        })
    }

    render() {
        let { certificate_data, currentDate, isOpenDialog, loading } = this.state;
        return (
            <div>
                <Grid container>
                    <Grid container >
                        <ReactToPrint
                            trigger={() =>
                                <Button variant='contained' color="secondary"
                                    className='submit print'>
                                    <GetAppRoundedIcon />
                                    Print
                                </Button>
                            }
                            content={() => this.componentRef}
                        />
                        <Button className='custom-button-approval align-self-center' onClick={this.handleClickFields}>Edit Student Details</Button>
                        <Button
                            variant='contained'
                            onClick={() => this.viewPage()}
                            className='editbutton-view'>
                            <VisibilityOutlinedIcon className='visibility-icon' />
                            Study Certificate
                        </Button>
                    </Grid>
                    {!loading &&
                        <div className='mt-30'>
                            <Certificate {...this.props} ref={el => (this.componentRef = el)}
                                certificate_data={certificate_data}
                                currentDate={currentDate}
                            />
                        </div>
                    }
                </Grid>
                {isOpenDialog &&
                    <StudentUpdateFields
                        closeInParent={this.closeInParent}
                        certificate_data={certificate_data}
                        saveUpdatedData={this.saveUpdatedData}
                    />
                }
            </div>
        );
    }
}

export default withRouter(StudyCertificateSadguru);