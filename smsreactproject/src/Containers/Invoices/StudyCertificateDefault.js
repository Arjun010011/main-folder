import React, { Component } from 'react';
import LoadingGif from 'Components/LoadingGif';
import { withRouter } from 'react-router-dom';
import { Paper, Grid, Button } from '@material-ui/core';
import './styles.scss';
import ReactToPrint from 'react-to-print';
import GetAppRoundedIcon from '@material-ui/icons/GetAppRounded';
import { GET_URL } from 'Includes/urls';
import { getRequest } from 'Includes/api/apicall';
import { getUrlParam, dateFormat, getFullName } from 'Includes/functions';
import { Actions } from 'Constants/permissions';
import VisibilityOutlinedIcon from '@material-ui/icons/VisibilityOutlined';
import StudentUpdateFields from 'Containers/Certificates/components/StudentUpdateFields';

class Certificate extends Component {
    render() {
        let { certificate_data, currentDate } = this.props;
        return (
            <Paper className='paper-background'>
                <Paper className='paper-background-study-certificate'>
                    <div className="container mt-2">
                        <div className="text-center">
                            <h3><b>PROFORMA FOR STUDY CERTIFICATE</b></h3>
                            <h2>{certificate_data.school_name}</h2>
                            <p>{certificate_data.school_address}, {certificate_data.school_city}, {certificate_data.school_district},&nbsp;
                                {certificate_data.school_state}, {certificate_data.school_country} - Pincode {certificate_data.school_pincode}
                            </p>
                            <p>
                                Phone No.: {certificate_data.school_tel_num}{certificate_data.school_tel_num_2 ? ', ' : ''}{certificate_data.school_tel_num_2}
                            </p>
                            <div className="d-flex">
                                <div className="text-right marginLeft">Date:
                                </div>
                                <div className="dotted w-100 t-center">{currentDate}</div>
                            </div>
                        </div>
                        <div className="d-flex mt-2">
                            <div className="w-space"> This is to certify that Sri / Kum </div>
                            <div className="dotted w-100 t-center"> {certificate_data.full_name}</div>

                        </div>
                        <div className="d-flex mt-2">
                            {/* <div className="dotted w-100"></div> */}
                            <div className="w-space">S/O / D/O </div>
                            <div className="dotted w-100 t-center"> {certificate_data.father_name}</div>
                            <div className="w-space"> has studied</div>
                        </div>
                        <div className="d-flex mt-2">
                            <div className="w-space"> from </div>
                            <div className="dotted w-100 t-center"> {certificate_data.from_standard_name}</div>
                            <div className="w-space"> to </div>
                            <div className="dotted w-100 t-center">{certificate_data.to_standard_name}</div>
                            <div className="w-space"> in our</div>
                        </div>
                        <div className="d-flex mt-2">
                            <div className="w-space">Institution from </div>
                            <div className="dotted w-100 t-center">{certificate_data.from_academic_year}</div>
                            <div className="w-space"> to </div>
                            <div className="dotted w-100 t-center"> {certificate_data.to_academic_year}</div>
                            <div className="w-space"> academic years.</div>
                        </div>
                        <div className="d-flex mt-4">
                            <div className="w-space">The mother toungue of the candidate is </div>
                            <div className="dotted w-100 t-center">{certificate_data.mother_tongue}</div>
                            <div className="w-space">as per the </div>
                        </div>
                        <div className="mt-2">
                            <div className="">Admission register of the institution.</div>
                        </div>
                        <div className="mt-2">
                            <h5 lassName="">The above details are true and correct to the best of my knowledge.</h5>
                        </div>
                        <div className="marginLeft mt-2 signature-text">
                            Signature of
                        </div>
                        <div className="marginLeft signature-text-data">Head of the Institution</div>
                        <div className="mt-4 signature-text-data">
                            <h5>Institution seal</h5>
                        </div>
                        <div className="d-flex text-right marginCenter">
                            <div className="w-space">(Name in Block letters </div>
                            <div className="dotted w-100 t-center"></div>
                            <div className="w-space" >)</div>
                        </div>
                    </div>
                    <Grid container className="text-center">
                        <Grid item md={12} xs={12}>
                            <div><b>COUNTER SIGNED BY ME</b></div>
                            <div>Address, Seal & Office telephone Number</div>
                            <div>Of the Block Educational Officer/DDPI</div>
                        </Grid>
                    </Grid>
                </Paper>
            </Paper>
        )
    }
}

class StudyCertificateDefault extends React.Component {

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

export default withRouter(StudyCertificateDefault);